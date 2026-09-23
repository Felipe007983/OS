export function computeSituationLabel(
  osStatus: string,
  totalPieces: number,
  totalApproved: number,
  totalDelivered: number,
  paymentStatus?: string | null
): string {
  const isFinalized = osStatus === 'FINALIZADA';
  const isPartialDelivery =
    ['PARCIALMENTE_ENTREGUE', 'CONFERENCIA'].includes(osStatus) ||
    (totalApproved > 0 && totalApproved < totalPieces) ||
    (totalDelivered > 0 && totalDelivered < totalPieces);

  if (isFinalized && paymentStatus === 'PAGO') return 'ENTREGUE_E_PAGO';
  if (isFinalized && paymentStatus && ['PENDENTE', 'PARCIAL'].includes(paymentStatus)) {
    return 'ENTREGUE_PENDENTE';
  }

  if (isPartialDelivery && paymentStatus === 'PARCIAL') return 'ENTREGUE_PARCIAL_PAGO_PARCIAL';
  if (isPartialDelivery && paymentStatus === 'PENDENTE') return 'ENTREGUE_PARCIAL_PENDENTE';
  if (isPartialDelivery && paymentStatus === 'PAGO') return 'ENTREGUE_PARCIAL_PAGO';

  if (paymentStatus === 'PAGO') return 'PAGO';
  if (paymentStatus === 'PARCIAL') return 'PARCIAL';
  if (paymentStatus === 'PENDENTE') return 'PENDENTE';
  return 'EM_ANDAMENTO';
}
