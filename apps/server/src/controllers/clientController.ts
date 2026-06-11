import { Request, Response } from 'express';
import { Client } from '../models/Client';

// 1. Create (POST /api/clientes)
export const createClient = async (req: Request, res: Response) => {
    try {
        const { firstName, lastName, phone, medicalNotes } = req.body;

        const newClient = new Client({
            tenantId: req.tenantId,
            firstName,
            lastName,
            phone,
            medicalNotes,
            isActive: true
        });

        const savedClient = await newClient.save();
        
        // Retornamos 201 Created
        return res.status(201).json(savedClient);
    } catch (error) {
        console.error('Error al crear el cliente:', error);
        return res.status(500).json({ error: 'Error interno del servidor al crear el cliente' });
    }
};

// 2. Read All (GET /api/clientes)
export const getClients = async (req: Request, res: Response) => {
    try {
        // Filtrar por tenant, solo los activos y ordenar alfabéticamente por apellido (1 es ascendente)
        const clients = await Client.find({ tenantId: req.tenantId, isActive: true }).sort({ lastName: 1 });
        return res.status(200).json(clients);
    } catch (error) {
        console.error('Error al obtener los clientes:', error);
        return res.status(500).json({ error: 'Error interno del servidor al obtener los clientes' });
    }
};

// 3. Read One (GET /api/clientes/:id)
export const getClientById = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        const client = await Client.findOne({ _id: id, tenantId: req.tenantId });

        // Si no existe o no está activo, devolvemos 404 Not Found
        if (!client || !client.isActive) {
            return res.status(404).json({ error: 'Cliente no encontrado' });
        }

        return res.status(200).json(client);
    } catch (error) {
        console.error('Error al obtener el cliente por ID:', error);
        return res.status(500).json({ error: 'Error interno del servidor al obtener el cliente' });
    }
};

// 4. Update (PUT /api/clientes/:id)
export const updateClient = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { firstName, lastName, phone, medicalNotes } = req.body;

        // Actualizamos buscando por ID dentro del tenant y asegurándonos de que esté activo
        const updatedClient = await Client.findOneAndUpdate(
            { _id: id, tenantId: req.tenantId, isActive: true },
            { 
                $set: { 
                    ...(firstName !== undefined && { firstName }),
                    ...(lastName !== undefined && { lastName }),
                    ...(phone !== undefined && { phone }),
                    ...(medicalNotes !== undefined && { medicalNotes })
                }
            },
            { new: true, runValidators: true } // new: true devuelve el doc actualizado
        );

        if (!updatedClient) {
            return res.status(404).json({ error: 'Cliente no encontrado o inactivo' });
        }

        return res.status(200).json(updatedClient);
    } catch (error) {
        console.error('Error al actualizar el cliente:', error);
        return res.status(500).json({ error: 'Error interno del servidor al actualizar el cliente' });
    }
};

// 5. Delete (DELETE /api/clientes/:id) - Soft Delete
export const deleteClient = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        // IMPORTANTE: Soft Delete, solo actualizamos isActive a false
        const deletedClient = await Client.findOneAndUpdate(
            { _id: id, tenantId: req.tenantId, isActive: true },
            { $set: { isActive: false } },
            { new: true }
        );

        if (!deletedClient) {
            return res.status(404).json({ error: 'Cliente no encontrado o ya ha sido eliminado' });
        }

        return res.status(200).json({ 
            message: 'Cliente eliminado correctamente', 
            client: deletedClient 
        });
    } catch (error) {
        console.error('Error al eliminar el cliente:', error);
        return res.status(500).json({ error: 'Error interno del servidor al eliminar el cliente' });
    }
};
