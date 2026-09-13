'use client';

import React, { useState, useEffect } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import {
  PackageX,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  Plus,
  ShieldCheck,
  Lock,
  Loader2,
} from 'lucide-react';

interface Product {
  id: string;
  name: string;
  sku: string;
  costPrice: number;
  stock: number;
  unit: string;
}

interface ShrinkageLog {
  id: string;
  quantity: number;
  unitCost: number;
  totalLoss: number;
  reason: 'DAMAGED' | 'EXPIRED' | 'STOLEN';
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  notes: string;
  batchNumber?: string | null;
  expiredDate?: string | null;
  createdAt: string;
  branch: { name: string };
  product: { name: string; sku: string; unit: string };
  submittedBy: { fullName: string };
  approvedBy?: { fullName: string } | null;
}

export default function ShrinkagePage() {
  const [branchId, setBranchId] = useState<string>('');
  const [currentUserId, setCurrentUserId] = useState<string>('');
  const [userRole, setUserRole] = useState<'CASHIER' | 'ADMIN_OWNER'>('CASHIER');
  const [products, setProducts] = useState<Product[]>([]);
  const [logs, setLogs] = useState<ShrinkageLog[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  // Form states
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [quantity, setQuantity] = useState<number>(1);
  const [reason, setReason] = useState<'DAMAGED' | 'EXPIRED' | 'STOLEN'>('DAMAGED');
  const [notes, setNotes] = useState<string>('');
  const [batchNumber, setBatchNumber] = useState<string>('');
  const [expiredDate, setExpiredDate] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

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
        setCurrentUserId(data.user.id);
        setUserRole(data.user.role);
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
    fetchShrinkageLogs();
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
        }
      }
    } catch (err) {
      console.error('Failed to load products', err);
    }
  };

  const fetchShrinkageLogs = async () => {
    try {
      setLoading(true);
      const url = new URL('/api/shrinkage', window.location.origin);
      if (branchId) url.searchParams.append('branchId', branchId);
      const res = await fetch(url.toString());
      const data = await res.json();
      if (data.success) {
        setLogs(data.data);
      }
    } catch (err) {
      console.error('Failed to load shrinkage logs', err);
    } finally {
      setLoading(false);
    }
  };

  const selectedProduct = products.find((p) => p.id === selectedProductId);
  const estimatedTotalLoss = selectedProduct ? selectedProduct.costPrice * quantity : 0;

  const handleSubmitLog = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct) return;

    try {
      setIsSubmitting(true);
      const payload = {
        branchId: branchId || products[0]?.id,
        productId: selectedProduct.id,
        quantity,
        unitCost: selectedProduct.costPrice,
        reason,
        notes,
        batchNumber: batchNumber || undefined,
        expiredDate: expiredDate || undefined,
        submittedById: currentUserId || undefined,
      };

      const res = await fetch('/api/shrinkage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (data.success) {
        alert('Laporan pengurang stok berhasil diajukan dan menunggu persetujuan Owner.');
        setQuantity(1);
        setNotes('');
        setBatchNumber('');
        setExpiredDate('');
        await fetchShrinkageLogs();
      } else {
        alert(data.error || 'Gagal mengirim laporan.');
      }
    } catch (err: any) {
      alert(err.message || 'Terjadi kesalahan sistem.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleApprovalAction = async (logId: string, action: 'APPROVE' | 'REJECT') => {
    if (userRole !== 'ADMIN_OWNER') {
      alert('Akses ditolak: Hanya Owner/Admin yang memiliki wewenang menyetujui penghapusan stok.');
      return;
    }

    const confirmMsg =
      action === 'APPROVE'
        ? 'Apakah Anda yakin menyetujui pengurangan stok ini? Stok barang akan dipotong secara permanen.'
        : 'Apakah Anda yakin menolak laporan ini?';

    if (!confirm(confirmMsg)) return;

    try {
      setProcessingId(logId);
      const res = await fetch(`/api/shrinkage/${logId}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          approvedById: currentUserId || undefined,
          action,
        }),
      });

      const data = await res.json();
      if (data.success) {
        alert(data.message || `Laporan berhasil di-${action === 'APPROVE' ? 'disetujui' : 'ditolak'}.`);

        // Instant local state update for zero lag
        setLogs((prev) =>
          prev.map((item) =>
            item.id === logId
              ? {
                  ...item,
                  status: action === 'APPROVE' ? 'APPROVED' : 'REJECTED',
                  approvedBy: { fullName: 'Owner' },
                }
              : item
          )
        );

        fetchShrinkageLogs();
        fetchProducts(); // refresh product stock
      } else {
        alert(data.message || data.error || 'Gagal memproses persetujuan.');
      }
    } catch (err: any) {
      alert(err.message || 'Terjadi kesalahan sistem saat memproses persetujuan.');
    } finally {
      setProcessingId(null);
    }
  };

  const isOwner = userRole === 'ADMIN_OWNER';

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Title Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900 border border-slate-800 p-4 rounded-2xl">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20">
              <PackageX className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">Pengurangan & Kerusakan Stok (Shrinkage)</h1>
              <p className="text-xs text-slate-400">
                Pencatatan barang rusak, kadaluarsa, atau hilang dengan alur persetujuan Admin Owner.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800 text-xs w-fit">
            {isOwner ? (
              <span className="flex items-center gap-1.5 text-amber-400 font-semibold">
                <ShieldCheck className="w-4 h-4" /> Mode Akses: Owner / Admin (Penuh)
              </span>
            ) : (
              <span className="flex items-center gap-1.5 text-slate-400">
                <Lock className="w-4 h-4 text-slate-500" /> Mode Akses: Kasir (Pengajuan Saja)
              </span>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Form Submisi */}
          <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
              <Plus className="w-5 h-5 text-rose-400" />
              <h2 className="font-bold text-white text-base">Ajukan Laporan Barang Hilang/Rusak</h2>
            </div>

            <form onSubmit={handleSubmitLog} className="space-y-4 text-xs">
              {/* Product Selector */}
              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Pilih Produk
                </label>
                <select
                  value={selectedProductId}
                  onChange={(e) => setSelectedProductId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-rose-500"
                >
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      [{p.sku}] {p.name} (Stok: {p.stock} {p.unit})
                    </option>
                  ))}
                </select>
              </div>

              {/* Quantity & Reason */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    Jumlah Rusak/Hilang
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={quantity}
                    onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-rose-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    Alasan Kerugian
                  </label>
                  <select
                    value={reason}
                    onChange={(e) => setReason(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-rose-500"
                  >
                    <option value="DAMAGED">Rusak (DAMAGED)</option>
                    <option value="EXPIRED">Kadaluarsa (EXPIRED)</option>
                    <option value="STOLEN">Hilang/Curi (STOLEN)</option>
                  </select>
                </div>
              </div>

              {/* Batch & Expiry Date (Optional) */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">No. Batch (Opsional)</label>
                  <input
                    type="text"
                    placeholder="Contoh: BATCH-092"
                    value={batchNumber}
                    onChange={(e) => setBatchNumber(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-rose-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Tgl Kadaluarsa (Opsional)</label>
                  <input
                    type="date"
                    value={expiredDate}
                    onChange={(e) => setExpiredDate(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-rose-500"
                  />
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Catatan Keterangan</label>
                <textarea
                  rows={2}
                  placeholder="Jelaskan kronologi fisik barang atau penyebab kerusakan..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white placeholder-slate-600 focus:outline-none focus:border-rose-500"
                ></textarea>
              </div>

              {/* Loss Estimation Card */}
              <div className="bg-rose-500/10 border border-rose-500/20 p-3 rounded-xl flex items-center justify-between">
                <div>
                  <span className="text-slate-400 block text-[11px]">Estimasi Total Kerugian (HPP)</span>
                  <span className="font-bold text-rose-400 text-sm font-mono">
                    Rp {estimatedTotalLoss.toLocaleString('id-ID')}
                  </span>
                </div>
                <AlertTriangle className="w-5 h-5 text-rose-400" />
              </div>

              <button
                type="submit"
                disabled={isSubmitting || !selectedProduct}
                className="w-full py-2.5 rounded-xl font-bold bg-rose-500 hover:bg-rose-400 text-slate-950 shadow-lg shadow-rose-500/20 transition flex items-center justify-center gap-2"
              >
                <PackageX className="w-4 h-4" />
                <span>Kirim Laporan Shrinkage</span>
              </button>
            </form>
          </div>

          {/* Right Column: Approval & Logs Table */}
          <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-400" />
                <h2 className="font-bold text-white text-base">
                  {isOwner ? 'Daftar & Verifikasi Owner' : 'Daftar Pengajuan Shrinkage'}
                </h2>
              </div>
              <span className="text-xs text-slate-400 bg-slate-800 px-2.5 py-1 rounded-full">
                {logs.length} Laporan
              </span>
            </div>

            <div className="flex-1 overflow-x-auto">
              {loading ? (
                <div className="flex items-center justify-center h-48 text-slate-500 text-sm">
                  Memuat daftar persetujuan...
                </div>
              ) : logs.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-48 text-slate-500 text-xs">
                  Belum ada laporan shrinkage yang dicatat.
                </div>
              ) : (
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400 uppercase text-[10px] tracking-wider">
                      <th className="pb-3 px-2">Produk & Cabang</th>
                      <th className="pb-3 px-2">Alasan & Kerugian</th>
                      <th className="pb-3 px-2">Pelapor</th>
                      <th className="pb-3 px-2">Status</th>
                      <th className="pb-3 px-2 text-right">
                        {isOwner ? 'Aksi Owner' : 'Keterangan Sesi'}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {logs.map((log) => {
                      const isItemProcessing = processingId === log.id;
                      return (
                        <tr key={log.id} className="hover:bg-slate-800/40 transition">
                          <td className="py-3 px-2">
                            <div className="font-semibold text-white">{log.product.name}</div>
                            <div className="text-[11px] text-slate-400 font-mono">
                              {log.quantity} {log.product.unit} | Cabang: {log.branch.name}
                            </div>
                          </td>
                          <td className="py-3 px-2">
                            <span className="inline-block bg-slate-800 text-slate-300 font-bold px-2 py-0.5 rounded text-[10px] mb-1">
                              {log.reason}
                            </span>
                            <div className="text-rose-400 font-mono font-semibold">
                              Rp {Number(log.totalLoss).toLocaleString('id-ID')}
                            </div>
                          </td>
                          <td className="py-3 px-2 text-slate-300">
                            <div>{log.submittedBy?.fullName || 'Kasir'}</div>
                            <div className="text-[10px] text-slate-500">
                              {new Date(log.createdAt).toLocaleDateString('id-ID')}
                            </div>
                          </td>
                          <td className="py-3 px-2">
                            {log.status === 'PENDING' && (
                              <span className="flex items-center gap-1 text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-1 rounded-full text-[10px] font-semibold w-fit">
                                <Clock className="w-3 h-3" /> PENDING
                              </span>
                            )}
                            {log.status === 'APPROVED' && (
                              <span className="flex items-center gap-1 text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-1 rounded-full text-[10px] font-semibold w-fit">
                                <CheckCircle className="w-3 h-3" /> APPROVED
                              </span>
                            )}
                            {log.status === 'REJECTED' && (
                              <span className="flex items-center gap-1 text-rose-400 bg-rose-500/10 border border-rose-500/20 px-2 py-1 rounded-full text-[10px] font-semibold w-fit">
                                <XCircle className="w-3 h-3" /> REJECTED
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-2 text-right">
                            {isOwner ? (
                              log.status === 'PENDING' ? (
                                <div className="flex items-center justify-end gap-1.5">
                                  <button
                                    disabled={isItemProcessing}
                                    onClick={() => handleApprovalAction(log.id, 'APPROVE')}
                                    className={`bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold px-2.5 py-1 rounded-lg text-[11px] transition shadow flex items-center gap-1 ${
                                      isItemProcessing ? 'opacity-50 cursor-not-allowed' : ''
                                    }`}
                                  >
                                    {isItemProcessing && (
                                      <Loader2 className="w-3 h-3 animate-spin" />
                                    )}
                                    <span>{isItemProcessing ? 'Memproses...' : 'Setujui'}</span>
                                  </button>

                                  <button
                                    disabled={isItemProcessing}
                                    onClick={() => handleApprovalAction(log.id, 'REJECT')}
                                    className={`bg-slate-800 hover:bg-rose-500 hover:text-white text-slate-300 font-semibold px-2 py-1 rounded-lg text-[11px] transition ${
                                      isItemProcessing ? 'opacity-50 cursor-not-allowed' : ''
                                    }`}
                                  >
                                    Tolak
                                  </button>
                                </div>
                              ) : (
                                <span className="text-[11px] text-slate-500 italic">
                                  Oleh {log.approvedBy?.fullName || 'Owner'}
                                </span>
                              )
                            ) : (
                              <span className="inline-block bg-slate-800/80 text-amber-300 border border-amber-500/30 px-2 py-1 rounded-lg text-[10px] font-semibold">
                                {log.status === 'PENDING' ? 'Menunggu Review Owner' : log.status}
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
      </div>
    </DashboardLayout>
  );
}
