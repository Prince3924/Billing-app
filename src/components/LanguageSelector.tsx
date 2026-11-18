import React, { useState, useRef, useEffect } from 'react';
import { Globe, Check, ChevronDown } from 'lucide-react';
import { useShop } from '../context/ShopContext';
import { Language } from '../types';

interface LanguageSelectorProps {
  variant?: 'compact' | 'full' | 'dropdown' | 'segmented';
}

export const LanguageSelector: React.FC<LanguageSelectorProps> = ({ variant = 'dropdown' }) => {
  const { language, setLanguage, t } = useShop();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const languages: { id: Language; label: string; sublabel: string; flag: string }[] = [
    { id: 'english', label: 'English', sublabel: t('langSubEnglish'), flag: '🇬🇧' },
    { id: 'hinglish', label: 'Hinglish', sublabel: t('langSubHinglish'), flag: '🇮🇳' },
    { id: 'hindi', label: 'हिंदी', sublabel: t('langSubHindi'), flag: '🇮🇳' },
  ];

  const currentLang = languages.find((l) => l.id === language) || languages[0];

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // FULL CARD VARIANT FOR SETTINGS MODAL
  if (variant === 'full') {
    return (
      <div className="space-y-2">
        <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
          <Globe className="h-4 w-4 text-amber-500" />
          <span>{t('appLanguageTitle')}</span>
        </label>
        <div className="grid grid-cols-3 gap-2">
          {languages.map((l) => {
            const isSelected = language === l.id;
            return (
              <button
                key={l.id}
                type="button"
                onClick={() => setLanguage(l.id)}
                className={`p-3 rounded-xl border text-left transition relative flex flex-col justify-between ${
                  isSelected
                    ? 'border-amber-500 bg-amber-500 text-slate-950 font-black shadow-md ring-2 ring-amber-300'
                    : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-lg">{l.flag}</span>
                  {isSelected && (
                    <span className="h-5 w-5 rounded-full bg-slate-950 text-amber-400 flex items-center justify-center text-xs font-bold">
                      ✓
                    </span>
                  )}
                </div>
                <div className="mt-2">
                  <div className={`font-black text-sm ${isSelected ? 'text-slate-950' : 'text-slate-800'}`}>
                    {l.label}
                  </div>
                  <div className={`text-[10px] mt-0.5 leading-tight ${isSelected ? 'text-slate-900 font-medium' : 'text-slate-500'}`}>
                    {l.sublabel}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  // COMPACT DROPDOWN VARIANT FOR FIXED HEADER
  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 px-2.5 py-1.5 text-xs font-bold text-white shadow-xs transition active:scale-95"
        aria-haspopup="true"
        aria-expanded={isOpen}
      >
        <span className="text-xs">{currentLang.flag}</span>
        <span className="text-xs font-bold text-amber-300">{currentLang.label}</span>
        <ChevronDown className={`h-3 w-3 text-slate-400 transition-transform ${isOpen ? 'rotate-180 text-amber-400' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute left-0 mt-1.5 w-44 rounded-xl bg-slate-900 border border-slate-700 shadow-2xl p-1 z-50 animate-in fade-in zoom-in-95">
          <div className="px-2 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-800 mb-1">
            {t('languageShortLabel')}
          </div>
          {languages.map((l) => {
            const isSelected = language === l.id;
            return (
              <button
                key={l.id}
                type="button"
                onClick={() => {
                  setLanguage(l.id);
                  setIsOpen(false);
                }}
                className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-semibold transition ${
                  isSelected
                    ? 'bg-amber-500 text-slate-950 font-black'
                    : 'text-slate-200 hover:bg-slate-800'
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <span className="text-xs">{l.flag}</span>
                  <span>{l.label}</span>
                </div>
                {isSelected && <Check className="h-3.5 w-3.5 stroke-[3]" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
