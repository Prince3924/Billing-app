import React, { useState, useMemo } from 'react';
import {
  Building2, Plus, Search, MessageSquare,
  Trash2, ArrowDownLeft, ArrowUpRight
} from 'lucide-react';
import { useShop } from '../context/ShopContext';

export const SupplierKhataScreen: React.FC = () => {
  const {
    suppliers,
    addSupplier,
    deleteSupplier,
    addSupplierPurchase,
    paySupplier,
    shopInfo,
    language,
    t,
  } = useShop();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSupplierId, setSelectedSupplierId] = useState<string | null>(null);

  const [isAddSupplierModalOpen, setIsAddSupplierModalOpen] = useState(false);
  const [isAddPurchaseModalOpen, setIsAddPurchaseModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);

  const [newSupName, setNewSupName] = useState('');
  const [newSupMobile, setNewSupMobile] = useState('');
  const [newSupFirm, setNewSupFirm] = useState('');

  const [purchaseDesc, setPurchaseDesc] = useState('');
  const [purchaseTotal, setPurchaseTotal] = useState('');
  const [purchasePaid, setPurchasePaid] = useState('');

  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMode, setPaymentMode] = useState<'Cash' | 'UPI' | 'Bank'>('Cash');
  const [paymentNotes, setPaymentNotes] = useState('');

  const selectedSupplier = useMemo(() => {
    return suppliers.find((s) => s.id === selectedSupplierId) || suppliers[0] || null;
  }, [suppliers, selectedSupplierId]);

  const supplierStats = useMemo(() => {
    return suppliers.map((sup) => {
      const totalPurchased = sup.purchases.reduce((acc, p) => acc + p.totalAmount, 0);
      const totalPaid = sup.payments.reduce((acc, p) => acc + p.amount, 0);
      const balance = Math.max(0, totalPurchased - totalPaid);
      return {
        ...sup,
        totalPurchased,
        totalPaid,
        balance,
        isClear: balance <= 0,
      };
    });
  }, [suppliers]);

  const overallPurchased = supplierStats.reduce((acc, s) => acc + s.totalPurchased, 0);
  const overallPaid = supplierStats.reduce((acc, s) => acc + s.totalPaid, 0);
  const overallPending = supplierStats.reduce((acc, s) => acc + s.balance, 0);

  const filteredSuppliers = useMemo(() => {
    return supplierStats.filter((s) => {
      const term = searchTerm.toLowerCase();
      return (
        s.name.toLowerCase().includes(term) ||
        s.mobile.includes(term) ||
        (s.shopFirmName && s.shopFirmName.toLowerCase().includes(term))
      );
    });
  }, [supplierStats, searchTerm]);

  const handleCreateSupplier = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSupName.trim() || !newSupMobile.trim()) return;

    const created = addSupplier(newSupName, newSupMobile, newSupFirm);
    setSelectedSupplierId(created.id);
    setNewSupName('');
    setNewSupMobile('');
    setNewSupFirm('');
    setIsAddSupplierModalOpen(false);
  };

  const handleCreatePurchase = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSupplier) return;
    const total = parseFloat(purchaseTotal);
    const paid = parseFloat(purchasePaid) || 0;
    if (isNaN(total) || total <= 0) return;

    addSupplierPurchase(selectedSupplier.id, {
      description: purchaseDesc.trim() || t('defaultPurchaseDesc'),
      totalAmount: total,
      paidAmount: paid,
    });

    setPurchaseDesc('');
    setPurchaseTotal('');
    setPurchasePaid('');
    setIsAddPurchaseModalOpen(false);
  };

  const handleRecordPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSupplier) return;
    const amt = parseFloat(paymentAmount);
    if (isNaN(amt) || amt <= 0) return;

    paySupplier(selectedSupplier.id, {
      amount: amt,
      paymentMode,
      notes: paymentNotes.trim() || undefined,
    });

    setPaymentAmount('');
    setPaymentNotes('');
    setIsPaymentModalOpen(false);
  };

  const handleWhatsAppShare = (sup: (typeof supplierStats)[0]) => {
    const text = t('supplierWaMessage', {
      name: sup.name,
      firm: sup.shopFirmName || '-',
      shop: shopInfo.name || t('appName'),
      purchased: sup.totalPurchased.toLocaleString('en-IN'),
      paid: sup.totalPaid.toLocaleString('en-IN'),
      remaining: sup.balance.toLocaleString('en-IN'),
    });

    const phone = sup.mobile.replace(/\D/g, '');
    const formatted = phone.length === 10 ? '91' + phone : phone;
    const url = formatted
      ? `https://wa.me/${formatted}?text=${encodeURIComponent(text)}`
      : `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  const getPaymentModeLabel = (mode: 'Cash' | 'UPI' | 'Bank') => {
    if (mode === 'Cash') return t('cashLabel');
    if (mode === 'UPI') return t('upiLabel');
    return t('payModeBank');
  };

  const activeSupplierStat = supplierStats.find((s) => s.id === (selectedSupplier?.id || ''));
  const dateLocale = language === 'hindi' ? 'hi-IN' : 'en-IN';

  return (
    <div className="space-y-4">
      {/* Top Header */}
      <div className="rounded-2xl bg-slate-900 p-4 text-white shadow-md flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-400">
              🤝 {t('navSupplierKhata')}
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
            {t('supplierKhataTitle')}
          </h1>
          <p className="text-xs text-slate-400">
            {t('supplierKhataSub')}
          </p>
        </div>

        <button
          onClick={() => setIsAddSupplierModalOpen(true)}
          className="flex items-center gap-2 rounded-xl bg-amber-500 hover:bg-amber-400 px-4 py-2.5 text-slate-950 font-black text-xs sm:text-sm shadow-md transition active:scale-95 cursor-pointer"
        >
          <Plus className="h-4 w-4 stroke-[3]" />
          <span>{t('addSupplierBtn')}</span>
        </button>
      </div>

      {/* Aggregate Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="rounded-2xl bg-white text-slate-900 border border-slate-200 p-3.5 shadow-xs">
          <span className="text-[10px] font-bold uppercase text-slate-500 block">{t('totalPurchased')}</span>
          <span className="text-xl font-black text-slate-900 font-mono">
            ₹{overallPurchased.toLocaleString('en-IN')}
          </span>
          <span className="text-[10px] text-slate-500 block mt-0.5">
            {suppliers.length} {t('suppliersCountLabel')}
          </span>
        </div>

        <div className="rounded-2xl bg-white text-slate-900 border border-slate-200 p-3.5 shadow-xs">
          <span className="text-[10px] font-bold uppercase text-emerald-700 block">{t('totalPaid')}</span>
          <span className="text-xl font-black text-emerald-800 font-mono">
            ₹{overallPaid.toLocaleString('en-IN')}
          </span>
          <span className="text-[10px] text-emerald-700 block mt-0.5">{t('paidViaCashBankSub')}</span>
        </div>

        <div className="rounded-2xl bg-rose-50 text-slate-900 border border-rose-200 p-3.5 shadow-xs">
          <span className="text-[10px] font-bold uppercase text-rose-800 block">{t('remainingToPay')}</span>
          <span className="text-xl font-black text-rose-950 font-mono">
            ₹{overallPending.toLocaleString('en-IN')}
          </span>
          <span className="text-[10px] text-rose-700 block mt-0.5">{t('pendingBalanceSub')}</span>
        </div>
      </div>

      {/* Main Split Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <div className="lg:col-span-5 space-y-3">
          <div className="rounded-2xl bg-white p-3.5 border border-slate-200 shadow-sm space-y-2.5">
            <div className="relative">
              <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder={t('searchSupplierPlaceholder')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white text-slate-900 placeholder:text-slate-400 pl-10 pr-3 py-2 text-xs font-semibold focus:border-amber-500 outline-none"
              />
            </div>
          </div>

          <div className="space-y-2 max-h-[580px] overflow-y-auto pr-1">
            {filteredSuppliers.length === 0 ? (
              <div className="rounded-2xl bg-white p-8 text-center border border-slate-200 text-slate-400">
                <Building2 className="h-10 w-10 mx-auto mb-2 text-slate-300" />
                <p className="font-bold text-slate-700 text-sm">{t('noSupplierFoundTitle')}</p>
                <p className="text-xs text-slate-500 mt-1">{t('noSupplierFoundSub')}</p>
              </div>
            ) : (
              filteredSuppliers.map((sup) => {
                const isSelected = selectedSupplier?.id === sup.id;
                return (
                  <div
                    key={sup.id}
                    onClick={() => setSelectedSupplierId(sup.id)}
                    className={`rounded-2xl p-3.5 border transition cursor-pointer flex items-center justify-between gap-3 text-slate-900 ${
                      isSelected
                        ? 'bg-amber-50 border-amber-400 shadow-sm'
                        : 'bg-white border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <h4 className="font-bold text-slate-900 text-sm truncate">{sup.name}</h4>
                        {sup.shopFirmName && (
                          <span className="text-[10px] text-slate-500 truncate">({sup.shopFirmName})</span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 font-mono mt-0.5">📞 {sup.mobile}</p>
                    </div>

                    <div className="text-right shrink-0">
                      {sup.isClear ? (
                        <span className="text-[10px] font-black bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full border border-emerald-300">
                          {t('paidClearBadge')}
                        </span>
                      ) : (
                        <div>
                          <span className="text-xs font-black text-rose-700 font-mono block">
                            ₹{sup.balance.toLocaleString('en-IN')}
                          </span>
                          <span className="text-[10px] text-slate-500">{t('toPayBadge')}</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div className="lg:col-span-7">
          {activeSupplierStat ? (
            <div className="rounded-2xl bg-white text-slate-900 border border-slate-200 shadow-sm overflow-hidden space-y-4 p-4 sm:p-5">
              <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base sm:text-lg font-black text-slate-900">
                      {activeSupplierStat.name}
                    </h3>
                    {activeSupplierStat.isClear ? (
                      <span className="text-[10px] font-black bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">
                        {t('paidClearBadge')}
                      </span>
                    ) : (
                      <span className="text-[10px] font-black bg-rose-100 text-rose-800 px-2 py-0.5 rounded-full">
                        {t('balanceShort')} ₹{activeSupplierStat.balance.toLocaleString('en-IN')}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 font-mono mt-0.5">
                    📞 {activeSupplierStat.mobile} {activeSupplierStat.shopFirmName ? `• ${activeSupplierStat.shopFirmName}` : ''}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleWhatsAppShare(activeSupplierStat)}
                    className="flex items-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-3 py-2 transition active:scale-95 cursor-pointer shadow-xs"
                    title={t('sendSupplierWhatsApp')}
                  >
                    <MessageSquare className="h-3.5 w-3.5 fill-white" />
                    <span>{t('whatsAppBtnShort')}</span>
                  </button>

                  <button
                    onClick={() => {
                      if (confirm(t('deleteSupplierConfirm', { name: activeSupplierStat.name }))) {
                        deleteSupplier(activeSupplierStat.id);
                        setSelectedSupplierId(null);
                      }
                    }}
                    className="rounded-xl p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 transition cursor-pointer"
                    title={t('delete')}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <button
                  onClick={() => setIsAddPurchaseModalOpen(true)}
                  className="rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-black text-xs py-2.5 px-3 flex items-center justify-center gap-1.5 transition active:scale-95 cursor-pointer"
                >
                  <ArrowDownLeft className="h-4 w-4 text-amber-400" />
                  <span>{t('addPurchaseUdharBtn')}</span>
                </button>

                <button
                  onClick={() => setIsPaymentModalOpen(true)}
                  className="rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs py-2.5 px-3 flex items-center justify-center gap-1.5 transition active:scale-95 cursor-pointer"
                >
                  <ArrowUpRight className="h-4 w-4 text-white" />
                  <span>{t('paySupplierBtn')}</span>
                </button>
              </div>

              <div className="space-y-2">
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-500">
                  {t('ledgerEntriesHeading')}
                </h4>

                <div className="space-y-2 max-h-[360px] overflow-y-auto pr-1">
                  {(() => {
                    const entries: Array<{
                      id: string;
                      date: string;
                      type: 'purchase' | 'payment';
                      title: string;
                      amount: number;
                      sub?: string;
                    }> = [
                      ...activeSupplierStat.purchases.map((p) => ({
                        id: p.id,
                        date: p.date,
                        type: 'purchase' as const,
                        title: p.description,
                        amount: p.totalAmount,
                        sub: `${t('paidLabelShort')} ₹${p.paidAmount} • ${t('remainingLabelShort')} ₹${p.remainingAmount}`,
                      })),
                      ...activeSupplierStat.payments.map((p) => ({
                        id: p.id,
                        date: p.date,
                        type: 'payment' as const,
                        title: t('paymentMadeTitle', { mode: getPaymentModeLabel(p.paymentMode) }),
                        amount: p.amount,
                        sub: p.notes,
                      })),
                    ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

                    if (entries.length === 0) {
                      return (
                        <div className="p-6 text-center text-slate-500 text-xs">
                          {t('noLedgerEntriesMsg')}
                        </div>
                      );
                    }

                    return entries.map((e) => (
                      <div
                        key={e.id}
                        className={`rounded-xl p-3 border flex items-center justify-between gap-2 ${
                          e.type === 'purchase'
                            ? 'bg-rose-50/40 border-rose-200'
                            : 'bg-emerald-50/40 border-emerald-200'
                        }`}
                      >
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span
                              className={`text-[10px] font-black px-1.5 py-0.2 rounded uppercase ${
                                e.type === 'purchase' ? 'bg-rose-200 text-rose-900' : 'bg-emerald-200 text-emerald-900'
                              }`}
                            >
                              {e.type === 'purchase' ? t('purchaseEntryTag') : t('paymentEntryTag')}
                            </span>
                            <span className="font-bold text-xs text-slate-900">{e.title}</span>
                          </div>
                          <p className="text-[11px] text-slate-500 mt-0.5">
                            {new Date(e.date).toLocaleDateString(dateLocale, { day: 'numeric', month: 'short', year: 'numeric' })}
                            {e.sub ? ` • ${e.sub}` : ''}
                          </p>
                        </div>

                        <div className="text-right font-mono font-black text-sm">
                          <span className={e.type === 'purchase' ? 'text-rose-700' : 'text-emerald-700'}>
                            {e.type === 'purchase' ? '+' : '-'}₹{e.amount.toLocaleString('en-IN')}
                          </span>
                        </div>
                      </div>
                    ));
                  })()}
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl bg-white text-slate-900 border border-slate-200 p-12 text-center">
              <Building2 className="h-12 w-12 mx-auto mb-2 text-slate-300" />
              <p className="font-bold text-slate-700 text-base">{t('noSupplierSelectedTitle')}</p>
              <p className="text-xs text-slate-500 mt-1">{t('noSupplierSelectedSub')}</p>
            </div>
          )}
        </div>
      </div>

      {/* MODAL 1: ADD NEW SUPPLIER */}
      {isAddSupplierModalOpen && (
        <div className="keyboard-modal-overlay fixed inset-0 z-50 flex items-start sm:items-center justify-center bg-black/70 p-4 backdrop-blur-xs overflow-y-auto overscroll-contain">
          <div className="w-full max-w-md my-auto rounded-2xl bg-white text-slate-900 p-5 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-extrabold text-slate-900 text-base">
                🤝 {t('addSupplierBtn')}
              </h3>
              <button
                onClick={() => setIsAddSupplierModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateSupplier} className="mt-4 space-y-3 keyboard-modal-body">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-600 mb-1">
                  {t('supplierNameLabel')} <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder={t('supplierNameInputPlaceholder')}
                  value={newSupName}
                  onChange={(e) => setNewSupName(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-bold text-slate-900 placeholder:text-slate-400 focus:border-amber-500 outline-none"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-600 mb-1">
                  {t('supplierMobileLabel')} <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  required
                  placeholder={t('supplierMobileInputPlaceholder')}
                  value={newSupMobile}
                  onChange={(e) => setNewSupMobile(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-bold text-slate-900 placeholder:text-slate-400 focus:border-amber-500 outline-none font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-600 mb-1">
                  {t('shopFirmNameLabel')}
                </label>
                <input
                  type="text"
                  placeholder={t('shopFirmInputPlaceholder')}
                  value={newSupFirm}
                  onChange={(e) => setNewSupFirm(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-bold text-slate-900 placeholder:text-slate-400 focus:border-amber-500 outline-none"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddSupplierModalOpen(false)}
                  className="flex-1 rounded-xl bg-slate-100 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-200 transition cursor-pointer"
                >
                  {t('cancel')}
                </button>
                <button
                  type="submit"
                  className="flex-1 rounded-xl bg-amber-500 py-2.5 text-xs font-black text-slate-950 hover:bg-amber-400 transition cursor-pointer"
                >
                  {t('saveSettingsBtn')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: ADD PURCHASE / UDHAR ENTRY */}
      {isAddPurchaseModalOpen && selectedSupplier && (
        <div className="keyboard-modal-overlay fixed inset-0 z-50 flex items-start sm:items-center justify-center bg-black/70 p-4 backdrop-blur-xs overflow-y-auto overscroll-contain">
          <div className="w-full max-w-md my-auto rounded-2xl bg-white text-slate-900 p-5 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-extrabold text-slate-900 text-base">
                📦 {t('addPurchaseUdharBtn')} - {selectedSupplier.name}
              </h3>
              <button
                onClick={() => setIsAddPurchaseModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreatePurchase} className="mt-4 space-y-3 keyboard-modal-body">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-600 mb-1">
                  {t('purchaseDescLabel')}
                </label>
                <input
                  type="text"
                  placeholder={t('purchaseDescPlaceholder')}
                  value={purchaseDesc}
                  onChange={(e) => setPurchaseDesc(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-bold text-slate-900 placeholder:text-slate-400 focus:border-amber-500 outline-none"
                  autoFocus
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-600 mb-1">
                    {t('totalPurchaseAmtLabel')} <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    required
                    placeholder="0.00"
                    value={purchaseTotal}
                    onChange={(e) => setPurchaseTotal(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-bold text-slate-900 placeholder:text-slate-400 focus:border-amber-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-slate-600 mb-1">
                    {t('paidNowAmtLabel')}
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    placeholder="0.00"
                    value={purchasePaid}
                    onChange={(e) => setPurchasePaid(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-bold text-emerald-700 placeholder:text-slate-400 focus:border-emerald-500 outline-none"
                  />
                </div>
              </div>

              {parseFloat(purchaseTotal) > 0 && (
                <div className="rounded-xl bg-amber-50 p-2.5 border border-amber-200 flex justify-between text-xs font-bold">
                  <span className="text-slate-700">{t('balanceAddedToLedger')}</span>
                  <span className="text-rose-700 font-mono font-black text-sm">
                    ₹{Math.max(0, (parseFloat(purchaseTotal) || 0) - (parseFloat(purchasePaid) || 0))}
                  </span>
                </div>
              )}

              <div className="pt-3 border-t border-slate-100 flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddPurchaseModalOpen(false)}
                  className="flex-1 rounded-xl bg-slate-100 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-200 transition cursor-pointer"
                >
                  {t('cancel')}
                </button>
                <button
                  type="submit"
                  className="flex-1 rounded-xl bg-amber-500 py-2.5 text-xs font-black text-slate-950 hover:bg-amber-400 transition cursor-pointer"
                >
                  {t('savePurchaseBtn')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: RECORD PAYMENT */}
      {isPaymentModalOpen && selectedSupplier && (
        <div className="keyboard-modal-overlay fixed inset-0 z-50 flex items-start sm:items-center justify-center bg-black/70 p-4 backdrop-blur-xs overflow-y-auto overscroll-contain">
          <div className="w-full max-w-md my-auto rounded-2xl bg-white text-slate-900 p-5 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-extrabold text-slate-900 text-base">
                💸 {t('paySupplierBtn')} - {selectedSupplier.name}
              </h3>
              <button
                onClick={() => setIsPaymentModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleRecordPayment} className="mt-4 space-y-3 keyboard-modal-body">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-600 mb-1">
                  {t('paymentAmountLabel')} <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  min="1"
                  step="any"
                  required
                  placeholder="0.00"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-bold text-emerald-800 placeholder:text-slate-400 focus:border-emerald-500 outline-none"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-600 mb-1">
                  {t('paymentModeShortLabel')}
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['Cash', 'UPI', 'Bank'] as const).map((mode) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => setPaymentMode(mode)}
                      className={`py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                        paymentMode === mode
                          ? 'bg-slate-900 text-white'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      {getPaymentModeLabel(mode)}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-600 mb-1">
                  {t('paymentRefNoteLabel')}
                </label>
                <input
                  type="text"
                  placeholder={t('paymentRefNotePlaceholder')}
                  value={paymentNotes}
                  onChange={(e) => setPaymentNotes(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:border-amber-500 outline-none"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsPaymentModalOpen(false)}
                  className="flex-1 rounded-xl bg-slate-100 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-200 transition cursor-pointer"
                >
                  {t('cancel')}
                </button>
                <button
                  type="submit"
                  className="flex-1 rounded-xl bg-emerald-600 py-2.5 text-xs font-black text-white hover:bg-emerald-500 transition cursor-pointer"
                >
                  {t('recordPaymentBtn')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
