import { Router, Request, Response, NextFunction } from 'express';
import { body, param, query, validationResult } from 'express-validator';
import { checkAdminAccess, checkTenantAccess, requireRole } from '../middlewares/authMiddleware';
import {
    createProduct,
    getProducts,
    getProductStats,
    getProductOptions,
    updateProduct,
    adjustStock,
    deleteProduct,
    createBulkProducts
} from '../controllers/productController';
import { validateRequest } from '../middlewares/validateRequest';

const OBJECT_ID_REGEX = /^[0-9a-fA-F]{24}$/;

const router: Router = Router();

router.use(checkAdminAccess);
router.use(checkTenantAccess);

// CRUD Básico
router.post('/', [
    requireRole('ADMIN'),
    body('name').notEmpty().withMessage('El nombre es obligatorio').trim(),
    body('brand').notEmpty().withMessage('La marca es obligatoria').trim(),
    body('stock').optional().isInt({ min: 0 }).withMessage('El stock debe ser un número positivo'),
    body('description').optional().isString().trim(),
    validateRequest
], createProduct);

// GET /api/productos — ADMIN y PROFESSIONAL (SRS §6.2)
router.get('/', [
    requireRole('ADMIN', 'PROFESSIONAL'),
    query('page').optional().isInt({ min: 1 }).withMessage('page debe ser un entero >= 1'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('limit debe estar entre 1 y 100'),
    query('search').optional().isString().trim().isLength({ max: 100 }).withMessage('search demasiado largo'),
    query('lowStock').optional().isBoolean().withMessage('lowStock debe ser booleano'),
    query('sort').optional().isIn(['stock']).withMessage('sort solo admite el valor stock'),
    validateRequest
], getProducts);

// Rutas fijas: declaradas ANTES de cualquier ruta con /:id
router.get('/stats', requireRole('ADMIN', 'PROFESSIONAL'), getProductStats);

router.get('/opciones', [
    requireRole('ADMIN', 'PROFESSIONAL'),
    query('limit').optional().isInt({ min: 1, max: 20 }).withMessage('limit debe estar entre 1 y 20'),
    query('search').optional().isString().trim().isLength({ max: 100 }).withMessage('search demasiado largo'),
    query('ids').optional().isString().custom((value: string) => {
        const ids = value.split(',').map(id => id.trim()).filter(Boolean);
        if (ids.length > 50) throw new Error('ids admite como máximo 50 elementos');
        if (!ids.every(id => OBJECT_ID_REGEX.test(id))) throw new Error('ids contiene un ID inválido');
        return true;
    }),
    validateRequest
], getProductOptions);

router.put('/:id', [
    requireRole('ADMIN'),
    param('id').isMongoId().withMessage('ID inválido'),
    body('name').optional().notEmpty().withMessage('El nombre no puede estar vacío').trim(),
    body('brand').optional().notEmpty().withMessage('La marca no puede estar vacía').trim(),
    body('description').optional().isString().trim(),
    validateRequest
], updateProduct);

// Endpoint especializado para ajustar stock — solo ADMIN (SRS §6.2)
router.post('/:id/stock', [
    requireRole('ADMIN'),
    param('id').isMongoId().withMessage('ID inválido'),
    body('quantity').isInt().withMessage('La cantidad debe ser un número entero (positivo o negativo)'),
    body('reason').optional().isString().trim(), // Opcional por ahora, para futura auditoría
    validateRequest
], adjustStock);

router.delete('/:id', [
    requireRole('ADMIN'),
    param('id').isMongoId().withMessage('ID inválido'),
    validateRequest
], deleteProduct);

router.post('/bulk', [
    checkAdminAccess,
    requireRole('ADMIN'),
    body().isArray().withMessage('Debe ser un array de objetos'),
    // Podrías agregar validaciones más finas aquí para el contenido del array
    validateRequest
], createBulkProducts);

export default router;