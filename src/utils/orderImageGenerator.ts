import { CustomerOrder, Language, ShopInfo } from '../types';
import { t } from '../locales/translations.js';

export interface OrderImageResult {
  dataUrl: string;
  blob: Blob;
  file: File;
  textMessage: string;
}

/**
 * Formats an ISO timestamp string according to the selected language cleanly.
 */
function formatOrderDate(isoDate: string, lang: Language): string {
  try {
    const locale = lang === 'hindi' ? 'hi-IN' : 'en-IN';
    return new Date(isoDate || Date.now()).toLocaleString(locale, {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return new Date().toLocaleDateString();
  }
}

/**
 * Builds the localized plain-text WhatsApp order message strictly in the chosen language.
 */
export function buildOrderWhatsAppText(
  order: CustomerOrder,
  shopInfo: ShopInfo,
  lang: Language
): string {
  const showMobile = shopInfo.orderMessageSettings?.showMobile ?? true;
  const shopName = shopInfo.name?.trim() || t('appName', lang);
  const itemsLines = order.items
    .map(
      (item, idx) =>
        `${idx + 1}. ${item.productName} - ${item.quantity} ${item.unit} x ₹${item.rate} = ₹${item.total}`
    )
    .join('\n');

  const lines: string[] = [
    `🛒 *${t('orderWaHeader', lang, { orderNumber: order.orderNumber })}*`,
    `🏪 *${t('orderWaShopLabel', lang)}* ${shopName}`,
  ];

  if (showMobile && shopInfo.mobile) {
    lines.push(`📞 *${t('mobile', lang)}:* ${shopInfo.mobile}`);
  }

  lines.push(
    `👤 *${t('orderWaCustomerLabel', lang)}* ${order.customerName}`,
    `📱 *${t('orderWaMobileLabel', lang)}* ${order.customerMobile}`,
    `📅 *${t('date', lang)}:* ${formatOrderDate(order.date, lang)}`,
    '',
    `📦 *${t('orderWaItemsLabel', lang)}*`,
    itemsLines,
    '',
    `💰 *${t('orderWaTotalLabel', lang)} ₹${order.grandTotal}*`,
    '',
    t('orderWaFooter', lang)
  );

  return lines.join('\n');
}

function loadImageElement(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    if (!src) {
      resolve(null);
      return;
    }
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

function wrapLines(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  maxLines = 2
): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let current = '';

  for (let i = 0; i < words.length; i += 1) {
    const testLine = current ? `${current} ${words[i]}` : words[i];
    if (ctx.measureText(testLine).width <= maxWidth) {
      current = testLine;
    } else {
      if (current) lines.push(current);
      current = words[i];
      if (lines.length >= maxLines - 1) break;
    }
  }
  if (current) lines.push(current);
  return lines.slice(0, maxLines);
}

/**
 * Generates an offline, high-contrast PNG Order Confirmation Card using HTML5 Canvas.
 * Honors Owner's Order Message Settings: showLogo, showMobile, messageLanguage.
 */
export async function generateOrderConfirmationImage(
  order: CustomerOrder,
  shopInfo: ShopInfo,
  langOverride?: Language
): Promise<OrderImageResult> {
  const settings = shopInfo.orderMessageSettings;
  const lang: Language = langOverride || settings?.messageLanguage || 'hinglish';
  const showLogo = settings?.showLogo ?? true;
  const showMobile = settings?.showMobile ?? true;
  const textMessage = buildOrderWhatsAppText(order, shopInfo, lang);

  const width = 760;
  const itemRowHeight = 52;
  const itemsCount = Math.max(1, order.items.length);
  const logoSpace = showLogo && (shopInfo.logoUrl || shopInfo.logoDesign) ? 88 : 0;
  const headerHeight = 148 + logoSpace;
  const customerBoxHeight = 104;
  const tableHeaderHeight = 42;
  const totalBoxHeight = 82;
  const footerHeight = 76;
  const height =
    headerHeight +
    customerBoxHeight +
    tableHeaderHeight +
    itemsCount * itemRowHeight +
    totalBoxHeight +
    footerHeight +
    64;

  const scale = 2;
  const canvas = document.createElement('canvas');
  canvas.width = width * scale;
  canvas.height = height * scale;

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Canvas 2D context unavailable');
  }
  ctx.scale(scale, scale);

  // Outer clean light slate background + white receipt card
  ctx.fillStyle = '#f1f5f9';
  ctx.fillRect(0, 0, width, height);

  const pad = 24;
  const cardW = width - pad * 2;
  const cardH = height - pad * 2;

  ctx.fillStyle = '#ffffff';
  drawRoundedRect(ctx, pad, pad, cardW, cardH, 20);
  ctx.fill();
  ctx.strokeStyle = '#cbd5e1';
  ctx.lineWidth = 2;
  ctx.stroke();

  // Accent Top Banner
  ctx.fillStyle = '#0f172a';
  drawRoundedRect(ctx, pad, pad, cardW, 10, 20);
  ctx.fill();

  let cursorY = pad + 32;
  const centerX = width / 2;

  // Optional Shop Logo
  if (showLogo && (shopInfo.logoUrl || shopInfo.logoDesign)) {
    const logoSize = 68;
    const logoX = centerX - logoSize / 2;
    const logoY = cursorY;

    if (shopInfo.logoUrl) {
      const img = await loadImageElement(shopInfo.logoUrl);
      if (img) {
        ctx.save();
        drawRoundedRect(ctx, logoX, logoY, logoSize, logoSize, 16);
        ctx.clip();
        ctx.drawImage(img, logoX, logoY, logoSize, logoSize);
        ctx.restore();
      }
    } else if (shopInfo.logoDesign) {
      const design = shopInfo.logoDesign;
      ctx.fillStyle = design.backgroundColor || '#ea580c';
      const radius = design.shape === 'circle' ? logoSize / 2 : design.shape === 'square' ? 8 : 18;
      drawRoundedRect(ctx, logoX, logoY, logoSize, logoSize, radius);
      ctx.fill();

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 28px system-ui, -apple-system, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const initials = (design.text || shopInfo.name?.slice(0, 2) || 'S').toUpperCase().slice(0, 3);
      ctx.fillText(initials, centerX, logoY + logoSize / 2 + 1);
      ctx.textBaseline = 'alphabetic';
    }
    cursorY += logoSize + 18;
  }

  // Shop Name (user data - never translated)
  ctx.fillStyle = '#0f172a';
  ctx.font = 'bold 28px system-ui, -apple-system, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(shopInfo.name || t('appName', lang), centerX, cursorY);
  cursorY += 26;

  // Optional Shop Mobile
  if (showMobile && shopInfo.mobile) {
    ctx.fillStyle = '#475569';
    ctx.font = 'bold 16px system-ui, -apple-system, sans-serif';
    ctx.fillText(`📞 ${shopInfo.mobile}`, centerX, cursorY);
    cursorY += 24;
  }

  // Order Receipt Badge
  const badgeText = `${t('orderCardTitle', lang)}  •  ${order.orderNumber}`;
  ctx.font = 'bold 14px system-ui, -apple-system, sans-serif';
  const badgeW = Math.min(cardW - 48, ctx.measureText(badgeText).width + 36);
  ctx.fillStyle = '#dcfce7';
  drawRoundedRect(ctx, centerX - badgeW / 2, cursorY, badgeW, 30, 8);
  ctx.fill();
  ctx.strokeStyle = '#86efac';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.fillStyle = '#166534';
  ctx.fillText(badgeText, centerX, cursorY + 20);
  cursorY += 48;

  // Customer Details Card
  const innerX = pad + 24;
  const innerW = cardW - 48;
  ctx.fillStyle = '#f8fafc';
  drawRoundedRect(ctx, innerX, cursorY, innerW, 84, 12);
  ctx.fill();
  ctx.strokeStyle = '#e2e8f0';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.textAlign = 'left';
  ctx.fillStyle = '#475569';
  ctx.font = '600 13px system-ui, -apple-system, sans-serif';
  ctx.fillText(t('orderCardCustomerLabel', lang), innerX + 16, cursorY + 26);
  ctx.fillStyle = '#0f172a';
  ctx.font = 'bold 17px system-ui, -apple-system, sans-serif';
  ctx.fillText(order.customerName, innerX + 16, cursorY + 49);

  ctx.fillStyle = '#475569';
  ctx.font = '600 13px system-ui, -apple-system, sans-serif';
  ctx.fillText(`📱 ${order.customerMobile}`, innerX + 16, cursorY + 71);

  ctx.textAlign = 'right';
  ctx.fillStyle = '#475569';
  ctx.font = '600 13px system-ui, -apple-system, sans-serif';
  ctx.fillText(t('date', lang), innerX + innerW - 16, cursorY + 26);
  ctx.fillStyle = '#0f172a';
  ctx.font = 'bold 14px system-ui, -apple-system, sans-serif';
  ctx.fillText(formatOrderDate(order.date, lang), innerX + innerW - 16, cursorY + 49);

  cursorY += 102;

  // Items Table Header
  ctx.fillStyle = '#0f172a';
  drawRoundedRect(ctx, innerX, cursorY, innerW, 38, 8);
  ctx.fill();

  const colItemX = innerX + 14;
  const colQtyX = innerX + innerW * 0.56;
  const colRateX = innerX + innerW * 0.76;
  const colTotalX = innerX + innerW - 14;

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 13px system-ui, -apple-system, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(t('orderCardItemCol', lang), colItemX, cursorY + 24);
  ctx.textAlign = 'center';
  ctx.fillText(t('orderCardQtyCol', lang), colQtyX, cursorY + 24);
  ctx.textAlign = 'right';
  ctx.fillText(t('orderCardRateCol', lang), colRateX, cursorY + 24);
  ctx.fillText(t('orderCardTotalCol', lang), colTotalX, cursorY + 24);

  cursorY += 42;

  // Item Rows
  order.items.forEach((item, idx) => {
    if (idx % 2 === 1) {
      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(innerX, cursorY, innerW, itemRowHeight);
    }

    ctx.textAlign = 'left';
    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 14px system-ui, -apple-system, sans-serif';
    const lines = wrapLines(ctx, `${idx + 1}. ${item.productName}`, innerW * 0.44, 2);
    lines.forEach((line, lIdx) => {
      ctx.fillText(line, colItemX, cursorY + (lines.length === 1 ? 30 : 21 + lIdx * 17));
    });

    ctx.textAlign = 'center';
    ctx.fillStyle = '#334155';
    ctx.font = 'bold 14px system-ui, -apple-system, sans-serif';
    ctx.fillText(`${item.quantity} ${item.unit}`, colQtyX, cursorY + 30);

    ctx.textAlign = 'right';
    ctx.fillStyle = '#475569';
    ctx.font = '600 14px system-ui, -apple-system, sans-serif';
    ctx.fillText(`₹${item.rate}`, colRateX, cursorY + 30);

    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 15px system-ui, -apple-system, sans-serif';
    ctx.fillText(`₹${item.total}`, colTotalX, cursorY + 30);

    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(innerX, cursorY + itemRowHeight);
    ctx.lineTo(innerX + innerW, cursorY + itemRowHeight);
    ctx.stroke();

    cursorY += itemRowHeight;
  });

  cursorY += 16;

  // Grand Total Highlight Box
  ctx.fillStyle = '#fff7ed';
  drawRoundedRect(ctx, innerX, cursorY, innerW, 64, 12);
  ctx.fill();
  ctx.strokeStyle = '#fdba74';
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.textAlign = 'left';
  ctx.fillStyle = '#9a3412';
  ctx.font = 'bold 18px system-ui, -apple-system, sans-serif';
  ctx.fillText(t('orderCardGrandTotal', lang), innerX + 20, cursorY + 39);

  ctx.textAlign = 'right';
  ctx.fillStyle = '#ea580c';
  ctx.font = 'bold 28px system-ui, -apple-system, sans-serif';
  ctx.fillText(`₹${order.grandTotal}`, innerX + innerW - 20, cursorY + 42);

  cursorY += 86;

  // Footer
  ctx.textAlign = 'center';
  ctx.fillStyle = '#475569';
  ctx.font = 'bold 14px system-ui, -apple-system, sans-serif';
  ctx.fillText(t('orderCardThankYou', lang), centerX, cursorY + 12);

  const dataUrl = canvas.toDataURL('image/png');
  const blob: Blob = await new Promise((resolve, reject) => {
    canvas.toBlob(
      (b) => {
        if (b) resolve(b);
        else reject(new Error('Failed to create PNG blob'));
      },
      'image/png'
    );
  });

  const safeOrderNum = (order.orderNumber || 'ORDER').replace(/[^a-zA-Z0-9_-]/g, '');
  const file = new File([blob], `Order-${safeOrderNum}.png`, { type: 'image/png' });

  return { dataUrl, blob, file, textMessage };
}
