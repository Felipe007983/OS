import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../../config/database.js';
import { authenticateToken } from '../../middlewares/auth.middleware.js';
import { logAudit } from '../../middlewares/audit.service.js';
import { OS_STATUS } from '../../shared/stateMachine.js';

export const productionRouter = Router();

productionRouter.use(authenticateToken);

const recordProductionSchema = z.object({
  serviceOrderItemId: z.string().uuid(),
  quantity: z.number().int().positive('Quantidade deve ser maior que zero'),
  notes: z.string().optional().nullable(),
});

productionRouter.post('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const parseResult = recordProductionSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({ error: parseResult.error.errors[0].message });
      return;
    }

    const { serviceOrderItemId, quantity, notes } = parseResult.data;
    const user = req.user!;

    const item = await prisma.serviceOrderItem.findUnique({
      where: { id: serviceOrderItemId },
      include: { serviceOrder: true },
    });

    if (!item) {
      res.status(404).json({ error: 'Item da OS não encontrado' });
      return;
    }

    const os = item.serviceOrder;

    // Se costureira, verifica se a OS pertence a ela
    if (user.role === 'COSTUREIRA' && user.thirdPartyId && os.thirdPartyId !== user.thirdPartyId) {
      res.status(403).json({ error: 'Acesso negado a esta Ordem de Serviço' });
      return;
    }

    // Registra o apontamento
    const record = await prisma.productionRecord.create({
      data: {
        serviceOrderItemId,
        quantity,
        notes,
        recordedByUserId: user.id,
      },
    });

    // Atualiza quantidade produzida acumulada no item
    const newProducedCount = item.quantityProduced + quantity;
    await prisma.serviceOrderItem.update({
      where: { id: serviceOrderItemId },
      data: { quantityProduced: newProducedCount },
    });

    // Se a OS ainda estiver como ACEITA, move para EM_PRODUCAO
    if (os.status === OS_STATUS.ACEITA) {
      await prisma.serviceOrder.update({
        where: { id: os.id },
        data: { status: OS_STATUS.EM_PRODUCAO },
      });

      await prisma.orderStatusHistory.create({
        data: {
          serviceOrderId: os.id,
          fromStatus: OS_STATUS.ACEITA,
          toStatus: OS_STATUS.EM_PRODUCAO,
          changedBy: user.name,
          reason: 'Início do apontamento de produção',
        },
      });
    }

    await logAudit({
      req,
      action: 'RECORD_PRODUCTION',
      entity: 'ProductionRecord',
      entityId: record.id,
      newValues: { item: item.productName, added: quantity, totalNow: newProducedCount },
    });

    res.status(201).json({
      message: 'Apontamento de produção registrado',
      record,
      itemTotalProduced: newProducedCount,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao registrar produção' });
  }
});
