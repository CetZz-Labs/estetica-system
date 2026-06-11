import { Request, Response } from 'express';
import { getAuth, clerkClient } from '@clerk/express';
import { Tenant } from '../models/Tenant';
import { Admin } from '../models/Admin';

// POST /api/onboarding — Registro autónomo de un nuevo tenant (EP-09).
// EXCEPCIÓN DOCUMENTADA (GOV-AUTH): este endpoint NO usa checkAdminAccess/checkTenantAccess
// porque el Admin todavía no existe en MongoDB. El gate es la sesión Clerk (getAuth)
// más la verificación defensiva del email primario.
export const createTenantWithAdmin = async (req: Request, res: Response) => {
    try {
        const { userId } = getAuth(req);

        if (!userId) {
            return res.status(401).json({ error: 'Usuario no autenticado en Clerk' });
        }

        // El email se toma de Clerk (fuente autoritativa), nunca del body
        const clerkUser = await clerkClient.users.getUser(userId);
        const primaryEmail = clerkUser.emailAddresses.find(
            (address) => address.id === clerkUser.primaryEmailAddressId
        );

        // Gate defensivo: el email primario debe estar verificado por Clerk
        if (!primaryEmail || primaryEmail.verification?.status !== 'verified') {
            return res.status(403).json({ error: 'El correo electrónico no está verificado.' });
        }

        const email = primaryEmail.emailAddress.toLowerCase().trim();

        // Idempotencia: si el usuario ya completó el onboarding, devolvemos lo existente
        const existingAdmin = await Admin.findOne({ externalId: userId });
        if (existingAdmin) {
            const existingTenant = await Tenant.findById(existingAdmin.tenantId);
            return res.status(200).json({ tenant: existingTenant, admin: existingAdmin });
        }

        // El email es único GLOBAL (decisión EP-08): si pertenece a otro usuario Clerk → conflicto
        const emailTaken = await Admin.findOne({ email });
        if (emailTaken) {
            return res.status(409).json({
                error: 'El correo electrónico ya está registrado en otro negocio.'
            });
        }

        const { businessName } = req.body;

        const tenant = await Tenant.create({ name: businessName });

        let admin;
        try {
            admin = await Admin.create({
                externalId: userId,
                email,
                tenantId: tenant._id,
                role: 'ADMIN'
            });
        } catch (creationError) {
            // Compensación manual (sin transacciones disponibles en standalone):
            // si falla la creación del Admin, eliminamos el Tenant huérfano antes de responder 500
            await Tenant.findByIdAndDelete(tenant._id);
            throw creationError;
        }

        return res.status(201).json({ tenant, admin });
    } catch (error) {
        console.error('Error en el onboarding del nuevo tenant:', error);
        return res.status(500).json({ error: 'Error interno del servidor durante el registro del negocio' });
    }
};
