import mongoose, { Schema, Document, Types } from 'mongoose';

interface IUsedProduct {
    product: Types.ObjectId;
    quantity: number; // Por ejemplo: gramos, ml o unidades
    // UX-81: estimación libre e informativa de la profesional ("% que quedó en el envase
    // tras esta visita"). NO participa del descuento/reconciliación de stock (quantity).
    remainingLevel?: number;
    // UX-83: elección explícita "usar envase ya abierto" (true) vs "abrir uno nuevo" (false).
    // A diferencia de remainingLevel (opcional, "sin dato" = undefined), este campo SIEMPRE se
    // persiste explícito (default false) — la reconciliación por delta de P17 en
    // updateServiceRecord necesita conocer el estado histórico exacto de cada item guardado,
    // no puede inferirlo de "sin dato".
    usedExistingUnit: boolean;
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
        quantity: { type: Number, required: true, min: 0 },
        // UX-81: dato puramente informativo, no afecta el descuento de stock (P4/P6/P17).
        remainingLevel: { type: Number, min: 0, max: 100 },
        // UX-83: default false, siempre persistido explícito (ver comentario de la interfaz).
        usedExistingUnit: { type: Boolean, default: false }
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
// Listado general paginado (UX-30): visitas del tenant sin filtro de cliente, ordenadas por fecha
ServiceRecordSchema.index({ tenantId: 1, serviceDate: -1 });

export const ServiceRecord = mongoose.model<IServiceRecord>('ServiceRecord', ServiceRecordSchema);