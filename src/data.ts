import { SalonService, StaffMember } from "./types";

export const INITIAL_SERVICES: SalonService[] = [
  // 1. Signature Grooming
  { id: "sg1", name: "Hair Cut", price: 500, category: "Signature Grooming", durationMin: 20 },
  { id: "sg2", name: "Beard Cut", price: 500, category: "Signature Grooming", durationMin: 20 },
  { id: "sg3", name: "Normal Hair", price: 400, category: "Signature Grooming", durationMin: 15 },
  { id: "sg4", name: "Normal Beard", price: 400, category: "Signature Grooming", durationMin: 15 },
  { id: "sg5", name: "Child Hair", price: 400, category: "Signature Grooming", durationMin: 15 },
  { id: "sg6", name: "Born Child Hair", price: 2000, category: "Signature Grooming", durationMin: 30 },
  { id: "sg7", name: "Head Shave", price: 400, category: "Signature Grooming", durationMin: 20 },
  { id: "sg8", name: "Foam Shave", price: 400, category: "Signature Grooming", durationMin: 20 },
  { id: "sg9", name: "Shave", price: 300, category: "Signature Grooming", durationMin: 15 },
  { id: "sg10", name: "Hair Style", price: 400, category: "Signature Grooming", durationMin: 15 },
  { id: "sg11", name: "Hair Wash", price: 200, category: "Signature Grooming", durationMin: 10 },
  { id: "sg12", name: "Capsule", price: 200, category: "Signature Grooming", durationMin: 10 },
  { id: "sg13", name: "Nose Strip", price: 300, category: "Signature Grooming", durationMin: 10 },
  { id: "sg14", name: "Threading", price: 200, category: "Signature Grooming", durationMin: 10 },
  { id: "sg15", name: "Keratin Mask Treatment", price: 4000, category: "Signature Grooming", durationMin: 45 },
  { id: "sg16", name: "Disposable Blade", price: 200, category: "Signature Grooming", durationMin: 5 },
  { id: "sg17", name: "Hair Shiner", price: 2500, category: "Signature Grooming", durationMin: 30 },
  { id: "sg18", name: "Hair Treatment", price: 3000, category: "Signature Grooming", durationMin: 30 },
  { id: "sg19", name: "Hair Topic", price: 500, category: "Signature Grooming", durationMin: 15 },
  { id: "sg20", name: "Hair Topic with Style", price: 500, category: "Signature Grooming", durationMin: 20 },

  // 2. Premium Hair Coloring - Hair & Beard
  { id: "hc1", name: "Apple Color (Hair)", price: 1200, category: "Premium Hair Coloring", durationMin: 40 },
  { id: "hc2", name: "Apple Color (Beard)", price: 800, category: "Premium Hair Coloring", durationMin: 30 },
  { id: "hc3", name: "Just For Men (Hair)", price: 2500, category: "Premium Hair Coloring", durationMin: 35 },
  { id: "hc4", name: "Just For Men (Beard)", price: 1800, category: "Premium Hair Coloring", durationMin: 25 },
  { id: "hc5", name: "Easy Color (Hair)", price: 1200, category: "Premium Hair Coloring", durationMin: 30 },
  { id: "hc6", name: "Easy Color (Beard)", price: 800, category: "Premium Hair Coloring", durationMin: 25 },
  { id: "hc7", name: "Keune Color (Hair)", price: 2000, category: "Premium Hair Coloring", durationMin: 40 },
  { id: "hc8", name: "Keune Color (Beard)", price: 1500, category: "Premium Hair Coloring", durationMin: 30 },
  { id: "hc9", name: "Revlon Color (Hair)", price: 1500, category: "Premium Hair Coloring", durationMin: 40 },
  { id: "hc10", name: "Revlon Color (Beard)", price: 1000, category: "Premium Hair Coloring", durationMin: 30 },
  { id: "hc11", name: "Garnier Color (Hair)", price: 1200, category: "Premium Hair Coloring", durationMin: 40 },
  { id: "hc12", name: "Garnier Color (Beard)", price: 800, category: "Premium Hair Coloring", durationMin: 30 },
  { id: "hc13", name: "Godrich Color (Hair)", price: 1000, category: "Premium Hair Coloring", durationMin: 40 },
  { id: "hc14", name: "Godrich Color (Beard)", price: 800, category: "Premium Hair Coloring", durationMin: 30 },
  { id: "hc15", name: "Color Appling (Hair)", price: 500, category: "Premium Hair Coloring", durationMin: 20 },
  { id: "hc16", name: "Color Appling (Beard)", price: 300, category: "Premium Hair Coloring", durationMin: 15 },
  { id: "hc17", name: "Cutdown Shade Hair", price: 5000, category: "Premium Hair Coloring", durationMin: 60 },
  { id: "hc18", name: "Cutdown with Color (5 to 6)", price: 10000, category: "Premium Hair Coloring", durationMin: 90 },
  { id: "hc19", name: "Cutdown with Color (8 to 10)", price: 20000, category: "Premium Hair Coloring", durationMin: 120 },

  // 3. Professional Medicated Service
  { id: "pms1", name: "Pedicure (Medicated)", price: 2500, category: "Professional Medicated", durationMin: 45 },
  { id: "pms2", name: "Menicure (Medicated)", price: 1500, category: "Professional Medicated", durationMin: 35 },
  { id: "pms3", name: "Nail Treatment", price: 1200, category: "Professional Medicated", durationMin: 25 },
  { id: "pms4", name: "Nail Fungus", price: 1200, category: "Professional Medicated", durationMin: 20 },
  { id: "pms5", name: "Ingrown Toe Nail", price: 1200, category: "Professional Medicated", durationMin: 30 },
  { id: "pms6", name: "Corn & Callus", price: 1200, category: "Professional Medicated", durationMin: 30 },
  { id: "pms7", name: "Warts Treatment", price: 1200, category: "Professional Medicated", durationMin: 20 },
  { id: "pms8", name: "Relaxing Foot Massage", price: 1800, category: "Professional Medicated", durationMin: 30 },
  { id: "pms9", name: "Relaxing Hand Massage", price: 1800, category: "Professional Medicated", durationMin: 30 },
  { id: "pms10", name: "Whitening Skin Polish (Medicated)", price: 1000, category: "Professional Medicated", durationMin: 25 },

  // 4. Luxury Skin Treatment
  { id: "lst1", name: "Herbal Whitening (Full)", price: 3000, category: "Luxury Skin Treatment", durationMin: 45 },
  { id: "lst2", name: "Herbal Whitening (Half)", price: 1500, category: "Luxury Skin Treatment", durationMin: 25 },
  { id: "lst3", name: "Shade Out (Full)", price: 3000, category: "Luxury Skin Treatment", durationMin: 45 },
  { id: "lst4", name: "Shade Out (Half)", price: 1500, category: "Luxury Skin Treatment", durationMin: 25 },
  { id: "lst5", name: "Vibrant (Full)", price: 4000, category: "Luxury Skin Treatment", durationMin: 50 },
  { id: "lst6", name: "Vibrant (Half)", price: 2000, category: "Luxury Skin Treatment", durationMin: 30 },
  { id: "lst7", name: "Darmacos (Full)", price: 5000, category: "Luxury Skin Treatment", durationMin: 60 },
  { id: "lst8", name: "Darmacos (Half)", price: 2500, category: "Luxury Skin Treatment", durationMin: 30 },
  { id: "lst9", name: "Darma Shine (Full)", price: 7000, category: "Luxury Skin Treatment", durationMin: 60 },
  { id: "lst10", name: "Darma Shine (Half)", price: 3500, category: "Luxury Skin Treatment", durationMin: 30 },
  { id: "lst11", name: "Johnson (Full)", price: 7000, category: "Luxury Skin Treatment", durationMin: 60 },
  { id: "lst12", name: "Johnson (Half)", price: 3500, category: "Luxury Skin Treatment", durationMin: 30 },
  { id: "lst13", name: "Silky Cool (Full)", price: 8000, category: "Luxury Skin Treatment", durationMin: 60 },
  { id: "lst14", name: "Silky Cool (Half)", price: 4000, category: "Luxury Skin Treatment", durationMin: 30 },
  { id: "lst15", name: "Bloome Natural (Full)", price: 8000, category: "Luxury Skin Treatment", durationMin: 60 },
  { id: "lst16", name: "Bloome Natural (Half)", price: 4000, category: "Luxury Skin Treatment", durationMin: 30 },
  { id: "lst17", name: "Black Mask", price: 500, category: "Luxury Skin Treatment", durationMin: 20 },
  { id: "lst18", name: "Facial Mask", price: 500, category: "Luxury Skin Treatment", durationMin: 20 },
  { id: "lst19", name: "Face Wash", price: 300, category: "Luxury Skin Treatment", durationMin: 10 },
  { id: "lst20", name: "Golden Mask", price: 500, category: "Luxury Skin Treatment", durationMin: 20 },
  { id: "lst21", name: "Clay Mask", price: 500, category: "Luxury Skin Treatment", durationMin: 25 },
  { id: "lst22", name: "Face Mask", price: 500, category: "Luxury Skin Treatment", durationMin: 20 },
  { id: "lst23", name: "Gold Jelly Mask", price: 800, category: "Luxury Skin Treatment", durationMin: 25 },
  { id: "lst24", name: "Whitening Skin Polish", price: 1000, category: "Luxury Skin Treatment", durationMin: 25 },

  // 5. Advance Hair Treatment
  { id: "aht1", name: "Keratin 4 to 5 Inch", price: 7000, category: "Advance Hair Treatment", durationMin: 90 },
  { id: "aht2", name: "Keratin 7 to 8 Inch", price: 10000, category: "Advance Hair Treatment", durationMin: 120 },
  { id: "aht3", name: "Keratin 10 to 12 Inch", price: 15000, category: "Advance Hair Treatment", durationMin: 150 },
  { id: "aht4", name: "Curly 4 to 5", price: 5000, category: "Advance Hair Treatment", durationMin: 90 },
  { id: "aht5", name: "Curly 7 to 8", price: 10000, category: "Advance Hair Treatment", durationMin: 120 },
  { id: "aht6", name: "Curly 10 to 12", price: 15000, category: "Advance Hair Treatment", durationMin: 150 },
  { id: "aht7", name: "Hair Rebounding", price: 8000, category: "Advance Hair Treatment", durationMin: 120 },

  // 6. Professional Waxing Services
  { id: "pws1", name: "Forehead Wax", price: 200, category: "Professional Waxing", durationMin: 10 },
  { id: "pws2", name: "Nose Wax", price: 200, category: "Professional Waxing", durationMin: 5 },
  { id: "pws3", name: "Ear Wax", price: 200, category: "Professional Waxing", durationMin: 5 },
  { id: "pws4", name: "Cheek Wax", price: 400, category: "Professional Waxing", durationMin: 10 },
  { id: "pws5", name: "Under Chin Wax", price: 400, category: "Professional Waxing", durationMin: 10 },
  { id: "pws6", name: "Foot Wax", price: 500, category: "Professional Waxing", durationMin: 15 },
  { id: "pws7", name: "Armpit Wax", price: 800, category: "Professional Waxing", durationMin: 15 },
  { id: "pws8", name: "Neck Wax", price: 800, category: "Professional Waxing", durationMin: 15 },
  { id: "pws9", name: "Full Face Wax", price: 3000, category: "Professional Waxing", durationMin: 30 },
  { id: "pws10", name: "Leg Wax", price: 3000, category: "Professional Waxing", durationMin: 35 },
  { id: "pws11", name: "Arm Wax", price: 3000, category: "Professional Waxing", durationMin: 30 },
  { id: "pws12", name: "Full Body Wax", price: 15000, category: "Professional Waxing", durationMin: 90 },

  // 7. Relaxing Massage
  { id: "rm1", name: "Head Massage", price: 600, category: "Relaxing Massage", durationMin: 30 },
  { id: "rm2", name: "Shoulder Massage", price: 600, category: "Relaxing Massage", durationMin: 30 },
  { id: "rm3", name: "Foot Massage", price: 1800, category: "Relaxing Massage", durationMin: 30 },
  { id: "rm4", name: "Hand Massage", price: 1800, category: "Relaxing Massage", durationMin: 30 }
];

export const INITIAL_STAFF: StaffMember[] = [
  { id: "st1", name: "Bilal Ahmed", phone: "03001234567", role: "Senior Stylist", joinedDate: "2025-01-15", status: "active" },
  { id: "st2", name: "Sarah Khan", phone: "03129876543", role: "Skin Specialist", joinedDate: "2025-02-10", status: "active" },
  { id: "st3", name: "Muhammad Ali", phone: "03214567890", role: "Barber & Stylist", joinedDate: "2025-03-01", status: "active" },
  { id: "st4", name: "Ayesha Noor", phone: "03331122334", role: "Nail Artist & Makeup", joinedDate: "2025-04-05", status: "active" }
];

export const INITIAL_LEAVES = [
  { id: "l1", staffId: "st1", staffName: "Bilal Ahmed", startDate: "2026-06-10", endDate: "2026-06-12", totalDays: 3, reason: "Ghar ka zaroori kaam", type: "casual" },
  { id: "l2", staffId: "st2", staffName: "Sarah Khan", startDate: "2026-06-15", endDate: "2026-06-15", totalDays: 1, reason: "Bimar (Fever)", type: "sick" },
  { id: "l3", staffId: "st3", staffName: "Muhammad Ali", startDate: "2026-06-25", endDate: "2026-06-26", totalDays: 2, reason: "Out of city travel", type: "unpaid" }
];

export const INITIAL_BOOKINGS = [
  {
    id: "b1",
    clientName: "Kamran Shah",
    clientPhone: "03456789123",
    bookingType: "walk_in",
    services: [INITIAL_SERVICES[0], INITIAL_SERVICES[1]], // Hair Cut + Beard Cut
    staffId: "st1",
    staffName: "Bilal Ahmed",
    totalAmount: 1000,
    paymentMethod: "cash",
    paymentStatus: "paid",
    status: "completed",
    date: "2026-07-01",
    time: "11:30",
    createdAt: "2026-07-01T11:30:00Z"
  },
  {
    id: "b2",
    clientName: "Zainab Malik",
    clientPhone: "03009876541",
    bookingType: "appointment",
    services: [INITIAL_SERVICES[20], INITIAL_SERVICES[40]], // Apple Color + Pedicure
    staffId: "st2",
    staffName: "Sarah Khan",
    totalAmount: 3700,
    paymentMethod: "easypaisa",
    paymentStatus: "paid",
    status: "completed",
    date: "2026-07-01",
    time: "14:00",
    createdAt: "2026-07-01T14:00:00Z"
  }
];
