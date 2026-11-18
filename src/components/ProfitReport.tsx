import React, { useState, useMemo } from 'react';
import { Building2, User, Layers } from 'lucide-react';
import { useShop } from '../context/ShopContext';

type ReportTab = 'product' | 'company' | 'vendor';

export const ProfitReport: React.FC = () => {
  const { bills, products, t } = useShop();
  const [reportTab, setReportTab] = useState<ReportTab>('company');
  const [timeFilter, setTimeFilter] = useState<'all' | 'month' | 'week'>('all');

  // Exclude Estimates strictly so Estimate / Quotation bills never count as sales or profit
  const finalBills = useMemo(() => bills.filter((b) => !b.isEstimate), [bills]);

  const filteredBills = useMemo(() => {
    if (timeFilter === 'all') return finalBills;

    const now = new Date();
    const days = timeFilter === 'month' ? 30 : 7;
    const cutoff = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

    return finalBills.filter((b) => new Date(b.date) >= cutoff);
  }, [finalBills, timeFilter]);

  const overall = useMemo(() => {
    const totalSales = filteredBills.reduce((acc, b) => acc + b.grandTotal, 0);
    const totalProfit = filteredBills.reduce((acc, b) => acc + b.totalProfit, 0);
    const totalCost = filteredBills.reduce((acc, b) => acc + b.totalPurchaseCost, 0);
    const margin = totalSales > 0 ? ((totalProfit / totalSales) * 100).toFixed(1) : '0';

    return { totalSales, totalProfit, totalCost, margin };
  }, [filteredBills]);

  const productReport = useMemo(() => {
    const map = new Map<
      string,
      {
        productName: string;
        company: string;
        category: string;
        soldQty: number;
        totalRevenue: number;
        totalCost: number;
        totalProfit: number;
      }
    >();

    filteredBills.forEach((bill) => {
      bill.items.forEach((item) => {
        const key = item.productId || item.productName;
        const current = map.get(key) || {
          productName: item.productName,
          company: item.company,
          category: item.category,
          soldQty: 0,
          totalRevenue: 0,
          totalCost: 0,
          totalProfit: 0,
        };

        const itemCost = item.purchasePrice * item.quantity;
        const itemRevenue = item.total;
        const itemProfit = itemRevenue - itemCost;

        current.soldQty += item.quantity;
        current.totalRevenue += itemRevenue;
        current.totalCost += itemCost;
        current.totalProfit += itemProfit;

        map.set(key, current);
      });
    });

    return Array.from(map.values()).sort((a, b) => b.totalProfit - a.totalProfit);
  }, [filteredBills]);

  const companyReport = useMemo(() => {
    const map = new Map<
      string,
      {
        company: string;
        soldQty: number;
        totalRevenue: number;
        totalCost: number;
        totalProfit: number;
        itemCount: number;
      }
    >();

    filteredBills.forEach((bill) => {
      bill.items.forEach((item) => {
        const c = item.company || t('otherLabel');
        const current = map.get(c) || {
          company: c,
          soldQty: 0,
          totalRevenue: 0,
          totalCost: 0,
          totalProfit: 0,
          itemCount: 0,
        };

        const itemCost = item.purchasePrice * item.quantity;
        const itemRevenue = item.total;
        const itemProfit = itemRevenue - itemCost;

        current.soldQty += item.quantity;
        current.totalRevenue += itemRevenue;
        current.totalCost += itemCost;
        current.totalProfit += itemProfit;
        current.itemCount += 1;

        map.set(c, current);
      });
    });

    return Array.from(map.values()).sort((a, b) => b.totalProfit - a.totalProfit);
  }, [filteredBills, t]);

  const vendorReport = useMemo(() => {
    const map = new Map<
      string,
      {
        vendor: string;
        totalStockQty: number;
        totalStockPurchaseValue: number;
        totalSoldQty: number;
        totalSalesRevenue: number;
        totalProfit: number;
      }
    >();

    products.forEach((p) => {
      const v = p.vendor || t('localVendorLabel');
      const current = map.get(v) || {
        vendor: v,
        totalStockQty: 0,
        totalStockPurchaseValue: 0,
        totalSoldQty: 0,
        totalSalesRevenue: 0,
        totalProfit: 0,
      };

      current.totalStockQty += p.stockQuantity;
      current.totalStockPurchaseValue += p.stockQuantity * p.purchasePrice;
      map.set(v, current);
    });

    filteredBills.forEach((bill) => {
      bill.items.forEach((item) => {
        const originalProduct = products.find((p) => p.id === item.productId);
        const v = originalProduct?.vendor || t('localVendorLabel');

        const current = map.get(v) || {
          vendor: v,
          totalStockQty: 0,
          totalStockPurchaseValue: 0,
          totalSoldQty: 0,
          totalSalesRevenue: 0,
          totalProfit: 0,
        };

        const itemCost = item.purchasePrice * item.quantity;
        const itemRevenue = item.total;
        const itemProfit = itemRevenue - itemCost;

        current.totalSoldQty += item.quantity;
        current.totalSalesRevenue += itemRevenue;
        current.totalProfit += itemProfit;
        map.set(v, current);
      });
    });

    return Array.from(map.values()).sort(
      (a, b) => b.totalSalesRevenue - a.totalSalesRevenue
    );
  }, [filteredBills, products, t]);

  return (
    <div className="space-y-4">
      {/* Top Header */}
      <div className="rounded-2xl bg-slate-900 p-4 text-white shadow-md flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-400">
              📊 {t('navProfit')}
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
            {t('profitReportTitle')}
          </h1>
          <p className="text-xs text-slate-400">
            {t('profitReportSubtitle')}
          </p>
        </div>

        <div className="flex bg-slate-800 p-1 rounded-xl border border-slate-700">
          {[
            { id: 'all', label: t('all') },
            { id: 'month', label: t('thisMonthSale') },
            { id: 'week', label: t('last7DaysSale') },
          ].map((f) => (
            <button
              key={f.id}
              onClick={() => setTimeFilter(f.id as typeof timeFilter)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                timeFilter === f.id
                  ? 'bg-amber-500 text-slate-950 shadow-xs'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Top Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="rounded-2xl bg-white text-slate-900 p-4 shadow-sm border border-slate-200">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            {t('total')}
          </span>
          <div className="text-2xl font-black text-slate-900 font-mono mt-1">
            ₹{overall.totalSales.toLocaleString('en-IN')}
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            {t('grossRevenueSub')}
          </p>
        </div>

        <div className="rounded-2xl bg-amber-50 text-slate-900 p-4 shadow-sm border border-amber-300">
          <span className="text-xs font-bold text-amber-800 uppercase tracking-wider">
            {t('dayProfitTotal')}
          </span>
          <div className="text-2xl font-black text-amber-700 font-mono mt-1">
            ₹{overall.totalProfit.toLocaleString('en-IN')}
          </div>
          <p className="text-xs text-amber-800 mt-0.5 font-semibold">
            {overall.margin}{t('profitMarginSuffix')}
          </p>
        </div>

        <div className="rounded-2xl bg-white text-slate-900 p-4 shadow-sm border border-slate-200">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            {t('wholesaleCostLabel')}
          </span>
          <div className="text-2xl font-black text-slate-900 font-mono mt-1">
            ₹{overall.totalCost.toLocaleString('en-IN')}
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            {t('costPriceSoldSub')}
          </p>
        </div>
      </div>

      {/* Report Switcher Tabs */}
      <div className="flex border border-slate-200 bg-white rounded-2xl p-1 shadow-sm gap-1">
        <button
          onClick={() => setReportTab('company')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs sm:text-sm font-bold transition cursor-pointer ${
            reportTab === 'company'
              ? 'bg-amber-500 text-slate-950 shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Building2 className="h-4 w-4" />
          <span>{t('tabCompanyProfit')}</span>
        </button>

        <button
          onClick={() => setReportTab('product')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs sm:text-sm font-bold transition cursor-pointer ${
            reportTab === 'product'
              ? 'bg-amber-500 text-slate-950 shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Layers className="h-4 w-4" />
          <span>{t('tabProductProfit')}</span>
        </button>

        <button
          onClick={() => setReportTab('vendor')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs sm:text-sm font-bold transition cursor-pointer ${
            reportTab === 'vendor'
              ? 'bg-amber-500 text-slate-950 shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <User className="h-4 w-4" />
          <span>{t('tabVendorProfit')}</span>
        </button>
      </div>

      {/* TAB 1: COMPANY WISE PROFIT */}
      {reportTab === 'company' && (
        <div className="rounded-2xl bg-white text-slate-900 p-4 sm:p-5 shadow-sm border border-slate-200">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h3 className="font-extrabold text-slate-900 text-base">
                {t('tabCompanyProfit')}
              </h3>
              <p className="text-xs text-slate-500">
                {t('profitReportSubtitle')}
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500 font-bold uppercase text-[11px]">
                  <th className="py-2.5 pl-2">{t('companyBrandCol')}</th>
                  <th className="py-2.5 text-center">{t('itemsSoldCol')}</th>
                  <th className="py-2.5 text-right">{t('totalSalesCol')}</th>
                  <th className="py-2.5 text-right">{t('wholesaleCostLabel')}</th>
                  <th className="py-2.5 pr-2 text-right">{t('margin')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {companyReport.map((c) => (
                  <tr key={c.company} className="hover:bg-slate-50">
                    <td className="py-3 pl-2">
                      <span className="font-extrabold text-slate-900">{c.company}</span>
                    </td>
                    <td className="py-3 text-center font-bold text-slate-700">
                      {c.soldQty} {t('pcsUnit')}
                    </td>
                    <td className="py-3 text-right font-mono font-bold text-slate-800">
                      ₹{c.totalRevenue.toLocaleString('en-IN')}
                    </td>
                    <td className="py-3 text-right font-mono text-slate-500">
                      ₹{c.totalCost.toLocaleString('en-IN')}
                    </td>
                    <td className="py-3 pr-2 text-right">
                      <span className="font-mono font-black text-amber-700 bg-amber-50 px-2 py-0.5 rounded-lg border border-amber-200">
                        +₹{c.totalProfit.toLocaleString('en-IN')}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: PRODUCT WISE PROFIT */}
      {reportTab === 'product' && (
        <div className="rounded-2xl bg-white text-slate-900 p-4 sm:p-5 shadow-sm border border-slate-200">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h3 className="font-extrabold text-slate-900 text-base">
                {t('tabProductProfit')}
              </h3>
              <p className="text-xs text-slate-500">
                {t('topProfitProductsSub')}
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500 font-bold uppercase text-[11px]">
                  <th className="py-2.5 pl-2">{t('productNameCol')}</th>
                  <th className="py-2.5 text-center">{t('soldQtyCol')}</th>
                  <th className="py-2.5 text-right">{t('revenueCol')}</th>
                  <th className="py-2.5 text-right">{t('costCol')}</th>
                  <th className="py-2.5 pr-2 text-right">{t('profitCol')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {productReport.map((p, idx) => (
                  <tr key={idx} className="hover:bg-slate-50">
                    <td className="py-3 pl-2">
                      <div className="font-bold text-slate-900">{p.productName}</div>
                      <div className="text-[11px] text-slate-500">
                        {p.company} {p.category ? `• ${p.category}` : ''}
                      </div>
                    </td>
                    <td className="py-3 text-center font-bold text-slate-800">
                      {p.soldQty}
                    </td>
                    <td className="py-3 text-right font-mono font-bold text-slate-800">
                      ₹{p.totalRevenue.toLocaleString('en-IN')}
                    </td>
                    <td className="py-3 text-right font-mono text-slate-500">
                      ₹{p.totalCost.toLocaleString('en-IN')}
                    </td>
                    <td className="py-3 pr-2 text-right">
                      <span className="font-mono font-black text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-200">
                        +₹{p.totalProfit.toLocaleString('en-IN')}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: VENDOR / SUPPLIER REPORT */}
      {reportTab === 'vendor' && (
        <div className="rounded-2xl bg-white text-slate-900 p-4 sm:p-5 shadow-sm border border-slate-200">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h3 className="font-extrabold text-slate-900 text-base">
                {t('tabVendorProfit')}
              </h3>
              <p className="text-xs text-slate-500">
                {t('profitReportSubtitle')}
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500 font-bold uppercase text-[11px]">
                  <th className="py-2.5 pl-2">{t('vendorMandiCol')}</th>
                  <th className="py-2.5 text-center">{t('stockLeftCol')}</th>
                  <th className="py-2.5 text-right">{t('stockCostValCol')}</th>
                  <th className="py-2.5 text-right">{t('salesSoFarCol')}</th>
                  <th className="py-2.5 pr-2 text-right">{t('margin')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {vendorReport.map((v) => (
                  <tr key={v.vendor} className="hover:bg-slate-50">
                    <td className="py-3 pl-2">
                      <div className="font-extrabold text-slate-900">{v.vendor}</div>
                    </td>
                    <td className="py-3 text-center font-bold text-slate-700">
                      {v.totalStockQty} {t('pcsUnit')}
                    </td>
                    <td className="py-3 text-right font-mono text-slate-700">
                      ₹{v.totalStockPurchaseValue.toLocaleString('en-IN')}
                    </td>
                    <td className="py-3 text-right font-mono font-bold text-slate-900">
                      ₹{v.totalSalesRevenue.toLocaleString('en-IN')}
                    </td>
                    <td className="py-3 pr-2 text-right">
                      <span className="font-mono font-black text-amber-700 bg-amber-50 px-2 py-0.5 rounded-lg border border-amber-200">
                        +₹{v.totalProfit.toLocaleString('en-IN')}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
