'use client';

import React, { useState, useEffect } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import {
  Settings,
  Store,
  Award,
  DollarSign,
  Save,
  CheckCircle2,
  AlertCircle,
  ToggleLeft,
  ToggleRight,
  ShieldCheck,
  RefreshCw,
  Sparkles,
  Building2,
  Plus,
  Edit3,
  X,
  MapPin,
  Phone,
  Power,
  Warehouse,
  Building,
  Trash2,
  MoreVertical,
} from 'lucide-react';

interface Branch {
  id: string;
  code: string;
  name: string;
  address?: string | null;
  phone?: string | null;
  isWarehouse: boolean;
  isActive: boolean;
  createdAt: string;
}

export default function SettingsPage() {
  // Store & Loyalty settings state
  const [storeName, setStoreName] = useState<string>('Sekar POS Retail');
  const [pointsEarnThreshold, setPointsEarnThreshold] = useState<number>(10000);
  const [pointRedeemValue, setPointRedeemValue] = useState<number>(100);
  const [isLoyaltyActive, setIsLoyaltyActive] = useState<boolean>(true);

  // Branch Management state
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loadingBranches, setLoadingBranches] = useState<boolean>(true);
  const [isBranchModalOpen, setIsBranchModalOpen] = useState<boolean>(false);
  const [editingBranch, setEditingBranch] = useState<Branch | null>(null);
  const [branchForm, setBranchForm] = useState({
    name: '',
    code: '',
    address: '',
    phone: '',
    isWarehouse: false,
  });
  const [isSubmittingBranch, setIsSubmittingBranch] = useState<boolean>(false);
  const [branchModalError, setBranchModalError] = useState<string | null>(null);

  const [activeMenuBranchId, setActiveMenuBranchId] = useState<string | null>(null);

  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    fetchSettings();
    fetchBranches();
  }, []);

  useEffect(() => {
    const handleClickOutside = () => setActiveMenuBranchId(null);
    window.addEventListener('click', handleClickOutside);
    return () => window.removeEventListener('click', handleClickOutside);
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      setMessage(null);
      const res = await fetch('/api/settings');
      const data = await res.json();
      if (data.success && data.data) {
        setStoreName(data.data.storeName);
        setPointsEarnThreshold(data.data.pointsEarnThreshold);
        setPointRedeemValue(data.data.pointRedeemValue);
        setIsLoyaltyActive(data.data.isLoyaltyActive);
      } else {
        setMessage({ type: 'error', text: data.message || 'Gagal memuat pengaturan toko.' });
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Gagal terhubung ke server.' });
    } finally {
      setLoading(false);
    }
  };

  const fetchBranches = async () => {
    try {
      setLoadingBranches(true);
      const res = await fetch('/api/branches');
      const data = await res.json();
      if (data.success && (data.branches || data.data)) {
        setBranches(data.branches || data.data || []);
      }
    } catch (err) {
      console.error('Gagal mengambil daftar cabang:', err);
    } finally {
      setLoadingBranches(false);
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    if (!storeName.trim()) {
      setMessage({ type: 'error', text: 'Nama toko tidak boleh kosong.' });
      return;
    }
    if (pointsEarnThreshold <= 0) {
      setMessage({ type: 'error', text: 'Minimal belanja per 1 poin harus lebih dari Rp 0.' });
      return;
    }
    if (pointRedeemValue <= 0) {
      setMessage({ type: 'error', text: 'Nilai tukar rupiah per 1 poin harus lebih dari Rp 0.' });
      return;
    }

    try {
      setSaving(true);
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          storeName: storeName.trim(),
          pointsEarnThreshold: Number(pointsEarnThreshold),
          pointRedeemValue: Number(pointRedeemValue),
          isLoyaltyActive,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setMessage({ type: 'success', text: 'Pengaturan toko & konversi poin loyalitas berhasil diperbarui!' });
        window.dispatchEvent(new CustomEvent('storeSettingsChanged', { detail: { storeName: storeName.trim() } }));
      } else {
        setMessage({ type: 'error', text: data.message || 'Gagal menyimpan pengaturan toko.' });
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Terjadi kesalahan sistem saat menyimpan.' });
    } finally {
      setSaving(false);
    }
  };

  // Branch Modal Handlers
  const handleOpenAddBranch = () => {
    setEditingBranch(null);
    setBranchForm({
      name: '',
      code: `CBG-0${branches.length + 1}`,
      address: '',
      phone: '',
      isWarehouse: false,
    });
    setBranchModalError(null);
    setIsBranchModalOpen(true);
  };

  const handleOpenEditBranch = (branch: Branch) => {
    setEditingBranch(branch);
    setBranchForm({
      name: branch.name,
      code: branch.code,
      address: branch.address || '',
      phone: branch.phone || '',
      isWarehouse: branch.isWarehouse,
    });
    setBranchModalError(null);
    setIsBranchModalOpen(true);
  };

  const handleSaveBranch = async (e: React.FormEvent) => {
    e.preventDefault();
    setBranchModalError(null);

    if (!branchForm.code.trim()) {
      setBranchModalError('Kode cabang wajib diisi.');
      return;
    }
    if (!branchForm.name.trim()) {
      setBranchModalError('Nama cabang wajib diisi.');
      return;
    }
    if (!branchForm.address.trim()) {
      setBranchModalError('Alamat cabang wajib diisi.');
      return;
    }

    try {
      setIsSubmittingBranch(true);
      const isEditing = !!editingBranch;
      const url = isEditing ? `/api/branches/${editingBranch.id}` : '/api/branches';
      const method = isEditing ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: branchForm.code.trim().toUpperCase(),
          name: branchForm.name.trim(),
          address: branchForm.address.trim(),
          phone: branchForm.phone.trim() || null,
          isWarehouse: branchForm.isWarehouse,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setIsBranchModalOpen(false);
        setMessage({
          type: 'success',
          text: data.message || `Cabang "${branchForm.name}" berhasil ${isEditing ? 'diperbarui' : 'ditambahkan'}.`,
        });
        await fetchBranches();
        // Trigger event so layout header updates its branch switcher
        window.dispatchEvent(new CustomEvent('branchChanged', { detail: data.branch?.id }));
      } else {
        setBranchModalError(data.error || data.message || 'Gagal menyimpan data cabang.');
      }
    } catch (err: any) {
      setBranchModalError(err.message || 'Terjadi kesalahan sistem saat menyimpan cabang.');
    } finally {
      setIsSubmittingBranch(false);
    }
  };

  const handleToggleBranchStatus = async (branch: Branch) => {
    try {
      const res = await fetch(`/api/branches/${branch.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          isActive: !branch.isActive,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setMessage({
          type: 'success',
          text: `Status cabang "${branch.name}" berhasil diubah menjadi ${!branch.isActive ? 'Aktif' : 'Nonaktif'}.`,
        });
        await fetchBranches();
        window.dispatchEvent(new CustomEvent('branchChanged', { detail: branch.id }));
      } else {
        setMessage({ type: 'error', text: data.error || 'Gagal mengubah status cabang.' });
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Gagal mengubah status cabang.' });
    }
  };

  const handleDeleteBranch = async (branch: Branch) => {
    const confirmed = window.confirm(
      `Apakah Anda yakin ingin menghapus cabang "${branch.name}" (${branch.code})?\n\nCatatan: Cabang yang sudah memiliki riwayat transaksi tidak dapat dihapus secara permanen, melainkan harus dinonaktifkan.`
    );
    if (!confirmed) return;

    try {
      const res = await fetch(`/api/branches/${branch.id}`, {
        method: 'DELETE',
      });

      const data = await res.json();
      if (data.success) {
        setMessage({
          type: 'success',
          text: data.message || `Cabang "${branch.name}" berhasil dihapus.`,
        });
        await fetchBranches();
        window.dispatchEvent(new CustomEvent('branchChanged', { detail: branch.id }));
      } else {
        setMessage({
          type: 'error',
          text: data.error || 'Gagal menghapus cabang.',
        });
      }
    } catch (err: any) {
      setMessage({
        type: 'error',
        text: err.message || 'Terjadi kesalahan sistem saat menghapus cabang.',
      });
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto space-y-5 sm:space-y-6 pb-16">
        {/* Header Bar */}
        <div className="bg-slate-900 border border-slate-800 p-4 sm:p-6 rounded-2xl sm:rounded-3xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 shadow-xl">
          <div className="flex items-center gap-3 sm:gap-4 min-w-0">
            <div className="p-3 sm:p-3.5 rounded-2xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 shrink-0">
              <Settings className="w-6 h-6 sm:w-8 sm:h-8" />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-base sm:text-2xl font-bold text-white break-words">
                  Pengaturan Toko & Manajemen Cabang
                </h1>
                <span className="bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[10px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1 shrink-0">
                  <ShieldCheck className="w-3 h-3" />
                  Khusus Owner
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Kelola identitas ritel, aturan poin loyalitas, serta cabang dan gudang POS toko secara terpusat.
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              fetchSettings();
              fetchBranches();
            }}
            disabled={loading}
            className="w-full sm:w-auto bg-slate-800 hover:bg-slate-700 text-slate-300 px-4 py-2.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition shrink-0 min-h-[44px]"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span>Muat Ulang</span>
          </button>
        </div>

        {/* Feedback Alert */}
        {message && (
          <div
            className={`p-4 rounded-2xl border text-xs sm:text-sm flex items-center justify-between gap-3 shadow-lg ${
              message.type === 'success'
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
            }`}
          >
            <div className="flex items-center gap-3">
              {message.type === 'success' ? (
                <CheckCircle2 className="w-5 h-5 shrink-0" />
              ) : (
                <AlertCircle className="w-5 h-5 shrink-0" />
              )}
              <span className="font-medium">{message.text}</span>
            </div>
            <button
              onClick={() => setMessage(null)}
              className="p-1 rounded-lg text-slate-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Section 1: Identitas Toko */}
        <form onSubmit={handleSaveSettings} className="space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl sm:rounded-3xl p-4 sm:p-6 space-y-4 shadow-xl">
            <div className="flex items-center gap-3 border-b border-slate-800 pb-3">
              <Store className="w-5 h-5 text-indigo-400 shrink-0" />
              <div>
                <h2 className="font-bold text-white text-sm sm:text-base">Identitas Store / Toko</h2>
                <p className="text-[11px] sm:text-xs text-slate-400">
                  Nama toko yang ditampilkan di header dashboard dan struk kasir.
                </p>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Nama Utama Toko Retail
              </label>
              <input
                type="text"
                value={storeName}
                onChange={(e) => setStoreName(e.target.value)}
                placeholder="Contoh: Sekar POS Retail Balekota"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white font-medium focus:outline-none focus:border-indigo-500 transition min-h-[44px]"
              />
            </div>
          </div>

          {/* Section 2: Loyalty Point Conversion Rates */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl sm:rounded-3xl p-4 sm:p-6 space-y-4 sm:space-y-5 shadow-xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-800 pb-3 gap-3">
              <div className="flex items-center gap-3">
                <Award className="w-5 h-5 text-amber-400 shrink-0" />
                <div>
                  <h2 className="font-bold text-white text-sm sm:text-base">Aturan Konversi Poin Member</h2>
                  <p className="text-[11px] sm:text-xs text-slate-400">
                    Atur rasio perolehan dan nilai penukaran poin belanja member.
                  </p>
                </div>
              </div>

              {/* Dynamic Toggle Status */}
              <button
                type="button"
                onClick={() => setIsLoyaltyActive(!isLoyaltyActive)}
                className={`flex items-center justify-center gap-2 px-3 py-2 rounded-xl border text-xs font-bold transition min-h-[44px] shrink-0 ${
                  isLoyaltyActive
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                    : 'bg-slate-800 border-slate-700 text-slate-400'
                }`}
              >
                {isLoyaltyActive ? (
                  <>
                    <ToggleRight className="w-5 h-5 text-emerald-400" />
                    <span>Program Poin AKTIF</span>
                  </>
                ) : (
                  <>
                    <ToggleLeft className="w-5 h-5 text-slate-400" />
                    <span>Program Poin NONAKTIF</span>
                  </>
                )}
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
              {/* Field 1: Points Earn Threshold */}
              <div className="space-y-2 bg-slate-950/60 p-4 rounded-2xl border border-slate-800">
                <label className="block text-xs font-semibold text-slate-300">
                  Minimal Belanja untuk Dapatkan 1 Poin (Rp)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-mono text-slate-400">
                    Rp
                  </span>
                  <input
                    type="number"
                    value={pointsEarnThreshold}
                    onChange={(e) => setPointsEarnThreshold(Number(e.target.value))}
                    min="1"
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-3 py-2.5 text-sm text-amber-400 font-mono font-bold focus:outline-none focus:border-amber-500 min-h-[44px]"
                  />
                </div>
                <p className="text-[11px] text-slate-400">
                  Member memperoleh <strong className="text-amber-400">1 Poin</strong> tiap kelipatan <strong className="text-white">Rp {pointsEarnThreshold.toLocaleString('id-ID')}</strong>.
                </p>
              </div>

              {/* Field 2: Point Redeem Value */}
              <div className="space-y-2 bg-slate-950/60 p-4 rounded-2xl border border-slate-800">
                <label className="block text-xs font-semibold text-slate-300">
                  Nilai Diskon Rupiah per 1 Poin (Rp)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-mono text-slate-400">
                    Rp
                  </span>
                  <input
                    type="number"
                    value={pointRedeemValue}
                    onChange={(e) => setPointRedeemValue(Number(e.target.value))}
                    min="1"
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-3 py-2.5 text-sm text-emerald-400 font-mono font-bold focus:outline-none focus:border-emerald-500 min-h-[44px]"
                  />
                </div>
                <p className="text-[11px] text-slate-400">
                  <strong className="text-emerald-400">1 Poin</strong> bernilai diskon <strong className="text-white">Rp {pointRedeemValue.toLocaleString('id-ID')}</strong> di POS.
                </p>
              </div>
            </div>

            {/* Live Calculation Preview Banner */}
            <div className="bg-gradient-to-r from-indigo-950/40 via-purple-950/20 to-slate-950 p-4 rounded-2xl border border-indigo-500/20 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-3">
                <Sparkles className="w-5 h-5 text-indigo-400 shrink-0" />
                <div>
                  <span className="font-bold text-white">Simulasi Contoh Transaksi:</span>
                  <p className="text-slate-400 text-[11px]">
                    Belanja Rp 100.000 + Tukar 50 Poin member.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-4 font-mono w-full md:w-auto justify-between md:justify-end border-t md:border-t-0 border-slate-800/80 pt-2 md:pt-0">
                <div className="text-left md:text-right">
                  <span className="text-[10px] text-slate-400 block">Poin Diperoleh</span>
                  <span className="text-amber-400 font-bold">+{Math.floor(100000 / (pointsEarnThreshold || 1))} Poin</span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-slate-400 block">Potongan Diskon</span>
                  <span className="text-emerald-400 font-bold">-Rp {(50 * (pointRedeemValue || 0)).toLocaleString('id-ID')}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Submit Store & Loyalty Settings Button */}
          <div className="flex justify-end pt-1">
            <button
              type="submit"
              disabled={saving}
              className="w-full sm:w-auto bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-400 hover:to-purple-400 text-white font-bold px-8 py-3 rounded-2xl shadow-xl shadow-indigo-500/25 transition flex items-center justify-center gap-2 text-sm disabled:opacity-50 min-h-[48px]"
            >
              <Save className="w-5 h-5" />
              <span>{saving ? 'Menyimpan Pengaturan...' : 'Simpan Pengaturan Toko'}</span>
            </button>
          </div>
        </form>

        {/* Section 3: Daftar Cabang & Gudang Retail (Branch CRUD Management) */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl sm:rounded-3xl p-4 sm:p-6 space-y-4 shadow-xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <Building2 className="w-6 h-6 shrink-0" />
              </div>
              <div>
                <h2 className="font-bold text-white text-base sm:text-lg">
                  Daftar Cabang & Gudang Retail
                </h2>
                <p className="text-xs text-slate-400">
                  Kelola lokasi toko cabang, gudang pusat, dan auto-provisioning stok produk.
                </p>
              </div>
            </div>

            <button
              onClick={handleOpenAddBranch}
              className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold px-4 py-2.5 rounded-xl text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 transition min-h-[42px] shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>+ Tambah Cabang Baru</span>
            </button>
          </div>

          {/* Branch List Table / Card Grid */}
          {loadingBranches ? (
            <div className="p-8 text-center text-slate-400 text-xs flex items-center justify-center gap-2">
              <RefreshCw className="w-4 h-4 animate-spin text-emerald-400" />
              <span>Memuat daftar cabang...</span>
            </div>
          ) : branches.length === 0 ? (
            <div className="p-8 text-center text-slate-500 text-xs space-y-2">
              <Building className="w-10 h-10 mx-auto text-slate-700" />
              <p>Belum ada data cabang toko. Klik tombol "+ Tambah Cabang Baru" untuk membuat cabang pertama.</p>
            </div>
          ) : (
            <>
              {/* Desktop Table View */}
              <div className="hidden md:block overflow-x-auto min-h-[240px] pb-24">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-950/80 border-b border-slate-800 text-slate-400 font-semibold uppercase tracking-wider h-12">
                      <th className="py-3 px-4">Kode</th>
                      <th className="py-3 px-4">Nama Cabang</th>
                      <th className="py-3 px-4">Tipe</th>
                      <th className="py-3 px-4">Alamat</th>
                      <th className="py-3 px-4">No. Telp</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-center">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {branches.map((b) => (
                      <tr key={b.id} className="hover:bg-slate-800/40 transition-colors h-14">
                        <td className="py-3.5 px-4 font-mono font-bold text-emerald-400">
                          {b.code}
                        </td>
                        <td className="py-3.5 px-4 font-semibold text-white">
                          {b.name}
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          {b.isWarehouse ? (
                            <span className="inline-flex items-center gap-1 bg-amber-500/10 text-amber-400 border border-amber-500/30 px-2 py-0.5 rounded-md text-[11px] font-semibold">
                              <Warehouse className="w-3 h-3" /> Gudang Central
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 bg-teal-500/10 text-teal-400 border border-teal-500/30 px-2 py-0.5 rounded-md text-[11px] font-semibold">
                              <Building className="w-3 h-3" /> Outlet Retail
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-slate-300 max-w-xs truncate">
                          {b.address || '-'}
                        </td>
                        <td className="py-3.5 px-4 text-slate-300 font-mono">
                          {b.phone || '-'}
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          {b.isActive ? (
                            <span className="inline-flex items-center gap-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 px-2.5 py-0.5 rounded-full text-[11px] font-bold">
                              Aktif
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 bg-slate-800 text-slate-500 border border-slate-700 px-2.5 py-0.5 rounded-full text-[11px] font-bold">
                              Nonaktif
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <div className="relative inline-block text-left" onClick={(e) => e.stopPropagation()}>
                            {/* Trigger Button Titik Tiga */}
                            <button
                              type="button"
                              onClick={() => setActiveMenuBranchId(activeMenuBranchId === b.id ? null : b.id)}
                              className="p-2 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg transition-colors inline-flex items-center justify-center focus:outline-none focus:ring-1 focus:ring-slate-700"
                              aria-label="Menu Aksi"
                            >
                              <MoreVertical className="w-4 h-4" />
                            </button>

                            {/* Floating Dropdown Menu */}
                            {activeMenuBranchId === b.id && (
                              <div className="absolute right-0 top-full mt-1 z-50 w-44 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl py-1.5 backdrop-blur-md animate-in fade-in-0 zoom-in-95 text-left divide-y divide-slate-800/60">
                                <div className="py-1">
                                  {/* Edit Option */}
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setActiveMenuBranchId(null);
                                      handleOpenEditBranch(b);
                                    }}
                                    className="w-full px-3.5 py-2 text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-800 flex items-center gap-2.5 transition-colors"
                                  >
                                    <Edit3 className="w-3.5 h-3.5 text-slate-400" />
                                    <span>Edit Cabang</span>
                                  </button>

                                  {/* Toggle Active / Nonaktif Option */}
                                  <button
                                    type="button"
                                    onClick={async () => {
                                      setActiveMenuBranchId(null);
                                      await handleToggleBranchStatus(b);
                                    }}
                                    className={`w-full px-3.5 py-2 text-xs font-medium flex items-center gap-2.5 hover:bg-slate-800 transition-colors ${
                                      b.isActive ? 'text-amber-400 hover:text-amber-300' : 'text-emerald-400 hover:text-emerald-300'
                                    }`}
                                  >
                                    <Power className="w-3.5 h-3.5" />
                                    <span>{b.isActive ? 'Nonaktifkan Cabang' : 'Aktifkan Cabang'}</span>
                                  </button>
                                </div>

                                {/* Delete Option */}
                                <div className="py-1">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setActiveMenuBranchId(null);
                                      handleDeleteBranch(b);
                                    }}
                                    className="w-full px-3.5 py-2 text-xs font-medium text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 flex items-center gap-2.5 transition-colors"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                    <span>Hapus Cabang</span>
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Card View */}
              <div className="md:hidden space-y-3">
                {branches.map((b) => (
                  <div key={b.id} className="p-4 bg-slate-950 border border-slate-800 rounded-2xl space-y-2.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-xs bg-slate-900 border border-slate-800 px-2 py-0.5 rounded text-emerald-400">
                          {b.code}
                        </span>
                        <h4 className="font-bold text-white text-sm">{b.name}</h4>
                      </div>
                      {b.isActive ? (
                        <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold px-2 py-0.5 rounded-full">
                          Aktif
                        </span>
                      ) : (
                        <span className="bg-slate-800 text-slate-500 border border-slate-700 text-[10px] font-bold px-2 py-0.5 rounded-full">
                          Nonaktif
                        </span>
                      )}
                    </div>

                    <div className="text-xs space-y-1 text-slate-400">
                      <div className="flex items-start gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-slate-500 shrink-0 mt-0.5" />
                        <span>{b.address || 'Alamat belum diatur'}</span>
                      </div>
                      {b.phone && (
                        <div className="flex items-center gap-1.5 font-mono">
                          <Phone className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                          <span>{b.phone}</span>
                        </div>
                      )}
                    </div>

                    <div className="pt-2 border-t border-slate-800 flex items-center justify-between gap-2 relative" onClick={(e) => e.stopPropagation()}>
                      <span className="text-[11px] text-slate-500">
                        {b.isWarehouse ? 'Gudang Central' : 'Outlet Retail'}
                      </span>

                      {/* Mobile Three-Dot Menu */}
                      <div>
                        <button
                          type="button"
                          onClick={() => setActiveMenuBranchId(activeMenuBranchId === b.id ? null : b.id)}
                          className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg transition-colors inline-flex items-center justify-center focus:outline-none"
                          aria-label="Menu Aksi"
                        >
                          <MoreVertical className="w-4 h-4" />
                        </button>

                        {activeMenuBranchId === b.id && (
                          <div className="absolute right-0 bottom-10 z-30 w-44 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl py-1.5 text-left divide-y divide-slate-800/60">
                            <div className="py-1">
                              <button
                                type="button"
                                onClick={() => {
                                  setActiveMenuBranchId(null);
                                  handleOpenEditBranch(b);
                                }}
                                className="w-full px-3.5 py-2 text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-800 flex items-center gap-2.5 transition-colors"
                              >
                                <Edit3 className="w-3.5 h-3.5 text-slate-400" />
                                <span>Edit Cabang</span>
                              </button>

                              <button
                                type="button"
                                onClick={async () => {
                                  setActiveMenuBranchId(null);
                                  await handleToggleBranchStatus(b);
                                }}
                                className={`w-full px-3.5 py-2 text-xs font-medium flex items-center gap-2.5 hover:bg-slate-800 transition-colors ${
                                  b.isActive ? 'text-amber-400 hover:text-amber-300' : 'text-emerald-400 hover:text-emerald-300'
                                }`}
                              >
                                <Power className="w-3.5 h-3.5" />
                                <span>{b.isActive ? 'Nonaktifkan Cabang' : 'Aktifkan Cabang'}</span>
                              </button>
                            </div>

                            <div className="py-1">
                              <button
                                type="button"
                                onClick={() => {
                                  setActiveMenuBranchId(null);
                                  handleDeleteBranch(b);
                                }}
                                className="w-full px-3.5 py-2 text-xs font-medium text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 flex items-center gap-2.5 transition-colors"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                <span>Hapus Cabang</span>
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Modal Form: Add / Edit Branch */}
      {isBranchModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl space-y-4 p-6">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm sm:text-base">
                <Building2 className="w-5 h-5" />
                <span>{editingBranch ? 'Edit Data Cabang' : 'Tambah Cabang Retail Baru'}</span>
              </div>
              <button
                onClick={() => {
                  setIsBranchModalOpen(false);
                  setBranchModalError(null);
                }}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {branchModalError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-medium">
                {branchModalError}
              </div>
            )}

            <form onSubmit={handleSaveBranch} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    Kode Cabang (Unique Uppercase)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. CBG-02"
                    value={branchForm.code}
                    onChange={(e) => setBranchForm({ ...branchForm, code: e.target.value.toUpperCase() })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-white font-mono uppercase focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    Tipe Operasional
                  </label>
                  <select
                    value={branchForm.isWarehouse ? 'WAREHOUSE' : 'STORE'}
                    onChange={(e) => setBranchForm({ ...branchForm, isWarehouse: e.target.value === 'WAREHOUSE' })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="STORE">Outlet Retail (Toko)</option>
                    <option value="WAREHOUSE">Gudang Central (Warehouse)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Nama Cabang / Outlet
                </label>
                <input
                  type="text"
                  placeholder="e.g. Kios Sekar Cabang Cikokol"
                  value={branchForm.name}
                  onChange={(e) => setBranchForm({ ...branchForm, name: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Alamat Lengkap
                </label>
                <textarea
                  rows={3}
                  placeholder="Masukkan alamat lengkap lokasi cabang..."
                  value={branchForm.address}
                  onChange={(e) => setBranchForm({ ...branchForm, address: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  No. Telepon / HP (Opsional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. 081234567890"
                  value={branchForm.phone}
                  onChange={(e) => setBranchForm({ ...branchForm, phone: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-white font-mono placeholder-slate-600 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsBranchModalOpen(false);
                    setBranchModalError(null);
                  }}
                  className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold py-2.5 rounded-xl transition"
                >
                  Batal
                </button>

                <button
                  type="submit"
                  disabled={isSubmittingBranch}
                  className="flex-1 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold py-2.5 rounded-xl shadow-lg shadow-emerald-500/20 transition disabled:opacity-50"
                >
                  {isSubmittingBranch ? 'Memproses...' : editingBranch ? 'Simpan Perubahan' : 'Buat Cabang Baru'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
