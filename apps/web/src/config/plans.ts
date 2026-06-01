export type PlanId = 'starter' | 'pro' | 'unlimited';

export const PLANS = [
  {
    id: 'starter',
    name: 'Essencial 360',
    price: 79,
    tagline: 'Para começar com uma operação simples e bem organizada.',
    highlight: false,
    features: [
      'Templates essenciais',
      'QR Code automático',
      'Galeria pública com sua marca',
      'Captura básica de leads',
      'Salvar offline sessões recentes',
    ],
  },
  {
    id: 'pro',
    name: 'Profissional',
    price: 129,
    tagline: 'Para quem quer vender uma experiência mais completa.',
    highlight: true,
    features: [
      'Templates essenciais e premium',
      'Salvar offline com sincronização',
      'Galeria personalizada',
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
      'Todos os templates liberados',
      'Salvar offline sem restrições',
      'Galerias, QR Codes e leads sem limite',
      'Personalização completa da marca',
      'Analytics completo e comparativos',
      'Suporte prioritário',
    ],
  },
] as const;
