import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IProfessional extends Document {
    tenantId: Types.ObjectId;
    name: string;
    color: string;
    isActive: boolean;
    linkedAdmin?: Types.ObjectId | null;
    createdAt: Date;
    updatedAt: Date;
}

const ProfessionalSchema: Schema = new Schema({
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    name: { type: String, required: true, trim: true },
    color: {
        type: String,
        required: true,
        // Validamos formato hexadecimal #RRGGBB para el swatch de color del calendario
        match: [/^#[0-9A-Fa-f]{6}$/, 'El color debe tener formato hexadecimal #RRGGBB']
    },
    isActive: { type: Boolean, default: true },
    // Vínculo opcional a un usuario con login (Admin). EP-12 expandirá el flujo de invitación.
    linkedAdmin: { type: Schema.Types.ObjectId, ref: 'Admin', default: null }
}, {
    timestamps: true
});

// Listado de gestión (por tenant + estado)
ProfessionalSchema.index({ tenantId: 1, isActive: 1 });
// Orden alfabético por nombre dentro del tenant (los nombres NO son únicos)
ProfessionalSchema.index({ tenantId: 1, name: 1 });

export const Professional = mongoose.model<IProfessional>('Professional', ProfessionalSchema);
