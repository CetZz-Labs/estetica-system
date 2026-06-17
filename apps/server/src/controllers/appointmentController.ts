import { Request, Response } from 'express';
import { Appointment } from '../models/Appointment';
import { Service } from '../models/Service';
import { ServiceRecord } from '../models/ServiceRecord';
import { Product } from '../models/Product';

export const createAppointment = async (req: Request, res: Response) => {
    try {
        const { client, service, startTime, notes } = req.body;

        if (!client || !service || !startTime) {
            return res.status(400).json({ error: 'Faltan campos obligatorios: client, service, startTime' });
        }

        // TEMPORAL (EP-14): se asigna el admin autenticado como profesional.
        // Cuando se implemente EP-11/12 (gestión de usuarios), esto debe cambiarse
        // para leer `professional` del body y validar que pertenece al tenant.
        // Ver docs/migration-guides/professional-from-admin-to-ep11.md
        const professionalId = req.adminInfo!._id;

        const serviceDoc = await Service.findOne({ _id: service, tenantId: req.tenantId, isActive: true });
        if (!serviceDoc) {
            return res.status(404).json({ error: 'Servicio no encontrado' });
        }

        const duration = serviceDoc.duration || 60;
        const startDate = new Date(startTime);
        const endDate = new Date(startDate.getTime() + duration * 60000);

        const overlap = await Appointment.findOne({
            tenantId: req.tenantId,
            professional: professionalId,
            isActive: true,
            status: { $in: ['pending', 'confirmed'] },
            startTime: { $lt: endDate },
            endTime: { $gt: startDate }
        }).populate('client', 'firstName lastName');

        if (overlap) {
            return res.status(409).json({
                error: 'El profesional ya tiene un turno asignado en este horario',
                overlap: {
                    _id: overlap._id,
                    client: overlap.client,
                    startTime: overlap.startTime,
                    endTime: overlap.endTime
                }
            });
        }

        const newAppointment = new Appointment({
            tenantId: req.tenantId,
            client,
            service,
            professional: professionalId,
            startTime: startDate,
            endTime: endDate,
            notes,
            createdBy: req.adminInfo!._id,
            isActive: true,
            status: 'pending'
        });

        const saved = await newAppointment.save();
        return res.status(201).json(saved);
    } catch (error) {
        console.error('Error al crear el turno:', error);
        return res.status(500).json({ error: 'Error interno del servidor al crear el turno' });
    }
};

export const getAppointments = async (req: Request, res: Response) => {
    try {
        const { startDate, endDate, professional, status } = req.query;

        const filter: any = { tenantId: req.tenantId, isActive: true };

        if (startDate || endDate) {
            filter.startTime = {};
            if (startDate) filter.startTime.$gte = new Date(startDate as string);
            if (endDate) filter.startTime.$lte = new Date(endDate as string);
        }

        if (professional) filter.professional = professional;
        if (status) filter.status = status;

        const appointments = await Appointment.find(filter)
            .populate('client', 'firstName lastName')
            .populate('service', 'name duration')
            .populate('professional', 'email')
            .sort({ startTime: 1 });

        return res.status(200).json(appointments);
    } catch (error) {
        console.error('Error al obtener los turnos:', error);
        return res.status(500).json({ error: 'Error interno del servidor al obtener los turnos' });
    }
};

export const getAppointmentById = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        const appointment = await Appointment.findOne({ _id: id, tenantId: req.tenantId })
            .populate('client', 'firstName lastName')
            .populate('service', 'name duration')
            .populate('professional', 'email');

        if (!appointment || !appointment.isActive) {
            return res.status(404).json({ error: 'Turno no encontrado' });
        }

        return res.status(200).json(appointment);
    } catch (error) {
        console.error('Error al obtener el turno por ID:', error);
        return res.status(500).json({ error: 'Error interno del servidor al obtener el turno' });
    }
};

export const updateAppointment = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { client, service, professional, startTime, notes, status } = req.body;

        const existing = await Appointment.findOne({ _id: id, tenantId: req.tenantId, isActive: true });
        if (!existing) {
            return res.status(404).json({ error: 'Turno no encontrado' });
        }

        let newEndTime: Date | undefined;
        let serviceDuration = 60;

        if (startTime || service) {
            const serviceId = service || existing.service;
            const serviceDoc = await Service.findOne({ _id: serviceId, tenantId: req.tenantId, isActive: true });
            if (!serviceDoc) {
                return res.status(404).json({ error: 'Servicio no encontrado' });
            }
            serviceDuration = serviceDoc.duration || 60;
        }

        if (startTime) {
            newEndTime = new Date(new Date(startTime).getTime() + serviceDuration * 60000);
        }

        const checkProfessional = professional || existing.professional;
        const checkStartTime = startTime ? new Date(startTime) : existing.startTime;
        const checkEndTime = newEndTime || existing.endTime;

        if (professional || startTime) {
            const overlap = await Appointment.findOne({
                _id: { $ne: id },
                tenantId: req.tenantId,
                professional: checkProfessional,
                isActive: true,
                status: { $in: ['pending', 'confirmed'] },
                startTime: { $lt: checkEndTime },
                endTime: { $gt: checkStartTime }
            });

            if (overlap) {
                return res.status(409).json({
                    error: 'El profesional ya tiene un turno asignado en este horario',
                    overlap: {
                        _id: overlap._id,
                        startTime: overlap.startTime,
                        endTime: overlap.endTime
                    }
                });
            }
        }

        const $set: any = {};
        if (client !== undefined) $set.client = client;
        if (service !== undefined) $set.service = service;
        if (professional !== undefined) $set.professional = professional;
        if (startTime !== undefined) $set.startTime = new Date(startTime);
        if (newEndTime !== undefined) $set.endTime = newEndTime;
        if (notes !== undefined) $set.notes = notes;
        if (status !== undefined) $set.status = status;

        const updated = await Appointment.findOneAndUpdate(
            { _id: id, tenantId: req.tenantId, isActive: true },
            { $set },
            { new: true, runValidators: true }
        );

        return res.status(200).json(updated);
    } catch (error) {
        console.error('Error al actualizar el turno:', error);
        return res.status(500).json({ error: 'Error interno del servidor al actualizar el turno' });
    }
};

export const completeAppointment = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { notes, productsUsed, nextTouchupDate } = req.body;

        const appointment = await Appointment.findOne({ _id: id, tenantId: req.tenantId, isActive: true });
        if (!appointment) {
            return res.status(404).json({ error: 'Turno no encontrado' });
        }
        if (appointment.status === 'cancelled') {
            return res.status(400).json({ error: 'No se puede completar un turno cancelado' });
        }
        if (appointment.status === 'completed') {
            return res.status(400).json({ error: 'El turno ya fue completado' });
        }

        const serviceDate = appointment.startTime;

        // Buscamos el servicio para conocer defaultTouchupDays y duration.
        const serviceDoc = await Service.findOne({ _id: appointment.service, tenantId: req.tenantId });

        let finalNextTouchupDate = nextTouchupDate;

        // Stock deduction
        if (productsUsed && Array.isArray(productsUsed) && productsUsed.length > 0) {
            for (const item of productsUsed) {
                const product = await Product.findOne({ _id: item.product, tenantId: req.tenantId });
                if (!product) {
                    return res.status(404).json({ error: `Producto con ID ${item.product} no encontrado` });
                }
                if (product.stock < item.quantity) {
                    return res.status(400).json({
                        error: `Stock insuficiente para ${product.name}. Disponible: ${product.stock}, Requerido: ${item.quantity}`
                    });
                }
                product.stock -= item.quantity;
                await product.save();
            }
        }

        // Calculate nextTouchupDate from service if not provided.
        // serviceDate es appointment.startTime, el turno que se está completando ahora,
        // que por construcción ES el último turno realizado por este cliente.
        if (!finalNextTouchupDate && serviceDoc && serviceDoc.defaultTouchupDays && serviceDoc.defaultTouchupDays > 0) {
            const date = new Date(serviceDate);
            date.setDate(date.getDate() + serviceDoc.defaultTouchupDays);
            date.setHours(serviceDate.getHours(), serviceDate.getMinutes(), 0, 0);
            finalNextTouchupDate = date;
        }

        // Auto-complete previous pending touchups for this client+service
        await ServiceRecord.updateMany(
            {
                tenantId: req.tenantId,
                client: appointment.client,
                service: appointment.service,
                touchupStatus: 'pending'
            },
            { $set: { touchupStatus: 'completed' } }
        );

        // Create service record linked to appointment
        const serviceRecord = new ServiceRecord({
            tenantId: req.tenantId,
            client: appointment.client,
            service: appointment.service,
            serviceDate,
            notes,
            productsUsed: productsUsed || [],
            nextTouchupDate: finalNextTouchupDate,
            touchupStatus: finalNextTouchupDate ? 'pending' : 'completed',
            appointment: appointment._id,
        });
        const saved = await serviceRecord.save();

        // Mark appointment as completed
        appointment.status = 'completed';
        if (notes !== undefined) appointment.notes = notes;
        await appointment.save();

        // Auto-create next touchup appointment in calendar
        let touchupAppointment = null;
        if (finalNextTouchupDate) {
            const touchupStart = new Date(finalNextTouchupDate);

            const duration = serviceDoc?.duration || 60;
            const touchupEnd = new Date(touchupStart.getTime() + duration * 60000);

            touchupAppointment = await Appointment.create({
                tenantId: req.tenantId,
                client: appointment.client,
                service: appointment.service,
                professional: appointment.professional,
                startTime: touchupStart,
                endTime: touchupEnd,
                status: 'pending',
                notes: 'Retoque programado automáticamente',
                createdBy: req.adminInfo!._id,
                isActive: true,
            });
        }

        return res.status(201).json({
            serviceRecord: saved,
            appointment,
            touchupAppointment
        });
    } catch (error) {
        console.error('Error al completar turno:', error);
        return res.status(500).json({ error: 'Error interno del servidor al completar el turno' });
    }
};

export const getPendingRegistration = async (req: Request, res: Response) => {
    try {
        const appointments = await Appointment.find({
            tenantId: req.tenantId,
            isActive: true,
            status: 'completed',
            _id: { $nin: await ServiceRecord.find({ tenantId: req.tenantId }).distinct('appointment') }
        })
            .populate('client', 'firstName lastName')
            .populate('service', 'name')
            .sort({ startTime: -1 });

        return res.status(200).json(appointments);
    } catch (error) {
        console.error('Error al obtener turnos pendientes de registro:', error);
        return res.status(500).json({ error: 'Error interno del servidor' });
    }
};

export const cancelAppointment = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { cancelReason } = req.body;

        const updated = await Appointment.findOneAndUpdate(
            { _id: id, tenantId: req.tenantId, isActive: true, status: { $ne: 'cancelled' } },
            {
                $set: {
                    status: 'cancelled',
                    cancelReason: cancelReason || '',
                    cancelledAt: new Date(),
                    cancelledBy: req.adminInfo!._id
                }
            },
            { new: true }
        );

        if (!updated) {
            return res.status(404).json({ error: 'Turno no encontrado o ya cancelado' });
        }

        return res.status(200).json(updated);
    } catch (error) {
        console.error('Error al cancelar el turno:', error);
        return res.status(500).json({ error: 'Error interno del servidor al cancelar el turno' });
    }
};

export const getClientAppointments = async (req: Request, res: Response) => {
    try {
        const { clientId } = req.params;
        const { status } = req.query;

        const filter: any = { tenantId: req.tenantId, client: clientId, isActive: true };
        if (status) filter.status = status;

        const appointments = await Appointment.find(filter)
            .populate('service', 'name')
            .populate('professional', 'email')
            .sort({ startTime: -1 });

        return res.status(200).json(appointments);
    } catch (error) {
        console.error('Error al obtener los turnos del cliente:', error);
        return res.status(500).json({ error: 'Error interno del servidor al obtener los turnos del cliente' });
    }
};
