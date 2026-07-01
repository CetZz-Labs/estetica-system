import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IClient extends Document {
    tenantId: Types.ObjectId;
    firstName: string;
    lastName: string;
    phone?: string;
    email?: string;
    medicalNotes?: string;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}

const ClientSchema: Schema = new Schema({
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    phone: { type: String, trim: true },
    email: { type: String, trim: true, lowercase: true },
    medicalNotes: { type: String, trim: true }, // Ej: "Alérgica a la PPD"
    isActive: { type: Boolean, default: true } // Para no borrar el historial si deja de asistir
}, {
    timestamps: true
});

// Cubre el listado de getClients (filtro por tenant + activos, orden por apellido)
ClientSchema.index({ tenantId: 1, isActive: 1, lastName: 1 });

export const Client = mongoose.model<IClient>('Client', ClientSchema);
