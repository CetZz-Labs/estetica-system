import mongoose, { Schema, Document } from 'mongoose';

export interface IService extends Document {
    name: string;
    defaultTouchupDays?: number;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}

const ServiceSchema: Schema = new Schema({
    name: { type: String, required: true, trim: true }, // Ej: 'Color + Corte', 'Tratamiento'
    defaultTouchupDays: { type: Number }, // Días sugeridos para calcular automáticamente el próximo retoque
    isActive: { type: Boolean, default: true }
}, {
    timestamps: true
});

export const Service = mongoose.model<IService>('Service', ServiceSchema);