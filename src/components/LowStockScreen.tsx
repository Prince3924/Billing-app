import React, { useState, useMemo } from 'react';
import { AlertTriangle, PlusCircle, Check, MessageSquare, User } from 'lucide-react';
import { useShop } from '../context/ShopContext';
import { Product } from '../types';

export const LowStockScreen: React.FC = () => {
  const { lowStockProducts, refillStock, shopInfo, setActiveTab, t } = useShop();

  const [refillInputId, setRefillInputId] = useState<string | null>(null);
  const [refillQty, setRefillQty] = useState<string>('10');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const vendorGroups = useMemo(() => {
    const map = new Map<string, Product[]>();
    lowStockProducts.forEach((p) => {
      const v = p.vendor || t('unknownVendorLabel');
      if (!map.has(v)) {
        map.set(v, []);
      }
      map.get(v)!.push(p);
    });
    return Array.from(map.entries());
  }, [lowStockProducts, t]);

  const handleRefill = (product: Product, qty: number) => {
    refillStock(product.id, qty, product.purchasePrice, t('reorderScreenNote'));
    setRefillInputId(null);
    setToastMessage(`✅ ${t('stockAddedToast', { qty, unit: product.unit, name: product.name })}`);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const sendVendorOrderWhatsApp = (vendorName: string, items: Product[]) => {
    const addressLine = shopInfo.address ? `📍 ${shopInfo.address}\n` : '';
    const mobileLine = shopInfo.mobile ? `📞 ${t('mobileColon')} ${shopInfo.mobile}\n` : '';

    let orderText = t('vendorOrderWaIntro', {
      shop: shopInfo.name || t('appName'),
      addressLine,
      mobileLine,
      vendor: vendorName,
    });

    items.forEach((p, idx) => {
      const neededQty = Math.max(10, p.lowStockLimit * 2 - p.stockQuantity);
      orderText += t('vendorOrderWaItemLine', {
        idx: idx + 1,
        name: p.name,
        company: p.company,
        stock: p.stockQuantity,
        unit: p.unit,
        needed: neededQty,
      });
    });

    orderText += t('vendorOrderWaFooter');

    const encoded = encodeURIComponent(orderText);
    window.open(`https://wa.me/?text=${encoded}`, '_blank');
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="rounded-2xl bg-linear-to-r from-red-600 via-rose-600 to-red-700 p-4 sm:p-5 text-white shadow-lg flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/20 text-yellow-300 ring-2 ring-white/30 font-black">
            <AlertTriangle className="h-6 w-6 stroke-[2.5]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-black uppercase tracking-wider bg-white text-red-700 px-2 py-0.5 rounded-full">
                ⚠️ {t('urgentAlert')}
              </span>
              <span className="text-xs text-red-100 font-medium">
                {lowStockProducts.length} {t('itemsCountText')}
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight mt-0.5">
              {t('navLowStock')}
            </h1>
            <p className="text-xs text-red-100">
              {t('lowStockSub')}
            </p>
          </div>
        </div>

        <button
          onClick={() => setActiveTab('products')}
          className="rounded-xl bg-white text-red-800 hover:bg-yellow-300 hover:text-red-950 font-black px-4 py-2.5 text-xs sm:text-sm shadow-md transition cursor-pointer"
        >
          {t('navProducts')}
        </button>
      </div>

      {toastMessage && (
        <div className="rounded-xl bg-emerald-600 px-4 py-2 text-white text-xs sm:text-sm font-bold flex items-center gap-2 shadow-sm">
          <Check className="h-4 w-4" />
          <span>{toastMessage}</span>
        </div>
      )}

      {lowStockProducts.length === 0 ? (
        <div className="rounded-2xl bg-white text-slate-900 p-12 text-center border border-slate-200">
          <div className="flex h-16 w-16 mx-auto items-center justify-center rounded-full bg-emerald-100 text-emerald-600 mb-3">
            <Check className="h-8 w-8 stroke-[3]" />
          </div>
          <h3 className="text-lg font-black text-slate-900">
            {t('lowStockAllClearTitle', { shop: shopInfo.name || t('appName') })}
          </h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            {t('lowStockAllClearSub')}
          </p>
          <button
            onClick={() => setActiveTab('billing')}
            className="mt-4 rounded-xl bg-amber-500 px-4 py-2.5 text-xs font-black text-slate-900 shadow-sm cursor-pointer"
          >
            {t('createBillQuick')}
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {vendorGroups.map(([vendorName, items]) => (
            <div
              key={vendorName}
              className="rounded-2xl bg-white text-slate-900 p-4 sm:p-5 shadow-sm border border-red-200"
            >
              <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600 font-bold border border-blue-200">
                    <User className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-slate-900 text-sm sm:text-base">
                      {vendorName}
                    </h3>
                    <p className="text-xs text-slate-500">
                      {items.length} {t('itemsCountText')}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => sendVendorOrderWhatsApp(vendorName, items)}
                  className="flex items-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-2 text-xs font-black shadow-xs transition active:scale-95 cursor-pointer"
                >
                  <MessageSquare className="h-3.5 w-3.5" />
                  <span>{t('orderWhatsAppSupplier')}</span>
                </button>
              </div>

              <div className="mt-3 divide-y divide-slate-100">
                {items.map((p) => {
                  const isRefilling = refillInputId === p.id;
                  const suggestedReorder = Math.max(10, p.lowStockLimit * 2 - p.stockQuantity);

                  return (
                    <div
                      key={p.id}
                      className="py-3 flex flex-wrap items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-3 min-w-[200px]">
                        <div className="h-10 w-10 rounded-xl bg-red-100 text-red-700 flex items-center justify-center font-bold text-xs shrink-0">
                          {p.stockQuantity}
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] font-bold uppercase text-slate-600 bg-slate-100 px-1.5 py-0.2 rounded">
                              {p.company}
                            </span>
                            <span className="text-[10px] font-mono text-slate-500">
                              {t('lowStockLimitShort')} {p.lowStockLimit} {p.unit}
                            </span>
                          </div>
                          <h4 className="font-bold text-slate-900 text-sm leading-snug">
                            {p.name}
                          </h4>
                          <p className="text-xs text-rose-600 font-bold mt-0.5">
                            {t('stockLeft')}: {p.stockQuantity} {p.unit} (~{suggestedReorder} {p.unit})
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {isRefilling ? (
                          <div className="flex items-center gap-1.5 bg-slate-50 p-1.5 rounded-xl border border-slate-200">
                            <span className="text-xs font-semibold text-slate-700">{t('addQtyPlaceholder')}</span>
                            <input
                              type="number"
                              min="0.01"
                              step="any"
                              value={refillQty}
                              onChange={(e) => setRefillQty(e.target.value)}
                              onBlur={() => {
                                if (refillQty.trim() === '') setRefillQty('0');
                              }}
                              className="w-16 rounded-lg border border-slate-300 bg-white text-slate-900 px-2 py-1 text-xs font-bold text-center"
                            />
                            <button
                              onClick={() => {
                                const parsed = parseFloat(refillQty) || 0;
                                if (parsed <= 0) return;
                                handleRefill(p, parsed);
                              }}
                              className="rounded-lg bg-emerald-600 px-3 py-1 text-xs font-bold text-white hover:bg-emerald-700 cursor-pointer"
                            >
                              {t('save')}
                            </button>
                            <button
                              onClick={() => setRefillInputId(null)}
                              className="text-xs text-slate-500 hover:text-slate-700 px-1 cursor-pointer"
                            >
                              ✕
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => handleRefill(p, 10)}
                              className="rounded-xl bg-slate-100 hover:bg-emerald-100 hover:text-emerald-800 border border-slate-200 px-2.5 py-1.5 text-xs font-bold text-slate-700 transition cursor-pointer"
                            >
                              +10
                            </button>
                            <button
                              onClick={() => handleRefill(p, 25)}
                              className="rounded-xl bg-slate-100 hover:bg-emerald-100 hover:text-emerald-800 border border-slate-200 px-2.5 py-1.5 text-xs font-bold text-slate-700 transition cursor-pointer"
                            >
                              +25
                            </button>
                            <button
                              onClick={() => {
                                setRefillInputId(p.id);
                                setRefillQty(String(suggestedReorder));
                              }}
                              className="rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black px-3 py-1.5 text-xs flex items-center gap-1 shadow-xs transition cursor-pointer"
                            >
                              <PlusCircle className="h-3.5 w-3.5" />
                              <span>{t('maalAayaQuick')}</span>
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
