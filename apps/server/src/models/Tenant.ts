import mongoose, { Schema, Document } from 'mongoose';

export interface ITenant extends Document {
    name: string;
    logo?: string;
    timezone: string;
    currency: string;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}

const TenantSchema: Schema = new Schema({
    name: { type: String, required: true, trim: true },
    logo: { type: String },
    timezone: { type: String, default: 'America/Argentina/Buenos_Aires' },
    currency: { type: String, default: 'ARS' },
    isActive: { type: Boolean, default: true }
}, {
    timestamps: true
});

export const Tenant = mongoose.model<ITenant>('Tenant', TenantSchema);
