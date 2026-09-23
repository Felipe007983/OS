import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { prisma } from '../../config/database.js';
import { authenticateToken, requireAdmin } from '../../middlewares/auth.middleware.js';
import { logAudit } from '../../middlewares/audit.service.js';
import { getParam } from '../../shared/params.js';

export const thirdPartiesRouter = Router();

thirdPartiesRouter.use(authenticateToken);

const createThirdPartySchema = z.object({
  name: z.string().min(2, 'Nome é obrigatório'),
  cpfCnpj: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  whatsapp: z.string().min(8, 'WhatsApp é obrigatório'),
  email: z.string().email('E-mail inválido').optional().nullable(),
  city: z.string().optional().nullable(),
  state: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  pixKey: z.string().optional().nullable(),
  pixType: z.string().optional().nullable(),
  bankInfo: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  createLogin: z.boolean().optional(),
  loginPassword: z.string().min(6).optional(),
});

// Listagem com métricas acumuladas da tabela da Costureira (item 3)
thirdPartiesRouter.get('/', requireAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    const companyId = req.user!.companyId;
    const search = req.query.search as string | undefined;
    const status = req.query.status as string | undefined;

    const where: any = { companyId };
    if (status && status !== 'TODOS') {
      where.status = status;
    }
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { whatsapp: { contains: search } },
        { city: { contains: search } },
        { cpfCnpj: { contains: search } },
      ];
    }

    const thirdParties = await prisma.thirdParty.findMany({
      where,
      include: {
        user: { select: { id: true, email: true, status: true, lastLoginAt: true } },
        serviceOrders: {
          select: {
            id: true,
            status: true,
            dueDate: true,
            totalPieces: true,
            totalAmount: true,
            items: {
              select: {
                quantityProduced: true,
                quantityDelivered: true,
                quantityApproved: true,
              },
            },
          },
        },
        payments: {
          select: {
            status: true,
            calculatedAmount: true,
            paidAmount: true,
            remainingAmount: true,
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    const now = new Date();

    const formatted = thirdParties.map((tp) => {
      let openOrders = 0;
      let inProductionOrders = 0;
      let delayedOrders = 0;
      let totalPiecesProduced = 0;

      tp.serviceOrders.forEach((os) => {
        if (['RASCUNHO', 'AGUARDANDO_ACEITE', 'ACEITA'].includes(os.status)) {
          openOrders++;
        }
        if (['EM_PRODUCAO', 'PARCIALMENTE_ENTREGUE', 'CONFERENCIA'].includes(os.status)) {
          inProductionOrders++;
        }
        if (!['FINALIZADA', 'CANCELADA'].includes(os.status) && new Date(os.dueDate) < now) {
          delayedOrders++;
        }
        os.items.forEach((item) => {
          totalPiecesProduced += item.quantityProduced;
        });
      });

      let totalToPay = 0;
      let totalPaid = 0;
      tp.payments.forEach((p) => {
        if (p.status !== 'CANCELADO') {
          totalToPay += p.remainingAmount;
          totalPaid += p.paidAmount;
        }
      });

      return {
        id: tp.id,
        name: tp.name,
        cpfCnpj: tp.cpfCnpj,
        phone: tp.phone,
        whatsapp: tp.whatsapp,
        email: tp.email,
        city: tp.city,
        state: tp.state,
        address: tp.address,
        pixKey: tp.pixKey,
        pixType: tp.pixType,
        status: tp.status,
        hasLogin: !!tp.userId,
        userEmail: tp.user?.email || null,
        metrics: {
          openOrders,
          inProductionOrders,
          delayedOrders,
          totalPiecesProduced,
          totalToPay,
          totalPaid,
        },
      };
    });

    res.json(formatted);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao listar terceiros/costureiras' });
  }
});

// Detalhes de uma costureira específica
thirdPartiesRouter.get('/:id', requireAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    const id = getParam(req, 'id');
    const thirdParty = await prisma.thirdParty.findFirst({
      where: { id, companyId: req.user!.companyId },
      include: {
        user: { select: { id: true, email: true, status: true, lastLoginAt: true } },
        serviceOrders: {
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
        payments: {
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
      },
    });

    if (!thirdParty) {
      res.status(404).json({ error: 'Costureira não encontrada' });
      return;
    }

    res.json(thirdParty);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao carregar dados da costureira' });
  }
});

// Criar Costureira
thirdPartiesRouter.post('/', requireAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    const parseResult = createThirdPartySchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({ error: parseResult.error.errors[0].message });
      return;
    }

    const data = parseResult.data;
    const companyId = req.user!.companyId;

    let userId: string | null = null;
    if (data.createLogin && data.email && data.loginPassword) {
      const existingUser = await prisma.user.findUnique({ where: { email: data.email } });
      if (existingUser) {
        res.status(400).json({ error: 'Já existe um usuário cadastrado com este e-mail' });
        return;
      }

      const passwordHash = await bcrypt.hash(data.loginPassword, 10);
      const newUser = await prisma.user.create({
        data: {
          companyId,
          name: data.name,
          email: data.email,
          passwordHash,
          role: 'COSTUREIRA',
          phone: data.phone,
          whatsapp: data.whatsapp,
          address: data.address,
        },
      });
      userId = newUser.id;
    }

    const thirdParty = await prisma.thirdParty.create({
      data: {
        companyId,
        userId,
        name: data.name,
        cpfCnpj: data.cpfCnpj,
        phone: data.phone,
        whatsapp: data.whatsapp,
        email: data.email,
        city: data.city,
        state: data.state,
        address: data.address,
        pixKey: data.pixKey,
        pixType: data.pixType,
        bankInfo: data.bankInfo,
        notes: data.notes,
      },
    });

    await logAudit({
      req,
      action: 'CREATE',
      entity: 'ThirdParty',
      entityId: thirdParty.id,
      newValues: { name: thirdParty.name, whatsapp: thirdParty.whatsapp },
    });

    res.status(201).json(thirdParty);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao cadastrar costureira' });
  }
});

// Atualizar Costureira
thirdPartiesRouter.put('/:id', requireAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    const id = getParam(req, 'id');
    const companyId = req.user!.companyId;

    const existing = await prisma.thirdParty.findFirst({
      where: { id, companyId },
    });

    if (!existing) {
      res.status(404).json({ error: 'Costureira não encontrada' });
      return;
    }

    const updated = await prisma.thirdParty.update({
      where: { id },
      data: {
        name: req.body.name ?? existing.name,
        cpfCnpj: req.body.cpfCnpj ?? existing.cpfCnpj,
        phone: req.body.phone ?? existing.phone,
        whatsapp: req.body.whatsapp ?? existing.whatsapp,
        email: req.body.email ?? existing.email,
        city: req.body.city ?? existing.city,
        state: req.body.state ?? existing.state,
        address: req.body.address ?? existing.address,
        pixKey: req.body.pixKey ?? existing.pixKey,
        pixType: req.body.pixType ?? existing.pixType,
        bankInfo: req.body.bankInfo ?? existing.bankInfo,
        notes: req.body.notes ?? existing.notes,
        status: req.body.status ?? existing.status,
      },
    });

    await logAudit({
      req,
      action: 'UPDATE',
      entity: 'ThirdParty',
      entityId: id,
      oldValues: existing,
      newValues: updated,
    });

    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao atualizar costureira' });
  }
});
