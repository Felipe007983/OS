import { Router, Request, Response } from 'express';
import { prisma } from '../../config/database.js';
import { authenticateToken } from '../../middlewares/auth.middleware.js';

export const reportsRouter = Router();

reportsRouter.use(authenticateToken);

// Dashboard Principal
reportsRouter.get('/dashboard', async (req: Request, res: Response): Promise<void> => {
  try {
    const user = req.user!;
    const companyId = user.companyId;

    if (user.role === 'COSTUREIRA') {
      // Dashboard da Costureira (Item 10)
      const thirdPartyId = user.thirdPartyId;
      if (!thirdPartyId) {
        res.json({ error: 'Nenhum cadastro de costureira vinculado ao usuário' });
        return;
      }

      const orders = await prisma.serviceOrder.findMany({
        where: { companyId, thirdPartyId },
        include: { items: true, payments: true },
      });

      const now = new Date();
      let awaitingAcceptance = 0;
      let accepted = 0;
      let inProduction = 0;
      let delayed = 0;
      let completed = 0;
      let totalPieces = 0;
      let totalProduced = 0;
      let totalDelivered = 0;

      orders.forEach((os) => {
        if (os.status === 'AGUARDANDO_ACEITE') awaitingAcceptance++;
        if (os.status === 'ACEITA') accepted++;
        if (['EM_PRODUCAO', 'PARCIALMENTE_ENTREGUE', 'CONFERENCIA'].includes(os.status)) inProduction++;
        if (['FINALIZADA'].includes(os.status)) completed++;
        if (!['FINALIZADA', 'CANCELADA'].includes(os.status) && new Date(os.dueDate) < now) delayed++;

        totalPieces += os.totalPieces;
        os.items.forEach((it) => {
          totalProduced += it.quantityProduced;
          totalDelivered += it.quantityDelivered;
        });
      });

      const payments = await prisma.payment.findMany({
        where: { companyId, thirdPartyId },
      });

      let totalToReceive = 0;
      let totalReceived = 0;
      payments.forEach((p) => {
        if (p.status !== 'CANCELADO') {
          totalToReceive += p.remainingAmount;
          totalReceived += p.paidAmount;
        }
      });

      res.json({
        role: 'COSTUREIRA',
        cards: {
          awaitingAcceptance,
          accepted,
          inProduction,
          delayed,
          completed,
          totalPieces,
          totalProduced,
          totalDelivered,
          totalToReceive,
          totalReceived,
        },
      });
      return;
    }

    // Dashboard Executivo do Administrador (Itens 9 e 24)
    const now = new Date();

    const [orders, thirdPartiesCount, payments] = await Promise.all([
      prisma.serviceOrder.findMany({
        where: { companyId },
        include: { items: true, thirdParty: { select: { id: true, name: true } } },
      }),
      prisma.thirdParty.count({ where: { companyId, status: 'ATIVO' } }),
      prisma.payment.findMany({ where: { companyId } }),
    ]);

    let openOrders = 0;
    let awaitingAcceptance = 0;
    let inProductionOrders = 0;
    let delayedOrders = 0;
    let deliveredOrders = 0;
    let finishedOrders = 0;

    let piecesInProduction = 0;
    let piecesDelivered = 0;
    let totalPiecesGlobal = 0;

    const statusCounts: Record<string, number> = {};
    const seamstressProduction: Record<string, number> = {};

    orders.forEach((os) => {
      statusCounts[os.status] = (statusCounts[os.status] || 0) + 1;

      if (['RASCUNHO', 'ENVIADA', 'AGUARDANDO_ACEITE'].includes(os.status)) openOrders++;
      if (os.status === 'AGUARDANDO_ACEITE') awaitingAcceptance++;
      if (['EM_PRODUCAO', 'PARCIALMENTE_ENTREGUE'].includes(os.status)) inProductionOrders++;
      if (os.status === 'CONFERENCIA' || os.status === 'PARCIALMENTE_ENTREGUE') deliveredOrders++;
      if (os.status === 'FINALIZADA') finishedOrders++;

      if (!['FINALIZADA', 'CANCELADA'].includes(os.status) && new Date(os.dueDate) < now) {
        delayedOrders++;
      }

      totalPiecesGlobal += os.totalPieces;

      const seamstressName = os.thirdParty?.name || 'Não atribuída';
      let osProduced = 0;

      os.items.forEach((it) => {
        piecesDelivered += it.quantityDelivered;
        osProduced += it.quantityProduced;
        if (['EM_PRODUCAO', 'PARCIALMENTE_ENTREGUE', 'ACEITA'].includes(os.status)) {
          piecesInProduction += Math.max(0, it.quantityRequested - it.quantityDelivered);
        }
      });

      seamstressProduction[seamstressName] = (seamstressProduction[seamstressName] || 0) + osProduced;
    });

    let totalToPay = 0;
    let totalPaid = 0;
    let totalPending = 0;

    payments.forEach((p) => {
      if (p.status !== 'CANCELADO') {
        totalToPay += p.calculatedAmount;
        totalPaid += p.paidAmount;
        totalPending += p.remainingAmount;
      }
    });

    const seamstressChartData = Object.entries(seamstressProduction)
      .map(([name, pieces]) => ({ name, pieces }))
      .sort((a, b) => b.pieces - a.pieces)
      .slice(0, 7);

    const statusChartData = Object.entries(statusCounts).map(([status, count]) => ({
      status,
      count,
    }));

    res.json({
      role: 'ADMIN',
      kpis: {
        activeSeamstresses: thirdPartiesCount,
        openOrders,
        awaitingAcceptance,
        inProductionOrders,
        delayedOrders,
        deliveredOrders,
        finishedOrders,
        piecesInProduction,
        piecesDelivered,
        totalPiecesGlobal,
        totalToPay,
        totalPaid,
        totalPending,
      },
      charts: {
        seamstressProduction: seamstressChartData,
        ordersByStatus: statusChartData,
      },
    });
  } catch (err) {
    console.error('Erro no dashboard:', err);
    res.status(500).json({ error: 'Erro ao consolidar dados do dashboard' });
  }
});
