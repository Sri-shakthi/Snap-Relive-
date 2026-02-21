
import React from 'react';
import { motion } from 'framer-motion';
import { EVENT_DATA } from '../constants';

interface LayoutProps {
  children: React.ReactNode;
  showHeader?: boolean;
}

const Layout: React.FC<LayoutProps> = ({ children, showHeader = true }) => {
  return (
    <div className="min-h-screen max-w-md mx-auto bg-[#FAFAF9] flex flex-col relative overflow-x-hidden">
      {showHeader && (
        <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-stone-100 px-6 py-4 flex flex-col items-center justify-center gap-1">
          <span className="brand-font text-2xl font-bold text-stone-900">SnapShots</span>
          <span className="text-[10px] uppercase tracking-widest text-stone-400 font-medium">
            {EVENT_DATA.name}
          </span>
        </header>
      )}
      <main className="flex-1 flex flex-col p-6">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.3 }}
          className="flex-1 flex flex-col"
        >
          {children}
        </motion.div>
      </main>
    </div>
  );
};

export default Layout;
