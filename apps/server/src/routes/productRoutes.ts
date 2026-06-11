import { Router, Request, Response, NextFunction } from 'express';
import { body, param, validationResult } from 'express-validator';
import { checkAdminAccess, checkTenantAccess } from '../middlewares/authMiddleware';
import {
    createProduct,
    getProducts,
    updateProduct,
    adjustStock,
    deleteProduct,
    createBulkProducts
} from '../controllers/productController';
import { validateRequest } from '../middlewares/validateRequest';

const router: Router = Router();

router.use(checkAdminAccess);
router.use(checkTenantAccess);

// CRUD Básico
router.post('/', [
    body('name').notEmpty().withMessage('El nombre es obligatorio').trim(),
    body('brand').notEmpty().withMessage('La marca es obligatoria').trim(),
    body('stock').optional().isInt({ min: 0 }).withMessage('El stock debe ser un número positivo'),
    body('description').optional().isString().trim(),
    validateRequest
], createProduct);

router.get('/', getProducts);

router.put('/:id', [
    param('id').isMongoId().withMessage('ID inválido'),
    body('name').optional().notEmpty().withMessage('El nombre no puede estar vacío').trim(),
    body('brand').optional().notEmpty().withMessage('La marca no puede estar vacía').trim(),
    body('description').optional().isString().trim(),
    validateRequest
], updateProduct);

// Endpoint especializado para ajustar stock
router.post('/:id/stock', [
    param('id').isMongoId().withMessage('ID inválido'),
    body('quantity').isInt().withMessage('La cantidad debe ser un número entero (positivo o negativo)'),
    body('reason').optional().isString().trim(), // Opcional por ahora, para futura auditoría
    validateRequest
], adjustStock);

router.delete('/:id', [
    param('id').isMongoId().withMessage('ID inválido'),
    validateRequest
], deleteProduct);

router.post('/bulk', [
    checkAdminAccess,
    body().isArray().withMessage('Debe ser un array de objetos'),
    // Podrías agregar validaciones más finas aquí para el contenido del array
    validateRequest
], createBulkProducts);

export default router;