import { Request, Response } from 'express';
import { Types } from 'mongoose';
import { Appointment } from '../models/Appointment';
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
