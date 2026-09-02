const fs = require('fs');
const path = require('path');
const { DatabaseSync } = require('node:sqlite');
const bcrypt = require('bcryptjs');

const dbPath = path.resolve(process.cwd(), process.env.SQLITE_PATH || 'server/data/localforvocal.db');
fs.mkdirSync(path.dirname(dbPath), { recursive: true });

// Initialize 100% native built-in SQLite (zero external C++ dependencies, 100% on-device storage)
const db = new DatabaseSync(dbPath);
db.exec('PRAGMA journal_mode = WAL;');
db.exec('PRAGMA synchronous = NORMAL;');
db.exec('PRAGMA foreign_keys = ON;');
db.exec('PRAGMA busy_timeout = 8000;');
db.exec('PRAGMA cache_size = -64000;');

/**
 * Safe JSON parse helper to prevent server crashes on corrupted DB strings
 */
function safeJsonParse(str, fallback = []) {
  if (!str) return fallback;
  if (typeof str !== 'string') return str;
  try {
    return JSON.parse(str);
  } catch (e) {
    return fallback;
  }
}

function initSchema() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      phone TEXT UNIQUE,
      email TEXT UNIQUE,
      password_hash TEXT,
      account_type TEXT NOT NULL DEFAULT 'customer',
      area TEXT,
      city TEXT,
      shop_id TEXT,
      photo_url TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS shops (
      id TEXT PRIMARY KEY,
      owner_id TEXT NOT NULL,
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      sub_category TEXT,
      owner_name TEXT NOT NULL,
      phone TEXT NOT NULL,
      whatsapp TEXT,
      address TEXT NOT NULL,
      area TEXT NOT NULL,
      city TEXT NOT NULL,
      pin TEXT,
      tags TEXT NOT NULL DEFAULT '[]',
      latitude REAL NOT NULL,
      longitude REAL NOT NULL,
      business_hours TEXT,
      images TEXT NOT NULL DEFAULT '[]',
      status TEXT NOT NULL DEFAULT 'active',
      featured INTEGER NOT NULL DEFAULT 0,
      available_today INTEGER NOT NULL DEFAULT 1,
      rating REAL NOT NULL DEFAULT 5.0,
      total_reviews INTEGER NOT NULL DEFAULT 0,
      views INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY(owner_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_shops_location ON shops(latitude, longitude);
    CREATE INDEX IF NOT EXISTS idx_shops_category ON shops(category);
    CREATE INDEX IF NOT EXISTS idx_shops_status ON shops(status);

    CREATE TABLE IF NOT EXISTS reviews (
      id TEXT PRIMARY KEY,
      shop_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      user_name TEXT NOT NULL,
      rating INTEGER NOT NULL,
      comment TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY(shop_id) REFERENCES shops(id) ON DELETE CASCADE,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS requirements (
      id TEXT PRIMARY KEY,
      customer_id TEXT NOT NULL,
      customer_name TEXT NOT NULL,
      phone TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      category TEXT NOT NULL,
      urgency TEXT NOT NULL DEFAULT 'today',
      budget TEXT,
      radius_km REAL NOT NULL DEFAULT 10,
      area TEXT,
      city TEXT,
      latitude REAL,
      longitude REAL,
      target_shop_id TEXT,
      target_shop_name TEXT,
      status TEXT NOT NULL DEFAULT 'open',
      responses TEXT NOT NULL DEFAULT '[]',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY(customer_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS offers (
      id TEXT PRIMARY KEY,
      shop_id TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      discount TEXT,
      valid_till TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY(shop_id) REFERENCES shops(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS products (
      id TEXT PRIMARY KEY,
      shop_id TEXT NOT NULL,
      name TEXT NOT NULL,
      price REAL NOT NULL,
      original_price REAL,
      description TEXT,
      image_url TEXT,
      category TEXT,
      in_stock INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY(shop_id) REFERENCES shops(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_products_shop ON products(shop_id);

    CREATE TABLE IF NOT EXISTS categories (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      icon TEXT NOT NULL DEFAULT '🏷️',
      color TEXT DEFAULT '#10b981',
      description TEXT,
      sub_categories TEXT NOT NULL DEFAULT '[]',
      suggested_tags TEXT NOT NULL DEFAULT '[]',
      is_active INTEGER NOT NULL DEFAULT 1,
      display_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_categories_order ON categories(display_order);
  `);

  // Safe table migrations for existing database files
  try { db.exec('ALTER TABLE requirements ADD COLUMN target_shop_id TEXT;'); } catch (e) {}
  try { db.exec('ALTER TABLE requirements ADD COLUMN target_shop_name TEXT;'); } catch (e) {}

  seedDefaultData();
}

function seedDefaultData() {
  const now = new Date().toISOString();
  const passwordHash = bcrypt.hashSync('pass123', 10);

  // 1. Check & Create Default Users
  const userCountRow = db.prepare('SELECT COUNT(*) as count FROM users').get();
  if (!userCountRow || userCountRow.count === 0) {
    console.log('🌱 Seeding default users...');
    const users = [
      { id: 'user_admin', name: 'System Administrator', phone: '9999900000', email: 'admin@localforvocal.com', password_hash: passwordHash, account_type: 'admin', area: 'Central Market', city: 'Mumbai' },
      { id: 'user_owner_1', name: 'Rajesh Sharma', phone: '9820011111', email: 'rajesh@carepharmacy.com', password_hash: passwordHash, account_type: 'shop_owner', area: 'Andheri West', city: 'Mumbai' },
      { id: 'user_owner_2', name: 'Sunil Patil', phone: '9820022222', email: 'patil.carpentry@gmail.com', password_hash: passwordHash, account_type: 'shop_owner', area: 'Andheri West', city: 'Mumbai' },
      { id: 'user_owner_3', name: 'Anjali Gupta', phone: '9820033333', email: 'sweetdelights@gmail.com', password_hash: passwordHash, account_type: 'shop_owner', area: 'Bandra West', city: 'Mumbai' },
      { id: 'user_owner_4', name: 'Farhan Khan', phone: '9820044444', email: 'quickfix.mobiles@gmail.com', password_hash: passwordHash, account_type: 'shop_owner', area: 'Juhu', city: 'Mumbai' },
      { id: 'user_cust_1', name: 'Amit Verma', phone: '9810055555', email: 'amit.verma@example.com', password_hash: passwordHash, account_type: 'customer', area: 'Andheri West', city: 'Mumbai' }
    ];

    const insertUser = db.prepare(`INSERT OR IGNORE INTO users (id, name, phone, email, password_hash, account_type, area, city, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
    for (const u of users) {
      insertUser.run(u.id, u.name, u.phone, u.email, u.password_hash, u.account_type, u.area, u.city, now, now);
    }
  }

  // 2. Check & Create Initial Demo Shops
  const shopCountRow = db.prepare('SELECT COUNT(*) as count FROM shops').get();
  if (!shopCountRow || shopCountRow.count === 0) {
    console.log('🌱 Seeding demo shops...');
    const shops = [
      {
        id: 'shop_1',
        owner_id: 'user_owner_1',
        name: 'Care & Cure 24/7 Chemist',
        category: 'medical',
        sub_category: 'Pharmacy & Healthcare',
        owner_name: 'Rajesh Sharma',
        phone: '9820011111',
        whatsapp: '9820011111',
        address: 'Shop 4, Greenfield Plaza, Near Railway Station',
        area: 'Andheri West',
        city: 'Mumbai',
        pin: '400058',
        tags: JSON.stringify(['Medicines', 'Baby Care', 'First Aid', 'Home Delivery', 'Diabetic Care', 'BP Monitor', '24x7']),
        latitude: 19.1197,
        longitude: 72.8468,
        business_hours: JSON.stringify({ open: '00:00', close: '23:59', days: 'Mon - Sun' }),
        images: JSON.stringify(['https://images.unsplash.com/photo-1586015555751-63bb77f4322a?w=600&auto=format&fit=crop&q=80']),
        status: 'active',
        featured: 1,
        available_today: 1,
        rating: 4.9,
        total_reviews: 38,
        views: 240
      },
      {
        id: 'shop_2',
        owner_id: 'user_owner_2',
        name: 'Patil Wood Works & Furniture',
        category: 'carpenter',
        sub_category: 'Custom Woodwork & Repairs',
        owner_name: 'Sunil Patil',
        phone: '9820022222',
        whatsapp: '9820022222',
        address: 'Gala 12, Industrial Estate, SV Road',
        area: 'Andheri West',
        city: 'Mumbai',
        pin: '400058',
        tags: JSON.stringify(['Custom Sofa', 'Modular Kitchen', 'Door Fitting', 'Wardrobe', 'Wood Polish', 'Emergency Repair']),
        latitude: 19.1142,
        longitude: 72.8421,
        business_hours: JSON.stringify({ open: '09:00', close: '20:00', days: 'Mon - Sat' }),
        images: JSON.stringify(['https://images.unsplash.com/photo-1538688525198-9b88f6f53126?w=600&auto=format&fit=crop&q=80']),
        status: 'active',
        featured: 1,
        available_today: 1,
        rating: 4.8,
        total_reviews: 24,
        views: 180
      },
      {
        id: 'shop_3',
        owner_id: 'user_owner_3',
        name: 'Sweet Delights Artisan Bakery',
        category: 'food',
        sub_category: 'Bakery & Desserts',
        owner_name: 'Anjali Gupta',
        phone: '9820033333',
        whatsapp: '9820033333',
        address: '14 Chapel Road, Opp. St. John Church',
        area: 'Bandra West',
        city: 'Mumbai',
        pin: '400050',
        tags: JSON.stringify(['Fresh Bread', 'Eggless Cakes', 'Croissants', 'Birthday Cakes', 'Snacks', 'Custom Orders']),
        latitude: 19.0596,
        longitude: 72.8295,
        business_hours: JSON.stringify({ open: '08:00', close: '22:00', days: 'Mon - Sun' }),
        images: JSON.stringify(['https://images.unsplash.com/photo-1509440159596-0249088772ff?w=600&auto=format&fit=crop&q=80']),
        status: 'active',
        featured: 1,
        available_today: 1,
        rating: 4.9,
        total_reviews: 52,
        views: 310
      },
      {
        id: 'shop_4',
        owner_id: 'user_owner_4',
        name: 'QuickFix Electronics & Mobile Lab',
        category: 'electronics',
        sub_category: 'Mobile & Laptop Repair',
        owner_name: 'Farhan Khan',
        phone: '9820044444',
        whatsapp: '9820044444',
        address: 'Shop 2, Juhu Tara Road',
        area: 'Juhu',
        city: 'Mumbai',
        pin: '400049',
        tags: JSON.stringify(['Screen Replacement', 'Battery Change', 'Laptop Repair', 'Data Recovery', 'Accessories', 'Water Damage Fix']),
        latitude: 19.0988,
        longitude: 72.8267,
        business_hours: JSON.stringify({ open: '10:00', close: '21:30', days: 'Mon - Sat' }),
        images: JSON.stringify(['https://images.unsplash.com/photo-1597872200969-2b65d56bd16b?w=600&auto=format&fit=crop&q=80']),
        status: 'active',
        featured: 0,
        available_today: 1,
        rating: 4.7,
        total_reviews: 19,
        views: 145
      }
    ];

    const insertShop = db.prepare(`
      INSERT OR IGNORE INTO shops (
        id, owner_id, name, category, sub_category, owner_name, phone, whatsapp,
        address, area, city, pin, tags, latitude, longitude, business_hours, images,
        status, featured, available_today, rating, total_reviews, views, created_at, updated_at
      ) VALUES (
        ?, ?, ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?, ?, ?, ?
      )
    `);

    for (const s of shops) {
      insertShop.run(
        s.id, s.owner_id, s.name, s.category, s.sub_category, s.owner_name, s.phone, s.whatsapp,
        s.address, s.area, s.city, s.pin, s.tags, s.latitude, s.longitude, s.business_hours, s.images,
        s.status, s.featured, s.available_today, s.rating, s.total_reviews, s.views, now, now
      );
    }

    // Link shops to owners
    db.prepare('UPDATE users SET shop_id = ? WHERE id = ?').run('shop_1', 'user_owner_1');
    db.prepare('UPDATE users SET shop_id = ? WHERE id = ?').run('shop_2', 'user_owner_2');
    db.prepare('UPDATE users SET shop_id = ? WHERE id = ?').run('shop_3', 'user_owner_3');
    db.prepare('UPDATE users SET shop_id = ? WHERE id = ?').run('shop_4', 'user_owner_4');
  }

  // 3. Check & Create Sample Requirements
  const reqCountRow = db.prepare('SELECT COUNT(*) as count FROM requirements').get();
  if (!reqCountRow || reqCountRow.count === 0) {
    console.log('🌱 Seeding demo requirements...');
    const requirements = [
      {
        id: 'req_1',
        customer_id: 'user_cust_1',
        customer_name: 'Amit Verma',
        phone: '9810055555',
        title: 'Urgent Diabetic Insulin & Strip Delivery Needed',
        description: 'Looking for Lantus Solostar Pen and Accu-Chek active strips delivery tonight in Andheri West.',
        category: 'medical',
        urgency: 'urgent',
        budget: '₹1500 - ₹2000',
        radius_km: 5,
        area: 'Andheri West',
        city: 'Mumbai',
        latitude: 19.1170,
        longitude: 72.8450,
        status: 'open',
        responses: JSON.stringify([{ shopId: 'shop_1', shopName: 'Care & Cure Chemist', message: 'In stock! We can deliver within 20 mins.', at: now }])
      },
      {
        id: 'req_2',
        customer_id: 'user_cust_1',
        customer_name: 'Amit Verma',
        phone: '9810055555',
        title: 'Balcony Door Lock and Wood Trim Repair',
        description: 'Wooden balcony sliding door is stuck and lock latch is broken. Need carpenter visit this Saturday.',
        category: 'carpenter',
        urgency: 'this_week',
        budget: '₹800 - ₹1200',
        radius_km: 8,
        area: 'Andheri West',
        city: 'Mumbai',
        latitude: 19.1170,
        longitude: 72.8450,
        status: 'open',
        responses: JSON.stringify([])
      }
    ];

    const insertReq = db.prepare(`
      INSERT OR IGNORE INTO requirements (
        id, customer_id, customer_name, phone, title, description, category,
        urgency, budget, radius_km, area, city, latitude, longitude,
        status, responses, created_at, updated_at
      ) VALUES (
        ?, ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?
      )
    `);

    for (const r of requirements) {
      insertReq.run(
        r.id, r.customer_id, r.customer_name, r.phone, r.title, r.description, r.category,
        r.urgency, r.budget, r.radius_km, r.area, r.city, r.latitude, r.longitude,
        r.status, r.responses, now, now
      );
    }
  }

  // 4. Check & Create Sample Offers
  const offerCountRow = db.prepare('SELECT COUNT(*) as count FROM offers').get();
  if (!offerCountRow || offerCountRow.count === 0) {
    console.log('🌱 Seeding demo offers...');
    const offers = [
      {
        id: 'offer_1',
        shop_id: 'shop_1',
        title: 'Flat 15% OFF on Senior Citizen & Chronic Illness Prescriptions',
        description: 'Free doorstep delivery in Andheri West within 30 minutes. Valid on monthly medicine orders above ₹1000.',
        discount: '15% OFF',
        valid_till: 'This Weekend'
      },
      {
        id: 'offer_2',
        shop_id: 'shop_3',
        title: 'Happy Hour: Buy 1 Get 1 Free on Fresh Pastries & Bread',
        description: 'Visit us every evening after 7:30 PM for artisanal croissants, sourdough loaves, and eggless pastries.',
        discount: 'BOGO (Buy 1 Get 1)',
        valid_till: 'Daily 7:30 PM - 10:00 PM'
      },
      {
        id: 'offer_3',
        shop_id: 'shop_2',
        title: 'Free Home Measurement & 10% OFF on Custom Wardrobes',
        description: 'Consult Sunil Patil directly for bespoke teakwood and plywood interior woodwork.',
        discount: '10% OFF + Free Visit',
        valid_till: 'End of Month'
      }
    ];

    const insertOffer = db.prepare(`
      INSERT OR IGNORE INTO offers (id, shop_id, title, description, discount, valid_till, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    for (const o of offers) {
      insertOffer.run(o.id, o.shop_id, o.title, o.description, o.discount, o.valid_till, now);
    }
  }

  // 5. Check & Create Sample Products
  const prodCountRow = db.prepare('SELECT COUNT(*) as count FROM products').get();
  if (!prodCountRow || prodCountRow.count < 3) {
    console.log('🌱 Seeding demo products...');
    const products = [
      {
        id: 'prod_1',
        shop_id: 'shop_1',
        name: 'Digital Blood Pressure Monitor (Omron)',
        price: 1850,
        original_price: 2400,
        description: 'Fully automatic upper arm BP monitor with memory and accurate reading.',
        category: 'Medical Devices',
        image_url: 'https://images.unsplash.com/photo-1631815589968-fdb09a223b1e?w=400&auto=format&fit=crop&q=80',
        in_stock: 1
      },
      {
        id: 'prod_2',
        shop_id: 'shop_1',
        name: 'Accu-Chek Blood Glucose Test Strips (50 count)',
        price: 920,
        original_price: 1100,
        description: 'Instant blood sugar testing strips, compatible with Accu-Chek Active.',
        category: 'Diabetic Supplies',
        image_url: 'https://images.unsplash.com/photo-1628771065518-0d82f1938462?w=400&auto=format&fit=crop&q=80',
        in_stock: 1
      },
      {
        id: 'prod_3',
        shop_id: 'shop_1',
        name: 'Immunity Booster Vitamin C & Zinc Effervescent',
        price: 320,
        original_price: 450,
        description: 'Pack of 20 effervescent orange-flavored tablets for daily immunity.',
        category: 'Supplements',
        image_url: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=400&auto=format&fit=crop&q=80',
        in_stock: 1
      },
      {
        id: 'prod_4',
        shop_id: 'shop_2',
        name: 'Solid Teakwood Ergonomic Study & Work Desk',
        price: 6500,
        original_price: 8500,
        description: 'Handcrafted durable study table with 2 drawers and cable pass.',
        category: 'Custom Furniture',
        image_url: 'https://images.unsplash.com/photo-1518455027359-f3f8164ba6bd?w=400&auto=format&fit=crop&q=80',
        in_stock: 1
      },
      {
        id: 'prod_5',
        shop_id: 'shop_3',
        name: 'Belgian Dark Chocolate Truffle Cake (1 Kg)',
        price: 850,
        original_price: 1100,
        description: 'Rich Belgian ganache layered sponge cake. 100% Eggless available.',
        category: 'Cakes',
        image_url: 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=400&auto=format&fit=crop&q=80',
        in_stock: 1
      }
    ];

    const insertProd = db.prepare(`
      INSERT OR IGNORE INTO products (id, shop_id, name, price, original_price, description, category, image_url, in_stock, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (const p of products) {
      insertProd.run(p.id, p.shop_id, p.name, p.price, p.original_price, p.description, p.category, p.image_url, p.in_stock, now, now);
    }
  }

  // 6. Check & Create Default Categories
  const catCountRow = db.prepare('SELECT COUNT(*) as count FROM categories').get();
  if (!catCountRow || catCountRow.count === 0) {
    console.log('🌱 Seeding default categories...');
    const defaultCategories = [
      {
        id: 'medical',
        name: 'Medical & Healthcare',
        icon: '🏥',
        color: '#ef4444',
        description: 'Pharmacies, Clinics, Diagnostic Labs',
        sub_categories: JSON.stringify(['Pharmacy', 'Clinic / Doctor', 'Dental Care', 'Eye Care', 'Diagnostic Lab', 'Ayurvedic Medicine']),
        suggested_tags: JSON.stringify(['Medicines', 'BP Monitor', 'Diabetic Supplies', 'Baby Care', 'First Aid', 'Home Delivery', '24x7 Open']),
        display_order: 1
      },
      {
        id: 'food',
        name: 'Food & Dining',
        icon: '🍲',
        color: '#f97316',
        description: 'Tiffin Services, Restaurants, Bakeries',
        sub_categories: JSON.stringify(['Tiffin Service', 'Restaurant', 'Cafe', 'Bakery', 'Fast Food & Snacks', 'Catering']),
        suggested_tags: JSON.stringify(['Veg Thali', 'Non-Veg', 'Home Delivery', 'Breakfast', 'Lunch', 'Dinner', 'Custom Cakes', 'Fresh Snacks']),
        display_order: 2
      },
      {
        id: 'carpenter',
        name: 'Carpentry & Woodwork',
        icon: '🪚',
        color: '#854d0e',
        description: 'Custom Furniture, Repairs, Fittings',
        sub_categories: JSON.stringify(['Custom Furniture', 'Modular Kitchen', 'Doors & Windows', 'Wood Polish', 'Emergency Repair']),
        suggested_tags: JSON.stringify(['Sofa Repair', 'Wardrobe', 'Study Table', 'Bed', 'Modular Kitchen', 'Door Locks', 'Wood Polish']),
        display_order: 3
      },
      {
        id: 'goldsmith',
        name: 'Jewellery & Goldsmith',
        icon: '💍',
        color: '#eab308',
        description: 'Jewellery Making, Repair, Polishing',
        sub_categories: JSON.stringify(['Jewellery Making', 'Repair & Resizing', 'Stone Setting', 'Gold Polish & Cleaning']),
        suggested_tags: JSON.stringify(['Ring Resizing', 'Chain Repair', 'Custom Jewellery', 'Earring Repair', 'Gold Polish']),
        display_order: 4
      },
      {
        id: 'tailor',
        name: 'Tailoring & Boutique',
        icon: '✂️',
        color: '#ec4899',
        description: 'Custom Stitching, Alterations, Suits',
        sub_categories: JSON.stringify(['Ladies Tailor', 'Gents Tailor', 'Boutique & Designer', 'Alterations', 'Embroidery']),
        suggested_tags: JSON.stringify(['Blouse Stitching', 'Suit & Tuxedo', 'Kurta', 'Dress Fitting', 'Alterations', 'School Uniforms']),
        display_order: 5
      },
      {
        id: 'electronics',
        name: 'Electronics & Repair',
        icon: '📱',
        color: '#3b82f6',
        description: 'Mobile, Laptop, Appliance Service',
        sub_categories: JSON.stringify(['Mobile Screen Repair', 'Battery Change', 'Laptop Repair', 'TV & AC Repair', 'CCTV Installation']),
        suggested_tags: JSON.stringify(['iPhone Repair', 'Android Screen', 'Battery Replacement', 'Laptop Upgrade', 'CCTV Fitting', 'AC Gas Refill']),
        display_order: 6
      },
      {
        id: 'salon',
        name: 'Salon, Spa & Beauty',
        icon: '💇',
        color: '#a855f7',
        description: 'Haircut, Grooming, Bridal Makeup',
        sub_categories: JSON.stringify(['Ladies Salon', 'Gents Grooming', 'Unisex Salon', 'Spa & Massage', 'Bridal Makeup']),
        suggested_tags: JSON.stringify(['Haircut', 'Facial & Glow', 'Waxing', 'Threading', 'Hair Coloring', 'Bridal Makeup', 'Beard Styling']),
        display_order: 7
      },
      {
        id: 'grocery',
        name: 'Grocery & Daily Needs',
        icon: '🛒',
        color: '#10b981',
        description: 'Kirana, Supermarkets, Organic',
        sub_categories: JSON.stringify(['General Kirana', 'Supermarket', 'Organic & Farm Fresh', 'Dairy & Sweets']),
        suggested_tags: JSON.stringify(['Daily Groceries', 'Dairy Milk', 'Cold Drinks', 'Rice & Pulses', 'Cooking Oils', 'Home Delivery']),
        display_order: 8
      },
      {
        id: 'plumber',
        name: 'Plumbing & Electrical',
        icon: '🔧',
        color: '#06b6d4',
        description: 'Emergency Leaks, Wiring, Fittings',
        sub_categories: JSON.stringify(['Plumbing Repair', 'Electrical Wiring', 'Water Tank Cleaning', 'Bathroom Fitting', '24hr Emergency']),
        suggested_tags: JSON.stringify(['Pipe Leakage', 'Tap Fitting', 'Short Circuit Fix', 'Water Heater Repair', '24hr Emergency']),
        display_order: 9
      },
      {
        id: 'auto',
        name: 'Auto Care & Mechanic',
        icon: '🚗',
        color: '#64748b',
        description: 'Car & Bike Repair, Tyre Puncture',
        sub_categories: JSON.stringify(['Car Service', 'Bike Repair', 'Tyre Puncture & Alignment', 'Car Wash', 'Spare Parts']),
        suggested_tags: JSON.stringify(['Engine Oil Change', 'Puncture Repair', 'Brake Service', 'Foam Wash', 'Battery Jumpstart']),
        display_order: 10
      },
      {
        id: 'education',
        name: 'Tuitions & Coaching',
        icon: '📚',
        color: '#6366f1',
        description: 'School Classes, Spoken English',
        sub_categories: JSON.stringify(['School Tuition', 'Coaching Centre', 'Spoken English', 'Computer Training', 'Music Classes']),
        suggested_tags: JSON.stringify(['CBSE & SSC', 'Maths Tutor', 'Science Tutor', 'English Speaking', 'Coding Basics']),
        display_order: 11
      },
      {
        id: 'gym',
        name: 'Fitness & Gym',
        icon: '🏋️',
        color: '#14b8a6',
        description: 'Workouts, Yoga, Personal Training',
        sub_categories: JSON.stringify(['Gym & Weights', 'Yoga & Meditation', 'Zumba & Dance', 'Personal Trainer']),
        suggested_tags: JSON.stringify(['Weight Loss', 'Muscle Gain', 'Cardio', 'Morning Batches', 'Diet Consultation']),
        display_order: 12
      },
      {
        id: 'hardware',
        name: 'Hardware & Sanitary',
        icon: '🔨',
        color: '#78716c',
        description: 'Paints, Tools, Bathroom Hardware',
        sub_categories: JSON.stringify(['Hardware & Tools', 'Paint & Wall Finishes', 'Sanitary & Pipes']),
        suggested_tags: JSON.stringify(['Asian Paints', 'Drill Machine', 'Screws & Bolts', 'Bathroom Taps', 'Electrical Switches']),
        display_order: 13
      },
      {
        id: 'stationery',
        name: 'Stationery & Printing',
        icon: '📝',
        color: '#0284c7',
        description: 'Xerox, Office Supplies, Books',
        sub_categories: JSON.stringify(['Stationery & Books', 'Printing & Xerox', 'Gift Items', 'Document Binding']),
        suggested_tags: JSON.stringify(['Color Printouts', 'Spiral Binding', 'School Notebooks', 'Art Supplies', 'Lamination']),
        display_order: 14
      },
      {
        id: 'other',
        name: 'Other Local Services',
        icon: '💡',
        color: '#6b7280',
        description: 'Specialized Neighborhood Services',
        sub_categories: JSON.stringify(['General Service', 'Other Specialty']),
        suggested_tags: JSON.stringify(['Quick Service', 'Reliable', 'Neighborhood Favorite']),
        display_order: 15
      }
    ];

    const insertCat = db.prepare(`
      INSERT OR IGNORE INTO categories (id, name, icon, color, description, sub_categories, suggested_tags, is_active, display_order, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?)
    `);

    for (const c of defaultCategories) {
      insertCat.run(c.id, c.name, c.icon, c.color, c.description, c.sub_categories, c.suggested_tags, c.display_order, now, now);
    }
  }

  console.log('✅ Local SQLite database initialized with sample records, deals, products & categories!');
}



/**
 * Helper to run atomic multi-statement database operations
 * Ensures full rollback on error and prevents partial data corruption
 */
function withTransaction(fn) {
  db.exec('BEGIN IMMEDIATE;');
  try {
    const result = fn();
    db.exec('COMMIT;');
    return result;
  } catch (err) {
    try { db.exec('ROLLBACK;'); } catch (e) {}
    throw err;
  }
}

initSchema();

module.exports = { db, dbPath, safeJsonParse, withTransaction };

