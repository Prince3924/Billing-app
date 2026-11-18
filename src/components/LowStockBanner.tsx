import React, { useState } from 'react';
import { AlertTriangle, PlusCircle, ArrowRight, ChevronDown, ChevronUp, PhoneCall, Check } from 'lucide-react';
import { useShop } from '../context/ShopContext';
import { Product } from '../types';

export const LowStockBanner: React.FC = () => {
  const { lowStockProducts, refillStock, setActiveTab, shopInfo, t } = useShop();
  const [expanded, setExpanded] = useState(true);
  const [refillInputId, setRefillInputId] = useState<string | null>(null);
  const [refillQty, setRefillQty] = useState<string>('10');
  const [successToast, setSuccessToast] = useState<string | null>(null);

  if (lowStockProducts.length === 0) return null;

  const handleQuickRefill = (product: Product, qty: number) => {
    refillStock(product.id, qty, product.purchasePrice, t('quickRefillNote'));
    setRefillInputId(null);
    setSuccessToast(t('stockAddedToast', { qty, unit: product.unit, name: product.name }));
    setTimeout(() => setSuccessToast(null), 3000);
  };

  const openWhatsAppOrder = (product: Product) => {
    const shopName = shopInfo.name || t('appName');
    const text = encodeURIComponent(
      t('supplierOrderMessage', {
        vendor: product.vendor || t('unknownVendorLabel'),
        shop: shopName,
        name: product.name,
        company: product.company || '-',
        stock: product.stockQuantity,
        unit: product.unit,
      })
    );
    window.open(`https://wa.me/?text=${text}`, '_blank');
  };

  return (
    <div className="mb-5 overflow-hidden rounded-2xl border-2 border-red-500 bg-linear-to-r from-red-600 to-rose-700 text-white shadow-lg">
      {/* Main Alert Header */}
      <div className="p-4 sm:p-4.5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/20 text-yellow-300 ring-2 ring-white/30 backdrop-blur-xs">
            <AlertTriangle className="h-6 w-6 stroke-[2.5]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-black uppercase tracking-wider bg-white text-red-700">
                ⚠️ {t('urgentAlert')}
              </span>
              <span className="text-xs text-red-100 font-medium">
                {lowStockProducts.length} {t('itemsCountText')}
              </span>
            </div>
            <h2 className="text-lg sm:text-xl font-black text-white tracking-tight mt-0.5">
              {t('lowStockHeading')}
            </h2>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('low-stock')}
            className="flex items-center gap-1.5 rounded-xl bg-white px-3.5 py-2 text-xs sm:text-sm font-bold text-red-700 shadow-md hover:bg-yellow-300 hover:text-red-900 transition active:scale-95 cursor-pointer"
          >
            {t('viewReorderList')}
            <ArrowRight className="h-4 w-4" />
          </button>
          <button
            onClick={() => setExpanded(!expanded)}
            className="rounded-xl bg-black/20 hover:bg-black/30 p-2 text-white transition cursor-pointer"
            title={expanded ? t('hideBtn') : t('showBtn')}
          >
            {expanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {successToast && (
        <div className="bg-emerald-600 px-4 py-2 text-xs font-bold text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Check className="h-4 w-4" />
            {successToast}
          </div>
        </div>
      )}

      {/* Expanded Product List */}
      {expanded && (
        <div className="bg-red-900/40 p-3 sm:p-4 border-t border-red-400/40 backdrop-blur-xs">
          <p className="text-xs text-red-100 mb-2 font-medium">
            {t('lowStockSub')}
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {lowStockProducts.map((p) => {
              const isRefillingThis = refillInputId === p.id;

              return (
                <div
                  key={p.id}
                  className="rounded-xl bg-white p-3 text-slate-900 shadow-sm border border-red-200 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex justify-between items-start gap-1">
                      <span className="text-[10px] font-bold text-red-600 bg-red-50 border border-red-200 px-1.5 py-0.5 rounded-md uppercase">
                        {p.company}
                      </span>
                      <span className="text-[11px] font-black text-rose-700 bg-rose-100 px-2 py-0.5 rounded-md flex items-center gap-1">
                        {p.stockQuantity === 1
                          ? t('onlyOneLeft')
                          : t('onlyFewLeft', { qty: p.stockQuantity, unit: p.unit })}
                      </span>
                    </div>

                    <h4 className="font-bold text-slate-900 text-sm mt-1.5 line-clamp-1">
                      {p.name}
                    </h4>

                    <div className="mt-1 flex items-center justify-between text-xs text-slate-500">
                      <span>{t('vendorPrefix')} {p.vendor.split(',')[0]}</span>
                      <span>{t('lowStockLimitShort')} {p.lowStockLimit} {p.unit}</span>
                    </div>
                  </div>

                  <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between gap-1.5">
                    {isRefillingThis ? (
                      <div className="flex items-center gap-1.5 w-full">
                        <span className="text-xs font-semibold text-slate-600">{t('addQtyPlaceholder')}</span>
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
                            handleQuickRefill(p, parsed);
                          }}
                          className="rounded-lg bg-emerald-600 px-2.5 py-1 text-xs font-bold text-white hover:bg-emerald-700 cursor-pointer"
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
                      <>
                        <div className="flex gap-1">
                          <button
                            onClick={() => handleQuickRefill(p, 5)}
                            className="rounded-lg bg-slate-100 hover:bg-emerald-100 hover:text-emerald-800 border border-slate-200 px-2 py-1 text-xs font-bold text-slate-700 transition cursor-pointer"
                            title={t('addFiveTenHint')}
                          >
                            +5
                          </button>
                          <button
                            onClick={() => handleQuickRefill(p, 10)}
                            className="rounded-lg bg-slate-100 hover:bg-emerald-100 hover:text-emerald-800 border border-slate-200 px-2 py-1 text-xs font-bold text-slate-700 transition cursor-pointer"
                            title={t('addFiveTenHint')}
                          >
                            +10
                          </button>
                          <button
                            onClick={() => {
                              setRefillInputId(p.id);
                              setRefillQty('10');
                            }}
                            className="rounded-lg bg-amber-500 hover:bg-amber-600 text-slate-900 px-2 py-1 text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                          >
                            <PlusCircle className="h-3 w-3" />
                            {t('maalAayaQuick')}
                          </button>
                        </div>

                        <button
                          onClick={() => openWhatsAppOrder(p)}
                          className="rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 p-1.5 text-xs font-semibold cursor-pointer"
                          title={t('sendWhatsAppOrderHint')}
                        >
                          <PhoneCall className="h-3.5 w-3.5" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
