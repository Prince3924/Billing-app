import React, { useState, useEffect } from 'react';
import {
  AlertTriangle,
  Trash2,
  Download,
  Check,
  X,
  ArrowRight,
  ArrowLeft,
  Loader2,
  ShieldAlert,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import { useShop } from '../context/ShopContext';

interface AppResetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onResetSuccess?: () => void;
}

type ResetModalPhase = 'step1' | 'step2' | 'deleting' | 'success' | 'error';

export const AppResetModal: React.FC<AppResetModalProps> = ({
  isOpen,
  onClose,
  onResetSuccess,
}) => {
  const { exportBackup, fullAppReset, finalizeResetLogout, t } = useShop();

  const [phase, setPhase] = useState<ResetModalPhase>('step1');
  const [confirmText, setConfirmText] = useState('');
  const [backupDownloaded, setBackupDownloaded] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (!isOpen) {
      setPhase('step1');
      setConfirmText('');
      setBackupDownloaded(false);
      setErrorMessage('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleDownloadBackup = () => {
    try {
      exportBackup();
      setBackupDownloaded(true);
    } catch (err) {
      console.error('Backup download failed', err);
    }
  };

  const handleResetModalClose = () => {
    if (phase === 'deleting' || phase === 'success') return;
    setPhase('step1');
    setConfirmText('');
    setBackupDownloaded(false);
    onClose();
  };

  const handleExecuteReset = async () => {
    if (confirmText.trim().toUpperCase() !== 'DELETE' || phase === 'deleting') return;

    setPhase('deleting');
    setErrorMessage('');
    try {
      await fullAppReset({ deferLogout: true });
      setPhase('success');
    } catch (error) {
      console.error('Failed to delete shop from cloud:', error);
      let msg = error instanceof Error ? error.message : String(error || 'Unknown cloud error');
      try {
        const parsed = JSON.parse(msg);
        if (parsed && typeof parsed.error === 'string') {
          msg = parsed.error;
        }
      } catch {
        // plain error string
      }
      setErrorMessage(msg || 'Unknown cloud error');
      setPhase('error');
    }
  };

  const handleSuccessOk = () => {
    setPhase('step1');
    setConfirmText('');
    setBackupDownloaded(false);
    if (onResetSuccess) {
      onResetSuccess();
    } else {
      onClose();
    }
    finalizeResetLogout();
  };

  const isDeleteConfirmed = confirmText.trim().toUpperCase() === 'DELETE';

  return (
    <div className="keyboard-modal-overlay fixed inset-0 z-60 overflow-y-auto overscroll-contain bg-black/85 p-3 sm:p-4 backdrop-blur-sm flex justify-center items-start sm:items-center">
      <div
        className={`relative w-full max-w-md my-auto rounded-3xl bg-white text-slate-900 shadow-2xl border-2 overflow-hidden ${
          phase === 'success' ? 'border-emerald-500' : 'border-rose-500'
        }`}
      >
        {/* Header for Step 1, Step 2, Deleting & Error */}
        {(phase === 'step1' || phase === 'step2') && (
          <div className="bg-rose-600 px-5 py-4 text-white flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="h-9 w-9 rounded-xl bg-white text-rose-600 flex items-center justify-center font-black shadow-xs">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-black text-base uppercase tracking-tight">
                  {t('resetModalHeader')}
                </h3>
                <p className="text-[11px] text-rose-100 font-medium">
                  {t('resetStepIndicator', { step: phase === 'step1' ? 1 : 2 })}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleResetModalClose}
              className="rounded-lg p-1.5 text-rose-100 hover:bg-rose-700 hover:text-white transition cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        )}

        {/* Content Body */}
        <div className="p-5 space-y-4 keyboard-modal-body">
          {phase === 'step1' && (
            <div className="space-y-4">
              <div className="text-center sm:text-left">
                <h4 className="text-base sm:text-lg font-black text-slate-900 leading-snug">
                  {t('appResetConfirm1Title')}
                </h4>
                <p className="text-xs text-rose-700 font-bold mt-1">
                  {t('resetStep1WarningDesc')}
                </p>
              </div>

              <div className="rounded-2xl bg-rose-50 border border-rose-200 p-3.5 space-y-1.5 text-xs text-slate-800">
                <span className="text-[10px] uppercase font-black tracking-wider text-rose-800 block mb-1">
                  {t('resetEraseListHeading')}
                </span>
                <div className="flex items-center gap-2 text-rose-900 font-medium">
                  <span className="text-rose-600 font-black">✕</span>
                  <span>{t('resetEraseItem1')}</span>
                </div>
                <div className="flex items-center gap-2 text-rose-900 font-medium">
                  <span className="text-rose-600 font-black">✕</span>
                  <span>{t('resetEraseItem2')}</span>
                </div>
                <div className="flex items-center gap-2 text-rose-900 font-medium">
                  <span className="text-rose-600 font-black">✕</span>
                  <span>{t('resetEraseItem3')}</span>
                </div>
                <div className="flex items-center gap-2 text-rose-900 font-medium">
                  <span className="text-rose-600 font-black">✕</span>
                  <span>{t('resetEraseItem4')}</span>
                </div>
                <div className="flex items-center gap-2 text-rose-900 font-medium">
                  <span className="text-rose-600 font-black">✕</span>
                  <span>{t('resetEraseItem5')}</span>
                </div>
                <div className="flex items-center gap-2 text-slate-700 font-medium pt-1 border-t border-rose-200/60">
                  <span className="text-amber-600 font-black">↺</span>
                  <span>{t('resetEraseItem6')}</span>
                </div>
              </div>

              <div className="rounded-2xl bg-emerald-50 border-2 border-emerald-300 p-3.5 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <ShieldAlert className="h-4 w-4 text-emerald-700 shrink-0" />
                    <span className="text-xs font-black text-emerald-900">
                      {t('resetBackupTitle')}
                    </span>
                  </div>
                  {backupDownloaded && (
                    <span className="text-[10px] bg-emerald-600 text-white font-black px-2 py-0.5 rounded-full flex items-center gap-1">
                      <Check className="h-3 w-3 stroke-[3]" />
                      {t('resetBackupDownloadedBadge')}
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-emerald-800 leading-snug">
                  {t('resetBackupRecommended')}
                </p>
                <button
                  type="button"
                  onClick={handleDownloadBackup}
                  className="w-full rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white py-2.5 px-3 text-xs font-black shadow-xs flex items-center justify-center gap-2 transition active:scale-95 cursor-pointer"
                >
                  <Download className="h-4 w-4" />
                  <span>
                    {backupDownloaded
                      ? t('resetBackupDownloadedBtn')
                      : t('resetBackupDownloadBtn')}
                  </span>
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2.5 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={handleResetModalClose}
                  className="rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 py-3 text-xs font-bold transition active:scale-95 cursor-pointer"
                >
                  {t('resetCancelBtn')}
                </button>

                <button
                  type="button"
                  onClick={() => setPhase('step2')}
                  className="rounded-xl bg-rose-600 hover:bg-rose-700 text-white py-3 text-xs font-black shadow-md flex items-center justify-center gap-1.5 transition active:scale-95 cursor-pointer"
                >
                  <span>{t('resetProceedBtn')}</span>
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}

          {phase === 'step2' && (
            <div className="space-y-4">
              <div className="text-center sm:text-left">
                <div className="inline-block bg-rose-100 text-rose-800 text-[10px] font-black uppercase px-2 py-0.5 rounded-full mb-1">
                  {t('resetFinalStepTag')}
                </div>
                <h4 className="text-base sm:text-lg font-black text-slate-900 leading-snug">
                  {t('appResetConfirm2Title')}
                </h4>
                <p className="text-xs text-slate-600 mt-1">
                  {t('resetStep2Prompt')}
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700">
                  {t('resetTypeLabelPrefix')} <span className="text-rose-600 font-black font-mono">DELETE</span> {t('resetTypeLabelSuffix')}
                </label>
                <input
                  type="text"
                  autoFocus
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  placeholder={t('resetKeywordPlaceholder')}
                  className={`w-full rounded-xl border-2 px-3.5 py-2.5 text-sm font-black font-mono tracking-widest text-center uppercase outline-none transition ${
                    isDeleteConfirmed
                      ? 'border-rose-600 bg-rose-50/50 text-rose-700 ring-2 ring-rose-200'
                      : 'border-slate-300 bg-white text-slate-900 placeholder:text-slate-400 focus:border-rose-500'
                  }`}
                />
                <p className="text-[11px] text-slate-500 text-center font-medium">
                  {isDeleteConfirmed ? (
                    <span className="text-rose-600 font-bold flex items-center justify-center gap-1">
                      <Check className="h-3.5 w-3.5" />
                      {t('resetKeywordMatchedMsg')}
                    </span>
                  ) : (
                    <span>{t('resetKeywordHintMsg')}</span>
                  )}
                </p>
              </div>

              <div className="bg-slate-50 rounded-xl p-3 border border-slate-200 text-[11px] text-slate-600 space-y-1">
                <p className="font-bold text-slate-800">
                  {t('resetAfterHeading')}
                </p>
                <p>• {t('resetAfterBullet1')}</p>
                <p>• {t('resetAfterBullet2')}</p>
              </div>

              <div className="grid grid-cols-2 gap-2.5 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setPhase('step1')}
                  className="rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 py-3 text-xs font-bold flex items-center justify-center gap-1.5 transition active:scale-95 cursor-pointer"
                >
                  <ArrowLeft className="h-4 w-4" />
                  <span>{t('resetBackBtn')}</span>
                </button>

                <button
                  type="button"
                  onClick={handleExecuteReset}
                  disabled={!isDeleteConfirmed}
                  className={`rounded-xl py-3 px-2 text-xs font-black shadow-md flex items-center justify-center gap-1.5 transition ${
                    isDeleteConfirmed
                      ? 'bg-rose-600 hover:bg-rose-700 text-white cursor-pointer active:scale-95 animate-pulse'
                      : 'bg-slate-200 text-slate-400 cursor-not-allowed opacity-60'
                  }`}
                >
                  <Trash2 className="h-4 w-4" />
                  <span>{t('resetDeleteAllBtn')}</span>
                </button>
              </div>
            </div>
          )}

          {phase === 'deleting' && (
            <div className="py-8 px-2 text-center space-y-4">
              <div className="mx-auto h-16 w-16 rounded-full bg-rose-50 border-2 border-rose-200 flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-rose-600" />
              </div>
              <div className="space-y-1">
                <h4 className="text-lg font-black text-slate-900">
                  Deleting from Cloud...
                </h4>
                <p className="text-xs text-slate-500">
                  Permanently removing your shop, items, bills, customers, and staff from cloud.
                </p>
              </div>
            </div>
          )}

          {phase === 'success' && (
            <div className="py-5 px-2 text-center space-y-5">
              <div className="mx-auto h-16 w-16 rounded-full bg-emerald-100 border-2 border-emerald-400 flex items-center justify-center text-emerald-600 shadow-sm">
                <CheckCircle2 className="h-10 w-10 stroke-[2.5]" />
              </div>
              <div className="space-y-2">
                <h4 className="text-xl font-black text-slate-900">
                  Deleted Successfully
                </h4>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Your shop and all its bills, items and customers have been permanently deleted from cloud.
                </p>
              </div>
              <button
                type="button"
                onClick={handleSuccessOk}
                className="w-full rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white py-3.5 text-sm font-black shadow-md transition active:scale-95 cursor-pointer"
              >
                OK
              </button>
            </div>
          )}

          {phase === 'error' && (
            <div className="py-4 px-2 text-center space-y-4">
              <div className="mx-auto h-16 w-16 rounded-full bg-rose-100 border-2 border-rose-300 flex items-center justify-center text-rose-600">
                <XCircle className="h-10 w-10 stroke-[2.2]" />
              </div>
              <div className="space-y-1.5">
                <h4 className="text-base sm:text-lg font-black text-rose-700 break-words">
                  Delete Failed: {errorMessage || 'Try Again'}
                </h4>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Unable to complete cloud deletion. Your shop data was not changed and you remain logged in. Please check your internet connection and try again.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-2.5 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={handleResetModalClose}
                  className="rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 py-3 text-xs font-bold transition active:scale-95 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => setPhase('step2')}
                  className="rounded-xl bg-rose-600 hover:bg-rose-700 text-white py-3 text-xs font-black shadow-md transition active:scale-95 cursor-pointer"
                >
                  Try Again
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
