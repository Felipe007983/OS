import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../../config/database.js';
import { authenticateToken, requireAdmin } from '../../middlewares/auth.middleware.js';
import { logAudit } from '../../middlewares/audit.service.js';
import { getParam } from '../../shared/params.js';

export const paymentsRouter = Router();

paymentsRouter.use(authenticateToken);

const settlePaymentSchema = z.object({
  amountToPay: z.number().positive('Valor do pagamento deve ser positivo'),
  paymentMethod: z.enum(['PIX', 'TED', 'DINHEIRO', 'BOLETO']),
  receiptUrl: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

// Listar Pagamentos
paymentsRouter.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const user = req.user!;
    const { status, thirdPartyId } = req.query as { status?: string; thirdPartyId?: string };

    const where: any = { companyId: user.companyId };

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
      where.status = status;
    }

    const payments = await prisma.payment.findMany({
      where,
      include: {
        thirdParty: { select: { id: true, name: true, pixKey: true, pixType: true, phone: true } },
        serviceOrder: { select: { id: true, orderNumber: true, totalPieces: true, status: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json(payments);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao listar pagamentos' });
  }
});

// Detalhes do pagamento com OS completa para validação
paymentsRouter.get('/:paymentId', async (req: Request, res: Response): Promise<void> => {
  try {
    const paymentId = getParam(req, 'paymentId');
    const user = req.user!;

    const payment = await prisma.payment.findFirst({
      where: { id: paymentId, companyId: user.companyId },
      include: {
        thirdParty: { select: { id: true, name: true, pixKey: true, pixType: true, phone: true, whatsapp: true } },
        serviceOrder: {
          include: {
            items: true,
            deliveries: { include: { items: { include: { serviceOrderItem: true } } }, orderBy: { createdAt: 'desc' } },
            thirdParty: { select: { id: true, name: true } },
          },
        },
      },
    });

    if (!payment) {
      res.status(404).json({ error: 'Pagamento não encontrado' });
      return;
    }

    if (user.role === 'COSTUREIRA' && user.thirdPartyId !== payment.thirdPartyId) {
      res.status(403).json({ error: 'Acesso negado' });
      return;
    }

    res.json(payment);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao carregar detalhes do pagamento' });
  }
});

// Registrar baixa de pagamento (Admin)
paymentsRouter.post('/:paymentId/pay', requireAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    const paymentId = getParam(req, 'paymentId');
    const parseResult = settlePaymentSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({ error: parseResult.error.errors[0].message });
      return;
    }

    const { amountToPay, paymentMethod, receiptUrl, notes } = parseResult.data;

    const payment = await prisma.payment.findFirst({
      where: { id: paymentId, companyId: req.user!.companyId },
      include: { serviceOrder: true, thirdParty: true },
    });

    if (!payment) {
      res.status(404).json({ error: 'Registro de pagamento não encontrado' });
      return;
    }

    const newPaidAmount = payment.paidAmount + amountToPay;
    const newRemaining = Math.max(0, payment.calculatedAmount - newPaidAmount);
    const newStatus = newRemaining <= 0 ? 'PAGO' : 'PARCIAL';

    const updated = await prisma.payment.update({
      where: { id: paymentId },
      data: {
        paidAmount: newPaidAmount,
        remainingAmount: newRemaining,
        status: newStatus,
        paymentMethod,
        paidAt: new Date(),
        receiptUrl: receiptUrl ?? payment.receiptUrl,
        notes: notes ? `${payment.notes ? payment.notes + ' | ' : ''}${notes}` : payment.notes,
      },
    });

    await logAudit({
      req,
      action: 'PAYMENT',
      entity: 'Payment',
      entityId: paymentId,
      newValues: { paid: amountToPay, totalPaid: newPaidAmount, status: newStatus, method: paymentMethod },
    });

    res.json(updated);
  } catch (err) {
    console.error('Erro ao baixar pagamento:', err);
    res.status(500).json({ error: 'Erro ao registrar baixa de pagamento' });
  }
});
