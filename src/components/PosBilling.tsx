import React, { useState } from "react";
import { SalonService, StaffMember, Booking, KhataAccount, KhataLog } from "../types";
import { motion, AnimatePresence } from "motion/react";
import { addBooking, saveKhataAccount, addKhataLog } from "../firebaseService";
import { 
  User, 
  Phone, 
  Sparkles, 
  Calendar, 
  CreditCard, 
  Check, 
  AlertTriangle, 
  DollarSign, 
  Trash2,
  Wallet,
  ShoppingBag
} from "lucide-react";

interface PosBillingProps {
  services: SalonService[];
  staff: StaffMember[];
  onBookingAdded: () => void;
}

export default function PosBilling({ services, staff, onBookingAdded }: PosBillingProps) {
  // POS Form State
  const [clientName, setClientName] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [bookingType, setBookingType] = useState<"walk_in" | "appointment" | "online">("walk_in");
  const [selectedServices, setSelectedServices] = useState<SalonService[]>([]);
  const [selectedStaffId, setSelectedStaffId] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "easypaisa" | "jazzcash" | "bank_transfer" | "online">("cash");
  const [paymentStatus, setPaymentStatus] = useState<"paid" | "unpaid">("paid");
  const [time, setTime] = useState(() => {
    const now = new Date();
    return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  });
  const [date, setDate] = useState(() => {
    return new Date().toISOString().split('T')[0];
  });

  // UI state
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [searchServiceQuery, setSearchServiceQuery] = useState("");

  // Filter services by search
  const filteredServices = services.filter(s => 
    s.name.toLowerCase().includes(searchServiceQuery.toLowerCase()) ||
    s.category.toLowerCase().includes(searchServiceQuery.toLowerCase())
  );

  // Toggle Service selection - now always appends to allow duplicates (multiple selections/quantities)
  const handleToggleService = (service: SalonService) => {
    setSelectedServices([...selectedServices, service]);
  };

  const handleRemoveServiceInstance = (serviceId: string) => {
    const idx = selectedServices.findIndex(s => s.id === serviceId);
    if (idx > -1) {
      const updated = [...selectedServices];
      updated.splice(idx, 1);
      setSelectedServices(updated);
    }
  };

  const handleRemoveAllInstances = (serviceId: string) => {
    setSelectedServices(selectedServices.filter(s => s.id !== serviceId));
  };

  const getServiceQuantity = (serviceId: string) => {
    return selectedServices.filter(s => s.id === serviceId).length;
  };

  // Group selected services to display quantities
  const groupedSelectedServices = selectedServices.reduce((acc: { service: SalonService; quantity: number }[], service) => {
    const existing = acc.find(item => item.service.id === service.id);
    if (existing) {
      existing.quantity += 1;
    } else {
      acc.push({ service, quantity: 1 });
    }
    return acc;
  }, []);

  // Calculate Subtotal
  const totalAmount = selectedServices.reduce((sum, s) => sum + s.price, 0);

  // Submit Sale Handler
  const handleSubmitSale = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    let finalClientName = clientName.trim();
    let finalClientPhone = clientPhone.trim();

    // Validate inputs
    if (paymentStatus === "unpaid") {
      if (!finalClientName) {
        setError("Khata (Udhaar) register karne ke liye Client ka Naam likhna zaroori hai!");
        return;
      }
      if (!finalClientPhone) {
        setError("Khata (Udhaar) register karne ke liye Phone Number likhna zaroori hai!");
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
      setError("Meharbani karke kam se kam ek Service zaroor choose karein!");
      return;
    }
    if (!selectedStaffId) {
      setError("Meharbani karke Stylist (Staff member) select karein zaroor!");
      return;
    }

    setLoading(true);

    try {
      // Find staff name
      const staffMember = staff.find(s => s.id === selectedStaffId);
      const staffName = staffMember ? staffMember.name : "Unknown Staff";

      const newBooking: Booking = {
        id: `b-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        clientName: finalClientName,
        clientPhone: finalClientPhone,
        bookingType,
        services: selectedServices,
        staffId: selectedStaffId,
        staffName,
        totalAmount,
        paymentMethod,
        paymentStatus,
        status: "completed",
        date,
        time,
        createdAt: new Date().toISOString()
      };

      // Save to Firebase
      await addBooking(newBooking);

      // Automatically register client dues in Khata Book if payment is unpaid (not received / khata)
      if (paymentStatus === "unpaid") {
        const khataId = `khata-client-${finalClientPhone}`;
        const newKhata: KhataAccount = {
          id: khataId,
          name: finalClientName,
          type: "client",
          phone: finalClientPhone,
          balance: totalAmount,
          lastUpdated: new Date().toISOString()
        };
        await saveKhataAccount(newKhata);

        const khataLog: KhataLog = {
          id: `klog-${Date.now()}`,
          accountId: khataId,
          accountName: finalClientName,
          amount: totalAmount,
          type: "debit",
          description: `POS Bill: ${selectedServices.map(s => s.name).join(", ")}`,
          date,
          createdAt: new Date().toISOString()
        };
        await addKhataLog(khataLog);
      }

      setSuccess(true);
      onBookingAdded();

      // Reset form fields
      setClientName("");
      setClientPhone("");
      setBookingType("walk_in");
      setSelectedServices([]);
      setSelectedStaffId("");
      setPaymentMethod("cash");
      setPaymentStatus("paid");
      
      setTimeout(() => {
        setSuccess(false);
      }, 4000);

    } catch (err: any) {
      console.error(err);
      setError("Sale save karte hue koi masla hua. Dobara koshish karein.");
    } finally {
      setLoading(false);
    }
  };

  // Payment Options Metadata
  const paymentOptions = [
    { key: "cash", label: "Cash Payment", icon: "💵", color: "border-emerald-500/30 text-emerald-400 bg-emerald-500/5 hover:bg-emerald-500/10 active:bg-emerald-500/20" },
    { key: "easypaisa", label: "EasyPaisa", icon: "🟢", color: "border-pink-500/30 text-pink-400 bg-pink-500/5 hover:bg-pink-500/10 active:bg-pink-500/20" },
    { key: "jazzcash", label: "JazzCash", icon: "🔴", color: "border-amber-500/30 text-amber-400 bg-amber-500/5 hover:bg-amber-500/10 active:bg-amber-500/20" },
    { key: "bank_transfer", label: "Bank Transfer", icon: "🏦", color: "border-blue-500/30 text-blue-400 bg-blue-500/5 hover:bg-blue-500/10 active:bg-blue-500/20" },
    { key: "online", label: "Online Card/Web", icon: "💳", color: "border-purple-500/30 text-purple-400 bg-purple-500/5 hover:bg-purple-500/10 active:bg-purple-500/20" }
  ] as const;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      {/* LEFT COLUMN (60%): Service Picker & Client Details */}
      <div className="lg:col-span-7 space-y-6">
        <form onSubmit={handleSubmitSale} className="space-y-6">
          {/* Section 1: Client Information */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-3">
              <User size={18} className="text-amber-500" />
              Client Aur Booking Ki Maloomat (Client & Booking Info)
            </h3>

            {error && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl flex items-center gap-2 text-xs text-rose-400">
                <AlertTriangle size={14} />
                <span>{error}</span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs text-slate-400 font-medium">Client Ka Name <span className="text-[10px] text-slate-500 font-normal">(Optional)</span></label>
                <div className="relative">
                  <User size={15} className="absolute left-3.5 top-3.5 text-slate-500" />
                  <input
                    type="text"
                    placeholder="Maslan: Kamran Khan (Khali chor sakte hain)"
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500/50 rounded-xl py-3 pl-10 pr-4 text-sm text-white placeholder-slate-600 outline-none transition duration-200"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs text-slate-400 font-medium">Phone Number <span className="text-[10px] text-slate-500 font-normal">(Optional)</span></label>
                <div className="relative">
                  <Phone size={15} className="absolute left-3.5 top-3.5 text-slate-500" />
                  <input
                    type="tel"
                    placeholder="Maslan: 03001234567 (Khali chor sakte hain)"
                    value={clientPhone}
                    onChange={(e) => setClientPhone(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500/50 rounded-xl py-3 pl-10 pr-4 text-sm text-white placeholder-slate-600 outline-none transition duration-200"
                  />
                </div>
              </div>
            </div>

            {/* Booking Type Options */}
            <div className="space-y-2 pt-2">
              <label className="text-xs text-slate-400 font-medium">Booking Type (Aamad Ka Tareeqa) *</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { key: "walk_in", label: "Walk-In Entry", desc: "Dukan Par Aya", emoji: "🚶" },
                  { key: "appointment", label: "Appointment", desc: "Phone Par Booked", emoji: "📞" },
                  { key: "online", label: "Online Booking", desc: "Internet Se", emoji: "🌐" }
                ].map(type => (
                  <button
                    key={type.key}
                    type="button"
                    onClick={() => setBookingType(type.key as any)}
                    className={`p-3 rounded-xl border text-center transition duration-200 ${
                      bookingType === type.key
                        ? "border-amber-500 bg-amber-500/5 text-amber-400"
                        : "border-slate-800 hover:border-slate-700 bg-slate-950/40 text-slate-400"
                    }`}
                  >
                    <span className="text-lg block mb-0.5">{type.emoji}</span>
                    <span className="text-xs font-bold block text-white">{type.label}</span>
                    <span className="text-[10px] text-slate-500 block">{type.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Date & Time Selectors */}
            <div className="grid grid-cols-2 gap-4 pt-2">
              <div className="space-y-1.5">
                <label className="text-xs text-slate-400 font-medium">Tareeq (Date)</label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500/50 rounded-xl py-2.5 px-3.5 text-xs text-white outline-none transition duration-200 font-mono"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs text-slate-400 font-medium">Waqt (Time)</label>
                <input
                  type="time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500/50 rounded-xl py-2.5 px-3.5 text-xs text-white outline-none transition duration-200 font-mono"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Services Picker */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Sparkles size={18} className="text-amber-500" />
                Services Select Karein (Choose Services)
              </h3>
              <input
                type="text"
                placeholder="Service ya category search karein..."
                value={searchServiceQuery}
                onChange={(e) => setSearchServiceQuery(e.target.value)}
                className="bg-slate-950 border border-slate-800 focus:border-amber-500/40 rounded-lg px-3 py-1.5 text-xs text-white outline-none transition duration-200 w-full sm:w-56 placeholder-slate-600"
              />
            </div>

            {/* List of Services */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-[280px] overflow-y-auto pr-1">
              {filteredServices.map(service => {
                const qty = getServiceQuantity(service.id);
                return (
                  <div
                    key={service.id}
                    className={`p-3 rounded-xl border flex justify-between items-center gap-3 transition duration-200 group relative ${
                      qty > 0
                        ? "border-amber-500 bg-amber-500/5 text-amber-400"
                        : "border-slate-800/80 hover:border-slate-700 bg-slate-950/40 text-slate-300"
                    }`}
                  >
                    {/* Clickable Area to Add/Increment Service */}
                    <div 
                      onClick={() => handleToggleService(service)}
                      className="space-y-0.5 min-w-0 flex-grow cursor-pointer select-none"
                    >
                      <span className="text-xs font-bold block text-white truncate group-hover:text-amber-400 transition-colors flex items-center gap-1.5">
                        {service.name}
                        {qty > 0 && (
                          <span className="bg-amber-500 text-slate-950 text-[10px] font-black px-1.5 py-0.2 rounded-full">
                            x{qty}
                          </span>
                        )}
                      </span>
                      <span className="text-[10px] text-slate-500 bg-slate-800 px-1.5 py-0.5 rounded uppercase font-medium">
                        {service.category}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      <div className="text-right">
                        <span className="text-xs font-mono font-bold text-amber-400 block">Rs. {service.price}</span>
                        <span className="text-[9px] text-slate-500">{service.durationMin} mins</span>
                      </div>

                      {/* Direct Quantity Adjuster on the Card */}
                      {qty > 0 ? (
                        <div className="flex items-center bg-slate-950/85 border border-slate-800 rounded-lg p-0.5 ml-1">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRemoveServiceInstance(service.id);
                            }}
                            className="w-5 h-5 flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800 rounded transition font-bold cursor-pointer"
                          >
                            -
                          </button>
                          <span className="px-1.5 text-[11px] font-bold text-white font-mono">{qty}</span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleToggleService(service);
                            }}
                            className="w-5 h-5 flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800 rounded transition font-bold cursor-pointer"
                          >
                            +
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleToggleService(service)}
                          className="p-1 bg-slate-900 border border-slate-800 hover:border-amber-500/30 text-slate-400 hover:text-amber-400 rounded-lg transition cursor-pointer"
                          title="Add Service"
                        >
                          <span className="text-xs font-bold px-1">+ Add</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </form>
      </div>

      {/* RIGHT COLUMN (40%): Summary Receipt & Staff Assignment */}
      <div className="lg:col-span-5 space-y-6">
        {/* Receipt Panel */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-5 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full blur-2xl"></div>

          <h3 className="text-base font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-3">
            <ShoppingBag size={18} className="text-amber-400" />
            Bill & Checkout Summary
          </h3>

          {/* Selected Services Receipt List */}
          <div className="space-y-2.5 min-h-[140px] max-h-[220px] overflow-y-auto pr-1">
            <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Kiya Jane Wala Kaam (Services Summary)</h4>
            {selectedServices.length > 0 ? (
              <div className="space-y-1.5">
                {groupedSelectedServices.map(item => (
                  <div key={item.service.id} className="flex justify-between items-center bg-slate-950/50 p-2.5 rounded-xl border border-slate-800/60 text-xs">
                    <div className="min-w-0 flex-grow">
                      <span className="text-slate-200 font-medium block truncate">{item.service.name}</span>
                      <span className="text-[10px] text-slate-500 font-mono">Rs. {item.service.price} x {item.quantity}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {/* Quantity Incrementor Controls */}
                      <div className="flex items-center bg-slate-900 border border-slate-800 rounded-lg p-0.5">
                        <button
                          type="button"
                          onClick={() => handleRemoveServiceInstance(item.service.id)}
                          className="w-5 h-5 flex items-center justify-center text-slate-400 hover:text-white rounded transition font-bold cursor-pointer"
                        >
                          -
                        </button>
                        <span className="px-1.5 text-xs font-bold text-white font-mono">{item.quantity}</span>
                        <button
                          type="button"
                          onClick={() => handleToggleService(item.service)}
                          className="w-5 h-5 flex items-center justify-center text-slate-400 hover:text-white rounded transition font-bold cursor-pointer"
                        >
                          +
                        </button>
                      </div>

                      <span className="font-mono text-amber-400 font-semibold w-16 text-right">Rs. {(item.service.price * item.quantity).toLocaleString()}</span>
                      
                      <button
                        type="button"
                        onClick={() => handleRemoveAllInstances(item.service.id)}
                        className="text-slate-500 hover:text-rose-400 p-1.5 rounded-md hover:bg-rose-500/10 transition-colors ml-1 cursor-pointer"
                        title="Remove all"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-6 bg-slate-950/40 border border-dashed border-slate-800 rounded-xl text-center text-xs text-slate-500">
                Koi service abhi select nahi ki gayi. Left side se choose karein.
              </div>
            )}
          </div>

          {/* Section 3: Staff Assignment */}
          <div className="space-y-2 pt-2 border-t border-slate-800">
            <label className="text-xs text-slate-400 font-bold uppercase tracking-wider block">
              Kis Stylist / Staff Member Ne Kaam Kiya? *
            </label>
            <div className="grid grid-cols-2 gap-2">
              {staff.filter(st => st.status === "active").map(st => (
                <button
                  key={st.id}
                  type="button"
                  onClick={() => setSelectedStaffId(st.id)}
                  className={`p-2.5 rounded-xl border text-left flex items-center justify-between text-xs transition duration-200 ${
                    selectedStaffId === st.id
                      ? "border-amber-500 bg-amber-500/5 text-amber-400"
                      : "border-slate-800 hover:border-slate-700 bg-slate-950/40 text-slate-400"
                  }`}
                >
                  <div className="truncate">
                    <span className="font-semibold block text-white truncate">{st.name}</span>
                    <span className="text-[9px] text-slate-500">{st.role}</span>
                  </div>
                  {selectedStaffId === st.id && (
                    <span className="w-4 h-4 rounded-full bg-amber-500 flex items-center justify-center text-slate-950 flex-shrink-0">
                      <Check size={10} className="stroke-[3]" />
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Section 4: Payment Methods */}
          <div className="space-y-2 pt-2 border-t border-slate-800">
            <label className="text-xs text-slate-400 font-bold uppercase tracking-wider block">
              Payment Kahan Se Ayi? (Payment Method) *
            </label>
            <div className="grid grid-cols-3 gap-2">
              {paymentOptions.map((opt) => (
                <button
                  key={opt.key}
                  type="button"
                  onClick={() => setPaymentMethod(opt.key)}
                  className={`p-2.5 rounded-xl border text-center transition duration-200 flex flex-col items-center justify-center ${
                    paymentMethod === opt.key
                      ? "border-amber-500 bg-amber-500/5 text-amber-400 font-bold"
                      : "border-slate-800 hover:border-slate-700 bg-slate-950/40 text-slate-400"
                  }`}
                >
                  <span className="text-lg mb-1">{opt.icon}</span>
                  <span className="text-[10px] text-white font-medium truncate w-full">{opt.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Section 5: Payment Status / Khata (Bakaya) */}
          <div className="space-y-2 pt-2 border-t border-slate-800">
            <label className="text-xs text-slate-400 font-bold uppercase tracking-wider block">
              Payment Status (Receive Status) *
            </label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { status: "paid", label: "✅ Paid (Full Received)", desc: "Payment received in cash/digital" },
                { status: "unpaid", label: "❌ Unpaid (Khate Me Likhain)", desc: "Client's balance udhaar / khata" }
              ].map(item => (
                <button
                  key={item.status}
                  type="button"
                  onClick={() => setPaymentStatus(item.status as any)}
                  className={`p-2 rounded-xl border text-left transition duration-200 ${
                    paymentStatus === item.status
                      ? "border-amber-500 bg-amber-500/5 text-amber-400 font-bold"
                      : "border-slate-800 hover:border-slate-700 bg-slate-950/40 text-slate-400"
                  }`}
                >
                  <span className="text-[11px] block text-white font-bold">{item.label}</span>
                  <span className="text-[9px] block text-slate-500 mt-0.5 leading-tight">{item.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Total Calculation Panel */}
          <div className="bg-slate-950/80 rounded-2xl p-4 border border-slate-800 space-y-2 mt-4">
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-400">Total Items:</span>
              <span className="text-slate-200 font-mono font-medium">{selectedServices.length} Services</span>
            </div>
            <div className="flex justify-between items-center text-xs border-b border-slate-800/60 pb-2">
              <span className="text-slate-400">Tax/GSTR:</span>
              <span className="text-slate-500 font-mono">Rs. 0 (Waived)</span>
            </div>
            <div className="flex justify-between items-center pt-1">
              <span className="text-sm font-bold text-white">Grand Total:</span>
              <span className="text-xl font-black text-amber-400 font-mono">Rs. {totalAmount.toLocaleString()}</span>
            </div>
          </div>

          {/* Checkout Buttons */}
          <div className="pt-2">
            <button
              type="button"
              onClick={handleSubmitSale}
              disabled={loading}
              className="w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-bold py-3.5 px-4 rounded-xl transition duration-200 flex items-center justify-center gap-2 shadow-lg shadow-amber-500/10 active:scale-[0.98] disabled:opacity-50"
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin"></div>
                  <span>Sale Save Ki Ja Rahi Hai...</span>
                </>
              ) : (
                <>
                  <Wallet size={18} className="stroke-[2.5]" />
                  <span>Settle Bill & Print Receipt (Rs. {totalAmount.toLocaleString()})</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Success Modal Overlay */}
      <AnimatePresence>
        {success && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          >
            <motion.div
              initial={{ scale: 0.9, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 15 }}
              className="bg-slate-900 border border-amber-500/20 max-w-sm w-full rounded-2xl p-6 text-center space-y-4 shadow-2xl shadow-amber-500/5"
            >
              <div className="w-14 h-14 bg-emerald-500/10 text-emerald-400 rounded-full flex items-center justify-center mx-auto border border-emerald-500/20">
                <Check size={28} className="stroke-[3]" />
              </div>
              <div className="space-y-1">
                <h3 className="text-lg font-bold text-white">Bill Settle Ho Gaya!</h3>
                <p className="text-xs text-slate-400">
                  Sale aur transaction record database mein kamyabi se save ho chuki hai.
                </p>
              </div>
              <div className="bg-slate-950 rounded-xl p-3 border border-slate-800 text-xs text-left font-mono space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-500">Total Bill:</span>
                  <span className="text-amber-400 font-bold">Rs. {totalAmount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Payment:</span>
                  <span className="text-white capitalize font-medium">{paymentMethod}</span>
                </div>
              </div>
              <button
                onClick={() => setSuccess(false)}
                className="w-full bg-slate-800 hover:bg-slate-700 text-white font-semibold py-2.5 px-4 rounded-xl text-xs transition duration-150"
              >
                Theek Hai / Naya Bill
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
