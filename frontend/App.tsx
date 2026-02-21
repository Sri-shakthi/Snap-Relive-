import React, { useEffect, useMemo, useState } from 'react';
import { HashRouter, Navigate, Route, Routes, useNavigate, useParams } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import Landing from './pages/Landing';
import Registration from './pages/Registration';
import Selfie from './pages/Selfie';
import WaitingRoom from './pages/WaitingRoom';
import Gallery from './pages/Gallery';
import Help from './pages/Help';
import UploadPhotos from './pages/UploadPhotos';
import Organizer from './pages/Organizer';
import { GuestDetails } from './types';

const STORAGE_KEY = 'snaprelive-session-v1';

interface PersistedSession {
  eventId: string;
  userId: string;
  guestDetails: GuestDetails | null;
}

const loadSession = (): PersistedSession => {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return { eventId: '', userId: '', guestDetails: null };
    }
    const parsed = JSON.parse(raw) as PersistedSession;
    return {
      eventId: parsed.eventId || '',
      userId: parsed.userId || '',
      guestDetails: parsed.guestDetails || null
    };
  } catch {
    return { eventId: '', userId: '', guestDetails: null };
  }
};

const GuestJoinRoute: React.FC<{ onSetEventId: (eventId: string) => void }> = ({ onSetEventId }) => {
  const navigate = useNavigate();
  const { eventId } = useParams();

  useEffect(() => {
    if (!eventId) return;
    onSetEventId(eventId);
    navigate('/register', { replace: true });
  }, [eventId, onSetEventId, navigate]);

  return <div className="p-6 text-sm text-stone-500">Opening event...</div>;
};

const PhotographerJoinRoute: React.FC<{ onSetEventId: (eventId: string) => void }> = ({ onSetEventId }) => {
  const { eventId } = useParams();
  const resolvedEventId = eventId || '';

  useEffect(() => {
    if (!resolvedEventId) return;
    onSetEventId(resolvedEventId);
  }, [resolvedEventId, onSetEventId]);

  return <UploadPhotos eventId={resolvedEventId} />;
};

const AppContent: React.FC = () => {
  const initialSession = loadSession();
  const [guestDetails, setGuestDetails] = useState<GuestDetails | null>(initialSession.guestDetails);
  const [selfie, setSelfie] = useState<Blob | string | null>(null);
  const [eventId, setEventId] = useState<string>(initialSession.eventId);
  const [userId, setUserId] = useState<string>(initialSession.userId);

  useEffect(() => {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        eventId,
        userId,
        guestDetails
      } satisfies PersistedSession)
    );
  }, [eventId, userId, guestDetails]);

  const session = useMemo(
    () => ({
      eventId,
      userId,
      hasSession: Boolean(eventId && userId)
    }),
    [eventId, userId]
  );

  return (
    <AnimatePresence mode="wait">
      <Routes>
        <Route path="/" element={<Navigate to="/organizer" replace />} />
        <Route path="/organizer" element={<Organizer />} />
        <Route path="/guest" element={<Landing onSetEventId={setEventId} />} />
        <Route path="/join/:eventId" element={<GuestJoinRoute onSetEventId={setEventId} />} />
        <Route
          path="/register"
          element={<Registration eventId={eventId} onComplete={(details, nextUserId) => {
            setGuestDetails(details);
            setUserId(nextUserId);
          }} />}
        />
        <Route
          path="/selfie"
          element={<Selfie eventId={eventId} userId={userId} onComplete={setSelfie} />}
        />
        <Route path="/waiting" element={<WaitingRoom eventId={eventId} userId={userId} />} />
        <Route path="/gallery" element={<Gallery eventId={eventId} userId={userId} />} />
        <Route path="/upload" element={<UploadPhotos eventId={eventId} />} />
        <Route path="/upload/:eventId" element={<PhotographerJoinRoute onSetEventId={setEventId} />} />
        <Route path="/help" element={<Help hasSession={session.hasSession} />} />
      </Routes>
    </AnimatePresence>
  );
};

const App: React.FC = () => {
  return (
    <HashRouter>
      <AppContent />
    </HashRouter>
  );
};

export default App;
