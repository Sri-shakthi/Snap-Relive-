import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import Layout from '../components/Layout';
import { api } from '../services/api';
import { EventType } from '../types';

const Organizer: React.FC = () => {
  const [eventName, setEventName] = useState('Snapshots Live Event');
  const [eventType, setEventType] = useState<EventType>(EventType.MARRIAGE);
  const [startsAt, setStartsAt] = useState('');
  const [endsAt, setEndsAt] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState('');
  const [createdEventId, setCreatedEventId] = useState('');

  const baseUrl = useMemo(() => window.location.origin, []);
  const guestLink = createdEventId ? `${baseUrl}/#/join/${createdEventId}` : '';
  const photographerLink = createdEventId ? `${baseUrl}/#/upload/${createdEventId}` : '';

  const copyToClipboard = async (value: string) => {
    await navigator.clipboard.writeText(value);
  };

  const createEvent = async () => {
    setIsCreating(true);
    setError('');

    try {
      const now = new Date();
      const start = startsAt ? new Date(startsAt).toISOString() : now.toISOString();
      const end = endsAt
        ? new Date(endsAt).toISOString()
        : new Date(now.getTime() + 6 * 60 * 60 * 1000).toISOString();

      const result = await api.createEvent({
        name: eventName.trim() || 'Snapshots Live Event',
        eventType,
        startsAt: start,
        endsAt: end
      });

      setCreatedEventId(result.event.id);
    } catch (requestError) {
      const message = requestError instanceof Error ? requestError.message : 'Failed to create event';
      setError(message);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Layout>
      <div className="space-y-6 pb-10">
        <header className="space-y-2">
          <p className="text-xs uppercase tracking-widest text-stone-400 font-semibold">Organizer Console</p>
          <h2 className="text-3xl font-bold text-stone-900">Create Event and Share Links</h2>
          <p className="text-stone-500">
            Create an event once, then share guest and photographer links.
          </p>
        </header>

        <div className="space-y-4">
          <label className="text-sm font-semibold text-stone-600 ml-1">Event Name</label>
          <input
            value={eventName}
            onChange={(event) => setEventName(event.target.value)}
            className="w-full bg-white border border-stone-200 px-4 py-4 rounded-2xl outline-none focus:border-stone-400"
            placeholder="Wedding Reception"
          />

          <label className="text-sm font-semibold text-stone-600 ml-1">Event Type</label>
          <select
            value={eventType}
            onChange={(event) => setEventType(event.target.value as EventType)}
            className="w-full bg-white border border-stone-200 px-4 py-4 rounded-2xl outline-none focus:border-stone-400"
          >
            <option value={EventType.MARRIAGE}>Marriage</option>
            <option value={EventType.BIRTHDAY}>Birthday</option>
            <option value={EventType.CORPORATE}>Corporate</option>
            <option value={EventType.OTHER}>Other</option>
          </select>

          <label className="text-sm font-semibold text-stone-600 ml-1">Starts At (optional)</label>
          <input
            type="datetime-local"
            value={startsAt}
            onChange={(event) => setStartsAt(event.target.value)}
            className="w-full bg-white border border-stone-200 px-4 py-4 rounded-2xl outline-none focus:border-stone-400"
          />

          <label className="text-sm font-semibold text-stone-600 ml-1">Ends At (optional)</label>
          <input
            type="datetime-local"
            value={endsAt}
            onChange={(event) => setEndsAt(event.target.value)}
            className="w-full bg-white border border-stone-200 px-4 py-4 rounded-2xl outline-none focus:border-stone-400"
          />
        </div>

        <motion.button
          whileTap={{ scale: 0.98 }}
          disabled={isCreating}
          onClick={createEvent}
          className="w-full bg-stone-900 text-white py-5 rounded-2xl text-lg font-medium shadow-xl shadow-stone-200"
        >
          {isCreating ? 'Creating Event...' : 'Create Event'}
        </motion.button>

        {error && <p className="text-sm text-red-500">{error}</p>}

        {createdEventId && (
          <div className="bg-white border border-stone-200 rounded-2xl p-5 space-y-4">
            <p className="text-xs uppercase tracking-widest text-stone-400 font-semibold">Share Links</p>

            <div className="space-y-2">
              <p className="text-sm font-semibold text-stone-700">Guest Link</p>
              <p className="text-xs break-all text-stone-500">{guestLink}</p>
              <button
                onClick={() => copyToClipboard(guestLink)}
                className="text-sm font-semibold text-stone-800 underline underline-offset-2"
              >
                Copy Guest Link
              </button>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-semibold text-stone-700">Photographer Link</p>
              <p className="text-xs break-all text-stone-500">{photographerLink}</p>
              <button
                onClick={() => copyToClipboard(photographerLink)}
                className="text-sm font-semibold text-stone-800 underline underline-offset-2"
              >
                Copy Photographer Link
              </button>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default Organizer;
