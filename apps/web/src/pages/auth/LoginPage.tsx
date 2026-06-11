import { useEffect, useRef, useState, type ChangeEvent, type MouseEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion, useReducedMotion, type Variants } from 'framer-motion';
import { Eye, EyeOff } from 'lucide-react';
import { login, parseFirebaseError } from '@/services/authService';
import { useAuthStore } from '@/store/authStore';
import { toast } from '@/components/ui/Toast';
import { LoginSupportChat } from '@/components/support/LoginSupportChat';
import { BannedAccountNotice } from '@/components/auth/BannedAccountNotice';
import { AnimatedLoginCharacters, type CharacterMood } from '@/components/auth/AnimatedLoginCharacters';

const schema = z.object({
  email: z.string().email('E-mail inválido'),
  password: z.string().min(6, 'Mínimo 6 caracteres'),
});

type FormData = z.infer<typeof schema>;
type LoginField = 'email' | 'password';

// Easing premium usado em todas as entradas
const easePremium: [number, number, number, number] = [0.16, 1, 0.3, 1];

export default function LoginPage() {
  const navigate = useNavigate();
  const reduceMotion = useReducedMotion();
  const [showPass, setShowPass] = useState(false);
  const [mood, setMood] = useState<CharacterMood>('idle');
  const [activeField, setActiveField] = useState<LoginField | null>(null);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [leaving, setLeaving] = useState(false);
  const activeFieldRef = useRef<LoginField | null>(null);
  const errorMoodTimer = useRef<number>();
  const typingReturnTimer = useRef<number>();
  const typingLockTimer = useRef<number>();
  const typingLockedRef = useRef(false);
  const [banNotice, setBanNotice] = useState<{ reason?: string | null; expiresAt?: string | null } | null>(null);
  const setUser = useAuthStore((state) => state.setUser);
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({ resolver: zodResolver(schema) });

  useEffect(() => () => {
    window.clearTimeout(errorMoodTimer.current);
    window.clearTimeout(typingReturnTimer.current);
    window.clearTimeout(typingLockTimer.current);
  }, []);

  // Shake curto na ilustracao; volta sozinho para idle
  function triggerErrorMood() {
    window.clearTimeout(typingReturnTimer.current);
    setMood('error');
    window.clearTimeout(errorMoodTimer.current);
    errorMoodTimer.current = window.setTimeout(() => {
      setMood((current) => (current === 'error' ? (activeFieldRef.current ? 'focus' : 'idle') : current));
    }, 650);
  }

  function triggerTypingMood(field: LoginField) {
    activeFieldRef.current = field;
    setActiveField(field);
    setLoginError(null);

    if (!typingLockedRef.current) {
      setMood('typing');
      typingLockedRef.current = true;
      window.clearTimeout(typingLockTimer.current);
      typingLockTimer.current = window.setTimeout(() => {
        typingLockedRef.current = false;
      }, 1000);
    }

    window.clearTimeout(typingReturnTimer.current);
    typingReturnTimer.current = window.setTimeout(() => {
      setMood(activeFieldRef.current ? 'focus' : 'idle');
    }, 1750);
  }

  async function onSubmit(data: FormData) {
    try {
      setLoginError(null);
      const session = await login(data.email, data.password);
      setUser(session.user);
      setMood('success');
      if (!reduceMotion) {
        await new Promise((resolve) => window.setTimeout(resolve, 120));
      }
      navigate(session.user.subscriptionStatus === 'active' ? '/app/dashboard' : '/app/billing');
    } catch (error: any) {
      if (error?.code === 'BAN_ACTIVE') {
        setBanNotice({ reason: error.banReason, expiresAt: error.banExpiresAt });
        return;
      }
      const message = parseFirebaseError(error.code);
      setLoginError(message);
      triggerErrorMood();
      toast.error(message);
    }
  }

  function onInvalidSubmit() {
    setLoginError('Revise os campos e tente novamente.');
    triggerErrorMood();
  }

  const emailField = register('email');
  const passwordField = register('password');

  function handleFieldFocus(field: LoginField) {
    activeFieldRef.current = field;
    setActiveField(field);
    setMood((current) => (current === 'error' ? current : 'focus'));
  }

  function handleFieldBlur(field: LoginField) {
    if (activeFieldRef.current === field) {
      activeFieldRef.current = null;
      setActiveField(null);
    }
    setMood((current) => (current === 'focus' ? 'idle' : current));
  }

  function handleFieldChange(
    event: ChangeEvent<HTMLInputElement>,
    field: LoginField,
    fieldOnChange: (event: ChangeEvent<HTMLInputElement>) => void,
  ) {
    fieldOnChange(event);
    triggerTypingMood(field);
  }

  const formContainer: Variants = {
    hidden: {},
    visible: { transition: { staggerChildren: 0.08, delayChildren: reduceMotion ? 0.15 : 1.05 } },
  };
  const formItem: Variants = reduceMotion
    ? { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { duration: 0.4 } } }
    : { hidden: { opacity: 0, y: 8 }, visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: easePremium } } };

  // Saida para o cadastro: as formas se transformam num loader antes de navegar
  function handleSignUpClick(event: MouseEvent<HTMLAnchorElement>) {
    event.preventDefault();
    if (leaving) return;
    if (reduceMotion) {
      navigate('/register');
      return;
    }
    setLeaving(true);
    window.setTimeout(() => navigate('/register'), 1150);
  }

  // Senha visivel: os personagens desviam o olhar (gag do video de referencia).
  // Erro e sucesso tem prioridade sobre a timidez; a saida vence tudo.
  const sceneMood: CharacterMood = leaving
    ? 'leave'
    : mood === 'error' || mood === 'success' ? mood : showPass ? 'shy' : mood;

  if (banNotice) {
    return <BannedAccountNotice reason={banNotice.reason} expiresAt={banNotice.expiresAt} />;
  }

  return (
    // pb maior no mobile: folga para o botao flutuante de suporte nao cobrir o formulario
    <main className="six3-grid-bg flex min-h-screen items-center justify-center overflow-x-hidden bg-surface px-4 pt-6 pb-20 sm:px-6 sm:py-8">
      <motion.section
        initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 18, scale: 0.96 }}
        animate={reduceMotion ? { opacity: 1 } : { opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.8, delay: reduceMotion ? 0 : 0.28, ease: easePremium }}
        className="relative z-10 grid w-full max-w-[820px] overflow-hidden rounded-[16px] bg-[#151821] shadow-[0_30px_90px_-20px_rgba(59,109,255,0.3)] ring-1 ring-white/10 md:grid-cols-2"
      >
        <div className="relative flex min-h-[212px] items-center justify-center bg-[#11141d] p-5 sm:min-h-[330px] sm:p-8 md:min-h-[520px] md:p-10">
          <AnimatedLoginCharacters mood={sceneMood} activeField={activeField} />
        </div>

        <div className="flex items-center justify-center px-6 py-9 sm:min-h-[460px] sm:px-10 sm:py-10 md:min-h-[520px]">
          {/* O formulario esmaece enquanto as formas viram o loader */}
          <motion.div
            animate={{ opacity: leaving ? 0 : 1, y: leaving ? 8 : 0 }}
            transition={{ duration: 0.4, ease: easePremium }}
            className={`w-full max-w-[282px] ${leaving ? 'pointer-events-none' : ''}`}
          >
            <motion.form
              variants={formContainer}
              initial="hidden"
              animate="visible"
              onSubmit={handleSubmit(onSubmit, onInvalidSubmit)}
              className="space-y-5"
              noValidate
            >
              <div className="text-center">
                <motion.img
                  variants={formItem}
                  src="/brand/six3-logo.png"
                  alt="SIX3"
                  className="mx-auto mb-6 h-10 w-auto select-none object-contain"
                  draggable={false}
                />
                <motion.h1 variants={formItem} className="text-[22px] font-extrabold leading-tight text-[#f8fafc]">
                  Bem-vindo de volta!
                </motion.h1>
                <motion.p variants={formItem} className="mt-1 text-[11px] font-medium text-white/45">
                  Insira seus dados para continuar
                </motion.p>
              </div>

              <div className="space-y-4 pt-1">
                <motion.label variants={formItem} className="block">
                  <span className="text-[11px] font-semibold text-white/70">E-mail</span>
                  <input
                    type="email"
                    autoComplete="email"
                    placeholder="exemplo@email.com"
                    className="mt-1 w-full border-0 border-b border-white/15 bg-transparent px-0 py-2 text-[12px] md:py-1.5 font-medium text-[#f8fafc] outline-none transition-colors duration-200 placeholder:text-white/25 autofill:shadow-[inset_0_0_0_1000px_#151821] autofill:[-webkit-text-fill-color:#f8fafc] focus:border-brand-400 focus:ring-0"
                    {...emailField}
                    onFocus={() => handleFieldFocus('email')}
                    onChange={(event) => handleFieldChange(event, 'email', emailField.onChange)}
                    onBlur={(event) => {
                      void emailField.onBlur(event);
                      handleFieldBlur('email');
                    }}
                  />
                  {errors.email && <p className="mt-1 text-[11px] text-red-400">{errors.email.message}</p>}
                </motion.label>

                <motion.label variants={formItem} className="block">
                  <span className="text-[11px] font-semibold text-white/70">Senha</span>
                  <div className="relative">
                    <input
                      type={showPass ? 'text' : 'password'}
                      autoComplete="current-password"
                      placeholder="********"
                      className="mt-1 w-full border-0 border-b border-white/15 bg-transparent px-0 py-2 pr-9 text-[12px] md:py-1.5 font-medium text-[#f8fafc] outline-none transition-colors duration-200 placeholder:text-white/25 autofill:shadow-[inset_0_0_0_1000px_#151821] autofill:[-webkit-text-fill-color:#f8fafc] focus:border-brand-400 focus:ring-0"
                      {...passwordField}
                      onFocus={() => handleFieldFocus('password')}
                      onChange={(event) => handleFieldChange(event, 'password', passwordField.onChange)}
                      onBlur={(event) => {
                        void passwordField.onBlur(event);
                        handleFieldBlur('password');
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPass(!showPass)}
                      aria-label={showPass ? 'Ocultar senha' : 'Mostrar senha'}
                      className="absolute bottom-1.5 right-0 flex h-6 w-6 items-center justify-center text-white/40 transition hover:text-white focus:outline-none focus-visible:text-white"
                    >
                      {showPass ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                    </button>
                  </div>
                  {errors.password && <p className="mt-1 text-[11px] text-red-400">{errors.password.message}</p>}
                </motion.label>
              </div>

              <motion.div variants={formItem} className="flex items-center justify-between gap-3 text-[10px]">
                <label className="flex min-w-0 cursor-pointer items-center gap-1.5 text-white/55">
                  <input
                    type="checkbox"
                    className="h-3 w-3 shrink-0 rounded-[2px] border-white/20 accent-brand-500 focus:ring-brand-500"
                  />
                  <span className="truncate">Lembrar por 30 dias</span>
                </label>

                <Link
                  to="/forgot-password"
                  className="shrink-0 text-white/45 transition hover:text-brand-300"
                >
                  Esqueceu a senha?
                </Link>
              </motion.div>

              {loginError && (
                <motion.p
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  role="alert"
                  className="rounded-full border border-red-400/20 bg-red-500/10 px-3 py-2 text-center text-[11px] font-semibold text-red-200"
                >
                  {loginError}
                </motion.p>
              )}

              <div className="space-y-3 pt-1">
                <motion.button
                  variants={formItem}
                  type="submit"
                  disabled={isSubmitting}
                  className="six3-btn-shine h-10 w-full rounded-full bg-gradient-brand text-[12px] font-bold text-white shadow-glow ring-1 ring-white/[0.16] transition hover:shadow-[0_22px_70px_-26px_rgba(139,92,246,0.95)] focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-offset-2 focus-visible:ring-offset-[#151821] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 md:h-9"
                >
                  {isSubmitting ? (
                    <span className="inline-flex items-center gap-2">
                      <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                      Entrando...
                    </span>
                  ) : (
                    'Entrar'
                  )}
                </motion.button>

                <motion.button
                  variants={formItem}
                  type="button"
                  onClick={() => toast.error('Login com Google ainda não disponível')}
                  className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-full bg-white/[0.06] text-[12px] font-bold text-white/85 ring-1 ring-white/10 transition hover:bg-white/10 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-offset-2 focus-visible:ring-offset-[#151821] active:scale-[0.98] md:h-9"
                >
                  <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.1A6.6 6.6 0 0 1 5.49 12c0-.73.13-1.43.35-2.1V7.06H2.18A11 11 0 0 0 1 12c0 1.77.43 3.45 1.18 4.94l3.66-2.84z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.16-3.16A11 11 0 0 0 12 1 11 11 0 0 0 2.18 7.06l3.66 2.84C6.71 7.3 9.14 5.38 12 5.38z" />
                  </svg>
                  Entrar com o Google
                </motion.button>
              </div>

              <motion.p variants={formItem} className="pt-5 text-center text-[10px] text-white/45">
                Não tem uma conta?{' '}
                <Link
                  to="/register"
                  onClick={handleSignUpClick}
                  className="font-semibold text-brand-300 transition hover:text-brand-200 hover:underline"
                >
                  Criar conta
                </Link>
              </motion.p>
            </motion.form>

            <LoginSupportChat variant="floating" />
          </motion.div>
        </div>
      </motion.section>
    </main>
  );
}
