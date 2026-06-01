export type PlanId = 'starter' | 'pro' | 'unlimited';

type PlanFeature = {
  label: string;
  description: string;
};

export const PLANS = [
  {
    id: 'starter',
    name: 'Essencial 360',
    price: 69.99,
    tagline: 'Para começar com uma operação simples e bem organizada.',
    highlight: false,
    features: [
      {
        label: 'Templates essenciais',
        description: 'Modelos prontos para montar páginas, galerias e experiências básicas sem começar do zero.',
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
    name: 'Profissional',
    price: 129.99,
    tagline: 'Para quem quer vender uma experiência mais completa.',
    highlight: true,
    features: [
      {
        label: 'Templates essenciais e premium',
        description: 'Inclui modelos mais completos para campanhas, galerias comerciais e entregas com mais acabamento.',
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
    name: 'Ilimitado 360',
    price: 199.99,
    tagline: 'Tudo liberado para escalar sem travas.',
    highlight: false,
    features: [
      {
        label: 'Todos os templates liberados',
        description: 'Acesso completo à biblioteca de modelos, incluindo novos templates publicados na plataforma.',
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
  features: readonly PlanFeature[];
}[];
