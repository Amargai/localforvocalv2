# 🌿 LocalForVocal v2.0

> **Hyper-Local Neighborhood Marketplace & Discovery Platform**  
> Connects local shopkeepers and residents with zero cloud hosting bills, 100% on-device SQLite storage, and free open-source mapping.

---

## ✨ Key Features

### 🛍️ 1. Customer Experience
* **🗺️ Interactive Map Explorer:** Discover neighborhood shops within a 1 km – 30 km radius using free **Leaflet + OpenStreetMap** (zero Google Maps API costs).
* **🏪 Public Storefronts & Product Gallery:** Browse shop catalogs, prices, and discounts, and click **"Order / Inquire on WhatsApp"** with pre-filled item details.
* **📢 Reverse Marketplace:** Broadcast specific demands (*e.g., rare medicines, emergency carpentry, custom cakes*) to all shops in your neighborhood.
* **🔥 Flash Deals & Offers:** Discover limited-time neighborhood discounts and claim them directly on WhatsApp.
* **❤️ Save & Bookmark Stores:** Bookmark your favorite neighborhood shops for fast 1-click access.
* **⭐ Verified Reviews:** Rate and review local stores based on pricing, delivery speed, and service.

### 🏪 2. Shopkeeper Command Center
* **🟢 Live Availability Switch:** Toggle your shop visibility (*"Open Today"* vs *"Closed"*) in real-time.
* **📦 Product Catalog Manager:** Add products with prices, MRP discounts, photo uploads/URLs, and instant in-stock/out-of-stock switches.
* **📁 Direct Device Image Uploads:** Upload storefront photos and product images directly from your device/camera via local multipart upload API.
* **💎 Quota & Growth Tiers:** Free Starter Plan (up to 5 products) with subscription upgrade prompts for unlimited items and verified green badges.
* **✏️ Shop Profile Editor:** Easily update shop name, category, phone numbers, WhatsApp leads number, address, banner photo, and search tags.
* **🎯 Demand Radar:** Real-time feed of matching customer requests posted within your delivery radius.
* **🗑️ Promotion Management:** Publish and manage flash offers and deals with instant removal capability.

---

## 🛠️ Technology Stack (100% Free & Local-First)

| Layer | Technology | Purpose |
| :--- | :--- | :--- |
| **Frontend** | React 19, Vite, Lucide-style SVG icons | Fast, modern client UI |
| **Styling** | Custom Design System (Dark Slate / Emerald) | Responsive glassmorphism, mobile drawer & typography |
| **Mapping** | Leaflet + OpenStreetMap | Free visual map & proximity radius |
| **Backend** | Node.js (Express.js) | REST API & Authentication |
| **Storage** | Multer Local File Uploads | Zero-cloud image storage (`server/uploads/`) |
| **Database** | Native Node SQLite (`node:sqlite` DatabaseSync) | 100% on-device database storage (`server/data/localforvocal.db`) |
| **Auth** | JWT + Simulated Free Local OTP (`123456`) | Zero-cost phone login testing |

---

## 🚀 Quick Start Guide

### 1. Prerequisites
* **Node.js** v20+ or v24+ (Node includes built-in `node:sqlite`).

### 2. Start the Application
From the `LocalForVocalv2` root directory:

```powershell
cd D:\LocalForVocal\LocalForVocalv2
npm run dev
```

* **Frontend UI:** [http://localhost:5173](http://localhost:5173)
* **Backend API:** [http://localhost:5000/api](http://localhost:5000/api)
* **Local Database File:** `server/data/localforvocal.db`

---

## 👥 Demo Profiles for Quick Testing

You can use the **1-Click Demo Login** button on the sign-in modal to test different user roles:

| Role | Profile Name | Features to Test |
| :--- | :--- | :--- |
| **Resident / Customer** | Rahul Sharma | Explore shops, search keywords, post demands with GPS, bookmark favorites, order on WhatsApp, write reviews. |
| **Shop Owner** | Care & Cure Chemist | Manage catalog & prices, upload photos, toggle open/close, edit shop profile, respond to customer demands. |
| **Platform Admin** | Admin Console | Platform analytics, shop approvals, moderation, featured partner toggling. |

*(Note: Phone OTP verification is pre-configured with the instant local code `123456`).*

---

## 📁 Project Structure

```
LocalForVocalv2/
├── server/
│   ├── data/
│   │   └── localforvocal.db      # Local SQLite database
│   ├── src/
│   │   ├── config/db.js          # SQLite connection, schema & auto-seed
│   │   ├── config/env.js         # Environment configuration
│   │   ├── middleware/auth.js    # JWT auth & role validation
│   │   ├── routes/
│   │   │   ├── auth.js           # Login, OTP verification, demo logins
│   │   │   ├── shops.js          # Explore, filter, edit profile, reviews
│   │   │   ├── products.js       # Product catalog CRUD & quota checks
│   │   │   ├── requirements.js   # Reverse marketplace demand broadcasting
│   │   │   ├── offers.js         # Flash deals & discounts CRUD
│   │   │   ├── uploads.js        # Device image upload handler
│   │   │   └── admin.js          # Analytics & moderation
│   │   ├── utils/
│   │   │   └── geo.js            # Haversine distance formula calculations
│   │   └── server.js             # Express server entry (Port 5000)
│   └── uploads/                  # Local image storage
├── src/
│   ├── components/
│   │   ├── Navbar.jsx            # Main navigation, mobile drawer & active indicators
│   │   ├── Footer.jsx            # Footer links & platform info
│   │   ├── ShopCard.jsx          # Shop card with heart bookmark & WhatsApp CTA
│   │   ├── ShopMapView.jsx       # Free Leaflet OpenStreetMap view
│   │   ├── RequirementCard.jsx   # Customer demand card & response box
│   │   ├── AuthModal.jsx         # 1-Click demo & OTP login modal
│   │   └── Icons.jsx             # Compact SVG icon components
│   ├── context/
│   │   └── AuthContext.jsx       # Global auth state & session manager
│   ├── pages/
│   │   ├── HomePage.jsx          # Hero search, category tiles, verified shops
│   │   ├── ExplorePage.jsx       # Grid / Map view, radius slider, filters, search query
│   │   ├── PublicShopProfilePage.jsx # Dedicated customer storefront & product gallery
│   │   ├── ShopDashboardPage.jsx # Shopkeeper command center, catalog & image uploads
│   │   ├── OffersPage.jsx        # Neighborhood deals feed, posting & deletion
│   │   ├── PostRequirementPage.jsx # Reverse marketplace demand broadcaster with GPS
│   │   ├── SubscriptionPage.jsx  # Growth tiers & pricing breakdown
│   │   ├── UserProfilePage.jsx   # My demands & saved favorite shops
│   │   ├── RegisterShopPage.jsx  # 3-step shop registration wizard with photo upload
│   │   └── AdminPage.jsx         # Metrics & moderation panel
│   ├── App.jsx                   # Main routing container
│   ├── main.jsx                  # React DOM entry
│   └── index.css                 # Custom design system & styles
├── package.json                  # Scripts & dependencies
└── vite.config.js                # Vite dev server & API proxy
```

---

## 📄 License
MIT License — Free to customize and distribute.
