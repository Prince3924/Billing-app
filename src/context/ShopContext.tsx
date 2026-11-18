import React, { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from 'react';
import {
  Product,
  Bill,
  ShopInfo,
  ActiveTab,
  Language,
  Supplier,
  SupplierPurchase,
  SupplierPayment,
  CustomerOrder,
  DayClosingRecord,
  BillingDraft,
} from '../types';
import { INITIAL_PRODUCTS, INITIAL_BILLS, INITIAL_SHOP_INFO } from '../data/initialData';
import { en, t as translateKey, normalizeLang } from '../locales/translations.js';
export type TranslationKey = keyof typeof en;
import { saveToIndexedDb, getFromIndexedDb, clearAllOfflineData } from '../utils/offlineDb';
import { getNextBillNumber } from '../utils/billNumber';

interface DashboardStats {
  totalSale: number;
  totalProfit: number;
  totalItems: number;
  billCount: number;
}

export type RateListSubTab = 'qr-poster' | 'customer-preview' | 'orders';

interface ShopContextType {
  shopInfo: ShopInfo;
  updateShopInfo: (info: ShopInfo) => void;
  products: Product[];
  bills: Bill[];
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  rateListSubTab: RateListSubTab;
  setRateListSubTab: (sub: RateListSubTab) => void;
  lowStockProducts: Product[];

  // Language & i18n
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: TranslationKey, vars?: Record<string, string | number>) => string;

  // Dark Mode Theme
  darkMode: boolean;
  setDarkMode: (val: boolean) => void;

  // Setup & App Reset
  isSetupComplete: boolean;
  setIsSetupComplete: (val: boolean) => void;
  fullAppReset: () => Promise<void>;
  completeSetup: (newShopInfo?: Partial<ShopInfo>, loadDemoProducts?: boolean) => void;

  // Product actions
  addProduct: (product: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>) => Product;
  updateProduct: (id: string, updates: Partial<Product>) => void;
  deleteProduct: (id: string) => void;
  refillStock: (productId: string, quantityToAdd: number, newPurchasePrice?: number, note?: string) => void;

  // Billing actions & Edit-before-save Drafts
  createBill: (billData: Omit<Bill, 'id' | 'billNumber' | 'date'>) => Bill;
  saveEditedBill: (billId: string, updatedData: Omit<Bill, 'id' | 'billNumber' | 'date'>) => Bill | null;
  cancelBill: (billId: string) => void;
  updateBill: (billId: string, updates: Partial<Bill>) => void;
  convertEstimateToFinal: (estimateBillId: string) => Bill | null;
  billingDraft: BillingDraft | null;
  openBillEditorFromOrder: (order: CustomerOrder) => void;
  openBillEditorFromEstimate: (estimateBill: Bill) => void;
  openBillEditorForEdit: (bill: Bill) => void;
  clearBillingDraft: () => void;

  // Supplier Ledger actions
  suppliers: Supplier[];
  addSupplier: (name: string, mobile: string, shopFirmName?: string) => Supplier;
  deleteSupplier: (supplierId: string) => void;
  addSupplierPurchase: (supplierId: string, purchaseData: { description: string; totalAmount: number; paidAmount: number }) => void;
  paySupplier: (supplierId: string, paymentData: { amount: number; paymentMode: 'Cash' | 'UPI' | 'Bank'; notes?: string }) => void;

  // Customer Orders actions
  customerOrders: CustomerOrder[];
  newOrdersCount: number;
  addCustomerOrder: (orderData: Omit<CustomerOrder, 'id' | 'orderNumber' | 'date'>) => CustomerOrder;
  registerLocalCustomerOrder: (order: CustomerOrder) => void;
  updateOrderStatus: (orderId: string, status: CustomerOrder['status']) => void;
  refreshCloudOrders: () => Promise<void>;

  // Day Closing actions
  dayClosingRecords: DayClosingRecord[];
  saveDayClosing: (recordData: Omit<DayClosingRecord, 'id' | 'closedAt'>) => DayClosingRecord;

  // Stats
  todayStats: DashboardStats;
  yesterdayStats: DashboardStats;
  last7DaysStats: { totalSale: number; totalProfit: number; billCount: number };
  thisMonthStats: { totalSale: number; totalProfit: number; billCount: number };
  totalStockValue: { purchaseValue: number; retailValue: number; totalQuantity: number };

  // Filter helpers
  getBillsForDate: (dateStr: string) => Bill[];

  // Backup / restore
  exportBackup: () => void;
  importBackup: (jsonString: string) => boolean;
  resetToDefault: () => void;

  // Owner Code multi-shop isolation
  activeShopId: string | null;
  loginWithOwnerCode: (ownerCode: string, rememberMe?: boolean) => Promise<{ ok: boolean; error?: string }>;
  logoutOwner: () => void;

  // Search & Navigation helpers
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  selectedCategory: string;
  setSelectedCategory: (cat: string) => void;
  selectedCompany: string;
  setSelectedCompany: (comp: string) => void;
  selectedVendor: string;
  setSelectedVendor: (ven: string) => void;
}

const ShopContext = createContext<ShopContextType | undefined>(undefined);

const STORAGE_KEYS = {
  SHOP_INFO: 'yk_electrical_shop_info_v1',
  PRODUCTS: 'yk_electrical_products_v1',
  BILLS: 'yk_electrical_bills_v1',
  REFILLS: 'yk_electrical_refills_v1',
  SUPPLIERS: 'yk_electrical_suppliers_v1',
  ORDERS: 'yk_electrical_orders_v1',
  DAY_CLOSING: 'yk_electrical_day_closing_v1',
  LANG: 'yk_electrical_lang_v1',
  SETUP_DONE: 'yk_electrical_setup_done_v1',
};

const ACTIVE_SHOP_KEY = 'yk_active_owner_shop_id_v1';
const EXPLICIT_LOGOUT_KEY = 'yk_owner_explicit_logout_v1';
const REGISTERED_SHOPS_KEY = 'yk_registered_shops_v1';
const LEGACY_YK_SHOP_ID = 'y-k-electricals-8742';

function getShopStorageKeys(shopId: string) {
  const clean = (shopId || 'default').trim().toLowerCase();
  const prefix = `yk_shop_${clean}`;
  return {
    SHOP_INFO: `${prefix}_shop_info_v1`,
    PRODUCTS: `${prefix}_products_v1`,
    BILLS: `${prefix}_bills_v1`,
    SUPPLIERS: `${prefix}_suppliers_v1`,
    ORDERS: `${prefix}_orders_v1`,
    DAY_CLOSING: `${prefix}_day_closing_v1`,
    SETUP_DONE: `${prefix}_setup_done_v1`,
  };
}

function detectExistingDeviceShopId(): string | null {
  try {
    // 1. Check if any shop-scoped data already exists on this device
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key) continue;
      const match = key.match(/^yk_shop_(.+)_(shop_info|products|bills|suppliers|orders|day_closing)_v1$/);
      if (match && match[1]) {
        const candidateId = match[1].trim().toLowerCase();
        if (candidateId) return candidateId;
      }
    }

    // 2. Check if legacy pre-update Owner App data exists on this device
    const hasLegacyData =
      localStorage.getItem(STORAGE_KEYS.SHOP_INFO) !== null ||
      localStorage.getItem(STORAGE_KEYS.PRODUCTS) !== null ||
      localStorage.getItem(STORAGE_KEYS.BILLS) !== null ||
      localStorage.getItem(STORAGE_KEYS.SUPPLIERS) !== null ||
      localStorage.getItem(STORAGE_KEYS.ORDERS) !== null ||
      localStorage.getItem(STORAGE_KEYS.SETUP_DONE) === 'true';

    if (hasLegacyData) {
      try {
        const rawInfo = localStorage.getItem(STORAGE_KEYS.SHOP_INFO);
        if (rawInfo) {
          const parsed = JSON.parse(rawInfo);
          if (parsed?.id && typeof parsed.id === 'string' && parsed.id.trim()) {
            return parsed.id.trim().toLowerCase();
          }
        }
      } catch {
        // fallback to legacy Y.K. shop ID
      }
      return LEGACY_YK_SHOP_ID;
    }
  } catch {
    // ignore storage errors
  }
  return null;
}

function readActiveShopId(): string | null {
  try {
    const persisted = localStorage.getItem(ACTIVE_SHOP_KEY);
    if (persisted && persisted.trim()) {
      return persisted.trim().toLowerCase();
    }
    const sessionVal = sessionStorage.getItem(ACTIVE_SHOP_KEY);
    if (sessionVal && sessionVal.trim()) {
      return sessionVal.trim().toLowerCase();
    }
    // Auto-login existing shops on this device unless user explicitly logged out
    if (localStorage.getItem(EXPLICIT_LOGOUT_KEY) !== 'true') {
      const detected = detectExistingDeviceShopId();
      if (detected) {
        localStorage.setItem(ACTIVE_SHOP_KEY, detected);
        return detected;
      }
    }
    return null;
  } catch {
    return null;
  }
}

const MIGRATION_BACK_FLAG = 'yk_auth_migrated_back_v1';

function readJsonStorage<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

/**
 * Safely recover any data written under owner-scoped keys (yk_owner_<mobile>_*)
 * back into standard STORAGE_KEYS.* so no bills, stock, customers, or ledgers are lost.
 */
function recoverOwnerDataToStandardKeys(): void {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return;
    if (localStorage.getItem(MIGRATION_BACK_FLAG) === '1') return;

    let ownerMobile: string | null = null;
    const savedSession = readJsonStorage<{ ownerMobile?: string } | null>('yk_auth_session_v1', null);
    if (savedSession?.ownerMobile) {
      ownerMobile = savedSession.ownerMobile;
    } else {
      const savedOwners = readJsonStorage<Array<{ mobile?: string }>>('yk_auth_owners_v1', []);
      if (Array.isArray(savedOwners) && savedOwners[0]?.mobile) {
        ownerMobile = savedOwners[0].mobile;
      }
    }

    if (!ownerMobile) {
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        const match = k?.match(/^yk_owner_(\d{10})_/);
        if (match && match[1]) {
          ownerMobile = match[1];
          break;
        }
      }
    }

    if (ownerMobile) {
      const prefix = `yk_owner_${ownerMobile}`;
      const pairs: Array<[string, string, boolean]> = [
        [`${prefix}_shop_info_v1`, STORAGE_KEYS.SHOP_INFO, false],
        [`${prefix}_products_v1`, STORAGE_KEYS.PRODUCTS, true],
        [`${prefix}_bills_v1`, STORAGE_KEYS.BILLS, true],
        [`${prefix}_suppliers_v1`, STORAGE_KEYS.SUPPLIERS, true],
        [`${prefix}_orders_v1`, STORAGE_KEYS.ORDERS, true],
        [`${prefix}_day_closing_v1`, STORAGE_KEYS.DAY_CLOSING, true],
        [`${prefix}_setup_done_v1`, STORAGE_KEYS.SETUP_DONE, false],
      ];

      for (const [srcKey, destKey, isArrayData] of pairs) {
        const srcRaw = localStorage.getItem(srcKey);
        if (srcRaw === null) continue;
        if (isArrayData) {
          const existingDest = readJsonStorage<unknown[] | null>(destKey, null);
          const parsedSrc = readJsonStorage<unknown[] | null>(srcKey, null);
          if (
            Array.isArray(parsedSrc) &&
            parsedSrc.length === 0 &&
            Array.isArray(existingDest) &&
            existingDest.length > 0
          ) {
            continue;
          }
        }
        localStorage.setItem(destKey, srcRaw);
      }
    }

    localStorage.removeItem('yk_auth_session_v1');
    localStorage.removeItem('yk_auth_owners_v1');
    localStorage.setItem(MIGRATION_BACK_FLAG, '1');
  } catch (e) {
    console.warn('Data recovery check skipped:', e);
  }
}

recoverOwnerDataToStandardKeys();

export function generateShopId(name: string): string {
  const clean =
    (name || 'shop')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 24) || 'shop';
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `${clean}-${rand}`;
}

function roundMoney(n: number): number {
  return Math.round((Number(n) || 0) * 100) / 100;
}

function roundStockQty(n: number): number {
  return Math.round(Math.max(0, Number(n) || 0) * 1000) / 1000;
}

function ensureShopInfoDefaults(info: ShopInfo, fallbackLang: Language): ShopInfo {
  const updated: ShopInfo = { ...info };
  if (!updated.id) {
    updated.id = generateShopId(updated.name || 'shop');
  }
  if (!updated.orderMessageSettings) {
    updated.orderMessageSettings = {
      messageType: 'both',
      messageLanguage: fallbackLang,
      showLogo: true,
      showMobile: true,
    };
  } else {
    updated.orderMessageSettings = {
      messageType: updated.orderMessageSettings.messageType || 'both',
      messageLanguage: updated.orderMessageSettings.messageLanguage
        ? normalizeLang(updated.orderMessageSettings.messageLanguage)
        : fallbackLang,
      showLogo: updated.orderMessageSettings.showLogo !== false,
      showMobile: updated.orderMessageSettings.showMobile !== false,
    };
  }
  return updated;
}

export const ShopProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Language state
  const [language, setLanguageState] = useState<Language>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.LANG);
      return normalizeLang(saved || 'english');
    } catch {
      return 'english';
    }
  });

  const setLanguage = (newLang: Language) => {
    const normalized = normalizeLang(newLang);
    setLanguageState(normalized);
    try {
      localStorage.setItem(STORAGE_KEYS.LANG, normalized);
    } catch (e) {
      console.error('Failed to save language preference', e);
    }
  };

  const t = useCallback(
    (key: TranslationKey, vars?: Record<string, string | number>): string => {
      return translateKey(key, language, vars);
    },
    [language]
  );

  // Active Shop ID (persisted for Offline Owner App)
  const [activeShopId, setActiveShopId] = useState<string | null>(() => readActiveShopId());
  const loadedShopRef = useRef<string | null>(activeShopId);

  const loadShopDataset = useCallback(
    (
      shopId: string,
      serverSeed?: { shopInfo?: Partial<ShopInfo>; products?: Product[] }
    ) => {
      const sKeys = getShopStorageKeys(shopId);
      const hasLocalShop = localStorage.getItem(sKeys.SHOP_INFO) !== null;
      const hasLocalProducts = localStorage.getItem(sKeys.PRODUCTS) !== null;

      // One-time legacy migration ONLY for existing Y.K. shop if its scoped keys don't exist yet
      if (shopId === LEGACY_YK_SHOP_ID && !hasLocalShop && !hasLocalProducts) {
        const legacyShop = readJsonStorage<ShopInfo | null>(STORAGE_KEYS.SHOP_INFO, null);
        const legacyProducts = readJsonStorage<Product[] | null>(STORAGE_KEYS.PRODUCTS, null);
        const legacyBills = readJsonStorage<Bill[] | null>(STORAGE_KEYS.BILLS, null);
        const legacySuppliers = readJsonStorage<Supplier[]>(STORAGE_KEYS.SUPPLIERS, []);
        const legacyOrders = readJsonStorage<CustomerOrder[]>(STORAGE_KEYS.ORDERS, []);
        const legacyClosing = readJsonStorage<DayClosingRecord[]>(STORAGE_KEYS.DAY_CLOSING, []);

        if (legacyShop || (Array.isArray(legacyProducts) && legacyProducts.length > 0)) {
          const migratedShop = ensureShopInfoDefaults(
            { ...(legacyShop || INITIAL_SHOP_INFO), id: shopId },
            language
          );
          const migratedProducts = Array.isArray(legacyProducts) ? legacyProducts : [];
          const migratedBills = Array.isArray(legacyBills) ? legacyBills : [];
          try {
            localStorage.setItem(sKeys.SHOP_INFO, JSON.stringify(migratedShop));
            localStorage.setItem(sKeys.PRODUCTS, JSON.stringify(migratedProducts));
            localStorage.setItem(sKeys.BILLS, JSON.stringify(migratedBills));
            localStorage.setItem(sKeys.SUPPLIERS, JSON.stringify(Array.isArray(legacySuppliers) ? legacySuppliers : []));
            localStorage.setItem(sKeys.ORDERS, JSON.stringify(Array.isArray(legacyOrders) ? legacyOrders : []));
            localStorage.setItem(sKeys.DAY_CLOSING, JSON.stringify(Array.isArray(legacyClosing) ? legacyClosing : []));
          } catch {
            // ignore
          }
          return {
            shopInfo: migratedShop,
            products: migratedProducts,
            bills: migratedBills,
            suppliers: Array.isArray(legacySuppliers) ? legacySuppliers : [],
            customerOrders: Array.isArray(legacyOrders) ? legacyOrders : [],
            dayClosingRecords: Array.isArray(legacyClosing) ? legacyClosing : [],
            isSetupComplete: true,
          };
        }
      }

      const savedShop = readJsonStorage<ShopInfo | null>(sKeys.SHOP_INFO, null);
      const loadedShop = ensureShopInfoDefaults(
        savedShop
          ? { ...savedShop, id: shopId }
          : {
              ...INITIAL_SHOP_INFO,
              name: serverSeed?.shopInfo?.name || (shopId === LEGACY_YK_SHOP_ID ? 'Y.K. Electricals' : shopId),
              address: serverSeed?.shopInfo?.address || '',
              mobile: serverSeed?.shopInfo?.mobile || '',
              tagline: serverSeed?.shopInfo?.tagline || '',
              gstin: serverSeed?.shopInfo?.gstin || '',
              ...(serverSeed?.shopInfo || {}),
              id: shopId,
            },
        language
      );

      const savedProducts = readJsonStorage<Product[] | null>(sKeys.PRODUCTS, null);
      const loadedProducts =
        savedProducts !== null && Array.isArray(savedProducts)
          ? savedProducts
          : Array.isArray(serverSeed?.products)
          ? serverSeed.products
          : [];

      const savedBills = readJsonStorage<Bill[] | null>(sKeys.BILLS, null);
      const loadedBills = savedBills !== null && Array.isArray(savedBills) ? savedBills : [];
      const loadedSuppliers = readJsonStorage<Supplier[]>(sKeys.SUPPLIERS, []);
      const loadedOrders = readJsonStorage<CustomerOrder[]>(sKeys.ORDERS, []);
      const loadedClosing = readJsonStorage<DayClosingRecord[]>(sKeys.DAY_CLOSING, []);
      let loadedSetup = true;
      try {
        if (localStorage.getItem(sKeys.SETUP_DONE) === 'false') loadedSetup = false;
      } catch {
        // ignore
      }

      return {
        shopInfo: loadedShop,
        products: loadedProducts,
        bills: loadedBills,
        suppliers: Array.isArray(loadedSuppliers) ? loadedSuppliers : [],
        customerOrders: Array.isArray(loadedOrders) ? loadedOrders : [],
        dayClosingRecords: Array.isArray(loadedClosing) ? loadedClosing : [],
        isSetupComplete: loadedSetup,
      };
    },
    [language]
  );

  // Setup completion state
  const [isSetupComplete, setIsSetupComplete] = useState<boolean>(() => {
    if (!activeShopId) return true;
    try {
      const sKeys = getShopStorageKeys(activeShopId);
      const val = localStorage.getItem(sKeys.SETUP_DONE);
      if (val === 'false') return false;
      return true;
    } catch {
      return true;
    }
  });

  // Shop Info
  const [shopInfo, setShopInfo] = useState<ShopInfo>(() => {
    if (activeShopId) {
      const sKeys = getShopStorageKeys(activeShopId);
      const saved = readJsonStorage<ShopInfo | null>(sKeys.SHOP_INFO, null);
      if (saved) return ensureShopInfoDefaults({ ...saved, id: activeShopId }, language);
      return ensureShopInfoDefaults({ ...INITIAL_SHOP_INFO, id: activeShopId }, language);
    }
    return ensureShopInfoDefaults({ ...INITIAL_SHOP_INFO }, language);
  });

  const [products, setProducts] = useState<Product[]>(() => {
    if (activeShopId) {
      const sKeys = getShopStorageKeys(activeShopId);
      const saved = readJsonStorage<Product[] | null>(sKeys.PRODUCTS, null);
      if (saved !== null && Array.isArray(saved)) return saved;
    }
    return [];
  });

  const [bills, setBills] = useState<Bill[]>(() => {
    if (activeShopId) {
      const sKeys = getShopStorageKeys(activeShopId);
      const saved = readJsonStorage<Bill[] | null>(sKeys.BILLS, null);
      if (saved !== null && Array.isArray(saved)) return saved;
    }
    return [];
  });

  const [suppliers, setSuppliers] = useState<Supplier[]>(() => {
    if (activeShopId) {
      const sKeys = getShopStorageKeys(activeShopId);
      const saved = readJsonStorage<Supplier[]>(sKeys.SUPPLIERS, []);
      return Array.isArray(saved) ? saved : [];
    }
    return [];
  });

  const [customerOrders, setCustomerOrders] = useState<CustomerOrder[]>(() => {
    if (activeShopId) {
      const sKeys = getShopStorageKeys(activeShopId);
      const saved = readJsonStorage<CustomerOrder[]>(sKeys.ORDERS, []);
      return Array.isArray(saved) ? saved : [];
    }
    return [];
  });

  const [dayClosingRecords, setDayClosingRecords] = useState<DayClosingRecord[]>(() => {
    if (activeShopId) {
      const sKeys = getShopStorageKeys(activeShopId);
      const saved = readJsonStorage<DayClosingRecord[]>(sKeys.DAY_CLOSING, []);
      return Array.isArray(saved) ? saved : [];
    }
    return [];
  });

  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [rateListSubTab, setRateListSubTab] = useState<RateListSubTab>('qr-poster');
  const [billingDraft, setBillingDraft] = useState<BillingDraft | null>(null);

  // Owner Code Login (Accepts SHOP_ID-955 or SHOP_ID, case-insensitive, trims spaces)
  const loginWithOwnerCode = async (
    rawOwnerCode: string,
    rememberMe = true
  ): Promise<{ ok: boolean; error?: string }> => {
    const cleanInput = (rawOwnerCode || '').trim().toLowerCase().replace(/\s+/g, '');
    if (!cleanInput) {
      return { ok: false, error: 'Wrong Code' };
    }

    const shopId = cleanInput.endsWith('-955') && cleanInput.length > 4
      ? cleanInput.slice(0, -4)
      : cleanInput;

    if (!shopId) {
      return { ok: false, error: 'Wrong Code' };
    }

    const normalizedOwnerCode = `${shopId}-955`;
    let serverSeed: { shopInfo?: Partial<ShopInfo>; products?: Product[] } | undefined;
    let verified = false;
    let serverRejected = false;

    try {
      const res = await fetch('/api/shops/verify-owner', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ownerCode: normalizedOwnerCode }),
      });
      const contentType = res.headers.get('content-type') || '';
      if (res.ok && contentType.includes('application/json')) {
        const data = await res.json();
        if (data?.valid && data?.shopId) {
          verified = true;
          serverSeed = {
            shopInfo: data.shopInfo,
            products: Array.isArray(data.products) ? data.products : undefined,
          };
        }
      } else if (res.status === 401 && contentType.includes('application/json')) {
        serverRejected = true;
      }
    } catch {
      // Network/offline error — fall through to local verification
    }

    // Local / offline / legacy shop verification fallback
    if (!verified) {
      const sKeys = getShopStorageKeys(shopId);
      const hasLocal =
        localStorage.getItem(sKeys.SHOP_INFO) !== null ||
        localStorage.getItem(sKeys.PRODUCTS) !== null ||
        localStorage.getItem(sKeys.BILLS) !== null;
      const localRegistry = readJsonStorage<Array<{ shopId?: string; name?: string; mobile?: string; address?: string }>>(
        REGISTERED_SHOPS_KEY,
        []
      );
      const regMatch = localRegistry.find((s) => (s.shopId || '').trim().toLowerCase() === shopId);
      if (shopId === LEGACY_YK_SHOP_ID || hasLocal || regMatch) {
        verified = true;
        if (regMatch) {
          serverSeed = {
            shopInfo: {
              id: shopId,
              name: regMatch.name || shopId,
              mobile: regMatch.mobile || '',
              address: regMatch.address || '',
            },
          };
        }
      } else if (serverRejected) {
        return { ok: false, error: 'Wrong Code' };
      }
    }

    if (!verified) {
      return { ok: false, error: 'Wrong Code' };
    }

    const dataset = loadShopDataset(shopId, serverSeed);
    const sKeys = getShopStorageKeys(shopId);
    try {
      localStorage.removeItem(EXPLICIT_LOGOUT_KEY);
      if (rememberMe) {
        localStorage.setItem(ACTIVE_SHOP_KEY, shopId);
        sessionStorage.removeItem(ACTIVE_SHOP_KEY);
      } else {
        sessionStorage.setItem(ACTIVE_SHOP_KEY, shopId);
        localStorage.removeItem(ACTIVE_SHOP_KEY);
      }
      localStorage.setItem(sKeys.SHOP_INFO, JSON.stringify(dataset.shopInfo));
      localStorage.setItem(sKeys.PRODUCTS, JSON.stringify(dataset.products));
      localStorage.setItem(sKeys.BILLS, JSON.stringify(dataset.bills));
      localStorage.setItem(sKeys.SUPPLIERS, JSON.stringify(dataset.suppliers));
      localStorage.setItem(sKeys.ORDERS, JSON.stringify(dataset.customerOrders));
      localStorage.setItem(sKeys.DAY_CLOSING, JSON.stringify(dataset.dayClosingRecords));
    } catch {
      // ignore
    }

    loadedShopRef.current = shopId;
    setShopInfo(dataset.shopInfo);
    setProducts(dataset.products);
    setBills(dataset.bills);
    setSuppliers(dataset.suppliers);
    setCustomerOrders(dataset.customerOrders);
    setDayClosingRecords(dataset.dayClosingRecords);
    setBillingDraft(null);
    setIsSetupComplete(dataset.isSetupComplete);
    setActiveTab('dashboard');
    setRateListSubTab('qr-poster');
    setActiveShopId(shopId);

    return { ok: true };
  };

  const logoutOwner = () => {
    loadedShopRef.current = null;
    try {
      localStorage.removeItem(ACTIVE_SHOP_KEY);
      sessionStorage.removeItem(ACTIVE_SHOP_KEY);
      localStorage.setItem(EXPLICIT_LOGOUT_KEY, 'true');
    } catch {
      // ignore
    }
    setBillingDraft(null);
    setActiveShopId(null);
    setActiveTab('dashboard');
  };

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [selectedCompany, setSelectedCompany] = useState('ALL');
  const [selectedVendor, setSelectedVendor] = useState('ALL');

  // Dark Mode Theme state (persists in localStorage)
  const [darkMode, setDarkModeState] = useState<boolean>(() => {
    try {
      return localStorage.getItem('billing_app_dark_mode') === 'true';
    } catch {
      return false;
    }
  });

  const setDarkMode = (val: boolean) => {
    setDarkModeState(val);
    try {
      localStorage.setItem('billing_app_dark_mode', val ? 'true' : 'false');
    } catch (e) {
      console.error('Failed to save dark mode setting', e);
    }
  };

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  // Dual Sync to Shop-Scoped LocalStorage & IndexedDB (Offline-First persistence)
  useEffect(() => {
    if (!activeShopId || loadedShopRef.current !== activeShopId) return;
    const sKeys = getShopStorageKeys(activeShopId);
    try {
      localStorage.setItem(sKeys.SHOP_INFO, JSON.stringify(shopInfo));
      saveToIndexedDb(`${activeShopId}:shopInfo`, shopInfo);
    } catch (e) {
      console.error('Failed to save shop info', e);
    }
  }, [shopInfo, activeShopId]);

  useEffect(() => {
    if (!activeShopId || loadedShopRef.current !== activeShopId) return;
    const sKeys = getShopStorageKeys(activeShopId);
    try {
      localStorage.setItem(sKeys.PRODUCTS, JSON.stringify(products));
      saveToIndexedDb(`${activeShopId}:products`, products);
    } catch (e) {
      console.error('Failed to save products', e);
    }
  }, [products, activeShopId]);

  useEffect(() => {
    if (!activeShopId || loadedShopRef.current !== activeShopId) return;
    const sKeys = getShopStorageKeys(activeShopId);
    try {
      localStorage.setItem(sKeys.BILLS, JSON.stringify(bills));
      saveToIndexedDb(`${activeShopId}:bills`, bills);
    } catch (e) {
      console.error('Failed to save bills', e);
    }
  }, [bills, activeShopId]);

  useEffect(() => {
    if (!activeShopId || loadedShopRef.current !== activeShopId) return;
    const sKeys = getShopStorageKeys(activeShopId);
    try {
      localStorage.setItem(sKeys.SUPPLIERS, JSON.stringify(suppliers));
      saveToIndexedDb(`${activeShopId}:suppliers`, suppliers);
    } catch (e) {
      console.error('Failed to save suppliers', e);
    }
  }, [suppliers, activeShopId]);

  useEffect(() => {
    if (!activeShopId || loadedShopRef.current !== activeShopId) return;
    const sKeys = getShopStorageKeys(activeShopId);
    try {
      localStorage.setItem(sKeys.ORDERS, JSON.stringify(customerOrders));
      saveToIndexedDb(`${activeShopId}:customerOrders`, customerOrders);
    } catch (e) {
      console.error('Failed to save customer orders', e);
    }
  }, [customerOrders, activeShopId]);

  useEffect(() => {
    if (!activeShopId || loadedShopRef.current !== activeShopId) return;
    const sKeys = getShopStorageKeys(activeShopId);
    try {
      localStorage.setItem(sKeys.DAY_CLOSING, JSON.stringify(dayClosingRecords));
      saveToIndexedDb(`${activeShopId}:dayClosingRecords`, dayClosingRecords);
    } catch (e) {
      console.error('Failed to save day closing records', e);
    }
  }, [dayClosingRecords, activeShopId]);

  // Cloud Catalog Sync for Shop-Specific QR & Public Orders
  useEffect(() => {
    if (!activeShopId || loadedShopRef.current !== activeShopId) return;
    fetch('/api/shops/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        shopId: activeShopId,
        shopInfo: { ...shopInfo, id: activeShopId },
        products,
      }),
    }).catch((err) => {
      console.debug('Cloud shop catalog sync skipped/failed:', err);
    });
  }, [shopInfo, products, activeShopId]);

  // Merge cloud orders cleanly (supports adding new orders AND syncing status changes)
  const mergeCloudOrders = useCallback((cloudList: CustomerOrder[]) => {
    if (!Array.isArray(cloudList) || cloudList.length === 0) return;
    setCustomerOrders((prev) => {
      const byId = new Map<string, CustomerOrder>();
      for (const ord of prev) {
        if (ord && ord.id) byId.set(ord.id, ord);
      }
      let changed = false;
      for (const cOrd of cloudList) {
        if (!cOrd || !cOrd.id) continue;
        const existing = byId.get(cOrd.id);
        if (!existing) {
          byId.set(cOrd.id, cOrd);
          changed = true;
        } else if (existing.status !== cOrd.status) {
          byId.set(cOrd.id, { ...existing, status: cOrd.status });
          changed = true;
        }
      }
      if (!changed) return prev;
      return Array.from(byId.values()).sort((a, b) => {
        const da = new Date(a.date || 0).getTime();
        const db = new Date(b.date || 0).getTime();
        return db - da;
      });
    });
  }, []);

  const refreshCloudOrders = useCallback(async () => {
    if (!activeShopId) return;
    try {
      const res = await fetch(`/api/shops/${encodeURIComponent(activeShopId)}/orders`, {
        cache: 'no-store',
      });
      if (res.ok) {
        const raw = await res.json();
        const cloudOrders: CustomerOrder[] = Array.isArray(raw)
          ? raw
          : Array.isArray(raw?.orders)
          ? raw.orders
          : [];
        mergeCloudOrders(cloudOrders);
      }
    } catch {
      // silent on offline
    }
  }, [activeShopId, mergeCloudOrders]);

  // Periodic polling for incoming customer orders from Cloud
  useEffect(() => {
    if (!activeShopId) return;
    let isMounted = true;
    const poll = async () => {
      if (!isMounted) return;
      await refreshCloudOrders();
    };
    poll();
    const interval = setInterval(poll, 4000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [activeShopId, refreshCloudOrders]);

  // Hydrate shop data from IndexedDB if localStorage keys were cleared
  useEffect(() => {
    if (!activeShopId || loadedShopRef.current !== activeShopId) return;
    const shopId = activeShopId;
    const sKeys = getShopStorageKeys(shopId);
    async function hydrateFromIndexedDb() {
      try {
        const idbProducts = await getFromIndexedDb<Product[]>(`${shopId}:products`);
        if (idbProducts && idbProducts.length > 0 && !localStorage.getItem(sKeys.PRODUCTS)) {
          setProducts(idbProducts);
        }
        const idbBills = await getFromIndexedDb<Bill[]>(`${shopId}:bills`);
        if (idbBills && idbBills.length > 0 && !localStorage.getItem(sKeys.BILLS)) {
          setBills(idbBills);
        }
        const idbShop = await getFromIndexedDb<ShopInfo>(`${shopId}:shopInfo`);
        if (idbShop && !localStorage.getItem(sKeys.SHOP_INFO)) {
          setShopInfo(ensureShopInfoDefaults({ ...idbShop, id: shopId }, language));
        }
        const idbSuppliers = await getFromIndexedDb<Supplier[]>(`${shopId}:suppliers`);
        if (idbSuppliers && idbSuppliers.length > 0 && !localStorage.getItem(sKeys.SUPPLIERS)) {
          setSuppliers(idbSuppliers);
        }
        const idbOrders = await getFromIndexedDb<CustomerOrder[]>(`${shopId}:customerOrders`);
        if (idbOrders && idbOrders.length > 0 && !localStorage.getItem(sKeys.ORDERS)) {
          setCustomerOrders(idbOrders);
        }
        const idbClosing = await getFromIndexedDb<DayClosingRecord[]>(`${shopId}:dayClosingRecords`);
        if (idbClosing && idbClosing.length > 0 && !localStorage.getItem(sKeys.DAY_CLOSING)) {
          setDayClosingRecords(idbClosing);
        }
      } catch (err) {
        console.warn('Hydration error:', err);
      }
    }
    hydrateFromIndexedDb();
  }, [activeShopId, language]);

  // Low stock products & New orders count
  const lowStockProducts = products.filter((p) => p.stockQuantity <= p.lowStockLimit);
  const newOrdersCount = customerOrders.filter((o) => o.status === 'New').length;

  // Stats calculations (Excludes estimate / quotation bills!)
  const calculateStatsForDates = (startDate: Date, endDate: Date): DashboardStats => {
    const matchingBills = bills.filter((b) => {
      if (b.isEstimate) return false;
      const billDate = new Date(b.date);
      return billDate >= startDate && billDate <= endDate;
    });

    const totalSale = roundMoney(matchingBills.reduce((acc, b) => acc + (b.grandTotal || 0), 0));
    const totalProfit = roundMoney(matchingBills.reduce((acc, b) => acc + (b.totalProfit || 0), 0));
    const totalItems = roundStockQty(
      matchingBills.reduce((acc, b) => {
        return acc + b.items.reduce((sum, item) => sum + (item.quantity || 0), 0);
      }, 0)
    );

    return {
      totalSale,
      totalProfit,
      totalItems,
      billCount: matchingBills.length,
    };
  };

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
  const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
  const todayStats = calculateStatsForDates(startOfToday, endOfToday);

  const startOfYesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 0, 0, 0);
  const endOfYesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 23, 59, 59, 999);
  const yesterdayStats = calculateStatsForDates(startOfYesterday, endOfYesterday);

  const startOf7Days = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7, 0, 0, 0);
  const last7DaysStats = calculateStatsForDates(startOf7Days, endOfToday);

  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
  const thisMonthStats = calculateStatsForDates(startOfMonth, endOfToday);

  const totalStockValue = products.reduce(
    (acc, p) => {
      const qty = Math.max(0, p.stockQuantity);
      return {
        purchaseValue: roundMoney(acc.purchaseValue + qty * p.purchasePrice),
        retailValue: roundMoney(acc.retailValue + qty * p.sellPrice),
        totalQuantity: roundStockQty(acc.totalQuantity + qty),
      };
    },
    { purchaseValue: 0, retailValue: 0, totalQuantity: 0 }
  );

  // Product Actions
  const addProduct = (productData: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>): Product => {
    const timestamp = new Date().toISOString();
    const newProduct: Product = {
      ...productData,
      id: 'prod_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    setProducts((prev) => [newProduct, ...prev]);
    return newProduct;
  };

  const updateProduct = (id: string, updates: Partial<Product>) => {
    setProducts((prev) =>
      prev.map((p) =>
        p.id === id ? { ...p, ...updates, updatedAt: new Date().toISOString() } : p
      )
    );
  };

  const deleteProduct = (id: string) => {
    setProducts((prev) => prev.filter((p) => p.id !== id));
  };

  const refillStock = (
    productId: string,
    quantityToAdd: number,
    newPurchasePrice?: number
  ) => {
    setProducts((prev) =>
      prev.map((p) => {
        if (p.id === productId) {
          const updatedStock = roundStockQty(p.stockQuantity + quantityToAdd);
          return {
            ...p,
            stockQuantity: updatedStock,
            purchasePrice:
              newPurchasePrice !== undefined && newPurchasePrice > 0
                ? newPurchasePrice
                : p.purchasePrice,
            updatedAt: new Date().toISOString(),
          };
        }
        return p;
      })
    );
  };

  // Customer Orders Actions
  const registerLocalCustomerOrder = (order: CustomerOrder) => {
    setCustomerOrders((prev) => {
      if (prev.some((o) => o.id === order.id)) return prev;
      return [order, ...prev];
    });
  };

  const addCustomerOrder = (
    orderData: Omit<CustomerOrder, 'id' | 'orderNumber' | 'date'>
  ): CustomerOrder => {
    const newOrder: CustomerOrder = {
      ...orderData,
      id: 'ord_' + Date.now(),
      orderNumber: 'ORD-' + Math.floor(1000 + Math.random() * 9000),
      date: new Date().toISOString(),
      shopId: orderData.shopId || shopInfo.id,
    };
    setCustomerOrders((prev) => [newOrder, ...prev]);

    if (shopInfo.id) {
      fetch(`/api/public/shop/${encodeURIComponent(shopInfo.id)}/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newOrder),
      }).catch(() => {});
    }

    return newOrder;
  };

  const updateOrderStatus = (orderId: string, status: CustomerOrder['status']) => {
    setCustomerOrders((prev) =>
      prev.map((o) => (o.id === orderId ? { ...o, status } : o))
    );

    if (shopInfo.id) {
      fetch(
        `/api/shops/${encodeURIComponent(shopInfo.id)}/orders/${encodeURIComponent(orderId)}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status }),
        }
      ).catch(() => {});
    }
  };

  // Billing Actions
  const createBill = (billData: Omit<Bill, 'id' | 'billNumber' | 'date'>): Bill => {
    const nowDate = new Date();
    const nowIso = nowDate.toISOString();

    let billNumber: string;

    if (billData.isEstimate) {
      billNumber = `EST-${nowDate.getFullYear().toString().slice(-2)}${(nowDate.getMonth() + 1)
        .toString()
        .padStart(2, '0')}-${Math.floor(1000 + Math.random() * 9000)}`;
    } else {
      const { billNumber: generatedNum, updatedTracker } = getNextBillNumber(
        shopInfo.billNumberConfig,
        shopInfo.billSequenceTracker,
        nowDate
      );
      billNumber = generatedNum;

      setShopInfo((prev) => ({
        ...prev,
        billSequenceTracker: updatedTracker,
      }));
    }

    const sanitizedSubtotal = roundMoney(billData.subtotal);
    const sanitizedDiscount = roundMoney(billData.discount);
    const sanitizedGrandTotal = roundMoney(billData.grandTotal);
    const sanitizedPurchaseCost = roundMoney(billData.totalPurchaseCost);
    const sanitizedProfit = roundMoney(billData.totalProfit);

    const newBill: Bill = {
      ...billData,
      subtotal: sanitizedSubtotal,
      discount: sanitizedDiscount,
      grandTotal: sanitizedGrandTotal,
      totalPurchaseCost: sanitizedPurchaseCost,
      totalProfit: sanitizedProfit,
      id: 'bill_' + Date.now() + '_' + Math.random().toString(36).substring(2, 5),
      billNumber,
      date: nowIso,
    };

    // AUTOMATIC STOCK DEDUCTION ONLY FOR FINAL BILLS (NOT FOR ESTIMATES!)
    if (!billData.isEstimate) {
      const soldQtyByProductId = new Map<string, number>();
      for (const item of billData.items) {
        if (!item.productId) continue;
        soldQtyByProductId.set(
          item.productId,
          (soldQtyByProductId.get(item.productId) || 0) + (Number(item.quantity) || 0)
        );
      }

      setProducts((prev) =>
        prev.map((product) => {
          const soldQty = soldQtyByProductId.get(product.id);
          if (soldQty && soldQty > 0) {
            return {
              ...product,
              stockQuantity: roundStockQty(product.stockQuantity - soldQty),
              updatedAt: nowIso,
            };
          }
          return product;
        })
      );
    }

    // Save bill & update source order/estimate links if applicable
    setBills((prev) => {
      const updatedPrev = billData.convertedFromEstimateId
        ? prev.map((b) =>
            b.id === billData.convertedFromEstimateId
              ? { ...b, isConverted: true, convertedToBillId: newBill.id }
              : b
          )
        : prev;
      return [newBill, ...updatedPrev];
    });

    if (!billData.isEstimate && billData.sourceOrderId) {
      updateOrderStatus(billData.sourceOrderId, 'Billed');
    }

    return newBill;
  };

  // Load Order into POS Bill Editor (does NOT auto-create bill!)
  const openBillEditorFromOrder = (order: CustomerOrder) => {
    const mappedItems = order.items.map((item) => {
      const matched =
        (item.productId && products.find((p) => p.id === item.productId)) ||
        products.find((p) => p.name.toLowerCase() === item.productName.toLowerCase());
      const qty = Number(item.quantity) || 1;
      const sellPrice = Number(item.rate) || (matched ? matched.sellPrice : 0);
      return {
        productId: matched ? matched.id : item.productId || 'ord_item_' + Math.random().toString(36).slice(2, 7),
        productName: item.productName,
        company: matched?.company || 'Catalog',
        category: matched?.category || 'General',
        purchasePrice: matched?.purchasePrice || 0,
        sellPrice,
        quantity: qty,
        unit: item.unit || matched?.unit || 'Pcs',
        total: roundMoney(qty * sellPrice),
        isCustomItem: !matched,
      };
    });

    setBillingDraft({
      mode: 'order',
      sourceOrderId: order.id,
      sourceOrderNumber: order.orderNumber,
      customerName: order.customerName,
      customerMobile: order.customerMobile,
      items: mappedItems,
      discount: 0,
      notes: `${t('orderNotesPrefix')}${order.orderNumber}`,
      paymentMode: 'Cash',
    });
    setActiveTab('billing');
  };

  // Load Estimate into POS Bill Editor before Final Conversion
  const openBillEditorFromEstimate = (estimateBill: Bill) => {
    if (estimateBill.isConverted) return;
    const mappedItems = estimateBill.items.map((item) => {
      const matched = products.find((p) => p.id === item.productId);
      const qty = Number(item.quantity) || 1;
      const sellPrice = Number(item.sellPrice) || 0;
      return {
        ...item,
        purchasePrice: matched ? matched.purchasePrice : item.purchasePrice || 0,
        quantity: qty,
        sellPrice,
        total: roundMoney(qty * sellPrice),
      };
    });

    setBillingDraft({
      mode: 'estimate',
      sourceEstimateId: estimateBill.id,
      sourceEstimateNumber: estimateBill.billNumber,
      customerName: estimateBill.customerName || '',
      customerMobile: estimateBill.customerMobile || '',
      items: mappedItems,
      discount: estimateBill.discount || 0,
      notes: estimateBill.notes || '',
      paymentMode: estimateBill.paymentMode || 'Cash',
    });
    setActiveTab('billing');
  };

  // Load any saved Bill (or Estimate) into POS Bill Editor for modification
  const openBillEditorForEdit = (bill: Bill) => {
    const mappedItems = bill.items.map((item) => {
      const matched = products.find((p) => p.id === item.productId);
      const qty = Number(item.quantity) || 1;
      const sellPrice = Number(item.sellPrice) || 0;
      return {
        ...item,
        purchasePrice: matched ? matched.purchasePrice : item.purchasePrice || 0,
        quantity: qty,
        sellPrice,
        total: roundMoney(qty * sellPrice),
      };
    });

    setBillingDraft({
      mode: 'edit-bill',
      sourceBillId: bill.id,
      sourceBillNumber: bill.billNumber,
      isEstimate: Boolean(bill.isEstimate),
      customerName: bill.customerName || '',
      customerMobile: bill.customerMobile || '',
      items: mappedItems,
      discount: bill.discount || 0,
      notes: bill.notes || '',
      paymentMode: bill.paymentMode || 'Cash',
    });
    setActiveTab('billing');
  };

  const saveEditedBill = (
    billId: string,
    updatedData: Omit<Bill, 'id' | 'billNumber' | 'date'>
  ): Bill | null => {
    const existingBill = bills.find((b) => b.id === billId);
    if (!existingBill) return null;

    const nowIso = new Date().toISOString();

    // Compute per-product net stock adjustment cleanly
    const stockDeltaByProduct = new Map<string, number>();
    if (!existingBill.isEstimate) {
      for (const oldItem of existingBill.items) {
        if (!oldItem.productId) continue;
        stockDeltaByProduct.set(
          oldItem.productId,
          (stockDeltaByProduct.get(oldItem.productId) || 0) + (Number(oldItem.quantity) || 0)
        );
      }
    }
    if (!updatedData.isEstimate) {
      for (const newItem of updatedData.items) {
        if (!newItem.productId) continue;
        stockDeltaByProduct.set(
          newItem.productId,
          (stockDeltaByProduct.get(newItem.productId) || 0) - (Number(newItem.quantity) || 0)
        );
      }
    }

    if (stockDeltaByProduct.size > 0) {
      setProducts((prev) =>
        prev.map((product) => {
          const delta = stockDeltaByProduct.get(product.id);
          if (delta && delta !== 0) {
            return {
              ...product,
              stockQuantity: roundStockQty(product.stockQuantity + delta),
              updatedAt: nowIso,
            };
          }
          return product;
        })
      );
    }

    const updatedBill: Bill = {
      ...existingBill,
      ...updatedData,
      id: existingBill.id,
      billNumber: existingBill.billNumber,
      date: existingBill.date,
      subtotal: roundMoney(updatedData.subtotal),
      discount: roundMoney(updatedData.discount),
      grandTotal: roundMoney(updatedData.grandTotal),
      totalPurchaseCost: roundMoney(updatedData.totalPurchaseCost),
      totalProfit: roundMoney(updatedData.totalProfit),
      notes: updatedData.notes,
    };

    setBills((prev) => prev.map((b) => (b.id === billId ? updatedBill : b)));
    return updatedBill;
  };

  const clearBillingDraft = () => {
    setBillingDraft(null);
  };

  const convertEstimateToFinal = (estimateBillId: string): Bill | null => {
    const targetEstimate = bills.find((b) => b.id === estimateBillId && b.isEstimate && !b.isConverted);
    if (!targetEstimate) return null;

    const nowDate = new Date();
    const nowIso = nowDate.toISOString();

    const { billNumber, updatedTracker } = getNextBillNumber(
      shopInfo.billNumberConfig,
      shopInfo.billSequenceTracker,
      nowDate
    );

    setShopInfo((prev) => ({
      ...prev,
      billSequenceTracker: updatedTracker,
    }));

    const soldQtyByProductId = new Map<string, number>();
    for (const item of targetEstimate.items) {
      if (!item.productId) continue;
      soldQtyByProductId.set(
        item.productId,
        (soldQtyByProductId.get(item.productId) || 0) + (Number(item.quantity) || 0)
      );
    }

    setProducts((prev) =>
      prev.map((product) => {
        const soldQty = soldQtyByProductId.get(product.id);
        if (soldQty && soldQty > 0) {
          return {
            ...product,
            stockQuantity: roundStockQty(product.stockQuantity - soldQty),
            updatedAt: nowIso,
          };
        }
        return product;
      })
    );

    const finalizedBill: Bill = {
      ...targetEstimate,
      id: 'bill_' + Date.now(),
      billNumber,
      date: nowIso,
      isEstimate: false,
      convertedFromEstimateId: targetEstimate.id,
    };

    setBills((prev) => [
      finalizedBill,
      ...prev.map((b) =>
        b.id === estimateBillId
          ? { ...b, isConverted: true, convertedToBillId: finalizedBill.id }
          : b
      ),
    ]);

    return finalizedBill;
  };

  const cancelBill = (billId: string) => {
    const targetBill = bills.find((b) => b.id === billId);
    if (!targetBill) return;

    if (!targetBill.isEstimate) {
      const restoreById = new Map<string, number>();
      for (const item of targetBill.items) {
        if (!item.productId) continue;
        restoreById.set(
          item.productId,
          (restoreById.get(item.productId) || 0) + (Number(item.quantity) || 0)
        );
      }

      setProducts((prev) =>
        prev.map((product) => {
          const restoreQty = restoreById.get(product.id);
          if (restoreQty && restoreQty > 0) {
            return {
              ...product,
              stockQuantity: roundStockQty(product.stockQuantity + restoreQty),
              updatedAt: new Date().toISOString(),
            };
          }
          return product;
        })
      );
    }

    setBills((prev) => prev.filter((b) => b.id !== billId));
  };

  // Supplier Ledger Actions
  const addSupplier = (name: string, mobile: string, shopFirmName?: string): Supplier => {
    const newSupplier: Supplier = {
      id: 'supp_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      name: name.trim(),
      mobile: mobile.trim(),
      shopFirmName: shopFirmName ? shopFirmName.trim() : '',
      purchases: [],
      payments: [],
      createdAt: new Date().toISOString(),
    };
    setSuppliers((prev) => [newSupplier, ...prev]);
    return newSupplier;
  };

  const deleteSupplier = (supplierId: string) => {
    setSuppliers((prev) => prev.filter((s) => s.id !== supplierId));
  };

  const addSupplierPurchase = (
    supplierId: string,
    purchaseData: { description: string; totalAmount: number; paidAmount: number }
  ) => {
    const remaining = roundMoney(Math.max(0, purchaseData.totalAmount - purchaseData.paidAmount));
    const newPurchase: SupplierPurchase = {
      id: 'pur_' + Date.now(),
      date: new Date().toISOString(),
      description: purchaseData.description.trim() || 'Stock Purchase',
      totalAmount: roundMoney(purchaseData.totalAmount),
      paidAmount: roundMoney(purchaseData.paidAmount),
      remainingAmount: remaining,
    };

    setSuppliers((prev) =>
      prev.map((s) => {
        if (s.id === supplierId) {
          const updatedPurchases = [newPurchase, ...s.purchases];
          const updatedPayments =
            purchaseData.paidAmount > 0
              ? [
                  {
                    id: 'pay_' + Date.now(),
                    date: new Date().toISOString(),
                    amount: roundMoney(purchaseData.paidAmount),
                    paymentMode: 'Cash' as const,
                    notes: newPurchase.description,
                  },
                  ...s.payments,
                ]
              : s.payments;
          return {
            ...s,
            purchases: updatedPurchases,
            payments: updatedPayments,
          };
        }
        return s;
      })
    );
  };

  const paySupplier = (
    supplierId: string,
    paymentData: { amount: number; paymentMode: 'Cash' | 'UPI' | 'Bank'; notes?: string }
  ) => {
    const newPayment: SupplierPayment = {
      id: 'pay_' + Date.now(),
      date: new Date().toISOString(),
      amount: roundMoney(paymentData.amount),
      paymentMode: paymentData.paymentMode,
      notes: paymentData.notes?.trim() || '',
    };

    setSuppliers((prev) =>
      prev.map((s) => {
        if (s.id === supplierId) {
          return {
            ...s,
            payments: [newPayment, ...s.payments],
          };
        }
        return s;
      })
    );
  };

  // Day Closing Actions
  const saveDayClosing = (
    recordData: Omit<DayClosingRecord, 'id' | 'closedAt'>
  ): DayClosingRecord => {
    const newRecord: DayClosingRecord = {
      ...recordData,
      id: 'close_' + Date.now(),
      closedAt: new Date().toISOString(),
    };
    setDayClosingRecords((prev) => [newRecord, ...prev.filter((r) => r.date !== recordData.date)]);
    return newRecord;
  };

  const updateBill = (billId: string, updates: Partial<Bill>) => {
    setBills((prev) => prev.map((b) => (b.id === billId ? { ...b, ...updates } : b)));
  };

  const getBillsForDate = (dateStr: string): Bill[] => {
    return bills.filter((b) => b.date.startsWith(dateStr));
  };

  const updateShopInfo = (newInfo: ShopInfo) => {
    const updated = ensureShopInfoDefaults({ ...newInfo }, language);
    setShopInfo(updated);
  };

  const exportBackup = () => {
    const data = {
      shopInfo,
      products,
      bills,
      suppliers,
      customerOrders,
      dayClosingRecords,
      exportedAt: new Date().toISOString(),
      appName: shopInfo.name || t('appName'),
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `BILLING_APP_BACKUP_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const importBackup = (jsonString: string): boolean => {
    try {
      const data = JSON.parse(jsonString);
      if (data.products && Array.isArray(data.products)) {
        setProducts(data.products);
      }
      if (data.bills && Array.isArray(data.bills)) {
        setBills(data.bills);
      }
      if (data.shopInfo && typeof data.shopInfo === 'object') {
        setShopInfo(ensureShopInfoDefaults(data.shopInfo, language));
      }
      if (data.suppliers && Array.isArray(data.suppliers)) {
        setSuppliers(data.suppliers);
      }
      if (data.customerOrders && Array.isArray(data.customerOrders)) {
        setCustomerOrders(data.customerOrders);
      }
      if (data.dayClosingRecords && Array.isArray(data.dayClosingRecords)) {
        setDayClosingRecords(data.dayClosingRecords);
      }
      return true;
    } catch (err) {
      console.error('Import failed', err);
      return false;
    }
  };

  const resetToDefault = () => {
    setProducts(INITIAL_PRODUCTS);
    setBills(INITIAL_BILLS);
    setShopInfo(ensureShopInfoDefaults(INITIAL_SHOP_INFO, language));
    setSuppliers([]);
    setCustomerOrders([]);
    setDayClosingRecords([]);
  };

  const fullAppReset = async (): Promise<void> => {
    try {
      localStorage.removeItem(STORAGE_KEYS.SHOP_INFO);
      localStorage.removeItem(STORAGE_KEYS.PRODUCTS);
      localStorage.removeItem(STORAGE_KEYS.BILLS);
      localStorage.removeItem(STORAGE_KEYS.REFILLS);
      localStorage.removeItem(STORAGE_KEYS.SUPPLIERS);
      localStorage.removeItem(STORAGE_KEYS.ORDERS);
      localStorage.removeItem(STORAGE_KEYS.DAY_CLOSING);
      localStorage.setItem(STORAGE_KEYS.SETUP_DONE, 'false');
      await clearAllOfflineData();
    } catch (e) {
      console.error('LocalStorage reset error', e);
    }

    setProducts([]);
    setBills([]);
    setSuppliers([]);
    setCustomerOrders([]);
    setDayClosingRecords([]);
    setBillingDraft(null);
    setShopInfo(
      ensureShopInfoDefaults(
        {
          ...INITIAL_SHOP_INFO,
          name: '',
          mobile: '',
          address: '',
          tagline: '',
          gstin: '',
        },
        language
      )
    );
    setActiveTab('dashboard');
    setIsSetupComplete(false);
  };

  const completeSetup = (newShopInfo?: Partial<ShopInfo>, loadDemoProducts: boolean = false) => {
    if (newShopInfo) {
      const merged = { ...shopInfo, ...newShopInfo };
      if (!merged.id || (newShopInfo.name && newShopInfo.name !== shopInfo.name)) {
        merged.id = generateShopId(merged.name || 'shop');
      }
      const updated = ensureShopInfoDefaults(merged, language);
      setShopInfo(updated);
      try {
        localStorage.setItem(STORAGE_KEYS.SHOP_INFO, JSON.stringify(updated));
        saveToIndexedDb('shopInfo', updated);
      } catch (e) {
        console.error(e);
      }
    }

    if (loadDemoProducts) {
      setProducts(INITIAL_PRODUCTS);
      setBills(INITIAL_BILLS);
      try {
        localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(INITIAL_PRODUCTS));
        localStorage.setItem(STORAGE_KEYS.BILLS, JSON.stringify(INITIAL_BILLS));
        saveToIndexedDb('products', INITIAL_PRODUCTS);
        saveToIndexedDb('bills', INITIAL_BILLS);
      } catch (e) {
        console.error(e);
      }
    } else {
      setProducts([]);
      setBills([]);
      try {
        localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify([]));
        localStorage.setItem(STORAGE_KEYS.BILLS, JSON.stringify([]));
        saveToIndexedDb('products', []);
        saveToIndexedDb('bills', []);
      } catch (e) {
        console.error(e);
      }
    }

    setIsSetupComplete(true);
    try {
      localStorage.setItem(STORAGE_KEYS.SETUP_DONE, 'true');
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <ShopContext.Provider
      value={{
        shopInfo,
        updateShopInfo,
        products,
        bills,
        activeTab,
        setActiveTab,
        rateListSubTab,
        setRateListSubTab,
        lowStockProducts,
        isSetupComplete,
        setIsSetupComplete,
        fullAppReset,
        completeSetup,
        addProduct,
        updateProduct,
        deleteProduct,
        refillStock,
        createBill,
        saveEditedBill,
        cancelBill,
        updateBill,
        convertEstimateToFinal,
        billingDraft,
        openBillEditorFromOrder,
        openBillEditorFromEstimate,
        openBillEditorForEdit,
        clearBillingDraft,
        suppliers,
        addSupplier,
        deleteSupplier,
        addSupplierPurchase,
        paySupplier,
        customerOrders,
        newOrdersCount,
        addCustomerOrder,
        registerLocalCustomerOrder,
        updateOrderStatus,
        refreshCloudOrders,
        dayClosingRecords,
        saveDayClosing,
        todayStats,
        yesterdayStats,
        last7DaysStats,
        thisMonthStats,
        totalStockValue,
        getBillsForDate,
        exportBackup,
        importBackup,
        resetToDefault,
        searchQuery,
        setSearchQuery,
        selectedCategory,
        setSelectedCategory,
        selectedCompany,
        setSelectedCompany,
        selectedVendor,
        setSelectedVendor,
        language,
        setLanguage,
        t,
        darkMode,
        setDarkMode,
        activeShopId,
        loginWithOwnerCode,
        logoutOwner,
      }}
    >
      {children}
    </ShopContext.Provider>
  );
};

export const useShop = () => {
  const context = useContext(ShopContext);
  if (!context) {
    throw new Error('useShop must be used within a ShopProvider');
  }
  return context;
};
