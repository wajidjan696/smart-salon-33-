import React, { useState, useEffect } from "react";
import { KhataAccount, KhataLog, StaffMember } from "../types";
import { 
  getKhataAccounts, 
  saveKhataAccount, 
  deleteKhataAccount, 
  getKhataLogs, 
  addKhataLog, 
  deleteKhataLog 
} from "../firebaseService";
import { 
  BookOpen, 
  Plus, 
  Search, 
  Trash2, 
  ArrowUpRight, 
  ArrowDownLeft, 
  UserCheck, 
  Phone, 
  Calendar, 
  DollarSign, 
  CheckCircle2, 
  FileText,
  AlertTriangle,
  ChevronRight,
  Printer,
  X,
  Edit2
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface KhataBookProps {
  staff: StaffMember[];
}

export default function KhataBook({ staff }: KhataBookProps) {
  const [accounts, setAccounts] = useState<KhataAccount[]>([]);
  const [logs, setLogs] = useState<KhataLog[]>([]);
  const [loading, setLoading] = useState(true);
  
  // UI States
  const [activeTab, setActiveTab] = useState<"all" | "client" | "staff">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Modals & Active Account Statement
  const [selectedAccount, setSelectedAccount] = useState<KhataAccount | null>(null);
  const [showAddAccountModal, setShowAddAccountModal] = useState(false);
  const [showAddLogModal, setShowAddLogModal] = useState(false);

  // New Account Form State
  const [accName, setAccName] = useState("");
  const [accType, setAccType] = useState<"client" | "staff">("client");
  const [accPhone, setAccPhone] = useState("");
  const [initialBalance, setInitialBalance] = useState("");

  // New Log Form State
  const [logAmount, setLogAmount] = useState("");
  const [logType, setLogType] = useState<"credit" | "debit">("credit"); // credit = they paid, debit = they took service/product on credit
  const [logDesc, setLogDesc] = useState("");
  const [logDate, setLogDate] = useState(() => new Date().toISOString().split('T')[0]);

  const [editingAccount, setEditingAccount] = useState<KhataAccount | null>(null);
  const [editingLog, setEditingLog] = useState<KhataLog | null>(null);

  // Populate form on editingAccount change
  useEffect(() => {
    if (editingAccount) {
      setAccName(editingAccount.name);
      setAccType(editingAccount.type);
      setAccPhone(editingAccount.phone === "No Phone" ? "" : editingAccount.phone);
      setInitialBalance("");
    } else {
      setAccName("");
      setAccType("client");
      setAccPhone("");
      setInitialBalance("");
    }
  }, [editingAccount]);

  useEffect(() => {
    loadKhataData();
  }, []);

  const loadKhataData = async () => {
    setLoading(true);
    try {
      const accList = await getKhataAccounts();
      const logList = await getKhataLogs();
      setAccounts(accList);
      setLogs(logList);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!accName.trim()) {
      setError("Naam likhna zaroori hai.");
      return;
    }

    const cleanedPhone = accPhone.trim();
    const balanceNum = parseFloat(initialBalance) || 0;

    if (editingAccount) {
      try {
        const updatedAccount: KhataAccount = {
          ...editingAccount,
          name: accName.trim(),
          type: accType,
          phone: cleanedPhone || "No Phone",
          lastUpdated: new Date().toISOString()
        };
        await saveKhataAccount(updatedAccount);
        
        if (selectedAccount && selectedAccount.id === editingAccount.id) {
          setSelectedAccount(updatedAccount);
        }
        
        setEditingAccount(null);
        setShowAddAccountModal(false);
        setSuccess("Khata Account successfully update ho gaya!");
        await loadKhataData();
      } catch (err) {
        console.error(err);
        setError("Account update karte hue error aya.");
      }
      return;
    }

    // Check if account already exists with this phone
    if (cleanedPhone && accounts.some(a => a.phone === cleanedPhone && a.type === accType)) {
      setError("Is phone number ke sath account pehle se mojood hai.");
      return;
    }

    try {
      const accId = cleanedPhone ? `khata-${accType}-${cleanedPhone}` : `khata-${accType}-${Date.now()}`;
      const newAccount: KhataAccount = {
        id: accId,
        name: accName.trim(),
        type: accType,
        phone: cleanedPhone || "No Phone",
        balance: balanceNum,
        lastUpdated: new Date().toISOString()
      };

      await saveKhataAccount(newAccount);

      // If initial balance is entered, log it as an entry
      if (balanceNum !== 0) {
        const initialLog: KhataLog = {
          id: `klog-${Date.now()}`,
          accountId: accId,
          accountName: accName.trim(),
          amount: Math.abs(balanceNum),
          type: balanceNum > 0 ? "debit" : "credit",
          description: "Khata Account Opening Balance",
          date: new Date().toISOString().split('T')[0],
          createdAt: new Date().toISOString()
        };
        await addKhataLog(initialLog);
      }

      setSuccess("Khata Account kamyabi se create ho gaya!");
      setAccName("");
      setAccPhone("");
      setInitialBalance("");
      setShowAddAccountModal(false);
      await loadKhataData();
    } catch (err) {
      console.error(err);
      setError("Account create karte hue error aya.");
    }
  };

  const handleAddLogSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!selectedAccount) return;
    const amountNum = parseFloat(logAmount);
    if (isNaN(amountNum) || amountNum <= 0) {
      setError("Amount bilkul sahi enter karein.");
      return;
    }
    if (!logDesc.trim()) {
      setError("Wajah / Detail likhna zaroori hai.");
      return;
    }

    try {
      if (editingLog) {
        // 1. Reverse old log's effect on balance
        let reverseAdjustment = 0;
        if (selectedAccount.type === "client") {
          reverseAdjustment = editingLog.type === "debit" ? -editingLog.amount : editingLog.amount;
        } else {
          reverseAdjustment = editingLog.type === "credit" ? -editingLog.amount : editingLog.amount;
        }

        // 2. Calculate new log's effect on balance
        let balanceChange = 0;
        if (selectedAccount.type === "client") {
          balanceChange = logType === "debit" ? amountNum : -amountNum;
        } else {
          balanceChange = logType === "credit" ? amountNum : -amountNum;
        }

        const updatedLog: KhataLog = {
          ...editingLog,
          amount: amountNum,
          type: logType,
          description: logDesc.trim(),
          date: logDate
        };

        await addKhataLog(updatedLog);

        const updatedAccount: KhataAccount = {
          ...selectedAccount,
          balance: selectedAccount.balance + reverseAdjustment + balanceChange,
          lastUpdated: new Date().toISOString()
        };

        await saveKhataAccount(updatedAccount);
        setSelectedAccount(updatedAccount);
        
        setEditingLog(null);
        setSuccess("Khata entry successfully update ho gayi!");
        setLogAmount("");
        setLogDesc("");
        setShowAddLogModal(false);
        await loadKhataData();
        return;
      }

      // 1. Create Log
      const newLog: KhataLog = {
        id: `klog-${Date.now()}`,
        accountId: selectedAccount.id,
        accountName: selectedAccount.name,
        amount: amountNum,
        type: logType,
        description: logDesc.trim(),
        date: logDate,
        createdAt: new Date().toISOString()
      };

      await addKhataLog(newLog);

      // 2. Adjust Balance
      // Clients: Credit = they paid us (reduces balance they owe), Debit = they took service/loan (increases balance they owe)
      // Staff: Credit = we paid them advance (increases what they owe us / advance balance), Debit = we pay commission/payout (reduces advance balance)
      // Standard mathematical behavior: 
      let balanceChange = 0;
      if (selectedAccount.type === "client") {
        balanceChange = logType === "debit" ? amountNum : -amountNum;
      } else {
        // Staff balance: positive means they owe us (advance taken), negative means we owe them (salary/commission pending)
        balanceChange = logType === "credit" ? amountNum : -amountNum; 
      }

      const updatedAccount: KhataAccount = {
        ...selectedAccount,
        balance: selectedAccount.balance + balanceChange,
        lastUpdated: new Date().toISOString()
      };

      await saveKhataAccount(updatedAccount);
      setSelectedAccount(updatedAccount); // Refresh current modal view

      setSuccess("Khata log entry save ho gayi!");
      setLogAmount("");
      setLogDesc("");
      setShowAddLogModal(false);
      await loadKhataData();
    } catch (err) {
      console.error(err);
      setError("Khata ledger update karne me error aya.");
    }
  };

  const handleDeleteLog = async (log: KhataLog) => {
    if (!selectedAccount) return;
    if (window.confirm("Kiya aap waqai is ledger entry ko delete karna chahte hain? Is se purana hisab adjust ho jayega.")) {
      try {
        await deleteKhataLog(log.id);

        // Reverse balance adjustment
        let reverseAdjustment = 0;
        if (selectedAccount.type === "client") {
          reverseAdjustment = log.type === "debit" ? -log.amount : log.amount;
        } else {
          reverseAdjustment = log.type === "credit" ? -log.amount : log.amount;
        }

        const updatedAccount: KhataAccount = {
          ...selectedAccount,
          balance: selectedAccount.balance + reverseAdjustment,
          lastUpdated: new Date().toISOString()
        };

        await saveKhataAccount(updatedAccount);
        setSelectedAccount(updatedAccount);
        await loadKhataData();
      } catch (err) {
        console.error(err);
      }
    }
  };

  const handleDeleteAccount = async (acc: KhataAccount) => {
    if (window.confirm(`Kiya aap waqai "${acc.name}" ka pura Khata Account delete karna chahte hain? Iska sara hisab permanently khatam ho jayega.`)) {
      try {
        await deleteKhataAccount(acc.id);
        
        // Delete all corresponding logs too
        const associatedLogs = logs.filter(l => l.accountId === acc.id);
        for (const log of associatedLogs) {
          await deleteKhataLog(log.id);
        }

        setSelectedAccount(null);
        await loadKhataData();
      } catch (err) {
        console.error(err);
      }
    }
  };

  const filteredAccounts = accounts.filter(acc => {
    const matchesSearch = acc.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          acc.phone.includes(searchQuery);
    const matchesType = activeTab === "all" || acc.type === activeTab;
    return matchesSearch && matchesType;
  });

  const selectedAccountLogs = logs.filter(l => l.accountId === (selectedAccount?.id || ""));

  // Calculate totals
  const totalClientDues = accounts
    .filter(a => a.type === "client" && a.balance > 0)
    .reduce((sum, a) => sum + a.balance, 0);

  const totalStaffAdvances = accounts
    .filter(a => a.type === "staff" && a.balance > 0)
    .reduce((sum, a) => sum + a.balance, 0);

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
            <BookOpen className="text-amber-500 animate-pulse" />
            Saloon Khata Book & Dues Ledger (Bakaya Record)
          </h2>
          <p className="text-slate-400 text-sm">
            Makhsoos clients aur staff members ka udhaar, advances, aur bakaya payments ka digital register.
          </p>
        </div>

        <button
          onClick={() => setShowAddAccountModal(true)}
          className="flex items-center gap-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-extrabold px-4.5 py-2.5 rounded-xl transition text-xs shadow-md shadow-amber-500/10 active:scale-95 cursor-pointer"
        >
          <Plus size={15} className="stroke-[3]" />
          <span>Naya Khata Account</span>
        </button>
      </div>

      {success && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-400 rounded-xl">
          {success}
        </div>
      )}

      {/* Summary Boards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl flex items-center justify-between shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-rose-500/5 rounded-full blur-2xl"></div>
          <div>
            <span className="text-[10px] text-slate-500 uppercase tracking-widest font-black block">Total Client Dues (Udhaar)</span>
            <span className="text-2xl font-black text-rose-400 font-mono block mt-1">Rs. {totalClientDues.toLocaleString()}</span>
            <span className="text-[10px] text-slate-400 block mt-0.5">Yeh paisay salon ne clients se lene hain (Bakaya).</span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-rose-500/10 text-rose-400 flex items-center justify-center border border-rose-500/20 font-bold">
            <ArrowUpRight size={22} />
          </div>
        </div>

        <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl flex items-center justify-between shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 rounded-full blur-2xl"></div>
          <div>
            <span className="text-[10px] text-slate-500 uppercase tracking-widest font-black block">Total Staff Advances</span>
            <span className="text-2xl font-black text-amber-500 font-mono block mt-1">Rs. {totalStaffAdvances.toLocaleString()}</span>
            <span className="text-[10px] text-slate-400 block mt-0.5">Staff ko diye gaye advance loans ya balances.</span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center border border-amber-500/20 font-bold">
            <ArrowDownLeft size={22} />
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex gap-2 border-b border-slate-850 pb-px">
        {[
          { id: "all", label: "Sab accounts" },
          { id: "client", label: "Customer (Client) Khate" },
          { id: "staff", label: "Staff Members Advances" }
        ].map(t => (
          <button
            key={t.id}
            onClick={() => { setActiveTab(t.id as any); setSearchQuery(""); }}
            className={`pb-2.5 px-4 font-bold text-xs transition duration-150 uppercase tracking-wider border-b-2 ${
              activeTab === t.id
                ? "border-amber-500 text-white"
                : "border-transparent text-slate-500 hover:text-slate-300"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Filter and Search Panel */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search size={14} className="absolute left-3.5 top-3.5 text-slate-500" />
          <input
            type="text"
            placeholder="Search account name or phone number..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500/40 rounded-xl py-2.5 pl-10 pr-4 text-xs text-white placeholder-slate-600 outline-none transition"
          />
        </div>
      </div>

      {/* Accounts List Grid */}
      {loading ? (
        <div className="p-12 text-center text-xs text-slate-500">
          <div className="w-5 h-5 border-2 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
          Loading Khata accounts...
        </div>
      ) : filteredAccounts.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredAccounts.map((acc) => {
            const hasDues = acc.balance > 0;
            const balanceColor = acc.type === "client" 
              ? (hasDues ? "text-rose-400 font-bold" : "text-emerald-400")
              : (acc.balance > 0 ? "text-amber-400" : "text-emerald-400");

            return (
              <div 
                key={acc.id}
                onClick={() => setSelectedAccount(acc)}
                className="bg-slate-900 border border-slate-800 hover:border-slate-750 p-4 rounded-2xl cursor-pointer transition hover:bg-slate-950/30 group flex flex-col justify-between gap-4"
              >
                <div className="flex justify-between items-start">
                  <div className="flex gap-2.5 items-center min-w-0">
                    <div className="w-8 h-8 rounded-full bg-slate-950 border border-slate-800 flex items-center justify-center text-xs text-amber-500 font-bold flex-shrink-0">
                      {acc.name[0].toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <span className="font-semibold text-white block truncate text-xs group-hover:text-amber-400 transition-colors">
                        {acc.name}
                      </span>
                      <span className="text-[10px] text-slate-500 font-mono block">
                        {acc.phone}
                      </span>
                    </div>
                  </div>

                  <span className={`text-[9px] font-bold px-2 py-0.5 rounded border uppercase ${
                    acc.type === "client" 
                      ? "bg-blue-500/10 text-blue-400 border-blue-500/20" 
                      : "bg-purple-500/10 text-purple-400 border-purple-500/20"
                  }`}>
                    {acc.type}
                  </span>
                </div>

                <div className="flex items-end justify-between pt-2 border-t border-slate-850/60 text-xs">
                  <div>
                    <span className="text-slate-500 text-[10px] block uppercase font-bold tracking-tight">Ledger Balance</span>
                    <span className={`text-base font-black font-mono ${balanceColor}`}>
                      Rs. {Math.abs(acc.balance).toLocaleString()}
                      <span className="text-[9px] font-normal block text-slate-400 font-sans mt-0.5">
                        {acc.type === "client" 
                          ? (acc.balance > 0 ? "⚠️ Customer owes us" : "✅ Clear / No Dues")
                          : (acc.balance > 0 ? "⚠️ Staff took Advance" : "✅ Balance settled")}
                      </span>
                    </span>
                  </div>

                  <div className="w-7 h-7 rounded-xl bg-slate-950 flex items-center justify-center text-slate-400 group-hover:text-amber-400 group-hover:translate-x-1 transition">
                    <ChevronRight size={14} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="p-16 text-center text-slate-500 text-xs border border-dashed border-slate-800 rounded-2xl bg-slate-950/20">
          Koi Khata account nahi mila. Ledger account banane ke liye upar "+ Naya Khata Account" button use karein.
        </div>
      )}

      {/* MODAL 1: Create Khata Account */}
      <AnimatePresence>
        {showAddAccountModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowAddAccountModal(false)}
              className="absolute inset-0 bg-slate-950/85 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 relative z-10"
            >
              <h3 className="text-base font-bold text-white mb-4 uppercase tracking-wider flex items-center gap-2">
                <Plus size={16} className="text-amber-500" />
                {editingAccount ? "Edit Khata Account Details" : "Naya Khata Register (Create Account)"}
              </h3>

              {error && (
                <div className="p-3 mb-3 bg-rose-500/10 border border-rose-500/20 text-xs text-rose-400 rounded-xl">
                  {error}
                </div>
              )}

              <form onSubmit={handleCreateAccount} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs text-slate-400 font-medium">Khata Type *</label>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { type: "client", label: "Customer / Client", desc: "Customer dues/ledger" },
                      { type: "staff", label: "Stylist / Staff Member", desc: "Advances tracking" }
                    ].map(st => (
                      <button
                        key={st.type}
                        type="button"
                        onClick={() => setAccType(st.type as any)}
                        className={`p-3 rounded-xl border text-left transition duration-200 ${
                          accType === st.type
                            ? "border-amber-500 bg-amber-500/5 text-amber-400 font-bold"
                            : "border-slate-800 hover:border-slate-700 bg-slate-950/40 text-slate-400"
                        }`}
                      >
                        <span className="text-xs block text-white font-bold">{st.label}</span>
                        <span className="text-[9px] block text-slate-500 mt-0.5">{st.desc}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs text-slate-400 font-medium">Khata Holder Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="E.g. Kamran Ahmad"
                    value={accName}
                    onChange={(e) => setAccName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500/50 rounded-xl py-2.5 px-3.5 text-xs text-white outline-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs text-slate-400 font-medium">Phone Number (Optional but Recommended)</label>
                  <input
                    type="tel"
                    placeholder="E.g. 03012345678"
                    value={accPhone}
                    onChange={(e) => setAccPhone(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500/50 rounded-xl py-2.5 px-3.5 text-xs text-white outline-none font-mono"
                  />
                </div>

                {!editingAccount && (
                  <div className="space-y-1.5">
                    <label className="text-xs text-slate-400 font-medium">Initial Udhaar / Opening Balance (Optional)</label>
                    <input
                      type="number"
                      placeholder="Rs. Khate me pehle se bakaya"
                      value={initialBalance}
                      onChange={(e) => setInitialBalance(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500/50 rounded-xl py-2.5 px-3.5 text-xs text-white outline-none font-mono"
                    />
                    <span className="text-[10px] text-slate-500 block">Initial balance will log automatically as transaction.</span>
                  </div>
                )}

                <div className="flex gap-2.5 pt-3 justify-end text-xs font-bold">
                  <button
                    type="button"
                    onClick={() => {
                      setEditingAccount(null);
                      setShowAddAccountModal(false);
                    }}
                    className="bg-slate-800 text-slate-400 hover:text-white px-4 py-2 rounded-xl transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="bg-amber-500 hover:bg-amber-600 text-slate-950 px-5 py-2 rounded-xl transition shadow font-black"
                  >
                    {editingAccount ? "Update Details" : "Create Account"}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 2: Account Statement & Ledger Logs (Silsila / Khata detail) */}
      <AnimatePresence>
        {selectedAccount && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedAccount(null)}
              className="absolute inset-0 bg-slate-950/85 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-y-auto relative z-10 flex flex-col shadow-2xl"
            >
              {/* Header */}
              <div className="p-6 border-b border-slate-850 flex justify-between items-start bg-slate-950/40">
                <div className="flex gap-3 items-center">
                  <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-amber-400 font-bold border border-slate-700">
                    {selectedAccount.name[0].toUpperCase()}
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white flex items-center gap-1.5 uppercase tracking-wide">
                      {selectedAccount.name}
                      <span className="text-[10px] font-bold bg-slate-800 px-2 py-0.5 rounded border border-slate-700 text-slate-300">
                        {selectedAccount.type.toUpperCase()}
                      </span>
                    </h3>
                    <p className="text-[10px] text-slate-500 font-mono mt-0.5 flex items-center gap-1">
                      <Phone size={10} /> {selectedAccount.phone} | Last update: {new Date(selectedAccount.lastUpdated).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setSelectedAccount(null)}
                  className="p-1.5 bg-slate-800 hover:bg-slate-750 text-slate-400 hover:text-white rounded-xl border border-slate-700 transition cursor-pointer"
                >
                  <X size={15} />
                </button>
              </div>

              {/* Body */}
              <div className="p-6 space-y-6 flex-grow overflow-y-auto">
                {/* Account Balances Summary Card */}
                <div className="p-4 bg-slate-950 border border-slate-800/80 rounded-2xl flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-slate-500 uppercase tracking-widest font-black block">Total Current Dues / Udhaar</span>
                    <span className={`text-xl font-black font-mono mt-0.5 ${
                      selectedAccount.balance > 0 ? "text-rose-400" : "text-emerald-400"
                    }`}>
                      Rs. {Math.abs(selectedAccount.balance).toLocaleString()}
                    </span>
                    <span className="text-[9.5px] text-slate-500 block">
                      {selectedAccount.type === "client" 
                        ? (selectedAccount.balance > 0 ? "Khasusi client owes us this amount." : "Settle / Payment Clear")
                        : (selectedAccount.balance > 0 ? "Stylist owes advance balance." : "Advances clear")}
                    </span>
                  </div>

                  <div className="flex gap-2 text-xs">
                    <button
                      onClick={() => {
                        setLogType("credit"); // they pay us / we give staff loan
                        setShowAddLogModal(true);
                      }}
                      className="flex items-center gap-1.5 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black px-3.5 py-2 rounded-xl transition cursor-pointer"
                    >
                      <Plus size={12} className="stroke-[3]" />
                      <span>{selectedAccount.type === "client" ? "Receive Payment (Credit)" : "Advance Payment"}</span>
                    </button>

                    {selectedAccount.type === "client" && (
                      <button
                        onClick={() => {
                          setLogType("debit"); // they take service on credit
                          setShowAddLogModal(true);
                        }}
                        className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-amber-400 border border-slate-700/60 font-semibold px-3.5 py-2 rounded-xl transition cursor-pointer"
                      >
                        <Plus size={12} />
                        <span>Add Udhaar Bill (Debit)</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Ledger Log entries */}
                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                    <FileText size={12} className="text-amber-500" />
                    Ledger Statement / History (Roznamcha)
                  </h4>

                  <div className="bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden">
                    {selectedAccountLogs.length > 0 ? (
                      <div className="max-h-[250px] overflow-y-auto divide-y divide-slate-900">
                        {selectedAccountLogs.map((log) => {
                          const isCredit = log.type === "credit";
                          const labelColor = isCredit ? "text-emerald-400 font-bold bg-emerald-500/10 border-emerald-500/20" : "text-rose-400 font-bold bg-rose-500/10 border-rose-500/20";
                          return (
                            <div key={log.id} className="p-3 flex items-center justify-between hover:bg-slate-900/30 transition text-xs">
                              <div className="space-y-1">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className={`text-[9px] uppercase tracking-wide font-black px-2 py-0.5 rounded border ${labelColor}`}>
                                    {log.type.toUpperCase()}
                                  </span>
                                  <span className="font-bold text-white text-xs">{log.description}</span>
                                </div>
                                <span className="text-[10px] text-slate-500 block font-mono">
                                  Date: {log.date}
                                </span>
                              </div>

                              <div className="flex items-center gap-2 font-mono">
                                <span className={`text-sm font-black mr-1 ${
                                  isCredit ? "text-emerald-400" : "text-rose-400"
                                }`}>
                                  {isCredit ? "- " : "+ "}Rs. {log.amount.toLocaleString()}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingLog(log);
                                    setLogAmount(log.amount.toString());
                                    setLogType(log.type);
                                    setLogDesc(log.description);
                                    setLogDate(log.date);
                                    setShowAddLogModal(true);
                                  }}
                                  className="text-slate-400 hover:text-amber-400 p-1.5 bg-slate-900 rounded-lg border border-slate-800 transition duration-150 cursor-pointer"
                                  title="Edit Ledger Entry"
                                >
                                  <Edit2 size={11} />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteLog(log)}
                                  className="text-slate-600 hover:text-rose-400 p-1.5 bg-slate-900 rounded-lg border border-slate-800 hover:border-rose-950/20 transition duration-150 cursor-pointer"
                                  title="Delete statement entry"
                                >
                                  <Trash2 size={11} />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="p-10 text-center text-slate-500 text-xs">
                        Statement history khali hai. Record register karne ke liye upar "+ Receive Payment" ya "+ Add Udhaar Bill" click karein.
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="p-4 border-t border-slate-850 flex justify-between items-center bg-slate-950/20 text-xs font-bold px-6 gap-2">
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setEditingAccount(selectedAccount);
                      setShowAddAccountModal(true);
                    }}
                    className="text-amber-400 hover:text-amber-300 bg-slate-950/40 px-4 py-2 border border-slate-800 rounded-xl transition cursor-pointer flex items-center gap-1.5"
                  >
                    <Edit2 size={12} />
                    <span>Edit Details</span>
                  </button>
                  <button
                    onClick={() => handleDeleteAccount(selectedAccount)}
                    className="text-rose-400 hover:text-rose-300 bg-rose-950/20 px-4 py-2 border border-rose-900/20 rounded-xl transition cursor-pointer"
                  >
                    Delete Account (Pura Khata Mitaen)
                  </button>
                </div>
                <button
                  onClick={() => setSelectedAccount(null)}
                  className="bg-slate-800 text-slate-300 hover:text-white px-5 py-2 border border-slate-700/60 rounded-xl transition cursor-pointer"
                >
                  Close Statement View
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 3: Add Ledger Statement entry (Debit/Credit logging) */}
      <AnimatePresence>
        {showAddLogModal && selectedAccount && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowAddLogModal(false)}
              className="absolute inset-0 bg-slate-950/90 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-sm p-6 relative z-10"
            >
              <h3 className="text-base font-bold text-white mb-4 uppercase tracking-wider">
                {editingLog ? `Edit entry: ${selectedAccount.name}` : `${selectedAccount.name} ${logType === "credit" ? "Payment Receive" : "Udhaar Entry (Debit)"}`}
              </h3>

              {error && (
                <div className="p-3 mb-3 bg-rose-500/10 border border-rose-500/20 text-xs text-rose-400 rounded-xl">
                  {error}
                </div>
              )}

              <form onSubmit={handleAddLogSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs text-slate-400 font-medium">Transaction Amount (Rs.) *</label>
                  <input
                    type="number"
                    required
                    placeholder="E.g. 1500"
                    value={logAmount}
                    onChange={(e) => setLogAmount(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500/50 rounded-xl py-2.5 px-3.5 text-xs text-amber-400 outline-none font-mono"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs text-slate-400 font-medium">Detail / Reason (Wajah) *</label>
                  <input
                    type="text"
                    required
                    placeholder={logType === "credit" ? "E.g. Remaining balance received" : "E.g. Hair Cut and Facial on Khata"}
                    value={logDesc}
                    onChange={(e) => setLogDesc(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500/50 rounded-xl py-2.5 px-3.5 text-xs text-white outline-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs text-slate-400 font-medium">Tareeq (Date)</label>
                  <input
                    type="date"
                    required
                    value={logDate}
                    onChange={(e) => setLogDate(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500/50 rounded-xl py-2.5 px-3.5 text-xs text-white outline-none font-mono"
                  />
                </div>

                <div className="flex gap-2.5 pt-3 justify-end text-xs font-bold">
                  <button
                    type="button"
                    onClick={() => {
                      setEditingLog(null);
                      setShowAddLogModal(false);
                    }}
                    className="bg-slate-800 text-slate-400 hover:text-white px-4 py-2 rounded-xl transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="bg-amber-500 hover:bg-amber-600 text-slate-950 px-5 py-2 rounded-xl transition shadow font-black"
                  >
                    {editingLog ? "Update Entry" : "Save Entry"}
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
