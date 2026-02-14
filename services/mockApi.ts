
import { Photo, Confidence, GuestDetails } from '../types';

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const MOCK_PHOTOS: Photo[] = Array.from({ length: 12 }).map((_, i) => ({
  id: `p-${i}`,
  url: `https://picsum.photos/seed/${i + 100}/800/1000`,
  confidence: i < 6 ? Confidence.HIGH : Confidence.POSSIBLE,
  timestamp: Date.now() - (i * 1000 * 60 * 30),
}));

export const mockApi = {
  startSession: async (eventId: string) => {
    await delay(800);
    return { success: true, eventId };
  },

  submitGuestDetails: async (details: GuestDetails) => {
    await delay(1200);
    // Simulate rare random error
    if (Math.random() < 0.05) throw new Error("Connection lost. Please try again.");
    return { success: true };
  },

  uploadSelfie: async (blob: Blob | string) => {
    await delay(1500);
    return { success: true, selfieId: 'selfie_123' };
  },

  getGallery: async () => {
    await delay(1000);
    return {
      confirmed: MOCK_PHOTOS.filter(p => p.confidence === Confidence.HIGH),
      possible: MOCK_PHOTOS.filter(p => p.confidence === Confidence.POSSIBLE),
    };
  },

  confirmPhoto: async (photoId: string) => {
    await delay(500);
    return { success: true };
  },

  rejectPhoto: async (photoId: string) => {
    await delay(500);
    return { success: true };
  },

  downloadSelected: async (photoIds: string[]) => {
    await delay(2000);
    return { success: true, downloadUrl: '#' };
  }
};
