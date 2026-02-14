
import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import Layout from '../components/Layout';

const Landing: React.FC = () => {
  const navigate = useNavigate();

  return (
    <Layout showHeader={false}>
      <div className="flex-1 flex flex-col items-center justify-center text-center py-12">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="mb-12"
        >
          <h1 className="brand-font text-5xl font-bold mb-4 text-stone-900">SnapRelive</h1>
          <p className="text-stone-500 text-lg italic">"Find your moments instantly."</p>
        </motion.div>

        <div className="space-y-6 w-full px-4">
          <div className="space-y-2">
            <h2 className="text-2xl font-semibold text-stone-800">Find Your Photos</h2>
            <p className="text-stone-500 leading-relaxed">
              Register once. Photos appear as the photographer uploads them in real-time.
            </p>
          </div>

          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={() => navigate('/register')}
            className="w-full bg-stone-900 text-white py-5 rounded-2xl text-lg font-medium shadow-xl shadow-stone-200"
          >
            Get Started
          </motion.button>

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
