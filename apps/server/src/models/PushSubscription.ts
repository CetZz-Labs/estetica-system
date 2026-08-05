import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IPushSubscriptionKeys {
    p256dh: string;
    auth: string;
}

export interface IPushSubscription extends Document {
    tenantId: Types.ObjectId;
    adminId: Types.ObjectId;
    endpoint: string;
    keys: IPushSubscriptionKeys;
    createdAt: Date;
    updatedAt: Date;
}

const PushSubscriptionSchema: Schema = new Schema({
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    adminId: { type: Schema.Types.ObjectId, ref: 'Admin', required: true, index: true },
    // Identifica unívocamente la suscripción del navegador/dispositivo. Sin isActive/soft-delete:
    // es un token de dispositivo efímero, no un registro de negocio (ver docs/db-schema.md).
    endpoint: { type: String, required: true, unique: true, trim: true, index: true },
    keys: {
        _id: false,
        p256dh: { type: String, required: true, trim: true },
        auth: { type: String, required: true, trim: true }
    }
}, {
    timestamps: true
});

// Cron diario: obtener todas las suscripciones de los admins de un tenant
PushSubscriptionSchema.index({ tenantId: 1, adminId: 1 });

export const PushSubscription = mongoose.model<IPushSubscription>('PushSubscription', PushSubscriptionSchema);
