import React, { useState } from "react";
import { Booking, SalonService, StaffMember, KhataAccount, KhataLog } from "../types";
import { updateBookingStatus, deleteBooking, addBooking, saveKhataAccount, addKhataLog, adjustKhataBalance } from "../firebaseService";
import ReceiptModal from "./ReceiptModal";
import { 
  Search, 
  Trash2, 
  Filter, 
  Calendar, 
  Phone, 
  CreditCard, 
  Activity, 
  CornerDownRight,
  RefreshCw,
  Clock,
  User,
  Scissors,
  Plus,
  X,
  Sparkles,
  Check,
  AlertTriangle,
  Edit2,
  Printer
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface BookingsListProps {
  bookings: Booking[];
  services: SalonService[];
  staff: StaffMember[];
  onBookingAdded: () => void;
  onBookingDeleted: () => void;
}

export default function BookingsList({ bookings, services, staff, onBookingAdded, onBookingDeleted }: BookingsListProps) {
  // Navigation & View Mode
  const [bookingsViewTab, setBookingsViewTab] = useState<"sheet" | "ledger">("sheet");

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [paymentFilter, setPaymentFilter] = useState<string>("all");

  // Date-based filter states (advanced filtering) - Default to single_date for Sheet View
  const [dateFilterMode, setDateFilterMode] = useState<"all" | "single_date" | "week" | "month" | "year">("single_date");
  const [selectedFilterDate, setSelectedFilterDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [selectedFilterMonth, setSelectedFilterMonth] = useState(() => String(new Date().getMonth() + 1).padStart(2, '0')); // "01"-"12"
  const [selectedFilterYear, setSelectedFilterYear] = useState(() => String(new Date().getFullYear())); // "2026"

  // Receipt modal states
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [selectedReceiptBooking, setSelectedReceiptBooking] = useState<Booking | null>(null);

  // Appointment Form State
  const [showAppointmentModal, setShowAppointmentModal] = useState(false);
  const [clientName, setClientName] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [selectedServices, setSelectedServices] = useState<SalonService[]>([]);
  const [selectedStaffId, setSelectedStaffId] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "easypaisa" | "jazzcash" | "bank_transfer" | "online">("cash");
  const [paymentStatus, setPaymentStatus] = useState<"paid" | "unpaid">("unpaid"); // Default pending appointment to unpaid/khata
  const [discountInput, setDiscountInput] = useState<string>("0");
  const [tipInput, setTipInput] = useState<string>("0");
  const [amountPaidInput, setAmountPaidInput] = useState<string>("");
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [time, setTime] = useState("12:00");
  const [salonTime, setSalonTime] = useState("");
  const [pedicureTime, setPedicureTime] = useState("");
  const [formError, setFormError] = useState("");
  const [formLoading, setFormLoading] = useState(false);
  const [serviceSearch, setServiceSearch] = useState("");
  const [editingBooking, setEditingBooking] = useState<Booking | null>(null);

  React.useEffect(() => {
    if (editingBooking) {
      setClientName(editingBooking.clientName);
      setClientPhone(editingBooking.clientPhone);
      setSelectedServices(editingBooking.services || []);
      setSelectedStaffId(editingBooking.staffId);
      setPaymentMethod(editingBooking.paymentMethod);
      setPaymentStatus(editingBooking.paymentStatus);
      setDiscountInput(editingBooking.discount !== undefined ? String(editingBooking.discount) : "0");
      setTipInput(editingBooking.tip !== undefined ? String(editingBooking.tip) : "0");
      setAmountPaidInput(editingBooking.amountPaid !== undefined ? String(editingBooking.amountPaid) : "");
      setDate(editingBooking.date);
      setTime(editingBooking.time);
      setSalonTime(editingBooking.salonTime || "");
      setPedicureTime(editingBooking.pedicureTime || "");
    } else {
      setClientName("");
      setClientPhone("");
      setSelectedServices([]);
      setSelectedStaffId("");
      setPaymentMethod("cash");
      setPaymentStatus("unpaid");
      setDiscountInput("0");
      setTipInput("0");
      setAmountPaidInput("");
      setDate(new Date().toISOString().split('T')[0]);
      setTime("12:00");
      setSalonTime("");
      setPedicureTime("");
    }
  }, [editingBooking]);

  const handleSubmitAppointment = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");

    let finalClientName = clientName.trim();
    let finalClientPhone = clientPhone.trim();

    if (paymentStatus === "unpaid") {
      if (!finalClientName) {
        setFormError("Khata (Udhaar) register karne ke liye Client ka Naam likhna zaroori hai!");
        return;
      }
      if (!finalClientPhone) {
        setFormError("Khata (Udhaar) register karne ke liye Phone Number zaroori hai!");
        return;
      }
    } else {
      if (!finalClientName) {
        finalClientName = "Walk-In Client";
      }
      if (!finalClientPhone) {
        finalClientPhone = "0000000000";
      }
    }

    if (selectedServices.length === 0) {
      setFormError("Kam se kam ek Service select karein.");
      return;
    }
    if (!selectedStaffId) {
      setFormError("Stylist assign karna zaroori hai.");
      return;
    }

    setFormLoading(true);
    try {
      const staffMember = staff.find(s => s.id === selectedStaffId);
      const staffName = staffMember ? staffMember.name : "Unknown Staff";
      
      const subtotal = selectedServices.reduce((sum, s) => sum + s.price, 0);
      const discount = Math.max(0, parseFloat(discountInput) || 0);
      const tip = Math.max(0, parseFloat(tipInput) || 0);
      const totalAmount = Math.max(0, subtotal - discount + tip);
      const amountPaid = amountPaidInput === "" ? (paymentStatus === "paid" ? totalAmount : 0) : (Math.max(0, parseFloat(amountPaidInput) || 0));
      const finalTime = salonTime || pedicureTime || time || "12:00";

      if (editingBooking) {
        const updatedBooking: Booking = {
          ...editingBooking,
          clientName: finalClientName,
          clientPhone: finalClientPhone,
          services: selectedServices,
          staffId: selectedStaffId,
          staffName,
          subtotal,
          discount,
          tip,
          totalAmount,
          amountPaid,
          paymentMethod,
          paymentStatus,
          date,
          time: finalTime,
          salonTime: salonTime || undefined,
          pedicureTime: pedicureTime || undefined
        };
        await addBooking(updatedBooking);

        setEditingBooking(null);
        setClientName("");
        setClientPhone("");
        setSelectedServices([]);
        setSelectedStaffId("");
        setPaymentMethod("cash");
        setPaymentStatus("unpaid");
        setDiscountInput("0");
        setTipInput("0");
        setAmountPaidInput("");
        setSalonTime("");
        setPedicureTime("");
        setShowAppointmentModal(false);
        onBookingAdded();
        setFormLoading(false);
        return;
      }

      const bookingId = `b-${Date.now()}`;
      const newBooking: Booking = {
        id: bookingId,
        clientName: finalClientName,
        clientPhone: finalClientPhone,
        bookingType: "appointment",
        services: selectedServices,
        staffId: selectedStaffId,
        staffName,
        subtotal,
        discount,
        tip,
        totalAmount,
        amountPaid,
        paymentMethod,
        paymentStatus,
        status: "pending", // Scheduled starts as pending
        date,
        time: finalTime,
        salonTime: salonTime || undefined,
        pedicureTime: pedicureTime || undefined,
        createdAt: new Date().toISOString()
      };

      await addBooking(newBooking);

      // Log in Khata Book if payment is Unpaid/Khata
      if (paymentStatus === "unpaid") {
        const remainingDebt = Math.max(0, totalAmount - amountPaid);
        if (remainingDebt > 0) {
          const khataId = `khata-client-${finalClientPhone}`;
          await adjustKhataBalance(khataId, finalClientName, finalClientPhone, remainingDebt);

          const khataLog: KhataLog = {
            id: `klog-${Date.now()}`,
            accountId: khataId,
            accountName: finalClientName,
            amount: remainingDebt,
            type: "debit",
            description: `Appointment: ${selectedServices.map(s => s.name).join(", ")} (Total: Rs. ${totalAmount}, Paid: Rs. ${amountPaid})`,
            date,
            createdAt: new Date().toISOString()
          };
          await addKhataLog(khataLog);
        }
      }

      setClientName("");
      setClientPhone("");
      setSelectedServices([]);
      setSelectedStaffId("");
      setPaymentMethod("cash");
      setPaymentStatus("unpaid");
      setDiscountInput("0");
      setTipInput("0");
      setAmountPaidInput("");
      setSalonTime("");
      setPedicureTime("");
      setShowAppointmentModal(false);
      onBookingAdded();
    } catch (err) {
      console.error(err);
      setFormError("Appointment save karne me error aya.");
    } finally {
      setFormLoading(false);
    }
  };

  const handleToggleFormService = (service: SalonService) => {
    setSelectedServices([...selectedServices, service]);
  };

  const handleRemoveFormServiceInstance = (serviceId: string) => {
    const idx = selectedServices.findIndex(s => s.id === serviceId);
    if (idx > -1) {
      const updated = [...selectedServices];
      updated.splice(idx, 1);
      setSelectedServices(updated);
    }
  };

  const handleRemoveAllFormInstances = (serviceId: string) => {
    setSelectedServices(selectedServices.filter(s => s.id !== serviceId));
  };

  const getFormServiceQuantity = (serviceId: string) => {
    return selectedServices.filter(s => s.id === serviceId).length;
  };

  // Helper to check if two dates belong to the same week (starting on Monday)
  const isSameWeek = (dateStr1: string, dateStr2: string) => {
    try {
      const d1 = new Date(dateStr1);
      const d2 = new Date(dateStr2);
      
      const getMonday = (d: Date) => {
        const date = new Date(d);
        const day = date.getDay();
        const diff = date.getDate() - day + (day === 0 ? -6 : 1);
        const monday = new Date(date.setDate(diff));
        monday.setHours(0, 0, 0, 0);
        return monday.getTime();
      };

      return getMonday(d1) === getMonday(d2);
    } catch {
      return false;
    }
  };

  // Filter Bookings logic
  const filteredBookings = bookings.filter(b => {
    const matchesSearch = 
      b.clientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.clientPhone.includes(searchQuery) ||
      b.staffName.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesType = typeFilter === "all" || b.bookingType === typeFilter;
    const matchesPayment = paymentFilter === "all" || b.paymentMethod === paymentFilter;

    let matchesDate = true;
    if (dateFilterMode === "single_date") {
      matchesDate = b.date === selectedFilterDate;
    } else if (dateFilterMode === "week") {
      matchesDate = isSameWeek(b.date, selectedFilterDate);
    } else if (dateFilterMode === "month") {
      const [bYear, bMonth] = b.date.split("-");
      matchesDate = bYear === selectedFilterYear && bMonth === selectedFilterMonth;
    } else if (dateFilterMode === "year") {
      const [bYear] = b.date.split("-");
      matchesDate = bYear === selectedFilterYear;
    }

    return matchesSearch && matchesType && matchesPayment && matchesDate;
  });

  // Handle status update
  const handleUpdateStatus = async (id: string, currentStatus: "completed" | "pending" | "cancelled") => {
    let nextStatus: "completed" | "pending" | "cancelled" = "completed";
    if (currentStatus === "completed") nextStatus = "cancelled";
    else if (currentStatus === "cancelled") nextStatus = "pending";
    else nextStatus = "completed";

    try {
      await updateBookingStatus(id, nextStatus);
      onBookingDeleted(); // Reload parent state
    } catch (err) {
      console.error(err);
    }
  };

  // Handle transaction delete
  const handleDeleteBooking = async (id: string) => {
    if (window.confirm("Kiya aap waqai is Booking/Sale transaction ko delete karna chahte hain?")) {
      try {
        await deleteBooking(id);
        onBookingDeleted();
      } catch (err: any) {
        console.error("Delete booking error:", err);
        alert(`Booking delete nahi ho saki: ${err.message || err}`);
      }
    }
  };

  // Status Badge Colors
  const getStatusBadge = (status: Booking["status"]) => {
    switch (status) {
      case "completed":
        return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
      case "pending":
        return "bg-amber-500/10 text-amber-400 border-amber-500/20";
      case "cancelled":
        return "bg-rose-500/10 text-rose-400 border-rose-500/20";
      default:
        return "bg-slate-500/10 text-slate-400 border-slate-500/20";
    }
  };

  // Payment Method Badges / Icon
  const getPaymentEmoji = (method: Booking["paymentMethod"]) => {
    switch (method) {
      case "cash": return "💵 Cash";
      case "easypaisa": return "🟢 EasyPaisa";
      case "jazzcash": return "🔴 JazzCash";
      case "bank_transfer": return "🏦 Bank Transfer";
      case "online": return "💳 Online";
    }
  };

  // Pre-defined Excel appointment timings & slots
  const predefinedSlots = [
    { sno: 1, label: "11:00 AM DAY", time: "11:00" },
    { sno: 2, label: "11:30 AM DAY", time: "11:30" },
    { sno: 3, label: "12:00 PM DAY", time: "12:00" },
    { sno: 4, label: "12:30 PM DAY", time: "12:30" },
    { sno: 5, label: "1:00 PM DAY", time: "13:00" },
    { sno: 6, label: "1:30 PM DAY", time: "13:30" },
    { sno: 7, label: "2:00 PM DAY", time: "14:00" },
    { sno: 8, label: "2:30 PM DAY", time: "14:30" },
    { sno: 9, label: "3:00 PM DAY", time: "15:00" },
    { sno: 10, label: "3:30 PM DAY", time: "15:30" },
    { sno: 11, label: "4:00 PM DAY", time: "16:00" },
    { sno: 12, label: "4:30 PM DAY", time: "16:30" },
    { sno: 13, label: "5:00 PM DAY", time: "17:00" },
    { sno: 14, label: "5:30 PM DAY", time: "17:30" },
    { sno: 15, label: "6:00 PM DAY", time: "18:00" },
    { sno: 16, label: "6:30 PM DAY", time: "18:30" },
    { sno: 17, label: "7:00 PM NIGHT", time: "19:00" },
    { sno: 18, label: "7:30 PM NIGHT", time: "19:30" },
    { sno: 19, label: "8:00 PM NIGHT", time: "20:00" },
    { sno: 20, label: "8:30 PM NIGHT", time: "20:30" },
    { sno: 21, label: "9:00 PM NIGHT", time: "21:00" },
    { sno: 22, label: "9:30 PM NIGHT", time: "21:30" },
    { sno: 23, label: "10:00 PM NIGHT", time: "22:00" },
    { sno: 24, label: "10:30 PM NIGHT", time: "22:30" },
    { sno: 25, label: "11:00 PM NIGHT", time: "23:00" },
    { sno: 26, label: "11:30 PM NIGHT", time: "23:30" },
    { sno: 27, label: "12:00 AM NIGHT", time: "00:00" }
  ];

  // Date Navigation Helpers
  const handlePrevDay = () => {
    try {
      const d = new Date(selectedFilterDate);
      d.setDate(d.getDate() - 1);
      setSelectedFilterDate(d.toISOString().split('T')[0]);
    } catch (e) {
      console.error(e);
    }
  };

  const handleNextDay = () => {
    try {
      const d = new Date(selectedFilterDate);
      d.setDate(d.getDate() + 1);
      setSelectedFilterDate(d.toISOString().split('T')[0]);
    } catch (e) {
      console.error(e);
    }
  };

  const handleSetToday = () => {
    setSelectedFilterDate(new Date().toISOString().split('T')[0]);
  };

  const getFormattedSheetDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      const days = ["Sunday (Itwar)", "Monday (Peer)", "Tuesday (Mangal)", "Wednesday (Budh)", "Thursday (Jumeraat)", "Friday (Juma)", "Saturday (Hafta)"];
      const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      return `${days[d.getDay()] || "Day"}, ${d.getDate()} ${months[d.getMonth()] || "Month"} ${d.getFullYear()}`;
    } catch {
      return dateStr;
    }
  };

  // Map bookings to slots
  const dailyBookingsForSheet = bookings.filter(b => b.date === selectedFilterDate);

  const mappedSheetSlots = (() => {
    const assignedIds = new Set<string>();
    return predefinedSlots.map((slot) => {
      const matched = dailyBookingsForSheet.find((b) => {
        if (assignedIds.has(b.id)) return false;
        const bookingTime = b.time.substring(0, 5);
        return bookingTime === slot.time;
      });

      if (matched) {
        assignedIds.add(matched.id);
      }

      return {
        ...slot,
        booking: matched || null
      };
    });
  })();

  const extraBookingsForSheet = dailyBookingsForSheet.filter(b => {
    const wasMapped = mappedSheetSlots.some(s => s.booking?.id === b.id);
    return !wasMapped;
  });

  return (
    <div className="space-y-6">
      {/* Title with Book Appointment Button */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
            <Calendar className="text-amber-500" />
            Client Bookings & Transactions Ledger
          </h2>
          <p className="text-slate-400 text-sm">
            Walk-in clients, Online bookings, aur Appointments ka transaction ledger aur filters.
          </p>
        </div>

        <button
          onClick={() => setShowAppointmentModal(true)}
          className="flex items-center gap-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-extrabold px-4.5 py-2.5 rounded-xl transition duration-150 text-xs shadow-md shadow-amber-500/10 active:scale-95 cursor-pointer"
        >
          <Plus size={15} className="stroke-[3]" />
          <span>Naya Appointment Book Karein</span>
        </button>
      </div>

      {/* View Toggle Tabs */}
      <div className="flex bg-slate-950 p-1.5 rounded-2xl border border-slate-800/80 w-fit">
        <button
          onClick={() => {
            setBookingsViewTab("sheet");
            setDateFilterMode("single_date");
          }}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold tracking-wide transition cursor-pointer ${
            bookingsViewTab === "sheet"
              ? "bg-amber-400 text-slate-950 shadow-lg shadow-amber-400/15"
              : "text-slate-400 hover:text-white"
          }`}
        >
          <Calendar size={14} className="stroke-[2.5]" />
          <span>📅 Daily Appointment Sheet (Excel Book)</span>
        </button>
        <button
          onClick={() => setBookingsViewTab("ledger")}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold tracking-wide transition cursor-pointer ${
            bookingsViewTab === "ledger"
              ? "bg-amber-400 text-slate-950 shadow-lg shadow-amber-400/15"
              : "text-slate-400 hover:text-white"
          }`}
        >
          <Activity size={14} className="stroke-[2.5]" />
          <span>🔍 Search & Filter Ledger</span>
        </button>
      </div>

      {/* Conditional Rendering of Views */}
      {bookingsViewTab === "sheet" && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-5">
          {/* Header styling matching their Excel Sheet */}
          <div className="text-center py-4 border-b border-slate-800 space-y-1.5">
            <h3 className="text-2xl font-black text-amber-400 tracking-wider font-sans uppercase">
              ★ Smart Saloon 33 ★
            </h3>
            <p className="text-xs font-extrabold text-slate-400 uppercase tracking-widest border-b border-dashed border-slate-800 pb-2 w-fit mx-auto">
              Customer Appointment Sheet
            </p>
          </div>

          {/* Date Picker & Navigators */}
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-slate-950 p-4 rounded-xl border border-slate-800/60">
            <div className="flex items-center gap-2">
              <button
                onClick={handlePrevDay}
                className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white rounded-lg border border-slate-800 transition text-xs font-bold cursor-pointer"
                title="Pichla Din (Previous Day)"
              >
                ← Pichla Din
              </button>
              
              <div className="bg-slate-900 border border-slate-800 rounded-lg px-4 py-1.5 font-bold font-mono text-xs text-amber-400 text-center min-w-[180px]">
                {getFormattedSheetDate(selectedFilterDate)}
              </div>

              <button
                onClick={handleNextDay}
                className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white rounded-lg border border-slate-800 transition text-xs font-bold cursor-pointer"
                title="Agla Din (Next Day)"
              >
                Agla Din →
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <span className="text-[10px] text-slate-500 uppercase font-bold">Direct Date:</span>
              <input
                type="date"
                value={selectedFilterDate}
                onChange={(e) => {
                  setSelectedFilterDate(e.target.value);
                  setDateFilterMode("single_date");
                }}
                className="bg-slate-900 border border-slate-800 text-xs text-white px-3 py-1.5 rounded-xl outline-none font-bold font-mono cursor-pointer"
              />
              <button
                onClick={handleSetToday}
                className="px-3 py-1.5 bg-amber-400 hover:bg-amber-500 text-slate-950 rounded-xl text-xs font-bold transition active:scale-95 cursor-pointer"
              >
                Aaj (Today)
              </button>
            </div>
          </div>

          {/* Timing/Slots Status Summary Counters */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-slate-950 border border-slate-800/60 p-4 rounded-xl text-center space-y-1">
              <span className="text-[10px] text-slate-500 uppercase font-bold">Kul Timings (Total Slots)</span>
              <p className="text-lg font-black text-slate-300 font-mono">{predefinedSlots.length} Slots</p>
            </div>
            <div className="bg-slate-950 border border-slate-800/60 p-4 rounded-xl text-center space-y-1">
              <span className="text-[10px] text-slate-500 uppercase font-bold">Booked Timings (Bhare Hue)</span>
              <p className="text-lg font-black text-rose-400 font-mono">
                {mappedSheetSlots.filter(s => s.booking).length} Slots
              </p>
            </div>
            <div className="bg-slate-950 border border-slate-800/60 p-4 rounded-xl text-center space-y-1">
              <span className="text-[10px] text-slate-500 uppercase font-bold">Baqi Timings (Available Slots)</span>
              <p className="text-lg font-black text-emerald-400 font-mono">
                {mappedSheetSlots.filter(s => !s.booking).length} Slots
              </p>
            </div>
          </div>

          {/* Excel spreadsheet representation table */}
          <div className="overflow-x-auto border border-slate-800 rounded-2xl bg-slate-950/20">
            <table className="w-full border-collapse border border-slate-800 text-left text-xs text-slate-300">
              <thead>
                <tr className="bg-amber-400 text-slate-950 font-black border-b border-slate-800 uppercase text-[10px] tracking-wider text-center">
                  <th className="py-3 px-3 border border-slate-800 font-black w-12">SNO</th>
                  <th className="py-3 px-4 border border-slate-800 font-black text-left">CLIENTS NAME</th>
                  <th className="py-3 px-4 border border-slate-800 font-black text-left">STAFF</th>
                  <th className="py-3 px-3 border border-slate-800 font-black text-left">MOBILE NO.</th>
                  <th className="py-3 px-4 border border-slate-800 font-black text-center w-36">TIMING</th>
                  <th className="py-3 px-4 border border-slate-800 font-black text-left">SERVICE</th>
                  <th className="py-3 px-4 border border-slate-800 font-black text-center">STATUS & BILLING</th>
                  <th className="py-3 px-4 border border-slate-800 font-black text-center w-32">ACTIONS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {mappedSheetSlots.map((slot, idx) => {
                  const b = slot.booking;
                  return (
                    <tr
                      key={idx}
                      className={`hover:bg-slate-900/40 transition duration-100 ${
                        b ? "bg-slate-900/20" : "bg-transparent"
                      }`}
                    >
                      {/* SNO */}
                      <td className="py-3 px-3 border border-slate-800 text-center font-mono font-bold text-slate-500">
                        {slot.sno}
                      </td>

                      {/* CLIENTS NAME */}
                      <td className="py-3 px-4 border border-slate-800 font-semibold text-white">
                        {b ? (
                          <div className="flex items-center gap-2">
                            <span className="w-5 h-5 rounded-full bg-slate-800 flex items-center justify-center text-[10px] text-amber-400 font-bold">
                              {b.clientName[0]?.toUpperCase() || "C"}
                            </span>
                            <span className="truncate max-w-[150px]">{b.clientName || "Walk-In Customer"}</span>
                            {b.bookingType && (
                              <span className="text-[8px] bg-slate-850 text-slate-400 px-1.5 py-0.5 rounded border border-slate-700 font-mono uppercase font-bold scale-90">
                                {b.bookingType.replace('_', ' ')}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-600 italic font-normal text-[11px] block">
                            -- AVAILABLE (Khali Slot) --
                          </span>
                        )}
                      </td>

                      {/* STAFF */}
                      <td className="py-3 px-4 border border-slate-800 font-semibold text-amber-400">
                        {b ? (
                          <div className="flex items-center gap-1">
                            <Scissors size={11} className="text-slate-500" />
                            <span>{b.staffName}</span>
                          </div>
                        ) : (
                          <span className="text-slate-600 font-mono text-center block">--</span>
                        )}
                      </td>

                      {/* MOBILE NO */}
                      <td className="py-3 px-3 border border-slate-800 font-mono text-[11px] text-slate-300">
                        {b ? (
                          <div className="flex items-center gap-1">
                            <Phone size={11} className="text-slate-500" />
                            <span>{b.clientPhone || "No Mobile"}</span>
                          </div>
                        ) : (
                          <span className="text-slate-600 font-mono text-center block">--</span>
                        )}
                      </td>

                      {/* TIMING */}
                      <td className="py-3 px-4 border border-slate-800 text-center font-mono text-xs font-bold text-white bg-slate-950/40">
                        <div>
                          <span>{slot.label}</span>
                          {b && (b.salonTime || b.pedicureTime) && (
                            <div className="flex flex-col gap-1 mt-1 text-[9px] font-sans">
                              {b.salonTime && (
                                <span className="text-amber-400 font-extrabold bg-amber-500/10 px-1 py-0.5 rounded border border-amber-500/10 whitespace-nowrap">
                                  💇‍♂️ Salon: {b.salonTime}
                                </span>
                              )}
                              {b.pedicureTime && (
                                <span className="text-teal-400 font-extrabold bg-teal-500/10 px-1 py-0.5 rounded border border-teal-500/10 whitespace-nowrap">
                                  🦶 Pedi: {b.pedicureTime}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </td>

                      {/* SERVICE */}
                      <td className="py-3 px-4 border border-slate-800">
                        {b ? (
                          <div className="flex flex-wrap gap-1">
                            {b.services && b.services.length > 0 ? (
                              b.services.map((s, sidx) => (
                                <span
                                  key={sidx}
                                  className="text-[10px] bg-slate-900 text-slate-300 border border-slate-800 px-1.5 py-0.5 rounded font-medium"
                                >
                                  {s.name}
                                </span>
                              ))
                            ) : (
                              <span className="text-slate-500">No Service</span>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-600 font-mono text-center block">--</span>
                        )}
                      </td>

                      {/* STATUS & BILLING */}
                      <td className="py-3 px-4 border border-slate-800 text-center">
                        {b ? (
                          <div className="flex flex-col items-center gap-1">
                            {/* Status badge */}
                            <button
                              onClick={() => handleUpdateStatus(b.id, b.status)}
                              className={`text-[9px] font-bold py-0.5 px-2 border rounded-md transition duration-150 flex items-center gap-1 ${getStatusBadge(
                                b.status
                              )}`}
                              title="Click to toggle status"
                            >
                              <span className="capitalize">{b.status}</span>
                            </button>

                            {/* Billing & Grand Total */}
                            <div className="flex items-center gap-1 pt-0.5">
                              <span className="text-[10px] text-emerald-400 font-mono font-bold">
                                Rs. {b.totalAmount.toLocaleString()}
                              </span>
                              <span
                                className={`text-[8px] font-black px-1.5 py-0.5 rounded ${
                                  b.paymentStatus === "paid"
                                    ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                                    : "bg-rose-500/15 text-rose-400 border border-rose-500/30 animate-pulse"
                                }`}
                              >
                                {b.paymentStatus === "paid" ? "RECEIVED (PAID)" : "NOT RECEIVED (UDHAAR)"}
                              </span>
                            </div>
                          </div>
                        ) : (
                          <span className="text-emerald-500/80 text-[10px] font-bold bg-emerald-500/5 px-2 py-0.5 rounded-full border border-emerald-500/10 inline-block font-mono">
                            🟢 AVAILABLE
                          </span>
                        )}
                      </td>

                      {/* ACTIONS */}
                      <td className="py-3 px-4 border border-slate-800 text-center">
                        {b ? (
                          <div className="flex items-center justify-center gap-1.5">
                            {/* Receipt */}
                            <button
                              onClick={() => {
                                setSelectedReceiptBooking(b);
                                setShowReceiptModal(true);
                              }}
                              className="text-slate-400 hover:text-amber-400 p-1.5 bg-slate-950 border border-slate-800 hover:border-amber-500/20 rounded-lg transition"
                              title="Print/Share Receipt"
                            >
                              <Printer size={11} className="text-amber-500" />
                            </button>

                            {/* Edit */}
                            <button
                              onClick={() => {
                                setEditingBooking(b);
                                setShowAppointmentModal(true);
                              }}
                              className="text-slate-400 hover:text-amber-400 p-1.5 bg-slate-950 border border-slate-800 hover:border-amber-500/20 rounded-lg transition"
                              title="Edit Booking"
                            >
                              <Edit2 size={11} />
                            </button>

                            {/* Delete */}
                            <button
                              onClick={() => handleDeleteBooking(b.id)}
                              className="text-slate-500 hover:text-rose-400 p-1.5 bg-slate-950 border border-slate-800 hover:border-rose-500/20 rounded-lg transition"
                              title="Delete Booking"
                            >
                              <Trash2 size={11} />
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => {
                              setEditingBooking(null);
                              // Set form date & time
                              setDate(selectedFilterDate);
                              setTime(slot.time);
                              setPaymentStatus("unpaid");
                              setShowAppointmentModal(true);
                            }}
                            className="w-full py-1 px-2 bg-emerald-500 hover:bg-emerald-650 text-slate-950 font-bold rounded-lg text-[10px] transition active:scale-95 cursor-pointer shadow-sm"
                          >
                            + Book Slot
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Extra / Off-schedule Walk-ins */}
          {extraBookingsForSheet.length > 0 && (
            <div className="space-y-3 pt-3">
              <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
                <Sparkles size={14} className="text-amber-400" />
                <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                  Other Custom Bookings & Walk-Ins of This Day (Extra Entries)
                </h4>
              </div>

              <div className="overflow-x-auto border border-slate-800 rounded-2xl bg-slate-950/20">
                <table className="w-full border-collapse border border-slate-800 text-left text-xs text-slate-300">
                  <thead>
                    <tr className="bg-slate-900 text-slate-400 font-bold border-b border-slate-800 text-[10px] uppercase tracking-wider text-left">
                      <th className="py-2.5 px-3 border border-slate-800 w-12 text-center">SNO</th>
                      <th className="py-2.5 px-4 border border-slate-800">CLIENTS NAME</th>
                      <th className="py-2.5 px-4 border border-slate-800">STAFF</th>
                      <th className="py-2.5 px-3 border border-slate-800">MOBILE NO.</th>
                      <th className="py-2.5 px-4 border border-slate-800 text-center w-36">TIMING</th>
                      <th className="py-2.5 px-4 border border-slate-800">SERVICE</th>
                      <th className="py-2.5 px-4 border border-slate-800 text-center">STATUS & BILLING</th>
                      <th className="py-2.5 px-4 border border-slate-800 text-center w-32">ACTIONS</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {extraBookingsForSheet.map((b, eidx) => (
                      <tr key={b.id} className="hover:bg-slate-900/40 transition duration-100">
                        <td className="py-3 px-3 border border-slate-800 text-center font-mono text-slate-500 font-bold">
                          E{eidx + 1}
                        </td>
                        <td className="py-3 px-4 border border-slate-800 font-semibold text-white">
                          <div className="flex items-center gap-2">
                            <span className="w-5 h-5 rounded-full bg-slate-800 flex items-center justify-center text-[10px] text-amber-400 font-bold">
                              {b.clientName[0]?.toUpperCase() || "C"}
                            </span>
                            <span className="truncate max-w-[150px]">{b.clientName}</span>
                            <span className="text-[8px] bg-slate-850 text-slate-400 px-1.5 py-0.5 rounded border border-slate-700 font-mono uppercase font-bold">
                              {b.bookingType.replace('_', ' ')}
                            </span>
                          </div>
                        </td>
                        <td className="py-3 px-4 border border-slate-800 font-semibold text-amber-400">
                          <div className="flex items-center gap-1">
                            <Scissors size={11} className="text-slate-500" />
                            <span>{b.staffName}</span>
                          </div>
                        </td>
                        <td className="py-3 px-3 border border-slate-800 font-mono text-[11px] text-slate-300">
                          <div className="flex items-center gap-1">
                            <Phone size={11} className="text-slate-500" />
                            <span>{b.clientPhone || "No Mobile"}</span>
                          </div>
                        </td>
                        <td className="py-3 px-4 border border-slate-800 text-center font-mono text-xs font-bold text-slate-400 bg-slate-950/20">
                          {b.time} (Custom)
                        </td>
                        <td className="py-3 px-4 border border-slate-800">
                          <div className="flex flex-wrap gap-1">
                            {b.services.map((s, sidx) => (
                              <span
                                key={sidx}
                                className="text-[10px] bg-slate-900 text-slate-300 border border-slate-800 px-1.5 py-0.5 rounded font-medium"
                              >
                                {s.name}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="py-3 px-4 border border-slate-800 text-center">
                          <div className="flex flex-col items-center gap-1">
                            <button
                              onClick={() => handleUpdateStatus(b.id, b.status)}
                              className={`text-[9px] font-bold py-0.5 px-2 border rounded-md transition flex items-center gap-1 ${getStatusBadge(
                                b.status
                              )}`}
                            >
                              <span className="capitalize">{b.status}</span>
                            </button>
                            <div className="flex items-center gap-1 pt-0.5">
                              <span className="text-[10px] text-emerald-400 font-mono font-bold">
                                Rs. {b.totalAmount.toLocaleString()}
                              </span>
                              <span
                                className={`text-[8px] font-black px-1.5 py-0.5 rounded ${
                                  b.paymentStatus === "paid"
                                    ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                                    : "bg-rose-500/15 text-rose-400 border border-rose-500/30 animate-pulse"
                                }`}
                              >
                                {b.paymentStatus === "paid" ? "RECEIVED (PAID)" : "NOT RECEIVED (UDHAAR)"}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4 border border-slate-800 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => {
                                setSelectedReceiptBooking(b);
                                setShowReceiptModal(true);
                              }}
                              className="text-slate-400 hover:text-amber-400 p-1.5 bg-slate-950 border border-slate-800 rounded-lg transition"
                            >
                              <Printer size={11} className="text-amber-500" />
                            </button>
                            <button
                              onClick={() => {
                                setEditingBooking(b);
                                setShowAppointmentModal(true);
                              }}
                              className="text-slate-400 hover:text-amber-400 p-1.5 bg-slate-950 border border-slate-800 rounded-lg transition"
                            >
                              <Edit2 size={11} />
                            </button>
                            <button
                              onClick={() => handleDeleteBooking(b.id)}
                              className="text-slate-500 hover:text-rose-400 p-1.5 bg-slate-950 border border-slate-800 rounded-lg transition"
                            >
                              <Trash2 size={11} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {bookingsViewTab === "ledger" && (
        <>
          {/* Filter and Search Panel */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
              {/* Search bar */}
              <div className="relative w-full md:w-80">
                <Search size={15} className="absolute left-3.5 top-3.5 text-slate-500" />
                <input
                  type="text"
                  placeholder="Client Name, Phone ya Stylist search..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500/50 rounded-xl py-2.5 pl-10 pr-4 text-xs text-white placeholder-slate-600 outline-none transition"
                />
              </div>

              {/* Filter select inputs */}
              <div className="flex flex-wrap gap-3 w-full md:w-auto">
                {/* Booking type */}
                <div className="flex items-center gap-1.5 bg-slate-950 px-3 py-1.5 border border-slate-800 rounded-xl w-full sm:w-auto">
                  <Filter size={12} className="text-amber-500" />
                  <span className="text-[10px] text-slate-500 uppercase font-bold">Type:</span>
                  <select
                    value={typeFilter}
                    onChange={(e) => setTypeFilter(e.target.value)}
                    className="bg-transparent text-xs text-slate-300 outline-none cursor-pointer border-none font-medium p-0"
                  >
                    <option value="all" className="bg-slate-950 text-white">All Bookings</option>
                    <option value="walk_in" className="bg-slate-950 text-white">Walk-In Entries</option>
                    <option value="appointment" className="bg-slate-950 text-white">Appointments</option>
                    <option value="online" className="bg-slate-950 text-white">Online Bookings</option>
                  </select>
                </div>

                {/* Payment method */}
                <div className="flex items-center gap-1.5 bg-slate-950 px-3 py-1.5 border border-slate-800 rounded-xl w-full sm:w-auto">
                  <CreditCard size={12} className="text-amber-500" />
                  <span className="text-[10px] text-slate-500 uppercase font-bold">Paid Via:</span>
                  <select
                    value={paymentFilter}
                    onChange={(e) => setPaymentFilter(e.target.value)}
                    className="bg-transparent text-xs text-slate-300 outline-none cursor-pointer border-none font-medium p-0"
                  >
                    <option value="all" className="bg-slate-950 text-white">All Payments</option>
                    <option value="cash" className="bg-slate-950 text-white">💵 Cash</option>
                    <option value="easypaisa" className="bg-slate-950 text-white">🟢 EasyPaisa</option>
                    <option value="jazzcash" className="bg-slate-950 text-white">🔴 JazzCash</option>
                    <option value="bank_transfer" className="bg-slate-950 text-white">🏦 Bank Transfer</option>
                    <option value="online" className="bg-slate-950 text-white">💳 Online Card</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Date / Period Filters */}
            <div className="border-t border-slate-800/60 pt-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[10px] text-slate-500 uppercase font-bold mr-2">Miyad (Period):</span>
                <button
                  onClick={() => setDateFilterMode("all")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${dateFilterMode === "all" ? "bg-amber-500 text-slate-950" : "bg-slate-950 text-slate-400 hover:text-white border border-slate-800/40"}`}
                >
                  Hamesha Ka Data (All Time)
                </button>
                <button
                  onClick={() => setDateFilterMode("single_date")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${dateFilterMode === "single_date" ? "bg-amber-500 text-slate-950" : "bg-slate-950 text-slate-400 hover:text-white border border-slate-800/40"}`}
                >
                  Khas Din (Specific Date)
                </button>
                <button
                  onClick={() => setDateFilterMode("week")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${dateFilterMode === "week" ? "bg-amber-500 text-slate-950" : "bg-slate-950 text-slate-400 hover:text-white border border-slate-800/40"}`}
                >
                  Hafta (Week's Records)
                </button>
                <button
                  onClick={() => setDateFilterMode("month")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${dateFilterMode === "month" ? "bg-amber-500 text-slate-950" : "bg-slate-950 text-slate-400 hover:text-white border border-slate-800/40"}`}
                >
                  Mahina (Month's Records)
                </button>
                <button
                  onClick={() => setDateFilterMode("year")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${dateFilterMode === "year" ? "bg-amber-500 text-slate-950" : "bg-slate-950 text-slate-400 hover:text-white border border-slate-800/40"}`}
                >
                  Saal (Year's Records)
                </button>
              </div>

              {/* Conditional inputs based on selected period filter */}
              <AnimatePresence mode="wait">
                {(dateFilterMode === "single_date" || dateFilterMode === "week") && (
                  <motion.div
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -5 }}
                    className="flex items-center gap-2 bg-slate-950 px-3 py-1.5 border border-slate-800 rounded-xl w-full lg:w-auto"
                  >
                    <span className="text-[10px] text-slate-500 uppercase font-bold whitespace-nowrap">
                      {dateFilterMode === "single_date" ? "Date Select:" : "Din Select (Hafta):"}
                    </span>
                    <input
                      type="date"
                      value={selectedFilterDate}
                      onChange={(e) => setSelectedFilterDate(e.target.value)}
                      className="bg-transparent text-xs text-amber-400 outline-none font-bold font-mono border-none p-0 cursor-pointer"
                    />
                  </motion.div>
                )}

                {dateFilterMode === "month" && (
                  <motion.div
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -5 }}
                    className="flex flex-wrap items-center gap-2 bg-slate-950 px-3 py-1.5 border border-slate-800 rounded-xl w-full lg:w-auto"
                  >
                    <div className="flex items-center gap-1">
                      <span className="text-[10px] text-slate-500 uppercase font-bold whitespace-nowrap">Month:</span>
                      <select
                        value={selectedFilterMonth}
                        onChange={(e) => setSelectedFilterMonth(e.target.value)}
                        className="bg-transparent text-xs text-amber-400 outline-none font-bold border-none p-0 cursor-pointer"
                      >
                        <option value="01" className="bg-slate-950 text-white">January</option>
                        <option value="02" className="bg-slate-950 text-white">February</option>
                        <option value="03" className="bg-slate-950 text-white">March</option>
                        <option value="04" className="bg-slate-950 text-white">April</option>
                        <option value="05" className="bg-slate-950 text-white">May</option>
                        <option value="06" className="bg-slate-950 text-white">June</option>
                        <option value="07" className="bg-slate-950 text-white">July</option>
                        <option value="08" className="bg-slate-950 text-white">August</option>
                        <option value="09" className="bg-slate-950 text-white">September</option>
                        <option value="10" className="bg-slate-950 text-white">October</option>
                        <option value="11" className="bg-slate-950 text-white">November</option>
                        <option value="12" className="bg-slate-950 text-white">December</option>
                      </select>
                    </div>

                    <div className="h-4 w-[1px] bg-slate-800 hidden sm:block"></div>

                    <div className="flex items-center gap-1">
                      <span className="text-[10px] text-slate-500 uppercase font-bold whitespace-nowrap">Year:</span>
                      <select
                        value={selectedFilterYear}
                        onChange={(e) => setSelectedFilterYear(e.target.value)}
                        className="bg-transparent text-xs text-amber-400 outline-none font-bold border-none p-0 cursor-pointer"
                      >
                        <option value="2025" className="bg-slate-950 text-white">2025</option>
                        <option value="2026" className="bg-slate-950 text-white">2026</option>
                        <option value="2027" className="bg-slate-950 text-white">2027</option>
                        <option value="2028" className="bg-slate-950 text-white">2028</option>
                      </select>
                    </div>
                  </motion.div>
                )}

                {dateFilterMode === "year" && (
                  <motion.div
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -5 }}
                    className="flex items-center gap-2 bg-slate-950 px-3 py-1.5 border border-slate-800 rounded-xl w-full lg:w-auto"
                  >
                    <span className="text-[10px] text-slate-500 uppercase font-bold whitespace-nowrap">Year:</span>
                    <select
                      value={selectedFilterYear}
                      onChange={(e) => setSelectedFilterYear(e.target.value)}
                      className="bg-transparent text-xs text-amber-400 outline-none font-bold border-none p-0 cursor-pointer"
                    >
                      <option value="2025" className="bg-slate-950 text-white">2025</option>
                      <option value="2026" className="bg-slate-950 text-white">2026</option>
                      <option value="2027" className="bg-slate-950 text-white">2027</option>
                      <option value="2028" className="bg-slate-950 text-white">2028</option>
                    </select>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Bookings Table / List */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
            {filteredBookings.length > 0 ? (
              <div className="divide-y divide-slate-800 max-h-[500px] overflow-y-auto">
                {filteredBookings.map((booking) => (
                  <div
                    key={booking.id}
                    className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-950/40 transition duration-150"
                  >
                    {/* Client & Date Details */}
                    <div className="flex items-start gap-4 min-w-0 md:max-w-md">
                      <div className="w-10 h-10 rounded-full bg-slate-950 border border-slate-800 flex items-center justify-center text-amber-500 flex-shrink-0">
                        <User size={18} />
                      </div>
                      <div className="space-y-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-sm font-bold text-white truncate">{booking.clientName}</span>
                          <span className="text-[9px] bg-slate-800 text-slate-400 font-bold px-2 py-0.5 rounded border border-slate-700 font-mono">
                            {booking.bookingType.toUpperCase().replace('_', ' ')}
                          </span>
                        </div>

                        <div className="flex items-center gap-3 text-xs text-slate-400">
                          <span className="flex items-center gap-1 font-mono text-[11px]">
                            <Phone size={12} className="text-slate-500" />
                            {booking.clientPhone}
                          </span>
                          <span className="text-slate-600">•</span>
                          <span className="flex items-center gap-1 font-mono text-[11px]">
                            <Clock size={12} className="text-slate-500" />
                            {booking.date} @ {booking.time}
                          </span>
                        </div>

                        {/* Services Performed */}
                        <div className="flex flex-wrap items-center gap-1.5 pt-1">
                          <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider flex items-center gap-0.5">
                            <CornerDownRight size={10} />
                            Services:
                          </span>
                          {booking.services.map((s, idx) => (
                            <span
                              key={idx}
                              className="text-[10px] bg-slate-950/80 text-slate-300 px-2 py-0.5 border border-slate-800 rounded font-medium"
                            >
                              {s.name}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Staff Assignment & Payments */}
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 items-center text-left md:text-right min-w-0 flex-shrink-0">
                      {/* Stylist name */}
                      <div className="col-span-2 sm:col-span-1">
                        <span className="text-[10px] text-slate-500 block font-bold uppercase tracking-wider">Stylist</span>
                        <span className="text-xs font-semibold text-amber-400 flex items-center md:justify-end gap-1">
                          <Scissors size={11} /> {booking.staffName}
                        </span>
                      </div>

                      {/* Payment Info */}
                      <div>
                        <span className="text-[10px] text-slate-500 block font-bold uppercase tracking-wider">Payment Mode</span>
                        <span className="text-xs text-slate-200 font-medium block">
                          {getPaymentEmoji(booking.paymentMethod)}
                        </span>
                      </div>

                      {/* Pricing / Subtotal */}
                      <div className="text-right">
                        <span className="text-[10px] text-slate-500 block font-bold uppercase tracking-wider">Grand Total</span>
                        <span className="text-sm font-bold text-emerald-400 font-mono block">
                          Rs. {booking.totalAmount.toLocaleString()}
                        </span>
                        {booking.discount ? (
                          <span className="text-[9px] text-rose-400 font-mono block">
                            -Rs. {booking.discount.toLocaleString()} (Discount)
                          </span>
                        ) : null}
                        {booking.tip ? (
                          <span className="text-[9px] text-emerald-400 font-mono block">
                            +Rs. {booking.tip.toLocaleString()} (Inaam)
                          </span>
                        ) : null}
                        {booking.amountPaid !== undefined && booking.amountPaid !== booking.totalAmount ? (
                          <span className="text-[9px] text-slate-400 font-mono block">
                            Paid: Rs. {booking.amountPaid.toLocaleString()}
                          </span>
                        ) : null}
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-2 self-end md:self-center">
                      {/* Status Toggle Button */}
                      <button
                        onClick={() => handleUpdateStatus(booking.id, booking.status)}
                        className={`text-[10px] font-bold py-1.5 px-3 border rounded-xl transition duration-150 flex items-center gap-1 ${getStatusBadge(
                          booking.status
                        )}`}
                        title="Change status"
                      >
                        <RefreshCw size={10} className="animate-spin-slow" />
                        <span className="capitalize">{booking.status}</span>
                      </button>

                      {/* Receipt (Print/Save) Button */}
                      <button
                        onClick={() => {
                          setSelectedReceiptBooking(booking);
                          setShowReceiptModal(true);
                        }}
                        className="text-slate-400 hover:text-amber-400 p-2 bg-slate-950 border border-slate-800 hover:border-amber-500/20 rounded-xl transition duration-150 flex items-center justify-center cursor-pointer"
                        title="Print/Share Receipt"
                      >
                        <Printer size={13} className="text-amber-500" />
                      </button>

                      {/* Edit Button */}
                      <button
                        onClick={() => {
                          setEditingBooking(booking);
                          setShowAppointmentModal(true);
                        }}
                        data-edit-booking-id={booking.id}
                        className="text-slate-400 hover:text-amber-400 p-2 bg-slate-950 border border-slate-800 hover:border-amber-500/20 rounded-xl transition duration-150 flex items-center justify-center cursor-pointer"
                        title="Edit booking record"
                      >
                        <Edit2 size={13} />
                      </button>

                      {/* Delete Button */}
                      <button
                        onClick={() => handleDeleteBooking(booking.id)}
                        className="text-slate-600 hover:text-rose-400 p-2 bg-slate-950 border border-slate-800 hover:border-rose-500/20 rounded-xl transition duration-150 flex items-center justify-center"
                        title="Delete booking record"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-16 bg-slate-950/40 text-center text-sm text-slate-500 border border-dashed border-slate-800 rounded-2xl m-6">
                Diye gaye filters ya search query ke mutabiq koi booking nahi mili.
              </div>
            )}
          </div>
        </>
      )}

      {/* Appointment Booking Modal */}
      <AnimatePresence>
        {showAppointmentModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowAppointmentModal(false)}
              className="absolute inset-0 bg-slate-950/85 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-lg p-6 relative z-10 max-h-[90vh] overflow-y-auto shadow-2xl flex flex-col"
            >
              {/* Header */}
              <div className="flex justify-between items-center pb-4 border-b border-slate-800 mb-4">
                <h3 className="text-base font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <Sparkles className="text-amber-500 animate-pulse" size={16} />
                  {editingBooking ? "Edit Appointment Details" : "Naya Appointment Register Karein"}
                </h3>
                <button
                  type="button"
                  onClick={() => {
                    setEditingBooking(null);
                    setShowAppointmentModal(false);
                  }}
                  className="p-1.5 bg-slate-800 hover:bg-slate-750 text-slate-400 hover:text-white rounded-xl border border-slate-700 transition cursor-pointer"
                >
                  <X size={15} />
                </button>
              </div>

              {formError && (
                <div className="p-3 mb-3 bg-rose-500/10 border border-rose-500/20 text-xs text-rose-400 rounded-xl flex items-center gap-2">
                  <AlertTriangle size={14} />
                  <span>{formError}</span>
                </div>
              )}

              <form onSubmit={handleSubmitAppointment} className="space-y-4 flex-grow">
                {/* Client Info */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div className="space-y-1.5">
                    <label className="text-xs text-slate-400 font-bold uppercase tracking-tight">Client Name <span className="text-[10px] text-slate-500 font-normal lowercase">(optional)</span></label>
                    <input
                      type="text"
                      placeholder="Client ka naam (Optional)"
                      value={clientName}
                      onChange={(e) => setClientName(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500/50 rounded-xl py-2.5 px-3.5 text-xs text-white placeholder-slate-600 outline-none"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs text-slate-400 font-bold uppercase tracking-tight">Client Phone <span className="text-[10px] text-slate-500 font-normal lowercase">(optional)</span></label>
                    <input
                      type="tel"
                      placeholder="Phone e.g. 03001234567"
                      value={clientPhone}
                      onChange={(e) => setClientPhone(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500/50 rounded-xl py-2.5 px-3.5 text-xs text-white placeholder-slate-600 outline-none font-mono"
                    />
                  </div>
                </div>

                {/* Date and Double Timings */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                  <div className="space-y-1.5">
                    <label className="text-xs text-slate-400 font-bold uppercase tracking-tight">Tareeq (Date) *</label>
                    <input
                      type="date"
                      required
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500/50 rounded-xl py-2.5 px-3.5 text-xs text-white outline-none font-mono"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs text-slate-400 font-bold uppercase tracking-tight">Salon Timing 💇‍♂️</label>
                    <input
                      type="time"
                      value={salonTime}
                      onChange={(e) => {
                        setSalonTime(e.target.value);
                        if (!time || time === "12:00") {
                          setTime(e.target.value);
                        }
                      }}
                      className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500/50 rounded-xl py-2.5 px-3.5 text-xs text-white outline-none font-mono"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs text-slate-400 font-bold uppercase tracking-tight">Pedicure Timing 🦶</label>
                    <input
                      type="time"
                      value={pedicureTime}
                      onChange={(e) => {
                        setPedicureTime(e.target.value);
                        if (!salonTime) {
                          setTime(e.target.value);
                        }
                      }}
                      className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500/50 rounded-xl py-2.5 px-3.5 text-xs text-white outline-none font-mono"
                    />
                  </div>
                </div>

                {/* Staff member */}
                <div className="space-y-1.5">
                  <label className="text-xs text-slate-400 font-bold uppercase tracking-tight">Assign Stylist (Staff) *</label>
                  <select
                    value={selectedStaffId}
                    onChange={(e) => setSelectedStaffId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500/50 rounded-xl py-2.5 px-3 text-xs text-slate-300 outline-none"
                  >
                    <option value="">-- Choose Stylist --</option>
                    {staff.filter(s => s.status === "active").map(s => (
                      <option key={s.id} value={s.id}>{s.name} ({s.role})</option>
                    ))}
                  </select>
                </div>

                {/* Payment Configuration */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 bg-slate-950 p-3.5 rounded-2xl border border-slate-850">
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wide">Payment Method</label>
                    <select
                      value={paymentMethod}
                      onChange={(e) => setPaymentMethod(e.target.value as any)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg py-2 px-2.5 text-xs text-white outline-none"
                    >
                      <option value="cash">Cash</option>
                      <option value="easypaisa">EasyPaisa</option>
                      <option value="jazzcash">JazzCash</option>
                      <option value="bank_transfer">Bank Transfer</option>
                      <option value="online">Online App</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wide">Payment Status *</label>
                    <select
                      value={paymentStatus}
                      onChange={(e) => setPaymentStatus(e.target.value as any)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg py-2 px-2.5 text-xs text-rose-400 font-extrabold outline-none"
                    >
                      <option value="unpaid" className="text-rose-400 font-extrabold">❌ PAYMENT NOT RECEIVED (Kal Dega / Udhaar)</option>
                      <option value="paid" className="text-emerald-400 font-extrabold">✅ PAYMENT RECEIVED (Paid)</option>
                    </select>
                  </div>
                </div>

                {/* Services multi-select */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <label className="text-xs text-slate-400 font-bold uppercase tracking-tight">Choose Services *</label>
                    <input
                      type="text"
                      placeholder="Search service..."
                      value={serviceSearch}
                      onChange={(e) => setServiceSearch(e.target.value)}
                      className="bg-slate-950 border border-slate-850 focus:border-amber-500/30 rounded-lg py-1 px-2.5 text-[10px] text-white outline-none w-36"
                    />
                  </div>

                  <div className="bg-slate-950 border border-slate-850 rounded-2xl p-2 max-h-[140px] overflow-y-auto divide-y divide-slate-900">
                    {services
                      .filter(s => s.name.toLowerCase().includes(serviceSearch.toLowerCase()))
                      .map((service) => {
                        const qty = getFormServiceQuantity(service.id);
                        return (
                          <div
                            key={service.id}
                            className="flex items-center justify-between p-2 hover:bg-slate-900/40 rounded-lg text-xs select-none"
                          >
                            <span className="text-slate-300 font-medium flex items-center gap-1.5 cursor-pointer" onClick={() => handleToggleFormService(service)}>
                              {service.name}
                              {qty > 0 && (
                                <span className="bg-amber-500 text-slate-950 text-[9px] font-black px-1.5 py-0.2 rounded-full">
                                  x{qty}
                                </span>
                              )}
                            </span>
                            <div className="flex items-center gap-2">
                              <span className="text-amber-400 font-bold font-mono">Rs. {service.price}</span>
                              
                              {qty > 0 ? (
                                <div className="flex items-center bg-slate-900 border border-slate-850 rounded-lg p-0.5">
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveFormServiceInstance(service.id)}
                                    className="w-5 h-5 flex items-center justify-center text-slate-400 hover:text-white rounded transition font-bold cursor-pointer"
                                  >
                                    -
                                  </button>
                                  <span className="px-1 text-[10px] font-bold text-white font-mono">{qty}</span>
                                  <button
                                    type="button"
                                    onClick={() => handleToggleFormService(service)}
                                    className="w-5 h-5 flex items-center justify-center text-slate-400 hover:text-white rounded transition font-bold cursor-pointer"
                                  >
                                    +
                                  </button>
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => handleToggleFormService(service)}
                                  className="px-2 py-0.5 bg-slate-900 border border-slate-800 hover:border-amber-500/20 text-slate-400 hover:text-amber-400 rounded-md transition text-[10px] font-bold cursor-pointer"
                                >
                                  + Add
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>

                {/* Discount & Tip Inputs */}
                <div className="grid grid-cols-2 gap-3.5 pt-1.5">
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wide block">
                      🎁 Discount (Rihayat - Rs.)
                    </label>
                    <input
                      type="number"
                      min="0"
                      placeholder="0"
                      value={discountInput === "0" ? "" : discountInput}
                      onChange={(e) => setDiscountInput(e.target.value || "0")}
                      className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500/50 rounded-xl py-2 px-3 text-xs text-white placeholder-slate-600 outline-none font-mono"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wide block">
                      ⭐ Tip (Stylist Inaam - Rs.)
                    </label>
                    <input
                      type="number"
                      min="0"
                      placeholder="0"
                      value={tipInput === "0" ? "" : tipInput}
                      onChange={(e) => setTipInput(e.target.value || "0")}
                      className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500/50 rounded-xl py-2 px-3 text-xs text-white placeholder-slate-600 outline-none font-mono"
                    />
                  </div>
                </div>

                {/* Amount Received Input */}
                <div className="space-y-1.5 pt-1">
                  <label className="text-[10px] text-amber-400 font-bold uppercase tracking-wide block">
                    💵 Amount Received (Usne Mujhe Kitne Diye - Rs.)
                  </label>
                  <input
                    type="number"
                    min="0"
                    placeholder={`Default: Rs. ${(selectedServices.reduce((sum, s) => sum + s.price, 0) - (Math.max(0, parseFloat(discountInput) || 0)) + (Math.max(0, parseFloat(tipInput) || 0))).toLocaleString()}`}
                    value={amountPaidInput}
                    onChange={(e) => setAmountPaidInput(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500/50 rounded-xl py-2 px-3.5 text-xs text-white placeholder-slate-600 outline-none font-mono"
                  />
                </div>

                {/* Grand Total Display */}
                <div className="bg-slate-950 border border-slate-800 p-4 rounded-2xl space-y-2.5">
                  <div className="flex justify-between items-center text-xs text-slate-400">
                    <span>Subtotal:</span>
                    <span className="font-mono">Rs. {selectedServices.reduce((sum, s) => sum + s.price, 0).toLocaleString()}</span>
                  </div>
                  {(Math.max(0, parseFloat(discountInput) || 0)) > 0 && (
                    <div className="flex justify-between items-center text-xs text-rose-400">
                      <span>Discount (Sastai):</span>
                      <span className="font-mono">- Rs. {(Math.max(0, parseFloat(discountInput) || 0)).toLocaleString()}</span>
                    </div>
                  )}
                  {(Math.max(0, parseFloat(tipInput) || 0)) > 0 && (
                    <div className="flex justify-between items-center text-xs text-emerald-400">
                      <span>Tip (Stylist Inaam):</span>
                      <span className="font-mono">+ Rs. {(Math.max(0, parseFloat(tipInput) || 0)).toLocaleString()}</span>
                    </div>
                  )}
                  <div className="flex justify-between items-center pt-1.5 border-t border-slate-900">
                    <span className="text-xs font-bold text-white uppercase">Grand Total:</span>
                    <span className="text-sm font-black text-amber-400 font-mono">
                      Rs. {Math.max(0, selectedServices.reduce((sum, s) => sum + s.price, 0) - (Math.max(0, parseFloat(discountInput) || 0)) + (Math.max(0, parseFloat(tipInput) || 0))).toLocaleString()}
                    </span>
                  </div>

                  {/* Cash Return display inside Modal */}
                  {paymentStatus === "paid" && (
                    <div className="border-t border-slate-900 pt-2 flex justify-between items-center text-[11px]">
                      <span className="text-slate-400">Change Return (Baqaya):</span>
                      <span className="text-emerald-400 font-black font-mono">
                        Rs. {Math.max(0, (amountPaidInput === "" ? Math.max(0, selectedServices.reduce((sum, s) => sum + s.price, 0) - (Math.max(0, parseFloat(discountInput) || 0)) + (Math.max(0, parseFloat(tipInput) || 0))) : (Math.max(0, parseFloat(amountPaidInput) || 0))) - Math.max(0, selectedServices.reduce((sum, s) => sum + s.price, 0) - (Math.max(0, parseFloat(discountInput) || 0)) + (Math.max(0, parseFloat(tipInput) || 0)))).toLocaleString()}
                      </span>
                    </div>
                  )}
                  {paymentStatus === "unpaid" && (
                    <div className="border-t border-slate-900 pt-2 flex justify-between items-center text-[11px]">
                      <span className="text-slate-400">Add to Khata (Pending):</span>
                      <span className="text-rose-400 font-black font-mono">
                        Rs. {Math.max(0, Math.max(0, selectedServices.reduce((sum, s) => sum + s.price, 0) - (Math.max(0, parseFloat(discountInput) || 0)) + (Math.max(0, parseFloat(tipInput) || 0))) - (amountPaidInput === "" ? 0 : (Math.max(0, parseFloat(amountPaidInput) || 0)))).toLocaleString()}
                      </span>
                    </div>
                  )}
                </div>

                <div className="flex gap-2.5 pt-3 justify-end text-xs font-bold">
                  <button
                    type="button"
                    onClick={() => {
                      setEditingBooking(null);
                      setShowAppointmentModal(false);
                    }}
                    className="bg-slate-800 text-slate-400 hover:text-white px-4.5 py-2.5 rounded-xl transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={formLoading}
                    className="bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-slate-950 px-5.5 py-2.5 rounded-xl transition shadow-md font-black"
                  >
                    {formLoading ? "Saving..." : (editingBooking ? "Update Appointment" : "Save Appointment")}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <ReceiptModal
        isOpen={showReceiptModal}
        onClose={() => {
          setShowReceiptModal(false);
          setSelectedReceiptBooking(null);
        }}
        booking={selectedReceiptBooking || {}}
      />
    </div>
  );
}
