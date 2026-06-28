// AI Chat Component
import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Sparkles, Loader2 } from 'lucide-react';
import { useAIChatStore, AI_SUGGESTIONS } from '@/services/ai/aiConversationalService';

interface AIChatProps { onCommand?: (cmd: string) => void; className?: string; }

export function AIChat({ onCommand, className = '' }: AIChatProps) {
  const [input, setInput] = useState('');
  const [typing, setTyping] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const { messages, addMessage } = useAIChatStore();

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || typing) return;
    addMessage({ id: `m${Date.now()}`, role: 'user', content: input.trim(), timestamp: Date.now() });
    setInput('');
    setTyping(true);
    setTimeout(() => {
      addMessage({ id: `m${Date.now()}`, role: 'assistant', content: generateResponse(input), timestamp: Date.now() });
      setTyping(false);
      if (onCommand) onCommand(input);
    }, 1500);
  };

  return (
    <div className={`flex flex-col h-full bg-gray-900 rounded-lg overflow-hidden ${className}`}>
      <div className="flex items-center gap-2 px-4 py-3 bg-gray-800 border-b border-gray-700">
        <Sparkles className="w-5 h-5 text-purple-400" />
        <span className="font-semibold text-white">Assistente de IA</span>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 && (
          <div className="text-center text-gray-400 py-8">
            <Bot className="w-12 h-12 mx-auto mb-3 text-gray-600" />
            <p>Olá! Digite um comando para a IA.</p>
          </div>
        )}
        {messages.map((msg) => (
          <div key={msg.id} className={`flex gap-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            {msg.role === 'assistant' && <div className="w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center"><Bot className="w-4 h-4 text-white" /></div>}
            <div className={`max-w-[80%] px-3 py-2 rounded-lg ${msg.role === 'user' ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-100'}`}>
              <p className="whitespace-pre-wrap text-sm">{msg.content}</p>
            </div>
            {msg.role === 'user' && <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center"><User className="w-4 h-4 text-white" /></div>}
          </div>
        ))}
        {typing && <div className="flex gap-2"><div className="w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center"><Bot className="w-4 h-4 text-white" /></div><div className="bg-gray-800 px-4 py-3 rounded-lg"><Loader2 className="w-4 h-4 animate-spin text-purple-400" /></div></div>}
        <div ref={endRef} />
      </div>
      {messages.length === 0 && (
        <div className="px-4 pb-2 flex flex-wrap gap-2">
          {AI_SUGGESTIONS.slice(0, 3).map((s, i) => (
            <button key={i} onClick={() => setInput(s)} className="text-xs px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-full border border-gray-700">{s}</button>
          ))}
        </div>
      )}
      <form onSubmit={handleSubmit} className="p-4 border-t border-gray-700">
        <div className="flex gap-2">
          <input type="text" value={input} onChange={(e) => setInput(e.target.value)} placeholder="Digite um comando..." className="flex-1 bg-gray-800 text-white placeholder-gray-500 px-4 py-2 rounded-lg border border-gray-700 focus:border-purple-500 focus:outline-none text-sm" disabled={typing} />
          <button type="submit" disabled={!input.trim() || typing} className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-700 text-white rounded-lg"><Send className="w-4 h-4" /></button>
        </div>
      </form>
    </div>
  );
}

function generateResponse(input: string): string {
  const l = input.toLowerCase();
  if (l.includes('aura')) return 'Entendi! Vou adicionar uma aura de energia ao vídeo.';
  if (l.includes('anime')) return 'Transformando para estilo anime!';
  if (l.includes('cyberpunk')) return 'Aplicando efeito cyberpunk!';
  if (l.includes('fogo') || l.includes('explosão')) return 'Adicionando efeitos de fogo!';
  return 'Entendi! Pode dar mais detalhes sobre o que deseja?';
}

export default AIChat;