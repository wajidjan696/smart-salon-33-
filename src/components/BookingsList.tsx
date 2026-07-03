import React, { useState } from "react";
import { Booking, SalonService, StaffMember, KhataAccount, KhataLog } from "../types";
import { updateBookingStatus, deleteBooking, addBooking, saveKhataAccount, addKhataLog } from "../firebaseService";
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
  Edit2
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
  // Filters & Search
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [paymentFilter, setPaymentFilter] = useState<string>("all");

  // Appointment Form State
  const [showAppointmentModal, setShowAppointmentModal] = useState(false);
  const [clientName, setClientName] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [selectedServices, setSelectedServices] = useState<SalonService[]>([]);
  const [selectedStaffId, setSelectedStaffId] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "easypaisa" | "jazzcash" | "bank_transfer" | "online">("cash");
  const [paymentStatus, setPaymentStatus] = useState<"paid" | "unpaid">("unpaid"); // Default pending appointment to unpaid/khata
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [time, setTime] = useState("12:00");
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
      setDate(editingBooking.date);
      setTime(editingBooking.time);
    } else {
      setClientName("");
      setClientPhone("");
      setSelectedServices([]);
      setSelectedStaffId("");
      setPaymentMethod("cash");
      setPaymentStatus("unpaid");
      setDate(new Date().toISOString().split('T')[0]);
      setTime("12:00");
    }
  }, [editingBooking]);

  const handleSubmitAppointment = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");

    if (!clientName.trim()) {
      setFormError("Client ka naam likhna zaroori hai.");
      return;
    }
    if (!clientPhone.trim()) {
      setFormError("Client ka phone number likhna zaroori hai.");
      return;
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
      const totalAmount = selectedServices.reduce((sum, s) => sum + s.price, 0);

      if (editingBooking) {
        const updatedBooking: Booking = {
          ...editingBooking,
          clientName: clientName.trim(),
          clientPhone: clientPhone.trim(),
          services: selectedServices,
          staffId: selectedStaffId,
          staffName,
          totalAmount,
          paymentMethod,
          paymentStatus,
          date,
          time
        };
        await addBooking(updatedBooking);

        setEditingBooking(null);
        setClientName("");
        setClientPhone("");
        setSelectedServices([]);
        setSelectedStaffId("");
        setPaymentMethod("cash");
        setPaymentStatus("unpaid");
        setShowAppointmentModal(false);
        onBookingAdded();
        setFormLoading(false);
        return;
      }

      const bookingId = `b-${Date.now()}`;
      const newBooking: Booking = {
        id: bookingId,
        clientName: clientName.trim(),
        clientPhone: clientPhone.trim(),
        bookingType: "appointment",
        services: selectedServices,
        staffId: selectedStaffId,
        staffName,
        totalAmount,
        paymentMethod,
        paymentStatus,
        status: "pending", // Scheduled starts as pending
        date,
        time,
        createdAt: new Date().toISOString()
      };

      await addBooking(newBooking);

      // Log in Khata Book if payment is Unpaid/Khata
      if (paymentStatus === "unpaid") {
        const khataId = `khata-client-${clientPhone.trim()}`;
        const newKhata: KhataAccount = {
          id: khataId,
          name: clientName.trim(),
          type: "client",
          phone: clientPhone.trim(),
          balance: totalAmount,
          lastUpdated: new Date().toISOString()
        };
        await saveKhataAccount(newKhata);

        const khataLog: KhataLog = {
          id: `klog-${Date.now()}`,
          accountId: khataId,
          accountName: clientName.trim(),
          amount: totalAmount,
          type: "debit",
          description: `Appointment: ${selectedServices.map(s => s.name).join(", ")}`,
          date,
          createdAt: new Date().toISOString()
        };
        await addKhataLog(khataLog);
      }

      setClientName("");
      setClientPhone("");
      setSelectedServices([]);
      setSelectedStaffId("");
      setPaymentMethod("cash");
      setPaymentStatus("unpaid");
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
    const isSelected = selectedServices.some(s => s.id === service.id);
    if (isSelected) {
      setSelectedServices(selectedServices.filter(s => s.id !== service.id));
    } else {
      setSelectedServices([...selectedServices, service]);
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

    return matchesSearch && matchesType && matchesPayment;
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

      {/* Filter and Search Panel */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col md:flex-row gap-4 items-center justify-between">
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
                    <label className="text-xs text-slate-400 font-bold uppercase tracking-tight">Client Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="Client ka naam"
                      value={clientName}
                      onChange={(e) => setClientName(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500/50 rounded-xl py-2.5 px-3.5 text-xs text-white placeholder-slate-600 outline-none"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs text-slate-400 font-bold uppercase tracking-tight">Client Phone *</label>
                    <input
                      type="tel"
                      required
                      placeholder="Phone (0300...)"
                      value={clientPhone}
                      onChange={(e) => setClientPhone(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500/50 rounded-xl py-2.5 px-3.5 text-xs text-white placeholder-slate-600 outline-none font-mono"
                    />
                  </div>
                </div>

                {/* Date and Time */}
                <div className="grid grid-cols-2 gap-3.5">
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
                    <label className="text-xs text-slate-400 font-bold uppercase tracking-tight">Waqt (Time) *</label>
                    <input
                      type="time"
                      required
                      value={time}
                      onChange={(e) => setTime(e.target.value)}
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
                    <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wide">Status / Khata Option</label>
                    <select
                      value={paymentStatus}
                      onChange={(e) => setPaymentStatus(e.target.value as any)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg py-2 px-2.5 text-xs text-amber-400 font-bold outline-none"
                    >
                      <option value="unpaid">❌ UNPAID (Add to Khata Ledger)</option>
                      <option value="paid">✅ PAID (Receive Now)</option>
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
                        const isChecked = selectedServices.some(s => s.id === service.id);
                        return (
                          <div
                            key={service.id}
                            onClick={() => handleToggleFormService(service)}
                            className="flex items-center justify-between p-2 hover:bg-slate-900/40 rounded-lg cursor-pointer transition text-xs"
                          >
                            <span className="text-slate-300 font-medium">{service.name}</span>
                            <div className="flex items-center gap-2">
                              <span className="text-amber-400 font-bold font-mono">Rs. {service.price}</span>
                              <div className={`w-4.5 h-4.5 rounded-md border flex items-center justify-center transition-colors ${
                                isChecked ? "bg-amber-500 border-amber-500 text-slate-950" : "border-slate-800"
                              }`}>
                                {isChecked && <Check size={11} className="stroke-[3]" />}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>

                {/* Grand Total Display */}
                <div className="bg-slate-950 border border-slate-800 p-3 rounded-2xl flex justify-between items-center">
                  <span className="text-slate-500 font-semibold text-xs">Total Bill Estimate:</span>
                  <span className="text-base font-black text-emerald-400 font-mono">
                    Rs. {selectedServices.reduce((sum, s) => sum + s.price, 0).toLocaleString()}
                  </span>
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
    </div>
  );
}
