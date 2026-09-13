'use client';

import React, { useState, useEffect } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { DEFAULT_POINT_VALUE_RUPIAH } from '@/lib/loyalty';
import {
  Users,
  UserPlus,
  Search,
  Award,
  DollarSign,
  TrendingUp,
  Receipt,
  RefreshCw,
  X,
  AlertCircle,
  Phone,
  Calendar,
  ChevronRight,
  Sparkles,
} from 'lucide-react';

interface Member {
  id: string;
  phone: string;
  fullName: string;
  points: number;
  totalSpend: number;
  createdAt: string;
}

interface MemberDetail extends Member {
  transactions: {
    id: string;
    invoiceNo: string;
    branchName: string;
    finalAmount: number;
    pointsEarned: number;
    pointsUsed: number;
    createdAt: string;
  }[];
}

export default function MembersPage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [pointRedeemValue, setPointRedeemValue] = useState<number>(DEFAULT_POINT_VALUE_RUPIAH);
  const [isLoyaltyActive, setIsLoyaltyActive] = useState<boolean>(true);

  // Add Member Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [phoneInput, setPhoneInput] = useState<string>('');
  const [nameInput, setNameInput] = useState<string>('');
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Member History Modal State
  const [selectedMemberDetail, setSelectedMemberDetail] = useState<MemberDetail | null>(null);
  const [loadingHistory, setLoadingHistory] = useState<boolean>(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  useEffect(() => {
    fetchMembers();
  }, [searchQuery]);

  const fetchSettings = async () => {
    try {
      const res = await fetch('/api/settings');
      const data = await res.json();
      if (data.success && data.data) {
        setPointRedeemValue(data.data.pointRedeemValue);
        setIsLoyaltyActive(data.data.isLoyaltyActive);
      }
    } catch (err) {
      console.error('Failed to fetch store settings', err);
    }
  };

  const fetchMembers = async () => {
    try {
      setLoading(true);
      const url = new URL('/api/members', window.location.origin);
      if (searchQuery) url.searchParams.append('search', searchQuery);

      const res = await fetch(url.toString());
      const data = await res.json();
      if (data.success) {
        setMembers(data.data);
      }
    } catch (err) {
      console.error('Failed to fetch members', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateMember = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const cleanPhone = phoneInput.replace(/\D/g, '');
    if (!cleanPhone || cleanPhone.length < 9) {
      setFormError('Nomor HP/WhatsApp minimal 9 digit angka.');
      return;
    }
    if (!nameInput.trim() || nameInput.trim().length < 2) {
      setFormError('Nama lengkap pelanggan minimal 2 karakter.');
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await fetch('/api/members', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: cleanPhone,
          fullName: nameInput.trim(),
        }),
      });

      const data = await res.json();
      if (data.success) {
        alert(`Member "${data.data.fullName}" berhasil terdaftar!`);
        setIsAddModalOpen(false);
        setPhoneInput('');
        setNameInput('');
        await fetchMembers();
      } else {
        setFormError(data.message || 'Gagal mendaftarkan member.');
      }
    } catch (err: any) {
      setFormError(err.message || 'Terjadi kesalahan sistem.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleViewMemberHistory = async (memberId: string) => {
    try {
      setLoadingHistory(true);
      const res = await fetch(`/api/members/${memberId}`);
      const data = await res.json();
      if (data.success) {
        setSelectedMemberDetail(data.data);
      } else {
        alert(data.message || 'Gagal mengambil riwayat transaksi member.');
      }
    } catch (err) {
      console.error('Failed to load member history', err);
    } finally {
      setLoadingHistory(false);
    }
  };

  // Summary Metrics
  const totalMembers = members.length;
  const totalPoints = members.reduce((acc, m) => acc + m.points, 0);
  const totalPointsValuation = totalPoints * pointRedeemValue;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Title Bar & Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900 border border-slate-800 p-4 rounded-2xl">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">Program Loyalitas & Member Retail</h1>
              <p className="text-xs text-slate-400">
                Pendaftaran member pelanggan, perolehan poin belanja, tukar poin diskon, dan riwayat transaksi.
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              setFormError(null);
              setIsAddModalOpen(true);
            }}
            className="bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-400 hover:to-purple-400 text-white font-bold px-4 py-2.5 rounded-xl flex items-center gap-2 text-xs shadow-lg shadow-indigo-500/20 transition shrink-0"
          >
            <UserPlus className="w-4 h-4" />
            <span>Tambah Member Manual</span>
          </button>
        </div>

        {/* KPI Cards Header */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex items-center gap-4 shadow-lg">
            <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs text-slate-400 font-medium">Total Member Terdaftar</p>
              <h3 className="text-2xl font-bold text-white font-mono">{totalMembers} <span className="text-xs font-normal text-slate-400">Pelanggan</span></h3>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex items-center gap-4 shadow-lg">
            <div className="p-3 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <Award className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs text-slate-400 font-medium">Akumulasi Poin Beredar</p>
              <h3 className="text-2xl font-bold text-amber-400 font-mono">{totalPoints.toLocaleString('id-ID')} <span className="text-xs font-normal text-slate-400">Poin</span></h3>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex items-center gap-4 shadow-lg">
            <div className="p-3 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <DollarSign className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs text-slate-400 font-medium">Estimasi Nilai Poin Beredar</p>
              <h3 className="text-2xl font-bold text-indigo-400 font-mono">Rp {totalPointsValuation.toLocaleString('id-ID')}</h3>
            </div>
          </div>
        </div>

        {/* Toolbar & Search */}
        <div className="flex flex-col sm:flex-row items-center gap-3 bg-slate-900 border border-slate-800 p-3 rounded-2xl">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Cari member berdasarkan No WhatsApp / HP atau Nama Lengkap..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <button
            onClick={fetchMembers}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
            title="Perbarui Data"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Member Table */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
            <h2 className="font-bold text-white text-base">Daftar Member Loyalitas Sekar POS</h2>
            <span className="text-xs text-slate-400 bg-slate-800 px-3 py-1 rounded-full font-mono">
              {members.length} Member Ditampilkan
            </span>
          </div>

          <div className="overflow-x-auto">
            {loading ? (
              <div className="flex items-center justify-center h-48 text-slate-500 text-sm">
                Memuat daftar member pelanggan...
              </div>
            ) : members.length === 0 ? (
              <div className="flex items-center justify-center h-48 text-slate-500 text-xs">
                Tidak ada member ditemukan.
              </div>
            ) : (
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 uppercase text-[10px] tracking-wider">
                    <th className="pb-3 px-3">Member Pelanggan</th>
                    <th className="pb-3 px-3">No. WhatsApp / HP</th>
                    <th className="pb-3 px-3">Tanggal Bergabung</th>
                    <th className="pb-3 px-3 text-right">Saldo Poin</th>
                    <th className="pb-3 px-3 text-right">Nilai Diskon (Rp)</th>
                    <th className="pb-3 px-3 text-right">Total Belanja (Rp)</th>
                    <th className="pb-3 px-3 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {members.map((member) => {
                    const pointsValuation = member.points * pointRedeemValue;
                    return (
                      <tr key={member.id} className="hover:bg-slate-800/40 transition">
                        <td className="py-3 px-3">
                          <div className="font-bold text-white text-sm">{member.fullName}</div>
                          <div className="text-[10px] text-indigo-400 font-mono">ID: {member.id.slice(-8)}</div>
                        </td>
                        <td className="py-3 px-3 font-mono text-slate-300">
                          {member.phone}
                        </td>
                        <td className="py-3 px-3 text-slate-400 font-mono text-[11px]">
                          {new Date(member.createdAt).toLocaleDateString('id-ID', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </td>
                        <td className="py-3 px-3 text-right font-mono font-bold text-amber-400 text-sm">
                          {member.points.toLocaleString('id-ID')} Poin
                        </td>
                        <td className="py-3 px-3 text-right font-mono text-emerald-400 font-semibold">
                          Rp {pointsValuation.toLocaleString('id-ID')}
                        </td>
                        <td className="py-3 px-3 text-right font-mono font-bold text-white">
                          Rp {member.totalSpend.toLocaleString('id-ID')}
                        </td>
                        <td className="py-3 px-3 text-center">
                          <button
                            onClick={() => handleViewMemberHistory(member.id)}
                            className="bg-slate-800 hover:bg-slate-700 text-slate-200 px-3 py-1.5 rounded-xl text-[11px] font-semibold transition flex items-center gap-1 mx-auto"
                          >
                            <Receipt className="w-3.5 h-3.5 text-indigo-400" />
                            <span>Riwayat</span>
                          </button>
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

      {/* Modal: Tambah Member Baru Manual */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2 text-indigo-400 font-bold text-base">
                <UserPlus className="w-5 h-5" />
                <span>Pendaftaran Member Baru</span>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
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

            <form onSubmit={handleCreateMember} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  No. WhatsApp / HP Pelanggan
                </label>
                <input
                  type="text"
                  placeholder="Contoh: 081234567890"
                  value={phoneInput}
                  onChange={(e) => setPhoneInput(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-white font-mono focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Nama Lengkap Pelanggan
                </label>
                <input
                  type="text"
                  placeholder="Contoh: Budi Santoso"
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold py-2.5 rounded-xl transition"
                >
                  Batal
                </button>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2.5 rounded-xl shadow-lg shadow-indigo-600/20 transition flex items-center justify-center gap-2"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>{isSubmitting ? 'Mendaftarkan...' : 'Daftarkan Member'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Riwayat Belanja Member */}
      {selectedMemberDetail && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="font-bold text-white text-base">
                  Riwayat Belanja: {selectedMemberDetail.fullName}
                </h3>
                <p className="text-xs text-slate-400 font-mono">
                  No HP: {selectedMemberDetail.phone} | Saldo Poin: {selectedMemberDetail.points} Poin
                </p>
              </div>
              <button
                onClick={() => setSelectedMemberDetail(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="overflow-y-auto max-h-96">
              {selectedMemberDetail.transactions.length === 0 ? (
                <div className="text-center text-slate-500 text-xs py-8">
                  Member belum memiliki riwayat transaksi belanja.
                </div>
              ) : (
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400 uppercase text-[10px]">
                      <th className="pb-2 px-2">No. Faktur</th>
                      <th className="pb-2 px-2">Cabang</th>
                      <th className="pb-2 px-2">Waktu</th>
                      <th className="pb-2 px-2 text-right">Total Transaksi</th>
                      <th className="pb-2 px-2 text-right">Poin Diperoleh</th>
                      <th className="pb-2 px-2 text-right">Poin Ditukar</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {selectedMemberDetail.transactions.map((tx) => (
                      <tr key={tx.id} className="hover:bg-slate-800/40">
                        <td className="py-2.5 px-2 font-mono text-emerald-400 font-semibold">
                          {tx.invoiceNo}
                        </td>
                        <td className="py-2.5 px-2 text-slate-300">{tx.branchName}</td>
                        <td className="py-2.5 px-2 text-slate-400 font-mono text-[11px]">
                          {new Date(tx.createdAt).toLocaleString('id-ID', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </td>
                        <td className="py-2.5 px-2 text-right font-mono font-bold text-white">
                          Rp {tx.finalAmount.toLocaleString('id-ID')}
                        </td>
                        <td className="py-2.5 px-2 text-right font-mono font-bold text-amber-400">
                          +{tx.pointsEarned} Poin
                        </td>
                        <td className="py-2.5 px-2 text-right font-mono font-bold text-rose-400">
                          {tx.pointsUsed > 0 ? `-${tx.pointsUsed} Poin` : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <div className="pt-3 border-t border-slate-800 flex justify-end">
              <button
                onClick={() => setSelectedMemberDetail(null)}
                className="bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold px-4 py-2 rounded-xl text-xs"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
