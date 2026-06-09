import mongoose, { Schema, Document } from 'mongoose';

export interface IProduct extends Document {
    name: string;
    brand: string;
    stock: number;
    description?: string;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}

const ProductSchema: Schema = new Schema({
    name: {
        type: String,
        required: [true, 'El nombre del producto es obligatorio'],
        trim: true
    },
    brand: {
        type: String,
        required: [true, 'La marca es obligatoria'],
        trim: true
    },
    stock: {
        type: Number,
        required: true,
        default: 0,
        min: [0, 'El stock no puede ser negativo']
    },
    description: {
        type: String,
        trim: true
    },
    isActive: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true
});

export const Product = mongoose.model<IProduct>('Product', ProductSchema);