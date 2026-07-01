import { Request, Response } from 'express';
import { randomBytes } from 'crypto';
import { Types } from 'mongoose';
import { clerkClient } from '@clerk/express';
import { Professional } from '../models/Professional';
import { Admin } from '../models/Admin';
import { Tenant } from '../models/Tenant';
import { Appointment } from '../models/Appointment';

// Busca los turnos futuros pendientes/confirmados de una profesional dentro del tenant.
// Reutilizada por deleteProfessional y updateProfessional para mantener el mismo guard
// en ambos caminos de baja (DELETE explícito y PUT con isActive: false).
const findFutureAppointments = async (tenantId: Types.ObjectId | undefined, professionalId: string) => {
    const futureAppointments = await Appointment.find({
        tenantId,
        professional: professionalId,
        isActive: true,
        status: { $in: ['pending', 'confirmed'] },
        startTime: { $gte: new Date() }
    })
        .select('_id client service startTime')
        .populate('client', 'firstName lastName')
        .populate('service', 'name')
        .sort({ startTime: 1 });

    return futureAppointments.map((appt) => ({
        _id: appt._id,
        client: appt.client,
        service: appt.service,
        startTime: appt.startTime
    }));
};

// 1. Create (POST /api/profesionales)
export const createProfessional = async (req: Request, res: Response) => {
    try {
        const { name, color, linkedAdmin, inviteEmail } = req.body;

        // Si se provee un vínculo a usuario existente, validar que el Admin pertenece al tenant
        if (linkedAdmin) {
            const admin = await Admin.findOne({ _id: linkedAdmin, tenantId: req.tenantId });
            if (!admin) {
                return res.status(400).json({ error: 'El usuario a vincular no pertenece a este negocio' });
            }
            // Verificar unicidad: un Admin solo puede estar vinculado a UN Profesional activo
            const duplicate = await Professional.findOne({
                tenantId: req.tenantId,
                linkedAdmin,
                isActive: true,
            });
            if (duplicate) {
                return res.status(409).json({
                    error: `Este usuario ya está vinculado a la profesional "${duplicate.name}". Un usuario solo puede estar vinculado a una profesional a la vez.`
                });
            }
        }

        // Si se provee inviteEmail (sin linkedAdmin), validar y preparar invitación
        let inviteToken: string | null = null;
        let inviteTokenExpiry: Date | null = null;
        let pendingInviteEmail: string | null = null;

        if (inviteEmail && !linkedAdmin) {
            const emailLower = (inviteEmail as string).toLowerCase().trim();

            // El email no puede pertenecer a un Admin ya registrado
            const existingAdmin = await Admin.findOne({ email: emailLower });
            if (existingAdmin) {
                return res.status(409).json({
                    error: 'Este correo ya pertenece a un usuario registrado. Pedile que inicie sesión y vinculalo desde el selector de usuarios.'
                });
            }

            // Generar token seguro (64 chars hex)
            inviteToken = randomBytes(32).toString('hex');
            inviteTokenExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 días
            pendingInviteEmail = emailLower;
        }

        const newProfessional = new Professional({
            tenantId: req.tenantId,
            name,
            color,
            linkedAdmin: linkedAdmin || null,
            isActive: true,
            ...(inviteToken ? { inviteToken, inviteTokenExpiry, pendingInviteEmail } : {}),
        });

        const saved = await newProfessional.save();

        // Enviar invitación Clerk DESPUÉS de guardar (si falla el mail, la profesional existe y se puede reintentar)
        if (inviteToken && pendingInviteEmail) {
            try {
                const tenant = await Tenant.findById(req.tenantId);
                const redirectUrl = `${process.env.FRONTEND_URL}/unirse?token=${inviteToken}`;
                await clerkClient.invitations.createInvitation({
                    emailAddress: pendingInviteEmail,
                    redirectUrl,
                    publicMetadata: { tenantName: tenant?.name ?? 'el negocio' },
                });
            } catch (inviteError) {
                // Si falla el envío del mail, no revertimos la creación — la profesional existe
                // pero sin invitación activa. El admin puede reintentarlo.
                console.error('Error al enviar la invitación Clerk:', inviteError);
                return res.status(201).json({
                    ...saved.toObject(),
                    _inviteWarning: 'La profesional fue creada pero no se pudo enviar el mail de invitación. Intentá nuevamente desde el panel.'
                });
            }
        }

        return res.status(201).json(saved);
    } catch (error) {
        console.error('Error al crear la profesional:', error);
        return res.status(500).json({ error: 'Error interno del servidor al crear la profesional' });
    }
};

// 2. Read All (GET /api/profesionales)
export const getProfessionals = async (req: Request, res: Response) => {
    try {
        const includeInactive = req.query.includeInactive === 'true';

        const filter: Record<string, unknown> = { tenantId: req.tenantId };
        if (!includeInactive) {
            filter.isActive = true;
        }

        const professionals = await Professional.find(filter).sort({ name: 1 });
        return res.status(200).json(professionals);
    } catch (error) {
        console.error('Error al obtener las profesionales:', error);
        return res.status(500).json({ error: 'Error interno del servidor al obtener las profesionales' });
    }
};

// 3. Read - Admins vinculables (GET /api/profesionales/linkable-admins)
export const getLinkableAdmins = async (req: Request, res: Response) => {
    try {
        const admins = await Admin.find({ tenantId: req.tenantId, isActive: true }).select('email role');
        return res.status(200).json(admins);
    } catch (error) {
        console.error('Error al obtener los usuarios vinculables:', error);
        return res.status(500).json({ error: 'Error interno del servidor al obtener los usuarios vinculables' });
    }
};

// 4. Read One (GET /api/profesionales/:id)
export const getProfessionalById = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        const professional = await Professional.findOne({ _id: id, tenantId: req.tenantId });
        if (!professional) {
            return res.status(404).json({ error: 'Profesional no encontrada' });
        }

        return res.status(200).json(professional);
    } catch (error) {
        console.error('Error al obtener la profesional por ID:', error);
        return res.status(500).json({ error: 'Error interno del servidor al obtener la profesional' });
    }
};

// 5. Update (PUT /api/profesionales/:id)
export const updateProfessional = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { name, color, linkedAdmin, isActive } = req.body;
        const confirm = req.body?.confirm === true;

        // Guard simétrico al de deleteProfessional: una baja explícita vía PUT (isActive: false)
        // también debe verificar turnos futuros pendientes/confirmados antes de aplicarse.
        if (isActive === false && !confirm) {
            const futureAppointments = await findFutureAppointments(req.tenantId, id);
            if (futureAppointments.length > 0) {
                return res.status(409).json({
                    error: 'La profesional tiene turnos futuros asignados. Reasignalos o confirmá la baja.',
                    futureAppointments
                });
            }
        }

        // Si se provee un vínculo a usuario, validar que el Admin pertenece al tenant
        if (linkedAdmin) {
            const admin = await Admin.findOne({ _id: linkedAdmin, tenantId: req.tenantId });
            if (!admin) {
                return res.status(400).json({ error: 'El usuario a vincular no pertenece a este negocio' });
            }
            // Verificar unicidad excluyendo el profesional actual
            const duplicate = await Professional.findOne({
                tenantId: req.tenantId,
                linkedAdmin,
                isActive: true,
                _id: { $ne: id },
            });
            if (duplicate) {
                return res.status(409).json({
                    error: `Este usuario ya está vinculado a la profesional "${duplicate.name}". Un usuario solo puede estar vinculado a una profesional a la vez.`
                });
            }
        }

        // Whitelist explícita de campos editables (anti mass-assignment de tenantId).
        // El filtro NO exige isActive para permitir reactivar profesionales dadas de baja.
        const $set: Record<string, unknown> = {};
        if (name !== undefined) $set.name = name;
        if (color !== undefined) $set.color = color;
        if (linkedAdmin !== undefined) $set.linkedAdmin = linkedAdmin || null;
        if (isActive !== undefined) $set.isActive = isActive;

        const updated = await Professional.findOneAndUpdate(
            { _id: id, tenantId: req.tenantId },
            { $set },
            { new: true, runValidators: true }
        );

        if (!updated) {
            return res.status(404).json({ error: 'Profesional no encontrada' });
        }

        return res.status(200).json(updated);
    } catch (error) {
        console.error('Error al actualizar la profesional:', error);
        return res.status(500).json({ error: 'Error interno del servidor al actualizar la profesional' });
    }
};

// 6. Delete (DELETE /api/profesionales/:id) - Soft Delete con guard de turnos futuros
export const deleteProfessional = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const confirm = req.body?.confirm === true;

        const professional = await Professional.findOne({ _id: id, tenantId: req.tenantId });
        if (!professional) {
            return res.status(404).json({ error: 'Profesional no encontrada' });
        }

        // Guard: turnos futuros pendientes/confirmados quedarían huérfanos si se da de baja.
        if (!confirm) {
            const futureAppointments = await findFutureAppointments(req.tenantId, id);

            if (futureAppointments.length > 0) {
                return res.status(409).json({
                    error: 'La profesional tiene turnos futuros asignados. Reasignalos o confirmá la baja.',
                    futureAppointments
                });
            }
        }

        professional.isActive = false;
        await professional.save();

        return res.status(200).json({
            message: 'Profesional dada de baja correctamente',
            professional
        });
    } catch (error) {
        console.error('Error al eliminar la profesional:', error);
        return res.status(500).json({ error: 'Error interno del servidor al eliminar la profesional' });
    }
};
