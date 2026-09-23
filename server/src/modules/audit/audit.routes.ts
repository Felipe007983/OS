import { Router, Request, Response } from 'express';
import { prisma } from '../../config/database.js';
import { authenticateToken, requireAdmin } from '../../middlewares/auth.middleware.js';

export const auditRouter = Router();

auditRouter.use(authenticateToken);
auditRouter.use(requireAdmin);

auditRouter.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const { action, entity, search } = req.query as { action?: string; entity?: string; search?: string };
    const companyId = req.user!.companyId;

    const where: any = { companyId };
    if (action && action !== 'TODAS') where.action = action;
    if (entity && entity !== 'TODAS') where.entity = entity;

    const logs = await prisma.auditLog.findMany({
      where,
      include: {
        user: { select: { id: true, name: true, email: true, role: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    res.json(logs);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao carregar registros de auditoria' });
  }
});
