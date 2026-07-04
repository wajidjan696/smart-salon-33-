import React, { useState } from "react";
import { Booking } from "../types";
import { motion } from "motion/react";
import { Printer, Share2, Check, X, Copy, Calendar, Clock, User, Phone, Sparkles } from "lucide-react";

interface ReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  booking: Partial<Booking>;
}

export default function ReceiptModal({ isOpen, onClose, booking }: ReceiptModalProps) {
  const [copied, setCopied] = useState(false);

  if (!isOpen || !booking) return null;

  const clientName = booking.clientName || "Walk-In Client";
  const clientPhone = booking.clientPhone || "0000000000";
  const date = booking.date || new Date().toISOString().split("T")[0];
  const time = booking.time || "12:00";
  const staffName = booking.staffName || "Unknown Staff";
  const services = booking.services || [];
  const products = booking.products || [];
  const discount = booking.discount || 0;
  const tip = booking.tip || 0;
  const subtotal = booking.subtotal || (services.reduce((sum, s) => sum + s.price, 0) + products.reduce((sum, p) => sum + p.price, 0));
  const grandTotal = booking.totalAmount || (subtotal - discount + tip);
  const paymentMethod = booking.paymentMethod || "cash";
  const paymentStatus = booking.paymentStatus || "paid";
  const amountPaid = booking.amountPaid !== undefined ? booking.amountPaid : (paymentStatus === "paid" ? grandTotal : 0);
  const changeDue = Math.max(0, amountPaid - grandTotal);

  // Format booking type for receipt
  const bookingTypeLabel = 
    booking.bookingType === "walk_in" ? "Walk-In Entry 🚶" :
    booking.bookingType === "appointment" ? "Appointment 📞" :
    booking.bookingType === "online" ? "Online Booking 🌐" : "Entry";

  // Print function
  const handlePrint = () => {
    window.print();
  };

  // Copy formatting for WhatsApp / SMS sharing
  const handleCopyText = () => {
    const serviceLines = services.map(s => ` - ${s.name}: Rs. ${s.price}`).join("\n");
    const productLines = products.map(p => ` - ${p.name} (Product): Rs. ${p.price}`).join("\n");
    const itemsText = [serviceLines, productLines].filter(Boolean).join("\n");

    const receiptText = `✨ *SMART SALON RECEIPT* ✨
-----------------------------
📅 Date: ${date} | 🕒 Time: ${time}
👤 Client: ${clientName}
📱 Phone: ${clientPhone}
💇 Stylist: ${staffName}
⚙️ Type: ${bookingTypeLabel}
-----------------------------
*SERVICES & PRODUCTS:*
${itemsText}
-----------------------------
💰 Subtotal: Rs. ${subtotal.toLocaleString()}
${discount > 0 ? `🎁 Discount: - Rs. ${discount.toLocaleString()}\n` : ""}${tip > 0 ? `⭐ Tip (Inaam): + Rs. ${tip.toLocaleString()}\n` : ""}💸 *Grand Total: Rs. ${grandTotal.toLocaleString()}*
💰 Received (Kitnay Diye): Rs. ${amountPaid.toLocaleString()}
${changeDue > 0 ? `💵 Change Return (Baqaya): Rs. ${changeDue.toLocaleString()}\n` : ""}💳 Paid Via: ${paymentMethod.toUpperCase()} (${paymentStatus.toUpperCase()})
-----------------------------
Shukriya! Dobara zaroor aein! 🙏
Smart Salon Digital Management
`;

    navigator.clipboard.writeText(receiptText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl relative"
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-slate-500 hover:text-white transition p-1 rounded-lg hover:bg-slate-800"
        >
          <X size={18} />
        </button>

        <h3 className="text-base font-bold text-white mb-4 flex items-center gap-2">
          <Share2 size={16} className="text-amber-500" />
          Receipt Share & Print Center
        </h3>

        {/* Scrollable Receipt Area */}
        <div className="max-h-[60vh] overflow-y-auto pr-1 mb-5 space-y-4">
          {/* THERMAL PAPER DESIGN */}
          <div
            id="printable-receipt"
            className="bg-white text-slate-950 p-6 rounded-lg font-mono text-xs shadow-inner relative border border-slate-200"
            style={{ backgroundImage: "radial-gradient(#f1f5f9 1.5px, transparent 1.5px)", backgroundSize: "12px 12px" }}
          >
            {/* Thermal Scallop top border simulation */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-[linear-gradient(45deg,transparent_33.333%,#cbd5e1_33.333%,#cbd5e1_66.667%,transparent_66.667%)] bg-[size:10px_10px]" />

            {/* Header */}
            <div className="text-center space-y-1 pb-4 border-b border-dashed border-slate-300">
              <h2 className="text-lg font-extrabold tracking-wider uppercase text-slate-900">✨ SMART SALON ✨</h2>
              <p className="text-[10px] text-slate-500 font-bold">Premium Digital Receipt</p>
              <p className="text-[9px] text-slate-400">Main Bazaar, Punjab, Pakistan</p>
            </div>

            {/* Info details */}
            <div className="py-3 border-b border-dashed border-slate-300 space-y-1.5 text-[10px]">
              <div className="flex justify-between">
                <span>Date: <b>{date}</b></span>
                <span>Time: <b>{time}</b></span>
              </div>
              <div className="flex justify-between">
                <span>Client: <span className="uppercase font-bold">{clientName}</span></span>
                <span>Phone: <b>{clientPhone}</b></span>
              </div>
              <div className="flex justify-between border-t border-slate-100 pt-1.5 mt-1">
                <span>Stylist: <b className="text-slate-800">{staffName}</b></span>
                <span>Type: <b className="text-slate-800">{booking.bookingType || "Walk-In"}</b></span>
              </div>
            </div>

            {/* Table of items */}
            <div className="py-3 space-y-2 border-b border-dashed border-slate-300">
              <div className="flex justify-between font-bold text-slate-500 text-[9px] uppercase tracking-wider">
                <span>Item Name</span>
                <span>Price (Rs.)</span>
              </div>

              {/* Services */}
              {services.map((item, idx) => (
                <div key={`s-${idx}-${item.id}`} className="flex justify-between items-start text-slate-800">
                  <span className="truncate pr-4">💇 {item.name}</span>
                  <span className="font-bold flex-shrink-0">Rs. {item.price.toLocaleString()}</span>
                </div>
              ))}

              {/* Products */}
              {products.map((item, idx) => (
                <div key={`p-${idx}-${item.id}`} className="flex justify-between items-start text-slate-800">
                  <span className="truncate pr-4">📦 {item.name} (Prod)</span>
                  <span className="font-bold flex-shrink-0">Rs. {item.price.toLocaleString()}</span>
                </div>
              ))}
            </div>

            {/* Price Calculations */}
            <div className="py-3 space-y-1.5 text-[11px] border-b border-dashed border-slate-300">
              <div className="flex justify-between text-slate-600">
                <span>Subtotal (Kul Rakam):</span>
                <span>Rs. {subtotal.toLocaleString()}</span>
              </div>
              {discount > 0 && (
                <div className="flex justify-between text-rose-600 font-bold">
                  <span>🎁 Discount (Rihayat):</span>
                  <span>- Rs. {discount.toLocaleString()}</span>
                </div>
              )}
              {tip > 0 && (
                <div className="flex justify-between text-emerald-600 font-bold">
                  <span>⭐ Tip (Stylist Inaam):</span>
                  <span>+ Rs. {tip.toLocaleString()}</span>
                </div>
              )}
              <div className="flex justify-between text-slate-600 border-t border-slate-100 pt-1 mt-1">
                <span>Tax & GSTR:</span>
                <span>Rs. 0 (Waived)</span>
              </div>
            </div>

            {/* Grand Total */}
            <div className="pt-3 pb-1 space-y-1">
              <div className="flex justify-between items-center text-slate-900 border-b border-slate-100 pb-1.5">
                <span className="font-extrabold text-xs uppercase">Grand Total:</span>
                <span className="text-base font-black tracking-tight">Rs. {grandTotal.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center text-[10px] text-slate-700 py-0.5">
                <span>Received (Kitnay Diye):</span>
                <span className="font-bold">Rs. {amountPaid.toLocaleString()}</span>
              </div>
              {changeDue > 0 && (
                <div className="flex justify-between items-center text-[10px] text-emerald-700 py-0.5 font-bold">
                  <span>Change Return (Baqaya):</span>
                  <span>Rs. {changeDue.toLocaleString()}</span>
                </div>
              )}
              <div className="flex justify-between items-center text-[10px] text-slate-500 border-t border-slate-100 pt-1.5 mt-1">
                <span className="capitalize">Method: <b>{paymentMethod}</b></span>
                <span className="uppercase font-bold text-slate-800">{paymentStatus}</span>
              </div>
            </div>

            {/* Footer Thank You */}
            <div className="pt-4 border-t border-dashed border-slate-300 text-center space-y-1">
              <p className="text-[10px] font-bold text-slate-800">✨ SHUKRIYA / THANK YOU ✨</p>
              <p className="text-[9px] text-slate-400">Dobara Tashreef Layain!</p>
              <p className="text-[8px] text-slate-400 font-mono mt-1">Ref ID: {booking.id || "temp-receipt"}</p>
            </div>

            {/* Thermal Scallop bottom border simulation */}
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-[linear-gradient(45deg,transparent_33.333%,#cbd5e1_33.333%,#cbd5e1_66.667%,transparent_66.667%)] bg-[size:10px_10px]" />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={handlePrint}
            className="flex items-center justify-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-white font-bold py-2.5 px-4 rounded-xl text-xs transition duration-150 border border-slate-700 cursor-pointer"
          >
            <Printer size={14} className="text-amber-500" />
            Print Receipt
          </button>
          
          <button
            onClick={handleCopyText}
            className={`flex items-center justify-center gap-1.5 py-2.5 px-4 rounded-xl text-xs font-bold transition duration-150 cursor-pointer ${
              copied 
                ? "bg-emerald-500 text-slate-950 shadow shadow-emerald-500/20" 
                : "bg-amber-500 hover:bg-amber-600 text-slate-950 shadow shadow-amber-500/15"
            }`}
          >
            {copied ? (
              <>
                <Check size={14} className="stroke-[3]" />
                Copied / WhatsApp Ready
              </>
            ) : (
              <>
                <Copy size={14} />
                Save / WhatsApp Receipt
              </>
            )}
          </button>
        </div>

        {/* Informational tip */}
        <p className="text-[10px] text-slate-500 text-center mt-3 leading-relaxed">
          WhatsApp button dabane par Roman Urdu receipt format copy ho jata hai, aap seedha client ke WhatsApp chat par paste kar ke send kar sakte hain.
        </p>
      </motion.div>
    </div>
  );
}
