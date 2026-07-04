import React, { useState } from "react";
import { StaffMember, Booking, StaffLeave, StaffAttendance, ShopTiming } from "../types";
import { motion, AnimatePresence } from "motion/react";
import { 
  addStaff, 
  updateStaffStatus, 
  updateStaff, 
  deleteStaff, 
  getStaffAttendance, 
  saveStaffAttendance, 
  deleteStaffAttendance,
  getShopTimings,
  saveShopTiming,
  deleteShopTiming
} from "../firebaseService";
import { 
  Users, 
  UserPlus, 
  Phone, 
  Briefcase, 
  Calendar, 
  DollarSign, 
  Award, 
  UserCheck, 
  ShieldAlert, 
  Activity,
  Scissors,
  Edit,
  Trash2,
  Clock,
  Store,
  Lock,
  Unlock
} from "lucide-react";

interface StaffManagementProps {
  staff: StaffMember[];
  bookings: Booking[];
  leaves: StaffLeave[];
  onStaffAdded: () => void;
}

export default function StaffManagement({ 
  staff, 
  bookings, 
  leaves, 
  onStaffAdded 
}: StaffManagementProps) {
  // Attendance Management States
  const [staffSubTab, setStaffSubTab] = useState<"directory" | "attendance">("directory");
  const [attendanceRecords, setAttendanceRecords] = useState<StaffAttendance[]>([]);
  const [selectedAttendanceDate, setSelectedAttendanceDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [showCheckInModal, setShowCheckInModal] = useState<StaffMember | null>(null);

  // Shop Timings states
  const [shopTimings, setShopTimings] = useState<ShopTiming[]>([]);
  const [showShopTimingModal, setShowShopTimingModal] = useState<boolean>(false);
  const [shopOpenTimeInput, setShopOpenTimeInput] = useState("");
  const [shopCloseTimeInput, setShopCloseTimeInput] = useState("");
  const [shopNotesInput, setShopNotesInput] = useState("");

  // Check-in Modal input states
  const [checkInTime, setCheckInTime] = useState("");
  const [checkInStatus, setCheckInStatus] = useState<"on_time" | "late">("on_time");
  const [attendanceNotes, setAttendanceNotes] = useState("");

  const loadAttendance = async () => {
    try {
      const [logs, timings] = await Promise.all([
        getStaffAttendance(),
        getShopTimings()
      ]);
      setAttendanceRecords(logs);
      setShopTimings(timings);
    } catch (err) {
      console.error("Error loading attendance and timings:", err);
    }
  };

  React.useEffect(() => {
    loadAttendance();
  }, []);

  // Today's shop timing object
  const currentDayShopTiming = shopTimings.find(t => t.date === selectedAttendanceDate);

  const handleOpenShopTimingModal = () => {
    if (currentDayShopTiming) {
      setShopOpenTimeInput(currentDayShopTiming.openTime);
      setShopCloseTimeInput(currentDayShopTiming.closeTime || "");
      setShopNotesInput(currentDayShopTiming.notes || "");
    } else {
      const now = new Date();
      const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      setShopOpenTimeInput(timeStr);
      setShopCloseTimeInput("");
      setShopNotesInput("");
    }
    setShowShopTimingModal(true);
  };

  const handleSaveShopTiming = async () => {
    try {
      const updatedTiming: ShopTiming = {
        id: selectedAttendanceDate, // Use date as document ID so there is exactly one record per date
        date: selectedAttendanceDate,
        openTime: shopOpenTimeInput || "10:00",
        closeTime: shopCloseTimeInput || undefined,
        notes: shopNotesInput.trim() || undefined
      };
      await saveShopTiming(updatedTiming);
      setShowShopTimingModal(false);
      await loadAttendance();
    } catch (err) {
      console.error("Error saving shop timing:", err);
    }
  };

  const handleDeleteShopTiming = async () => {
    if (window.confirm("Kiya aap aaj ki shop timing delete karna chahte hain?")) {
      try {
        await deleteShopTiming(selectedAttendanceDate);
        setShowShopTimingModal(false);
        await loadAttendance();
      } catch (err) {
        console.error("Error deleting shop timing:", err);
      }
    }
  };

  const autoDetectStatus = (inputTime: string, staffExpectedTime?: string) => {
    if (!inputTime) return "on_time";
    const expected = staffExpectedTime || "10:00";
    // Compare hours and minutes directly
    const [inH, inM] = inputTime.split(":").map(Number);
    const [expH, expM] = expected.split(":").map(Number);
    if (inH > expH || (inH === expH && inM > expM)) {
      return "late";
    }
    return "on_time";
  };

  const handleCheckInTimeChange = (newTime: string, staffExpectedTime?: string) => {
    setCheckInTime(newTime);
    const status = autoDetectStatus(newTime, staffExpectedTime);
    setCheckInStatus(status);
  };

  const handleOpenCheckIn = (member: StaffMember) => {
    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    setCheckInTime(timeStr);
    const status = autoDetectStatus(timeStr, member.startTime);
    setCheckInStatus(status);
    setAttendanceNotes("");
    setShowCheckInModal(member);
  };

  const handleSaveCheckIn = async () => {
    if (!showCheckInModal) return;
    try {
      const newAttendance: StaffAttendance = {
        id: `att-${showCheckInModal.id}-${selectedAttendanceDate}`,
        staffId: showCheckInModal.id,
        staffName: showCheckInModal.name,
        date: selectedAttendanceDate,
        checkIn: checkInTime,
        status: checkInStatus,
        notes: attendanceNotes.trim() || undefined
      };
      await saveStaffAttendance(newAttendance);

      // Auto-set staff directory status to "active" if it was inactive (jab staff enter ho shop pe, active hojaye)
      if (showCheckInModal.status !== "active") {
        await updateStaffStatus(showCheckInModal.id, "active");
        onStaffAdded(); // notify parent to reload staff list
      }

      setShowCheckInModal(null);
      await loadAttendance();
    } catch (err) {
      console.error("Check-in save error:", err);
    }
  };

  const handleCheckOut = async (record: StaffAttendance) => {
    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    try {
      const updated: StaffAttendance = {
        ...record,
        checkOut: timeStr
      };
      await saveStaffAttendance(updated);
      await loadAttendance();
    } catch (err) {
      console.error("Check-out save error:", err);
    }
  };

  const handleMarkAbsent = async (member: StaffMember) => {
    if (window.confirm(`Kiya aap "${member.name}" ko aaj Ghair-Hazir (Absent) mark karna chahte hain?`)) {
      try {
        const newAttendance: StaffAttendance = {
          id: `att-${member.id}-${selectedAttendanceDate}`,
          staffId: member.id,
          staffName: member.name,
          date: selectedAttendanceDate,
          checkIn: "--:--",
          status: "absent"
        };
        await saveStaffAttendance(newAttendance);
        await loadAttendance();
      } catch (err) {
        console.error("Absent status mark error:", err);
      }
    }
  };

  const handleDeleteAttendance = async (id: string) => {
    if (window.confirm("Kiya aap waqai is Hazri (Attendance) record ko delete karna chahte hain?")) {
      try {
        await deleteStaffAttendance(id);
        await loadAttendance();
      } catch (err) {
        console.error("Delete attendance error:", err);
      }
    }
  };

  // New Staff Form State
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState("Junior Stylist");
  const [joinedDate, setJoinedDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [startTime, setStartTime] = useState("10:00");

  // UI state
  const [showAddForm, setShowAddForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [editingStaffId, setEditingStaffId] = useState<string | null>(null);

  // Form submit handler
  const handleAddStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!name.trim()) {
      setError("Meharbani karke staff ka naam likhein!");
      return;
    }
    if (!phone.trim()) {
      setError("Meharbani karke staff ka phone number likhein!");
      return;
    }

    setLoading(true);

    try {
      if (editingStaffId) {
        // Updating existing staff member
        const existingMember = staff.find(s => s.id === editingStaffId);
        const updatedMember: StaffMember = {
          id: editingStaffId,
          name: name.trim(),
          phone: phone.trim(),
          role,
          joinedDate,
          status: existingMember ? existingMember.status : "active",
          startTime
        };
        await updateStaff(updatedMember);
        setEditingStaffId(null);
      } else {
        // Adding new staff member
        const newStaff: StaffMember = {
          id: `st-${Date.now()}`,
          name: name.trim(),
          phone: phone.trim(),
          role,
          joinedDate,
          status: "active",
          startTime
        };
        await addStaff(newStaff);
      }

      // Reset
      setName("");
      setPhone("");
      setRole("Junior Stylist");
      setStartTime("10:00");
      setSuccess(true);
      onStaffAdded();

      setTimeout(() => {
        setSuccess(false);
        setShowAddForm(false);
      }, 1500);

    } catch (err: any) {
      console.error(err);
      setError("Staff save karte hue error aya. Dobara koshish karein.");
    } finally {
      setLoading(false);
    }
  };

  const handleStartEdit = (member: StaffMember) => {
    setEditingStaffId(member.id);
    setName(member.name);
    setPhone(member.phone);
    setRole(member.role);
    setJoinedDate(member.joinedDate);
    setStartTime(member.startTime || "10:00");
    setShowAddForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDeleteStaff = async (id: string, staffName: string) => {
    if (window.confirm(`Kiya aap waqai "${staffName}" ko list se delete karna chahte hain?`)) {
      try {
        await deleteStaff(id);
        onStaffAdded();
      } catch (err: any) {
        console.error("Staff delete error:", err);
        alert(`Staff Member delete nahi ho saka: ${err.message || err}`);
      }
    }
  };

  // Toggle staff status (Active / Inactive)
  const handleToggleStatus = async (id: string, currentStatus: "active" | "inactive") => {
    const nextStatus = currentStatus === "active" ? "inactive" : "active";
    try {
      await updateStaffStatus(id, nextStatus);
      onStaffAdded();
    } catch (err) {
      console.error("Status change error: ", err);
    }
  };

  // Helper: Calculate detailed statistics for each staff member
  const getStaffStats = (staffId: string) => {
    // 1. Bookings completed by this staff member
    const staffBookings = bookings.filter(b => b.staffId === staffId && b.status === "completed");
    
    // 2. Revenue generated
    const totalRevenue = staffBookings.reduce((sum, b) => sum + b.totalAmount, 0);
    
    // 3. Client Count
    const clientCount = staffBookings.length;

    // 4. Total services rendered
    const servicesCount = staffBookings.reduce((sum, b) => sum + b.services.length, 0);

    // 5. Unique services list with quantities
    const serviceTally: { [name: string]: number } = {};
    staffBookings.forEach(b => {
      b.services.forEach(s => {
        serviceTally[s.name] = (serviceTally[s.name] || 0) + 1;
      });
    });

    // 6. Total leaves taken (sum of totalDays where status is approved/processed)
    const staffLeaves = leaves.filter(l => l.staffId === staffId);
    const totalLeavesDays = staffLeaves.reduce((sum, l) => sum + l.totalDays, 0);

    return {
      totalRevenue,
      clientCount,
      servicesCount,
      serviceTally,
      totalLeavesDays
    };
  };

  // Roles preset
  const rolesPreset = [
    "Senior Stylist",
    "Barber & Hair Dresser",
    "Skin Specialist",
    "Massage Therapist",
    "Makeup & Nail Artist",
    "Salon Manager"
  ];

  return (
    <div className="space-y-6">
      {/* Title Header bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
            <Users className="text-amber-500" />
            Staff & Employees Directory (Karkun List)
          </h2>
          <p className="text-slate-400 text-sm">
            Staff members ki details, chottiyan (leaves), aur kaam ki performance ka mukammal record.
          </p>
        </div>
        <button
          onClick={() => {
            if (showAddForm) {
              setEditingStaffId(null);
              setName("");
              setPhone("");
              setRole("Junior Stylist");
              setStartTime("10:00");
            }
            setShowAddForm(!showAddForm);
          }}
          className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-amber-400 font-semibold px-4 py-2.5 rounded-xl border border-slate-700/60 transition duration-150 text-xs shadow-md"
        >
          <UserPlus size={15} />
          {showAddForm ? "Cancel Form" : "Naya Staff Add Karein"}
        </button>
      </div>

      {/* Add Staff Member collapsible panel */}
      <AnimatePresence>
        {showAddForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden bg-slate-900 border border-slate-800 rounded-2xl"
          >
            <form onSubmit={handleAddStaff} className="p-6 space-y-4">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <Scissors size={15} className="text-amber-500 animate-pulse" />
                {editingStaffId ? "Staff Member Ka Record Edit / Modify Karein" : "Naye Staff Member Ka Record Add Karein"}
              </h3>

              {error && (
                <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-xs text-rose-400 rounded-xl">
                  {error}
                </div>
              )}

              {success && (
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-400 rounded-xl">
                  {editingStaffId ? "Kamyabi Se Update Ho Gaya! Record updated." : "Kamyabi Se Add Ho Gaya! Record saved."}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                <div className="space-y-1">
                  <label className="text-xs text-slate-400 font-medium">Poora Naam (Full Name)</label>
                  <input
                    type="text"
                    required
                    placeholder="Bilal Ahmed"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500/50 rounded-xl py-2.5 px-3 text-xs text-white outline-none transition"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs text-slate-400 font-medium">Phone Number</label>
                  <input
                    type="tel"
                    required
                    placeholder="03001234567"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500/50 rounded-xl py-2.5 px-3 text-xs text-white outline-none transition"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs text-slate-400 font-medium">Role (Zimaydari)</label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500/50 rounded-xl py-2.5 px-3 text-xs text-white outline-none transition"
                  >
                    {rolesPreset.map((r, i) => (
                      <option key={i} value={r} className="bg-slate-950 text-white">
                        {r}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs text-slate-400 font-medium">Joined Date</label>
                  <input
                    type="date"
                    value={joinedDate}
                    onChange={(e) => setJoinedDate(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500/50 rounded-xl py-2.5 px-3 text-xs text-white outline-none transition font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs text-slate-400 font-medium font-bold">Duty Ka Waqt (Shift Start Time) *</label>
                  <input
                    type="time"
                    required
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500/50 rounded-xl py-2.5 px-3 text-xs text-white outline-none transition font-mono font-bold text-amber-400"
                  />
                  <p className="text-[10px] text-slate-500 leading-normal">
                    * Har karkun ki alag timing yahan set karein. Attendance lagate waqt agar is waqt se late hue, to system khud hi "Late" detect kar lega!
                  </p>
                </div>
              </div>

              <div className="flex justify-end pt-2 gap-3">
                {editingStaffId && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditingStaffId(null);
                      setName("");
                      setPhone("");
                      setRole("Junior Stylist");
                      setStartTime("10:00");
                      setShowAddForm(false);
                    }}
                    className="bg-slate-850 hover:bg-slate-800 text-slate-300 text-xs font-bold py-2.5 px-5 rounded-xl border border-slate-700/60 transition"
                  >
                    Cancel Edit
                  </button>
                )}
                <button
                  type="submit"
                  disabled={loading}
                  className="bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 text-xs font-bold py-2.5 px-5 rounded-xl transition hover:from-amber-600 hover:to-amber-700 disabled:opacity-50"
                >
                  {loading ? "Saving Record..." : editingStaffId ? "Changes Save Karein" : "Staff Member Save Karein"}
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Sub-tab Toggle */}
      <div className="flex bg-slate-900 border border-slate-800 p-1 rounded-2xl max-w-md">
        <button
          onClick={() => setStaffSubTab("directory")}
          className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition duration-150 flex items-center justify-center gap-2 ${
            staffSubTab === "directory"
              ? "bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/15"
              : "text-slate-400 hover:text-slate-200"
          }`}
        >
          <Users size={14} />
          Directory & Stats
        </button>
        <button
          onClick={() => setStaffSubTab("attendance")}
          className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition duration-150 flex items-center justify-center gap-2 ${
            staffSubTab === "attendance"
              ? "bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/15"
              : "text-slate-400 hover:text-slate-200"
          }`}
        >
          <Clock size={14} />
          Hazri / Daily Attendance
        </button>
      </div>

      {staffSubTab === "attendance" ? (
        <div className="space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-800 pb-4">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <UserCheck className="text-amber-500" />
                  Rozana Hazri Record (Daily Timing Logger)
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">Staff ke dukan par aane (Check-in) aur jane (Check-out) ka waqt aur punctuality record karein.</p>
              </div>
              <div className="flex items-center gap-2">
                <label className="text-xs text-slate-400 font-bold whitespace-nowrap">Tareeq Select Karein:</label>
                <input
                  type="date"
                  value={selectedAttendanceDate}
                  onChange={(e) => setSelectedAttendanceDate(e.target.value)}
                  className="bg-slate-950 border border-slate-800 focus:border-amber-500/50 rounded-xl py-2 px-3 text-xs text-white outline-none font-mono"
                />
              </div>
            </div>

            {/* Shop Opening & Closing Timings Card */}
            <div className="bg-slate-950/40 border border-slate-850 rounded-2xl p-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-500 border border-amber-500/20">
                  <Store size={18} />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white flex items-center gap-1.5">
                    🏪 Shop Timing Register
                    {currentDayShopTiming ? (
                      currentDayShopTiming.closeTime ? (
                        <span className="bg-rose-500/10 text-rose-400 border border-rose-500/20 text-[9px] font-bold px-1.5 py-0.5 rounded uppercase">Closed (Dukan Band)</span>
                      ) : (
                        <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[9px] font-bold px-1.5 py-0.5 rounded uppercase">Open (Dukan Khuli Hai)</span>
                      )
                    ) : (
                      <span className="bg-slate-850 text-slate-400 border border-slate-800 text-[9px] font-bold px-1.5 py-0.5 rounded uppercase">No Record</span>
                    )}
                  </h4>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    {currentDayShopTiming ? (
                      <span>
                        Dukan Kholne ka Waqt: <span className="font-mono font-bold text-emerald-400">{currentDayShopTiming.openTime}</span>
                        {currentDayShopTiming.closeTime ? (
                          <span> | Band Hone ka Waqt: <span className="font-mono font-bold text-rose-400">{currentDayShopTiming.closeTime}</span></span>
                        ) : (
                          <span className="text-slate-500 italic"> (Abhi band nahi hui)</span>
                        )}
                        {currentDayShopTiming.notes && <span className="block text-[10px] text-slate-400 mt-0.5">Note: {currentDayShopTiming.notes}</span>}
                      </span>
                    ) : (
                      "Is tareeq par dukan khulne aur band karne ki timing darj karne ke liye button par click karein."
                    )}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-2.5 w-full md:w-auto">
                <button
                  type="button"
                  onClick={handleOpenShopTimingModal}
                  className="w-full md:w-auto flex items-center justify-center gap-1.5 bg-slate-900 hover:bg-slate-850 text-slate-300 font-bold px-3.5 py-2 rounded-xl text-xs border border-slate-800 transition duration-150 cursor-pointer"
                >
                  <Clock size={13} className="text-amber-500" />
                  {currentDayShopTiming ? "Timing Update/Close" : "Shop Timings Set Karein"}
                </button>
              </div>
            </div>

            <div className="border-t border-slate-850/80 pt-4">
              <h4 className="text-xs font-bold text-slate-400 mb-2 uppercase tracking-wider">Karkunon Ki Rozana Hazri (Staff Attendance)</h4>
            </div>

            {/* List of Staff for Attendance */}
            <div className="space-y-3">
              {staff.length === 0 ? (
                <div className="p-6 bg-slate-950/40 rounded-xl border border-slate-850 text-center text-xs text-slate-500">
                  Koi staff member nahi mila. Hazri lagane ke liye staff list mein members add karein.
                </div>
              ) : (
                [...staff]
                  .sort((a, b) => {
                    if (a.status === "active" && b.status === "inactive") return -1;
                    if (a.status === "inactive" && b.status === "active") return 1;
                    return 0;
                  })
                  .map((member) => {
                    const record = attendanceRecords.find(
                      r => r.staffId === member.id && r.date === selectedAttendanceDate
                    );

                    return (
                      <div
                        key={member.id}
                        className={`p-4 rounded-xl border transition ${
                          member.status === "active" 
                            ? "bg-slate-950/50 border-slate-800/80 hover:border-slate-700/60" 
                            : "bg-slate-950/20 border-slate-900 opacity-60 hover:opacity-80"
                        } flex flex-col md:flex-row justify-between items-start md:items-center gap-4`}
                      >
                        {/* Name & Role */}
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-sm text-white block">{member.name}</span>
                            {member.status === "inactive" && (
                              <span className="text-[9px] font-bold text-rose-400 bg-rose-500/10 border border-rose-500/20 px-1.5 py-0.5 rounded uppercase">
                                Inactive
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">{member.role}</span>
                        </div>

                      {/* Log details or buttons */}
                      {record ? (
                        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 w-full md:w-auto">
                          {/* Checked In Time & status */}
                          <div className="flex flex-wrap items-center gap-2 text-xs bg-slate-900 border border-slate-800/60 p-2 rounded-xl">
                            <span className="text-[10px] text-slate-500 font-mono">In:</span>
                            <span className="font-mono font-bold text-amber-400">{record.checkIn}</span>
                            
                            {record.checkOut ? (
                              <>
                                <span className="text-slate-700">|</span>
                                <span className="text-[10px] text-slate-500 font-mono">Out:</span>
                                <span className="font-mono font-bold text-amber-400">{record.checkOut}</span>
                              </>
                            ) : (
                              record.status !== "absent" && (
                                <>
                                  <span className="text-slate-700">|</span>
                                  <span className="text-[10px] text-slate-500 italic">(Dukan Par Maujood)</span>
                                </>
                              )
                            )}

                            <span className="text-slate-700">|</span>
                            {record.status === "on_time" && (
                              <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-bold px-1.5 py-0.5 rounded uppercase">
                                On Time (Waqt Par)
                              </span>
                            )}
                            {record.status === "late" && (
                              <span className="bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[10px] font-bold px-1.5 py-0.5 rounded uppercase">
                                Late (Dere Se)
                              </span>
                            )}
                            {record.status === "absent" && (
                              <span className="bg-rose-500/10 text-rose-400 border border-rose-500/20 text-[10px] font-bold px-1.5 py-0.5 rounded uppercase">
                                Absent (Ghair-Hazir)
                              </span>
                            )}
                          </div>

                          {/* Notes if any */}
                          {record.notes && (
                            <div className="text-[11px] text-slate-400 italic bg-slate-900/50 px-2 py-1.5 rounded-lg border border-slate-850 max-w-xs truncate" title={record.notes}>
                              "{record.notes}"
                            </div>
                          )}

                          {/* Action Buttons */}
                          <div className="flex items-center gap-1.5 ml-auto md:ml-0">
                            {!record.checkOut && record.status !== "absent" && (
                              <button
                                type="button"
                                onClick={() => handleCheckOut(record)}
                                className="flex items-center gap-1 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold px-3 py-1.5 rounded-lg transition duration-150 text-xs shadow-md cursor-pointer"
                              >
                                <Clock size={12} />
                                Check Out (Ruksati)
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={() => handleDeleteAttendance(record.id!)}
                              className="p-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 hover:text-rose-300 rounded-lg border border-rose-500/10 transition cursor-pointer"
                              title="Delete Record"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </div>
                      ) : (
                        /* Action Needed buttons */
                        <div className="flex items-center gap-2 w-full md:w-auto ml-auto md:ml-0">
                          <button
                            type="button"
                            onClick={() => handleOpenCheckIn(member)}
                            className="flex items-center gap-1 bg-slate-800 hover:bg-slate-750 text-emerald-400 border border-emerald-500/10 hover:border-emerald-500/20 font-semibold px-3 py-1.5 rounded-lg transition duration-150 text-xs shadow-md cursor-pointer"
                          >
                            <Clock size={12} />
                            Check In / Aamad
                          </button>
                          <button
                            type="button"
                            onClick={() => handleMarkAbsent(member)}
                            className="flex items-center gap-1 bg-slate-900 hover:bg-slate-850 text-rose-400 border border-rose-900/20 font-medium px-3 py-1.5 rounded-lg transition duration-150 text-xs cursor-pointer"
                          >
                            <UserCheck size={12} />
                            Absent
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      ) : (
        /* Staff Grid containing cards with performance and leave details */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {staff.map((member) => {
            const stats = getStaffStats(member.id);
            const todayStr = new Date().toISOString().split('T')[0];
            const todayRecord = attendanceRecords.find(
              r => r.staffId === member.id && r.date === todayStr
            );

            return (
              <motion.div
                key={member.id}
                layout
                className={`bg-slate-900 border ${
                  member.status === "active" ? "border-slate-800" : "border-rose-950/40 opacity-75"
                } rounded-2xl p-6 relative overflow-hidden flex flex-col justify-between space-y-4`}
              >
                {/* Background Glow */}
                <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-amber-500/5 to-transparent rounded-full blur-xl"></div>

                {/* Card Header (Name, Role, and Active status) */}
                <div className="flex justify-between items-start gap-3 relative z-10">
                  <div className="space-y-0.5">
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                      {member.name}
                      {stats.totalRevenue > 4000 && member.status === "active" && (
                        <span className="text-[10px] bg-amber-500/10 text-amber-400 font-extrabold px-2 py-0.5 rounded-full border border-amber-500/20 flex items-center gap-0.5 uppercase">
                          <Award size={10} className="stroke-[3]" /> Top Earner
                        </span>
                      )}
                    </h3>
                    <p className="text-xs text-amber-400 font-semibold">{member.role}</p>
                    <div className="flex items-center gap-1 mt-1 text-[10px] text-slate-400 font-medium font-mono">
                      <Clock size={10} className="text-amber-500/80" />
                      <span>Shift Start: {member.startTime || "10:00"}</span>
                    </div>

                    {/* Today's Presence / Punctuality Badge */}
                    <div className="mt-2.5">
                      {todayRecord ? (
                        todayRecord.status === "on_time" ? (
                          <span className="inline-flex items-center gap-1.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-extrabold px-2 py-1 rounded-lg uppercase">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                            🟢 Hazir (Waqt Par: {todayRecord.checkIn})
                          </span>
                        ) : todayRecord.status === "late" ? (
                          <span className="inline-flex items-center gap-1.5 bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[10px] font-extrabold px-2 py-1 rounded-lg uppercase">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse"></span>
                            🟡 Hazir (Der Se: {todayRecord.checkIn})
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 bg-rose-500/10 text-rose-400 border border-rose-500/20 text-[10px] font-extrabold px-2 py-1 rounded-lg uppercase">
                            🔴 Ghair-Hazir (Absent)
                          </span>
                        )
                      ) : (
                        <span className="inline-flex items-center gap-1.5 bg-slate-950 text-slate-500 border border-slate-800 text-[10px] font-bold px-2 py-1 rounded-lg uppercase">
                          ⚪ Hazri Nahi Lagi
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 flex-wrap justify-end">
                    <button
                      type="button"
                      onClick={() => handleStartEdit(member)}
                      className="p-1.5 bg-slate-850 hover:bg-slate-800 text-amber-400 hover:text-amber-300 rounded-lg border border-slate-800/80 transition duration-100"
                      title="Edit/Modify"
                    >
                      <Edit size={12} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteStaff(member.id, member.name)}
                      className="p-1.5 bg-rose-950/20 hover:bg-rose-950/40 text-rose-400 hover:text-rose-300 rounded-lg border border-rose-900/20 transition duration-100"
                      title="Delete"
                    >
                      <Trash2 size={12} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleToggleStatus(member.id, member.status)}
                      className={`text-[10px] font-bold px-2.5 py-1 rounded-full border transition-colors ${
                        member.status === "active"
                          ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20"
                          : "bg-rose-500/10 text-rose-400 border-rose-500/20 hover:bg-rose-500/20"
                      }`}
                    >
                      {member.status === "active" ? "● Active" : "● Inactive"}
                    </button>
                  </div>
                </div>

                {/* Staff contact & Joining Info */}
                <div className="grid grid-cols-2 gap-2 text-xs border-y border-slate-800/80 py-3 relative z-10">
                  <div className="flex items-center gap-2 text-slate-400">
                    <Phone size={13} className="text-slate-500" />
                    <span>{member.phone}</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-400 justify-end">
                    <Calendar size={13} className="text-slate-500" />
                    <span>Joined: <span className="font-mono">{member.joinedDate}</span></span>
                  </div>
                </div>

                {/* Performance Statistics (Revenue, Commission, Client Count, Leaves) */}
                <div className="grid grid-cols-2 gap-2.5 relative z-10">
                  <div className="bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/60 text-center">
                    <span className="text-[9px] text-slate-500 uppercase tracking-wider block font-bold">Kamai (Revenue)</span>
                    <span className="text-xs font-bold text-emerald-400 font-mono block mt-1">Rs. {stats.totalRevenue.toLocaleString()}</span>
                  </div>

                  <div className="bg-amber-500/5 p-2.5 rounded-xl border border-amber-500/20 text-center">
                    <span className="text-[9px] text-amber-500 uppercase tracking-wider block font-bold">10% Commission</span>
                    <span className="text-xs font-bold text-amber-400 font-mono block mt-1">Rs. {Math.round(stats.totalRevenue * 0.1).toLocaleString()}</span>
                  </div>

                  <div className="bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/60 text-center">
                    <span className="text-[9px] text-slate-500 uppercase tracking-wider block font-bold">Served Clients</span>
                    <span className="text-xs font-bold text-white font-mono block mt-1">{stats.clientCount} clients</span>
                  </div>

                  {/* Roman Urdu: Kisne kitni chotti ki summary */}
                  <div className={`p-2.5 rounded-xl border text-center ${
                    stats.totalLeavesDays > 4
                      ? "bg-rose-500/5 border-rose-500/20"
                      : "bg-slate-950/60 border-slate-800/60"
                  }`}>
                    <span className="text-[9px] text-slate-500 uppercase tracking-wider block font-bold">Kul Chottiyan (Leaves)</span>
                    <span className={`text-xs font-bold font-mono block mt-1 ${
                      stats.totalLeavesDays > 4 ? "text-rose-400" : "text-amber-400"
                    }`}>{stats.totalLeavesDays} Days</span>
                  </div>
                </div>

                {/* List of services performed */}
                {Object.keys(stats.serviceTally).length > 0 ? (
                  <div className="space-y-1.5 pt-1 relative z-10">
                    <h4 className="text-[10px] text-slate-500 uppercase font-bold tracking-widest flex items-center gap-1">
                      <Activity size={11} /> Services Perform Ki Gayi:
                    </h4>
                    <div className="flex flex-wrap gap-1.5 max-h-[70px] overflow-y-auto">
                      {Object.entries(stats.serviceTally).map(([serviceName, count], idx) => (
                        <span
                          key={idx}
                          className="text-[10px] bg-slate-950 text-slate-300 border border-slate-800/80 px-2 py-0.5 rounded-md font-medium"
                        >
                          {serviceName} ({count})
                        </span>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="text-[11px] text-slate-600 italic">Is member ne abhi tak koi client handle nahi kiya.</div>
                )}
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Check In Modal Overlay */}
      <AnimatePresence>
        {showCheckInModal && (
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
              className="bg-slate-900 border border-slate-800 max-w-md w-full rounded-2xl p-6 space-y-4 shadow-2xl"
            >
              <div className="flex justify-between items-center border-b border-slate-800 pb-3">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Clock className="text-amber-500" />
                  Aamad Darj Karein (Check-In)
                </h3>
                <button
                  type="button"
                  onClick={() => setShowCheckInModal(null)}
                  className="text-slate-500 hover:text-white transition text-sm font-bold"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-4 text-xs">
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-850">
                  <span className="text-slate-500 block">Karkun / Staff Name:</span>
                  <span className="text-white text-sm font-bold block mt-0.5">{showCheckInModal.name}</span>
                  <div className="flex justify-between items-center mt-1">
                    <span className="text-[10px] text-slate-400">{showCheckInModal.role}</span>
                    <span className="text-[10px] text-amber-500 font-mono font-bold">Shift Start: {showCheckInModal.startTime || "10:00"}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-slate-400 font-bold block">Aamad Ka Waqt (Time):</label>
                    <input
                      type="time"
                      value={checkInTime}
                      onChange={(e) => handleCheckInTimeChange(e.target.value, showCheckInModal.startTime)}
                      className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500/50 rounded-xl py-2.5 px-3.5 text-white outline-none font-mono"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-slate-400 font-bold block">Haalat (Punctuality):</label>
                    <select
                      value={checkInStatus}
                      onChange={(e) => setCheckInStatus(e.target.value as any)}
                      className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500/50 rounded-xl py-2.5 px-3.5 text-white outline-none"
                    >
                      <option value="on_time">✅ On Time (Waqt Par)</option>
                      <option value="late">⚠️ Late (Dere Se Aya)</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-slate-400 font-bold block">Vajah / Notes (Optional):</label>
                  <textarea
                    rows={2}
                    placeholder="Maslan: Bike kharab thi / barish thi..."
                    value={attendanceNotes}
                    onChange={(e) => setAttendanceNotes(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500/50 rounded-xl py-2 px-3 text-white outline-none placeholder-slate-700 resize-none"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCheckInModal(null)}
                  className="bg-slate-850 hover:bg-slate-800 text-slate-300 font-semibold py-2 px-4 rounded-xl transition text-xs border border-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveCheckIn}
                  className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold py-2 px-5 rounded-xl transition text-xs shadow-lg shadow-amber-500/10"
                >
                  Hazri Lagayein (Save Check-In)
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Shop Timing Modal Overlay */}
      <AnimatePresence>
        {showShopTimingModal && (
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
              className="bg-slate-900 border border-slate-800 max-w-md w-full rounded-2xl p-6 space-y-4 shadow-2xl"
            >
              <div className="flex justify-between items-center border-b border-slate-800 pb-3">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Store className="text-amber-500" size={16} />
                  Dukan Ki Open / Close Timing Log
                </h3>
                <button
                  type="button"
                  onClick={() => setShowShopTimingModal(false)}
                  className="text-slate-500 hover:text-white transition text-sm font-bold"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-4 text-xs">
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-850">
                  <span className="text-slate-500 block">Select Ki Gayi Tareeq (Date):</span>
                  <span className="text-amber-400 text-sm font-mono font-bold block mt-0.5">{selectedAttendanceDate}</span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-slate-400 font-bold block">🔓 Open Time (Kholne Ka Waqt):</label>
                    <input
                      type="time"
                      value={shopOpenTimeInput}
                      onChange={(e) => setShopOpenTimeInput(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500/50 rounded-xl py-2.5 px-3.5 text-white outline-none font-mono text-emerald-400"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-slate-400 font-bold block">🔒 Close Time (Band Karne Ka Waqt):</label>
                    <input
                      type="time"
                      value={shopCloseTimeInput}
                      onChange={(e) => setShopCloseTimeInput(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500/50 rounded-xl py-2.5 px-3.5 text-white outline-none font-mono text-rose-400"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-slate-400 font-bold block">Note (Optional):</label>
                  <textarea
                    rows={2}
                    placeholder="Maslan: Aaj thora late open hui barish ki wajah se..."
                    value={shopNotesInput}
                    onChange={(e) => setShopNotesInput(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500/50 rounded-xl py-2 px-3 text-white outline-none placeholder-slate-700 resize-none"
                  />
                </div>
              </div>

              <div className="flex justify-between gap-3 pt-2">
                {currentDayShopTiming ? (
                  <button
                    type="button"
                    onClick={handleDeleteShopTiming}
                    className="bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 font-semibold py-2 px-3.5 rounded-xl transition text-xs border border-rose-500/20 cursor-pointer"
                  >
                    Delete Log
                  </button>
                ) : <div />}
                
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setShowShopTimingModal(false)}
                    className="bg-slate-850 hover:bg-slate-800 text-slate-300 font-semibold py-2 px-4 rounded-xl transition text-xs border border-slate-800 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveShopTiming}
                    className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold py-2 px-5 rounded-xl transition text-xs shadow-lg shadow-amber-500/10 cursor-pointer"
                  >
                    Save Timing
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
