import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import Layout from '../components/Layout';

interface LandingProps {
  onSetEventId: (eventId: string) => void; // retained for compatibility
}

const Landing: React.FC<LandingProps> = ({ onSetEventId }) => {
  void onSetEventId;

  return (
    <Layout showHeader={false}>
      <div className="flex-1 flex flex-col items-center justify-center text-center py-12">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="mb-10"
        >
          <h1 className="brand-font text-5xl font-bold mb-4 text-stone-900">SnapRelive</h1>
          <p className="text-stone-500 text-lg italic">"Find your moments instantly."</p>
        </motion.div>

        <div className="space-y-5 w-full px-4">
          <div className="space-y-2">
            <h2 className="text-2xl font-semibold text-stone-800">Use your invite link</h2>
            <p className="text-stone-500 leading-relaxed">
              This page is only a fallback. Open the guest or photographer link shared by the organizer.
            </p>
          </div>

          <Link
            to="/organizer"
            className="block text-stone-500 font-medium hover:text-stone-700 transition-colors underline underline-offset-2"
          >
            Organizer console
          </Link>

          <Link
            to="/help"
            className="block text-stone-400 font-medium hover:text-stone-600 transition-colors"
          >
            How it works
          </Link>
        </div>

        <div className="mt-auto pt-12">
          <p className="text-[10px] text-stone-300 uppercase tracking-widest font-bold">
            Powered by SnapRelive AI
          </p>
        </div>
      </div>
    </Layout>
  );
};

export default Landing;
