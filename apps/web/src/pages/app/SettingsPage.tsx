import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useAuth } from '@/hooks/useAuth';
import { useAuthStore } from '@/store/authStore';
import { updateUserProfile } from '@/services/authService';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { toast } from '@/components/ui/Toast';
import { User, Building } from 'lucide-react';

interface FormData {
  name: string;
  companyName: string;
}

export default function SettingsPage() {
  const { user } = useAuth();
  const setUser = useAuthStore((state) => state.setUser);
  const { register, handleSubmit, reset, formState: { isSubmitting } } = useForm<FormData>();

  useEffect(() => {
    if (user) reset({ name: user.name, companyName: user.companyName || '' });
  }, [user]);

  async function onSubmit(data: FormData) {
    if (!user) return;
    try {
      const updatedUser = await updateUserProfile(user.uid, data);
      setUser(updatedUser);
      toast.success('Perfil atualizado!');
    } catch { toast.error('Erro ao salvar.'); }
  }

  return (
    <div className="max-w-xl space-y-5">
      <h1 className="text-2xl font-bold text-white">Configurações</h1>

      <Card>
        <h2 className="text-base font-semibold text-white mb-4 flex items-center gap-2"><User className="w-5 h-5 text-brand-400" />Perfil</h2>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input label="Nome" placeholder="Seu nome" {...register('name')} />
          <Input label="Empresa" placeholder="Nome da empresa" icon={<Building className="w-4 h-4" />} {...register('companyName')} />
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-white/70">E-mail</label>
            <p className="text-sm text-white/40 bg-white/5 border border-white/8 rounded-xl px-4 py-2.5">{user?.email}</p>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-white/70">Função</label>
            <p className="text-sm text-white/40 bg-white/5 border border-white/8 rounded-xl px-4 py-2.5 capitalize">{user?.role}</p>
          </div>
          <Button type="submit" loading={isSubmitting}>Salvar perfil</Button>
        </form>
      </Card>
    </div>
  );
}
