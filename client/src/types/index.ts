export interface User {
  id: string;
  name: string;
  email: string;
  role: 'ADMIN' | 'COSTUREIRA';
  thirdPartyId?: string | null;
  company: {
    id: string;
    name: string;
    tradeName?: string | null;
    cnpj?: string | null;
  };
}

export interface ThirdParty {
  id: string;
  name: string;
  cpfCnpj?: string | null;
  phone?: string | null;
  whatsapp: string;
  email?: string | null;
  city?: string | null;
  state?: string | null;
  address?: string | null;
  pixKey?: string | null;
  pixType?: string | null;
  bankInfo?: string | null;
  notes?: string | null;
  status: string;
  hasLogin?: boolean;
  userEmail?: string | null;
  metrics?: {
    openOrders: number;
    inProductionOrders: number;
    delayedOrders: number;
    totalPiecesProduced: number;
    totalToPay: number;
    totalPaid: number;
  };
}

export interface Product {
  id: string;
  name: string;
  sku?: string | null;
  category?: string | null;
  description?: string | null;
  defaultUnitPrice: number;
  active: boolean;
}

export interface ServiceOrderItem {
  id: string;
  productId?: string | null;
  productName: string;
  description?: string | null;
  quantityRequested: number;
  unitPrice: number;
  totalPrice: number;
  quantityProduced: number;
  quantityDelivered: number;
  quantityApproved: number;
  quantityRejected: number;
  rejectionReason?: string | null;
  productionRecords?: ProductionRecord[];
}

export interface ProductionRecord {
  id: string;
  quantity: number;
  notes?: string | null;
  createdAt: string;
}

export interface PaymentSummary {
  id: string;
  status: string;
  expectedAmount: number;
  calculatedAmount: number;
  paidAmount: number;
  remainingAmount: number;
  paymentMethod?: string | null;
  paidAt?: string | null;
}

export interface ServiceOrderListItem {
  id: string;
  orderNumber: number;
  formattedNumber: string;
  status: string;
  isDelayed: boolean;
  pricingModel: string;
  fixedPriceAmount?: number | null;
  totalPieces: number;
  totalAmount: number;
  dueDate: string;
  sentAt?: string | null;
  version: number;
  notes?: string | null;
  createdAt: string;
  situationLabel?: string;
  thirdParty: {
    id: string;
    name: string;
    phone?: string | null;
    whatsapp: string;
    city?: string | null;
  };
  activeToken?: string | null;
  payment?: PaymentSummary | null;
  metrics: {
    totalProduced: number;
    totalDelivered: number;
    totalApproved: number;
    totalRejected: number;
    progressProduction: number;
    progressDelivery: number;
  };
}

export interface PaymentDetail extends Payment {
  serviceOrder: ServiceOrderDetail;
}

export interface ServiceOrderDetail extends ServiceOrderListItem {
  thirdParty: ThirdParty;
  createdByUser: { id: string; name: string; email: string };
  items: ServiceOrderItem[];
  deliveries: Delivery[];
  payments: Payment[];
  acceptanceRecords: AcceptanceRecord[];
  statusHistory: StatusHistory[];
  acceptedAt?: string | null;
  acceptedIp?: string | null;
  acceptanceType?: string | null;
}

export interface Delivery {
  id: string;
  deliveryNumber: number;
  deliveryDate: string;
  status: string;
  notes?: string | null;
  receiptPhotoUrl?: string | null;
  conferencedAt?: string | null;
  conferencedBy?: string | null;
  items: DeliveryItem[];
}

export interface DeliveryItem {
  id: string;
  serviceOrderItemId: string;
  quantityDelivered: number;
  quantityApproved: number;
  quantityRejected: number;
  rejectionReason?: string | null;
  serviceOrderItem?: ServiceOrderItem;
}

export interface Payment {
  id: string;
  expectedAmount: number;
  calculatedAmount: number;
  paidAmount: number;
  remainingAmount: number;
  status: string;
  paymentMethod?: string | null;
  paidAt?: string | null;
  receiptUrl?: string | null;
  notes?: string | null;
  createdAt: string;
  thirdParty: {
    id: string;
    name: string;
    pixKey?: string | null;
    pixType?: string | null;
    phone?: string | null;
  };
  serviceOrder: {
    id: string;
    orderNumber: number;
    totalPieces: number;
    status: string;
  };
}

export interface AcceptanceRecord {
  id: string;
  version: number;
  action: string;
  rejectionReason?: string | null;
  acceptedTerms: string;
  ipAddress?: string | null;
  timestamp: string;
}

export interface StatusHistory {
  id: string;
  fromStatus: string;
  toStatus: string;
  reason?: string | null;
  changedBy?: string | null;
  createdAt: string;
}

export interface AdminDashboard {
  role: 'ADMIN';
  kpis: {
    activeSeamstresses: number;
    openOrders: number;
    awaitingAcceptance: number;
    inProductionOrders: number;
    delayedOrders: number;
    deliveredOrders: number;
    finishedOrders: number;
    piecesInProduction: number;
    piecesDelivered: number;
    totalPiecesGlobal: number;
    totalToPay: number;
    totalPaid: number;
    totalPending: number;
  };
  charts: {
    seamstressProduction: { name: string; pieces: number }[];
    ordersByStatus: { status: string; count: number }[];
  };
}

export interface SeamstressDashboard {
  role: 'COSTUREIRA';
  cards: {
    awaitingAcceptance: number;
    accepted: number;
    inProduction: number;
    delayed: number;
    completed: number;
    totalPieces: number;
    totalProduced: number;
    totalDelivered: number;
    totalToReceive: number;
    totalReceived: number;
  };
}

export interface AuditLog {
  id: string;
  action: string;
  entity: string;
  entityId?: string | null;
  oldValues?: string | null;
  newValues?: string | null;
  ipAddress?: string | null;
  createdAt: string;
  user?: { id: string; name: string; email: string; role: string } | null;
}

export interface PublicAcceptanceData {
  token: string;
  expiresAt: string;
  alreadyAccepted: boolean;
  currentStatus: string;
  order: {
    id: string;
    orderNumber: number;
    formattedNumber: string;
    companyName: string;
    companyPhone?: string | null;
    seamstressName: string;
    dueDate: string;
    pricingModel: string;
    totalPieces: number;
    totalAmount: number;
    notes?: string | null;
    version: number;
    items: {
      productName: string;
      description?: string | null;
      quantity: number;
      unitPrice: number;
      totalPrice: number;
    }[];
  };
}
