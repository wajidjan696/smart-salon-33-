import React, { useState } from "react";
import { StaffMember, StaffLeave } from "../types";
import { motion, AnimatePresence } from "motion/react";
import { addLeave, deleteLeave } from "../firebaseService";
import { 
  Calendar, 
  Clock, 
  Trash2, 
  Plus, 
  AlertTriangle, 
  CheckCircle,
  FileText,
  UserX,
  ChevronRight,
  Edit2
} from "lucide-react";

interface LeaveTrackerProps {
  staff: StaffMember[];
  leaves: StaffLeave[];
  onLeaveAdded: () => void;
}

export default function LeaveTracker({ staff, leaves, onLeaveAdded }: LeaveTrackerProps) {
  // Leave Form State
  const [selectedStaffId, setSelectedStaffId] = useState("");
  const [startDate, setStartDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [type, setType] = useState<"sick" | "casual" | "unpaid" | "absent">("casual");
  const [reason, setReason] = useState("");
  const [editingLeave, setEditingLeave] = useState<StaffLeave | null>(null);

  // UI States
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [showForm, setShowForm] = useState(false);

  // Form Submission
  const handleSaveLeave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!selectedStaffId) {
      setError("Meharbani karke Staff Member select karein!");
      return;
    }
    if (!reason.trim()) {
      setError("Meharbani karke chotti ki wajah (reason) likhein!");
      return;
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (end < start) {
      setError("End Date, Start Date se pehle nahi ho sakti!");
      return;
    }

    setLoading(true);

    try {
      const selectedStaff = staff.find(s => s.id === selectedStaffId);
      const staffName = selectedStaff ? selectedStaff.name : "Unknown Staff";

      // Calculate total leave days (inclusive)
      const diffTime = Math.abs(end.getTime() - start.getTime());
      const totalDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

      if (editingLeave) {
        // Edit flow
        const updatedLeave: StaffLeave = {
          ...editingLeave,
          staffId: selectedStaffId,
          staffName,
          startDate,
          endDate,
          totalDays,
          reason: reason.trim(),
          type
        };
        await addLeave(updatedLeave);
        setEditingLeave(null);
        setSuccess(true);
        onLeaveAdded();
      } else {
        // Create flow
        const newLeave: StaffLeave = {
          id: `leave-${Date.now()}`,
          staffId: selectedStaffId,
          staffName,
          startDate,
          endDate,
          totalDays,
          reason: reason.trim(),
          type
        };
        await addLeave(newLeave);
        setSuccess(true);
        onLeaveAdded();
      }

      // Reset
      setReason("");
      setSelectedStaffId("");
      
      setTimeout(() => {
        setSuccess(false);
        setShowForm(false);
      }, 2000);

    } catch (err: any) {
      console.error(err);
      setError("Leave record save karne mein masla pesh aya.");
    } finally {
      setLoading(false);
    }
  };

  // Delete leave record
  const handleDeleteLeave = async (id: string) => {
    if (window.confirm("Kiya aap waqai ye chotti (leave) ka record delete karna chahte hain?")) {
      try {
        await deleteLeave(id);
        onLeaveAdded();
      } catch (err: any) {
        console.error(err);
        alert(`Leave record delete nahi ho saka: ${err.message || err}`);
      }
    }
  };

  const handleStartEdit = (leave: StaffLeave) => {
    setEditingLeave(leave);
    setSelectedStaffId(leave.staffId);
    setStartDate(leave.startDate);
    setEndDate(leave.endDate);
    setType(leave.type);
    setReason(leave.reason);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Calculate cumulative leave metrics
  const cumulativeLeaves = staff.map(st => {
    const staffLeavesList = leaves.filter(l => l.staffId === st.id);
    const totalDays = staffLeavesList.reduce((sum, l) => sum + l.totalDays, 0);
    return {
      id: st.id,
      name: st.name,
      role: st.role,
      status: st.status,
      leavesCount: staffLeavesList.length,
      totalDays
    };
  }).sort((a, b) => b.totalDays - a.totalDays);

  return (
    <div className="space-y-6">
      {/* Title & Stats */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
            <UserX className="text-rose-400" />
            Chotti / Attendance Tracker (Staff Leaves)
          </h2>
          <p className="text-slate-400 text-sm">
            Kis staff member ne kab aur kitni chottiyan ki hain, unka reason, aur summary register karein.
          </p>
        </div>
        <button
          onClick={() => {
            if (showForm) {
              setEditingLeave(null);
              setReason("");
              setSelectedStaffId("");
            }
            setShowForm(!showForm);
          }}
          className="flex items-center gap-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-bold px-4 py-2.5 rounded-xl transition duration-150 text-xs shadow-md shadow-amber-500/10"
        >
          <Plus size={15} />
          {showForm ? "Chotti List Dekhein" : "Chotti / Absent Register Karein"}
        </button>
      </div>

      {/* Main Content Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Hand: List or Form */}
        <div className="lg:col-span-8 space-y-6">
          <AnimatePresence mode="wait">
            {showForm ? (
              // Add Leave Form
              <motion.div
                key="leave-form"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="bg-slate-900 border border-slate-800 rounded-2xl p-6"
              >
                <form onSubmit={handleSaveLeave} className="space-y-4">
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider pb-2 border-b border-slate-800 flex items-center gap-2">
                    <Calendar size={16} className="text-rose-400 animate-pulse" />
                    {editingLeave ? "Chotti / Absent Ka Record Update Karein (Edit Leave)" : "Chotti / Absent Ka Record Darj Karein (Register Leave)"}
                  </h3>

                  {error && (
                    <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-xs text-rose-400 rounded-xl">
                      {error}
                    </div>
                  )}

                  {success && (
                    <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-400 rounded-xl">
                      Kamyabi Se Chotti Register Kar Li Gayi Hai!
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Staff selection */}
                    <div className="space-y-1.5">
                      <label className="text-xs text-slate-400 font-medium">Stylist / Staff Member *</label>
                      <select
                        required
                        value={selectedStaffId}
                        onChange={(e) => setSelectedStaffId(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500/50 rounded-xl py-2.5 px-3.5 text-xs text-white outline-none transition"
                      >
                        <option value="" className="text-slate-600">-- Select Staff Member --</option>
                        {staff.filter(st => st.status === "active").map(st => (
                          <option key={st.id} value={st.id} className="bg-slate-950 text-white">
                            {st.name} ({st.role})
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Leave Type */}
                    <div className="space-y-1.5">
                      <label className="text-xs text-slate-400 font-medium">Chotti Ka Tareeqa (Leave Type) *</label>
                      <select
                        value={type}
                        onChange={(e) => setType(e.target.value as any)}
                        className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500/50 rounded-xl py-2.5 px-3.5 text-xs text-white outline-none transition"
                      >
                        <option value="casual" className="bg-slate-950 text-white">Casual Leave (Ittefaqi Chotti)</option>
                        <option value="sick" className="bg-slate-950 text-white">Sick Leave (Bimari Ki Chotti)</option>
                        <option value="unpaid" className="bg-slate-950 text-white">Unpaid Leave (Bina Tankwah)</option>
                        <option value="absent" className="bg-slate-950 text-white">Absent (Bina Bataye Chotti)</option>
                      </select>
                    </div>

                    {/* Start Date */}
                    <div className="space-y-1.5">
                      <label className="text-xs text-slate-400 font-medium">Kab Se (Start Date) *</label>
                      <input
                        type="date"
                        required
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500/50 rounded-xl py-2.5 px-3 text-xs text-white outline-none transition font-mono"
                      />
                    </div>

                    {/* End Date */}
                    <div className="space-y-1.5">
                      <label className="text-xs text-slate-400 font-medium">Kab Tak (End Date) *</label>
                      <input
                        type="date"
                        required
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500/50 rounded-xl py-2.5 px-3 text-xs text-white outline-none transition font-mono"
                      />
                    </div>
                  </div>

                  {/* Reason text input */}
                  <div className="space-y-1.5">
                    <label className="text-xs text-slate-400 font-medium">Chotti Ki Wajah (Reason) *</label>
                    <textarea
                      required
                      placeholder="Maslan: Ghar ka zaroori kaam, Shadi pe jana hai, Tabiyat theek nahi, Out of city travel, etc."
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      className="w-full h-24 bg-slate-950 border border-slate-800 focus:border-amber-500/50 rounded-xl py-2.5 px-3.5 text-xs text-white outline-none transition resize-none placeholder-slate-600"
                    />
                  </div>

                  {/* Submit buttons */}
                  <div className="flex justify-end gap-2 pt-2">
                    {editingLeave && (
                      <button
                        type="button"
                        onClick={() => {
                          setEditingLeave(null);
                          setReason("");
                          setSelectedStaffId("");
                          setShowForm(false);
                        }}
                        className="bg-slate-850 hover:bg-slate-850 text-slate-300 text-xs font-bold py-2.5 px-5 rounded-xl transition"
                      >
                        Cancel Edit
                      </button>
                    )}
                    <button
                      type="submit"
                      disabled={loading}
                      className="bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 text-xs font-bold py-2.5 px-5 rounded-xl transition hover:from-amber-600 hover:to-amber-700 disabled:opacity-50"
                    >
                      {loading ? "Saving..." : (editingLeave ? "Update Record" : "Chotti Register Karein")}
                    </button>
                  </div>
                </form>
              </motion.div>
            ) : (
              // Leaves List Log
              <motion.div
                key="leaves-list"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                className="bg-slate-900 border border-slate-800 rounded-2xl p-6"
              >
                <h3 className="text-sm font-bold text-white uppercase tracking-wider pb-3 border-b border-slate-800 flex items-center gap-2 mb-4">
                  <Clock size={16} className="text-rose-400" />
                  Staff Chotti Log (Recorded Leaves & Absences)
                </h3>

                {leaves.length > 0 ? (
                  <div className="space-y-3 max-h-[460px] overflow-y-auto pr-1">
                    {leaves.map((leave) => {
                      const badgeColor = {
                        casual: "bg-amber-500/10 text-amber-400 border-amber-500/20",
                        sick: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
                        unpaid: "bg-purple-500/10 text-purple-400 border-purple-500/20",
                        absent: "bg-rose-500/10 text-rose-400 border-rose-500/20"
                      }[leave.type];

                      return (
                        <div
                          key={leave.id}
                          className="bg-slate-950 p-4 rounded-xl border border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4 group hover:border-slate-700 transition duration-150"
                        >
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-bold text-white">{leave.staffName}</span>
                              <span className={`text-[10px] uppercase font-bold border px-2 py-0.5 rounded-full ${badgeColor}`}>
                                {leave.type}
                              </span>
                            </div>
                            
                            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
                              <span className="font-mono bg-slate-900 px-2 py-1 border border-slate-800 rounded">
                                {leave.startDate}
                              </span>
                              <ChevronRight size={12} className="text-slate-600" />
                              <span className="font-mono bg-slate-900 px-2 py-1 border border-slate-800 rounded">
                                {leave.endDate}
                              </span>
                              <span className="text-slate-500">•</span>
                              <span className="text-amber-400 font-bold font-mono">{leave.totalDays} Days</span>
                            </div>

                            <p className="text-xs text-slate-300 font-medium italic mt-1 bg-slate-900/40 p-2 border border-slate-900 rounded-lg max-w-lg">
                              Wajah: "{leave.reason}"
                            </p>
                          </div>

                          <div className="flex gap-1.5 self-start sm:self-center">
                            <button
                              onClick={() => handleStartEdit(leave)}
                              className="p-1.5 bg-slate-900 hover:bg-slate-800 text-amber-400 rounded-lg border border-slate-850 transition cursor-pointer"
                              title="Edit Leave Entry"
                            >
                              <Edit2 size={11} />
                            </button>
                            <button
                              onClick={() => handleDeleteLeave(leave.id)}
                              className="text-slate-600 hover:text-rose-400 p-1.5 bg-slate-900 rounded-lg hover:bg-rose-500/10 border border-slate-800 transition duration-150 flex items-center justify-center cursor-pointer"
                              title="Delete Leave Entry"
                            >
                              <Trash2 size={11} />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="p-12 bg-slate-950/40 border border-dashed border-slate-800 rounded-2xl text-center text-sm text-slate-500">
                    Abhi tak koi leave or chotti darj nahi ki gayi hai.
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Right Hand Sidebar: Cumulative Attendance summary per staff member */}
        <div className="lg:col-span-4 bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest border-b border-slate-800 pb-2">
            Chottiyon Ka Khulasa (Cumulative Summary)
          </h3>

          <div className="space-y-3">
            {cumulativeLeaves.map((summary) => (
              <div
                key={summary.id}
                className={`p-3 rounded-xl border ${
                  summary.totalDays > 4
                    ? "bg-rose-500/5 border-rose-500/20"
                    : "bg-slate-950/50 border-slate-800/80"
                } flex justify-between items-center`}
              >
                <div>
                  <span className="text-xs font-bold text-white block">{summary.name}</span>
                  <span className="text-[10px] text-slate-500">{summary.role}</span>
                </div>
                
                <div className="text-right">
                  <span className={`text-sm font-black font-mono block ${
                    summary.totalDays > 4 ? "text-rose-400" : "text-amber-400"
                  }`}>
                    {summary.totalDays} Days
                  </span>
                  <span className="text-[9px] text-slate-500">
                    In {summary.leavesCount} leaves
                  </span>
                </div>
              </div>
            ))}
          </div>

          <div className="p-3 bg-amber-500/5 rounded-xl border border-amber-500/10 text-xs text-slate-400 leading-relaxed">
            <span className="font-bold text-amber-400 block mb-1">Marozaat-e-Tankhwah (Note)</span>
            Ye register monthly tankhwah (salary) calculate karte hue chottiyan katne (leave deduction) mein madad deta hai.
          </div>
        </div>
      </div>
    </div>
  );
}
