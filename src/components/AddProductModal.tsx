import React, { useState, useEffect, useMemo } from 'react';
import { X, Camera, Check, Sparkles, Building2, User, Tag, AlertCircle, Image as ImageIcon } from 'lucide-react';
import { useShop } from '../context/ShopContext';
import { Product } from '../types';
import { BarcodeScannerModal } from './BarcodeScannerModal';

const getStoredList = (key: string): string[] => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

const saveStoredList = (key: string, list: string[]) => {
  try {
    localStorage.setItem(key, JSON.stringify(list));
  } catch {
    // ignore
  }
};

interface AddProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingProduct?: Product | null;
  onSuccess?: (product: Product) => void;
}

export const AddProductModal: React.FC<AddProductModalProps> = ({
  isOpen,
  onClose,
  editingProduct,
  onSuccess,
}) => {
  const { addProduct, updateProduct, products, activeStaff, t } = useShop();
  const isStaff = Boolean(activeStaff);

  const [mode, setMode] = useState<'manual' | 'scan'>('manual');
  const [isScannerOpen, setIsScannerOpen] = useState(false);

  const [name, setName] = useState('');
  const [barcode, setBarcode] = useState('');
  const [company, setCompany] = useState('');
  const [customCompany, setCustomCompany] = useState('');
  const [vendor, setVendor] = useState('');
  const [customVendor, setCustomVendor] = useState('');
  const [category, setCategory] = useState('');
  const [customCategory, setCustomCategory] = useState('');
  const [purchasePrice, setPurchasePrice] = useState<string>('');
  const [sellPrice, setSellPrice] = useState<string>('');
  const [mrp, setMrp] = useState<string>('');
  const [stockQuantity, setStockQuantity] = useState<string>('');
  const [lowStockLimit, setLowStockLimit] = useState<string>('');
  const [unit, setUnit] = useState<string>('');
  const [photoUrl, setPhotoUrl] = useState<string>('');
  const [expiryDate, setExpiryDate] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  const [customCompaniesList, setCustomCompaniesList] = useState<string[]>(() =>
    getStoredList('yk_master_companies')
  );
  const [customVendorsList, setCustomVendorsList] = useState<string[]>(() =>
    getStoredList('yk_master_vendors')
  );
  const [customCategoriesList, setCustomCategoriesList] = useState<string[]>(() =>
    getStoredList('yk_master_categories')
  );

  const availableCompanies = useMemo(() => {
    const set = new Set<string>();
    customCompaniesList.forEach((c) => c && set.add(c.trim()));
    products.forEach((p) => p.company && set.add(p.company.trim()));
    return Array.from(set).sort();
  }, [customCompaniesList, products]);

  const availableVendors = useMemo(() => {
    const set = new Set<string>();
    customVendorsList.forEach((v) => v && set.add(v.trim()));
    products.forEach((p) => p.vendor && set.add(p.vendor.trim()));
    return Array.from(set).sort();
  }, [customVendorsList, products]);

  const availableCategories = useMemo(() => {
    const set = new Set<string>();
    customCategoriesList.forEach((c) => c && set.add(c.trim()));
    products.forEach((p) => p.category && set.add(p.category.trim()));
    return Array.from(set).sort();
  }, [customCategoriesList, products]);

  useEffect(() => {
    setCustomCompaniesList(getStoredList('yk_master_companies'));
    setCustomVendorsList(getStoredList('yk_master_vendors'));
    setCustomCategoriesList(getStoredList('yk_master_categories'));

    if (editingProduct) {
      setName(editingProduct.name);
      setBarcode(editingProduct.barcode || '');
      setCompany(editingProduct.company);
      setVendor(editingProduct.vendor);
      setCategory(editingProduct.category);
      setPurchasePrice(editingProduct.purchasePrice.toString());
      setSellPrice(editingProduct.sellPrice.toString());
      setMrp(
        editingProduct.mrp !== undefined && editingProduct.mrp !== null
          ? editingProduct.mrp.toString()
          : ''
      );
      setStockQuantity(editingProduct.stockQuantity.toString());
      setLowStockLimit(editingProduct.lowStockLimit.toString());
      setUnit(editingProduct.unit || 'Pcs');
      setPhotoUrl(editingProduct.photoUrl || '');
      setExpiryDate(editingProduct.expiryDate || '');
    } else {
      setName('');
      setBarcode('');
      setCompany('');
      setCustomCompany('');
      setVendor('');
      setCustomVendor('');
      setCategory('');
      setCustomCategory('');
      setPurchasePrice('');
      setSellPrice('');
      setMrp('');
      setStockQuantity('');
      setLowStockLimit('');
      setUnit('');
      setPhotoUrl('');
      setExpiryDate('');
      setError(null);
    }
  }, [editingProduct, isOpen]);

  if (!isOpen) return null;

  const handleGenerateBarcode = () => {
    const random12 = '890' + Math.floor(1000000000 + Math.random() * 9000000000).toString();
    setBarcode(random12);
  };

  const handleBarcodeScanned = (scannedCode: string) => {
    setBarcode(scannedCode);
    setIsScannerOpen(false);

    const existing = products.find((p) => p.barcode === scannedCode);
    if (existing && !editingProduct) {
      setError(t('duplicateBarcodeError', { barcode: scannedCode, name: existing.name }));
    }
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError(t('requiredFieldError', { field: t('productNameLabel') }));
      return;
    }

    const pPrice = isStaff
      ? (editingProduct ? editingProduct.purchasePrice : 0)
      : parseFloat(purchasePrice);
    const sPrice = parseFloat(sellPrice);

    if (!isStaff && (isNaN(pPrice) || pPrice < 0)) {
      setError(t('requiredFieldError', { field: t('purchasePriceLabel') }));
      return;
    }

    if (isNaN(sPrice) || sPrice < 0) {
      setError(t('requiredFieldError', { field: t('sellPriceLabel') }));
      return;
    }

    const finalCompany = company === 'OTHER' ? customCompany.trim() : company.trim();
    const finalVendor = isStaff
      ? (editingProduct ? editingProduct.vendor : '')
      : vendor === 'OTHER'
      ? customVendor.trim()
      : vendor.trim();
    const finalCategory = category === 'OTHER' ? customCategory.trim() : category.trim();
    const finalBarcode = barcode.trim() || '890' + Math.floor(1000000000 + Math.random() * 9000000000);

    if (finalCompany && !customCompaniesList.includes(finalCompany)) {
      const updated = [...customCompaniesList, finalCompany].sort();
      setCustomCompaniesList(updated);
      saveStoredList('yk_master_companies', updated);
    }
    if (finalVendor && !customVendorsList.includes(finalVendor)) {
      const updated = [...customVendorsList, finalVendor].sort();
      setCustomVendorsList(updated);
      saveStoredList('yk_master_vendors', updated);
    }
    if (finalCategory && !customCategoriesList.includes(finalCategory)) {
      const updated = [...customCategoriesList, finalCategory].sort();
      setCustomCategoriesList(updated);
      saveStoredList('yk_master_categories', updated);
    }

    const parsedStock = stockQuantity === '' ? 0 : parseFloat(stockQuantity);
    const parsedLimit = lowStockLimit === '' ? 5 : parseFloat(lowStockLimit);
    const trimmedMrp = mrp.trim();
    const rawMrp = trimmedMrp === '' ? null : parseFloat(trimmedMrp);
    const parsedMrp = rawMrp !== null && Number.isFinite(rawMrp) && rawMrp >= 0 ? rawMrp : null;

    const productPayload = {
      name: name.trim(),
      barcode: finalBarcode,
      company: finalCompany,
      vendor: finalVendor,
      category: finalCategory,
      purchasePrice: pPrice,
      sellPrice: sPrice,
      mrp: parsedMrp,
      stockQuantity: Number.isFinite(parsedStock) ? Math.max(0, Math.round(parsedStock * 1000) / 1000) : 0,
      lowStockLimit: Number.isFinite(parsedLimit) ? Math.max(0, Math.round(parsedLimit * 1000) / 1000) : 5,
      unit: unit || 'Pcs',
      photoUrl: photoUrl || undefined,
      expiryDate: expiryDate ? expiryDate : undefined,
    };

    if (editingProduct) {
      updateProduct(editingProduct.id, productPayload);
      if (onSuccess) onSuccess({ ...editingProduct, ...productPayload });
    } else {
      const created = addProduct(productPayload);
      if (onSuccess) onSuccess(created);
    }

    onClose();
  };

  return (
    <>
      <div className="keyboard-modal-overlay fixed inset-0 z-40 flex items-start sm:items-center justify-center bg-black/70 p-2 sm:p-4 backdrop-blur-xs overflow-y-auto overscroll-contain">
        <div className="relative w-full max-w-xl rounded-2xl bg-white text-slate-900 shadow-2xl border border-slate-200 overflow-hidden my-auto">
          {/* Header */}
          <div className="border-b border-slate-100 bg-linear-to-r from-amber-500 to-amber-600 px-5 py-3.5 text-slate-900 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900 text-amber-400 font-black">
                {editingProduct ? '✏️' : '⚡'}
              </div>
              <div>
                <h3 className="font-extrabold text-slate-950 text-base sm:text-lg">
                  {editingProduct ? t('editProductTitle') : t('addProductTitle')}
                </h3>
                <p className="text-xs text-amber-950 font-medium">
                  {editingProduct ? t('editProductTitle') : `${t('optionScan')} / ${t('optionManual')}`}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="rounded-lg p-2 text-slate-900 hover:bg-amber-400 transition cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Mode Selector Tabs */}
          {!editingProduct && (
            <div className="grid grid-cols-2 p-3 bg-slate-50 border-b border-slate-200 gap-2">
              <button
                type="button"
                onClick={() => {
                  setMode('scan');
                  setIsScannerOpen(true);
                }}
                className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl font-bold text-xs sm:text-sm transition cursor-pointer ${
                  mode === 'scan'
                    ? 'bg-amber-500 text-slate-950 shadow-sm'
                    : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-100'
                }`}
              >
                <Camera className="h-4 w-4 text-amber-900" />
                <span>{t('optionScan')}</span>
              </button>

              <button
                type="button"
                onClick={() => setMode('manual')}
                className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl font-bold text-xs sm:text-sm transition cursor-pointer ${
                  mode === 'manual'
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-100'
                }`}
              >
                <Tag className="h-4 w-4 text-amber-400" />
                <span>{t('optionManual')}</span>
              </button>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-4 sm:p-5 space-y-4 max-h-[calc(var(--vv-height,100dvh)-8.5rem)] sm:max-h-[75vh] overflow-y-auto overscroll-contain pb-24 sm:pb-5 keyboard-modal-body bg-white text-slate-900">
            {error && (
              <div className="rounded-xl bg-red-50 border border-red-200 p-3 text-red-700 text-xs font-semibold flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0 text-red-500" />
                {error}
              </div>
            )}

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                {t('productNameLabel')} <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder={t('productNamePlaceholder')}
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm font-semibold text-slate-900 placeholder:text-slate-400 focus:border-amber-500 focus:ring-2 focus:ring-amber-200 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1 flex items-center justify-between">
                <span>{t('barcodeLabel')}</span>
                <button
                  type="button"
                  onClick={handleGenerateBarcode}
                  className="text-[11px] font-bold text-amber-600 hover:text-amber-700 flex items-center gap-1 cursor-pointer"
                >
                  <Sparkles className="h-3 w-3" /> {t('autoGenerateBtn')}
                </button>
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="8901234567890..."
                  value={barcode}
                  onChange={(e) => setBarcode(e.target.value)}
                  className="flex-1 rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm font-mono text-slate-900 placeholder:text-slate-400 focus:border-amber-500 focus:ring-2 focus:ring-amber-200 outline-none"
                />
                <button
                  type="button"
                  onClick={() => setIsScannerOpen(true)}
                  className="rounded-xl bg-amber-100 hover:bg-amber-200 text-amber-900 font-bold px-3 py-2 text-xs flex items-center gap-1.5 border border-amber-300 transition cursor-pointer"
                >
                  <Camera className="h-4 w-4" />
                  <span>{t('scanShortBtn')}</span>
                </button>
              </div>
            </div>

            <div className={`grid grid-cols-1 ${isStaff ? '' : 'sm:grid-cols-2'} gap-3`}>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1 flex items-center gap-1">
                  <Building2 className="h-3.5 w-3.5 text-amber-500" />
                  {t('companyLabel')}
                </label>
                <select
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 font-bold focus:border-amber-500 focus:ring-2 focus:ring-amber-200 outline-none"
                >
                  <option value="">{t('selectCompanyPlaceholder')}</option>
                  {availableCompanies.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                  {company && company !== 'OTHER' && !availableCompanies.includes(company) && (
                    <option value={company}>{company}</option>
                  )}
                  <option value="OTHER">{t('otherCompanyOption')}</option>
                </select>
                {company === 'OTHER' && (
                  <input
                    type="text"
                    placeholder={t('enterCompanyPlaceholder')}
                    value={customCompany}
                    onChange={(e) => setCustomCompany(e.target.value)}
                    className="mt-1.5 w-full rounded-xl border border-amber-400 bg-white px-3 py-2 text-xs font-extrabold text-black placeholder:text-slate-400 focus:border-amber-500 focus:ring-2 focus:ring-amber-200 outline-none"
                    autoFocus
                  />
                )}
              </div>

              {!isStaff && (
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1 flex items-center gap-1">
                    <User className="h-3.5 w-3.5 text-blue-500" />
                    {t('vendorLabel')}
                  </label>
                  <select
                    value={vendor}
                    onChange={(e) => setVendor(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 font-bold focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none"
                  >
                    <option value="">{t('selectSupplierPlaceholder')}</option>
                    {availableVendors.map((v) => (
                      <option key={v} value={v}>{v}</option>
                    ))}
                    {vendor && vendor !== 'OTHER' && !availableVendors.includes(vendor) && (
                      <option value={vendor}>{vendor}</option>
                    )}
                    <option value="OTHER">{t('otherSupplierOption')}</option>
                  </select>
                  {vendor === 'OTHER' && (
                    <input
                      type="text"
                      placeholder={t('enterSupplierPlaceholder')}
                      value={customVendor}
                      onChange={(e) => setCustomVendor(e.target.value)}
                      className="mt-1.5 w-full rounded-xl border border-blue-400 bg-white px-3 py-2 text-xs font-extrabold text-black placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none"
                      autoFocus
                    />
                  )}
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                  {t('categoryLabel')}
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 font-bold focus:border-amber-500 focus:ring-2 focus:ring-amber-200 outline-none"
                >
                  <option value="">{t('selectCategoryPlaceholder')}</option>
                  {availableCategories.map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                  {category && category !== 'OTHER' && !availableCategories.includes(category) && (
                    <option value={category}>{category}</option>
                  )}
                  <option value="OTHER">{t('otherCategoryOption')}</option>
                </select>
                {category === 'OTHER' && (
                  <input
                    type="text"
                    placeholder={t('enterCategoryPlaceholder')}
                    value={customCategory}
                    onChange={(e) => setCustomCategory(e.target.value)}
                    className="mt-1.5 w-full rounded-xl border border-slate-400 bg-white px-3 py-2 text-xs font-extrabold text-black placeholder:text-slate-400 focus:border-amber-500 focus:ring-2 focus:ring-amber-200 outline-none"
                    autoFocus
                  />
                )}
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                  {t('unitLabel')}
                </label>
                <select
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-900 focus:border-amber-500 focus:ring-2 focus:ring-amber-200 outline-none"
                >
                  <option value="">{t('selectUnitPlaceholder')}</option>
                  <option value="Pcs">{t('unitPcsLabel')}</option>
                  <option value="Roll">{t('unitRollLabel')}</option>
                  <option value="Box">{t('unitBoxLabel')}</option>
                  <option value="Meter">{t('unitMeterLabel')}</option>
                  <option value="Packet">{t('unitPacketLabel')}</option>
                  <option value="Set">{t('unitSetLabel')}</option>
                  <option value="KG">{t('unitKgLabel')}</option>
                  <option value="Gram">{t('unitGramLabel')}</option>
                  <option value="Litre">{t('unitLitreLabel')}</option>
                </select>
              </div>
            </div>

            {/* Pricing */}
            <div className="rounded-xl bg-amber-50/70 border border-amber-200 p-3.5">
              <div className={`grid ${isStaff ? 'grid-cols-1' : 'grid-cols-2'} gap-3`}>
                {!isStaff && (
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                      {t('purchasePriceLabel')} <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-2.5 text-slate-400 font-bold">₹</span>
                      <input
                        type="number"
                        step="any"
                        required
                        placeholder="0.00"
                        value={purchasePrice}
                        onChange={(e) => setPurchasePrice(e.target.value)}
                        className="w-full rounded-xl border border-slate-300 bg-white pl-7 pr-3 py-2 text-sm font-bold text-slate-900 placeholder:text-slate-400 focus:border-amber-500 focus:ring-2 focus:ring-amber-200 outline-none"
                      />
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                    {t('sellPriceLabel')} <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-slate-400 font-bold">₹</span>
                    <input
                      type="number"
                      step="any"
                      required
                      placeholder="0.00"
                      value={sellPrice}
                      onChange={(e) => setSellPrice(e.target.value)}
                      className="w-full rounded-xl border border-slate-300 bg-white pl-7 pr-3 py-2 text-sm font-bold text-emerald-700 placeholder:text-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Optional MRP field below Selling Retail Price */}
              <div className="mt-3">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                  {t('mrpOptionalLabel')}
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-slate-400 font-bold">₹</span>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    placeholder="Optional"
                    value={mrp}
                    onChange={(e) => setMrp(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 bg-white pl-7 pr-3 py-2 text-sm font-bold text-slate-800 placeholder:text-slate-400 focus:border-amber-500 focus:ring-2 focus:ring-amber-200 outline-none"
                  />
                </div>
                {mrp.trim() !== '' &&
                  !isNaN(parseFloat(mrp)) &&
                  !isNaN(parseFloat(sellPrice)) &&
                  parseFloat(mrp) < parseFloat(sellPrice) && (
                    <p className="mt-1.5 text-xs font-bold text-red-600 flex items-center gap-1">
                      <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                      <span>{t('sellPriceMoreThanMrpWarning')}</span>
                    </p>
                  )}
              </div>

              {!isStaff && parseFloat(purchasePrice) > 0 && parseFloat(sellPrice) > 0 && (
                <div className="mt-2.5 pt-2 border-t border-amber-200 flex items-center justify-between text-xs font-bold text-slate-700">
                  <span>{t('profitPerItemPreview')}</span>
                  <span className={`px-2 py-0.5 rounded-md ${parseFloat(sellPrice) >= parseFloat(purchasePrice) ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-700'}`}>
                    ₹{(parseFloat(sellPrice) - parseFloat(purchasePrice)).toFixed(2)} ({(((parseFloat(sellPrice) - parseFloat(purchasePrice)) / parseFloat(purchasePrice)) * 100).toFixed(0)}%)
                  </span>
                </div>
              )}
            </div>

            {/* Stock Quantities */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                  {t('openingStockLabel')}
                </label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  required
                  value={stockQuantity}
                  onChange={(e) => setStockQuantity(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm font-bold text-slate-900 focus:border-amber-500 focus:ring-2 focus:ring-amber-200 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                  {t('lowStockLimitLabel')}
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    step="any"
                    required
                    value={lowStockLimit}
                    onChange={(e) => setLowStockLimit(e.target.value)}
                    className="w-full rounded-xl border border-rose-300 bg-rose-50/40 px-3.5 py-2 text-sm font-bold text-rose-800 focus:border-rose-500 focus:ring-2 focus:ring-rose-200 outline-none"
                  />
                  <span className="absolute right-3 top-2 text-[10px] font-bold text-rose-500">
                    {t('alertLimitPrefix')} {lowStockLimit}
                  </span>
                </div>
              </div>
            </div>

            {/* Product Expiry Date */}
            <div className="rounded-xl border border-amber-200 bg-amber-50/40 p-3">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                📅 {t('expiryDateLabel')}
              </label>
              <input
                type="date"
                value={expiryDate}
                onChange={(e) => setExpiryDate(e.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm font-bold text-slate-900 focus:border-amber-500 focus:ring-2 focus:ring-amber-200 outline-none"
              />
              <p className="text-[11px] text-slate-500 mt-1">
                {t('expiryAlertHint')}
              </p>
            </div>

            {/* Product Photo */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1 flex items-center justify-between">
                <span>{t('photoLabel')}</span>
                {photoUrl && (
                  <button
                    type="button"
                    onClick={() => setPhotoUrl('')}
                    className="text-[11px] text-red-500 hover:underline cursor-pointer"
                  >
                    {t('delete')}
                  </button>
                )}
              </label>
              <div className="flex items-center gap-3">
                {photoUrl ? (
                  <img
                    src={photoUrl}
                    alt={t('photoLabel')}
                    className="h-14 w-14 rounded-xl object-cover border border-slate-300 shadow-xs"
                  />
                ) : (
                  <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-slate-100 border border-dashed border-slate-300 text-slate-400">
                    <ImageIcon className="h-6 w-6" />
                  </div>
                )}
                <div className="flex-1">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoUpload}
                    className="text-xs text-slate-500 file:mr-2.5 file:rounded-xl file:border-0 file:bg-slate-100 file:px-3 file:py-1.5 file:text-xs file:font-bold file:text-slate-700 hover:file:bg-slate-200 cursor-pointer"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">{t('uploadImageBtn')}</p>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="pt-3 border-t border-slate-100 flex gap-2.5">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 rounded-xl bg-slate-100 px-4 py-3 text-sm font-bold text-slate-700 hover:bg-slate-200 transition cursor-pointer"
              >
                {t('cancel')}
              </button>
              <button
                type="submit"
                className="flex-2 rounded-xl bg-amber-500 px-4 py-3 text-sm font-black text-slate-950 hover:bg-amber-400 shadow-md transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <Check className="h-5 w-5 stroke-[3]" />
                <span>{editingProduct ? t('updateProductBtn') : t('saveToStockBtn')}</span>
              </button>
            </div>

            <div className="h-28 sm:h-0 w-full shrink-0 pointer-events-none" aria-hidden="true" />
          </form>
        </div>
      </div>

      <BarcodeScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onScanSuccess={handleBarcodeScanned}
        title={t('scanBarcodeSearchTitle')}
        subtitle={t('scanBarcodeSearchSub')}
      />
    </>
  );
};
