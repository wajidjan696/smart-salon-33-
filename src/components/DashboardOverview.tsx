import React, { useState, useEffect } from "react";
import { Booking, StaffLeave, StaffMember, SalonService, MonthlyArchive, ShopTiming } from "../types";
import { 
  saveMonthlyArchive, 
  deleteMonthlyArchive, 
  deleteBooking, 
  updateBookingStatus,
  getShopTimings,
  saveShopTiming
} from "../firebaseService";
import { motion, AnimatePresence } from "motion/react";
import { 
  DollarSign, 
  Users, 
  Calendar, 
  Sparkles, 
  TrendingUp, 
  CreditCard, 
  AlertCircle, 
  UserX,
  Plus,
  Lock,
  Unlock,
  Store,
  FileText,
  Trash2,
  Eye,
  X,
  Percent,
  CalendarRange,
  Briefcase,
  Clock,
  Check,
  Phone,
  RefreshCw,
  Edit2
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from "recharts";

interface DashboardOverviewProps {
  bookings: Booking[];
  staff: StaffMember[];
  leaves: StaffLeave[];
  services: SalonService[];
  monthlyArchives: MonthlyArchive[];
  onArchiveSaved: () => void;
  setActiveTab: (tab: any) => void;
}

export default function DashboardOverview({
  bookings,
  staff,
  leaves,
  services,
  monthlyArchives,
  onArchiveSaved,
  setActiveTab
}: DashboardOverviewProps) {
  // Month selection filter state
  const [selectedMonth, setSelectedMonth] = useState<string>("all"); // "all" or e.g. "2026-07"
  const [savingReport, setSavingReport] = useState(false);
  const [viewingArchive, setViewingArchive] = useState<MonthlyArchive | null>(null);

  // Selected ledger date for daily entries (Defaults to local today's date)
  const [dashboardDate, setDashboardDate] = useState(() => {
    const d = new Date();
    const offset = d.getTimezoneOffset();
    const localDate = new Date(d.getTime() - (offset * 60 * 1000));
    return localDate.toISOString().split('T')[0];
  });

  const getFormattedDashboardDate = (dateStr: string) => {
    try {
      const parts = dateStr.split("-");
      const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
      return d.toLocaleDateString("en-US", { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  // Today's Bookings list states
  const [todayFilter, setTodayFilter] = useState<"all" | "appointment" | "walk_in">("all");

  // Today's shop timing state
  const [todayShopTiming, setTodayShopTiming] = useState<ShopTiming | null>(null);
  const [isTimingLoading, setIsTimingLoading] = useState(false);

  const loadTodayTiming = async () => {
    setIsTimingLoading(true);
    try {
      const timings = await getShopTimings();
      const todayStr = new Date().toISOString().split('T')[0];
      const found = timings.find(t => t.date === todayStr);
      setTodayShopTiming(found || null);
    } catch (err) {
      console.error("Error loading shop timing on dashboard:", err);
    } finally {
      setIsTimingLoading(false);
    }
  };

  useEffect(() => {
    loadTodayTiming();
  }, []);

  const handleToggleShopState = async () => {
    const todayStr = new Date().toISOString().split('T')[0];
    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    
    setIsTimingLoading(true);
    try {
      if (!todayShopTiming) {
        // Open the shop
        const newTiming: ShopTiming = {
          id: todayStr,
          date: todayStr,
          openTime: timeStr,
        };
        await saveShopTiming(newTiming);
      } else if (!todayShopTiming.closeTime) {
        // Close the shop
        const updatedTiming: ShopTiming = {
          ...todayShopTiming,
          closeTime: timeStr,
        };
        await saveShopTiming(updatedTiming);
      } else {
        // Re-open (clear close time)
        const updatedTiming: ShopTiming = {
          ...todayShopTiming,
          closeTime: undefined,
        };
        await saveShopTiming(updatedTiming);
      }
      await loadTodayTiming();
    } catch (err) {
      console.error("Error toggling shop timing:", err);
    } finally {
      setIsTimingLoading(false);
    }
  };

  const handleQuickDelete = async (id: string, name: string) => {
    if (window.confirm(`Kiya aap waqai "${name}" ki aaj ki booking ko delete karna chahte hain?`)) {
      try {
        await deleteBooking(id);
        alert("Booking kamyabi se delete ho gayi.");
        onArchiveSaved(); // Silent reload
      } catch (err: any) {
        console.error("Delete booking error:", err);
        alert(`Booking delete karne me error aya: ${err.message || err}`);
      }
    }
  };

  const handleQuickStatusToggle = async (id: string, currentStatus: string) => {
    const nextStatus = currentStatus === "completed" ? "pending" : "completed";
    try {
      await updateBookingStatus(id, nextStatus);
      onArchiveSaved(); // Silent reload
    } catch (err: any) {
      console.error("Update booking status error:", err);
      alert(`Status update karne me error aya: ${err.message || err}`);
    }
  };

  // Derive unique month keys from existing bookings (format: YYYY-MM)
  const monthOptions = Array.from(
    new Set(
      bookings
        .filter(b => b.date)
        .map(b => {
          const parts = b.date.split("-");
          return `${parts[0]}-${parts[1]}`;
        })
    )
  ).sort((a, b) => b.localeCompare(a)); // descending

  // Get localized label for Month-Year
  const getMonthLabel = (ym: string) => {
    const [year, month] = ym.split("-");
    const monthNames = [
      "January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December"
    ];
    const idx = parseInt(month, 10) - 1;
    return `${monthNames[idx] || "Month"} ${year}`;
  };

  // Filter Bookings by selected month
  const filteredBookings = bookings.filter(b => {
    if (selectedMonth === "all") return true;
    return b.date && b.date.startsWith(selectedMonth);
  });

  // 1. Calculate general stats based on filtered data
  const totalRevenue = filteredBookings
    .filter(b => b.status === "completed" && b.paymentStatus === "paid")
    .reduce((sum, b) => sum + b.totalAmount, 0);

  const totalBookingsCount = filteredBookings.length;
  const averageBookingValue = totalBookingsCount > 0 ? Math.round(totalRevenue / totalBookingsCount) : 0;
  const activeStaffCount = staff.filter(s => s.status === "active").length;

  // 2. Payment split data
  const paymentMethods = [
    { name: "Cash", key: "cash", color: "#10b981" },
    { name: "EasyPaisa", key: "easypaisa", color: "#ec4899" },
    { name: "JazzCash", key: "jazzcash", color: "#f59e0b" },
    { name: "Bank Transfer", key: "bank_transfer", color: "#3b82f6" },
    { name: "Online", key: "online", color: "#8b5cf6" }
  ];

  const paymentData = paymentMethods.map(method => {
    const value = filteredBookings
      .filter(b => b.status === "completed" && b.paymentMethod === method.key)
      .reduce((sum, b) => sum + b.totalAmount, 0);
    return { name: method.name, value, color: method.color };
  }).filter(item => item.value > 0);

  // 3. Staff Revenue Performance & 10% Commission (calculated on-the-fly)
  const staffPerformanceData = staff.map(member => {
    const memberBookings = filteredBookings.filter(b => b.staffId === member.id && b.status === "completed");
    const revenue = memberBookings.reduce((sum, b) => sum + b.totalAmount, 0);
    const clients = memberBookings.length;
    const commission = Math.round(revenue * 0.10); // 10% commission

    return {
      id: member.id,
      name: member.name,
      role: member.role,
      Revenue: revenue,
      Clients: clients,
      Commission: commission
    };
  }).sort((a, b) => b.Revenue - a.Revenue);

  const totalCommissionSum = staffPerformanceData.reduce((sum, s) => sum + s.Commission, 0);

  // 4. Current Leaves / Absentees
  const todayStr = new Date().toISOString().split('T')[0];
  const staffOnLeaveToday = leaves.filter(leave => {
    return todayStr >= leave.startDate && todayStr <= leave.endDate;
  });

  // Handle Save Monthly Snapshot
  const handleSaveMonthArchive = async () => {
    if (selectedMonth === "all") {
      alert("Pehle upar se koi khosusi Mahena (e.g. July 2026) select karein jise aap save karna chahte hain.");
      return;
    }

    const monthLabel = getMonthLabel(selectedMonth);
    const confirmation = window.confirm(
      `Kiya aap waqai ${monthLabel} ke is record ko system me save karna chahte hain? Is me:\n\n` +
      `- Kul Kamai (Revenue): Rs. ${totalRevenue.toLocaleString()}\n` +
      `- Kul Bookings (Sales): ${totalBookingsCount}\n` +
      `- Staff Commission (10%): Rs. ${totalCommissionSum.toLocaleString()}\n\n` +
      `Yeh snapshot record permanently save ho jayega.`
    );
    if (!confirmation) return;

    setSavingReport(true);
    try {
      const archiveRecord: MonthlyArchive = {
        id: selectedMonth,
        monthName: monthLabel,
        totalRevenue,
        totalBookings: totalBookingsCount,
        totalCommission: totalCommissionSum,
        savedAt: new Date().toISOString(),
        staffCommissions: staffPerformanceData.map(sc => ({
          staffId: sc.id,
          staffName: sc.name,
          sales: sc.Revenue,
          commission: sc.Commission,
          bookingsCount: sc.Clients
        })),
        paymentMethodsSplit: paymentData.map(pd => ({
          name: pd.name,
          value: pd.value
        }))
      };

      await saveMonthlyArchive(archiveRecord);
      alert(`${monthLabel} ka snapshot record kamyabi se save ho gaya!`);
      onArchiveSaved();
    } catch (err) {
      console.error(err);
      alert("Record save karne me error aya.");
    } finally {
      setSavingReport(false);
    }
  };

  const handleDeleteArchive = async (id: string, monthName: string) => {
    if (window.confirm(`Kiya aap waqai "${monthName}" ka saved monthly snapshot delete karna chahte hain?`)) {
      try {
        await deleteMonthlyArchive(id);
        alert("Snapshot record kamyabi se delete ho gaya.");
        onArchiveSaved();
      } catch (err) {
        console.error(err);
        alert("Snapshot delete karne me error aya.");
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-amber-500/10 via-slate-900 to-slate-900 border border-amber-500/20 rounded-2xl p-6 relative overflow-hidden">
        <div className="absolute right-0 top-0 w-64 h-64 bg-amber-500/5 rounded-full blur-3xl -mr-20 -mt-20"></div>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 relative z-10">
          <div>
            <h1 className="text-3xl font-extrabold text-white tracking-tight flex items-center gap-2">
              Smart Salon 33 <span className="text-amber-400 text-sm font-normal px-2.5 py-1 bg-amber-500/10 rounded-full border border-amber-500/20">System Live</span>
            </h1>
            <p className="text-slate-400 text-sm mt-1">
              Khushamdeed! Salon ki performance, billing, staff chotti, aur client bookings ko manage karein.
            </p>
          </div>
          <button
            onClick={() => setActiveTab("pos")}
            className="flex items-center gap-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-semibold px-5 py-3 rounded-xl transition duration-250 shadow-lg shadow-amber-500/20 active:scale-95"
            id="quick-billing-btn"
          >
            <Plus size={18} className="stroke-[3]" />
            Naya Client Bill / POS
          </button>
        </div>
      </div>

      {/* Live Shop Status & Draggable Slider */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-900/90 to-slate-950 border border-slate-800 rounded-2xl p-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 shadow-xl relative overflow-hidden">
        {/* Subtle decorative glow */}
        <div className={`absolute -left-12 -top-12 w-32 h-32 rounded-full blur-2xl opacity-15 transition-all duration-500 ${
          todayShopTiming ? (todayShopTiming.closeTime ? "bg-rose-500" : "bg-emerald-500") : "bg-amber-500"
        }`} />
        
        <div className="flex items-center gap-4 relative z-10">
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border transition-all duration-500 ${
            todayShopTiming 
              ? (todayShopTiming.closeTime 
                  ? "bg-rose-500/10 text-rose-400 border-rose-500/25" 
                  : "bg-emerald-500/10 text-emerald-400 border-emerald-500/25 animate-pulse") 
              : "bg-amber-500/10 text-amber-400 border-amber-500/25"
          }`}>
            <Store size={22} />
          </div>
          
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">🏪 Shop Status Register (Dukan Ka Haal)</h3>
              {isTimingLoading && (
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
              )}
            </div>
            
            <p className="text-xs text-slate-400 mt-1">
              {todayShopTiming ? (
                todayShopTiming.closeTime ? (
                  <span>
                    🔴 Dukan abhi <span className="text-rose-400 font-bold uppercase">Band (Closed)</span> hai. Kholne ka waqt: <span className="font-mono text-emerald-400 font-bold">{todayShopTiming.openTime}</span> | Band hone ka waqt: <span className="font-mono text-rose-400 font-bold">{todayShopTiming.closeTime}</span>
                  </span>
                ) : (
                  <span>
                    🟢 Dukan abhi <span className="text-emerald-400 font-bold uppercase animate-pulse">Khuli (Open)</span> hai! Kholne ka waqt: <span className="font-mono text-emerald-400 font-bold">{todayShopTiming.openTime}</span>
                  </span>
                )
              ) : (
                <span>⚪ Aaj dukan khulne ka record abhi darj nahi kiya gaya. Kholne ke liye slide karein.</span>
              )}
            </p>
          </div>
        </div>

        {/* The Interactive Slider Button */}
        <div className="flex flex-col items-center gap-1.5 w-full md:w-auto relative z-10">
          <div className="relative w-52 h-12 bg-slate-950 border border-slate-800 rounded-full p-1 overflow-hidden select-none cursor-pointer flex items-center">
            {/* Track Label text based on status */}
            <div className="absolute inset-0 flex items-center justify-center text-[10px] font-extrabold tracking-widest text-slate-500 pointer-events-none uppercase">
              {todayShopTiming ? (
                todayShopTiming.closeTime ? "Slide to Re-Open 🔓" : "Slide to Close 🔒"
              ) : "Slide to Open 🔓"}
            </div>
            
            {/* Animated Background Highlight */}
            <div className={`absolute inset-y-1 left-1 rounded-full transition-all duration-500 ${
              todayShopTiming 
                ? (todayShopTiming.closeTime ? "w-10 bg-rose-500/10" : "w-40 bg-emerald-500/15")
                : "w-10 bg-slate-900"
            }`} />

            {/* Sliding Handle */}
            <motion.div
              drag="x"
              dragConstraints={{ left: 0, right: 160 }}
              dragElastic={0.05}
              dragMomentum={false}
              animate={{ x: (todayShopTiming && !todayShopTiming.closeTime) ? 160 : 0 }}
              onDragEnd={(event, info) => {
                const isOpen = todayShopTiming && !todayShopTiming.closeTime;
                if (!isOpen && info.offset.x > 60) {
                  handleToggleShopState();
                } else if (isOpen && info.offset.x < -60) {
                  handleToggleShopState();
                }
              }}
              onClick={(e) => {
                e.stopPropagation();
                handleToggleShopState();
              }}
              className={`w-10 h-10 rounded-full flex items-center justify-center cursor-grab active:cursor-grabbing shadow-lg transition-colors duration-300 relative z-20 ${
                (todayShopTiming && !todayShopTiming.closeTime)
                  ? "bg-emerald-500 text-slate-950 shadow-emerald-500/30"
                  : "bg-slate-800 text-slate-300"
              }`}
            >
              {(todayShopTiming && !todayShopTiming.closeTime) ? (
                <Unlock size={15} className="stroke-[3]" />
              ) : (
                <Lock size={15} className="stroke-[3]" />
              )}
            </motion.div>
          </div>
          
          <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
            Drag or Click to Toggle Status
          </span>
        </div>
      </div>

      {/* Month Filter & Archiving Control Panel */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="p-2.5 bg-amber-500/10 text-amber-400 rounded-xl border border-amber-500/20">
            <CalendarRange size={20} />
          </div>
          <div>
            <h4 className="text-sm font-bold text-white uppercase tracking-wider">Mahana Hisab o Record (Monthly Ledger Filter)</h4>
            <p className="text-[11px] text-slate-400">Sales, bookings, aur staff commission ko mahane ke mutabiq filter aur save karein.</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Dropdown to filter month */}
          <div className="flex items-center gap-2 bg-slate-950 px-3.5 py-2 border border-slate-800 rounded-xl min-w-[200px]">
            <span className="text-[10px] text-slate-500 uppercase font-bold whitespace-nowrap">Month Choose:</span>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="bg-transparent text-xs text-amber-400 outline-none cursor-pointer border-none font-bold w-full p-0"
            >
              <option value="all" className="bg-slate-950 text-white">All Time (Sab Record)</option>
              {monthOptions.map(m => (
                <option key={m} value={m} className="bg-slate-950 text-white">
                  {getMonthLabel(m)}
                </option>
              ))}
            </select>
          </div>

          {/* Action button to lock and save this month's snapshot */}
          {selectedMonth !== "all" && (
            <button
              onClick={handleSaveMonthArchive}
              disabled={savingReport}
              className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-slate-950 text-xs font-extrabold px-4 py-2.5 rounded-xl transition shadow-md shadow-emerald-500/10 disabled:opacity-50 active:scale-95 cursor-pointer"
            >
              <Lock size={13} className="stroke-[3]" />
              <span>{savingReport ? "Saving snapshot..." : `${getMonthLabel(selectedMonth)} Record Save Karein`}</span>
            </button>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            title: "Kul Kamai (Revenue)",
            value: `Rs. ${totalRevenue.toLocaleString()}`,
            icon: DollarSign,
            color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
            desc: "Completed bookings se paid payment"
          },
          {
            title: "Kul Clients Served",
            value: totalBookingsCount,
            icon: Users,
            color: "text-amber-400 bg-amber-500/10 border-amber-500/20",
            desc: "Walk-in, Online aur Appointments"
          },
          {
            title: "Avg Sale per Client",
            value: `Rs. ${averageBookingValue.toLocaleString()}`,
            icon: TrendingUp,
            color: "text-blue-400 bg-blue-500/10 border-blue-500/20",
            desc: "Fil-client average kharcha"
          },
          {
            title: "Active Staff",
            value: `${activeStaffCount} Member`,
            icon: Sparkles,
            color: "text-purple-400 bg-purple-500/10 border-purple-500/20",
            desc: "Abhi active stylists & therapists"
          }
        ].map((stat, idx) => (
          <motion.div
            key={idx}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.05 }}
            className={`p-5 rounded-2xl bg-slate-900 border ${stat.color.split(" ")[2]} flex items-start justify-between gap-4`}
          >
            <div className="space-y-1">
              <span className="text-slate-400 text-xs font-medium uppercase tracking-wider">{stat.title}</span>
              <h3 className="text-2xl font-bold text-white font-mono">{stat.value}</h3>
              <p className="text-slate-500 text-xs">{stat.desc}</p>
            </div>
            <div className={`p-3 rounded-xl ${stat.color.split(" ")[1]} ${stat.color.split(" ")[0]}`}>
              <stat.icon size={22} />
            </div>
          </motion.div>
        ))}
      </div>

      {/* Today's Appointments & Bookings Desk (Aaj ke Appointments) */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div className="space-y-1">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Calendar className="text-amber-500 animate-pulse animate-duration-1000" size={20} />
              Appointments & Billing Ledger (Dukan Ka Daily Record)
            </h2>
            <p className="text-slate-400 text-xs">
              Selected Date: <span className="font-mono text-amber-400 font-bold">{getFormattedDashboardDate(dashboardDate)}</span>. Kisi bhi din ka data dekhne ya naya lagane ke liye date badlein.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Custom Date Picker */}
            <div className="flex items-center gap-2 bg-slate-950 px-3 py-1.5 border border-slate-850 rounded-xl">
              <span className="text-[10px] text-slate-500 uppercase font-bold whitespace-nowrap">Choose Date:</span>
              <input
                type="date"
                value={dashboardDate}
                onChange={(e) => setDashboardDate(e.target.value)}
                className="bg-transparent text-xs text-amber-400 outline-none font-bold font-mono border-none p-0 cursor-pointer focus:ring-0"
              />
            </div>

            {/* Filter Buttons */}
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-slate-500 uppercase font-bold">Type:</span>
              <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-850">
                <button
                  onClick={() => setTodayFilter("all")}
                  className={`px-3 py-1 text-xs font-semibold rounded-lg transition ${todayFilter === "all" ? "bg-amber-500 text-slate-950" : "text-slate-400 hover:text-white"}`}
                >
                  Sab ({bookings.filter(b => b.date === dashboardDate).length})
                </button>
                <button
                  onClick={() => setTodayFilter("appointment")}
                  className={`px-3 py-1 text-xs font-semibold rounded-lg transition ${todayFilter === "appointment" ? "bg-amber-500 text-slate-950" : "text-slate-400 hover:text-white"}`}
                >
                  Appointments ({bookings.filter(b => b.date === dashboardDate && b.bookingType === "appointment").length})
                </button>
                <button
                  onClick={() => setTodayFilter("walk_in")}
                  className={`px-3 py-1 text-xs font-semibold rounded-lg transition ${todayFilter === "walk_in" ? "bg-amber-500 text-slate-950" : "text-slate-400 hover:text-white"}`}
                >
                  Walk-ins ({bookings.filter(b => b.date === dashboardDate && b.bookingType === "walk_in").length})
                </button>
              </div>
            </div>
          </div>
        </div>

        {(() => {
          const todayBList = bookings.filter(b => b.date === dashboardDate);
          const filteredTodayBList = todayBList.filter(b => {
            if (todayFilter === "all") return true;
            return b.bookingType === todayFilter;
          });

          return filteredTodayBList.length > 0 ? (
            <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950/20">
              <table className="w-full text-left text-xs text-slate-300">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-950/50 text-[10px] text-slate-500 uppercase tracking-wider font-bold">
                    <th className="py-3 px-4">Client Name & Phone</th>
                    <th className="py-3 px-4">Booking Type</th>
                    <th className="py-3 px-4">Services List</th>
                    <th className="py-3 px-4">Assigned Stylist</th>
                    <th className="py-3 px-4">Time</th>
                    <th className="py-3 px-4">Status / Payment</th>
                    <th className="py-3 px-4 text-right">Bill Amount</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-850/50">
                  {filteredTodayBList.map((b) => (
                    <tr key={b.id} className="hover:bg-slate-850/30 transition duration-100">
                      <td className="py-3 px-4">
                        <div className="font-bold text-white flex items-center gap-1.5">
                          {b.clientName}
                        </div>
                        <div className="text-slate-500 font-mono text-[10px] flex items-center gap-1 mt-0.5">
                          <Phone size={10} className="text-slate-600" />
                          {b.clientPhone}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        {b.bookingType === "appointment" ? (
                          <span className="inline-flex items-center gap-1 bg-purple-500/10 text-purple-400 border border-purple-500/20 font-bold text-[10px] px-2 py-0.5 rounded">
                            <Calendar size={10} />
                            Appointment
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 bg-teal-500/10 text-teal-400 border border-teal-500/20 font-bold text-[10px] px-2 py-0.5 rounded">
                            <Briefcase size={10} />
                            Walk-In
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 max-w-xs">
                        <div className="flex flex-wrap gap-1">
                          {b.services?.map((s, idx) => (
                            <span key={idx} className="bg-slate-800 text-slate-300 text-[10px] px-2 py-0.5 rounded-md border border-slate-700/50">
                              {s.name}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-300">
                        {b.staffName || "Not Assigned"}
                      </td>
                      <td className="py-3 px-4">
                        <div className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-400 bg-amber-500/5 border border-amber-500/10 px-2 py-0.5 rounded-lg font-mono">
                          <Clock size={11} />
                          {b.time}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex flex-col gap-1">
                          <span className={`inline-flex items-center justify-center font-bold text-[10px] px-2 py-0.5 rounded-full w-fit ${
                            b.status === "completed" 
                              ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" 
                              : b.status === "cancelled" 
                              ? "bg-rose-500/10 text-rose-400 border border-rose-500/20" 
                              : "bg-amber-500/10 text-amber-400 border border-amber-500/20 animate-pulse"
                          }`}>
                            {b.status === "completed" ? "Completed" : b.status === "cancelled" ? "Cancelled" : "Pending"}
                          </span>
                          <span className={`inline-flex items-center justify-center font-bold text-[9px] px-1.5 py-0.5 rounded w-fit ${
                            b.paymentStatus === "paid" 
                              ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/10" 
                              : "bg-amber-500/10 text-amber-400 border border-amber-500/10"
                          }`}>
                            {b.paymentStatus === "paid" ? "Paid" : "Khata / Unpaid"}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-emerald-400 text-xs">
                        Rs. {b.totalAmount.toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex gap-1.5 justify-end">
                          <button
                            onClick={() => handleQuickStatusToggle(b.id, b.status)}
                            className={`p-1.5 rounded-lg border transition cursor-pointer ${
                              b.status === "completed" 
                                ? "bg-amber-950/15 hover:bg-amber-950/40 text-amber-400 border-amber-900/20" 
                                : "bg-emerald-950/15 hover:bg-emerald-950/40 text-emerald-400 border-emerald-900/20"
                            }`}
                            title={b.status === "completed" ? "Mark as Pending" : "Mark as Completed"}
                          >
                            <Check size={12} />
                          </button>
                          <button
                            onClick={() => {
                              setActiveTab("bookings");
                              setTimeout(() => {
                                // Locate the booking row and trigger the edit modal
                                const editBtn = document.querySelector(`[data-edit-booking-id="${b.id}"]`) as HTMLButtonElement;
                                if (editBtn) {
                                  editBtn.click();
                                }
                              }, 300);
                            }}
                            className="p-1.5 bg-slate-900 hover:bg-slate-800 text-amber-400 rounded-lg border border-slate-850 transition cursor-pointer"
                            title="Edit Booking"
                          >
                            <Edit2 size={12} />
                          </button>
                          <button
                            onClick={() => handleQuickDelete(b.id, b.clientName)}
                            className="p-1.5 bg-rose-950/10 hover:bg-rose-950/30 text-rose-400 rounded-lg border border-rose-900/10 transition cursor-pointer"
                            title="Delete Booking"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-8 text-center text-slate-500 text-xs bg-slate-950/10 rounded-xl border border-dashed border-slate-800">
              {todayFilter === "all" 
                ? "Aaj ke din ke liye abhi tak koi bookings ya appointments nahi hain. Naya Client bill banane ke liye 'POS' par jayein."
                : todayFilter === "appointment" 
                ? "Aaj ke din ke liye koi Scheduled Appointments nahi hain."
                : "Aaj ke din ke liye koi Walk-In clients nahi hain."}
            </div>
          );
        })()}
      </div>

      {/* Main Charts & Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 columns: Staff Performance chart */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-6">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                Staff Kaam ki Performance
              </h2>
              <p className="text-slate-400 text-xs">Stylist ke mutabiq total kamai aur clients ki tadaad</p>
            </div>
            <span className="text-xs bg-slate-800 text-amber-400 px-3 py-1.5 rounded-lg border border-slate-700">Leaderboard</span>
          </div>

          <div className="h-72">
            {staffPerformanceData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={staffPerformanceData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} />
                  <YAxis yAxisId="left" orientation="left" stroke="#d97706" fontSize={11} />
                  <YAxis yAxisId="right" orientation="right" stroke="#10b981" fontSize={11} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: "#0f172a", border: "1px solid #334155", borderRadius: "12px", color: "#f8fafc" }}
                  />
                  <Legend wrapperStyle={{ fontSize: 12, paddingTop: 10 }} />
                  <Bar yAxisId="left" dataKey="Revenue" fill="#d97706" radius={[4, 4, 0, 0]} name="Kamai (PKR)" />
                  <Bar yAxisId="right" dataKey="Clients" fill="#10b981" radius={[4, 4, 0, 0]} name="Clients Handle Kiye" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-500 text-sm">
                Koi bookings data available nahi hai
              </div>
            )}
          </div>
        </div>

        {/* Right 1 column: Payments split */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col justify-between">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              Payment Kahan Se Ayi?
            </h2>
            <p className="text-slate-400 text-xs mb-4">Cash, EasyPaisa, JazzCash, etc. ka split</p>
          </div>

          <div className="h-44 flex items-center justify-center relative">
            {paymentData.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={paymentData}
                      cx="50%"
                      cy="50%"
                      innerRadius={45}
                      outerRadius={65}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {paymentData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(value: number) => `Rs. ${value.toLocaleString()}`}
                      contentStyle={{ backgroundColor: "#0f172a", border: "1px solid #334155", borderRadius: "12px", color: "#f8fafc" }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute text-center">
                  <span className="text-slate-500 text-[10px] uppercase font-bold tracking-wider block">Total</span>
                  <span className="text-lg font-bold text-white font-mono">Rs. {totalRevenue.toLocaleString()}</span>
                </div>
              </>
            ) : (
              <div className="text-slate-500 text-sm">
                Abhi tak koi payment received nahi hui
              </div>
            )}
          </div>

          {/* Payment breakdown legend */}
          <div className="space-y-2 mt-4 pt-4 border-t border-slate-800">
            {paymentMethods.map(method => {
              const value = filteredBookings
                .filter(b => b.status === "completed" && b.paymentMethod === method.key)
                .reduce((sum, b) => sum + b.totalAmount, 0);
              const percentage = totalRevenue > 0 ? Math.round((value / totalRevenue) * 100) : 0;

              return (
                <div key={method.key} className="flex justify-between items-center text-xs">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: method.color }}></span>
                    <span className="text-slate-300 font-medium">{method.name}</span>
                  </div>
                  <div className="flex items-center gap-3 font-mono">
                    <span className="text-slate-400">Rs. {value.toLocaleString()}</span>
                    <span className="text-slate-500 font-semibold w-8 text-right">{percentage}%</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Staff 10% Commission Ledger */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
        <div className="flex justify-between items-center mb-4 flex-wrap gap-2">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Percent size={18} className="text-amber-500" />
              Stylists 10% Commission Ledger
            </h2>
            <p className="text-slate-400 text-xs">
              Completed bookings par automatically computed 10% real-time commission payout
            </p>
          </div>
          <div className="bg-amber-500/10 text-amber-400 border border-amber-500/20 text-xs font-mono font-bold px-3 py-1.5 rounded-xl">
            Total Commission: Rs. {totalCommissionSum.toLocaleString()}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead>
              <tr className="border-b border-slate-800 text-[10px] text-slate-500 uppercase tracking-wider">
                <th className="py-3 px-4 font-bold">Stylist / Member</th>
                <th className="py-3 px-4 font-bold">Role</th>
                <th className="py-3 px-4 font-bold text-right">Bookings Done</th>
                <th className="py-3 px-4 font-bold text-right">Total Sales / Revenue</th>
                <th className="py-3 px-4 font-bold text-right text-amber-400">10% Commission</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-850">
              {staffPerformanceData.length > 0 ? (
                staffPerformanceData.map((sc, idx) => (
                  <tr key={idx} className="hover:bg-slate-850/40 transition duration-100">
                    <td className="py-3.5 px-4 font-semibold text-white flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-slate-800 flex items-center justify-center text-[10px] text-slate-300 font-bold">
                        {sc.name[0]}
                      </div>
                      <span>{sc.name}</span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-400 font-medium">{sc.role}</td>
                    <td className="py-3.5 px-4 text-right font-mono text-slate-300 font-semibold">{sc.Clients} clients</td>
                    <td className="py-3.5 px-4 text-right font-mono text-slate-300">Rs. {sc.Revenue.toLocaleString()}</td>
                    <td className="py-3.5 px-4 text-right font-mono text-amber-400 font-extrabold text-sm">Rs. {sc.Commission.toLocaleString()}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="py-6 text-center text-slate-500 font-medium">
                    Koi performance record available nahi hai
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Saved Months Snapshots Ledger (Mahana Saved Archives) */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
        <div className="mb-4">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <FileText size={18} className="text-amber-500" />
            Saved Mahana Accounts & Records Archive
          </h2>
          <p className="text-slate-400 text-xs">
            Pehle save kiye gaye months ke frozen accounting records aur reports
          </p>
        </div>

        {monthlyArchives && monthlyArchives.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {monthlyArchives.map((archive) => (
              <div 
                key={archive.id} 
                className="p-4 bg-slate-950 border border-slate-800/80 rounded-2xl hover:border-slate-700/85 transition flex flex-col justify-between gap-3 shadow-sm relative group"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-xs font-black text-white block uppercase tracking-wide">
                      {archive.monthName}
                    </span>
                    <span className="text-[9px] text-slate-500 block font-mono mt-0.5">
                      Saved On: {new Date(archive.savedAt).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="flex gap-1.5 opacity-85 group-hover:opacity-100 transition">
                    <button
                      onClick={() => setViewingArchive(archive)}
                      className="p-1.5 bg-slate-800 hover:bg-slate-750 text-amber-400 hover:text-amber-300 rounded-lg border border-slate-700 transition cursor-pointer"
                      title="View Full Report"
                    >
                      <Eye size={12} />
                    </button>
                    <button
                      onClick={() => handleDeleteArchive(archive.id, archive.monthName)}
                      className="p-1.5 bg-rose-950/20 hover:bg-rose-950/40 text-rose-400 hover:text-rose-300 rounded-lg border border-rose-900/30 transition cursor-pointer"
                      title="Delete Record"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-900 text-[10px]">
                  <div>
                    <span className="text-slate-500 block uppercase font-bold tracking-tight">Revenue</span>
                    <span className="font-bold text-emerald-400 font-mono text-[11px]">Rs. {archive.totalRevenue.toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block uppercase font-bold tracking-tight">Sales</span>
                    <span className="font-bold text-slate-300 font-mono text-[11px]">{archive.totalBookings} Bills</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block uppercase font-bold tracking-tight">Commission</span>
                    <span className="font-bold text-amber-500 font-mono text-[11px]">Rs. {archive.totalCommission.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-6 bg-slate-950/45 border border-slate-850 rounded-2xl text-center">
            <p className="text-xs text-slate-500 font-medium">Abhi tak koi monthly snapshot save nahi kiya gaya.</p>
            <p className="text-[10px] text-slate-600 mt-0.5">Upar dropdown se month choose karein aur snapshot save karne ka button click karein.</p>
          </div>
        )}
      </div>

      {/* Staff Leave & Today's Attendance Summary Alert */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Today's Leaves Alert */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-3 flex items-center gap-2">
            <UserX className="text-rose-400" size={16} />
            Stylists On Leave / Absent Today
          </h3>
          {staffOnLeaveToday.length > 0 ? (
            <div className="space-y-2 max-h-36 overflow-y-auto">
              {staffOnLeaveToday.map(leave => (
                <div key={leave.id} className="p-3 bg-rose-500/5 border border-rose-500/20 rounded-xl flex justify-between items-center">
                  <div className="space-y-0.5">
                    <span className="text-white text-sm font-semibold">{leave.staffName}</span>
                    <p className="text-xs text-rose-400 font-medium">Leave Type: <span className="capitalize">{leave.type}</span></p>
                  </div>
                  <div className="text-right">
                    <span className="text-xs text-slate-400 block">Wajah (Reason)</span>
                    <span className="text-xs font-semibold text-rose-300">"{leave.reason}"</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-4 bg-emerald-500/5 border border-emerald-500/20 rounded-xl text-center">
              <p className="text-xs text-emerald-400 font-semibold">MashaAllah, aaj koi stylist chotti (leave) par nahi hai! Sab haazir hain.</p>
            </div>
          )}
        </div>

        {/* Quick Tips / Reminders */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between">
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <AlertCircle className="text-amber-400" size={16} />
              Maloomat e Shifaat
            </h3>
            <p className="text-xs text-slate-400">
              Smart Salon 33 mein aap:
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3 mt-3">
            <div className="p-2.5 bg-slate-800/40 rounded-xl border border-slate-800">
              <span className="text-[10px] text-amber-400 font-bold block">1. POS BILLING</span>
              <span className="text-[11px] text-slate-300">Direct service choose karke payment kahan se ayi woh select karein.</span>
            </div>
            <div className="p-2.5 bg-slate-800/40 rounded-xl border border-slate-800">
              <span className="text-[10px] text-pink-400 font-bold block">2. STAFF CHOTTI</span>
              <span className="text-[11px] text-slate-300">Har staff ki chottiyan trace karein taake monthly hisab asan ho.</span>
            </div>
          </div>
        </div>
      </div>

      {/* Detailed Modal Overlay for Saved Reports */}
      <AnimatePresence>
        {viewingArchive && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setViewingArchive(null)}
              className="absolute inset-0 bg-slate-950/85 backdrop-blur-sm"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-slate-900 border border-slate-800 rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl relative z-10 flex flex-col"
            >
              {/* Modal Header */}
              <div className="p-6 border-b border-slate-850 flex justify-between items-center bg-slate-950/40">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-amber-500/10 text-amber-400 rounded-xl border border-amber-500/20">
                    <FileText size={18} />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white uppercase tracking-wider">
                      {viewingArchive.monthName} Report Snapshot
                    </h3>
                    <p className="text-[10px] text-slate-500 font-mono">Archive ID: {viewingArchive.id} | Saved On: {new Date(viewingArchive.savedAt).toLocaleString()}</p>
                  </div>
                </div>
                <button
                  onClick={() => setViewingArchive(null)}
                  className="p-1.5 hover:bg-slate-850 rounded-xl text-slate-400 hover:text-white transition cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-6 space-y-6 flex-grow overflow-y-auto">
                {/* Highlights */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="p-4 bg-slate-950 border border-slate-800/60 rounded-2xl">
                    <span className="text-[10px] text-slate-500 uppercase font-black tracking-wide">Revenue</span>
                    <h5 className="text-sm sm:text-base font-black text-emerald-400 font-mono mt-0.5">Rs. {viewingArchive.totalRevenue.toLocaleString()}</h5>
                  </div>
                  <div className="p-4 bg-slate-950 border border-slate-800/60 rounded-2xl">
                    <span className="text-[10px] text-slate-500 uppercase font-black tracking-wide">Total Sales</span>
                    <h5 className="text-sm sm:text-base font-black text-slate-300 font-mono mt-0.5">{viewingArchive.totalBookings} Bills</h5>
                  </div>
                  <div className="p-4 bg-slate-950 border border-slate-800/60 rounded-2xl">
                    <span className="text-[10px] text-slate-500 uppercase font-black tracking-wide">Total Commission</span>
                    <h5 className="text-sm sm:text-base font-black text-amber-500 font-mono mt-0.5">Rs. {viewingArchive.totalCommission.toLocaleString()}</h5>
                  </div>
                </div>

                {/* Staff Breakdown */}
                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                    <Briefcase size={12} className="text-amber-500" />
                    Stylists Commission & Payouts Breakdown
                  </h4>
                  <div className="bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-slate-900 bg-slate-900/20 text-[9px] text-slate-500 uppercase tracking-wider">
                          <th className="py-2.5 px-4 font-bold">Stylist</th>
                          <th className="py-2.5 px-4 text-right font-bold">Clients Handle</th>
                          <th className="py-2.5 px-4 text-right font-bold">Total Sales Done</th>
                          <th className="py-2.5 px-4 text-right font-bold text-amber-400">10% Commission Payout</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-900 text-slate-300 font-medium">
                        {viewingArchive.staffCommissions?.map((sc, idx) => (
                          <tr key={idx} className="hover:bg-slate-900/30">
                            <td className="py-3 px-4 font-bold text-white">{sc.staffName}</td>
                            <td className="py-3 px-4 text-right font-mono text-slate-400">{sc.bookingsCount}</td>
                            <td className="py-3 px-4 text-right font-mono">Rs. {sc.sales.toLocaleString()}</td>
                            <td className="py-3 px-4 text-right font-mono text-amber-400 font-bold">Rs. {sc.commission.toLocaleString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Payment Breakdown */}
                {viewingArchive.paymentMethodsSplit && viewingArchive.paymentMethodsSplit.length > 0 && (
                  <div className="space-y-3">
                    <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                      <CreditCard size={12} className="text-amber-500" />
                      Payment Channels Breakdown
                    </h4>
                    <div className="grid grid-cols-2 gap-3">
                      {viewingArchive.paymentMethodsSplit.map((pm, idx) => (
                        <div key={idx} className="p-3 bg-slate-950 border border-slate-800 rounded-xl flex justify-between items-center text-xs">
                          <span className="text-slate-400 font-medium capitalize">{pm.name}</span>
                          <span className="font-mono text-white font-bold">Rs. {pm.value.toLocaleString()}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="p-4 border-t border-slate-850 text-center bg-slate-950/20">
                <button
                  onClick={() => setViewingArchive(null)}
                  className="bg-slate-850 hover:bg-slate-800 text-white text-xs font-bold py-2.5 px-6 rounded-xl border border-slate-700 transition cursor-pointer"
                >
                  Close Archive View
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
