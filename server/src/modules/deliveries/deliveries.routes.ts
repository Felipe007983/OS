import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../../config/database.js';
import { authenticateToken, requireAdmin } from '../../middlewares/auth.middleware.js';
import { logAudit } from '../../middlewares/audit.service.js';
import { OS_STATUS } from '../../shared/stateMachine.js';
import { ensurePaymentForOrder, syncPaymentFromApprovedItems } from '../../shared/payment.service.js';

export const deliveriesRouter = Router();

deliveriesRouter.use(authenticateToken);

const createDeliverySchema = z.object({
  serviceOrderId: z.string().uuid(),
  notes: z.string().optional().nullable(),
  receiptPhotoUrl: z.string().optional().nullable(),
  items: z.array(
    z.object({
      serviceOrderItemId: z.string().uuid(),
      quantityDelivered: z.number().int().positive('Quantidade entregue deve ser maior que zero'),
    })
  ).min(1, 'Informe ao menos um item entregue'),
});

const conferenceDeliverySchema = z.object({
  items: z.array(
    z.object({
      deliveryItemId: z.string().uuid(),
      quantityApproved: z.number().int().min(0),
      quantityRejected: z.number().int().min(0),
      rejectionReason: z.string().optional().nullable(),
    })
  ),
  notes: z.string().optional().nullable(),
  finalizeOrderIfComplete: z.boolean().optional(),
});

// Registrar Remessa de Entrega (Pela costureira ou pelo admin)
deliveriesRouter.post('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const parseResult = createDeliverySchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({ error: parseResult.error.errors[0].message });
      return;
    }

    const { serviceOrderId, notes, receiptPhotoUrl, items } = parseResult.data;
    const user = req.user!;

    const os = await prisma.serviceOrder.findUnique({
      where: { id: serviceOrderId },
      include: { items: true, deliveries: true },
    });

    if (!os) {
      res.status(404).json({ error: 'Ordem de serviço não encontrada' });
      return;
    }

    if (user.role === 'COSTUREIRA' && user.thirdPartyId && os.thirdPartyId !== user.thirdPartyId) {
      res.status(403).json({ error: 'Acesso negado a esta OS' });
      return;
    }

    const deliveryNumber = os.deliveries.length + 1;

    // Cria a remessa com os itens
    const delivery = await prisma.delivery.create({
      data: {
        serviceOrderId,
        deliveryNumber,
        notes,
        receiptPhotoUrl,
        status: 'AGUARDANDO_CONFERENCIA',
        items: {
          create: items.map((it) => ({
            serviceOrderItemId: it.serviceOrderItemId,
            quantityDelivered: it.quantityDelivered,
            quantityApproved: 0,
            quantityRejected: 0,
          })),
        },
      },
      include: { items: true },
    });

    // Atualiza quantidades entregues parciais nos itens da OS
    for (const it of items) {
      await prisma.serviceOrderItem.update({
        where: { id: it.serviceOrderItemId },
        data: {
          quantityDelivered: { increment: it.quantityDelivered },
        },
      });
    }

    // Atualiza status da OS
    const nextStatus = OS_STATUS.PARCIALMENTE_ENTREGUE;
    await prisma.serviceOrder.update({
      where: { id: os.id },
      data: { status: nextStatus },
    });

    await prisma.orderStatusHistory.create({
      data: {
        serviceOrderId: os.id,
        fromStatus: os.status,
        toStatus: nextStatus,
        changedBy: user.name,
        reason: `Remessa de Entrega #${deliveryNumber} registrada com ${items.reduce((s, i) => s + i.quantityDelivered, 0)} peças.`,
      },
    });

    await ensurePaymentForOrder(serviceOrderId);

    await logAudit({
      req,
      action: 'DELIVERY_CREATED',
      entity: 'Delivery',
      entityId: delivery.id,
      newValues: { deliveryNumber, totalItems: items.length },
    });

    res.status(201).json(delivery);
  } catch (err) {
    console.error('Erro ao registrar entrega:', err);
    res.status(500).json({ error: 'Erro ao registrar entrega' });
  }
});

// Conferência de Entrega (Exclusivo Administrador - Item 14)
deliveriesRouter.post('/:deliveryId/conference', requireAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    const { deliveryId } = req.params;
    const user = req.user!;

    const parseResult = conferenceDeliverySchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({ error: parseResult.error.errors[0].message });
      return;
    }

    const { items, notes, finalizeOrderIfComplete } = parseResult.data;

    const delivery = await prisma.delivery.findUnique({
      where: { id: deliveryId },
      include: {
        items: true,
        serviceOrder: {
          include: {
            items: true,
            deliveries: { include: { items: true } },
          },
        },
      },
    });

    if (!delivery) {
      res.status(404).json({ error: 'Entrega não encontrada' });
      return;
    }

    const os = delivery.serviceOrder;
    let hasDivergence = false;

    // Atualiza cada item da entrega e reflete no acumulado da OS
    for (const it of items) {
      const deliveryItem = delivery.items.find((di) => di.id === it.deliveryItemId);
      if (!deliveryItem) continue;

      const divergence = deliveryItem.quantityDelivered - (it.quantityApproved + it.quantityRejected);
      if (divergence !== 0 || it.quantityRejected > 0) {
        hasDivergence = true;
      }

      await prisma.deliveryItem.update({
        where: { id: it.deliveryItemId },
        data: {
          quantityApproved: it.quantityApproved,
          quantityRejected: it.quantityRejected,
          rejectionReason: it.rejectionReason,
        },
      });

      // Atualiza acumulado no service_order_item
      await prisma.serviceOrderItem.update({
        where: { id: deliveryItem.serviceOrderItemId },
        data: {
          quantityApproved: { increment: it.quantityApproved },
          quantityRejected: { increment: it.quantityRejected },
          rejectionReason: it.rejectionReason || undefined,
        },
      });
    }

    // Atualiza status da entrega
    const deliveryStatus = hasDivergence ? 'DIVERGENCIA' : 'CONFERIDO';
    await prisma.delivery.update({
      where: { id: deliveryId },
      data: {
        status: deliveryStatus,
        conferencedAt: new Date(),
        conferencedBy: user.name,
        notes: notes ?? delivery.notes,
      },
    });

    // Recalcula totais da OS para o pagamento
    const freshOS = await prisma.serviceOrder.findUnique({
      where: { id: os.id },
      include: { items: true },
    });

    if (freshOS) {
      let totalApprovedPieces = 0;
      let calculatedPaymentAmount = 0;

      freshOS.items.forEach((item) => {
        totalApprovedPieces += item.quantityApproved;
        calculatedPaymentAmount += item.quantityApproved * item.unitPrice;
      });

      const finalCalculatedAmount =
        freshOS.pricingModel === 'FIXED_PRICE' && freshOS.fixedPriceAmount != null
          ? freshOS.fixedPriceAmount
          : calculatedPaymentAmount;

      await syncPaymentFromApprovedItems(freshOS.id);

      // Se todas as peças foram aprovadas/entregues ou admin solicitou finalizar
      const allFinished = totalApprovedPieces >= freshOS.totalPieces;
      if (finalizeOrderIfComplete || allFinished) {
        await prisma.serviceOrder.update({
          where: { id: freshOS.id },
          data: { status: OS_STATUS.FINALIZADA },
        });

        await prisma.orderStatusHistory.create({
          data: {
            serviceOrderId: freshOS.id,
            fromStatus: freshOS.status,
            toStatus: OS_STATUS.FINALIZADA,
            changedBy: user.name,
            reason: `Conferência da remessa concluída com sucesso. OS finalizada com ${totalApprovedPieces} peças aprovadas.`,
          },
        });
      } else {
        await prisma.serviceOrder.update({
          where: { id: freshOS.id },
          data: { status: OS_STATUS.CONFERENCIA },
        });
      }
    }

    await logAudit({
      req,
      action: 'CONFERENCE_DELIVERY',
      entity: 'Delivery',
      entityId: delivery.id,
      newValues: { status: deliveryStatus, hasDivergence },
    });

    res.json({ message: 'Conferência realizada com sucesso', status: deliveryStatus });
  } catch (err) {
    console.error('Erro na conferência:', err);
    res.status(500).json({ error: 'Erro ao processar conferência' });
  }
});
