import { Request, Response } from 'express';
import { getAuth, clerkClient } from '@clerk/express';
import { Professional } from '../models/Professional';
import { Admin } from '../models/Admin';
import { Tenant } from '../models/Tenant';

// GET /api/invitacion/validate?token=TOKEN
// Público (sin checkAdminAccess): el invitado no tiene cuenta todavía.
export const validateInvitation = async (req: Request, res: Response) => {
    try {
        const { token } = req.query;

        if (!token || typeof token !== 'string') {
            return res.status(400).json({ error: 'Token de invitación requerido.' });
        }

        const professional = await Professional.findOne({
            inviteToken: token,
            inviteTokenExpiry: { $gt: new Date() },
        });

        if (!professional) {
            return res.status(404).json({ error: 'La invitación no existe o ha expirado.' });
        }

        const tenant = await Tenant.findById(professional.tenantId).select('name');

        return res.status(200).json({
            professionalName: professional.name,
            tenantName: tenant?.name ?? 'el negocio',
            inviteEmail: professional.pendingInviteEmail,
        });
    } catch (error) {
        console.error('Error al validar invitación:', error);
        return res.status(500).json({ error: 'Error interno del servidor.' });
    }
};

// POST /api/invitacion/aceptar
// Semi-público: requiere sesión Clerk activa (clerkMiddleware ya corre globalmente),
// pero NO checkAdminAccess porque el Admin todavía no existe en MongoDB.
export const acceptInvitation = async (req: Request, res: Response) => {
    try {
        const { userId } = getAuth(req);

        if (!userId) {
            return res.status(401).json({ error: 'Debés iniciar sesión para aceptar la invitación.' });
        }

        const { token } = req.body;

        if (!token) {
            return res.status(400).json({ error: 'Token de invitación requerido.' });
        }

        // Validar token
        const professional = await Professional.findOne({
            inviteToken: token,
            inviteTokenExpiry: { $gt: new Date() },
        });

        if (!professional) {
            return res.status(404).json({ error: 'La invitación no existe o ha expirado.' });
        }

        // Obtener email del usuario autenticado desde Clerk
        const clerkUser = await clerkClient.users.getUser(userId);
        const primaryEmail = clerkUser.emailAddresses.find(
            (a) => a.id === clerkUser.primaryEmailAddressId
        );

        if (!primaryEmail || primaryEmail.verification?.status !== 'verified') {
            return res.status(403).json({ error: 'El correo electrónico no está verificado.' });
        }

        const email = primaryEmail.emailAddress.toLowerCase().trim();

        // Verificar que el email coincide con el invitado
        if (email !== professional.pendingInviteEmail) {
            return res.status(403).json({
                error: `Esta invitación fue enviada a ${professional.pendingInviteEmail}. Iniciá sesión con esa cuenta.`
            });
        }

        // Idempotencia: si ya existe un Admin con este userId, devolver el existente
        const existingAdmin = await Admin.findOne({ externalId: userId });
        if (existingAdmin) {
            return res.status(200).json({ message: 'Ya formas parte del equipo.', admin: existingAdmin });
        }

        // Crear Admin en el tenant con rol PROFESSIONAL (sin crear un nuevo Tenant)
        const newAdmin = await Admin.create({
            externalId: userId,
            email,
            tenantId: professional.tenantId,
            role: 'PROFESSIONAL',
        });

        // Vincular la profesional al nuevo admin y limpiar el token
        professional.linkedAdmin = newAdmin._id;
        professional.inviteToken = null;
        professional.inviteTokenExpiry = null;
        professional.pendingInviteEmail = null;
        await professional.save();

        return res.status(201).json({ message: 'Te uniste al equipo exitosamente.', admin: newAdmin });
    } catch (error) {
        console.error('Error al aceptar la invitación:', error);
        return res.status(500).json({ error: 'Error interno del servidor.' });
    }
};
