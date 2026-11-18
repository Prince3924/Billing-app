import React, { useState, useMemo, useEffect } from 'react';
import {
  Search,
  Plus,
  Minus,
  ShoppingBag,
  Phone,
  MapPin,
  MessageSquare,
  Check,
  AlertCircle,
  Store,
  WifiOff,
  Loader2,
} from 'lucide-react';
import { useShop } from '../context/ShopContext';
import { ShopLogo } from './ShopLogo';
import { Product, ShopInfo, CustomerOrder, OrderMessageSettings } from '../types';
import {
  generateOrderConfirmationImage,
  buildOrderWhatsAppText,
} from '../utils/orderImageGenerator';

function getShopIdFromUrl(): string | null {
  if (typeof window === 'undefined') return null;
  const hash = window.location.hash;
  const qIndex = hash.indexOf('?');
  if (qIndex !== -1) {
    const params = new URLSearchParams(hash.substring(qIndex + 1));
    const shop = params.get('shop');
    if (shop) return shop;
  }
  const searchParams = new URLSearchParams(window.location.search);
  const shop = searchParams.get('shop');
  if (shop) return shop;
  return null;
}

function roundQty(val: number): number {
  return Math.round(Math.max(0, val) * 1000) / 1000;
}

function roundMoney(val: number): number {
  return Math.round(val * 100) / 100;
}

interface CachedPublicCatalog {
  shopInfo: ShopInfo;
  products: Product[];
  cachedAt: string;
}

function triggerPngDownload(dataUrl: string, filename: string) {
  const link = document.createElement('a');
  link.href = dataUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export const CustomerOrderPublicPage: React.FC = () => {
  const {
    products: localProducts,
    shopInfo: localShopInfo,
    registerLocalCustomerOrder,
    language,
    setLanguage,
    t,
  } = useShop();

  const urlShopId = useMemo(() => getShopIdFromUrl(), []);
  const effectiveShopId = urlShopId || localShopInfo.id || 'default';
  const cacheStorageKey = `public_shop_cache_${effectiveShopId}`;

  const [shopData, setShopData] = useState<{
    shopInfo: ShopInfo;
    products: Product[];
  } | null>(null);
  const [isLoadingShop, setIsLoadingShop] = useState<boolean>(true);
  const [isOfflineCacheUsed, setIsOfflineCacheUsed] = useState<boolean>(false);
  const [shopNotFound, setShopNotFound] = useState<boolean>(false);

  // Offline-first public catalog loader + background cloud refresh
  useEffect(() => {
    let cancelled = false;
    setShopNotFound(false);
    setIsOfflineCacheUsed(false);

    if (!urlShopId) {
      setShopData({
        shopInfo: localShopInfo,
        products: localProducts,
      });
      setIsLoadingShop(false);
      return;
    }

    // 1. Immediately hydrate from localStorage cache if available so offline mode works seamlessly
    let hadCache = false;
    try {
      const rawCache = localStorage.getItem(cacheStorageKey);
      if (rawCache) {
        const parsed = JSON.parse(rawCache) as CachedPublicCatalog;
        if (parsed && parsed.shopInfo && Array.isArray(parsed.products)) {
          setShopData({ shopInfo: parsed.shopInfo, products: parsed.products });
          setIsLoadingShop(false);
          hadCache = true;
        }
      }
    } catch {
      // Ignore cache read error
    }

    if (!hadCache) {
      setIsLoadingShop(true);
    }

    // 2. Refresh live catalog from cloud database
    fetch(`/api/public/shop/${encodeURIComponent(urlShopId)}`)
      .then(async (res) => {
        if (res.status === 404) {
          throw new Error('NOT_FOUND');
        }
        if (!res.ok) {
          throw new Error('FETCH_FAILED');
        }
        return res.json();
      })
      .then((data) => {
        if (cancelled) return;
        const freshData = {
          shopInfo: data.shopInfo as ShopInfo,
          products: (data.products || []) as Product[],
        };
        setShopData(freshData);
        setIsOfflineCacheUsed(false);
        setShopNotFound(false);
        setIsLoadingShop(false);

        try {
          const toCache: CachedPublicCatalog = {
            ...freshData,
            cachedAt: new Date().toISOString(),
          };
          localStorage.setItem(cacheStorageKey, JSON.stringify(toCache));
        } catch {
          // Ignore quota issues
        }
      })
      .catch((err) => {
        if (cancelled) return;
        if (localShopInfo.id === urlShopId) {
          setShopData({
            shopInfo: localShopInfo,
            products: localProducts,
          });
          setIsOfflineCacheUsed(!hadCache && err?.message !== 'NOT_FOUND');
          setIsLoadingShop(false);
          return;
        }

        if (hadCache) {
          setIsOfflineCacheUsed(true);
          setIsLoadingShop(false);
          return;
        }

        setShopNotFound(true);
        setIsLoadingShop(false);
      });

    return () => {
      cancelled = true;
    };
  }, [urlShopId, cacheStorageKey, localShopInfo, localProducts]);

  const activeShopInfo = shopData?.shopInfo || localShopInfo;
  const activeProducts = shopData?.products || localProducts;

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [cart, setCart] = useState<Record<string, number>>({});
  const [qtyInputs, setQtyInputs] = useState<Record<string, string>>({});
  const [customerName, setCustomerName] = useState('');
  const [customerMobile, setCustomerMobile] = useState('');
  const [submittedOrderNumber, setSubmittedOrderNumber] = useState<string | null>(null);
  const [submittedPreviewImage, setSubmittedPreviewImage] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isSubmittingOrder, setIsSubmittingOrder] = useState<boolean>(false);

  const categories = useMemo(() => {
    const cats = Array.from(new Set(activeProducts.map((p) => p.category).filter(Boolean)));
    return ['All', ...cats];
  }, [activeProducts]);

  const filteredProducts = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return activeProducts.filter((p) => {
      const matchesSearch =
        p.name.toLowerCase().includes(q) ||
        p.company.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q);
      const matchesCat = selectedCategory === 'All' || p.category === selectedCategory;
      return matchesSearch && matchesCat;
    });
  }, [activeProducts, searchQuery, selectedCategory]);

  const setProductQuantity = (productId: string, newQty: number) => {
    const rounded = roundQty(newQty);
    if (rounded <= 0) {
      setCart((prev) => {
        const copy = { ...prev };
        delete copy[productId];
        return copy;
      });
      setQtyInputs((prev) => {
        const copy = { ...prev };
        delete copy[productId];
        return copy;
      });
      return;
    }

    setCart((prev) => ({ ...prev, [productId]: rounded }));
    setQtyInputs((prev) => ({ ...prev, [productId]: String(rounded) }));
  };

  const handleUpdateQtyDelta = (productId: string, delta: number) => {
    const current = cart[productId] || 0;
    setProductQuantity(productId, current + delta);
  };

  const handleDirectQtyInput = (productId: string, rawValue: string) => {
    setQtyInputs((prev) => ({ ...prev, [productId]: rawValue }));
    if (rawValue.trim() === '') {
      setCart((prev) => {
        const copy = { ...prev };
        delete copy[productId];
        return copy;
      });
      return;
    }
    const parsed = parseFloat(rawValue);
    if (!Number.isNaN(parsed)) {
      if (parsed <= 0) {
        setCart((prev) => {
          const copy = { ...prev };
          delete copy[productId];
          return copy;
        });
      } else {
        setCart((prev) => ({ ...prev, [productId]: roundQty(parsed) }));
      }
    }
  };

  const handleQtyBlur = (productId: string) => {
    const raw = qtyInputs[productId];
    if (raw === undefined) return;
    if (raw.trim() === '' || Number.isNaN(parseFloat(raw))) {
      setQtyInputs((prev) => ({ ...prev, [productId]: '0' }));
      setCart((prev) => {
        const copy = { ...prev };
        delete copy[productId];
        return copy;
      });
      return;
    }
    const parsed = parseFloat(raw);
    if (parsed <= 0) {
      setQtyInputs((prev) => ({ ...prev, [productId]: '0' }));
      setCart((prev) => {
        const copy = { ...prev };
        delete copy[productId];
        return copy;
      });
    } else {
      setProductQuantity(productId, parsed);
    }
  };

  const flushBlankQtyInputs = (exceptFieldKey?: string) => {
    const blankIds = Object.keys(qtyInputs).filter(
      (id) => exceptFieldKey !== `pubqty:${id}` && qtyInputs[id].trim() === ''
    );
    if (blankIds.length === 0) return;
    setQtyInputs((prev) => {
      const next = { ...prev };
      blankIds.forEach((id) => {
        next[id] = '0';
      });
      return next;
    });
    setCart((prev) => {
      const copy = { ...prev };
      blankIds.forEach((id) => {
        delete copy[id];
      });
      return copy;
    });
  };

  const cartItems = useMemo(() => {
    return Object.entries(cart)
      .map(([id, qty]) => {
        const product = activeProducts.find((p) => p.id === id);
        return {
          product,
          qty,
          total: roundMoney((product?.sellPrice || 0) * qty),
        };
      })
      .filter((item): item is { product: Product; qty: number; total: number } =>
        Boolean(item.product && item.qty > 0)
      );
  }, [cart, activeProducts]);

  const grandTotal = roundMoney(cartItems.reduce((acc, item) => acc + item.total, 0));
  const totalItemCount = roundQty(cartItems.reduce((acc, item) => acc + item.qty, 0));

  // Send Order: 1. Save to Cloud DB FIRST, 2. Trigger WhatsApp / Order Card per owner settings
  const handleSendOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmittingOrder) return;
    setValidationError(null);

    if (cartItems.length === 0) {
      setValidationError(t('emptyCartPrompt'));
      return;
    }

    if (!customerName.trim() || !customerMobile.trim()) {
      setValidationError(t('pleaseEnterNameMobile'));
      return;
    }

    const cleanPhone = customerMobile.replace(/\D/g, '');
    if (cleanPhone.length < 10) {
      setValidationError(t('pleaseEnterNameMobile'));
      return;
    }

    setIsSubmittingOrder(true);

    const orderItems = cartItems.map((item) => ({
      productId: item.product.id,
      productName: item.product.name,
      quantity: item.qty,
      unit: item.product.unit,
      rate: item.product.sellPrice,
      total: item.total,
    }));

    const orderId = `ord_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const orderNum = `ORD-${Math.floor(1000 + Math.random() * 9000)}`;
    const nowIso = new Date().toISOString();

    const orderPayload: CustomerOrder = {
      id: orderId,
      shopId: effectiveShopId,
      orderNumber: orderNum,
      date: nowIso,
      customerName: customerName.trim(),
      customerMobile: cleanPhone,
      items: orderItems,
      grandTotal,
      status: 'New',
    };

    // STEP 1: Persist to Cloud Database FIRST
    let finalOrder: CustomerOrder = orderPayload;
    try {
      const response = await fetch(
        `/api/public/shop/${encodeURIComponent(effectiveShopId)}/orders`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(orderPayload),
        }
      );
      if (response.ok) {
        const resData = await response.json().catch(() => null);
        if (resData?.order) {
          finalOrder = { ...orderPayload, ...resData.order };
        }
      }
    } catch {
      // Offline or unreachable — proceed with client payload cleanly
    }

    // Register locally ONLY if customer is ordering on the shopkeeper's own device
    if (effectiveShopId === localShopInfo.id) {
      registerLocalCustomerOrder(finalOrder);
    }

    // STEP 2: Format & deliver Order Message according to Owner's Order Message Settings
    const msgSettings: OrderMessageSettings = activeShopInfo.orderMessageSettings || {
      messageType: 'both',
      messageLanguage: language,
      showLogo: true,
      showMobile: true,
    };

    const msgLang = msgSettings.messageLanguage || language;
    const msgType = msgSettings.messageType || 'both';
    const waText = buildOrderWhatsAppText(finalOrder, activeShopInfo, msgLang);

    const shopPhone = (activeShopInfo.mobile || '').replace(/\D/g, '');
    const formattedShopPhone = shopPhone.length === 10 ? '91' + shopPhone : shopPhone;
    const waUrl = formattedShopPhone
      ? `https://wa.me/${formattedShopPhone}?text=${encodeURIComponent(waText)}`
      : `https://wa.me/?text=${encodeURIComponent(waText)}`;

    let previewDataUrl: string | null = null;

    if (msgType === 'image' || msgType === 'both') {
      try {
        const card = await generateOrderConfirmationImage(finalOrder, activeShopInfo, msgLang);
        previewDataUrl = card.dataUrl;

        const canNativeShare =
          typeof navigator !== 'undefined' &&
          typeof navigator.share === 'function' &&
          typeof navigator.canShare === 'function' &&
          navigator.canShare({ files: [card.file] });

        if (canNativeShare) {
          try {
            await navigator.share({
              files: [card.file],
              title: finalOrder.orderNumber,
              ...(msgType === 'both' ? { text: card.textMessage } : {}),
            });
          } catch {
            // User dismissed native share sheet -> open WhatsApp fallback cleanly
            triggerPngDownload(card.dataUrl, `Order-${finalOrder.orderNumber}.png`);
            if (msgType === 'both') {
              window.open(waUrl, '_blank');
            } else {
              window.open(
                formattedShopPhone
                  ? `https://wa.me/${formattedShopPhone}`
                  : 'https://wa.me/',
                '_blank'
              );
            }
          }
        } else {
          triggerPngDownload(card.dataUrl, `Order-${finalOrder.orderNumber}.png`);
          window.open(waUrl, '_blank');
        }
      } catch {
        window.open(waUrl, '_blank');
      }
    } else {
      window.open(waUrl, '_blank');
    }

    setSubmittedOrderNumber(finalOrder.orderNumber);
    setSubmittedPreviewImage(previewDataUrl);
    setCart({});
    setQtyInputs({});
    setCustomerName('');
    setCustomerMobile('');
    setIsSubmittingOrder(false);
  };

  if (isLoadingShop) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
        <div className="h-10 w-10 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mb-3" />
        <h3 className="font-black text-slate-800 text-sm">{t('loadingRateListTitle')}</h3>
        <p className="text-xs text-slate-500 mt-1">{t('loadingRateListSub')}</p>
      </div>
    );
  }

  if (shopNotFound && !shopData) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
        <div className="h-14 w-14 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center mb-3">
          <Store className="h-7 w-7" />
        </div>
        <h2 className="text-lg font-black text-slate-900 mb-1">{t('shopNotFoundTitle')}</h2>
        {urlShopId && (
          <span className="text-[11px] font-mono bg-slate-200 px-2.5 py-1 rounded-full text-slate-700 mt-2">
            {t('shopIdColon')} {urlShopId}
          </span>
        )}
      </div>
    );
  }

  return (
    <div
      className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans pb-36"
      onFocusCapture={(e) => {
        const fieldKey = (e.target as HTMLElement | null)?.dataset?.fieldKey;
        flushBlankQtyInputs(fieldKey);
      }}
    >
      {/* Top Banner / Public Store Header — NEVER displays any Dashboard link */}
      <header className="bg-slate-950 text-white shadow-lg sticky top-0 z-30">
        <div className="max-w-2xl mx-auto px-4 py-3.5 flex items-center justify-between gap-2 sm:gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <ShopLogo shopInfo={activeShopInfo} size={44} forceShow={true} />
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded border border-emerald-400/20 flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  {t('liveRateListTag')}
                </span>
              </div>
              <h1 className="text-base sm:text-lg font-black text-white truncate leading-tight mt-0.5">
                {activeShopInfo.name || t('appName')}
              </h1>
              {activeShopInfo.address && (
                <p className="text-[11px] text-slate-300 truncate flex items-center gap-1">
                  <MapPin className="h-3 w-3 text-amber-400 shrink-0" />
                  <span className="truncate">{activeShopInfo.address}</span>
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {activeShopInfo.mobile && (
              <a
                href={`tel:${activeShopInfo.mobile}`}
                className="h-9 w-9 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white flex items-center justify-center shadow-xs transition active:scale-95"
                title={t('callShopBtn')}
              >
                <Phone className="h-4 w-4" />
              </a>
            )}

            {/* Full Readable Language Switcher */}
            <div className="flex bg-slate-900 border border-slate-700 rounded-xl p-0.5 text-[10px] sm:text-[11px] font-bold">
              {(['english', 'hindi', 'hinglish'] as const).map((lang) => (
                <button
                  key={lang}
                  type="button"
                  onClick={() => setLanguage(lang)}
                  className={`px-2 py-1 rounded-lg transition cursor-pointer ${
                    language === lang
                      ? 'bg-amber-500 text-slate-950 font-black'
                      : 'text-slate-300 hover:text-white'
                  }`}
                >
                  {lang === 'english' ? 'English' : lang === 'hindi' ? 'हिंदी' : 'Hinglish'}
                </button>
              ))}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-2xl w-full mx-auto px-4 py-4 space-y-4">
        {/* Offline Cached Catalog Indicator */}
        {isOfflineCacheUsed && (
          <div className="rounded-xl bg-amber-50 border border-amber-300 px-3.5 py-2 text-amber-950 text-xs font-bold flex items-center gap-2">
            <WifiOff className="h-4 w-4 text-amber-700 shrink-0" />
            <span>{t('offlineCatalogNotice')}</span>
          </div>
        )}

        {/* Order Success Banner — ONLY "Place Another Order" & "Back to Rate List", ZERO Dashboard link */}
        {submittedOrderNumber && (
          <div className="rounded-2xl bg-emerald-600 text-white p-5 shadow-lg space-y-3 text-center">
            <div className="flex items-center justify-center gap-2 font-black text-base sm:text-lg">
              <Check className="h-6 w-6 stroke-[3]" />
              <span>{t('orderSentSuccessBanner')}</span>
            </div>
            <p className="text-xs sm:text-sm text-emerald-100">
              {t('orderIdLabel')}{' '}
              <strong className="font-mono text-white text-base">#{submittedOrderNumber}</strong>
            </p>
            <p className="text-xs text-emerald-100 max-w-md mx-auto">
              {t('orderSentWhatsAppNote')}
            </p>

            {submittedPreviewImage && (
              <div className="max-w-xs mx-auto rounded-xl overflow-hidden border-2 border-emerald-300/60 shadow-md bg-white">
                <img
                  src={submittedPreviewImage}
                  alt={submittedOrderNumber}
                  className="w-full h-auto block"
                />
              </div>
            )}

            <div className="flex flex-wrap items-center justify-center gap-2.5 pt-1">
              <button
                type="button"
                onClick={() => {
                  setSubmittedOrderNumber(null);
                  setSubmittedPreviewImage(null);
                }}
                className="text-xs font-black bg-white text-emerald-950 px-4 py-2.5 rounded-xl shadow-xs hover:bg-emerald-50 transition cursor-pointer active:scale-95"
              >
                {t('orderAgainBtn')}
              </button>
              <button
                type="button"
                onClick={() => {
                  setSubmittedOrderNumber(null);
                  setSubmittedPreviewImage(null);
                  if (typeof window !== 'undefined') {
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }
                }}
                className="text-xs font-bold bg-emerald-700/90 hover:bg-emerald-700 text-white border border-emerald-400/40 px-4 py-2.5 rounded-xl transition cursor-pointer active:scale-95"
              >
                {t('backToRateListBtn')}
              </button>
            </div>
          </div>
        )}

        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder={t('searchProductsPrompt')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-2xl border border-slate-300 bg-white pl-10 pr-8 py-2.5 text-xs font-semibold text-slate-900 shadow-xs focus:border-amber-500 outline-none"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-3.5 top-2.5 text-xs font-bold text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              ✕
            </button>
          )}
        </div>

        {/* Categories Bar */}
        {categories.length > 2 && (
          <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition cursor-pointer ${
                  selectedCategory === cat
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                }`}
              >
                {cat === 'All' ? t('all') : cat}
              </button>
            ))}
          </div>
        )}

        {/* Products Catalog List */}
        <div className="rounded-2xl bg-white border border-slate-200 shadow-xs divide-y divide-slate-100 overflow-hidden">
          {filteredProducts.length === 0 ? (
            <div className="p-8 text-center text-slate-400">
              <ShoppingBag className="h-10 w-10 mx-auto mb-2 text-slate-300" />
              <p className="font-bold text-slate-600 text-sm">{t('noProductsFound')}</p>
              <p className="text-xs text-slate-400 mt-1">{t('tryDifferentSearch')}</p>
            </div>
          ) : (
            filteredProducts.map((prod) => {
              const qty = cart[prod.id] || 0;
              const inputStr = qtyInputs[prod.id] !== undefined ? qtyInputs[prod.id] : String(qty);

              return (
                <div
                  key={prod.id}
                  className="p-3.5 flex items-center justify-between gap-3 hover:bg-slate-50 transition"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-11 w-11 rounded-xl bg-amber-100 flex items-center justify-center font-black text-amber-800 text-sm shrink-0 border border-amber-200 overflow-hidden">
                      {prod.photoUrl ? (
                        <img
                          src={prod.photoUrl}
                          alt={prod.name}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        '⚡'
                      )}
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-black text-xs sm:text-sm text-slate-900 truncate">
                        {prod.name}
                      </h3>
                      <p className="text-[11px] text-slate-500 truncate">
                        {prod.company} • {prod.category}
                      </p>
                      <div className="font-mono font-black text-sm text-emerald-700 mt-0.5">
                        ₹{prod.sellPrice}{' '}
                        <span className="text-[11px] font-normal text-slate-500">/ {prod.unit}</span>
                      </div>
                    </div>
                  </div>

                  {/* Direct Qty Stepper with editable input */}
                  <div className="shrink-0">
                    {qty > 0 || qtyInputs[prod.id] !== undefined ? (
                      <div className="flex items-center gap-1 bg-amber-50 border border-amber-300 rounded-xl p-1">
                        <button
                          type="button"
                          onClick={() => handleUpdateQtyDelta(prod.id, -1)}
                          className="h-7 w-7 rounded-lg bg-white text-slate-800 font-bold flex items-center justify-center shadow-xs active:scale-95 transition cursor-pointer"
                        >
                          <Minus className="h-3.5 w-3.5" />
                        </button>
                        <input
                          type="number"
                          step="any"
                          min="0"
                          data-field-key={`pubqty:${prod.id}`}
                          value={inputStr}
                          onChange={(e) => handleDirectQtyInput(prod.id, e.target.value)}
                          onBlur={() => handleQtyBlur(prod.id)}
                          aria-label={t('qty')}
                          className="w-12 rounded-md border border-amber-200 bg-white px-1 py-0.5 text-center font-mono font-black text-xs text-slate-900 outline-none focus:border-amber-500"
                        />
                        <button
                          type="button"
                          onClick={() => handleUpdateQtyDelta(prod.id, 1)}
                          className="h-7 w-7 rounded-lg bg-amber-500 text-slate-950 font-bold flex items-center justify-center shadow-xs active:scale-95 transition cursor-pointer"
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setProductQuantity(prod.id, 1)}
                        className="rounded-xl bg-slate-100 hover:bg-amber-500 hover:text-slate-950 text-slate-800 font-bold text-xs px-3.5 py-2 transition active:scale-95 shadow-xs cursor-pointer"
                      >
                        {t('addItemBtn')}
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </main>

      {/* Sticky Bottom Order Bar */}
      {cartItems.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-slate-200 shadow-2xl p-3 sm:p-4">
          <div className="max-w-2xl mx-auto space-y-3">
            {validationError && (
              <div className="rounded-xl bg-rose-50 border border-rose-200 p-2 text-rose-800 text-xs font-bold flex items-center gap-1.5">
                <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
                <span>{validationError}</span>
              </div>
            )}

            <div className="flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold text-slate-500 uppercase">
                  {t('totalItemsLabel')} ({totalItemCount})
                </span>
                <div className="font-mono font-black text-xl text-slate-950">
                  ₹{grandTotal.toLocaleString('en-IN')}
                </div>
              </div>

              <div className="text-[11px] text-slate-500 text-right">
                <span>
                  {cartItems.length} {t('typesOfItems')}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <input
                type="text"
                required
                placeholder={t('yourNamePlaceholder')}
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-900 placeholder:text-slate-500 outline-none focus:border-amber-500"
              />
              <input
                type="tel"
                required
                maxLength={10}
                placeholder={t('yourMobilePlaceholder')}
                value={customerMobile}
                onChange={(e) => setCustomerMobile(e.target.value)}
                className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-900 placeholder:text-slate-500 outline-none focus:border-amber-500 font-mono"
              />
            </div>

            <button
              type="button"
              disabled={isSubmittingOrder}
              onClick={handleSendOrder}
              className="w-full rounded-2xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white font-black text-sm py-3.5 px-4 flex items-center justify-center gap-2 shadow-lg transition active:scale-98 cursor-pointer"
            >
              {isSubmittingOrder ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>{t('orderSendingBtn')}</span>
                </>
              ) : (
                <>
                  <MessageSquare className="h-4 w-4 fill-white" />
                  <span>
                    {t('sendOrderBtn')} • ₹{grandTotal.toLocaleString('en-IN')}
                  </span>
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
