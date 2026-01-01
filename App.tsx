
import React, { useState } from 'react';
import { AppMode } from './types';
import VoiceAgronomist from './components/VoiceAgronomist';
import TextAgronomist from './components/TextAgronomist';

const App: React.FC = () => {
  const [mode, setMode] = useState<AppMode>(AppMode.VOICE);
  const [showDeploy, setShowDeploy] = useState(false);

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-[#f0f2f0]">
      {/* Sidebar / Info Panel */}
      <aside className="lg:w-80 agri-bg text-white p-8 flex flex-col justify-between shadow-2xl z-10">
        <div>
          <div className="flex items-center space-x-3 mb-8">
            <div className="bg-white p-2 rounded-lg">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-green-800" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h1 className="text-3xl font-black tracking-tight">Atim.ai</h1>
          </div>

          <div className="space-y-6">
            <section>
              <h2 className="text-xs uppercase tracking-widest font-bold opacity-60 mb-2">Platform Goal</h2>
              <p className="text-sm leading-relaxed opacity-90">
                Powering low-cost agronomy advice for farmers using 2G button phones in Northern Uganda. 
              </p>
            </section>

            <section className="bg-black/20 p-4 rounded-xl border border-white/10">
              <h2 className="text-xs uppercase tracking-widest font-bold text-yellow-400 mb-3">Deploy to 2G Phone</h2>
              <ol className="text-[11px] space-y-3 opacity-90 list-decimal pl-4">
                <li>Register at <a href="https://africastalking.com" target="_blank" className="underline font-bold">Africa's Talking</a>.</li>
                <li>Get a <strong>Shared USSD Code</strong> (Approx. $15/mo).</li>
                <li>Deploy the <code>backend-bridge.js</code> template to Render/Heroku.</li>
                <li>Point AT Callback URL to your server.</li>
              </ol>
              <button 
                onClick={() => setShowDeploy(!showDeploy)}
                className="mt-4 w-full bg-white text-green-900 text-[10px] font-bold py-2 rounded uppercase"
              >
                {showDeploy ? 'Hide Guide' : 'View Backend Code'}
              </button>
            </section>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-white/10">
          <p className="text-[10px] opacity-50 uppercase font-bold tracking-tighter">Simulation Dashboard v1.5</p>
          <p className="text-xs opacity-70">Hardware bridge ready for deployment.</p>
        </div>
      </aside>

      {/* Simulator Section */}
      <main className="flex-1 flex flex-col items-center justify-center p-4 lg:p-12 relative">
        {showDeploy && (
          <div className="absolute inset-4 lg:inset-12 bg-gray-900 z-50 rounded-3xl p-8 overflow-auto text-white shadow-2xl border-4 border-green-800">
             <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold">Backend Logic Guide</h2>
                <button onClick={() => setShowDeploy(false)} className="bg-red-500 p-2 rounded-full">
                   <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                   </svg>
                </button>
             </div>
             <p className="text-sm mb-4 text-gray-400">Copy this into a new file named <code>index.js</code> and run <code>npm init -y && npm install express body-parser @google/genai</code>.</p>
             <pre className="bg-black p-6 rounded-xl text-[11px] overflow-x-auto border border-white/10">
{`const express = require('express');
const { GoogleGenAI } = require('@google/genai');
const app = express();

app.post('/ussd', async (req, res) => {
  const { text } = req.body;
  // logic to bridge to Gemini...
  res.send('CON Welcome to Atim.ai');
});`}
             </pre>
             <p className="mt-6 text-yellow-400 text-sm font-bold">Important: Use "CON" to keep the user session open on their phone screen.</p>
          </div>
        )}

        <div className="w-full max-w-md bg-[#222] rounded-[3rem] p-4 shadow-2xl border-[8px] border-[#333] aspect-[9/18] flex flex-col relative overflow-hidden">
          {/* Internal Screen */}
          <div className="flex-1 bg-white rounded-[2rem] overflow-hidden flex flex-col">
            {/* Header / Mode Switcher */}
            <div className="bg-gray-100 p-4 border-b flex justify-between items-center shrink-0">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Atim Network</span>
              <div className="flex bg-gray-200 p-1 rounded-full">
                <button
                  onClick={() => setMode(AppMode.VOICE)}
                  className={`px-3 py-1 rounded-full text-[10px] font-bold transition-all ${mode === AppMode.VOICE ? 'bg-white text-green-800 shadow-sm' : 'text-gray-500'}`}
                >
                  CALL
                </button>
                <button
                  onClick={() => setMode(AppMode.TEXT)}
                  className={`px-3 py-1 rounded-full text-[10px] font-bold transition-all ${mode === AppMode.TEXT ? 'bg-white text-green-800 shadow-sm' : 'text-gray-500'}`}
                >
                  USSD
                </button>
              </div>
            </div>

            {/* Simulated Content */}
            <div className="flex-1 relative overflow-hidden">
              {mode === AppMode.VOICE ? (
                <VoiceAgronomist />
              ) : (
                <TextAgronomist />
              )}
            </div>
          </div>

          {/* Home Button Mockup */}
          <div className="h-16 flex items-center justify-center shrink-0">
            <div className="w-12 h-12 rounded-full border-2 border-[#444] bg-[#2a2a2a] shadow-inner"></div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default App;
