import React, { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { api } from '../services/api';
import { Confidence, Photo } from '../types';

interface GalleryProps {
  eventId: string;
  userId: string;
}

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const Gallery: React.FC<GalleryProps> = ({ eventId, userId }) => {
  const navigate = useNavigate();
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [viewingPhoto, setViewingPhoto] = useState<Photo | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadingPhotoId, setDownloadingPhotoId] = useState<string | null>(null);
  const [isRefreshingMatches, setIsRefreshingMatches] = useState(false);
  const [isMobileClient, setIsMobileClient] = useState(false);

  useEffect(() => {
    const mobileMatch = window.matchMedia('(max-width: 768px)').matches;
    const touchMatch = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    setIsMobileClient(mobileMatch || touchMatch);
  }, []);

  useEffect(() => {
    if (!eventId || !userId) {
      navigate('/');
      return;
    }

    void fetchGallery();
  }, [eventId, userId, navigate]);

  const fetchGallery = async () => {
    if (!eventId || !userId) return;

    setIsLoading(true);
    setError('');

    try {
      const data = await api.getMatches({ userId, eventId, limit: 50 });
      setPhotos(
        data.items.map((item) => ({
          id: item.id,
          thumbnailUrl: item.thumbnailUrl,
          previewUrl: item.previewUrl,
          downloadUrl: item.downloadUrl,
          confidence: Confidence.HIGH,
          timestamp: item.timestamp
        }))
      );
    } catch (requestError) {
      const message = requestError instanceof Error ? requestError.message : 'Failed to fetch gallery.';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleManualRefresh = async () => {
    if (!eventId || !userId) return;
    setIsRefreshingMatches(true);
    setError('');

    try {
      await api.refreshMatches({ userId, eventId });
      await wait(1500);
      await fetchGallery();
    } catch (requestError) {
      const message = requestError instanceof Error ? requestError.message : 'Failed to refresh matches.';
      setError(message);
    } finally {
      setIsRefreshingMatches(false);
    }
  };

  const handleDownloadPhoto = async (photo: Photo) => {
    setIsDownloading(true);
    setDownloadingPhotoId(photo.id);
    setError('');

    try {
      const headers: HeadersInit = {};
      if (photo.downloadUrl.includes('ngrok-free.app')) {
        headers['ngrok-skip-browser-warning'] = '1';
      }

      const response = await fetch(photo.downloadUrl, { headers });

      if (!response.ok) {
        throw new Error(`Download failed (${response.status})`);
      }

      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = blobUrl;
      anchor.download = `snapshots-photo-${photo.id}.jpg`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.URL.revokeObjectURL(blobUrl);
    } catch (requestError) {
      // Fallback to direct navigation download without popup.
      const anchor = document.createElement('a');
      anchor.href = photo.downloadUrl;
      anchor.target = '_self';
      anchor.rel = 'noreferrer';
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();

      const message = requestError instanceof Error ? requestError.message : 'Unable to download photo.';
      setError(`Direct download fallback used. ${message}`);
    } finally {
      setIsDownloading(false);
      setDownloadingPhotoId(null);
    }
  };

  const sortedPhotos = useMemo(
    () => [...photos].sort((a, b) => b.timestamp - a.timestamp),
    [photos]
  );

  const openViewer = (photo: Photo) => {
    const previewPrefetch = new Image();
    previewPrefetch.src = photo.previewUrl;
    const fullPrefetch = new Image();
    fullPrefetch.src = photo.downloadUrl;
    setViewingPhoto(photo);
  };

  return (
    <Layout>
      <div className="flex-1 flex flex-col space-y-6">
        <div className="sticky top-[72px] bg-[#FAFAF9]/80 backdrop-blur-md z-40 py-2 flex items-center justify-between">
          <h2 className="text-xl font-bold text-stone-900">My Matches ({sortedPhotos.length})</h2>
          <button
            onClick={handleManualRefresh}
            disabled={isRefreshingMatches}
            className="px-3 py-2 rounded-xl text-xs font-bold bg-white border border-stone-300 text-stone-700"
          >
            {isRefreshingMatches ? 'Refreshing...' : 'Manual Rematch'}
          </button>
        </div>

        <div className="flex-1 min-h-[400px]">
          {isLoading ? (
            <div className="grid grid-cols-2 gap-3">
              {[1, 2, 3, 4, 5, 6].map((index) => (
                <div key={index} className="aspect-[3/4] bg-stone-200 animate-pulse rounded-2xl" />
              ))}
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center h-full py-20 text-center space-y-4">
              <p className="text-red-500">{error}</p>
              <button onClick={fetchGallery} className="px-4 py-2 rounded-xl bg-stone-900 text-white text-sm font-semibold">
                Retry
              </button>
            </div>
          ) : sortedPhotos.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full py-20 text-center space-y-4 opacity-70">
              <p className="font-medium text-stone-700">No matched photos yet.</p>
              <p className="text-sm text-stone-500">Ask photographer to upload event photos and return in a few minutes.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 pb-32">
              {sortedPhotos.map((photo) => (
                <motion.div
                  key={photo.id}
                  layoutId={photo.id}
                  onClick={() => openViewer(photo)}
                  className="relative aspect-[3/4] rounded-2xl overflow-hidden cursor-pointer shadow-sm active:scale-95 transition-transform"
                >
                  <img
                    src={isMobileClient ? photo.previewUrl : photo.thumbnailUrl}
                    alt="Gallery"
                    loading="lazy"
                    className="w-full h-full object-cover"
                  />
                </motion.div>
              ))}
            </div>
          )}
        </div>

        <AnimatePresence>
          {viewingPhoto && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black z-[100] flex flex-col overflow-y-auto"
            >
              <div className="sticky top-0 inset-x-0 p-4 sm:p-6 flex justify-end items-center z-10 bg-gradient-to-b from-black/60 to-transparent">
                <button onClick={() => setViewingPhoto(null)} className="text-white p-2 bg-black/20 rounded-full backdrop-blur-md">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="flex-1 min-h-0 flex items-center justify-center px-3 pb-20">
                <img
                  src={viewingPhoto.previewUrl}
                  alt="Viewer"
                  className="w-full max-w-6xl object-contain rounded-2xl shadow-2xl max-h-[calc(100dvh-140px)]"
                  style={{ touchAction: 'pinch-zoom', WebkitUserSelect: 'none' }}
                />
              </div>

              <div className="sticky bottom-0 inset-x-0 p-4 flex justify-center bg-gradient-to-t from-black/60 to-transparent">
                <button
                  onClick={() => handleDownloadPhoto(viewingPhoto)}
                  disabled={isDownloading && downloadingPhotoId === viewingPhoto.id}
                  className="bg-white text-stone-900 px-5 py-3 rounded-xl font-semibold min-w-40"
                >
                  {isDownloading && downloadingPhotoId === viewingPhoto.id ? 'Downloading...' : 'Download'}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {isDownloading && (
            <div className="fixed inset-0 z-[200] flex items-center justify-center bg-stone-900/40 backdrop-blur-sm">
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="bg-white p-10 rounded-3xl flex flex-col items-center gap-6 shadow-2xl"
              >
                <div className="w-16 h-16 border-4 border-stone-100 border-t-stone-900 rounded-full animate-spin" />
                <p className="font-bold text-stone-900">Downloading photo...</p>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </Layout>
  );
};

export default Gallery;
