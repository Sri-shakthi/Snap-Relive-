import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import Layout from '../components/Layout';
import Camera from '../components/Camera';
import { api, uploadToPresignedUrl } from '../services/api';

interface SelfieProps {
  eventId: string;
  userId: string;
  onComplete: (selfie: Blob | string) => void;
}

const Selfie: React.FC<SelfieProps> = ({ eventId, userId, onComplete }) => {
  const navigate = useNavigate();
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [capturedBlob, setCapturedBlob] = useState<Blob | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!eventId || !userId) {
      navigate('/');
    }
  }, [eventId, userId, navigate]);

  const handleCapture = (blob: Blob) => {
    const url = URL.createObjectURL(blob);
    setPreview(url);
    setCapturedBlob(blob);
    setIsCameraActive(false);
    setError('');
  };

  const handleFinish = async () => {
    if (!capturedBlob || !eventId || !userId) return;

    setIsUploading(true);
    setError('');

    try {
      const presigned = await api.presignSelfieUpload({
        userId,
        eventId,
        contentType: capturedBlob.type || 'image/jpeg'
      });

      await uploadToPresignedUrl(presigned.uploadUrl, capturedBlob, capturedBlob.type || 'image/jpeg');

      await api.confirmSelfieUpload({
        userId,
        eventId,
        bucket: presigned.bucket,
        s3Key: presigned.s3Key
      });

      onComplete(capturedBlob);
      navigate('/waiting');
    } catch (requestError) {
      const message = requestError instanceof Error ? requestError.message : 'Error uploading selfie.';
      setError(message);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Layout>
      <div className="flex-1 flex flex-col pb-10">
        {!isCameraActive && !preview ? (
          <div className="flex-1 flex flex-col justify-center items-center text-center space-y-8 py-8">
            <div className="space-y-4">
              <h2 className="text-3xl font-bold text-stone-900">Final Step</h2>
              <p className="text-stone-500 max-w-xs mx-auto">
                Take a quick selfie so our AI can find your photos in the event gallery.
              </p>
            </div>

            <div className="w-full space-y-4 pt-8">
              <motion.button
                whileTap={{ scale: 0.98 }}
                onClick={() => setIsCameraActive(true)}
                className="w-full bg-stone-900 text-white py-5 rounded-2xl text-lg font-medium flex items-center justify-center gap-3"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                Take Selfie
              </motion.button>
            </div>
          </div>
        ) : isCameraActive ? (
          <div className="flex-1 flex flex-col space-y-6 pt-4">
            <Camera onCapture={handleCapture} onCancel={() => setIsCameraActive(false)} />
            <div className="text-center text-stone-400 text-sm">Center your face in the guide.</div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center space-y-8 py-8">
            <h2 className="text-2xl font-bold text-stone-900">Looking good!</h2>
            <div className="w-full aspect-[3/4] rounded-3xl overflow-hidden shadow-2xl border-4 border-white">
              <img src={preview!} alt="Preview" className="w-full h-full object-cover" />
            </div>

            <div className="w-full space-y-4">
              <motion.button
                disabled={isUploading}
                whileTap={{ scale: 0.98 }}
                onClick={handleFinish}
                className="w-full bg-stone-900 text-white py-5 rounded-2xl text-lg font-medium shadow-xl flex items-center justify-center"
              >
                {isUploading ? (
                  <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  'Finish Registration'
                )}
              </motion.button>

              <button
                disabled={isUploading}
                onClick={() => {
                  setPreview(null);
                  setCapturedBlob(null);
                  setIsCameraActive(true);
                }}
                className="w-full text-stone-500 font-medium py-2"
              >
                Retake Photo
              </button>

              {error && <p className="text-sm text-red-500 text-center">{error}</p>}
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default Selfie;
