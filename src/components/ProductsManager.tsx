import React, { useState, useEffect } from "react";
import { Product, ProductSale, StaffMember } from "../types";
import { 
  getProducts, 
  addProduct, 
  updateProduct, 
  deleteProduct, 
  getProductSales, 
  addProductSale, 
  deleteProductSale 
} from "../firebaseService";
import { 
  Package, 
  Plus, 
  TrendingUp, 
  Trash2, 
  Search, 
  Check, 
  AlertCircle, 
  User, 
  Calendar, 
  Tag,
  DollarSign,
  Layers,
  Edit2,
  RefreshCw,
  ShoppingBag
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface ProductsManagerProps {
  staff: StaffMember[];
}

export default function ProductsManager({ staff }: ProductsManagerProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [sales, setSales] = useState<ProductSale[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"inventory" | "sales">("inventory");
  
  // UI States
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showAddProductModal, setShowAddProductModal] = useState(false);
  const [showSellProductModal, setShowSellProductModal] = useState(false);

  // Add Product Form State
  const [pName, setPName] = useState("");
  const [pPrice, setPPrice] = useState("");
  const [pCostPrice, setPCostPrice] = useState("");
  const [pStock, setPStock] = useState("");
  const [pCategory, setPCategory] = useState("Hair Care");
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // Sell Product Form State
  const [selectedProductId, setSelectedProductId] = useState("");
  const [sellQty, setSellQty] = useState("1");
  const [sellStaffId, setSellStaffId] = useState("");
  const [sellDate, setSellDate] = useState(() => new Date().toISOString().split('T')[0]);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const prodList = await getProducts();
      const saleList = await getProductSales();
      setProducts(prodList);
      setSales(saleList);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    const priceNum = parseFloat(pPrice);
    const costNum = parseFloat(pCostPrice) || 0;
    const stockNum = parseInt(pStock, 10);

    if (!pName.trim()) {
      setError("Product ka naam likhna zaroori hai.");
      return;
    }
    if (isNaN(priceNum) || priceNum <= 0) {
      setError("Product ki sale price durust likhein.");
      return;
    }
    if (isNaN(stockNum) || stockNum < 0) {
      setError("Sahi stock quantity likhein.");
      return;
    }

    try {
      if (editingProduct) {
        // Edit flow
        const updated: Product = {
          ...editingProduct,
          name: pName.trim(),
          price: priceNum,
          costPrice: costNum,
          stock: stockNum,
          category: pCategory
        };
        await updateProduct(updated);
        setSuccess("Product details update ho gaye!");
      } else {
        // Create flow
        const newProd: Product = {
          id: `prod-${Date.now()}`,
          name: pName.trim(),
          price: priceNum,
          costPrice: costNum,
          stock: stockNum,
          category: pCategory
        };
        await addProduct(newProd);
        setSuccess("Naya Product kamyabi se list ho gaya!");
      }

      setPName("");
      setPPrice("");
      setPCostPrice("");
      setPStock("");
      setPCategory("Hair Care");
      setEditingProduct(null);
      setShowAddProductModal(false);
      await loadData();
    } catch (err) {
      console.error(err);
      setError("Product save karne me koi error aya.");
    }
  };

  const handleDeleteProduct = async (id: string, name: string) => {
    if (window.confirm(`Kiya aap waqai is product "${name}" ko list se delete karna chahte hain?`)) {
      try {
        await deleteProduct(id);
        await loadData();
      } catch (err) {
        console.error(err);
      }
    }
  };

  const handleSellProductSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    const qty = parseInt(sellQty, 10);
    if (!selectedProductId) {
      setError("Product select karein.");
      return;
    }
    if (isNaN(qty) || qty <= 0) {
      setError("Sahi quantity likhein.");
      return;
    }
    if (!sellStaffId) {
      setError("Staff Member (Jis ne product bechi) select karein.");
      return;
    }

    const product = products.find(p => p.id === selectedProductId);
    if (!product) {
      setError("Product nahi mila.");
      return;
    }

    if (product.stock < qty) {
      setError(`Stock me sirf ${product.stock} products bache hain, aur aap ${qty} bechna chahte hain!`);
      return;
    }

    try {
      const staffMember = staff.find(s => s.id === sellStaffId);
      const staffName = staffMember ? staffMember.name : "Unknown Staff";
      const totalAmount = qty * product.price;

      const saleRecord: ProductSale = {
        id: `sale-${Date.now()}`,
        productId: selectedProductId,
        productName: product.name,
        price: product.price,
        quantity: qty,
        totalAmount,
        staffId: sellStaffId,
        staffName,
        date: sellDate,
        createdAt: new Date().toISOString()
      };

      // 1. Add Product Sale Log
      await addProductSale(saleRecord);

      // 2. Manually adjust stock in Firestore to ensure it reflects instantly
      const updatedProduct: Product = {
        ...product,
        stock: product.stock - qty
      };
      await updateProduct(updatedProduct);

      setSuccess(`Rs. ${totalAmount} ki Product bechi gayi! Stylist ${staffName} ko attribute ho gaya.`);
      setSelectedProductId("");
      setSellQty("1");
      setSellStaffId("");
      setShowSellProductModal(false);
      await loadData();
    } catch (err) {
      console.error(err);
      setError("Sale record karne me error aya.");
    }
  };

  const handleDeleteSale = async (sale: ProductSale) => {
    if (window.confirm(`Kiya aap waqai "${sale.productName}" ki product sale (Rs. ${sale.totalAmount}) delete karna chahte hain? Stock recover ho jayega.`)) {
      try {
        await deleteProductSale(sale.id);

        // Recover stock
        const product = products.find(p => p.id === sale.productId);
        if (product) {
          await updateProduct({
            ...product,
            stock: product.stock + sale.quantity
          });
        }
        await loadData();
      } catch (err) {
        console.error(err);
      }
    }
  };

  const openEditProduct = (prod: Product) => {
    setEditingProduct(prod);
    setPName(prod.name);
    setPPrice(String(prod.price));
    setPCostPrice(String(prod.costPrice || ""));
    setPStock(String(prod.stock));
    setPCategory(prod.category);
    setShowAddProductModal(true);
  };

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredSales = sales.filter(s => 
    s.productName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.staffName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Top section */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
            <Package className="text-amber-500" />
            Product Inventory & Staff Sales Ledger
          </h2>
          <p className="text-slate-400 text-sm">
            Retail products ka stock manage karein aur stylists ki product sales history tracking.
          </p>
        </div>

        <div className="flex flex-wrap gap-2.5">
          <button
            onClick={() => {
              setEditingProduct(null);
              setPName("");
              setPPrice("");
              setPCostPrice("");
              setPStock("");
              setPCategory("Hair Care");
              setShowAddProductModal(true);
            }}
            className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-amber-400 font-bold px-3.5 py-2.5 rounded-xl border border-slate-700/50 transition text-xs shadow-md"
          >
            <Plus size={14} />
            <span>Naya Product</span>
          </button>

          <button
            onClick={() => setShowSellProductModal(true)}
            className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black px-4 py-2.5 rounded-xl transition text-xs shadow-md shadow-emerald-500/10 active:scale-95"
          >
            <ShoppingBag size={14} className="stroke-[2.5]" />
            <span>Product Bechein (Sell)</span>
          </button>
        </div>
      </div>

      {success && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-400 rounded-xl">
          {success}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-850 pb-px">
        <button
          onClick={() => { setActiveTab("inventory"); setSearchQuery(""); }}
          className={`pb-2.5 px-4 font-bold text-xs transition duration-150 uppercase tracking-wider border-b-2 ${
            activeTab === "inventory"
              ? "border-amber-500 text-white"
              : "border-transparent text-slate-500 hover:text-slate-300"
          }`}
        >
          Product Stock List ({products.length})
        </button>
        <button
          onClick={() => { setActiveTab("sales"); setSearchQuery(""); }}
          className={`pb-2.5 px-4 font-bold text-xs transition duration-150 uppercase tracking-wider border-b-2 ${
            activeTab === "sales"
              ? "border-amber-500 text-white"
              : "border-transparent text-slate-500 hover:text-slate-300"
          }`}
        >
          Retail Sales History ({sales.length})
        </button>
      </div>

      {/* Filter and Search Panel */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search size={14} className="absolute left-3.5 top-3.5 text-slate-500" />
          <input
            type="text"
            placeholder={activeTab === "inventory" ? "Search product name or category..." : "Search sold product or staff name..."}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500/40 rounded-xl py-2.5 pl-10 pr-4 text-xs text-white placeholder-slate-600 outline-none transition"
          />
        </div>

        {activeTab === "sales" && (
          <div className="text-right">
            <span className="text-xs text-slate-400 font-medium mr-2">Total Retail Sales:</span>
            <span className="text-sm font-black text-emerald-400 font-mono">
              Rs. {filteredSales.reduce((sum, s) => sum + s.totalAmount, 0).toLocaleString()}
            </span>
          </div>
        )}
      </div>

      {/* Inventory Tab View */}
      {activeTab === "inventory" && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
          {loading ? (
            <div className="p-12 text-center text-xs text-slate-500">
              <RefreshCw className="animate-spin mx-auto text-amber-500 mb-2" size={18} />
              Loading product list...
            </div>
          ) : filteredProducts.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-950/20 text-[10px] text-slate-500 uppercase tracking-wider font-bold">
                    <th className="py-3 px-4">Product Name</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4 text-right">Cost Price (Rs.)</th>
                    <th className="py-3 px-4 text-right">Sale Price (Rs.)</th>
                    <th className="py-3 px-4 text-right">Stock Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-850">
                  {filteredProducts.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-855/30 transition">
                      <td className="py-3.5 px-4 font-bold text-white flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-center text-amber-400 text-xs">
                          {p.name[0]}
                        </div>
                        <span>{p.name}</span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="bg-slate-950 px-2.5 py-0.5 rounded-md border border-slate-800 text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                          {p.category}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono text-slate-400">Rs. {(p.costPrice || 0).toLocaleString()}</td>
                      <td className="py-3.5 px-4 text-right font-mono text-amber-400 font-bold text-sm">Rs. {p.price.toLocaleString()}</td>
                      <td className="py-3.5 px-4 text-right font-mono">
                        {p.stock <= 0 ? (
                          <span className="text-rose-400 bg-rose-500/10 border border-rose-500/20 px-2 py-0.5 rounded text-[9px] font-bold">OUT OF STOCK</span>
                        ) : p.stock <= 5 ? (
                          <span className="text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded text-[9px] font-bold">LOW STOCK ({p.stock})</span>
                        ) : (
                          <span className="text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded text-[9px] font-bold">{p.stock} units</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex gap-2 justify-end">
                          <button
                            onClick={() => openEditProduct(p)}
                            className="p-1.5 bg-slate-950 hover:bg-slate-800 text-amber-400 rounded-lg border border-slate-800 transition cursor-pointer"
                            title="Edit Product"
                          >
                            <Edit2 size={11} />
                          </button>
                          <button
                            onClick={() => handleDeleteProduct(p.id, p.name)}
                            className="p-1.5 bg-rose-950/15 hover:bg-rose-950/35 text-rose-400 rounded-lg border border-rose-900/10 transition cursor-pointer"
                            title="Delete Product"
                          >
                            <Trash2 size={11} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-16 text-center text-slate-500 text-xs">
              Sash-query ke mutabiq koi product nahi mila. Naya product add karne ke liye "Naya Product" click karein.
            </div>
          )}
        </div>
      )}

      {/* Sales Tab View */}
      {activeTab === "sales" && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
          {loading ? (
            <div className="p-12 text-center text-xs text-slate-500">
              <RefreshCw className="animate-spin mx-auto text-amber-500 mb-2" size={18} />
              Loading sales list...
            </div>
          ) : filteredSales.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-950/20 text-[10px] text-slate-500 uppercase tracking-wider font-bold">
                    <th className="py-3 px-4">Sold Product</th>
                    <th className="py-3 px-4">Sold By (Staff Member)</th>
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4 text-right">Unit Price</th>
                    <th className="py-3 px-4 text-right">Qty</th>
                    <th className="py-3 px-4 text-right">Total Sale</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-850">
                  {filteredSales.map((s) => (
                    <tr key={s.id} className="hover:bg-slate-855/30 transition">
                      <td className="py-3.5 px-4 font-bold text-white">{s.productName}</td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1.5 font-semibold text-amber-400">
                          <User size={12} />
                          <span>{s.staffName}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 font-mono text-[11px] text-slate-400">{s.date}</td>
                      <td className="py-3.5 px-4 text-right font-mono text-slate-300">Rs. {s.price.toLocaleString()}</td>
                      <td className="py-3.5 px-4 text-right font-mono font-bold text-white">{s.quantity} pcs</td>
                      <td className="py-3.5 px-4 text-right font-mono font-bold text-emerald-400 text-sm">Rs. {s.totalAmount.toLocaleString()}</td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => handleDeleteSale(s)}
                          className="p-1.5 bg-rose-950/15 hover:bg-rose-950/35 text-rose-400 rounded-lg border border-rose-900/10 transition cursor-pointer"
                          title="Delete sale and recover stock"
                        >
                          <Trash2 size={11} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-16 text-center text-slate-500 text-xs">
              Abhi tak koi retail sale history mojood nahi hai. "Product Bechein" par click karke sale register karein.
            </div>
          )}
        </div>
      )}

      {/* MODAL 1: Add/Edit Product */}
      <AnimatePresence>
        {showAddProductModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowAddProductModal(false)}
              className="absolute inset-0 bg-slate-950/85 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 relative z-10"
            >
              <h3 className="text-base font-bold text-white mb-4 uppercase tracking-wider flex items-center gap-2">
                <Tag size={16} className="text-amber-500" />
                {editingProduct ? "Product Edit Karein" : "Naya Retail Product List Karein"}
              </h3>

              {error && (
                <div className="p-3 mb-3 bg-rose-500/10 border border-rose-500/20 text-xs text-rose-400 rounded-xl">
                  {error}
                </div>
              )}

              <form onSubmit={handleSaveProduct} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs text-slate-400 font-medium">Product Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="E.g. Keune Hair Wax 150ml"
                    value={pName}
                    onChange={(e) => setPName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500/50 rounded-xl py-2.5 px-3.5 text-xs text-white outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs text-slate-400 font-medium">Cost Price (Purchase Price)</label>
                    <input
                      type="number"
                      placeholder="Rs. Khareed price"
                      value={pCostPrice}
                      onChange={(e) => setPCostPrice(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500/50 rounded-xl py-2.5 px-3.5 text-xs text-white outline-none font-mono"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs text-slate-400 font-medium">Sale Price (Rs.) *</label>
                    <input
                      type="number"
                      required
                      placeholder="Rs. Retail price"
                      value={pPrice}
                      onChange={(e) => setPPrice(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500/50 rounded-xl py-2.5 px-3.5 text-xs text-amber-400 outline-none font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs text-slate-400 font-medium">Initial Stock (Units) *</label>
                    <input
                      type="number"
                      required
                      placeholder="Quantity"
                      value={pStock}
                      onChange={(e) => setPStock(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500/50 rounded-xl py-2.5 px-3.5 text-xs text-white outline-none font-mono"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs text-slate-400 font-medium">Category</label>
                    <select
                      value={pCategory}
                      onChange={(e) => setPCategory(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500/50 rounded-xl py-2.5 px-3 text-xs text-slate-300 outline-none"
                    >
                      <option value="Hair Care">Hair Care</option>
                      <option value="Skin Care">Skin Care</option>
                      <option value="Beard & Wax">Beard & Wax</option>
                      <option value="Shampoo/Serums">Shampoo & Serums</option>
                      <option value="Equipment/Scrub">Equipment / Scrub</option>
                      <option value="Other">Other Products</option>
                    </select>
                  </div>
                </div>

                <div className="flex gap-2.5 pt-3 justify-end text-xs font-bold">
                  <button
                    type="button"
                    onClick={() => setShowAddProductModal(false)}
                    className="bg-slate-800 text-slate-400 hover:text-white px-4 py-2 rounded-xl transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="bg-amber-500 hover:bg-amber-600 text-slate-950 px-5 py-2 rounded-xl transition shadow"
                  >
                    Save Product
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 2: Sell Product Form */}
      <AnimatePresence>
        {showSellProductModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowSellProductModal(false)}
              className="absolute inset-0 bg-slate-950/85 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 relative z-10"
            >
              <h3 className="text-base font-bold text-white mb-4 uppercase tracking-wider flex items-center gap-2">
                <ShoppingBag size={16} className="text-emerald-400" />
                Retail Sale Register Karein
              </h3>

              {error && (
                <div className="p-3 mb-3 bg-rose-500/10 border border-rose-500/20 text-xs text-rose-400 rounded-xl">
                  {error}
                </div>
              )}

              <form onSubmit={handleSellProductSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs text-slate-400 font-medium">Select Product *</label>
                  <select
                    value={selectedProductId}
                    onChange={(e) => setSelectedProductId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500/50 rounded-xl py-2.5 px-3 text-xs text-slate-300 outline-none"
                  >
                    <option value="">-- Choose Product --</option>
                    {products.map(p => (
                      <option key={p.id} value={p.id} disabled={p.stock <= 0}>
                        {p.name} (Price: Rs. {p.price} | Stock: {p.stock})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs text-slate-400 font-medium">Quantity (Units) *</label>
                    <input
                      type="number"
                      required
                      min="1"
                      value={sellQty}
                      onChange={(e) => setSellQty(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500/50 rounded-xl py-2.5 px-3.5 text-xs text-white outline-none font-mono"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs text-slate-400 font-medium">Tareeq (Date)</label>
                    <input
                      type="date"
                      required
                      value={sellDate}
                      onChange={(e) => setSellDate(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500/50 rounded-xl py-2.5 px-3.5 text-xs text-white outline-none font-mono"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs text-slate-400 font-medium">Bechne Wala (Stylist Assignment) *</label>
                  <select
                    value={sellStaffId}
                    onChange={(e) => setSellStaffId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500/50 rounded-xl py-2.5 px-3 text-xs text-slate-300 outline-none"
                  >
                    <option value="">-- Select Stylist --</option>
                    {staff.filter(st => st.status === "active").map(st => (
                      <option key={st.id} value={st.id}>{st.name} ({st.role})</option>
                    ))}
                  </select>
                </div>

                {/* Estimate total */}
                {selectedProductId && (
                  <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex justify-between text-xs items-center font-mono">
                    <span className="text-slate-500">Estimated Total Bill:</span>
                    <span className="text-emerald-400 font-bold">
                      Rs. {((products.find(p => p.id === selectedProductId)?.price || 0) * (parseInt(sellQty, 10) || 0)).toLocaleString()}
                    </span>
                  </div>
                )}

                <div className="flex gap-2.5 pt-3 justify-end text-xs font-bold">
                  <button
                    type="button"
                    onClick={() => setShowSellProductModal(false)}
                    className="bg-slate-800 text-slate-400 hover:text-white px-4 py-2 rounded-xl transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 px-5 py-2 rounded-xl transition shadow font-black"
                  >
                    Sell Product
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
