import { Request, Response } from 'express';
import { PushSubscription } from '../models/PushSubscription';

// POST /api/notificaciones/push-subscription
// Whitelist estricta: tenantId se resuelve de req.tenantId, adminId de req.adminInfo._id.
// Upsert por endpoint (mismo navegador puede volver a suscribirse, o cambiar de cuenta/tenant).
export const saveSubscription = async (req: Request, res: Response) => {
    try {
        const { endpoint, keys } = req.body as { endpoint: string; keys: { p256dh: string; auth: string } };

        const existing = await PushSubscription.findOne({ endpoint });

        const subscription = await PushSubscription.findOneAndUpdate(
            { endpoint },
            {
                $set: {
                    tenantId: req.tenantId,
                    adminId: req.adminInfo!._id,
                    keys: { p256dh: keys.p256dh, auth: keys.auth }
                }
            },
            { upsert: true, new: true, runValidators: true }
        );

        return res.status(existing ? 200 : 201).json(subscription);
    } catch (error) {
        console.error('Error al guardar suscripción push:', error);
        return res.status(500).json({ error: 'Error interno del servidor' });
    }
};

// DELETE /api/notificaciones/push-subscription
// Anti-IDOR: solo borra la suscripción si pertenece al tenant + admin del request autenticado.
export const deleteSubscription = async (req: Request, res: Response) => {
    try {
        const { endpoint } = req.body as { endpoint: string };

        const deleted = await PushSubscription.findOneAndDelete({
            endpoint,
            tenantId: req.tenantId,
            adminId: req.adminInfo!._id
        });

        if (!deleted) {
            return res.status(404).json({ error: 'Suscripción no encontrada' });
        }

        return res.status(200).json({ message: 'Suscripción eliminada correctamente' });
    } catch (error) {
        console.error('Error al eliminar suscripción push:', error);
        return res.status(500).json({ error: 'Error interno del servidor' });
    }
};
