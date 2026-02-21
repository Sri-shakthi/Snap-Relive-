
import React, { useRef, useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';

interface CameraProps {
  onCapture: (blob: Blob) => void;
  onCancel: () => void;
}

const Camera: React.FC<CameraProps> = ({ onCapture, onCancel }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  const startCamera = useCallback(async () => {
    try {
      stopCamera();
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user' },
        audio: false,
      });
      streamRef.current = mediaStream;
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err) {
      setError('Camera access denied. Please enable permissions.');
    }
  }, [stopCamera]);

  useEffect(() => {
    startCamera();
    return () => {
      stopCamera();
    };
  }, [startCamera, stopCamera]);

  useEffect(() => {
    const onVisibilityChange = () => {
      if (document.hidden) {
        stopCamera();
      }
    };

    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [stopCamera]);

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const context = canvasRef.current.getContext('2d');
      if (context) {
        canvasRef.current.width = videoRef.current.videoWidth;
        canvasRef.current.height = videoRef.current.videoHeight;
        context.drawImage(videoRef.current, 0, 0);
        canvasRef.current.toBlob((blob) => {
          if (blob) {
            stopCamera();
            onCapture(blob);
          }
        }, 'image/jpeg', 0.8);
      }
    }
  };

  const handleCancel = () => {
    stopCamera();
    onCancel();
  };

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 text-center px-6">
        <div className="p-4 bg-red-50 text-red-600 rounded-xl">{error}</div>
        <button
          onClick={handleCancel}
          className="text-stone-500 font-medium"
        >
          Cancel and use Gallery
        </button>
      </div>
    );
  }

  return (
    <div className="relative w-full aspect-[3/4] rounded-3xl overflow-hidden bg-stone-900">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        className="w-full h-full object-cover"
      />
      
      {/* Frame Guide */}
      <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
        <div className="w-2/3 aspect-square border-2 border-white/50 rounded-full" />
      </div>

      <canvas ref={canvasRef} className="hidden" />

      <div className="absolute bottom-6 inset-x-0 flex justify-center items-center gap-8">
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={handleCancel}
          className="w-12 h-12 flex items-center justify-center rounded-full bg-black/30 backdrop-blur-md text-white"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </motion.button>

        <motion.button
          whileTap={{ scale: 0.85 }}
          onClick={capturePhoto}
          className="w-20 h-20 bg-white rounded-full flex items-center justify-center p-1"
        >
          <div className="w-full h-full rounded-full border-4 border-stone-200" />
        </motion.button>

        <div className="w-12" /> {/* Spacer */}
      </div>
    </div>
  );
};

export default Camera;
