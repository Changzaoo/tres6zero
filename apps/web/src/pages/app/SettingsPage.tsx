import { useEffect, useState, type ChangeEvent, type ReactNode } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import {
  ArrowDown,
  ArrowUp,
  BellRing,
  Building,
  Calendar,
  Camera,
  ChevronRight,
  Clock3,
  GripVertical,
  KeyRound,
  Layers,
  LogOut,
  MapPin,
  Monitor,
  MonitorSmartphone,
  Moon,
  Palette,
  RotateCcw,
  ShieldCheck,
  Sun,
  Trash2,
  User,
  Video,
  Volume2,
  Wifi,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useAuthStore } from '@/store/authStore';
import { changePassword, disconnectAllDevices, disconnectDevice, parseFirebaseError, updateUserProfile } from '@/services/authService';
import { getStoredThemeMode, setThemeMode, type ThemeMode } from '@/services/themeService';
import { mergeNotificationPreferences, notificationCategories, updateNotificationPreferences } from '@/services/notificationService';
import { uploadAvatarToServer } from '@/services/serverMediaService';
import { DEFAULT_MENU_ORDER, getStoredMenuOrder, resetMenuOrder, saveMenuOrder, type MenuItemId } from '@/services/menuOrderService';
import { useNotificationStore } from '@/store/notificationStore';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { toast } from '@/components/ui/Toast';
import type { NotificationPreferences, TrustedDevice } from '@/types';

interface ProfileFormData {
  name: string;
  companyName: string;
  avatarUrl: string;
}

interface PasswordFormData {
  newPassword: string;
}

const menuItemMeta: Record<MenuItemId, { label: string; description: string; icon: ReactNode }> = {
  events: { label: 'Eventos', description: 'Páginas e links criados.', icon: <Calendar className="h-4 w-4" /> },
  videos: { label: 'Vídeos', description: 'Biblioteca de vídeos prontos.', icon: <Video className="h-4 w-4" /> },
  gravar: { label: 'Gravar', description: 'Atalho para criar vídeo.', icon: <Camera className="h-4 w-4" /> },
  templates: { label: 'Templates', description: 'Molduras e músicas.', icon: <Layers className="h-4 w-4" /> },
};

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
    <div className="grid gap-3 border-b border-white/[0.08] bg-white/[0.02] p-4 last:border-b-0 sm:grid-cols-[1fr_auto] sm:items-center">
      <div className="min-w-0 space-y-2">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/[0.06] text-white/55">
            <MonitorSmartphone className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <p className="truncate text-sm font-bold text-white">{device.name}</p>
              {device.isCurrent && (
                <span className="rounded-full bg-brand-500/15 px-2 py-0.5 text-[11px] font-bold text-brand-200">Atual</span>
              )}
            </div>
            <p className="text-xs text-white/35">Último acesso: {formatDate(device.lastSeenAt)}</p>
          </div>
        </div>

        <div className="grid gap-2 text-xs text-white/45 sm:grid-cols-2">
          <span className="flex min-w-0 items-center gap-1.5">
            <Wifi className="h-3.5 w-3.5 shrink-0 text-white/30" />
            <span className="truncate">IP {device.ip || 'desconhecido'}</span>
          </span>
          <span className="flex min-w-0 items-center gap-1.5">
            <MapPin className="h-3.5 w-3.5 shrink-0 text-white/30" />
            <span className="truncate">{device.location || 'Localização não identificada'}</span>
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
      className={`flex min-h-11 items-center justify-center gap-2 rounded-full border px-3 text-sm font-bold transition-all ${
        active
          ? 'border-brand-300/65 bg-brand-500/20 text-white shadow-glow'
          : 'border-white/10 bg-white/[0.035] text-white/58 hover:border-white/18 hover:text-white'
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
      className="flex w-full items-center justify-between gap-3 border-b border-white/[0.08] bg-white/[0.02] p-4 text-left transition hover:bg-white/[0.045] disabled:cursor-not-allowed disabled:opacity-55 last:border-b-0"
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

function SettingsNavLink({ href, icon, title, description }: { href: string; icon: ReactNode; title: string; description: string }) {
  return (
    <a href={href} className="group flex min-w-0 items-center gap-3 border-b border-white/[0.08] px-4 py-4 text-left transition hover:bg-white/[0.045]">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/[0.055] text-white/62 transition group-hover:bg-white/[0.08] group-hover:text-white">
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-bold text-white">{title}</span>
        <span className="mt-0.5 block truncate text-xs text-white/38">{description}</span>
      </span>
      <ChevronRight className="h-4 w-4 shrink-0 text-white/28" />
    </a>
  );
}

function SettingsSection({ id, title, description, children }: { id: string; title: string; description: string; children: ReactNode }) {
  return (
    <section id={id} className="scroll-mt-4 border-b border-white/[0.08] px-4 py-5 last:border-b-0 sm:px-6">
      <div className="mb-4">
        <h2 className="text-xl font-black leading-tight text-white">{title}</h2>
        <p className="mt-1 text-sm text-white/42">{description}</p>
      </div>
      {children}
    </section>
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
  const [notificationPrefs, setNotificationPrefs] = useState<NotificationPreferences>(() => mergeNotificationPreferences(user?.notificationPreferences));
  const [notificationSaving, setNotificationSaving] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarProgress, setAvatarProgress] = useState(0);
  const [menuOrder, setMenuOrder] = useState<MenuItemId[]>(() => getStoredMenuOrder());
  const setGlobalNotificationPrefs = useNotificationStore((state) => state.setPreferences);
  const devices = user?.trustedDevices || [];
  const menuIsDefault = DEFAULT_MENU_ORDER.every((item, index) => menuOrder[index] === item);

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
      toast.success('Senha alterada com segurança.');
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
    if (!window.confirm('Desconectar todos os dispositivos desta conta? Você precisará entrar novamente.')) return;

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
      toast.success('Notificações salvas.');
    } catch {
      toast.error('Erro ao salvar notificações.');
    } finally {
      setNotificationSaving(false);
    }
  }

  async function handleBrowserToggle(checked: boolean) {
    if (checked && typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'default') {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        toast.error('Permissão de notificação negada pelo navegador.');
        checked = false;
      }
    }

    await saveNotificationPrefs({ ...notificationPrefs, browser: checked });
  }

  function updateMenuOrder(nextOrder: MenuItemId[]) {
    setMenuOrder(saveMenuOrder(nextOrder));
    toast.success('Ordem do menu atualizada.');
  }

  function moveMenuItem(itemId: MenuItemId, direction: -1 | 1) {
    const currentIndex = menuOrder.indexOf(itemId);
    const nextIndex = currentIndex + direction;
    if (currentIndex < 0 || nextIndex < 0 || nextIndex >= menuOrder.length) return;

    const nextOrder = [...menuOrder];
    [nextOrder[currentIndex], nextOrder[nextIndex]] = [nextOrder[nextIndex], nextOrder[currentIndex]];
    updateMenuOrder(nextOrder);
  }

  function handleResetMenuOrder() {
    setMenuOrder(resetMenuOrder());
    toast.success('Ordem original restaurada.');
  }

  return (
    <div className="mx-auto max-w-6xl">
      <div className="overflow-hidden rounded-[28px] border border-white/[0.08] bg-[#050608] shadow-2xl shadow-black/35">
        <div className="grid min-h-[calc(100dvh-8rem)] lg:grid-cols-[21rem_minmax(0,1fr)]">
          <aside className="border-b border-white/[0.08] lg:border-b-0 lg:border-r">
            <div className="border-b border-white/[0.08] px-4 py-4">
              <h1 className="text-2xl font-black leading-tight text-white">Configurações</h1>
              <p className="mt-1 truncate text-sm text-white/42">{user?.email}</p>
            </div>
            <nav className="divide-y divide-white/[0.08]">
              <SettingsNavLink href="#conta" icon={<User className="h-5 w-5" />} title="Sua conta" description="Perfil, foto e senha" />
              <SettingsNavLink href="#aparencia" icon={<Palette className="h-5 w-5" />} title="Aparência" description="Tema do aplicativo" />
              <SettingsNavLink href="#menu" icon={<GripVertical className="h-5 w-5" />} title="Menu" description="Ordem dos atalhos" />
              <SettingsNavLink href="#notificacoes" icon={<BellRing className="h-5 w-5" />} title="Notificações" description="Avisos, som e horário" />
              <SettingsNavLink href="#seguranca" icon={<ShieldCheck className="h-5 w-5" />} title="Segurança" description={`${devices.length} dispositivo(s)`} />
            </nav>
          </aside>

          <div className="min-w-0 bg-[#07080c]">
            <SettingsSection id="conta" title="Sua conta" description="Atualize os dados principais e a senha de acesso.">
              <form onSubmit={profileForm.handleSubmit(onProfileSubmit)} className="space-y-4">
                <input type="hidden" {...profileForm.register('avatarUrl')} />
                <div className="flex flex-col gap-3 border-b border-white/[0.08] pb-4 sm:flex-row sm:items-center">
                  <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-full border border-white/10 bg-gradient-brand text-2xl font-black text-white shadow-glow">
                    {profileForm.watch('avatarUrl') ? (
                      <img src={profileForm.watch('avatarUrl')} alt="" className="h-full w-full object-cover" />
                    ) : (
                      user?.name?.charAt(0).toUpperCase() || 'U'
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-white">Foto de perfil</p>
                    <p className="mt-0.5 text-xs text-white/38">PNG, JPG ou WebP.</p>
                  </div>
                  <label className={`inline-flex min-h-10 cursor-pointer items-center justify-center gap-2 rounded-full border border-white/12 px-4 text-sm font-bold text-white transition hover:bg-white/[0.06] ${avatarUploading ? 'pointer-events-none opacity-60' : ''}`}>
                    <Camera className="h-4 w-4" />
                    {avatarUploading ? `${avatarProgress}%` : 'Editar'}
                    <input type="file" accept="image/png,image/jpeg,image/webp" className="hidden" disabled={avatarUploading} onChange={handleAvatarUpload} />
                  </label>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <Input label="Nome" placeholder="Seu nome" {...profileForm.register('name')} />
                  <Input label="Empresa" placeholder="Nome da empresa" icon={<Building className="h-4 w-4" />} {...profileForm.register('companyName')} />
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-white/70">E-mail</label>
                  <p className="truncate rounded-[18px] border border-white/[0.08] bg-white/[0.035] px-4 py-3 text-sm text-white/42">{user?.email}</p>
                </div>

                <Button type="submit" size="sm" loading={profileForm.formState.isSubmitting}>Salvar perfil</Button>
              </form>

              <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)} className="mt-5 border-t border-white/[0.08] pt-5">
                <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
                  <Input
                    label="Nova senha"
                    type="password"
                    autoComplete="new-password"
                    placeholder="Digite a nova senha"
                    icon={<KeyRound className="h-4 w-4" />}
                    error={passwordForm.formState.errors.newPassword?.message}
                    {...passwordForm.register('newPassword', {
                      required: 'Digite a nova senha.',
                      minLength: { value: 8, message: 'Use pelo menos 8 caracteres.' },
                    })}
                  />
                  <Button type="submit" size="sm" loading={passwordForm.formState.isSubmitting}>Alterar senha</Button>
                </div>
              </form>
            </SettingsSection>

            <SettingsSection id="aparencia" title="Aparência" description="Escolha como a interface aparece neste dispositivo.">
              <div className="grid gap-2 sm:grid-cols-3">
                <SegmentedButton active={theme === 'dark'} label="Escuro" icon={<Moon className="h-4 w-4" />} onClick={() => handleThemeChange('dark')} />
                <SegmentedButton active={theme === 'light'} label="Claro" icon={<Sun className="h-4 w-4" />} onClick={() => handleThemeChange('light')} />
                <SegmentedButton active={theme === 'system'} label="Sistema" icon={<Monitor className="h-4 w-4" />} onClick={() => handleThemeChange('system')} />
              </div>
            </SettingsSection>

            <SettingsSection id="menu" title="Menu" description="Organize os atalhos principais do app.">
              <div className="overflow-hidden rounded-2xl border border-white/[0.08]">
                {menuOrder.map((itemId, index) => {
                  const item = menuItemMeta[itemId];
                  return (
                    <div key={itemId} className="flex min-w-0 items-center gap-3 border-b border-white/[0.08] bg-white/[0.025] px-3 py-3 last:border-b-0">
                      <GripVertical className="h-4 w-4 shrink-0 text-white/24" />
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/[0.06] text-white/65">
                        {item.icon}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-bold text-white">{item.label}</p>
                        <p className="truncate text-xs text-white/36">{item.description}</p>
                      </div>
                      <div className="flex shrink-0 items-center gap-1">
                        <button
                          type="button"
                          title="Subir"
                          aria-label={`Subir ${item.label}`}
                          disabled={index === 0}
                          onClick={() => moveMenuItem(itemId, -1)}
                          className="grid h-9 w-9 place-items-center rounded-full border border-white/10 text-white/55 transition hover:bg-white/[0.06] hover:text-white disabled:cursor-not-allowed disabled:opacity-25"
                        >
                          <ArrowUp className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          title="Descer"
                          aria-label={`Descer ${item.label}`}
                          disabled={index === menuOrder.length - 1}
                          onClick={() => moveMenuItem(itemId, 1)}
                          className="grid h-9 w-9 place-items-center rounded-full border border-white/10 text-white/55 transition hover:bg-white/[0.06] hover:text-white disabled:cursor-not-allowed disabled:opacity-25"
                        >
                          <ArrowDown className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
              <button
                type="button"
                disabled={menuIsDefault}
                onClick={handleResetMenuOrder}
                className="mt-3 inline-flex h-10 items-center gap-2 rounded-full border border-white/10 px-4 text-sm font-bold text-white/62 transition hover:bg-white/[0.055] hover:text-white disabled:cursor-not-allowed disabled:opacity-35"
              >
                <RotateCcw className="h-4 w-4" />
                Restaurar ordem
              </button>
            </SettingsSection>

            <SettingsSection id="notificacoes" title="Notificações" description="Controle onde e quando os avisos aparecem.">
              <div className="mb-3 flex justify-end">
                {notificationSaving && <span className="text-xs font-bold text-white/35">Salvando...</span>}
              </div>
              <div className="overflow-hidden rounded-2xl border border-white/[0.08]">
                <ToggleRow
                  title="Central de notificações"
                  description="Mantém avisos dentro do app, no sino da plataforma."
                  checked={notificationPrefs.inApp}
                  onChange={(checked) => saveNotificationPrefs({ ...notificationPrefs, inApp: checked, browser: checked ? notificationPrefs.browser : false })}
                />
                <ToggleRow
                  title="Notificações do navegador"
                  description="Push local quando o app estiver aberto ou instalado."
                  checked={notificationPrefs.browser}
                  onChange={handleBrowserToggle}
                  disabled={!notificationPrefs.inApp || (typeof window !== 'undefined' && !('Notification' in window))}
                />
                <ToggleRow
                  title="Som discreto"
                  description="Toca um alerta curto para novas notificações."
                  checked={notificationPrefs.sound}
                  onChange={(checked) => saveNotificationPrefs({ ...notificationPrefs, sound: checked })}
                />
              </div>

              <div className="mt-3 rounded-2xl border border-white/[0.08] bg-white/[0.025] p-3">
                <ToggleRow
                  title="Horário silencioso"
                  description="Pausa som e notificações do navegador nesse período."
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
                      Início
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

              <div className="mt-3 grid gap-2 sm:grid-cols-2">
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
            </SettingsSection>

            <SettingsSection id="seguranca" title="Segurança" description="Veja e remova dispositivos conectados à conta.">
              <div className="mb-3 flex justify-end">
                <Button type="button" variant="secondary" size="sm" disabled={devices.length === 0} onClick={handleDisconnectAll} icon={<Trash2 className="h-4 w-4" />}>
                  Desconectar todos
                </Button>
              </div>
              <div className="overflow-hidden rounded-2xl border border-white/[0.08]">
                {devices.length === 0 ? (
                  <div className="px-4 py-5 text-sm text-white/45">
                    Nenhum dispositivo registrado ainda.
                  </div>
                ) : devices.map((device) => (
                  <DeviceRow key={device.id} device={device} onDisconnect={handleDisconnectDevice} />
                ))}
              </div>
            </SettingsSection>
          </div>
        </div>
      </div>
    </div>
  );
}
