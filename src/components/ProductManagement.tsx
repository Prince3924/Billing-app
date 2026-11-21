import React, { useState, useMemo } from 'react';
import {
  Search, Plus, Edit, Trash2, PlusCircle, AlertTriangle,
  Building2, User, Layers, Check, X, Camera, PackagePlus, Package
} from 'lucide-react';
import { useShop } from '../context/ShopContext';
import { Product } from '../types';
import { BarcodeScannerModal } from './BarcodeScannerModal';

interface ProductManagementProps {
  onOpenAddProduct: () => void;
  onEditProduct: (product: Product) => void;
}

export const ProductManagement: React.FC<ProductManagementProps> = ({
  onOpenAddProduct,
  onEditProduct,
}) => {
  const { products, deleteProduct, refillStock, activeStaff, t } = useShop();
  const isStaff = Boolean(activeStaff);

  const [searchTerm, setSearchTerm] = useState('');
  const [filterCompany, setFilterCompany] = useState('ALL');
  const [filterVendor, setFilterVendor] = useState('ALL');
  const [filterCategory, setFilterCategory] = useState('ALL');
  const [showLowStockOnly, setShowLowStockOnly] = useState(false);
  const [sortBy, setSortBy] = useState<'name' | 'stockAsc' | 'stockDesc' | 'priceDesc'>('name');

  const [refillTarget, setRefillTarget] = useState<Product | null>(null);
  const [refillQty, setRefillQty] = useState<string>('10');
  const [refillCost, setRefillCost] = useState<string>('');
  const [refillNote, setRefillNote] = useState<string>('');

  const [isScannerOpen, setIsScannerOpen] = useState(false);

  const companies = useMemo(() => {
    return Array.from(new Set(products.map((p) => p.company).filter(Boolean))).sort();
  }, [products]);

  const vendors = useMemo(() => {
    return Array.from(new Set(products.map((p) => p.vendor).filter(Boolean))).sort();
  }, [products]);

  const categories = useMemo(() => {
    return Array.from(new Set(products.map((p) => p.category).filter(Boolean))).sort();
  }, [products]);

  const filteredProducts = useMemo(() => {
    return products
      .filter((p) => {
        const matchesSearch =
          p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          p.company.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (!isStaff && p.vendor.toLowerCase().includes(searchTerm.toLowerCase())) ||
          p.barcode.includes(searchTerm) ||
          p.category.toLowerCase().includes(searchTerm.toLowerCase());

        const matchesCompany = filterCompany === 'ALL' || p.company === filterCompany;
        const matchesVendor = isStaff || filterVendor === 'ALL' || p.vendor === filterVendor;
        const matchesCategory = filterCategory === 'ALL' || p.category === filterCategory;
        const matchesLowStock = !showLowStockOnly || p.stockQuantity <= p.lowStockLimit;

        return matchesSearch && matchesCompany && matchesVendor && matchesCategory && matchesLowStock;
      })
      .sort((a, b) => {
        if (sortBy === 'name') return a.name.localeCompare(b.name);
        if (sortBy === 'stockAsc') return a.stockQuantity - b.stockQuantity;
        if (sortBy === 'stockDesc') return b.stockQuantity - a.stockQuantity;
        if (sortBy === 'priceDesc') return b.sellPrice - a.sellPrice;
        return 0;
      });
  }, [products, searchTerm, filterCompany, filterVendor, filterCategory, showLowStockOnly, sortBy, isStaff]);

  const handleRefillSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!refillTarget) return;

    const qty = parseFloat(refillQty);
    if (isNaN(qty) || qty <= 0) {
      alert(t('validQtyAlert'));
      return;
    }

    const newPrice = !isStaff && refillCost ? parseFloat(refillCost) : undefined;
    refillStock(refillTarget.id, qty, newPrice, refillNote);
    setRefillTarget(null);
    setRefillQty('10');
    setRefillCost('');
    setRefillNote('');
  };

  const handleDelete = (product: Product) => {
    const confirmMsg = t('deleteProductConfirm', { name: product.name });
    if (confirm(confirmMsg)) {
      deleteProduct(product.id);
    }
  };

  const handleBarcodeScanned = (scannedCode: string) => {
    setSearchTerm(scannedCode);
    setIsScannerOpen(false);
  };

  return (
    <div className="space-y-4">
      {/* Top Header */}
      <div className="rounded-2xl bg-slate-900 p-4 text-white shadow-md flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-400">
              📦 {t('inventoryHeaderBadge')}
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
            {t('stockManagementTitle')}
          </h1>
          <p className="text-xs text-slate-400">
            {products.length} {t('itemsCountText')}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsScannerOpen(true)}
            className="flex items-center gap-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 px-3.5 py-2.5 text-xs font-bold text-amber-300 transition cursor-pointer"
          >
            <Camera className="h-4 w-4" />
            <span>{t('barcodeScanShort')}</span>
          </button>

          <button
            onClick={onOpenAddProduct}
            className="flex items-center gap-2 rounded-xl bg-amber-500 hover:bg-amber-400 px-4 py-2.5 text-slate-950 font-black text-sm shadow-md transition active:scale-95 cursor-pointer"
          >
            <Plus className="h-5 w-5 stroke-[2.5]" />
            <span>{t('addProductTitle')}</span>
          </button>
        </div>
      </div>

      {/* SEARCH AND FILTERS BAR */}
      <div className="rounded-2xl bg-white text-slate-900 p-4 shadow-sm border border-slate-200 space-y-3">
        <div className="relative">
          <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder={t('searchProductPlaceholder')}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-xl border border-slate-300 bg-white text-slate-900 placeholder:text-slate-400 pl-10 pr-4 py-2.5 text-sm font-medium focus:border-amber-500 focus:ring-2 focus:ring-amber-200 outline-none"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-3.5 top-2.5 text-xs text-slate-500 hover:text-slate-700 bg-slate-200 rounded-full h-5 w-5 flex items-center justify-center cursor-pointer"
            >
              ✕
            </button>
          )}
        </div>

        <div className={`grid grid-cols-1 sm:grid-cols-2 ${isStaff ? 'md:grid-cols-3' : 'md:grid-cols-4'} gap-2.5`}>
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1 flex items-center gap-1">
              <Building2 className="h-3 w-3 text-amber-500" />
              {t('filterByCompany')}
            </label>
            <select
              value={filterCompany}
              onChange={(e) => setFilterCompany(e.target.value)}
              className="w-full rounded-xl border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-900 focus:border-amber-500 outline-none"
            >
              <option value="ALL">{t('all')} ({companies.length})</option>
              {companies.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          {!isStaff && (
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1 flex items-center gap-1">
                <User className="h-3 w-3 text-blue-500" />
                {t('filterByVendor')}
              </label>
              <select
                value={filterVendor}
                onChange={(e) => setFilterVendor(e.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-900 focus:border-amber-500 outline-none"
              >
                <option value="ALL">{t('all')} ({vendors.length})</option>
                {vendors.map((v) => (
                  <option key={v} value={v}>
                    {v}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
              {t('categoryLabel')}:
            </label>
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="w-full rounded-xl border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-900 focus:border-amber-500 outline-none"
            >
              <option value="ALL">{t('all')} ({categories.length})</option>
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
              {t('sortLabel')}
            </label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
              className="w-full rounded-xl border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-900 focus:border-amber-500 outline-none"
            >
              <option value="name">{t('sortAZ')}</option>
              <option value="stockAsc">{t('sortStockAsc')}</option>
              <option value="stockDesc">{t('sortStockDesc')}</option>
              <option value="priceDesc">{t('sortPriceDesc')}</option>
            </select>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowLowStockOnly(!showLowStockOnly)}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold transition border cursor-pointer ${
                showLowStockOnly
                  ? 'bg-red-600 text-white border-red-700 shadow-xs'
                  : 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100'
              }`}
            >
              <AlertTriangle className="h-3.5 w-3.5" />
              <span>{t('lowStockOnlyToggle')}</span>
            </button>

            {(filterCompany !== 'ALL' || filterVendor !== 'ALL' || filterCategory !== 'ALL' || showLowStockOnly || searchTerm) && (
              <button
                onClick={() => {
                  setSearchTerm('');
                  setFilterCompany('ALL');
                  setFilterVendor('ALL');
                  setFilterCategory('ALL');
                  setShowLowStockOnly(false);
                }}
                className="text-xs text-slate-600 hover:text-slate-900 font-bold underline px-1 cursor-pointer"
              >
                {t('resetFiltersBtn')}
              </button>
            )}
          </div>

          <span className="text-xs text-slate-500 font-semibold">
            {filteredProducts.length} {t('itemsCountText')}
          </span>
        </div>
      </div>

      {/* PRODUCTS LIST / CARDS (Pure light cards even in dark mode) */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3.5">
        {products.length === 0 ? (
          <div className="col-span-full rounded-3xl bg-white text-slate-900 p-12 text-center border-2 border-dashed border-slate-300">
            <div className="mx-auto w-16 h-16 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 mb-3 shadow-xs">
              <Package className="h-8 w-8" />
            </div>
            <h3 className="font-black text-slate-900 text-lg">{t('noProductsYet')}</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              {t('noProductsSub')}
            </p>
            <button
              onClick={onOpenAddProduct}
              className="mt-5 inline-flex items-center gap-2 rounded-xl bg-amber-500 hover:bg-amber-400 px-5 py-3 text-xs font-black text-slate-950 shadow-md transition active:scale-95 cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              <span>{t('addProductTitle')}</span>
            </button>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="col-span-full rounded-2xl bg-white text-slate-900 p-12 text-center border border-slate-200">
            <Layers className="h-12 w-12 mx-auto mb-3 text-slate-300" />
            <h3 className="font-bold text-slate-800 text-base">{t('noFilteredProducts')}</h3>
            <p className="text-xs text-slate-500 mt-1">{t('noFilteredProductsSub')}</p>
            <button
              onClick={onOpenAddProduct}
              className="mt-4 rounded-xl bg-amber-500 hover:bg-amber-400 px-4 py-2 text-xs font-black text-slate-900 shadow-sm cursor-pointer"
            >
              {t('addNewProductBtn')}
            </button>
          </div>
        ) : (
          filteredProducts.map((p) => {
            const isLowStock = p.stockQuantity <= p.lowStockLimit;
            const isOutOfStock = p.stockQuantity <= 0;

            return (
              <div
                key={p.id}
                className={`rounded-2xl p-4 transition shadow-xs border flex flex-col justify-between text-slate-900 ${
                  isOutOfStock
                    ? 'bg-slate-50 border-slate-300'
                    : isLowStock
                    ? 'bg-red-50 border-2 border-red-500 shadow-sm'
                    : 'bg-white border-slate-200 hover:border-amber-300'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-1.5">
                      {p.company && (
                        <span className="rounded-md bg-slate-100 border border-slate-200 px-2 py-0.5 text-[10px] font-black uppercase text-slate-700">
                          {p.company}
                        </span>
                      )}
                      {p.category && (
                        <span className="rounded-md bg-amber-50 border border-amber-200 px-1.5 py-0.5 text-[10px] font-semibold text-amber-800">
                          {p.category}
                        </span>
                      )}
                      {p.expiryDate && (() => {
                        const today = new Date(new Date().toDateString());
                        const exp = new Date(p.expiryDate);
                        const isExpired = exp < today;
                        const diffDays = Math.ceil((exp.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
                        if (isExpired) {
                          return (
                            <span className="rounded-md bg-red-600 text-white font-black px-2 py-0.5 text-[10px] tracking-wider animate-pulse">
                              ⚠️ {t('expiredTag')}
                            </span>
                          );
                        }
                        if (diffDays <= 15) {
                          return (
                            <span className="rounded-md bg-amber-500 text-slate-950 font-bold px-1.5 py-0.5 text-[10px]">
                              ⏳ {t('expiringInDays', { days: diffDays })}
                            </span>
                          );
                        }
                        return (
                          <span className="rounded-md bg-slate-100 text-slate-600 font-mono px-1.5 py-0.5 text-[10px]">
                            {t('expShortPrefix')} {p.expiryDate}
                          </span>
                        );
                      })()}
                    </div>

                    <span
                      className={`px-2.5 py-1 rounded-xl text-xs font-black flex items-center gap-1 ${
                        isOutOfStock
                          ? 'bg-slate-800 text-white'
                          : isLowStock
                          ? 'bg-red-600 text-white shadow-xs animate-pulse'
                          : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                      }`}
                    >
                      {isOutOfStock ? (
                        t('outOfStockBadge')
                      ) : isLowStock ? (
                        <>
                          <AlertTriangle className="h-3 w-3" />
                          {t('navLowStockShort')}: {p.stockQuantity} {p.unit}
                        </>
                      ) : (
                        `${t('navProductsShort')}: ${p.stockQuantity} ${p.unit}`
                      )}
                    </span>
                  </div>

                  <div className="mt-2.5 flex items-start gap-3">
                    {p.photoUrl ? (
                      <img
                        src={p.photoUrl}
                        alt={p.name}
                        className="h-14 w-14 rounded-xl object-cover border border-slate-200 shrink-0 shadow-xs"
                      />
                    ) : (
                      <div className="h-14 w-14 rounded-xl bg-amber-100/60 border border-amber-200 flex items-center justify-center text-amber-800 text-xl font-black shrink-0">
                        ⚡
                      </div>
                    )}

                    <div className="min-w-0 flex-1">
                      <h3 className="font-extrabold text-slate-900 text-sm sm:text-base leading-snug">
                        {p.name}
                      </h3>
                      {!isStaff && (
                        <p className="text-xs text-slate-600 mt-1 flex items-center gap-1">
                          <User className="h-3 w-3 text-blue-500 shrink-0" />
                          <span className="truncate">{t('supplierLabel')}: {p.vendor || t('localVendorLabel')}</span>
                        </p>
                      )}
                      <p className="text-[11px] font-mono text-slate-500 mt-0.5">
                        {t('barcodeLabel')}: {p.barcode}
                      </p>
                    </div>
                  </div>

                  {isStaff ? (
                    <div className="mt-3 rounded-xl bg-slate-50 p-2.5 border border-slate-200 flex items-center justify-between">
                      <div>
                        <span className="text-[10px] text-emerald-700 font-bold block uppercase">{t('sellPriceTag')}</span>
                        <span className="text-sm font-black text-emerald-700 font-mono">
                          ₹{p.sellPrice}
                        </span>
                      </div>
                      {typeof p.mrp === 'number' && p.mrp > 0 && (
                        <div className="text-right">
                          <span className="text-[10px] text-slate-500 font-bold block uppercase">{t('mrpTag')}</span>
                          <span className="text-xs font-semibold text-slate-600 font-mono">
                            ₹{p.mrp}
                          </span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="mt-3 grid grid-cols-3 gap-2 rounded-xl bg-slate-50 p-2.5 border border-slate-200 text-center">
                      <div>
                        <span className="text-[10px] text-slate-500 font-bold block uppercase">{t('purchasePriceTag')}</span>
                        <span className="text-xs sm:text-sm font-black text-slate-900 font-mono">
                          ₹{p.purchasePrice}
                        </span>
                      </div>

                      <div className="border-x border-slate-200">
                        <span className="text-[10px] text-emerald-700 font-bold block uppercase">{t('sellPriceTag')}</span>
                        <span className="text-xs sm:text-sm font-black text-emerald-700 font-mono">
                          ₹{p.sellPrice}
                        </span>
                        {typeof p.mrp === 'number' && p.mrp > 0 && (
                          <span className="block text-[10px] text-slate-500 font-semibold font-mono mt-0.5">
                            {t('mrpTag')}: ₹{p.mrp}
                          </span>
                        )}
                      </div>

                      {(() => {
                        const rawMargin = Math.round(((p.sellPrice || 0) - (p.purchasePrice || 0)) * 100) / 100;
                        const margin = Math.abs(rawMargin) < 0.005 ? 0 : rawMargin;
                        const formattedMargin = Math.abs(margin).toFixed(2).replace(/\.00$/, '');
                        const colorClass =
                          margin > 0
                            ? 'text-emerald-700'
                            : margin < 0
                            ? 'text-red-600'
                            : 'text-slate-500';
                        const signPrefix = margin > 0 ? '+' : margin < 0 ? '-' : '';
                        return (
                          <div>
                            <span className={`text-[10px] ${colorClass} font-bold block uppercase`}>{t('margin')}</span>
                            <span className={`text-xs sm:text-sm font-black ${colorClass} font-mono`}>
                              {signPrefix}₹{formattedMargin}
                            </span>
                          </div>
                        );
                      })()}
                    </div>
                  )}
                </div>

                <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between gap-2">
                  <button
                    onClick={() => {
                      setRefillTarget(p);
                      setRefillQty('10');
                      setRefillCost(isStaff ? '' : p.purchasePrice.toString());
                    }}
                    className="flex-1 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs py-2 px-3 flex items-center justify-center gap-1.5 shadow-xs transition active:scale-95 cursor-pointer"
                  >
                    <PlusCircle className="h-4 w-4" />
                    <span>+ {t('maalAayaQuick')}</span>
                  </button>

                  <button
                    onClick={() => onEditProduct(p)}
                    className="rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 p-2 transition cursor-pointer"
                    title={t('edit')}
                  >
                    <Edit className="h-4 w-4" />
                  </button>

                  {!isStaff && (
                    <button
                      onClick={() => handleDelete(p)}
                      className="rounded-xl bg-slate-100 hover:bg-red-50 text-slate-500 hover:text-red-600 p-2 transition cursor-pointer"
                      title={t('delete')}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* QUICK REFILL MODAL */}
      {refillTarget && (
        <div className="keyboard-modal-overlay fixed inset-0 z-50 flex items-start sm:items-center justify-center bg-black/70 p-3 backdrop-blur-xs overflow-y-auto overscroll-contain">
          <div className="w-full max-w-md rounded-2xl bg-white text-slate-900 p-5 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 my-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500 text-slate-950 font-black">
                  <PackagePlus className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-black text-slate-900 text-base">{t('refillModalTitle')}</h3>
                  <p className="text-xs text-slate-500">{t('stockLeft')}: {refillTarget.stockQuantity} {refillTarget.unit}</p>
                </div>
              </div>
              <button
                onClick={() => setRefillTarget(null)}
                className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-3 bg-amber-50 p-3 rounded-xl border border-amber-200">
              <span className="text-[10px] font-bold text-amber-800 uppercase block">{refillTarget.company}</span>
              <h4 className="font-extrabold text-slate-900 text-sm mt-0.5">{refillTarget.name}</h4>
              <p className="text-xs text-slate-600 mt-1">
                {t('stockLeft')}: <strong className="text-slate-900">{refillTarget.stockQuantity} {refillTarget.unit}</strong>
              </p>
            </div>

            <form onSubmit={handleRefillSubmit} className="mt-4 space-y-3 keyboard-modal-body">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                  {t('refillQtyLabel')} <span className="text-red-500">*</span>
                </label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    min="0.01"
                    step="any"
                    required
                    value={refillQty}
                    onChange={(e) => setRefillQty(e.target.value)}
                    className="flex-1 rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-base font-black text-slate-900 focus:border-amber-500 outline-none"
                  />
                  <div className="flex gap-1">
                    {[10, 25, 50].map((quick) => (
                      <button
                        key={quick}
                        type="button"
                        onClick={() => setRefillQty(quick.toString())}
                        className="rounded-xl bg-slate-100 hover:bg-amber-100 border border-slate-200 px-2.5 py-1 text-xs font-bold text-slate-700 cursor-pointer"
                      >
                        +{quick}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {!isStaff && (
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                    {t('refillCostLabel')}
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2 text-slate-500 font-bold">₹</span>
                    <input
                      type="number"
                      step="any"
                      placeholder={`${t('rate')} ₹${refillTarget.purchasePrice}`}
                      value={refillCost}
                      onChange={(e) => setRefillCost(e.target.value)}
                      className="w-full rounded-xl border border-slate-300 bg-white pl-7 pr-3 py-2 text-sm font-bold text-slate-900 placeholder:text-slate-400 focus:border-amber-500 outline-none"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                  {t('notes')}
                </label>
                <input
                  type="text"
                  placeholder={t('refillNotePlaceholder')}
                  value={refillNote}
                  onChange={(e) => setRefillNote(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:border-amber-500 outline-none"
                />
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setRefillTarget(null)}
                  className="flex-1 rounded-xl bg-slate-100 px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-200 cursor-pointer"
                >
                  {t('cancel')}
                </button>
                <button
                  type="submit"
                  className="flex-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 text-xs font-black shadow-md flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Check className="h-4 w-4 stroke-[3]" />
                  <span>{t('save')}</span>
                </button>
              </div>

              <div className="h-20 sm:h-0 w-full shrink-0 pointer-events-none" aria-hidden="true" />
            </form>
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
    </div>
  );
};
