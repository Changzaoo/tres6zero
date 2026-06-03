import { useNavigate } from 'react-router-dom';
import type { CSSProperties } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  CreditCard,
  FileText,
  HelpCircle,
  Image as ImageIcon,
  Layers,
  LifeBuoy,
  LockKeyhole,
  Map,
  Music2,
  QrCode,
  Scale,
  ShieldCheck,
  Smartphone,
  Target,
  UploadCloud,
  Users,
  type LucideIcon,
} from 'lucide-react';
import { BrandLogo } from '@/components/brand/BrandLogo';
import { Button } from '@/components/ui/Button';
import { GlassCard, RevealOnScroll } from '@/components/landing/LandingPrimitives';
import { MouseAura } from '@/components/landing/MouseAura';

export type PublicDocsPageId = 'faq' | 'termos' | 'privacidade' | 'roadmap' | 'materiais';

type DocCard = {
  icon?: LucideIcon;
  title: string;
  description: string;
  items?: string[];
};

type DocSection = {
  title: string;
  description?: string;
  items?: string[];
  columns?: string[];
  rows?: string[][];
  cards?: DocCard[];
};

type DocVisual = {
  src: string;
  title: string;
  description: string;
};

type DocPage = {
  kicker: string;
  title: string;
  lead: string;
  icon: LucideIcon;
  heroGradient: string;
  primaryAction: { label: string; to: string };
  secondaryAction?: { label: string; to: string };
  stats: Array<[string, string]>;
  sections: DocSection[];
  visuals?: DocVisual[];
};

const faqCards: DocCard[] = [
  {
    icon: HelpCircle,
    title: 'O que é o SIX3?',
    description: 'Uma plataforma para operadores de Photo Booth 360 criarem eventos, gravarem ou enviarem vídeos, aplicarem template, efeito, música e duração, e entregarem resultado com link e QR Code.',
  },
  {
    icon: Smartphone,
    title: 'Preciso instalar aplicativo?',
    description: 'Não necessariamente. O SIX3 funciona pelo navegador e pode ser salvo como atalho/PWA quando disponível.',
  },
  {
    icon: Smartphone,
    title: 'Funciona no celular e no iPhone?',
    description: 'Sim. O produto é mobile-first. No iPhone, o uso deve ser testado no Safari real do evento, principalmente câmera, áudio e renderização.',
  },
  {
    icon: UploadCloud,
    title: 'Preciso de internet?',
    description: 'Sim para login, pagamento, upload, publicação, QR Code, suporte e métricas. O app instalado mantém uma base offline para reduzir atrito em campo.',
  },
  {
    icon: QrCode,
    title: 'O que é um evento?',
    description: 'É uma área organizada para festa, casamento, formatura, ativação ou ação corporativa, com vídeos, galeria, QR Code e leads.',
  },
  {
    icon: FileText,
    title: 'Posso fazer vídeo avulso?',
    description: 'Sim. O fluxo recomendado permite criar evento ou publicar um vídeo avulso quando o operador precisa entregar rápido.',
  },
  {
    icon: Layers,
    title: 'Posso usar minha própria marca?',
    description: 'Sim, nos planos que liberam upload de templates personalizados e identidade visual própria.',
  },
  {
    icon: Music2,
    title: 'Posso usar música famosa?',
    description: 'Somente com licença. A orientação do kit é priorizar músicas próprias, livres, royalty-free ou licenciadas.',
  },
  {
    icon: AlertTriangle,
    title: 'O vídeo pode ficar preto?',
    description: 'Pode acontecer por incompatibilidade de navegador/formato, efeito pesado ou falha de render. O suporte deve orientar teste sem efeito, duração menor e outro navegador.',
  },
  {
    icon: CreditCard,
    title: 'Quanto custa?',
    description: 'Essencial R$ 69,99/mês, Profissional R$ 129,99/mês e Ilimitado R$ 199,99/mês.',
  },
  {
    icon: LifeBuoy,
    title: 'Tem suporte?',
    description: 'Sim. Há suporte dentro do app e suporte anônimo para problemas de login.',
  },
];

const legalClauses: DocCard[] = [
  { title: '1. O que é o SIX3', description: 'Plataforma online para operadores de Photo Booth 360 e empresas de eventos criarem, editarem, organizarem e compartilharem vídeos 360.' },
  { title: '2. Quem pode usar', description: 'O usuário deve ter capacidade legal para contratar serviços online. Se usar por empresa, declara ter autorização para representá-la.' },
  { title: '3. Conta do usuário', description: 'O usuário é responsável por dados verdadeiros, senha segura, não compartilhar acesso indevidamente e avisar o suporte sobre acessos suspeitos.' },
  { title: '4. Planos e pagamento', description: 'A assinatura é mensal em reais. Pagamentos são processados via Pix por provedor externo, com confirmação automática no backend.' },
  { title: '5. Renovação e acesso', description: 'Enquanto a assinatura estiver ativa, os recursos do plano ficam liberados. Falha, vencimento ou cancelamento podem bloquear novos recursos pagos.' },
  { title: '6. Cancelamento', description: 'O cancelamento pode ser solicitado pelo painel ou suporte. Em contratação online, pode haver direito de arrependimento em até 7 dias conforme lei aplicável.' },
  { title: '7. Uso permitido', description: 'Eventos, festas, casamentos, formaturas, ativações, conteúdo autorizado, entrega de vídeos para clientes e captação de leads com consentimento.' },
  { title: '8. Uso proibido', description: 'Conteúdo ilegal, ofensivo, discriminatório ou violento; uso de imagem, música, marca ou material sem direito; tentativa de invadir, copiar ou burlar o sistema.' },
  { title: '9. Conteúdo enviado', description: 'O usuário é responsável por vídeos, templates, músicas, marcas, textos e imagens enviados, declarando ter autorização para usá-los.' },
  { title: '10. Músicas e direitos autorais', description: 'Não é recomendado usar músicas comerciais famosas sem licença. Use músicas próprias, livres, royalty-free ou licenciadas.' },
  { title: '11. Imagem de convidados', description: 'Em eventos, o operador deve informar participantes sobre gravação, uso de imagem, publicação de vídeo e coleta de leads quando aplicável.' },
  { title: '12. Disponibilidade', description: 'Falhas podem ocorrer por internet, navegador, aparelho, serviços de terceiros, manutenção ou limitações técnicas.' },
  { title: '13. Propriedade intelectual', description: 'Marca, interface, códigos, textos, templates oficiais e estrutura pertencem ao SIX3 ou seus licenciadores.' },
  { title: '14. Dados e privacidade', description: 'O tratamento de dados segue a Política de Privacidade e é necessário para funcionamento da plataforma.' },
  { title: '15. Mudanças e contato', description: 'Os termos podem ser atualizados. Os canais oficiais são suporte dentro do app, e-mail e WhatsApp quando disponíveis.' },
];

const privacyClauses: DocCard[] = [
  { title: 'Dados de cadastro', description: 'Nome, e-mail, usuário, senha protegida e empresa quando informada.' },
  { title: 'Dados de uso', description: 'Eventos, vídeos, templates, músicas, QR Codes, visualizações, downloads, compartilhamentos e leads.' },
  { title: 'Dados técnicos', description: 'IP, navegador, dispositivo, sistema operacional, logs, data e hora.' },
  { title: 'Dados de pagamento', description: 'Status, plano, data, identificador da transação e dados não sensíveis do provedor externo.' },
  { title: 'Finalidades', description: 'Criar e proteger conta, liberar plano, processar pagamentos, permitir eventos e vídeos, publicar links, exibir métricas, organizar leads e prestar suporte.' },
  { title: 'Convidados e leads', description: 'O operador deve informar pessoas sobre coleta. O SIX3 fornece a ferramenta, mas o operador também é responsável pelo uso correto dos dados.' },
  { title: 'Vídeos e imagem', description: 'Vídeos podem conter imagem de convidados. O operador deve ter autorização do evento, contratante ou participantes quando necessário.' },
  { title: 'Fornecedores', description: 'Podem ser usados Firebase, Supabase, PixGo, Vercel, Render e ferramentas de suporte/monitoramento necessárias para operar o produto.' },
  { title: 'Retenção', description: 'Dados são mantidos enquanto necessário para serviço, obrigações legais, segurança, suporte ou resolução de disputas.' },
  { title: 'Direitos do titular', description: 'Acesso, correção, exclusão quando aplicável, informação sobre compartilhamento e revogação de consentimento quando aplicável.' },
  { title: 'Segurança', description: 'Autenticação, separação frontend/backend, secrets fora do cliente, controle de acesso, limites de upload, logs e regras de permissão.' },
  { title: 'Cookies e armazenamento local', description: 'Podem ser usados para manter sessão, salvar preferências, melhorar navegação, medir uso básico e proteger a conta.' },
];

const docs: Record<PublicDocsPageId, DocPage> = {
  faq: {
    kicker: 'Ajuda',
    title: 'FAQ, onboarding e suporte',
    lead: 'Perguntas comuns, roteiro do primeiro vídeo e procedimentos rápidos de atendimento baseados no kit do MVP vendável.',
    icon: HelpCircle,
    heroGradient: 'from-blue-500/20 via-violet-500/18 to-cyan-400/12',
    primaryAction: { label: 'Entrar em contato', to: '/suporte' },
    secondaryAction: { label: 'Criar conta', to: '/register' },
    stats: [
      ['12 passos', 'primeiro vídeo guiado'],
      ['11 dúvidas', 'respostas rápidas'],
      ['9 roteiros', 'problemas críticos'],
    ],
    sections: [
      {
        title: 'Perguntas comuns',
        description: 'Respostas que reduzem atrito antes do usuário abrir chamado.',
        cards: faqCards,
      },
      {
        title: 'Roteiro do primeiro vídeo',
        description: 'A regra de ouro do MVP é o usuário publicar o primeiro vídeo sem ler documentação externa.',
        columns: ['Etapa', 'Tela', 'Objetivo'],
        rows: [
          ['1', 'Boas-vindas', 'Começar meu primeiro vídeo.'],
          ['2', 'Escolha o caminho', 'Criar evento ou vídeo avulso.'],
          ['3', 'Evento', 'Nome, data, tipo, capa/logo opcional e captura de leads.'],
          ['4', 'Vídeo', 'Gravar agora ou enviar vídeo pronto.'],
          ['5', 'Template', 'Filtrar por tema e escolher aparência.'],
          ['6', 'Efeito', 'Clean, glow, flash, VHS leve, luxo ou festa.'],
          ['7', 'Música', 'Biblioteca segura, sem música ou upload com direito de uso.'],
          ['8', 'Duração', '5s, 15s, 25s, 35s ou 45s.'],
          ['9', 'Preview', 'Conferir antes de renderizar.'],
          ['10', 'Render', 'Não fechar a tela.'],
          ['11', 'Publicação', 'Copiar link, baixar QR, ver vídeo e compartilhar.'],
          ['12', 'Métricas', 'Views, downloads, shares e leads.'],
        ],
      },
      {
        title: 'Roteiros rápidos de suporte',
        description: 'Procedimentos operacionais para o admin resolver problemas sem expor dados sensíveis.',
        columns: ['Problema', 'Roteiro de resolução'],
        rows: [
          ['Login', 'Confirmar usuário/e-mail, recuperar senha, testar aba anônima, limpar cache, outro navegador e verificar conta no admin.'],
          ['Pagamento', 'Confirmar cobrança Pix, e-mail do pagamento, status PixGo, webhook, plano no Firestore e liberação manual se comprovado.'],
          ['Upload', 'Verificar internet, tamanho/formato, MP4 menor, outra rede, desktop e limite do plano.'],
          ['Câmera', 'Permissão do navegador, HTTPS, câmera livre, Chrome/Android ou Safari/iOS atualizado.'],
          ['Vídeo preto', 'Testar preview original, render sem efeito/template, reduzir duração, trocar navegador e verificar codec.'],
          ['Template', 'Confirmar PNG/WebP/SVG/WebM, transparência, tamanho, proporção, plano e teste com template oficial.'],
          ['Música', 'Testar MP3, preview, biblioteca oficial, volume, bloqueio de áudio e direito de uso.'],
          ['QR Code', 'Testar link manualmente, vídeo/galeria ativo, regerar QR, outro celular e domínio.'],
          ['Assinatura', 'Conferir plano, vencimento, pagamento, cancelamento, upgrade/downgrade e webhook.'],
        ],
      },
    ],
  },
  termos: {
    kicker: 'Legal',
    title: 'Termos de Uso',
    lead: 'Modelo inicial em linguagem simples para uso do MVP brasileiro. O texto deve ser revisado juridicamente antes de venda em escala.',
    icon: Scale,
    heroGradient: 'from-slate-400/14 via-blue-500/18 to-violet-500/16',
    primaryAction: { label: 'Ver privacidade', to: '/privacidade' },
    secondaryAction: { label: 'Ver planos', to: '/plans' },
    stats: [
      ['15 tópicos', 'base contratual'],
      ['Mensal', 'assinatura em reais'],
      ['PixGo', 'pagamento Pix'],
    ],
    sections: [
      {
        title: 'Cláusulas principais',
        description: 'Resumo operacional dos termos enviados no kit.',
        cards: legalClauses,
      },
    ],
  },
  privacidade: {
    kicker: 'Legal',
    title: 'Política de Privacidade',
    lead: 'Modelo inicial para cadastro, vídeos, leads, pagamentos, suporte e analytics, com foco em operação do MVP.',
    icon: LockKeyhole,
    heroGradient: 'from-emerald-400/16 via-blue-500/16 to-violet-500/18',
    primaryAction: { label: 'Ver termos', to: '/termos' },
    secondaryAction: { label: 'Suporte', to: '/suporte' },
    stats: [
      ['LGPD', 'base para revisão'],
      ['Cookies', 'sessão e preferências'],
      ['Segurança', 'secrets fora do client'],
    ],
    sections: [
      {
        title: 'Como os dados são tratados',
        description: 'Resumo público do documento de privacidade enviado.',
        cards: privacyClauses,
      },
      {
        title: 'Cuidados com convidados e menores',
        items: [
          'O operador deve informar participantes sobre gravação, uso de imagem e coleta de leads quando aplicável.',
          'Em eventos com menores de idade, o operador ou contratante deve cuidar das autorizações necessárias.',
          'O SIX3 não é direcionado a crianças.',
        ],
      },
    ],
  },
  roadmap: {
    kicker: 'Operação',
    title: 'QA, riscos e plano de 30 dias',
    lead: 'Checklist prático para testar o fluxo principal, reduzir riscos críticos e decidir quando abrir mais vendas.',
    icon: Map,
    heroGradient: 'from-orange-400/14 via-violet-500/16 to-blue-500/16',
    primaryAction: { label: 'Ver materiais visuais', to: '/materiais' },
    secondaryAction: { label: 'Ver FAQ', to: '/faq' },
    stats: [
      ['3 telas', 'Android, iPhone e desktop'],
      ['8 riscos', 'mitigações prioritárias'],
      ['4 semanas', 'execução de 30 dias'],
    ],
    sections: [
      {
        title: 'Checklist QA mobile e desktop',
        columns: ['Área', 'Itens mínimos'],
        rows: [
          ['Android Chrome', 'Landing, cadastro, login, checkout, dashboard, evento, câmera, upload, preview, template, efeito, música, duração, render, link, QR, lead e métricas.'],
          ['iPhone Safari', 'Permissão de câmera, gravação, upload, preview, render, áudio, QR, bottom nav, teclado e modais sem corte.'],
          ['Desktop', 'Upload grande, editor, publicação, templates, leads, analytics, billing, settings, suporte e admin.'],
          ['Erros', 'Internet cai, arquivo inválido, sem câmera, pagamento recusado, assinatura vencida, música incompatível e render interrompido.'],
        ],
      },
      {
        title: 'Checklist legal/comercial',
        items: [
          'Publicar Termos de Uso e Política de Privacidade.',
          'Informar suporte e responsável comercial.',
          'Definir cancelamento e arrependimento.',
          'Avisar sobre músicas licenciadas e imagem de convidados.',
          'Criar aviso de captação de leads.',
          'Definir retenção de vídeos/dados.',
          'Revisar LGPD, cobrança e emissão fiscal.',
        ],
      },
      {
        title: 'Matriz de riscos resumida',
        columns: ['Risco', 'Impacto', 'Mitigação'],
        rows: [
          ['Vídeo preto', 'Alto', 'Testes por navegador, fallback sem efeito, validar formato e reduzir duração.'],
          ['Upload falhar', 'Alto', 'Barra de progresso, retry, limite de tamanho e orientação de internet.'],
          ['Render travar celular', 'Alto', 'Efeitos leves, duração recomendada e fallback desktop.'],
          ['Render server-side estourar', 'Alto', 'Manter render local ou criar worker/fila.'],
          ['Pagamento não liberar', 'Alto', 'Testar webhook, tela de status e liberação manual.'],
          ['Música sem licença', 'Alto', 'Avisos, biblioteca segura e termo de responsabilidade.'],
          ['Mobile ruim em evento', 'Alto', 'QA em aparelhos reais e UX mobile-first.'],
          ['Banco/storage permissivo', 'Alto', 'Revisar Firebase Rules e Supabase Policies.'],
        ],
      },
      {
        title: 'Plano de 30 dias',
        columns: ['Período', 'Foco', 'Entregas'],
        rows: [
          ['Semana 1', 'Preparar venda e segurança', 'Landing, termos, privacidade, checkout, teste em desktop/Android/iPhone e 10 templates fortes.'],
          ['Semana 2', 'Material comercial e captação', 'Demo 60s, prints, QR demo, lista de 100 operadores, DMs e grupos.'],
          ['Semana 3', 'Validação com operadores reais', 'Onboarding individual, correções críticas, evento simulado, templates pedidos e depoimento.'],
          ['Semana 4', 'Converter e estabilizar', 'Follow-up, case real, 3-5 novos clientes, análise de métricas e decisão de escala.'],
        ],
      },
      {
        title: 'Critério para abrir mais vendas',
        items: [
          'Fluxo principal aprovado em Android, iPhone e desktop.',
          'QR Code abrindo em outro celular.',
          'Pagamento liberando plano.',
          'Nenhum bug crítico no primeiro vídeo.',
          '2 depoimentos ou feedbacks positivos.',
        ],
      },
    ],
    visuals: [
      {
        src: '/docs/matriz-riscos.png',
        title: 'Matriz visual de riscos',
        description: 'Mapa de impacto e probabilidade com mitigações prioritárias.',
      },
    ],
  },
  materiais: {
    kicker: 'Materiais',
    title: 'Pranchas visuais do MVP',
    lead: 'Fluxo do primeiro vídeo e matriz de riscos para apresentação, parceiros e operação interna.',
    icon: ImageIcon,
    heroGradient: 'from-blue-500/18 via-violet-500/18 to-cyan-400/12',
    primaryAction: { label: 'Ver roadmap', to: '/roadmap' },
    secondaryAction: { label: 'Ver FAQ', to: '/faq' },
    stats: [
      ['2 pranchas', 'materiais visuais'],
      ['Fluxo', 'primeiro vídeo'],
      ['Matriz', 'riscos principais'],
    ],
    sections: [
      {
        title: 'Como usar os materiais',
        cards: [
          {
            icon: Target,
            title: 'Apresentação comercial',
            description: 'Use o fluxo do primeiro vídeo para explicar o produto sem depender de documentação extensa.',
          },
          {
            icon: ShieldCheck,
            title: 'Operação interna',
            description: 'Use roadmap e matriz de riscos para priorizar QA, segurança e correções antes de escalar.',
          },
          {
            icon: Users,
            title: 'Parceiros',
            description: 'Envie as pranchas para parceiros entenderem o público, a dor, a promessa e o ciclo de entrega.',
          },
        ],
      },
    ],
    visuals: [
      {
        src: '/docs/fluxo-primeiro-video.png',
        title: 'Fluxo do primeiro vídeo',
        description: 'Passo a passo do primeiro vídeo, de criar conta até ver métricas.',
      },
      {
        src: '/docs/matriz-riscos.png',
        title: 'Matriz visual de riscos',
        description: 'Riscos críticos e mitigações prioritárias para o MVP.',
      },
    ],
  },
};

function PublicHeader() {
  const navigate = useNavigate();

  return (
    <header className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4 px-4 py-5 sm:px-6 lg:px-8">
      <button type="button" onClick={() => navigate('/')} className="inline-flex min-w-0" aria-label="Voltar para inicio">
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

function SectionTable({ columns = [], rows = [] }: { columns?: string[]; rows?: string[][] }) {
  const columnStyle = {
    '--doc-cols': `repeat(${Math.max(columns.length, 1)}, minmax(0, 1fr))`,
  } as CSSProperties;

  return (
    <div className="overflow-hidden rounded-2xl border border-white/10">
      {columns.length > 0 && (
        <div className="hidden border-b border-white/10 bg-white/[0.045] sm:grid sm:[grid-template-columns:var(--doc-cols)]" style={columnStyle}>
          {columns.map((column) => (
            <div key={column} className="px-4 py-3 font-mono text-[11px] font-bold uppercase tracking-[0.12em] text-white/45">
              {column}
            </div>
          ))}
        </div>
      )}
      <div className="divide-y divide-white/10">
        {rows.map((row, rowIndex) => (
          <div key={`${row[0]}-${rowIndex}`} className="grid grid-cols-1 gap-3 p-4 sm:gap-0 sm:[grid-template-columns:var(--doc-cols)]" style={columnStyle}>
            {row.map((cell, cellIndex) => (
              <div key={`${cell}-${cellIndex}`} className="min-w-0 pr-4 text-sm leading-relaxed text-white/64">
                {columns[cellIndex] && <p className="mb-1 font-mono text-[10px] font-bold uppercase tracking-[0.1em] text-white/30 sm:hidden">{columns[cellIndex]}</p>}
                <span className={cellIndex === 0 ? 'font-bold text-white/82' : ''}>{cell}</span>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

function DocCardGrid({ cards }: { cards: DocCard[] }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {cards.map((card, index) => {
        const Icon = card.icon;
        return (
          <RevealOnScroll key={card.title} delay={(index % 3) * 0.035}>
            <GlassCard className="h-full p-5">
              {Icon && (
                <div className="mb-4 grid h-11 w-11 place-items-center rounded-2xl border border-white/10 bg-white/[0.055] text-brand-200">
                  <Icon className="h-5 w-5" />
                </div>
              )}
              <h3 className="text-base font-black text-white">{card.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-white/58">{card.description}</p>
              {card.items && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {card.items.map((item) => (
                    <span key={item} className="rounded-full border border-white/10 bg-white/[0.055] px-3 py-1 text-xs font-bold text-white/60">
                      {item}
                    </span>
                  ))}
                </div>
              )}
            </GlassCard>
          </RevealOnScroll>
        );
      })}
    </div>
  );
}

function DocSectionView({ section }: { section: DocSection }) {
  return (
    <section className="py-7">
      <div className="mb-5 max-w-3xl">
        <h2 className="text-2xl font-black tracking-normal text-white sm:text-3xl">{section.title}</h2>
        {section.description && <p className="mt-2 text-sm leading-relaxed text-white/55 sm:text-base">{section.description}</p>}
      </div>
      {section.cards && <DocCardGrid cards={section.cards} />}
      {section.rows && <SectionTable columns={section.columns} rows={section.rows} />}
      {section.items && (
        <GlassCard className="p-5 sm:p-6">
          <ul className="grid gap-3 sm:grid-cols-2">
            {section.items.map((item) => (
              <li key={item} className="flex gap-3 text-sm leading-relaxed text-white/66">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </GlassCard>
      )}
    </section>
  );
}

function VisualGallery({ visuals }: { visuals: DocVisual[] }) {
  return (
    <section className="py-7">
      <div className="mb-5 max-w-3xl">
        <h2 className="text-2xl font-black tracking-normal text-white sm:text-3xl">Materiais visuais</h2>
        <p className="mt-2 text-sm leading-relaxed text-white/55 sm:text-base">Imagens copiadas para o projeto e servidas pelo frontend.</p>
      </div>
      <div className="grid gap-5 lg:grid-cols-2">
        {visuals.map((visual) => (
          <GlassCard key={visual.src} className="overflow-hidden">
            <div className="border-b border-white/10 bg-white/[0.035] p-4">
              <h3 className="font-black text-white">{visual.title}</h3>
              <p className="mt-1 text-sm leading-relaxed text-white/52">{visual.description}</p>
            </div>
            <img src={visual.src} alt={visual.title} className="w-full bg-[#100b22] object-contain" loading="lazy" />
          </GlassCard>
        ))}
      </div>
    </section>
  );
}

export default function PublicDocsPage({ pageId }: { pageId: PublicDocsPageId }) {
  const navigate = useNavigate();
  const page = docs[pageId];
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
          Voltar para inicio
        </button>

        <section className={`relative overflow-hidden rounded-[30px] border border-white/10 bg-gradient-to-br ${page.heroGradient} px-5 py-10 shadow-[0_44px_130px_-80px_rgba(59,109,255,.8)] sm:px-8 sm:py-14 lg:px-10`}>
          <div className="absolute inset-0 bg-[radial-gradient(65%_95%_at_80%_8%,rgba(255,255,255,.14),transparent_62%)]" />
          <div className="relative grid gap-8 lg:grid-cols-[1fr_0.42fr] lg:items-end">
            <div>
              <span className="six3-kicker">{page.kicker}</span>
              <h1 className="mt-5 max-w-4xl text-[clamp(2.35rem,7vw,5rem)] font-black leading-[0.98] tracking-normal text-white">
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

        <div className="py-8">
          {page.sections.map((section) => (
            <DocSectionView key={section.title} section={section} />
          ))}
          {page.visuals && <VisualGallery visuals={page.visuals} />}
        </div>

        <section className="rounded-[30px] border border-brand-300/20 bg-gradient-to-br from-brand-500/16 via-white/[0.035] to-cyan-400/10 p-5 sm:p-7">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-2xl font-black text-white">Próximo passo</h2>
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-white/58">
                Use o fluxo principal para criar conta, escolher plano, publicar o primeiro vídeo e validar a entrega com QR Code.
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
