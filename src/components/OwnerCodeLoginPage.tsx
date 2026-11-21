import React, { useState, useEffect } from 'react';
import {
  KeyRound,
  ArrowRight,
  AlertCircle,
  Store,
  ShieldCheck,
  Eye,
  EyeOff,
  ClipboardPaste,
  PlusCircle,
  LogIn,
  Copy,
  Check,
  User,
  Phone,
  Cloud,
  Users,
  Lock,
  XCircle,
} from 'lucide-react';
import { useShop } from '../context/ShopContext';
import { normalizeMobile10 } from '../utils/pinHash';

export const OwnerCodeLoginPage: React.FC = () => {
  const { loginWithOwnerCode, loginWithStaffCredentials, createNewShop } = useShop();
  const [accessTab, setAccessTab] = useState<'owner' | 'staff'>('owner');
  const [mode, setMode] = useState<'login' | 'create'>('login');

  // Owner Login state (always starts blank; never autofills old deleted codes)
  const [ownerCode, setOwnerCode] = useState('');
  const [showCode, setShowCode] = useState(true);
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notFoundPopupMsg, setNotFoundPopupMsg] = useState<string | null>(null);
  const [pasteNote, setPasteNote] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    setOwnerCode('');
    setError(null);
    setNotFoundPopupMsg(null);
  }, []);

  // Staff Login state
  const [staffMobile, setStaffMobile] = useState('');
  const [staffPin, setStaffPin] = useState('');
  const [showStaffPin, setShowStaffPin] = useState(false);

  // Create New Shop state
  const [shopName, setShopName] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [mobile, setMobile] = useState('');
  const [createdShop, setCreatedShop] = useState<{
    shopId: string;
    ownerCode: string;
    name: string;
  } | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);

  const handlePaste = async () => {
    setError(null);
    setPasteNote(null);
    try {
      if (navigator.clipboard && navigator.clipboard.readText) {
        const text = await navigator.clipboard.readText();
        if (text && text.trim()) {
          setOwnerCode(text.trim());
          setPasteNote('Pasted!');
          setTimeout(() => setPasteNote(null), 1800);
          return;
        }
      }
      setPasteNote('Tap input and paste');
      setTimeout(() => setPasteNote(null), 2000);
    } catch {
      setPasteNote('Tap input and paste');
      setTimeout(() => setPasteNote(null), 2000);
    }
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setNotFoundPopupMsg(null);
    const trimmed = ownerCode.trim();
    if (!trimmed) {
      setError('Wrong Code');
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await loginWithOwnerCode(trimmed, rememberMe);
      if (!result.ok) {
        const msg = result.error || 'Shop not found or deleted. Please create a new shop.';
        setError(msg);
        if (result.notFound !== false) {
          setNotFoundPopupMsg(msg);
        }
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStaffLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const cleanMobile = normalizeMobile10(staffMobile);
    const cleanPin = staffPin.replace(/\D/g, '').slice(0, 4);

    if (cleanMobile.length !== 10 || cleanPin.length !== 4) {
      setError('Wrong Mobile or PIN, Contact Owner');
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await loginWithStaffCredentials(cleanMobile, cleanPin, rememberMe);
      if (!result.ok) {
        setError(result.error || 'Wrong Mobile or PIN, Contact Owner');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!shopName.trim()) {
      setError('Please enter your Shop Name');
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await createNewShop({
        name: shopName.trim(),
        ownerName: ownerName.trim(),
        mobile: mobile.trim(),
        rememberMe,
      });
      if (!result.ok || !result.shopId || !result.ownerCode) {
        setError(result.error || 'Could not create shop');
      } else {
        setCreatedShop({
          shopId: result.shopId,
          ownerCode: result.ownerCode,
          name: shopName.trim(),
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopyOwnerCode = async () => {
    if (!createdShop) return;
    try {
      await navigator.clipboard.writeText(createdShop.ownerCode);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    } catch {
      // ignore
    }
  };

  const handleOpenCreatedShop = async () => {
    if (!createdShop) return;
    setIsSubmitting(true);
    try {
      await loginWithOwnerCode(createdShop.ownerCode, rememberMe);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-dvh bg-slate-950 text-white flex flex-col items-center p-4 overflow-x-hidden">
      <div className="w-full max-w-md my-auto rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="bg-linear-to-br from-amber-500 to-amber-600 px-6 py-6 text-slate-950 text-center">
          <div className="mx-auto mb-2.5 flex h-13 w-13 items-center justify-center rounded-2xl bg-slate-950 text-amber-400 shadow-lg">
            <Store className="h-7 w-7" />
          </div>
          <h1 className="text-2xl font-black tracking-tight">Billing App</h1>
          <p className="text-xs font-bold text-slate-900/80 mt-0.5">
            {accessTab === 'owner'
              ? 'Owner Access • Free Cloud Auto-Sync'
              : 'Staff Access • Mobile & PIN Login'}
          </p>
        </div>

        {/* Newly Created Shop Owner Code Confirmation */}
        {createdShop ? (
          <div className="p-6 sm:p-7 space-y-5 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
              <Check className="h-6 w-6 stroke-[3]" />
            </div>
            <div>
              <h2 className="text-lg font-black text-white">Shop Created!</h2>
              <p className="text-xs text-slate-400 mt-1">
                Save or note this Owner Code safely. You can use it to login on any mobile.
              </p>
            </div>

            <div className="rounded-2xl bg-slate-950 border-2 border-amber-500/60 p-4 space-y-2">
              <p className="text-[11px] font-bold uppercase tracking-wider text-amber-400">
                Your Owner Code
              </p>
              <p className="text-lg sm:text-xl font-mono font-black text-white break-all select-all">
                {createdShop.ownerCode}
              </p>
              <button
                type="button"
                onClick={handleCopyOwnerCode}
                className="mt-2 inline-flex items-center gap-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 px-4 py-2 text-xs font-black text-amber-300 transition cursor-pointer"
              >
                {copiedCode ? (
                  <>
                    <Check className="h-4 w-4 text-emerald-400" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4" />
                    <span>Copy Owner Code</span>
                  </>
                )}
              </button>
            </div>

            <button
              type="button"
              disabled={isSubmitting}
              onClick={handleOpenCreatedShop}
              className="w-full rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-60 text-slate-950 font-black text-sm py-3.5 px-4 shadow-lg flex items-center justify-center gap-2 transition active:scale-[0.98] cursor-pointer"
            >
              <span>{isSubmitting ? 'Opening Shop...' : 'Open My Shop Dashboard'}</span>
              <ArrowRight className="h-4 w-4 stroke-[3]" />
            </button>
          </div>
        ) : (
          <div className="p-6 sm:p-7 space-y-5">
            {/* TOP 2 TABS: [Owner Access] [Staff Access] */}
            <div className="grid grid-cols-2 gap-2 p-1 rounded-2xl bg-slate-950 border border-slate-800">
              <button
                type="button"
                onClick={() => {
                  setAccessTab('owner');
                  setError(null);
                }}
                className={`flex items-center justify-center gap-1.5 rounded-xl py-2.5 px-3 text-xs font-black transition cursor-pointer ${
                  accessTab === 'owner'
                    ? 'bg-amber-500 text-slate-950 shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <KeyRound className="h-4 w-4" />
                <span>Owner Access</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setAccessTab('staff');
                  setError(null);
                }}
                className={`flex items-center justify-center gap-1.5 rounded-xl py-2.5 px-3 text-xs font-black transition cursor-pointer ${
                  accessTab === 'staff'
                    ? 'bg-amber-500 text-slate-950 shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Users className="h-4 w-4" />
                <span>Staff Access</span>
              </button>
            </div>

            {error && (
              <div
                role="alert"
                className="rounded-xl bg-red-500/15 border border-red-500/40 px-4 py-3 text-sm font-bold text-red-300 flex items-center justify-center gap-2 text-center"
              >
                <AlertCircle className="h-4 w-4 shrink-0 text-red-400" />
                <span>{error}</span>
              </div>
            )}

            {accessTab === 'staff' ? (
              <form onSubmit={handleStaffLoginSubmit} className="space-y-4">
                <div className="text-center">
                  <h2 className="text-lg font-extrabold text-white">
                    Enter Staff Access
                  </h2>
                  <p className="text-xs text-slate-400 mt-1">
                    Enter your mobile number and PIN to open your shop
                  </p>
                </div>

                {/* Field 1: MOBILE NUMBER (10 Digit, Numeric Keyboard only) */}
                <div>
                  <label
                    htmlFor="staff-mobile-input"
                    className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5"
                  >
                    MOBILE NUMBER
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-3.5 h-4 w-4 text-amber-400 pointer-events-none" />
                    <input
                      id="staff-mobile-input"
                      type="tel"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={10}
                      autoComplete="tel"
                      placeholder="Enter Staff Mobile Number"
                      value={staffMobile}
                      onChange={(e) => {
                        const digits = e.target.value.replace(/\D/g, '').slice(0, 10);
                        setStaffMobile(digits);
                        if (error) setError(null);
                      }}
                      className="w-full rounded-xl border border-slate-700 bg-slate-950 pl-9 pr-3 py-3 text-sm font-mono font-bold text-white placeholder:text-slate-500 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/30 outline-none transition"
                      autoFocus
                    />
                  </div>
                </div>

                {/* Field 2: STAFF PIN (4-Digit PIN with Show/Hide button) */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label
                      htmlFor="staff-pin-input"
                      className="block text-xs font-bold uppercase tracking-wider text-slate-400"
                    >
                      STAFF PIN
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowStaffPin((prev) => !prev)}
                      className="inline-flex items-center gap-1 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 px-2.5 py-1 text-[11px] font-bold text-slate-300 transition cursor-pointer"
                      title={showStaffPin ? 'Hide PIN' : 'Show PIN'}
                      aria-label={showStaffPin ? 'Hide PIN' : 'Show PIN'}
                    >
                      {showStaffPin ? (
                        <>
                          <EyeOff className="h-3.5 w-3.5" />
                          <span>Hide</span>
                        </>
                      ) : (
                        <>
                          <Eye className="h-3.5 w-3.5" />
                          <span>Show</span>
                        </>
                      )}
                    </button>
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3.5 h-4 w-4 text-amber-400 pointer-events-none" />
                    <input
                      id="staff-pin-input"
                      type={showStaffPin ? 'text' : 'password'}
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={4}
                      autoComplete="off"
                      placeholder="Enter 4-Digit PIN"
                      value={staffPin}
                      onChange={(e) => {
                        const digits = e.target.value.replace(/\D/g, '').slice(0, 4);
                        setStaffPin(digits);
                        if (error) setError(null);
                      }}
                      className="w-full rounded-xl border border-slate-700 bg-slate-950 pl-9 pr-3 py-3 text-sm font-mono font-bold tracking-[0.25em] text-white placeholder:tracking-normal placeholder:text-slate-500 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/30 outline-none transition"
                    />
                  </div>
                </div>

                <label className="flex items-center gap-2.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-600 bg-slate-950 text-amber-500 focus:ring-amber-500/40 cursor-pointer accent-amber-500"
                  />
                  <span className="text-xs font-semibold text-slate-300">
                    Remember Me — Keep me logged in
                  </span>
                </label>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-60 text-slate-950 font-black text-sm py-3.5 px-4 shadow-lg flex items-center justify-center gap-2 transition active:scale-[0.98] cursor-pointer"
                >
                  <span>{isSubmitting ? 'Checking...' : 'Open My Shop'}</span>
                  <ArrowRight className="h-4 w-4 stroke-[3]" />
                </button>
              </form>
            ) : (
              <>
                {/* Owner sub-mode: Login as Owner | Create New Shop */}
                <div className="grid grid-cols-2 gap-2 p-1 rounded-2xl bg-slate-950 border border-slate-800">
                  <button
                    type="button"
                    onClick={() => {
                      setMode('login');
                      setError(null);
                    }}
                    className={`flex items-center justify-center gap-1.5 rounded-xl py-2 px-3 text-xs font-black transition cursor-pointer ${
                      mode === 'login'
                        ? 'bg-slate-800 text-amber-400 border border-amber-500/40 shadow-xs'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <LogIn className="h-3.5 w-3.5" />
                    <span>Login as Owner</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setMode('create');
                      setError(null);
                    }}
                    className={`flex items-center justify-center gap-1.5 rounded-xl py-2 px-3 text-xs font-black transition cursor-pointer ${
                      mode === 'create'
                        ? 'bg-emerald-500 text-slate-950 shadow-md'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <PlusCircle className="h-3.5 w-3.5" />
                    <span>Create New Shop</span>
                  </button>
                </div>

                {mode === 'login' ? (
                  <form onSubmit={handleLoginSubmit} className="space-y-4">
                    <div className="text-center">
                      <h2 className="text-lg font-extrabold text-white">
                        Enter Your Owner Code
                      </h2>
                      <p className="text-xs text-slate-400 mt-1">
                        Enter your unique shop owner code to open your shop &amp; restore cloud data
                      </p>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label
                          htmlFor="owner-code-input"
                          className="block text-xs font-bold uppercase tracking-wider text-slate-400"
                        >
                          Owner Code
                        </label>
                        <div className="flex items-center gap-1.5">
                          {pasteNote && (
                            <span className="text-[11px] font-semibold text-amber-400">
                              {pasteNote}
                            </span>
                          )}
                          <button
                            type="button"
                            onClick={handlePaste}
                            className="inline-flex items-center gap-1 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 px-2.5 py-1 text-[11px] font-bold text-amber-300 transition cursor-pointer"
                            title="Paste Owner Code"
                          >
                            <ClipboardPaste className="h-3.5 w-3.5" />
                            <span>Paste</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setShowCode((prev) => !prev)}
                            className="inline-flex items-center gap-1 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 px-2.5 py-1 text-[11px] font-bold text-slate-300 transition cursor-pointer"
                            title={showCode ? 'Hide Owner Code' : 'Show Owner Code'}
                            aria-label={showCode ? 'Hide Owner Code' : 'Show Owner Code'}
                          >
                            {showCode ? (
                              <>
                                <EyeOff className="h-3.5 w-3.5" />
                                <span>Hide</span>
                              </>
                            ) : (
                              <>
                                <Eye className="h-3.5 w-3.5" />
                                <span>Show</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>

                      <div className="relative">
                        <KeyRound className="absolute left-3 top-3.5 h-4 w-4 text-amber-400 pointer-events-none" />
                        <input
                          id="owner-code-input"
                          name="owner-code-entry"
                          type={showCode ? 'text' : 'password'}
                          autoComplete="new-password"
                          autoCapitalize="none"
                          autoCorrect="off"
                          spellCheck={false}
                          data-lpignore="true"
                          data-form-type="other"
                          placeholder="e.g. your-shop-id-955"
                          value={ownerCode}
                          onChange={(e) => {
                            setOwnerCode(e.target.value);
                            if (error) setError(null);
                          }}
                          className="w-full rounded-xl border border-slate-700 bg-slate-950 pl-9 pr-3 py-3 text-[13px] font-mono font-bold text-white placeholder:text-slate-500 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/30 outline-none transition overflow-x-auto"
                          autoFocus
                        />
                      </div>
                    </div>

                    <label className="flex items-center gap-2.5 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={rememberMe}
                        onChange={(e) => setRememberMe(e.target.checked)}
                        className="h-4 w-4 rounded border-slate-600 bg-slate-950 text-amber-500 focus:ring-amber-500/40 cursor-pointer accent-amber-500"
                      />
                      <span className="text-xs font-semibold text-slate-300">
                        Remember Me — Keep me logged in
                      </span>
                    </label>

                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-60 text-slate-950 font-black text-sm py-3.5 px-4 shadow-lg flex items-center justify-center gap-2 transition active:scale-[0.98] cursor-pointer"
                    >
                      <span>{isSubmitting ? 'Checking...' : 'Open My Shop'}</span>
                      <ArrowRight className="h-4 w-4 stroke-[3]" />
                    </button>
                  </form>
                ) : (
                  <form onSubmit={handleCreateSubmit} className="space-y-4">
                    <div className="text-center">
                      <h2 className="text-lg font-extrabold text-white">
                        Create New Shop
                      </h2>
                      <p className="text-xs text-slate-400 mt-1">
                        Set up your shop in 10 seconds with separate private data
                      </p>
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                        Shop Name *
                      </label>
                      <div className="relative">
                        <Store className="absolute left-3 top-3.5 h-4 w-4 text-emerald-400 pointer-events-none" />
                        <input
                          type="text"
                          required
                          placeholder="e.g. Sharma Kirana Store"
                          value={shopName}
                          onChange={(e) => setShopName(e.target.value)}
                          className="w-full rounded-xl border border-slate-700 bg-slate-950 pl-9 pr-3 py-3 text-sm font-bold text-white placeholder:text-slate-500 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30 outline-none transition"
                          autoFocus
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                        Owner Name
                      </label>
                      <div className="relative">
                        <User className="absolute left-3 top-3.5 h-4 w-4 text-slate-400 pointer-events-none" />
                        <input
                          type="text"
                          placeholder="e.g. Rajesh Sharma"
                          value={ownerName}
                          onChange={(e) => setOwnerName(e.target.value)}
                          className="w-full rounded-xl border border-slate-700 bg-slate-950 pl-9 pr-3 py-3 text-sm font-bold text-white placeholder:text-slate-500 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30 outline-none transition"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                        Mobile Number
                      </label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-3.5 h-4 w-4 text-slate-400 pointer-events-none" />
                        <input
                          type="tel"
                          placeholder="e.g. 9876543210"
                          value={mobile}
                          onChange={(e) => setMobile(e.target.value)}
                          className="w-full rounded-xl border border-slate-700 bg-slate-950 pl-9 pr-3 py-3 text-sm font-mono font-bold text-white placeholder:text-slate-500 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30 outline-none transition"
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-60 text-slate-950 font-black text-sm py-3.5 px-4 shadow-lg flex items-center justify-center gap-2 transition active:scale-[0.98] cursor-pointer"
                    >
                      <span>{isSubmitting ? 'Creating Shop...' : 'Create Shop & Get Owner Code'}</span>
                      <ArrowRight className="h-4 w-4 stroke-[3]" />
                    </button>
                  </form>
                )}
              </>
            )}

            <div className="pt-2 flex flex-col items-center gap-1 text-[11px] text-slate-500">
              <div className="flex items-center gap-1.5">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
                <span>Each shop data is 100% separate &amp; works offline</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Cloud className="h-3.5 w-3.5 text-amber-400" />
                <span>Auto-syncs to Firebase Free Cloud when online</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Error Popup when entered Owner Code does not exist or shop was deleted */}
      {notFoundPopupMsg && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4"
        >
          <div className="w-full max-w-sm rounded-3xl bg-slate-900 border-2 border-red-500/70 p-6 text-center shadow-2xl space-y-4">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-red-500/15 border border-red-500/40 text-red-400">
              <XCircle className="h-9 w-9 stroke-[2.2]" />
            </div>
            <div className="space-y-1.5">
              <h3 className="text-lg font-black text-white">Shop Not Found</h3>
              <p className="text-sm text-slate-300 leading-relaxed">
                {notFoundPopupMsg}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setNotFoundPopupMsg(null)}
              className="w-full rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-sm py-3 px-4 shadow-md transition active:scale-[0.98] cursor-pointer"
            >
              OK
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
