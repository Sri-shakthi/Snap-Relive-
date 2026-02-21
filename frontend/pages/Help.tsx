
import React from 'react';
import { Link } from 'react-router-dom';
import Layout from '../components/Layout';

interface HelpProps {
  hasSession: boolean;
}

const Help: React.FC<HelpProps> = ({ hasSession }) => {
  const faqs = [
    {
      q: "Why do you need a selfie?",
      a: "Our AI uses your selfie to scan all event photos and instantly find the ones where you appear. It saves you from scrolling through thousands of photos."
    },
    {
      q: "How long does it take?",
      a: "Matches usually appear within 5 minutes of a photographer uploading their batch of photos. This happens throughout the event!"
    },
    {
      q: "Is my data private?",
      a: "Yes. Your selfie is only used for face matching at this specific event and is automatically deleted after the gallery closes."
    },
    {
      q: "Camera isn't working?",
      a: "Check your browser permissions. On most mobile phones, you can find this in Settings > Safari/Chrome > Camera. You can also upload a photo from your gallery instead."
    }
  ];

  return (
    <Layout>
      <div className="space-y-10 pb-20">
        <header className="space-y-2">
          <Link to="/" className="text-stone-400 font-bold uppercase text-[10px] tracking-widest flex items-center gap-2 mb-4">
             <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M15 19l-7-7 7-7" /></svg>
             Back
          </Link>
          <h2 className="text-3xl font-bold text-stone-900">How it works</h2>
          <p className="text-stone-500">Everything you need to know about SnapRelive.</p>
        </header>

        <div className="space-y-8">
          {faqs.map((faq, i) => (
            <div key={i} className="space-y-3">
              <h3 className="font-bold text-stone-900 text-lg">{faq.q}</h3>
              <p className="text-stone-500 leading-relaxed">{faq.a}</p>
            </div>
          ))}
        </div>

        <div className="pt-10">
          <Link to={hasSession ? '/register' : '/'} className="block w-full text-center bg-stone-900 text-white py-5 rounded-2xl font-bold">
             Got it, let's start
          </Link>
        </div>
      </div>
    </Layout>
  );
};

export default Help;
