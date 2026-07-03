import React, { useState, useEffect } from "react";
import { Expense } from "../types";
import { getExpenses, addExpense, deleteExpense } from "../firebaseService";
import { 
  DollarSign, 
  Plus, 
  Trash2, 
  Search, 
  Filter, 
  Calendar, 
  Receipt,
  AlertCircle,
  Coffee,
  Lightbulb,
  Building2,
  Gift,
  HelpCircle,
  Wrench,
  Edit2
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

export default function ExpensesConfig() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  // Form states
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState<Expense["category"]>("supplies");
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [description, setDescription] = useState("");
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [showAddForm, setShowAddForm] = useState(false);

  useEffect(() => {
    loadExpenses();
  }, []);

  const loadExpenses = async () => {
    setLoading(true);
    try {
      const data = await getExpenses();
      setExpenses(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess(false);

    const expenseAmount = parseFloat(amount);
    if (!title.trim()) {
      setError("Kharche ka title lazmi likhein.");
      return;
    }
    if (isNaN(expenseAmount) || expenseAmount <= 0) {
      setError("Meharbani karke sahi amount enter karein.");
      return;
    }

    setSaving(true);
    try {
      if (editingExpense) {
        const updatedExpense: Expense = {
          ...editingExpense,
          title: title.trim(),
          amount: expenseAmount,
          category,
          date,
          description: description.trim()
        };
        await addExpense(updatedExpense);
        setEditingExpense(null);
      } else {
        const newExpense: Expense = {
          id: `exp-${Date.now()}`,
          title: title.trim(),
          amount: expenseAmount,
          category,
          date,
          description: description.trim()
        };
        await addExpense(newExpense);
      }
      
      // Reset Form
      setTitle("");
      setAmount("");
      setCategory("supplies");
      setDescription("");
      setDate(new Date().toISOString().split('T')[0]);
      
      setSuccess(true);
      setShowAddForm(false);
      await loadExpenses();

      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      console.error(err);
      setError("Kharcha save karte hue error aya.");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteExpense = async (id: string, name: string) => {
    if (window.confirm(`Kiya aap waqai "${name}" ka kharcha delete karna chahte hain?`)) {
      try {
        await deleteExpense(id);
        await loadExpenses();
      } catch (err: any) {
        console.error(err);
        alert(`Kharcha delete nahi ho saka: ${err.message || err}`);
      }
    }
  };

  const handleStartEdit = (exp: Expense) => {
    setEditingExpense(exp);
    setTitle(exp.title);
    setAmount(exp.amount.toString());
    setCategory(exp.category);
    setDate(exp.date);
    setDescription(exp.description || "");
    setShowAddForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const getCategoryDetails = (cat: Expense["category"]) => {
    switch (cat) {
      case "supplies":
        return { label: "Supplies & Products", icon: <Wrench size={14} />, color: "text-blue-400 bg-blue-500/10 border-blue-500/20" };
      case "rent":
        return { label: "Rent / Space", icon: <Building2 size={14} />, color: "text-indigo-400 bg-indigo-500/10 border-indigo-500/20" };
      case "utilities":
        return { label: "Electricity / Water", icon: <Lightbulb size={14} />, color: "text-amber-400 bg-amber-500/10 border-amber-500/20" };
      case "tea_food":
        return { label: "Chaye / Khana", icon: <Coffee size={14} />, color: "text-rose-400 bg-rose-500/10 border-rose-500/20" };
      case "salary_bonus":
        return { label: "Salary / Bonus", icon: <Gift size={14} />, color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20" };
      case "marketing":
        return { label: "Marketing / Ads", icon: <DollarSign size={14} />, color: "text-purple-400 bg-purple-500/10 border-purple-500/20" };
      default:
        return { label: "Other Kharcha", icon: <HelpCircle size={14} />, color: "text-slate-400 bg-slate-500/10 border-slate-500/20" };
    }
  };

  const filteredExpenses = expenses.filter(e => {
    const matchesSearch = e.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          e.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = categoryFilter === "all" || e.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const totalExpenseSum = filteredExpenses.reduce((sum, e) => sum + e.amount, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
            <Receipt className="text-amber-500 animate-pulse" />
            Salon Daily Expenses Manager (Kharcha Ledger)
          </h2>
          <p className="text-slate-400 text-sm">
            Dukan ke chaye, bijli bill, rent aur supplies ke kharche add aur track karein.
          </p>
        </div>

        <button
          onClick={() => {
            if (showAddForm) {
              setEditingExpense(null);
              setTitle("");
              setAmount("");
              setCategory("supplies");
              setDescription("");
              setDate(new Date().toISOString().split('T')[0]);
            }
            setShowAddForm(!showAddForm);
          }}
          className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-amber-400 font-semibold px-4 py-2.5 rounded-xl border border-slate-700/60 transition duration-150 text-xs shadow-md"
        >
          <Plus size={15} />
          <span>{showAddForm ? "Close Form" : "Naya Kharcha Add Karein"}</span>
        </button>
      </div>

      {/* Form section */}
      <AnimatePresence>
        {showAddForm && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden bg-slate-900 border border-slate-800 rounded-2xl"
          >
            <form onSubmit={handleAddExpense} className="p-6 space-y-4">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                {editingExpense ? "Kharche (Expense) Ki Details Update Karein" : "Naye Kharche (Expense) Ki Entry Likhein"}
              </h3>

              {error && (
                <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-xs text-rose-400 rounded-xl">
                  {error}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs text-slate-400 font-medium">Kharcha Name / Title *</label>
                  <input
                    type="text"
                    required
                    placeholder="E.g. Chaye Pani aur Samosay"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500/50 rounded-xl py-3 px-4 text-sm text-white placeholder-slate-600 outline-none transition"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs text-slate-400 font-medium">Kharche Ka Amount (Rs.) *</label>
                  <input
                    type="number"
                    required
                    placeholder="Amount in Rupees"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500/50 rounded-xl py-3 px-4 text-sm text-white placeholder-slate-600 outline-none transition font-mono"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs text-slate-400 font-medium">Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500/50 rounded-xl py-3 px-4 text-sm text-amber-400 outline-none transition"
                  >
                    <option value="supplies">Supplies & Products</option>
                    <option value="rent">Rent / Space</option>
                    <option value="utilities">Electricity / Water / Internet</option>
                    <option value="tea_food">Chaye / Food Expense</option>
                    <option value="salary_bonus">Salary / Advance / Bonus</option>
                    <option value="marketing">Marketing / Banner Ads</option>
                    <option value="other">Other Miscellaneous</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1.5 md:col-span-2">
                  <label className="text-xs text-slate-400 font-medium">Description (Optional)</label>
                  <input
                    type="text"
                    placeholder="Koi mazeed tafseel likhein..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500/50 rounded-xl py-3 px-4 text-sm text-white placeholder-slate-600 outline-none transition"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs text-slate-400 font-medium">Tareeq (Date)</label>
                  <input
                    type="date"
                    required
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500/50 rounded-xl py-2.5 px-4 text-sm text-white outline-none transition font-mono"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                {editingExpense && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditingExpense(null);
                      setTitle("");
                      setAmount("");
                      setCategory("supplies");
                      setDescription("");
                      setDate(new Date().toISOString().split('T')[0]);
                      setShowAddForm(false);
                    }}
                    className="bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold py-2.5 px-5 rounded-xl transition"
                  >
                    Cancel Edit
                  </button>
                )}
                <button
                  type="submit"
                  disabled={saving}
                  className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold py-2.5 px-6 rounded-xl text-xs transition duration-150 shadow-md active:scale-95 disabled:opacity-50"
                >
                  {saving ? "Saving Expense..." : (editingExpense ? "Update Kharcha" : "Kharcha Save Karein")}
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {success && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-400 rounded-xl">
          Kamyabi Se Save Ho Gaya! Record saved to salon ledger.
        </div>
      )}

      {/* Filter and Totals board */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="flex items-center gap-3.5">
          <div className="relative w-64">
            <Search size={14} className="absolute left-3 top-3 text-slate-500" />
            <input
              type="text"
              placeholder="Search expenses..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500/40 rounded-xl py-2 pl-9 pr-3 text-xs text-white outline-none transition"
            />
          </div>

          <div className="flex items-center gap-1 bg-slate-950 px-2.5 py-1.5 border border-slate-800 rounded-xl">
            <Filter size={10} className="text-amber-500" />
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="bg-transparent text-xs text-slate-300 outline-none cursor-pointer border-none font-medium p-0"
            >
              <option value="all" className="bg-slate-950 text-white">All Categories</option>
              <option value="supplies" className="bg-slate-950 text-white">Supplies</option>
              <option value="rent" className="bg-slate-950 text-white">Rent</option>
              <option value="utilities" className="bg-slate-950 text-white">Utilities</option>
              <option value="tea_food" className="bg-slate-950 text-white">Chaye/Food</option>
              <option value="salary_bonus" className="bg-slate-950 text-white">Salaries</option>
              <option value="marketing" className="bg-slate-950 text-white">Marketing</option>
              <option value="other" className="bg-slate-950 text-white">Other</option>
            </select>
          </div>
        </div>

        <div className="text-right flex items-center gap-2">
          <span className="text-xs text-slate-400 font-medium">Filtered Total Expense:</span>
          <span className="text-base font-black text-rose-400 font-mono">Rs. {totalExpenseSum.toLocaleString()}</span>
        </div>
      </div>

      {/* Expenses Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-xs text-slate-500">
            <div className="w-5 h-5 border-2 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
            Loading expense data...
          </div>
        ) : filteredExpenses.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/20 text-[10px] text-slate-500 uppercase tracking-wider font-bold">
                  <th className="py-3 px-4">Expense Title</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Description</th>
                  <th className="py-3 px-4 text-right">Amount (Rs.)</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-850">
                {filteredExpenses.map((exp) => {
                  const catInfo = getCategoryDetails(exp.category);
                  return (
                    <tr key={exp.id} className="hover:bg-slate-850/30 transition duration-100">
                      <td className="py-3.5 px-4 font-bold text-white">{exp.title}</td>
                      <td className="py-3.5 px-4">
                        <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded border ${catInfo.color}`}>
                          {catInfo.icon}
                          {catInfo.label}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-mono text-[11px] text-slate-400">{exp.date}</td>
                      <td className="py-3.5 px-4 text-slate-400 max-w-xs truncate">{exp.description || "-"}</td>
                      <td className="py-3.5 px-4 text-right font-mono font-bold text-rose-400 text-sm">Rs. {exp.amount.toLocaleString()}</td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex gap-1.5 justify-end">
                          <button
                            onClick={() => handleStartEdit(exp)}
                            className="p-1.5 bg-slate-900 hover:bg-slate-800 text-amber-400 rounded-lg border border-slate-850 transition cursor-pointer"
                            title="Edit Expense Entry"
                          >
                            <Edit2 size={12} />
                          </button>
                          <button
                            onClick={() => handleDeleteExpense(exp.id, exp.title)}
                            className="p-1.5 bg-rose-950/10 hover:bg-rose-950/35 text-rose-400 rounded-lg border border-rose-900/10 transition cursor-pointer"
                            title="Delete Expense Entry"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-16 text-center text-slate-500 text-xs">
            Abhi tak koi expense log nahi kiya gaya. Naya kharcha add karne ke liye upar wala button click karein.
          </div>
        )}
      </div>
    </div>
  );
}
