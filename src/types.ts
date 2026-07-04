export interface StaffMember {
  id: string;
  name: string;
  phone: string;
  role: string;
  joinedDate: string;
  status: "active" | "inactive";
  startTime?: string; // Expected arrival time, e.g. "10:00" (24h format)
  endTime?: string; // Expected shift end time, e.g. "00:00" or "23:00" (24h format)
  lateNight20Enabled?: boolean; // Whether 20% late night duty commission is enabled
  facial15Enabled?: boolean; // Whether 15% special facial (>1500) commission is enabled
}

export interface StaffLeave {
  id: string;
  staffId: string;
  staffName: string;
  startDate: string;
  endDate: string;
  totalDays: number;
  reason: string;
  type: "sick" | "casual" | "unpaid" | "absent";
}

export interface SalonService {
  id: string;
  name: string;
  price: number;
  category: string;
  durationMin: number; // e.g. 30, 45, 60 mins
}

export interface Booking {
  id: string;
  clientName: string;
  clientPhone: string;
  bookingType: "walk_in" | "appointment" | "online";
  services: SalonService[];
  products?: Product[]; // Optional list of products sold/used
  staffId: string;
  staffName: string;
  totalAmount: number;
  discount?: number; // Discount given in Rs.
  tip?: number; // Tip received in Rs.
  subtotal?: number; // Total before discount & tip
  amountPaid?: number; // Amount paid/received from the client in Rs.
  paymentMethod: "cash" | "easypaisa" | "jazzcash" | "bank_transfer" | "online";
  paymentStatus: "paid" | "unpaid";
  status: "completed" | "pending" | "cancelled";
  date: string; // YYYY-MM-DD
  time: string; // HH:MM
  salonTime?: string; // Specific timing for salon services
  pedicureTime?: string; // Specific timing for pedicure services
  createdAt: string; // ISO string
}

export interface MonthlyArchive {
  id: string; // e.g. "2026-07"
  monthName: string; // e.g. "July 2026"
  totalRevenue: number;
  totalBookings: number;
  totalCommission: number;
  savedAt: string;
  staffCommissions: {
    staffId: string;
    staffName: string;
    sales: number;
    commission: number;
    bookingsCount: number;
  }[];
  paymentMethodsSplit: {
    name: string;
    value: number;
  }[];
}

export interface Expense {
  id: string;
  title: string;
  amount: number;
  date: string; // YYYY-MM-DD
  category: "supplies" | "rent" | "utilities" | "tea_food" | "salary_bonus" | "marketing" | "other";
  description: string;
}

export interface Product {
  id: string;
  name: string;
  price: number; // Sale price
  costPrice: number; // Purchase price (for margin/profit analysis if needed)
  stock: number;
  category: string;
}

export interface ProductSale {
  id: string;
  productId: string;
  productName: string;
  price: number;
  quantity: number;
  totalAmount: number;
  staffId: string;
  staffName: string;
  date: string; // YYYY-MM-DD
  createdAt: string;
}

export interface KhataAccount {
  id: string; // client phone or custom ID
  name: string;
  type: "client" | "staff";
  phone: string;
  balance: number; // Positive means they owe us (client bakaya), negative means we owe them / advance taken (staff balance)
  lastUpdated: string;
}

export interface KhataLog {
  id: string;
  accountId: string;
  accountName: string;
  amount: number; // amount of transaction
  type: "credit" | "debit"; // credit = they paid, debit = they took service/product on loan
  description: string;
  date: string;
  createdAt: string;
}

export type ActiveTab = "dashboard" | "pos" | "staff" | "leaves" | "bookings" | "payments" | "services" | "monthly_archives" | "expenses" | "khata" | "products";

export interface StaffAttendance {
  id: string;
  staffId: string;
  staffName: string;
  date: string; // YYYY-MM-DD
  checkIn: string; // e.g. "10:15"
  checkOut?: string | null; // e.g. "18:00" or null
  status: "on_time" | "late" | "present" | "absent";
  punctualityMinutes?: number; // minutes after reference arrival time (e.g., 10:00 AM)
  notes?: string;
}

export interface ShopTiming {
  id: string; // YYYY-MM-DD
  date: string;
  openTime: string; // e.g. "09:30"
  closeTime?: string; // e.g. "21:00"
  notes?: string;
}

