import { Product, Bill, ShopInfo } from '../types';

export const INITIAL_SHOP_INFO: ShopInfo = {
  name: '',
  address: '',
  mobile: '',
  alternateMobile: '',
  tagline: '',
  gstin: '',
  upiId: '',
  payeeName: '',
  showUpiQrOnBill: false,
  bankName: '',
  accountNumber: '',
  ifscCode: '',
  udharTemplates: {
    english: '',
    hindi: '',
    hinglish: '',
  },
  billFooterTemplates: {
    english: '',
    hindi: '',
    hinglish: '',
  },
  logoUrl: '',
  showLogoOnBill: false,
  billNumberConfig: {
    prefix: '',
    yearFormat: 'none',
    startingNumber: 1,
    digitLength: 1,
  },
  billSequenceTracker: {},
};

export const COMMON_COMPANIES: string[] = [];

export const COMMON_VENDORS: string[] = [];

export const COMMON_CATEGORIES: string[] = [];

export const INITIAL_PRODUCTS: Product[] = [];

export const SAMPLE_DEMO_PRODUCTS: Product[] = [];

export const INITIAL_BILLS: Bill[] = [];

export const SAMPLE_DEMO_BILLS: Bill[] = [];
