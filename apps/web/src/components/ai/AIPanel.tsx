// AI Panel Component
import React, { useState } from 'react';
import { Sparkles, Eye, Zap, Search } from 'lucide-react';
import { AIChat } from './AIChat';
import { HyperframesPreview } from './HyperframesPreview';
import { useAIOrchestrator } from '@/services/ai/aiOrchestrator';

interface AIPanelProps { videoId: string; onClose?: () => void; className?: string; }
type TabType = 'chat' | 'hyperframes' | 'effects' | 'search';

export function AIPanel({ videoId, onClose, className = '' }: AIPanelProps) {
  const [tab, setTab] = useState<TabType>('chat');
  const [collapsed, setCollapsed] = useState(false);
  const { activeEffects, removeEffect, searchSemantic } = useAIOrchestrator();
  const [query, setQuery] = useState('');

  if (collapsed) {
    return (
      <button onClick={() => setCollapsed(false)} className={`fixed right-4 bottom-4 w-12 h-12 bg-purple-600 hover:bg-purple-700 rounded-full shadow-lg flex items-center justify-center text-white ${className}`}>
        <Sparkles className="w-6 h-6" />
        {activeEffects.length > 0 && <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full text-xs flex items-center justify-center">{activeEffects.length}</span>}
      </button>
    );
  }

  return (
    <div className={`fixed right-4 bottom-4 w-80 max-h-[70vh] bg-gray-900 rounded-xl shadow-2xl overflow-hidden flex flex-col ${className}`}>
      <div className="flex items-center justify-between px-4 py-3 bg-gray-800 border-b border-gray-700">
        <div className="flex items-center gap-2"><Sparkles className="w-5 h-5 text-purple-400" /><span className="font-semibold text-white">IA do Editor</span></div>
        <div className="flex gap-1">
          <button onClick={() => setCollapsed(true)} className="p-1.5 hover:bg-gray-700 rounded text-gray-400 hover:text-white">−</button>
          {onClose && <button onClick={onClose} className="p-1.5 hover:bg-gray-700 rounded text-gray-400 hover:text-white">×</button>}
        </div>
      </div>
      <div className="flex border-b border-gray-700">
        {[{ id: 'chat' as TabType, label: 'Chat', icon: Sparkles }, { id: 'hyperframes' as TabType, label: 'Análise', icon: Eye }, { id: 'effects' as TabType, label: 'Efeitos', icon: Zap, badge: activeEffects.length }, { id: 'search' as TabType, label: 'Buscar', icon: Search }].map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)} className={`flex-1 flex items-center justify-center gap-1 py-2.5 text-xs ${tab === t.id ? 'bg-gray-800 text-purple-400 border-b-2 border-purple-400' : 'text-gray-400 hover:text-white'}`}>
            <t.icon className="w-3.5 h-3.5" /><span>{t.label}</span>
            {t.badge !== undefined && t.badge > 0 && <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 rounded-full text-[10px]">{t.badge}</span>}
          </button>
        ))}
      </div>
      <div className="flex-1 overflow-hidden">
        {tab === 'chat' && <AIChat className="h-full border-0 rounded-none" />}
        {tab === 'hyperframes' && <HyperframesPreview videoId={videoId} className="h-full border-0 rounded-none" />}
        {tab === 'effects' && (
          <div className="h-full overflow-y-auto p-3">
            {activeEffects.length === 0 ? (
              <div className="text-center text-gray-400 py-8"><Zap className="w-10 h-10 mx-auto mb-2 text-gray-600" /><p className="text-sm">Nenhum efeito ativo</p></div>
            ) : (
              <div className="space-y-2">{activeEffects.map((e) => (
                <div key={e.id} className="bg-gray-800 rounded-lg p-3 flex items-center justify-between">
                  <div><p className="text-white text-sm">{e.name}</p><p className="text-gray-400 text-xs">{e.category}</p></div>
                  <button onClick={() => removeEffect(e.id)} className="p-1 hover:bg-gray-700 rounded text-gray-400 hover:text-red-400">×</button>
                </div>
              ))}</div>
            )}
          </div>
        )}
        {tab === 'search' && (
          <div className="h-full flex flex-col p-3">
            <div className="flex gap-2 mb-3">
              <input type="text" value={query} onChange={(e) => setQuery(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && searchSemantic(query)} placeholder="Buscar cena..." className="flex-1 bg-gray-800 text-white placeholder-gray-500 px-3 py-2 rounded-lg text-sm border border-gray-700" />
              <button onClick={() => searchSemantic(query)} className="px-3 py-2 bg-purple-600 text-white rounded-lg"><Search className="w-4 h-4" /></button>
            </div>
            <div className="flex-1 text-center text-gray-400"><Search className="w-8 h-8 mx-auto mb-2 text-gray-600" /><p className="text-xs">Use o chat para buscar cenas</p></div>
          </div>
        )}
      </div>
    </div>
  );
}

export default AIPanel;