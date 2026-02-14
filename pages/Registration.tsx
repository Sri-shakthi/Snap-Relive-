
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import Layout from '../components/Layout';
import { Side, GuestDetails } from '../types';
import { RELATION_OPTIONS, COMMON_RELATIONS } from '../constants';

interface RegistrationProps {
  onComplete: (details: GuestDetails) => void;
}

const Registration: React.FC<RegistrationProps> = ({ onComplete }) => {
  const navigate = useNavigate();
  const [fullName, setFullName] = useState('');
  const [side, setSide] = useState<Side | null>(null);
  const [relation, setRelation] = useState('');
  const [phone, setPhone] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!fullName.trim()) newErrors.fullName = "Please enter your name";
    if (!side) newErrors.side = "Please select a side";
    if (!relation) newErrors.relation = "Please select your relation";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (validate() && side) {
      onComplete({ fullName, side, relation, phoneNumber: phone });
      navigate('/selfie');
    }
  };

  return (
    <Layout>
      <div className="space-y-8 pb-10">
        <header>
          <h2 className="text-2xl font-bold text-stone-900 mb-2">Almost there...</h2>
          <p className="text-stone-500">Tell us how you know the couple.</p>
        </header>

        <div className="space-y-6">
          {/* Full Name */}
          <div className="space-y-2">
            <label className="text-sm font-semibold text-stone-600 ml-1">Full Name</label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="e.g. Johnathan Doe"
              className={`w-full bg-white border ${errors.fullName ? 'border-red-300' : 'border-stone-200'} px-5 py-4 rounded-2xl outline-none focus:border-stone-400 transition-colors`}
            />
            {errors.fullName && <p className="text-red-500 text-xs ml-1">{errors.fullName}</p>}
          </div>

          {/* Side Selection */}
          <div className="space-y-2">
            <label className="text-sm font-semibold text-stone-600 ml-1">Whose guest are you?</label>
            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => { setSide(Side.BRIDE); setRelation(''); }}
                className={`py-6 px-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-2 ${
                  side === Side.BRIDE ? 'border-stone-900 bg-stone-50' : 'border-stone-100 bg-white'
                }`}
              >
                <span className="text-2xl">👰‍♀️</span>
                <span className="font-semibold text-stone-800">Bride's Side</span>
              </button>
              <button
                onClick={() => { setSide(Side.GROOM); setRelation(''); }}
                className={`py-6 px-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-2 ${
                  side === Side.GROOM ? 'border-stone-900 bg-stone-50' : 'border-stone-100 bg-white'
                }`}
              >
                <span className="text-2xl">🤵‍♂️</span>
                <span className="font-semibold text-stone-800">Groom's Side</span>
              </button>
            </div>
            {errors.side && <p className="text-red-500 text-xs ml-1">{errors.side}</p>}
          </div>

          {/* Relation Selection */}
          <div className={`space-y-2 transition-opacity ${side ? 'opacity-100' : 'opacity-30 pointer-events-none'}`}>
            <label className="text-sm font-semibold text-stone-600 ml-1">Your Relation</label>
            <select
              value={relation}
              onChange={(e) => setRelation(e.target.value)}
              className={`w-full bg-white border ${errors.relation ? 'border-red-300' : 'border-stone-200'} px-5 py-4 rounded-2xl outline-none appearance-none focus:border-stone-400 transition-colors`}
            >
              <option value="">Select your relation...</option>
              {side && RELATION_OPTIONS[side].map(opt => <option key={opt} value={opt}>{opt}</option>)}
              {COMMON_RELATIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
            </select>
            {errors.relation && <p className="text-red-500 text-xs ml-1">{errors.relation}</p>}
          </div>

          {/* Phone (Optional) */}
          <div className="space-y-2">
            <label className="text-sm font-semibold text-stone-600 ml-1">Phone Number (Optional)</label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+1 (555) 000-0000"
              className="w-full bg-white border border-stone-200 px-5 py-4 rounded-2xl outline-none focus:border-stone-400 transition-colors"
            />
          </div>
        </div>

        <motion.button
          whileTap={{ scale: 0.98 }}
          onClick={handleSubmit}
          className="w-full bg-stone-900 text-white py-5 rounded-2xl text-lg font-medium shadow-xl shadow-stone-200 mt-8"
        >
          Continue
        </motion.button>
      </div>
    </Layout>
  );
};

export default Registration;
