import mongoose, { Schema, Document, Types } from 'mongoose';

interface IUsedProduct {
    product: Types.ObjectId;
    quantity: number; // Por ejemplo: gramos, ml o unidades
}

export interface IServiceRecord extends Document {
    tenantId: Types.ObjectId;
    client: Types.ObjectId;
    service: Types.ObjectId;
    professional?: Types.ObjectId;
    serviceDate: Date;
    notes?: string;
    productsUsed: IUsedProduct[];
    nextTouchupDate?: Date;
    touchupStatus: 'pending' | 'completed' | 'cancelled';
    appointment?: Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}

const ServiceRecordSchema: Schema = new Schema({
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    client: { type: Schema.Types.ObjectId, ref: 'Client', required: true, index: true },
    service: { type: Schema.Types.ObjectId, ref: 'Service', required: true },
    // Profesional que realizó la visita. Sin 'required' en schema: requerido en nuevos
    // registros vía controller, pero opcional para datos legacy (anteriores a EP-11).
    professional: { type: Schema.Types.ObjectId, ref: 'Professional', index: true },
    serviceDate: { type: Date, required: true, index: true },

    notes: { type: String, trim: true }, // Ej: "Balayage rubio miel, corte en capas"
    productsUsed: [{
        product: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
        quantity: { type: Number, required: true, min: 0 }
    }],

    // Lógica del Dashboard ("Próximos retoques")
    nextTouchupDate: { type: Date, index: true },
    touchupStatus: {
        type: String,
        enum: ['pending', 'completed', 'cancelled'],
        default: 'pending',
        index: true
    },
    appointment: { type: Schema.Types.ObjectId, ref: 'Appointment', default: null }
}, {
    timestamps: true
});

// Índice compuesto vital para que el Dashboard principal cargue al instante (acotado por tenant)
ServiceRecordSchema.index({ tenantId: 1, touchupStatus: 1, nextTouchupDate: 1 });
// Historial de visitas por cliente dentro del tenant
ServiceRecordSchema.index({ tenantId: 1, client: 1, serviceDate: -1 });
// Últimos movimientos del tenant
ServiceRecordSchema.index({ tenantId: 1, createdAt: -1 });

export const ServiceRecord = mongoose.model<IServiceRecord>('ServiceRecord', ServiceRecordSchema);