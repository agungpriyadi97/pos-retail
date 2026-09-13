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
} from 'lucide-react';

export default function SettingsPage() {
  const [storeName, setStoreName] = useState<string>('Sekar POS Retail');
  const [pointsEarnThreshold, setPointsEarnThreshold] = useState<number>(10000);
  const [pointRedeemValue, setPointRedeemValue] = useState<number>(100);
  const [isLoyaltyActive, setIsLoyaltyActive] = useState<boolean>(true);

  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    fetchSettings();
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

  const handleSave = async (e: React.FormEvent) => {
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

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-4 sm:space-y-6 pb-12">
        {/* Header Bar */}
        <div className="bg-slate-900 border border-slate-800 p-4 sm:p-6 rounded-2xl sm:rounded-3xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 shadow-xl">
          <div className="flex items-center gap-3 sm:gap-4 min-w-0">
            <div className="p-3 sm:p-3.5 rounded-2xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 shrink-0">
              <Settings className="w-6 h-6 sm:w-8 sm:h-8" />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-base sm:text-2xl font-bold text-white break-words">Pengaturan Toko & Konversi Poin</h1>
                <span className="bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[10px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1 shrink-0">
                  <ShieldCheck className="w-3 h-3" />
                  Khusus Owner
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Kelola identitas ritel toko dan aturan nilai tukar poin loyalitas member secara terpusat.
              </p>
            </div>
          </div>

          <button
            onClick={fetchSettings}
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
            className={`p-4 rounded-2xl border text-xs sm:text-sm flex items-center gap-3 shadow-lg ${
              message.type === 'success'
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
            }`}
          >
            {message.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 shrink-0" />
            )}
            <span className="font-medium">{message.text}</span>
          </div>
        )}

        {/* Configuration Form */}
        <form onSubmit={handleSave} className="space-y-4 sm:space-y-6">
          {/* Section 1: Identitas Toko */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl sm:rounded-3xl p-4 sm:p-6 space-y-4 shadow-xl">
            <div className="flex items-center gap-3 border-b border-slate-800 pb-3">
              <Store className="w-5 h-5 text-indigo-400 shrink-0" />
              <div>
                <h2 className="font-bold text-white text-sm sm:text-base">Identitas Store / Toko</h2>
                <p className="text-[11px] sm:text-xs text-slate-400">Nama toko yang ditampilkan di dashboard dan tercetak di struk kasir.</p>
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
                  <p className="text-[11px] sm:text-xs text-slate-400">Atur rasio perolehan dan nilai penukaran poin belanja member.</p>
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
                  Member akan memperoleh <strong className="text-amber-400">1 Poin</strong> setiap transaksi kelipatan <strong className="text-white">Rp {pointsEarnThreshold.toLocaleString('id-ID')}</strong>.
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
                  <strong className="text-emerald-400">1 Poin</strong> bernilai diskon sebesar <strong className="text-white">Rp {pointRedeemValue.toLocaleString('id-ID')}</strong> saat ditukarkan di POS kasir.
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

          {/* Submit Button */}
          <div className="flex justify-end pt-2">
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
      </div>
    </DashboardLayout>
  );
}
