import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion } from 'framer-motion';
import { Mail } from 'lucide-react';
import { resetPassword } from '@/services/authService';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { toast } from '@/components/ui/Toast';

const schema = z.object({ email: z.string().email('E-mail inválido') });
type FormData = z.infer<typeof schema>;

export default function ForgotPasswordPage() {
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({ resolver: zodResolver(schema) });

  async function onSubmit(data: FormData) {
    try {
      await resetPassword(data.email);
      toast.success('E-mail de recuperação enviado! Verifique sua caixa de entrada.');
    } catch {
      toast.error('Erro ao enviar e-mail. Verifique o endereço.');
    }
  }

  return (
    <div className="min-h-screen bg-surface flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-white">Recuperar senha</h1>
          <p className="text-white/40 text-sm mt-1">Enviaremos um link para seu e-mail</p>
        </div>
        <div className="bg-gradient-glass border border-white/8 rounded-2xl p-6">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <Input label="E-mail" type="email" placeholder="seu@email.com" icon={<Mail className="w-4 h-4" />} error={errors.email?.message} {...register('email')} />
            <Button type="submit" loading={isSubmitting} className="w-full justify-center" size="lg">Enviar link</Button>
          </form>
          <p className="text-center text-sm text-white/40 mt-4">
            <Link to="/login" className="text-brand-400 hover:text-brand-300">Voltar ao login</Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
}
