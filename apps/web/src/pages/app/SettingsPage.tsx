import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useAuth } from '@/hooks/useAuth';
import { useAuthStore } from '@/store/authStore';
import { changePassword, parseFirebaseError, updateUserProfile } from '@/services/authService';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { toast } from '@/components/ui/Toast';
import { Building, KeyRound, ShieldCheck, Smartphone, User } from 'lucide-react';

interface ProfileFormData {
  name: string;
  companyName: string;
}

interface PasswordFormData {
  newPassword: string;
}

export default function SettingsPage() {
  const { user } = useAuth();
  const setUser = useAuthStore((state) => state.setUser);
  const profileForm = useForm<ProfileFormData>();
  const passwordForm = useForm<PasswordFormData>();

  useEffect(() => {
    if (user) profileForm.reset({ name: user.name, companyName: user.companyName || '' });
  }, [profileForm, user]);

  async function onProfileSubmit(data: ProfileFormData) {
    if (!user) return;
    try {
      const updatedUser = await updateUserProfile(user.uid, data);
      setUser(updatedUser);
      toast.success('Perfil atualizado!');
    } catch {
      toast.error('Erro ao salvar.');
    }
  }

  async function onPasswordSubmit(data: PasswordFormData) {
    try {
      const session = await changePassword(data.newPassword);
      setUser(session.user);
      passwordForm.reset({ newPassword: '' });
      toast.success('Senha alterada com segurança.');
    } catch (error) {
      toast.error(parseFirebaseError((error as { code?: string }).code));
    }
  }

  const devices = user?.trustedDevices || [];

  return (
    <div className="max-w-3xl space-y-5">
      <h1 className="text-2xl font-bold text-white">Configurações</h1>

      <Card>
        <h2 className="mb-4 flex items-center gap-2 text-base font-semibold text-white">
          <User className="h-5 w-5 text-brand-400" />
          Perfil
        </h2>
        <form onSubmit={profileForm.handleSubmit(onProfileSubmit)} className="space-y-4">
          <Input label="Nome" placeholder="Seu nome" {...profileForm.register('name')} />
          <Input
            label="Empresa"
            placeholder="Nome da empresa"
            icon={<Building className="h-4 w-4" />}
            {...profileForm.register('companyName')}
          />
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-white/70">E-mail</label>
            <p className="rounded-xl border border-white/[0.08] bg-white/5 px-4 py-2.5 text-sm text-white/40">{user?.email}</p>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-white/70">Função</label>
            <p className="rounded-xl border border-white/[0.08] bg-white/5 px-4 py-2.5 text-sm capitalize text-white/40">{user?.role}</p>
          </div>
          <Button type="submit" loading={profileForm.formState.isSubmitting}>Salvar perfil</Button>
        </form>
      </Card>

      <Card>
        <h2 className="mb-4 flex items-center gap-2 text-base font-semibold text-white">
          <KeyRound className="h-5 w-5 text-brand-400" />
          Senha
        </h2>
        <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)} className="space-y-4">
          <Input
            label="Nova senha"
            type="password"
            autoComplete="new-password"
            placeholder="Digite a nova senha"
            error={passwordForm.formState.errors.newPassword?.message}
            {...passwordForm.register('newPassword', {
              required: 'Digite a nova senha.',
              minLength: { value: 8, message: 'Use pelo menos 8 caracteres.' },
            })}
          />
          <Button type="submit" loading={passwordForm.formState.isSubmitting}>Alterar senha</Button>
        </form>
      </Card>

      <Card>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 text-base font-semibold text-white">
            <ShieldCheck className="h-5 w-5 text-brand-400" />
            Dispositivos
          </h2>
          <span className="rounded-full border border-white/10 bg-white/[0.055] px-3 py-1 text-xs font-semibold text-white/60">
            {devices.length}/2 registrados
          </span>
        </div>
        <div className="space-y-3">
          {devices.length === 0 ? (
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white/45">
              Nenhum dispositivo registrado ainda.
            </div>
          ) : devices.map((device) => (
            <div key={device.id} className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white/[0.06] text-white/55">
                <Smartphone className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="truncate text-sm font-semibold text-white">{device.name}</p>
                  {device.isCurrent && (
                    <span className="rounded-full bg-brand-500/15 px-2 py-0.5 text-[11px] font-semibold text-brand-200">Atual</span>
                  )}
                </div>
                <p className="text-xs text-white/40">
                  Último acesso: {new Date(device.lastSeenAt).toLocaleString('pt-BR')}
                </p>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
