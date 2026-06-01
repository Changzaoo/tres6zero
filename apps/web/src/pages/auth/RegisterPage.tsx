import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
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
import { BrandLogo } from '@/components/brand/BrandLogo';

const schema = z.object({
  name: z.string().min(2, 'Nome muito curto'),
  email: z.string().email('E-mail inválido'),
  password: z.string().min(6, 'Mínimo 6 caracteres'),
  confirmPassword: z.string(),
}).refine(d => d.password === d.confirmPassword, { message: 'Senhas não coincidem', path: ['confirmPassword'] });

type FormData = z.infer<typeof schema>;

export default function RegisterPage() {
  const navigate = useNavigate();
  const setUser = useAuthStore((state) => state.setUser);
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({ resolver: zodResolver(schema) });

  async function onSubmit(data: FormData) {
    try {
      const session = await registerUser(data.name, data.email, data.password);
      setUser(session.user);
      toast.success('Conta criada com sucesso!');
      navigate('/app/billing');
    } catch (e: any) {
      toast.error(parseFirebaseError(e.code));
    }
  }

  return (
    <div className="six3-grid-bg min-h-screen bg-surface flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-sm relative z-10">
        <div className="text-center mb-8">
          <BrandLogo className="items-center mb-4" wordmarkClassName="text-4xl" />
          <h1 className="text-2xl font-bold text-white">Criar conta</h1>
          <p className="text-white/40 text-sm">Cadastre-se e escolha um plano para liberar a plataforma</p>
        </div>
        <div className="bg-gradient-glass backdrop-blur-xl border border-white/[0.08] rounded-[24px] p-6 shadow-glass">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <Input label="Nome" placeholder="Seu nome" icon={<User className="w-4 h-4" />} error={errors.name?.message} {...register('name')} />
            <Input label="E-mail" type="email" placeholder="seu@email.com" icon={<Mail className="w-4 h-4" />} error={errors.email?.message} {...register('email')} />
            <Input label="Senha" type="password" placeholder="••••••••" icon={<Lock className="w-4 h-4" />} error={errors.password?.message} {...register('password')} />
            <Input label="Confirmar senha" type="password" placeholder="••••••••" icon={<Lock className="w-4 h-4" />} error={errors.confirmPassword?.message} {...register('confirmPassword')} />
            <Button type="submit" loading={isSubmitting} className="w-full justify-center" size="lg">Começar a jornada</Button>
          </form>
          <p className="text-center text-sm text-white/40 mt-4">
            Já tem conta? <Link to="/login" className="text-brand-400 hover:text-brand-300 font-medium">Entrar</Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
}
