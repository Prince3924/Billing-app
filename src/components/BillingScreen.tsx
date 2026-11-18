import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  Camera, Search, Plus, Minus, Trash2, ShoppingCart,
  Check, User, Phone, XCircle
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { useShop } from '../context/ShopContext';
import { Product, BillItem, PaymentMode, Bill } from '../types';
import { BarcodeScannerModal } from './BarcodeScannerModal';
import { BillReceiptModal } from './BillReceiptModal';

interface ActiveDraftMeta {
  mode: 'order' | 'estimate' | 'edit-bill';
  sourceOrderId?: string;
  sourceOrderNumber?: string;
  sourceEstimateId?: string;
  sourceEstimateNumber?: string;
  sourceBillId?: string;
  sourceBillNumber?: string;
}

export const BillingScreen: React.FC = () => {
  const {
    products,
    addProduct,
    createBill,
    saveEditedBill,
    shopInfo,
    billingDraft,
    clearBillingDraft,
    t,
  } = useShop();

  // Search & Filter
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCat, setSelectedCat] = useState('ALL');

  // Scanner modal state
  const [isScannerOpen, setIsScannerOpen] = useState(false);

  // Bill Type toggle (Final Bill vs Estimate / Quotation)
  const [isEstimate, setIsEstimate] = useState<boolean>(false);
  const [activeDraftMeta, setActiveDraftMeta] = useState<ActiveDraftMeta | null>(null);

  // Cart state
  const [cartItems, setCartItems] = useState<BillItem[]>([]);
  const [qtyStrings, setQtyStrings] = useState<Record<string, string>>({});
  const [rateStrings, setRateStrings] = useState<Record<string, string>>({});
  const [customerName, setCustomerName] = useState('');
  const [customerMobile, setCustomerMobile] = useState('');
  const [paymentMode, setPaymentMode] = useState<PaymentMode>('Cash');
  const [discountAmount, setDiscountAmount] = useState<string>('0');
  const [billNotes, setBillNotes] = useState('');

  // Custom Item Modal state
  const [isCustomModalOpen, setIsCustomModalOpen] = useState(false);
  const [customItemName, setCustomItemName] = useState('');
  const [customWeightOrQty, setCustomWeightOrQty] = useState('');
  const [customUnit, setCustomUnit] = useState('KG');
  const [customRate, setCustomRate] = useState('');
  const [saveToProductList, setSaveToProductList] = useState(false);

  // Expired Product Warning Dialog state
  const [expiredWarningProduct, setExpiredWarningProduct] = useState<{ product: Product; qty: number } | null>(null);

  // Bill preview modal after creation
  const [createdBill, setCreatedBill] = useState<Bill | null>(null);
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);

  // Scan feedback message
  const [scanNotice, setScanNotice] = useState<string | null>(null);

  const noteTextareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-expand Serial Numbers / Note textarea while typing
  useEffect(() => {
    const el = noteTextareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.max(el.scrollHeight, 76)}px`;
  }, [billNotes]);

  // Load incoming draft from Customer Order, Estimate Conversion, or Bill Edit
  useEffect(() => {
    if (!billingDraft) return;
    setIsEstimate(billingDraft.mode === 'edit-bill' ? Boolean(billingDraft.isEstimate) : false);
    const draftItems = billingDraft.items.map((item) => ({ ...item }));
    setCartItems(draftItems);
    const nextQtyStrings: Record<string, string> = {};
    const nextRateStrings: Record<string, string> = {};
    draftItems.forEach((item) => {
      nextQtyStrings[item.productId] = String(item.quantity);
      nextRateStrings[item.productId] = String(item.sellPrice);
    });
    setQtyStrings(nextQtyStrings);
    setRateStrings(nextRateStrings);
    setCustomerName(billingDraft.customerName || '');
    setCustomerMobile(billingDraft.customerMobile || '');
    setDiscountAmount(String(billingDraft.discount || 0));
    setBillNotes(billingDraft.notes || '');
    setPaymentMode(billingDraft.paymentMode || 'Cash');
    setActiveDraftMeta({
      mode: billingDraft.mode,
      sourceOrderId: billingDraft.sourceOrderId,
      sourceOrderNumber: billingDraft.sourceOrderNumber,
      sourceEstimateId: billingDraft.sourceEstimateId,
      sourceEstimateNumber: billingDraft.sourceEstimateNumber,
      sourceBillId: billingDraft.sourceBillId,
      sourceBillNumber: billingDraft.sourceBillNumber,
    });
    clearBillingDraft();
  }, [billingDraft, clearBillingDraft]);

  // Filter products for quick selection
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchSearch =
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.company.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.barcode.includes(searchTerm) ||
        p.category.toLowerCase().includes(searchTerm.toLowerCase());

      const matchCat = selectedCat === 'ALL' || p.category === selectedCat;

      return matchSearch && matchCat;
    });
  }, [products, searchTerm, selectedCat]);

  const categories = useMemo(() => {
    return Array.from(new Set(products.map((p) => p.category)));
  }, [products]);

  const roundMoney = (val: number) => Math.round((Number(val) || 0) * 100) / 100;

  // Add product to cart with Expiry Date check
  const addToCart = (product: Product, qty: number = 1, bypassExpiryCheck = false) => {
    if (!bypassExpiryCheck && product.expiryDate) {
      const today = new Date(new Date().toDateString());
      const expDate = new Date(product.expiryDate);
      if (expDate < today) {
        setExpiredWarningProduct({ product, qty });
        return;
      }
    }

    if (product.stockQuantity <= 0) {
      const outOfStockMsg = t('outOfStockAlert', { name: product.name });
      setScanNotice(outOfStockMsg);
      setTimeout(() => setScanNotice(null), 3000);
      return;
    }

    let updatedQtyValue: number | null = null;
    setCartItems((prev) => {
      const existing = prev.find((item) => item.productId === product.id);
      if (existing) {
        const newQty = Math.round((existing.quantity + qty) * 1000) / 1000;
        if (newQty > product.stockQuantity) {
          const onlyLeftMsg = t('onlyStockLeftAlert', {
            qty: product.stockQuantity,
            unit: product.unit,
          });
          setScanNotice(onlyLeftMsg);
          setTimeout(() => setScanNotice(null), 3000);
          return prev;
        }
        updatedQtyValue = newQty;
        return prev.map((item) =>
          item.productId === product.id
            ? { ...item, quantity: newQty, total: roundMoney(newQty * item.sellPrice) }
            : item
        );
      } else {
        updatedQtyValue = qty;
        return [
          ...prev,
          {
            productId: product.id,
            productName: product.name,
            company: product.company,
            category: product.category,
            purchasePrice: product.purchasePrice,
            sellPrice: product.sellPrice,
            quantity: qty,
            unit: product.unit,
            total: roundMoney(qty * product.sellPrice),
          },
        ];
      }
    });

    if (updatedQtyValue !== null) {
      setQtyStrings((prev) => ({ ...prev, [product.id]: String(updatedQtyValue) }));
      setRateStrings((prev) =>
        prev[product.id] !== undefined ? prev : { ...prev, [product.id]: String(product.sellPrice) }
      );
    }

    const addMsg = t('itemAddedToBillToast', { name: product.name.split(' ')[0] });
    setScanNotice(addMsg);
    setTimeout(() => setScanNotice(null), 2500);
  };

  // Add Custom Item / Weight Item to cart
  const handleAddCustomItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customItemName.trim()) return;

    const w = parseFloat(customWeightOrQty);
    const r = parseFloat(customRate);
    if (isNaN(w) || w <= 0 || isNaN(r) || r < 0) return;

    const calculatedTotal = customUnit === 'Gram' ? (w / 1000) * r : w * r;
    const unitPrice = customUnit === 'Gram' ? r / 1000 : r;

    const newItem: BillItem = {
      productId: 'custom_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      productName: customItemName.trim(),
      company: t('customTag'),
      category: t('customTag'),
      purchasePrice: roundMoney(unitPrice * 0.7),
      sellPrice: roundMoney(unitPrice),
      quantity: w,
      unit: customUnit,
      total: roundMoney(calculatedTotal),
      isCustomItem: true,
    };

    setCartItems((prev) => [...prev, newItem]);
    setQtyStrings((prev) => ({ ...prev, [newItem.productId]: String(newItem.quantity) }));
    setRateStrings((prev) => ({ ...prev, [newItem.productId]: String(newItem.sellPrice) }));

    if (saveToProductList) {
      addProduct({
        name: customItemName.trim(),
        barcode: '890' + Math.floor(1000000000 + Math.random() * 9000000000),
        company: t('customTag'),
        vendor: t('customTag'),
        category: t('customTag'),
        purchasePrice: roundMoney(r * 0.7),
        sellPrice: r,
        stockQuantity: 999,
        lowStockLimit: 10,
        unit: customUnit,
      });
    }

    setCustomItemName('');
    setCustomWeightOrQty('');
    setCustomRate('');
    setSaveToProductList(false);
    setIsCustomModalOpen(false);
  };

  // Update Qty via +/- stepper buttons (removes item when stepped down to 0)
  const updateCartQty = (productId: string, newQty: number) => {
    if (isNaN(newQty)) return;

    if (newQty <= 0) {
      removeFromCart(productId);
      return;
    }

    const cartEntry = cartItems.find((i) => i.productId === productId);
    const catalogProduct = products.find((p) => p.id === productId);

    if (catalogProduct && !cartEntry?.isCustomItem && newQty > catalogProduct.stockQuantity) {
      const onlyLeftMsg = t('onlyStockLeftAlert', {
        qty: catalogProduct.stockQuantity,
        unit: catalogProduct.unit,
      });
      setScanNotice(onlyLeftMsg);
      setTimeout(() => setScanNotice(null), 3000);
      return;
    }

    setQtyStrings((prev) => ({ ...prev, [productId]: String(newQty) }));
    setCartItems((prev) =>
      prev.map((item) =>
        item.productId === productId
          ? {
              ...item,
              quantity: newQty,
              total: roundMoney(newQty * item.sellPrice),
            }
          : item
      )
    );
  };

  // Direct keyboard typing in Qty box (allows "" blank state; treats "" as 0 for calculations only)
  const handleDirectQtyInput = (productId: string, rawValue: string) => {
    setQtyStrings((prev) => ({ ...prev, [productId]: rawValue }));

    if (rawValue.trim() === '') {
      setCartItems((prev) =>
        prev.map((item) =>
          item.productId === productId ? { ...item, quantity: 0, total: 0 } : item
        )
      );
      return;
    }

    const parsed = parseFloat(rawValue);
    if (Number.isNaN(parsed)) return;

    const safeQty = Math.max(0, Math.round(parsed * 1000) / 1000);
    const cartEntry = cartItems.find((i) => i.productId === productId);
    const catalogProduct = products.find((p) => p.id === productId);

    if (catalogProduct && !cartEntry?.isCustomItem && safeQty > catalogProduct.stockQuantity) {
      const onlyLeftMsg = t('onlyStockLeftAlert', {
        qty: catalogProduct.stockQuantity,
        unit: catalogProduct.unit,
      });
      setScanNotice(onlyLeftMsg);
      setTimeout(() => setScanNotice(null), 3000);
      const clamped = catalogProduct.stockQuantity;
      setQtyStrings((prev) => ({ ...prev, [productId]: String(clamped) }));
      setCartItems((prev) =>
        prev.map((item) =>
          item.productId === productId
            ? { ...item, quantity: clamped, total: roundMoney(clamped * item.sellPrice) }
            : item
        )
      );
      return;
    }

    setCartItems((prev) =>
      prev.map((item) =>
        item.productId === productId
          ? {
              ...item,
              quantity: safeQty,
              total: roundMoney(safeQty * item.sellPrice),
            }
          : item
      )
    );
  };

  // Direct keyboard typing in Rate box (allows "" blank state; treats "" as 0 for calculations only)
  const handleDirectRateInput = (productId: string, rawValue: string) => {
    setRateStrings((prev) => ({ ...prev, [productId]: rawValue }));

    if (rawValue.trim() === '') {
      setCartItems((prev) =>
        prev.map((item) =>
          item.productId === productId ? { ...item, sellPrice: 0, total: 0 } : item
        )
      );
      return;
    }

    const parsed = parseFloat(rawValue);
    if (Number.isNaN(parsed)) return;

    const safePrice = Math.max(0, parsed);
    setCartItems((prev) =>
      prev.map((item) =>
        item.productId === productId
          ? {
              ...item,
              sellPrice: safePrice,
              total: roundMoney(item.quantity * safePrice),
            }
          : item
      )
    );
  };

  // Auto-fill "0" when leaving a blank Qty/Rate/Discount input (onBlur OR when focusing another box)
  const commitBlankQty = (productId: string) => {
    const raw = qtyStrings[productId];
    if (raw === undefined) return;
    if (raw.trim() === '' || Number.isNaN(parseFloat(raw))) {
      setQtyStrings((prev) => ({ ...prev, [productId]: '0' }));
      setCartItems((prev) =>
        prev.map((item) =>
          item.productId === productId ? { ...item, quantity: 0, total: 0 } : item
        )
      );
    }
  };

  const commitBlankRate = (productId: string) => {
    const raw = rateStrings[productId];
    if (raw === undefined) return;
    if (raw.trim() === '' || Number.isNaN(parseFloat(raw))) {
      setRateStrings((prev) => ({ ...prev, [productId]: '0' }));
      setCartItems((prev) =>
        prev.map((item) =>
          item.productId === productId ? { ...item, sellPrice: 0, total: 0 } : item
        )
      );
    }
  };

  const flushBlankInputs = (exceptFieldKey?: string) => {
    const blankQtyIds = Object.keys(qtyStrings).filter(
      (id) => exceptFieldKey !== `qty:${id}` && qtyStrings[id].trim() === ''
    );
    const blankRateIds = Object.keys(rateStrings).filter(
      (id) => exceptFieldKey !== `rate:${id}` && rateStrings[id].trim() === ''
    );

    if (blankQtyIds.length > 0) {
      setQtyStrings((prev) => {
        const next = { ...prev };
        blankQtyIds.forEach((id) => {
          next[id] = '0';
        });
        return next;
      });
    }
    if (blankRateIds.length > 0) {
      setRateStrings((prev) => {
        const next = { ...prev };
        blankRateIds.forEach((id) => {
          next[id] = '0';
        });
        return next;
      });
    }
    if (blankQtyIds.length > 0 || blankRateIds.length > 0) {
      setCartItems((prev) =>
        prev.map((item) => {
          const resetQty = blankQtyIds.includes(item.productId);
          const resetRate = blankRateIds.includes(item.productId);
          if (!resetQty && !resetRate) return item;
          const nextQty = resetQty ? 0 : item.quantity;
          const nextPrice = resetRate ? 0 : item.sellPrice;
          return {
            ...item,
            quantity: nextQty,
            sellPrice: nextPrice,
            total: roundMoney(nextQty * nextPrice),
          };
        })
      );
    }
    if (exceptFieldKey !== 'discount' && discountAmount.trim() === '') {
      setDiscountAmount('0');
    }
  };

  const removeFromCart = (productId: string) => {
    setCartItems((prev) => prev.filter((item) => item.productId !== productId));
    setQtyStrings((prev) => {
      if (!(productId in prev)) return prev;
      const copy = { ...prev };
      delete copy[productId];
      return copy;
    });
    setRateStrings((prev) => {
      if (!(productId in prev)) return prev;
      const copy = { ...prev };
      delete copy[productId];
      return copy;
    });
  };

  const clearCart = () => {
    setCartItems([]);
    setQtyStrings({});
    setRateStrings({});
    setCustomerName('');
    setCustomerMobile('');
    setDiscountAmount('0');
    setBillNotes('');
    setActiveDraftMeta(null);
  };

  const handleBarcodeScanned = (scannedBarcode: string) => {
    setIsScannerOpen(false);
    const foundProduct = products.find(
      (p) => p.barcode.trim().toLowerCase() === scannedBarcode.trim().toLowerCase()
    );

    if (foundProduct) {
      addToCart(foundProduct, 1);
    } else {
      const notFoundMsg = t('barcodeNotFoundAlert', { barcode: scannedBarcode });
      setScanNotice(notFoundMsg);
      setTimeout(() => setScanNotice(null), 3500);
    }
  };

  // Calculations
  const subtotal = roundMoney(cartItems.reduce((acc, item) => acc + item.total, 0));
  const discount = Math.max(0, parseFloat(discountAmount) || 0);
  const grandTotal = roundMoney(Math.max(0, subtotal - discount));
  const totalPurchaseCost = roundMoney(
    cartItems.reduce((acc, item) => acc + item.purchasePrice * item.quantity, 0)
  );
  const totalProfit = roundMoney(grandTotal - totalPurchaseCost);

  // Checkout and create bill
  const handleCheckout = () => {
    flushBlankInputs();
    const billableItems = cartItems.filter((item) => item.quantity > 0);
    if (billableItems.length === 0) {
      alert(t('atLeastOneItemAlert'));
      return;
    }

    const billSubtotal = roundMoney(billableItems.reduce((acc, item) => acc + item.total, 0));
    const billDiscount = Math.max(0, parseFloat(discountAmount) || 0);
    const billGrandTotal = roundMoney(Math.max(0, billSubtotal - billDiscount));
    const billPurchaseCost = roundMoney(
      billableItems.reduce((acc, item) => acc + item.purchasePrice * item.quantity, 0)
    );
    const billProfit = roundMoney(billGrandTotal - billPurchaseCost);

    const billPayload = {
      customerName: customerName.trim() || undefined,
      customerMobile: customerMobile.trim() || undefined,
      items: billableItems,
      subtotal: billSubtotal,
      discount: billDiscount,
      grandTotal: billGrandTotal,
      paymentMode: isEstimate ? ('Cash' as PaymentMode) : paymentMode,
      totalPurchaseCost: billPurchaseCost,
      totalProfit: billProfit,
      notes: billNotes.trim() || undefined,
      isEstimate: isEstimate ? true : false,
      sourceOrderId: activeDraftMeta?.sourceOrderId,
      convertedFromEstimateId: activeDraftMeta?.sourceEstimateId,
    };

    const bill =
      activeDraftMeta?.mode === 'edit-bill' && activeDraftMeta.sourceBillId
        ? saveEditedBill(activeDraftMeta.sourceBillId, billPayload) || createBill(billPayload)
        : createBill(billPayload);

    try {
      confetti({
        particleCount: 80,
        spread: 60,
        origin: { y: 0.7 },
        colors: ['#f59e0b', '#10b981', '#3b82f6'],
      });
    } catch {
      // Ignore if confetti not supported
    }

    setCreatedBill(bill);
    setIsReceiptOpen(true);
    clearCart();
  };

  return (
    <div
      className="space-y-4"
      onFocusCapture={(e) => {
        const fieldKey = (e.target as HTMLElement | null)?.dataset?.fieldKey;
        flushBlankInputs(fieldKey);
      }}
    >
      {/* Action Header */}
      <div className="rounded-2xl bg-slate-900 p-4 text-white shadow-md flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs font-bold uppercase tracking-wider text-amber-400">
              {t('posCounterBadge')}
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
            {t('posTitle')}
          </h1>
          <p className="text-xs text-slate-400">
            {t('posSubtitle')}
          </p>
        </div>

        <button
          onClick={() => setIsScannerOpen(true)}
          className="flex items-center gap-2 rounded-xl bg-amber-500 hover:bg-amber-400 px-4 py-2.5 sm:py-3 text-slate-950 font-black text-sm sm:text-base shadow-lg transition active:scale-95 cursor-pointer"
        >
          <Camera className="h-5 w-5 stroke-[2.5]" />
          <span>{t('scanBarcodeBtn')}</span>
        </button>
      </div>

      {/* Draft Edit Banner (Order Billing, Estimate Conversion, or Bill Edit) */}
      {activeDraftMeta && (
        <div className="rounded-2xl bg-amber-50 border-2 border-amber-400 p-3.5 flex flex-wrap items-center justify-between gap-3 shadow-xs">
          <p className="text-xs sm:text-sm font-black text-amber-950">
            {activeDraftMeta.mode === 'order'
              ? t('billingOrderNotice', { orderNumber: activeDraftMeta.sourceOrderNumber || '' })
              : activeDraftMeta.mode === 'edit-bill'
              ? t('editingBillNotice', { billNumber: activeDraftMeta.sourceBillNumber || '' })
              : t('convertingEstimateNotice', { billNumber: activeDraftMeta.sourceEstimateNumber || '' })}
          </p>
          <button
            type="button"
            onClick={clearCart}
            className="flex items-center gap-1 rounded-xl bg-white border border-amber-300 hover:bg-amber-100 text-amber-950 font-bold text-xs px-3 py-1.5 cursor-pointer"
          >
            <XCircle className="h-3.5 w-3.5" />
            <span>{t('cancelDraftBtn')}</span>
          </button>
        </div>
      )}

      {scanNotice && (
        <div className="rounded-xl bg-emerald-600 px-4 py-2 text-white text-xs sm:text-sm font-bold flex items-center gap-2 shadow-sm animate-in fade-in">
          <Check className="h-4 w-4" />
          <span>{scanNotice}</span>
        </div>
      )}

      {/* Main Billing Split Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* LEFT COLUMN: Product Catalog */}
        <div className="lg:col-span-7 space-y-3">
          <div className="rounded-2xl bg-white p-3.5 shadow-sm border border-slate-200 space-y-2.5">
            <div className="relative">
              <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder={t('searchProductPlaceholder')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white pl-10 pr-4 py-2.5 text-sm font-medium text-slate-900 focus:border-amber-500 focus:ring-2 focus:ring-amber-200 outline-none"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-3 top-2.5 text-xs text-slate-400 hover:text-slate-600 bg-slate-200 rounded-full h-5 w-5 flex items-center justify-center"
                >
                  ✕
                </button>
              )}
            </div>

            <div className="flex gap-1.5 overflow-x-auto no-scrollbar py-0.5">
              <button
                onClick={() => setSelectedCat('ALL')}
                className={`px-3 py-1 rounded-lg text-xs font-bold whitespace-nowrap transition ${
                  selectedCat === 'ALL'
                    ? 'bg-amber-500 text-slate-950'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {t('all')} ({products.length})
              </button>
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCat(cat)}
                  className={`px-3 py-1 rounded-lg text-xs font-bold whitespace-nowrap transition ${
                    selectedCat === cat
                      ? 'bg-amber-500 text-slate-950'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Products Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-[560px] overflow-y-auto pr-1">
            {filteredProducts.length === 0 ? (
              <div className="col-span-2 rounded-2xl bg-white p-8 text-center border border-slate-200 text-slate-400">
                <Search className="h-8 w-8 mx-auto mb-2 text-slate-300" />
                <p className="font-bold text-slate-600">{t('noItemsFoundTitle')}</p>
                <p className="text-xs mt-1">{t('noItemsFoundSub')}</p>
              </div>
            ) : (
              filteredProducts.map((p) => {
                const inCart = cartItems.find((item) => item.productId === p.id);
                const isLowStock = p.stockQuantity <= p.lowStockLimit;
                const isOutOfStock = p.stockQuantity <= 0;

                return (
                  <div
                    key={p.id}
                    onClick={() => !isOutOfStock && !inCart && addToCart(p, 1)}
                    className={`rounded-2xl p-3 text-left transition relative border flex flex-col justify-between ${
                      isOutOfStock
                        ? 'bg-slate-100 border-slate-200 opacity-60 cursor-not-allowed'
                        : isLowStock
                        ? 'bg-red-50/70 border-red-300 hover:border-red-500 hover:shadow-md cursor-pointer'
                        : 'bg-white border-slate-200 hover:border-amber-400 hover:shadow-md cursor-pointer'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between gap-1 mb-1.5">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                          {p.company}
                        </span>
                        <span
                          className={`text-[10px] font-black px-1.5 py-0.5 rounded ${
                            isOutOfStock
                              ? 'bg-slate-200 text-slate-600'
                              : isLowStock
                              ? 'bg-amber-500 text-slate-950 font-extrabold shadow-2xs'
                              : 'bg-emerald-100 text-emerald-800'
                          }`}
                        >
                          {isOutOfStock
                            ? '0'
                            : isLowStock
                            ? t('lowStockBadgeText', { qty: p.stockQuantity })
                            : `${p.stockQuantity} ${p.unit}`}
                        </span>
                      </div>

                      <h4 className="font-bold text-slate-900 text-xs sm:text-sm line-clamp-2 leading-snug">
                        {p.name}
                      </h4>
                      <p className="text-[10px] font-mono text-slate-400 mt-0.5">
                        {t('codePrefix')} {p.barcode.slice(-6)}
                      </p>
                    </div>

                    {/* Bottom Pricing & Direct Qty Input / Quick Add */}
                    <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                      <div>
                        <span className="text-[10px] text-slate-400 block">{t('sellPriceTag')}</span>
                        <span className="text-base font-extrabold text-slate-900 font-mono">
                          ₹{p.sellPrice}
                        </span>
                      </div>

                      {inCart ? (
                        <div
                          onClick={(e) => e.stopPropagation()}
                          className="flex items-center gap-1 bg-emerald-50 border border-emerald-300 rounded-xl p-1"
                        >
                          <button
                            type="button"
                            onClick={() => updateCartQty(p.id, Math.max(0, inCart.quantity - 1))}
                            className="h-7 w-7 rounded-lg bg-white hover:bg-slate-100 text-slate-800 font-bold flex items-center justify-center shadow-2xs cursor-pointer"
                          >
                            <Minus className="h-3 w-3" />
                          </button>
                          <input
                            type="number"
                            step="any"
                            min="0"
                            data-field-key={`qty:${p.id}`}
                            value={qtyStrings[p.id] ?? String(inCart.quantity)}
                            onClick={(e) => e.stopPropagation()}
                            onChange={(e) => handleDirectQtyInput(p.id, e.target.value)}
                            onBlur={() => commitBlankQty(p.id)}
                            className="w-12 rounded-md border border-emerald-300 bg-white px-1 py-0.5 text-center font-mono text-xs font-black text-slate-900 outline-none focus:border-emerald-600"
                          />
                          <button
                            type="button"
                            onClick={() => updateCartQty(p.id, inCart.quantity + 1)}
                            className="h-7 w-7 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold flex items-center justify-center shadow-2xs cursor-pointer"
                          >
                            <Plus className="h-3 w-3" />
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (!isOutOfStock) addToCart(p, 1);
                          }}
                          disabled={isOutOfStock}
                          className="rounded-xl px-3 py-1.5 text-xs font-bold flex items-center gap-1 transition bg-amber-500 hover:bg-amber-400 text-slate-950 cursor-pointer disabled:opacity-40"
                        >
                          <Plus className="h-3.5 w-3.5" />
                          <span>{t('addItemBtn')}</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: The Live Bill / Cart */}
        <div className="lg:col-span-5">
          <div className="rounded-2xl bg-white shadow-lg border-2 border-amber-400 overflow-hidden sticky top-4">
            {/* Bill Header */}
            <div className="bg-linear-to-r from-amber-500 to-amber-600 p-3.5 text-slate-950 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-950 text-amber-400 font-black">
                  <ShoppingCart className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="font-black text-sm sm:text-base leading-none">
                    {t('currentBillTitle')} ({cartItems.length})
                  </h3>
                  <p className="text-[11px] text-amber-950 font-medium mt-0.5">
                    {shopInfo.name || t('appName')}
                  </p>
                </div>
              </div>

              {cartItems.length > 0 && (
                <button
                  onClick={clearCart}
                  className="rounded-lg bg-amber-400/80 hover:bg-amber-300 text-red-900 px-2 py-1 text-xs font-bold transition cursor-pointer"
                  title={t('clearAll')}
                >
                  {t('clearAll')}
                </button>
              )}
            </div>

            {/* Bill Type Selector: Final Bill vs Estimate / Quotation (disabled while converting an active draft) */}
            {!activeDraftMeta && (
              <div className="bg-slate-900 p-1.5 flex gap-1.5 border-b border-amber-400/40">
                <button
                  type="button"
                  onClick={() => setIsEstimate(false)}
                  className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-black transition text-center cursor-pointer ${
                    !isEstimate
                      ? 'bg-amber-500 text-slate-950 shadow-xs'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  ✓ {t('billTypeFinal')}
                </button>
                <button
                  type="button"
                  onClick={() => setIsEstimate(true)}
                  className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-black transition text-center cursor-pointer ${
                    isEstimate
                      ? 'bg-amber-400 text-slate-950 shadow-xs'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  📝 {t('billTypeEstimate')}
                </button>
              </div>
            )}

            {/* Estimate Banner if ON */}
            {isEstimate && (
              <div className="bg-amber-100 border-b border-amber-300 px-3 py-1.5 text-[11px] font-black text-amber-900 text-center uppercase tracking-wide">
                ⚠️ {t('estimateBadgeHeader')}
              </div>
            )}

            {/* Customer Details */}
            <div className="p-3 bg-amber-50/50 border-b border-amber-200 space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <div className="relative">
                  <User className="absolute left-2.5 top-3 h-4 w-4 text-slate-500" />
                  <input
                    type="text"
                    placeholder={t('customerNameLabel')}
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    style={{
                      color: '#000000',
                      fontWeight: 700,
                      fontSize: '16px',
                      backgroundColor: '#FFFFFF',
                    }}
                    className="w-full rounded-xl border-2 border-slate-400 pl-8 pr-2.5 py-2 text-base font-bold placeholder:text-[#888888] placeholder:font-normal focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none"
                  />
                </div>
                <div className="relative">
                  <Phone className="absolute left-2.5 top-3 h-4 w-4 text-slate-500" />
                  <input
                    type="tel"
                    placeholder={t('customerMobileLabel')}
                    value={customerMobile}
                    onChange={(e) => setCustomerMobile(e.target.value)}
                    style={{
                      color: '#000000',
                      fontWeight: 700,
                      fontSize: '16px',
                      backgroundColor: '#FFFFFF',
                    }}
                    className="w-full rounded-xl border-2 border-slate-400 pl-8 pr-2.5 py-2 text-base font-bold placeholder:text-[#888888] placeholder:font-normal focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none font-mono"
                  />
                </div>
              </div>
            </div>

            {/* Cart Items List with Direct Qty + Editable Rate */}
            <div className="p-3 max-h-[300px] overflow-y-auto divide-y divide-slate-100">
              {cartItems.length === 0 ? (
                <div className="py-12 text-center text-slate-400">
                  <ShoppingCart className="h-10 w-10 mx-auto mb-2 text-slate-300 stroke-[1.5]" />
                  <p className="font-bold text-slate-600 text-sm">{t('emptyCart')}</p>
                  <p className="text-xs text-slate-400 mt-1 max-w-[200px] mx-auto">
                    {t('emptyCartSub')}
                  </p>
                </div>
              ) : (
                cartItems.map((item) => (
                  <div key={item.productId} className="py-2.5 space-y-1.5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <h5 className="font-bold text-xs text-slate-900 truncate">
                            {item.productName}
                          </h5>
                          {item.isCustomItem && (
                            <span className="bg-amber-100 text-amber-800 text-[9px] font-black px-1.5 py-0.2 rounded">
                              {t('customTag')}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="font-bold text-slate-900 font-mono text-xs">
                          ₹{item.total.toFixed(2)}
                        </span>
                        <button
                          type="button"
                          onClick={() => removeFromCart(item.productId)}
                          className="h-6 w-6 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 flex items-center justify-center transition cursor-pointer"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Editable Rate + Direct Qty Stepper */}
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-1 text-[11px] text-slate-600">
                        <span className="font-semibold">{t('itemRateShort')}: ₹</span>
                        <input
                          type="number"
                          step="any"
                          min="0"
                          data-field-key={`rate:${item.productId}`}
                          value={rateStrings[item.productId] ?? String(item.sellPrice)}
                          onChange={(e) => handleDirectRateInput(item.productId, e.target.value)}
                          onBlur={() => commitBlankRate(item.productId)}
                          className="w-16 rounded-lg border border-slate-300 bg-white px-1.5 py-0.5 text-xs font-bold font-mono text-slate-900 focus:border-amber-500 outline-none"
                        />
                        <span className="text-[10px] text-slate-400">/ {item.unit}</span>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => updateCartQty(item.productId, Math.round((item.quantity - 1) * 1000) / 1000)}
                          className="h-7 w-7 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold flex items-center justify-center transition cursor-pointer"
                        >
                          <Minus className="h-3 w-3" />
                        </button>
                        <input
                          type="number"
                          step="any"
                          min="0"
                          data-field-key={`qty:${item.productId}`}
                          value={qtyStrings[item.productId] ?? String(item.quantity)}
                          onChange={(e) => handleDirectQtyInput(item.productId, e.target.value)}
                          onBlur={() => commitBlankQty(item.productId)}
                          className="w-14 rounded-lg border border-slate-300 bg-white px-1 py-0.5 text-center text-xs font-black font-mono text-slate-900 focus:border-amber-500 outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => updateCartQty(item.productId, Math.round((item.quantity + 1) * 1000) / 1000)}
                          className="h-7 w-7 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold flex items-center justify-center transition cursor-pointer"
                        >
                          <Plus className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Add Custom Item / Weight Item button */}
            <div className="px-3 pb-2 pt-1 border-t border-dashed border-slate-200">
              <button
                type="button"
                onClick={() => setIsCustomModalOpen(true)}
                className="w-full py-2 px-3 rounded-xl border border-dashed border-amber-500 bg-amber-50/70 hover:bg-amber-100 text-amber-900 font-extrabold text-xs transition flex items-center justify-center gap-1.5 cursor-pointer active:scale-98"
              >
                <Plus className="h-4 w-4 text-amber-600 stroke-[3]" />
                <span>{t('addCustomItemBtn')}</span>
              </button>
            </div>

            {/* Calculations & Payment Mode (Payment Mode HIDDEN in Estimate Mode!) */}
            <div className="bg-slate-50 p-3.5 border-t border-slate-200 space-y-2.5">
              <div className="space-y-1 text-xs">
                <div className="flex justify-between text-slate-600 font-medium">
                  <span>{t('subtotalLabel')}</span>
                  <span className="font-mono font-bold">₹{subtotal.toFixed(2)}</span>
                </div>

                <div className="flex justify-between items-center text-slate-700 font-medium">
                  <span>{t('discountLabel')}</span>
                  <input
                    type="number"
                    min="0"
                    placeholder="0"
                    data-field-key="discount"
                    value={discountAmount}
                    onChange={(e) => setDiscountAmount(e.target.value)}
                    onBlur={() => {
                      if (discountAmount.trim() === '') setDiscountAmount('0');
                    }}
                    className="w-20 rounded-lg border border-slate-300 bg-white px-2 py-0.5 text-right font-mono text-xs font-bold text-slate-900 focus:border-amber-500 outline-none"
                  />
                </div>
              </div>

              <div className="rounded-xl bg-amber-500/20 border border-amber-300 p-2.5 flex justify-between items-center">
                <span className="text-sm font-black text-slate-900">
                  {t('grandTotalLabel')}
                </span>
                <span className="text-xl font-black text-slate-950 font-mono">
                  ₹{grandTotal.toFixed(2)}
                </span>
              </div>

              {/* Bill-level Serial Numbers / Note (Optional) */}
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                  {t('serialNoteSectionTitle')}
                </label>
                <textarea
                  ref={noteTextareaRef}
                  rows={3}
                  value={billNotes}
                  onChange={(e) => setBillNotes(e.target.value)}
                  placeholder={t('serialNotePlaceholder')}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs sm:text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none resize-none overflow-hidden leading-snug"
                  style={{ minHeight: '76px' }}
                />
              </div>

              {/* Payment Mode (Cash / UPI / Credit) — ONLY when NOT in Estimate mode */}
              {!isEstimate && (
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                    {t('paymentModeLabel')}
                  </label>
                  <div className="grid grid-cols-3 gap-1.5">
                    {(['Cash', 'UPI', 'Udhar'] as PaymentMode[]).map((mode) => (
                      <button
                        key={mode}
                        type="button"
                        onClick={() => setPaymentMode(mode)}
                        className={`py-2 px-1 rounded-xl text-xs font-black transition text-center cursor-pointer ${
                          paymentMode === mode
                            ? mode === 'Cash'
                              ? 'bg-emerald-600 text-white shadow-sm'
                              : mode === 'UPI'
                              ? 'bg-blue-600 text-white shadow-sm'
                              : 'bg-rose-600 text-white shadow-sm'
                            : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {mode === 'Cash' && t('payCash')}
                        {mode === 'UPI' && t('payUpi')}
                        {mode === 'Udhar' && t('payUdhar')}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Submit Button */}
              <button
                type="button"
                onClick={handleCheckout}
                disabled={cartItems.length === 0}
                className={`w-full rounded-2xl ${
                  isEstimate
                    ? 'bg-amber-500 hover:bg-amber-400 text-slate-950'
                    : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                } disabled:opacity-50 py-3.5 px-4 font-black text-base shadow-lg transition active:scale-98 flex items-center justify-center gap-2 cursor-pointer`}
              >
                <Check className="h-6 w-6 stroke-[3]" />
                <span>
                  {activeDraftMeta?.mode === 'edit-bill'
                    ? t('updateBillBtn')
                    : isEstimate
                    ? t('saveEstimateBtn')
                    : t('completeBillBtn')}
                </span>
              </button>
              <p className="text-[10px] text-center text-slate-500">
                {isEstimate ? t('estimateStockNotice') : t('autoStockNotice')}
              </p>

              <div className="h-24 sm:h-0 w-full shrink-0 pointer-events-none" aria-hidden="true" />
            </div>
          </div>
        </div>
      </div>

      {/* Custom Item / Weight Item Modal */}
      {isCustomModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-extrabold text-slate-900 text-base">
                ⚖️ {t('customItemTitle')}
              </h3>
              <button
                onClick={() => setIsCustomModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddCustomItem} className="mt-4 space-y-3">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-600 mb-1">
                  {t('customItemName')} <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder={t('customItemNamePlaceholder')}
                  value={customItemName}
                  onChange={(e) => setCustomItemName(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-bold text-slate-900 focus:border-amber-500 outline-none"
                  autoFocus
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-600 mb-1">
                    {t('weightOrQty')} <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="any"
                    min="0.001"
                    required
                    placeholder={t('weightQtyPlaceholder')}
                    value={customWeightOrQty}
                    onChange={(e) => setCustomWeightOrQty(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-bold text-slate-900 focus:border-amber-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-slate-600 mb-1">
                    {t('unitLabel')}
                  </label>
                  <select
                    value={customUnit}
                    onChange={(e) => setCustomUnit(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-bold text-slate-900 focus:border-amber-500 outline-none"
                  >
                    <option value="KG">{t('unitKgLabel')}</option>
                    <option value="Gram">{t('unitGramLabel')}</option>
                    <option value="Piece">{t('unitPcsLabel')}</option>
                    <option value="Meter">{t('unitMeterLabel')}</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-600 mb-1">
                  {t('ratePerUnit')} <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  step="any"
                  min="0"
                  required
                  placeholder={t('ratePerUnitPlaceholder')}
                  value={customRate}
                  onChange={(e) => setCustomRate(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-bold text-slate-900 focus:border-amber-500 outline-none"
                />
              </div>

              {parseFloat(customWeightOrQty) > 0 && parseFloat(customRate) > 0 && (
                <div className="rounded-xl bg-amber-50 p-2.5 border border-amber-200 flex items-center justify-between text-xs font-bold">
                  <span className="text-slate-600">{t('totalLabelInline')}</span>
                  <span className="text-base font-black text-amber-950 font-mono">
                    ₹{customUnit === 'Gram'
                      ? ((parseFloat(customWeightOrQty) / 1000) * parseFloat(customRate)).toFixed(2)
                      : (parseFloat(customWeightOrQty) * parseFloat(customRate)).toFixed(2)}
                  </span>
                </div>
              )}

              <label className="flex items-center gap-2 pt-1 text-xs font-semibold text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={saveToProductList}
                  onChange={(e) => setSaveToProductList(e.target.checked)}
                  className="rounded border-slate-300 text-amber-500 focus:ring-amber-400 h-4 w-4"
                />
                <span>{t('saveToProductListOptional')}</span>
              </label>

              <div className="pt-3 border-t border-slate-100 flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsCustomModalOpen(false)}
                  className="flex-1 rounded-xl bg-slate-100 px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-200 transition cursor-pointer"
                >
                  {t('cancel')}
                </button>
                <button
                  type="submit"
                  className="flex-1 rounded-xl bg-amber-500 px-4 py-2.5 text-xs font-black text-slate-950 hover:bg-amber-400 transition cursor-pointer"
                >
                  {t('addToBillAction')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Expired Product Warning Dialog */}
      {expiredWarningProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl border-2 border-red-500 animate-in zoom-in-95">
            <div className="text-center">
              <span className="text-3xl">⚠️</span>
              <h3 className="font-black text-red-600 text-base mt-2">
                {t('expiredTag')}!
              </h3>
              <p className="text-xs text-slate-600 mt-2 font-medium">
                "{expiredWarningProduct.product.name}" {t('expiredSellWarning')}
              </p>
              <p className="text-[11px] font-mono text-red-500 mt-1">
                {t('expiryBadgePrefix')} {expiredWarningProduct.product.expiryDate}
              </p>
            </div>

            <div className="mt-5 flex gap-2">
              <button
                type="button"
                onClick={() => setExpiredWarningProduct(null)}
                className="flex-1 rounded-xl bg-slate-100 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-200 transition cursor-pointer"
              >
                ✕ {t('cancel')}
              </button>
              <button
                type="button"
                onClick={() => {
                  const target = expiredWarningProduct;
                  setExpiredWarningProduct(null);
                  addToCart(target.product, target.qty, true);
                }}
                className="flex-1 rounded-xl bg-red-600 hover:bg-red-700 py-2.5 text-xs font-black text-white transition cursor-pointer"
              >
                {t('yesSellBtn')}
              </button>
            </div>
          </div>
        </div>
      )}

      <BarcodeScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onScanSuccess={handleBarcodeScanned}
        title={t('scanBarcodeSearchTitle')}
        subtitle={t('scanBarcodeSearchSub')}
      />

      <BillReceiptModal
        bill={createdBill}
        isOpen={isReceiptOpen}
        onClose={() => setIsReceiptOpen(false)}
        isNewBill={true}
      />
    </div>
  );
};
