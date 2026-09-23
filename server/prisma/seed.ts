import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando seed do banco de dados...');

  // 1. Empresa Principal
  const company = await prisma.company.create({
    data: {
      name: 'Confecções Elite Têxtil Ltda',
      tradeName: 'Elite Confecção & Moda',
      cnpj: '12.345.678/0001-90',
      phone: '(19) 3456-7890',
      email: 'contato@elitetextil.com.br',
      address: 'Distrito Industrial, Americana - SP',
    },
  });

  console.log(`🏢 Empresa criada: ${company.name} (${company.id})`);

  // 2. Usuário Administrador
  const adminPassword = await bcrypt.hash('admin123', 10);
  const adminUser = await prisma.user.create({
    data: {
      companyId: company.id,
      name: 'João Carlos - Gerente de Produção',
      email: 'admin@oficio.com',
      passwordHash: adminPassword,
      role: 'ADMIN',
      phone: '(19) 99111-2233',
      whatsapp: '(19) 99111-2233',
    },
  });

  console.log(`👤 Admin criado: ${adminUser.email}`);

  // 3. Catálogo de Produtos
  const p1 = await prisma.product.create({
    data: {
      companyId: company.id,
      name: 'Camiseta Algodão Penteado',
      sku: 'CAM-ALG-001',
      category: 'Camisaria',
      description: 'Camiseta gola redonda 100% algodão 30.1',
      defaultUnitPrice: 2.50,
    },
  });

  const p2 = await prisma.product.create({
    data: {
      companyId: company.id,
      name: 'Calça Jeans Tradicional',
      sku: 'CAL-JNS-002',
      category: 'Jeanswear',
      description: 'Calça jeans com bolso faca e pesponto reforçado',
      defaultUnitPrice: 5.00,
    },
  });

  const p3 = await prisma.product.create({
    data: {
      companyId: company.id,
      name: 'Blusa Crepe Manga Bufante',
      sku: 'BLU-CRP-003',
      category: 'Feminino',
      description: 'Blusa crepe de seda com acabamento em viés',
      defaultUnitPrice: 3.50,
    },
  });

  const p4 = await prisma.product.create({
    data: {
      companyId: company.id,
      name: 'Bermuda Sarja Masculina',
      sku: 'BER-SAR-004',
      category: 'Casual',
      description: 'Bermuda com cós anatômico e 4 bolsos',
      defaultUnitPrice: 4.00,
    },
  });

  console.log('👕 Produtos cadastrados com sucesso');

  // 4. Usuária Costureira com Login
  const seamstressPassword = await bcrypt.hash('costura123', 10);
  const mariaUser = await prisma.user.create({
    data: {
      companyId: company.id,
      name: 'Maria da Silva',
      email: 'maria@costura.com',
      passwordHash: seamstressPassword,
      role: 'COSTUREIRA',
      phone: '(19) 98765-4321',
      whatsapp: '19987654321',
    },
  });

  // 5. Costureiras (ThirdParties)
  const mariaTP = await prisma.thirdParty.create({
    data: {
      companyId: company.id,
      userId: mariaUser.id,
      name: 'Maria da Silva Confecções',
      cpfCnpj: '234.567.890-12',
      phone: '(19) 98765-4321',
      whatsapp: '19987654321',
      email: 'maria@costura.com',
      city: 'Americana',
      state: 'SP',
      address: 'Rua das Flores, 142 - Jd. Alvorada',
      pixKey: '234.567.890-12',
      pixType: 'CPF',
      notes: 'Costureira experiente em malharia e camisaria rápida.',
    },
  });

  const anaTP = await prisma.thirdParty.create({
    data: {
      companyId: company.id,
      name: 'Ana Paula Facção',
      cpfCnpj: '345.678.901-23',
      phone: '(19) 99887-7665',
      whatsapp: '19998877665',
      email: 'anapaula.faccao@gmail.com',
      city: "Santa Bárbara d'Oeste",
      state: 'SP',
      address: 'Av. Corifeu de Azevedo, 500',
      pixKey: '19998877665',
      pixType: 'TELEFONE',
      notes: 'Especialista em tecidos finos e alfaiataria feminina.',
    },
  });

  const rochaTP = await prisma.thirdParty.create({
    data: {
      companyId: company.id,
      name: 'Confecção Irmãos Rocha',
      cpfCnpj: '45.678.901/0001-34',
      phone: '(47) 99123-4567',
      whatsapp: '47991234567',
      email: 'contato@irmaosrocha.com.br',
      city: 'Brusque',
      state: 'SC',
      address: 'Rodovia Deputado Gentil Batisti Archer, 1200',
      pixKey: '45.678.901/0001-34',
      pixType: 'CNPJ',
      notes: 'Facção estruturada para alta demanda e produção industrial de sarja e jeans.',
    },
  });

  console.log('🧵 Costureiras cadastradas');

  // 6. Criar Ordem de Serviço #000152 (Maria da Silva - Exemplo do Prompt)
  const dueDateOS152 = new Date();
  dueDateOS152.setDate(dueDateOS152.getDate() + 15);

  const os152 = await prisma.serviceOrder.create({
    data: {
      companyId: company.id,
      orderNumber: 152,
      thirdPartyId: mariaTP.id,
      createdByUserId: adminUser.id,
      pricingModel: 'UNIT_PRICE',
      totalPieces: 1000,
      totalAmount: 3300.00,
      dueDate: dueDateOS152,
      status: 'EM_PRODUCAO',
      acceptedAt: new Date(),
      acceptedIp: '187.55.120.44',
      acceptedUserAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X)',
      acceptanceType: 'PUBLIC_LINK',
      notes: 'Peças cortadas e aviamentos (linhas e etiquetas) entregues na oficina.',
      items: {
        create: [
          {
            productId: p1.id,
            productName: 'Camiseta Algodão Penteado',
            description: 'Reforço ombro a ombro',
            quantityRequested: 500,
            unitPrice: 2.50,
            totalPrice: 1250.00,
            quantityProduced: 350,
            quantityDelivered: 300,
            quantityApproved: 290,
            quantityRejected: 10,
            rejectionReason: '10 peças com costura da gola torta',
          },
          {
            productId: p2.id,
            productName: 'Calça Jeans Tradicional',
            description: 'Pesponto duplo ocre',
            quantityRequested: 200,
            unitPrice: 5.00,
            totalPrice: 1000.00,
            quantityProduced: 120,
            quantityDelivered: 100,
            quantityApproved: 100,
            quantityRejected: 0,
          },
          {
            productId: p3.id,
            productName: 'Blusa Crepe Manga Bufante',
            description: 'Elástico fino no punho',
            quantityRequested: 300,
            unitPrice: 3.50,
            totalPrice: 1050.00,
            quantityProduced: 150,
            quantityDelivered: 100,
            quantityApproved: 100,
            quantityRejected: 0,
          },
        ],
      },
    },
    include: { items: true },
  });

  // Histórico de status da OS 152
  await prisma.orderStatusHistory.createMany({
    data: [
      {
        serviceOrderId: os152.id,
        fromStatus: 'NOVA',
        toStatus: 'RASCUNHO',
        changedBy: 'João Carlos',
        reason: 'Criação da OS',
      },
      {
        serviceOrderId: os152.id,
        fromStatus: 'RASCUNHO',
        toStatus: 'AGUARDANDO_ACEITE',
        changedBy: 'João Carlos',
        reason: 'Enviado link para WhatsApp',
      },
      {
        serviceOrderId: os152.id,
        fromStatus: 'AGUARDANDO_ACEITE',
        toStatus: 'ACEITA',
        changedBy: 'Maria da Silva',
        reason: 'Aceite digital via celular',
      },
      {
        serviceOrderId: os152.id,
        fromStatus: 'ACEITA',
        toStatus: 'EM_PRODUCAO',
        changedBy: 'Maria da Silva',
        reason: 'Apontamento inicial de produção',
      },
    ],
  });

  // Remessa de Entrega parcial já conferida da OS 152
  const delivery152 = await prisma.delivery.create({
    data: {
      serviceOrderId: os152.id,
      deliveryNumber: 1,
      status: 'CONFERIDO',
      notes: 'Primeiro lote de 500 peças trazido pelo motoboy',
      conferencedAt: new Date(),
      conferencedBy: 'João Carlos',
      items: {
        create: [
          {
            serviceOrderItemId: os152.items[0].id,
            quantityDelivered: 300,
            quantityApproved: 290,
            quantityRejected: 10,
            rejectionReason: '10 peças com acabamento irregular',
          },
          {
            serviceOrderItemId: os152.items[1].id,
            quantityDelivered: 100,
            quantityApproved: 100,
            quantityRejected: 0,
          },
          {
            serviceOrderItemId: os152.items[2].id,
            quantityDelivered: 100,
            quantityApproved: 100,
            quantityRejected: 0,
          },
        ],
      },
    },
  });

  // Pagamento da OS 152
  const approvedPaymentValue = (290 * 2.50) + (100 * 5.00) + (100 * 3.50); // 725 + 500 + 350 = 1575
  await prisma.payment.create({
    data: {
      companyId: company.id,
      serviceOrderId: os152.id,
      thirdPartyId: mariaTP.id,
      expectedAmount: 3300.00,
      calculatedAmount: 3300.00,
      paidAmount: 1000.00,
      remainingAmount: 2300.00,
      status: 'PARCIAL',
      paymentMethod: 'PIX',
      paidAt: new Date(),
      notes: 'Adiantamento de R$ 1.000,00 pago via PIX.',
    },
  });

  // 7. Criar Ordem de Serviço #000153 (Ana Paula - Aguardando Aceite com Token)
  const dueDateOS153 = new Date();
  dueDateOS153.setDate(dueDateOS153.getDate() + 10);
  const sampleToken = 'token-teste-aceite-153';

  const os153 = await prisma.serviceOrder.create({
    data: {
      companyId: company.id,
      orderNumber: 153,
      thirdPartyId: anaTP.id,
      createdByUserId: adminUser.id,
      pricingModel: 'UNIT_PRICE',
      totalPieces: 300,
      totalAmount: 1050.00,
      dueDate: dueDateOS153,
      status: 'AGUARDANDO_ACEITE',
      sentAt: new Date(),
      notes: 'Atenção especial ao encaixe das estampas nas mangas.',
      items: {
        create: [
          {
            productId: p3.id,
            productName: 'Blusa Crepe Manga Bufante',
            description: 'Tamanhos variados P, M e G',
            quantityRequested: 300,
            unitPrice: 3.50,
            totalPrice: 1050.00,
          },
        ],
      },
    },
  });

  await prisma.acceptanceToken.create({
    data: {
      serviceOrderId: os153.id,
      token: sampleToken,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      snapshotJson: JSON.stringify({
        orderNumber: 153,
        thirdPartyName: anaTP.name,
        totalPieces: 300,
        totalAmount: 1050.00,
      }),
    },
  });

  await prisma.payment.create({
    data: {
      companyId: company.id,
      serviceOrderId: os153.id,
      thirdPartyId: anaTP.id,
      expectedAmount: 1050.00,
      calculatedAmount: 1050.00,
      remainingAmount: 1050.00,
      status: 'PENDENTE',
    },
  });

  console.log(`📋 OS #000152 e #000153 criadas com sucesso`);
  console.log('✅ SEED FINALIZADO COM ÊXITO!');
}

main()
  .catch((e) => {
    console.error('❌ Erro no seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
