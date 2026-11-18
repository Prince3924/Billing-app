import React, { useState } from 'react';
import {
  KeyRound,
  ArrowRight,
  AlertCircle,
  Store,
  ShieldCheck,
  Eye,
  EyeOff,
  ClipboardPaste,
} from 'lucide-react';
import { useShop } from '../context/ShopContext';

export const OwnerCodeLoginPage: React.FC = () => {
  const { loginWithOwnerCode } = useShop();
  const [ownerCode, setOwnerCode] = useState('');
  const [showCode, setShowCode] = useState(true);
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pasteNote, setPasteNote] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const trimmed = ownerCode.trim();
    if (!trimmed) {
      setError('Wrong Code');
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await loginWithOwnerCode(trimmed, rememberMe);
      if (!result.ok) {
        setError(result.error || 'Wrong Code');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="bg-linear-to-br from-amber-500 to-amber-600 px-6 py-7 text-slate-950 text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-950 text-amber-400 shadow-lg">
            <Store className="h-7 w-7" />
          </div>
          <h1 className="text-2xl font-black tracking-tight">Billing App</h1>
          <p className="text-xs font-bold text-slate-900/80 mt-1">
            Owner Access
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 sm:p-7 space-y-5">
          <div className="text-center">
            <h2 className="text-lg font-extrabold text-white">
              Enter Your Owner Code
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Enter your unique shop owner code or shop ID to open your shop
            </p>
          </div>

          {error && (
            <div
              role="alert"
              className="rounded-xl bg-red-500/15 border border-red-500/40 px-4 py-3 text-sm font-bold text-red-300 flex items-center justify-center gap-2"
            >
              <AlertCircle className="h-4 w-4 shrink-0 text-red-400" />
              <span>{error}</span>
            </div>
          )}

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
                type={showCode ? 'text' : 'password'}
                autoComplete="off"
                autoCapitalize="none"
                spellCheck={false}
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

          <div className="pt-2 flex items-center justify-center gap-1.5 text-[11px] text-slate-500">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
            <span>Each shop data is separate &amp; works offline after login</span>
          </div>
        </form>
      </div>
    </div>
  );
};
