import express from 'express';
import cors from 'cors';
import { authRouter } from './modules/auth/auth.routes.js';
import { thirdPartiesRouter } from './modules/third-parties/third-parties.routes.js';
import { productsRouter } from './modules/products/products.routes.js';
import { serviceOrdersRouter } from './modules/service-orders/service-orders.routes.js';
import { acceptanceRouter } from './modules/acceptance/acceptance.routes.js';
import { productionRouter } from './modules/production/production.routes.js';
import { deliveriesRouter } from './modules/deliveries/deliveries.routes.js';
import { paymentsRouter } from './modules/payments/payments.routes.js';
import { reportsRouter } from './modules/reports/reports.routes.js';
import { auditRouter } from './modules/audit/audit.routes.js';
import { usersRouter } from './modules/users/users.routes.js';

export const app = express();

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(express.json());

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'online',
    timestamp: new Date().toISOString(),
    service: 'Ofício OS Management API',
  });
});

// Registra módulos da API
app.use('/api/auth', authRouter);
app.use('/api/third-parties', thirdPartiesRouter);
app.use('/api/products', productsRouter);
app.use('/api/service-orders', serviceOrdersRouter);
app.use('/api/acceptance', acceptanceRouter);
app.use('/api/production', productionRouter);
app.use('/api/deliveries', deliveriesRouter);
app.use('/api/payments', paymentsRouter);
app.use('/api/reports', reportsRouter);
app.use('/api/audit', auditRouter);
app.use('/api/users', usersRouter);
