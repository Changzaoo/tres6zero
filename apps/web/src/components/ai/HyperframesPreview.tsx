// Hyperframes Preview Component
import React from 'react';
import { Eye, Users, Layers, Sparkles, Camera, AudioLines } from 'lucide-react';
import { useHyperframesStore, selectPersonTracks, selectObjectTracks, selectShots } from '@/services/ai/hyperframesService';

interface HyperframesPreviewProps { videoId: string; className?: string; }

export function HyperframesPreview({ videoId, className = '' }: HyperframesPreviewProps) {
  const { isProcessing, progress, hyperframes } = useHyperframesStore();
  const people = useHyperframesStore(selectPersonTracks);
  const objects = useHyperframesStore(selectObjectTracks);
  const shots = useHyperframesStore(selectShots);

  if (isProcessing) {
    return (
      <div className={`bg-gray-900 rounded-lg p-4 ${className}`}>
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="w-5 h-5 text-purple-400 animate-pulse" />
          <span className="text-white font-medium">Processando Vídeo...</span>
        </div>
        <div className="w-full bg-gray-700 rounded-full h-2">
          <div className="bg-purple-500 h-2 rounded-full transition-all" style={{ width: `${progress}%` }} />
        </div>
        <p className="text-gray-400 text-sm mt-2">Análise semântica: {progress}%</p>
      </div>
    );
  }

  if (!hyperframes) {
    return (
      <div className={`bg-gray-900 rounded-lg p-4 ${className}`}>
        <Eye className="w-8 h-8 text-gray-600 mx-auto mb-2" />
        <p className="text-gray-400 text-center text-sm">Hyperframes não disponível</p>
        <p className="text-gray-500 text-xs text-center mt-1">Processe o vídeo primeiro</p>
      </div>
    );
  }

  return (
    <div className={`bg-gray-900 rounded-lg p-4 ${className}`}>
      <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
        <Sparkles className="w-5 h-5 text-purple-400" />
        Análise Semântica
      </h3>
      <div className="grid grid-cols-2 gap-3">
        <StatCard icon={<Users className="w-4 h-4" />} label="Pessoas" value={people.length} />
        <StatCard icon={<Layers className="w-4 h-4" />} label="Objetos" value={objects.length} />
        <StatCard icon={<Camera className="w-4 h-4" />} label="Shots" value={shots.length} />
        <StatCard icon={<AudioLines className="w-4 h-4" />} label="Duração" value={`${hyperframes.metadata.duration.toFixed(1)}s`} />
      </div>
      {people.length > 0 && (
        <div className="mt-4">
          <h4 className="text-gray-400 text-xs uppercase mb-2">Pessoas Detectadas</h4>
          <div className="space-y-1">
            {people.slice(0, 3).map((p) => (
              <div key={p.id} className="flex items-center gap-2 text-sm text-gray-300">
                <div className="w-2 h-2 rounded-full bg-green-500" />
                <span>Pessoa {p.id.slice(-4)}</span>
                <span className="text-gray-500 text-xs">{p.clothing.top}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string | number }) {
  return (
    <div className="bg-gray-800 rounded-lg p-3">
      <div className="flex items-center gap-2 text-gray-400 mb-1">
        {icon}
        <span className="text-xs">{label}</span>
      </div>
      <span className="text-white text-lg font-semibold">{value}</span>
    </div>
  );
}

export default HyperframesPreview;