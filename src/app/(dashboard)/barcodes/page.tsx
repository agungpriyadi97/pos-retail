'use client';

import React, { useState, useEffect, useRef } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import JsBarcode from 'jsbarcode';
import { Barcode, Printer, Plus, Minus, Trash2, CheckCircle2 } from 'lucide-react';

interface Product {
  id: string;
  barcode: string;
  sku: string;
  name: string;
  sellingPrice: number;
  unit: string;
}

interface LabelPrintItem {
  product: Product;
  quantity: number;
}

// Individual Barcode Card component rendering JSBarcode SVG
function BarcodeSvgRender({ barcode, sku, name, price }: { barcode: string; sku: string; name: string; price: number }) {
  const svgRef = useRef<SVGSVGElement | null>(null);

  useEffect(() => {
    if (svgRef.current && barcode) {
      try {
        JsBarcode(svgRef.current, barcode, {
          format: 'CODE128',
          width: 1.5,
          height: 38,
          displayValue: true,
          fontSize: 10,
          margin: 2,
        });
      } catch (err) {
        console.error('JSBarcode render error:', err);
      }
    }
  }, [barcode]);

  return (
    <div className="bg-white text-black p-2 border border-slate-300 rounded shadow-sm flex flex-col items-center justify-between text-center font-sans w-[140px] h-[100px] leading-none print:shadow-none print:border-black">
      <div className="text-[9px] font-bold truncate max-w-[130px] uppercase">{name}</div>
      <div className="text-[8px] font-mono text-slate-700">SKU: {sku}</div>
      <svg ref={svgRef} className="max-w-[130px] h-[45px] my-0.5" />
      <div className="text-[10px] font-bold font-mono">
        Rp {Number(price).toLocaleString('id-ID')}
      </div>
    </div>
  );
}

export default function BarcodeGeneratorPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [labelQuantity, setLabelQuantity] = useState<number>(5);
  const [printItems, setPrintItems] = useState<LabelPrintItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/products');
      const data = await res.json();
      if (data.success) {
        setProducts(data.data);
        if (data.data.length > 0) {
          setSelectedProductId(data.data[0].id);
        }
      }
    } catch (err) {
      console.error('Failed to load products', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddLabel = () => {
    const p = products.find((prod) => prod.id === selectedProductId);
    if (!p) return;

    setPrintItems((prev) => {
      const existing = prev.find((item) => item.product.id === p.id);
      if (existing) {
        return prev.map((item) =>
          item.product.id === p.id
            ? { ...item, quantity: item.quantity + labelQuantity }
            : item
        );
      }
      return [...prev, { product: p, quantity: labelQuantity }];
    });
  };

  const removeLabelItem = (productId: string) => {
    setPrintItems((prev) => prev.filter((item) => item.product.id !== productId));
  };

  const handlePrint = () => {
    window.print();
  };

  // Flatten print item instances
  const flatLabels = printItems.flatMap((item) =>
    Array.from({ length: item.quantity }, () => item.product)
  );

  return (
    <DashboardLayout>
      {/* Global CSS for printing barcode label grid */}
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden !important;
          }
          #barcode-print-section,
          #barcode-print-section * {
            visibility: visible !important;
          }
          #barcode-print-section {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 5mm !important;
            background: white !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      <div className="space-y-6">
        {/* Title Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900 border border-slate-800 p-4 rounded-2xl no-print">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-violet-500/10 text-violet-400 border border-violet-500/20">
              <Barcode className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">Generator Label Barcode SKU</h1>
              <p className="text-xs text-slate-400">
                Buat dan cetak stiker barcode standar CODE128 untuk ditempelkan pada produk fisik retail.
              </p>
            </div>
          </div>

          <button
            onClick={handlePrint}
            disabled={flatLabels.length === 0}
            className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 shadow-lg transition ${
              flatLabels.length === 0
                ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-emerald-500/20'
            }`}
          >
            <Printer className="w-4 h-4" />
            <span>Cetak {flatLabels.length} Stiker Barcode</span>
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Controls Panel */}
          <div className="lg:col-span-4 bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4 no-print">
            <h2 className="font-bold text-white text-base border-b border-slate-800 pb-3">
              Konfigurasi Cetak Label
            </h2>

            {loading ? (
              <div className="text-slate-500 text-xs py-4">Memuat produk...</div>
            ) : (
              <div className="space-y-4 text-xs">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    Pilih Produk SKU
                  </label>
                  <select
                    value={selectedProductId}
                    onChange={(e) => setSelectedProductId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-violet-500"
                  >
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        [{p.sku}] {p.name} - Rp {p.sellingPrice.toLocaleString('id-ID')}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    Jumlah Cetak Stiker (Copy)
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="1"
                      value={labelQuantity}
                      onChange={(e) => setLabelQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                      className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono text-center text-sm focus:outline-none focus:border-violet-500"
                    />
                    <div className="flex gap-1">
                      {[5, 10, 20, 50].map((qty) => (
                        <button
                          key={qty}
                          onClick={() => setLabelQuantity(qty)}
                          className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-2 py-2 rounded-lg text-xs font-mono"
                        >
                          +{qty}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <button
                  onClick={handleAddLabel}
                  className="w-full py-2.5 rounded-xl font-bold bg-violet-600 hover:bg-violet-500 text-white shadow-lg shadow-violet-500/20 transition flex items-center justify-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  <span>Tambahkan ke Antrean Cetak</span>
                </button>
              </div>
            )}

            {/* Print Items Queue List */}
            <div className="border-t border-slate-800 pt-4 space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-400 font-semibold">
                <span>Antrean Produk</span>
                <span>Total: {flatLabels.length} Stiker</span>
              </div>

              {printItems.length === 0 ? (
                <div className="text-center py-6 text-slate-500 text-xs">
                  Belum ada produk di antrean cetak.
                </div>
              ) : (
                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {printItems.map((item) => (
                    <div
                      key={item.product.id}
                      className="bg-slate-950 border border-slate-800/80 p-2.5 rounded-xl flex items-center justify-between gap-2 text-xs"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="font-semibold text-white truncate">
                          {item.product.name}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          SKU: {item.product.sku}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="font-mono text-emerald-400 font-bold bg-slate-900 px-2 py-0.5 rounded">
                          {item.quantity} pcs
                        </span>
                        <button
                          onClick={() => removeLabelItem(item.product.id)}
                          className="p-1 text-slate-400 hover:text-rose-400 transition"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Label Sheet Live Preview Grid */}
          <div className="lg:col-span-8 bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl">
            <h2 className="font-bold text-white text-base border-b border-slate-800 pb-3 mb-4 no-print flex items-center justify-between">
              <span>Preview Lembar Cetak Label (30mm x 20mm Grid)</span>
              <span className="text-xs text-slate-400 font-normal">
                {flatLabels.length} Stiker disiapkan
              </span>
            </h2>

            <div id="barcode-print-section" className="bg-slate-950 p-4 rounded-xl border border-slate-800/80 min-h-[350px]">
              {flatLabels.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-64 text-slate-500 space-y-2 no-print">
                  <Barcode className="w-12 h-12 text-slate-700" />
                  <p className="text-xs">Pilih produk dan tentukan jumlah copy untuk melihat preview lembar barcode.</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 justify-items-center">
                  {flatLabels.map((prod, idx) => (
                    <BarcodeSvgRender
                      key={idx}
                      barcode={prod.barcode}
                      sku={prod.sku}
                      name={prod.name}
                      price={prod.sellingPrice}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
