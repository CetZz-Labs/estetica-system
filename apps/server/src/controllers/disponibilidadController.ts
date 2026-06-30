import { Request, Response } from 'express';
import { Tenant, IDaySchedule } from '../models/Tenant';

const DEFAULT_SCHEDULE: IDaySchedule[] = [
    { day: 0, isOpen: false, openTime: '09:00', closeTime: '18:00' },
    { day: 1, isOpen: true,  openTime: '09:00', closeTime: '18:00' },
    { day: 2, isOpen: true,  openTime: '09:00', closeTime: '18:00' },
    { day: 3, isOpen: true,  openTime: '09:00', closeTime: '18:00' },
    { day: 4, isOpen: true,  openTime: '09:00', closeTime: '18:00' },
    { day: 5, isOpen: true,  openTime: '09:00', closeTime: '18:00' },
    { day: 6, isOpen: true,  openTime: '09:00', closeTime: '14:00' },
];

export const getDisponibilidad = async (req: Request, res: Response) => {
    try {
        const tenant = await Tenant.findById(req.tenantId);
        if (!tenant) {
            return res.status(404).json({ error: 'Negocio no encontrado' });
        }

        if (tenant.businessHours?.schedule?.length === 7) {
            return res.status(200).json({
                schedule: tenant.businessHours.schedule,
                blockedDates: tenant.businessHours.blockedDates ?? []
            });
        }

        return res.status(200).json({
            schedule: DEFAULT_SCHEDULE,
            blockedDates: []
        });
    } catch (error) {
        console.error('Error al obtener disponibilidad:', error);
        return res.status(500).json({ error: 'Error interno del servidor' });
    }
};

export const updateDisponibilidad = async (req: Request, res: Response) => {
    try {
        const { schedule, blockedDates } = req.body;

        if (schedule !== undefined && schedule.length !== 7) {
            return res.status(400).json({ error: 'El horario debe tener exactamente 7 días (0=Dom a 6=Sáb)' });
        }

        const updates: Record<string, unknown> = {};
        if (schedule !== undefined) {
            updates['businessHours.schedule'] = schedule;
        }
        if (blockedDates !== undefined) {
            updates['businessHours.blockedDates'] = blockedDates;
        }

        if (Object.keys(updates).length === 0) {
            return res.status(400).json({ error: 'No se enviaron campos para actualizar' });
        }

        const updated = await Tenant.findByIdAndUpdate(
            req.tenantId,
            { $set: updates },
            { new: true, runValidators: true }
        );

        if (!updated) {
            return res.status(404).json({ error: 'Negocio no encontrado' });
        }

        return res.status(200).json({
            schedule: updated.businessHours?.schedule ?? [],
            blockedDates: updated.businessHours?.blockedDates ?? []
        });
    } catch (error) {
        console.error('Error al actualizar disponibilidad:', error);
        return res.status(500).json({ error: 'Error interno del servidor' });
    }
};
