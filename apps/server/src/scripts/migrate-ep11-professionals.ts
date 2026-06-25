/**
 * Migración EP-11 — Profesionales agendables (idempotente).
 *
 * Objetivo:
 *   1. Crear un Professional por cada Admin existente (si aún no tiene uno vinculado).
 *   2. Remapear `Appointment.professional` de _id de Admin a _id de Professional.
 *
 * Es 100% idempotente: re-ejecutarlo no duplica profesionales ni remapea turnos ya migrados.
 * NO toca ServiceRecords legacy (quedan sin professional, comportamiento aceptado).
 *
 * Ejecutar (desde la raíz del monorepo):
 *   pnpm --filter @estetica/server exec ts-node src/scripts/migrate-ep11-professionals.ts
 *
 * o desde apps/server:
 *   pnpm exec ts-node src/scripts/migrate-ep11-professionals.ts
 *
 * Requiere DATABASE_URL en el entorno (apps/server/.env).
 */

import mongoose from 'mongoose';
import { Admin } from '../models/Admin';
import { Professional } from '../models/Professional';
import { Appointment } from '../models/Appointment';

const DEFAULT_COLOR = '#9CA3AF';

const run = async () => {
    if (process.env.NODE_ENV !== 'production' && process.env.NODE_ENV !== 'test') {
        process.loadEnvFile();
    }

    const dbUrl = process.env.DATABASE_URL;
    if (!dbUrl) {
        console.error('[migrate-ep11] Falta DATABASE_URL en el entorno. Abortando.');
        process.exit(1);
    }

    await mongoose.connect(dbUrl);
    console.log('[migrate-ep11] Conectado a MongoDB.');

    let createdCount = 0;
    let remappedCount = 0;

    // ============================================================
    // PASO 1: Crear un Professional por cada Admin (idempotente).
    // ============================================================
    const admins = await Admin.find({});
    for (const admin of admins) {
        const existing = await Professional.findOne({ linkedAdmin: admin._id });
        if (existing) {
            continue; // Ya migrado.
        }

        const derivedName = admin.email?.includes('@')
            ? admin.email.split('@')[0]
            : admin.email || 'Profesional';

        await Professional.create({
            tenantId: admin.tenantId,
            name: derivedName,
            color: DEFAULT_COLOR,
            isActive: true,
            linkedAdmin: admin._id
        });
        createdCount++;
    }

    // ============================================================
    // PASO 2: Remapear Appointment.professional (Admin -> Professional).
    // ============================================================
    // Construimos un mapa Admin._id -> Professional._id vía linkedAdmin.
    const professionals = await Professional.find({ linkedAdmin: { $ne: null } }).select('_id linkedAdmin');
    const adminToProfessional = new Map<string, mongoose.Types.ObjectId>();
    for (const prof of professionals) {
        if (prof.linkedAdmin) {
            adminToProfessional.set(String(prof.linkedAdmin), prof._id as mongoose.Types.ObjectId);
        }
    }

    // Conjunto de Professional._id ya válidos (para saltar turnos ya migrados).
    const allProfessionalIds = new Set(
        (await Professional.find({}).select('_id')).map((p) => String(p._id))
    );

    const appointments = await Appointment.find({}).select('_id professional');
    for (const appt of appointments) {
        const currentRef = String(appt.professional);

        // Ya apunta a un Professional válido -> idempotente, saltar.
        if (allProfessionalIds.has(currentRef)) {
            continue;
        }

        // Apunta a un Admin -> remapear al Professional correspondiente.
        const mapped = adminToProfessional.get(currentRef);
        if (mapped) {
            await Appointment.updateOne(
                { _id: appt._id },
                { $set: { professional: mapped } }
            );
            remappedCount++;
        } else {
            console.warn(
                `[migrate-ep11] Turno ${appt._id} referencia ${currentRef} sin Professional asociado. Sin cambios.`
            );
        }
    }

    console.log('[migrate-ep11] Resumen:');
    console.log(`  - Profesionales creados: ${createdCount}`);
    console.log(`  - Turnos remapeados:     ${remappedCount}`);

    await mongoose.disconnect();
    console.log('[migrate-ep11] Desconectado. Migración finalizada.');
    process.exit(0);
};

run().catch(async (error) => {
    console.error('[migrate-ep11] Error durante la migración:', error);
    await mongoose.disconnect().catch(() => undefined);
    process.exit(1);
});
