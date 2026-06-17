import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IService extends Document {
    tenantId: Types.ObjectId;
    name: string;
    duration?: number;
    defaultTouchupDays?: number;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}

const ServiceSchema: Schema = new Schema({
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    name: { type: String, required: true, trim: true }, // Ej: 'Color + Corte', 'Tratamiento'
    duration: { type: Number, default: 60 }, // Duración en minutos, usado para calcular fin del turno
    defaultTouchupDays: { type: Number }, // Días sugeridos para calcular automáticamente el próximo retoque
    isActive: { type: Boolean, default: true }
}, {
    timestamps: true
});

// Cubre el listado de getServices (filtro por tenant + activos, orden por nombre)
ServiceSchema.index({ tenantId: 1, isActive: 1, name: 1 });

export const Service = mongoose.model<IService>('Service', ServiceSchema);
