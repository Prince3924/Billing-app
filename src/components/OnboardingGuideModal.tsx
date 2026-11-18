import React, { useState } from 'react';
import {
  Zap, Settings, PackagePlus, ShoppingCart, AlertTriangle,
  TrendingUp, ArrowRight, ArrowLeft, Sparkles, X, Globe
} from 'lucide-react';
import { useShop } from '../context/ShopContext';
import { Language } from '../types';

interface OnboardingGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const OnboardingGuideModal: React.FC<OnboardingGuideModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { setLanguage, t } = useShop();
  const [currentStep, setCurrentStep] = useState<number>(0);

  if (!isOpen) return null;

  const totalSteps = 6;

  const handleFinishOrSkip = () => {
    try {
      localStorage.setItem('yk_onboarding_done', 'true');
    } catch (e) {
      console.warn('Could not save onboarding state', e);
    }
    onClose();
  };

  const handleSelectLanguage = (selectedLang: Language) => {
    setLanguage(selectedLang);
    setCurrentStep(1);
  };

  const handleNext = () => {
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    } else {
      handleFinishOrSkip();
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    } else if (currentStep === 1) {
      setCurrentStep(0);
    }
  };

  const stepsData = [
    {
      step: 1,
      name: t('onboardingStep1Name'),
      tag: t('onboardingStep1Tag'),
      icon: <Zap className="h-8 w-8 text-amber-400 fill-amber-400" />,
      heading: t('onboardingStep1Title'),
      text: t('onboardingStep1Desc'),
      subtext: t('onboardingStep1Sub'),
      accent: 'from-amber-500/20 to-orange-500/20 border-amber-500/40 text-amber-400',
    },
    {
      step: 2,
      name: t('onboardingStep2Name'),
      tag: t('onboardingStep2Tag'),
      icon: <Settings className="h-8 w-8 text-blue-400" />,
      heading: t('onboardingStep2Title'),
      text: t('onboardingStep2Desc'),
      subtext: t('onboardingStep2Sub'),
      accent: 'from-blue-500/20 to-indigo-500/20 border-blue-500/40 text-blue-400',
    },
    {
      step: 3,
      name: t('onboardingStep3Name'),
      tag: t('onboardingStep3Tag'),
      icon: <PackagePlus className="h-8 w-8 text-emerald-400" />,
      heading: t('onboardingStep3Title'),
      text: t('onboardingStep3Desc'),
      subtext: t('onboardingStep3Sub'),
      accent: 'from-emerald-500/20 to-teal-500/20 border-emerald-500/40 text-emerald-400',
    },
    {
      step: 4,
      name: t('onboardingStep4Name'),
      tag: t('onboardingStep4Tag'),
      icon: <ShoppingCart className="h-8 w-8 text-amber-400" />,
      heading: t('onboardingStep4Title'),
      text: t('onboardingStep4Desc'),
      subtext: t('onboardingStep4Sub'),
      accent: 'from-amber-500/20 to-yellow-500/20 border-amber-500/40 text-amber-400',
    },
    {
      step: 5,
      name: t('onboardingStep5Name'),
      tag: t('onboardingStep5Tag'),
      icon: <AlertTriangle className="h-8 w-8 text-rose-400" />,
      heading: t('onboardingStep5Title'),
      text: t('onboardingStep5Desc'),
      subtext: t('onboardingStep5Sub'),
      accent: 'from-rose-500/20 to-red-500/20 border-rose-500/40 text-rose-400',
    },
    {
      step: 6,
      name: t('onboardingStep6Name'),
      tag: t('onboardingStep6Tag'),
      icon: <TrendingUp className="h-8 w-8 text-purple-400" />,
      heading: t('onboardingStep6Title'),
      text: t('onboardingStep6Desc'),
      subtext: t('onboardingStep6Sub'),
      accent: 'from-purple-500/20 to-indigo-500/20 border-purple-500/40 text-purple-400',
    },
  ];

  const current = currentStep > 0 ? stepsData[currentStep - 1] : null;

  return (
    <div className="fixed inset-0 z-70 overflow-y-auto bg-black/85 p-3 sm:p-5 backdrop-blur-md flex justify-center items-center">
      <div className="relative w-full max-w-lg rounded-3xl bg-slate-900 border-2 border-amber-500/50 shadow-2xl text-white overflow-hidden my-auto">
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-44 h-44 rounded-full bg-amber-500/10 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 -mb-10 -ml-10 w-44 h-44 rounded-full bg-blue-500/10 blur-3xl pointer-events-none" />

        {currentStep === 0 ? (
          <div className="p-6 sm:p-7 space-y-6">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Globe className="h-5 w-5 text-amber-400" />
                <span className="text-xs font-black uppercase tracking-wider text-amber-400">
                  {t('onboardingLangHeader')}
                </span>
              </div>
              <button
                type="button"
                onClick={handleFinishOrSkip}
                className="flex items-center gap-1 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white px-3 py-1 text-xs font-bold transition cursor-pointer border border-slate-700"
              >
                <span>{t('onboardingSkipBtn')}</span>
                <X className="h-3.5 w-3.5" />
              </button>
            </div>

            <div className="text-center space-y-2">
              <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                {t('onboardingChooseLangTitle')}
              </h2>
              <p className="text-xs sm:text-sm text-slate-400 font-medium">
                {t('onboardingChooseLangSub')}
              </p>
            </div>

            <div className="space-y-3 pt-2">
              <button
                type="button"
                onClick={() => handleSelectLanguage('english')}
                className="w-full rounded-2xl bg-slate-800/90 hover:bg-amber-500 hover:text-slate-950 border-2 border-slate-700 hover:border-amber-400 p-4 transition-all duration-200 flex items-center justify-between group cursor-pointer text-left shadow-md active:scale-98"
              >
                <div className="flex items-center gap-3.5">
                  <span className="text-2xl">🇬🇧</span>
                  <div>
                    <h4 className="font-black text-base group-hover:text-slate-950">English</h4>
                    <p className="text-xs text-slate-400 group-hover:text-slate-900">
                      {t('onboardingLangEnDesc')}
                    </p>
                  </div>
                </div>
                <ArrowRight className="h-5 w-5 text-slate-400 group-hover:text-slate-950 transition-transform group-hover:translate-x-1" />
              </button>

              <button
                type="button"
                onClick={() => handleSelectLanguage('hindi')}
                className="w-full rounded-2xl bg-slate-800/90 hover:bg-amber-500 hover:text-slate-950 border-2 border-slate-700 hover:border-amber-400 p-4 transition-all duration-200 flex items-center justify-between group cursor-pointer text-left shadow-md active:scale-98"
              >
                <div className="flex items-center gap-3.5">
                  <span className="text-2xl">🇮🇳</span>
                  <div>
                    <h4 className="font-black text-base group-hover:text-slate-950">हिंदी (Hindi)</h4>
                    <p className="text-xs text-slate-400 group-hover:text-slate-900">
                      {t('onboardingLangHiDesc')}
                    </p>
                  </div>
                </div>
                <ArrowRight className="h-5 w-5 text-slate-400 group-hover:text-slate-950 transition-transform group-hover:translate-x-1" />
              </button>

              <button
                type="button"
                onClick={() => handleSelectLanguage('hinglish')}
                className="w-full rounded-2xl bg-slate-800/90 hover:bg-amber-500 hover:text-slate-950 border-2 border-slate-700 hover:border-amber-400 p-4 transition-all duration-200 flex items-center justify-between group cursor-pointer text-left shadow-md active:scale-98"
              >
                <div className="flex items-center gap-3.5">
                  <span className="text-2xl">🇮🇳</span>
                  <div>
                    <h4 className="font-black text-base group-hover:text-slate-950">Hinglish</h4>
                    <p className="text-xs text-slate-400 group-hover:text-slate-900">
                      {t('onboardingLangHingDesc')}
                    </p>
                  </div>
                </div>
                <ArrowRight className="h-5 w-5 text-slate-400 group-hover:text-slate-950 transition-transform group-hover:translate-x-1" />
              </button>
            </div>

            <p className="text-[11px] text-center text-slate-400">
              {t('onboardingFooterNote')}
            </p>
          </div>
        ) : current ? (
          <>
            <div className="px-5 sm:px-6 pt-5 pb-3 flex items-center justify-between border-b border-slate-800">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-black uppercase tracking-wider bg-amber-500 text-slate-950 px-2.5 py-0.5 rounded-full">
                  {current.tag}
                </span>
                <span className="text-xs text-slate-400 font-mono">
                  ({currentStep}/{totalSteps})
                </span>
              </div>

              <button
                type="button"
                onClick={handleFinishOrSkip}
                className="flex items-center gap-1 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white px-3 py-1 text-xs font-bold transition active:scale-95 cursor-pointer border border-slate-700"
              >
                <span>{t('onboardingSkipBtn')}</span>
                <X className="h-3.5 w-3.5" />
              </button>
            </div>

            <div className="p-6 sm:p-7 space-y-5">
              <div className={`rounded-2xl p-4 bg-linear-to-br ${current.accent} border flex items-center gap-4 shadow-inner`}>
                <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-slate-950/80 border border-white/10 shadow-lg">
                  {current.icon}
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-slate-300 block">
                    {current.name}
                  </span>
                  <h3 className="text-lg sm:text-xl font-black text-white tracking-tight mt-0.5">
                    {current.heading}
                  </h3>
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-base sm:text-lg font-bold text-slate-100 leading-snug">
                  {current.text}
                </p>
                <p className="text-xs sm:text-sm text-amber-200/90 font-medium leading-relaxed bg-slate-800/60 p-3 rounded-xl border border-slate-700/60">
                  💡 {current.subtext}
                </p>
              </div>

              <div className="flex items-center justify-center gap-2 pt-1">
                {stepsData.map((s) => (
                  <button
                    key={s.step}
                    type="button"
                    onClick={() => setCurrentStep(s.step)}
                    className={`h-2 transition-all rounded-full cursor-pointer ${
                      s.step === currentStep
                        ? 'w-7 bg-amber-500'
                        : s.step < currentStep
                        ? 'w-2 bg-emerald-400/80'
                        : 'w-2 bg-slate-700 hover:bg-slate-600'
                    }`}
                  />
                ))}
              </div>

              <div className="pt-3 border-t border-slate-800 flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={handleBack}
                  className="flex items-center gap-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 px-4 py-3 text-xs sm:text-sm font-bold text-slate-200 transition active:scale-95 cursor-pointer border border-slate-700"
                >
                  <ArrowLeft className="h-4 w-4" />
                  <span>{t('onboardingBackBtn')}</span>
                </button>

                {currentStep < totalSteps ? (
                  <button
                    type="button"
                    onClick={handleNext}
                    className="flex items-center gap-2 rounded-xl bg-amber-500 hover:bg-amber-400 px-5 py-3 text-xs sm:text-sm font-black text-slate-950 shadow-lg transition active:scale-95 cursor-pointer ml-auto"
                  >
                    <span>{t('onboardingNextBtn')}</span>
                    <ArrowRight className="h-4 w-4 stroke-[2.5]" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleFinishOrSkip}
                    className="flex items-center gap-2 rounded-xl bg-linear-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 px-6 py-3.5 text-xs sm:text-sm font-black text-slate-950 shadow-xl transition active:scale-95 cursor-pointer ml-auto"
                  >
                    <Sparkles className="h-4 w-4" />
                    <span>{t('onboardingStartBtn')}</span>
                    <ArrowRight className="h-4 w-4 stroke-[3]" />
                  </button>
                )}
              </div>
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
};
