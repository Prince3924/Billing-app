import React, { useState } from 'react';
import { DownloadCloud, Smartphone, Check } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { useShop } from '../context/ShopContext';

interface PWAInstallButtonProps {
  variant?: 'banner' | 'button' | 'settings';
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({ variant = 'button' }) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const { t } = useShop();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  if (isInstalled) {
    if (variant === 'settings') {
      return (
        <div className="flex items-center gap-2 p-3 bg-emerald-50 rounded-2xl border border-emerald-200 text-xs text-emerald-800 font-bold">
          <Check className="h-4 w-4 text-emerald-600" />
          <span>{t('pwaInstalledBadge')}</span>
        </div>
      );
    }
    return null;
  }

  if (variant === 'settings') {
    return (
      <div className="p-3.5 bg-amber-50 rounded-2xl border border-amber-200 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Smartphone className="h-4 w-4 text-amber-600" />
            <h5 className="text-xs font-black text-slate-900">
              {t('pwaSettingsTitle')}
            </h5>
          </div>
          {isInstallable && (
            <button
              type="button"
              onClick={install}
              className="flex items-center gap-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black px-3 py-1.5 text-xs shadow-xs transition active:scale-95 cursor-pointer"
            >
              <DownloadCloud className="h-3.5 w-3.5" />
              <span>{t('pwaInstallBtn')}</span>
            </button>
          )}
          {isIOS && (
            <button
              type="button"
              onClick={() => setShowIOSGuide(true)}
              className="rounded-xl bg-slate-900 text-white font-bold px-3 py-1.5 text-xs cursor-pointer"
            >
              {t('pwaIosGuideBtn')}
            </button>
          )}
        </div>
        <p className="text-[11px] text-slate-600">
          {t('pwaSettingsDesc')}
        </p>

        {showIOSGuide && (
          <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
            <div className="w-full max-w-sm rounded-2xl bg-white text-slate-900 p-5 shadow-2xl text-center">
              <h4 className="font-black text-slate-900 text-sm">{t('pwaIosModalTitle')}</h4>
              <div className="text-xs text-slate-600 mt-2 text-left space-y-1">
                <p>{t('pwaIosStep1')}</p>
                <p>{t('pwaIosStep2')}</p>
              </div>
              <button
                onClick={() => setShowIOSGuide(false)}
                className="mt-4 w-full rounded-xl bg-slate-900 text-white py-2 text-xs font-bold cursor-pointer"
              >
                {t('pwaGotItBtn')}
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  if (isInstallable) {
    return (
      <button
        type="button"
        onClick={install}
        className="flex items-center gap-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white px-2 py-1 text-[11px] font-black shadow-xs transition active:scale-95 cursor-pointer"
        title={t('pwaCompactBtnTitle')}
      >
        <DownloadCloud className="h-3 w-3" />
        <span className="hidden sm:inline">{t('pwaInstallBtn')}</span>
      </button>
    );
  }

  return null;
};
