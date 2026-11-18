import React, { useState, useEffect } from 'react';
import { ShopProvider, useShop } from './context/ShopContext';
import { Navbar } from './components/Navbar';
import { Dashboard } from './components/Dashboard';
import { BillingScreen } from './components/BillingScreen';
import { ProductManagement } from './components/ProductManagement';
import { LowStockScreen } from './components/LowStockScreen';
import { DailyHistory } from './components/DailyHistory';
import { ProfitReport } from './components/ProfitReport';
import { SupplierKhataScreen } from './components/SupplierKhataScreen';
import { RateListQrScreen } from './components/RateListQrScreen';
import { CustomerOrderPublicPage } from './components/CustomerOrderPublicPage';
import { OwnerCodeLoginPage } from './components/OwnerCodeLoginPage';
import { AdminCreateShopPage } from './components/AdminCreateShopPage';
import { AddProductModal } from './components/AddProductModal';
import { ShopSettingsModal } from './components/ShopSettingsModal';
import { OnboardingGuideModal } from './components/OnboardingGuideModal';
import { DayClosingModal } from './components/DayClosingModal';
import { Product } from './types';
import { Zap, Store } from 'lucide-react';
import { useMobileKeyboardManager } from './hooks/useMobileKeyboardManager';

const MainLayout: React.FC = () => {
  useMobileKeyboardManager();
  const { activeTab, setActiveTab, shopInfo, activeShopId, t } = useShop();

  const detectRoute = () => {
    if (typeof window === 'undefined') return 'owner' as const;
    const hash = window.location.hash.toLowerCase();
    const path = window.location.pathname.toLowerCase();
    const search = window.location.search.toLowerCase();

    if (
      hash.startsWith('#/order') ||
      hash.startsWith('#order') ||
      path === '/order' ||
      path.startsWith('/order') ||
      search.includes('page=order')
    ) {
      return 'public-order' as const;
    }

    if (
      hash === '#/admin-create-955' ||
      hash.startsWith('#/admin-create-955?') ||
      hash === '#admin-create-955' ||
      path === '/admin-create-955'
    ) {
      return 'admin-create' as const;
    }

    return 'owner' as const;
  };

  const [routeMode, setRouteMode] = useState<'public-order' | 'admin-create' | 'owner'>(() =>
    detectRoute()
  );

  useEffect(() => {
    const handleRouteChange = () => {
      setRouteMode(detectRoute());
    };

    window.addEventListener('hashchange', handleRouteChange);
    window.addEventListener('popstate', handleRouteChange);
    return () => {
      window.removeEventListener('hashchange', handleRouteChange);
      window.removeEventListener('popstate', handleRouteChange);
    };
  }, []);

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isDayClosingOpen, setIsDayClosingOpen] = useState(false);

  // Step-by-step onboarding guide: shows ONLY on first install when 'yk_onboarding_done' is null
  const [isOnboardingOpen, setIsOnboardingOpen] = useState(() => {
    try {
      return localStorage.getItem('yk_onboarding_done') === null;
    } catch {
      return false;
    }
  });

  const handleOpenAddProduct = () => {
    setEditingProduct(null);
    setIsAddModalOpen(true);
  };

  const handleEditProduct = (product: Product) => {
    setEditingProduct(product);
    setIsAddModalOpen(true);
  };

  // 1. Customer Public Order Page (#/order?shop=SHOP_ID)
  if (routeMode === 'public-order') {
    return <CustomerOrderPublicPage />;
  }

  // 2. Admin Create Shop Page (#/admin-create-955 ONLY)
  if (routeMode === 'admin-create') {
    return <AdminCreateShopPage />;
  }

  // 3. Base link or #/owner: if not logged in with Owner Code, show ONLY Owner Code Login Page
  if (!activeShopId) {
    return <OwnerCodeLoginPage />;
  }

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans pb-20 md:pb-8 overflow-x-hidden w-full transition-colors duration-150">
      {/* Navbar with brand & 5-item mobile navigation */}
      <Navbar
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenAddProduct={handleOpenAddProduct}
        onOpenDayClosing={() => setIsDayClosingOpen(true)}
      />

      {/* Main App Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-3 sm:p-5 lg:p-6">
        {activeTab === 'dashboard' && (
          <Dashboard onOpenAddProduct={handleOpenAddProduct} />
        )}

        {activeTab === 'billing' && <BillingScreen />}

        {activeTab === 'products' && (
          <ProductManagement
            onOpenAddProduct={handleOpenAddProduct}
            onEditProduct={handleEditProduct}
          />
        )}

        {activeTab === 'low-stock' && <LowStockScreen />}

        {activeTab === 'history' && <DailyHistory />}

        {activeTab === 'profit-report' && <ProfitReport />}

        {activeTab === 'supplier-khata' && <SupplierKhataScreen />}

        {activeTab === 'rate-list-qr' && <RateListQrScreen />}
      </main>

      {/* Add Product / Edit Product Modal */}
      <AddProductModal
        isOpen={isAddModalOpen}
        onClose={() => {
          setIsAddModalOpen(false);
          setEditingProduct(null);
        }}
        editingProduct={editingProduct}
      />

      {/* Shop Settings & Backup Modal */}
      <ShopSettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        onOpenGuide={() => setIsOnboardingOpen(true)}
      />

      {/* Day Closing Modal (Accessible globally from More Menu & Dashboard) */}
      <DayClosingModal
        isOpen={isDayClosingOpen}
        onClose={() => setIsDayClosingOpen(false)}
      />

      {/* Step-by-Step Onboarding Guide */}
      <OnboardingGuideModal
        isOpen={isOnboardingOpen}
        onClose={() => setIsOnboardingOpen(false)}
      />

      {/* Mobile Floating Action Button */}
      {activeTab !== 'billing' && (
        <div className="md:hidden fixed bottom-18 right-4 z-30">
          <button
            onClick={() => setActiveTab('billing')}
            className="flex items-center gap-1.5 rounded-full bg-amber-500 hover:bg-amber-400 text-slate-950 px-4 py-3 font-black text-xs shadow-xl ring-2 ring-white active:scale-95 transition"
          >
            <Zap className="h-4 w-4 fill-slate-950" />
            <span>{shopInfo.name ? t('addBillHeaderBtn') : t('billActionShort')}</span>
          </button>
        </div>
      )}

      {/* Bottom Footer (Shop Info) */}
      <footer className="no-print mt-auto border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 py-4 text-center text-xs text-slate-500 dark:text-slate-400">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 font-bold text-slate-800 dark:text-slate-200">
            <Store className="h-4 w-4 text-amber-500" />
            <span>{shopInfo.name || t('appName')}</span>
            {shopInfo.address && (
              <span className="font-normal text-slate-400">• {shopInfo.address.split(',')[0]}</span>
            )}
          </div>
          <div className="text-[11px] text-slate-400">
            {shopInfo.address ? `${shopInfo.address} ` : ''}{shopInfo.mobile ? `• 📞 ${shopInfo.mobile}` : ''}
          </div>
          <div className="text-[11px] font-semibold text-amber-700 dark:text-amber-400">
            {shopInfo.name || t('appName')}
          </div>
        </div>
      </footer>
    </div>
  );
};

export default function App() {
  return (
    <ShopProvider>
      <MainLayout />
    </ShopProvider>
  );
}
