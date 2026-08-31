export const CATEGORIES = [
  { id: 'all', name: 'All Categories', icon: '✨' },
  { id: 'medical', name: 'Medical & Healthcare', icon: '🏥', color: '#ef4444', desc: 'Pharmacies, Clinics, Diagnostic Labs' },
  { id: 'food', name: 'Food & Dining', icon: '🍲', color: '#f97316', desc: 'Tiffin Services, Restaurants, Bakeries' },
  { id: 'carpenter', name: 'Carpentry & Woodwork', icon: '🪚', color: '#854d0e', desc: 'Custom Furniture, Repairs, Fittings' },
  { id: 'goldsmith', name: 'Jewellery & Goldsmith', icon: '💍', color: '#eab308', desc: 'Jewellery Making, Repair, Polishing' },
  { id: 'tailor', name: 'Tailoring & Boutique', icon: '✂️', color: '#ec4899', desc: 'Custom Stitching, Alterations, Suits' },
  { id: 'electronics', name: 'Electronics & Repair', icon: '📱', color: '#3b82f6', desc: 'Mobile, Laptop, Appliance Service' },
  { id: 'salon', name: 'Salon, Spa & Beauty', icon: '💇', color: '#a855f7', desc: 'Haircut, Grooming, Bridal Makeup' },
  { id: 'grocery', name: 'Grocery & Daily Needs', icon: '🛒', color: '#10b981', desc: 'Kirana, Supermarkets, Organic' },
  { id: 'plumber', name: 'Plumbing & Electrical', icon: '🔧', color: '#06b6d4', desc: 'Emergency Leaks, Wiring, Fittings' },
  { id: 'auto', name: 'Auto Care & Mechanic', icon: '🚗', color: '#64748b', desc: 'Car & Bike Repair, Tyre Puncture' },
  { id: 'education', name: 'Tuitions & Coaching', icon: '📚', color: '#6366f1', desc: 'School Classes, Spoken English' },
  { id: 'gym', name: 'Fitness & Gym', icon: '🏋️', color: '#14b8a6', desc: 'Workouts, Yoga, Personal Training' },
  { id: 'hardware', name: 'Hardware & Sanitary', icon: '🔨', color: '#78716c', desc: 'Paints, Tools, Bathroom Hardware' },
  { id: 'stationery', name: 'Stationery & Printing', icon: '📝', color: '#0284c7', desc: 'Xerox, Office Supplies, Books' },
  { id: 'other', name: 'Other Local Services', icon: '💡', color: '#6b7280', desc: 'Specialized Neighborhood Services' }
];

export const SUB_CATEGORIES = {
  medical: ['Pharmacy', 'Clinic / Doctor', 'Dental Care', 'Eye Care', 'Diagnostic Lab', 'Ayurvedic Medicine'],
  food: ['Tiffin Service', 'Restaurant', 'Cafe', 'Bakery', 'Fast Food & Snacks', 'Catering'],
  carpenter: ['Custom Furniture', 'Modular Kitchen', 'Doors & Windows', 'Wood Polish', 'Emergency Repair'],
  goldsmith: ['Jewellery Making', 'Repair & Resizing', 'Stone Setting', 'Gold Polish & Cleaning'],
  tailor: ['Ladies Tailor', 'Gents Tailor', 'Boutique & Designer', 'Alterations', 'Embroidery'],
  electronics: ['Mobile Screen Repair', 'Battery Change', 'Laptop Repair', 'TV & AC Repair', 'CCTV Installation'],
  salon: ['Ladies Salon', 'Gents Grooming', 'Unisex Salon', 'Spa & Massage', 'Bridal Makeup'],
  grocery: ['General Kirana', 'Supermarket', 'Organic & Farm Fresh', 'Dairy & Sweets'],
  plumber: ['Plumbing Repair', 'Electrical Wiring', 'Water Tank Cleaning', 'Bathroom Fitting', '24hr Emergency'],
  auto: ['Car Service', 'Bike Repair', 'Tyre Puncture & Alignment', 'Car Wash', 'Spare Parts'],
  education: ['School Tuition', 'Coaching Centre', 'Spoken English', 'Computer Training', 'Music Classes'],
  gym: ['Gym & Weights', 'Yoga & Meditation', 'Zumba & Dance', 'Personal Trainer'],
  hardware: ['Hardware & Tools', 'Paint & Wall Finishes', 'Sanitary & Pipes'],
  stationery: ['Stationery & Books', 'Printing & Xerox', 'Gift Items', 'Document Binding'],
  other: ['General Service', 'Other Specialty']
};

export const SUGGESTED_TAGS = {
  medical: ['Medicines', 'BP Monitor', 'Diabetic Supplies', 'Baby Care', 'First Aid', 'Home Delivery', '24x7 Open'],
  food: ['Veg Thali', 'Non-Veg', 'Home Delivery', 'Breakfast', 'Lunch', 'Dinner', 'Custom Cakes', 'Fresh Snacks'],
  carpenter: ['Sofa Repair', 'Wardrobe', 'Study Table', 'Bed', 'Modular Kitchen', 'Door Locks', 'Wood Polish'],
  goldsmith: ['Ring Resizing', 'Chain Repair', 'Custom Jewellery', 'Earring Repair', 'Gold Polish'],
  tailor: ['Blouse Stitching', 'Suit & Tuxedo', 'Kurta', 'Dress Fitting', 'Alterations', 'School Uniforms'],
  electronics: ['iPhone Repair', 'Android Screen', 'Battery Replacement', 'Laptop Upgrade', 'CCTV Fitting', 'AC Gas Refill'],
  salon: ['Haircut', 'Facial & Glow', 'Waxing', 'Threading', 'Hair Coloring', 'Bridal Makeup', 'Beard Styling'],
  grocery: ['Daily Groceries', 'Dairy Milk', 'Cold Drinks', 'Rice & Pulses', 'Cooking Oils', 'Home Delivery'],
  plumber: ['Pipe Leakage', 'Tap Fitting', 'Short Circuit Fix', 'Water Heater Repair', '24hr Emergency'],
  auto: ['Engine Oil Change', 'Puncture Repair', 'Brake Service', 'Foam Wash', 'Battery Jumpstart'],
  education: ['CBSE & SSC', 'Maths Tutor', 'Science Tutor', 'English Speaking', 'Coding Basics'],
  gym: ['Weight Loss', 'Muscle Gain', 'Cardio', 'Morning Batches', 'Diet Consultation'],
  hardware: ['Asian Paints', 'Drill Machine', 'Screws & Bolts', 'Bathroom Taps', 'Electrical Switches'],
  stationery: ['Color Printouts', 'Spiral Binding', 'School Notebooks', 'Art Supplies', 'Lamination'],
  other: ['Quick Service', 'Reliable', 'Neighborhood Favorite']
};

export const DEFAULT_COORDINATES = {
  lat: 19.1136,
  lng: 72.8697,
  area: 'Andheri West',
  city: 'Mumbai'
};
