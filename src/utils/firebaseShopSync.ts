import {
  collection,
  doc,
  getDoc,
  getDocFromServer,
  getDocs,
  getDocsFromServer,
  setDoc,
  deleteDoc,
  writeBatch,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import {
  ShopInfo,
  Product,
  Bill,
  Supplier,
  CustomerOrder,
  DayClosingRecord,
  StaffMember,
  StaffRole,
} from '../types';

export interface CloudShopDoc {
  shopId: string;
  ownerCode: string;
  name: string;
  ownerName?: string;
  mobile?: string;
  address?: string;
  tagline?: string;
  gstin?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface StaffDirectoryDoc {
  mobile: string;
  shopId: string;
  staffId: string;
  name: string;
  role: StaffRole;
  pinHash: string;
  isActive: boolean;
  updatedAt?: string;
}

export interface CloudShopRestorePayload {
  shopInfo: Partial<ShopInfo>;
  products: Product[];
  bills: Bill[];
  suppliers: Supplier[];
  customerOrders: CustomerOrder[];
  dayClosingRecords: DayClosingRecord[];
  staffMembers: StaffMember[];
}

export interface StaffCloudRestorePayload {
  shopInfo: Partial<ShopInfo>;
  products: Product[];
  bills: Bill[];
}

function sanitizeForFirestore<T>(obj: T): T {
  return JSON.parse(
    JSON.stringify(obj, (_key, value) => (value === undefined ? null : value))
  );
}

/**
 * Create or update a shop root document in Firestore: shops/{shopId}
 */
export async function syncShopMetaToCloud(
  shopId: string,
  shopInfo: Partial<ShopInfo> & { ownerName?: string }
): Promise<void> {
  const cleanId = (shopId || '').trim().toLowerCase();
  if (!cleanId) return;
  const path = `shops/${cleanId}`;
  try {
    const payload: CloudShopDoc = sanitizeForFirestore({
      shopId: cleanId,
      ownerCode: `${cleanId}-955`,
      name: (shopInfo.name || cleanId).trim().slice(0, 120),
      ownerName: (shopInfo.ownerName || '').trim().slice(0, 120),
      mobile: (shopInfo.mobile || '').trim().slice(0, 30),
      address: (shopInfo.address || '').trim().slice(0, 300),
      tagline: (shopInfo.tagline || '').trim().slice(0, 200),
      gstin: (shopInfo.gstin || '').trim().slice(0, 40),
      updatedAt: new Date().toISOString(),
    });
    await setDoc(doc(db, 'shops', cleanId), payload, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

/**
 * Verify Owner Code against Firestore shops/{shopId}
 */
export async function verifyOwnerCodeInCloud(
  shopId: string
): Promise<CloudShopDoc | null> {
  const cleanId = (shopId || '').trim().toLowerCase();
  if (!cleanId) return null;
  const path = `shops/${cleanId}`;
  try {
    const snap = await getDocFromServer(doc(db, 'shops', cleanId));
    if (!snap.exists()) return null;
    const data = snap.data() as CloudShopDoc;
    if (data && data.shopId === cleanId && data.ownerCode === `${cleanId}-955`) {
      return data;
    }
    return null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }
}

/**
 * Lookup staff directory entry by 10-digit mobile in Firestore: staffDirectory/{mobile}
 */
export async function lookupStaffByMobileInCloud(
  mobile: string
): Promise<StaffDirectoryDoc | null> {
  const cleanMobile = (mobile || '').replace(/\D/g, '').slice(-10);
  if (!/^[0-9]{10}$/.test(cleanMobile)) return null;
  const path = `staffDirectory/${cleanMobile}`;
  try {
    const snap = await getDoc(doc(db, 'staffDirectory', cleanMobile));
    if (!snap.exists()) return null;
    return snap.data() as StaffDirectoryDoc;
  } catch (error) {
    try {
      handleFirestoreError(error, OperationType.GET, path);
    } catch {
      // ignore so offline fallback can run
    }
    return null;
  }
}

/**
 * Upsert staff directory entry in Firestore: staffDirectory/{mobile}
 */
export async function syncStaffDirectoryEntry(
  entry: StaffDirectoryDoc
): Promise<void> {
  const cleanMobile = (entry.mobile || '').replace(/\D/g, '').slice(-10);
  const cleanShopId = (entry.shopId || '').trim().toLowerCase();
  if (!/^[0-9]{10}$/.test(cleanMobile) || !cleanShopId) return;
  if (typeof navigator !== 'undefined' && !navigator.onLine) return;

  const path = `staffDirectory/${cleanMobile}`;
  try {
    const payload: StaffDirectoryDoc = sanitizeForFirestore({
      mobile: cleanMobile,
      shopId: cleanShopId,
      staffId: entry.staffId,
      name: (entry.name || '').trim().slice(0, 120),
      role: entry.role,
      pinHash: entry.pinHash,
      isActive: Boolean(entry.isActive),
      updatedAt: new Date().toISOString(),
    });
    await setDoc(doc(db, 'staffDirectory', cleanMobile), payload, { merge: true });
  } catch (error) {
    try {
      handleFirestoreError(error, OperationType.WRITE, path);
    } catch {
      // swallow so offline-first flow remains resilient
    }
  }
}

/**
 * Delete old staff directory entry by 10-digit mobile
 */
export async function deleteStaffDirectoryEntry(mobile: string): Promise<void> {
  const cleanMobile = (mobile || '').replace(/\D/g, '').slice(-10);
  if (!/^[0-9]{10}$/.test(cleanMobile)) return;
  if (typeof navigator !== 'undefined' && !navigator.onLine) return;

  const path = `staffDirectory/${cleanMobile}`;
  try {
    await deleteDoc(doc(db, 'staffDirectory', cleanMobile));
  } catch (error) {
    try {
      handleFirestoreError(error, OperationType.DELETE, path);
    } catch {
      // swallow
    }
  }
}

/**
 * Restore all shop collections from Firestore when Owner logs in on a 2nd mobile
 */
export async function restoreShopDataFromCloud(
  shopId: string
): Promise<CloudShopRestorePayload | null> {
  const cleanId = (shopId || '').trim().toLowerCase();
  if (!cleanId) return null;

  const shopDoc = await verifyOwnerCodeInCloud(cleanId);
  if (!shopDoc) return null;

  const fetchSubcollection = async <T>(subName: string): Promise<T[]> => {
    const path = `shops/${cleanId}/${subName}`;
    try {
      const snap = await getDocs(collection(db, 'shops', cleanId, subName));
      return snap.docs.map((d) => d.data() as T);
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, path);
    }
  };

  const [products, bills, customerOrders, dayClosingRecords, suppliers, staffMembers] =
    await Promise.all([
      fetchSubcollection<Product>('products'),
      fetchSubcollection<Bill>('bills'),
      fetchSubcollection<CustomerOrder>('orders'),
      fetchSubcollection<DayClosingRecord>('dayClosings'),
      fetchSubcollection<Supplier>('supplierLedger'),
      fetchSubcollection<StaffMember>('staff'),
    ]);

  return {
    shopInfo: {
      id: cleanId,
      name: shopDoc.name || cleanId,
      mobile: shopDoc.mobile || '',
      address: shopDoc.address || '',
      tagline: shopDoc.tagline || '',
      gstin: shopDoc.gstin || '',
    },
    products,
    bills,
    suppliers,
    customerOrders,
    dayClosingRecords,
    staffMembers,
  };
}

/**
 * Restore ONLY non-sensitive shop data (meta without ownerCode, products, bills) for Staff login.
 * Never loads supplierLedger, dayClosings, or staff list for Staff sessions.
 */
export async function restoreShopDataForStaffFromCloud(
  shopId: string
): Promise<StaffCloudRestorePayload | null> {
  const cleanId = (shopId || '').trim().toLowerCase();
  if (!cleanId) return null;

  const path = `shops/${cleanId}`;
  try {
    const snap = await getDoc(doc(db, 'shops', cleanId));
    if (!snap.exists()) return null;
    const shopDoc = snap.data() as CloudShopDoc;

    const fetchSubcollection = async <T>(subName: string): Promise<T[]> => {
      const subPath = `shops/${cleanId}/${subName}`;
      try {
        const subSnap = await getDocs(collection(db, 'shops', cleanId, subName));
        return subSnap.docs.map((d) => d.data() as T);
      } catch (error) {
        handleFirestoreError(error, OperationType.LIST, subPath);
      }
    };

    const [products, bills] = await Promise.all([
      fetchSubcollection<Product>('products'),
      fetchSubcollection<Bill>('bills'),
    ]);

    return {
      shopInfo: {
        id: cleanId,
        name: shopDoc.name || cleanId,
        mobile: shopDoc.mobile || '',
        address: shopDoc.address || '',
        tagline: shopDoc.tagline || '',
        gstin: shopDoc.gstin || '',
      },
      products,
      bills,
    };
  } catch (error) {
    try {
      handleFirestoreError(error, OperationType.GET, path);
    } catch {
      // ignore for offline fallback
    }
    return null;
  }
}

export type ShopSubcollectionName =
  | 'products'
  | 'bills'
  | 'orders'
  | 'dayClosings'
  | 'supplierLedger'
  | 'staff';

/**
 * Sync a shop subcollection (products, bills, orders, dayClosings, supplierLedger, staff) to Firestore.
 * Uses batched writes (max 400 per batch) and removes deleted docs cleanly. (Owner use)
 */
export async function syncShopCollectionToCloud<T extends { id: string }>(
  shopId: string,
  subcollectionName: ShopSubcollectionName,
  items: T[]
): Promise<void> {
  const cleanId = (shopId || '').trim().toLowerCase();
  if (!cleanId || (typeof navigator !== 'undefined' && !navigator.onLine)) return;

  const path = `shops/${cleanId}/${subcollectionName}`;
  try {
    const existingSnap = await getDocs(collection(db, 'shops', cleanId, subcollectionName));
    const existingIds = new Set(existingSnap.docs.map((d) => d.id));
    const currentIds = new Set(items.map((item) => item.id).filter(Boolean));

    const BATCH_LIMIT = 400;
    let batch = writeBatch(db);
    let opCount = 0;

    const commitIfNeeded = async () => {
      if (opCount >= BATCH_LIMIT) {
        await batch.commit();
        batch = writeBatch(db);
        opCount = 0;
      }
    };

    for (const item of items) {
      if (!item || !item.id) continue;
      const docRef = doc(db, 'shops', cleanId, subcollectionName, item.id);
      const payload = sanitizeForFirestore({
        ...item,
        id: item.id,
        shopId: cleanId,
      });
      batch.set(docRef, payload, { merge: true });
      opCount++;
      await commitIfNeeded();
    }

    for (const oldId of existingIds) {
      if (!currentIds.has(oldId)) {
        const docRef = doc(db, 'shops', cleanId, subcollectionName, oldId);
        batch.delete(docRef);
        opCount++;
        await commitIfNeeded();
      }
    }

    if (opCount > 0) {
      await batch.commit();
    }
  } catch (error) {
    try {
      handleFirestoreError(error, OperationType.WRITE, path);
    } catch {
      // swallow after structured logging so offline-first app never crashes
    }
  }
}

/**
 * Upsert-only sync for Staff sessions: merges local additions/updates into Firestore
 * without ever deleting existing docs in Firestore.
 */
export async function upsertShopCollectionToCloud<T extends { id: string }>(
  shopId: string,
  subcollectionName: 'products' | 'bills',
  items: T[]
): Promise<void> {
  const cleanId = (shopId || '').trim().toLowerCase();
  if (!cleanId || (typeof navigator !== 'undefined' && !navigator.onLine)) return;

  const path = `shops/${cleanId}/${subcollectionName}`;
  try {
    const BATCH_LIMIT = 400;
    let batch = writeBatch(db);
    let opCount = 0;

    for (const item of items) {
      if (!item || !item.id) continue;
      const docRef = doc(db, 'shops', cleanId, subcollectionName, item.id);
      const payload = sanitizeForFirestore({
        ...item,
        id: item.id,
        shopId: cleanId,
      });
      batch.set(docRef, payload, { merge: true });
      opCount++;
      if (opCount >= BATCH_LIMIT) {
        await batch.commit();
        batch = writeBatch(db);
        opCount = 0;
      }
    }

    if (opCount > 0) {
      await batch.commit();
    }
  } catch (error) {
    try {
      handleFirestoreError(error, OperationType.WRITE, path);
    } catch {
      // swallow
    }
  }
}

export async function deleteShopDocFromCloud(
  shopId: string,
  subcollectionName: ShopSubcollectionName,
  docId: string
): Promise<void> {
  const cleanId = (shopId || '').trim().toLowerCase();
  if (!cleanId || !docId) return;
  const path = `shops/${cleanId}/${subcollectionName}/${docId}`;
  try {
    await deleteDoc(doc(db, 'shops', cleanId, subcollectionName, docId));
  } catch (error) {
    try {
      handleFirestoreError(error, OperationType.DELETE, path);
    } catch {
      // swallow after structured logging
    }
  }
}

/**
 * Permanently and recursively delete ONLY the specified shopId from Firestore:
 * - All subcollections (products, bills, orders, dayClosings, supplierLedger, staff)
 * - Matching staffDirectory/{mobile} entries belonging strictly to this shopId
 * - Root shop document shops/{shopId}
 * Throws on offline or Firestore errors so callers do NOT wipe local state or logout on failure.
 */
export async function deleteShopCompletelyFromCloud(
  shopId: string,
  localStaffMobiles: string[] = []
): Promise<void> {
  const cleanId = (shopId || '').trim().toLowerCase();
  if (!cleanId) {
    throw new Error('No active shop selected for deletion');
  }
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    throw new Error('No internet connection');
  }

  const staffMobiles = new Set<string>();
  for (const m of localStaffMobiles) {
    const cleanMobile = (m || '').replace(/\D/g, '').slice(-10);
    if (/^[0-9]{10}$/.test(cleanMobile)) {
      staffMobiles.add(cleanMobile);
    }
  }

  const shopRef = doc(db, 'shops', cleanId);

  // Confirm live server reachability before beginning deletion
  await getDocFromServer(shopRef);

  const subcollections = [
    'products',
    'bills',
    'orders',
    'dayClosings',
    'supplierLedger',
    'staff',
    'items',
    'customers',
    'settings',
  ] as const;

  for (const subName of subcollections) {
    const subSnap = await getDocsFromServer(collection(db, 'shops', cleanId, subName));
    if (subName === 'staff') {
      for (const docSnap of subSnap.docs) {
        const rawMobile = String(docSnap.data()?.mobile || '');
        const cleanMobile = rawMobile.replace(/\D/g, '').slice(-10);
        if (/^[0-9]{10}$/.test(cleanMobile)) {
          staffMobiles.add(cleanMobile);
        }
      }
    }

    const docs = subSnap.docs;
    const BATCH_LIMIT = 400;
    for (let i = 0; i < docs.length; i += BATCH_LIMIT) {
      const chunk = docs.slice(i, i + BATCH_LIMIT);
      const batch = writeBatch(db);
      for (const d of chunk) {
        batch.delete(d.ref);
      }
      await batch.commit();
    }
  }

  // Explicitly delete the root shop document in Firestore: shops/{shopId}
  await deleteDoc(doc(db, 'shops', cleanId));

  // Re-check from Firestore server to confirm the shop document is actually gone
  const verifySnap = await getDocFromServer(shopRef);
  if (verifySnap.exists()) {
    throw new Error('Shop document still exists in Firestore after deletion');
  }

  // Clean up only staffDirectory entries that strictly belong to this deleted shopId
  for (const mobile of staffMobiles) {
    const dirRef = doc(db, 'staffDirectory', mobile);
    const dirSnap = await getDocFromServer(dirRef);
    if (dirSnap.exists()) {
      const entryShopId = String(dirSnap.data()?.shopId || '').trim().toLowerCase();
      if (entryShopId === cleanId) {
        await deleteDoc(dirRef);
      }
    }
  }
}
