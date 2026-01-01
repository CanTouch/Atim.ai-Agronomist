
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { GoogleGenAI, Modality, LiveServerMessage } from '@google/genai';
import { decode, decodeAudioData, createPcmBlob } from '../utils/audio';

const SYSTEM_INSTRUCTION = `
You are Atim.ai, an automated agronomist for farmers using button phones in Northern Uganda.
You are a LADY agronomist. Your voice is female.

VOICE AND PERSONA:
- YOU MUST SPEAK WITH A NATURAL NORTHERN UGANDAN / AFRICAN ACCENT.
- Your tone should be warm, helpful, and like a trusted neighbor in the community.

LANGUAGE RULE:
- USE AN ENGLISH-FIRST APPROACH. Start the conversation in English.
- Automatically switch to Acoli (Acholi/Luo) ONLY if the user speaks Acoli or specifically requests it.
- If the user switches back to English, you switch back to English.

COMMUNICATION STYLE:
- Speak as if you are a friendly lady agronomist on a real phone call.
- Use short, simple sentences.
- Use numbered steps when giving instructions.
- Ask ONE question at a time.
- NO EMOJIS, NO MARKDOWN, NO BOLD TEXT.

CONVERSATION FLOW:
1. Greet briefly in English: "Hello, this is Atim.ai, your agronomist."
2. Diagnose: Ask about the crop and specific problem.
3. Advise: Provide low-cost, local solutions in numbered steps.
4. Close: Ask if they have one more question.
`;

const VoiceAgronomist: React.FC = () => {
  const [isActive, setIsActive] = useState(false);
  const [transcription, setTranscription] = useState<{ role: 'user' | 'model'; text: string }[]>([]);
  const [isConnecting, setIsConnecting] = useState(false);
  const [callDuration, setCallDuration] = useState(0);

  const audioContextRef = useRef<AudioContext | null>(null);
  const outputAudioContextRef = useRef<AudioContext | null>(null);
  const nextStartTimeRef = useRef(0);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const sessionRef = useRef<any>(null);
  const currentInputTransRef = useRef('');
  const currentOutputTransRef = useRef('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [transcription]);

  useEffect(() => {
    if (isActive) {
      timerRef.current = window.setInterval(() => {
        setCallDuration(prev => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
      setCallDuration(0);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [isActive]);

  const formatTime = (s: number) => {
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const stopAllAudio = useCallback(() => {
    sourcesRef.current.forEach(source => { try { source.stop(); } catch (e) {} });
    sourcesRef.current.clear();
    nextStartTimeRef.current = 0;
  }, []);

  const handleStart = async () => {
    setIsConnecting(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      outputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });

      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        config: {
          systemInstruction: SYSTEM_INSTRUCTION,
          responseModalities: [Modality.AUDIO],
          speechConfig: { 
            voiceConfig: { 
              prebuiltVoiceConfig: { voiceName: 'Kore' } // Female voice
            } 
          },
          inputAudioTranscription: {},
          outputAudioTranscription: {},
        },
        callbacks: {
          onopen: () => {
            setIsActive(true);
            setIsConnecting(false);
            const source = audioContextRef.current!.createMediaStreamSource(stream);
            const scriptProcessor = audioContextRef.current!.createScriptProcessor(4096, 1, 1);
            scriptProcessor.onaudioprocess = (e) => {
              const inputData = e.inputBuffer.getChannelData(0);
              const pcmBlob = createPcmBlob(inputData);
              sessionPromise.then(session => session.sendRealtimeInput({ media: pcmBlob }));
            };
            source.connect(scriptProcessor);
            scriptProcessor.connect(audioContextRef.current!.destination);
          },
          onmessage: async (message: LiveServerMessage) => {
            if (message.serverContent?.interrupted) stopAllAudio();
            const audioData = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
            if (audioData && outputAudioContextRef.current) {
              const ctx = outputAudioContextRef.current;
              nextStartTimeRef.current = Math.max(nextStartTimeRef.current, ctx.currentTime);
              const buffer = await decodeAudioData(decode(audioData), ctx, 24000, 1);
              const source = ctx.createBufferSource();
              source.buffer = buffer;
              source.connect(ctx.destination);
              source.addEventListener('ended', () => sourcesRef.current.delete(source));
              source.start(nextStartTimeRef.current);
              nextStartTimeRef.current += buffer.duration;
              sourcesRef.current.add(source);
            }
            if (message.serverContent?.inputTranscription) currentInputTransRef.current += message.serverContent.inputTranscription.text;
            if (message.serverContent?.outputTranscription) currentOutputTransRef.current += message.serverContent.outputTranscription.text;
            if (message.serverContent?.turnComplete) {
              setTranscription(prev => [
                ...prev,
                ...(currentInputTransRef.current ? [{ role: 'user' as const, text: currentInputTransRef.current }] : []),
                ...(currentOutputTransRef.current ? [{ role: 'model' as const, text: currentOutputTransRef.current }] : [])
              ]);
              currentInputTransRef.current = '';
              currentOutputTransRef.current = '';
            }
          },
          onclose: () => setIsActive(false),
          onerror: () => setIsConnecting(false)
        }
      });
      sessionRef.current = await sessionPromise;
    } catch (error) {
      console.error(error);
      setIsConnecting(false);
    }
  };

  const handleStop = () => {
    if (sessionRef.current) sessionRef.current.close();
    stopAllAudio();
    if (audioContextRef.current) audioContextRef.current.close();
    if (outputAudioContextRef.current) outputAudioContextRef.current.close();
    setIsActive(false);
  };

  return (
    <div className="flex flex-col h-full bg-white font-mono">
      {!isActive && !isConnecting ? (
        <div className="flex-1 flex flex-col items-center justify-center p-8 space-y-6 text-center">
          <div className="w-24 h-24 bg-green-50 rounded-full flex items-center justify-center animate-pulse">
             <div className="w-16 h-16 agri-bg rounded-full flex items-center justify-center">
               <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
               </svg>
             </div>
          </div>
          <h2 className="text-xl font-bold text-gray-800">Atim.ai IVR</h2>
          <p className="text-xs text-gray-500 uppercase tracking-tighter">Farmer Hotline Simulation</p>
          <button 
            onClick={handleStart}
            className="agri-bg text-white px-8 py-4 rounded-full font-bold shadow-xl active:scale-95 transition-transform"
          >
            DIAL HOTLINE
          </button>
        </div>
      ) : (
        <div className="flex-1 flex flex-col p-4">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-pink-100 rounded-full mx-auto flex items-center justify-center mb-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-pink-500" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
              </svg>
            </div>
            <h3 className="text-sm font-bold text-gray-800">Atim (Lady Agronomist)</h3>
            <p className="text-[10px] text-green-600 font-bold">{isConnecting ? 'CONNECTING...' : formatTime(callDuration)}</p>
          </div>

          <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-4 px-2 pb-24 text-[11px] leading-tight text-gray-400">
             {transcription.map((t, idx) => (
               <div key={idx} className={t.role === 'user' ? 'text-right italic' : 'text-left'}>
                 <span className="font-bold opacity-50">{t.role === 'user' ? 'FARMER' : 'ATIM'}:</span> {t.text}
               </div>
             ))}
             {isActive && !isConnecting && (
               <div className="text-left animate-pulse">
                 <span className="font-bold opacity-50 text-pink-500">ATIM:</span> (Speaking with African accent...)
               </div>
             )}
          </div>

          <div className="absolute bottom-8 left-0 right-0 flex justify-center px-4">
            <button 
              onClick={handleStop}
              className="bg-red-500 w-full max-w-[12rem] text-white py-4 rounded-full font-black shadow-lg flex items-center justify-center space-x-2 active:scale-95 transition-transform"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
              </svg>
              <span>HANG UP</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default VoiceAgronomist;
