import { BillNumberConfig, BillYearFormat, Language, UdharReminderTemplates, BillFooterTemplates } from '../types';

export const DEFAULT_BILL_CONFIG: BillNumberConfig = {
  prefix: '',
  yearFormat: 'none',
  startingNumber: 1,
  digitLength: 1,
};

export const DEFAULT_UDHAR_TEMPLATES: Record<Language, string> = {
  hinglish: 'Namaste {name} ji, {shop} ki taraf se. Aapka ₹{amount} baki hai. Kripya jald se jald jama kar dein. Dhanyavaad 🙏',
  hindi: 'नमस्ते {name} जी, {shop} की तरफ से। आपका ₹{amount} बकाया है। कृपया जल्द से जल्द जमा कर दें। धन्यवाद 🙏',
  english: 'Hello {name}, from {shop}. Your pending balance is ₹{amount}. Kindly clear the dues at your earliest convenience. Thank you 🙏',
};

export const DEFAULT_BILL_FOOTER_TEMPLATES: Record<Language, string> = {
  english: 'Thank you for shopping with us!',
  hindi: 'हमारी दुकान से खरीदारी के लिए धन्यवाद!',
  hinglish: 'Shopping ke liye Dhanyavaad! Fir se zaroor aaiyega 🙏',
};

/**
 * Calculates Indian Financial Year string (April 1st to March 31st).
 * E.g., for Nov 2026 -> "2026-27"; for Feb 2027 -> "2026-27".
 */
export function getFinancialYearString(date: Date = new Date()): string {
  const month = date.getMonth(); // 0-indexed (3 = April)
  const year = date.getFullYear();
  const fyStart = month >= 3 ? year : year - 1;
  const fyEndShort = (fyStart + 1).toString().slice(-2);
  return `${fyStart}-${fyEndShort}`;
}

/**
 * Returns formatted year string based on choice.
 */
export function getYearString(yearFormat: BillYearFormat, date: Date = new Date()): string {
  switch (yearFormat) {
    case 'full':
      return date.getFullYear().toString();
    case 'short':
      return date.getFullYear().toString().slice(-2);
    case 'fy':
      return getFinancialYearString(date);
    case 'none':
    default:
      return '';
  }
}

/**
 * Period key used to reset sequence every year or financial year.
 */
export function getPeriodKey(yearFormat: BillYearFormat, date: Date = new Date()): string {
  switch (yearFormat) {
    case 'fy':
      return `FY_${getFinancialYearString(date)}`;
    case 'full':
    case 'short':
      return `YR_${date.getFullYear()}`;
    case 'none':
    default:
      return 'GLOBAL';
  }
}

/**
 * Formats a sequence number according to BillNumberConfig.
 * Example with prefix="YK", yearFormat="fy", digitLength=3 -> "YK / 2026-27 / 001"
 * Example with empty prefix and yearFormat="none" -> "1"
 */
export function formatBillNumber(
  config: BillNumberConfig,
  sequence: number,
  date: Date = new Date()
): string {
  const parts: string[] = [];
  if (config.prefix && config.prefix.trim()) {
    parts.push(config.prefix.trim());
  }

  const yr = getYearString(config.yearFormat, date);
  if (yr) {
    parts.push(yr);
  }

  const digits = Math.max(1, config.digitLength || 1);
  const numStr = sequence.toString().padStart(digits, '0');
  parts.push(numStr);

  // If only number (empty prefix, no year), return plain number string
  if (parts.length === 1) {
    return parts[0];
  }

  return parts.join(' / ');
}

/**
 * Generates the next bill number while guaranteeing:
 * 1. Resets to startingNumber upon arrival of a new Year or Financial Year.
 * 2. Non-repeating numbers (even if a bill is deleted, tracker never rewinds).
 * 3. Fallback to simple 1, 2, 3 if not configured.
 */
export function getNextBillNumber(
  config: BillNumberConfig | undefined,
  sequenceTracker: Record<string, number> = {},
  date: Date = new Date()
): { billNumber: string; updatedTracker: Record<string, number>; sequence: number } {
  const activeConfig = config && (config.prefix || config.yearFormat !== 'none' || config.startingNumber > 1 || config.digitLength > 1)
    ? config
    : DEFAULT_BILL_CONFIG;

  const periodKey = getPeriodKey(activeConfig.yearFormat, date);
  const lastIssued = sequenceTracker[periodKey] || 0;
  const startingNum = Math.max(1, activeConfig.startingNumber || 1);

  // If first bill in this period, start at startingNum; otherwise lastIssued + 1
  const nextSeq = lastIssued > 0 ? lastIssued + 1 : startingNum;

  const updatedTracker = {
    ...sequenceTracker,
    [periodKey]: nextSeq,
  };

  const billNumber = formatBillNumber(activeConfig, nextSeq, date);
  return { billNumber, updatedTracker, sequence: nextSeq };
}

/**
 * Resolves Udhar WhatsApp message from custom template or default.
 */
export function getUdharReminderMessage(
  templates: UdharReminderTemplates | undefined,
  language: Language,
  customerName: string,
  amount: number,
  shopName: string,
  shopMobile?: string
): string {
  let template = templates?.[language];
  if (!template || !template.trim()) {
    template = DEFAULT_UDHAR_TEMPLATES[language] || DEFAULT_UDHAR_TEMPLATES.hinglish;
  }

  const cust = customerName?.trim() || (language === 'hindi' ? 'ग्राहक' : language === 'english' ? 'Customer' : 'Grahak');
  const shop = shopName?.trim() || (language === 'hindi' ? 'दुकान' : language === 'english' ? 'Store' : 'Dukaan');

  let msg = template
    .replace(/\{name\}/g, cust)
    .replace(/\{amount\}/g, amount.toString())
    .replace(/\{shop\}/g, shop);

  if (shopMobile && !msg.includes(shopMobile)) {
    msg += `\n📞 ${shopMobile}`;
  }

  return msg;
}

/**
 * Resolves Bill Footer / Thank You message from custom template or default.
 */
export function getBillFooterMessage(
  templates: BillFooterTemplates | undefined,
  language: Language,
  customerName?: string,
  shopName?: string
): string {
  let template = templates?.[language];
  if (!template || !template.trim()) {
    template = DEFAULT_BILL_FOOTER_TEMPLATES[language] || DEFAULT_BILL_FOOTER_TEMPLATES.english;
  }

  const cust = customerName?.trim() || (language === 'hindi' ? 'ग्राहक' : language === 'english' ? 'Customer' : 'Grahak');
  const shop = shopName?.trim() || (language === 'hindi' ? 'दुकान' : language === 'english' ? 'Store' : 'Dukaan');

  return template
    .replace(/\{name\}/g, cust)
    .replace(/\{shop\}/g, shop);
}
