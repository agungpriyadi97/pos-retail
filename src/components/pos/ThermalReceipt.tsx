'use client';

import React, { useState } from 'react';
import { Printer, X, CheckCircle2 } from 'lucide-react';

interface TransactionItem {
  id: string;
  quantity: number;
  sellingPrice: number;
  subtotal: number;
  product: {
    name: string;
    barcode: string;
    unit: string;
  };
}

interface ThermalReceiptProps {
  transaction: {
    invoiceNo: string;
    createdAt: string | Date;
    subtotal: number;
    pointsUsed: number;
    pointDiscount: number;
    finalAmount: number;
    paidAmount: number;
    changeAmount: number;
    paymentMethod: string;
    pointsEarned: number;
    branch: {
      name: string;
      address?: string | null;
      phone?: string | null;
    };
    cashier: {
      fullName: string;
    };
    member?: {
      fullName: string;
      phone: string;
      points: number;
    } | null;
    items: TransactionItem[];
  } | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function ThermalReceipt({
  transaction,
  isOpen,
  onClose,
}: ThermalReceiptProps) {
  const [paperWidth, setPaperWidth] = useState<'58mm' | '80mm'>('58mm');
  const [storeName, setStoreName] = useState<string>('Sekar POS Retail');

  React.useEffect(() => {
    if (isOpen) {
      fetch('/api/settings')
        .then((res) => res.json())
        .then((data) => {
          if (data.success && data.data?.storeName) {
            setStoreName(data.data.storeName);
          }
        })
        .catch((err) => console.error('Failed to load store name for receipt', err));
    }
  }, [isOpen]);

  if (!isOpen || !transaction) return null;

  const handlePrint = () => {
    window.print();
  };

  const formatCurrency = (val: number) => {
    return 'Rp ' + Number(val).toLocaleString('id-ID');
  };

  const formattedDate = new Date(transaction.createdAt).toLocaleString('id-ID', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-sm">
      {/* Dynamic CSS Print Styles */}
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden !important;
          }
          #thermal-receipt-container,
          #thermal-receipt-container * {
            visibility: visible !important;
          }
          #thermal-receipt-container {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: ${paperWidth === '58mm' ? '58mm' : '80mm'} !important;
            max-width: 100% !important;
            margin: 0 !important;
            padding: 3mm !important;
            background: white !important;
            color: black !important;
            font-family: 'Courier New', Courier, monospace !important;
            box-shadow: none !important;
            border: none !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      <div className="w-full max-w-md max-h-[92vh] flex flex-col bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800 bg-slate-900/90 shrink-0 no-print">
          <div className="flex items-center gap-2 text-emerald-400 font-semibold text-xs sm:text-sm">
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            <span>Struk Pembayaran Berhasil</span>
          </div>

          <div className="flex items-center gap-2">
            {/* Paper Size Selector */}
            <div className="flex bg-slate-800 rounded-lg p-0.5 text-xs font-mono">
              <button
                onClick={() => setPaperWidth('58mm')}
                className={`px-2.5 py-1 rounded-md transition ${
                  paperWidth === '58mm'
                    ? 'bg-emerald-500 text-slate-950 font-bold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                58mm
              </button>
              <button
                onClick={() => setPaperWidth('80mm')}
                className={`px-2.5 py-1 rounded-md transition ${
                  paperWidth === '80mm'
                    ? 'bg-emerald-500 text-slate-950 font-bold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                80mm
              </button>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Receipt Preview Container */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-4 flex justify-center bg-slate-950/50">
          <div
            id="thermal-receipt-container"
            className={`bg-white text-slate-900 font-mono text-xs shadow-md rounded-lg p-4 w-full flex flex-col leading-tight border border-slate-200 shrink-0 ${
              paperWidth === '58mm' ? 'max-w-[300px]' : 'max-w-[380px]'
            }`}
          >
            {/* 1. Header Store */}
            <div className="text-center font-bold text-sm uppercase tracking-wide mb-0.5 break-words text-slate-950">
              {storeName}
            </div>
            {transaction.branch?.name && (
              <div className="text-center font-semibold text-xs text-slate-800 mb-0.5 break-words">
                {transaction.branch.name}
              </div>
            )}
            {transaction.branch?.address && (
              <div className="text-center text-[10px] text-slate-600 mb-0.5 leading-tight break-words">
                {transaction.branch.address}
              </div>
            )}
            {transaction.branch?.phone && (
              <div className="text-center text-[10px] text-slate-600 mb-1 leading-tight">
                Telp: {transaction.branch.phone}
              </div>
            )}

            {/* 2. Dashed Divider */}
            <div className="border-b border-dashed border-slate-400 my-2"></div>

            {/* 3. Meta info */}
            <div className="space-y-0.5 text-[11px]">
              <div className="flex justify-between">
                <span className="text-slate-600">No. Inv:</span>
                <span className="font-bold font-mono text-slate-950">{transaction.invoiceNo}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Tanggal:</span>
                <span className="text-slate-900">{formattedDate}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Kasir:</span>
                <span className="text-slate-900">{transaction.cashier?.fullName || 'Kasir 1'}</span>
              </div>
              {transaction.member && (
                <div className="flex justify-between font-semibold text-emerald-800">
                  <span>Member:</span>
                  <span>{transaction.member.fullName}</span>
                </div>
              )}
            </div>

            {/* 4. Dashed Divider */}
            <div className="border-b border-dashed border-slate-400 my-2"></div>

            {/* 5. Items list */}
            <div className="space-y-1.5 text-[11px]">
              {transaction.items.map((item, idx) => (
                <div key={idx} className="flex flex-col">
                  <span className="font-semibold text-slate-900 break-words">{item.product.name}</span>
                  <div className="flex justify-between text-slate-600">
                    <span>
                      {item.quantity} {item.product.unit} x {formatCurrency(item.sellingPrice)}
                    </span>
                    <span className="font-mono font-semibold text-slate-950">
                      {formatCurrency(item.subtotal)}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* 6. Dashed Divider */}
            <div className="border-b border-dashed border-slate-400 my-2"></div>

            {/* 7. Price Calculations & 8. Payment Info */}
            <div className="space-y-1 text-[11px]">
              <div className="flex justify-between">
                <span className="text-slate-600">Subtotal:</span>
                <span className="font-mono text-slate-900">{formatCurrency(transaction.subtotal)}</span>
              </div>
              {transaction.pointDiscount > 0 && (
                <div className="flex justify-between text-rose-700">
                  <span>Diskon Poin ({transaction.pointsUsed} pt):</span>
                  <span className="font-mono">-{formatCurrency(transaction.pointDiscount)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-sm pt-1 border-t border-slate-900 text-slate-950">
                <span>TOTAL:</span>
                <span className="font-mono">{formatCurrency(transaction.finalAmount)}</span>
              </div>
              <div className="flex justify-between pt-0.5">
                <span className="text-slate-600">Bayar ({transaction.paymentMethod}):</span>
                <span className="font-mono text-slate-900">{formatCurrency(transaction.paidAmount)}</span>
              </div>
              <div className="flex justify-between font-semibold text-slate-900">
                <span className="text-slate-600">Kembali:</span>
                <span className="font-mono">{formatCurrency(transaction.changeAmount)}</span>
              </div>
            </div>

            {/* 9. Dashed Divider & 10. Member Points Summary */}
            {transaction.member && (
              <>
                <div className="border-b border-dashed border-slate-400 my-2"></div>
                <div className="text-[10px] space-y-0.5 bg-slate-100 p-1.5 rounded border border-slate-200">
                  <div className="flex justify-between">
                    <span className="text-slate-600">Poin Diperoleh:</span>
                    <span className="font-bold text-emerald-700">+{transaction.pointsEarned} pt</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Total Sisa Poin:</span>
                    <span className="font-bold text-slate-950">{transaction.member.points} pt</span>
                  </div>
                </div>
              </>
            )}

            {/* 11. Dashed Divider */}
            <div className="border-b border-dashed border-slate-400 my-2"></div>

            {/* 12. Footer Message */}
            <div className="text-center text-[10px] text-slate-600 leading-tight pb-1 space-y-0.5">
              <p className="font-medium text-slate-800">Terima kasih telah berbelanja!</p>
              <p>Barang yang sudah dibeli tidak dapat ditukar/dikembalikan.</p>
            </div>
          </div>
        </div>

        {/* Action Buttons Footer */}
        <div className="p-3 sm:p-4 border-t border-slate-800 bg-slate-900 flex gap-2.5 shrink-0 no-print">
          <button
            onClick={handlePrint}
            className="flex-1 py-3 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold rounded-xl flex items-center justify-center gap-2 transition shadow-lg shadow-emerald-500/20 text-xs sm:text-sm"
          >
            <Printer className="w-4 h-4 sm:w-5 sm:h-5" />
            <span>Cetak Struk Thermal</span>
          </button>
          <button
            onClick={onClose}
            className="px-5 py-3 bg-slate-800 hover:bg-slate-700 text-white font-medium rounded-xl transition text-xs sm:text-sm"
          >
            Selesai
          </button>
        </div>
      </div>
    </div>
  );
}
