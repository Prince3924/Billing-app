import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  X,
  Store,
  Download,
  Upload,
  Check,
  AlertTriangle,
  Phone,
  MapPin,
  ShieldCheck,
  QrCode,
  CreditCard,
  Trash2,
  MessageSquare,
  Hash,
  RotateCcw,
  Plus,
  Eye,
  Moon,
  Sun,
  FileText,
  Image,
  Camera,
  Sparkles,
  Send,
  LogOut,
  Copy,
} from 'lucide-react';
import { useShop } from '../context/ShopContext';
import {
  Language,
  BillNumberConfig,
  BillYearFormat,
  UdharReminderTemplates,
  BillFooterTemplates,
  LogoDesign,
  OrderMessageSettings,
  OrderMessageType,
} from '../types';
import { LanguageSelector } from './LanguageSelector';
import { AppResetModal } from './AppResetModal';
import { SmartLogoMakerModal } from './SmartLogoMakerModal';
import { ShopLogo } from './ShopLogo';
import {
  DEFAULT_UDHAR_TEMPLATES,
  DEFAULT_BILL_FOOTER_TEMPLATES,
  formatBillNumber,
  getFinancialYearString,
} from '../utils/billNumber';

interface ShopSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenGuide?: () => void;
}

export const ShopSettingsModal: React.FC<ShopSettingsModalProps> = ({
  isOpen,
  onClose,
  onOpenGuide,
}) => {
  const {
    activeShopId,
    logoutOwner,
    shopInfo,
    updateShopInfo,
    exportBackup,
    importBackup,
    resetToDefault,
    language,
    t,
    darkMode,
    setDarkMode,
  } = useShop();

  const [copiedOwnerCode, setCopiedOwnerCode] = useState(false);

  const [name, setName] = useState(shopInfo.name);
  const [address, setAddress] = useState(shopInfo.address);
  const [mobile, setMobile] = useState(shopInfo.mobile);
  const [alternateMobile, setAlternateMobile] = useState(shopInfo.alternateMobile || '');
  const [gstin, setGstin] = useState(shopInfo.gstin || '');
  const [tagline, setTagline] = useState(shopInfo.tagline || '');

  // Business Logo State
  const [logoUrl, setLogoUrl] = useState<string>(shopInfo.logoUrl || '');
  const [logoDesign, setLogoDesign] = useState<LogoDesign | undefined>(shopInfo.logoDesign);
  const [showLogoOnBill, setShowLogoOnBill] = useState<boolean>(shopInfo.showLogoOnBill ?? false);
  const [isSmartLogoOpen, setIsSmartLogoOpen] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  // Order Message Settings State (PART 3)
  const [orderMsgSettings, setOrderMsgSettings] = useState<OrderMessageSettings>(() => ({
    messageType: shopInfo.orderMessageSettings?.messageType || 'both',
    messageLanguage: shopInfo.orderMessageSettings?.messageLanguage || language,
    showLogo: shopInfo.orderMessageSettings?.showLogo ?? true,
    showMobile: shopInfo.orderMessageSettings?.showMobile ?? true,
  }));
  const [orderMsgSavedToast, setOrderMsgSavedToast] = useState(false);

  // UPI & Bank Details state
  const [upiId, setUpiId] = useState(shopInfo.upiId || '');
  const [payeeName, setPayeeName] = useState(shopInfo.payeeName || shopInfo.name);
  const [showUpiQrOnBill, setShowUpiQrOnBill] = useState(shopInfo.showUpiQrOnBill ?? true);
  const [bankName, setBankName] = useState(shopInfo.bankName || '');
  const [accountNumber, setAccountNumber] = useState(shopInfo.accountNumber || '');
  const [ifscCode, setIfscCode] = useState(shopInfo.ifscCode || '');

  // Udhar Reminder Templates
  const [templateLang, setTemplateLang] = useState<Language>(language);
  const [udharTemplates, setUdharTemplates] = useState<UdharReminderTemplates>(() => ({
    english: shopInfo.udharTemplates?.english || DEFAULT_UDHAR_TEMPLATES.english,
    hindi: shopInfo.udharTemplates?.hindi || DEFAULT_UDHAR_TEMPLATES.hindi,
    hinglish: shopInfo.udharTemplates?.hinglish || DEFAULT_UDHAR_TEMPLATES.hinglish,
  }));
  const [udharMessageSavedToast, setUdharMessageSavedToast] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Bill Number Format
  const [billPrefix, setBillPrefix] = useState<string>(shopInfo.billNumberConfig?.prefix || '');
  const [billYearFormat, setBillYearFormat] = useState<BillYearFormat>(
    shopInfo.billNumberConfig?.yearFormat || 'none'
  );
  const [billStartNum, setBillStartNum] = useState<number>(
    shopInfo.billNumberConfig?.startingNumber || 1
  );
  const [billDigitLength, setBillDigitLength] = useState<number>(
    shopInfo.billNumberConfig?.digitLength || 1
  );
  const [billFormatSavedToast, setBillFormatSavedToast] = useState(false);

  // Bill Footer Message
  const [footerLang, setFooterLang] = useState<Language>(language);
  const [billFooterTemplates, setBillFooterTemplates] = useState<BillFooterTemplates>(() => ({
    english: shopInfo.billFooterTemplates?.english || DEFAULT_BILL_FOOTER_TEMPLATES.english,
    hindi: shopInfo.billFooterTemplates?.hindi || DEFAULT_BILL_FOOTER_TEMPLATES.hindi,
    hinglish: shopInfo.billFooterTemplates?.hinglish || DEFAULT_BILL_FOOTER_TEMPLATES.hinglish,
  }));
  const [footerSavedToast, setFooterSavedToast] = useState(false);
  const footerTextareaRef = useRef<HTMLTextAreaElement>(null);

  const [savedSuccess, setSavedSuccess] = useState(false);
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);

  // Keep local form synchronized whenever modal opens or shopInfo updates externally
  useEffect(() => {
    if (!isOpen) return;
    setName(shopInfo.name);
    setAddress(shopInfo.address);
    setMobile(shopInfo.mobile);
    setAlternateMobile(shopInfo.alternateMobile || '');
    setGstin(shopInfo.gstin || '');
    setTagline(shopInfo.tagline || '');
    setLogoUrl(shopInfo.logoUrl || '');
    setLogoDesign(shopInfo.logoDesign);
    setShowLogoOnBill(shopInfo.showLogoOnBill ?? false);
    setOrderMsgSettings({
      messageType: shopInfo.orderMessageSettings?.messageType || 'both',
      messageLanguage: shopInfo.orderMessageSettings?.messageLanguage || language,
      showLogo: shopInfo.orderMessageSettings?.showLogo ?? true,
      showMobile: shopInfo.orderMessageSettings?.showMobile ?? true,
    });
    setUpiId(shopInfo.upiId || '');
    setPayeeName(shopInfo.payeeName || shopInfo.name);
    setShowUpiQrOnBill(shopInfo.showUpiQrOnBill ?? true);
    setBankName(shopInfo.bankName || '');
    setAccountNumber(shopInfo.accountNumber || '');
    setIfscCode(shopInfo.ifscCode || '');
    setUdharTemplates({
      english: shopInfo.udharTemplates?.english || DEFAULT_UDHAR_TEMPLATES.english,
      hindi: shopInfo.udharTemplates?.hindi || DEFAULT_UDHAR_TEMPLATES.hindi,
      hinglish: shopInfo.udharTemplates?.hinglish || DEFAULT_UDHAR_TEMPLATES.hinglish,
    });
    setBillPrefix(shopInfo.billNumberConfig?.prefix || '');
    setBillYearFormat(shopInfo.billNumberConfig?.yearFormat || 'none');
    setBillStartNum(shopInfo.billNumberConfig?.startingNumber || 1);
    setBillDigitLength(shopInfo.billNumberConfig?.digitLength || 1);
    setBillFooterTemplates({
      english: shopInfo.billFooterTemplates?.english || DEFAULT_BILL_FOOTER_TEMPLATES.english,
      hindi: shopInfo.billFooterTemplates?.hindi || DEFAULT_BILL_FOOTER_TEMPLATES.hindi,
      hinglish: shopInfo.billFooterTemplates?.hinglish || DEFAULT_BILL_FOOTER_TEMPLATES.hinglish,
    });
  }, [isOpen, shopInfo, language]);

  const currentYear = new Date().getFullYear();
  const currentShortYear = currentYear.toString().slice(-2);
  const currentFy = getFinancialYearString(new Date());

  const liveBillConfig: BillNumberConfig = useMemo(
    () => ({
      prefix: billPrefix.trim(),
      yearFormat: billYearFormat,
      startingNumber: Math.max(1, Number(billStartNum) || 1),
      digitLength: Math.max(1, Number(billDigitLength) || 1),
    }),
    [billPrefix, billYearFormat, billStartNum, billDigitLength]
  );

  const sampleCurrentBill = useMemo(() => {
    return formatBillNumber(liveBillConfig, liveBillConfig.startingNumber, new Date());
  }, [liveBillConfig]);

  const sampleNextBill = useMemo(() => {
    return formatBillNumber(liveBillConfig, liveBillConfig.startingNumber + 1, new Date());
  }, [liveBillConfig]);

  const currentUdharText = udharTemplates[templateLang] || DEFAULT_UDHAR_TEMPLATES[templateLang];
  const samplePreviewMessage = useMemo(() => {
    const shopNameSample = name.trim() || shopInfo.name || t('appName');
    return (currentUdharText || '')
      .replace(/\{name\}/g, 'Ramesh Kumar')
      .replace(/\{amount\}/g, '500')
      .replace(/\{shop\}/g, shopNameSample);
  }, [currentUdharText, name, shopInfo.name, t]);

  const currentFooterText =
    billFooterTemplates[footerLang] || DEFAULT_BILL_FOOTER_TEMPLATES[footerLang];
  const sampleFooterPreview = useMemo(() => {
    const shopNameSample = name.trim() || shopInfo.name || t('appName');
    return (currentFooterText || '')
      .replace(/\{name\}/g, 'Ramesh Kumar')
      .replace(/\{shop\}/g, shopNameSample);
  }, [currentFooterText, name, shopInfo.name, t]);

  const processLogoFile = (file: File) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const rawResult = ev.target?.result as string;
      if (!rawResult || !rawResult.startsWith('data:')) return;

      const img = new window.Image();
      img.onload = () => {
        try {
          const maxDim = 400;
          let width = img.naturalWidth || img.width || 320;
          let height = img.naturalHeight || img.height || 320;

          if (width > maxDim || height > maxDim) {
            if (width > height) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            } else {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }

          const canvas = document.createElement('canvas');
          canvas.width = Math.max(1, width);
          canvas.height = Math.max(1, height);
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            const optimizedBase64 = canvas.toDataURL('image/png', 0.95);
            setLogoUrl(optimizedBase64);
            setLogoDesign(undefined);
            return;
          }
        } catch (e) {
          console.warn('Canvas optimization failed, saving direct Base64:', e);
        }
        setLogoUrl(rawResult);
        setLogoDesign(undefined);
      };
      img.onerror = () => {
        setLogoUrl(rawResult);
        setLogoDesign(undefined);
      };
      img.src = rawResult;
    };
    reader.readAsDataURL(file);
  };

  if (!isOpen) return null;

  const handleSaveOrderMessageSettings = () => {
    updateShopInfo({
      ...shopInfo,
      orderMessageSettings: orderMsgSettings,
    });
    setOrderMsgSavedToast(true);
    setTimeout(() => setOrderMsgSavedToast(false), 2000);
  };

  const handleInsertPlaceholder = (placeholder: '{name}' | '{amount}' | '{shop}') => {
    const textarea = textareaRef.current;
    if (!textarea) {
      setUdharTemplates((prev) => ({
        ...prev,
        [templateLang]: ((prev[templateLang] || '') + ' ' + placeholder).trim(),
      }));
      return;
    }

    const start = textarea.selectionStart ?? textarea.value.length;
    const end = textarea.selectionEnd ?? textarea.value.length;
    const currentVal = udharTemplates[templateLang] ?? DEFAULT_UDHAR_TEMPLATES[templateLang];
    const newVal = currentVal.substring(0, start) + placeholder + currentVal.substring(end);

    setUdharTemplates((prev) => ({
      ...prev,
      [templateLang]: newVal,
    }));

    setTimeout(() => {
      textarea.focus();
      const newPos = start + placeholder.length;
      textarea.setSelectionRange(newPos, newPos);
    }, 50);
  };

  const handleResetDefaultTemplate = () => {
    setUdharTemplates((prev) => ({
      ...prev,
      [templateLang]: DEFAULT_UDHAR_TEMPLATES[templateLang],
    }));
  };

  const handleSaveUdharTemplates = () => {
    updateShopInfo({
      ...shopInfo,
      udharTemplates,
    });
    setUdharMessageSavedToast(true);
    setTimeout(() => setUdharMessageSavedToast(false), 2000);
  };

  const handleSaveBillFormat = () => {
    updateShopInfo({
      ...shopInfo,
      billNumberConfig: liveBillConfig,
    });
    setBillFormatSavedToast(true);
    setTimeout(() => setBillFormatSavedToast(false), 2000);
  };

  const handleInsertFooterPlaceholder = (placeholder: '{shop}' | '{name}') => {
    const textarea = footerTextareaRef.current;
    if (!textarea) {
      setBillFooterTemplates((prev) => ({
        ...prev,
        [footerLang]: ((prev[footerLang] || '') + ' ' + placeholder).trim(),
      }));
      return;
    }

    const start = textarea.selectionStart ?? textarea.value.length;
    const end = textarea.selectionEnd ?? textarea.value.length;
    const currentVal =
      billFooterTemplates[footerLang] ?? DEFAULT_BILL_FOOTER_TEMPLATES[footerLang];
    const newVal = currentVal.substring(0, start) + placeholder + currentVal.substring(end);

    setBillFooterTemplates((prev) => ({
      ...prev,
      [footerLang]: newVal,
    }));

    setTimeout(() => {
      textarea.focus();
      const newPos = start + placeholder.length;
      textarea.setSelectionRange(newPos, newPos);
    }, 50);
  };

  const handleResetDefaultFooterTemplate = () => {
    setBillFooterTemplates((prev) => ({
      ...prev,
      [footerLang]: DEFAULT_BILL_FOOTER_TEMPLATES[footerLang],
    }));
  };

  const handleSaveFooterTemplates = () => {
    updateShopInfo({
      ...shopInfo,
      billFooterTemplates,
    });
    setFooterSavedToast(true);
    setTimeout(() => setFooterSavedToast(false), 2000);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    updateShopInfo({
      ...shopInfo,
      name: name.trim(),
      address: address.trim(),
      mobile: mobile.trim(),
      alternateMobile: alternateMobile.trim() || undefined,
      gstin: gstin.trim() || undefined,
      tagline: tagline.trim() || undefined,
      logoUrl: logoUrl.trim() || undefined,
      logoDesign: logoDesign || undefined,
      showLogoOnBill,
      orderMessageSettings: orderMsgSettings,
      upiId: upiId.trim() || undefined,
      payeeName: payeeName.trim() || undefined,
      showUpiQrOnBill,
      bankName: bankName.trim() || undefined,
      accountNumber: accountNumber.trim() || undefined,
      ifscCode: ifscCode.trim() || undefined,
      udharTemplates,
      billNumberConfig: liveBillConfig,
      billFooterTemplates,
    });
    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      onClose();
    }, 1200);
  };

  const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        const ok = importBackup(text);
        if (ok) {
          alert(t('backupRestoreSuccess'));
          onClose();
        } else {
          alert(t('backupRestoreError'));
        }
      };
      reader.readAsText(file);
    }
  };

  return (
    <div className="keyboard-modal-overlay fixed inset-0 z-50 flex items-start sm:items-center justify-center bg-black/75 p-2 sm:p-4 backdrop-blur-xs overflow-y-auto overscroll-contain">
      <div className="relative w-full max-w-lg rounded-2xl bg-slate-100 dark:bg-slate-950 shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden my-auto">
        {/* Modal Header */}
        <div className="border-b border-slate-800 bg-slate-900 px-5 py-4 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500 text-slate-950 font-black">
              <Store className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base sm:text-lg">{t('navSettings')}</h3>
              <p className="text-xs text-slate-400">{t('settingsTitle')}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-white cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Scrollable Content Form */}
        <form
          onSubmit={handleSave}
          className="p-4 sm:p-5 space-y-4 max-h-[calc(var(--vv-height,100dvh)-6rem)] sm:max-h-[78vh] overflow-y-auto overscroll-contain pb-24 sm:pb-5 keyboard-modal-body"
        >
          {savedSuccess && (
            <div className="rounded-xl bg-emerald-600 px-4 py-2.5 text-white text-xs font-bold flex items-center gap-2">
              <Check className="h-4 w-4" />
              <span>{t('shopInfoSavedToast')}</span>
            </div>
          )}

          {/* DARK MODE TOGGLE */}
          <div className="rounded-2xl bg-slate-900 text-white p-3.5 border border-slate-800 shadow-xs flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="h-9 w-9 rounded-xl bg-slate-800 flex items-center justify-center text-amber-400">
                {darkMode ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
              </div>
              <div>
                <h4 className="text-xs font-black uppercase tracking-wider text-white">
                  {t('appearanceSectionTitle')}
                </h4>
                <p className="text-[11px] text-slate-400">{t('darkModeToggleLabel')}</p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setDarkMode(!darkMode)}
              className={`relative inline-flex h-7 w-14 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                darkMode ? 'bg-amber-500' : 'bg-slate-700'
              }`}
              title={t('darkModeToggleLabel')}
            >
              <span
                className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-slate-950 shadow-lg ring-0 transition duration-200 ease-in-out flex items-center justify-center text-[9px] font-black text-amber-400 ${
                  darkMode ? 'translate-x-7' : 'translate-x-0 text-slate-400'
                }`}
              >
                {darkMode ? t('darkModeOn') : t('darkModeOff')}
              </span>
            </button>
          </div>

          {/* SHOP PROFILE SUMMARY CARD */}
          <div className="rounded-2xl bg-slate-900 p-4 text-white shadow-xs border border-slate-800">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-wider bg-amber-500 text-slate-950 px-2 py-0.5 rounded-full">
                {t('shopProfileTab')}
              </span>
            </div>
            <h4 className="text-base font-black text-white mt-1.5 uppercase">
              {shopInfo.name || t('appName')}
            </h4>
            <div className="mt-1 flex items-start gap-1.5 text-xs text-amber-200/90 font-medium leading-relaxed">
              <MapPin className="h-3.5 w-3.5 text-amber-400 shrink-0 mt-0.5" />
              <span>{shopInfo.address || '—'}</span>
            </div>
            <div className="mt-1 flex items-center gap-1.5 text-xs text-slate-300 font-mono">
              <Phone className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
              <span>
                {t('mobile')}: {shopInfo.mobile || '—'}
              </span>
            </div>

            {activeShopId && shopInfo.id && (
              <div className="mt-3 pt-3 border-t border-slate-800 flex flex-wrap items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Owner Code (For 2nd Mobile Login)
                  </p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="text-xs font-mono font-black text-amber-400 truncate">
                      {activeShopId}-955
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard?.writeText(`${activeShopId}-955`).catch(() => {});
                        setCopiedOwnerCode(true);
                        setTimeout(() => setCopiedOwnerCode(false), 1800);
                      }}
                      className="inline-flex items-center gap-1 rounded-lg bg-slate-800 hover:bg-slate-700 px-2 py-0.5 text-[10px] font-bold text-slate-200 cursor-pointer"
                    >
                      {copiedOwnerCode ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                      <span>{copiedOwnerCode ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    logoutOwner();
                  }}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 px-3 py-1.5 text-xs font-black text-rose-300 transition cursor-pointer shrink-0"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  <span>Logout / Switch Shop</span>
                </button>
              </div>
            )}
          </div>

          {/* BUSINESS LOGO SETTING SECTION (Pure white card) */}
          <div className="rounded-2xl bg-white text-slate-900 border border-slate-200 p-4 space-y-3.5 shadow-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center font-bold">
                  <Image className="h-4 w-4" />
                </div>
                <div>
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-900">
                    {t('businessLogoTitle')}
                  </h4>
                  <p className="text-[10px] text-slate-500">{t('businessLogoSub')}</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-slate-600 hidden sm:inline">
                  {t('showLogoOnBill')}
                </span>
                <button
                  type="button"
                  onClick={() => setShowLogoOnBill(!showLogoOnBill)}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    showLogoOnBill ? 'bg-amber-500' : 'bg-slate-300'
                  }`}
                  title={t('showLogoOnBill')}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                      showLogoOnBill ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between text-[11px] bg-slate-50 px-3 py-2 rounded-xl">
              <span className="font-semibold text-slate-700">{t('showLogoOnBill')}</span>
              <span
                className={`font-black uppercase text-[10px] px-2 py-0.5 rounded-full ${
                  showLogoOnBill ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'
                }`}
              >
                {showLogoOnBill ? t('darkModeOn') : t('darkModeOff')}
              </span>
            </div>

            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) processLogoFile(file);
                e.target.value = '';
              }}
            />
            <input
              type="file"
              ref={cameraInputRef}
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) processLogoFile(file);
                e.target.value = '';
              }}
            />

            {Boolean(logoUrl || logoDesign) ? (
              <div className="space-y-3">
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="h-14 w-14 rounded-xl border border-slate-200 bg-white p-1 flex items-center justify-center overflow-hidden shrink-0 shadow-xs">
                      <ShopLogo
                        shopInfo={{
                          ...shopInfo,
                          name: name || shopInfo.name,
                          logoUrl,
                          logoDesign,
                          showLogoOnBill: true,
                        }}
                        size={52}
                        forceShow={true}
                      />
                    </div>
                    <div>
                      <p className="text-xs font-black text-slate-800">{t('currentLogo')}</p>
                      <p className="text-[10px] text-emerald-600 font-bold flex items-center gap-1 mt-0.5">
                        <Check className="h-3 w-3" /> {t('logoSavedToast')}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setLogoUrl('');
                      setLogoDesign(undefined);
                    }}
                    className="p-2 text-rose-600 hover:bg-rose-50 rounded-xl transition cursor-pointer flex items-center gap-1 text-xs font-bold"
                    title={t('removeLogo')}
                  >
                    <Trash2 className="h-4 w-4" />
                    <span className="hidden sm:inline">{t('removeLogo')}</span>
                  </button>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="py-2 px-2.5 rounded-xl border border-slate-200 hover:border-amber-400 bg-white text-slate-700 hover:text-slate-900 font-bold text-[11px] flex items-center justify-center gap-1.5 transition active:scale-95 cursor-pointer shadow-2xs"
                  >
                    <Image className="h-3.5 w-3.5 text-blue-500" />
                    <span className="truncate">{t('uploadFromGallery')}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => cameraInputRef.current?.click()}
                    className="py-2 px-2.5 rounded-xl border border-slate-200 hover:border-amber-400 bg-white text-slate-700 hover:text-slate-900 font-bold text-[11px] flex items-center justify-center gap-1.5 transition active:scale-95 cursor-pointer shadow-2xs"
                  >
                    <Camera className="h-3.5 w-3.5 text-emerald-500" />
                    <span className="truncate">{t('takePhoto')}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsSmartLogoOpen(true)}
                    className="py-2 px-2.5 rounded-xl bg-amber-50 border border-amber-300 hover:bg-amber-100 text-amber-900 font-bold text-[11px] flex items-center justify-center gap-1.5 transition active:scale-95 cursor-pointer shadow-2xs"
                  >
                    <Sparkles className="h-3.5 w-3.5 text-amber-600" />
                    <span className="truncate">{t('smartLogoMaker')}</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="p-3 bg-slate-50 border border-dashed border-slate-300 rounded-xl text-center">
                  <p className="text-xs font-semibold text-slate-600">{t('noLogoSet')}</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">{t('showLogoOnBillSub')}</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="p-3 rounded-xl border border-slate-200 hover:border-blue-400 bg-white hover:bg-blue-50/30 text-left transition active:scale-95 cursor-pointer flex sm:flex-col items-center sm:items-start gap-2.5 shadow-2xs"
                  >
                    <div className="h-8 w-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                      <Image className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-xs font-black text-slate-900">{t('uploadFromGallery')}</p>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => cameraInputRef.current?.click()}
                    className="p-3 rounded-xl border border-slate-200 hover:border-emerald-400 bg-white hover:bg-emerald-50/30 text-left transition active:scale-95 cursor-pointer flex sm:flex-col items-center sm:items-start gap-2.5 shadow-2xs"
                  >
                    <div className="h-8 w-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                      <Camera className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-xs font-black text-slate-900">{t('takePhoto')}</p>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsSmartLogoOpen(true)}
                    className="p-3 rounded-xl border-2 border-amber-400 bg-linear-to-br from-amber-50 to-orange-50 hover:from-amber-100 hover:to-orange-100 text-left transition active:scale-95 cursor-pointer flex sm:flex-col items-center sm:items-start gap-2.5 shadow-xs"
                  >
                    <div className="h-8 w-8 rounded-lg bg-amber-500 text-slate-950 flex items-center justify-center shrink-0 shadow-2xs">
                      <Sparkles className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-1">
                        <p className="text-xs font-black text-slate-900">{t('smartLogoMaker')}</p>
                        <span className="text-[9px] bg-amber-200 text-amber-900 px-1 py-0.2 rounded font-black">
                          {t('freeBadge')}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-600">{t('smartLogoMakerSub')}</p>
                    </div>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* LANGUAGE SELECTOR IN SETTINGS */}
          <div className="bg-white text-slate-900 p-3.5 rounded-2xl border border-amber-300 shadow-xs">
            <LanguageSelector variant="full" />
          </div>

          {/* APP GUIDE */}
          {onOpenGuide && (
            <div className="bg-slate-900 rounded-2xl p-3 sm:p-3.5 border border-slate-800 text-white flex items-center justify-between gap-3 shadow-xs">
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold text-sm">
                  📖
                </div>
                <div>
                  <h5 className="text-xs font-black">{t('appGuideTitle')}</h5>
                  <p className="text-[10px] text-slate-400">{t('appGuideSub')}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenGuide();
                }}
                className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs transition active:scale-95 cursor-pointer shrink-0"
              >
                {t('showGuideAgainBtn')}
              </button>
            </div>
          )}

          {/* BASIC SHOP DETAILS CARD (Pure white card with explicit white inputs) */}
          <div className="rounded-2xl bg-white text-slate-900 border border-slate-200 p-4 space-y-3 shadow-xs">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                {t('shopNameLabel')}
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t('shopNamePlaceholder')}
                className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm font-bold text-slate-900 focus:border-amber-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1 flex items-center gap-1">
                <MapPin className="h-3 w-3 text-red-500" />
                {t('shopAddressLabel')}
              </label>
              <textarea
                rows={2}
                required
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder={t('shopAddressPlaceholder')}
                className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs font-medium text-slate-900 focus:border-amber-500 outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1 flex items-center gap-1">
                  <Phone className="h-3 w-3 text-emerald-600" />
                  {t('mobile')}
                </label>
                <input
                  type="tel"
                  required
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value)}
                  placeholder={t('shopMobilePlaceholder')}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm font-bold font-mono text-slate-900 focus:border-amber-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                  {t('alternateMobileLabel')}
                </label>
                <input
                  type="tel"
                  value={alternateMobile}
                  onChange={(e) => setAlternateMobile(e.target.value)}
                  placeholder={t('alternateMobileLabel')}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm font-mono text-slate-900 focus:border-amber-500 outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                  {t('gstinLabel')}
                </label>
                <input
                  type="text"
                  value={gstin}
                  onChange={(e) => setGstin(e.target.value)}
                  placeholder={t('gstinPlaceholder')}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs font-mono uppercase text-slate-900 focus:border-amber-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                  {t('taglineLabel')}
                </label>
                <input
                  type="text"
                  value={tagline}
                  onChange={(e) => setTagline(e.target.value)}
                  placeholder={t('shopTaglinePlaceholder')}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs text-slate-900 focus:border-amber-500 outline-none"
                />
              </div>
            </div>
          </div>

          {/* ORDER MESSAGE SETTINGS CARD (PART 3) */}
          <div className="rounded-2xl bg-white text-slate-900 p-4 border-2 border-purple-300 space-y-3.5 shadow-xs">
            <div className="flex items-center justify-between pb-2 border-b border-purple-100">
              <div className="flex items-center gap-2">
                <div className="h-7 w-7 rounded-lg bg-purple-600 text-white flex items-center justify-center font-bold shadow-xs">
                  <Send className="h-4 w-4" />
                </div>
                <div>
                  <h4 className="text-xs font-black uppercase tracking-wider text-purple-950">
                    {t('orderMsgSettingsTitle')}
                  </h4>
                  <p className="text-[10px] text-purple-700">{t('orderMsgSettingsSub')}</p>
                </div>
              </div>

              {orderMsgSavedToast && (
                <span className="text-[11px] font-bold text-purple-800 bg-purple-100 px-2 py-0.5 rounded-full flex items-center gap-1">
                  <Check className="h-3 w-3" /> {t('savedToastShort')}
                </span>
              )}
            </div>

            {/* Message Format Type */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1.5">
                {t('orderMsgTypeLabel')}
              </label>
              <div className="grid grid-cols-3 gap-1.5">
                {(['text', 'image', 'both'] as OrderMessageType[]).map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() =>
                      setOrderMsgSettings((prev) => ({ ...prev, messageType: type }))
                    }
                    className={`py-2 px-2 rounded-xl text-xs font-bold border transition cursor-pointer ${
                      orderMsgSettings.messageType === type
                        ? 'bg-purple-600 text-white border-purple-600 shadow-xs'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {type === 'text'
                      ? t('orderMsgTypeText')
                      : type === 'image'
                      ? t('orderMsgTypeImage')
                      : t('orderMsgTypeBoth')}
                  </button>
                ))}
              </div>
            </div>

            {/* Message Language */}
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-[11px] font-bold text-slate-700">
                {t('orderMsgLangLabel')}:
              </span>
              <div className="flex gap-1 bg-slate-50 p-1 rounded-xl border border-purple-200">
                {(['english', 'hindi', 'hinglish'] as Language[]).map((lang) => (
                  <button
                    key={lang}
                    type="button"
                    onClick={() =>
                      setOrderMsgSettings((prev) => ({ ...prev, messageLanguage: lang }))
                    }
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                      orderMsgSettings.messageLanguage === lang
                        ? 'bg-purple-600 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-white'
                    }`}
                  >
                    {lang === 'hindi' ? 'हिंदी' : lang === 'hinglish' ? 'Hinglish' : 'English'}
                  </button>
                ))}
              </div>
            </div>

            {/* Show Logo & Show Mobile toggles */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <label className="flex items-center justify-between gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 cursor-pointer">
                <span className="text-[11px] font-bold text-slate-800">
                  {t('orderMsgShowLogo')}
                </span>
                <input
                  type="checkbox"
                  checked={orderMsgSettings.showLogo}
                  onChange={(e) =>
                    setOrderMsgSettings((prev) => ({ ...prev, showLogo: e.target.checked }))
                  }
                  className="h-4 w-4 accent-purple-600 rounded cursor-pointer"
                />
              </label>

              <label className="flex items-center justify-between gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 cursor-pointer">
                <span className="text-[11px] font-bold text-slate-800">
                  {t('orderMsgShowMobile')}
                </span>
                <input
                  type="checkbox"
                  checked={orderMsgSettings.showMobile}
                  onChange={(e) =>
                    setOrderMsgSettings((prev) => ({ ...prev, showMobile: e.target.checked }))
                  }
                  className="h-4 w-4 accent-purple-600 rounded cursor-pointer"
                />
              </label>
            </div>

            <div className="flex justify-end pt-1">
              <button
                type="button"
                onClick={handleSaveOrderMessageSettings}
                className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-black transition active:scale-95 cursor-pointer shadow-sm"
              >
                <Check className="h-3.5 w-3.5" />
                <span>{t('save')}</span>
              </button>
            </div>
          </div>

          {/* MY UPI & BANK DETAILS SECTION */}
          <div className="rounded-2xl bg-white text-slate-900 p-4 border border-amber-300 space-y-3.5 shadow-xs">
            <div className="flex items-center justify-between pb-2 border-b border-amber-100">
              <div className="flex items-center gap-2">
                <div className="h-7 w-7 rounded-lg bg-amber-500 text-slate-950 flex items-center justify-center font-bold">
                  <QrCode className="h-4 w-4" />
                </div>
                <div>
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-900">
                    {t('upiBankDetailsTitle')}
                  </h4>
                  <p className="text-[10px] text-slate-500">{t('upiBankDetailsSub')}</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowUpiQrOnBill(!showUpiQrOnBill)}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black transition shadow-xs cursor-pointer ${
                  showUpiQrOnBill
                    ? 'bg-emerald-600 text-white ring-2 ring-emerald-300'
                    : 'bg-slate-200 text-slate-600 hover:bg-slate-300'
                }`}
              >
                <span>{showUpiQrOnBill ? t('darkModeOn') : t('darkModeOff')}</span>
                <span className="text-[10px] font-bold">
                  {showUpiQrOnBill ? t('upiQrToggleOn') : t('upiQrToggleOff')}
                </span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  {t('upiIdLabel')} <span className="text-amber-700">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-xs font-bold text-slate-400">@</span>
                  <input
                    type="text"
                    value={upiId}
                    onChange={(e) => setUpiId(e.target.value)}
                    placeholder={t('upiIdSub')}
                    className="w-full rounded-xl border border-slate-300 bg-white pl-8 pr-3 py-2 text-xs font-bold font-mono text-slate-900 focus:border-amber-500 outline-none"
                  />
                </div>
                <p className="text-[10px] text-slate-400 mt-0.5">{t('upiIdSub')}</p>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  {t('payeeNameLabel')}
                </label>
                <input
                  type="text"
                  value={payeeName}
                  onChange={(e) => setPayeeName(e.target.value)}
                  placeholder={t('payeeNamePlaceholder')}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-900 focus:border-amber-500 outline-none"
                />
                <p className="text-[10px] text-slate-400 mt-0.5">{t('payeeNameSub')}</p>
              </div>
            </div>

            <div className="pt-2 border-t border-amber-100">
              <span className="text-[11px] font-bold text-slate-700 block mb-1.5 flex items-center gap-1">
                <CreditCard className="h-3 w-3 text-slate-500" />
                {t('optionalBankDetailsLabel')}
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <input
                  type="text"
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  placeholder={t('bankNamePlaceholder')}
                  className="w-full rounded-xl border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-900 focus:border-amber-500 outline-none"
                />
                <input
                  type="text"
                  value={accountNumber}
                  onChange={(e) => setAccountNumber(e.target.value)}
                  placeholder={t('accountNoPlaceholder')}
                  className="w-full rounded-xl border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-mono text-slate-900 focus:border-amber-500 outline-none"
                />
                <input
                  type="text"
                  value={ifscCode}
                  onChange={(e) => setIfscCode(e.target.value)}
                  placeholder={t('ifscPlaceholder')}
                  className="w-full rounded-xl border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-mono uppercase text-slate-900 focus:border-amber-500 outline-none"
                />
              </div>
            </div>

            <div className="bg-amber-50 p-2 rounded-xl text-[10px] text-amber-950 font-medium flex items-center gap-1.5">
              <span>⚡</span>
              <span>{t('smartUpiNotice')}</span>
            </div>
          </div>

          {/* UDHAR REMINDER MESSAGE CUSTOMIZATION */}
          <div className="rounded-2xl bg-white text-slate-900 p-4 border-2 border-emerald-300 space-y-3.5 shadow-xs">
            <div className="flex items-center justify-between pb-2 border-b border-emerald-100">
              <div className="flex items-center gap-2">
                <div className="h-7 w-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold shadow-xs">
                  <MessageSquare className="h-4 w-4" />
                </div>
                <div>
                  <h4 className="text-xs font-black uppercase tracking-wider text-emerald-950">
                    {t('udharReminderSectionTitle')}
                  </h4>
                  <p className="text-[10px] text-emerald-800">{t('udharReminderSectionSub')}</p>
                </div>
              </div>

              {udharMessageSavedToast && (
                <span className="text-[11px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full flex items-center gap-1">
                  <Check className="h-3 w-3" /> {t('savedToastShort')}
                </span>
              )}
            </div>

            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] font-bold text-slate-600">
                {t('selectLanguageLabel')}
              </span>
              <div className="flex gap-1 bg-slate-50 p-1 rounded-xl border border-emerald-200">
                {(['english', 'hindi', 'hinglish'] as Language[]).map((lang) => (
                  <button
                    key={lang}
                    type="button"
                    onClick={() => setTemplateLang(lang)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                      templateLang === lang
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-white'
                    }`}
                  >
                    {lang === 'hindi' ? 'हिंदी' : lang === 'hinglish' ? 'Hinglish' : 'English'}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1.5">
                {t('clickToInsertTag')}
              </label>
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => handleInsertPlaceholder('{name}')}
                  className="px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-300 text-xs font-black shadow-xs transition active:scale-95 cursor-pointer flex items-center gap-1"
                >
                  <Plus className="h-3 w-3 text-emerald-600" />
                  <span>[{t('tagCustomerName')}]</span>
                  <span className="text-[10px] font-mono text-emerald-600 font-normal">
                    {'{name}'}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => handleInsertPlaceholder('{amount}')}
                  className="px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-300 text-xs font-black shadow-xs transition active:scale-95 cursor-pointer flex items-center gap-1"
                >
                  <Plus className="h-3 w-3 text-emerald-600" />
                  <span>[{t('tagPendingAmount')}]</span>
                  <span className="text-[10px] font-mono text-emerald-600 font-normal">
                    {'{amount}'}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => handleInsertPlaceholder('{shop}')}
                  className="px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-300 text-xs font-black shadow-xs transition active:scale-95 cursor-pointer flex items-center gap-1"
                >
                  <Plus className="h-3 w-3 text-emerald-600" />
                  <span>[{t('tagShopName')}]</span>
                  <span className="text-[10px] font-mono text-emerald-600 font-normal">
                    {'{shop}'}
                  </span>
                </button>
              </div>
            </div>

            <textarea
              ref={textareaRef}
              rows={3}
              value={udharTemplates[templateLang] ?? DEFAULT_UDHAR_TEMPLATES[templateLang]}
              onChange={(e) => {
                const val = e.target.value;
                setUdharTemplates((prev) => ({
                  ...prev,
                  [templateLang]: val,
                }));
              }}
              placeholder={t('udharCustomMsgPlaceholder')}
              className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-xs sm:text-sm font-medium text-slate-900 focus:border-emerald-500 outline-none shadow-xs leading-relaxed"
            />

            <div className="rounded-xl bg-slate-50 p-3 border border-emerald-200 space-y-1">
              <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-emerald-800">
                <Eye className="h-3.5 w-3.5 text-emerald-600" />
                <span>{t('livePreviewUdharMsg')}</span>
              </div>
              <p className="text-xs text-slate-800 bg-white p-2.5 rounded-lg border border-emerald-100 leading-relaxed font-medium whitespace-pre-wrap">
                {samplePreviewMessage}
              </p>
            </div>

            <div className="flex items-center justify-between gap-2 pt-1">
              <button
                type="button"
                onClick={handleResetDefaultTemplate}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 text-xs font-bold transition active:scale-95 cursor-pointer shadow-xs"
              >
                <RotateCcw className="h-3.5 w-3.5 text-slate-500" />
                <span>{t('restoreDefaultMsgBtn')}</span>
              </button>

              <button
                type="button"
                onClick={handleSaveUdharTemplates}
                className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black transition active:scale-95 cursor-pointer shadow-sm"
              >
                <Check className="h-3.5 w-3.5" />
                <span>{t('saveMsgBtn')}</span>
              </button>
            </div>
          </div>

          {/* BILL FOOTER MESSAGE SECTION */}
          <div className="rounded-2xl bg-white text-slate-900 p-4 border-2 border-amber-300 space-y-3.5 shadow-xs">
            <div className="flex items-center justify-between pb-2 border-b border-amber-100">
              <div className="flex items-center gap-2">
                <div className="h-7 w-7 rounded-lg bg-amber-500 text-slate-950 flex items-center justify-center font-bold shadow-xs">
                  <FileText className="h-4 w-4" />
                </div>
                <div>
                  <h4 className="text-xs font-black uppercase tracking-wider text-amber-950">
                    {t('billFooterSectionTitle')}
                  </h4>
                  <p className="text-[10px] text-amber-800">{t('billFooterSectionSub')}</p>
                </div>
              </div>

              {footerSavedToast && (
                <span className="text-[11px] font-bold text-amber-900 bg-amber-100 px-2 py-0.5 rounded-full flex items-center gap-1">
                  <Check className="h-3 w-3" /> {t('savedToastShort')}
                </span>
              )}
            </div>

            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] font-bold text-slate-600">
                {t('selectLanguageLabel')}
              </span>
              <div className="flex gap-1 bg-slate-50 p-1 rounded-xl border border-amber-200">
                {(['english', 'hindi', 'hinglish'] as Language[]).map((lang) => (
                  <button
                    key={lang}
                    type="button"
                    onClick={() => setFooterLang(lang)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                      footerLang === lang
                        ? 'bg-amber-500 text-slate-950 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-white'
                    }`}
                  >
                    {lang === 'hindi' ? 'हिंदी' : lang === 'hinglish' ? 'Hinglish' : 'English'}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1.5">
                {t('clickToInsertTag')}
              </label>
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => handleInsertFooterPlaceholder('{shop}')}
                  className="px-2.5 py-1 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-950 border border-amber-300 text-xs font-black shadow-xs transition active:scale-95 cursor-pointer flex items-center gap-1"
                >
                  <Plus className="h-3 w-3 text-amber-600" />
                  <span>[{t('tagShopName')}]</span>
                  <span className="text-[10px] font-mono text-amber-600 font-normal">
                    {'{shop}'}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => handleInsertFooterPlaceholder('{name}')}
                  className="px-2.5 py-1 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-950 border border-amber-300 text-xs font-black shadow-xs transition active:scale-95 cursor-pointer flex items-center gap-1"
                >
                  <Plus className="h-3 w-3 text-amber-600" />
                  <span>[{t('tagCustomerName')}]</span>
                  <span className="text-[10px] font-mono text-amber-600 font-normal">
                    {'{name}'}
                  </span>
                </button>
              </div>
            </div>

            <textarea
              ref={footerTextareaRef}
              rows={3}
              value={billFooterTemplates[footerLang] ?? DEFAULT_BILL_FOOTER_TEMPLATES[footerLang]}
              onChange={(e) => {
                const val = e.target.value;
                setBillFooterTemplates((prev) => ({
                  ...prev,
                  [footerLang]: val,
                }));
              }}
              placeholder={t('billFooterPlaceholder')}
              className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-xs sm:text-sm font-medium text-slate-900 focus:border-amber-500 outline-none shadow-xs leading-relaxed"
            />

            <div className="rounded-xl bg-slate-50 p-3 border border-amber-200 space-y-1">
              <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-amber-900">
                <Eye className="h-3.5 w-3.5 text-amber-600" />
                <span>{t('livePreviewBillFooter')}</span>
              </div>
              <p className="text-xs text-slate-800 bg-white p-2.5 rounded-lg border border-amber-100 leading-relaxed font-bold text-center whitespace-pre-wrap">
                🙏 {sampleFooterPreview}
              </p>
            </div>

            <div className="flex items-center justify-between gap-2 pt-1">
              <button
                type="button"
                onClick={handleResetDefaultFooterTemplate}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 text-xs font-bold transition active:scale-95 cursor-pointer shadow-xs"
              >
                <RotateCcw className="h-3.5 w-3.5 text-slate-500" />
                <span>{t('restoreDefaultMsgBtn')}</span>
              </button>

              <button
                type="button"
                onClick={handleSaveFooterTemplates}
                className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black transition active:scale-95 cursor-pointer shadow-sm"
              >
                <Check className="h-3.5 w-3.5" />
                <span>{t('saveMsgBtn')}</span>
              </button>
            </div>
          </div>

          {/* BILL NUMBER FORMAT SECTION */}
          <div className="rounded-2xl bg-white text-slate-900 p-4 border-2 border-blue-300 space-y-3.5 shadow-xs">
            <div className="flex items-center justify-between pb-2 border-b border-blue-100">
              <div className="flex items-center gap-2">
                <div className="h-7 w-7 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold shadow-xs">
                  <Hash className="h-4 w-4" />
                </div>
                <div>
                  <h4 className="text-xs font-black uppercase tracking-wider text-blue-950">
                    {t('billNumberFormatSectionTitle')}
                  </h4>
                  <p className="text-[10px] text-blue-800">{t('billNumberFormatSectionSub')}</p>
                </div>
              </div>

              {billFormatSavedToast && (
                <span className="text-[11px] font-bold text-blue-800 bg-blue-100 px-2 py-0.5 rounded-full flex items-center gap-1">
                  <Check className="h-3 w-3" /> {t('savedToastShort')}
                </span>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                {t('prefixInputLabel')}
              </label>
              <input
                type="text"
                value={billPrefix}
                onChange={(e) => setBillPrefix(e.target.value.toUpperCase())}
                placeholder={t('prefixInputPlaceholder')}
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-bold font-mono uppercase text-slate-900 focus:border-blue-500 outline-none"
              />
              <p className="text-[10px] text-slate-400 mt-0.5">{t('prefixOptionalHint')}</p>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                {t('yearFormatOptionLabel')}
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setBillYearFormat('full')}
                  className={`p-2 rounded-xl text-xs font-bold transition cursor-pointer text-left border ${
                    billYearFormat === 'full'
                      ? 'bg-blue-600 text-white border-blue-600 shadow-xs ring-1 ring-blue-400'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <div className="font-black">a) {currentYear}</div>
                  <div
                    className={`text-[10px] ${
                      billYearFormat === 'full' ? 'text-blue-100' : 'text-slate-500'
                    }`}
                  >
                    {t('fullYearLabel')}
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setBillYearFormat('short')}
                  className={`p-2 rounded-xl text-xs font-bold transition cursor-pointer text-left border ${
                    billYearFormat === 'short'
                      ? 'bg-blue-600 text-white border-blue-600 shadow-xs ring-1 ring-blue-400'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <div className="font-black">b) {currentShortYear}</div>
                  <div
                    className={`text-[10px] ${
                      billYearFormat === 'short' ? 'text-blue-100' : 'text-slate-500'
                    }`}
                  >
                    {t('shortYearLabel')}
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setBillYearFormat('fy')}
                  className={`p-2 rounded-xl text-xs font-bold transition cursor-pointer text-left border ${
                    billYearFormat === 'fy'
                      ? 'bg-blue-600 text-white border-blue-600 shadow-xs ring-1 ring-blue-400'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <div className="font-black">c) {currentFy}</div>
                  <div
                    className={`text-[10px] ${
                      billYearFormat === 'fy' ? 'text-blue-100' : 'text-slate-500'
                    }`}
                  >
                    {t('fyYearLabel')}
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setBillYearFormat('none')}
                  className={`p-2 rounded-xl text-xs font-bold transition cursor-pointer text-left border ${
                    billYearFormat === 'none'
                      ? 'bg-blue-600 text-white border-blue-600 shadow-xs ring-1 ring-blue-400'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <div className="font-black">d) {t('noYearLabel')}</div>
                  <div
                    className={`text-[10px] ${
                      billYearFormat === 'none' ? 'text-blue-100' : 'text-slate-500'
                    }`}
                  >
                    {t('noYearLabel')}
                  </div>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  {t('startingNumberInputLabel')}
                </label>
                <input
                  type="number"
                  min="1"
                  value={billStartNum}
                  onChange={(e) => setBillStartNum(Math.max(1, parseInt(e.target.value, 10) || 1))}
                  placeholder={t('startingNumberPlaceholder')}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-bold font-mono text-slate-900 focus:border-blue-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  {t('numberLengthInputLabel')}
                </label>
                <select
                  value={billDigitLength}
                  onChange={(e) => setBillDigitLength(Number(e.target.value))}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-bold font-mono text-slate-900 focus:border-blue-500 outline-none cursor-pointer"
                >
                  <option value={1}>{t('digitsOption', { count: 1 })} (1, 2, 3)</option>
                  <option value={2}>{t('digitsOptionPlural', { count: 2 })} (01, 02)</option>
                  <option value={3}>{t('digitsOptionPlural', { count: 3 })} (001, 002)</option>
                  <option value={4}>{t('digitsOptionPlural', { count: 4 })} (0001, 0002)</option>
                </select>
              </div>
            </div>

            <div className="rounded-xl bg-slate-50 p-3.5 border-2 border-blue-200 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-wider text-blue-900 flex items-center gap-1">
                  <Eye className="h-3.5 w-3.5 text-blue-600" />
                  {t('livePreviewBillNo')}
                </span>
                <span className="text-[10px] font-bold bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">
                  {t('digitLengthFormatPreview')}
                </span>
              </div>
              <div className="text-sm font-black font-mono text-slate-900 bg-white p-2.5 rounded-lg border border-blue-100 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <span className="text-[10px] font-bold text-slate-500 block">
                    {t('firstBillLabel')}
                  </span>
                  <span className="text-blue-950 font-black">{sampleCurrentBill}</span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-bold text-slate-500 block">
                    {t('nextBillLabel')}
                  </span>
                  <span className="text-emerald-700 font-black">{sampleNextBill}</span>
                </div>
              </div>
            </div>

            <div className="bg-blue-50 p-2.5 rounded-xl text-[10px] text-blue-950 font-medium space-y-1">
              <div className="font-bold flex items-center gap-1">
                <span>⚡</span>
                <span>{t('smartRulesHeading')}</span>
              </div>
              <ul className="list-disc pl-4 space-y-0.5 text-slate-700">
                <li>{t('smartRuleItem1')}</li>
                <li>{t('smartRuleItem2')}</li>
                <li>{t('smartRuleItem3')}</li>
              </ul>
            </div>

            <div className="flex justify-end pt-1">
              <button
                type="button"
                onClick={handleSaveBillFormat}
                className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-black transition active:scale-95 cursor-pointer shadow-sm"
              >
                <Check className="h-3.5 w-3.5" />
                <span>{t('saveBillFormatBtn')}</span>
              </button>
            </div>
          </div>

          <button
            type="submit"
            className="w-full rounded-xl bg-amber-500 hover:bg-amber-400 py-3 font-black text-slate-950 text-sm shadow-md transition cursor-pointer"
          >
            {t('saveSettingsBtn')}
          </button>

          {/* BACKUP & RESTORE SECTION */}
          <div className="rounded-2xl bg-white text-slate-900 border border-slate-200 p-4 space-y-3 shadow-xs">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-emerald-600" />
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-800">
                {t('dataSecuritySectionTitle')}
              </h4>
            </div>
            <p className="text-[11px] text-slate-500">{t('dataSecuritySub')}</p>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={exportBackup}
                className="flex items-center justify-center gap-2 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200 p-2.5 text-xs font-bold text-slate-800 transition cursor-pointer"
              >
                <Download className="h-4 w-4 text-emerald-600" />
                <span>{t('backupDownloadBtn')}</span>
              </button>

              <label className="flex items-center justify-center gap-2 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200 p-2.5 text-xs font-bold text-slate-800 cursor-pointer transition">
                <Upload className="h-4 w-4 text-blue-600" />
                <span>{t('restoreBackupBtn')}</span>
                <input
                  type="file"
                  accept=".json"
                  onChange={handleFileImport}
                  className="hidden"
                />
              </label>
            </div>

            <div className="pt-1 text-center">
              <button
                type="button"
                onClick={() => {
                  if (confirm(t('resetDemoDataConfirm'))) {
                    resetToDefault();
                    onClose();
                  }
                }}
                className="text-[11px] text-slate-500 hover:text-slate-700 underline font-medium cursor-pointer"
              >
                {t('resetDemoDataBtn')}
              </button>
            </div>
          </div>

          {/* DANGER ZONE */}
          <div className="rounded-2xl bg-rose-50 text-slate-900 border-2 border-rose-300 p-4 space-y-2">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-rose-600 shrink-0" />
              <div>
                <h4 className="text-xs font-black uppercase tracking-wider text-rose-900">
                  {t('dangerZoneTitle')}
                </h4>
                <p className="text-[11px] text-rose-700 leading-snug">{t('dangerZoneSub')}</p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsResetModalOpen(true)}
              className="w-full rounded-xl bg-rose-600 hover:bg-rose-700 text-white py-3 px-4 text-xs font-black shadow-md flex items-center justify-center gap-2 transition active:scale-95 cursor-pointer"
            >
              <Trash2 className="h-4 w-4" />
              <span>{t('appResetBtn')}</span>
            </button>
          </div>

          <div className="h-28 sm:h-0 w-full shrink-0 pointer-events-none" aria-hidden="true" />
        </form>
      </div>

      {/* 2-Step Confirmation App Reset Modal */}
      <AppResetModal
        isOpen={isResetModalOpen}
        onClose={() => setIsResetModalOpen(false)}
        onResetSuccess={() => {
          setIsResetModalOpen(false);
          onClose();
        }}
      />

      {/* Smart Logo Maker Modal */}
      <SmartLogoMakerModal
        isOpen={isSmartLogoOpen}
        onClose={() => setIsSmartLogoOpen(false)}
        initialShopName={name.trim() || shopInfo.name || ''}
        onSaveLogo={(generatedDataUrl, designObj) => {
          setLogoUrl(generatedDataUrl);
          if (designObj) {
            setLogoDesign(designObj);
          }
          setIsSmartLogoOpen(false);
        }}
      />
    </div>
  );
};
