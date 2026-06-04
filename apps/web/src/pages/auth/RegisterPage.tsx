import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion } from 'framer-motion';
import { Mail, Lock, User } from 'lucide-react';
import { register as registerUser, parseFirebaseError } from '@/services/authService';
import { useAuthStore } from '@/store/authStore';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { toast } from '@/components/ui/Toast';
import { BrandWordmark } from '@/components/brand/BrandLogo';
import { MouseAura } from '@/components/landing/MouseAura';
import type { PlanId } from '@/config/plans';

const schema = z.object({
  name: z.string().min(2, 'Nome muito curto'),
  username: z.string()
    .min(3, 'Use pelo menos 3 caracteres')
    .max(32, 'Use até 32 caracteres')
    .regex(/^[a-z0-9](?:[a-z0-9._-]*[a-z0-9])?$/, 'Use letras, numeros, ponto, hifen ou underline'),
  password: z.string().min(6, 'Mínimo 6 caracteres'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, { message: 'Senhas não coincidem', path: ['confirmPassword'] });

type FormData = z.infer<typeof schema>;

function normalizeUsername(value: string) {
  return value.trim().toLowerCase().replace(/@six3\.com$/i, '');
}

function six3Email(username: string) {
  return `${normalizeUsername(username)}@six3.com`;
}

function selectedPlanFromSearch(value?: string | null): PlanId | null {
  return value === 'starter' || value === 'pro' || value === 'unlimited' ? value : null;
}

export default function RegisterPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const setUser = useAuthStore((state) => state.setUser);
  const selectedPlan = selectedPlanFromSearch(searchParams.get('plan'));
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({ resolver: zodResolver(schema) });
  const usernameField = register('username', { setValueAs: normalizeUsername });

  async function onSubmit(data: FormData) {
    try {
      const session = await registerUser(data.name, six3Email(data.username), data.password);
      setUser(session.user);
      toast.success('Conta criada com sucesso!');
      navigate(selectedPlan ? `/app/billing?plan=${selectedPlan}` : '/app/billing');
    } catch (error: any) {
      toast.error(parseFirebaseError(error.code));
    }
  }

  return (
    <div className="six3-grid-bg flex min-h-screen items-center justify-center bg-surface p-4">
      <MouseAura />
      <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} className="relative z-10 w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          <BrandWordmark className="text-4xl" />
          <div>
            <h1 className="text-xl font-black text-white">Criar conta</h1>
            <p className="mt-1 text-sm text-white/40">Cadastre-se e escolha um plano para liberar a plataforma</p>
          </div>
        </div>
        <div className="six3-glass p-6">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <Input label="Nome" placeholder="Seu nome" icon={<User className="h-4 w-4" />} error={errors.name?.message} {...register('name')} />
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-white/70">Nome de usuário</label>
              <div className={`flex items-center rounded-[18px] border bg-white/[0.055] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] backdrop-blur-md transition-all focus-within:border-brand-400/70 focus-within:ring-2 focus-within:ring-brand-500/20 ${
                errors.username ? 'border-red-500/60' : 'border-white/10'
              }`}>
                <div className="pl-3 text-white/40">
                  <Mail className="h-4 w-4" />
                </div>
                <input
                  type="text"
                  placeholder="seuusuario"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  autoComplete="username"
                  className="min-w-0 flex-1 bg-transparent px-3 py-3 text-white placeholder-white/30 outline-none"
                  {...usernameField}
                  onBlur={(event) => {
                    event.currentTarget.value = normalizeUsername(event.currentTarget.value);
                    usernameField.onBlur(event);
                  }}
                />
                <span className="shrink-0 border-l border-white/10 px-3 text-sm font-semibold text-white/42">@six3.com</span>
              </div>
              {errors.username && <p className="text-xs text-red-400">{errors.username.message}</p>}
            </div>
            <Input label="Senha" type="password" placeholder="••••••••" icon={<Lock className="h-4 w-4" />} error={errors.password?.message} {...register('password')} />
            <Input label="Confirmar senha" type="password" placeholder="••••••••" icon={<Lock className="h-4 w-4" />} error={errors.confirmPassword?.message} {...register('confirmPassword')} />
            <Button type="submit" loading={isSubmitting} className="w-full justify-center" size="lg">
              Começar a jornada
            </Button>
          </form>
          <p className="mt-4 text-center text-sm text-white/40">
            Já tem conta? <Link to="/login" className="font-medium text-brand-400 hover:text-brand-300">Entrar</Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
}
