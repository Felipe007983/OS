import { prisma } from '../config/database.js';

export async function ensurePaymentForOrder(serviceOrderId: string) {
  const os = await prisma.serviceOrder.findUnique({
    where: { id: serviceOrderId },
    include: { items: true, payments: true },
  });

  if (!os) return null;

  const existing = os.payments.find((p) => p.status !== 'CANCELADO');
  if (existing) return existing;

  const calculatedFromApproved = os.items.reduce(
    (sum, item) => sum + item.quantityApproved * item.unitPrice,
    0
  );
  const baseAmount =
    calculatedFromApproved > 0
      ? calculatedFromApproved
      : os.pricingModel === 'FIXED_PRICE' && os.fixedPriceAmount != null
        ? os.fixedPriceAmount
        : os.totalAmount;

  return prisma.payment.create({
    data: {
      companyId: os.companyId,
      serviceOrderId: os.id,
      thirdPartyId: os.thirdPartyId,
      expectedAmount: os.totalAmount,
      calculatedAmount: baseAmount,
      remainingAmount: baseAmount,
      status: 'PENDENTE',
      notes: 'Pagamento gerado automaticamente pela OS',
    },
  });
}

export async function syncPaymentFromApprovedItems(serviceOrderId: string) {
  const os = await prisma.serviceOrder.findUnique({
    where: { id: serviceOrderId },
    include: { items: true },
  });

  if (!os) return null;

  await ensurePaymentForOrder(serviceOrderId);

  let totalApprovedPieces = 0;
  let calculatedPaymentAmount = 0;

  os.items.forEach((item) => {
    totalApprovedPieces += item.quantityApproved;
    calculatedPaymentAmount += item.quantityApproved * item.unitPrice;
  });

  const finalCalculatedAmount =
    os.pricingModel === 'FIXED_PRICE' && os.fixedPriceAmount != null && totalApprovedPieces >= os.totalPieces
      ? os.fixedPriceAmount
      : calculatedPaymentAmount > 0
        ? calculatedPaymentAmount
        : os.totalAmount;

  const currentPayment = await prisma.payment.findFirst({
    where: { serviceOrderId: os.id, status: { not: 'CANCELADO' } },
  });

  if (!currentPayment) return null;

  const newRemaining = Math.max(0, finalCalculatedAmount - currentPayment.paidAmount);
  const newStatus =
    newRemaining <= 0 ? 'PAGO' : currentPayment.paidAmount > 0 ? 'PARCIAL' : 'PENDENTE';

  return prisma.payment.update({
    where: { id: currentPayment.id },
    data: {
      calculatedAmount: finalCalculatedAmount,
      remainingAmount: newRemaining,
      status: newStatus,
    },
  });
}
