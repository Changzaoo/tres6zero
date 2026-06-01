import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion } from 'framer-motion';
import { Mail, Lock, Eye, EyeOff } from 'lucide-react';
import { login } from '@/services/authService';
import { parseFirebaseError } from '@/services/authService';
import { useAuthStore } from '@/store/authStore';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { toast } from '@/components/ui/Toast';
import { BrandLogo } from '@/components/brand/BrandLogo';

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
    } catch (e: any) {
      toast.error(parseFirebaseError(e.code));
    }
  }

  return (
    <div className="six3-grid-bg min-h-screen bg-surface flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm relative z-10">

        <div className="text-center mb-8">
          <BrandLogo className="items-center" wordmarkClassName="text-4xl" showSubtitle />
        </div>

        <div className="bg-gradient-glass backdrop-blur-xl border border-white/[0.08] rounded-[24px] p-6 shadow-glass">
          <h2 className="text-lg font-semibold text-white mb-6">Entrar na conta</h2>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <Input label="E-mail" type="email" placeholder="seu@email.com" icon={<Mail className="w-4 h-4" />}
              error={errors.email?.message} {...register('email')} />
            <div className="relative">
              <Input label="Senha" type={showPass ? 'text' : 'password'} placeholder="••••••••"
                icon={<Lock className="w-4 h-4" />} error={errors.password?.message} {...register('password')} />
              <button type="button" onClick={() => setShowPass(!showPass)}
                className="absolute right-3 top-9 text-white/30 hover:text-white/60">
                {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            <div className="flex justify-end">
              <Link to="/forgot-password" className="text-xs text-brand-400 hover:text-brand-300">Esqueci a senha</Link>
            </div>

            <Button type="submit" loading={isSubmitting} className="w-full justify-center" size="lg">
              Entrar
            </Button>
          </form>

          <p className="text-center text-sm text-white/40 mt-4">
            Não tem conta?{' '}
            <Link to="/register" className="text-brand-300 hover:text-white font-medium">Começar a jornada</Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
}
