import React, { useState, useEffect, useMemo } from 'react';
import {
  Share2, Download, Printer, ShoppingBag, Search,
  Plus, Minus, Check, Phone, ExternalLink, MessageSquare, RefreshCw
} from 'lucide-react';
import QRCode from 'qrcode';
import { useShop } from '../context/ShopContext';
import { CustomerOrder } from '../types';
import { buildOrderWhatsAppText } from '../utils/orderImageGenerator';

export const RateListQrScreen: React.FC = () => {
  const {
    products,
    customerOrders,
    newOrdersCount,
    addCustomerOrder,
    updateOrderStatus,
    refreshCloudOrders,
    openBillEditorFromOrder,
    rateListSubTab,
    setRateListSubTab,
    activeShopId,
    shopInfo,
    language,
    t,
  } = useShop();

  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [copiedToast, setCopiedToast] = useState(false);
  const [isRefreshingOrders, setIsRefreshingOrders] = useState(false);

  // Customer Ordering Preview State
  const [catalogSearch, setCatalogSearch] = useState('');
  const [customerCart, setCustomerCart] = useState<Record<string, number>>({});
  const [custQtyInputs, setCustQtyInputs] = useState<Record<string, string>>({});
  const [custName, setCustName] = useState('');
  const [custMobile, setCustMobile] = useState('');
  const [orderSentSuccess, setOrderSentSuccess] = useState<string | null>(null);

  const shopId = activeShopId || shopInfo.id || '';
  const catalogUrl = useMemo(() => {
    if (typeof window === 'undefined') return '';
    return `${window.location.origin}${window.location.pathname}#/order?shop=${encodeURIComponent(shopId)}`;
  }, [shopId]);

  useEffect(() => {
    if (!catalogUrl) return;
    QRCode.toDataURL(catalogUrl, {
      width: 320,
      margin: 2,
      color: {
        dark: '#0f172a',
        light: '#ffffff',
      },
    })
      .then((url) => setQrDataUrl(url))
      .catch((err) => console.error('QR generation error:', err));
  }, [catalogUrl]);

  // Auto refresh cloud orders whenever switching to Orders subtab
  useEffect(() => {
    if (rateListSubTab === 'orders') {
      refreshCloudOrders();
    }
  }, [rateListSubTab, refreshCloudOrders]);

  const handleManualRefresh = async () => {
    setIsRefreshingOrders(true);
    await refreshCloudOrders();
    setTimeout(() => setIsRefreshingOrders(false), 350);
  };

  // Filter products for customer view
  const filteredCatalog = useMemo(() => {
    return products.filter((p) => {
      const term = catalogSearch.toLowerCase();
      return (
        p.name.toLowerCase().includes(term) ||
        p.company.toLowerCase().includes(term) ||
        p.category.toLowerCase().includes(term)
      );
    });
  }, [products, catalogSearch]);

  const setDirectCustQty = (productId: string, nextQty: number) => {
    const clamped = Math.max(0, Math.round(nextQty * 1000) / 1000);
    if (clamped === 0) {
      setCustomerCart((prev) => {
        const copy = { ...prev };
        delete copy[productId];
        return copy;
      });
      setCustQtyInputs((prev) => {
        const copy = { ...prev };
        delete copy[productId];
        return copy;
      });
      return;
    }
    setCustomerCart((prev) => ({ ...prev, [productId]: clamped }));
    setCustQtyInputs((prev) => ({ ...prev, [productId]: String(clamped) }));
  };

  const handleUpdateCustQty = (productId: string, delta: number) => {
    const current = customerCart[productId] || 0;
    setDirectCustQty(productId, current + delta);
  };

  const handleCustDirectQtyInput = (productId: string, rawValue: string) => {
    setCustQtyInputs((prev) => ({ ...prev, [productId]: rawValue }));
    if (rawValue.trim() === '') {
      setCustomerCart((prev) => {
        const copy = { ...prev };
        delete copy[productId];
        return copy;
      });
      return;
    }
    const parsed = parseFloat(rawValue);
    if (Number.isNaN(parsed)) return;
    const clamped = Math.max(0, Math.round(parsed * 1000) / 1000);
    if (clamped === 0) {
      setCustomerCart((prev) => {
        const copy = { ...prev };
        delete copy[productId];
        return copy;
      });
    } else {
      setCustomerCart((prev) => ({ ...prev, [productId]: clamped }));
    }
  };

  const handleCustQtyBlur = (productId: string) => {
    const raw = custQtyInputs[productId];
    if (raw === undefined) return;
    if (raw.trim() === '' || Number.isNaN(parseFloat(raw))) {
      setCustQtyInputs((prev) => ({ ...prev, [productId]: '0' }));
      setCustomerCart((prev) => {
        const copy = { ...prev };
        delete copy[productId];
        return copy;
      });
    }
  };

  const flushBlankCustQtyInputs = (exceptFieldKey?: string) => {
    const blankIds = Object.keys(custQtyInputs).filter(
      (id) => exceptFieldKey !== `custqty:${id}` && custQtyInputs[id].trim() === ''
    );
    if (blankIds.length === 0) return;
    setCustQtyInputs((prev) => {
      const next = { ...prev };
      blankIds.forEach((id) => {
        next[id] = '0';
      });
      return next;
    });
    setCustomerCart((prev) => {
      const copy = { ...prev };
      blankIds.forEach((id) => {
        delete copy[id];
      });
      return copy;
    });
  };

  const cartItemsList = useMemo(() => {
    return Object.entries(customerCart)
      .map(([prodId, qty]) => {
        const product = products.find((p) => p.id === prodId);
        return {
          product,
          qty,
          total: Math.round((product?.sellPrice || 0) * qty * 100) / 100,
        };
      })
      .filter((item) => Boolean(item.product) && item.qty > 0);
  }, [customerCart, products]);

  const customerGrandTotal = Math.round(
    cartItemsList.reduce((acc, item) => acc + item.total, 0) * 100
  ) / 100;

  // Handle Customer Order Submission in Preview
  const handleSubmitCustomerOrder = (e: React.FormEvent) => {
    e.preventDefault();
    if (cartItemsList.length === 0) return;
    if (!custName.trim() || !custMobile.trim()) {
      alert(t('pleaseEnterNameMobile'));
      return;
    }

    const orderItems = cartItemsList.map((item) => ({
      productId: item.product!.id,
      productName: item.product!.name,
      quantity: item.qty,
      unit: item.product!.unit,
      rate: item.product!.sellPrice,
      total: item.total,
    }));

    const newOrder = addCustomerOrder({
      customerName: custName.trim(),
      customerMobile: custMobile.trim(),
      items: orderItems,
      grandTotal: customerGrandTotal,
      status: 'New',
      shopId,
    });

    const targetLang = shopInfo.orderMessageSettings?.messageLanguage || language;
    const waText = buildOrderWhatsAppText(newOrder, shopInfo, targetLang);

    const shopPhone = (shopInfo.mobile || '').replace(/\D/g, '');
    const formattedShopPhone = shopPhone.length === 10 ? '91' + shopPhone : shopPhone;
    const waUrl = formattedShopPhone
      ? `https://wa.me/${formattedShopPhone}?text=${encodeURIComponent(waText)}`
      : `https://wa.me/?text=${encodeURIComponent(waText)}`;

    window.open(waUrl, '_blank');

    setOrderSentSuccess(newOrder.orderNumber);
    setCustomerCart({});
    setCustQtyInputs({});
    setCustName('');
    setCustMobile('');
    setTimeout(() => setOrderSentSuccess(null), 5000);
  };

  // Load Order into POS Bill Edit Screen (NEVER auto-creates Cash bill!)
  const handleMakeBillFromOrder = (order: CustomerOrder) => {
    if (order.status === 'Billed') return;
    openBillEditorFromOrder(order);
  };

  const handleDownloadQr = () => {
    if (!qrDataUrl) return;
    const a = document.createElement('a');
    a.href = qrDataUrl;
    a.download = `${(shopInfo.name || 'Shop').replace(/\s+/g, '_')}_RateList_QR.png`;
    a.click();
  };

  const handlePrintPoster = () => {
    window.print();
  };

  const getOrderStatusLabel = (status: CustomerOrder['status']) => {
    if (status === 'New') return t('orderStatusNew');
    if (status === 'Accepted') return t('orderStatusAccepted');
    if (status === 'Ready') return t('orderStatusReady');
    if (status === 'Delivered') return t('orderStatusDelivered');
    if (status === 'Billed') return t('orderStatusBilled');
    return status;
  };

  return (
    <div
      className="space-y-4"
      onFocusCapture={(e) => {
        const fieldKey = (e.target as HTMLElement | null)?.dataset?.fieldKey;
        flushBlankCustQtyInputs(fieldKey);
      }}
    >
      {/* Top Header */}
      <div className="rounded-2xl bg-slate-900 p-4 text-white shadow-md flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-400">
              📲 {t('navRateListQr')}
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
            {t('rateListQrTitle')}
          </h1>
          <p className="text-xs text-slate-400">
            {t('rateListQrSub')}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              if (typeof window !== 'undefined') {
                window.open(catalogUrl, '_blank');
              }
            }}
            className="flex items-center gap-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 px-3.5 py-2 text-slate-950 font-black text-xs shadow-md transition active:scale-95 cursor-pointer"
          >
            <ExternalLink className="h-4 w-4" />
            <span>{t('grahakViewTestBtn')}</span>
          </button>
        </div>
      </div>

      {/* Sub Tabs */}
      <div className="flex bg-slate-100 p-1.5 rounded-2xl border border-slate-200">
        <button
          onClick={() => setRateListSubTab('qr-poster')}
          className={`flex-1 py-2 rounded-xl text-xs font-black transition cursor-pointer ${
            rateListSubTab === 'qr-poster'
              ? 'bg-white text-slate-900 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          {t('qrStandeeTab')}
        </button>
        <button
          onClick={() => setRateListSubTab('orders')}
          className={`flex-1 py-2 rounded-xl text-xs font-black transition cursor-pointer relative ${
            rateListSubTab === 'orders'
              ? 'bg-white text-slate-900 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          📦 {t('newOrdersTitle')}
          {newOrdersCount > 0 && (
            <span className="ml-1.5 bg-red-600 text-white font-black text-[10px] px-1.5 py-0.2 rounded-full animate-pulse">
              {newOrdersCount}
            </span>
          )}
        </button>
        <button
          onClick={() => setRateListSubTab('customer-preview')}
          className={`flex-1 py-2 rounded-xl text-xs font-black transition cursor-pointer ${
            rateListSubTab === 'customer-preview'
              ? 'bg-white text-slate-900 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          {t('customerRateListTab')}
        </button>
      </div>

      {/* SUB-TAB 1: QR POSTER & STAND */}
      {rateListSubTab === 'qr-poster' && (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
          <div className="md:col-span-7 flex justify-center">
            <div className="w-full max-w-sm rounded-3xl bg-white border-4 border-amber-400 p-6 text-center shadow-xl space-y-4">
              <div className="bg-amber-500 text-slate-950 font-black text-xs uppercase tracking-wider py-1.5 px-3 rounded-full inline-block">
                {t('scanToViewAndOrder')}
              </div>

              <div>
                <h2 className="text-2xl font-black text-slate-950 tracking-tight">
                  {shopInfo.name || t('appName')}
                </h2>
                <p className="text-xs text-slate-600 mt-1 max-w-[280px] mx-auto">
                  {shopInfo.address || ''}
                </p>
                {shopInfo.mobile && (
                  <p className="text-xs font-mono font-bold text-amber-900 mt-1">
                    📞 {shopInfo.mobile}
                  </p>
                )}
                <div className="mt-1.5">
                  <span className="inline-block bg-slate-100 border border-slate-200 text-slate-700 font-mono text-[10px] px-2.5 py-0.5 rounded-full font-bold">
                    {t('shopIdColon')} {shopId}
                  </span>
                </div>
              </div>

              <div className="flex justify-center p-3 bg-slate-50 rounded-2xl border-2 border-dashed border-amber-300">
                {qrDataUrl ? (
                  <img
                    src={qrDataUrl}
                    alt={t('qrAltText')}
                    className="w-56 h-56 rounded-xl object-contain shadow-xs bg-white p-2"
                  />
                ) : (
                  <div className="w-56 h-56 flex items-center justify-center text-slate-400">
                    {t('search')}
                  </div>
                )}
              </div>

              <div className="space-y-1">
                <p className="text-xs font-black text-slate-900">
                  {t('scanCameraOrUpi')}
                </p>
                <p className="text-[11px] text-slate-500">
                  {t('orderFromHomePrompt')}
                </p>
              </div>
            </div>
          </div>

          <div className="md:col-span-5 space-y-4">
            <div className="rounded-2xl bg-white p-5 border border-slate-200 shadow-sm space-y-3">
              <h3 className="font-extrabold text-slate-900 text-sm">
                {t('standeeStickerActions')}
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                {t('standeeStickerDesc')}
              </p>

              <div className="space-y-2 pt-2">
                <button
                  onClick={handleDownloadQr}
                  className="w-full rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs py-3 px-4 flex items-center justify-center gap-2 transition active:scale-95 cursor-pointer shadow-xs"
                >
                  <Download className="h-4 w-4 text-amber-400" />
                  <span>{t('downloadQrBtn')}</span>
                </button>

                <button
                  onClick={() => {
                    navigator.clipboard.writeText(catalogUrl);
                    setCopiedToast(true);
                    setTimeout(() => setCopiedToast(false), 3000);
                  }}
                  className="w-full rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs py-3 px-4 flex items-center justify-center gap-2 transition active:scale-95 cursor-pointer shadow-xs"
                >
                  <Share2 className="h-4 w-4" />
                  <span>{copiedToast ? t('linkCopiedSuccess') : t('shareQrBtn')}</span>
                </button>

                <button
                  onClick={handlePrintPoster}
                  className="w-full rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs py-3 px-4 flex items-center justify-center gap-2 transition active:scale-95 cursor-pointer"
                >
                  <Printer className="h-4 w-4 text-slate-600" />
                  <span>{t('printQrBtn')}</span>
                </button>
              </div>
            </div>

            <div className="rounded-2xl bg-amber-50 border border-amber-200 p-4 space-y-2 text-xs">
              <h4 className="font-black text-amber-950">{t('smartBusinessBenefit')}</h4>
              <ul className="list-disc list-inside space-y-1 text-slate-700">
                <li>{t('benefitNoCall')}</li>
                <li>{t('benefitWhatsAppOrder')}</li>
                <li>{t('benefitOneClickBill')}</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 2: SHOPKEEPER VIEW OF CUSTOMER ORDERS */}
      {rateListSubTab === 'orders' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between bg-white rounded-2xl border border-slate-200 px-4 py-2.5 shadow-2xs">
            <div className="flex items-center gap-2">
              <span className="font-black text-sm text-slate-900">{t('newOrdersTitle')}</span>
              {newOrdersCount > 0 && (
                <span className="bg-red-600 text-white text-[10px] font-black px-2 py-0.5 rounded-full">
                  {newOrdersCount}
                </span>
              )}
            </div>
            <button
              type="button"
              onClick={handleManualRefresh}
              className="flex items-center gap-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs px-3 py-1.5 transition cursor-pointer"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isRefreshingOrders ? 'animate-spin' : ''}`} />
              <span>{t('refreshBtn')}</span>
            </button>
          </div>

          {customerOrders.length === 0 ? (
            <div className="rounded-2xl bg-white border border-slate-200 p-12 text-center text-slate-400">
              <ShoppingBag className="h-12 w-12 mx-auto mb-2 text-slate-300" />
              <p className="font-bold text-slate-600 text-base">{t('noOrdersYet')}</p>
              <p className="text-xs text-slate-400 mt-1">
                {t('noOrdersYetSub')}
              </p>
            </div>
          ) : (
            customerOrders.map((ord) => {
              const isBilled = ord.status === 'Billed';
              return (
                <div
                  key={ord.id}
                  className="rounded-2xl bg-white border border-slate-200 p-4 sm:p-5 shadow-xs space-y-3"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-slate-100">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-black text-sm text-slate-900">
                        {ord.orderNumber}
                      </span>
                      <span
                        className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                          ord.status === 'New'
                            ? 'bg-red-100 text-red-900 border border-red-300 animate-pulse'
                            : ord.status === 'Accepted'
                            ? 'bg-blue-100 text-blue-900'
                            : ord.status === 'Ready'
                            ? 'bg-purple-100 text-purple-900'
                            : ord.status === 'Billed'
                            ? 'bg-emerald-600 text-white'
                            : 'bg-emerald-100 text-emerald-900'
                        }`}
                      >
                        {getOrderStatusLabel(ord.status)}
                      </span>
                      <span className="text-xs text-slate-400 font-medium">
                        {new Date(ord.date).toLocaleTimeString(language === 'hindi' ? 'hi-IN' : 'en-IN', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      {/* Call Customer Button */}
                      {ord.customerMobile && (
                        <a
                          href={`tel:${ord.customerMobile}`}
                          className="flex items-center gap-1 rounded-xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 text-emerald-800 font-bold text-xs py-2 px-3 transition active:scale-95"
                        >
                          <Phone className="h-3.5 w-3.5" />
                          <span>{t('callAction')}</span>
                        </a>
                      )}

                      {/* Make Bill from Order (Opens Billing Editor, never auto-creates Cash bill) */}
                      <button
                        type="button"
                        disabled={isBilled}
                        onClick={() => handleMakeBillFromOrder(ord)}
                        className={`flex items-center gap-1.5 rounded-xl font-black text-xs py-2 px-3 transition shadow-xs ${
                          isBilled
                            ? 'bg-slate-200 text-slate-500 cursor-not-allowed'
                            : 'bg-emerald-600 hover:bg-emerald-500 text-white active:scale-95 cursor-pointer'
                        }`}
                      >
                        <Check className="h-4 w-4 stroke-[3]" />
                        <span>{isBilled ? t('orderStatusBilled') : t('makeBillFromOrderBtn')}</span>
                      </button>
                    </div>
                  </div>

                  {/* Customer Info */}
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                    <div>
                      <span className="text-slate-500">{t('customerLabel')}</span>{' '}
                      <strong className="text-slate-900 font-bold">{ord.customerName}</strong>
                      <span className="ml-2 text-slate-500 font-mono">📞 {ord.customerMobile}</span>
                    </div>
                    <div className="font-mono font-black text-base text-slate-950">
                      {t('total')}: ₹{ord.grandTotal.toLocaleString('en-IN')}
                    </div>
                  </div>

                  {/* Items List */}
                  <div className="rounded-xl bg-slate-50 p-3 space-y-1.5 text-xs">
                    {ord.items.map((item, idx) => (
                      <div key={idx} className="flex justify-between items-center text-slate-700">
                        <span>{item.productName} ({item.quantity} {item.unit})</span>
                        <span className="font-mono font-bold">₹{item.total}</span>
                      </div>
                    ))}
                  </div>

                  {/* Localized Status Switcher */}
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <span className="text-[11px] font-bold text-slate-500">{t('updateStatusPrompt')}</span>
                    {(['Accepted', 'Ready', 'Delivered'] as const).map((st) => (
                      <button
                        key={st}
                        type="button"
                        disabled={isBilled}
                        onClick={() => updateOrderStatus(ord.id, st)}
                        className={`text-[10px] font-bold px-2.5 py-1 rounded-lg border transition cursor-pointer disabled:opacity-50 ${
                          ord.status === st
                            ? 'bg-slate-900 text-white border-slate-900'
                            : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {getOrderStatusLabel(st)}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* SUB-TAB 3: CUSTOMER ORDER VIEW (PREVIEW) */}
      {rateListSubTab === 'customer-preview' && (
        <div className="max-w-2xl mx-auto rounded-3xl bg-white border-2 border-slate-200 shadow-xl overflow-hidden">
          <div className="bg-linear-to-r from-slate-950 to-slate-900 p-5 text-white">
            <span className="text-[10px] font-black uppercase tracking-wider text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded border border-amber-400/20">
              {t('onlineRateListBadge')}
            </span>
            <h2 className="text-xl sm:text-2xl font-black text-white mt-1">
              {shopInfo.name || t('appName')}
            </h2>
            <p className="text-xs text-slate-300 mt-0.5">
              {shopInfo.address}
            </p>
            {shopInfo.mobile && (
              <p className="text-xs font-mono text-amber-300 font-bold mt-1">
                📞 {t('callWhatsAppPrefix')} {shopInfo.mobile}
              </p>
            )}
          </div>

          {orderSentSuccess && (
            <div className="bg-emerald-600 p-3 text-white text-xs font-bold text-center">
              {t('orderSentSuccessBanner')} (#{orderSentSuccess})
            </div>
          )}

          <div className="p-4 border-b border-slate-100">
            <div className="relative">
              <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder={t('searchProductsPrompt')}
                value={catalogSearch}
                onChange={(e) => setCatalogSearch(e.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white pl-10 pr-3 py-2 text-xs font-semibold text-slate-900 focus:border-amber-500 outline-none"
              />
            </div>
          </div>

          <div className="p-4 max-h-[420px] overflow-y-auto divide-y divide-slate-100">
            {filteredCatalog.map((prod) => {
              const qtyInCart = customerCart[prod.id] || 0;
              return (
                <div key={prod.id} className="py-3 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-10 w-10 rounded-xl bg-amber-100 flex items-center justify-center font-bold text-amber-800 text-sm shrink-0">
                      ⚡
                    </div>
                    <div className="min-w-0">
                      <h4 className="font-bold text-xs sm:text-sm text-slate-900 truncate">
                        {prod.name}
                      </h4>
                      <p className="text-[11px] text-slate-500">
                        {prod.company} • {prod.unit}
                      </p>
                      <div className="font-mono font-black text-xs text-emerald-700 mt-0.5">
                        ₹{prod.sellPrice} / {prod.unit}
                      </div>
                    </div>
                  </div>

                  {/* Direct Qty Selector */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    {qtyInCart > 0 || custQtyInputs[prod.id] !== undefined ? (
                      <div className="flex items-center gap-1 bg-amber-50 border border-amber-300 rounded-xl p-1">
                        <button
                          type="button"
                          onClick={() => handleUpdateCustQty(prod.id, -1)}
                          className="h-6 w-6 rounded-lg bg-white text-slate-800 font-bold flex items-center justify-center shadow-xs cursor-pointer"
                        >
                          <Minus className="h-3 w-3" />
                        </button>
                        <input
                          type="number"
                          step="any"
                          min="0"
                          data-field-key={`custqty:${prod.id}`}
                          value={custQtyInputs[prod.id] ?? String(qtyInCart)}
                          onChange={(e) => handleCustDirectQtyInput(prod.id, e.target.value)}
                          onBlur={() => handleCustQtyBlur(prod.id)}
                          className="w-12 rounded-md border border-amber-300 bg-white px-1 py-0.5 text-center font-mono font-black text-xs text-slate-900 outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => handleUpdateCustQty(prod.id, 1)}
                          className="h-6 w-6 rounded-lg bg-amber-500 text-slate-950 font-bold flex items-center justify-center shadow-xs cursor-pointer"
                        >
                          <Plus className="h-3 w-3" />
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleUpdateCustQty(prod.id, 1)}
                        className="rounded-xl bg-slate-100 hover:bg-amber-500 hover:text-slate-950 text-slate-800 font-bold text-xs px-3 py-1.5 transition active:scale-95 cursor-pointer"
                      >
                        {t('addItemBtn')}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {cartItemsList.length > 0 && (
            <div className="bg-amber-50/70 p-4 border-t border-amber-200 space-y-3">
              <div className="flex justify-between items-center text-xs font-bold text-amber-950">
                <span>{t('totalItemsLabel')} ({cartItemsList.length}):</span>
                <span className="text-base font-black font-mono">
                  ₹{customerGrandTotal.toLocaleString('en-IN')}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  required
                  placeholder={t('yourNamePlaceholder')}
                  value={custName}
                  onChange={(e) => setCustName(e.target.value)}
                  className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-900 outline-none focus:border-amber-500"
                />
                <input
                  type="tel"
                  required
                  placeholder={t('yourMobilePlaceholder')}
                  value={custMobile}
                  onChange={(e) => setCustMobile(e.target.value)}
                  className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-900 outline-none focus:border-amber-500 font-mono"
                />
              </div>

              <button
                type="button"
                onClick={handleSubmitCustomerOrder}
                className="w-full rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-sm py-3 px-4 flex items-center justify-center gap-2 shadow-lg transition active:scale-95 cursor-pointer"
              >
                <MessageSquare className="h-4 w-4 fill-white" />
                <span>{t('sendOrderBtn')} (₹{customerGrandTotal})</span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
