'use client';

import React, { useEffect, useRef } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { X, Camera, Volume2 } from 'lucide-react';

interface CameraScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScanSuccess: (barcode: string) => void;
}

export default function CameraScannerModal({
  isOpen,
  onClose,
  onScanSuccess,
}: CameraScannerModalProps) {
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);

  // Audio Beep generator using Web Audio API
  const playBeep = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, audioCtx.currentTime); // 880 Hz tone (A5)
      gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.15);

      osc.connect(gain);
      gain.connect(audioCtx.destination);

      osc.start();
      osc.stop(audioCtx.currentTime + 0.15);
    } catch (err) {
      console.log('Audio beep playback suppressed or unsupported:', err);
    }
  };

  useEffect(() => {
    if (!isOpen) return;

    // Small delay to allow DOM element rendering
    const timer = setTimeout(() => {
      const scanner = new Html5QrcodeScanner(
        'camera-reader',
        {
          fps: 10,
          qrbox: { width: 250, height: 180 },
          aspectRatio: 1.0,
          showTorchButtonIfSupported: true,
        },
        /* verbose= */ false
      );

      scanner.render(
        (decodedText) => {
          playBeep();
          onScanSuccess(decodedText);
          scanner.clear().catch(console.error);
          onClose();
        },
        (error) => {
          // ignore minor scan errors
        }
      );

      scannerRef.current = scanner;
    }, 100);

    return () => {
      clearTimeout(timer);
      if (scannerRef.current) {
        scannerRef.current.clear().catch(console.error);
        scannerRef.current = null;
      }
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl">
        <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-900/80">
          <div className="flex items-center gap-2 text-emerald-400 font-semibold">
            <Camera className="w-5 h-5" />
            <span>Scan Barcode Kamera (WebRTC)</span>
          </div>
          <button
            onClick={() => {
              if (scannerRef.current) {
                scannerRef.current.clear().catch(console.error);
              }
              onClose();
            }}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 space-y-3">
          <div className="flex items-center gap-2 text-xs text-slate-400 bg-slate-800/60 p-2.5 rounded-xl border border-slate-700/50">
            <Volume2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Arahkan kamera ke kode barcode/QR produk. Sinyal audio bip akan berbunyi saat kode terdeteksi.</span>
          </div>

          <div
            id="camera-reader"
            className="w-full overflow-hidden rounded-xl bg-black border border-slate-800"
          ></div>
        </div>
      </div>
    </div>
  );
}
