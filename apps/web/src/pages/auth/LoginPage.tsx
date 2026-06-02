import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion } from 'framer-motion';
import { Mail, Lock, Eye, EyeOff } from 'lucide-react';
import { login, parseFirebaseError } from '@/services/authService';
import { useAuthStore } from '@/store/authStore';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { toast } from '@/components/ui/Toast';
import { BrandLogo } from '@/components/brand/BrandLogo';
import { MouseAura } from '@/components/landing/MouseAura';

const schema = z.object({
  email: z.string().email('E-mail inválido'),
  password: z.string().min(6, 'Mínimo 6 caracteres'),
});
type FormData = z.infer<typeof schema>;

export default function LoginPage() {
  const navigate = useNavigate();
  const [showPass, setShowPass] = useState(false);
  const setUser = useAuthStore((state) => state.setUser);
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({ resolver: zodResolver(schema) });

  async function onSubmit(data: FormData) {
    try {
      const session = await login(data.email, data.password);
      setUser(session.user);
      navigate(session.user.subscriptionStatus === 'active' ? '/app/dashboard' : '/app/billing');
    } catch (error: any) {
      toast.error(parseFirebaseError(error.code));
    }
  }

  return (
    <div className="six3-grid-bg flex min-h-screen items-center justify-center bg-surface p-4">
      <MouseAura />
      <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} className="relative z-10 w-full max-w-sm">
        <div className="mb-8 text-center">
          <BrandLogo className="items-center" wordmarkClassName="text-4xl" showSubtitle />
        </div>

        <div className="six3-glass p-6">
          <h2 className="mb-6 text-lg font-semibold text-white">Entrar na conta</h2>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <Input label="E-mail" type="email" placeholder="seu@email.com" icon={<Mail className="h-4 w-4" />} error={errors.email?.message} {...register('email')} />
            <div className="relative">
              <Input label="Senha" type={showPass ? 'text' : 'password'} placeholder="••••••••" icon={<Lock className="h-4 w-4" />} error={errors.password?.message} {...register('password')} />
              <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3 top-9 text-white/30 hover:text-white/60">
                {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>

            <div className="flex justify-end">
              <Link to="/forgot-password" className="text-xs text-brand-400 hover:text-brand-300">Esqueci a senha</Link>
            </div>

            <Button type="submit" loading={isSubmitting} className="w-full justify-center" size="lg">
              Entrar
            </Button>
          </form>

          <p className="mt-4 text-center text-sm text-white/40">
            Não tem conta?{' '}
            <Link to="/register" className="font-medium text-brand-300 hover:text-white">Começar a jornada</Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
}
