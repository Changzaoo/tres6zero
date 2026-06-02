import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion } from 'framer-motion';
import { ArrowLeft, CheckCircle2, KeyRound, LifeBuoy, ShieldCheck, UserSearch } from 'lucide-react';
import {
  getPasswordRecoveryOptions,
  setRecoveredPassword,
  verifyPasswordRecoveryOption,
  type PasswordRecoveryOptionsResponse,
} from '@/services/authService';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { toast } from '@/components/ui/Toast';
import { BrandWordmark } from '@/components/brand/BrandLogo';
import { MouseAura } from '@/components/landing/MouseAura';

const identifySchema = z.object({
  identifier: z.string().min(3, 'Informe seu usuario ou e-mail'),
});

const passwordSchema = z.object({
  newPassword: z.string().min(8, 'Use pelo menos 8 caracteres'),
  confirmPassword: z.string(),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: 'As senhas nao coincidem',
  path: ['confirmPassword'],
});

type IdentifyData = z.infer<typeof identifySchema>;
type PasswordData = z.infer<typeof passwordSchema>;
type RecoveryStep = 'identify' | 'challenge' | 'password' | 'support';

function normalizeIdentifier(value: string) {
  const normalized = value.trim().toLowerCase();
  return normalized.includes('@') ? normalized : `${normalized}@six3.com`;
}

function recoveryErrorMessage(code?: string) {
  if (code === 'RECOVERY_OPTION_MISMATCH') return 'Essa informacao nao confere. Confira com calma e tente novamente.';
  if (code === 'RECOVERY_EXPIRED') return 'Essa verificacao expirou. Comece novamente para proteger sua conta.';
  if (code === 'TOO_MANY_ATTEMPTS_TRY_LATER') return 'Muitas tentativas. Aguarde alguns minutos antes de tentar de novo.';
  return 'Nao foi possivel concluir a recuperacao agora.';
}

export default function ForgotPasswordPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState<RecoveryStep>('identify');
  const [challenge, setChallenge] = useState<PasswordRecoveryOptionsResponse | null>(null);
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>({});
  const [resetToken, setResetToken] = useState('');
  const [verifying, setVerifying] = useState(false);

  const identifyForm = useForm<IdentifyData>({ resolver: zodResolver(identifySchema) });
  const passwordForm = useForm<PasswordData>({ resolver: zodResolver(passwordSchema) });

  async function onIdentify(data: IdentifyData) {
    try {
      const response = await getPasswordRecoveryOptions(normalizeIdentifier(data.identifier));
      setChallenge(response);
      setSelectedOptions({});
      setResetToken('');
      setStep('challenge');
    } catch (error: any) {
      toast.error(recoveryErrorMessage(error.code));
    }
  }

  async function onVerify() {
    if (!challenge || challenge.challenges.some((item) => !selectedOptions[item.id])) {
      toast.error('Escolha uma opcao em todas as verificacoes.');
      return;
    }

    try {
      setVerifying(true);
      const response = await verifyPasswordRecoveryOption(challenge.challengeId, selectedOptions);

      if (response.mode === 'password' && response.resetToken) {
        setResetToken(response.resetToken);
        setStep('password');
        toast.success('Identidade confirmada. Defina sua nova senha.');
        return;
      }

      setStep('support');
      toast.success('Verificacao concluida.');
    } catch (error: any) {
      toast.error(recoveryErrorMessage(error.code));
    } finally {
      setVerifying(false);
    }
  }

  async function onPasswordSubmit(data: PasswordData) {
    if (!challenge || !resetToken) return;

    try {
      await setRecoveredPassword(challenge.challengeId, resetToken, data.newPassword);
      toast.success('Senha alterada com sucesso.');
      navigate('/login');
    } catch (error: any) {
      toast.error(recoveryErrorMessage(error.code));
    }
  }

  function restart() {
    setStep('identify');
    setChallenge(null);
    setSelectedOptions({});
    setResetToken('');
    identifyForm.reset();
    passwordForm.reset();
  }

  return (
    <div className="six3-grid-bg flex min-h-screen items-center justify-center bg-surface p-4">
      <MouseAura />
      <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} className="relative z-10 w-full max-w-md">
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          <BrandWordmark className="text-4xl" />
          <div>
            <h1 className="text-xl font-black text-white">Recuperar senha</h1>
            <p className="mt-1 text-sm text-white/40">Confirme uma informação da sua conta para continuar</p>
          </div>
        </div>

        <div className="six3-glass p-5 sm:p-6">
          {step === 'identify' && (
            <form onSubmit={identifyForm.handleSubmit(onIdentify)} className="space-y-4">
              <Input
                label="Usuario ou e-mail"
                placeholder="vinicius ou admin@six3.com"
                icon={<UserSearch className="h-4 w-4" />}
                autoCapitalize="none"
                autoCorrect="off"
                error={identifyForm.formState.errors.identifier?.message}
                {...identifyForm.register('identifier')}
              />
              <p className="text-xs leading-relaxed text-white/38">
                Se sua conta foi criada com usuario SIX3, digite apenas o nome antes de @six3.com.
              </p>
              <Button type="submit" loading={identifyForm.formState.isSubmitting} className="w-full justify-center" size="lg">
                Verificar identidade
              </Button>
            </form>
          )}

          {step === 'challenge' && challenge && (
            <div className="space-y-4">
              <div className="flex items-start gap-3 rounded-2xl border border-brand-400/25 bg-brand-500/10 p-3">
                <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-brand-200" />
                <div>
                  <h2 className="text-sm font-bold text-white">Confirme as informacoes reconhecidas</h2>
                  <p className="mt-1 text-xs leading-relaxed text-white/45">
                    Escolha uma opcao em cada verificacao. Os dados reais continuam censurados.
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                {challenge.challenges.map((item, index) => (
                  <div key={item.id} className="rounded-2xl border border-white/10 bg-white/[0.035] p-3">
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <span className="text-xs font-medium uppercase tracking-[0.14em] text-white/35">Verificacao {index + 1}</span>
                      <span className="truncate text-sm font-bold text-white">{item.label}</span>
                    </div>
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                      {item.options.map((option) => {
                        const selected = selectedOptions[item.id] === option.id;
                        return (
                          <button
                            key={option.id}
                            type="button"
                            onClick={() => setSelectedOptions((current) => ({ ...current, [item.id]: option.id }))}
                            className={`min-h-11 rounded-xl border px-3 py-2 text-left text-sm font-bold transition-all ${
                              selected
                                ? 'border-brand-300 bg-brand-500/18 text-white shadow-[0_18px_48px_-30px_rgba(124,92,255,0.95)]'
                                : 'border-white/10 bg-white/[0.045] text-white/72 hover:border-white/20 hover:bg-white/[0.075]'
                            }`}
                          >
                            {option.value}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex flex-col gap-2 sm:flex-row">
                <Button type="button" variant="secondary" onClick={restart} className="sm:w-auto" icon={<ArrowLeft className="h-4 w-4" />}>
                  Voltar
                </Button>
                <Button type="button" loading={verifying} onClick={onVerify} className="flex-1 justify-center" icon={<ShieldCheck className="h-4 w-4" />}>
                  Confirmar
                </Button>
              </div>
            </div>
          )}

          {step === 'password' && (
            <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)} className="space-y-4">
              <div className="flex items-start gap-3 rounded-2xl border border-emerald-400/25 bg-emerald-500/10 p-3">
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-300" />
                <div>
                  <h2 className="text-sm font-bold text-white">Identidade confirmada</h2>
                  <p className="mt-1 text-xs leading-relaxed text-white/45">Defina uma nova senha para entrar de novo.</p>
                </div>
              </div>
              <Input
                label="Nova senha"
                type="password"
                autoComplete="new-password"
                placeholder="********"
                icon={<KeyRound className="h-4 w-4" />}
                error={passwordForm.formState.errors.newPassword?.message}
                {...passwordForm.register('newPassword')}
              />
              <Input
                label="Confirmar nova senha"
                type="password"
                autoComplete="new-password"
                placeholder="********"
                icon={<KeyRound className="h-4 w-4" />}
                error={passwordForm.formState.errors.confirmPassword?.message}
                {...passwordForm.register('confirmPassword')}
              />
              <Button type="submit" loading={passwordForm.formState.isSubmitting} className="w-full justify-center" size="lg">
                Alterar senha
              </Button>
            </form>
          )}

          {step === 'support' && (
            <div className="space-y-4 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-brand-300/25 bg-brand-500/15">
                <LifeBuoy className="h-6 w-6 text-brand-200" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">Verificacao concluida</h2>
                <p className="mt-2 text-sm leading-relaxed text-white/45">
                  Essa recuperacao precisa do suporte. Abra o atendimento no login para o admin confirmar o caso sem revelar seus dados.
                </p>
              </div>
              <Button type="button" onClick={() => navigate('/login')} className="w-full justify-center" size="lg">
                Voltar ao login
              </Button>
            </div>
          )}

          <p className="mt-5 text-center text-sm text-white/40">
            <Link to="/login" className="font-medium text-brand-400 hover:text-brand-300">Entrar na conta</Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
}
