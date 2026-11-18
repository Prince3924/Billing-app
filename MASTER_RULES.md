# MASTER RULES / PROJECT RULES

> **PERMANENT RULES — HAR UPDATE SE PEHLE IS FILE KO PADHKAR HI CODE BADLEIN**

## 1. 100% STRICT LANGUAGE ISOLATION (ZERO HARDCODED TEXT)
- **Koi bhi text hardcoded mat likho.** App ke sabhi labels, titles, subtitles, placeholders, empty states, error messages, toast notifications, confirmation dialogs, aur table headers sirf `src/locales/translations.ts` dictionary se aane chahiye.
- **English Selected:** Pura app 100% English me dikhega. Kahin bhi koi Hinglish (jaise "Dukaan Ka Stock", "Zaroori Suvidhayein", "Munafa", "Roz Ka Hisaab", "Baki", "Maal") ya Hindi word nahi hona chahiye.
- **Hindi Selected:** Pura app 100% shuddh Devanagari Hindi me dikhega.
- **Hinglish Selected:** Pura app 100% natural, consistent Hinglish me dikhega.
- Language change karte hi bina page reload ke poora app turant usi language me switch hona chahiye aur `localStorage` me save rehna chahiye.

## 2. SETTINGS DEFAULT BLANK (ZERO HARDCODED DEMO SHOP DATA)
- Fresh install par Shop Name, Address, Mobile, Alternate Mobile, GSTIN, Tagline, UPI ID, Payee Name, Bank Details sab bilkul empty string `""` hone chahiye.
- "Add Product" form me Company, Vendor, Category, Unit, Prices sab default blank hone chahiye (placeholder "Select / Add...").
- Master lists (Company, Vendor/Supplier, Category) dropdowns start 100% EMPTY. Shuru me sirf ek option dikhega: `+ Add New / Other (Type new name)`. Koi bhi default Havells, Polycab, Philips, Gaya, Patna, LED Bulbs etc. nahi dikhega. User apna khud ka list banayega jo save hota rahega.
- Kisi bhi purane testing brand (e.g., Y.K. ELECTRICAL, Gaya Bihar, Havells, etc.) ka hardcoded fallback nahi hona chahiye.

## 3. APP NAME IS STRICTLY "Billing App"
- App ka default naam hamesha **"Billing App"** rahega.
- Agar user ne Settings me apni dukaan ka naam save kiya hai, tabhi unka shop name dikhega, warna "Billing App" hi dikhega.

## 4. BILL NUMBER AUR UDHAR MESSAGE FORMAT
- User ne Settings me jo Bill Number format (Prefix, Year format, Starting Number, Digits) aur Udhar WhatsApp template set kiya hai, har jagah wahi use hona chahiye.
- New year / FY arrival par sequence reset hona aur deleted bill ka number repeat na hona hamesha enforce rahe.

## 5. BILL PRINT / PREVIEW IS ALWAYS WHITE
- Chahe Dark Mode ON ho ya OFF ho, Bill Preview card aur Print receipt (`#print-bill`) hamesha pure white background aur black text me hi rahega, kyunki thermal paper aur A4 print paper white hota hai.
