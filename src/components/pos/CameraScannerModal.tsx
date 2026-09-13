'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { X, Camera, CameraOff, Volume2, RefreshCw, Sparkles } from 'lucide-react';

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
  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
  const isStoppingRef = useRef<boolean>(false);

  const [isInitializing, setIsInitializing] = useState<boolean>(true);
  const [permissionDenied, setPermissionDenied] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState<boolean>(false);

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

  const stopScanner = useCallback(async () => {
    if (isStoppingRef.current) return;
    isStoppingRef.current = true;
    if (html5QrCodeRef.current) {
      try {
        if (html5QrCodeRef.current.isScanning) {
          await html5QrCodeRef.current.stop();
        }
        html5QrCodeRef.current.clear();
      } catch (err) {
        console.error('Error stopping html5QrCode:', err);
      } finally {
        html5QrCodeRef.current = null;
        setIsScanning(false);
        isStoppingRef.current = false;
      }
    }
  }, []);

  const handleClose = useCallback(async () => {
    await stopScanner();
    onClose();
  }, [stopScanner, onClose]);

  const startScanner = useCallback(async () => {
    setIsInitializing(true);
    setPermissionDenied(false);
    setErrorMessage(null);

    await stopScanner();

    // Ensure DOM element is present
    const element = document.getElementById('qr-reader');
    if (!element) {
      setIsInitializing(false);
      return;
    }

    try {
      const html5QrCode = new Html5Qrcode('qr-reader');
      html5QrCodeRef.current = html5QrCode;

      const config = {
        fps: 15,
        qrbox: (viewfinderWidth: number, viewfinderHeight: number) => {
          const minEdge = Math.min(viewfinderWidth, viewfinderHeight);
          const edge = Math.floor(minEdge * 0.75);
          return { width: edge, height: Math.min(edge, 250) };
        },
        aspectRatio: 1.0,
        disableFlip: false,
      };

      const handleSuccess = async (decodedText: string) => {
        playBeep();
        onScanSuccess(decodedText);
        await stopScanner();
        onClose();
      };

      const handleError = () => {
        // Suppress continuous scan frame error logs
      };

      // Try camera enumeration first
      let cameraConfig: string | { facingMode: string } = { facingMode: 'environment' };

      try {
        const cameras = await Html5Qrcode.getCameras();
        if (cameras && cameras.length > 0) {
          // Prefer back/rear/environment camera
          const backCamera = cameras.find((cam) => {
            const label = (cam.label || '').toLowerCase();
            return (
              label.includes('back') ||
              label.includes('rear') ||
              label.includes('environment') ||
              label.includes('belakang')
            );
          });
          cameraConfig = backCamera ? backCamera.id : cameras[cameras.length - 1].id;
        }
      } catch (enumErr) {
        console.warn('Camera enumeration unavailable, using facingMode fallback:', enumErr);
      }

      await html5QrCode.start(cameraConfig, config, handleSuccess, handleError);
      setIsScanning(true);
      setIsInitializing(false);
    } catch (err: any) {
      console.error('Failed to start Html5Qrcode scanner:', err);
      const errStr = String(err?.message || err || '');
      if (
        errStr.includes('NotAllowedError') ||
        errStr.includes('PermissionDeniedError') ||
        errStr.includes('Permission denied')
      ) {
        setPermissionDenied(true);
        setErrorMessage('Akses kamera ditolak. Mohon izinkan izin kamera di browser.');
      } else {
        setErrorMessage(errStr || 'Gagal menyalakan modul kamera WebRTC.');
      }
      setIsInitializing(false);
      await stopScanner();
    }
  }, [onScanSuccess, onClose, stopScanner]);

  useEffect(() => {
    if (!isOpen) return;

    // Small delay to ensure modal DOM rendering
    const timer = setTimeout(() => {
      startScanner();
    }, 150);

    return () => {
      clearTimeout(timer);
      stopScanner();
    };
  }, [isOpen, startScanner, stopScanner]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-900/90">
          <div className="flex items-center gap-2 text-emerald-400 font-semibold text-sm">
            <Camera className="w-5 h-5" />
            <span>Scan Barcode Kamera (WebRTC)</span>
          </div>
          <button
            onClick={handleClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 space-y-3 flex-1 flex flex-col">
          <div className="flex items-center gap-2 text-xs text-slate-400 bg-slate-800/60 p-2.5 rounded-xl border border-slate-700/50">
            <Volume2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>
              Arahkan kamera ke kode barcode/QR produk. Sinyal audio bip akan berbunyi saat kode
              terdeteksi.
            </span>
          </div>

          {/* Camera Viewfinder Box */}
          <div className="relative min-h-[300px] w-full rounded-xl overflow-hidden bg-black border border-slate-800 flex items-center justify-center">
            {/* Target element for html5-qrcode */}
            <div id="qr-reader" className="w-full h-full rounded-xl overflow-hidden" />

            {/* Initializing Spinner Overlay */}
            {isInitializing && (
              <div className="absolute inset-0 z-20 bg-slate-950/90 flex flex-col items-center justify-center space-y-3 p-4 text-center">
                <RefreshCw className="w-8 h-8 text-emerald-400 animate-spin" />
                <p className="text-xs text-slate-300 font-medium">Menyiapkan Kamera WebRTC...</p>
              </div>
            )}

            {/* Permission Denied or Error Overlay */}
            {(permissionDenied || (errorMessage && !isScanning && !isInitializing)) && (
              <div className="absolute inset-0 z-30 bg-slate-900/95 flex flex-col items-center justify-center p-6 text-center space-y-3">
                <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-full">
                  <CameraOff className="w-8 h-8" />
                </div>
                <h3 className="font-bold text-white text-sm">
                  {permissionDenied ? 'Akses Kamera Diblokir' : 'Gagal Membuka Kamera'}
                </h3>
                <p className="text-xs text-slate-400 max-w-xs leading-relaxed">
                  {permissionDenied
                    ? 'Izinkan akses kamera di pengaturan browser Anda untuk memindai barcode produk secara langsung.'
                    : errorMessage || 'Tidak dapat terhubung ke perangkat kamera.'}
                </p>

                <div className="flex gap-2 pt-2 w-full max-w-xs">
                  <button
                    onClick={startScanner}
                    className="flex-1 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold py-2 px-3 rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-500/20 transition"
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>Aktifkan Kamera Sekarang</span>
                  </button>
                  <button
                    onClick={handleClose}
                    className="bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold py-2 px-3 rounded-xl text-xs transition"
                  >
                    Tutup
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

