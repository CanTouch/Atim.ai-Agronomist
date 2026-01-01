
import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI, Chat, GenerateContentResponse } from '@google/genai';
import { Message } from '../types';

const SYSTEM_INSTRUCTION = `
You are Atim.ai, an automated USSD service (*163#) for farmers in Northern Uganda.

LANGUAGE RULE:
- USE AN ENGLISH-FIRST APPROACH.
- Start in English. Switch to Acoli (Acholi/Luo) ONLY if detected or requested.

USSD RULES:
- Use strictly short sentences.
- Use numbered lists for menus and advice.
- Always ask ONE question at a time.
- NO EMOJIS, NO MARKDOWN, NO BOLD.
- Maximum 160 characters per response.
- Provide low-cost solutions for smallholder farmers.
`;

const TextAgronomist: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const chatRef = useRef<Chat | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
    chatRef.current = ai.chats.create({
      model: 'gemini-3-flash-preview',
      config: { systemInstruction: SYSTEM_INSTRUCTION },
    });

    setMessages([{
      id: '1',
      role: 'model',
      text: 'Atim.ai Agronomist\n1. Maize\n2. Beans\n3. Cassava\nType crop name or the problem you see.',
      timestamp: Date.now()
    }]);
  }, []);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || !chatRef.current || isLoading) return;
    const userMessage: Message = { id: Date.now().toString(), role: 'user', text: input, timestamp: Date.now() };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);
    try {
      const response: GenerateContentResponse = await chatRef.current.sendMessage({ message: input });
      const modelMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        text: response.text || 'Error. Please try again.',
        timestamp: Date.now()
      };
      setMessages(prev => [...prev, modelMessage]);
    } catch (error) {
      setMessages(prev => [...prev, { id: 'err', role: 'model', text: 'Connection failed.', timestamp: Date.now() }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#9dae91] font-mono text-black">
      {/* LCD Header */}
      <div className="border-b border-black/20 p-2 flex justify-between items-center text-[10px] font-bold uppercase">
        <div className="flex items-center space-x-1">
          <span className="w-1.5 h-1.5 bg-black rounded-full"></span>
          <span>*163# LIVE</span>
        </div>
        <span className="bg-black/10 px-1 rounded">2G MODE</span>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-hide">
        <div className="bg-black/5 p-2 mb-4 rounded border border-black/10 text-[9px] font-bold">
           GATEWAY SIMULATION: USSD SESSIONS ACTIVE
        </div>
        
        {messages.map((msg) => (
          <div key={msg.id} className="mb-4">
            <p className={`text-[9px] uppercase font-black mb-1 opacity-40 ${msg.role === 'user' ? 'text-right' : ''}`}>
              {msg.role === 'user' ? 'FARMER >' : '< ATIM [CON]'}
            </p>
            <div className={`text-sm leading-tight whitespace-pre-wrap ${msg.role === 'user' ? 'text-right' : ''}`}>
              {msg.text}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="text-xs italic animate-pulse">Processing...</div>
        )}
      </div>

      {/* Numerical Input Panel */}
      <div className="p-3 border-t border-black/20 bg-black/5">
        <div className="flex space-x-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Reply..."
            className="flex-1 bg-transparent border-b-2 border-black placeholder:text-black/30 py-2 px-1 focus:outline-none text-sm uppercase font-bold"
          />
          <button
            onClick={handleSend}
            disabled={isLoading || !input.trim()}
            className="bg-black text-[#9dae91] px-4 py-2 font-black text-xs uppercase active:scale-95 transition-transform disabled:opacity-30"
          >
            SEND
          </button>
        </div>
        <p className="text-[8px] mt-2 opacity-50 text-center font-bold italic">Simulating physical keypad input</p>
      </div>
    </div>
  );
};

export default TextAgronomist;
