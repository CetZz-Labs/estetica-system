import { Router } from 'express';
import { body, param, query } from 'express-validator';
import { checkAdminAccess, checkTenantAccess, requireRole } from '../middlewares/authMiddleware';
import {
    createProfessional,
    getProfessionals,
    getLinkableAdmins,
    getProfessionalById,
    updateProfessional,
    deleteProfessional
} from '../controllers/professionalController';
import { validateRequest } from '../middlewares/validateRequest';

const router: Router = Router();

// Proteger todas las rutas con el middleware de admin y aislamiento por tenant
router.use(checkAdminAccess);
router.use(checkTenantAccess);

// 1. Create (POST /api/profesionales) — solo ADMIN (SRS §6.2)
router.post(
    '/',
    [
        requireRole('ADMIN'),
        body('name').notEmpty().withMessage('El nombre (name) es obligatorio').isString().trim(),
        body('color')
            .notEmpty().withMessage('El color es obligatorio')
            .matches(/^#[0-9A-Fa-f]{6}$/).withMessage('El color debe tener formato hexadecimal #RRGGBB'),
        body('linkedAdmin').optional({ nullable: true }).isMongoId().withMessage('El usuario a vincular no es válido'),
        body('inviteEmail').optional({ nullable: true }).isEmail().withMessage('El correo de invitación debe ser válido').trim(),
        validateRequest
    ],
    createProfessional
);

// 2. Read All (GET /api/profesionales)
router.get(
    '/',
    [
        query('includeInactive').optional().isBoolean().withMessage('includeInactive debe ser booleano'),
        validateRequest
    ],
    getProfessionals
);

// 3. Read - Admins vinculables (GET /api/profesionales/linkable-admins) - ANTES de /:id
router.get('/linkable-admins', getLinkableAdmins);

// 4. Read One (GET /api/profesionales/:id)
router.get(
    '/:id',
    [
        param('id').isMongoId().withMessage('El ID proporcionado no es válido'),
        validateRequest
    ],
    getProfessionalById
);

// 5. Update (PUT /api/profesionales/:id) — solo ADMIN (SRS §6.2)
router.put(
    '/:id',
    [
        requireRole('ADMIN'),
        param('id').isMongoId().withMessage('El ID proporcionado no es válido'),
        body('name').optional().notEmpty().withMessage('El nombre no puede estar vacío').isString().trim(),
        body('color').optional().matches(/^#[0-9A-Fa-f]{6}$/).withMessage('El color debe tener formato hexadecimal #RRGGBB'),
        body('linkedAdmin').optional({ nullable: true }).isMongoId().withMessage('El usuario a vincular no es válido'),
        body('isActive').optional().isBoolean().withMessage('isActive debe ser booleano'),
        validateRequest
    ],
    updateProfessional
);

// 6. Delete (DELETE /api/profesionales/:id) - Soft Delete con guard de turnos futuros — solo ADMIN (SRS §6.2)
router.delete(
    '/:id',
    [
        requireRole('ADMIN'),
        param('id').isMongoId().withMessage('El ID proporcionado no es válido'),
        body('confirm').optional().isBoolean().withMessage('confirm debe ser booleano'),
        validateRequest
    ],
    deleteProfessional
);

export default router;
