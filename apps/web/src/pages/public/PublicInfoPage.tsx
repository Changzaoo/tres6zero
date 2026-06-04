import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  BarChart2,
  CheckCircle2,
  Download,
  Film,
  HelpCircle,
  Layers,
  LifeBuoy,
  LockKeyhole,
  Monitor,
  Music2,
  QrCode,
  ShieldCheck,
  Smartphone,
  Sparkles,
  UploadCloud,
  Wand2,
  WifiOff,
  Zap,
  type LucideIcon,
} from 'lucide-react';
import { BrandLogo } from '@/components/brand/BrandLogo';
import { Button } from '@/components/ui/Button';
import { GlassCard, RevealOnScroll } from '@/components/landing/LandingPrimitives';
import { MouseAura } from '@/components/landing/MouseAura';

export type PublicInfoPageId =
  | 'recursos'
  | 'como-funciona'
  | 'estilos'
  | 'mobile'
  | 'desktop'
  | 'templates'
  | 'analytics'
  | 'pagamento'
  | 'suporte';

type InfoCard = {
  icon: LucideIcon;
  title: string;
  description: string;
};

type InfoBlock = {
  title: string;
  description: string;
  items: string[];
};

type InfoPage = {
  kicker: string;
  title: string;
  lead: string;
  icon: LucideIcon;
  heroGradient: string;
  primaryAction: { label: string; to: string };
  secondaryAction?: { label: string; to: string };
  stats: Array<[string, string]>;
  highlights: InfoCard[];
  blocks: InfoBlock[];
  checklistTitle: string;
  checklist: string[];
  timelineTitle: string;
  timeline: Array<[string, string]>;
};

const pages: Record<PublicInfoPageId, InfoPage> = {
  recursos: {
    kicker: 'Produto',
    title: 'Recursos criados para transformar captura 360 em entrega profissional',
    lead:
      'O SIX3 organiza o fluxo inteiro: captura, upload, templates, efeitos, trilha, publicação, QR Code, leads e métricas. A ideia é reduzir operação manual sem tirar controle do operador.',
    icon: Sparkles,
    heroGradient: 'from-blue-500/25 via-violet-500/18 to-cyan-400/12',
    primaryAction: { label: 'Ver planos', to: '/plans' },
    secondaryAction: { label: 'Criar conta', to: '/register' },
    stats: [
      ['1 fluxo', 'do vídeo bruto ao link final'],
      ['360', 'pensado para eventos e booths'],
      ['Offline', 'base para uso em campo'],
    ],
    highlights: [
      {
        icon: Film,
        title: 'Gravar ou enviar vídeo',
        description: 'O operador pode capturar pelo app ou enviar um arquivo pronto, com ou sem evento vinculado.',
      },
      {
        icon: Layers,
        title: 'Templates transparentes',
        description: 'Sobreposicoes em retrato e paisagem para marca, festa, casamento, corporativo e outras ocasioes.',
      },
      {
        icon: Wand2,
        title: 'Efeitos de edição',
        description: 'Presets como clean, boomerang, slow motion, cinematic, neon glow, speed ramp e auto edit.',
      },
      {
        icon: Music2,
        title: 'Músicas e duração',
        description: 'Escolha trilha, preview e duracoes curtas para entregas rapidas, incluindo 5, 15, 25, 35 e 45 segundos.',
      },
      {
        icon: QrCode,
        title: 'Galeria e QR Code',
        description: 'Cada publicação pode virar link compartilhável com QR Code para o cliente acessar sem fricção.',
      },
      {
        icon: BarChart2,
        title: 'Resultados reais',
        description: 'Dashboard com eventos, vídeos, visualizações, downloads, leads e compartilhamentos.',
      },
    ],
    blocks: [
      {
        title: 'Para o operador',
        description: 'Ferramentas para trabalhar rápido no dia do evento, com menos telas e menos decisão tecnica.',
        items: ['Gravação direta', 'Upload de vídeo', 'Vídeo avulso', 'Evento ativo', 'Preview antes de publicar'],
      },
      {
        title: 'Para o cliente final',
        description: 'Entrega limpa, com link simples, visual profissional e possibilidade de baixar ou compartilhar.',
        items: ['Página pública', 'QR Code', 'Capa do evento', 'Vídeos selecionados', 'Experiência mobile'],
      },
      {
        title: 'Para o dono da conta',
        description: 'Controle de plano, conteúdos, permissão, suporte, assinatura e dados do negócio.',
        items: ['Planos por acesso', 'Admin protegido', 'Suporte interno', 'Métricas', 'Histórico de vídeos'],
      },
    ],
    checklistTitle: 'O que entra no conjunto de recursos',
    checklist: [
      'Editor local no navegador para aliviar o servidor.',
      'Templates oficiais separados de templates enviados pelo usuário.',
      'Músicas oficiais separadas de músicas enviadas pelo usuário.',
      'Controle de acesso por assinatura, com vídeos antigos preservados.',
      'Modo PWA/offline para continuar usando o app instalado.',
    ],
    timelineTitle: 'Fluxo recomendado',
    timeline: [
      ['Capturar', 'Grave no celular ou envie o arquivo bruto.'],
      ['Editar', 'Escolha template, efeito, música, formato e duração.'],
      ['Publicar', 'Envie o resultado para storage e gere link público.'],
      ['Medir', 'Acompanhe acessos, downloads, leads e compartilhamentos.'],
    ],
  },
  'como-funciona': {
    kicker: 'Produto',
    title: 'Como funciona: da captura ao QR Code em poucos passos',
    lead:
      'A plataforma foi desenhada para uma operação simples: escolher o contexto, aplicar edição visual e publicar uma entrega que o cliente entende na hora.',
    icon: Zap,
    heroGradient: 'from-cyan-400/20 via-blue-500/18 to-violet-500/18',
    primaryAction: { label: 'Comecar a jornada', to: '/plans' },
    secondaryAction: { label: 'Ver recursos', to: '/recursos' },
    stats: [
      ['4 etapas', 'captura, edição, publicação e métricas'],
      ['1 QR', 'para cada entrega compartilhável'],
      ['Server-side', 'permissoes validadas fora do client'],
    ],
    highlights: [
      {
        icon: UploadCloud,
        title: 'Entrada do conteúdo',
        description: 'O usuário escolhe evento ou vídeo avulso, grava ou envia um arquivo e segue para edição.',
      },
      {
        icon: Wand2,
        title: 'Montagem visual',
        description: 'Templates, efeitos, trilhas e duração entram antes da publicação, com preview no próprio navegador.',
      },
      {
        icon: ShieldCheck,
        title: 'Validacao segura',
        description: 'O backend confere identidade, plano, admin e permissão antes de liberar áreas protegidas.',
      },
      {
        icon: QrCode,
        title: 'Entrega pública',
        description: 'O vídeo publicado vira uma URL pública com QR Code, pronta para o operador compartilhar.',
      },
    ],
    blocks: [
      {
        title: '1. Preparar',
        description: 'Crie um evento ou escolha vídeo avulso. O evento pode ter capa, mídias e página própria.',
        items: ['Nome do evento', 'Capa', 'Mídias destacadas', 'Slug público', 'Configuração de captura'],
      },
      {
        title: '2. Editar',
        description: 'A edição prioriza o navegador para evitar estouro de memória no servidor.',
        items: ['Preview de template', 'Preview de efeito', 'Preview de música', 'Timeline', 'Duração desejada'],
      },
      {
        title: '3. Compartilhar',
        description: 'Após publicar, o usuário recebe link, QR Code e opção de ver o vídeo imediatamente.',
        items: ['Link público', 'QR Code', 'Botao ver vídeo', 'Botao compartilhar', 'Novo vídeo'],
      },
    ],
    checklistTitle: 'Regras importantes do fluxo',
    checklist: [
      'O client não deve guardar segredos ou chaves privadas.',
      'Vídeos antigos continuam acessíveis mesmo se a assinatura expirar.',
      'Novos recursos pagos ficam bloqueados até confirmação do pagamento.',
      'Admin tem acesso ampliado validado por ambiente e pelo backend.',
      'O render de vídeo deve ser local sempre que possível.',
    ],
    timelineTitle: 'Jornada operacional',
    timeline: [
      ['Conta', 'Usuário entra, cria conta ou recupera acesso.'],
      ['Plano', 'Pagamento libera recursos conforme assinatura.'],
      ['Operação', 'Usuário grava, envia, edita e publica.'],
      ['Pos-evento', 'Leads, analytics e suporte fecham o ciclo.'],
    ],
  },
  estilos: {
    kicker: 'Produto',
    title: 'Estilos de edição para cada tipo de evento',
    lead:
      'Os estilos combinam ritmo, filtro, movimento, template e trilha. Assim o mesmo vídeo bruto pode virar uma entrega clean, festa, luxo, casamento ou corporativa.',
    icon: Wand2,
    heroGradient: 'from-fuchsia-500/18 via-violet-500/20 to-blue-500/18',
    primaryAction: { label: 'Ver templates', to: '/templates' },
    secondaryAction: { label: 'Ver planos', to: '/plans' },
    stats: [
      ['5 duracoes', '5, 15, 25, 35 e 45 segundos'],
      ['2 formatos', 'retrato e paisagem'],
      ['Auto edit', 'IA como modo assistido'],
    ],
    highlights: [
      {
        icon: Zap,
        title: 'Party pop',
        description: 'Cortes rapidos, brilho, flashes, trilha animada e molduras para pista de festa.',
      },
      {
        icon: Sparkles,
        title: 'Wedding soft',
        description: 'Slow suave, luz delicada, templates elegantes e ritmo emocional para casamento.',
      },
      {
        icon: Monitor,
        title: 'Corporate sharp',
        description: 'Visual limpo, marca em destaque, cortes objetivos e acabamento para eventos empresariais.',
      },
      {
        icon: ShieldCheck,
        title: 'Luxury gold',
        description: 'Tratamento premium, detalhes dourados, movimento sutil e entrega de alto impacto.',
      },
      {
        icon: Film,
        title: 'Cinematic',
        description: 'Cor mais rica, transicoes suaves e sensacao de filme para memorias especiais.',
      },
      {
        icon: Wand2,
        title: 'IA auto edit',
        description: 'Modo que escolhe combinacoes com base no tipo de conteúdo e no clima desejado.',
      },
    ],
    blocks: [
      {
        title: 'Camadas do estilo',
        description: 'Cada estilo não é apenas uma cor. Ele combina varias decisões visuais.',
        items: ['Filtro', 'Velocidade', 'Template', 'Música', 'Duração', 'Transição'],
      },
      {
        title: 'Templates estáticos',
        description: 'Ideais para marca, identidade do evento e entregas que precisam ser leves.',
        items: ['Molduras', 'Logotipo', 'Assinatura', 'Corners', 'Faixas inferiores'],
      },
      {
        title: 'Templates animados',
        description: 'Usados quando o vídeo precisa parecer mais vivo sem ficar poluido.',
        items: ['Entradas sutis', 'Brilhos', 'Particulas', 'Pulse', 'Movimento lateral'],
      },
    ],
    checklistTitle: 'Como escolher o estilo certo',
    checklist: [
      'Use clean quando o vídeo já tem muita informacao visual.',
      'Use party pop em pista, aniversario, balada e celebracoes animadas.',
      'Use wedding soft quando o foco for emoção e memória.',
      'Use corporate sharp quando a marca precisa ficar clara.',
      'Use auto edit quando quiser velocidade com boa escolha padrão.',
    ],
    timelineTitle: 'Montagem do preset',
    timeline: [
      ['Tema', 'Escolha a ocasiao ou o objetivo.'],
      ['Ritmo', 'Defina duração e intensidade dos cortes.'],
      ['Visual', 'Aplique template, filtro e movimento.'],
      ['Som', 'Selecione ou envie uma trilha para finalizar.'],
    ],
  },
  mobile: {
    kicker: 'Plataforma',
    title: 'Mobile-first para operar no evento sem depender do computador',
    lead:
      'No celular, o SIX3 precisa ser direto: gravar, enviar, editar, publicar e compartilhar. A navegação prioriza bottom bar, telas compactas e operação em campo.',
    icon: Smartphone,
    heroGradient: 'from-blue-500/20 via-cyan-400/15 to-emerald-400/12',
    primaryAction: { label: 'Criar conta', to: '/register' },
    secondaryAction: { label: 'Ver desktop', to: '/desktop' },
    stats: [
      ['PWA', 'instalavel no celular'],
      ['Bottom bar', 'menu pensado para toque'],
      ['Offline', 'base para uso sem conexão constante'],
    ],
    highlights: [
      {
        icon: Smartphone,
        title: 'Navegacao inferior',
        description: 'Os atalhos principais ficam no rodape, sem menu lateral acessivel no mobile.',
      },
      {
        icon: Film,
        title: 'Gravação direta',
        description: 'Fluxo para capturar vídeo pelo próprio dispositivo e seguir para edição.',
      },
      {
        icon: WifiOff,
        title: 'Uso offline',
        description: 'A experiência instalada deve abrir rápido e manter funções essenciais em cache.',
      },
      {
        icon: QrCode,
        title: 'Compartilhamento rápido',
        description: 'Depois de publicar, o operador mostra ou envia o QR Code sem sair da tela.',
      },
    ],
    blocks: [
      {
        title: 'O que o mobile precisa priorizar',
        description: 'Tela pequena pede comandos curtos, botoes menores e feedback claro.',
        items: ['Gravar', 'Enviar', 'Templates', 'Planos', 'Conta', 'Mais'],
      },
      {
        title: 'O que deve ficar fora',
        description: 'Recursos pesados ou administrativos não devem atrapalhar a operação no evento.',
        items: ['Sidebar', 'Topbar vazia', 'Cards gigantes', 'Scroll desnecessario', 'Campos excessivos'],
      },
      {
        title: 'Instalado como app',
        description: 'Ao instalar, o app deve lembrar tema, sessao local e cache básico.',
        items: ['Favicon/app icon', 'Service worker', 'Cache shell', 'Preferencias', 'Sessao facilitada'],
      },
    ],
    checklistTitle: 'Regras de experiência mobile',
    checklist: [
      'Bottom bar sempre visivel nas paginas privadas.',
      'Botao Mais precisa abrir todos os itens secundarios.',
      'Gravar deve permanecer centralizado se estiver destacado.',
      'Topbar vazia não deve ocupar espaço no mobile.',
      'Cards e formularios precisam caber sem scroll desnecessario.',
    ],
    timelineTitle: 'Fluxo no celular',
    timeline: [
      ['Abrir', 'App carrega shell rapidamente.'],
      ['Gravar', 'Operador captura ou envia vídeo.'],
      ['Editar', 'Escolhe template, efeito, música e duração.'],
      ['Entregar', 'Pública, compartilha QR Code e segue para o próximo.'],
    ],
  },
  desktop: {
    kicker: 'Plataforma',
    title: 'Desktop para controle completo, organização e revisão visual',
    lead:
      'No computador, a plataforma pode mostrar mais contexto: dashboard, timeline, biblioteca, eventos, analytics, suporte e administração.',
    icon: Monitor,
    heroGradient: 'from-slate-400/14 via-blue-500/18 to-violet-500/16',
    primaryAction: { label: 'Entrar', to: '/login' },
    secondaryAction: { label: 'Ver mobile', to: '/mobile' },
    stats: [
      ['Timeline', 'edição mais visual'],
      ['Dashboard', 'métricas reais'],
      ['Admin', 'gestao protegida'],
    ],
    highlights: [
      {
        icon: Monitor,
        title: 'Layout amplo',
        description: 'Sidebar e áreas lado a lado ajudam a comparar evento, preview e configurações.',
      },
      {
        icon: BarChart2,
        title: 'Analise de resultados',
        description: 'Cards e graficos mostram crescimento, vídeos, leads e compartilhamentos.',
      },
      {
        icon: Layers,
        title: 'Gestao de catálogo',
        description: 'Templates, músicas e uploads personalizados são mais fáceis de organizar no desktop.',
      },
      {
        icon: LifeBuoy,
        title: 'Suporte e admin',
        description: 'Atendimento, respostas do admin e histórico ficam mais claros em tela grande.',
      },
    ],
    blocks: [
      {
        title: 'Operação avançada',
        description: 'Desktop favorece revisão, uploads maiores e organização por evento.',
        items: ['Preview grande', 'Timeline', 'Upload de assets', 'Filtros', 'Busca global'],
      },
      {
        title: 'Gestao',
        description: 'Dono da conta e admin precisam enxergar saúde da plataforma.',
        items: ['Assinaturas', 'Usuários', 'Pagamentos', 'Notificações', 'Dispositivos conectados'],
      },
      {
        title: 'Qualidade visual',
        description: 'Telas maiores ajudam a validar templates e efeitos antes da publicação.',
        items: ['Preview de template', 'Preview de música', 'Comparação', 'Duração', 'Exportação'],
      },
    ],
    checklistTitle: 'O que o desktop entrega melhor',
    checklist: [
      'Visao completa de eventos e vídeos.',
      'Configurações mais densas sem perder legibilidade.',
      'Controle de suporte, admin e assinatura.',
      'Biblioteca de templates com filtros e busca.',
      'Editor com timeline mais confortavel.',
    ],
    timelineTitle: 'Fluxo no desktop',
    timeline: [
      ['Organizar', 'Crie eventos, revise mídias e ajuste capas.'],
      ['Editar', 'Use preview amplo e timeline.'],
      ['Analisar', 'Veja dashboard, analytics e leads.'],
      ['Gerenciar', 'Controle planos, suporte e configurações.'],
    ],
  },
  templates: {
    kicker: 'Plataforma',
    title: 'Templates para sobrepor identidade visual sem esconder o vídeo',
    lead:
      'Templates são camadas transparentes. Eles precisam complementar o vídeo, não cobrir a cena. O catálogo deve incluir versões retrato, paisagem, estáticas e animadas.',
    icon: Layers,
    heroGradient: 'from-violet-500/22 via-fuchsia-500/12 to-cyan-400/14',
    primaryAction: { label: 'Criar conta', to: '/register' },
    secondaryAction: { label: 'Ver estilos', to: '/estilos' },
    stats: [
      ['2 orientacoes', 'portrait e landscape'],
      ['2 tipos', 'estático e animado'],
      ['Buckets', 'oficiais e enviados pelo usuário'],
    ],
    highlights: [
      {
        icon: Layers,
        title: 'Transparentes de verdade',
        description: 'A arte deve ficar por cima do vídeo preservando área central, rosto e acao principal.',
      },
      {
        icon: Sparkles,
        title: 'Varios temas',
        description: 'Aniversario, casamento, formatura, corporativo, balada, debutante, luxo, neon e clean.',
      },
      {
        icon: UploadCloud,
        title: 'Upload do usuário',
        description: 'O usuário pode enviar templates proprios em bucket separado dos assets oficiais.',
      },
      {
        icon: Film,
        title: 'Movimento leve',
        description: 'Templates animados devem ter brilho, entrada, pulse ou deslocamento sem pesar o app.',
      },
    ],
    blocks: [
      {
        title: 'O que evitar',
        description: 'Templates ruins pesam a experiência e prejudicam o vídeo final.',
        items: ['Centro coberto', 'Texto genérico demais', 'Apenas variação de cor', 'Excesso de elementos', 'Baixa transparência'],
      },
      {
        title: 'O que priorizar',
        description: 'Cada template deve ter composicao própria e utilidade clara.',
        items: ['Ocasião definida', 'Área segura', 'Assinatura visual', 'Legibilidade', 'Variação portrait/landscape'],
      },
      {
        title: 'Como o catálogo escala',
        description: 'Templates oficiais ficam separados dos assets enviados pelo usuário.',
        items: ['Oficiais SIX3', 'Premium', 'Customizados', 'Músicas do usuário', 'Templates do usuário'],
      },
    ],
    checklistTitle: 'Padrão de qualidade para templates',
    checklist: [
      'Manter fundo transparente e área central livre.',
      'Criar layout diferente, não apenas trocar cor.',
      'Gerar versões portrait e landscape.',
      'Separar arquivos oficiais de arquivos enviados pelo usuário.',
      'Permitir preview antes de aplicar no vídeo.',
    ],
    timelineTitle: 'Uso no editor',
    timeline: [
      ['Escolher', 'Usuário busca por tema, estilo ou orientação.'],
      ['Prever', 'App mostra preview sobre o vídeo.'],
      ['Ajustar', 'Usuário troca duração, efeito e música.'],
      ['Aplicar', 'Renderer local combina vídeo e camada transparente.'],
    ],
  },
  analytics: {
    kicker: 'Plataforma',
    title: 'Analytics para entender entrega, alcance e retorno dos eventos',
    lead:
      'Depois que o vídeo sai do booth, o SIX3 acompanha sinais importantes: visualizações, downloads, leads, compartilhamentos e crescimento semanal.',
    icon: BarChart2,
    heroGradient: 'from-indigo-500/20 via-blue-500/18 to-emerald-400/12',
    primaryAction: { label: 'Ver planos', to: '/plans' },
    secondaryAction: { label: 'Ver recursos', to: '/recursos' },
    stats: [
      ['Real', 'cards baseados nos dados da conta'],
      ['Eventos', 'comparação por campanha'],
      ['Leads', 'captura ligada a galeria'],
    ],
    highlights: [
      {
        icon: BarChart2,
        title: 'Dashboard principal',
        description: 'Resumo de eventos, vídeos, leads, visualizações, downloads e taxa de compartilhamento.',
      },
      {
        icon: QrCode,
        title: 'Compartilhamentos',
        description: 'Acompanha quando o link ou QR Code gera distribuição depois da publicação.',
      },
      {
        icon: Download,
        title: 'Downloads',
        description: 'Mostra o quanto o cliente final realmente levou o conteúdo para usar depois.',
      },
      {
        icon: ShieldCheck,
        title: 'Dados por permissão',
        description: 'Usuário enxerga seus dados; admin enxerga a plataforma conforme regra server-side.',
      },
    ],
    blocks: [
      {
        title: 'Métricas operacionais',
        description: 'Ajudam o usuário a entender volume e saúde da conta.',
        items: ['Eventos', 'Vídeos', 'Eventos ativos', 'Downloads', 'Visualizações'],
      },
      {
        title: 'Métricas de resultado',
        description: 'Mostram se a entrega está sendo consumida e compartilhada.',
        items: ['Leads', 'Compartilhamentos', 'Taxa de compartilhamento', 'Crescimento semanal', 'Ultimos 7 dias'],
      },
      {
        title: 'Uso pelo admin',
        description: 'Admin precisa ver assinantes, acessos e suporte para operar o SaaS.',
        items: ['Usuários pagos', 'Status de assinatura', 'Chamados', 'Notificações', 'Atividade'],
      },
    ],
    checklistTitle: 'Boas praticas de analytics',
    checklist: [
      'Mostrar dados reais, não numeros fixos.',
      'Diferenciar dados do usuário e dados administrativos.',
      'Evitar expor informacao sensível no client.',
      'Registrar eventos importantes de publicação e visualização.',
      'Usar graficos simples, legiveis e responsivos.',
    ],
    timelineTitle: 'Ciclo dos dados',
    timeline: [
      ['Publicar', 'Vídeo gera registro e link.'],
      ['Acessar', 'Galeria pública registra visualização.'],
      ['Interagir', 'Downloads, leads e shares entram nas métricas.'],
      ['Decidir', 'Usuário entende o que funcionou melhor.'],
    ],
  },
  pagamento: {
    kicker: 'Acesso',
    title: 'Pagamento com liberação segura de assinatura',
    lead:
      'O pagamento libera recursos pagos sem colocar segredo no navegador. A cobrança Pix é criada pela PixGo e o backend confirma o acesso por webhook antes de desbloquear a plataforma.',
    icon: ShieldCheck,
    heroGradient: 'from-emerald-400/16 via-blue-500/16 to-violet-500/18',
    primaryAction: { label: 'Escolher plano', to: '/plans' },
    secondaryAction: { label: 'Criar conta', to: '/register' },
    stats: [
      ['Mensal', 'renovação no dia da assinatura'],
      ['PixGo', 'Pix e webhook'],
      ['Seguro', 'segredos somente no servidor'],
    ],
    highlights: [
      {
        icon: ShieldCheck,
        title: 'Confirmação PixGo',
        description: 'O backend confirma o pagamento Pix por webhook antes de liberar o plano.',
      },
      {
        icon: QrCode,
        title: 'QR Code Pix',
        description: 'A cobrança mostra QR Code Pix e código copia e cola para pagamento no aplicativo financeiro do cliente.',
      },
      {
        icon: LockKeyhole,
        title: 'Bloqueio por plano',
        description: 'Áreas pagas ficam travadas até a confirmação server-side do pagamento.',
      },
      {
        icon: Film,
        title: 'Vídeos antigos preservados',
        description: 'Quem não renova continua acessando vídeos já publicados, mas não libera novos recursos pagos.',
      },
    ],
    blocks: [
      {
        title: 'Como a liberação acontece',
        description: 'A confirmação não deve depender do front-end.',
        items: ['Usuário escolhe plano', 'PixGo cria cobrança Pix', 'Webhook confirma', 'Backend atualiza acesso', 'App libera recursos'],
      },
      {
        title: 'Estados de assinatura',
        description: 'Cada estado precisa ter comportamento claro.',
        items: ['Ativa', 'Pendente', 'Expirada', 'Cancelada', 'Admin ilimitado'],
      },
      {
        title: 'Segurança',
        description: 'O client nunca deve carregar chave secreta de PixGo, Firebase Admin, Supabase service role ou OpenAI.',
        items: ['Env vars no Render', 'Webhook validado', 'Token Firebase', 'CORS controlado', 'Sem secrets no Git'],
      },
    ],
    checklistTitle: 'O que o pagamento precisa garantir',
    checklist: [
      'Criar cobrança Pix apenas pelo backend.',
      'Confirmar pagamento por webhook.',
      'Renovar acesso mensalmente no mesmo dia da assinatura.',
      'Preservar vídeos antigos para usuário que já pagou.',
      'Mostrar plano selecionado dentro do próprio card do plano.',
    ],
    timelineTitle: 'Jornada de pagamento',
    timeline: [
      ['Plano', 'Usuário escolhe Essencial, Profissional ou Ilimitado.'],
      ['Pix', 'PixGo gera QR Code e Pix copia e cola.'],
      ['Confirmação', 'Webhook informa sucesso ao backend.'],
      ['Acesso', 'Recursos pagos são liberados na conta.'],
    ],
  },
  suporte: {
    kicker: 'Acesso',
    title: 'Suporte com mensagens diretas entre usuário e admin',
    lead:
      'O suporte do SIX3 deve funcionar dentro do app e também na tela de login para quem não consegue entrar. Conversas anônimas ficam salvas no navegador até o usuário se identificar.',
    icon: LifeBuoy,
    heroGradient: 'from-violet-500/18 via-blue-500/14 to-cyan-400/14',
    primaryAction: { label: 'Abrir login', to: '/login' },
    secondaryAction: { label: 'Criar conta', to: '/register' },
    stats: [
      ['DM', 'usuário conversa com admin'],
      ['Anônimo', 'suporte antes do login'],
      ['Notificações', 'respostas aparecem no app'],
    ],
    highlights: [
      {
        icon: LifeBuoy,
        title: 'Chamado dentro do app',
        description: 'Usuário escolhe assunto comum, envia mensagem e acompanha resposta sem expor email na tela.',
      },
      {
        icon: HelpCircle,
        title: 'Suporte no login',
        description: 'Quem tem problema para entrar pode abrir uma janela parecida com mensagens diretas.',
      },
      {
        icon: ShieldCheck,
        title: 'Anônimo protegido',
        description: 'A conversa anônima deve ter identificador local, sem revelar dados sensíveis automaticamente.',
      },
      {
        icon: LockKeyhole,
        title: 'Triagem administrativa',
        description: 'Admin recebe contexto operacional para identificar a pessoa sem depender de dados expostos ao client.',
      },
    ],
    blocks: [
      {
        title: 'Assuntos comuns',
        description: 'Em vez de campo livre de email, o usuário escolhe um problema para orientar o atendimento.',
        items: ['Problema para entrar', 'Pagamento ou assinatura', 'Vídeo ou template', 'Evento ou QR Code', 'Outro problema'],
      },
      {
        title: 'Mensagens diretas',
        description: 'A conversa fica em formato de chat para usuário e admin.',
        items: ['Histórico', 'Status', 'Notificações', 'Resposta do admin', 'Anexos quando permitido'],
      },
      {
        title: 'Suporte anônimo',
        description: 'Antes do login, o navegador guarda a conversa para continuidade.',
        items: ['ID local', 'Mensagens locais', 'Assunto', 'Sem campo de email visivel', 'Processo de identificação'],
      },
    ],
    checklistTitle: 'O que um suporte completo precisa ter',
    checklist: [
      'Botao de suporte visivel na tela de login.',
      'Lista de assuntos comuns no lugar de email editavel.',
      'Histórico de mensagens para usuário autenticado.',
      'Painel admin para responder e encerrar chamados.',
      'Notificações configuraveis na página de configurações.',
    ],
    timelineTitle: 'Ciclo de atendimento',
    timeline: [
      ['Abrir', 'Usuário escolhe assunto e descreve o problema.'],
      ['Triar', 'Sistema marca como usuário ou anônimo.'],
      ['Responder', 'Admin envia resposta pelo painel.'],
      ['Resolver', 'Conversa fica registrada e pode ser encerrada.'],
    ],
  },
};

function PublicHeader() {
  const navigate = useNavigate();

  return (
    <header className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4 px-4 py-5 sm:px-6 lg:px-8">
      <button type="button" onClick={() => navigate('/')} className="inline-flex min-w-0" aria-label="Voltar para início">
        <BrandLogo wordmarkClassName="text-3xl" />
      </button>
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={() => navigate('/login')}>
          Entrar
        </Button>
        <Button size="sm" onClick={() => navigate('/plans')}>
          Planos
        </Button>
      </div>
    </header>
  );
}

function StatPill({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.045] p-4">
      <p className="text-2xl font-black tracking-normal text-white">{value}</p>
      <p className="mt-1 text-xs leading-relaxed text-white/45">{label}</p>
    </div>
  );
}

function DetailBlock({ block }: { block: InfoBlock }) {
  return (
    <GlassCard className="h-full p-5 sm:p-6">
      <h3 className="text-xl font-black text-white">{block.title}</h3>
      <p className="mt-3 text-sm leading-relaxed text-white/55">{block.description}</p>
      <div className="mt-5 flex flex-wrap gap-2">
        {block.items.map((item) => (
          <span key={item} className="rounded-full border border-white/10 bg-white/[0.055] px-3 py-1.5 text-xs font-bold text-white/62">
            {item}
          </span>
        ))}
      </div>
    </GlassCard>
  );
}

export default function PublicInfoPage({ pageId }: { pageId: PublicInfoPageId }) {
  const navigate = useNavigate();
  const page = pages[pageId];
  const Icon = page.icon;

  return (
    <div className="six3-grid-bg min-h-screen overflow-x-clip bg-surface text-white">
      <MouseAura />
      <PublicHeader />

      <main className="mx-auto w-full max-w-7xl px-4 pb-16 sm:px-6 lg:px-8">
        <button
          type="button"
          onClick={() => navigate('/')}
          className="mb-5 inline-flex items-center gap-2 rounded-full px-2 py-2 text-sm font-bold text-white/50 transition hover:bg-white/[0.055] hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar para início
        </button>

        <section className={`relative overflow-hidden rounded-[30px] border border-white/10 bg-gradient-to-br ${page.heroGradient} px-5 py-10 shadow-[0_44px_130px_-80px_rgba(59,109,255,.8)] sm:px-8 sm:py-14 lg:px-10`}>
          <div className="absolute inset-0 bg-[radial-gradient(65%_95%_at_80%_8%,rgba(255,255,255,.14),transparent_62%)]" />
          <div className="relative grid gap-8 lg:grid-cols-[1fr_0.42fr] lg:items-end">
            <div>
              <span className="six3-kicker">{page.kicker}</span>
              <h1 className="mt-5 max-w-4xl text-[clamp(2.4rem,7vw,5.15rem)] font-black leading-[0.98] tracking-normal text-white">
                {page.title}
              </h1>
              <p className="mt-5 max-w-3xl text-base leading-relaxed text-white/62 sm:text-lg">
                {page.lead}
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Button size="lg" onClick={() => navigate(page.primaryAction.to)} icon={<ArrowRight className="h-5 w-5" />}>
                  {page.primaryAction.label}
                </Button>
                {page.secondaryAction && (
                  <Button variant="secondary" size="lg" onClick={() => navigate(page.secondaryAction!.to)}>
                    {page.secondaryAction.label}
                  </Button>
                )}
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
              <div className="mb-1 hidden h-16 w-16 place-items-center rounded-3xl border border-white/10 bg-white/[0.08] text-brand-100 shadow-glow lg:grid">
                <Icon className="h-8 w-8" />
              </div>
              {page.stats.map(([value, label]) => (
                <StatPill key={value} value={value} label={label} />
              ))}
            </div>
          </div>
        </section>

        <section className="py-12 sm:py-14">
          <div className="mb-7 max-w-3xl">
            <span className="six3-kicker">Detalhes</span>
            <h2 className="mt-3 text-3xl font-black leading-tight tracking-normal text-white sm:text-4xl">
              O que esta página cobre
            </h2>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {page.highlights.map((item, index) => {
              const CardIcon = item.icon;
              return (
                <RevealOnScroll key={item.title} delay={(index % 4) * 0.04}>
                  <GlassCard className="h-full p-5">
                    <div className="mb-4 grid h-11 w-11 place-items-center rounded-2xl border border-white/10 bg-white/[0.055] text-brand-200">
                      <CardIcon className="h-5 w-5" />
                    </div>
                    <h3 className="text-base font-black text-white">{item.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-white/55">{item.description}</p>
                  </GlassCard>
                </RevealOnScroll>
              );
            })}
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-3">
          {page.blocks.map((block) => (
            <DetailBlock key={block.title} block={block} />
          ))}
        </section>

        <section className="grid gap-5 py-12 sm:py-14 lg:grid-cols-[0.9fr_1.1fr]">
          <GlassCard className="p-5 sm:p-6">
            <span className="six3-kicker">Checklist</span>
            <h2 className="mt-3 text-2xl font-black text-white">{page.checklistTitle}</h2>
            <ul className="mt-6 space-y-3">
              {page.checklist.map((item) => (
                <li key={item} className="flex gap-3 text-sm leading-relaxed text-white/66">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </GlassCard>

          <GlassCard className="p-5 sm:p-6">
            <span className="six3-kicker">Processo</span>
            <h2 className="mt-3 text-2xl font-black text-white">{page.timelineTitle}</h2>
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              {page.timeline.map(([title, description], index) => (
                <div key={title} className="rounded-2xl border border-white/10 bg-white/[0.045] p-4">
                  <div className="flex items-center gap-3">
                    <span className="grid h-8 w-8 place-items-center rounded-full bg-gradient-brand text-xs font-black text-white">
                      {index + 1}
                    </span>
                    <h3 className="font-black text-white">{title}</h3>
                  </div>
                  <p className="mt-3 text-sm leading-relaxed text-white/55">{description}</p>
                </div>
              ))}
            </div>
          </GlassCard>
        </section>

        <section className="rounded-[30px] border border-brand-300/20 bg-gradient-to-br from-brand-500/16 via-white/[0.035] to-cyan-400/10 p-5 sm:p-7">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-2xl font-black text-white">Pronto para usar o SIX3?</h2>
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-white/58">
                Escolha um plano, crie sua conta e comece pelo fluxo principal: gravar, editar, publicar e compartilhar.
              </p>
            </div>
            <Button onClick={() => navigate('/plans')} icon={<ArrowRight className="h-4 w-4" />}>
              Ver planos
            </Button>
          </div>
        </section>
      </main>
    </div>
  );
}
