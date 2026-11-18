import React, { useState, useMemo } from 'react';
import {
  TrendingUp, ShoppingBag, PackageCheck, Plus, ArrowRight, Zap, Moon, BellRing
} from 'lucide-react';
import { useShop } from '../context/ShopContext';
import { LowStockBanner } from './LowStockBanner';
import { DayClosingModal } from './DayClosingModal';
import { Product } from '../types';

interface DashboardProps {
  onOpenAddProduct: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ onOpenAddProduct }) => {
  const {
    todayStats,
    yesterdayStats,
    last7DaysStats,
    thisMonthStats,
    totalStockValue,
    lowStockProducts,
    newOrdersCount,
    setActiveTab,
    setRateListSubTab,
    bills,
    products,
    shopInfo,
    t,
  } = useShop();

  const [isDayClosingOpen, setIsDayClosingOpen] = useState(false);
  const recentBills = bills.filter((b) => !b.isEstimate).slice(0, 5);

  const { expiredProducts, expiringSoonProducts } = useMemo(() => {
    const today = new Date(new Date().toDateString());
    const expired: Product[] = [];
    const soon: { product: Product; days: number }[] = [];

    products.forEach((p) => {
      if (p.expiryDate) {
        const exp = new Date(p.expiryDate);
        const diffDays = Math.ceil((exp.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        if (exp < today) {
          expired.push(p);
        } else if (diffDays <= 15) {
          soon.push({ product: p, days: diffDays });
        }
      }
    });

    return { expiredProducts: expired, expiringSoonProducts: soon };
  }, [products]);

  const handleOpenNewOrders = () => {
    setRateListSubTab('orders');
    setActiveTab('rate-list-qr');
  };

  return (
    <div className="space-y-5">
      {/* 0. NEW CUSTOMER ORDERS RED BADGE ALERT */}
      {newOrdersCount > 0 && (
        <div
          onClick={handleOpenNewOrders}
          className="rounded-2xl border-2 border-red-500 bg-red-50 p-4 shadow-md flex flex-wrap items-center justify-between gap-3 cursor-pointer hover:bg-red-100/80 transition"
        >
          <div className="flex items-center gap-3">
            <div className="relative flex h-11 w-11 items-center justify-center rounded-xl bg-red-600 text-white shadow-sm shrink-0">
              <BellRing className="h-5 w-5 animate-bounce" />
              <span className="absolute -top-1.5 -right-1.5 flex h-5 min-w-[20px] px-1 items-center justify-center rounded-full bg-slate-950 text-[10px] font-black text-amber-400 border border-white">
                {newOrdersCount}
              </span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="bg-red-600 text-white text-[10px] font-black px-2 py-0.5 rounded-full uppercase animate-pulse">
                  {t('newOrderBadgeText', { count: newOrdersCount })}
                </span>
              </div>
              <h3 className="font-black text-red-950 text-sm sm:text-base mt-0.5">
                {t('newOrdersAlertTitle', { count: newOrdersCount })}
              </h3>
              <p className="text-xs text-red-800 font-medium">
                {t('newOrdersAlertSub')}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleOpenNewOrders();
            }}
            className="rounded-xl bg-red-600 hover:bg-red-700 text-white font-black text-xs px-4 py-2.5 shadow-sm transition active:scale-95 cursor-pointer"
          >
            {t('viewOrdersBtn')}
          </button>
        </div>
      )}

      {/* 1. TOP URGENT LOW STOCK ALERT */}
      <LowStockBanner />

      {/* 2. EXPIRED / EXPIRING SOON ALERT BANNER */}
      {(expiredProducts.length > 0 || expiringSoonProducts.length > 0) && (
        <div className="rounded-2xl border-2 border-rose-400 bg-rose-50/90 p-4 shadow-sm space-y-2.5">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-rose-600 text-white font-black text-sm shrink-0">
                ⏳
              </span>
              <div>
                <h3 className="font-black text-rose-950 text-sm sm:text-base">
                  {expiredProducts.length > 0 ? t('expiredTitle') : t('expiringSoonTitle')}
                </h3>
                <p className="text-xs text-rose-800">
                  {t('expiredCountTag', { count: expiredProducts.length })} • {expiringSoonProducts.length} {t('expiringSoonTitle')}
                </p>
              </div>
            </div>
            <button
              onClick={() => setActiveTab('products')}
              className="text-xs font-bold text-rose-700 hover:text-rose-900 bg-rose-100 hover:bg-rose-200 px-3 py-1.5 rounded-xl transition cursor-pointer shrink-0"
            >
              {t('viewInStockArrow')}
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
            {expiredProducts.map((p) => (
              <div key={p.id} className="rounded-xl bg-white border border-rose-300 p-2.5 flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-xs text-slate-900">{p.name}</h4>
                  <span className="text-[10px] text-slate-500 font-mono">
                    {t('stockLeft')}: {p.stockQuantity} {p.unit}
                  </span>
                </div>
                <span className="bg-red-600 text-white font-black text-[10px] px-2 py-0.5 rounded uppercase">
                  ⚠️ {t('expiredTag')} ({p.expiryDate})
                </span>
              </div>
            ))}
            {expiringSoonProducts.map(({ product: p, days }) => (
              <div key={p.id} className="rounded-xl bg-white border border-amber-300 p-2.5 flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-xs text-slate-900">{p.name}</h4>
                  <span className="text-[10px] text-slate-500 font-mono">
                    {t('stockLeft')}: {p.stockQuantity} {p.unit}
                  </span>
                </div>
                <span className="bg-amber-400 text-slate-950 font-bold text-[10px] px-2 py-0.5 rounded">
                  ⏳ {t('expiringInDays', { days })}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Shop Welcome & Quick Action Shortcuts */}
      <div className="rounded-2xl bg-linear-to-r from-slate-900 via-slate-800 to-amber-950 p-4 sm:p-5 text-white shadow-md flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-black uppercase tracking-wider text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded-md border border-amber-400/20">
              ⚡ {shopInfo.name?.trim() || t('appName')}
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight mt-1">
            {t('dashboardTitle')}
          </h1>
          <p className="text-xs sm:text-sm text-slate-300">
            {t('dashboardSubtitle')}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => setIsDayClosingOpen(true)}
            className="flex items-center gap-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-amber-400/50 px-3.5 py-2.5 sm:py-3 text-amber-300 font-bold text-sm transition active:scale-95 cursor-pointer shadow-sm"
          >
            <Moon className="h-4 w-4 text-amber-400" />
            <span>{t('dayClosingBtn')}</span>
          </button>

          <button
            onClick={() => setActiveTab('billing')}
            className="flex items-center gap-2 rounded-xl bg-amber-500 hover:bg-amber-400 px-4 py-2.5 sm:py-3 text-slate-950 font-black text-sm shadow-md transition active:scale-95 cursor-pointer"
          >
            <Zap className="h-5 w-5 fill-slate-950" />
            <span>+ {t('navBilling')}</span>
          </button>

          <button
            onClick={onOpenAddProduct}
            className="flex items-center gap-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 px-3.5 py-2.5 sm:py-3 text-white font-bold text-sm transition active:scale-95 cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            <span>{t('addStockQuick')}</span>
          </button>
        </div>
      </div>

      {/* PRIMARY STATS GRID */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
        <div className="relative overflow-hidden rounded-2xl bg-white p-4 sm:p-5 shadow-sm border-2 border-emerald-500/40">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
              {t('todaySale')}
            </span>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500 text-white shadow-xs">
              <ShoppingBag className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-black text-slate-900 font-mono tracking-tight">
              ₹{todayStats.totalSale.toLocaleString('en-IN')}
            </div>
            <div className="mt-1 flex items-center justify-between text-xs text-slate-500">
              <span>{todayStats.totalItems} {t('itemsSold')} ({todayStats.billCount} {t('billsCount')})</span>
              <span className="font-semibold text-emerald-600">{t('todayTag')}</span>
            </div>
          </div>
        </div>

        {(() => {
          const profitVal = todayStats.totalProfit;
          const profitTheme =
            profitVal > 0
              ? {
                  border: 'border-emerald-500/60',
                  pill: 'text-emerald-800 bg-emerald-50 border-emerald-200',
                  iconBg: 'bg-emerald-600 text-white',
                  amount: 'text-emerald-600',
                  sub: 'text-emerald-700',
                }
              : profitVal < 0
              ? {
                  border: 'border-red-500/60',
                  pill: 'text-red-800 bg-red-50 border-red-200',
                  iconBg: 'bg-red-600 text-white',
                  amount: 'text-red-600',
                  sub: 'text-red-700',
                }
              : {
                  border: 'border-slate-300',
                  pill: 'text-slate-700 bg-slate-100 border-slate-300',
                  iconBg: 'bg-slate-500 text-white',
                  amount: 'text-slate-700',
                  sub: 'text-slate-600',
                };

          return (
            <div className={`relative overflow-hidden rounded-2xl bg-white p-4 sm:p-5 shadow-sm border-2 ${profitTheme.border}`}>
              <div className="flex items-center justify-between">
                <span className={`text-xs font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${profitTheme.pill}`}>
                  {t('todayProfit')}
                </span>
                <div className={`flex h-10 w-10 items-center justify-center rounded-xl shadow-xs font-black ${profitTheme.iconBg}`}>
                  <TrendingUp className="h-5 w-5" />
                </div>
              </div>
              <div className="mt-3">
                <div className={`text-2xl sm:text-3xl font-black font-mono tracking-tight ${profitTheme.amount}`}>
                  {profitVal < 0
                    ? `-₹${Math.abs(profitVal).toLocaleString('en-IN')}`
                    : `₹${profitVal.toLocaleString('en-IN')}`}
                </div>
                <div className="mt-1 flex items-center justify-between text-xs text-slate-500">
                  <span>{t('sellMinusPurchase')}</span>
                  <span className={`font-bold ${profitTheme.sub}`}>
                    {todayStats.totalSale > 0
                      ? `${((profitVal / todayStats.totalSale) * 100).toFixed(0)}${t('marginPctSuffix')}`
                      : t('pureProfitTag')}
                  </span>
                </div>
              </div>
            </div>
          );
        })()}

        <div className="relative overflow-hidden rounded-2xl bg-white p-4 sm:p-5 shadow-sm border-2 border-blue-500/40">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-200">
              {t('totalStockValue')}
            </span>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white shadow-xs">
              <PackageCheck className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-black text-slate-900 font-mono tracking-tight">
              ₹{totalStockValue.purchaseValue.toLocaleString('en-IN')}
            </div>
            <div className="mt-1 flex items-center justify-between text-xs text-slate-500">
              <span>{t('atMrpPrefix')} ₹{totalStockValue.retailValue.toLocaleString('en-IN')}</span>
              <span className="font-semibold text-blue-700">
                {products.length} {t('productsLabel')} ({totalStockValue.totalQuantity} {t('pcsUnit')})
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* SECONDARY SALE CARDS */}
      <div>
        <h3 className="text-xs font-black uppercase tracking-wider text-slate-500 mb-2 px-1">
          {t('salesOverviewHeader')}
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="rounded-2xl bg-white p-4 border border-slate-200 shadow-xs">
            <div className="flex justify-between items-center text-xs text-slate-500">
              <span className="font-bold text-slate-700">{t('yesterdaySale')}</span>
              <span className="text-[10px] bg-slate-100 px-1.5 py-0.5 rounded font-mono">{t('minusOneDayTag')}</span>
            </div>
            <div className="mt-2 text-xl font-black text-slate-900 font-mono">
              ₹{yesterdayStats.totalSale.toLocaleString('en-IN')}
            </div>
            <div className="mt-1 flex justify-between text-xs text-slate-500">
              <span>{t('profitBadge')}: <strong className="text-emerald-700">₹{yesterdayStats.totalProfit}</strong></span>
              <span>{yesterdayStats.totalItems} {t('itemsLabel')}</span>
            </div>
          </div>

          <div className="rounded-2xl bg-white p-4 border border-slate-200 shadow-xs">
            <div className="flex justify-between items-center text-xs text-slate-500">
              <span className="font-bold text-slate-700">{t('last7DaysSale')}</span>
              <span className="text-[10px] bg-slate-100 px-1.5 py-0.5 rounded font-mono">{t('sevenDaysTag')}</span>
            </div>
            <div className="mt-2 text-xl font-black text-slate-900 font-mono">
              ₹{last7DaysStats.totalSale.toLocaleString('en-IN')}
            </div>
            <div className="mt-1 flex justify-between text-xs text-slate-500">
              <span>{t('profitBadge')}: <strong className="text-emerald-700">₹{last7DaysStats.totalProfit}</strong></span>
              <span>{last7DaysStats.billCount} {t('billsCount')}</span>
            </div>
          </div>

          <div className="rounded-2xl bg-white p-4 border border-slate-200 shadow-xs">
            <div className="flex justify-between items-center text-xs text-slate-500">
              <span className="font-bold text-slate-700">{t('thisMonthSale')}</span>
              <span className="text-[10px] bg-amber-100 text-amber-900 px-1.5 py-0.5 rounded font-mono font-bold">{t('monthTag')}</span>
            </div>
            <div className="mt-2 text-xl font-black text-slate-900 font-mono">
              ₹{thisMonthStats.totalSale.toLocaleString('en-IN')}
            </div>
            <div className="mt-1 flex justify-between text-xs text-slate-500">
              <span>{t('profitBadge')}: <strong className="text-emerald-700">₹{thisMonthStats.totalProfit}</strong></span>
              <span>{thisMonthStats.billCount} {t('billsCount')}</span>
            </div>
          </div>
        </div>
      </div>

      {/* QUICK SHORTCUTS & RECENT BILLS SECTION */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-1 space-y-2.5">
          <h3 className="text-xs font-black uppercase tracking-wider text-slate-500 px-1">
            {t('quickShortcuts')}
          </h3>

          <div
            onClick={() => setActiveTab('products')}
            className="rounded-2xl bg-white p-3.5 border border-slate-200 hover:border-amber-400 hover:shadow-sm cursor-pointer transition flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-amber-100 text-amber-900 flex items-center justify-center font-bold">
                📦
              </div>
              <div>
                <h4 className="font-bold text-slate-900 text-sm">{t('shortcutStockTitle')}</h4>
                <p className="text-xs text-slate-500">{products.length} {t('shortcutStockSub')}</p>
              </div>
            </div>
            <ArrowRight className="h-4 w-4 text-slate-400" />
          </div>

          <div
            onClick={() => setActiveTab('history')}
            className="rounded-2xl bg-white p-3.5 border border-slate-200 hover:border-amber-400 hover:shadow-sm cursor-pointer transition flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-blue-100 text-blue-900 flex items-center justify-center font-bold">
                📅
              </div>
              <div>
                <h4 className="font-bold text-slate-900 text-sm">{t('shortcutHistoryTitle')}</h4>
                <p className="text-xs text-slate-500">{t('shortcutHistorySub')}</p>
              </div>
            </div>
            <ArrowRight className="h-4 w-4 text-slate-400" />
          </div>

          <div
            onClick={() => setActiveTab('profit-report')}
            className="rounded-2xl bg-white p-3.5 border border-slate-200 hover:border-amber-400 hover:shadow-sm cursor-pointer transition flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-emerald-100 text-emerald-900 flex items-center justify-center font-bold">
                📊
              </div>
              <div>
                <h4 className="font-bold text-slate-900 text-sm">{t('shortcutProfitTitle')}</h4>
                <p className="text-xs text-slate-500">{t('shortcutProfitSub')}</p>
              </div>
            </div>
            <ArrowRight className="h-4 w-4 text-slate-400" />
          </div>

          <div
            onClick={() => setActiveTab('low-stock')}
            className="rounded-2xl bg-red-50 p-3.5 border border-red-200 hover:border-red-400 hover:shadow-sm cursor-pointer transition flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-red-600 text-white flex items-center justify-center font-bold">
                ⚠️
              </div>
              <div>
                <h4 className="font-bold text-red-900 text-sm">{t('shortcutLowStockTitle')}</h4>
                <p className="text-xs text-red-700 font-semibold">{lowStockProducts.length} {t('shortcutLowStockSub')}</p>
              </div>
            </div>
            <ArrowRight className="h-4 w-4 text-red-400" />
          </div>
        </div>

        {/* Recent Bills Ticker */}
        <div className="lg:col-span-2 rounded-2xl bg-white p-4 border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="font-black text-slate-900 text-sm sm:text-base">
                {t('recentBills')}
              </h3>
              <p className="text-xs text-slate-500">{t('liveInvoicesTag')}</p>
            </div>
            <button
              onClick={() => setActiveTab('history')}
              className="text-xs font-bold text-amber-600 hover:text-amber-700 flex items-center gap-1"
            >
              {t('seeAllBills')}
              <ArrowRight className="h-3 w-3" />
            </button>
          </div>

          <div className="divide-y divide-slate-100">
            {recentBills.length === 0 ? (
              <div className="py-10 text-center text-xs text-slate-500">
                {t('noRecentBillsMsg')}
              </div>
            ) : (
              recentBills.map((b) => (
                <div key={b.id} className="py-2.5 flex items-center justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-xs text-slate-900">{b.billNumber}</span>
                      <span className={`text-[10px] px-1.5 py-0.2 rounded font-bold ${
                        b.paymentMode === 'Cash'
                          ? 'bg-emerald-100 text-emerald-800'
                          : b.paymentMode === 'UPI'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-rose-100 text-rose-800'
                      }`}>
                        {b.paymentMode === 'Cash'
                          ? t('payCash')
                          : b.paymentMode === 'UPI'
                          ? t('payUpi')
                          : t('payUdhar')}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {b.customerName || t('customer')} • {b.items.length} {t('itemsLabel')} ({b.items.map(i => i.productName.split(' ')[0]).join(', ')})
                    </p>
                  </div>

                  <div className="text-right">
                    <div className="font-black text-slate-900 text-sm font-mono">
                      ₹{b.grandTotal}
                    </div>
                    <span className="text-[10px] text-emerald-600 font-bold block">
                      +₹{b.totalProfit} {t('profitBadge')}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <DayClosingModal
        isOpen={isDayClosingOpen}
        onClose={() => setIsDayClosingOpen(false)}
      />
    </div>
  );
};
