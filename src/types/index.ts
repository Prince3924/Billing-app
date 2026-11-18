export interface LogoDesign {
  backgroundColor: string; // e.g. "#ea580c"
  icon: string;            // e.g. "bolt", "bulb", "store", "phone", "cart", "shirt", "initials"
  text: string;            // e.g. "S" or "YK"
  shape: 'circle' | 'square' | 'rounded' | 'badge';
  subtitle?: string;
}

export type PaymentMode = 'Cash' | 'UPI' | 'Udhar';

export interface Product {
  id: string;
  name: string;
  barcode: string;
  company: string;       // e.g., Company / Brand name
  vendor: string;        // Supplier / Distributor name
  category: string;      // Category name
  purchasePrice: number; // Kharid daam (₹)
  sellPrice: number;     // Bechne ka daam (₹)
  mrp?: number | null;   // Optional MRP (₹)
  stockQuantity: number; // Current stock left
  lowStockLimit: number; // Alert limit (e.g. 5)
  unit: string;          // Pcs, Roll, Box, Meter, Packet, KG, Gram
  photoUrl?: string;     // Image URL or base64
  expiryDate?: string;   // YYYY-MM-DD
  createdAt: string;
  updatedAt: string;
}

export interface BillItem {
  productId: string;
  productName: string;
  company: string;
  category: string;
  purchasePrice: number;
  sellPrice: number;
  quantity: number;
  unit: string;
  total: number;
  isCustomItem?: boolean;
}

export interface Bill {
  id: string;
  billNumber: string;    // e.g. YK-2026-0001
  date: string;          // ISO String
  customerName?: string;
  customerMobile?: string;
  items: BillItem[];
  subtotal: number;
  discount: number;
  grandTotal: number;
  paymentMode: PaymentMode;
  totalPurchaseCost: number;
  totalProfit: number;
  notes?: string;
  isSettled?: boolean;
  remindTomorrow?: boolean;
  remindTomorrowDate?: string;
  isEstimate?: boolean;  // True for Quotation / Estimate bills
  isConverted?: boolean; // True once estimate has been converted to final bill
  convertedToBillId?: string;
  convertedFromEstimateId?: string;
  sourceOrderId?: string;
}

export interface StockRefill {
  id: string;
  productId: string;
  productName: string;
  addedQty: number;
  newPurchasePrice?: number;
  vendor?: string;
  date: string;
  note?: string;
}

export interface SupplierPurchase {
  id: string;
  date: string;
  description: string;
  totalAmount: number;
  paidAmount: number;
  remainingAmount: number;
}

export interface SupplierPayment {
  id: string;
  date: string;
  amount: number;
  paymentMode: 'Cash' | 'UPI' | 'Bank';
  notes?: string;
}

export interface Supplier {
  id: string;
  name: string;
  mobile: string;
  shopFirmName?: string;
  purchases: SupplierPurchase[];
  payments: SupplierPayment[];
  createdAt: string;
}

export interface CustomerOrder {
  id: string;
  orderNumber: string;
  date: string;
  customerName: string;
  customerMobile: string;
  items: {
    productId?: string;
    productName: string;
    quantity: number;
    unit: string;
    rate: number;
    total: number;
  }[];
  grandTotal: number;
  status: 'New' | 'Accepted' | 'Ready' | 'Delivered' | 'Cancelled' | 'Billed';
  shopId?: string;
}

export interface BillingDraft {
  mode: 'order' | 'estimate' | 'edit-bill';
  sourceOrderId?: string;
  sourceOrderNumber?: string;
  sourceEstimateId?: string;
  sourceEstimateNumber?: string;
  sourceBillId?: string;
  sourceBillNumber?: string;
  isEstimate?: boolean;
  customerName?: string;
  customerMobile?: string;
  items: BillItem[];
  discount?: number;
  notes?: string;
  paymentMode?: PaymentMode;
}

export interface DayClosingRecord {
  id: string;
  date: string; // YYYY-MM-DD
  closedAt: string; // ISO
  totalSale: number;
  cashSale: number;
  upiSale: number;
  udharSale: number;
  totalExpense: number;
  totalProfit: number;
  customerCount: number;
  udharRecovered: number;
  notes?: string;
}

export type BillYearFormat = 'full' | 'short' | 'fy' | 'none';

export interface BillNumberConfig {
  prefix: string;          // e.g. "YK", "BILL", "INV" or ""
  yearFormat: BillYearFormat; // 'full' (2026), 'short' (26), 'fy' (2026-27), 'none'
  startingNumber: number;  // e.g. 1, 101, 1001
  digitLength: number;     // e.g. 1, 2, 3, 4 (padded to 001, 0001)
}

export interface UdharReminderTemplates {
  english?: string;
  hindi?: string;
  hinglish?: string;
}

export interface BillFooterTemplates {
  english?: string;
  hindi?: string;
  hinglish?: string;
}

export type OrderMessageType = 'text' | 'image' | 'both';

export interface OrderMessageSettings {
  messageType: OrderMessageType; // Default: 'both'
  messageLanguage: Language;     // Default: app language
  showLogo: boolean;             // Default: true
  showMobile: boolean;           // Default: true
}

export interface ShopInfo {
  id?: string; // Unique Shop ID (e.g. sharma-general-store-1234, yk-electrical-5678)
  name: string;
  address: string;
  mobile: string;
  alternateMobile?: string;
  tagline?: string;
  gstin?: string;
  // UPI & Bank Details
  upiId?: string;
  payeeName?: string;
  showUpiQrOnBill?: boolean;
  bankName?: string;
  accountNumber?: string;
  ifscCode?: string;
  // Udhar Custom Reminder Templates
  udharTemplates?: UdharReminderTemplates;
  // Custom Bill Footer / Thank You Templates
  billFooterTemplates?: BillFooterTemplates;
  // Business Logo
  logoUrl?: string; // For uploaded photo (base64)
  logoDesign?: LogoDesign; // For offline smart generated logo design
  showLogoOnBill?: boolean;
  // Order Message Settings (Customer WhatsApp / Image)
  orderMessageSettings?: OrderMessageSettings;
  // Custom Bill Number Format & Sequence Tracking
  billNumberConfig?: BillNumberConfig;
  billSequenceTracker?: Record<string, number>;
}

export type ActiveTab = 
  | 'dashboard' 
  | 'billing' 
  | 'products' 
  | 'low-stock' 
  | 'history' 
  | 'profit-report'
  | 'supplier-khata'
  | 'rate-list-qr';

export type Language = 'hinglish' | 'hindi' | 'english';
