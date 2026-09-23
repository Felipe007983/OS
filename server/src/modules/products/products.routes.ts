import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../../config/database.js';
import { authenticateToken, requireAdmin } from '../../middlewares/auth.middleware.js';

export const productsRouter = Router();

productsRouter.use(authenticateToken);

const productSchema = z.object({
  name: z.string().min(2, 'Nome é obrigatório'),
  sku: z.string().optional().nullable(),
  category: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  defaultUnitPrice: z.number().min(0, 'Valor unitário não pode ser negativo'),
  active: z.boolean().optional(),
});

productsRouter.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const products = await prisma.product.findMany({
      where: { companyId: req.user!.companyId },
      orderBy: { name: 'asc' },
    });
    res.json(products);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao listar produtos' });
  }
});

productsRouter.post('/', requireAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    const parseResult = productSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({ error: parseResult.error.errors[0].message });
      return;
    }

    const data = parseResult.data;
    const product = await prisma.product.create({
      data: {
        companyId: req.user!.companyId,
        name: data.name,
        sku: data.sku,
        category: data.category,
        description: data.description,
        defaultUnitPrice: data.defaultUnitPrice,
        active: data.active ?? true,
      },
    });

    res.status(201).json(product);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao criar produto' });
  }
});

productsRouter.put('/:id', requireAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const updated = await prisma.product.updateMany({
      where: { id, companyId: req.user!.companyId },
      data: req.body,
    });
    if (updated.count === 0) {
      res.status(404).json({ error: 'Produto não encontrado' });
      return;
    }
    res.json({ message: 'Produto atualizado com sucesso' });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao atualizar produto' });
  }
});
