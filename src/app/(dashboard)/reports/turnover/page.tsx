'use client';

import React, { useState, useEffect } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import {
  TrendingUp,
  Zap,
  CheckCircle2,
  AlertCircle,
  XOctagon,
  RefreshCw,
  ArrowUpDown,
} from 'lucide-react';

interface TurnoverReportItem {
  productId: string;
  sku: string;
  barcode: string;
  name: string;
  category: string;
  unit: string;
  costPrice: number;
  sellingPrice: number;
  currentStock: number;
  sales7Days: number;
  weeklyVelocity: number;
  weeksOfSupply: number | string;
  classification: 'FAST_MOVING' | 'MEDIUM_MOVING' | 'SLOW_MOVING' | 'DEAD_STOCK';
  recommendation: string;
}

export default function InventoryTurnoverPage() {
  const [branchId, setBranchId] = useState<string>('');
  const [reportData, setReportData] = useState<TurnoverReportItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const storedBranch = localStorage.getItem('selectedBranchId') || '';
    setBranchId(storedBranch);

    const handleBranchChange = (e: any) => {
      setBranchId(e.detail);
    };

    window.addEventListener('branchChanged', handleBranchChange);
    return () => window.removeEventListener('branchChanged', handleBranchChange);
  }, []);

  useEffect(() => {
    fetchTurnoverReport();
  }, [branchId]);

  const fetchTurnoverReport = async () => {
    try {
      setLoading(true);
      const url = new URL('/api/reports/turnover', window.location.origin);
      if (branchId) url.searchParams.append('branchId', branchId);
      const res = await fetch(url.toString());
      const data = await res.json();
      if (data.success) {
        setReportData(data.data);
      }
    } catch (err) {
      console.error('Failed to load turnover report', err);
    } finally {
      setLoading(false);
    }
  };

  const fastMovingCount = reportData.filter((i) => i.classification === 'FAST_MOVING').length;
  const mediumMovingCount = reportData.filter((i) => i.classification === 'MEDIUM_MOVING').length;
  const slowMovingCount = reportData.filter((i) => i.classification === 'SLOW_MOVING').length;
  const deadStockCount = reportData.filter((i) => i.classification === 'DEAD_STOCK').length;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Title Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900 border border-slate-800 p-4 rounded-2xl">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
              <TrendingUp className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">Analisis Rotasi Stok (Weeks of Supply)</h1>
              <p className="text-xs text-slate-400">
                Laporan kecepatan penjualan 7 hari, klasifikasi rotasi inventory, dan rekomendasi restock otomatis.
              </p>
            </div>
          </div>
          <button
            onClick={fetchTurnoverReport}
            className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition w-fit"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Perbarui Data</span>
          </button>
        </div>

        {/* Metric Summary Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex items-center justify-between">
            <div>
              <div className="text-xs text-slate-400 font-medium">Fast Moving (&lt; 2 Pekan)</div>
              <div className="text-2xl font-bold text-emerald-400 font-mono mt-1">
                {fastMovingCount} SKU
              </div>
            </div>
            <Zap className="w-8 h-8 text-emerald-500/20" />
          </div>

          <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex items-center justify-between">
            <div>
              <div className="text-xs text-slate-400 font-medium">Medium (2 - 4 Pekan)</div>
              <div className="text-2xl font-bold text-blue-400 font-mono mt-1">
                {mediumMovingCount} SKU
              </div>
            </div>
            <CheckCircle2 className="w-8 h-8 text-blue-500/20" />
          </div>

          <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex items-center justify-between">
            <div>
              <div className="text-xs text-slate-400 font-medium">Slow Moving (&gt; 4 Pekan)</div>
              <div className="text-2xl font-bold text-amber-400 font-mono mt-1">
                {slowMovingCount} SKU
              </div>
            </div>
            <AlertCircle className="w-8 h-8 text-amber-500/20" />
          </div>

          <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex items-center justify-between">
            <div>
              <div className="text-xs text-slate-400 font-medium">Dead Stock (0 Penjualan)</div>
              <div className="text-2xl font-bold text-rose-400 font-mono mt-1">
                {deadStockCount} SKU
              </div>
            </div>
            <XOctagon className="w-8 h-8 text-rose-500/20" />
          </div>
        </div>

        {/* Velocity Turnover Main Table */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
            <h2 className="font-bold text-white text-base">Matriks Kecepatan Penjualan Per SKU</h2>
            <span className="text-xs text-slate-400 bg-slate-800 px-3 py-1 rounded-full font-mono">
              Formula: WoS = Stok Saat Ini / Penjualan 7 Hari
            </span>
          </div>

          <div className="overflow-x-auto">
            {loading ? (
              <div className="flex items-center justify-center h-48 text-slate-500 text-sm">
                Menghitung kecepatan rotasi produk...
              </div>
            ) : reportData.length === 0 ? (
              <div className="flex items-center justify-center h-48 text-slate-500 text-xs">
                Tidak ada data rotasi produk.
              </div>
            ) : (
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 uppercase text-[10px] tracking-wider">
                    <th className="pb-3 px-3">Produk & SKU</th>
                    <th className="pb-3 px-3">Kategori</th>
                    <th className="pb-3 px-3 text-right">Stok Fisik</th>
                    <th className="pb-3 px-3 text-right">Penjualan 7 Hari</th>
                    <th className="pb-3 px-3 text-center">Weeks of Supply (WoS)</th>
                    <th className="pb-3 px-3">Klasifikasi Rotasi</th>
                    <th className="pb-3 px-3">Rekomendasi Tindakan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {reportData.map((item) => (
                    <tr key={item.productId} className="hover:bg-slate-800/40 transition">
                      <td className="py-3.5 px-3">
                        <div className="font-semibold text-white">{item.name}</div>
                        <div className="text-[11px] text-slate-400 font-mono">
                          SKU: {item.sku} | Barcode: {item.barcode}
                        </div>
                      </td>
                      <td className="py-3.5 px-3 text-slate-300">
                        <span className="bg-slate-800 px-2 py-0.5 rounded text-[11px]">
                          {item.category}
                        </span>
                      </td>
                      <td className="py-3.5 px-3 text-right font-mono font-bold text-white">
                        {item.currentStock} {item.unit}
                      </td>
                      <td className="py-3.5 px-3 text-right font-mono font-bold text-emerald-400">
                        {item.sales7Days} {item.unit}
                      </td>
                      <td className="py-3.5 px-3 text-center font-mono font-bold">
                        <span className="bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800 text-slate-200">
                          {item.weeksOfSupply} {typeof item.weeksOfSupply === 'number' ? 'Minggu' : ''}
                        </span>
                      </td>
                      <td className="py-3.5 px-3">
                        {item.classification === 'FAST_MOVING' && (
                          <span className="inline-flex items-center gap-1.5 text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2.5 py-1 rounded-full text-[11px] font-bold">
                            <Zap className="w-3.5 h-3.5" /> FAST MOVING
                          </span>
                        )}
                        {item.classification === 'MEDIUM_MOVING' && (
                          <span className="inline-flex items-center gap-1.5 text-blue-400 bg-blue-500/10 border border-blue-500/30 px-2.5 py-1 rounded-full text-[11px] font-bold">
                            <CheckCircle2 className="w-3.5 h-3.5" /> MEDIUM
                          </span>
                        )}
                        {item.classification === 'SLOW_MOVING' && (
                          <span className="inline-flex items-center gap-1.5 text-amber-400 bg-amber-500/10 border border-amber-500/30 px-2.5 py-1 rounded-full text-[11px] font-bold">
                            <AlertCircle className="w-3.5 h-3.5" /> SLOW MOVING
                          </span>
                        )}
                        {item.classification === 'DEAD_STOCK' && (
                          <span className="inline-flex items-center gap-1.5 text-rose-400 bg-rose-500/10 border border-rose-500/30 px-2.5 py-1 rounded-full text-[11px] font-bold">
                            <XOctagon className="w-3.5 h-3.5" /> DEAD STOCK
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-3 text-slate-300">
                        <p className="text-[11px] leading-tight">{item.recommendation}</p>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
