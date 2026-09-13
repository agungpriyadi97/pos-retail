'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/layout/DashboardLayout';
import {
  PackagePlus,
  Boxes,
  History,
  CheckCircle2,
  AlertCircle,
  Plus,
  Loader2,
  Building2,
  FileText,
  DollarSign,
} from 'lucide-react';

interface Product {
  id: string;
  name: string;
  sku: string;
  barcode: string;
  costPrice: number;
  stock: number;
  unit: string;
}

interface RestockLog {
  id: string;
  createdAt: string;
  branchName: string;
  productName: string;
  sku: string;
  barcode: string;
  unit: string;
  quantityChange: number;
  balanceAfter: number;
  referenceId: string;
  description: string;
}

export default function RestockPage() {
  const router = useRouter();
  const [branchId, setBranchId] = useState<string>('');
  const [currentUserId, setCurrentUserId] = useState<string>('');
  const [products, setProducts] = useState<Product[]>([]);
  const [logs, setLogs] = useState<RestockLog[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Form states
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [quantity, setQuantity] = useState<number>(10);
  const [costPriceInput, setCostPriceInput] = useState<string>('');
  const [supplierInvoice, setSupplierInvoice] = useState<string>('');
  const [notes, setNotes] = useState<string>('');

  useEffect(() => {
    fetchSessionUser();
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
          return;
        }
        setCurrentUserId(data.user.id);
        if (data.user.branchId && !branchId) {
          setBranchId(data.user.branchId);
        }
      }
    } catch (err) {
      console.error('Failed to load session user', err);
    }
  };

  useEffect(() => {
    fetchProducts();
    fetchRestockLogs();
  }, [branchId]);

  const fetchProducts = async () => {
    try {
      const url = new URL('/api/products', window.location.origin);
      if (branchId) url.searchParams.append('branchId', branchId);
      const res = await fetch(url.toString());
      const data = await res.json();
      if (data.success) {
        setProducts(data.data);
        if (data.data.length > 0 && !selectedProductId) {
          setSelectedProductId(data.data[0].id);
          setCostPriceInput(data.data[0].costPrice.toString());
        }
      }
    } catch (err) {
      console.error('Failed to load products', err);
    }
  };

  const fetchRestockLogs = async () => {
    try {
      setLoading(true);
      const url = new URL('/api/inventory/restock', window.location.origin);
      if (branchId) url.searchParams.append('branchId', branchId);
      const res = await fetch(url.toString());
      const data = await res.json();
      if (data.success) {
        setLogs(data.data);
      }
    } catch (err) {
      console.error('Failed to load restock history', err);
    } finally {
      setLoading(false);
    }
  };

  // When selected product changes, prefill cost price
  const handleProductSelect = (productId: string) => {
    setSelectedProductId(productId);
    const found = products.find((p) => p.id === productId);
    if (found) {
      setCostPriceInput(found.costPrice.toString());
    }
  };

  const selectedProduct = products.find((p) => p.id === selectedProductId);

  const handleSubmitRestock = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!selectedProduct) {
      setErrorMessage('Pilih produk terlebih dahulu.');
      return;
    }

    if (quantity <= 0) {
      setErrorMessage('Jumlah restock harus lebih dari 0.');
      return;
    }

    try {
      setIsSubmitting(true);
      const payload = {
        branchId: branchId || products[0]?.id,
        productId: selectedProduct.id,
        quantity,
        costPrice: costPriceInput ? Number(costPriceInput) : undefined,
        supplierInvoice: supplierInvoice || undefined,
        notes: notes || undefined,
        receivedById: currentUserId || undefined,
      };

      const res = await fetch('/api/inventory/restock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (data.success) {
        alert(
          `Stok berhasil ditambahkan! Stok baru "${selectedProduct.name}": ${data.data.newQuantity} ${selectedProduct.unit}.`
        );
        // Reset form
        setQuantity(10);
        setSupplierInvoice('');
        setNotes('');
        // Refresh products and history logs
        await fetchProducts();
        await fetchRestockLogs();
      } else {
        setErrorMessage(data.message || 'Gagal menambahkan stok.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Terjadi kesalahan sistem.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Title Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900 border border-slate-800 p-4 rounded-2xl">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-teal-500/10 text-teal-400 border border-teal-500/20">
              <PackagePlus className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">Tambah Stok & Penerimaan Barang (Restock)</h1>
              <p className="text-xs text-slate-400">
                Pencatatan fisik barang masuk dari supplier ke cabang/gudang beserta update HPP dan mutasi ledger.
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Form Intake Restock */}
          <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
              <Boxes className="w-5 h-5 text-teal-400" />
              <h2 className="font-bold text-white text-base">Formulir Penerimaan Barang Masuk</h2>
            </div>

            {errorMessage && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            <form onSubmit={handleSubmitRestock} className="space-y-4 text-xs">
              {/* Product Selector */}
              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Pilih Produk Penerimaan
                </label>
                <select
                  value={selectedProductId}
                  onChange={(e) => handleProductSelect(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-teal-500"
                >
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      [{p.sku}] {p.name} (Stok Saat Ini: {p.stock} {p.unit})
                    </option>
                  ))}
                </select>
              </div>

              {/* Quantity Stepper & Cost Price Input */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    Jumlah Masuk (Restock)
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={quantity}
                    onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-teal-500 font-mono font-bold text-sm"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    HPP / Modal Satuan (Rp)
                  </label>
                  <input
                    type="number"
                    min="0"
                    placeholder="Harga Beli Satuan Baru..."
                    value={costPriceInput}
                    onChange={(e) => setCostPriceInput(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-teal-500 font-mono"
                  />
                </div>
              </div>

              {/* Supplier Invoice & Notes */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">No. Faktur Supplier / Surat Jalan</label>
                  <input
                    type="text"
                    placeholder="Contoh: FAK-2026-0091"
                    value={supplierInvoice}
                    onChange={(e) => setSupplierInvoice(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-teal-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">Catatan Penerimaan</label>
                  <input
                    type="text"
                    placeholder="Contoh: Pengiriman batch pabrik A"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-teal-500"
                  />
                </div>
              </div>

              {/* Summary Card */}
              {selectedProduct && (
                <div className="bg-teal-500/10 border border-teal-500/20 p-3 rounded-xl space-y-1">
                  <div className="flex justify-between text-slate-400">
                    <span>Stok Awal:</span>
                    <span className="font-mono text-white">
                      {selectedProduct.stock} {selectedProduct.unit}
                    </span>
                  </div>
                  <div className="flex justify-between font-bold text-teal-400 text-sm">
                    <span>Stok Akhir Setelah Restock:</span>
                    <span className="font-mono">
                      {selectedProduct.stock + quantity} {selectedProduct.unit}
                    </span>
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitting || !selectedProduct}
                className={`w-full py-3 rounded-xl font-bold text-sm shadow-lg transition flex items-center justify-center gap-2 ${
                  isSubmitting || !selectedProduct
                    ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                    : 'bg-gradient-to-r from-teal-500 to-emerald-400 hover:from-teal-400 hover:to-emerald-300 text-slate-950 shadow-teal-500/20'
                }`}
              >
                {isSubmitting ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <PackagePlus className="w-5 h-5" />
                )}
                <span>{isSubmitting ? 'Memproses Restock...' : 'Konfirmasi Tambah Stok'}</span>
              </button>
            </form>
          </div>

          {/* Right Column: History Logs Table */}
          <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <History className="w-5 h-5 text-teal-400" />
                <h2 className="font-bold text-white text-base">Riwayat Restock Terakhir</h2>
              </div>
              <span className="text-xs text-slate-400 bg-slate-800 px-2.5 py-1 rounded-full font-mono">
                {logs.length} Mutasi Restock
              </span>
            </div>

            <div className="flex-1 overflow-x-auto">
              {loading ? (
                <div className="flex items-center justify-center h-48 text-slate-500 text-sm">
                  Memuat riwayat barang masuk...
                </div>
              ) : logs.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-48 text-slate-500 text-xs">
                  Belum ada riwayat restock barang masuk.
                </div>
              ) : (
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400 uppercase text-[10px] tracking-wider">
                      <th className="pb-3 px-2">Tanggal & Waktu</th>
                      <th className="pb-3 px-2">Produk SKU</th>
                      <th className="pb-3 px-2">Cabang</th>
                      <th className="pb-3 px-2 text-right">Qty Masuk</th>
                      <th className="pb-3 px-2 text-right">Saldo Akhir</th>
                      <th className="pb-3 px-2">No. Faktur</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {logs.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-800/40 transition">
                        <td className="py-3 px-2 text-slate-400 font-mono text-[11px]">
                          {new Date(log.createdAt).toLocaleString('id-ID', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </td>
                        <td className="py-3 px-2">
                          <div className="font-semibold text-white">{log.productName}</div>
                          <div className="text-[10px] text-slate-500 font-mono">
                            SKU: {log.sku}
                          </div>
                        </td>
                        <td className="py-3 px-2 text-slate-300">{log.branchName}</td>
                        <td className="py-3 px-2 text-right font-mono font-bold text-teal-400">
                          +{log.quantityChange} {log.unit}
                        </td>
                        <td className="py-3 px-2 text-right font-mono font-bold text-white">
                          {log.balanceAfter} {log.unit}
                        </td>
                        <td className="py-3 px-2 text-slate-400 font-mono text-[11px]">
                          {log.referenceId}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
