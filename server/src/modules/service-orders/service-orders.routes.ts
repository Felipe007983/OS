import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../../config/database.js';
import { authenticateToken } from '../../middlewares/auth.middleware.js';
import { logAudit } from '../../middlewares/audit.service.js';
import { canTransitionOS, OS_STATUS } from '../../shared/stateMachine.js';
import { computeSituationLabel } from '../../shared/situation.js';
import { ensurePaymentForOrder, syncPaymentFromApprovedItems } from '../../shared/payment.service.js';

export const serviceOrdersRouter = Router();

serviceOrdersRouter.use(authenticateToken);

const createOrderItemSchema = z.object({
  productId: z.string().optional().nullable(),
  productName: z.string().min(1, 'Nome do produto é obrigatório'),
  description: z.string().optional().nullable(),
  quantityRequested: z.number().int().positive('Quantidade deve ser positiva'),
  unitPrice: z.number().min(0, 'Valor unitário inválido'),
});

const createServiceOrderSchema = z.object({
  thirdPartyId: z.string().uuid('ID da costureira inválido'),
  pricingModel: z.enum(['UNIT_PRICE', 'FIXED_PRICE']),
  fixedPriceAmount: z.number().min(0).optional().nullable(),
  dueDate: z.string().datetime().or(z.string()),
  notes: z.string().optional().nullable(),
  items: z.array(createOrderItemSchema).min(1, 'A OS deve conter ao menos um item'),
});

// Listagem de Ordens de Serviço com filtros abrangentes
serviceOrdersRouter.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const user = req.user!;
    const companyId = user.companyId;

    const { status, thirdPartyId, startDate, endDate, search, paymentStatus, situation } = req.query as {
      status?: string;
      thirdPartyId?: string;
      startDate?: string;
      endDate?: string;
      search?: string;
      paymentStatus?: string;
      situation?: string;
    };

    const where: any = { companyId };

    // Se o usuário for COSTUREIRA, só vê as suas próprias OS
    if (user.role === 'COSTUREIRA') {
      if (!user.thirdPartyId) {
        res.json([]);
        return;
      }
      where.thirdPartyId = user.thirdPartyId;
    } else if (thirdPartyId && thirdPartyId !== 'TODAS') {
      where.thirdPartyId = thirdPartyId;
    }

    if (status && status !== 'TODOS') {
      if (status === 'ATRASADA') {
        where.dueDate = { lt: new Date() };
        where.status = { notIn: ['FINALIZADA', 'CANCELADA'] };
      } else {
        where.status = status;
      }
    }

    if (paymentStatus && paymentStatus !== 'TODOS') {
      where.payments = { some: { status: paymentStatus } };
    }

    if (situation === 'ENTREGUE_E_PAGO') {
      where.status = 'FINALIZADA';
      where.payments = { some: { status: 'PAGO' } };
    } else if (situation === 'ENTREGUE_PENDENTE') {
      where.status = 'FINALIZADA';
      where.payments = { some: { status: { in: ['PENDENTE', 'PARCIAL'] } } };
    } else if (situation === 'ENTREGUE_PARCIAL_PAGO_PARCIAL') {
      where.status = { in: ['PARCIALMENTE_ENTREGUE', 'CONFERENCIA'] };
      where.payments = { some: { status: 'PARCIAL' } };
    } else if (situation === 'ENTREGUE_PARCIAL_PENDENTE') {
      where.status = { in: ['PARCIALMENTE_ENTREGUE', 'CONFERENCIA'] };
      where.payments = { some: { status: 'PENDENTE' } };
    }

    if (startDate) {
      where.createdAt = { ...where.createdAt, gte: new Date(startDate) };
    }
    if (endDate) {
      where.createdAt = { ...where.createdAt, lte: new Date(endDate) };
    }

    if (search) {
      const parsedNum = parseInt(search.replace('#', ''), 10);
      where.OR = [
        ...(isNaN(parsedNum) ? [] : [{ orderNumber: parsedNum }]),
        { thirdParty: { name: { contains: search } } },
        { notes: { contains: search } },
      ];
    }

    const orders = await prisma.serviceOrder.findMany({
      where,
      include: {
        thirdParty: {
          select: { id: true, name: true, phone: true, whatsapp: true, city: true },
        },
        items: true,
        payments: true,
        acceptanceTokens: {
          where: { revoked: false },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
      orderBy: { orderNumber: 'desc' },
    });

    const now = new Date();

    const formatted = orders.map((os) => {
      let totalProduced = 0;
      let totalDelivered = 0;
      let totalApproved = 0;
      let totalRejected = 0;

      os.items.forEach((it) => {
        totalProduced += it.quantityProduced;
        totalDelivered += it.quantityDelivered;
        totalApproved += it.quantityApproved;
        totalRejected += it.quantityRejected;
      });

      const isDelayed = !['FINALIZADA', 'CANCELADA'].includes(os.status) && new Date(os.dueDate) < now;

      const progressProduction = os.totalPieces > 0 ? Math.min(100, Math.round((totalProduced / os.totalPieces) * 100)) : 0;
      const progressDelivery = os.totalPieces > 0 ? Math.min(100, Math.round((totalDelivered / os.totalPieces) * 100)) : 0;

      const payment = os.payments.find((p) => p.status !== 'CANCELADO') || os.payments[0] || null;
      const situationLabel = computeSituationLabel(
        os.status,
        os.totalPieces,
        totalApproved,
        totalDelivered,
        payment?.status
      );

      return {
        id: os.id,
        orderNumber: os.orderNumber,
        formattedNumber: `#${String(os.orderNumber).padStart(6, '0')}`,
        status: os.status,
        isDelayed,
        pricingModel: os.pricingModel,
        fixedPriceAmount: os.fixedPriceAmount,
        totalPieces: os.totalPieces,
        totalAmount: os.totalAmount,
        dueDate: os.dueDate,
        sentAt: os.sentAt,
        version: os.version,
        notes: os.notes,
        createdAt: os.createdAt,
        thirdParty: os.thirdParty,
        activeToken: os.acceptanceTokens[0]?.token || null,
        situationLabel,
        payment: payment
          ? {
              id: payment.id,
              status: payment.status,
              expectedAmount: payment.expectedAmount,
              calculatedAmount: payment.calculatedAmount,
              paidAmount: payment.paidAmount,
              remainingAmount: payment.remainingAmount,
              paymentMethod: payment.paymentMethod,
              paidAt: payment.paidAt,
            }
          : null,
        metrics: {
          totalProduced,
          totalDelivered,
          totalApproved,
          totalRejected,
          progressProduction,
          progressDelivery,
        },
      };
    });

    res.json(formatted);
  } catch (err) {
    console.error('Erro ao listar OS:', err);
    res.status(500).json({ error: 'Erro ao listar ordens de serviço' });
  }
});

// Detalhes completos da OS
serviceOrdersRouter.get('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const user = req.user!;
    const { id } = req.params;

    const os = await prisma.serviceOrder.findFirst({
      where: {
        id,
        companyId: user.companyId,
        ...(user.role === 'COSTUREIRA' && user.thirdPartyId ? { thirdPartyId: user.thirdPartyId } : {}),
      },
      include: {
        thirdParty: true,
        createdByUser: { select: { id: true, name: true, email: true } },
        items: {
          include: {
            productionRecords: { orderBy: { createdAt: 'desc' } },
          },
        },
        deliveries: {
          include: {
            items: { include: { serviceOrderItem: true } },
          },
          orderBy: { createdAt: 'desc' },
        },
        payments: true,
        acceptanceRecords: { orderBy: { timestamp: 'desc' } },
        acceptanceTokens: {
          where: { revoked: false },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
        statusHistory: { orderBy: { createdAt: 'desc' } },
      },
    });

    if (!os) {
      res.status(404).json({ error: 'Ordem de serviço não encontrada' });
      return;
    }

    res.json(os);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar dados da OS' });
  }
});

// Criação de nova Ordem de Serviço
serviceOrdersRouter.post('/', async (req: Request, res: Response): Promise<void> => {
  try {
    if (req.user!.role !== 'ADMIN') {
      res.status(403).json({ error: 'Apenas administradores podem criar Ordens de Serviço' });
      return;
    }

    const parseResult = createServiceOrderSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({ error: parseResult.error.errors[0].message });
      return;
    }

    const { thirdPartyId, pricingModel, fixedPriceAmount, dueDate, notes, items } = parseResult.data;
    const companyId = req.user!.companyId;

    // Gerar próximo número sequencial para esta empresa
    const lastOrder = await prisma.serviceOrder.findFirst({
      where: { companyId },
      orderBy: { orderNumber: 'desc' },
      select: { orderNumber: true },
    });
    const nextOrderNumber = (lastOrder?.orderNumber ?? 100) + 1;

    let totalPieces = 0;
    let computedAmount = 0;

    const formattedItems = items.map((it) => {
      const itemTotal = it.quantityRequested * it.unitPrice;
      totalPieces += it.quantityRequested;
      computedAmount += itemTotal;
      return {
        productId: it.productId || null,
        productName: it.productName,
        description: it.description || null,
        quantityRequested: it.quantityRequested,
        unitPrice: it.unitPrice,
        totalPrice: itemTotal,
      };
    });

    const finalAmount = pricingModel === 'FIXED_PRICE' && fixedPriceAmount != null ? fixedPriceAmount : computedAmount;

    const newOrder = await prisma.serviceOrder.create({
      data: {
        companyId,
        orderNumber: nextOrderNumber,
        thirdPartyId,
        createdByUserId: req.user!.id,
        pricingModel,
        fixedPriceAmount: pricingModel === 'FIXED_PRICE' ? fixedPriceAmount : null,
        totalPieces,
        totalAmount: finalAmount,
        dueDate: new Date(dueDate),
        status: OS_STATUS.RASCUNHO,
        notes,
        items: {
          create: formattedItems,
        },
      },
      include: {
        items: true,
        thirdParty: true,
      },
    });

    // Registra histórico inicial de status
    await prisma.orderStatusHistory.create({
      data: {
        serviceOrderId: newOrder.id,
        fromStatus: 'NOVA',
        toStatus: OS_STATUS.RASCUNHO,
        changedBy: req.user!.name,
        reason: 'Criação inicial da Ordem de Serviço',
      },
    });

    await ensurePaymentForOrder(newOrder.id);

    await logAudit({
      req,
      action: 'CREATE',
      entity: 'ServiceOrder',
      entityId: newOrder.id,
      newValues: { orderNumber: newOrder.orderNumber, totalAmount: finalAmount, totalPieces },
    });

    res.status(201).json(newOrder);
  } catch (err) {
    console.error('Erro ao criar OS:', err);
    res.status(500).json({ error: 'Erro ao criar ordem de serviço' });
  }
});

// Alteração de estado da OS
serviceOrdersRouter.patch('/:id/status', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { nextStatus, reason } = req.body;
    const user = req.user!;

    const os = await prisma.serviceOrder.findFirst({
      where: { id, companyId: user.companyId },
    });

    if (!os) {
      res.status(404).json({ error: 'Ordem de serviço não encontrada' });
      return;
    }

    if (!canTransitionOS(os.status, nextStatus)) {
      res.status(400).json({
        error: `Transição inválida: Não é permitido mudar de "${os.status}" para "${nextStatus}"`,
      });
      return;
    }

    const updated = await prisma.serviceOrder.update({
      where: { id },
      data: { status: nextStatus },
    });

    await prisma.orderStatusHistory.create({
      data: {
        serviceOrderId: id,
        fromStatus: os.status,
        toStatus: nextStatus,
        reason: reason || null,
        changedBy: user.name,
      },
    });

    if (['FINALIZADA', 'PARCIALMENTE_ENTREGUE', 'CONFERENCIA'].includes(nextStatus)) {
      await ensurePaymentForOrder(id);
      if (['FINALIZADA', 'CONFERENCIA'].includes(nextStatus)) {
        await syncPaymentFromApprovedItems(id);
      }
    }

    await logAudit({
      req,
      action: 'STATUS_CHANGE',
      entity: 'ServiceOrder',
      entityId: id,
      oldValues: { status: os.status },
      newValues: { status: nextStatus, reason },
    });

    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao alterar status da OS' });
  }
});

// Edição com Proteção de Versionamento Contratual (Item 29)
serviceOrdersRouter.put('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    if (req.user!.role !== 'ADMIN') {
      res.status(403).json({ error: 'Apenas administradores podem editar ordens de serviço' });
      return;
    }

    const { id } = req.params;
    const { dueDate, notes, pricingModel, fixedPriceAmount, items } = req.body;

    const existing = await prisma.serviceOrder.findFirst({
      where: { id, companyId: req.user!.companyId },
      include: { items: true },
    });

    if (!existing) {
      res.status(404).json({ error: 'OS não encontrada' });
      return;
    }

    if (['FINALIZADA', 'CANCELADA'].includes(existing.status)) {
      res.status(400).json({ error: 'Não é permitido alterar uma OS finalizada ou cancelada' });
      return;
    }

    const wasAccepted = ['ACEITA', 'EM_PRODUCAO', 'PARCIALMENTE_ENTREGUE', 'CONFERENCIA'].includes(existing.status);
    let newVersion = existing.version;
    let newStatus = existing.status;

    // Regra anti-fraude: se já aceita e alterou prazos/peças/preços, exige re-aceite
    if (wasAccepted) {
      newVersion += 1;
      newStatus = OS_STATUS.AGUARDANDO_ACEITE;
    }

    let totalPieces = 0;
    let computedAmount = 0;

    const formattedItems = (items || []).map((it: any) => {
      const itemTotal = it.quantityRequested * it.unitPrice;
      totalPieces += it.quantityRequested;
      computedAmount += itemTotal;
      return {
        serviceOrderId: id,
        productId: it.productId || null,
        productName: it.productName,
        description: it.description || null,
        quantityRequested: it.quantityRequested,
        unitPrice: it.unitPrice,
        totalPrice: itemTotal,
      };
    });

    const finalAmount = pricingModel === 'FIXED_PRICE' && fixedPriceAmount != null ? fixedPriceAmount : computedAmount;

    // Remove itens antigos e insere atualizados
    await prisma.serviceOrderItem.deleteMany({ where: { serviceOrderId: id } });
    await prisma.serviceOrderItem.createMany({ data: formattedItems });

    const updated = await prisma.serviceOrder.update({
      where: { id },
      data: {
        dueDate: dueDate ? new Date(dueDate) : existing.dueDate,
        notes: notes ?? existing.notes,
        pricingModel: pricingModel ?? existing.pricingModel,
        fixedPriceAmount: pricingModel === 'FIXED_PRICE' ? fixedPriceAmount : null,
        totalPieces,
        totalAmount: finalAmount,
        version: newVersion,
        status: newStatus,
      },
    });

    if (wasAccepted) {
      await prisma.orderStatusHistory.create({
        data: {
          serviceOrderId: id,
          fromStatus: existing.status,
          toStatus: newStatus,
          changedBy: req.user!.name,
          reason: `Alteração contratual pós-aceite (Versão ${newVersion}). Necessário novo aceite da costureira.`,
        },
      });
    }

    await logAudit({
      req,
      action: 'UPDATE',
      entity: 'ServiceOrder',
      entityId: id,
      oldValues: { version: existing.version, totalAmount: existing.totalAmount },
      newValues: { version: newVersion, totalAmount: finalAmount, status: newStatus },
    });

    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao atualizar OS' });
  }
});
