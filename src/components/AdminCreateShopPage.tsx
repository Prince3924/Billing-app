import React, { useState, useEffect, useCallback } from 'react';
import {
  Store,
  PlusCircle,
  Copy,
  Check,
  RefreshCw,
  KeyRound,
  ExternalLink,
  X,
  Phone,
  MapPin,
  Shield,
} from 'lucide-react';

interface AdminShopItem {
  shopId: string;
  ownerCode: string;
  name: string;
  mobile: string;
  address: string;
  productCount?: number;
  updatedAt?: string | null;
}

const LOCAL_ADMIN_SHOPS_KEY = 'yk_registered_shops_v1';

function readLocalShops(): AdminShopItem[] {
  try {
    const raw = localStorage.getItem(LOCAL_ADMIN_SHOPS_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveLocalShops(list: AdminShopItem[]) {
  try {
    localStorage.setItem(LOCAL_ADMIN_SHOPS_KEY, JSON.stringify(list));
  } catch {
    // ignore
  }
}

export const AdminCreateShopPage: React.FC = () => {
  const [shops, setShops] = useState<AdminShopItem[]>([]);
  const [loading, setLoading] = useState(true);

  const [shopName, setShopName] = useState('');
  const [mobile, setMobile] = useState('');
  const [address, setAddress] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [createdModal, setCreatedModal] = useState<{
    shopName: string;
    shopId: string;
    ownerCode: string;
  } | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const loadShops = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/shops', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        const serverShops: AdminShopItem[] = Array.isArray(data?.shops) ? data.shops : [];
        setShops(serverShops);
        saveLocalShops(serverShops);
      } else {
        setShops(readLocalShops());
      }
    } catch {
      setShops(readLocalShops());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadShops();
  }, [loadShops]);

  const handleCopy = async (text: string, key: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }
    setCopiedKey(key);
    setTimeout(() => setCopiedKey((prev) => (prev === key ? null : prev)), 2000);
  };

  const handleCreateShop = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const cleanName = shopName.trim();
    if (!cleanName) {
      setError('Please enter Shop Name');
      return;
    }

    setCreating(true);
    try {
      const res = await fetch('/api/admin/shops', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: cleanName,
          mobile: mobile.trim(),
          address: address.trim(),
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Failed to create shop');
      }

      const data = await res.json();
      const newShopId: string = data.shopId;
      const newOwnerCode: string = data.ownerCode || `${newShopId}-955`;

      setShopName('');
      setMobile('');
      setAddress('');
      setCreatedModal({
        shopName: cleanName,
        shopId: newShopId,
        ownerCode: newOwnerCode,
      });
      await loadShops();
    } catch (err: any) {
      setError(err?.message || 'Failed to create shop. Please check internet connection.');
    } finally {
      setCreating(false);
    }
  };

  const getCustomerLink = (shopId: string) => {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    return `${origin}/#/order?shop=${encodeURIComponent(shopId)}`;
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 sm:p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Admin Header */}
        <div className="rounded-2xl bg-slate-900 border border-slate-800 p-5 flex flex-wrap items-center justify-between gap-4 shadow-lg">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-2xl bg-amber-500 text-slate-950 flex items-center justify-center shadow-md">
              <Shield className="h-6 w-6" />
            </div>
            <div>
              <span className="text-[11px] font-black uppercase tracking-wider text-amber-400">
                Admin Panel
              </span>
              <h1 className="text-xl sm:text-2xl font-black text-white">
                Create &amp; Manage Shops
              </h1>
            </div>
          </div>

          <button
            type="button"
            onClick={loadShops}
            className="flex items-center gap-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 px-3.5 py-2 text-xs font-bold text-slate-200 transition cursor-pointer"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh List</span>
          </button>
        </div>

        {/* Create New Shop Card */}
        <div className="rounded-2xl bg-slate-900 border border-slate-800 p-5 sm:p-6 shadow-lg">
          <h2 className="text-base font-extrabold text-white flex items-center gap-2 mb-4">
            <PlusCircle className="h-5 w-5 text-amber-400" />
            <span>Create New Shop</span>
          </h2>

          {error && (
            <div className="mb-4 rounded-xl bg-red-500/15 border border-red-500/40 px-4 py-3 text-xs font-bold text-red-300">
              {error}
            </div>
          )}

          <form onSubmit={handleCreateShop} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                  Shop Name <span className="text-red-400">*</span>
                </label>
                <div className="relative">
                  <Store className="absolute left-3.5 top-3 h-4 w-4 text-amber-400" />
                  <input
                    type="text"
                    required
                    placeholder="e.g. Sharma General Store"
                    value={shopName}
                    onChange={(e) => setShopName(e.target.value)}
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 pl-10 pr-4 py-2.5 text-sm font-bold text-white placeholder:text-slate-500 focus:border-amber-500 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                  Mobile Number (Optional)
                </label>
                <div className="relative">
                  <Phone className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                  <input
                    type="tel"
                    placeholder="10 digit mobile"
                    value={mobile}
                    onChange={(e) => setMobile(e.target.value)}
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 pl-10 pr-4 py-2.5 text-sm font-semibold text-white placeholder:text-slate-500 focus:border-amber-500 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                  Shop Address (Optional)
                </label>
                <div className="relative">
                  <MapPin className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="City / Market"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 pl-10 pr-4 py-2.5 text-sm font-semibold text-white placeholder:text-slate-500 focus:border-amber-500 outline-none"
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={creating}
              className="w-full sm:w-auto rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-60 text-slate-950 font-black text-sm px-6 py-3 shadow-md flex items-center justify-center gap-2 transition active:scale-95 cursor-pointer"
            >
              <PlusCircle className="h-4 w-4 stroke-[2.5]" />
              <span>{creating ? 'Creating Shop...' : 'Create Shop & Generate Owner Code'}</span>
            </button>
          </form>
        </div>

        {/* Admin Shop List */}
        <div className="rounded-2xl bg-slate-900 border border-slate-800 p-5 sm:p-6 shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-extrabold text-white flex items-center gap-2">
              <KeyRound className="h-5 w-5 text-emerald-400" />
              <span>All Shops &amp; Owner Codes ({shops.length})</span>
            </h2>
          </div>

          {loading && shops.length === 0 ? (
            <div className="py-10 text-center text-sm text-slate-400">Loading shops...</div>
          ) : shops.length === 0 ? (
            <div className="py-10 text-center text-sm text-slate-400">No shops created yet.</div>
          ) : (
            <div className="space-y-3">
              {shops.map((shop) => {
                const ownerCopyKey = `owner-${shop.shopId}`;
                const custCopyKey = `cust-${shop.shopId}`;
                return (
                  <div
                    key={shop.shopId}
                    className="rounded-xl bg-slate-950 border border-slate-800 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <h3 className="font-extrabold text-white text-base truncate">
                        {shop.name || shop.shopId}
                      </h3>
                      <p className="text-xs text-slate-400 mt-0.5 font-mono">
                        Shop ID: <span className="text-slate-300">{shop.shopId}</span>
                      </p>
                      <div className="mt-2 inline-flex items-center gap-2 rounded-lg bg-amber-500/15 border border-amber-500/30 px-3 py-1.5">
                        <span className="text-[11px] font-bold uppercase text-amber-300">
                          Owner Code:
                        </span>
                        <span className="text-xs sm:text-sm font-mono font-black text-amber-400 select-all">
                          {shop.ownerCode}
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleCopy(shop.ownerCode, ownerCopyKey)}
                        className="flex items-center gap-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs px-3.5 py-2.5 transition cursor-pointer"
                      >
                        {copiedKey === ownerCopyKey ? (
                          <>
                            <Check className="h-4 w-4 stroke-[3]" />
                            <span>Copied!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="h-4 w-4" />
                            <span>Copy Owner Code</span>
                          </>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => handleCopy(getCustomerLink(shop.shopId), custCopyKey)}
                        className="flex items-center gap-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold text-xs px-3 py-2.5 transition cursor-pointer"
                        title="Copy Customer Order Link"
                      >
                        {copiedKey === custCopyKey ? (
                          <>
                            <Check className="h-3.5 w-3.5 text-emerald-400" />
                            <span>Link Copied</span>
                          </>
                        ) : (
                          <>
                            <ExternalLink className="h-3.5 w-3.5" />
                            <span>Customer Link</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Big Shop Created Popup */}
      {createdModal && (
        <div className="keyboard-modal-overlay fixed inset-0 z-50 flex items-start sm:items-center justify-center bg-black/80 p-4 backdrop-blur-xs overflow-y-auto overscroll-contain">
          <div className="w-full max-w-lg my-auto rounded-3xl bg-slate-900 border-2 border-amber-500 p-6 sm:p-8 text-center shadow-2xl relative">
            <button
              type="button"
              onClick={() => setCreatedModal(null)}
              className="absolute right-4 top-4 rounded-xl p-2 text-slate-400 hover:bg-slate-800 hover:text-white cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400">
              <Check className="h-9 w-9 stroke-[3]" />
            </div>

            <h3 className="text-2xl font-black text-white">Shop Created!</h3>
            <p className="text-sm text-slate-300 mt-2">
              Owner Code is:
            </p>

            <div className="mt-3 rounded-2xl bg-slate-950 border-2 border-amber-500/60 px-4 py-4">
              <p className="text-lg sm:text-2xl font-mono font-black text-amber-400 break-all select-all">
                {createdModal.ownerCode}
              </p>
            </div>

            <p className="text-sm font-semibold text-slate-300 mt-3">
              Copy and share with shop owner.
            </p>

            <div className="mt-6 flex flex-col sm:flex-row gap-3">
              <button
                type="button"
                onClick={() => handleCopy(createdModal.ownerCode, 'modal-copy')}
                className="flex-1 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-sm py-3.5 px-4 shadow-lg flex items-center justify-center gap-2 transition cursor-pointer"
              >
                {copiedKey === 'modal-copy' ? (
                  <>
                    <Check className="h-5 w-5 stroke-[3]" />
                    <span>Owner Code Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-5 w-5" />
                    <span>Copy Owner Code</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => setCreatedModal(null)}
                className="rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-sm py-3.5 px-6 transition cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
