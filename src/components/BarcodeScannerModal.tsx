import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { Camera, X, RefreshCw, Keyboard, AlertCircle, Zap } from 'lucide-react';
import { useShop } from '../context/ShopContext';

interface BarcodeScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScanSuccess: (barcode: string) => void;
  title?: string;
  subtitle?: string;
}

export const BarcodeScannerModal: React.FC<BarcodeScannerModalProps> = ({
  isOpen,
  onClose,
  onScanSuccess,
  title,
  subtitle,
}) => {
  const { products, shopInfo, t } = useShop();
  const [scannerError, setScannerError] = useState<string | null>(null);
  const [manualCode, setManualCode] = useState('');
  const [cameraActive, setCameraActive] = useState(false);
  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);

  const playBeep = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, audioCtx.currentTime);
      gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.15);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.15);
    } catch {
      // ignore audio unsupported
    }
  };

  const stopScanner = async () => {
    try {
      if (html5QrCodeRef.current && html5QrCodeRef.current.isScanning) {
        await html5QrCodeRef.current.stop();
        await html5QrCodeRef.current.clear();
      }
    } catch {
      // ignore stop errors
    } finally {
      html5QrCodeRef.current = null;
      setCameraActive(false);
    }
  };

  const handleDetected = (decodedText: string) => {
    playBeep();
    stopScanner();
    onScanSuccess(decodedText);
  };

  const startScanner = async () => {
    setScannerError(null);

    try {
      const qrRegionId = 'reader-container';
      if (!document.getElementById(qrRegionId)) return;

      const html5QrCode = new Html5Qrcode(qrRegionId);
      html5QrCodeRef.current = html5QrCode;

      const config = {
        fps: 15,
        qrbox: { width: 260, height: 180 },
        aspectRatio: 1.0,
      };

      await html5QrCode.start(
        { facingMode: 'environment' },
        config,
        (decodedText) => {
          handleDetected(decodedText);
        },
        () => {
          // frame misses ignored
        }
      );

      setCameraActive(true);
    } catch (err: unknown) {
      setCameraActive(false);
      const errMsg = err instanceof Error ? err.message : String(err);
      if (errMsg.includes('NotAllowedError') || errMsg.includes('Permission')) {
        setScannerError(t('scannerPermDeniedErr'));
      } else {
        setScannerError(t('scannerCamUnavailableErr'));
      }
    }
  };

  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        startScanner();
      }, 200);
      return () => {
        clearTimeout(timer);
        stopScanner();
      };
    } else {
      stopScanner();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualCode.trim()) {
      playBeep();
      stopScanner();
      onScanSuccess(manualCode.trim());
    }
  };

  return (
    <div className="keyboard-modal-overlay fixed inset-0 z-50 flex items-start sm:items-center justify-center bg-black/75 p-3 backdrop-blur-xs overflow-y-auto overscroll-contain">
      <div className="relative w-full max-w-md my-auto rounded-2xl bg-white text-slate-900 shadow-2xl overflow-hidden border border-slate-200">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 bg-amber-50 px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500 text-white shadow-xs">
              <Camera className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base">{title || t('scannerTitle')}</h3>
              <p className="text-xs text-slate-500">{subtitle || t('scannerSubtitle')}</p>
            </div>
          </div>
          <button
            onClick={() => {
              stopScanner();
              onClose();
            }}
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Camera Viewport */}
        <div className="p-4 bg-slate-900 text-white text-center relative min-h-[280px] flex flex-col items-center justify-center">
          <div id="reader-container" className="w-full max-w-[300px] overflow-hidden rounded-xl bg-black" />

          {scannerError && (
            <div className="my-3 mx-2 rounded-xl bg-rose-500/20 border border-rose-500/40 p-3 text-rose-200 text-xs flex items-start gap-2">
              <AlertCircle className="h-5 w-5 shrink-0 text-rose-400 mt-0.5" />
              <div className="text-left">
                <span className="font-bold block text-white">{t('scannerCameraNotice')}</span>
                {scannerError}
              </div>
            </div>
          )}

          {!cameraActive && !scannerError && (
            <div className="py-8 flex flex-col items-center gap-2">
              <RefreshCw className="h-7 w-7 text-amber-400 animate-spin" />
              <span className="text-sm font-medium text-slate-300">{t('scannerLoadingCam')}</span>
            </div>
          )}

          {cameraActive && (
            <div className="mt-2 flex items-center justify-center gap-1.5 text-xs text-amber-300 font-medium">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              {t('scannerCameraLive')}
            </div>
          )}
        </div>

        {/* Manual Barcode Input Section */}
        <div className="p-4 bg-white border-t border-slate-100">
          <form onSubmit={handleManualSubmit} className="space-y-3">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <Keyboard className="h-3.5 w-3.5 text-amber-600" />
              {t('scannerManualLabel')}
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder={t('scannerManualPlaceholder')}
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
                className="flex-1 rounded-xl border border-slate-300 bg-white text-slate-900 placeholder:text-slate-400 px-3.5 py-2.5 text-sm font-mono focus:border-amber-500 focus:ring-2 focus:ring-amber-200 outline-none"
              />
              <button
                type="submit"
                disabled={!manualCode.trim()}
                className="rounded-xl bg-amber-500 px-4 py-2.5 font-bold text-slate-900 text-sm hover:bg-amber-400 disabled:opacity-40 transition cursor-pointer"
              >
                {t('scannerDoneBtn')}
              </button>
            </div>
          </form>

          {products.length > 0 && (
            <div className="mt-3 pt-3 border-t border-slate-100">
              <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                <Zap className="h-3 w-3 text-amber-500" />
                {t('scannerQuickTestLabel')}
              </p>
              <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                {products.slice(0, 6).map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => {
                      playBeep();
                      stopScanner();
                      onScanSuccess(p.barcode);
                    }}
                    className="rounded-lg bg-slate-100 hover:bg-amber-100 hover:border-amber-300 border border-slate-200 px-2 py-1 text-[11px] text-slate-700 font-medium text-left transition truncate max-w-[190px] cursor-pointer"
                    title={`${p.barcode} - ${p.name}`}
                  >
                    ⚡ {p.name.split(' ')[0]} ({p.barcode.slice(-4)})
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-slate-50 px-4 py-2.5 border-t border-slate-100 flex justify-between items-center text-xs text-slate-500">
          <span>{shopInfo.name || t('appName')}</span>
          <button
            onClick={() => {
              stopScanner();
              onClose();
            }}
            className="font-bold text-slate-700 hover:text-slate-900 cursor-pointer"
          >
            {t('scannerCloseBtn')}
          </button>
        </div>
      </div>
    </div>
  );
};
