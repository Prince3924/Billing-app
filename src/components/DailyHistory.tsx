import React, { useState, useMemo } from 'react';
import {
  Calendar,
  Search,
  Eye,
  Edit,
  Trash2,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  MessageSquare,
  Bell,
  Check,
  AlertTriangle,
} from 'lucide-react';
import { useShop } from '../context/ShopContext';
import { Bill } from '../types';
import { BillReceiptModal } from './BillReceiptModal';
import { getUdharReminderMessage } from '../utils/billNumber';

export const DailyHistory: React.FC = () => {
  const {
    bills,
    cancelBill,
    updateBill,
    openBillEditorFromEstimate,
    openBillEditorForEdit,
    shopInfo,
    language,
    t,
  } = useShop();

  const todayStr = new Date().toISOString().split('T')[0];
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);
  const [filterMode, setFilterMode] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [alertToast, setAlertToast] = useState<string | null>(null);

  const [selectedBillId, setSelectedBillId] = useState<string | null>(null);
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);

  const selectedBill = useMemo(
    () => (selectedBillId ? bills.find((b) => b.id === selectedBillId) || null : null),
    [bills, selectedBillId]
  );

  const trimmedSearch = searchQuery.trim().toLowerCase();

  const dateBills = useMemo(() => {
    return bills.filter((b) => {
      if (filterMode === 'Estimates') {
        if (!b.isEstimate) return false;
      } else {
        if (b.isEstimate) return false;
        // When searching by serial number / customer / bill no, allow finding across all dates for warranty checks
        if (!trimmedSearch) {
          const matchDate = b.date.startsWith(selectedDate);
          if (!matchDate) return false;
        }
        const matchMode = filterMode === 'ALL' || b.paymentMode === filterMode;
        if (!matchMode) return false;
      }

      const matchSearch =
        !trimmedSearch ||
        b.billNumber.toLowerCase().includes(trimmedSearch) ||
        (b.customerName && b.customerName.toLowerCase().includes(trimmedSearch)) ||
        (b.customerMobile && b.customerMobile.toLowerCase().includes(trimmedSearch)) ||
        (b.notes && b.notes.toLowerCase().includes(trimmedSearch)) ||
        b.items.some((i) => i.productName.toLowerCase().includes(trimmedSearch));

      return matchSearch;
    });
  }, [bills, selectedDate, filterMode, trimmedSearch]);

  const tomorrowReminderBills = useMemo(() => {
    return bills.filter(
      (b) => !b.isEstimate && b.paymentMode === 'Udhar' && !b.isSettled && b.remindTomorrow
    );
  }, [bills]);

  const dateStats = useMemo(() => {
    const totalSale = dateBills.reduce((acc, b) => acc + b.grandTotal, 0);
    const totalProfit = dateBills.reduce((acc, b) => acc + b.totalProfit, 0);
    const totalItems = dateBills.reduce(
      (acc, b) => acc + b.items.reduce((sum, item) => sum + item.quantity, 0),
      0
    );
    const cashTotal = dateBills
      .filter((b) => b.paymentMode === 'Cash')
      .reduce((acc, b) => acc + b.grandTotal, 0);
    const upiTotal = dateBills
      .filter((b) => b.paymentMode === 'UPI')
      .reduce((acc, b) => acc + b.grandTotal, 0);
    const pendingUdharTotal = dateBills
      .filter((b) => b.paymentMode === 'Udhar' && !b.isSettled)
      .reduce((acc, b) => acc + b.grandTotal, 0);

    return {
      totalSale,
      totalProfit,
      totalItems,
      billCount: dateBills.length,
      cashTotal,
      upiTotal,
      pendingUdharTotal,
    };
  }, [dateBills]);

  const handlePrevDay = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() - 1);
    setSelectedDate(d.toISOString().split('T')[0]);
  };

  const handleNextDay = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + 1);
    setSelectedDate(d.toISOString().split('T')[0]);
  };

  const handleCancelBill = (bill: Bill) => {
    if (confirm(t('cancelBillConfirm', { billNo: bill.billNumber }))) {
      cancelBill(bill.id);
    }
  };

  const handleConvertEstimate = (bill: Bill) => {
    if (bill.isConverted) {
      setAlertToast(t('estimateAlreadyConvertedError'));
      setTimeout(() => setAlertToast(null), 3500);
      return;
    }
    openBillEditorFromEstimate(bill);
  };

  const handleSendWhatsAppReminder = (bill: Bill) => {
    const customer = bill.customerName || '';
    const shop = shopInfo.name || '';
    const amount = bill.grandTotal;

    const message = getUdharReminderMessage(
      shopInfo.udharTemplates,
      language,
      customer,
      amount,
      shop,
      shopInfo.mobile
    );

    const phone = bill.customerMobile ? bill.customerMobile.replace(/\D/g, '') : '';
    const formattedPhone = phone.length === 10 ? '91' + phone : phone;
    const encodedMsg = encodeURIComponent(message);
    const waUrl = formattedPhone
      ? `https://wa.me/${formattedPhone}?text=${encodedMsg}`
      : `https://wa.me/?text=${encodedMsg}`;
    window.open(waUrl, '_blank');
  };

  const handleToggleRemindTomorrow = (bill: Bill) => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(10, 0, 0, 0);

    const newState = !bill.remindTomorrow;
    updateBill(bill.id, {
      remindTomorrow: newState,
      remindTomorrowDate: newState ? tomorrow.toISOString() : undefined,
    });
  };

  const formatDisplayDate = (dStr: string) => {
    const d = new Date(dStr + 'T12:00:00');
    const locale = language === 'hindi' ? 'hi-IN' : 'en-IN';
    return d.toLocaleDateString(locale, {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  const getPaymentModeLabel = (mode: string) => {
    if (mode === 'Cash') return t('payCash');
    if (mode === 'UPI') return t('payUpi');
    if (mode === 'Udhar') return t('payUdhar');
    return mode;
  };

  return (
    <div className="space-y-4">
      {/* Top Header */}
      <div className="rounded-2xl bg-slate-900 p-4 text-white shadow-md flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-400">
              📅 {t('navHistory')}
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
            {t('dailyHistoryTitle')}
          </h1>
          <p className="text-xs text-slate-400">{t('dailyHistorySub')}</p>
        </div>

        <div className="flex items-center gap-2 bg-slate-800 p-1.5 rounded-2xl border border-slate-700">
          <button
            type="button"
            onClick={handlePrevDay}
            className="rounded-xl p-2 text-slate-300 hover:bg-slate-700 hover:text-white transition cursor-pointer"
            title={t('previousDayTitle')}
          >
            <ChevronLeft className="h-5 w-5" />
          </button>

          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="rounded-xl bg-slate-900 px-3 py-1.5 text-xs sm:text-sm font-bold text-amber-300 outline-none border border-slate-700 focus:border-amber-400 cursor-pointer"
          />

          <button
            type="button"
            onClick={handleNextDay}
            disabled={selectedDate >= todayStr}
            className="rounded-xl p-2 text-slate-300 hover:bg-slate-700 hover:text-white disabled:opacity-30 transition cursor-pointer"
            title={t('nextDayTitle')}
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Scheduled Reminders Banner */}
      {tomorrowReminderBills.length > 0 && (
        <div className="rounded-2xl bg-amber-50 border-2 border-amber-300 p-4 shadow-sm space-y-3 text-slate-900">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-500 text-slate-950 font-black shadow-xs">
                <Bell className="h-4 w-4" />
              </div>
              <div>
                <h3 className="font-black text-amber-950 text-sm sm:text-base">
                  {t('scheduledRemindersTitle')} ({tomorrowReminderBills.length})
                </h3>
                <p className="text-xs text-amber-800">{t('tomorrowMorningReminderMsg')}</p>
              </div>
            </div>
            <span className="text-xs font-mono font-bold bg-amber-200 text-amber-900 px-2.5 py-1 rounded-full border border-amber-300">
              ⏰ 10:00 AM
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
            {tomorrowReminderBills.map((remBill) => (
              <div
                key={remBill.id}
                className="rounded-xl bg-white p-3 border border-amber-200 shadow-xs flex items-center justify-between gap-2 text-slate-900"
              >
                <div>
                  <h4 className="font-bold text-xs text-slate-900">
                    {remBill.customerName || t('customer')}
                    {remBill.customerMobile && (
                      <span className="ml-1 text-[11px] font-mono text-slate-500">
                        ({remBill.customerMobile})
                      </span>
                    )}
                  </h4>
                  <div className="text-[11px] text-rose-700 font-bold font-mono">
                    ₹{remBill.grandTotal} • {remBill.billNumber}
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleSendWhatsAppReminder(remBill)}
                    className="flex items-center gap-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white px-2.5 py-1 text-xs font-black shadow-xs transition active:scale-95 cursor-pointer"
                    title={t('sendWhatsAppReminderBtn')}
                  >
                    <MessageSquare className="h-3 w-3 fill-white" />
                    <span className="text-[11px]">{t('whatsappLabel')}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => updateBill(remBill.id, { isSettled: true, remindTomorrow: false })}
                    className="flex items-center gap-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 px-2 py-1 text-[11px] font-bold transition active:scale-95 cursor-pointer"
                    title={t('markAsPaidBtn')}
                  >
                    <Check className="h-3 w-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Selected Date Summary Card */}
      <div className="rounded-2xl bg-white text-slate-900 p-4 sm:p-5 shadow-sm border border-slate-200">
        <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-100">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              {t('selectDateLabel')}
            </span>
            <h2 className="text-base sm:text-lg font-black text-slate-900 capitalize">
              {formatDisplayDate(selectedDate)}
              {selectedDate === todayStr && (
                <span className="ml-2 text-xs bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-bold">
                  {t('todayParenTag')}
                </span>
              )}
            </h2>
          </div>

          <button
            type="button"
            onClick={() => setSelectedDate(todayStr)}
            className="rounded-xl bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100 px-3 py-1.5 text-xs font-bold transition cursor-pointer"
          >
            {t('todayBtn')}
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
          <div className="rounded-xl bg-emerald-50 p-3 border border-emerald-200">
            <span className="text-[10px] font-bold text-emerald-800 uppercase block">
              {t('daySalesTotal')}
            </span>
            <span className="text-xl sm:text-2xl font-black text-emerald-950 font-mono">
              ₹{dateStats.totalSale.toLocaleString('en-IN')}
            </span>
            <p className="text-[11px] text-emerald-700 mt-0.5">
              {dateStats.billCount} {t('billsCount')} • {dateStats.totalItems} {t('qty')}
            </p>
          </div>

          <div className="rounded-xl bg-amber-50 p-3 border border-amber-200">
            <span className="text-[10px] font-bold text-amber-800 uppercase block">
              {t('dayProfitTotal')}
            </span>
            <span className="text-xl sm:text-2xl font-black text-amber-950 font-mono">
              ₹{dateStats.totalProfit.toLocaleString('en-IN')}
            </span>
            <p className="text-[11px] text-amber-700 mt-0.5">
              {dateStats.totalSale > 0
                ? `${((dateStats.totalProfit / dateStats.totalSale) * 100).toFixed(0)}${t('marginPctSuffix')}`
                : t('margin')}
            </p>
          </div>

          <div className="rounded-xl bg-blue-50 p-3 border border-blue-200">
            <span className="text-[10px] font-bold text-blue-800 uppercase block">
              {t('cashUpiReceived')}
            </span>
            <span className="text-lg sm:text-xl font-black text-blue-950 font-mono">
              ₹{(dateStats.cashTotal + dateStats.upiTotal).toLocaleString('en-IN')}
            </span>
            <p className="text-[10px] text-blue-700 mt-0.5">
              {t('cashColon')} ₹{dateStats.cashTotal} | {t('upiColon')} ₹{dateStats.upiTotal}
            </p>
          </div>

          <div className="rounded-xl bg-rose-50 p-3 border border-rose-200">
            <span className="text-[10px] font-bold text-rose-800 uppercase block">
              {t('dayUdharTotal')}
            </span>
            <span className="text-lg sm:text-xl font-black text-rose-950 font-mono">
              ₹{dateStats.pendingUdharTotal.toLocaleString('en-IN')}
            </span>
            <p className="text-[10px] text-rose-700 mt-0.5">{t('pendingUdharBadge')}</p>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="rounded-2xl bg-white text-slate-900 p-3.5 shadow-sm border border-slate-200 flex flex-wrap items-center justify-between gap-2.5">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder={t('searchBillsPlaceholder')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-xl border border-slate-300 bg-white text-slate-900 pl-9 pr-3 py-1.5 text-xs font-semibold focus:border-amber-500 outline-none"
          />
        </div>

        <div className="flex flex-wrap gap-1.5">
          {['ALL', 'Cash', 'UPI', 'Udhar', 'Estimates'].map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => setFilterMode(mode)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                filterMode === mode
                  ? mode === 'Estimates'
                    ? 'bg-amber-500 text-slate-950 font-black shadow-xs'
                    : 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {mode === 'ALL'
                ? t('all')
                : mode === 'Estimates'
                ? `📝 ${t('estimatesTab')}`
                : getPaymentModeLabel(mode)}
            </button>
          ))}
        </div>
      </div>

      {/* Warning Toast for Duplicate Conversion */}
      {alertToast && (
        <div className="rounded-xl bg-rose-600 px-4 py-3 text-white text-xs sm:text-sm font-bold flex items-center gap-2 shadow-md">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>{alertToast}</span>
        </div>
      )}

      {/* Bills List */}
      <div className="space-y-3">
        {dateBills.length === 0 ? (
          <div className="rounded-2xl bg-white text-slate-900 p-12 text-center border border-slate-200">
            <Calendar className="h-12 w-12 mx-auto mb-2 text-slate-300" />
            <h3 className="font-bold text-slate-700 text-base">
              {filterMode === 'Estimates' ? t('noEstimatesTitle') : t('noBillsOnDate')}
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              {filterMode === 'Estimates' ? t('noEstimatesSub') : selectedDate}
            </p>
          </div>
        ) : (
          dateBills.map((bill) => {
            const isUdhar = !bill.isEstimate && bill.paymentMode === 'Udhar';
            const isSettled = Boolean(bill.isSettled);

            return (
              <div
                key={bill.id}
                className={`rounded-2xl bg-white text-slate-900 p-4 shadow-sm border transition ${
                  bill.isEstimate
                    ? 'border-amber-400 bg-amber-50/30'
                    : 'border-slate-200 hover:border-amber-300'
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-slate-100">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono font-black text-sm text-slate-900">
                      {bill.billNumber}
                    </span>

                    {bill.isEstimate ? (
                      <>
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-amber-200 text-amber-900 border border-amber-300">
                          {t('estimateTagBadge')}
                        </span>
                        {bill.isConverted && (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 border border-emerald-300">
                            {t('convertedToBillBadge')}
                          </span>
                        )}
                      </>
                    ) : (
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                          bill.paymentMode === 'Cash'
                            ? 'bg-emerald-100 text-emerald-800'
                            : bill.paymentMode === 'UPI'
                            ? 'bg-blue-100 text-blue-800'
                            : isSettled
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {getPaymentModeLabel(bill.paymentMode)}{' '}
                        {isUdhar && isSettled ? `(${t('paidBadge')})` : ''}
                      </span>
                    )}

                    <span className="text-xs text-slate-400 font-medium">
                      {trimmedSearch
                        ? new Date(bill.date).toLocaleString(
                            language === 'hindi' ? 'hi-IN' : 'en-IN',
                            {
                              day: '2-digit',
                              month: 'short',
                              hour: '2-digit',
                              minute: '2-digit',
                              hour12: true,
                            }
                          )
                        : new Date(bill.date).toLocaleTimeString(
                            language === 'hindi' ? 'hi-IN' : 'en-IN',
                            {
                              hour: '2-digit',
                              minute: '2-digit',
                              hour12: true,
                            }
                          )}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5">
                    {bill.isEstimate && (
                      <button
                        type="button"
                        onClick={() => handleConvertEstimate(bill)}
                        className={`flex items-center gap-1 rounded-xl font-black px-3 py-1.5 text-xs shadow-xs transition cursor-pointer ${
                          bill.isConverted
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                            : 'bg-amber-500 hover:bg-amber-400 text-slate-950 active:scale-95'
                        }`}
                        title={
                          bill.isConverted
                            ? t('convertedToBillBadge')
                            : t('convertToFinalBillBtn')
                        }
                      >
                        <CheckCircle className="h-3.5 w-3.5 stroke-[2.5]" />
                        <span>
                          {bill.isConverted
                            ? t('convertedToBillBadge')
                            : t('convertToFinalBillBtn')}
                        </span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => openBillEditorForEdit(bill)}
                      className="flex items-center gap-1 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-300 px-2.5 py-1.5 text-xs font-bold text-slate-800 transition cursor-pointer"
                      title={t('edit')}
                    >
                      <Edit className="h-3.5 w-3.5" />
                      <span>{t('edit')}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setSelectedBillId(bill.id);
                        setIsReceiptOpen(true);
                      }}
                      className="flex items-center gap-1 rounded-xl bg-amber-50 hover:bg-amber-100 border border-amber-200 px-3 py-1.5 text-xs font-bold text-amber-900 transition cursor-pointer"
                    >
                      <Eye className="h-3.5 w-3.5" />
                      <span>{t('viewBillReceipt')}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleCancelBill(bill)}
                      className="rounded-xl p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 transition cursor-pointer"
                      title={t('cancelBillBtn')}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {/* Bill Details */}
                <div className="pt-2.5 flex flex-wrap items-center justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="text-xs text-slate-600">
                      <span className="text-slate-400">{t('customer')}:</span>{' '}
                      <strong className="text-slate-900">{bill.customerName || t('customer')}</strong>
                      {bill.customerMobile && (
                        <span className="ml-2 font-mono text-slate-500">({bill.customerMobile})</span>
                      )}
                    </div>
                    <div className="mt-1 text-xs text-slate-500">
                      <span className="font-semibold text-slate-700">
                        {bill.items.length} {t('itemsUnit')}:
                      </span>{' '}
                      {bill.items.map((i) => `${i.productName.split(' ')[0]} (${i.quantity})`).join(', ')}
                    </div>
                    {bill.notes && bill.notes.trim().length > 0 && (
                      <div className="mt-2 rounded-xl bg-slate-50 border border-slate-200 px-2.5 py-1.5 text-xs text-slate-800 whitespace-pre-wrap break-words">
                        <span className="font-black text-slate-900">{t('noteSerialNoLabel')} </span>
                        {bill.notes}
                      </div>
                    )}
                  </div>

                  <div className="text-right shrink-0">
                    <div className="text-lg font-black text-slate-900 font-mono">
                      ₹{bill.grandTotal}
                    </div>
                    <div className="text-xs text-emerald-700 font-bold">
                      +₹{bill.totalProfit} {t('profitBadge')}
                    </div>
                  </div>
                </div>

                {/* Udhar Actions */}
                {isUdhar && (
                  <div className="mt-3 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 bg-slate-50 p-2.5 rounded-xl">
                    <div className="flex items-center gap-2">
                      {isSettled ? (
                        <div className="flex items-center gap-1.5">
                          <span className="px-2.5 py-1 rounded-full text-xs font-black bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1 shadow-xs">
                            <CheckCircle className="h-3.5 w-3.5 text-emerald-700" />
                            {t('paidBadge')}
                          </span>
                          <button
                            type="button"
                            onClick={() => updateBill(bill.id, { isSettled: false })}
                            className="text-[10px] text-slate-500 hover:text-slate-700 underline cursor-pointer ml-1"
                            title={t('markPendingTitle')}
                          >
                            {t('undoBtn')}
                          </button>
                        </div>
                      ) : (
                        <span className="px-2.5 py-1 rounded-full text-xs font-black bg-rose-100 text-rose-800 border border-rose-200 shadow-xs">
                          {t('pendingUdharBadge')}: ₹{bill.grandTotal}
                        </span>
                      )}

                      {!isSettled && bill.remindTomorrow && (
                        <span className="text-[11px] font-bold text-amber-800 bg-amber-100 border border-amber-300 px-2 py-0.5 rounded-full flex items-center gap-1">
                          <Bell className="h-3 w-3 text-amber-600" />
                          <span>10:00 AM</span>
                        </span>
                      )}
                    </div>

                    {!isSettled && (
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleSendWhatsAppReminder(bill)}
                          className="flex items-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1.5 text-xs font-black shadow-sm transition active:scale-95 cursor-pointer"
                          title={t('sendWhatsAppReminderBtn')}
                        >
                          <MessageSquare className="h-3.5 w-3.5 fill-white" />
                          <span>{t('sendWhatsAppReminderBtn')}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleToggleRemindTomorrow(bill)}
                          className={`flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-xs font-bold transition active:scale-95 cursor-pointer border ${
                            bill.remindTomorrow
                              ? 'bg-amber-100 text-amber-900 border-amber-300 ring-1 ring-amber-300'
                              : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-300'
                          }`}
                          title={t('tomorrowMorningReminderMsg')}
                        >
                          <Bell
                            className={`h-3.5 w-3.5 ${
                              bill.remindTomorrow ? 'text-amber-700' : 'text-slate-500'
                            }`}
                          />
                          <span>
                            {bill.remindTomorrow ? t('remindTomorrowScheduled') : t('remindTomorrowBtn')}
                          </span>
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            updateBill(bill.id, { isSettled: true, remindTomorrow: false })
                          }
                          className="flex items-center gap-1 rounded-xl bg-white hover:bg-emerald-50 text-emerald-800 border border-emerald-300 px-2.5 py-1.5 text-xs font-bold transition active:scale-95 cursor-pointer"
                          title={t('markAsPaidBtn')}
                        >
                          <CheckCircle className="h-3.5 w-3.5 text-emerald-600" />
                          <span>{t('markAsPaidBtn')}</span>
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Bill Receipt View Modal */}
      <BillReceiptModal
        bill={selectedBill}
        isOpen={isReceiptOpen}
        onClose={() => setIsReceiptOpen(false)}
        isNewBill={false}
      />
    </div>
  );
};
