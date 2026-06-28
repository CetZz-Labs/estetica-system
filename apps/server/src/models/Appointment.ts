import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IAppointment extends Document {
    tenantId: Types.ObjectId;
    client: Types.ObjectId;
    service?: Types.ObjectId;
    professional?: Types.ObjectId;
    startTime: Date;
    endTime: Date;
    status: 'pending' | 'confirmed' | 'cancelled' | 'completed';
    notes?: string;
    cancelReason?: string;
    cancelledAt?: Date;
    cancelledBy?: Types.ObjectId;
    createdBy: Types.ObjectId;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}

const AppointmentSchema: Schema = new Schema({
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    client: { type: Schema.Types.ObjectId, ref: 'Client', required: true },
    service: { type: Schema.Types.ObjectId, ref: 'Service' },
    professional: { type: Schema.Types.ObjectId, ref: 'Professional' },
    startTime: { type: Date, required: true },
    endTime: { type: Date, required: true },
    status: {
        type: String,
        enum: ['pending', 'confirmed', 'cancelled', 'completed'],
        default: 'pending'
    },
    notes: { type: String, trim: true },
    cancelReason: { type: String, trim: true },
    cancelledAt: { type: Date },
    cancelledBy: { type: Schema.Types.ObjectId, ref: 'Admin' },
    createdBy: { type: Schema.Types.ObjectId, ref: 'Admin', required: true },
    isActive: { type: Boolean, default: true }
}, {
    timestamps: true
});

AppointmentSchema.index({ tenantId: 1, startTime: 1, status: 1 });
AppointmentSchema.index({ tenantId: 1, client: 1, startTime: -1 });
AppointmentSchema.index({ tenantId: 1, professional: 1, startTime: 1, status: 1 });

export const Appointment = mongoose.model<IAppointment>('Appointment', AppointmentSchema);
