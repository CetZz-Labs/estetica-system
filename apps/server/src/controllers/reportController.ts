import { Request, Response } from 'express';
import { Types } from 'mongoose';
import { Appointment } from '../models/Appointment';
import { ServiceRecord } from '../models/ServiceRecord';
import { Tenant } from '../models/Tenant';
import { addDays, listDays, startOfDayInTimezone } from '../utils/reportRange';

const DEFAULT_TZ = 'America/Argentina/Buenos_Aires';

interface CountBucket<T> {
    _id: T;
    count: number;
}

// REP-1: reporte de turnos (solo ADMIN). Agregación agrupada con la zona horaria del tenant.
export const getAppointmentsReport = async (req: Request, res: Response) => {
    try {
        const from = String(req.query.from);
        const to = String(req.query.to);

        const tenant = await Tenant.findOne({ _id: req.tenantId });
        const tz = tenant?.timezone || DEFAULT_TZ;

        const start = startOfDayInTimezone(from, tz);
        const endExclusive = startOfDayInTimezone(addDays(to, 1), tz);

        // aggregate() no castea: tenantId se convierte a ObjectId explícitamente.
        const match = {
            tenantId: new Types.ObjectId(String(req.tenantId)),
            isActive: true,
            startTime: { $gte: start, $lt: endExclusive }
        };

        const [result] = await Appointment.aggregate([
            { $match: match },
            {
                $facet: {
                    byStatus: [{ $group: { _id: '$status', count: { $sum: 1 } } }],
                    byDay: [{
                        $group: {
                            _id: { $dateToString: { format: '%Y-%m-%d', date: '$startTime', timezone: tz } },
                            count: { $sum: 1 }
                        }
                    }],
                    byWeekday: [{
                        $group: {
                            _id: { $isoDayOfWeek: { date: '$startTime', timezone: tz } },
                            count: { $sum: 1 }
                        }
                    }]
                }
            }
        ]);

        const statusCount: Record<string, number> = {};
        for (const s of (result?.byStatus ?? []) as CountBucket<string>[]) statusCount[s._id] = s.count;
        const pending = statusCount.pending ?? 0;
        const confirmed = statusCount.confirmed ?? 0;
        const cancelled = statusCount.cancelled ?? 0;
        const completed = statusCount.completed ?? 0;
        const total = pending + confirmed + cancelled + completed;

        const dayMap = new Map<string, number>(
            ((result?.byDay ?? []) as CountBucket<string>[]).map(d => [d._id, d.count] as [string, number])
        );
        const byDay = listDays(from, to).map(date => ({ date, count: dayMap.get(date) ?? 0 }));

        const weekdayMap = new Map<number, number>(
            ((result?.byWeekday ?? []) as CountBucket<number>[]).map(d => [d._id, d.count] as [number, number])
        );
        const byWeekday = [1, 2, 3, 4, 5, 6, 7].map(weekday => ({ weekday, count: weekdayMap.get(weekday) ?? 0 }));

        return res.status(200).json({
            range: { from, to },
            totals: { total, pending, confirmed, cancelled, completed },
            byDay,
            byWeekday
        });
    } catch (error) {
        console.error('Error al generar reporte de turnos:', error);
        return res.status(500).json({ error: 'Error interno del servidor' });
    }
};

// REP-2: ocupación (mapa de calor día de semana x hora). Excluye turnos cancelados.
export const getOccupancyReport = async (req: Request, res: Response) => {
    try {
        const from = String(req.query.from);
        const to = String(req.query.to);

        const tenant = await Tenant.findOne({ _id: req.tenantId });
        const tz = tenant?.timezone || DEFAULT_TZ;

        const start = startOfDayInTimezone(from, tz);
        const endExclusive = startOfDayInTimezone(addDays(to, 1), tz);

        const buckets = await Appointment.aggregate([
            {
                $match: {
                    tenantId: new Types.ObjectId(String(req.tenantId)),
                    isActive: true,
                    status: { $ne: 'cancelled' },
                    startTime: { $gte: start, $lt: endExclusive }
                }
            },
            {
                $group: {
                    _id: {
                        weekday: { $isoDayOfWeek: { date: '$startTime', timezone: tz } },
                        hour: { $hour: { date: '$startTime', timezone: tz } }
                    },
                    count: { $sum: 1 }
                }
            }
        ]);

        const cellMap = new Map<string, number>();
        for (const b of buckets as { _id: { weekday: number; hour: number }; count: number }[]) {
            cellMap.set(`${b._id.weekday}-${b._id.hour}`, b.count);
        }

        const heatmap: { weekday: number; hour: number; count: number }[] = [];
        let total = 0;
        let peak: { weekday: number; hour: number; count: number } | null = null;
        for (let weekday = 1; weekday <= 7; weekday++) {
            for (let hour = 0; hour < 24; hour++) {
                const count = cellMap.get(`${weekday}-${hour}`) ?? 0;
                heatmap.push({ weekday, hour, count });
                total += count;
                // Recorrido ascendente + comparación estricta => desempate por menor weekday, luego menor hour.
                if (count > 0 && (peak === null || count > peak.count)) peak = { weekday, hour, count };
            }
        }

        return res.status(200).json({ range: { from, to }, total, heatmap, peak });
    } catch (error) {
        console.error('Error al generar reporte de ocupación:', error);
        return res.status(500).json({ error: 'Error interno del servidor' });
    }
};

// REP-2: servicios realizados. serviceDate es date-only anclado en UTC (P18): NO se usa la tz del tenant.
export const getServicesReport = async (req: Request, res: Response) => {
    try {
        const from = String(req.query.from);
        const to = String(req.query.to);

        const start = startOfDayInTimezone(from, 'UTC');
        const endExclusive = startOfDayInTimezone(addDays(to, 1), 'UTC');
        const tenantId = new Types.ObjectId(String(req.tenantId));

        const [result] = await ServiceRecord.aggregate([
            { $match: { tenantId, serviceDate: { $gte: start, $lt: endExclusive } } },
            {
                $facet: {
                    visits: [{ $count: 'n' }],
                    clients: [{ $group: { _id: '$client' } }, { $count: 'n' }],
                    topServices: [
                        { $group: { _id: '$service', count: { $sum: 1 } } },
                        {
                            $lookup: {
                                from: 'services',
                                let: { sid: '$_id' },
                                pipeline: [
                                    { $match: { $expr: { $and: [{ $eq: ['$_id', '$$sid'] }, { $eq: ['$tenantId', tenantId] }] } } },
                                    { $project: { name: 1 } }
                                ],
                                as: 'svc'
                            }
                        },
                        {
                            $project: {
                                _id: 0,
                                serviceId: '$_id',
                                name: { $ifNull: [{ $arrayElemAt: ['$svc.name', 0] }, 'Servicio eliminado'] },
                                count: 1
                            }
                        },
                        { $sort: { count: -1, name: 1 } },
                        { $limit: 10 }
                    ],
                    byProfessional: [
                        { $group: { _id: { $ifNull: ['$professional', null] }, count: { $sum: 1 } } },
                        {
                            $lookup: {
                                from: 'professionals',
                                let: { pid: '$_id' },
                                pipeline: [
                                    { $match: { $expr: { $and: [{ $eq: ['$_id', '$$pid'] }, { $eq: ['$tenantId', tenantId] }] } } },
                                    { $project: { name: 1, color: 1 } }
                                ],
                                as: 'pro'
                            }
                        },
                        {
                            $project: {
                                _id: 0,
                                professionalId: { $cond: [{ $gt: [{ $size: '$pro' }, 0] }, { $toString: '$_id' }, null] },
                                name: { $ifNull: [{ $arrayElemAt: ['$pro.name', 0] }, 'Sin asignar'] },
                                color: { $ifNull: [{ $arrayElemAt: ['$pro.color', 0] }, null] },
                                count: 1
                            }
                        },
                        { $sort: { count: -1, name: 1 } },
                        { $limit: 50 }
                    ]
                }
            }
        ]);

        const topServices = ((result?.topServices ?? []) as { serviceId: Types.ObjectId; name: string; count: number }[])
            .map(s => ({ serviceId: String(s.serviceId), name: s.name, count: s.count }));

        return res.status(200).json({
            range: { from, to },
            totals: { visits: result?.visits?.[0]?.n ?? 0, clientsServed: result?.clients?.[0]?.n ?? 0 },
            topServices,
            byProfessional: result?.byProfessional ?? []
        });
    } catch (error) {
        console.error('Error al generar reporte de servicios:', error);
        return res.status(500).json({ error: 'Error interno del servidor' });
    }
};
