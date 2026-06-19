import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Gift, User, AtSign, Lock, Mail, Phone, Building2, Sparkles, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { toast } from '@/components/ui/Toast';
import { useAuthStore } from '@/store/authStore';
import { requestTrial } from '@/services/trialService';
import { parseFirebaseError } from '@/services/authService';

const USE_TYPES = [
  'Festas e aniversários',
  'Casamentos',
  'Eventos corporativos',
  'Formaturas',
  'Loja / ativação de marca',
  'Igreja / cerimônias',
  'Outro',
];

function normalizeUsername(value: string) {
  return value.trim().toLowerCase().replace(/@six3\.com$/i, '').replace(/[^a-z0-9._-]/g, '');
}

export function TrialModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const navigate = useNavigate();
  const setUser = useAuthStore((state) => state.setUser);
  const [submitting, setSubmitting] = useState(false);

  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [useType, setUseType] = useState(USE_TYPES[0]);
  const [description, setDescription] = useState('');

  if (!open) return null;

  function validate(): string | null {
    if (name.trim().length < 2) return 'Informe seu nome.';
    if (normalizeUsername(username).length < 3) return 'Escolha um usuário com pelo menos 3 caracteres.';
    if (password.length < 6) return 'A senha precisa ter pelo menos 6 caracteres.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail.trim())) return 'Informe um email de contato válido.';
    if (phone.trim().length < 6) return 'Informe um telefone/WhatsApp válido.';
    return null;
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (submitting) return;
    const error = validate();
    if (error) {
      toast.error(error);
      return;
    }

    setSubmitting(true);
    try {
      const session = await requestTrial({
        name: name.trim(),
        username: normalizeUsername(username),
        password,
        contactEmail: contactEmail.trim(),
        phone: phone.trim(),
        businessName: businessName.trim(),
        useType,
        description: description.trim(),
      });
      setUser(session.user);
      toast.success('Teste de 3 dias ativado! Bem-vindo ao SIX3.');
      navigate('/app/dashboard');
    } catch (err) {
      const code = err instanceof Error ? err.message : 'TRIAL_FAILED';
      toast.error(code === 'EMAIL_EXISTS' ? 'Esse usuário já existe. Tente outro.' : parseFirebaseError(code));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[120] flex items-start justify-center overflow-y-auto bg-black/70 p-4 backdrop-blur-sm sm:items-center">
      <div className="relative my-auto w-full max-w-lg overflow-hidden rounded-3xl border border-white/[0.1] bg-[#0a0d14] shadow-[0_40px_120px_rgba(0,0,0,0.6)]">
        <button
          type="button"
          onClick={onClose}
          aria-label="Fechar"
          className="absolute right-4 top-4 z-10 flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/[0.05] text-white/60 transition hover:bg-white/10 hover:text-white"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="border-b border-white/[0.06] bg-gradient-to-br from-brand-600/20 to-fuchsia-500/10 px-6 py-5">
          <div className="flex items-center gap-2 text-brand-100">
            <Gift className="h-5 w-5" />
            <span className="text-xs font-bold uppercase tracking-[0.16em]">3 dias grátis</span>
          </div>
          <h2 className="mt-2 text-xl font-black text-white">Comece seu teste agora</h2>
          <p className="mt-1 text-sm text-white/55">Aprovação imediata — você já sai usando a plataforma completa.</p>
        </div>

        <form onSubmit={handleSubmit} className="max-h-[70vh] space-y-3 overflow-y-auto px-6 py-5">
          <Input label="Nome" placeholder="Seu nome" icon={<User className="h-4 w-4" />} value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />

          <div>
            <Input
              label="Usuário (login)"
              placeholder="seu.usuario"
              icon={<AtSign className="h-4 w-4" />}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
            />
            <p className="mt-1 text-[11px] text-white/35">Seu login será <span className="font-semibold text-white/55">{normalizeUsername(username) || 'usuario'}@six3.com</span></p>
          </div>

          <Input label="Senha" type="password" placeholder="••••••••" icon={<Lock className="h-4 w-4" />} value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" />
          <Input label="Email de contato" type="email" placeholder="voce@email.com" icon={<Mail className="h-4 w-4" />} value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} autoComplete="email" />
          <Input label="Telefone / WhatsApp" placeholder="(00) 90000-0000" icon={<Phone className="h-4 w-4" />} value={phone} onChange={(e) => setPhone(e.target.value)} autoComplete="tel" />
          <Input label="Empresa / Negócio" placeholder="Nome do seu negócio (opcional)" icon={<Building2 className="h-4 w-4" />} value={businessName} onChange={(e) => setBusinessName(e.target.value)} />

          <div className="space-y-1">
            <label className="text-sm font-medium text-white/70">Tipo de uso</label>
            <select
              value={useType}
              onChange={(e) => setUseType(e.target.value)}
              className="w-full rounded-[18px] border border-white/10 bg-white/[0.055] px-4 py-3 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] backdrop-blur-md transition-all focus:border-brand-400/70 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
            >
              {USE_TYPES.map((option) => (
                <option key={option} value={option} className="bg-[#0a0d14]">{option}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium text-white/70">Conte um pouco sobre seu uso</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              maxLength={1000}
              placeholder="Ex.: faço festas infantis e quero vídeos 360 para os convidados."
              className="w-full resize-none rounded-[18px] border border-white/10 bg-white/[0.055] px-4 py-3 text-white placeholder-white/30 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] backdrop-blur-md transition-all focus:border-brand-400/70 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
            />
          </div>

          <Button type="submit" size="lg" loading={submitting} className="mt-2 w-full justify-center" icon={<Sparkles className="h-4 w-4" />}>
            Ativar 3 dias grátis
          </Button>
          <p className="text-center text-[11px] text-white/35">Sem cartão de crédito. Você poderá escolher um plano depois.</p>
        </form>
      </div>
    </div>
  );
}
