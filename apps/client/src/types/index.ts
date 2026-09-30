export interface Paginated<T> {
    data: T[];
    meta: {
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    };
}

export type AdminRole = 'ADMIN' | 'PROFESSIONAL' | 'RECEPTIONIST';

export interface AdminInfo {
    _id: string;
    email: string;
    role: AdminRole;
    tenantId: string;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface Product {
    _id: string;
    name: string;
    brand: string;
    stock: number;
    description?: string;
    isActive: boolean;
    /** UX-90 (Opción A): % (1-99) del único envase ABIERTO; `stock` cuenta solo envases cerrados. undefined = no hay envase abierto. Con stock 0 y abierto el producto sigue siendo utilizable. */
    currentUnitLevel?: number;
    createdAt: string;
    updatedAt: string;
}

export interface UsedProduct {
    product: Product | string; // Puede venir el ID (string) o el objeto populado (Product)
    /** Derivado por el server (UX-90): ceil(usedPercent/100). Opcional en lectura (historial legacy). */
    quantity?: number;
    /** UX-90: TOTAL de puntos consumidos en la visita (100 = un envase entero; puede superar 100). Ausente en historial legacy. */
    usedPercent?: number;
    /** % que quedó en el envase abierto tras la visita (derivado por el server; legacy: informado por la profesional). */
    remainingLevel?: number;
    /** Derivado por el server: había un envase abierto al empezar la visita (legacy: reutilizó el abierto). */
    usedExistingUnit?: boolean;
}

// Interfaz para el Cliente poblado (reducido a los campos que devuelve el endpoint de retoques)
export interface ClientSlim {
    _id: string;
    firstName: string;
    lastName: string;
    phone?: string;
}

// Interfaz para el Servicio poblado
export interface ServiceSlim {
    _id: string;
    name: string;
}

// Interfaz principal para el Registro de Servicio (Historial/Retoque)
export interface ServiceRecord {
    _id: string;
    client: ClientSlim;
    service: ServiceSlim;
    serviceDate: string; // ISO string
    notes?: string;
    productsUsed?: UsedProduct[];
    nextTouchupDate?: string; // ISO string
    touchupStatus: 'pending' | 'completed' | 'cancelled';
    appointment?: string;
    professional?: { _id: string; name: string; color: string };
    createdAt: string; // ISO string
    updatedAt: string; // ISO string
    __v?: number;
}

export interface Client {
    _id: string;
    firstName: string;
    lastName: string;
    phone?: string;
    email?: string;
    medicalNotes?: string;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface Service {
    _id: string;
    name: string;
    duration: number;
    defaultTouchupDays: number;
    createdAt: string;
    updatedAt: string;
}

export interface Professional {
    _id: string;
    name: string;
    color: string;
    isActive: boolean;
    linkedAdmin?: string;
    createdAt: string;
    updatedAt: string;
}

export interface Appointment {
    _id: string;
    client: { _id: string; firstName: string; lastName: string; phone?: string };
    service?: { _id: string; name: string; duration: number };
    professional?: { _id: string; name: string; color: string };
    startTime: string;
    endTime: string;
    status: 'pending' | 'confirmed' | 'cancelled' | 'completed';
    notes?: string;
    cancelReason?: string;
    cancelledAt?: string;
    cancelledBy?: string;
    createdBy: string;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface AdminSlim {
    _id: string;
    email: string;
}