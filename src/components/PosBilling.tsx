import React, { useState } from "react";
import { SalonService, StaffMember, Booking, KhataAccount, KhataLog, Product } from "../types";
import { motion, AnimatePresence } from "motion/react";
import { addBooking, saveKhataAccount, addKhataLog, updateProduct, adjustKhataBalance } from "../firebaseService";
import ReceiptModal from "./ReceiptModal";
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
  ShoppingBag,
  Clock,
  Printer,
  Share2
} from "lucide-react";

interface PosBillingProps {
  services: SalonService[];
  products: Product[];
  staff: StaffMember[];
  onBookingAdded: () => void;
}

export default function PosBilling({ services, products, staff, onBookingAdded }: PosBillingProps) {
  // POS Form State
  const [clientName, setClientName] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [bookingType, setBookingType] = useState<"walk_in" | "appointment" | "online">("walk_in");
  const [selectedServices, setSelectedServices] = useState<SalonService[]>([]);
  const [selectedProducts, setSelectedProducts] = useState<Product[]>([]);
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
  const [searchProductQuery, setSearchProductQuery] = useState("");
  const [pickerTab, setPickerTab] = useState<"services" | "products">("services");

  // Discount & Tip state
  const [discountInput, setDiscountInput] = useState<string>("0");
  const [tipInput, setTipInput] = useState<string>("0");
  const [amountPaidInput, setAmountPaidInput] = useState<string>("");

  // Receipt modal state
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [receiptBookingData, setReceiptBookingData] = useState<any>(null);

  // Filter services by search
  const filteredServices = services.filter(s => 
    s.name.toLowerCase().includes(searchServiceQuery.toLowerCase()) ||
    s.category.toLowerCase().includes(searchServiceQuery.toLowerCase())
  );

  // Filter products by search
  const filteredProducts = (products || []).filter(p => 
    p.name.toLowerCase().includes(searchProductQuery.toLowerCase()) ||
    p.category.toLowerCase().includes(searchProductQuery.toLowerCase())
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

  // Product Selection Handlers
  const handleToggleProduct = (product: Product) => {
    setSelectedProducts([...selectedProducts, product]);
  };

  const handleRemoveProductInstance = (productId: string) => {
    const idx = selectedProducts.findIndex(p => p.id === productId);
    if (idx > -1) {
      const updated = [...selectedProducts];
      updated.splice(idx, 1);
      setSelectedProducts(updated);
    }
  };

  const handleRemoveAllProductInstances = (productId: string) => {
    setSelectedProducts(selectedProducts.filter(p => p.id !== productId));
  };

  const getProductQuantity = (productId: string) => {
    return selectedProducts.filter(p => p.id === productId).length;
  };

  const groupedSelectedProducts = selectedProducts.reduce((acc: { product: Product; quantity: number }[], product) => {
    const existing = acc.find(item => item.product.id === product.id);
    if (existing) {
      existing.quantity += 1;
    } else {
      acc.push({ product, quantity: 1 });
    }
    return acc;
  }, []);

  // Calculate Subtotal
  const totalServicesAmount = selectedServices.reduce((sum, s) => sum + s.price, 0);
  const totalProductsAmount = selectedProducts.reduce((sum, p) => sum + p.price, 0);
  const subtotalAmount = totalServicesAmount + totalProductsAmount;
  const discount = Math.max(0, parseFloat(discountInput) || 0);
  const tip = Math.max(0, parseFloat(tipInput) || 0);
  const totalAmount = Math.max(0, subtotalAmount - discount + tip);
  const amountPaid = amountPaidInput === "" ? (paymentStatus === "paid" ? totalAmount : 0) : (Math.max(0, parseFloat(amountPaidInput) || 0));
  const changeDue = Math.max(0, amountPaid - totalAmount);

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

    if (selectedServices.length === 0 && selectedProducts.length === 0) {
      setError("Meharbani karke kam se kam ek Service ya Product zaroor choose karein!");
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
        products: selectedProducts,
        staffId: selectedStaffId,
        staffName,
        totalAmount,
        discount,
        tip,
        subtotal: subtotalAmount,
        amountPaid,
        paymentMethod,
        paymentStatus,
        status: "completed",
        date,
        time,
        createdAt: new Date().toISOString()
      };

      // Save to Firebase
      await addBooking(newBooking);

      // Subtract selected products stock
      for (const item of groupedSelectedProducts) {
        const dbProduct = products.find(p => p.id === item.product.id);
        if (dbProduct) {
          const updatedStock = Math.max(0, dbProduct.stock - item.quantity);
          await updateProduct({
            ...dbProduct,
            stock: updatedStock
          });
        }
      }

      // Automatically register client dues in Khata Book if payment is unpaid (not received / khata)
      if (paymentStatus === "unpaid") {
        const remainingDebt = Math.max(0, totalAmount - amountPaid);
        if (remainingDebt > 0) {
          const khataId = `khata-client-${finalClientPhone}`;
          await adjustKhataBalance(khataId, finalClientName, finalClientPhone, remainingDebt);

          const itemNames = [
            ...selectedServices.map(s => s.name),
            ...selectedProducts.map(p => p.name)
          ];

          const khataLog: KhataLog = {
            id: `klog-${Date.now()}`,
            accountId: khataId,
            accountName: finalClientName,
            amount: remainingDebt,
            type: "debit",
            description: `POS Bill: ${itemNames.join(", ")} (Total: Rs. ${totalAmount}, Paid: Rs. ${amountPaid})`,
            date,
            createdAt: new Date().toISOString()
          };
          await addKhataLog(khataLog);
        }
      }

      setSuccess(true);
      onBookingAdded();

      // Reset form fields
      setClientName("");
      setClientPhone("");
      setBookingType("walk_in");
      setSelectedServices([]);
      setSelectedProducts([]);
      setSelectedStaffId("");
      setPaymentMethod("cash");
      setPaymentStatus("paid");
      setDiscountInput("0");
      setTipInput("0");
      setAmountPaidInput("");
      setDate(new Date().toISOString().split('T')[0]);
      setTime(() => {
        const now = new Date();
        return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      });
      
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

  const handleOpenReceiptModal = (mode: 'print' | 'share') => {
    let finalClientName = clientName.trim() || "Walk-In Client";
    let finalClientPhone = clientPhone.trim() || "0000000000";
    
    const staffMember = staff.find(s => s.id === selectedStaffId);
    const staffName = staffMember ? staffMember.name : "Unknown Staff";

    const previewBooking: Partial<Booking> = {
      id: `preview-${Date.now()}`,
      clientName: finalClientName,
      clientPhone: finalClientPhone,
      bookingType,
      services: selectedServices,
      products: selectedProducts,
      staffId: selectedStaffId,
      staffName,
      totalAmount,
      discount,
      tip,
      subtotal: subtotalAmount,
      paymentMethod,
      paymentStatus,
      status: "completed",
      date,
      time,
    };

    setReceiptBookingData(previewBooking);
    setShowReceiptModal(true);
  };

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

            {/* Custom Date and Time Selection */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1 border-t border-slate-800/40">
              <div className="space-y-1.5">
                <label className="text-xs text-slate-400 font-medium">Kaam Ki Tareeq (Booking Date) *</label>
                <div className="relative font-mono">
                  <Calendar size={15} className="absolute left-3.5 top-3.5 text-slate-500" />
                  <input
                    type="date"
                    required
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500/50 rounded-xl py-3 pl-10 pr-4 text-xs text-white outline-none transition duration-200"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs text-slate-400 font-medium">Kaam Ka Waqt (Booking Time) *</label>
                <div className="relative font-mono">
                  <Clock size={15} className="absolute left-3.5 top-3.5 text-slate-500" />
                  <input
                    type="time"
                    required
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500/50 rounded-xl py-3 pl-10 pr-4 text-xs text-white outline-none transition duration-200"
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

          {/* Section 2: Tabbed Picker (Services vs Products) */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-800/80 pb-3">
              {/* Tab Switcher */}
              <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800">
                <button
                  type="button"
                  onClick={() => setPickerTab("services")}
                  className={`px-4 py-2 rounded-lg text-xs font-bold transition duration-150 flex items-center gap-1.5 ${
                    pickerTab === "services"
                      ? "bg-amber-500 text-slate-950 shadow"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  <Sparkles size={13} />
                  Services Menu
                </button>
                <button
                  type="button"
                  onClick={() => setPickerTab("products")}
                  className={`px-4 py-2 rounded-lg text-xs font-bold transition duration-150 flex items-center gap-1.5 ${
                    pickerTab === "products"
                      ? "bg-amber-500 text-slate-950 shadow"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  <ShoppingBag size={13} />
                  Products Shop
                </button>
              </div>

              {/* Search Inputs based on active tab */}
              {pickerTab === "services" ? (
                <input
                  type="text"
                  placeholder="Service ya category search karein..."
                  value={searchServiceQuery}
                  onChange={(e) => setSearchServiceQuery(e.target.value)}
                  className="bg-slate-950 border border-slate-800 focus:border-amber-500/40 rounded-lg px-3 py-1.5 text-xs text-white outline-none transition duration-200 w-full sm:w-56 placeholder-slate-600"
                />
              ) : (
                <input
                  type="text"
                  placeholder="Product ya category search karein..."
                  value={searchProductQuery}
                  onChange={(e) => setSearchProductQuery(e.target.value)}
                  className="bg-slate-950 border border-slate-800 focus:border-amber-500/40 rounded-lg px-3 py-1.5 text-xs text-white outline-none transition duration-200 w-full sm:w-56 placeholder-slate-600"
                />
              )}
            </div>

            {/* List View Container */}
            {pickerTab === "services" ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-[280px] overflow-y-auto pr-1">
                {filteredServices.length > 0 ? (
                  filteredServices.map(service => {
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
                  })
                ) : (
                  <div className="col-span-2 text-center py-8 text-slate-500 text-xs italic">
                    Koi service nahi mili.
                  </div>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-[280px] overflow-y-auto pr-1">
                {filteredProducts.length > 0 ? (
                  filteredProducts.map(product => {
                    const qty = getProductQuantity(product.id);
                    const inStock = product.stock > 0;
                    return (
                      <div
                        key={product.id}
                        className={`p-3 rounded-xl border flex justify-between items-center gap-3 transition duration-200 group relative ${
                          qty > 0
                            ? "border-amber-500 bg-amber-500/5 text-amber-400"
                            : "border-slate-800/80 hover:border-slate-700 bg-slate-950/40 text-slate-300"
                        } ${!inStock ? "opacity-50" : ""}`}
                      >
                        <div 
                          onClick={() => inStock && handleToggleProduct(product)}
                          className={`space-y-0.5 min-w-0 flex-grow ${inStock ? "cursor-pointer" : "cursor-not-allowed"} select-none`}
                        >
                          <span className="text-xs font-bold block text-white truncate group-hover:text-amber-400 transition-colors flex items-center gap-1.5">
                            {product.name}
                            {qty > 0 && (
                              <span className="bg-amber-500 text-slate-950 text-[10px] font-black px-1.5 py-0.2 rounded-full">
                                x{qty}
                              </span>
                            )}
                          </span>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] text-slate-500 bg-slate-800 px-1.5 py-0.5 rounded uppercase font-medium">
                              {product.category}
                            </span>
                            <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${product.stock <= 5 ? "bg-rose-950/30 text-rose-400" : "bg-slate-800 text-slate-400"}`}>
                              Stock: {product.stock}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 flex-shrink-0">
                          <div className="text-right">
                            <span className="text-xs font-mono font-bold text-amber-400 block">Rs. {product.price}</span>
                          </div>

                          {!inStock ? (
                            <span className="text-[10px] bg-rose-500/10 text-rose-400 font-bold px-2 py-1 rounded-lg border border-rose-500/20">
                              Out of stock
                            </span>
                          ) : qty > 0 ? (
                            <div className="flex items-center bg-slate-950/85 border border-slate-800 rounded-lg p-0.5 ml-1">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleRemoveProductInstance(product.id);
                                }}
                                className="w-5 h-5 flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800 rounded transition font-bold cursor-pointer"
                              >
                                -
                              </button>
                              <span className="px-1.5 text-[11px] font-bold text-white font-mono">{qty}</span>
                              <button
                                type="button"
                                disabled={qty >= product.stock}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleToggleProduct(product);
                                }}
                                className="w-5 h-5 flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800 rounded transition font-bold cursor-pointer disabled:opacity-30 disabled:hover:bg-transparent"
                              >
                                +
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleToggleProduct(product)}
                              className="p-1 bg-slate-900 border border-slate-800 hover:border-amber-500/30 text-slate-400 hover:text-amber-400 rounded-lg transition cursor-pointer"
                              title="Add Product"
                            >
                              <span className="text-xs font-bold px-1">+ Add</span>
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="col-span-2 text-center py-8 text-slate-500 text-xs italic">
                    Koi product nahi mila.
                  </div>
                )}
              </div>
            )}
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

          {/* Selected Items Lists (Services and Products) */}
          <div className="space-y-4 max-h-[350px] overflow-y-auto pr-1">
            {/* Selected Services */}
            <div className="space-y-2">
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
                <div className="p-3 bg-slate-950/40 border border-dashed border-slate-800 rounded-xl text-center text-[11px] text-slate-500">
                  Koi service abhi select nahi ki gayi.
                </div>
              )}
            </div>

            {/* Selected Products */}
            <div className="space-y-2">
              <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Kareeday Gaye Products (Products Summary)</h4>
              {selectedProducts.length > 0 ? (
                <div className="space-y-1.5">
                  {groupedSelectedProducts.map(item => (
                    <div key={item.product.id} className="flex justify-between items-center bg-slate-950/50 p-2.5 rounded-xl border border-slate-800/60 text-xs">
                      <div className="min-w-0 flex-grow">
                        <span className="text-slate-200 font-medium block truncate">{item.product.name}</span>
                        <span className="text-[10px] text-slate-500 font-mono">Rs. {item.product.price} x {item.quantity}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {/* Quantity Incrementor Controls */}
                        <div className="flex items-center bg-slate-900 border border-slate-800 rounded-lg p-0.5">
                          <button
                            type="button"
                            onClick={() => handleRemoveProductInstance(item.product.id)}
                            className="w-5 h-5 flex items-center justify-center text-slate-400 hover:text-white rounded transition font-bold cursor-pointer"
                          >
                            -
                          </button>
                          <span className="px-1.5 text-xs font-bold text-white font-mono">{item.quantity}</span>
                          <button
                            type="button"
                            disabled={item.quantity >= (products.find(p => p.id === item.product.id)?.stock || 0)}
                            onClick={() => handleToggleProduct(item.product)}
                            className="w-5 h-5 flex items-center justify-center text-slate-400 hover:text-white rounded transition font-bold cursor-pointer disabled:opacity-30"
                          >
                            +
                          </button>
                        </div>

                        <span className="font-mono text-amber-400 font-semibold w-16 text-right">Rs. {(item.product.price * item.quantity).toLocaleString()}</span>
                        
                        <button
                          type="button"
                          onClick={() => handleRemoveAllProductInstances(item.product.id)}
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
                <div className="p-3 bg-slate-950/40 border border-dashed border-slate-800 rounded-xl text-center text-[11px] text-slate-500">
                  Koi product abhi select nahi kiya gaya.
                </div>
              )}
            </div>
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

          {/* Section 6: Discount & Tip Inputs */}
          <div className="grid grid-cols-2 gap-3 pt-2.5 border-t border-slate-800">
            <div className="space-y-1">
              <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
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
            <div className="space-y-1">
              <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                ⭐ Tip (Inaam - Rs.)
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

          {/* Section 7: Amount Received Input */}
          <div className="pt-2.5 space-y-1">
            <label className="text-[10px] text-amber-400 font-bold uppercase tracking-wider block flex items-center gap-1">
              💵 Amount Received (Usne Mujhe Kitne Diye - Rs.)
            </label>
            <div className="relative">
              <input
                type="number"
                min="0"
                placeholder={`Default: Rs. ${totalAmount.toLocaleString()}`}
                value={amountPaidInput}
                onChange={(e) => setAmountPaidInput(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500/50 rounded-xl py-2 px-3.5 pr-10 text-xs text-white placeholder-slate-600 outline-none font-mono"
              />
              <span className="absolute right-3 top-2.5 text-[10px] text-slate-500 font-bold font-mono">PKR</span>
            </div>
          </div>

          {/* Total Calculation Panel */}
          <div className="bg-slate-950/80 rounded-2xl p-4 border border-slate-800 space-y-2 mt-4">
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-400">Subtotal (Kul Bill):</span>
              <span className="text-slate-200 font-mono font-medium">Rs. {subtotalAmount.toLocaleString()}</span>
            </div>
            {discount > 0 && (
              <div className="flex justify-between items-center text-xs text-rose-400">
                <span>Discount (Sastai):</span>
                <span className="font-mono">- Rs. {discount.toLocaleString()}</span>
              </div>
            )}
            {tip > 0 && (
              <div className="flex justify-between items-center text-xs text-emerald-400">
                <span>Tip (Stylist Inaam):</span>
                <span className="font-mono">+ Rs. {tip.toLocaleString()}</span>
              </div>
            )}
            <div className="flex justify-between items-center text-xs border-b border-slate-800/60 pb-2">
              <span className="text-slate-400">Tax/GSTR:</span>
              <span className="text-slate-500 font-mono">Rs. 0 (Waived)</span>
            </div>
            <div className="flex justify-between items-center pt-1">
              <span className="text-sm font-bold text-white">Grand Total (Net Rakam):</span>
              <span className="text-xl font-black text-amber-400 font-mono">Rs. {totalAmount.toLocaleString()}</span>
            </div>

            {/* Live Cash Return Calculations */}
            {paymentStatus === "paid" && (
              <div className="border-t border-slate-800/80 pt-2 space-y-1.5 text-xs">
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Received (Vusool Shuda):</span>
                  <span className="text-slate-200 font-mono">Rs. {amountPaid.toLocaleString()}</span>
                </div>
                {changeDue > 0 && (
                  <div className="flex justify-between items-center text-emerald-400 font-bold bg-emerald-500/5 py-1 px-2 rounded-lg border border-emerald-500/10">
                    <span>Change Return (Wapas Baqaya):</span>
                    <span className="font-mono">Rs. {changeDue.toLocaleString()}</span>
                  </div>
                )}
              </div>
            )}
            {paymentStatus === "unpaid" && (
              <div className="border-t border-slate-800/80 pt-2 space-y-1.5 text-xs">
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Paid Amount (Partial):</span>
                  <span className="text-slate-200 font-mono">Rs. {amountPaid.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center text-rose-400 font-bold bg-rose-500/5 py-1 px-2 rounded-lg border border-rose-500/10">
                  <span>Pending Khata (Udhaar Register):</span>
                  <span className="font-mono">Rs. {Math.max(0, totalAmount - amountPaid).toLocaleString()}</span>
                </div>
              </div>
            )}
          </div>

          {/* Checkout & Separate Receipt Action Buttons */}
          <div className="pt-2 space-y-3">
            {/* Primary Action: Settle Bill */}
            <button
              type="button"
              onClick={handleSubmitSale}
              disabled={loading}
              className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-slate-950 font-extrabold py-3.5 px-4 rounded-xl transition duration-200 flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/10 active:scale-[0.98] disabled:opacity-50 cursor-pointer"
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin"></div>
                  <span>Settle Ho Raha Hai...</span>
                </>
              ) : (
                <>
                  <Wallet size={18} className="stroke-[2.5]" />
                  <span>Settle Bill & Record (Rs. {totalAmount.toLocaleString()})</span>
                </>
              )}
            </button>

            {/* Separate Print & Save Buttons Grid */}
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => handleOpenReceiptModal('print')}
                className="bg-slate-950 hover:bg-slate-850 border border-slate-800 text-slate-200 font-bold py-2.5 px-3 rounded-xl text-xs transition duration-150 flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Printer size={13} className="text-amber-500" />
                Print Receipt
              </button>

              <button
                type="button"
                onClick={() => handleOpenReceiptModal('share')}
                className="bg-slate-950 hover:bg-slate-850 border border-slate-800 text-slate-200 font-bold py-2.5 px-3 rounded-xl text-xs transition duration-150 flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Share2 size={13} className="text-amber-500" />
                Save Receipt
              </button>
            </div>
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

      <ReceiptModal
        isOpen={showReceiptModal}
        onClose={() => setShowReceiptModal(false)}
        booking={receiptBookingData}
      />
    </div>
  );
}
