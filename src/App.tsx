import React, { useEffect, useState } from "react";
import { 
  getServices, 
  getStaff, 
  getLeaves, 
  getBookings, 
  seedDatabaseIfEmpty,
  clearAllDatabase,
  getMonthlyArchives,
  getProducts,
  getShopTimings
} from "./firebaseService";
import { SalonService, StaffMember, StaffLeave, Booking, ActiveTab, MonthlyArchive, Product, ShopTiming } from "./types";
import DashboardOverview from "./components/DashboardOverview";
import PosBilling from "./components/PosBilling";
import StaffManagement from "./components/StaffManagement";
import LeaveTracker from "./components/LeaveTracker";
import BookingsList from "./components/BookingsList";
import ServicesConfig from "./components/ServicesConfig";
import ExpensesConfig from "./components/ExpensesConfig";
import ProductsManager from "./components/ProductsManager";
import KhataBook from "./components/KhataBook";
import Login from "./components/Login";
import { auth } from "./firebase";
import { onAuthStateChanged, signOut, User } from "firebase/auth";
import { motion, AnimatePresence } from "motion/react";
import { 
  Sparkles, 
  Users, 
  Calendar, 
  Clock, 
  CreditCard, 
  Settings, 
  Scissors, 
  LayoutDashboard, 
  RefreshCw, 
  TrendingUp, 
  Flame, 
  Trash2, 
  RotateCcw,
  Receipt,
  Package,
  BookOpen,
  LogOut,
  UserCheck
} from "lucide-react";

export default function App() {
  // Authentication states
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  // Application Datasets State
  const [services, setServices] = useState<SalonService[]>([]);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [leaves, setLeaves] = useState<StaffLeave[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [monthlyArchives, setMonthlyArchives] = useState<MonthlyArchive[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [todayShopTiming, setTodayShopTiming] = useState<ShopTiming | null>(null);

  // Navigation state
  const [activeTab, setActiveTab] = useState<ActiveTab>("dashboard");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isPreventSeeding, setIsPreventSeeding] = useState(() => localStorage.getItem("smartsalon_prevent_seeding") === "true");

  // Time state
  const [currentTime, setCurrentTime] = useState("");

  const handleFreshStart = async () => {
    const confirmation = window.confirm(
      "Kiya aap waqai database ko bilkul EMPTY (Khali) karna chahte hain?\n\nIs se saari purani services, staff, bookings, leaves aur monthly saved records delete ho jayengi, aur aap bilkul zero se apna saara custom data khud add kar sakenge."
    );
    if (!confirmation) return;

    setRefreshing(true);
    try {
      await clearAllDatabase();
      setServices([]);
      setStaff([]);
      setLeaves([]);
      setBookings([]);
      setMonthlyArchives([]);
      setIsPreventSeeding(true);
      alert("Database kamyabi se saaf ho gaya hai! Ab aap bilkul fresh shuruwat kar sakte hain.");
    } catch (err) {
      console.error(err);
      alert("Data clear karte hue error aya.");
    } finally {
      setRefreshing(false);
    }
  };

  const handleRestoreSeededData = async () => {
    const confirmation = window.confirm(
      "Kiya aap waqai official default menu card aur expert staff list ko restore karna chahte hain?"
    );
    if (!confirmation) return;

    setRefreshing(true);
    try {
      localStorage.removeItem("smartsalon_prevent_seeding");
      setIsPreventSeeding(false);
      // Wait a moment for state/storage sync
      await new Promise(resolve => setTimeout(resolve, 100));
      await loadData();
      alert("Official default data kamyabi se restore ho gaya hai.");
    } catch (err) {
      console.error(err);
      alert("Restore karte hue error aya.");
    } finally {
      setRefreshing(false);
    }
  };

  // Synchronize database and state
  const loadData = async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    else setRefreshing(true);

    try {
      // 1. Seed if empty
      await seedDatabaseIfEmpty();

      // 2. Fetch everything
      const [allServices, allStaff, allLeaves, allBookings, allArchives, allProducts, allShopTimings] = await Promise.all([
        getServices(),
        getStaff(),
        getLeaves(),
        getBookings(),
        getMonthlyArchives(),
        getProducts(),
        getShopTimings()
      ]);

      setServices(allServices);
      setStaff(allStaff);
      setLeaves(allLeaves);
      setBookings(allBookings);
      setMonthlyArchives(allArchives);
      setProducts(allProducts);

      const todayStr = new Date().toISOString().split('T')[0];
      const foundTodayTiming = allShopTimings.find(t => t.date === todayStr);
      setTodayShopTiming(foundTodayTiming || null);

    } catch (error) {
      console.error("Error loading application data:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    // Listen to Firebase Auth changes
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthLoading(false);
      if (currentUser) {
        loadData();
      }
    });

    // Setup digital clock
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString("en-US", { hour12: true, hour: "2-digit", minute: "2-digit", second: "2-digit" }));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);

    return () => {
      unsubscribe();
      clearInterval(interval);
    };
  }, []);

  // Tabs layout metadata
  const tabMetadata = [
    { id: "dashboard", label: "Dashboard Overview", icon: LayoutDashboard, color: "text-amber-400 bg-amber-500/10" },
    { id: "pos", label: "Billing & POS Sale", icon: CreditCard, color: "text-emerald-400 bg-emerald-500/10" },
    { id: "staff", label: "Staff & Performance", icon: Users, color: "text-blue-400 bg-blue-500/10" },
    { id: "leaves", label: "Chotti / Leaves Tracker", icon: Calendar, color: "text-rose-400 bg-rose-500/10" },
    { id: "bookings", label: "Bookings Ledger", icon: TrendingUp, color: "text-purple-400 bg-purple-500/10" },
    { id: "services", label: "Services Menu", icon: Scissors, color: "text-pink-400 bg-pink-500/10" },
    { id: "expenses", label: "Daily Expenses (Kharcha)", icon: Receipt, color: "text-red-400 bg-red-500/10" },
    { id: "khata", label: "Khata Book (Bakaya)", icon: BookOpen, color: "text-amber-400 bg-amber-500/10" },
    { id: "products", label: "Products & Sales", icon: Package, color: "text-teal-400 bg-teal-500/10" }
  ] as const;

  const isShopClosed = !!(todayShopTiming && todayShopTiming.closeTime);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#070b13] flex flex-col items-center justify-center space-y-4">
        <div className="relative">
          <div className="w-14 h-14 border-4 border-amber-500/20 border-t-amber-500 rounded-full animate-spin"></div>
          <Flame size={20} className="absolute inset-0 m-auto text-amber-500 animate-pulse" />
        </div>
        <div className="text-center space-y-1">
          <span className="text-sm font-extrabold text-white block tracking-wide uppercase">Smart Salon 33 Secure Core</span>
          <p className="text-xs text-slate-400 font-medium">Checking authorization status... Thora sabar karein.</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  return (
    <div className={`min-h-screen bg-[#070b13] text-slate-100 flex flex-col font-sans transition-all duration-[2000ms] ease-in-out ${
      isShopClosed 
        ? "grayscale-[0.65] brightness-[0.45] saturate-[0.4] contrast-[0.9] [text-shadow:0_0_8px_rgba(251,191,36,0.1)]" 
        : ""
    }`}>
      {isShopClosed && (
        <div className="bg-amber-500/10 border-b border-amber-500/20 px-4 py-2 text-center text-xs font-bold text-amber-400 flex items-center justify-center gap-2 animate-pulse sticky top-14 z-30 backdrop-blur">
          <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping"></span>
          <span>⚡ Emergency Power Backup Active • Dukan Band (Closed) Hai • Dashboard par "Slide to Re-Open" karne se main light wapis on hogi! 💡</span>
        </div>
      )}
      {/* Header bar */}
      <header className="border-b border-slate-900 bg-slate-950/60 backdrop-blur-md sticky top-0 z-40 px-4 py-3 sm:px-6">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          {/* Logo */}
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-500 to-amber-600 flex items-center justify-center text-slate-950 font-black text-lg shadow-md shadow-amber-500/20">
              33
            </div>
            <div>
              <span className="text-sm font-black text-white block tracking-wide uppercase leading-none">Smart Salon 33</span>
              <span className="text-[10px] text-amber-500 font-bold block mt-0.5 tracking-widest uppercase">Admin Desk</span>
            </div>
          </div>

          {/* Clock, Sync & Active Alerts */}
          <div className="flex items-center gap-3.5 sm:gap-6">
            {/* Live digital Clock */}
            <div className="hidden sm:flex items-center gap-2 bg-slate-900 border border-slate-800/80 px-3.5 py-1.5 rounded-xl text-xs font-semibold text-slate-300">
              <Clock size={13} className="text-amber-500 animate-pulse" />
              <span className="font-mono">{currentTime}</span>
            </div>

            {/* Manual Sync Button */}
            <button
              onClick={() => loadData(true)}
              disabled={refreshing}
              className="flex items-center gap-1.5 text-[11px] text-slate-400 bg-slate-900 hover:bg-slate-850 hover:text-white px-3 py-1.5 border border-slate-800/80 rounded-xl transition duration-150 font-medium active:scale-95 disabled:opacity-50"
              title="Refresh database collections"
            >
              <RefreshCw size={11} className={`${refreshing ? "animate-spin" : ""}`} />
              <span>{refreshing ? "Syncing..." : "Sync Data"}</span>
            </button>

            {/* Fresh Start button */}
            <button
              onClick={handleFreshStart}
              disabled={refreshing}
              className="flex items-center gap-1.5 text-[11px] text-rose-400 bg-rose-950/20 hover:bg-rose-950/40 hover:text-rose-300 px-3 py-1.5 border border-rose-900/30 rounded-xl transition duration-150 font-bold active:scale-95 disabled:opacity-50"
              title="Sab data clear karke bilkul fresh start karein"
            >
              <Trash2 size={11} />
              <span>Fresh Start (Khali Karein)</span>
            </button>

            {/* Restore Seeded Data button */}
            {isPreventSeeding && (
              <button
                onClick={handleRestoreSeededData}
                disabled={refreshing}
                className="flex items-center gap-1.5 text-[11px] text-emerald-400 bg-emerald-950/20 hover:bg-emerald-950/40 hover:text-emerald-300 px-3 py-1.5 border border-emerald-900/30 rounded-xl transition duration-150 font-bold active:scale-95 disabled:opacity-50"
                title="Official baseline values restore karein"
              >
                <RotateCcw size={11} />
                <span>Restore Default</span>
              </button>
            )}

            {/* User Session Profile & Log Out */}
            {user && (
              <div className="flex items-center gap-2 border-l border-slate-800/80 pl-3.5 sm:pl-6">
                <div className="hidden md:flex flex-col items-end text-right leading-tight select-none">
                  <span className="text-[10px] text-slate-300 font-bold max-w-[120px] truncate" title={user.email || ""}>
                    {user.displayName || user.email?.split("@")[0] || "User"}
                  </span>
                  <span className="text-[8px] text-amber-500 font-mono tracking-wider font-extrabold">AUTHENTICATED</span>
                </div>
                <button
                  onClick={() => signOut(auth)}
                  className="p-2 text-rose-400 bg-rose-950/10 hover:bg-rose-900/20 border border-rose-900/20 rounded-xl transition duration-150 font-bold active:scale-95 flex items-center justify-center gap-1 text-[11px] cursor-pointer"
                  title="Sign out of the system safely"
                >
                  <LogOut size={13} />
                  <span className="hidden sm:inline">Log Out</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Container */}
      <div className="max-w-7xl w-full mx-auto p-4 sm:p-6 flex-grow flex flex-col lg:flex-row gap-6">
        {/* Navigation Sidebar (Vertical left-hand menu on desktop, horizontal scroll on mobile) */}
        <nav className="w-full lg:w-64 flex-shrink-0 flex lg:flex-col overflow-x-auto lg:overflow-x-visible gap-2 border-b lg:border-b-0 lg:border-r border-slate-900/60 pb-3 lg:pb-0 lg:pr-4 scrollbar-none lg:sticky lg:top-24 lg:self-start lg:max-h-[calc(100vh-8rem)] lg:overflow-y-auto">
          {tabMetadata.map(tab => {
            const IconComponent = tab.icon;
            const isSelected = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as ActiveTab)}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold transition duration-200 whitespace-nowrap lg:whitespace-normal w-auto lg:w-full select-none ${
                  isSelected
                    ? "bg-gradient-to-r from-amber-500/10 to-amber-500/5 border border-amber-500/30 text-amber-400 shadow-md shadow-amber-500/5"
                    : "border border-transparent hover:border-slate-800 hover:bg-slate-900/40 text-slate-400 hover:text-slate-200"
                }`}
              >
                <div className={`p-1.5 rounded-lg ${tab.color} flex items-center justify-center`}>
                  <IconComponent size={14} />
                </div>
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Content Panel Area */}
        <main className="flex-grow min-w-0" id="main-content-panel">
          {loading ? (
            <div className="flex-grow flex flex-col items-center justify-center py-24 space-y-4">
              <div className="relative">
                <div className="w-12 h-12 border-4 border-amber-500/20 border-t-amber-500 rounded-full animate-spin"></div>
                <Flame size={16} className="absolute inset-0 m-auto text-amber-500 animate-pulse" />
              </div>
              <div className="text-center space-y-1">
                <span className="text-xs font-bold text-slate-300 block">Smart Salon 33 Engine Booting...</span>
                <p className="text-[10px] text-slate-500">Firebase database load aur connection check kiya ja raha hai.</p>
              </div>
            </div>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.15 }}
              className="w-full"
            >
              {activeTab === "dashboard" && (
                <DashboardOverview
                  bookings={bookings}
                  staff={staff}
                  leaves={leaves}
                  services={services}
                  monthlyArchives={monthlyArchives}
                  onArchiveSaved={() => loadData(true)}
                  setActiveTab={(tab) => setActiveTab(tab)}
                  todayShopTiming={todayShopTiming}
                  onShopTimingChanged={(timing) => setTodayShopTiming(timing)}
                />
              )}
              {activeTab === "pos" && (
                <PosBilling
                  services={services}
                  products={products}
                  staff={staff}
                  onBookingAdded={() => loadData(true)}
                />
              )}
              {activeTab === "staff" && (
                <StaffManagement
                  staff={staff}
                  bookings={bookings}
                  leaves={leaves}
                  onStaffAdded={() => loadData(true)}
                />
              )}
              {activeTab === "leaves" && (
                <LeaveTracker
                  staff={staff}
                  leaves={leaves}
                  onLeaveAdded={() => loadData(true)}
                />
              )}
              {activeTab === "bookings" && (
                <BookingsList
                  bookings={bookings}
                  services={services}
                  staff={staff}
                  onBookingAdded={() => loadData(true)}
                  onBookingDeleted={() => loadData(true)}
                />
              )}
              {activeTab === "services" && (
                <ServicesConfig
                  services={services}
                  onServiceAdded={() => loadData(true)}
                />
              )}
              {activeTab === "expenses" && (
                <ExpensesConfig />
              )}
              {activeTab === "khata" && (
                <KhataBook staff={staff} />
              )}
              {activeTab === "products" && (
                <ProductsManager staff={staff} onProductsUpdated={() => loadData(true)} />
              )}
            </motion.div>
          )}
        </main>
      </div>

      {/* Footer bar */}
      <footer className="border-t border-slate-950 bg-slate-950/80 py-4 px-4 text-center text-[10px] text-slate-600 font-medium">
        <p>© 2026 Smart Salon 33. All rights reserved. Created in Cloud Native AI Workspace.</p>
      </footer>
    </div>
  );
}
