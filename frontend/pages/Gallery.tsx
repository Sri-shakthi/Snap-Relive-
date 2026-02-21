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
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [viewingPhoto, setViewingPhoto] = useState<Photo | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
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

  const handleToggleSelect = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const handleDownloadSelected = async () => {
    if (!eventId || !userId || selectedIds.size === 0) {
      return;
    }

    setIsDownloading(true);
    setError('');

    try {
      const createResult = await api.createDownloadJob({
        userId,
        eventId,
        photoIds: Array.from(selectedIds)
      });

      const startedAt = Date.now();
      const timeoutMs = 120000;

      while (Date.now() - startedAt < timeoutMs) {
        const status = await api.getDownloadJob({
          downloadId: createResult.downloadId,
          userId
        });

        if (status.status === 'COMPLETED' && status.downloadUrl) {
          window.open(status.downloadUrl, '_blank', 'noopener,noreferrer');
          setSelectedIds(new Set());
          setIsSelectMode(false);
          return;
        }

        if (status.status === 'FAILED') {
          throw new Error(status.errorMessage || 'Download preparation failed');
        }

        await wait(1800);
      }

      throw new Error('Download timed out. Please try again.');
    } catch (requestError) {
      const message = requestError instanceof Error ? requestError.message : 'Unable to prepare ZIP download.';
      setError(message);
    } finally {
      setIsDownloading(false);
    }
  };

  const handleSaveSelectedMobile = async () => {
    if (!eventId || !userId || selectedIds.size === 0) {
      return;
    }

    setIsDownloading(true);
    setError('');

    try {
      const linksResult = await api.createDownloadLinks({
        userId,
        eventId,
        photoIds: Array.from(selectedIds)
      });

      for (const link of linksResult.links) {
        window.open(link.downloadUrl, '_blank', 'noopener,noreferrer');
        await wait(400);
      }

      setSelectedIds(new Set());
      setIsSelectMode(false);
    } catch (requestError) {
      const message = requestError instanceof Error ? requestError.message : 'Unable to open selected photos.';
      setError(message);
    } finally {
      setIsDownloading(false);
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
          <div className="flex items-center gap-2">
            <button
              onClick={handleManualRefresh}
              disabled={isRefreshingMatches}
              className="px-3 py-2 rounded-xl text-xs font-bold bg-white border border-stone-300 text-stone-700"
            >
              {isRefreshingMatches ? 'Refreshing...' : 'Manual Rematch'}
            </button>
            <button
              onClick={() => {
                setIsSelectMode(!isSelectMode);
                setSelectedIds(new Set());
              }}
              className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                isSelectMode ? 'bg-stone-900 text-white' : 'text-stone-500 bg-stone-100'
              }`}
            >
              {isSelectMode ? 'Cancel' : 'Select'}
            </button>
          </div>
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
                  onClick={() => (isSelectMode ? handleToggleSelect(photo.id) : openViewer(photo))}
                  className="relative aspect-[3/4] rounded-2xl overflow-hidden cursor-pointer shadow-sm active:scale-95 transition-transform"
                >
                  <img
                    src={photo.thumbnailUrl}
                    alt="Gallery"
                    loading="lazy"
                    className="w-full h-full object-cover"
                  />

                  {isSelectMode && (
                    <div className="absolute top-2 right-2">
                      <div
                        className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                          selectedIds.has(photo.id) ? 'bg-stone-900 border-stone-900' : 'bg-white/50 border-white'
                        }`}
                      >
                        {selectedIds.has(photo.id) && (
                          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </div>
                    </div>
                  )}
                </motion.div>
              ))}
            </div>
          )}
        </div>

        <AnimatePresence>
          {isSelectMode && selectedIds.size > 0 && (
            <motion.div
              initial={{ y: 100 }}
              animate={{ y: 0 }}
              exit={{ y: 100 }}
              className="fixed bottom-0 inset-x-0 bg-white/90 backdrop-blur-xl border-t border-stone-100 p-6 z-50 flex items-center justify-between safe-area-inset-bottom"
            >
              <div className="flex flex-col">
                <span className="text-xl font-bold text-stone-900">{selectedIds.size}</span>
                <span className="text-xs text-stone-400 font-medium">Selected</span>
              </div>
              <div className="flex flex-col items-end gap-2">
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={isMobileClient ? handleSaveSelectedMobile : handleDownloadSelected}
                  className="bg-stone-900 text-white px-6 py-3 rounded-xl font-bold shadow-lg"
                >
                  {isMobileClient ? 'Save Photos' : 'Download Selected'}
                </motion.button>
                {isMobileClient && (
                  <button
                    onClick={handleDownloadSelected}
                    className="text-xs text-stone-500 underline underline-offset-2"
                  >
                    Download ZIP (Advanced)
                  </button>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

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
                <a
                  href={viewingPhoto.downloadUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-white text-stone-900 px-5 py-3 rounded-xl font-semibold"
                >
                  Open Full Quality
                </a>
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
                <p className="font-bold text-stone-900">
                  {isMobileClient ? 'Opening selected photos...' : 'Preparing ZIP download...'}
                </p>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </Layout>
  );
};

export default Gallery;
