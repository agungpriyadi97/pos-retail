'use client';

import React, { useState, useEffect } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import CameraScannerModal from '@/components/pos/CameraScannerModal';
import ThermalReceipt from '@/components/pos/ThermalReceipt';
import { DEFAULT_POINT_VALUE_RUPIAH } from '@/lib/loyalty';
import {
  Search,
  Camera,
  Plus,
  Minus,
  Trash2,
  UserCheck,
  CreditCard,
  Banknote,
  QrCode,
  ArrowRight,
  Sparkles,
  ShoppingBag,
  AlertCircle,
  X,
} from 'lucide-react';

interface Product {
  id: string;
  barcode: string;
  sku: string;
  name: string;
  sellingPrice: number;
  costPrice: number;
  stock: number;
  unit: string;
  category: string;
}

interface CartItem {
  product: Product;
  quantity: number;
}

interface Member {
  id: string;
  phone: string;
  fullName: string;
  points: number;
  totalSpend: number;
}

export default function PosPage() {
  const [branchId, setBranchId] = useState<string>('');
  const [currentUserId, setCurrentUserId] = useState<string>('');
  const [products, setProducts] = useState<Product[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [loadingProducts, setLoadingProducts] = useState<boolean>(true);
  const [pointRedeemValue, setPointRedeemValue] = useState<number>(DEFAULT_POINT_VALUE_RUPIAH);
  const [isLoyaltyActive, setIsLoyaltyActive] = useState<boolean>(true);

  // Cart & Checkout states
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [memberPhoneSearch, setMemberPhoneSearch] = useState<string>('');
  const [memberNotFound, setMemberNotFound] = useState<boolean>(false);
  const [usePoints, setUsePoints] = useState<boolean>(false);
  const [pointsToUse, setPointsToUse] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'QRIS' | 'TRANSFER' | 'DEBIT'>('CASH');
  const [paidAmountInput, setPaidAmountInput] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);

  // Modals
  const [isCameraOpen, setIsCameraOpen] = useState<boolean>(false);
  const [completedTransaction, setCompletedTransaction] = useState<any | null>(null);
  const [isReceiptOpen, setIsReceiptOpen] = useState<boolean>(false);
  const [isMobileCartOpen, setIsMobileCartOpen] = useState<boolean>(false);

  // Quick Add Member Modal
  const [isQuickAddMemberOpen, setIsQuickAddMemberOpen] = useState<boolean>(false);
  const [quickMemberPhone, setQuickMemberPhone] = useState<string>('');
  const [quickMemberName, setQuickMemberName] = useState<string>('');
  const [quickMemberError, setQuickMemberError] = useState<string | null>(null);
  const [isSubmittingQuickMember, setIsSubmittingQuickMember] = useState<boolean>(false);

  useEffect(() => {
    fetchSessionUser();
    fetchStoreSettings();
    const storedBranch = localStorage.getItem('selectedBranchId') || '';
    setBranchId(storedBranch);

    const handleBranchChange = (e: any) => {
      setBranchId(e.detail);
    };

    window.addEventListener('branchChanged', handleBranchChange);
    return () => window.removeEventListener('branchChanged', handleBranchChange);
  }, []);

  const fetchStoreSettings = async () => {
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

  const fetchSessionUser = async () => {
    try {
      const res = await fetch('/api/auth/me');
      const data = await res.json();
      if (data.success && data.user) {
        setCurrentUserId(data.user.id);
        if (data.user.branchId && !branchId) {
          setBranchId(data.user.branchId);
        }
      }
    } catch (err) {
      console.error('Failed to load active cashier session user', err);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, [branchId, searchQuery]);

  const fetchProducts = async () => {
    try {
      setLoadingProducts(true);
      const url = new URL('/api/products', window.location.origin);
      if (branchId) url.searchParams.append('branchId', branchId);
      if (searchQuery) url.searchParams.append('query', searchQuery);

      const res = await fetch(url.toString());
      const data = await res.json();
      if (data.success) {
        setProducts(data.data);
      }
    } catch (err) {
      console.error('Failed to load products', err);
    } finally {
      setLoadingProducts(false);
    }
  };

  const handleSearchMember = async () => {
    if (!memberPhoneSearch) return;
    setMemberNotFound(false);
    try {
      const res = await fetch(`/api/members?search=${encodeURIComponent(memberPhoneSearch)}`);
      const data = await res.json();
      if (data.success && data.data.length > 0) {
        const m = data.data[0];
        setSelectedMember(m);
        setPointsToUse(m.points);
        setMemberNotFound(false);
      } else {
        setSelectedMember(null);
        setMemberNotFound(true);
      }
    } catch (err) {
      console.error('Member search error', err);
      setMemberNotFound(true);
    }
  };

  const handleQuickAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    setQuickMemberError(null);

    const cleanPhone = quickMemberPhone.replace(/\D/g, '');
    if (!cleanPhone || cleanPhone.length < 9) {
      setQuickMemberError('Nomor HP/WhatsApp minimal 9 digit.');
      return;
    }
    if (!quickMemberName.trim() || quickMemberName.trim().length < 2) {
      setQuickMemberError('Nama pelanggan minimal 2 karakter.');
      return;
    }

    try {
      setIsSubmittingQuickMember(true);
      const res = await fetch('/api/members', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: cleanPhone,
          fullName: quickMemberName.trim(),
        }),
      });

      const data = await res.json();
      if (data.success) {
        setSelectedMember(data.data);
        setPointsToUse(0);
        setMemberNotFound(false);
        setIsQuickAddMemberOpen(false);
        setQuickMemberPhone('');
        setQuickMemberName('');
      } else {
        setQuickMemberError(data.message || 'Gagal mendaftarkan member.');
      }
    } catch (err: any) {
      setQuickMemberError(err.message || 'Terjadi kesalahan sistem.');
    } finally {
      setIsSubmittingQuickMember(false);
    }
  };

  // Toast notification state
  const [toast, setToast] = useState<{
    message: string;
    type: 'error' | 'success' | 'warning';
  } | null>(null);

  const lastScanTimeRef = React.useRef<number>(0);

  const showToast = (
    message: string,
    type: 'error' | 'success' | 'warning' = 'warning'
  ) => {
    setToast({ message, type });
  };

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => {
      setToast(null);
    }, 2500);
    return () => clearTimeout(timer);
  }, [toast]);

  const addToCart = (product: Product) => {
    if (product.stock <= 0) {
      showToast(`Stok ${product.name} habis di cabang ini.`, 'error');
      return;
    }

    setCart((prev) => {
      const existing = prev.find((item) => item.product.id === product.id);
      if (existing) {
        if (existing.quantity + 1 > product.stock) {
          showToast(
            `Stok maksimal produk ${product.name} tercapai (Maks: ${product.stock})`,
            'warning'
          );
          return prev;
        }
        return prev.map((item) =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      showToast(`1x ${product.name} ditambahkan ke keranjang`, 'success');
      return [...prev, { product, quantity: 1 }];
    });
  };

  const updateQuantity = (productId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.product.id === productId) {
            const newQty = item.quantity + delta;
            if (newQty > item.product.stock) {
              showToast(
                `Stok maksimal produk ${item.product.name} tercapai (Maks: ${item.product.stock})`,
                'warning'
              );
              return item;
            }
            return newQty > 0 ? { ...item, quantity: newQty } : null;
          }
          return item;
        })
        .filter(Boolean) as CartItem[]
    );
  };

  const removeFromCart = (productId: string) => {
    setCart((prev) => prev.filter((item) => item.product.id !== productId));
  };

  const handleScanSuccess = (barcode: string) => {
    const now = Date.now();
    if (now - lastScanTimeRef.current < 1000) {
      return; // Ignore duplicate scan within 1 second cooldown
    }
    lastScanTimeRef.current = now;

    setSearchQuery(barcode);
    const found = products.find(
      (p) => p.barcode === barcode || p.sku.toLowerCase() === barcode.toLowerCase()
    );
    if (found) {
      addToCart(found);
    } else {
      showToast(`Produk dengan barcode ${barcode} tidak ditemukan!`, 'error');
    }
  };

  // Totals & Calculations
  const subtotal = cart.reduce(
    (acc, item) => acc + item.product.sellingPrice * item.quantity,
    0
  );

  const maxPointsDiscount = selectedMember && usePoints && isLoyaltyActive ? pointsToUse * pointRedeemValue : 0;
  const pointDiscount = Math.min(subtotal, maxPointsDiscount);
  const finalAmount = Math.max(0, subtotal - pointDiscount);

  const paidAmount = Number(paidAmountInput) || 0;
  const changeAmount = paymentMethod === 'CASH' ? Math.max(0, paidAmount - finalAmount) : 0;

  // Smart Cash Suggestions Algorithm
  const getSmartCashSuggestions = (total: number) => {
    if (total <= 0) return [];

    const suggestions: { label: string; value: number }[] = [
      { label: 'Pas', value: total },
    ];

    const stepRounds = [5000, 10000, 20000, 50000, 100000];
    const addedValues = new Set<number>([total]);

    for (const step of stepRounds) {
      const rounded = Math.ceil(total / step) * step;
      if (rounded > total && !addedValues.has(rounded)) {
        addedValues.add(rounded);
        suggestions.push({
          label:
            rounded >= 1000000
              ? `Rp ${(rounded / 1000000).toLocaleString('id-ID')}M`
              : `Rp ${(rounded / 1000).toLocaleString('id-ID')}k`,
          value: rounded,
        });
      }
    }

    let extraStep = 50000;
    while (suggestions.length < 5) {
      const nextVal = Math.ceil((total + 1) / extraStep) * extraStep;
      if (!addedValues.has(nextVal)) {
        addedValues.add(nextVal);
        suggestions.push({
          label:
            nextVal >= 1000000
              ? `Rp ${(nextVal / 1000000).toLocaleString('id-ID')}M`
              : `Rp ${(nextVal / 1000).toLocaleString('id-ID')}k`,
          value: nextVal,
        });
      }
      extraStep += 50000;
    }

    return suggestions.slice(0, 5);
  };

  const selectQuickCash = (amt: number) => {
    setPaidAmountInput(amt.toString());
    setCheckoutError(null);
  };

  const handlePaidAmountChange = (val: string) => {
    setPaidAmountInput(val);
    const numeric = Number(val) || 0;
    if (numeric === 0 || numeric >= finalAmount) {
      setCheckoutError(null);
    } else if (numeric > 0 && numeric < finalAmount) {
      setCheckoutError(
        `Jumlah bayar tunai (Rp ${numeric.toLocaleString('id-ID')}) kurang dari total tagihan (Rp ${finalAmount.toLocaleString('id-ID')}).`
      );
    }
  };

  const handleCheckout = async () => {
    setCheckoutError(null);
    if (cart.length === 0) {
      setCheckoutError('Keranjang belanja masih kosong!');
      return;
    }

    if (paymentMethod === 'CASH' && paidAmount < finalAmount) {
      setCheckoutError(
        `Jumlah bayar tunai (Rp ${paidAmount.toLocaleString('id-ID')}) kurang dari total tagihan (Rp ${finalAmount.toLocaleString('id-ID')}).`
      );
      return;
    }

    try {
      setIsSubmitting(true);
      const payload = {
        branchId: branchId || undefined,
        cashierId: currentUserId || undefined, // dynamic valid session user ID
        memberId: selectedMember ? selectedMember.id : undefined,
        items: cart.map((i) => ({
          productId: i.product.id,
          quantity: i.quantity,
          sellingPrice: i.product.sellingPrice,
        })),
        paidAmount: paymentMethod === 'CASH' ? paidAmount : finalAmount,
        paymentMethod,
        pointsUsed: selectedMember && usePoints ? pointsToUse : 0,
      };

      const res = await fetch('/api/pos/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (data.success) {
        setCompletedTransaction(data.transaction);
        setIsReceiptOpen(true);
        setIsMobileCartOpen(false);
        // Reset state
        setCart([]);
        setSelectedMember(null);
        setUsePoints(false);
        setPaidAmountInput('');
        setMemberPhoneSearch('');
        fetchProducts(); // refresh stock
      } else {
        setCheckoutError(data.error || 'Gagal memproses transaksi.');
      }
    } catch (err: any) {
      setCheckoutError(err.message || 'Terjadi kesalahan sistem.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderCartPanel = (isMobile: boolean = false) => (
    <div
      className={`bg-slate-900 border border-slate-800 flex flex-col h-full overflow-hidden shadow-xl ${
        isMobile
          ? 'w-full max-h-[92vh] rounded-t-3xl border-t border-slate-800'
          : 'hidden md:flex rounded-2xl lg:col-span-5 xl:col-span-4'
      }`}
    >
      {/* Header */}
      <div className="p-3.5 sm:p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/90 shrink-0">
        <div className="flex items-center gap-2">
          <ShoppingBag className="w-5 h-5 text-emerald-400" />
          <h2 className="font-bold text-white text-sm sm:text-base">Keranjang Kasir</h2>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400 bg-slate-800 px-2.5 py-1 rounded-full font-mono">
            {cart.reduce((a, c) => a + c.quantity, 0)} Item
          </span>
          {isMobile && (
            <button
              onClick={() => setIsMobileCartOpen(false)}
              className="p-1 rounded-lg text-slate-400 hover:text-white bg-slate-800"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* Scrollable Body: Cart Item List + Member Section */}
      <div className="flex-1 overflow-y-auto min-h-0">
        {/* Cart Item List */}
        <div className="p-3 sm:p-4 space-y-2.5 sm:space-y-3 min-h-[140px]">
          {cart.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-36 text-slate-500 text-xs sm:text-sm space-y-2">
              <ShoppingBag className="w-10 h-10 text-slate-700" />
              <p>Klik produk di samping untuk menambahkan ke keranjang.</p>
            </div>
          ) : (
            cart.map((item) => (
              <div
                key={item.product.id}
                className="bg-slate-950 border border-slate-800/80 rounded-xl p-2.5 sm:p-3 flex items-center justify-between gap-3"
              >
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-xs sm:text-sm text-white truncate">
                    {item.product.name}
                  </h4>
                  <p className="text-[11px] text-slate-400 font-mono">
                    Rp {item.product.sellingPrice.toLocaleString('id-ID')} / {item.product.unit}
                  </p>
                </div>

                {/* Quantity Controls */}
                <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                  <button
                    onClick={() => updateQuantity(item.product.id, -1)}
                    className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 min-w-[28px] min-h-[28px] flex items-center justify-center"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <span className="font-semibold text-xs sm:text-sm w-5 text-center text-white font-mono">
                    {item.quantity}
                  </span>
                  <button
                    onClick={() => updateQuantity(item.product.id, 1)}
                    className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 min-w-[28px] min-h-[28px] flex items-center justify-center"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => removeFromCart(item.product.id)}
                    className="p-1.5 rounded-lg bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 ml-0.5 min-w-[28px] min-h-[28px] flex items-center justify-center"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Member & Discount Section */}
        <div className="p-3 sm:p-4 border-t border-slate-800 bg-slate-950/60 space-y-2.5 sm:space-y-3">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-slate-300 flex items-center gap-1.5">
              <UserCheck className="w-4 h-4 text-emerald-400" />
              Member Pelanggan
            </span>
            {selectedMember && (
              <button
                onClick={() => {
                  setSelectedMember(null);
                  setUsePoints(false);
                }}
                className="text-rose-400 hover:underline text-[11px]"
              >
                Lepas Member
              </button>
            )}
          </div>

          {selectedMember ? (
            <div className="bg-slate-900 border border-emerald-500/40 rounded-xl p-2.5 flex items-center justify-between">
              <div>
                <div className="font-bold text-xs sm:text-sm text-white flex items-center gap-1.5 flex-wrap">
                  <span>{selectedMember.fullName}</span>
                  <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-1.5 py-0.5 rounded text-[10px]">
                    {selectedMember.points} Poin {isLoyaltyActive ? `(Setara Rp ${(selectedMember.points * pointRedeemValue).toLocaleString('id-ID')})` : '(Program Nonaktif)'}
                  </span>
                </div>
                <div className="text-xs text-slate-400 font-mono mt-0.5">{selectedMember.phone}</div>
              </div>
              <div className="text-right shrink-0">
                <label className="flex items-center gap-1.5 text-xs text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={usePoints}
                    onChange={(e) => setUsePoints(e.target.checked)}
                    className="accent-emerald-500 rounded"
                  />
                  <span className="text-[11px]">Tukar Poin</span>
                </label>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Cari No HP / Nama Member..."
                  value={memberPhoneSearch}
                  onChange={(e) => {
                    setMemberPhoneSearch(e.target.value);
                    if (memberNotFound) setMemberNotFound(false);
                  }}
                  className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 font-mono"
                />
                <button
                  onClick={handleSearchMember}
                  className="bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold px-3 py-1.5 rounded-xl text-xs transition"
                >
                  Cari
                </button>
              </div>

              {memberNotFound && (
                <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs flex items-center justify-between gap-2">
                  <span className="flex items-center gap-1 text-[11px]">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    Tidak ada data member.
                  </span>
                  <button
                    onClick={() => {
                      setQuickMemberPhone(memberPhoneSearch);
                      setQuickMemberName('');
                      setQuickMemberError(null);
                      setIsQuickAddMemberOpen(true);
                    }}
                    className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-2 py-1 rounded-lg text-[10px] transition shrink-0"
                  >
                    + Daftar Member
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Payment Details & Checkout Form */}
      <div
        className={`p-3 sm:p-4 border-t border-slate-800 bg-slate-900 space-y-2.5 sm:space-y-3 shrink-0 ${
          isMobile ? 'pb-12 sm:pb-8' : ''
        }`}
      >
        {checkoutError && (
          <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{checkoutError}</span>
          </div>
        )}

        {/* Calculations Breakdown */}
        <div className="space-y-1 text-xs">
          <div className="flex justify-between text-slate-400">
            <span>Subtotal</span>
            <span className="font-mono">Rp {subtotal.toLocaleString('id-ID')}</span>
          </div>
          {pointDiscount > 0 && (
            <div className="flex justify-between text-rose-400 font-semibold">
              <span>Diskon Poin</span>
              <span className="font-mono">-Rp {pointDiscount.toLocaleString('id-ID')}</span>
            </div>
          )}
          <div className="flex justify-between text-sm sm:text-base font-bold text-white pt-1 border-t border-slate-800">
            <span>Total Bayar</span>
            <span className="text-emerald-400 font-mono">Rp {finalAmount.toLocaleString('id-ID')}</span>
          </div>
        </div>

        {/* Payment Method Selector */}
        <div className="grid grid-cols-4 gap-1.5">
          {(['CASH', 'QRIS', 'TRANSFER', 'DEBIT'] as const).map((method) => (
            <button
              key={method}
              onClick={() => {
                setPaymentMethod(method);
                setCheckoutError(null);
              }}
              className={`py-1.5 sm:py-2 rounded-xl text-[11px] sm:text-xs font-semibold border transition flex flex-col items-center justify-center gap-0.5 sm:gap-1 min-h-[40px] ${
                paymentMethod === method
                  ? 'bg-emerald-500/10 border-emerald-500 text-emerald-400'
                  : 'bg-slate-950 border-slate-800 text-slate-400 hover:bg-slate-800'
              }`}
            >
              {method === 'CASH' && <Banknote className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
              {method === 'QRIS' && <QrCode className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
              {method === 'TRANSFER' && <ArrowRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
              {method === 'DEBIT' && <CreditCard className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
              <span>{method}</span>
            </button>
          ))}
        </div>

        {/* Cash Paid Amount & Change Calculator */}
        {paymentMethod === 'CASH' && (
          <div className="space-y-2 pt-0.5">
            <div className="flex gap-1 overflow-x-auto pb-0.5">
              {getSmartCashSuggestions(finalAmount).map((sugg, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => selectQuickCash(sugg.value)}
                  className={`flex-1 min-w-[54px] border py-1 rounded-lg text-[10px] font-mono transition ${
                    paidAmountInput === sugg.value.toString()
                      ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400 font-bold'
                      : 'bg-slate-950 border-slate-800 hover:border-slate-700 text-slate-300'
                  }`}
                >
                  {sugg.label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">
                  Rp
                </span>
                <input
                  type="number"
                  placeholder="Nominal Bayar..."
                  value={paidAmountInput}
                  onChange={(e) => handlePaidAmountChange(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs sm:text-sm text-white font-mono placeholder-slate-600 focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div className="text-right px-1 shrink-0">
                <div className="text-[10px] text-slate-400">Kembalian</div>
                <div className="font-mono font-bold text-xs sm:text-sm text-emerald-400">
                  Rp {changeAmount.toLocaleString('id-ID')}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Process Transaction Button */}
        <button
          disabled={isSubmitting || cart.length === 0}
          onClick={handleCheckout}
          className={`w-full py-2.5 sm:py-3 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg transition min-h-[44px] ${
            isSubmitting || cart.length === 0
              ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
              : 'bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 shadow-emerald-500/20'
          }`}
        >
          <Sparkles className="w-4 h-4 sm:w-5 sm:h-5" />
          <span>{isSubmitting ? 'Memproses Bayar...' : 'Bayar & Cetak Struk'}</span>
        </button>
      </div>
    </div>
  );

  return (
    <DashboardLayout>
      {/* Floating Toast Notification Banner */}
      {toast && (
        <div
          className={`fixed top-4 inset-x-4 sm:inset-x-auto sm:right-4 z-[60] p-3.5 px-4 rounded-xl text-xs sm:text-sm font-semibold shadow-2xl flex items-center gap-2.5 transition-all duration-300 border ${
            toast.type === 'error'
              ? 'bg-rose-950/95 border-rose-500/50 text-rose-200 shadow-rose-950/50'
              : toast.type === 'success'
              ? 'bg-emerald-950/95 border-emerald-500/50 text-emerald-200 shadow-emerald-950/50'
              : 'bg-amber-950/95 border-amber-500/50 text-amber-200 shadow-amber-950/50'
          }`}
        >
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{toast.message}</span>
        </div>
      )}

      <div className="flex flex-col md:grid md:grid-cols-12 gap-4 md:gap-6 md:h-[calc(100vh-6rem)] relative">
        {/* Left Column: SKU Search & Product Grid */}
        <div className="w-full md:col-span-7 lg:col-span-7 xl:col-span-8 flex flex-col gap-3 md:gap-4 overflow-hidden pb-20 md:pb-0">
          {/* Search & Camera Toolbar */}
          <div className="flex items-center gap-2 sm:gap-3 bg-slate-900 border border-slate-800 p-2.5 sm:p-3 rounded-2xl shadow-sm">
            <div className="relative flex-1">
              <Search className="w-4 h-4 sm:w-5 sm:h-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Cari SKU, Nama Produk, atau Barcode..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 sm:pl-10 pr-3 sm:pr-4 py-2 sm:py-2.5 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition"
              />
            </div>
            <button
              onClick={() => setIsCameraOpen(true)}
              className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl flex items-center gap-1.5 text-xs sm:text-sm shadow-md shadow-emerald-500/20 transition shrink-0 min-h-[38px]"
            >
              <Camera className="w-4 h-4" />
              <span className="hidden sm:inline">Kamera Barcode</span>
            </button>
          </div>

          {/* Product Cards Container */}
          <div className="flex-1 overflow-y-auto pr-1">
            {loadingProducts ? (
              <div className="flex items-center justify-center h-48 text-slate-500 text-sm">
                Memuat katalog produk...
              </div>
            ) : products.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 text-slate-500 space-y-2">
                <ShoppingBag className="w-12 h-12 text-slate-700" />
                <p className="text-xs sm:text-sm">Tidak ada produk ditemukan.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-2.5 sm:gap-4">
                {products.map((product) => {
                  const isOutOfStock = product.stock <= 0;
                  return (
                    <div
                      key={product.id}
                      onClick={() => !isOutOfStock && addToCart(product)}
                      className={`bg-slate-900 border rounded-2xl p-2.5 sm:p-3.5 flex flex-col justify-between transition cursor-pointer group ${
                        isOutOfStock
                          ? 'border-slate-800 opacity-50 cursor-not-allowed'
                          : 'border-slate-800 hover:border-emerald-500/80 hover:bg-slate-800/80 shadow-md'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between text-[10px] sm:text-[11px] mb-1 gap-1">
                          <span className="bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded font-mono truncate max-w-[70px] sm:max-w-none">
                            {product.sku}
                          </span>
                          <span
                            className={`px-1.5 py-0.5 rounded font-medium shrink-0 ${
                              isOutOfStock
                                ? 'bg-rose-500/10 text-rose-400'
                                : product.stock <= 5
                                ? 'bg-amber-500/10 text-amber-400'
                                : 'bg-emerald-500/10 text-emerald-400'
                            }`}
                          >
                            Stok: {product.stock}
                          </span>
                        </div>
                        <h3 className="font-semibold text-xs sm:text-sm text-white line-clamp-2 mb-1 group-hover:text-emerald-400 transition">
                          {product.name}
                        </h3>
                        <p className="text-[10px] sm:text-xs text-slate-500 font-mono truncate">{product.barcode}</p>
                      </div>

                      <div className="mt-2.5 sm:mt-3 flex items-center justify-between border-t border-slate-800/80 pt-2">
                        <span className="font-bold text-emerald-400 text-xs sm:text-sm font-mono">
                          Rp {product.sellingPrice.toLocaleString('id-ID')}
                        </span>
                        <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 group-hover:bg-emerald-500 group-hover:text-slate-950 transition min-w-[32px] min-h-[32px] flex items-center justify-center">
                          <Plus className="w-4 h-4" />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Desktop Cart Panel */}
        {renderCartPanel(false)}
      </div>

      {/* Mobile Floating Bottom Bar */}
      <div className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-slate-900/95 backdrop-blur border-t border-slate-800 p-3 px-4 flex items-center justify-between shadow-2xl">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <ShoppingBag className="w-5 h-5" />
            </div>
            {cart.length > 0 && (
              <span className="absolute -top-1.5 -right-1.5 bg-emerald-500 text-slate-950 font-extrabold text-[10px] w-5 h-5 rounded-full flex items-center justify-center border-2 border-slate-900 font-mono">
                {cart.reduce((a, c) => a + c.quantity, 0)}
              </span>
            )}
          </div>
          <div>
            <div className="text-[10px] text-slate-400 uppercase font-mono">Total Tagihan</div>
            <div className="text-emerald-400 font-bold text-sm sm:text-base font-mono">
              Rp {finalAmount.toLocaleString('id-ID')}
            </div>
          </div>
        </div>

        <button
          onClick={() => setIsMobileCartOpen(true)}
          className="bg-gradient-to-r from-emerald-500 to-teal-400 text-slate-950 font-bold px-4 py-2.5 rounded-xl text-xs flex items-center gap-2 shadow-lg shadow-emerald-500/20 min-h-[44px]"
        >
          <span>Lihat Keranjang</span>
          <span className="bg-slate-950/20 px-1.5 py-0.5 rounded-md font-mono text-[11px]">
            ({cart.length})
          </span>
        </button>
      </div>

      {/* Mobile Cart Drawer Bottom Sheet Modal */}
      {isMobileCartOpen && (
        <div className="md:hidden fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex flex-col justify-end">
          <div className="fixed inset-0" onClick={() => setIsMobileCartOpen(false)} />
          <div className="relative z-10 w-full max-h-[92vh] overflow-hidden rounded-t-3xl shadow-2xl">
            {renderCartPanel(true)}
          </div>
        </div>
      )}

      {/* WebRTC Camera Barcode Scanner Modal */}
      <CameraScannerModal
        isOpen={isCameraOpen}
        onClose={() => setIsCameraOpen(false)}
        onScanSuccess={handleScanSuccess}
      />

      {/* Quick Add Member Modal */}
      {isQuickAddMemberOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2 text-emerald-400 font-bold text-base">
                <UserCheck className="w-5 h-5" />
                <span>Daftarkan Member Baru</span>
              </div>
              <button
                onClick={() => setIsQuickAddMemberOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {quickMemberError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{quickMemberError}</span>
              </div>
            )}

            <form onSubmit={handleQuickAddMember} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  No. WhatsApp / HP Pelanggan
                </label>
                <input
                  type="text"
                  placeholder="Contoh: 081234567890"
                  value={quickMemberPhone}
                  onChange={(e) => setQuickMemberPhone(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-white font-mono focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Nama Lengkap Pelanggan
                </label>
                <input
                  type="text"
                  placeholder="Contoh: Siti Rahma"
                  value={quickMemberName}
                  onChange={(e) => setQuickMemberName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsQuickAddMemberOpen(false)}
                  className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold py-2.5 rounded-xl transition"
                >
                  Batal
                </button>

                <button
                  type="submit"
                  disabled={isSubmittingQuickMember}
                  className="flex-1 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold py-2.5 rounded-xl shadow-lg shadow-emerald-500/20 transition flex items-center justify-center gap-2"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>{isSubmittingQuickMember ? 'Menyimpan...' : 'Simpan & Pasang ke Keranjang'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Thermal Receipt Print Modal */}
      <ThermalReceipt
        transaction={completedTransaction}
        isOpen={isReceiptOpen}
        onClose={() => setIsReceiptOpen(false)}
      />
    </DashboardLayout>
  );
}
