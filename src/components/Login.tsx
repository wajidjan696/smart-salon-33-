import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Lock, User, Flame, AlertCircle, Sparkles, ArrowRight, Info, ShieldCheck } from "lucide-react";

interface LoginProps {
  onLoginSuccess: (username: string) => void;
}

export default function Login({ onLoginSuccess }: LoginProps) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!username || !password) {
      setError("Meharbani karke Username aur Password dono enter karein.");
      return;
    }

    setLoading(true);

    // Simulate a secure fast check (matches your exact requirements)
    setTimeout(() => {
      const enteredUsername = username.trim().toLowerCase();
      if ((enteredUsername === "admin" || enteredUsername === "admn") && password === "password33") {
        setSuccess("Login kamyabi se mukammal hua! App open ho rahi hai...");
        setTimeout(() => {
          onLoginSuccess(username.trim());
        }, 800);
      } else {
        setError("Ghalat Username ya Password enter kiya hai. Meharbani karke dobara check karein.");
        setLoading(false);
      }
    }, 600);
  };

  return (
    <div className="min-h-screen bg-[#060910] flex items-center justify-center p-4 relative overflow-hidden font-sans">
      {/* Background ambient neon glow effects */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl translate-x-1/2 translate-y-1/2"></div>
      
      <div className="w-full max-w-md bg-slate-950/80 backdrop-blur-md border border-slate-900 rounded-3xl p-6 sm:p-8 shadow-2xl relative z-10">
        
        {/* Brand identity */}
        <div className="flex flex-col items-center text-center mb-8">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500 to-amber-600 flex items-center justify-center text-slate-950 font-black text-2xl shadow-lg shadow-amber-500/20 mb-3.5">
            33
          </div>
          <h1 className="text-2xl font-black text-white tracking-wide uppercase">
            Smart Salon 33
          </h1>
          <p className="text-xs text-amber-500 font-bold tracking-widest uppercase mt-0.5">
            Admin Desktop Secure Portal
          </p>
          <p className="text-xs text-slate-400 mt-2.5 max-w-xs leading-relaxed">
            Dukan ke dashboard, POS billing, aur staff logs tak rasai ke liye admin credentials enter karein.
          </p>
        </div>

        {/* Notifications */}
        <AnimatePresence mode="wait">
          {error && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mb-5 bg-rose-500/10 border border-rose-500/20 rounded-2xl p-3.5 flex items-start gap-2.5 text-xs text-rose-400 font-medium animate-pulse"
            >
              <AlertCircle size={16} className="shrink-0 mt-0.5 text-rose-500" />
              <span>{error}</span>
            </motion.div>
          )}

          {success && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mb-5 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-3.5 flex items-start gap-2.5 text-xs text-emerald-400 font-medium"
            >
              <Sparkles size={16} className="shrink-0 mt-0.5 text-emerald-500" />
              <span>{success}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Credentials Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Username</label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500">
                <User size={15} />
              </span>
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="admin"
                className="w-full bg-slate-900/60 border border-slate-800/80 focus:border-amber-500/50 rounded-xl py-3 pl-10 pr-4 text-xs text-white outline-none placeholder:text-slate-600 transition"
                autoFocus
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Password</label>
              <span className="text-[9px] text-slate-500 font-semibold font-mono">lock code</span>
            </div>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500">
                <Lock size={15} />
              </span>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="******"
                className="w-full bg-slate-900/60 border border-slate-800/80 focus:border-amber-500/50 rounded-xl py-3 pl-10 pr-4 text-xs text-white outline-none placeholder:text-slate-600 transition"
              />
            </div>
          </div>

          {/* Submit Action Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-extrabold text-xs py-3.5 rounded-xl flex items-center justify-center gap-2 transition duration-200 shadow-md shadow-amber-500/10 active:scale-[0.98] disabled:opacity-50 select-none cursor-pointer"
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <>
                <span>Secure Login</span>
                <ArrowRight size={14} className="stroke-[2.5]" />
              </>
            )}
          </button>
        </form>

        {/* Info panel */}
        <div className="mt-8 p-3 bg-slate-900/40 border border-slate-900/60 rounded-xl flex items-start gap-2 text-[10px] text-slate-500">
          <ShieldCheck size={14} className="text-amber-500/80 mt-0.5 shrink-0" />
          <div className="leading-relaxed">
            <p className="font-bold text-slate-300">Offline Secure Mode Active</p>
            <p className="mt-0.5">
              Yeh portal 100% locally verified hai aur iska offline backup hamesha safe rehta hai. Kisi aur device se data access karne ke liye login kar sakte hain.
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}
