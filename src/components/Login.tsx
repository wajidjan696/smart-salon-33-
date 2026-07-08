import React, { useState } from "react";
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signInWithPopup, 
  GoogleAuthProvider,
  sendPasswordResetEmail 
} from "firebase/auth";
import { auth } from "../firebase";
import { motion, AnimatePresence } from "motion/react";
import { Lock, Mail, Chrome, Flame, AlertCircle, Sparkles, ArrowRight, UserPlus, Info } from "lucide-react";

export default function Login() {
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    if (!email || !password) {
      setError("Meharbani karke Email aur Password dono enter karein.");
      return;
    }
    if (password.length < 6) {
      setError("Password kam az kam 6 characters ka hona chahiye.");
      return;
    }

    setLoading(true);
    try {
      if (isRegister) {
        await createUserWithEmailAndPassword(auth, email, password);
        setSuccess("Account kamyabi se ban gaya hai! Aap automatic login ho rahe hain...");
      } else {
        await signInWithEmailAndPassword(auth, email, password);
        setSuccess("Login kamyabi se mukammal hua!");
      }
    } catch (err: any) {
      console.error("Auth error:", err);
      let pakiErrorMessage = "Authentication fail ho gayi. Dobara koshish karein.";
      if (err.code === "auth/user-not-found" || err.code === "auth/wrong-password" || err.code === "auth/invalid-credential") {
        pakiErrorMessage = "Ghalat Email ya Password enter kiya hai. Meharbani karke check karein.";
      } else if (err.code === "auth/email-already-in-use") {
        pakiErrorMessage = "Yeh Email pehle se register hai. Login karne ki koshish karein.";
      } else if (err.code === "auth/invalid-email") {
        pakiErrorMessage = "Email ka format sahi nahi hai.";
      } else if (err.message) {
        pakiErrorMessage = err.message;
      }
      setError(pakiErrorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError("");
    setSuccess("");
    setLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      // Custom parameters to force account selection dialog
      provider.setCustomParameters({
        prompt: "select_account"
      });
      await signInWithPopup(auth, provider);
      setSuccess("Google Account ke sath login kamyabi se mukammal hua!");
    } catch (err: any) {
      console.error("Google Auth error:", err);
      setError("Google Sign-In cancel ya fail ho gaya. Dobara koshish karein.");
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email) {
      setError("Password reset karne ke liye meharbani karke Email pehle likhein.");
      return;
    }
    setError("");
    setSuccess("");
    setLoading(true);
    try {
      await sendPasswordResetEmail(auth, email);
      setSuccess("Password reset link aapke email par bhej diya gaya hai! Check karein.");
    } catch (err: any) {
      console.error("Reset password error:", err);
      if (err.code === "auth/user-not-found") {
        setError("Is Email par koi account nahi mila.");
      } else {
        setError("Password reset email bhejne me error aya: " + err.message);
      }
    } finally {
      setLoading(false);
    }
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
            Dastiyab Suraksha • Secure Portal
          </p>
          <p className="text-xs text-slate-400 mt-2.5 max-w-xs leading-relaxed">
            Apne safe cloud account ke sath sign in karein taake aapka data hamesha secure rahe aur kisi bhi device se chal sake.
          </p>
        </div>

        {/* Notifications */}
        <AnimatePresence mode="wait">
          {error && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mb-5 bg-rose-500/10 border border-rose-500/20 rounded-2xl p-3.5 flex items-start gap-2.5 text-xs text-rose-400 font-medium"
            >
              <AlertCircle size={16} className="shrink-0 mt-0.5" />
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
              <Sparkles size={16} className="shrink-0 mt-0.5" />
              <span>{success}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Email Password Auth Form */}
        <form onSubmit={handleEmailAuth} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Email Address</label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500">
                <Mail size={15} />
              </span>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="salon@example.com"
                className="w-full bg-slate-900/60 border border-slate-800/80 focus:border-amber-500/50 rounded-xl py-3 pl-10 pr-4 text-xs text-white outline-none placeholder:text-slate-600 transition"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Password</label>
              {!isRegister && (
                <button
                  type="button"
                  onClick={handleForgotPassword}
                  className="text-[10px] text-amber-500/80 hover:text-amber-400 font-bold tracking-wide outline-none hover:underline"
                >
                  Forgot Password?
                </button>
              )}
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
            ) : isRegister ? (
              <>
                <UserPlus size={14} className="stroke-[2.5]" />
                <span>Naya Account Banayein & Sign In</span>
              </>
            ) : (
              <>
                <span>Apun Ke Account Me Jao</span>
                <ArrowRight size={14} className="stroke-[2.5]" />
              </>
            )}
          </button>
        </form>

        {/* Separator */}
        <div className="relative flex items-center justify-center my-6">
          <div className="border-t border-slate-900 w-full"></div>
          <span className="absolute bg-[#060910] px-3.5 text-[9px] text-slate-600 font-bold uppercase tracking-widest">Ya Phir (OR)</span>
        </div>

        {/* Google Authentication Button */}
        <button
          type="button"
          disabled={loading}
          onClick={handleGoogleSignIn}
          className="w-full bg-slate-900 hover:bg-slate-850 border border-slate-800/80 text-white font-bold text-xs py-3 rounded-xl flex items-center justify-center gap-2.5 transition duration-200 shadow-sm active:scale-[0.98] disabled:opacity-50 select-none cursor-pointer"
        >
          <Chrome size={15} className="text-amber-400" />
          <span>Google Account Ke Sath Login</span>
        </button>

        {/* Toggle Mode */}
        <div className="mt-8 text-center">
          <button
            type="button"
            onClick={() => {
              setIsRegister(!isRegister);
              setError("");
              setSuccess("");
            }}
            className="text-xs text-slate-400 hover:text-white font-semibold transition"
          >
            {isRegister ? (
              <span>Pehle se account hai? <strong className="text-amber-500 hover:underline">Sahi waqt par Login karein</strong></span>
            ) : (
              <span>Naya account chahiye? <strong className="text-amber-500 hover:underline">Register (Banayein)</strong></span>
            )}
          </button>
        </div>

        {/* Info panel */}
        <div className="mt-6 p-3 bg-slate-900/40 border border-slate-900/60 rounded-xl flex items-start gap-2 text-[10px] text-slate-500">
          <Info size={13} className="text-amber-500/80 mt-0.5 shrink-0" />
          <p className="leading-relaxed">
            <strong>Security Notice:</strong> Firebase Cloud DB encryption active. Is login screen ke bina koi bhi aapka accounts ya report data nahi dekh sakega.
          </p>
        </div>

      </div>
    </div>
  );
}
