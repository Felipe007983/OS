import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { prisma } from '../../config/database.js';
import { ENV } from '../../config/env.js';
import { authenticateToken } from '../../middlewares/auth.middleware.js';
import { logAudit } from '../../middlewares/audit.service.js';
import { OS_STATUS } from '../../shared/stateMachine.js';
import { getParam } from '../../shared/params.js';

export const acceptanceRouter = Router();

// -------------------------------------------------------------
// ROTA AUTENTICADA: Gerar Link de Aceite (WhatsApp)
// -------------------------------------------------------------
acceptanceRouter.post('/generate-link/:orderId', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const orderId = getParam(req, 'orderId');
    const user = req.user!;

    const os = await prisma.serviceOrder.findFirst({
      where: { id: orderId, companyId: user.companyId },
      include: {
        thirdParty: true,
        items: true,
      },
    });

    if (!os) {
      res.status(404).json({ error: 'Ordem de serviço não encontrada' });
      return;
    }

    // Revoga tokens ativos anteriores para esta OS
    await prisma.acceptanceToken.updateMany({
      where: { serviceOrderId: orderId, revoked: false },
      data: { revoked: true },
    });

    // Cria token seguro aleatório
    const token = crypto.randomBytes(24).toString('hex');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 dias de validade

    const snapshotJson = JSON.stringify({
      orderNumber: os.orderNumber,
      thirdPartyName: os.thirdParty.name,
      totalPieces: os.totalPieces,
      totalAmount: os.totalAmount,
      pricingModel: os.pricingModel,
      dueDate: os.dueDate,
      version: os.version,
      items: os.items.map((i) => ({
        productName: i.productName,
        quantity: i.quantityRequested,
        unitPrice: i.unitPrice,
        total: i.totalPrice,
      })),
    });

    await prisma.acceptanceToken.create({
      data: {
        serviceOrderId: os.id,
        token,
        expiresAt,
        snapshotJson,
      },
    });

    // Atualiza status para AGUARDANDO_ACEITE se for RASCUNHO ou RECUSADA
    if (['RASCUNHO', 'RECUSADA'].includes(os.status)) {
      await prisma.serviceOrder.update({
        where: { id: os.id },
        data: {
          status: OS_STATUS.AGUARDANDO_ACEITE,
          sentAt: new Date(),
        },
      });

      await prisma.orderStatusHistory.create({
        data: {
          serviceOrderId: os.id,
          fromStatus: os.status,
          toStatus: OS_STATUS.AGUARDANDO_ACEITE,
          changedBy: user.name,
          reason: 'Link de aceite digital gerado e enviado para a costureira',
        },
      });
    }

    const publicUrl = `${ENV.APP_BASE_URL}/aceite/${token}`;
    const signUrl = `${ENV.APP_BASE_URL}/assinar/${token}`;
    const formattedNumber = `#${String(os.orderNumber).padStart(6, '0')}`;
    const formattedAmount = os.totalAmount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    const formattedDate = new Date(os.dueDate).toLocaleDateString('pt-BR');

    // Mensagem padronizada pronta para WhatsApp conforme especificação (Item 8)
    const rawMessage = `Olá, ${os.thirdParty.name}!\nVocê possui uma nova Ordem de Serviço disponível.\n\nOS: ${formattedNumber}\nQuantidade: ${os.totalPieces} peças\nPrazo: ${formattedDate}\nValor: ${formattedAmount}\n\nPara assinar com seu usuário e senha:\n${signUrl}\n\nOu aceite direto pelo link:\n${publicUrl}\n\nAtenciosamente,\n${user.name}`;
    
    // Limpa telefone (apenas números)
    const cleanPhone = os.thirdParty.whatsapp.replace(/\D/g, '');
    const whatsappUrl = `https://wa.me/55${cleanPhone}?text=${encodeURIComponent(rawMessage)}`;

    res.json({
      token,
      publicUrl,
      signUrl,
      whatsappUrl,
      rawMessage,
      expiresAt,
    });
  } catch (err) {
    console.error('Erro ao gerar link de aceite:', err);
    res.status(500).json({ error: 'Erro ao gerar link de aceite' });
  }
});

// -------------------------------------------------------------
// ROTA PÚBLICA: Consultar OS através do Token (Sem necessidade de login)
// -------------------------------------------------------------
acceptanceRouter.get('/public/:token', async (req: Request, res: Response): Promise<void> => {
  try {
    const token = getParam(req, 'token');

    const tokenRecord = await prisma.acceptanceToken.findUnique({
      where: { token },
      include: {
        serviceOrder: {
          include: {
            company: { select: { name: true, tradeName: true, phone: true, logoUrl: true } },
            thirdParty: { select: { id: true, name: true, whatsapp: true } },
            items: true,
          },
        },
      },
    });

    if (!tokenRecord) {
      res.status(404).json({ error: 'Link de aceite não encontrado ou inválido' });
      return;
    }

    if (tokenRecord.revoked) {
      res.status(410).json({ error: 'Este link foi cancelado ou substituído por uma nova versão da OS' });
      return;
    }

    if (new Date() > tokenRecord.expiresAt) {
      res.status(410).json({ error: 'Este link de aceite expirou. Solicite um novo link à empresa.' });
      return;
    }

    const os = tokenRecord.serviceOrder;

    res.json({
      token: tokenRecord.token,
      expiresAt: tokenRecord.expiresAt,
      alreadyAccepted: ['ACEITA', 'EM_PRODUCAO', 'PARCIALMENTE_ENTREGUE', 'CONFERENCIA', 'FINALIZADA'].includes(os.status),
      currentStatus: os.status,
      order: {
        id: os.id,
        orderNumber: os.orderNumber,
        formattedNumber: `#${String(os.orderNumber).padStart(6, '0')}`,
        companyName: os.company.tradeName || os.company.name,
        companyPhone: os.company.phone,
        seamstressName: os.thirdParty.name,
        dueDate: os.dueDate,
        pricingModel: os.pricingModel,
        totalPieces: os.totalPieces,
        totalAmount: os.totalAmount,
        notes: os.notes,
        version: os.version,
        items: os.items.map((i) => ({
          productName: i.productName,
          description: i.description,
          quantity: i.quantityRequested,
          unitPrice: i.unitPrice,
          totalPrice: i.totalPrice,
        })),
      },
    });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao consultar dados de aceite' });
  }
});

// -------------------------------------------------------------
// ROTA PÚBLICA: Aceitar OS via Token
// -------------------------------------------------------------
acceptanceRouter.post('/public/:token/accept', async (req: Request, res: Response): Promise<void> => {
  try {
    const token = getParam(req, 'token');

    const tokenRecord = await prisma.acceptanceToken.findUnique({
      where: { token },
      include: {
        serviceOrder: {
          include: { items: true, thirdParty: true },
        },
      },
    });

    if (!tokenRecord || tokenRecord.revoked || new Date() > tokenRecord.expiresAt) {
      res.status(400).json({ error: 'Link inválido, expirado ou revogado' });
      return;
    }

    const os = tokenRecord.serviceOrder;

    if (os.status === 'ACEITA' || os.status === 'EM_PRODUCAO') {
      res.status(400).json({ error: 'Esta Ordem de Serviço já foi aceita anteriormente' });
      return;
    }

    const ip = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '127.0.0.1';
    const userAgent = req.headers['user-agent'] || 'Desconhecido';

    const termsText = `Declaro que analisei a Ordem de Serviço #${os.orderNumber} no valor de R$ ${os.totalAmount.toFixed(2)}, com prazo limite de entrega para ${new Date(os.dueDate).toLocaleDateString('pt-BR')} e comprometo-me a realizar a confecção das ${os.totalPieces} peças conforme padrão acordado.`;

    // Atualiza a OS para ACEITA
    await prisma.serviceOrder.update({
      where: { id: os.id },
      data: {
        status: OS_STATUS.ACEITA,
        acceptedAt: new Date(),
        acceptedIp: ip,
        acceptedUserAgent: userAgent,
        acceptanceType: 'PUBLIC_LINK',
      },
    });

    // Marca token como utilizado
    await prisma.acceptanceToken.update({
      where: { id: tokenRecord.id },
      data: { usedAt: new Date() },
    });

    // Registra evidência jurídica imutável
    await prisma.acceptanceRecord.create({
      data: {
        serviceOrderId: os.id,
        version: os.version,
        action: 'ACEITO',
        acceptedTerms: termsText,
        snapshotData: tokenRecord.snapshotJson,
        ipAddress: ip,
        userAgent,
        tokenUsed: token,
      },
    });

    // Histórico de status
    await prisma.orderStatusHistory.create({
      data: {
        serviceOrderId: os.id,
        fromStatus: os.status,
        toStatus: OS_STATUS.ACEITA,
        changedBy: `Costureira: ${os.thirdParty.name}`,
        reason: 'Aceite digital efetuado via link público com registro de IP e evidência.',
      },
    });

    await logAudit({
      req,
      companyId: os.companyId,
      action: 'ACCEPT_OS',
      entity: 'ServiceOrder',
      entityId: os.id,
      newValues: { status: 'ACEITA', acceptedIp: ip, acceptedUserAgent: userAgent },
    });

    res.json({ message: 'Ordem de Serviço aceita com sucesso!', orderNumber: os.orderNumber });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao registrar aceite' });
  }
});

// -------------------------------------------------------------
// ROTA PÚBLICA: Recusar OS via Token
// -------------------------------------------------------------
acceptanceRouter.post('/public/:token/reject', async (req: Request, res: Response): Promise<void> => {
  try {
    const token = getParam(req, 'token');
    const { reason } = req.body;

    if (!reason || reason.trim().length < 3) {
      res.status(400).json({ error: 'Por favor, informe o motivo da recusa' });
      return;
    }

    const tokenRecord = await prisma.acceptanceToken.findUnique({
      where: { token },
      include: {
        serviceOrder: { include: { thirdParty: true } },
      },
    });

    if (!tokenRecord || tokenRecord.revoked || new Date() > tokenRecord.expiresAt) {
      res.status(400).json({ error: 'Link inválido ou expirado' });
      return;
    }

    const os = tokenRecord.serviceOrder;
    const ip = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '127.0.0.1';
    const userAgent = req.headers['user-agent'] || 'Desconhecido';

    await prisma.serviceOrder.update({
      where: { id: os.id },
      data: { status: OS_STATUS.RECUSADA },
    });

    await prisma.acceptanceRecord.create({
      data: {
        serviceOrderId: os.id,
        version: os.version,
        action: 'RECUSADO',
        rejectionReason: reason,
        acceptedTerms: 'Recusa formalizada pela costureira.',
        snapshotData: tokenRecord.snapshotJson,
        ipAddress: ip,
        userAgent,
        tokenUsed: token,
      },
    });

    await prisma.orderStatusHistory.create({
      data: {
        serviceOrderId: os.id,
        fromStatus: os.status,
        toStatus: OS_STATUS.RECUSADA,
        changedBy: `Costureira: ${os.thirdParty.name}`,
        reason: `OS Recusada: ${reason}`,
      },
    });

    res.json({ message: 'Recusa registrada com sucesso' });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao registrar recusa' });
  }
});

// -------------------------------------------------------------
// ROTA PÚBLICA: Assinar OS com login (usuário vinculado à costureira)
// -------------------------------------------------------------
acceptanceRouter.post('/public/:token/sign-with-login', async (req: Request, res: Response): Promise<void> => {
  try {
    const token = getParam(req, 'token');
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ error: 'E-mail e senha são obrigatórios' });
      return;
    }

    const tokenRecord = await prisma.acceptanceToken.findUnique({
      where: { token },
      include: {
        serviceOrder: {
          include: { thirdParty: true, items: true },
        },
      },
    });

    if (!tokenRecord || tokenRecord.revoked || new Date() > tokenRecord.expiresAt) {
      res.status(400).json({ error: 'Link inválido, expirado ou revogado' });
      return;
    }

    const os = tokenRecord.serviceOrder;

    if (['ACEITA', 'EM_PRODUCAO', 'FINALIZADA'].includes(os.status)) {
      res.status(400).json({ error: 'Esta Ordem de Serviço já foi assinada' });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { email },
      include: { thirdParty: true },
    });

    if (!user || user.status !== 'ATIVO') {
      res.status(401).json({ error: 'Credenciais inválidas ou usuário inativo' });
      return;
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      res.status(401).json({ error: 'Credenciais inválidas' });
      return;
    }

    if (user.thirdParty?.id !== os.thirdPartyId) {
      res.status(403).json({ error: 'Este usuário não está autorizado a assinar esta Ordem de Serviço' });
      return;
    }

    const ip = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '127.0.0.1';
    const userAgent = req.headers['user-agent'] || 'Desconhecido';

    await prisma.serviceOrder.update({
      where: { id: os.id },
      data: {
        status: OS_STATUS.ACEITA,
        acceptedAt: new Date(),
        acceptedIp: ip,
        acceptedUserAgent: userAgent,
        acceptanceType: 'LOGIN',
      },
    });

    await prisma.acceptanceToken.update({
      where: { id: tokenRecord.id },
      data: { usedAt: new Date() },
    });

    await prisma.acceptanceRecord.create({
      data: {
        serviceOrderId: os.id,
        version: os.version,
        action: 'ACEITO',
        acceptedTerms: `Assinatura digital realizada por ${user.name} (${user.email}) via link com autenticação.`,
        snapshotData: tokenRecord.snapshotJson,
        ipAddress: ip,
        userAgent,
        tokenUsed: token,
      },
    });

    await prisma.orderStatusHistory.create({
      data: {
        serviceOrderId: os.id,
        fromStatus: os.status,
        toStatus: OS_STATUS.ACEITA,
        changedBy: user.name,
        reason: 'Assinatura digital via link com login',
      },
    });

    await logAudit({
      req,
      companyId: os.companyId,
      userId: user.id,
      action: 'ACCEPT_OS',
      entity: 'ServiceOrder',
      entityId: os.id,
      newValues: { status: 'ACEITA', method: 'LOGIN_LINK' },
    });

    res.json({ message: 'Ordem de Serviço assinada com sucesso!', orderNumber: os.orderNumber });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao assinar ordem de serviço' });
  }
});

// -------------------------------------------------------------
// ROTA AUTENTICADA: Aceite direto pela costureira logada (Opção A)
// -------------------------------------------------------------
acceptanceRouter.post('/auth/:orderId/accept', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const orderId = getParam(req, 'orderId');
    const user = req.user!;

    const os = await prisma.serviceOrder.findFirst({
      where: { id: orderId, companyId: user.companyId },
      include: { items: true },
    });

    if (!os) {
      res.status(404).json({ error: 'OS não encontrada' });
      return;
    }

    const ip = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '127.0.0.1';
    const userAgent = req.headers['user-agent'] || 'Desconhecido';

    await prisma.serviceOrder.update({
      where: { id: os.id },
      data: {
        status: OS_STATUS.ACEITA,
        acceptedAt: new Date(),
        acceptedIp: ip,
        acceptedUserAgent: userAgent,
        acceptanceType: 'LOGIN',
      },
    });

    await prisma.acceptanceRecord.create({
      data: {
        serviceOrderId: os.id,
        version: os.version,
        action: 'ACEITO',
        acceptedTerms: `Aceite digital realizado diretamente via Login por ${user.name}`,
        snapshotData: JSON.stringify(os),
        ipAddress: ip,
        userAgent,
      },
    });

    await prisma.orderStatusHistory.create({
      data: {
        serviceOrderId: os.id,
        fromStatus: os.status,
        toStatus: OS_STATUS.ACEITA,
        changedBy: user.name,
        reason: 'Aceite digital via painel autenticado',
      },
    });

    res.json({ message: 'Ordem de serviço aceita com sucesso!' });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao aceitar OS' });
  }
});
