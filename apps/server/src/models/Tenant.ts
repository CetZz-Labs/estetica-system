import mongoose, { Schema, Document } from 'mongoose';

export interface IDaySchedule {
    day: number;      // 0=Dom, 1=Lun, ..., 6=Sáb
    isOpen: boolean;
    openTime: string;  // "HH:MM"
    closeTime: string; // "HH:MM"
}

export interface IBlockedDate {
    date: string;     // "YYYY-MM-DD"
    reason?: string;
}

export interface IBusinessHours {
    schedule: IDaySchedule[];
    blockedDates: IBlockedDate[];
}

export interface ITenant extends Document {
    name: string;
    logo?: string;
    timezone: string;
    currency: string;
    isActive: boolean;
    businessHours?: IBusinessHours;
    createdAt: Date;
    updatedAt: Date;
}

const TenantSchema: Schema = new Schema({
    name: { type: String, required: true, trim: true },
    logo: { type: String },
    timezone: { type: String, default: 'America/Argentina/Buenos_Aires' },
    currency: { type: String, default: 'ARS' },
    isActive: { type: Boolean, default: true },
    businessHours: {
        schedule: [{
            _id: false,
            day: { type: Number, min: 0, max: 6 },
            isOpen: { type: Boolean, default: true },
            openTime: { type: String, default: '09:00' },
            closeTime: { type: String, default: '18:00' }
        }],
        blockedDates: [{
            _id: false,
            date: { type: String },
            reason: { type: String }
        }]
    }
}, {
    timestamps: true
});

export const Tenant = mongoose.model<ITenant>('Tenant', TenantSchema);
