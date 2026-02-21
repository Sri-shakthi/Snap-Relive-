import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import Layout from '../components/Layout';
import { api } from '../services/api';

interface WaitingRoomProps {
  eventId: string;
  userId: string;
}

const WaitingRoom: React.FC<WaitingRoomProps> = ({ eventId, userId }) => {
  const navigate = useNavigate();
  const [lastUpdated, setLastUpdated] = useState(0);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [matchCount, setMatchCount] = useState(0);
  const [isChecking, setIsChecking] = useState(false);
  const [refreshMessage, setRefreshMessage] = useState('');
  const [backpressureMessage, setBackpressureMessage] = useState('');

  useEffect(() => {
    if (!eventId || !userId) {
      navigate('/');
      return;
    }

    const timer = setInterval(() => {
      if (autoRefresh) {
        setLastUpdated((previous) => (previous + 1) % 60);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [autoRefresh, eventId, userId, navigate]);

  const checkForMatches = async () => {
    if (!eventId || !userId) return;
    setIsChecking(true);

    try {
      const result = await api.getMatches({ userId, eventId, limit: 20 });
      setMatchCount(result.items.length);

      const queueStatus = await api.getQueueStatus();
      if (queueStatus.highDemand && queueStatus.message) {
        setBackpressureMessage(queueStatus.message);
      } else {
        setBackpressureMessage('');
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLastUpdated(0);
      setIsChecking(false);
    }
  };

  const runManualRefresh = async () => {
    if (!eventId || !userId) return;

    setRefreshMessage('');
    try {
      await api.refreshMatches({ userId, eventId });
      setRefreshMessage('Manual rematch queued. Checking updates...');
      await checkForMatches();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to queue rematch';
      setRefreshMessage(message);
    }
  };

  useEffect(() => {
    checkForMatches();
  }, []);

  useEffect(() => {
    if (!autoRefresh) return;

    const poll = setInterval(() => {
      checkForMatches();
    }, 10000);

    return () => clearInterval(poll);
  }, [autoRefresh, eventId, userId]);

  const steps = [
    { id: 1, title: 'Photographer uploads photos', status: 'completed' },
    { id: 2, title: 'Photos queued for processing', status: 'completed' },
    { id: 3, title: 'AI matching your face', status: matchCount > 0 ? 'completed' : 'active' },
    { id: 4, title: `Gallery updates (${matchCount} found)`, status: matchCount > 0 ? 'completed' : 'pending' }
  ];

  return (
    <Layout>
      <div className="flex-1 flex flex-col items-center py-10 space-y-10">
        <div className="text-center space-y-4">
          <div className="w-20 h-20 bg-green-50 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-3xl font-bold text-stone-900">You’re set!</h2>
          <p className="text-stone-500 max-w-xs mx-auto">
            Matches appear after event photos are uploaded and processed.
          </p>
        </div>

        <div className="w-full bg-white rounded-3xl border border-stone-100 p-8 space-y-6">
          {backpressureMessage && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
              <p className="text-sm font-semibold text-amber-800">{backpressureMessage}</p>
            </div>
          )}
          <h3 className="text-sm font-bold uppercase tracking-widest text-stone-400">Process Status</h3>
          <div className="space-y-6">
            {steps.map((step, index) => (
              <div key={step.id} className="flex items-start gap-4">
                <div className="relative">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                      step.status === 'completed'
                        ? 'bg-stone-900 text-white'
                        : step.status === 'active'
                          ? 'bg-stone-100 text-stone-900 border-2 border-stone-900'
                          : 'bg-stone-50 text-stone-300'
                    }`}
                  >
                    {step.status === 'completed' ? (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      step.id
                    )}
                  </div>
                  {index < steps.length - 1 && (
                    <div
                      className={`absolute top-8 left-4 w-0.5 h-6 ${
                        step.status === 'completed' ? 'bg-stone-900' : 'bg-stone-100'
                      }`}
                    />
                  )}
                </div>
                <div className="pt-1">
                  <p className={`font-medium ${step.status === 'pending' ? 'text-stone-300' : 'text-stone-800'}`}>
                    {step.title}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="w-full flex flex-col items-center gap-6 mt-4">
          <div className="flex items-center justify-between w-full px-2">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-stone-900 rounded-full animate-pulse" />
              <span className="text-xs text-stone-400 font-medium">Last updated: {lastUpdated}s ago</span>
            </div>
            <button
              onClick={() => setAutoRefresh(!autoRefresh)}
              className="flex items-center gap-2 text-xs text-stone-400 font-bold uppercase tracking-tighter"
            >
              Auto-Refresh {autoRefresh ? 'ON' : 'OFF'}
              <div className={`w-8 h-4 rounded-full p-0.5 transition-colors ${autoRefresh ? 'bg-stone-900' : 'bg-stone-200'}`}>
                <div className={`w-3 h-3 bg-white rounded-full transition-transform ${autoRefresh ? 'translate-x-4' : 'translate-x-0'}`} />
              </div>
            </button>
          </div>

          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={() => navigate('/gallery')}
            disabled={isChecking}
            className="w-full bg-stone-900 text-white py-5 rounded-2xl text-lg font-medium shadow-xl shadow-stone-200"
          >
            {isChecking ? 'Checking Matches...' : `Go to My Photos (${matchCount})`}
          </motion.button>

          <button
            onClick={runManualRefresh}
            className="w-full bg-white border border-stone-300 text-stone-800 py-3 rounded-2xl text-sm font-semibold"
          >
            Run Manual Rematch
          </button>

          {refreshMessage && <p className="text-xs text-stone-500 text-center">{refreshMessage}</p>}
        </div>
      </div>
    </Layout>
  );
};

export default WaitingRoom;
