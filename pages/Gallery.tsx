
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Layout from '../components/Layout';
import { mockApi } from '../services/mockApi';
import { Photo, Confidence } from '../types';

const Gallery: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'CONFIRMED' | 'POSSIBLE'>('CONFIRMED');
  const [confirmed, setConfirmed] = useState<Photo[]>([]);
  const [possible, setPossible] = useState<Photo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [viewingPhoto, setViewingPhoto] = useState<Photo | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);

  useEffect(() => {
    fetchGallery();
  }, []);

  const fetchGallery = async () => {
    setIsLoading(true);
    try {
      const data = await mockApi.getGallery();
      setConfirmed(data.confirmed);
      setPossible(data.possible);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleSelect = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const handleConfirm = async (id: string) => {
    const photo = possible.find(p => p.id === id);
    if (photo) {
      await mockApi.confirmPhoto(id);
      setConfirmed([...confirmed, { ...photo, confidence: Confidence.HIGH }]);
      setPossible(possible.filter(p => p.id !== id));
      setViewingPhoto(null);
    }
  };

  const handleReject = async (id: string) => {
    await mockApi.rejectPhoto(id);
    setPossible(possible.filter(p => p.id !== id));
    setViewingPhoto(null);
  };

  const handleDownloadSelected = async () => {
    setIsDownloading(true);
    await mockApi.downloadSelected(Array.from(selectedIds));
    setIsDownloading(false);
    setSelectedIds(new Set());
    setIsSelectMode(false);
  };

  const photosToDisplay = activeTab === 'CONFIRMED' ? confirmed : possible;

  return (
    <Layout>
      <div className="flex-1 flex flex-col space-y-6">
        {/* Tabs & Actions */}
        <div className="sticky top-[72px] bg-[#FAFAF9]/80 backdrop-blur-md z-40 py-2 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div className="flex p-1 bg-stone-100 rounded-xl">
              <button
                onClick={() => setActiveTab('CONFIRMED')}
                className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                  activeTab === 'CONFIRMED' ? 'bg-white shadow-sm text-stone-900' : 'text-stone-400'
                }`}
              >
                Confirmed
              </button>
              <button
                onClick={() => setActiveTab('POSSIBLE')}
                className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all relative ${
                  activeTab === 'POSSIBLE' ? 'bg-white shadow-sm text-stone-900' : 'text-stone-400'
                }`}
              >
                Possible
                {possible.length > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-stone-900 text-white text-[10px] flex items-center justify-center rounded-full">
                    {possible.length}
                  </span>
                )}
              </button>
            </div>
            
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

        {/* Gallery Grid */}
        <div className="flex-1 min-h-[400px]">
          {isLoading ? (
            <div className="grid grid-cols-2 gap-3">
              {[1, 2, 3, 4, 5, 6].map(i => (
                <div key={i} className="aspect-[3/4] bg-stone-200 animate-pulse rounded-2xl" />
              ))}
            </div>
          ) : photosToDisplay.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full py-20 text-center space-y-4 opacity-40">
              <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <p className="font-medium">No photos yet — check back in a few minutes.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 pb-32">
              {photosToDisplay.map(photo => (
                <motion.div
                  key={photo.id}
                  layoutId={photo.id}
                  onClick={() => isSelectMode ? handleToggleSelect(photo.id) : setViewingPhoto(photo)}
                  className="relative aspect-[3/4] rounded-2xl overflow-hidden cursor-pointer shadow-sm active:scale-95 transition-transform"
                >
                  <img src={photo.url} alt="Gallery" className="w-full h-full object-cover" />
                  
                  {isSelectMode && (
                    <div className="absolute top-2 right-2">
                       <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                         selectedIds.has(photo.id) ? 'bg-stone-900 border-stone-900' : 'bg-white/50 border-white'
                       }`}>
                         {selectedIds.has(photo.id) && <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                       </div>
                    </div>
                  )}

                  {photo.confidence === Confidence.POSSIBLE && !isSelectMode && (
                    <div className="absolute bottom-2 left-2 right-2 bg-white/90 backdrop-blur-sm px-2 py-1 rounded-lg text-[10px] font-bold text-stone-600 flex items-center gap-1 uppercase tracking-tighter">
                      <span className="w-2 h-2 bg-amber-400 rounded-full" />
                      Possible Match
                    </div>
                  )}
                </motion.div>
              ))}
            </div>
          )}
        </div>

        {/* Floating Bottom Bar for Selection */}
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
              <div className="flex gap-3">
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={handleDownloadSelected}
                  className="bg-stone-900 text-white px-6 py-3 rounded-xl font-bold shadow-lg"
                >
                  Download Selected
                </motion.button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Full Screen Viewer */}
        <AnimatePresence>
          {viewingPhoto && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black z-[100] flex flex-col"
            >
              <div className="absolute top-0 inset-x-0 p-6 flex justify-between items-center z-10">
                 <button onClick={() => setViewingPhoto(null)} className="text-white p-2 bg-black/20 rounded-full backdrop-blur-md">
                   <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                 </button>
                 {viewingPhoto.confidence === Confidence.POSSIBLE && (
                   <span className="px-3 py-1 bg-amber-400 text-black rounded-full text-xs font-bold uppercase">Confirm your match</span>
                 )}
              </div>

              <div className="flex-1 flex items-center justify-center p-4">
                 <img src={viewingPhoto.url} alt="Viewer" className="max-w-full max-h-full rounded-2xl shadow-2xl" />
              </div>

              {viewingPhoto.confidence === Confidence.POSSIBLE && (
                <div className="p-8 bg-black/80 backdrop-blur-md border-t border-white/10 space-y-4 safe-area-inset-bottom">
                  <p className="text-white text-center font-medium">Is this you?</p>
                  <div className="flex gap-4">
                    <button
                      onClick={() => handleReject(viewingPhoto.id)}
                      className="flex-1 py-4 text-white font-bold rounded-2xl border border-white/20"
                    >
                      Not me
                    </button>
                    <button
                      onClick={() => handleConfirm(viewingPhoto.id)}
                      className="flex-1 py-4 bg-white text-black font-bold rounded-2xl"
                    >
                      Yes, that's me
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Global Downloader Loader */}
        <AnimatePresence>
          {isDownloading && (
            <div className="fixed inset-0 z-[200] flex items-center justify-center bg-stone-900/40 backdrop-blur-sm">
               <motion.div 
                 initial={{ scale: 0.8, opacity: 0 }}
                 animate={{ scale: 1, opacity: 1 }}
                 className="bg-white p-10 rounded-3xl flex flex-col items-center gap-6 shadow-2xl"
               >
                 <div className="w-16 h-16 border-4 border-stone-100 border-t-stone-900 rounded-full animate-spin" />
                 <p className="font-bold text-stone-900">Preparing your memories...</p>
               </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </Layout>
  );
};

export default Gallery;
