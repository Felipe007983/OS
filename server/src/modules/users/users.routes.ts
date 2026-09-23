import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { prisma } from '../../config/database.js';
import { authenticateToken, requireAdmin } from '../../middlewares/auth.middleware.js';
import { logAudit } from '../../middlewares/audit.service.js';

export const usersRouter = Router();

usersRouter.use(authenticateToken);
usersRouter.use(requireAdmin);

const createUserSchema = z.object({
  name: z.string().min(2, 'Nome é obrigatório'),
  email: z.string().email('E-mail inválido'),
  password: z.string().min(6, 'Senha deve ter no mínimo 6 caracteres'),
  role: z.enum(['ADMIN', 'COSTUREIRA']),
  phone: z.string().optional().nullable(),
  whatsapp: z.string().optional().nullable(),
  thirdPartyId: z.string().uuid().optional().nullable(),
  status: z.enum(['ATIVO', 'INATIVO']).optional(),
});

const updateUserSchema = z.object({
  name: z.string().min(2).optional(),
  email: z.string().email().optional(),
  password: z.string().min(6).optional(),
  role: z.enum(['ADMIN', 'COSTUREIRA']).optional(),
  phone: z.string().optional().nullable(),
  whatsapp: z.string().optional().nullable(),
  thirdPartyId: z.string().uuid().optional().nullable(),
  status: z.enum(['ATIVO', 'INATIVO']).optional(),
});

usersRouter.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const users = await prisma.user.findMany({
      where: { companyId: req.user!.companyId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        phone: true,
        whatsapp: true,
        status: true,
        lastLoginAt: true,
        createdAt: true,
        thirdParty: { select: { id: true, name: true } },
      },
      orderBy: { name: 'asc' },
    });
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao listar usuários' });
  }
});

usersRouter.post('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const parseResult = createUserSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({ error: parseResult.error.errors[0].message });
      return;
    }

    const data = parseResult.data;
    const companyId = req.user!.companyId;

    const existing = await prisma.user.findUnique({ where: { email: data.email } });
    if (existing) {
      res.status(400).json({ error: 'Já existe um usuário com este e-mail' });
      return;
    }

    if (data.role === 'COSTUREIRA' && data.thirdPartyId) {
      const tp = await prisma.thirdParty.findFirst({
        where: { id: data.thirdPartyId, companyId },
      });
      if (!tp) {
        res.status(400).json({ error: 'Costureira não encontrada' });
        return;
      }
      if (tp.userId) {
        res.status(400).json({ error: 'Esta costureira já possui um usuário vinculado' });
        return;
      }
    }

    const passwordHash = await bcrypt.hash(data.password, 10);
    const user = await prisma.user.create({
      data: {
        companyId,
        name: data.name,
        email: data.email,
        passwordHash,
        role: data.role,
        phone: data.phone,
        whatsapp: data.whatsapp,
        status: data.status ?? 'ATIVO',
      },
    });

    if (data.role === 'COSTUREIRA' && data.thirdPartyId) {
      await prisma.thirdParty.update({
        where: { id: data.thirdPartyId },
        data: { userId: user.id },
      });
    }

    await logAudit({
      req,
      action: 'CREATE',
      entity: 'User',
      entityId: user.id,
      newValues: { name: user.name, email: user.email, role: user.role },
    });

    res.status(201).json({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      status: user.status,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao criar usuário' });
  }
});

usersRouter.put('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const companyId = req.user!.companyId;

    const parseResult = updateUserSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({ error: parseResult.error.errors[0].message });
      return;
    }

    const existing = await prisma.user.findFirst({ where: { id, companyId } });
    if (!existing) {
      res.status(404).json({ error: 'Usuário não encontrado' });
      return;
    }

    const data = parseResult.data;

    if (data.email && data.email !== existing.email) {
      const emailTaken = await prisma.user.findUnique({ where: { email: data.email } });
      if (emailTaken) {
        res.status(400).json({ error: 'E-mail já está em uso' });
        return;
      }
    }

    const updateData: Record<string, unknown> = {
      name: data.name ?? existing.name,
      email: data.email ?? existing.email,
      role: data.role ?? existing.role,
      phone: data.phone !== undefined ? data.phone : existing.phone,
      whatsapp: data.whatsapp !== undefined ? data.whatsapp : existing.whatsapp,
      status: data.status ?? existing.status,
    };

    if (data.password) {
      updateData.passwordHash = await bcrypt.hash(data.password, 10);
    }

    const updated = await prisma.user.update({
      where: { id },
      data: updateData,
    });

    if (data.thirdPartyId !== undefined) {
      await prisma.thirdParty.updateMany({
        where: { userId: id },
        data: { userId: null },
      });
      if (data.thirdPartyId) {
        await prisma.thirdParty.update({
          where: { id: data.thirdPartyId },
          data: { userId: id },
        });
      }
    }

    await logAudit({
      req,
      action: 'UPDATE',
      entity: 'User',
      entityId: id,
      oldValues: { role: existing.role, status: existing.status },
      newValues: { role: updated.role, status: updated.status },
    });

    res.json({
      id: updated.id,
      name: updated.name,
      email: updated.email,
      role: updated.role,
      status: updated.status,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao atualizar usuário' });
  }
});

usersRouter.delete('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const companyId = req.user!.companyId;

    if (id === req.user!.id) {
      res.status(400).json({ error: 'Você não pode excluir seu próprio usuário' });
      return;
    }

    const existing = await prisma.user.findFirst({ where: { id, companyId } });
    if (!existing) {
      res.status(404).json({ error: 'Usuário não encontrado' });
      return;
    }

    await prisma.thirdParty.updateMany({
      where: { userId: id },
      data: { userId: null },
    });

    await prisma.user.delete({ where: { id } });

    await logAudit({
      req,
      action: 'DELETE',
      entity: 'User',
      entityId: id,
      oldValues: { name: existing.name, email: existing.email },
    });

    res.json({ message: 'Usuário excluído com sucesso' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao excluir usuário' });
  }
});
