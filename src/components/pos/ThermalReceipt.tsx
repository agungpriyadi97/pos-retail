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
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
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
            margin: 0 !important;
            padding: 4mm !important;
            background: white !important;
            color: black !important;
            font-family: 'Courier New', Courier, monospace !important;
            box-shadow: none !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-900/80 no-print">
          <div className="flex items-center gap-2 text-emerald-400 font-semibold">
            <CheckCircle2 className="w-5 h-5" />
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
        <div className="p-4 overflow-y-auto bg-slate-950 flex justify-center">
          <div
            id="thermal-receipt-container"
            style={{ width: paperWidth === '58mm' ? '240px' : '320px' }}
            className="bg-white text-black p-4 rounded-lg font-mono text-xs shadow-md leading-tight border border-slate-200"
          >
            {/* Header Store */}
            <div className="text-center font-bold text-sm uppercase mb-0.5">
              {storeName}
            </div>
            {transaction.branch?.name && (
              <div className="text-center font-semibold text-xs text-slate-800 mb-1">
                {transaction.branch.name}
              </div>
            )}
            {transaction.branch?.address && (
              <div className="text-center text-[10px] mb-0.5 text-slate-700">
                {transaction.branch.address}
              </div>
            )}
            {transaction.branch?.phone && (
              <div className="text-center text-[10px] mb-2 text-slate-700">
                Telp: {transaction.branch.phone}
              </div>
            )}

            <div className="border-b border-dashed border-black my-2"></div>

            {/* Meta info */}
            <div className="space-y-0.5 text-[11px]">
              <div className="flex justify-between">
                <span>No. Inv:</span>
                <span className="font-bold">{transaction.invoiceNo}</span>
              </div>
              <div className="flex justify-between">
                <span>Tanggal:</span>
                <span>{formattedDate}</span>
              </div>
              <div className="flex justify-between">
                <span>Kasir:</span>
                <span>{transaction.cashier?.fullName || 'Kasir 1'}</span>
              </div>
              {transaction.member && (
                <div className="flex justify-between font-bold text-emerald-800">
                  <span>Member:</span>
                  <span>{transaction.member.fullName}</span>
                </div>
              )}
            </div>

            <div className="border-b border-dashed border-black my-2"></div>

            {/* Items list */}
            <div className="space-y-1.5 text-[11px]">
              {transaction.items.map((item, idx) => (
                <div key={idx} className="flex flex-col">
                  <span className="font-semibold">{item.product.name}</span>
                  <div className="flex justify-between text-slate-700">
                    <span>
                      {item.quantity} {item.product.unit} x {formatCurrency(item.sellingPrice)}
                    </span>
                    <span className="font-mono font-semibold text-black">
                      {formatCurrency(item.subtotal)}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            <div className="border-b border-dashed border-black my-2"></div>

            {/* Price Calculations */}
            <div className="space-y-1 text-[11px]">
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span>{formatCurrency(transaction.subtotal)}</span>
              </div>
              {transaction.pointDiscount > 0 && (
                <div className="flex justify-between text-rose-700">
                  <span>Diskon Poin ({transaction.pointsUsed} pt):</span>
                  <span>-{formatCurrency(transaction.pointDiscount)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-sm pt-1 border-t border-black">
                <span>TOTAL:</span>
                <span>{formatCurrency(transaction.finalAmount)}</span>
              </div>
              <div className="flex justify-between pt-0.5">
                <span>Bayar ({transaction.paymentMethod}):</span>
                <span>{formatCurrency(transaction.paidAmount)}</span>
              </div>
              <div className="flex justify-between font-semibold">
                <span>Kembali:</span>
                <span>{formatCurrency(transaction.changeAmount)}</span>
              </div>
            </div>

            {transaction.member && (
              <>
                <div className="border-b border-dashed border-black my-2"></div>
                <div className="text-[10px] space-y-0.5 bg-slate-100 p-1.5 rounded">
                  <div className="flex justify-between">
                    <span>Poin Diperoleh:</span>
                    <span className="font-bold">+{transaction.pointsEarned} pt</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Total Sisa Poin:</span>
                    <span className="font-bold">{transaction.member.points} pt</span>
                  </div>
                </div>
              </>
            )}

            <div className="border-b border-dashed border-black my-2"></div>

            {/* Footer */}
            <div className="text-center text-[10px] text-slate-700 space-y-1">
              <p className="font-medium">Terima kasih telah berbelanja!</p>
              <p>Barang yang sudah dibeli tidak dapat ditukar/dikembalikan.</p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="p-4 border-t border-slate-800 bg-slate-900 flex gap-3 no-print">
          <button
            onClick={handlePrint}
            className="flex-1 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 transition"
          >
            <Printer className="w-5 h-5" />
            <span>Cetak Struk Thermal</span>
          </button>
          <button
            onClick={onClose}
            className="bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold py-2.5 px-4 rounded-xl transition"
          >
            Selesai
          </button>
        </div>
      </div>
    </div>
  );
}
