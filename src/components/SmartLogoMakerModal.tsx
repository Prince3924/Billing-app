import React, { useState } from 'react';
import { X, Check, Sparkles, RefreshCw } from 'lucide-react';
import { useShop } from '../context/ShopContext';
import { LogoDesign } from '../types';

export type ShopCategoryType = 'electrical' | 'grocery' | 'mobile' | 'fashion' | 'general';

interface SmartLogoDesign {
  id: string;
  category: ShopCategoryType;
  bgColor: string;
  borderColor: string;
  accentColor: string;
  shape: 'rounded' | 'circle' | 'square' | 'shield' | 'badge';
  iconType: 'bulb' | 'bolt' | 'wire' | 'cart' | 'store' | 'phone' | 'shirt' | 'initials';
  subtitle: string;
}

interface SmartLogoMakerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveLogo: (dataUrl: string, design?: LogoDesign) => void;
  initialShopName?: string;
}

function detectCategory(text: string): ShopCategoryType {
  const lower = text.toLowerCase();

  if (
    lower.includes('bulb') ||
    lower.includes('wire') ||
    lower.includes('bijli') ||
    lower.includes('electric') ||
    lower.includes('light') ||
    lower.includes('fan') ||
    lower.includes('switch') ||
    lower.includes('cable') ||
    lower.includes('motor') ||
    lower.includes('बिजली') ||
    lower.includes('बल्ब') ||
    lower.includes('तार')
  ) {
    return 'electrical';
  }

  if (
    lower.includes('kirana') ||
    lower.includes('ration') ||
    lower.includes('grocery') ||
    lower.includes('store') ||
    lower.includes('supermarket') ||
    lower.includes('masala') ||
    lower.includes('atta') ||
    lower.includes('dal') ||
    lower.includes('oil') ||
    lower.includes('किराना') ||
    lower.includes('राशन')
  ) {
    return 'grocery';
  }

  if (
    lower.includes('mobile') ||
    lower.includes('phone') ||
    lower.includes('repair') ||
    lower.includes('telecom') ||
    lower.includes('recharge') ||
    lower.includes('sim') ||
    lower.includes('computer') ||
    lower.includes('laptop') ||
    lower.includes('मोबाइल') ||
    lower.includes('रिपेयर')
  ) {
    return 'mobile';
  }

  if (
    lower.includes('kapda') ||
    lower.includes('cloth') ||
    lower.includes('fashion') ||
    lower.includes('garment') ||
    lower.includes('dress') ||
    lower.includes('saree') ||
    lower.includes('textile') ||
    lower.includes('tailor') ||
    lower.includes('कपड़ा') ||
    lower.includes('वस्त्र')
  ) {
    return 'fashion';
  }

  return 'general';
}

function generateLogoSets(category: ShopCategoryType, seed: number): SmartLogoDesign[] {
  const configsByCategory: Record<
    ShopCategoryType,
    {
      colors: Array<{ bg: string; border: string; accent: string }>;
      icons: Array<'bulb' | 'bolt' | 'wire' | 'cart' | 'store' | 'phone' | 'shirt' | 'initials'>;
      shapes: Array<'rounded' | 'circle' | 'square' | 'shield' | 'badge'>;
      subtitles: string[];
    }
  > = {
    electrical: {
      colors: [
        { bg: '#ea580c', border: '#f97316', accent: '#ffedd5' },
        { bg: '#2563eb', border: '#3b82f6', accent: '#dbeafe' },
        { bg: '#0f172a', border: '#eab308', accent: '#fef08a' },
        { bg: '#16a34a', border: '#22c55e', accent: '#dcfce7' },
      ],
      icons: ['bolt', 'bulb', 'wire', 'initials'],
      shapes: ['rounded', 'circle', 'badge', 'shield'],
      subtitles: ['ELECTRICALS', 'LIGHTS & POWER', 'ELECTRIC STORE', 'QUALITY & SERVICE'],
    },
    grocery: {
      colors: [
        { bg: '#16a34a', border: '#22c55e', accent: '#dcfce7' },
        { bg: '#ea580c', border: '#f97316', accent: '#ffedd5' },
        { bg: '#0f172a', border: '#38bdf8', accent: '#e0f2fe' },
        { bg: '#7c3aed', border: '#a855f7', accent: '#f3e8ff' },
      ],
      icons: ['cart', 'store', 'cart', 'initials'],
      shapes: ['rounded', 'circle', 'square', 'badge'],
      subtitles: ['KIRANA & GENERAL', 'FRESH & PURE', 'DAILY ESSENTIALS', 'SUPER STORE'],
    },
    mobile: {
      colors: [
        { bg: '#2563eb', border: '#3b82f6', accent: '#dbeafe' },
        { bg: '#0f172a', border: '#06b6d4', accent: '#cffafe' },
        { bg: '#7c3aed', border: '#a855f7', accent: '#f3e8ff' },
        { bg: '#ea580c', border: '#f97316', accent: '#ffedd5' },
      ],
      icons: ['phone', 'bolt', 'store', 'initials'],
      shapes: ['rounded', 'badge', 'shield', 'circle'],
      subtitles: ['MOBILE & REPAIR', 'SMART TECH', 'TELECOM SERVICES', 'QUICK FIX'],
    },
    fashion: {
      colors: [
        { bg: '#be185d', border: '#ec4899', accent: '#fce7f3' },
        { bg: '#0f172a', border: '#fbbf24', accent: '#fef3c7' },
        { bg: '#7c3aed', border: '#a855f7', accent: '#f3e8ff' },
        { bg: '#047857', border: '#10b981', accent: '#d1fae5' },
      ],
      icons: ['shirt', 'store', 'initials', 'shirt'],
      shapes: ['shield', 'circle', 'rounded', 'badge'],
      subtitles: ['FASHION & CLOTHING', 'STYLE & TREND', 'TEXTILES', 'GARMENTS'],
    },
    general: {
      colors: [
        { bg: '#ea580c', border: '#f97316', accent: '#ffedd5' },
        { bg: '#2563eb', border: '#3b82f6', accent: '#dbeafe' },
        { bg: '#0f172a', border: '#eab308', accent: '#fef08a' },
        { bg: '#16a34a', border: '#22c55e', accent: '#dcfce7' },
      ],
      icons: ['store', 'bolt', 'initials', 'store'],
      shapes: ['rounded', 'circle', 'shield', 'square'],
      subtitles: ['ENTERPRISES', 'GENERAL TRADERS', 'RETAIL & WHOLESALE', 'QUALITY STORE'],
    },
  };

  const pool = configsByCategory[category];
  const offset = (seed * 4) % 12;

  return [0, 1, 2, 3].map((i) => {
    const idx = (i + offset) % pool.colors.length;
    const color = pool.colors[idx];
    const shape = pool.shapes[(i + offset) % pool.shapes.length];
    const iconType = pool.icons[(i + offset) % pool.icons.length];
    const subtitle = pool.subtitles[(i + offset) % pool.subtitles.length];

    return {
      id: `logo-${category}-${seed}-${i}`,
      category,
      bgColor: color.bg,
      borderColor: color.border,
      accentColor: color.accent,
      shape,
      iconType,
      subtitle,
    };
  });
}

export const SmartLogoMakerModal: React.FC<SmartLogoMakerModalProps> = ({
  isOpen,
  onClose,
  onSaveLogo,
  initialShopName = '',
}) => {
  const { t } = useShop();

  const [shopNameInput, setShopNameInput] = useState(initialShopName || '');
  const [descriptionInput, setDescriptionInput] = useState('');
  const [seed, setSeed] = useState(0);
  const [selectedIndex, setSelectedIndex] = useState(0);

  if (!isOpen) return null;

  const combinedText = `${shopNameInput} ${descriptionInput}`;
  const detectedCat = detectCategory(combinedText);
  const designs = generateLogoSets(detectedCat, seed);
  const currentDesign = designs[selectedIndex] || designs[0];

  const getCategoryLabel = (cat: ShopCategoryType) => {
    switch (cat) {
      case 'electrical':
        return t('shopTypeElectrical');
      case 'grocery':
        return t('shopTypeGrocery');
      case 'mobile':
        return t('shopTypeMobile');
      case 'fashion':
        return t('shopTypeFashion');
      default:
        return t('shopTypeGeneral');
    }
  };

  const getShapeLabel = (shape: SmartLogoDesign['shape']) => {
    switch (shape) {
      case 'circle':
        return t('shapeCircle');
      case 'square':
        return t('shapeSquare');
      case 'shield':
        return t('shapeShield');
      case 'badge':
        return t('shapeBadge');
      default:
        return t('shapeRounded');
    }
  };

  const effectiveShopName = shopNameInput.trim() || initialShopName.trim() || t('appName');
  const words = effectiveShopName.split(/\s+/).filter(Boolean);
  const initials =
    words.length > 1
      ? (words[0][0] + words[1][0]).toUpperCase()
      : (effectiveShopName.slice(0, 2) || 'ST').toUpperCase();

  const renderIconSvg = (iconType: SmartLogoDesign['iconType'], bg: string, accent: string) => {
    switch (iconType) {
      case 'bulb':
        return `
          <path d="M160 68 C125 68 102 94 102 126 C102 150 118 168 130 184 C136 192 140 202 140 214 L180 214 C180 202 184 192 190 184 C202 168 218 150 218 126 C218 94 195 68 160 68 Z" fill="white"/>
          <rect x="142" y="220" width="36" height="6" rx="3" fill="${accent}"/>
          <rect x="146" y="230" width="28" height="6" rx="3" fill="${accent}"/>
          <circle cx="160" cy="126" r="14" fill="${bg}"/>
        `;
      case 'wire':
        return `
          <path d="M96 108 C96 88 130 78 160 78 C190 78 224 88 224 108 L224 168 C224 198 196 218 160 218 C124 218 96 198 96 168 Z" fill="none" stroke="white" stroke-width="14" stroke-linecap="round"/>
          <circle cx="160" cy="148" r="32" fill="white"/>
          <path d="M142 148 L178 148" stroke="${bg}" stroke-width="8" stroke-linecap="round"/>
          <path d="M160 130 L160 166" stroke="${bg}" stroke-width="8" stroke-linecap="round"/>
        `;
      case 'bolt':
        return `
          <path d="M176 64 L108 172 L154 172 L144 256 L212 148 L166 148 Z" fill="white" stroke="${accent}" stroke-width="3" stroke-linejoin="round"/>
        `;
      case 'cart':
        return `
          <path d="M85 95 L105 95 L125 185 L215 185 L230 120 L115 120" fill="none" stroke="white" stroke-width="12" stroke-linecap="round" stroke-linejoin="round"/>
          <circle cx="135" cy="215" r="14" fill="white"/>
          <circle cx="205" cy="215" r="14" fill="white"/>
        `;
      case 'phone':
        return `
          <rect x="110" y="70" width="100" height="175" rx="20" ry="20" fill="none" stroke="white" stroke-width="12"/>
          <rect x="122" y="90" width="76" height="115" rx="8" ry="8" fill="white" fill-opacity="0.25"/>
          <circle cx="160" cy="225" r="8" fill="white"/>
          <line x1="145" y1="80" x2="175" y2="80" stroke="white" stroke-width="4" stroke-linecap="round"/>
        `;
      case 'shirt':
        return `
          <path d="M110 80 L135 105 C145 115 175 115 185 105 L210 80 L250 115 L225 145 L210 130 L210 240 L110 240 L110 130 L95 145 L70 115 Z" fill="white"/>
          <path d="M160 115 L160 240" stroke="${bg}" stroke-width="6" stroke-dasharray="8 6"/>
        `;
      case 'store':
      default:
        return `
          <path d="M92 118 L160 78 L228 118 L228 230 L92 230 Z" fill="none" stroke="white" stroke-width="12" stroke-linejoin="round"/>
          <path d="M80 118 L240 118" stroke="white" stroke-width="12" stroke-linecap="round"/>
          <rect x="135" y="160" width="50" height="70" rx="6" fill="white"/>
          <circle cx="160" cy="115" r="10" fill="${accent}"/>
        `;
    }
  };

  const generateSvgForDesign = (d: SmartLogoDesign): string => {
    const { bgColor, borderColor, accentColor, shape, iconType, subtitle } = d;

    let shapeDef = '';
    if (shape === 'circle') {
      shapeDef = `<circle cx="160" cy="160" r="148" fill="${bgColor}" stroke="${borderColor}" stroke-width="6"/>`;
    } else if (shape === 'rounded') {
      shapeDef = `<rect x="12" y="12" width="296" height="296" rx="64" ry="64" fill="${bgColor}" stroke="${borderColor}" stroke-width="6"/>`;
    } else if (shape === 'square') {
      shapeDef = `<rect x="12" y="12" width="296" height="296" rx="16" ry="16" fill="${bgColor}" stroke="${borderColor}" stroke-width="6"/>`;
    } else if (shape === 'shield') {
      shapeDef = `
        <path d="M160 16 L292 68 C292 195 235 272 160 304 C85 272 28 195 28 68 Z" fill="${bgColor}" stroke="${borderColor}" stroke-width="6"/>
      `;
    } else {
      shapeDef = `
        <rect x="12" y="12" width="296" height="296" rx="54" ry="54" fill="${bgColor}" stroke="${borderColor}" stroke-width="6"/>
        <circle cx="160" cy="160" r="124" fill="none" stroke="rgba(255,255,255,0.25)" stroke-width="4" stroke-dasharray="8 6"/>
      `;
    }

    const displayName = (effectiveShopName.slice(0, 16) || 'STORE').toUpperCase();

    let contentDef = '';
    if (iconType === 'initials') {
      contentDef = `
        <text x="160" y="160" font-family="-apple-system, BlinkMacSystemFont, sans-serif" font-weight="900" font-size="88" fill="white" text-anchor="middle" dominant-baseline="middle" letter-spacing="2">
          ${initials}
        </text>
        <rect x="40" y="222" width="240" height="32" rx="16" fill="rgba(0,0,0,0.3)"/>
        <text x="160" y="244" font-family="-apple-system, BlinkMacSystemFont, sans-serif" font-weight="800" font-size="14" fill="${accentColor}" text-anchor="middle" letter-spacing="2">
          ${displayName}
        </text>
      `;
    } else {
      contentDef = `
        <g transform="translate(0, -26)">
          ${renderIconSvg(iconType, bgColor, accentColor)}
        </g>
        <text x="160" y="238" font-family="-apple-system, BlinkMacSystemFont, sans-serif" font-weight="900" font-size="22" fill="white" text-anchor="middle" letter-spacing="1">
          ${displayName}
        </text>
        <text x="160" y="262" font-family="-apple-system, BlinkMacSystemFont, sans-serif" font-weight="700" font-size="10" fill="${accentColor}" text-anchor="middle" letter-spacing="2">
          ${subtitle}
        </text>
      `;
    }

    return `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 320" width="320" height="320">
        ${shapeDef}
        ${contentDef}
      </svg>
    `.trim();
  };

  const handleSave = () => {
    const svgString = generateSvgForDesign(currentDesign);
    const svgDataUrl = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svgString);

    const designObj: LogoDesign = {
      backgroundColor: currentDesign.bgColor,
      icon: currentDesign.iconType,
      text: initials,
      shape: currentDesign.shape === 'circle' ? 'circle' : currentDesign.shape === 'square' ? 'square' : 'rounded',
      subtitle: currentDesign.subtitle,
    };

    const img = new window.Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = 320;
        canvas.height = 320;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, 320, 320);
          ctx.drawImage(img, 0, 0);
          const pngUrl = canvas.toDataURL('image/png');
          onSaveLogo(pngUrl, designObj);
          onClose();
          return;
        }
      } catch {
        // fallback below
      }
      onSaveLogo(svgDataUrl, designObj);
      onClose();
    };
    img.onerror = () => {
      onSaveLogo(svgDataUrl, designObj);
      onClose();
    };
    img.src = svgDataUrl;
  };

  return (
    <div className="fixed inset-0 z-60 flex items-start sm:items-center justify-center bg-black/80 p-3 sm:p-4 backdrop-blur-xs overflow-y-auto overscroll-contain">
      <div className="relative w-full max-w-lg rounded-3xl bg-white text-slate-900 shadow-2xl border border-slate-200 overflow-hidden my-4 sm:my-auto">
        <div className="bg-slate-900 px-5 py-4 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center font-black">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-black text-base">{t('smartLogoMaker')}</h3>
              <p className="text-[11px] text-slate-400">{t('smartLogoMakerSub')}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-white cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-5 space-y-4 max-h-[82vh] overflow-y-auto pb-24 sm:pb-5">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
              {t('shopNameLabel')}
            </label>
            <input
              type="text"
              value={shopNameInput}
              onChange={(e) => setShopNameInput(e.target.value)}
              placeholder={t('smartLogoShopPlaceholder')}
              className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm font-bold text-slate-900 placeholder:text-slate-400 focus:border-amber-500 outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1 flex items-center justify-between">
              <span>{t('describeShopLabel')}</span>
              <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                {t('detectedShopType')}: {getCategoryLabel(detectedCat)}
              </span>
            </label>
            <input
              type="text"
              value={descriptionInput}
              onChange={(e) => setDescriptionInput(e.target.value)}
              placeholder={t('describeShopPlaceholder')}
              className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:border-amber-500 outline-none"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">
                {t('selectLogoPrompt')}
              </label>
              <button
                type="button"
                onClick={() => setSeed((prev) => prev + 1)}
                className="text-xs font-bold text-amber-700 bg-amber-100 hover:bg-amber-200 px-2.5 py-1 rounded-lg flex items-center gap-1.5 transition cursor-pointer"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                <span>{t('generateMoreDesigns')}</span>
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {designs.map((design, idx) => {
                const svgCode = generateSvgForDesign(design);
                const isSelected = selectedIndex === idx;

                return (
                  <button
                    key={design.id}
                    type="button"
                    onClick={() => setSelectedIndex(idx)}
                    className={`relative p-3 rounded-2xl border-2 transition text-center cursor-pointer flex flex-col items-center gap-2 ${
                      isSelected
                        ? 'border-amber-500 bg-amber-50/60 shadow-md ring-2 ring-amber-300'
                        : 'border-slate-200 hover:border-slate-300 bg-slate-50/50'
                    }`}
                  >
                    {isSelected && (
                      <span className="absolute top-2 right-2 h-6 w-6 rounded-full bg-amber-500 text-slate-950 flex items-center justify-center font-bold text-xs shadow-xs">
                        ✓
                      </span>
                    )}

                    <div
                      className="w-28 h-28 rounded-xl shadow-xs overflow-hidden flex items-center justify-center bg-white border border-slate-200/80 p-1"
                      dangerouslySetInnerHTML={{ __html: svgCode }}
                    />

                    <span className="text-[11px] font-black text-slate-800">
                      {t('designOptionLabel', { num: idx + 1 })} • {getShapeLabel(design.shape)}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-xl bg-slate-100 px-4 py-3 text-sm font-bold text-slate-700 hover:bg-slate-200 transition cursor-pointer"
            >
              {t('cancel')}
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="flex-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black py-3 px-4 text-sm shadow-md flex items-center justify-center gap-2 transition active:scale-95 cursor-pointer"
            >
              <Check className="h-5 w-5 stroke-[3]" />
              <span>{t('saveLogoBtn')}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
