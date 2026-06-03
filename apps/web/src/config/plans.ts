import { videoEffects } from '@/features/effects/effects.config';

export type PlanId = 'starter' | 'pro' | 'unlimited';

export type PlanFeature =
  | 'basic_templates'
  | 'premium_templates'
  | 'custom_template_upload'
  | 'offline_recent'
  | 'offline_sync'
  | 'public_gallery'
  | 'qr_code'
  | 'basic_leads'
  | 'csv_export'
  | 'basic_effects'
  | 'popular_effects'
  | 'ai_auto_edit'
  | 'brand_customization'
  | 'advanced_analytics'
  | 'priority_support';

export const PLAN_ENTITLEMENTS: Record<PlanId, PlanFeature[]> = {
  starter: ['basic_templates', 'offline_recent', 'public_gallery', 'qr_code', 'basic_leads', 'basic_effects'],
  pro: [
    'basic_templates',
    'premium_templates',
    'custom_template_upload',
    'offline_recent',
    'offline_sync',
    'public_gallery',
    'qr_code',
    'basic_leads',
    'csv_export',
    'basic_effects',
    'popular_effects',
    'brand_customization',
    'advanced_analytics',
  ],
  unlimited: [
    'basic_templates',
    'premium_templates',
    'custom_template_upload',
    'offline_recent',
    'offline_sync',
    'public_gallery',
    'qr_code',
    'basic_leads',
    'csv_export',
    'basic_effects',
    'popular_effects',
    'ai_auto_edit',
    'brand_customization',
    'advanced_analytics',
    'priority_support',
  ],
};

export const VIDEO_EFFECTS: readonly { value: string; label: string; feature: PlanFeature }[] = videoEffects.map((effect) => ({
  value: effect.id,
  label: effect.name,
  feature: effect.requiredFeature,
}));

export function normalizePlanId(planId?: string | null): PlanId {
  return planId === 'pro' || planId === 'unlimited' ? planId : 'starter';
}

export function hasFeature(planId: string | null | undefined, feature: PlanFeature, isAdmin = false) {
  if (isAdmin) return true;
  return PLAN_ENTITLEMENTS[normalizePlanId(planId)].includes(feature);
}

type PlanBullet = {
  label: string;
  description: string;
};

export const PLANS = [
  {
    id: 'starter',
    name: 'Essencial SIX3°',
    price: 69.99,
    tagline: 'Para começar com uma operação simples e bem organizada.',
    highlight: false,
    features: [
      {
        label: 'Templates essenciais estaticos',
        description: 'Modelos prontos sem animacoes ou movimento para montar paginas, galerias e experiencias basicas.',
      },
      {
        label: 'QR Code automático',
        description: 'O sistema gera QR Codes para compartilhar galerias e acessos sem configuração manual.',
      },
      {
        label: 'Galeria pública com sua marca',
        description: 'Uma página compartilhável com identidade visual do seu negócio para entregar a experiência ao cliente.',
      },
      {
        label: 'Captura básica de leads',
        description: 'Formulários simples para coletar contatos antes do acesso, download ou compartilhamento.',
      },
      {
        label: 'Salvar offline sessões recentes',
        description: 'Mantém sessões recentes disponíveis no navegador para reduzir impacto de instabilidade de internet.',
      },
    ],
  },
  {
    id: 'pro',
    name: 'Profissional SIX3°',
    price: 129.99,
    tagline: 'Para quem quer vender uma experiência mais completa.',
    highlight: true,
    features: [
      {
        label: 'Templates premium e animados',
        description: 'Inclui modelos mais completos, molduras com movimento e entregas com mais acabamento.',
      },
      {
        label: 'Salvar offline com sincronização',
        description: 'Permite continuar trabalhando em conexões instáveis e sincroniza os dados quando a internet voltar.',
      },
      {
        label: 'Galeria personalizada',
        description: 'Mais controle sobre capa, cores, textos e aparência para combinar com cada cliente ou ação.',
      },
      {
        label: 'Leads e exportação CSV',
        description: 'Organize os contatos capturados e baixe planilhas para CRM, remarketing ou acompanhamento comercial.',
      },
      {
        label: 'Analytics de compartilhamento',
        description: 'Acompanhe sinais de engajamento, como acessos, downloads e compartilhamentos das experiências.',
      },
    ],
  },
  {
    id: 'unlimited',
    name: 'Ilimitado SIX3°',
    price: 199.99,
    tagline: 'Tudo liberado para escalar sem travas.',
    highlight: false,
    features: [
      {
        label: 'Todos os templates liberados',
        description: 'Acesso completo a biblioteca de modelos, incluindo molduras estaticas, animadas e novos templates publicados.',
      },
      {
        label: 'Salvar offline sem restrições',
        description: 'Uso offline ampliado para manter a operação fluida mesmo em locais com internet limitada.',
      },
      {
        label: 'Galerias, QR Codes e leads sem limite',
        description: 'Libera criação, compartilhamento e captação sem travas artificiais dentro do SaaS.',
      },
      {
        label: 'Personalização completa da marca',
        description: 'Controle total da presença visual para deixar a experiência alinhada à identidade do seu negócio.',
      },
      {
        label: 'Analytics completo e comparativos',
        description: 'Relatórios mais profundos para comparar desempenho, entender engajamento e tomar decisões melhores.',
      },
      {
        label: 'Suporte prioritário',
        description: 'Atendimento com prioridade para dúvidas da plataforma, configuração e uso dos recursos do SaaS.',
      },
    ],
  },
] as const satisfies readonly {
  id: PlanId;
  name: string;
  price: number;
  tagline: string;
  highlight: boolean;
  features: readonly PlanBullet[];
}[];
