import React, { useState } from "react";
import { StaffMember, Booking, StaffLeave } from "../types";
import { motion, AnimatePresence } from "motion/react";
import { addStaff, updateStaffStatus, updateStaff, deleteStaff } from "../firebaseService";
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
  Trash2
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
  // New Staff Form State
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState("Junior Stylist");
  const [joinedDate, setJoinedDate] = useState(() => new Date().toISOString().split('T')[0]);

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
          status: existingMember ? existingMember.status : "active"
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
          status: "active"
        };
        await addStaff(newStaff);
      }

      // Reset
      setName("");
      setPhone("");
      setRole("Junior Stylist");
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

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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

      {/* Staff Grid containing cards with performance and leave details */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {staff.map((member) => {
          const stats = getStaffStats(member.id);

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
                </div>

                <div className="flex items-center gap-1.5 flex-wrap justify-end">
                  <button
                    onClick={() => handleStartEdit(member)}
                    className="p-1.5 bg-slate-850 hover:bg-slate-800 text-amber-400 hover:text-amber-300 rounded-lg border border-slate-800/80 transition duration-100"
                    title="Edit/Modify"
                  >
                    <Edit size={12} />
                  </button>
                  <button
                    onClick={() => handleDeleteStaff(member.id, member.name)}
                    className="p-1.5 bg-rose-950/20 hover:bg-rose-950/40 text-rose-400 hover:text-rose-300 rounded-lg border border-rose-900/20 transition duration-100"
                    title="Delete"
                  >
                    <Trash2 size={12} />
                  </button>
                  <button
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
    </div>
  );
}
