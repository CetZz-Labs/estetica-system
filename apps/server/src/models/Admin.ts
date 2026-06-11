import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IAdmin extends Document {
    externalId: string; // El ID que te entrega Clerk (ej. user_2Nf...)
    tenantId: Types.ObjectId; // Tenant (centro de estética) al que pertenece el admin
    email: string;
    role: 'ADMIN' | 'MANAGER' | 'SUPERADMIN'; // Puedes expandir esto a futuro
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}

const AdminSchema: Schema = new Schema({
    externalId: {
        type: String,
        required: true,
        unique: true,
        index: true // ¡Crucial! Acelera la búsqueda, ya que el middleware consultará esto en CADA petición protegida
    },
    // Multi-tenancy: cada admin pertenece a un único tenant.
    // Decisión EP-08: externalId y email se mantienen únicos GLOBALES (un usuario Clerk = un solo tenant).
    tenantId: {
        type: Schema.Types.ObjectId,
        ref: 'Tenant',
        required: true,
        index: true
    },
    email: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        lowercase: true
    },
    role: {
        type: String,
        enum: ['ADMIN', 'MANAGER', 'SUPERADMIN'],
        default: 'ADMIN'
    },
    isActive: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true
});

export const Admin = mongoose.model<IAdmin>('Admin', AdminSchema);