import React from 'react';
import { Zap, Store, Lightbulb, Cable, ShoppingBag, Smartphone, Shirt } from 'lucide-react';
import { LogoDesign, ShopInfo } from '../types';

interface ShopLogoProps {
  shopInfo: ShopInfo;
  size?: number; // pixel size (e.g. 80, 56, 40)
  className?: string;
  forceShow?: boolean; // if true, ignores showLogoOnBill (used in Settings preview)
}

/**
 * Universal Shop Logo Component:
 * - If shopInfo.logoUrl (Base64 photo from gallery/camera) exists -> renders <img> tag.
 * - Else if shopInfo.logoDesign (offline smart generated design) exists -> renders pure CSS HTML DIV logo.
 * - Fallback -> renders default clean badge using shop's first letter with orange background.
 * - NEVER shows a broken image icon.
 */
export const ShopLogo: React.FC<ShopLogoProps> = ({
  shopInfo,
  size = 80,
  className = '',
  forceShow = false,
}) => {
  if (!forceShow && !shopInfo.showLogoOnBill) {
    return null;
  }

  // 1. If photo upload exists (Base64 image)
  if (shopInfo.logoUrl && shopInfo.logoUrl.trim().length > 0) {
    return (
      <div 
        className={`flex items-center justify-center overflow-hidden shrink-0 ${className}`}
        style={{ width: `${size}px`, height: `${size}px` }}
      >
        <img
          src={shopInfo.logoUrl}
          alt=""
          style={{
            width: `${size}px`,
            height: `${size}px`,
            objectFit: 'contain',
            display: 'block',
          }}
          onError={(e) => {
            // If base64 photo is corrupted, fall back to initial letter gracefully
            e.currentTarget.style.display = 'none';
          }}
        />
      </div>
    );
  }

  // 2. If Smart Logo Design data exists or fallback
  const design: LogoDesign = shopInfo.logoDesign || {
    backgroundColor: '#ea580c',
    icon: 'bolt',
    text: (shopInfo.name || 'B').trim().charAt(0).toUpperCase() || 'B',
    shape: 'rounded',
  };

  const borderRadius =
    design.shape === 'circle'
      ? '9999px'
      : design.shape === 'square'
      ? '6px'
      : '16px'; // rounded or badge

  const initialLetter = (design.text || (shopInfo.name || 'B').trim().charAt(0)).toUpperCase() || 'B';
  const iconSize = Math.max(14, Math.round(size * 0.35));
  const fontSize = Math.max(16, Math.round(size * 0.42));

  const renderIcon = () => {
    const iconProps = { style: { width: `${iconSize}px`, height: `${iconSize}px` }, className: 'text-white' };
    switch (design.icon) {
      case 'bulb':
        return <Lightbulb {...iconProps} />;
      case 'wire':
        return <Cable {...iconProps} />;
      case 'cart':
        return <ShoppingBag {...iconProps} />;
      case 'phone':
        return <Smartphone {...iconProps} />;
      case 'shirt':
        return <Shirt {...iconProps} />;
      case 'store':
        return <Store {...iconProps} />;
      case 'initials':
        return null;
      case 'bolt':
      default:
        return <Zap {...iconProps} className="text-white fill-white" />;
    }
  };

  return (
    <div
      className={`relative flex flex-col items-center justify-center text-white select-none shrink-0 shadow-sm ${className}`}
      style={{
        width: `${size}px`,
        height: `${size}px`,
        backgroundColor: design.backgroundColor || '#ea580c',
        borderRadius,
        border: '2px solid rgba(255,255,255,0.4)',
      }}
    >
      {design.icon === 'initials' || !design.icon ? (
        <span 
          style={{ 
            fontSize: `${fontSize}px`, 
            fontWeight: 900, 
            letterSpacing: '-0.02em',
            lineHeight: 1 
          }}
        >
          {initialLetter}
        </span>
      ) : (
        <div className="flex flex-col items-center justify-center gap-0.5">
          {renderIcon()}
          <span 
            style={{ 
              fontSize: `${Math.max(10, Math.round(size * 0.22))}px`, 
              fontWeight: 900, 
              letterSpacing: '0.05em',
              lineHeight: 1,
              textTransform: 'uppercase'
            }}
          >
            {initialLetter}
          </span>
        </div>
      )}
    </div>
  );
};
