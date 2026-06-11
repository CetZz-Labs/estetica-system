import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IProduct extends Document {
    tenantId: Types.ObjectId;
    name: string;
    brand: string;
    stock: number;
    description?: string;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}

const ProductSchema: Schema = new Schema({
    tenantId: {
        type: Schema.Types.ObjectId,
        ref: 'Tenant',
        required: true,
        index: true
    },
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

// Cubre el listado de getProducts (filtro por tenant + activos, orden por marca y nombre).
// Nota EP-08: la unicidad name+brand sigue siendo a nivel de aplicación (regex case-insensitive
// en productController, ahora acotada por tenantId). Un índice unique compuesto NO replicaría
// la insensibilidad a mayúsculas, por eso no se crea.
ProductSchema.index({ tenantId: 1, isActive: 1, brand: 1, name: 1 });

export const Product = mongoose.model<IProduct>('Product', ProductSchema);