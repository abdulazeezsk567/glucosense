/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { MessageSquare, X, Send, Bot, Sparkles, AlertCircle, HelpCircle } from 'lucide-react';

interface Message {
  sender: 'user' | 'bot';
  text: string;
}

export default function GlucoBot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      sender: 'bot',
      text: "Hello! I am GlucoBot, your medical intelligence assistant. How can I assist you with patient telemetry, clinical protocols, or CNN-LSTM model parameters today?",
    },
  ]);
  const [inputVal, setInputVal] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Listen to external window events to open the bot
  useEffect(() => {
    const handleOpenBot = () => setIsOpen(true);
    window.addEventListener('open-glucobot', handleOpenBot);
    return () => window.removeEventListener('open-glucobot', handleOpenBot);
  }, []);

  // Auto-scroll chat history
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const handleSendCustomMessage = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputVal.trim()) return;

    const userText = inputVal;
    setMessages((prev) => [...prev, { sender: 'user', text: userText }]);
    setInputVal('');
    simulateBotResponse(userText);
  };

  const simulateBotResponse = (query: string) => {
    setIsTyping(true);

    setTimeout(() => {
      let botText = '';
      const textLower = query.toLowerCase();

      if (textLower.includes('diet') || textLower.includes('food') || textLower.includes('carb')) {
        botText = 'For prediabetes and Type 2 Diabetes management, we suggest a high-fiber, low-glycemic index (GI) diet. Prioritize leafy greens, legumes, lean proteins (chicken, fish), and healthy fats (avocado, olive oil). Ensure carbohydrate counting audits are logged, especially following post-prandial dinner spikes.';
      } else if (textLower.includes('lstm') || textLower.includes('model') || textLower.includes('cnn') || textLower.includes('layer')) {
        botText = 'The CNN-LSTM Model V4 leverages spatial 1D Convolutions (to extract short-term transient local trends) followed by deep LSTM (Long Short-Term Memory) units. LSTM cell gates capture the continuous temporal sequence data of glucose readings over a sliding 24-hour window, yielding a 94.2% validation accuracy.';
      } else if (textLower.includes('spike') || textLower.includes('high') || textLower.includes('peak')) {
        botText = 'To manage post-prandial glycemic spikes (glucose > 140 mg/dL): Evaluate bolus insulin timing (ideally administered 15-20 minutes pre-meal), review carbohydrate-to-insulin ratios for high-carb breakfasts, and consider low-GI dinner alternatives. Preemptively setting "Exercise Mode" 30 minutes prior to afternoon activity also stabilizes readings.';
      } else if (textLower.includes('low') || textLower.includes('hypo')) {
        botText = 'Nocturnal hypoglycemia (glucose < 70 mg/dL) commonly occurs between 0200 and 0400. Our clinical recommendations suggest reducing nighttime basal delivery by 15% (e.g. from 1.2 U/hr to 1.0 U/hr) and setting predictive low glucose alerts in system preferences.';
      } else {
        botText = 'I am fully indexed on clinical guidelines for endocrinology. To optimize treatment, you can review current basal profiles, check assessment history logs, or run neural risk evaluations using active biometric telemetry.';
      }

      setMessages((prev) => [...prev, { sender: 'bot', text: botText }]);
      setIsTyping(false);
    }, 900);
  };

  const handleTriggerClick = (text: string) => {
    setMessages((prev) => [...prev, { sender: 'user', text }]);
    simulateBotResponse(text);
  };

  return (
    <div className="fixed bottom-6 right-6 z-40 font-sans">
      {/* Minimized pulsing button state */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="flex items-center gap-2.5 px-5 py-4 bg-gradient-to-r from-[#42e09a] to-[#5adace] hover:scale-105 active:scale-95 text-[#051424] font-extrabold rounded-full shadow-2xl shadow-[#42e09a]/30 cursor-pointer transition-all duration-300"
        >
          <Bot className="w-5.5 h-5.5 animate-bounce" />
          <span className="text-xs uppercase tracking-wider">Ask GlucoBot</span>
        </button>
      )}

      {/* Expanded diagnostic chat panel state */}
      {isOpen && (
        <div className="w-80 sm:w-96 h-[480px] bg-[#122131] border border-[#5adace]/40 rounded-3xl overflow-hidden shadow-2xl flex flex-col justify-between animate-in slide-in-from-bottom-6 duration-200">
          
          {/* Header */}
          <div className="bg-[#0d1c2d] px-5 py-4 flex items-center justify-between border-b border-[#45464d]/25">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#42e09a] to-[#5adace] flex items-center justify-center text-[#051424]">
                <Bot className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-[#d4e4fa] tracking-tight">GlucoBot Assistant</h3>
                <span className="text-[10px] text-[#42e09a] font-mono flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#42e09a] animate-ping"></span>
                  EHR Medical Intelligence
                </span>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1.5 hover:bg-[#2c3a4c]/50 text-[#c6c6cd] hover:text-[#d4e4fa] rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Conversation history area */}
          <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-[#051424]/40 scrollbar-thin scrollbar-thumb-[#45464d]/30">
            {messages.map((m, idx) => {
              const isBot = m.sender === 'bot';
              return (
                <div
                  key={idx}
                  className={`flex ${isBot ? 'justify-start' : 'justify-end'} animate-in fade-in duration-150`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl p-3 text-xs leading-relaxed ${
                      isBot
                        ? 'bg-[#1c2b3c] text-[#d4e4fa] border border-[#45464d]/10'
                        : 'bg-gradient-to-r from-[#42e09a] to-[#5adace] text-[#051424] font-medium'
                    }`}
                  >
                    {m.text}
                  </div>
                </div>
              );
            })}

            {/* Simulated loading indicator */}
            {isTyping && (
              <div className="flex justify-start">
                <div className="bg-[#1c2b3c] border border-[#45464d]/10 rounded-2xl p-3 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 bg-[#42e09a] rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                  <span className="w-1.5 h-1.5 bg-[#42e09a] rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                  <span className="w-1.5 h-1.5 bg-[#42e09a] rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                </div>
              </div>
            )}
            <div ref={chatEndRef}></div>
          </div>

          {/* Interactive Trigger Shortcuts */}
          <div className="px-4 py-2 border-t border-[#45464d]/10 bg-[#0d1c2d]/20 space-y-1.5">
            <span className="text-[9px] uppercase tracking-wider text-[#c6c6cd]/50 font-mono font-bold block mb-1">
              Quick Medical Queries
            </span>
            <div className="flex flex-wrap gap-1">
              <button
                onClick={() => handleTriggerClick('Suggest pre-diabetes diet')}
                className="text-[10px] font-medium text-[#c6c6cd] hover:text-[#d4e4fa] bg-[#1c2b3c] hover:bg-[#2c3a4c] px-2.5 py-1.5 rounded-lg border border-[#45464d]/15 cursor-pointer transition-colors"
              >
                🥗 Prediabetes Diet
              </button>
              <button
                onClick={() => handleTriggerClick('Explain CNN-LSTM neural weights')}
                className="text-[10px] font-medium text-[#c6c6cd] hover:text-[#d4e4fa] bg-[#1c2b3c] hover:bg-[#2c3a4c] px-2.5 py-1.5 rounded-lg border border-[#45464d]/15 cursor-pointer transition-colors"
              >
                🧠 CNN-LSTM Model
              </button>
              <button
                onClick={() => handleTriggerClick('How to manage high glucose peaks?')}
                className="text-[10px] font-medium text-[#c6c6cd] hover:text-[#d4e4fa] bg-[#1c2b3c] hover:bg-[#2c3a4c] px-2.5 py-1.5 rounded-lg border border-[#45464d]/15 cursor-pointer transition-colors"
              >
                📈 Manage Peaks
              </button>
            </div>
          </div>

          {/* Input text field actions bar */}
          <form
            onSubmit={handleSendCustomMessage}
            className="p-3.5 bg-[#0d1c2d] border-t border-[#45464d]/25 flex gap-2"
          >
            <input
              type="text"
              placeholder="Ask me a clinical or model query..."
              value={inputVal}
              onChange={(e) => setInputVal(e.target.value)}
              className="flex-1 px-3 py-2 bg-[#051424] border border-[#45464d]/30 focus:border-[#5adace] rounded-xl text-xs text-[#d4e4fa] placeholder-[#c6c6cd]/40 outline-none"
            />
            <button
              type="submit"
              className="p-2.5 bg-gradient-to-r from-[#42e09a] to-[#5adace] hover:opacity-90 active:scale-95 text-[#051424] rounded-xl transition-all cursor-pointer shrink-0"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
