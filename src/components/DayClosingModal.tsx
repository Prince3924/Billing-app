import React, { useState, useMemo } from 'react';
import { X, Moon, Download, Share2, Check, Calendar } from 'lucide-react';
import jsPDF from 'jspdf';
import { useShop } from '../context/ShopContext';

interface DayClosingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DayClosingModal: React.FC<DayClosingModalProps> = ({ isOpen, onClose }) => {
  const {
    bills,
    shopInfo,
    dayClosingRecords,
    saveDayClosing,
    language,
    t,
  } = useShop();

  const todayStr = new Date().toISOString().split('T')[0];
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);

  const [todayExpenses, setTodayExpenses] = useState<string>('');
  const [udharRecovered, setUdharRecovered] = useState<string>('');
  const [closingNotes, setClosingNotes] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'today' | 'history'>('today');
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Exclude estimate bills strictly
  const dateBills = useMemo(() => {
    return bills.filter((b) => !b.isEstimate && b.date.startsWith(selectedDate));
  }, [bills, selectedDate]);

  const totalSale = dateBills.reduce((acc, b) => acc + b.grandTotal, 0);
  const totalProfitFromBills = dateBills.reduce((acc, b) => acc + b.totalProfit, 0);
  const cashSale = dateBills.filter((b) => b.paymentMode === 'Cash').reduce((acc, b) => acc + b.grandTotal, 0);
  const upiSale = dateBills.filter((b) => b.paymentMode === 'UPI').reduce((acc, b) => acc + b.grandTotal, 0);
  const udharSale = dateBills.filter((b) => b.paymentMode === 'Udhar' && !b.isSettled).reduce((acc, b) => acc + b.grandTotal, 0);
  const customerCount = dateBills.length;

  const expenseNum = parseFloat(todayExpenses) || 0;
  const udharRecoveredNum = parseFloat(udharRecovered) || 0;
  const netDayProfit = Math.round(totalProfitFromBills - expenseNum);

  const handleSaveClosing = () => {
    saveDayClosing({
      date: selectedDate,
      totalSale,
      cashSale,
      upiSale,
      udharSale,
      totalExpense: expenseNum,
      totalProfit: netDayProfit,
      customerCount,
      udharRecovered: udharRecoveredNum,
      notes: closingNotes.trim() || undefined,
    });
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  const dateLocale = language === 'hindi' ? 'hi-IN' : 'en-IN';

  const handleShareWhatsApp = () => {
    const formattedDate = new Date(selectedDate + 'T12:00:00').toLocaleDateString(dateLocale, {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });

    const shopLabel = shopInfo.name || t('appName');
    const noteLine = closingNotes.trim()
      ? t('closingWaNoteLine', { notes: closingNotes.trim() })
      : '';

    const text =
      `🌙 *${t('closingWaTitle')}*\n` +
      `🏪 *${shopLabel}*\n` +
      `📅 *${t('closingWaDate')}* ${formattedDate}\n` +
      `━━━━━━━━━━━━━━━━━━━\n` +
      `💰 *${t('closingWaTotalSale')}* ₹${totalSale.toLocaleString('en-IN')}\n` +
      `💵 *${t('closingWaCash')}* ₹${cashSale.toLocaleString('en-IN')}\n` +
      `📱 *${t('closingWaUpi')}* ₹${upiSale.toLocaleString('en-IN')}\n` +
      `📝 *${t('closingWaCredit')}* ₹${udharSale.toLocaleString('en-IN')}\n` +
      `💸 *${t('closingWaExpenses')}* ₹${expenseNum.toLocaleString('en-IN')}\n` +
      `📈 *${t('closingWaNetProfit')}* ₹${netDayProfit.toLocaleString('en-IN')}\n` +
      `👥 *${t('closingWaCustomers')}* ${customerCount}\n` +
      `🤝 *${t('closingWaCreditRecovered')}* ₹${udharRecoveredNum.toLocaleString('en-IN')}\n` +
      noteLine +
      `━━━━━━━━━━━━━━━━━━━\n` +
      t('closingWaFooter', { shop: shopLabel });

    const encoded = encodeURIComponent(text);
    window.open(`https://wa.me/?text=${encoded}`, '_blank');
  };

  const handleDownloadPdf = () => {
    try {
      const doc = new jsPDF({
        unit: 'mm',
        format: 'a5',
      });

      const shopName = (shopInfo.name || t('appName')).replace(/[^\x20-\x7E]/g, '') || 'STORE';
      const formattedDate = new Date(selectedDate + 'T12:00:00').toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });

      doc.setFillColor(15, 23, 42);
      doc.rect(0, 0, 148, 28, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(16);
      doc.text(shopName.toUpperCase(), 74, 12, { align: 'center' });
      doc.setFontSize(10);
      doc.setTextColor(251, 191, 36);
      doc.text('DAY CLOSING REPORT', 74, 19, { align: 'center' });
      doc.setFontSize(8);
      doc.setTextColor(203, 213, 225);
      doc.text(`Date: ${formattedDate} | Generated: ${new Date().toLocaleTimeString('en-IN')}`, 74, 25, { align: 'center' });

      let y = 38;

      const addRow = (label: string, value: string, isBold = false, isAccent = false) => {
        if (isAccent) {
          doc.setFillColor(254, 243, 199);
          doc.rect(10, y - 4, 128, 8, 'F');
        }
        doc.setFont('helvetica', isBold ? 'bold' : 'normal');
        doc.setFontSize(10);
        doc.setTextColor(15, 23, 42);
        doc.text(label, 14, y + 1);
        doc.text(value, 134, y + 1, { align: 'right' });
        y += 9;
      };

      addRow('Total Sale:', `Rs. ${totalSale.toLocaleString('en-IN')}`, true, true);
      addRow('  - Cash Collection:', `Rs. ${cashSale.toLocaleString('en-IN')}`);
      addRow('  - UPI / Online Payment:', `Rs. ${upiSale.toLocaleString('en-IN')}`);
      addRow('  - Pending Credit:', `Rs. ${udharSale.toLocaleString('en-IN')}`);
      y += 2;
      addRow('Old Credit Recovered Today:', `Rs. ${udharRecoveredNum.toLocaleString('en-IN')}`);
      addRow("Today's Expenses:", `Rs. ${expenseNum.toLocaleString('en-IN')}`);
      y += 2;
      addRow('Net Day Profit:', `Rs. ${netDayProfit.toLocaleString('en-IN')}`, true, true);
      addRow('Total Customers Served:', `${customerCount} customers`);
      y += 4;

      if (closingNotes) {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.text('Notes:', 14, y);
        y += 5;
        doc.setFont('helvetica', 'normal');
        doc.text(closingNotes, 14, y);
        y += 10;
      }

      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184);
      doc.text('Signature / Stamp: ______________________', 14, y + 15);
      doc.text('Authorized Day Sign-off', 14, y + 20);

      doc.save(`Day_Closing_${selectedDate}.pdf`);
    } catch (err) {
      console.error('PDF generation error:', err);
      alert(t('closingPdfFailedAlert'));
    }
  };

  if (!isOpen) return null;

  return (
    <div className="keyboard-modal-overlay fixed inset-0 z-50 flex items-start sm:items-center justify-center bg-black/75 p-3 sm:p-5 backdrop-blur-xs overflow-y-auto overscroll-contain">
      <div className="relative w-full max-w-2xl rounded-3xl bg-white text-slate-900 shadow-2xl border border-slate-200 overflow-hidden my-auto max-h-[calc(var(--vv-height,100dvh)-1.5rem)] sm:max-h-[92vh] flex flex-col">
        {/* Modal Header */}
        <div className="bg-slate-900 p-4 sm:p-5 text-white flex items-center justify-between border-b border-amber-400/30">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-500 text-slate-950 font-black shadow-md">
              <Moon className="h-6 w-6" />
            </div>
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded border border-amber-400/20">
                {t('auditReconciliationBadge')}
              </span>
              <h2 className="text-lg sm:text-xl font-black text-white mt-0.5">
                {t('dayClosingTitle')}
              </h2>
              <p className="text-xs text-slate-400">
                {t('dayClosingSub')}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="rounded-xl p-2 text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tab switch */}
        <div className="flex bg-slate-100 p-1.5 border-b border-slate-200">
          <button
            onClick={() => setActiveTab('today')}
            className={`flex-1 py-2 rounded-xl text-xs font-black transition cursor-pointer ${
              activeTab === 'today'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {t('todayClosingTab')}
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`flex-1 py-2 rounded-xl text-xs font-black transition cursor-pointer ${
              activeTab === 'history'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            📅 {t('closingHistoryTitle')} ({dayClosingRecords.length})
          </button>
        </div>

        {/* Content Area */}
        <div className="p-4 sm:p-5 overflow-y-auto overscroll-contain flex-1 space-y-4 keyboard-modal-body bg-white text-slate-900">
          {activeTab === 'today' ? (
            <>
              <div className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-2xl bg-slate-50 border border-slate-200">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-amber-600" />
                  <span className="text-xs font-bold text-slate-700">{t('date')}:</span>
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="rounded-lg bg-white border border-slate-300 px-2.5 py-1 text-xs font-bold text-slate-900 outline-none focus:border-amber-500"
                  />
                </div>
                <span className="text-xs font-mono font-bold text-slate-500">
                  {customerCount} {t('billsGeneratedCount')}
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div className="rounded-2xl bg-emerald-50 border border-emerald-200 p-3">
                  <span className="text-[10px] font-bold uppercase text-emerald-800 block">{t('totalSaleLabel')}</span>
                  <span className="text-lg sm:text-xl font-black text-emerald-950 font-mono">
                    ₹{totalSale.toLocaleString('en-IN')}
                  </span>
                  <span className="text-[10px] text-emerald-700 block mt-0.5">{customerCount} {t('customersCountLabel')}</span>
                </div>

                <div className="rounded-2xl bg-blue-50 border border-blue-200 p-3">
                  <span className="text-[10px] font-bold uppercase text-blue-800 block">{t('cashPlusUpiLabel')}</span>
                  <span className="text-lg sm:text-xl font-black text-blue-950 font-mono">
                    ₹{(cashSale + upiSale).toLocaleString('en-IN')}
                  </span>
                  <span className="text-[10px] text-blue-700 block mt-0.5">{t('cashLabel')}: ₹{cashSale} | {t('upiLabel')}: ₹{upiSale}</span>
                </div>

                <div className="rounded-2xl bg-rose-50 border border-rose-200 p-3">
                  <span className="text-[10px] font-bold uppercase text-rose-800 block">{t('pendingUdharLabel')}</span>
                  <span className="text-lg sm:text-xl font-black text-rose-950 font-mono">
                    ₹{udharSale.toLocaleString('en-IN')}
                  </span>
                  <span className="text-[10px] text-rose-700 block mt-0.5">{t('pendingCreditSub')}</span>
                </div>

                <div className="rounded-2xl bg-amber-50 border border-amber-200 p-3">
                  <span className="text-[10px] font-bold uppercase text-amber-800 block">{t('netProfitLabel')}</span>
                  <span className="text-lg sm:text-xl font-black text-amber-950 font-mono">
                    ₹{netDayProfit.toLocaleString('en-IN')}
                  </span>
                  <span className="text-[10px] text-amber-700 block mt-0.5">{t('afterExpensesSub')}</span>
                </div>
              </div>

              <div className="rounded-2xl bg-amber-50/50 border border-amber-200 p-4 space-y-3">
                <h4 className="text-xs font-black uppercase text-amber-950 tracking-wider">
                  {t('dailyExpensesAndUdharSection')}
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      {t('todayExpensesLabel')}
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-2.5 text-slate-400 font-bold">₹</span>
                      <input
                        type="number"
                        min="0"
                        step="any"
                        placeholder="0.00"
                        value={todayExpenses}
                        onChange={(e) => setTodayExpenses(e.target.value)}
                        className="w-full rounded-xl border border-slate-300 bg-white pl-7 pr-3 py-2 text-sm font-bold text-slate-900 placeholder:text-slate-400 focus:border-amber-500 outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      {t('udharRecoveredToday')}
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-2.5 text-slate-400 font-bold">₹</span>
                      <input
                        type="number"
                        min="0"
                        step="any"
                        placeholder="0.00"
                        value={udharRecovered}
                        onChange={(e) => setUdharRecovered(e.target.value)}
                        className="w-full rounded-xl border border-slate-300 bg-white pl-7 pr-3 py-2 text-sm font-bold text-emerald-800 placeholder:text-slate-400 focus:border-emerald-500 outline-none"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {t('closingNotesLabel')}
                  </label>
                  <input
                    type="text"
                    placeholder={t('closingNotesPlaceholder')}
                    value={closingNotes}
                    onChange={(e) => setClosingNotes(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:border-amber-500 outline-none"
                  />
                </div>
              </div>

              {savedSuccess && (
                <div className="rounded-xl bg-emerald-600 p-3 text-white text-xs font-bold flex items-center gap-2">
                  <Check className="h-4 w-4" />
                  <span>{t('closingSavedSuccessToast')}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={handleDownloadPdf}
                  className="rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs py-3 px-3 flex items-center justify-center gap-1.5 shadow-sm transition active:scale-95 cursor-pointer"
                >
                  <Download className="h-4 w-4" />
                  <span>{t('downloadClosingPdfBtn')}</span>
                </button>

                <button
                  type="button"
                  onClick={handleShareWhatsApp}
                  className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs py-3 px-3 flex items-center justify-center gap-1.5 shadow-sm transition active:scale-95 cursor-pointer"
                >
                  <Share2 className="h-4 w-4" />
                  <span>{t('shareClosingWhatsAppBtn')}</span>
                </button>

                <button
                  type="button"
                  onClick={handleSaveClosing}
                  className="rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs py-3 px-3 flex items-center justify-center gap-1.5 shadow-sm transition active:scale-95 cursor-pointer"
                >
                  <Check className="h-4 w-4 stroke-[3]" />
                  <span>{t('saveClosingBtn')}</span>
                </button>
              </div>
            </>
          ) : (
            <div className="space-y-3">
              {dayClosingRecords.length === 0 ? (
                <div className="p-8 text-center text-slate-400">
                  <Moon className="h-10 w-10 mx-auto mb-2 text-slate-300" />
                  <p className="font-bold text-slate-600 text-sm">{t('noPastClosingRecords')}</p>
                  <p className="text-xs text-slate-400 mt-1">{t('noPastClosingSub')}</p>
                </div>
              ) : (
                dayClosingRecords.map((rec) => (
                  <div
                    key={rec.id}
                    className="rounded-2xl border border-slate-200 bg-white text-slate-900 p-4 shadow-xs flex flex-wrap items-center justify-between gap-3"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-black text-slate-900 text-sm">
                          📅 {rec.date}
                        </span>
                        <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-mono">
                          {new Date(rec.closedAt).toLocaleTimeString(dateLocale, { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <div className="mt-1 flex flex-wrap gap-3 text-xs text-slate-600">
                        <span>{t('saleLabel')}: <strong className="text-slate-900">₹{rec.totalSale}</strong></span>
                        <span>{t('cashLabel')}: ₹{rec.cashSale} | {t('upiLabel')}: ₹{rec.upiSale}</span>
                        <span>{t('expensesLabel')}: <strong className="text-rose-700">₹{rec.totalExpense}</strong></span>
                        <span>{t('profitLabel')}: <strong className="text-emerald-700">₹{rec.totalProfit}</strong></span>
                      </div>
                      {rec.notes && (
                        <p className="text-[11px] text-slate-500 italic mt-1">{t('noteColon')} {rec.notes}</p>
                      )}
                    </div>

                    <button
                      onClick={() => {
                        setSelectedDate(rec.date);
                        setTodayExpenses(rec.totalExpense.toString());
                        setUdharRecovered(rec.udharRecovered.toString());
                        setClosingNotes(rec.notes || '');
                        setActiveTab('today');
                      }}
                      className="rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold px-3 py-1.5 transition cursor-pointer"
                    >
                      {t('viewOrReprint')}
                    </button>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
