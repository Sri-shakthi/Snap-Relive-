
import React, { useState } from 'react';
import { HashRouter, Routes, Route, useNavigate } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import Landing from './pages/Landing';
import Registration from './pages/Registration';
import Selfie from './pages/Selfie';
import WaitingRoom from './pages/WaitingRoom';
import Gallery from './pages/Gallery';
import Help from './pages/Help';
import { GuestDetails } from './types';

const AppContent: React.FC = () => {
  const [guestDetails, setGuestDetails] = useState<GuestDetails | null>(null);
  const [selfie, setSelfie] = useState<Blob | string | null>(null);

  return (
    <AnimatePresence mode="wait">
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route 
          path="/register" 
          element={<Registration onComplete={setGuestDetails} />} 
        />
        <Route 
          path="/selfie" 
          element={<Selfie onComplete={setSelfie} />} 
        />
        <Route path="/waiting" element={<WaitingRoom />} />
        <Route path="/gallery" element={<Gallery />} />
        <Route path="/help" element={<Help />} />
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
