'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/layout/DashboardLayout';
import {
  Package,
  Plus,
  Search,
  RefreshCw,
  Sparkles,
  Barcode,
  X,
  Building2,
  DollarSign,
  TrendingUp,
  AlertCircle,
  Tag,
} from 'lucide-react';

interface ProductItem {
  id: string;
  barcode: string;
  sku: string;
  name: string;
  costPrice: number;
  sellingPrice: number;
  profitMarginPercent: number;
  minStockAlert: number;
  unit: string;
  category: string;
  stock: number;
  createdAt: string;
}

interface CategoryItem {
  id: string;
  name: string;
}

interface Branch {
  id: string;
  name: string;
  isWarehouse: boolean;
}

export default function MasterProductsPage() {
  const router = useRouter();
  const [branchId, setBranchId] = useState<string>('');
  const [branches, setBranches] = useState<Branch[]>([]);
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [dbCategories, setDbCategories] = useState<CategoryItem[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);

  // Modal States
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [barcodeInput, setBarcodeInput] = useState<string>('');
  const [skuInput, setSkuInput] = useState<string>('');
  const [nameInput, setNameInput] = useState<string>('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');
  const [isNewCategoryMode, setIsNewCategoryMode] = useState<boolean>(false);
  const [customCategoryName, setCustomCategoryName] = useState<string>('');
  const [unitInput, setUnitInput] = useState<string>('PCS');
  const [costPriceInput, setCostPriceInput] = useState<string>('');
  const [sellingPriceInput, setSellingPriceInput] = useState<string>('');
  const [initialStockInput, setInitialStockInput] = useState<string>('0');
  const [minStockAlertInput, setMinStockAlertInput] = useState<string>('5');
  const [allocationBranchId, setAllocationBranchId] = useState<string>('');
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  useEffect(() => {
    fetchSessionUser();
    fetchBranches();
    fetchCategories();
    const storedBranch = localStorage.getItem('selectedBranchId') || '';
    setBranchId(storedBranch);

    const handleBranchChange = (e: any) => {
      setBranchId(e.detail);
    };

    window.addEventListener('branchChanged', handleBranchChange);
    return () => window.removeEventListener('branchChanged', handleBranchChange);
  }, []);

  const fetchSessionUser = async () => {
    try {
      const res = await fetch('/api/auth/me');
      const data = await res.json();
      if (data.success && data.user) {
        if (data.user.role === 'CASHIER') {
          router.replace('/pos');
        }
      }
    } catch (err) {
      console.error('Failed to verify session role', err);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, [branchId, searchQuery, selectedCategoryFilter]);

  const fetchCategories = async () => {
    try {
      const res = await fetch('/api/categories');
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        setDbCategories(data.data);
        if (data.data.length > 0 && !selectedCategoryId) {
          setSelectedCategoryId(data.data[0].id);
        }
      }
    } catch (err) {
      console.error('Failed to load categories', err);
    }
  };

  const fetchBranches = async () => {
    try {
      const res = await fetch('/api/branches');
      const data = await res.json();
      if (data.success && data.data.length > 0) {
        setBranches(data.data);
        if (!allocationBranchId) {
          setAllocationBranchId(data.data[0].id);
        }
      }
    } catch (err) {
      console.error('Failed to load branches', err);
    }
  };

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const url = new URL('/api/products', window.location.origin);
      if (branchId) url.searchParams.append('branchId', branchId);
      if (searchQuery) url.searchParams.append('query', searchQuery);

      const res = await fetch(url.toString());
      const data = await res.json();
      if (data.success) {
        setProducts(data.data);
      }
    } catch (err) {
      console.error('Failed to fetch products', err);
    } finally {
      setLoading(false);
    }
  };

  // Helper to generate a 13-digit EAN-13 Barcode
  const handleAutoGenerateBarcode = () => {
    const randomDigits = Array.from({ length: 10 }, () =>
      Math.floor(Math.random() * 10)
    ).join('');
    const newBarcode = `899${randomDigits}`;
    setBarcodeInput(newBarcode);
    if (!skuInput) {
      setSkuInput(`SKU-${randomDigits.slice(0, 5)}`);
    }
  };

  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!barcodeInput || !skuInput || !nameInput || !costPriceInput || !sellingPriceInput) {
      setFormError('Mohon isi semua field wajib (Barcode, SKU, Nama, HPP, Harga Jual).');
      return;
    }

    let payloadCategoryId: string | undefined = undefined;
    let payloadCategoryName: string | undefined = undefined;

    if (isNewCategoryMode) {
      if (!customCategoryName.trim()) {
        setFormError('Nama kategori baru wajib diisi.');
        return;
      }
      payloadCategoryName = customCategoryName.trim();
    } else {
      payloadCategoryId = selectedCategoryId || (dbCategories.length > 0 ? dbCategories[0].id : undefined);
      if (!payloadCategoryId) {
        setFormError('Kategori wajib dipilih atau diketik baru.');
        return;
      }
    }

    try {
      setIsSubmitting(true);
      const payload = {
        name: nameInput.trim().toUpperCase(),
        barcode: barcodeInput,
        sku: skuInput,
        categoryId: payloadCategoryId,
        categoryName: payloadCategoryName,
        unit: unitInput,
        costPrice: Number(costPriceInput),
        sellingPrice: Number(sellingPriceInput),
        initialStock: Number(initialStockInput) || 0,
        minStockAlert: Number(minStockAlertInput) || 5,
        branchId: allocationBranchId || branchId || branches[0]?.id,
      };

      const res = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (data.success) {
        alert(`Produk "${data.data.name}" berhasil ditambahkan ke catalog master!`);
        setIsModalOpen(false);
        // Reset Form
        setBarcodeInput('');
        setSkuInput('');
        setNameInput('');
        setCostPriceInput('');
        setSellingPriceInput('');
        setInitialStockInput('0');
        setCustomCategoryName('');
        setIsNewCategoryMode(false);
        // Refresh Table and Categories
        await Promise.all([fetchProducts(), fetchCategories()]);
      } else {
        setFormError(data.message || 'Gagal menambahkan produk.');
      }
    } catch (err: any) {
      setFormError(err.message || 'Terjadi kesalahan sistem.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Combined categories list for filter
  const categoriesList = Array.from(
    new Set([
      ...dbCategories.map((c) => c.name),
      ...products.map((p) => p.category),
    ].filter((cat) => Boolean(cat) && cat !== 'Uncategorized'))
  ).sort();

  const filteredProducts = products.filter((p) => {
    if (!selectedCategoryFilter) return true;
    return p.category === selectedCategoryFilter;
  });

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Title Bar & Quick Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900 border border-slate-800 p-4 rounded-2xl">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <Package className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">Kelola Master Produk</h1>
              <p className="text-xs text-slate-400">
                Pencatatan katalog produk master, barcode EAN-13, HPP, harga jual, margin keuntungan, dan stok cabang.
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              setFormError(null);
              setIsModalOpen(true);
            }}
            className="bg-gradient-to-r from-amber-500 to-orange-400 hover:from-amber-400 hover:to-orange-300 text-slate-950 font-bold px-4 py-2.5 rounded-xl flex items-center gap-2 text-xs shadow-lg shadow-amber-500/20 transition shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Produk Baru</span>
          </button>
        </div>

        {/* Search & Filter Toolbar */}
        <div className="flex flex-col sm:flex-row items-center gap-3 bg-slate-900 border border-slate-800 p-3 rounded-2xl">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Cari berdasarkan SKU, Nama Produk, atau Barcode..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <select
              value={selectedCategoryFilter}
              onChange={(e) => setSelectedCategoryFilter(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500 cursor-pointer"
            >
              <option value="">Semua Kategori</option>
              {categoriesList.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>

            <button
              onClick={fetchProducts}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
              title="Perbarui Data"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Product Master Table */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
            <h2 className="font-bold text-white text-base">Katalog Master Produk Retail</h2>
            <span className="text-xs text-slate-400 bg-slate-800 px-3 py-1 rounded-full font-mono">
              {filteredProducts.length} Produk Terdaftar
            </span>
          </div>

          <div className="overflow-x-auto">
            {loading ? (
              <div className="flex items-center justify-center h-48 text-slate-500 text-sm">
                Memuat katalog produk master...
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="flex items-center justify-center h-48 text-slate-500 text-xs">
                Tidak ada produk ditemukan.
              </div>
            ) : (
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 uppercase text-[10px] tracking-wider">
                    <th className="pb-3 px-3">Produk & Barcode</th>
                    <th className="pb-3 px-3">Kategori</th>
                    <th className="pb-3 px-3 text-right">Harga Modal (HPP)</th>
                    <th className="pb-3 px-3 text-right">Harga Jual</th>
                    <th className="pb-3 px-3 text-center">Margin (%)</th>
                    <th className="pb-3 px-3 text-right">Stok Cabang</th>
                    <th className="pb-3 px-3">Status Stok</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {filteredProducts.map((product) => {
                    const isLowStock = product.stock <= product.minStockAlert;
                    const isOutOfStock = product.stock <= 0;
                    return (
                      <tr key={product.id} className="hover:bg-slate-800/40 transition">
                        <td className="py-3 px-3">
                          <div className="font-semibold text-white text-sm">{product.name}</div>
                          <div className="flex items-center gap-2 text-[11px] text-slate-400 font-mono mt-0.5">
                            <span className="bg-slate-800 px-1.5 py-0.5 rounded text-slate-300">
                              SKU: {product.sku}
                            </span>
                            <span>Barcode: {product.barcode}</span>
                          </div>
                        </td>
                        <td className="py-3 px-3 text-slate-300">
                          <span className="bg-slate-800 px-2 py-0.5 rounded text-[11px]">
                            {product.category}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right font-mono text-slate-400">
                          Rp {product.costPrice.toLocaleString('id-ID')}
                        </td>
                        <td className="py-3 px-3 text-right font-mono font-bold text-emerald-400 text-sm">
                          Rp {product.sellingPrice.toLocaleString('id-ID')}
                        </td>
                        <td className="py-3 px-3 text-center font-mono font-bold text-amber-400">
                          +{product.profitMarginPercent}%
                        </td>
                        <td className="py-3 px-3 text-right font-mono font-bold text-white">
                          {product.stock} {product.unit}
                        </td>
                        <td className="py-3 px-3">
                          {isOutOfStock ? (
                            <span className="inline-block bg-rose-500/10 text-rose-400 border border-rose-500/20 px-2 py-0.5 rounded text-[10px] font-bold">
                              STOK HABIS
                            </span>
                          ) : isLowStock ? (
                            <span className="inline-block bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded text-[10px] font-bold">
                              STOK MINIMUM ({product.stock})
                            </span>
                          ) : (
                            <span className="inline-block bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded text-[10px] font-bold">
                              AMAN
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {/* Add Product Modal Dialog */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-xl overflow-hidden shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2 text-amber-400 font-bold text-base">
                <Plus className="w-5 h-5" />
                <span>Tambah Produk Master Baru</span>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleCreateProduct} className="space-y-4 text-xs">
              {/* Barcode & SKU Row */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-slate-300 font-semibold">Barcode Kode Batang</label>
                    <button
                      type="button"
                      onClick={handleAutoGenerateBarcode}
                      className="text-[10px] text-amber-400 hover:underline flex items-center gap-1"
                    >
                      <Sparkles className="w-3 h-3" /> Auto Barcode
                    </button>
                  </div>
                  <input
                    type="text"
                    placeholder="Contoh: 8991234567890"
                    value={barcodeInput}
                    onChange={(e) => setBarcodeInput(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Kode SKU Barang</label>
                  <input
                    type="text"
                    placeholder="Contoh: BRS-009"
                    value={skuInput}
                    onChange={(e) => setSkuInput(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-amber-500 uppercase"
                  />
                </div>
              </div>

              {/* Product Name */}
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                  Nama Produk Master <span className="text-rose-400">*</span>
                  <span className="text-[10px] text-slate-400 ml-2 font-normal">(Wajib huruf kapital)</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="CONTOH: KOPI SUSU GULA AREN 250ML"
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value.toUpperCase())}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white text-sm uppercase placeholder:normal-case focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none font-medium transition-all"
                />
              </div>

              {/* Category & Unit Row */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-slate-300 font-semibold">Kategori</label>
                    {isNewCategoryMode ? (
                      <button
                        type="button"
                        onClick={() => {
                          setIsNewCategoryMode(false);
                          setCustomCategoryName('');
                        }}
                        className="text-[10px] text-amber-400 hover:underline flex items-center gap-0.5"
                      >
                        ← Pilih Kategori
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          setIsNewCategoryMode(true);
                          setCustomCategoryName('');
                        }}
                        className="text-[10px] text-amber-400 hover:underline flex items-center gap-0.5"
                      >
                        + Ketik Baru
                      </button>
                    )}
                  </div>

                  {isNewCategoryMode ? (
                    <input
                      type="text"
                      placeholder="Masukkan Nama Kategori Baru (misal: Makanan Ringan)"
                      value={customCategoryName}
                      onChange={(e) => setCustomCategoryName(e.target.value)}
                      className="w-full bg-slate-950 border border-amber-500/50 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-500"
                      autoFocus
                    />
                  ) : (
                    <select
                      value={selectedCategoryId}
                      onChange={(e) => {
                        if (e.target.value === '__NEW__') {
                          setIsNewCategoryMode(true);
                          setCustomCategoryName('');
                        } else {
                          setSelectedCategoryId(e.target.value);
                        }
                      }}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-500 cursor-pointer"
                    >
                      <option value="">-- Pilih Kategori --</option>
                      {dbCategories.map((cat) => (
                        <option key={cat.id} value={cat.id}>
                          {cat.name}
                        </option>
                      ))}
                      <option value="__NEW__" className="text-amber-400 font-bold bg-slate-900">
                        + Ketik Kategori Baru...
                      </option>
                    </select>
                  )}
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Satuan Kemasan</label>
                  <select
                    value={unitInput}
                    onChange={(e) => setUnitInput(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-500"
                  >
                    <option value="PCS">PCS</option>
                    <option value="PACK">PACK</option>
                    <option value="SAK">SAK</option>
                    <option value="BTL">BTL</option>
                    <option value="KG">KG</option>
                    <option value="DUS">DUS</option>
                  </select>
                </div>
              </div>

              {/* Cost Price (HPP) & Selling Price */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Harga Modal Satuan (HPP)</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="Rp Modal..."
                    value={costPriceInput}
                    onChange={(e) => setCostPriceInput(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Harga Jual Toko (Rp)</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="Rp Harga Jual..."
                    value={sellingPriceInput}
                    onChange={(e) => setSellingPriceInput(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-amber-500 font-bold text-emerald-400"
                  />
                </div>
              </div>

              {/* Initial Stock & Allocation Branch */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Stok Awal</label>
                  <input
                    type="number"
                    min="0"
                    value={initialStockInput}
                    onChange={(e) => setInitialStockInput(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Cabang Alokasi</label>
                  <select
                    value={allocationBranchId}
                    onChange={(e) => setAllocationBranchId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-500"
                  >
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Batas Stok Min</label>
                  <input
                    type="number"
                    min="1"
                    value={minStockAlertInput}
                    onChange={(e) => setMinStockAlertInput(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold py-2.5 rounded-xl transition"
                >
                  Batal
                </button>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold py-2.5 rounded-xl shadow-lg shadow-amber-500/20 transition flex items-center justify-center gap-2"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>{isSubmitting ? 'Simpan Produk...' : 'Simpan Produk'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
