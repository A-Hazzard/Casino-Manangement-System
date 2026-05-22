'use client';

import { useEffect, useRef, useState } from 'react';

type MachineInfo = {
  serialNumber: string;
  machineCustomName: string;
  machineName: string;
  manufacturer: string;
  sasMetersIn: number | null;
  sasMetersOut: number | null;
};

type CameraOverlayProps = {
  machineInfo: MachineInfo;
  onCapture: (imageData: string) => void;
  onCancel: () => void;
};

export default function CameraOverlay({
  machineInfo,
  onCapture,
  onCancel,
}: CameraOverlayProps) {
  // ============================================================================
  // State & Hooks
  // ============================================================================
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [error, setError] = useState<string | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);

  // ============================================================================
  // Effects
  // ============================================================================

  useEffect(() => {
    const startCamera = async () => {
      try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          setError('Camera API not available (requires HTTPS or localhost)');
          return;
        }

        const mediaStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' },
          audio: false,
        });
        streamRef.current = mediaStream;
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
        }
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : 'Camera access denied or unavailable';
        setError(`Camera error: ${message}`);
        console.error('[CameraOverlay] getUserMedia error:', err);
      }
    };

    startCamera();

    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  // ============================================================================
  // Handlers
  // ============================================================================

  const resizeImage = (
    ctx: CanvasRenderingContext2D,
    sourceWidth: number,
    sourceHeight: number
  ): { width: number; height: number } => {
    const MAX_DIMENSION = 1200;
    let width = sourceWidth;
    let height = sourceHeight;

    if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
      const ratio = Math.min(MAX_DIMENSION / width, MAX_DIMENSION / height);
      width = Math.round(width * ratio);
      height = Math.round(height * ratio);
    }

    return { width, height };
  };



  const captureFrame = (): string | null => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return null;

    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    const { width, height } = resizeImage(
      ctx,
      video.videoWidth,
      video.videoHeight
    );

    canvas.width = width;
    canvas.height = height;
    ctx.drawImage(video, 0, 0, width, height);

    return canvas.toDataURL('image/jpeg', 0.8);
  };

  const handleCapture = () => {
    const imageData = captureFrame();
    if (!imageData) return;

    setCapturedImage(imageData);

    // Pause video to freeze frame
    if (videoRef.current) {
      videoRef.current.pause();
    }
  };

  const handleRetake = async () => {
    setCapturedImage(null);
    setError(null);
    
    // Stop old tracks if any
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }

    // Restart camera
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
        audio: false,
      });
      streamRef.current = mediaStream;
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        videoRef.current.play();
      }
    } catch (err) {
      console.error('[CameraOverlay] Retake error:', err);
      setError('Failed to restart camera');
    }
  };

  const handleKeepPhoto = () => {
    if (capturedImage) {
      onCapture(capturedImage);
    }
  };



  const handleGalleryFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;

      // Resize the gallery-selected image too
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          onCapture(dataUrl);
          return;
        }
        const { width, height } = resizeImage(
          ctx,
          img.width,
          img.height
        );
        canvas.width = width;
        canvas.height = height;
        ctx.drawImage(img, 0, 0, width, height);
        const resized = canvas.toDataURL('image/jpeg', 0.8);
        onCapture(resized);
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  };

  const handleCancel = () => {
    onCancel();
  };

  // ============================================================================
  // Render
  // ============================================================================

  if (capturedImage) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col bg-black">
        <img
          src={capturedImage}
          alt="Captured meters"
          className="flex-1 object-contain"
        />
        <div className="bg-black/80 px-6 py-6">
          <p className="mb-4 text-center text-sm text-white/70">
            Keep this photo or retake it?
          </p>
          <div className="flex justify-center gap-4">
            <button
              type="button"
              onClick={handleRetake}
              className="flex items-center gap-2 rounded-lg border border-white/30 bg-black/40 px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-white/20"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Retake
            </button>
            <button
              type="button"
              onClick={handleKeepPhoto}
              className="flex items-center gap-2 rounded-lg bg-green-600 px-8 py-3 text-sm font-medium text-white transition-colors hover:bg-green-700"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Keep Photo
            </button>
          </div>
          <button
            type="button"
            onClick={handleCancel}
            className="mt-4 block w-full text-center text-sm text-white/50 underline hover:text-white/70"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  // ============================================================================
  // Error state (camera unavailable) — fallback file picker
  // ============================================================================

  if (error) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black p-6">
        <p className="mb-4 text-center text-sm text-white/80">{error}</p>
        <p className="mb-6 text-center text-sm text-white/50">
          You can upload a photo instead
        </p>
        <label className="cursor-pointer rounded-lg bg-white px-6 py-2 text-sm font-medium text-gray-900 transition-colors hover:bg-gray-100">
          Choose Photo
          <input
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={e => {
              const file = e.target.files?.[0];
              if (!file) return;
              handleGalleryFile(file);
            }}
          />
        </label>
        <button
          type="button"
          onClick={handleCancel}
          className="mt-4 text-sm text-white/60 underline hover:text-white/80"
        >
          Go Back
        </button>
      </div>
    );
  }

  // ============================================================================
  // Live camera view with overlay
  // ============================================================================

  return (
    <div className="fixed inset-0 z-50 bg-black">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        className="h-full w-full object-cover"
      />

      {/* Overlay info box at top */}
      <div className="absolute left-0 right-0 top-0 bg-black/60 p-4 text-white">
        <div className="space-y-0.5 text-sm">
          <p>
            <span className="text-white/60">Machine: </span>
            {machineInfo.serialNumber || machineInfo.machineName}
          </p>
          <p>
            <span className="text-white/60">Name: </span>
            {machineInfo.machineCustomName || machineInfo.machineName}
          </p>
          <p>
            <span className="text-white/60">Manufacturer: </span>
            {machineInfo.manufacturer}
          </p>
          <p>
            <span className="text-white/60">Meters In: </span>
            {machineInfo.sasMetersIn?.toLocaleString() ?? 'N/A'}
          </p>
          <p>
            <span className="text-white/60">Meters Out: </span>
            {machineInfo.sasMetersOut?.toLocaleString() ?? 'N/A'}
          </p>
        </div>
      </div>

      {/* Capture button at bottom center */}
      <div className="absolute bottom-12 left-0 right-0 flex flex-col items-center gap-3">
        <button
          type="button"
          onClick={handleCapture}
          className="flex h-16 w-16 items-center justify-center rounded-full border-4 border-white bg-white/20 transition-colors hover:bg-white/30"
        >
          <div className="h-12 w-12 rounded-full border-2 border-white" />
        </button>

        {/* Gallery button */}
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="flex items-center gap-1.5 rounded-full bg-black/40 px-4 py-1.5 text-xs text-white/70 transition-colors hover:bg-black/60 hover:text-white"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          Gallery
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={e => {
            const file = e.target.files?.[0];
            if (!file) return;
            handleGalleryFile(file);
          }}
        />
      </div>

      {/* Cancel button top left */}
      <button
        type="button"
        onClick={handleCancel}
        className="absolute left-4 top-20 rounded-full bg-black/40 p-2 text-white transition-colors hover:bg-black/60"
      >
        <svg
          className="h-6 w-6"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M6 18L18 6M6 6l12 12"
          />
        </svg>
      </button>

      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}
