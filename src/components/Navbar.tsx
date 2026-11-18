import React, { useState } from 'react';
import {
  Home, ShoppingCart, Package, AlertTriangle, Calendar,
  TrendingUp, Settings, Plus, Zap, Phone, Users, QrCode,
  MoreHorizontal, X, Moon, ChevronRight, ShoppingBag
} from 'lucide-react';
import { useShop } from '../context/ShopContext';
import { ActiveTab } from '../types';
import { LanguageSelector } from './LanguageSelector';
import { PWAInstallButton } from './PWAInstallButton';

interface NavbarProps {
  onOpenSettings: () => void;
  onOpenAddProduct: () => void;
  onOpenDayClosing?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  onOpenSettings,
  onOpenAddProduct,
  onOpenDayClosing,
}) => {
  const {
    activeTab,
    setActiveTab,
    setRateListSubTab,
    lowStockProducts,
    newOrdersCount,
    shopInfo,
    t,
  } = useShop();
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);

  // All desktop navigation items
  const desktopNavItems: { id: ActiveTab; label: string; icon: React.ReactNode; badge?: number }[] = [
    {
      id: 'dashboard',
      label: t('navDashboard'),
      icon: <Home className="h-4 w-4" />,
    },
    {
      id: 'billing',
      label: t('navBilling'),
      icon: <ShoppingCart className="h-4 w-4" />,
    },
    {
      id: 'products',
      label: t('navProducts'),
      icon: <Package className="h-4 w-4" />,
    },
    {
      id: 'supplier-khata',
      label: t('navSupplierKhata'),
      icon: <Users className="h-4 w-4" />,
    },
    {
      id: 'rate-list-qr',
      label: t('navRateListQr'),
      icon: <QrCode className="h-4 w-4" />,
      badge: newOrdersCount,
    },
    {
      id: 'low-stock',
      label: t('navLowStock'),
      icon: <AlertTriangle className="h-4 w-4" />,
      badge: lowStockProducts.length,
    },
    {
      id: 'history',
      label: t('navHistory'),
      icon: <Calendar className="h-4 w-4" />,
    },
    {
      id: 'profit-report',
      label: t('navProfit'),
      icon: <TrendingUp className="h-4 w-4" />,
    },
  ];

  // Exactly 4 primary mobile items + 5th is More (•••)
  const mobilePrimaryItems: { id: ActiveTab; label: string; icon: React.ReactNode; badge?: number }[] = [
    {
      id: 'dashboard',
      label: t('navDashboardShort'),
      icon: <Home className="h-5 w-5" />,
    },
    {
      id: 'billing',
      label: t('navBillingShort'),
      icon: <ShoppingCart className="h-5 w-5" />,
    },
    {
      id: 'products',
      label: t('navProductsShort'),
      icon: <Package className="h-5 w-5" />,
    },
    {
      id: 'rate-list-qr',
      label: t('navRateListQrShort'),
      icon: <QrCode className="h-5 w-5" />,
      badge: newOrdersCount,
    },
  ];

  const moreItemsTabIds: ActiveTab[] = ['supplier-khata', 'low-stock', 'history', 'profit-report'];
  const isMoreTabActive = moreItemsTabIds.includes(activeTab);
  const moreBadgeTotal = lowStockProducts.length + newOrdersCount;

  const handleSelectMoreOption = (action: () => void) => {
    setIsMoreMenuOpen(false);
    action();
  };

  return (
    <>
      {/* TOP COMPACT FIXED HEADER */}
      <header className="sticky top-0 z-30 w-full bg-slate-900 text-white shadow-md border-b border-slate-800 no-print">
        <div className="max-w-7xl mx-auto px-3 sm:px-6">
          {/* 1st ROW: Logo + Shop Name + Phone number */}
          <div className="flex h-11 items-center justify-between gap-2">
            <div
              onClick={() => setActiveTab('dashboard')}
              className="flex items-center gap-2 cursor-pointer select-none min-w-0"
            >
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-amber-500 text-slate-950 font-black shadow-xs ring-1 ring-amber-400/40">
                <Zap className="h-4 w-4 fill-slate-950" />
              </div>
              <h1 className="text-sm sm:text-base font-black tracking-tight text-white uppercase truncate">
                {shopInfo.name || t('appName')}
              </h1>
            </div>

            {shopInfo.mobile ? (
              <a
                href={`tel:${shopInfo.mobile}`}
                className="shrink-0 flex items-center gap-1 rounded-lg bg-slate-800/90 hover:bg-slate-700/90 border border-slate-700/90 px-2 py-1 text-xs font-mono font-bold text-amber-300 transition active:scale-95"
                title={t('callShopTitle', { name: shopInfo.name || t('appName') })}
              >
                <Phone className="h-3 w-3 text-amber-400 shrink-0" />
                <span>{shopInfo.mobile}</span>
              </a>
            ) : (
              <button
                onClick={onOpenSettings}
                className="shrink-0 flex items-center gap-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/30 px-2 py-1 text-xs font-bold text-amber-300 transition active:scale-95 cursor-pointer"
                title={t('navSettings')}
              >
                <span>⚙️ {t('navSettings')}</span>
              </button>
            )}
          </div>

          {/* 2nd ROW: Language Dropdown + Quick Actions + Settings */}
          <div className="flex h-10 items-center justify-between border-t border-slate-800/80 gap-2">
            <div className="flex items-center">
              <LanguageSelector variant="dropdown" />
            </div>

            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setActiveTab('billing')}
                className={`flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-black shadow-xs transition active:scale-95 ${
                  activeTab === 'billing'
                    ? 'bg-amber-400 text-slate-950 ring-2 ring-amber-300'
                    : 'bg-amber-500 hover:bg-amber-400 text-slate-950'
                }`}
              >
                <Zap className="h-3.5 w-3.5 fill-slate-950" />
                <span>+ {t('navBilling')}</span>
              </button>

              <button
                onClick={onOpenAddProduct}
                className="hidden sm:flex items-center gap-1 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 px-2.5 py-1 text-xs font-bold text-white transition"
              >
                <Plus className="h-3.5 w-3.5 text-amber-400" />
                <span>{t('addStockQuick')}</span>
              </button>

              <PWAInstallButton variant="button" />

              <button
                onClick={onOpenSettings}
                className="rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 p-1.5 text-slate-300 hover:text-white transition"
                title={t('navSettings')}
              >
                <Settings className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* DESKTOP NAV TABS BAR */}
          <nav className="hidden md:flex space-x-1 border-t border-slate-800 py-1.5 overflow-x-auto no-scrollbar">
            {desktopNavItems.map((item) => {
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap relative ${
                    isActive
                      ? 'bg-amber-500 text-slate-950 shadow-xs'
                      : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  {item.icon}
                  <span>{item.label}</span>
                  {item.badge !== undefined && item.badge > 0 && (
                    <span
                      className={`ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                        isActive
                          ? 'bg-red-700 text-white'
                          : 'bg-red-600 text-white animate-pulse'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>
      </header>

      {/* MOBILE BOTTOM NAVIGATION BAR: EXACTLY 5 ITEMS */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 shadow-xl px-2 py-1.5 flex justify-around items-center no-print">
        {mobilePrimaryItems.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`flex-1 flex flex-col items-center justify-center py-1 px-1 rounded-xl transition relative ${
                isActive
                  ? 'text-amber-600 dark:text-amber-400 font-extrabold'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 font-medium'
              }`}
            >
              <div className={`p-1 rounded-lg ${isActive ? 'bg-amber-100 dark:bg-amber-950/70 text-amber-700 dark:text-amber-400' : ''}`}>
                {item.icon}
              </div>
              <span className="text-[10px] mt-0.5 whitespace-nowrap font-bold truncate max-w-[62px]">
                {item.label}
              </span>
              {item.badge !== undefined && item.badge > 0 && (
                <span className="absolute top-0.5 right-3 flex h-4 min-w-[16px] px-1 items-center justify-center rounded-full bg-red-600 text-[9px] font-black text-white shadow">
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}

        {/* 5. More (•••) */}
        <button
          onClick={() => setIsMoreMenuOpen(true)}
          className={`flex-1 flex flex-col items-center justify-center py-1 px-1 rounded-xl transition relative ${
            isMoreTabActive
              ? 'text-amber-600 dark:text-amber-400 font-extrabold'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 font-medium'
          }`}
        >
          <div className={`p-1 rounded-lg ${isMoreTabActive ? 'bg-amber-100 dark:bg-amber-950/70 text-amber-700 dark:text-amber-400' : ''}`}>
            <MoreHorizontal className="h-5 w-5" />
          </div>
          <span className="text-[10px] mt-0.5 whitespace-nowrap font-bold">
            {t('navMore')}
          </span>

          {moreBadgeTotal > 0 && (
            <span className="absolute top-1 right-2 flex h-4 min-w-[16px] px-1 items-center justify-center rounded-full bg-red-600 text-[9px] font-black text-white">
              {moreBadgeTotal}
            </span>
          )}
        </button>
      </div>

      {/* MOBILE "MORE" SLIDE-UP BOTTOM SHEET MENU */}
      {isMoreMenuOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex flex-col justify-end">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
            onClick={() => setIsMoreMenuOpen(false)}
          />

          <div className="relative z-10 w-full bg-white dark:bg-slate-900 rounded-t-3xl border-t border-slate-200 dark:border-slate-800 shadow-2xl p-4 max-h-[82vh] overflow-y-auto animate-in slide-in-from-bottom duration-200">
            <div className="w-12 h-1.5 bg-slate-300 dark:bg-slate-700 rounded-full mx-auto mb-3" />

            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 font-black">
                  <MoreHorizontal className="h-4 w-4" />
                </div>
                <h3 className="font-black text-slate-900 dark:text-white text-base">
                  {t('moreMenuTitle')}
                </h3>
              </div>
              <button
                onClick={() => setIsMoreMenuOpen(false)}
                className="p-1.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-800 dark:hover:text-white transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-3 space-y-2 pb-6">
              {/* 1. Suppliers Ledger */}
              <button
                onClick={() => handleSelectMoreOption(() => setActiveTab('supplier-khata'))}
                className={`w-full flex items-center justify-between p-3 rounded-2xl transition border ${
                  activeTab === 'supplier-khata'
                    ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-700 text-emerald-900 dark:text-emerald-100'
                    : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 hover:bg-slate-100'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500 text-white shadow-xs">
                    <Users className="h-5 w-5" />
                  </div>
                  <div className="text-left">
                    <p className="font-black text-sm">{t('navSupplierKhata')}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{t('navSubSupplierLedger')}</p>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-slate-400" />
              </button>

              {/* 2. Low Stock */}
              <button
                onClick={() => handleSelectMoreOption(() => setActiveTab('low-stock'))}
                className={`w-full flex items-center justify-between p-3 rounded-2xl transition border ${
                  activeTab === 'low-stock'
                    ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-300 dark:border-rose-700 text-rose-900 dark:text-rose-100'
                    : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 hover:bg-slate-100'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-500 text-white shadow-xs">
                    <AlertTriangle className="h-5 w-5" />
                  </div>
                  <div className="text-left">
                    <div className="flex items-center gap-2">
                      <p className="font-black text-sm">{t('navLowStock')}</p>
                      {lowStockProducts.length > 0 && (
                        <span className="px-1.5 py-0.5 rounded-full bg-red-600 text-white font-black text-[10px]">
                          {lowStockProducts.length}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{t('navSubLowStock')}</p>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-slate-400" />
              </button>

              {/* 3. History & Credit */}
              <button
                onClick={() => handleSelectMoreOption(() => setActiveTab('history'))}
                className={`w-full flex items-center justify-between p-3 rounded-2xl transition border ${
                  activeTab === 'history'
                    ? 'bg-blue-50 dark:bg-blue-950/40 border-blue-300 dark:border-blue-700 text-blue-900 dark:text-blue-100'
                    : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 hover:bg-slate-100'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500 text-white shadow-xs">
                    <Calendar className="h-5 w-5" />
                  </div>
                  <div className="text-left">
                    <p className="font-black text-sm">{t('navHistory')}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{t('navSubHistory')}</p>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-slate-400" />
              </button>

              {/* 4. Customer Orders */}
              <button
                onClick={() =>
                  handleSelectMoreOption(() => {
                    setRateListSubTab('orders');
                    setActiveTab('rate-list-qr');
                  })
                }
                className="w-full flex items-center justify-between p-3 rounded-2xl transition border bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 hover:bg-slate-100"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500 text-slate-950 shadow-xs">
                    <ShoppingBag className="h-5 w-5" />
                  </div>
                  <div className="text-left">
                    <div className="flex items-center gap-2">
                      <p className="font-black text-sm">{t('newOrdersTitle')}</p>
                      {newOrdersCount > 0 && (
                        <span className="px-1.5 py-0.5 rounded-full bg-red-600 text-white font-black text-[10px] animate-pulse">
                          {newOrdersCount}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{t('navSubRateList')}</p>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-slate-400" />
              </button>

              {/* 5. Profit Report */}
              <button
                onClick={() => handleSelectMoreOption(() => setActiveTab('profit-report'))}
                className={`w-full flex items-center justify-between p-3 rounded-2xl transition border ${
                  activeTab === 'profit-report'
                    ? 'bg-purple-50 dark:bg-purple-950/40 border-purple-300 dark:border-purple-700 text-purple-900 dark:text-purple-100'
                    : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 hover:bg-slate-100'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-500 text-white shadow-xs">
                    <TrendingUp className="h-5 w-5" />
                  </div>
                  <div className="text-left">
                    <p className="font-black text-sm">{t('navProfit')}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{t('navSubProfit')}</p>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-slate-400" />
              </button>

              {/* 6. Day Closing */}
              {onOpenDayClosing && (
                <button
                  onClick={() => handleSelectMoreOption(() => onOpenDayClosing())}
                  className="w-full flex items-center justify-between p-3 rounded-2xl transition border bg-indigo-50/70 dark:bg-indigo-950/40 border-indigo-200 dark:border-indigo-800 text-indigo-900 dark:text-indigo-100 hover:bg-indigo-100"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-xs">
                      <Moon className="h-5 w-5" />
                    </div>
                    <div className="text-left">
                      <p className="font-black text-sm">{t('dayClosingBtn')}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">{t('navSubDayClosing')}</p>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-slate-400" />
                </button>
              )}

              {/* 7. Settings & Backup */}
              <button
                onClick={() => handleSelectMoreOption(() => onOpenSettings())}
                className="w-full flex items-center justify-between p-3 rounded-2xl transition border bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 hover:bg-slate-100"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-700 text-white shadow-xs">
                    <Settings className="h-5 w-5" />
                  </div>
                  <div className="text-left">
                    <p className="font-black text-sm">{t('navSettings')}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{t('navSubSettings')}</p>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-slate-400" />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

