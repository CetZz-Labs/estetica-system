import express, { Express } from 'express'
import cors from 'cors'
import { connectDB } from './config/db'
import { clerkMiddleware } from '@clerk/express'
import adminRouter from './routes/adminRouter'
import { checkAdminAccess, checkTenantAccess } from './middlewares/authMiddleware'
import clientRoutes from './routes/clientRoutes';
import serviceRoutes from './routes/serviceRoutes';
import productRoutes from './routes/productRoutes';
import serviceRecordRoutes from './routes/serviceRecordRoutes';
import dashboardRoutes from './routes/dashboardRoutes';
import onboardingRoutes from './routes/onboardingRoutes';
import tenantRoutes from './routes/tenantRoutes';
import appointmentRoutes from './routes/appointmentRoutes';
import professionalRoutes from './routes/professionalRoutes';


if (process.env.NODE_ENV !== 'production' && process.env.NODE_ENV !== 'test') {
    process.loadEnvFile()
}

connectDB()

const app: Express = express()

app.use(cors({
    origin: [process.env.FRONTEND_URL!],
    credentials: true
}));

app.use((req, res, next) => {
    if (req.body && typeof req.body === 'object' && Object.keys(req.body).length > 0) {
        next();
    } else {
        express.json({ limit: '10mb' })(req, res, next);
    }
});
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

app.use(clerkMiddleware())

app.get('/api', (req, res) => {
    res.send('Hello World!')
})
app.use('/api/admin', checkAdminAccess, checkTenantAccess, adminRouter)
app.use('/api/clientes', clientRoutes);
app.use('/api/servicios', serviceRoutes);
app.use('/api/profesionales', professionalRoutes);
app.use('/api/productos', productRoutes);
app.use('/api/registros', serviceRecordRoutes);
app.use('/api/dashboard', dashboardRoutes);
// Onboarding (EP-09): sin checkAdminAccess/checkTenantAccess — el admin aún no existe (excepción documentada)
app.use('/api/onboarding', onboardingRoutes);

app.use('/api/negocio', checkAdminAccess, checkTenantAccess, tenantRoutes);
app.use('/api/turnos', checkAdminAccess, checkTenantAccess, appointmentRoutes);

export default app
