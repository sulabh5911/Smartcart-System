import React, { useEffect, useRef, useState } from 'react';
import { AlertCircle, Camera, CameraOff, RefreshCw } from 'lucide-react';
import Modal from './Modal';

function getCameraError(error) {
  const message = String(`${error?.name || ''} ${error?.message || error || ''}`).toLowerCase();
  if (message.includes('notallowed') || message.includes('permission') || message.includes('denied')) {
    return 'Camera access was denied. Allow camera permission in your browser and retry.';
  }
  if (message.includes('notfound') || message.includes('no camera')) {
    return 'No camera was found. Connect a camera or use a USB barcode scanner.';
  }
  if (message.includes('notreadable') || message.includes('in use')) {
    return 'The camera is unavailable or being used by another application.';
  }
  return 'Unable to start the camera. Check browser permission and camera availability, then retry.';
}

export default function BarcodeScanner({ isOpen, onClose, onScan }) {
  const scannerRef = useRef(null);
  const onScanRef = useRef(onScan);
  const lastBarcodeRef = useRef('');
  const resetTimerRef = useRef(null);
  const [retryCount, setRetryCount] = useState(0);
  const [status, setStatus] = useState('starting');
  const [error, setError] = useState('');
  const containerId = `barcode-camera-${React.useId().replace(/:/g, '')}`;

  useEffect(() => {
    onScanRef.current = onScan;
  }, [onScan]);

  useEffect(() => {
    if (!isOpen) return undefined;

    let disposed = false;
    let startSettled = false;
    let scanner = null;

    import('html5-qrcode')
      .then(({ Html5Qrcode, Html5QrcodeSupportedFormats }) => {
        if (disposed) return undefined;
        scanner = new Html5Qrcode(containerId, {
          verbose: false,
          formatsToSupport: [
            Html5QrcodeSupportedFormats.EAN_13,
            Html5QrcodeSupportedFormats.EAN_8,
            Html5QrcodeSupportedFormats.UPC_A,
            Html5QrcodeSupportedFormats.UPC_E,
            Html5QrcodeSupportedFormats.CODE_128
          ]
        });
        scannerRef.current = scanner;

        return scanner.start(
          { facingMode: 'environment' },
          { fps: 10, qrbox: { width: 260, height: 150 } },
          (decodedText) => {
            if (disposed || decodedText === lastBarcodeRef.current) return;
            lastBarcodeRef.current = decodedText;
            if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
            onScanRef.current(decodedText);
          },
          () => {
            if (lastBarcodeRef.current) {
              if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
              resetTimerRef.current = setTimeout(() => {
                lastBarcodeRef.current = '';
              }, 1200);
            }
          }
        );
      })
      .then(() => {
        startSettled = true;
        if (disposed) {
          if (scanner?.isScanning) {
            return scanner.stop().then(() => scanner.clear());
          }
          return scanner?.clear();
        }
        if (!scanner) return undefined;
        setStatus('scanning');
        return undefined;
      })
      .catch((cameraError) => {
        startSettled = true;
        if (!disposed) {
          setStatus('error');
          setError(getCameraError(cameraError));
        }
      });

    return () => {
      disposed = true;
      if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
      lastBarcodeRef.current = '';
      if (!scanner) return;
      if (scanner.isScanning) {
        scanner.stop().then(() => scanner.clear()).catch((stopError) => {
          console.error('Failed to stop barcode camera:', stopError);
        });
      } else if (startSettled) {
        scanner.clear();
      }
      if (scannerRef.current === scanner) scannerRef.current = null;
    };
  }, [containerId, isOpen, retryCount]);

  const stopCamera = async () => {
    const scanner = scannerRef.current;
    if (!scanner) return false;
    setStatus('stopping');
    try {
      if (scanner.isScanning) await scanner.stop();
      await scanner.clear();
      setStatus('stopped');
      return true;
    } catch (stopError) {
      setStatus('error');
      setError(getCameraError(stopError));
      return false;
    }
  };

  const retryCamera = () => {
    setStatus('starting');
    setError('');
    if (scannerRef.current?.isScanning) {
      stopCamera().then((stopped) => {
        if (stopped) setRetryCount((count) => count + 1);
      });
      return;
    }
    setRetryCount((count) => count + 1);
  };

  const handleClose = () => {
    setStatus('starting');
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Scan Barcode"
      subtitle="Center the product barcode inside the camera frame"
      maxWidth="max-w-2xl"
    >
      <div className="space-y-4">
        <div className="relative overflow-hidden rounded-xl bg-slate-950 min-h-64">
          <div id={containerId} className="w-full min-h-64 [&_video]:w-full [&_video]:object-cover" />
          {status === 'scanning' && (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <div className="w-[82%] h-28 rounded-xl border-2 border-emerald-400 shadow-[0_0_0_999px_rgba(15,23,42,0.28)]">
                <div className="h-0.5 w-full bg-emerald-400/90 animate-pulse" />
              </div>
            </div>
          )}
          {status === 'starting' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-slate-950 text-white">
              <RefreshCw className="h-6 w-6 animate-spin text-emerald-400" />
              <span className="text-sm">Requesting camera access…</span>
            </div>
          )}
          {status === 'error' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-slate-950 px-6 text-center text-white">
              <AlertCircle className="h-8 w-8 text-rose-400" />
              <p className="max-w-sm text-sm">{error}</p>
            </div>
          )}
          {status === 'stopped' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-slate-950 text-white">
              <CameraOff className="h-7 w-7 text-slate-400" />
              <span className="text-sm">Camera stopped</span>
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-slate-600" role="status" aria-live="polite">
            {status === 'scanning' ? 'Camera active — ready to scan' : status === 'stopping' ? 'Stopping camera…' : ''}
          </p>
          <div className="flex gap-2">
            {status === 'scanning' ? (
              <button
                type="button"
                onClick={stopCamera}
                className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                <CameraOff className="h-4 w-4" /> Stop Camera
              </button>
            ) : (
              <button
                type="button"
                onClick={retryCamera}
                disabled={status === 'starting' || status === 'stopping'}
                className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
              >
                {status === 'stopped' ? <Camera className="h-4 w-4" /> : <RefreshCw className="h-4 w-4" />}
                {status === 'stopped' ? 'Start Camera' : 'Retry Camera'}
              </button>
            )}
          </div>
        </div>
        <p className="text-[11px] text-slate-400">
          Camera scanning requires browser permission and a secure context (HTTPS or localhost).
        </p>
      </div>
    </Modal>
  );
}
