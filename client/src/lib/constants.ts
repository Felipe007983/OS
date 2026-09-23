export const OS_STATUS_LABELS: Record<string, string> = {
  RASCUNHO: 'Rascunho',
  AGUARDANDO_ACEITE: 'Aguardando Aceite',
  ACEITA: 'Aceita',
  RECUSADA: 'Recusada',
  EM_PRODUCAO: 'Em Produção',
  PARCIALMENTE_ENTREGUE: 'Parcialmente Entregue',
  CONFERENCIA: 'Conferência',
  FINALIZADA: 'Finalizada',
  CANCELADA: 'Cancelada',
};

export const OS_STATUS_COLORS: Record<string, string> = {
  RASCUNHO: 'bg-slate-100 text-slate-700',
  AGUARDANDO_ACEITE: 'bg-amber-100 text-amber-800',
  ACEITA: 'bg-blue-100 text-blue-800',
  RECUSADA: 'bg-red-100 text-red-800',
  EM_PRODUCAO: 'bg-indigo-100 text-indigo-800',
  PARCIALMENTE_ENTREGUE: 'bg-purple-100 text-purple-800',
  CONFERENCIA: 'bg-orange-100 text-orange-800',
  FINALIZADA: 'bg-green-100 text-green-800',
  CANCELADA: 'bg-gray-100 text-gray-600',
};

export const PAYMENT_STATUS_LABELS: Record<string, string> = {
  PENDENTE: 'Pendente',
  PARCIAL: 'Parcial',
  PAGO: 'Pago',
  CANCELADO: 'Cancelado',
};

export const PAYMENT_STATUS_COLORS: Record<string, string> = {
  PENDENTE: 'bg-amber-100 text-amber-800',
  PARCIAL: 'bg-blue-100 text-blue-800',
  PAGO: 'bg-green-100 text-green-800',
  CANCELADO: 'bg-gray-100 text-gray-600',
};

export const SITUATION_LABELS: Record<string, string> = {
  EM_ANDAMENTO: 'Em andamento',
  PENDENTE: 'Pendente pagamento',
  PARCIAL: 'Pago parcial',
  PAGO: 'Pago',
  ENTREGUE_PENDENTE: 'Entregue · pendente',
  ENTREGUE_E_PAGO: 'Entregue e pago',
  ENTREGUE_PARCIAL_PENDENTE: 'Entregue parcial · pendente',
  ENTREGUE_PARCIAL_PAGO_PARCIAL: 'Entregue parcial · pago parcial',
  ENTREGUE_PARCIAL_PAGO: 'Entregue parcial · pago',
};

export const SITUATION_COLORS: Record<string, string> = {
  EM_ANDAMENTO: 'bg-slate-100 text-slate-700',
  PENDENTE: 'bg-amber-100 text-amber-800',
  PARCIAL: 'bg-blue-100 text-blue-800',
  PAGO: 'bg-green-100 text-green-800',
  ENTREGUE_PENDENTE: 'bg-orange-100 text-orange-800',
  ENTREGUE_E_PAGO: 'bg-emerald-100 text-emerald-800',
  ENTREGUE_PARCIAL_PENDENTE: 'bg-purple-100 text-purple-800',
  ENTREGUE_PARCIAL_PAGO_PARCIAL: 'bg-indigo-100 text-indigo-800',
  ENTREGUE_PARCIAL_PAGO: 'bg-teal-100 text-teal-800',
};

export const PIX_TYPES = ['CPF', 'CNPJ', 'EMAIL', 'TELEFONE', 'ALEATORIA'] as const;
export const PAYMENT_METHODS = ['PIX', 'TED', 'DINHEIRO', 'BOLETO'] as const;
