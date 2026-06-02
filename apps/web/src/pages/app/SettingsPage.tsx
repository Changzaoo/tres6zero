import { useEffect, useState, type ChangeEvent, type ReactNode } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useAuthStore } from '@/store/authStore';
import { changePassword, disconnectAllDevices, disconnectDevice, parseFirebaseError, updateUserProfile } from '@/services/authService';
import { getStoredThemeMode, setThemeMode, type ThemeMode } from '@/services/themeService';
import { defaultOperatorPreferences, getOperatorPreferences, setOperatorPreferences, type OperatorPreferences } from '@/services/appPreferences';
import { mergeNotificationPreferences, notificationCategories, updateNotificationPreferences } from '@/services/notificationService';
import { uploadAvatarToServer } from '@/services/serverMediaService';
import { useNotificationStore } from '@/store/notificationStore';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { toast } from '@/components/ui/Toast';
import { BellRing, Building, Camera, Clock3, Globe2, KeyRound, LogOut, MapPin, Monitor, MonitorSmartphone, Moon, Palette, ShieldCheck, Sun, Trash2, User, Volume2, Wifi } from 'lucide-react';
import type { NotificationPreferences, TrustedDevice } from '@/types';

interface ProfileFormData {
  name: string;
  companyName: string;
  avatarUrl: string;
}

interface PasswordFormData {
  newPassword: string;
}

const durationOptions = [5, 15, 25, 35, 45] as const;

const musicOptions = [
  { value: 'none', label: 'Sem trilha' },
  { value: 'ambient', label: 'Ambient' },
  { value: 'party', label: 'Party' },
  { value: 'luxury', label: 'Luxury' },
  { value: 'wedding', label: 'Wedding' },
  { value: 'corporate', label: 'Corporate' },
  { value: 'birthday', label: 'Birthday' },
  { value: 'viral', label: 'Viral' },
] as const;

function formatDate(value?: string) {
  if (!value) return 'Sem registro';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Sem registro';
  return date.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
}

function DeviceRow({
  device,
  onDisconnect,
}: {
  device: TrustedDevice;
  onDisconnect: (device: TrustedDevice) => void;
}) {
  return (
    <div className="grid gap-3 rounded-[18px] border border-white/10 bg-white/[0.04] p-3 sm:grid-cols-[1fr_auto] sm:items-center">
      <div className="min-w-0 space-y-2">
        <div className="flex min-w-0 items-center gap-2">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-white/[0.06] text-white/55">
            <MonitorSmartphone className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <p className="truncate text-sm font-bold text-white">{device.name}</p>
              {device.isCurrent && (
                <span className="rounded-full bg-brand-500/15 px-2 py-0.5 text-[11px] font-bold text-brand-200">Atual</span>
              )}
            </div>
            <p className="text-xs text-white/35">Ultimo acesso: {formatDate(device.lastSeenAt)}</p>
          </div>
        </div>

        <div className="grid gap-2 text-xs text-white/45 sm:grid-cols-2">
          <span className="flex min-w-0 items-center gap-1.5">
            <Wifi className="h-3.5 w-3.5 shrink-0 text-white/30" />
            <span className="truncate">IP {device.ip || 'desconhecido'}</span>
          </span>
          <span className="flex min-w-0 items-center gap-1.5">
            <MapPin className="h-3.5 w-3.5 shrink-0 text-white/30" />
            <span className="truncate">{device.location || 'Localizacao nao identificada'}</span>
          </span>
        </div>
      </div>

      <Button
        type="button"
        variant="secondary"
        size="sm"
        className="justify-center"
        onClick={() => onDisconnect(device)}
        icon={<LogOut className="h-4 w-4" />}
      >
        Desconectar
      </Button>
    </div>
  );
}

function SegmentedButton({
  active,
  icon,
  label,
  onClick,
}: {
  active: boolean;
  icon?: ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex min-h-10 items-center justify-center gap-2 rounded-2xl border px-3 text-sm font-bold transition-all ${
        active
          ? 'border-brand-300/65 bg-brand-500/20 text-white shadow-glow'
          : 'border-white/10 bg-white/[0.045] text-white/58 hover:border-white/18 hover:text-white'
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

function ToggleRow({
  title,
  description,
  checked,
  onChange,
  disabled = false,
}: {
  title: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className="flex w-full items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/[0.04] p-3 text-left transition-all hover:bg-white/[0.065] disabled:cursor-not-allowed disabled:opacity-55"
    >
      <span className="min-w-0">
        <span className="block text-sm font-bold text-white">{title}</span>
        <span className="mt-0.5 block text-xs leading-relaxed text-white/42">{description}</span>
      </span>
      <span className={`relative h-7 w-12 shrink-0 rounded-full border transition-all ${
        checked ? 'border-brand-300/50 bg-brand-500/70' : 'border-white/12 bg-white/[0.055]'
      }`}>
        <span className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow-lg transition-transform ${
          checked ? 'translate-x-6' : 'translate-x-1'
        }`} />
      </span>
    </button>
  );
}

export default function SettingsPage() {
  const { user } = useAuth();
  const setUser = useAuthStore((state) => state.setUser);
  const resetAuth = useAuthStore((state) => state.reset);
  const navigate = useNavigate();
  const profileForm = useForm<ProfileFormData>();
  const passwordForm = useForm<PasswordFormData>();
  const [theme, setTheme] = useState<ThemeMode>(() => getStoredThemeMode());
  const [operatorPrefs, setOperatorPrefs] = useState<OperatorPreferences>(() => getOperatorPreferences());
  const [notificationPrefs, setNotificationPrefs] = useState<NotificationPreferences>(() => mergeNotificationPreferences(user?.notificationPreferences));
  const [notificationSaving, setNotificationSaving] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarProgress, setAvatarProgress] = useState(0);
  const setGlobalNotificationPrefs = useNotificationStore((state) => state.setPreferences);
  const devices = user?.trustedDevices || [];

  useEffect(() => {
    if (user) profileForm.reset({ name: user.name, companyName: user.companyName || '', avatarUrl: user.avatarUrl || '' });
  }, [profileForm, user]);

  useEffect(() => {
    const nextPreferences = mergeNotificationPreferences(user?.notificationPreferences);
    setNotificationPrefs(nextPreferences);
    setGlobalNotificationPrefs(nextPreferences);
  }, [setGlobalNotificationPrefs, user?.notificationPreferences]);

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

  async function handleAvatarUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file || !user || avatarUploading) return;

    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) {
      toast.error('Use PNG, JPG ou WebP.');
      return;
    }

    setAvatarUploading(true);
    setAvatarProgress(0);
    try {
      const uploaded = await uploadAvatarToServer(file, setAvatarProgress);
      const avatarUrl = uploaded.avatarUrl || uploaded.publicUrl;
      if (!avatarUrl) throw new Error('AVATAR_UPLOAD_FAILED');

      profileForm.setValue('avatarUrl', avatarUrl, { shouldDirty: true });
      const values = profileForm.getValues();
      const updatedUser = await updateUserProfile(user.uid, {
        name: values.name || user.name,
        companyName: values.companyName || '',
        avatarUrl,
      });
      setUser(updatedUser);
      toast.success('Foto de perfil atualizada.');
    } catch {
      toast.error('Erro ao enviar a foto.');
    } finally {
      setAvatarUploading(false);
      setAvatarProgress(0);
    }
  }

  async function onPasswordSubmit(data: PasswordFormData) {
    try {
      const session = await changePassword(data.newPassword);
      setUser(session.user);
      passwordForm.reset({ newPassword: '' });
      toast.success('Senha alterada com seguranca.');
    } catch (error) {
      toast.error(parseFirebaseError((error as { code?: string }).code));
    }
  }

  async function handleDisconnectDevice(device: TrustedDevice) {
    if (!window.confirm(`Desconectar ${device.isCurrent ? 'este dispositivo' : device.name}?`)) return;

    try {
      const result = await disconnectDevice(device.id);
      toast.success('Dispositivo desconectado.');

      if (result.currentDisconnected) {
        resetAuth();
        navigate('/login', { replace: true });
        return;
      }

      setUser(result.user);
    } catch (error) {
      toast.error(parseFirebaseError((error as { code?: string }).code));
    }
  }

  async function handleDisconnectAll() {
    if (!devices.length) return;
    if (!window.confirm('Desconectar todos os dispositivos desta conta? Voce precisara entrar novamente.')) return;

    try {
      await disconnectAllDevices();
      toast.success('Todos os dispositivos foram desconectados.');
      resetAuth();
      navigate('/login', { replace: true });
    } catch (error) {
      toast.error(parseFirebaseError((error as { code?: string }).code));
    }
  }

  function handleThemeChange(nextTheme: ThemeMode) {
    setTheme(nextTheme);
    setThemeMode(nextTheme);
    toast.success('Tema salvo.');
  }

  function updateOperatorPrefs(nextPrefs: OperatorPreferences) {
    setOperatorPrefs(nextPrefs);
    setOperatorPreferences(nextPrefs);
    toast.success('Preferencias salvas.');
  }

  async function saveNotificationPrefs(nextPrefs: NotificationPreferences) {
    const normalized = mergeNotificationPreferences(nextPrefs);
    setNotificationPrefs(normalized);
    setGlobalNotificationPrefs(normalized);
    setNotificationSaving(true);

    try {
      const { preferences } = await updateNotificationPreferences(normalized);
      setNotificationPrefs(preferences);
      setGlobalNotificationPrefs(preferences);
      if (user) setUser({ ...user, notificationPreferences: preferences });
      toast.success('Notificacoes salvas.');
    } catch {
      toast.error('Erro ao salvar notificacoes.');
    } finally {
      setNotificationSaving(false);
    }
  }

  async function handleBrowserToggle(checked: boolean) {
    if (checked && typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'default') {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        toast.error('Permissao de notificacao negada pelo navegador.');
        checked = false;
      }
    }

    await saveNotificationPrefs({ ...notificationPrefs, browser: checked });
  }

  return (
    <div className="mx-auto max-w-6xl space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">Configuracoes</h1>
          <p className="text-sm text-white/40">Perfil, senha e dispositivos conectados.</p>
        </div>
        <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.055] px-3 py-1.5 text-xs font-bold text-white/60">
          <Globe2 className="h-3.5 w-3.5" />
          {devices.length} dispositivo(s)
        </span>
      </div>

      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,0.95fr)_minmax(360px,1.05fr)]">
        <div className="space-y-4">
          <Card padding="sm">
            <h2 className="mb-3 flex items-center gap-2 text-base font-semibold text-white">
              <User className="h-5 w-5 text-brand-400" />
              Perfil
            </h2>
            <form onSubmit={profileForm.handleSubmit(onProfileSubmit)} className="space-y-3">
              <input type="hidden" {...profileForm.register('avatarUrl')} />
              <div className="grid gap-3 sm:grid-cols-[72px_1fr] sm:items-center">
                <div className="flex h-[72px] w-[72px] items-center justify-center overflow-hidden rounded-[24px] border border-white/10 bg-gradient-brand text-2xl font-black text-white shadow-glow">
                  {profileForm.watch('avatarUrl') ? (
                    <img src={profileForm.watch('avatarUrl')} alt="" className="h-full w-full object-cover" />
                  ) : (
                    user?.name?.charAt(0).toUpperCase() || 'U'
                  )}
                </div>
                <div className="space-y-2">
                  <p className="text-sm font-medium text-white/70">Foto de perfil</p>
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                    <label className={`inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-full border border-white/10 bg-white/[0.065] px-4 text-sm font-bold text-white transition-all hover:border-white/16 hover:bg-white/[0.1] ${avatarUploading ? 'pointer-events-none opacity-60' : ''}`}>
                      <Camera className="h-4 w-4" />
                      {avatarUploading ? `Enviando ${avatarProgress}%` : 'Escolher foto'}
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        className="hidden"
                        disabled={avatarUploading}
                        onChange={handleAvatarUpload}
                      />
                    </label>
                    <span className="text-xs leading-relaxed text-white/38">
                      PNG, JPG ou WebP. A foto fica salva no Supabase.
                    </span>
                  </div>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <Input label="Nome" placeholder="Seu nome" {...profileForm.register('name')} />
                <Input
                  label="Empresa"
                  placeholder="Nome da empresa"
                  icon={<Building className="h-4 w-4" />}
                  {...profileForm.register('companyName')}
                />
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-white/70">E-mail</label>
                  <p className="truncate rounded-[18px] border border-white/[0.08] bg-white/5 px-4 py-3 text-sm text-white/42">{user?.email}</p>
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-white/70">Cargo</label>
                  <p className="rounded-[18px] border border-white/[0.08] bg-white/5 px-4 py-3 text-sm capitalize text-white/42">{user?.role}</p>
                </div>
              </div>

              <Button type="submit" size="sm" loading={profileForm.formState.isSubmitting}>Salvar perfil</Button>
            </form>
          </Card>

          <Card padding="sm">
            <h2 className="mb-3 flex items-center gap-2 text-base font-semibold text-white">
              <Palette className="h-5 w-5 text-brand-400" />
              Aparencia
            </h2>
            <div className="grid gap-2 sm:grid-cols-3">
              <SegmentedButton active={theme === 'dark'} label="Escuro" icon={<Moon className="h-4 w-4" />} onClick={() => handleThemeChange('dark')} />
              <SegmentedButton active={theme === 'light'} label="Claro" icon={<Sun className="h-4 w-4" />} onClick={() => handleThemeChange('light')} />
              <SegmentedButton active={theme === 'system'} label="Sistema" icon={<Monitor className="h-4 w-4" />} onClick={() => handleThemeChange('system')} />
            </div>
          </Card>

          <Card padding="sm">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <h2 className="flex items-center gap-2 text-base font-semibold text-white">
                <BellRing className="h-5 w-5 text-brand-400" />
                Notificacoes
              </h2>
              {notificationSaving && <span className="text-xs font-bold text-white/35">Salvando...</span>}
            </div>

            <div className="space-y-3">
              <ToggleRow
                title="Central de notificacoes"
                description="Mantem avisos dentro do app, no sino da plataforma."
                checked={notificationPrefs.inApp}
                onChange={(checked) => saveNotificationPrefs({ ...notificationPrefs, inApp: checked, browser: checked ? notificationPrefs.browser : false })}
              />
              <ToggleRow
                title="Notificacoes do navegador"
                description="'Push' local quando o app estiver aberto ou instalado."
                checked={notificationPrefs.browser}
                onChange={handleBrowserToggle}
                disabled={!notificationPrefs.inApp || (typeof window !== 'undefined' && !('Notification' in window))}
              />
              <ToggleRow
                title="Som discreto"
                description="Toca um alerta curto para novas notificacoes."
                checked={notificationPrefs.sound}
                onChange={(checked) => saveNotificationPrefs({ ...notificationPrefs, sound: checked })}
              />

              <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-3">
                <ToggleRow
                  title="Horario silencioso"
                  description="Pausa som e notificacoes do navegador nesse periodo."
                  checked={notificationPrefs.quietHours.enabled}
                  onChange={(checked) => saveNotificationPrefs({
                    ...notificationPrefs,
                    quietHours: { ...notificationPrefs.quietHours, enabled: checked },
                  })}
                />
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <label className="space-y-1.5">
                    <span className="flex items-center gap-1.5 text-xs font-bold text-white/55">
                      <Clock3 className="h-3.5 w-3.5" />
                      Inicio
                    </span>
                    <input
                      type="time"
                      value={notificationPrefs.quietHours.start}
                      onChange={(event) => saveNotificationPrefs({
                        ...notificationPrefs,
                        quietHours: { ...notificationPrefs.quietHours, start: event.target.value },
                      })}
                      className="h-10 w-full rounded-2xl border border-white/10 bg-white/[0.055] px-3 text-sm font-bold text-white outline-none focus:border-brand-400/60"
                    />
                  </label>
                  <label className="space-y-1.5">
                    <span className="flex items-center gap-1.5 text-xs font-bold text-white/55">
                      <Volume2 className="h-3.5 w-3.5" />
                      Fim
                    </span>
                    <input
                      type="time"
                      value={notificationPrefs.quietHours.end}
                      onChange={(event) => saveNotificationPrefs({
                        ...notificationPrefs,
                        quietHours: { ...notificationPrefs.quietHours, end: event.target.value },
                      })}
                      className="h-10 w-full rounded-2xl border border-white/10 bg-white/[0.055] px-3 text-sm font-bold text-white outline-none focus:border-brand-400/60"
                    />
                  </label>
                </div>
              </div>

              <div className="grid gap-2 sm:grid-cols-2">
                {notificationCategories.map((category) => (
                  <ToggleRow
                    key={category.value}
                    title={category.label}
                    description={category.description}
                    checked={notificationPrefs.categories[category.value]}
                    onChange={(checked) => saveNotificationPrefs({
                      ...notificationPrefs,
                      categories: { ...notificationPrefs.categories, [category.value]: checked },
                    })}
                  />
                ))}
              </div>
            </div>
          </Card>

          <Card padding="sm">
            <h2 className="mb-3 flex items-center gap-2 text-base font-semibold text-white">
              <Camera className="h-5 w-5 text-brand-400" />
              Operacao
            </h2>
            <div className="space-y-3">
              <div className="space-y-2">
                <p className="text-sm font-medium text-white/70">Duracao padrao</p>
                <div className="grid grid-cols-5 gap-2">
                  {durationOptions.map((seconds) => (
                    <SegmentedButton
                      key={seconds}
                      active={operatorPrefs.defaultDuration === seconds}
                      label={`${seconds}s`}
                      onClick={() => updateOperatorPrefs({ ...operatorPrefs, defaultDuration: seconds })}
                    />
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium text-white/70">Trilha padrao</p>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {musicOptions.map((option) => (
                    <SegmentedButton
                      key={option.value}
                      active={operatorPrefs.defaultMusicTheme === option.value}
                      label={option.label}
                      onClick={() => updateOperatorPrefs({ ...operatorPrefs, defaultMusicTheme: option.value })}
                    />
                  ))}
                </div>
              </div>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => updateOperatorPrefs(defaultOperatorPreferences)}
              >
                Restaurar padrao
              </Button>
            </div>
          </Card>

          <Card padding="sm">
            <h2 className="mb-3 flex items-center gap-2 text-base font-semibold text-white">
              <KeyRound className="h-5 w-5 text-brand-400" />
              Senha
            </h2>
            <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)} className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
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
              <Button type="submit" size="sm" loading={passwordForm.formState.isSubmitting}>Alterar senha</Button>
            </form>
          </Card>
        </div>

        <Card padding="sm" className="lg:max-h-[calc(100vh-150px)] lg:overflow-y-auto">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <h2 className="flex items-center gap-2 text-base font-semibold text-white">
              <ShieldCheck className="h-5 w-5 text-brand-400" />
              Dispositivos conectados
            </h2>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={devices.length === 0}
              onClick={handleDisconnectAll}
              icon={<Trash2 className="h-4 w-4" />}
            >
              Desconectar todos
            </Button>
          </div>

          <div className="space-y-2.5">
            {devices.length === 0 ? (
              <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-5 text-sm text-white/45">
                Nenhum dispositivo registrado ainda.
              </div>
            ) : devices.map((device) => (
              <DeviceRow key={device.id} device={device} onDisconnect={handleDisconnectDevice} />
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
