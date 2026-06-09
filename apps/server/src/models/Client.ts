import mongoose, { Schema, Document } from 'mongoose';

export interface IClient extends Document {
    firstName: string;
    lastName: string;
    phone?: string;
    medicalNotes?: string;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}

const ClientSchema: Schema = new Schema({
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    phone: { type: String, trim: true },
    medicalNotes: { type: String, trim: true }, // Ej: "Alérgica a la PPD"
    isActive: { type: Boolean, default: true } // Para no borrar el historial si deja de asistir
}, {
    timestamps: true
});

export const Client = mongoose.model<IClient>('Client', ClientSchema);