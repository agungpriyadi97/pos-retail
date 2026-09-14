'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import ThemeToggle from '@/components/layout/ThemeToggle';
import {
  ShoppingCart,
  Receipt,
  Users,
  Package,
  PackagePlus,
  PackageX,
  TrendingUp,
  Barcode,
  Building2,
  UserCheck,
  Store,
  Menu,
  X,
  LogOut,
  ChevronDown,
  Lock,
  ShieldCheck,
  KeyRound,
  Settings,
} from 'lucide-react';

interface Branch {
  id: string;
  code: string;
  name: string;
  isWarehouse: boolean;
}

interface UserSession {
  id: string;
  username: string;
  fullName: string;
  role: 'CASHIER' | 'ADMIN_OWNER';
  branchId: string | null;
  branchName: string | null;
}

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [branches, setBranches] = useState<Branch[]>([]);
  const [selectedBranchId, setSelectedBranchId] = useState<string>('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);
  const [userSession, setUserSession] = useState<UserSession | null>(null);
  const [userMenuOpen, setUserMenuOpen] = useState<boolean>(false);
  const [storeName, setStoreName] = useState<string>('Sekar POS Retail');

  // Account Switcher Modal States
  const [isSwitchModalOpen, setIsSwitchModalOpen] = useState<boolean>(false);
  const [targetUsername, setTargetUsername] = useState<string>('owner');
  const [targetPassword, setTargetPassword] = useState<string>('');
  const [switchError, setSwitchError] = useState<string | null>(null);
  const [isSubmittingSwitch, setIsSubmittingSwitch] = useState<boolean>(false);

  useEffect(() => {
    fetchBranches();
    fetchSessionUser();
    fetchStoreSettings();

    const handleSettingsChanged = (e: any) => {
      if (e.detail?.storeName) {
        setStoreName(e.detail.storeName);
      } else {
        fetchStoreSettings();
      }
    };

    window.addEventListener('storeSettingsChanged', handleSettingsChanged);
    return () => window.removeEventListener('storeSettingsChanged', handleSettingsChanged);
  }, []);

  const fetchStoreSettings = async () => {
    try {
      const res = await fetch('/api/settings');
      const data = await res.json();
      if (data.success && data.data?.storeName) {
        setStoreName(data.data.storeName);
      }
    } catch (err) {
      console.error('Failed to load store settings in layout', err);
    }
  };

  const fetchSessionUser = async () => {
    try {
      const res = await fetch('/api/auth/me');
      const data = await res.json();
      if (data.success && data.user) {
        setUserSession(data.user);
        if (data.user.branchId) {
          setSelectedBranchId(data.user.branchId);
          localStorage.setItem('selectedBranchId', data.user.branchId);
        }
      }
    } catch (err) {
      console.error('Failed to load session user', err);
    }
  };

  const fetchBranches = async () => {
    try {
      const res = await fetch('/api/branches?activeOnly=true');
      const data = await res.json();
      const branchList: Branch[] = data.branches || data.data || [];
      if (data.success && branchList.length > 0) {
        setBranches(branchList);
        const stored = localStorage.getItem('selectedBranchId');
        const validStoredBranch = branchList.find((b: Branch) => b.id === stored);
        const defaultBranch =
          validStoredBranch ||
          branchList.find((b: Branch) => !b.isWarehouse) ||
          branchList[0];

        setSelectedBranchId(defaultBranch.id);
        localStorage.setItem('selectedBranchId', defaultBranch.id);
      }
    } catch (err) {
      console.error('Failed to load branches', err);
    }
  };

  const handleBranchChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setSelectedBranchId(val);
    localStorage.setItem('selectedBranchId', val);
    window.dispatchEvent(new CustomEvent('branchChanged', { detail: val }));
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      localStorage.removeItem('selectedBranchId');
      router.push('/login');
      router.refresh();
    } catch (err) {
      console.error('Logout error', err);
    }
  };

  const handleAccountSwitchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetPassword) {
      setSwitchError('Password wajib diisi untuk verifikasi otorisasi.');
      return;
    }

    try {
      setIsSubmittingSwitch(true);
      setSwitchError(null);

      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: targetUsername,
          password: targetPassword,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setIsSwitchModalOpen(false);
        setTargetPassword('');
        await fetchSessionUser();
        window.location.reload();
      } else {
        setSwitchError(data.error || 'Password salah atau akun tidak sah.');
      }
    } catch (err: any) {
      setSwitchError(err.message || 'Terjadi kesalahan sistem.');
    } finally {
      setIsSubmittingSwitch(false);
    }
  };

  const navItems = [
    {
      name: 'Kasir (POS)',
      href: '/pos',
      icon: ShoppingCart,
      color: 'bg-emerald-500',
      ownerOnly: false,
    },
    {
      name: 'Riwayat Transaksi',
      href: '/transactions',
      icon: Receipt,
      color: 'bg-emerald-600',
      ownerOnly: false,
    },
    {
      name: 'Pelanggan (Member)',
      href: '/members',
      icon: Users,
      color: 'bg-indigo-500',
      ownerOnly: false,
    },
    {
      name: 'Master Produk',
      href: '/products',
      icon: Package,
      color: 'bg-amber-500',
      ownerOnly: true,
    },
    {
      name: 'Tambah Stok (Restock)',
      href: '/inventory/restock',
      icon: PackagePlus,
      color: 'bg-teal-500',
      ownerOnly: true,
    },
    {
      name: 'Pengurangan Stok (Shrinkage)',
      href: '/shrinkage',
      icon: PackageX,
      color: 'bg-rose-500',
      ownerOnly: false,
    },
    {
      name: 'Laporan Rotasi Stok (Turnover)',
      href: '/reports/turnover',
      icon: TrendingUp,
      color: 'bg-blue-500',
      ownerOnly: true,
    },
    {
      name: 'Cetak Barcode SKU',
      href: '/barcodes',
      icon: Barcode,
      color: 'bg-violet-500',
      ownerOnly: false,
    },
    {
      name: 'Pengaturan Toko',
      href: '/settings',
      icon: Settings,
      color: 'bg-indigo-500',
      ownerOnly: true,
    },
  ];

  const visibleNavItems = navItems.filter((item) => {
    if (item.ownerOnly && userSession?.role === 'CASHIER') {
      return false;
    }
    return true;
  });

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col antialiased transition-colors duration-200">
      {/* Top Navbar */}
      <header className="sticky top-0 z-30 bg-white/90 dark:bg-slate-900/90 backdrop-blur border-b border-slate-200 dark:border-slate-800 px-2 sm:px-4 py-2 sm:py-3 flex items-center justify-between shadow-sm dark:shadow-lg transition-colors">
        <div className="flex items-center gap-1.5 sm:gap-3 min-w-0">
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-1.5 sm:p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white shrink-0"
            aria-label="Toggle Navigation Menu"
          >
            {mobileMenuOpen ? <X className="w-4 h-4 sm:w-5 sm:h-5" /> : <Menu className="w-4 h-4 sm:w-5 sm:h-5" />}
          </button>
          <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
            <div className="p-1 sm:p-2 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 text-slate-950 font-black shadow-emerald-500/20 shadow-md shrink-0">
              <Store className="w-3.5 h-3.5 sm:w-5 sm:h-5" />
            </div>
            <div className="min-w-0">
              <h1 className="font-bold text-xs sm:text-base leading-tight text-slate-900 dark:text-white tracking-wide truncate max-w-[100px] xs:max-w-[150px] sm:max-w-[260px] md:max-w-[340px]">
                {storeName}
              </h1>
              <p className="text-[9px] sm:text-xs text-slate-500 dark:text-slate-400 truncate hidden xs:block">AGUNG AI SOFTWARE HOUSE</p>
            </div>
          </div>
        </div>

        {/* Branch Switcher & Theme Toggle & User Profile Dropdown */}
        <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
          <div className="flex items-center gap-1 sm:gap-2 bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/60 rounded-xl px-1.5 sm:px-3 py-1 sm:py-1.5 text-xs">
            <Building2 className="w-3 h-3 sm:w-4 sm:h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span className="text-slate-500 dark:text-slate-400 hidden lg:inline">Cabang:</span>
            <select
              value={selectedBranchId}
              onChange={handleBranchChange}
              className="bg-transparent text-slate-800 dark:text-white font-medium focus:outline-none cursor-pointer max-w-[85px] sm:max-w-[180px] truncate text-[11px] sm:text-xs"
            >
              {branches.map((b) => (
                <option key={b.id} value={b.id} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">
                  {b.name} {b.isWarehouse ? '(Gudang)' : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Sun / Moon Theme Toggle */}
          <ThemeToggle />

          {/* User Profile Menu & Logout */}
          <div className="relative">
            <button
              onClick={() => setUserMenuOpen(!userMenuOpen)}
              className="flex items-center gap-1.5 sm:gap-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-xl px-2 sm:px-3 py-1 sm:py-1.5 text-xs text-slate-800 dark:text-slate-200 transition"
            >
              {userSession?.role === 'ADMIN_OWNER' ? (
                <ShieldCheck className="w-4 h-4 text-amber-500 dark:text-amber-400 shrink-0" />
              ) : (
                <UserCheck className="w-4 h-4 text-teal-600 dark:text-teal-400 shrink-0" />
              )}
              <span className="font-semibold hidden sm:inline max-w-[100px] truncate">
                {userSession ? userSession.fullName.split(' ')[0] : 'POS'}
              </span>
              <span
                className={`text-[9px] sm:text-[10px] font-bold px-1.5 sm:px-2 py-0.5 rounded-md hidden lg:inline ${
                  userSession?.role === 'ADMIN_OWNER'
                    ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30'
                    : 'bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-500/30'
                }`}
              >
                {userSession?.role === 'ADMIN_OWNER' ? 'OWNER' : 'KASIR'}
              </span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            </button>

            {userMenuOpen && (
              <div className="absolute right-0 mt-2 w-60 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-2 z-50 space-y-1">
                <div className="p-2 border-b border-slate-200 dark:border-slate-800">
                  <div className="font-bold text-xs text-slate-900 dark:text-white">
                    {userSession?.fullName || 'Pengguna POS'}
                  </div>
                  <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-mono">
                    Role: {userSession?.role || 'CASHIER'}
                  </div>
                </div>

                <button
                  onClick={() => {
                    setUserMenuOpen(false);
                    setTargetUsername(userSession?.username === 'owner' ? 'kasir1' : 'owner');
                    setIsSwitchModalOpen(true);
                  }}
                  className="flex items-center gap-2 w-full text-left px-3 py-2 text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition"
                >
                  <KeyRound className="w-4 h-4 text-amber-500 dark:text-amber-400" />
                  <span>Ganti Akun (Otorisasi Password)</span>
                </button>

                <button
                  onClick={handleLogout}
                  className="flex items-center gap-2 w-full text-left px-3 py-2 text-xs text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 rounded-xl transition font-semibold"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Keluar / Logout</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Desktop Sidebar */}
        <aside className="hidden md:flex flex-col w-64 bg-white/80 dark:bg-slate-900/60 border-r border-slate-200 dark:border-slate-800/80 p-4 space-y-2 shrink-0 transition-colors">
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 px-3 mb-2">
            Navigasi Utama
          </div>
          {visibleNavItems.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? 'bg-slate-100 dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 border border-slate-300 dark:border-slate-700/80 shadow-sm font-bold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-800/50'
                }`}
              >
                <div
                  className={`p-1.5 rounded-lg text-slate-950 ${
                    isActive ? item.color : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                </div>
                <span>{item.name}</span>
              </Link>
            );
          })}
        </aside>

        {/* Mobile Navigation Drawer Overlay */}
        {mobileMenuOpen && (
          <div className="md:hidden fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex">
            <div className="fixed inset-0" onClick={() => setMobileMenuOpen(false)} />
            <div className="relative z-10 w-72 max-w-[80vw] bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 p-4 space-y-3 flex flex-col h-full overflow-y-auto shadow-2xl">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <Store className="w-4 h-4 text-emerald-500" />
                  <span className="font-bold text-slate-900 dark:text-slate-200 text-sm truncate">{storeName}</span>
                </div>
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-1 rounded-lg text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-slate-800"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="flex-1 space-y-1.5 overflow-y-auto">
                {visibleNavItems.map((item) => {
                  const isActive = pathname === item.href;
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium transition-all ${
                        isActive
                          ? 'bg-slate-100 dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 border border-slate-300 dark:border-slate-700'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/40'
                      }`}
                    >
                      <Icon className="w-5 h-5 text-emerald-500" />
                      <span>{item.name}</span>
                    </Link>
                  );
                })}
              </div>

              <div className="pt-4 border-t border-slate-200 dark:border-slate-800 space-y-2 shrink-0">
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    setIsSwitchModalOpen(true);
                  }}
                  className="flex items-center gap-3 px-3 py-2.5 w-full text-slate-700 dark:text-slate-300 font-semibold text-xs bg-slate-100 dark:bg-slate-800 rounded-xl"
                >
                  <KeyRound className="w-4 h-4 text-amber-500 dark:text-amber-400" />
                  <span>Ganti Akun Sesi</span>
                </button>

                <button
                  onClick={handleLogout}
                  className="flex items-center gap-3 px-3 py-2.5 w-full text-rose-600 dark:text-rose-400 font-semibold text-xs hover:bg-rose-500/10 rounded-xl transition"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Logout</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Main Content Body */}
        <main className="w-full min-w-0 flex-1 overflow-x-hidden p-3 sm:p-6 bg-slate-50 dark:bg-slate-950 transition-colors">
          {children}
        </main>
      </div>

      {/* Account Switching Authorization Modal */}
      {isSwitchModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2 text-amber-400 font-bold text-sm">
                <Lock className="w-4 h-4" />
                <span>Otorisasi Ganti Akun</span>
              </div>
              <button
                onClick={() => {
                  setIsSwitchModalOpen(false);
                  setSwitchError(null);
                }}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-400">
              Masukkan password akun target untuk berpindah hak akses sesi secara sah.
            </p>

            {switchError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-medium">
                {switchError}
              </div>
            )}

            <form onSubmit={handleAccountSwitchSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Pilih Akun Tujuan
                </label>
                <select
                  value={targetUsername}
                  onChange={(e) => setTargetUsername(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-amber-500"
                >
                  <option value="kasir1">Siti Rahma (Kasir - kasir1)</option>
                  <option value="owner">Agung Priyadi (Owner - owner)</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Password Akun Tujuan (Testing: password123)
                </label>
                <input
                  type="password"
                  placeholder="Masukkan password akun tujuan..."
                  value={targetPassword}
                  onChange={(e) => setTargetPassword(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-white placeholder-slate-600 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsSwitchModalOpen(false);
                    setSwitchError(null);
                  }}
                  className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold py-2.5 rounded-xl transition"
                >
                  Batal
                </button>

                <button
                  type="submit"
                  disabled={isSubmittingSwitch}
                  className="flex-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold py-2.5 rounded-xl shadow-lg shadow-amber-500/20 transition"
                >
                  {isSubmittingSwitch ? 'Verifikasi...' : 'Ganti Sesi Akun'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
