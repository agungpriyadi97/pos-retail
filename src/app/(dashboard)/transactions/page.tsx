'use client';

import React, { useState, useEffect, useCallback } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import ThermalReceipt from '@/components/pos/ThermalReceipt';
import {
  Receipt,
  Calendar,
  Filter,
  Search,
  DollarSign,
  ShoppingBag,
  TrendingUp,
  Tag,
  Eye,
  RefreshCw,
  CreditCard,
  Banknote,
  QrCode,
  ArrowRight,
  User,
  Building2,
  ChevronRight,
  Clock,
} from 'lucide-react';

interface TransactionItem {
  id: string;
  quantity: number;
  costPrice: number;
  sellingPrice: number;
  subtotal: number;
  product: {
    id: string;
    name: string;
    barcode: string;
    sku: string;
    unit: string;
  };
}

interface TransactionData {
  id: string;
  invoiceNo: string;
  branchId: string;
  cashierId: string;
  memberId?: string | null;
  subtotal: number;
  discountAmount: number;
  pointsUsed: number;
  pointDiscount: number;
  totalDiscount: number;
  finalAmount: number;
  paidAmount: number;
  changeAmount: number;
  paymentMethod: 'CASH' | 'QRIS' | 'TRANSFER' | 'DEBIT';
  pointsEarned: number;
  createdAt: string;
  branch: {
    id: string;
    name: string;
    address?: string | null;
    phone?: string | null;
  };
  cashier: {
    id: string;
    name: string;
    fullName: string;
    username: string;
  };
  user?: {
    id: string;
    name: string;
    fullName: string;
    username: string;
  };
  member?: {
    id: string;
    name: string;
    fullName: string;
    phone: string;
    points: number;
  } | null;
  items: TransactionItem[];
}

interface SummaryMetrics {
  totalRevenue: number;
  totalDiscount: number;
  totalTransactions: number;
  averageBasketSize: number;
}

type PeriodFilter = 'day' | 'week' | 'month' | 'year' | 'custom';

export default function TransactionsPage() {
  const [period, setPeriod] = useState<PeriodFilter>('day');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [paymentMethodFilter, setPaymentMethodFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [branchId, setBranchId] = useState<string>('');

  const [transactions, setTransactions] = useState<TransactionData[]>([]);
  const [summary, setSummary] = useState<SummaryMetrics>({
    totalRevenue: 0,
    totalDiscount: 0,
    totalTransactions: 0,
    averageBasketSize: 0,
  });

  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Receipt Modal State
  const [selectedTransaction, setSelectedTransaction] = useState<TransactionData | null>(null);
  const [isReceiptOpen, setIsReceiptOpen] = useState<boolean>(false);

  // Initialize dates for custom filter default
  useEffect(() => {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    const todayStr = `${yyyy}-${mm}-${dd}`;
    setStartDate(todayStr);
    setEndDate(todayStr);

    const storedBranch = localStorage.getItem('selectedBranchId') || '';
    setBranchId(storedBranch);

    const handleBranchChange = (e: any) => {
      setBranchId(e.detail);
    };

    window.addEventListener('branchChanged', handleBranchChange);
    return () => window.removeEventListener('branchChanged', handleBranchChange);
  }, []);

  const fetchTransactions = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const url = new URL('/api/transactions', window.location.origin);
      url.searchParams.append('period', period);
      if (branchId) url.searchParams.append('branchId', branchId);
      if (paymentMethodFilter !== 'ALL') {
        url.searchParams.append('paymentMethod', paymentMethodFilter);
      }

      if (period === 'custom') {
        if (startDate) url.searchParams.append('startDate', startDate);
        if (endDate) url.searchParams.append('endDate', endDate);
      }

      const res = await fetch(url.toString());
      const data = await res.json();

      if (data.success) {
        setTransactions(data.transactions || []);
        setSummary(
          data.summary || {
            totalRevenue: 0,
            totalDiscount: 0,
            totalTransactions: 0,
            averageBasketSize: 0,
          }
        );
      } else {
        setError(data.error || 'Gagal memuat data transaksi');
      }
    } catch (err: any) {
      console.error('Failed to load transactions:', err);
      setError(err.message || 'Terjadi kesalahan koneksi sistem');
    } finally {
      setLoading(false);
    }
  }, [period, startDate, endDate, paymentMethodFilter, branchId]);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  const handleOpenReceipt = async (tx: TransactionData) => {
    try {
      // Fetch fresh detail to ensure all items are populated
      const res = await fetch(`/api/transactions/${tx.id}`);
      const data = await res.json();
      if (data.success && data.transaction) {
        setSelectedTransaction(data.transaction);
      } else {
        setSelectedTransaction(tx);
      }
    } catch (err) {
      console.error('Error loading transaction detail:', err);
      setSelectedTransaction(tx);
    } finally {
      setIsReceiptOpen(true);
    }
  };

  const formatCurrency = (amount: number) => {
    return 'Rp ' + Number(amount).toLocaleString('id-ID');
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const filteredTransactions = transactions.filter((tx) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const invMatch = tx.invoiceNo.toLowerCase().includes(q);
    const cashierMatch = (tx.cashier?.fullName || tx.user?.name || '').toLowerCase().includes(q);
    const memberMatch = (tx.member?.fullName || tx.member?.phone || '').toLowerCase().includes(q);
    return invMatch || cashierMatch || memberMatch;
  });

  const getPaymentBadge = (method: string) => {
    switch (method) {
      case 'CASH':
        return (
          <span className="inline-flex items-center gap-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 px-2.5 py-1 rounded-full text-xs font-semibold">
            <Banknote className="w-3.5 h-3.5" />
            Cash
          </span>
        );
      case 'QRIS':
        return (
          <span className="inline-flex items-center gap-1 bg-sky-500/10 text-sky-400 border border-sky-500/30 px-2.5 py-1 rounded-full text-xs font-semibold">
            <QrCode className="w-3.5 h-3.5" />
            QRIS
          </span>
        );
      case 'TRANSFER':
        return (
          <span className="inline-flex items-center gap-1 bg-indigo-500/10 text-indigo-400 border border-indigo-500/30 px-2.5 py-1 rounded-full text-xs font-semibold">
            <ArrowRight className="w-3.5 h-3.5" />
            Transfer
          </span>
        );
      case 'DEBIT':
        return (
          <span className="inline-flex items-center gap-1 bg-amber-500/10 text-amber-400 border border-amber-500/30 px-2.5 py-1 rounded-full text-xs font-semibold">
            <CreditCard className="w-3.5 h-3.5" />
            Debit
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 bg-slate-800 text-slate-300 px-2.5 py-1 rounded-full text-xs font-semibold">
            {method}
          </span>
        );
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-5 pb-8">
        {/* Header Title Section */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/80 border border-slate-800 p-4 sm:p-5 rounded-2xl shadow-lg backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-gradient-to-tr from-emerald-500 to-teal-400 rounded-2xl text-slate-950 shadow-lg shadow-emerald-500/20">
              <Receipt className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-white tracking-wide">
                Riwayat Transaksi
              </h1>
              <p className="text-xs sm:text-sm text-slate-400">
                Pantau seluruh rekapitulasi penjualan, diskon, dan transaksi kasir secara real-time.
              </p>
            </div>
          </div>

          <button
            onClick={fetchTransactions}
            disabled={loading}
            className="self-start sm:self-auto bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-emerald-400' : ''}`} />
            <span>Segarkan Data</span>
          </button>
        </div>

        {/* Filters Toolbar */}
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow-xl space-y-4">
          {/* Period Filter Pills */}
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 w-full sm:w-auto">
              {[
                { id: 'day', label: 'Hari Ini' },
                { id: 'week', label: '7 Hari Terakhir' },
                { id: 'month', label: 'Bulan Ini' },
                { id: 'year', label: 'Tahun Ini' },
                { id: 'custom', label: 'Kustom Tanggal' },
              ].map((item) => (
                <button
                  key={item.id}
                  onClick={() => setPeriod(item.id as PeriodFilter)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition whitespace-nowrap ${
                    period === item.id
                      ? 'bg-emerald-500 text-slate-950 font-bold shadow-md shadow-emerald-500/20'
                      : 'bg-slate-950 text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-800'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>

            {/* Payment Method Selector */}
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Filter className="w-4 h-4 text-emerald-400 shrink-0" />
              <span className="text-xs text-slate-400 hidden lg:inline">Metode:</span>
              <select
                value={paymentMethodFilter}
                onChange={(e) => setPaymentMethodFilter(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 font-medium cursor-pointer w-full sm:w-auto"
              >
                <option value="ALL">Semua Pembayaran</option>
                <option value="CASH">Tunai (Cash)</option>
                <option value="QRIS">QRIS</option>
                <option value="TRANSFER">Transfer Bank</option>
                <option value="DEBIT">Kartu Debit</option>
              </select>
            </div>
          </div>

          {/* Custom Date Pickers (Shown when 'custom' period selected) */}
          {period === 'custom' && (
            <div className="pt-3 border-t border-slate-800/80 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 items-center">
              <div className="flex items-center gap-2 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2">
                <Calendar className="w-4 h-4 text-emerald-400 shrink-0" />
                <span className="text-xs text-slate-400 shrink-0">Dari:</span>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="bg-transparent text-xs text-white focus:outline-none w-full font-mono"
                />
              </div>

              <div className="flex items-center gap-2 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2">
                <Calendar className="w-4 h-4 text-emerald-400 shrink-0" />
                <span className="text-xs text-slate-400 shrink-0">Sampai:</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="bg-transparent text-xs text-white focus:outline-none w-full font-mono"
                />
              </div>

              <button
                onClick={fetchTransactions}
                className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold px-4 py-2 rounded-xl text-xs shadow-md transition"
              >
                Terapkan Filter Tanggal
              </button>
            </div>
          )}
        </div>

        {/* 4 Summary Metrics Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Total Omzet */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition">
              <DollarSign className="w-16 h-16 text-emerald-400" />
            </div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Total Omzet
              </span>
              <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/20">
                <DollarSign className="w-4 h-4" />
              </div>
            </div>
            <div className="text-xl sm:text-2xl font-black text-emerald-400 font-mono">
              {formatCurrency(summary.totalRevenue)}
            </div>
            <div className="text-[11px] text-slate-500 mt-1">
              Pendapatan bersih periode ini
            </div>
          </div>

          {/* Card 2: Total Transaksi */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition">
              <ShoppingBag className="w-16 h-16 text-sky-400" />
            </div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Total Transaksi
              </span>
              <div className="p-2 bg-sky-500/10 text-sky-400 rounded-xl border border-sky-500/20">
                <ShoppingBag className="w-4 h-4" />
              </div>
            </div>
            <div className="text-xl sm:text-2xl font-black text-white font-mono">
              {summary.totalTransactions.toLocaleString('id-ID')} <span className="text-sm font-normal text-slate-400">Struk</span>
            </div>
            <div className="text-[11px] text-slate-500 mt-1">
              Jumlah struk yang diterbitkan
            </div>
          </div>

          {/* Card 3: Rata-rata Keranjang */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition">
              <TrendingUp className="w-16 h-16 text-indigo-400" />
            </div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Rata-Rata Keranjang
              </span>
              <div className="p-2 bg-indigo-500/10 text-indigo-400 rounded-xl border border-indigo-500/20">
                <TrendingUp className="w-4 h-4" />
              </div>
            </div>
            <div className="text-xl sm:text-2xl font-black text-indigo-300 font-mono">
              {formatCurrency(summary.averageBasketSize)}
            </div>
            <div className="text-[11px] text-slate-500 mt-1">
              Nilai transaksi rata-rata
            </div>
          </div>

          {/* Card 4: Total Diskon Poin */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition">
              <Tag className="w-16 h-16 text-rose-400" />
            </div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Total Diskon Poin
              </span>
              <div className="p-2 bg-rose-500/10 text-rose-400 rounded-xl border border-rose-500/20">
                <Tag className="w-4 h-4" />
              </div>
            </div>
            <div className="text-xl sm:text-2xl font-black text-rose-400 font-mono">
              {formatCurrency(summary.totalDiscount)}
            </div>
            <div className="text-[11px] text-slate-500 mt-1">
              Potongan harga & tukar poin
            </div>
          </div>
        </div>

        {/* Interactive Transactions Table & Search Toolbar */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
          {/* Table Header / Search */}
          <div className="p-4 border-b border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-900/90">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Cari Invoice, Kasir, atau Member..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="text-xs text-slate-400 self-end sm:self-auto font-mono">
              Menampilkan {filteredTransactions.length} dari {transactions.length} transaksi
            </div>
          </div>

          {/* Table Content */}
          {loading ? (
            <div className="p-12 flex flex-col items-center justify-center space-y-3 text-slate-400">
              <RefreshCw className="w-8 h-8 animate-spin text-emerald-400" />
              <p className="text-xs">Memuat data riwayat transaksi...</p>
            </div>
          ) : error ? (
            <div className="p-8 text-center text-rose-400 text-xs font-semibold bg-rose-500/10 border-b border-rose-500/20">
              {error}
            </div>
          ) : filteredTransactions.length === 0 ? (
            <div className="p-12 flex flex-col items-center justify-center space-y-2 text-slate-500">
              <Receipt className="w-12 h-12 text-slate-700" />
              <p className="text-xs sm:text-sm font-medium">Tidak ada transaksi ditemukan pada periode ini.</p>
            </div>
          ) : (
            <>
              {/* Desktop Table View */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-950/80 border-b border-slate-800 text-slate-400 font-semibold uppercase tracking-wider">
                      <th className="py-3 px-4">Invoice</th>
                      <th className="py-3 px-4">Tanggal / Waktu</th>
                      <th className="py-3 px-4">Kasir</th>
                      <th className="py-3 px-4">Member</th>
                      <th className="py-3 px-4">Metode Bayar</th>
                      <th className="py-3 px-4 text-right">Diskon</th>
                      <th className="py-3 px-4 text-right">Total Akhir</th>
                      <th className="py-3 px-4 text-center">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {filteredTransactions.map((tx) => (
                      <tr key={tx.id} className="hover:bg-slate-800/40 transition">
                        <td className="py-3.5 px-4 font-mono font-bold text-white">
                          {tx.invoiceNo}
                        </td>
                        <td className="py-3.5 px-4 text-slate-300 whitespace-nowrap">
                          {formatDate(tx.createdAt)}
                        </td>
                        <td className="py-3.5 px-4 text-slate-200 font-medium">
                          {tx.cashier?.fullName || tx.user?.name || 'Kasir'}
                        </td>
                        <td className="py-3.5 px-4 text-slate-300">
                          {tx.member ? (
                            <div>
                              <div className="font-semibold text-emerald-400">{tx.member.fullName}</div>
                              <div className="text-[10px] text-slate-500 font-mono">{tx.member.phone}</div>
                            </div>
                          ) : (
                            <span className="text-slate-600 font-normal">N/A</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          {getPaymentBadge(tx.paymentMethod)}
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono text-rose-400">
                          {tx.totalDiscount > 0 ? `-${formatCurrency(tx.totalDiscount)}` : 'Rp 0'}
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono font-bold text-emerald-400 text-sm">
                          {formatCurrency(tx.finalAmount)}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <button
                            onClick={() => handleOpenReceipt(tx)}
                            className="inline-flex items-center gap-1.5 bg-slate-800 hover:bg-emerald-500 hover:text-slate-950 text-emerald-400 border border-emerald-500/30 px-3 py-1.5 rounded-xl font-semibold transition text-xs shadow-sm"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Lihat Struk</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Card List View */}
              <div className="md:hidden divide-y divide-slate-800/80">
                {filteredTransactions.map((tx) => (
                  <div key={tx.id} className="p-4 space-y-3 bg-slate-900/60">
                    <div className="flex items-center justify-between">
                      <div className="font-mono font-bold text-sm text-white">{tx.invoiceNo}</div>
                      {getPaymentBadge(tx.paymentMethod)}
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-slate-500 block text-[10px]">Waktu Transaksi</span>
                        <span className="text-slate-300 font-mono">{formatDate(tx.createdAt)}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[10px]">Kasir</span>
                        <span className="text-slate-200 font-medium">{tx.cashier?.fullName || 'Kasir'}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[10px]">Pelanggan Member</span>
                        <span className="text-emerald-400 font-medium">
                          {tx.member ? tx.member.fullName : 'Non-Member'}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[10px]">Diskon</span>
                        <span className="text-rose-400 font-mono">
                          {tx.totalDiscount > 0 ? `-${formatCurrency(tx.totalDiscount)}` : 'Rp 0'}
                        </span>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
                      <div>
                        <span className="text-[10px] text-slate-500 block">Total Tagihan</span>
                        <span className="font-mono font-bold text-emerald-400 text-base">
                          {formatCurrency(tx.finalAmount)}
                        </span>
                      </div>

                      <button
                        onClick={() => handleOpenReceipt(tx)}
                        className="bg-emerald-500 text-slate-950 font-bold px-3.5 py-1.5 rounded-xl text-xs flex items-center gap-1 shadow-md shadow-emerald-500/20"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Lihat Struk</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Thermal Receipt Preview & Print Modal */}
      <ThermalReceipt
        transaction={selectedTransaction as any}
        isOpen={isReceiptOpen}
        onClose={() => {
          setIsReceiptOpen(false);
          setSelectedTransaction(null);
        }}
      />
    </DashboardLayout>
  );
}
