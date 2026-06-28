// Effect Library Component
import React from 'react';
import { Zap, Flame, Sparkles, Eye, Wind, Star } from 'lucide-react';
import { AURA_PRESETS } from '@/services/ai/intelligentEffectsEngine';
import type { AuraType } from '@six3/shared/src/types';

interface EffectLibraryProps {
  onSelect: (auraType: AuraType) => void;
  className?: string;
}

const EFFECT_ICONS: Record<AuraType, React.ReactNode> = {
  fire: <Flame className="w-6 h-6" />,
  electric: <Zap className="w-6 h-6" />,
  divine: <Sparkles className="w-6 h-6" />,
  angelic: <Star className="w-6 h-6" />,
  demonic: <Flame className="w-6 h-6" />,
  anime: <Sparkles className="w-6 h-6" />,
  cosmic: <Star className="w-6 h-6" />,
  galactic: <Sparkles className="w-6 h-6" />,
  energy: <Zap className="w-6 h-6" />,
  neon: <Eye className="w-6 h-6" />,
  magic: <Sparkles className="w-6 h-6" />,
  spiritual: <Wind className="w-6 h-6" />,
  golden: <Star className="w-6 h-6" />,
  blue: <Eye className="w-6 h-6" />,
  rainbow: <Sparkles className="w-6 h-6" />,
  custom: <Sparkles className="w-6 h-6" />,
};

const AURA_COLORS: Record<AuraType, string> = {
  fire: 'bg-orange-500',
  electric: 'bg-blue-400',
  divine: 'bg-yellow-300',
  angelic: 'bg-white',
  demonic: 'bg-red-700',
  anime: 'bg-yellow-400',
  cosmic: 'bg-purple-500',
  galactic: 'bg-indigo-700',
  energy: 'bg-cyan-400',
  neon: 'bg-pink-500',
  magic: 'bg-violet-500',
  spiritual: 'bg-sky-300',
  golden: 'bg-yellow-500',
  blue: 'bg-blue-500',
  rainbow: 'bg-gradient-to-r from-red-500 via-yellow-500 to-blue-500',
  custom: 'bg-gray-500',
};

const AURA_NAMES: Record<AuraType, string> = {
  fire: 'Fogo',
  electric: 'Elétrico',
  divine: 'Divino',
  angelic: 'Angelical',
  demonic: 'Demoníaco',
  anime: 'Anime',
  cosmic: 'Cósmico',
  galactic: 'Galáctico',
  energy: 'Energético',
  neon: 'Neon',
  magic: 'Mágico',
  spiritual: 'Espiritual',
  golden: 'Dourado',
  blue: 'Azul',
  rainbow: 'Arco-íris',
  custom: 'Personalizado',
};

export function EffectLibrary({ onSelect, className = '' }: EffectLibraryProps) {
  const auraTypes = Object.keys(AURA_PRESETS) as AuraType[];

  return (
    <div className={`bg-gray-900 rounded-lg p-4 ${className}`}>
      <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
        <Zap className="w-5 h-5 text-purple-400" />
        Biblioteca de Efeitos
      </h3>
      <div className="grid grid-cols-3 gap-2">
        {auraTypes.map((type) => (
          <button
            key={type}
            onClick={() => onSelect(type)}
            className="flex flex-col items-center gap-1 p-3 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors group"
          >
            <div className={`w-10 h-10 rounded-full ${AURA_COLORS[type]} flex items-center justify-center text-white group-hover:scale-110 transition-transform`}>
              {EFFECT_ICONS[type]}
            </div>
            <span className="text-gray-300 text-xs">{AURA_NAMES[type]}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

export default EffectLibrary;