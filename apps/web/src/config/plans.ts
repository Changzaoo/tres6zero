export type PlanId = 'starter' | 'pro' | 'unlimited';

export const PLANS = [
  {
    id: 'starter',
    name: 'Essencial 360',
    price: 79,
    tagline: 'Para começar com eventos menores.',
    highlight: false,
    features: [
      'Até 3 eventos por mês',
      'Até 150 vídeos 360',
      'QR Code automático',
      'Galeria pública',
      'Captura básica de leads',
    ],
  },
  {
    id: 'pro',
    name: 'Profissional',
    price: 129,
    tagline: 'Para operação frequente e equipe enxuta.',
    highlight: true,
    features: [
      'Até 10 eventos por mês',
      'Até 800 vídeos 360',
      'Templates premium',
      'Leads e exportação CSV',
      'Analytics de compartilhamento',
    ],
  },
  {
    id: 'unlimited',
    name: 'Ilimitado 360',
    price: 200,
    tagline: 'Tudo liberado para escalar sem travas.',
    highlight: false,
    features: [
      'Eventos ilimitados',
      'Vídeos ilimitados',
      'Leads ilimitados',
      'Templates ilimitados',
      'Operadores ilimitados',
      'Analytics completo',
      'Suporte prioritário',
    ],
  },
] as const;
