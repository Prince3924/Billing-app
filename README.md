🧾 Smart Billing App - For Small Shops

A simple, fast, offline-first Billing + Stock + Khata App for small shops in India.
Built for shop owners who want billing without any complex software.

Owner manages the shop. Customer just scans QR and orders. No Login for customer.

🔗 Repo: https://github.com/Prince3924/Billing-app

---

✨ What This App Does

For Shop Owner
- Create your own Shop in 1 minute
- Add Items with Photo, Price, Stock
- Billing with Cart + GST / Discount
- Stock auto-decreases on every Bill
- Khata / Udhaar - Customer credit ledger
- Daily Sales Report
- Rate List / Price List Poster
- Store QR Standee & Poster for Shop Counter
- Works Offline - Auto-syncs when internet comes
- Installable as App (PWA / APK)

For Customer
- Scan Shop QR Code
- See Live Rate List with Photos & Prices
- Add to Cart & Place Order
- No App Download, No Login Needed

---

🔑 How Shop Login Works

Each shop gets a unique ID and Owner Code.

**Example:**
- Shop Name: `P.K. ELECTRICAL`
- Shop ID: `P-k-electricals-8242`
- Owner Code: `P-k-electricals-8742-955`

**Rule:**
> `Owner Code = SHOP_ID + "-955"`

**Example 2:**
- Shop Name: `Cafe king`
- Shop ID: `cafe king-1234` (Cafe's own ID)
- Owner Code: `cafe king-1234-955`

> Important: Shop ID is always dynamic. Every shop shows its OWN ID. Never use another shop's ID.

- First time: Enter Owner Code to open your shop
- Next time: Auto-Login - No need to enter code again on same device
- New device: Enter Owner Code again

---

📂 Project Structure

.
├── data/              # Shop data, items, bills
├── public/            # Icons, images, PWA files
├── scripts/           # Build / helper scripts
├── src/               # Main App Code (React + TS)
├── .env.example       # Example env variables
├── http://index.html         # App entry
├── http://metadata.json      # App metadata
├── MASTER_RULES.md    # Project rules - Do not break
└── http://README.md          # This file

---

🚀 How To Run Locally

```bash
1. Clone the repo
git clone https://github.com/Prince3924/Billing-app.git

2. Go into folder
cd Billing-app

3. Install packages
npm install

4. Copy env file
cp .env.example .env

5. Run dev server
npm run dev
Open in browser: `http://localhost:5173`

---

🏪 How To Create A New Shop

1. Open App
2. Click *Create New Shop*
3. Enter Shop Name, Owner Name, Mobile
4. Your Shop ID + Owner Code will be generated
5. Save your Owner Code safely - You will need it on a new device

---

📱 How To Use Store QR

1. Login as Owner
2. Go to *Rate List / Store QR*
3. Download *QR Poster / Standee*
4. Print & Stick on Counter
5. Customer scans QR -> Sees your Rate List -> Orders

---

🛡️ Rules (MASTER_RULES.md)

1. Never delete existing shop data
2. Never hardcode any Shop ID like `y-k-electricals-8742`
3. Shop ID + QR must always be dynamic for current shop
4. Owner Code Login must be case-insensitive & trim spaces
5. Existing shops must Auto-Login, don't ask code again

---

🛠️ Tech Stack

- React + TypeScript + Vite
- Tailwind CSS
- Local Storage / IndexedDB for Offline
- PWA - Installable

---

👨‍💻 Author

*Prince3924*

Made for small Indian shops - Simple, Fast, Offline.

---

📝 License

MIT License - Free to use and modify.
