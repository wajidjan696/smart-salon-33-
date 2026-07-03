import React, { useState } from "react";
import { SalonService } from "../types";
import { addService, deleteService, resetServicesToDefault } from "../firebaseService";
import { motion } from "motion/react";
import { 
  Sparkles, 
  Plus, 
  Trash2, 
  Search, 
  Scissors, 
  Activity, 
  Coins, 
  Clock,
  AlertTriangle,
  RotateCcw,
  Edit2
} from "lucide-react";

interface ServicesConfigProps {
  services: SalonService[];
  onServiceAdded: () => void;
}

export default function ServicesConfig({ services, onServiceAdded }: ServicesConfigProps) {
  // Service Form State
  const [name, setName] = useState("");
  const [price, setPrice] = useState<number>(500);
  const [category, setCategory] = useState("Signature Grooming");
  const [durationMin, setDurationMin] = useState<number>(30);
  const [editingService, setEditingService] = useState<SalonService | null>(null);

  // UI state
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [resetting, setResetting] = useState(false);

  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState("All");

  const handleResetServices = async () => {
    if (window.confirm("Kiya aap waqai saari services delete karke images wale standard Smart Salon 33 menu card rate list ko restore karna chahte hain?")) {
      setResetting(true);
      try {
        await resetServicesToDefault();
        onServiceAdded();
      } catch (err) {
        console.error(err);
      } finally {
        setResetting(false);
      }
    }
  };

  // Filter logic
  const filteredServices = services.filter(s => {
    const matchesSearch = s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          s.category.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategoryFilter === "All" || s.category === selectedCategoryFilter;
    return matchesSearch && matchesCategory;
  });

  // Add/Edit Service Submit
  const handleAddService = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!name.trim()) {
      setError("Meharbani karke Service ka naam likhein!");
      return;
    }
    if (price <= 0) {
      setError("Price (rate) zaroor 0 se zyada honi chahiye!");
      return;
    }

    setLoading(true);

    try {
      if (editingService) {
        // Edit flow
        const updatedService: SalonService = {
          ...editingService,
          name: name.trim(),
          price,
          category,
          durationMin
        };

        await addService(updatedService);
        setSuccess(true);
        onServiceAdded();

        setName("");
        setPrice(500);
        setCategory("Signature Grooming");
        setDurationMin(30);
        setEditingService(null);

        setTimeout(() => {
          setSuccess(false);
          setShowAddForm(false);
        }, 1500);
      } else {
        // Create flow
        const newService: SalonService = {
          id: `s-${Date.now()}`,
          name: name.trim(),
          price,
          category,
          durationMin
        };

        await addService(newService);

        setSuccess(true);
        onServiceAdded();

        setName("");
        setPrice(500);
        setCategory("Signature Grooming");
        setDurationMin(30);

        setTimeout(() => {
          setSuccess(false);
          setShowAddForm(false);
        }, 1500);
      }

    } catch (err: any) {
      console.error(err);
      setError("Service register karne mein koi masla aya.");
    } finally {
      setLoading(false);
    }
  };

  // Delete Service
  const handleDeleteService = async (id: string) => {
    if (window.confirm("Kiya aap waqai is service ko menu list se delete karna chahte hain?")) {
      try {
        await deleteService(id);
        onServiceAdded();
      } catch (err: any) {
        console.error(err);
        alert(`Service delete nahi ho saki: ${err.message || err}`);
      }
    }
  };

  const handleStartEdit = (service: SalonService) => {
    setEditingService(service);
    setName(service.name);
    setPrice(service.price);
    setCategory(service.category);
    setDurationMin(service.durationMin || 30);
    setShowAddForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const categoriesPreset = [
    "Signature Grooming", 
    "Premium Hair Coloring", 
    "Professional Medicated", 
    "Luxury Skin Treatment", 
    "Advance Hair Treatment", 
    "Professional Waxing", 
    "Relaxing Massage"
  ];

  return (
    <div className="space-y-6">
      {/* Title & Stats */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
            <Sparkles className="text-amber-500" />
            Salon Services Menu Configuration
          </h2>
          <p className="text-slate-400 text-sm">
            Smart Salon 33 mein offer kiye jane wale services, unki pricing aur duration customize karein.
          </p>
        </div>
        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={handleResetServices}
            disabled={resetting}
            className="flex items-center gap-2 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-slate-950 font-bold px-4 py-2.5 rounded-xl transition duration-150 text-xs shadow-md"
          >
            <RotateCcw size={14} className={resetting ? "animate-spin" : ""} />
            {resetting ? "Syncing..." : "Sync Official Menu (Pics)"}
          </button>
          <button
            onClick={() => {
              if (showAddForm) {
                setEditingService(null);
                setName("");
                setPrice(500);
                setCategory("Signature Grooming");
                setDurationMin(30);
              }
              setShowAddForm(!showAddForm);
            }}
            className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-amber-400 font-semibold px-4 py-2.5 rounded-xl border border-slate-700/60 transition duration-150 text-xs shadow-md"
          >
            <Plus size={15} />
            {showAddForm ? "Cancel Form" : "Nayi Service Add Karein"}
          </button>
        </div>
      </div>

      {/* Collapsible Add Service Form */}
      {showAddForm && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden"
        >
          <form onSubmit={handleAddService} className="p-6 space-y-4">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Scissors size={15} className="text-amber-500 animate-pulse" />
              {editingService ? "Edit Menu Service Details" : "Add Custom Service to Menu Card"}
            </h3>

            {error && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-xs text-rose-400 rounded-xl flex items-center gap-2">
                <AlertTriangle size={14} />
                <span>{error}</span>
              </div>
            )}

            {success && (
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-400 rounded-xl">
                {editingService ? "Kamyabi Se Service Update Kar Li Gayi!" : "Kamyabi Se Service Add Kar Li Gayi! Menu updated."}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs text-slate-400 font-medium">Service Name *</label>
                <input
                  type="text"
                  required
                  placeholder="Maslan: Royal Facial / Hair Dye"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500/50 rounded-xl py-2.5 px-3.5 text-xs text-white outline-none transition"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs text-slate-400 font-medium">Price in PKR (Rate) *</label>
                <input
                  type="number"
                  required
                  min={1}
                  value={price}
                  onChange={(e) => setPrice(parseInt(e.target.value) || 0)}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500/50 rounded-xl py-2.5 px-3.5 text-xs text-white outline-none transition font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs text-slate-400 font-medium">Category *</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500/50 rounded-xl py-2.5 px-3.5 text-xs text-white outline-none transition"
                >
                  {categoriesPreset.map((cat, i) => (
                    <option key={i} value={cat} className="bg-slate-950 text-white">
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs text-slate-400 font-medium">Duration (Minutes)</label>
                <input
                  type="number"
                  min={5}
                  value={durationMin}
                  onChange={(e) => setDurationMin(parseInt(e.target.value) || 30)}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500/50 rounded-xl py-2.5 px-3.5 text-xs text-white outline-none transition font-mono"
                />
              </div>
            </div>

            <div className="flex gap-2 justify-end pt-2">
              {editingService && (
                <button
                  type="button"
                  onClick={() => {
                    setEditingService(null);
                    setName("");
                    setPrice(500);
                    setCategory("Signature Grooming");
                    setDurationMin(30);
                    setShowAddForm(false);
                  }}
                  className="bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold py-2.5 px-5 rounded-xl transition"
                >
                  Cancel Edit
                </button>
              )}
              <button
                type="submit"
                disabled={loading}
                className="bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 text-xs font-bold py-2.5 px-5 rounded-xl transition hover:from-amber-600 hover:to-amber-700 disabled:opacity-50"
              >
                {loading ? "Saving..." : (editingService ? "Update details" : "Menu Mein Save Karein")}
              </button>
            </div>
          </form>
        </motion.div>
      )}

      {/* Services List and Search */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <Activity size={16} className="text-amber-500" />
            Menu Cards Service Ledger ({services.length} Total Services)
          </h3>
          <div className="relative w-full sm:w-64">
            <Search size={14} className="absolute left-3 top-3 text-slate-500" />
            <input
              type="text"
              placeholder="Search service ya category..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500/50 rounded-xl py-2 pl-9 pr-3 text-xs text-white outline-none transition placeholder-slate-600"
            />
          </div>
        </div>

        {/* Category Tabs Filter */}
        <div className="flex flex-wrap gap-1.5 pb-2 border-b border-slate-800/80">
          <button
            onClick={() => setSelectedCategoryFilter("All")}
            className={`px-3 py-1.5 rounded-lg text-[10px] sm:text-xs font-bold transition duration-150 whitespace-nowrap ${
              selectedCategoryFilter === "All"
                ? "bg-amber-500 text-slate-950 shadow-md shadow-amber-500/15"
                : "bg-slate-950 text-slate-400 hover:text-white border border-slate-850"
            }`}
          >
            All Services ({services.length})
          </button>
          {categoriesPreset.map((cat, i) => {
            const count = services.filter(s => s.category === cat).length;
            return (
              <button
                key={i}
                onClick={() => setSelectedCategoryFilter(cat)}
                className={`px-3 py-1.5 rounded-lg text-[10px] sm:text-xs font-bold transition duration-150 whitespace-nowrap ${
                  selectedCategoryFilter === cat
                    ? "bg-amber-500 text-slate-950 shadow-md shadow-amber-500/15"
                    : "bg-slate-950 text-slate-400 hover:text-white border border-slate-850"
                }`}
              >
                {cat} ({count})
              </button>
            );
          })}
        </div>

        {/* Services Grid layout */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {filteredServices.map(service => (
            <div
              key={service.id}
              className="bg-slate-950 p-4 rounded-xl border border-slate-800/80 flex items-center justify-between gap-4 group hover:border-slate-700 transition"
            >
              <div className="space-y-1 min-w-0">
                <span className="text-xs text-slate-500 uppercase font-semibold tracking-wider bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                  {service.category}
                </span>
                <span className="text-sm font-bold text-white block truncate pt-0.5 group-hover:text-amber-400 transition-colors">
                  {service.name}
                </span>
                <div className="flex items-center gap-3 text-[10px] text-slate-400 pt-0.5 font-mono">
                  <span className="flex items-center gap-1">
                    <Clock size={11} className="text-slate-500" /> {service.durationMin} mins
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-3 flex-shrink-0">
                <div className="text-right">
                  <span className="text-xs text-slate-500 block uppercase font-bold">Rate</span>
                  <span className="text-sm font-bold text-amber-400 font-mono">Rs. {service.price.toLocaleString()}</span>
                </div>

                <div className="flex gap-1.5">
                  <button
                    onClick={() => handleStartEdit(service)}
                    className="p-1.5 bg-slate-900 hover:bg-slate-800 text-amber-400 rounded-lg border border-slate-850 transition cursor-pointer"
                    title="Edit Service"
                  >
                    <Edit2 size={11} />
                  </button>
                  <button
                    onClick={() => handleDeleteService(service.id)}
                    className="p-1.5 bg-rose-950/15 hover:bg-rose-950/35 text-rose-400 rounded-lg border border-rose-900/10 transition cursor-pointer"
                    title="Delete Service"
                  >
                    <Trash2 size={11} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {filteredServices.length === 0 && (
          <div className="p-12 text-center text-xs text-slate-500">
            Koi service nahi mili. Nayi custom service register karne ke liye top right button click karein.
          </div>
        )}
      </div>
    </div>
  );
}
