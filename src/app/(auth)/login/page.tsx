'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Store, UserCheck, ShieldCheck, ArrowRight, Sparkles, Lock, User } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState<string>('kasir1');
  const [password, setPassword] = useState<string>('password123');
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleLogin = async (userToSubmit?: string, passToSubmit?: string) => {
    const targetUsername = userToSubmit || username;
    const targetPassword = passToSubmit || password;

    if (!targetUsername) {
      setErrorMsg('Username wajib diisi.');
      return;
    }

    try {
      setLoading(true);
      setErrorMsg(null);

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
        router.push('/pos');
        router.refresh();
      } else {
        setErrorMsg(data.error || 'Login gagal. Periksa username dan password Anda.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Terjadi kesalahan koneksi sistem.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-4 antialiased">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex p-3 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 text-slate-950 font-black shadow-lg shadow-emerald-500/20 mb-1">
            <Store className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">
            Sekar POS <span className="text-emerald-400">Retail v2.0</span>
          </h1>
          <p className="text-xs text-slate-400">
            Sistem Kasir & Inventory Multi-Cabang AGUNG AI SOFTWARE HOUSE
          </p>
        </div>

        {errorMsg && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs text-center font-medium">
            {errorMsg}
          </div>
        )}

        {/* Login Form */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleLogin();
          }}
          className="space-y-4 text-xs"
        >
          <div>
            <label className="block text-slate-300 font-semibold mb-1">Username</label>
            <div className="relative">
              <User className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                placeholder="Masukkan username (kasir1 / owner)"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-300 font-semibold mb-1">Password</label>
            <div className="relative">
              <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="password"
                placeholder="Masukkan password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 rounded-2xl font-bold text-sm bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 shadow-lg shadow-emerald-500/20 transition flex items-center justify-center gap-2 mt-2"
          >
            <Sparkles className="w-5 h-5" />
            <span>{loading ? 'Verifikasi Sesi...' : 'Masuk ke Sistem POS'}</span>
          </button>
        </form>

        {/* Fast Switcher Helper Card */}
        <div className="border-t border-slate-800/80 pt-4 space-y-3">
          <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider text-center">
            Pilih Akun Cepat (Pengujian)
          </label>

          {/* Kasir Button */}
          <button
            type="button"
            onClick={() => {
              setUsername('kasir1');
              setPassword('password123');
              handleLogin('kasir1', 'password123');
            }}
            className="w-full p-3 rounded-2xl bg-slate-950 border border-slate-800 hover:border-emerald-500/80 transition flex items-center justify-between text-left"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-teal-500/10 text-teal-400 border border-teal-500/20">
                <UserCheck className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-bold text-xs text-white">Siti Rahma (Kasir)</h3>
                <p className="text-[10px] text-slate-500">username: kasir1 | password: password123</p>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-teal-400" />
          </button>

          {/* Owner Button */}
          <button
            type="button"
            onClick={() => {
              setUsername('owner');
              setPassword('password123');
              handleLogin('owner', 'password123');
            }}
            className="w-full p-3 rounded-2xl bg-slate-950 border border-slate-800 hover:border-amber-500/80 transition flex items-center justify-between text-left"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-bold text-xs text-white">Agung Priyadi (Owner)</h3>
                <p className="text-[10px] text-slate-500">username: owner | password: password123</p>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-amber-400" />
          </button>
        </div>
      </div>
    </div>
  );
}
