import { useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  motion,
  useMotionValue,
  useReducedMotion,
  useSpring,
  useTransform,
  type Variants,
} from 'framer-motion';
import { Eye, EyeOff, Sparkles } from 'lucide-react';
import { login, parseFirebaseError } from '@/services/authService';
import { useAuthStore } from '@/store/authStore';
import { toast } from '@/components/ui/Toast';
import { LoginSupportChat } from '@/components/support/LoginSupportChat';
import { BannedAccountNotice } from '@/components/auth/BannedAccountNotice';

const schema = z.object({
  email: z.string().email('E-mail invalido'),
  password: z.string().min(6, 'Minimo 6 caracteres'),
});

type FormData = z.infer<typeof schema>;

// Paleta da ilustracao alinhada a identidade SIX3 (tailwind.config: brand/surface)
const ink = '#0e1016'; // surface-100
const brandBlue = '#3b6dff'; // brand-500
const brandViolet = '#8b5cf6'; // violeta do gradient-brand
const brandSky = '#8fb0ff'; // brand-300

// Easing premium usado em todas as entradas
const easePremium: [number, number, number, number] = [0.16, 1, 0.3, 1];

const illustrationContainer: Variants = {
  hidden: {},
  // Sequencia: azul -> violeta -> escuro -> claro -> detalhes (ordem do DOM)
  visible: { transition: { staggerChildren: 0.14, delayChildren: 0.2 } },
};

const enterBlue: Variants = {
  hidden: { opacity: 0, y: 34, scale: 0.92 },
  visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.75, ease: easePremium } },
};

// Violeta entra subindo com rotacao sutil, como se estivesse "se ajeitando"
const enterViolet: Variants = {
  hidden: { opacity: 0, y: 42, scale: 0.88, rotate: -6 },
  visible: { opacity: 1, y: 0, scale: 1, rotate: 0, transition: { duration: 0.9, ease: easePremium } },
};

const enterInk: Variants = {
  hidden: { opacity: 0, y: 20, scale: 0.92 },
  visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.75, ease: easePremium } },
};

// Forma clara entra vindo da direita
const enterSky: Variants = {
  hidden: { opacity: 0, x: 34, scale: 0.94 },
  visible: { opacity: 1, x: 0, scale: 1, transition: { duration: 0.8, ease: easePremium } },
};

const enterDetail: Variants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: easePremium } },
};

function LoginIllustration() {
  const reduceMotion = useReducedMotion();
  const areaRef = useRef<HTMLDivElement>(null);
  const parallaxEnabled =
    !reduceMotion && typeof window !== 'undefined' && window.matchMedia('(pointer: fine)').matches;

  // Posicao normalizada do mouse (-1..1), amortecida por spring para nunca seguir "duro"
  const pointerX = useMotionValue(0);
  const pointerY = useMotionValue(0);
  const springX = useSpring(pointerX, { stiffness: 55, damping: 16, mass: 0.4 });
  const springY = useSpring(pointerY, { stiffness: 55, damping: 16, mass: 0.4 });

  // Deslocamento maximo de parallax por personagem (eixo Y reduzido para manter sutileza)
  const useDepth = (max: number) => ({
    x: useTransform(springX, (v) => v * max),
    y: useTransform(springY, (v) => v * max * 0.6),
  });

  const blueDepth = useDepth(3);
  const violetDepth = useDepth(10);
  const inkDepth = useDepth(5);
  const skyDepth = useDepth(7);
  // Olhos acompanham o personagem + um extra pequeno, dando a sensacao de "olhar" para o cursor
  const blueEyesDepth = useDepth(4.5);
  const violetEyesDepth = useDepth(12);
  const inkEyesDepth = useDepth(6.5);

  function handleMouseMove(event: React.MouseEvent<HTMLDivElement>) {
    if (!parallaxEnabled || !areaRef.current) return;
    const rect = areaRef.current.getBoundingClientRect();
    pointerX.set(((event.clientX - rect.left) / rect.width) * 2 - 1);
    pointerY.set(((event.clientY - rect.top) / rect.height) * 2 - 1);
  }

  function handleMouseLeave() {
    pointerX.set(0);
    pointerY.set(0);
  }

  // Loops de vida (respiracao/balanco). Com prefers-reduced-motion ficam desligados.
  const blueBreathe = reduceMotion
    ? undefined
    : {
        y: [0, -5, 0],
        scaleY: [1, 1.05, 1],
        transition: { duration: 3.6, repeat: Infinity, ease: 'easeInOut' as const },
      };

  const violetSway = reduceMotion
    ? { rotate: 1.5 }
    : {
        rotate: [2, -2, 2],
        y: [0, -8, 0],
        transition: { duration: 4.2, repeat: Infinity, ease: 'easeInOut' as const, delay: 0.3 },
      };

  // Escuro e o mais estavel da cena: oscilacao vertical minima
  const inkIdle = reduceMotion
    ? { rotate: -2 }
    : {
        rotate: [-2, -1.2, -2],
        y: [0, -3, 0],
        transition: { duration: 5.5, repeat: Infinity, ease: 'easeInOut' as const, delay: 0.9 },
      };

  const skySway = reduceMotion
    ? undefined
    : {
        x: [0, 6, 0],
        y: [0, -3, 0],
        transition: { duration: 3.6, repeat: Infinity, ease: 'easeInOut' as const, delay: 0.6 },
      };

  // Piscadas rapidas (~150ms) e raras, cada personagem com cadencia e atraso proprios
  const blink = (repeatDelay: number, delay: number) =>
    reduceMotion
      ? undefined
      : {
          scaleY: [1, 0.15, 1],
          transition: { duration: 0.15, repeat: Infinity, repeatDelay, delay, ease: 'easeInOut' as const },
        };

  // Loops dos grupos de olhos seguem o corpo do personagem para nao "descolar"
  const followBlue = reduceMotion
    ? undefined
    : { y: [0, -5, 0], transition: { duration: 3.6, repeat: Infinity, ease: 'easeInOut' as const } };
  const followViolet = reduceMotion
    ? undefined
    : { y: [0, -8, 0], transition: { duration: 4.2, repeat: Infinity, ease: 'easeInOut' as const, delay: 0.3 } };
  const followInk = reduceMotion
    ? undefined
    : { y: [0, -3, 0], transition: { duration: 5.5, repeat: Infinity, ease: 'easeInOut' as const, delay: 0.9 } };
  const followSky = reduceMotion
    ? undefined
    : {
        x: [0, 6, 0],
        y: [0, -3, 0],
        scaleX: [1, 1.08, 1],
        transition: { duration: 3.6, repeat: Infinity, ease: 'easeInOut' as const, delay: 0.6 },
      };

  return (
    <div
      ref={areaRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className="flex h-full w-full items-center justify-center"
    >
      <motion.div
        variants={illustrationContainer}
        initial="hidden"
        animate="visible"
        className="relative h-[238px] w-[292px] max-w-full"
        aria-hidden="true"
      >
        {/* 1. Azul brand: baixo e acolhedor, respira pela base */}
        <motion.div variants={enterBlue} className="absolute bottom-[48px] left-[24px] h-[72px] w-[132px]">
          <motion.div style={blueDepth} className="h-full w-full">
            <motion.div
              animate={blueBreathe}
              className="h-full w-full origin-bottom rounded-t-full will-change-transform"
              style={{ backgroundColor: brandBlue }}
            />
          </motion.div>
        </motion.div>

        {/* 2. Violeta: personagem principal, balanca para os lados */}
        <motion.div variants={enterViolet} className="absolute bottom-[78px] left-[106px] h-[124px] w-[72px]">
          <motion.div style={violetDepth} className="h-full w-full">
            <motion.div
              animate={violetSway}
              className="h-full w-full origin-bottom rounded-[4px] will-change-transform"
              style={{ backgroundColor: brandViolet }}
            />
          </motion.div>
        </motion.div>

        {/* 3. Escuro: sobreposto, serio e estavel */}
        <motion.div variants={enterInk} className="absolute bottom-[78px] left-[166px] h-[96px] w-[56px]">
          <motion.div style={inkDepth} className="h-full w-full">
            <motion.div
              animate={inkIdle}
              className="h-full w-full origin-bottom rounded-[4px] will-change-transform"
              style={{ backgroundColor: ink }}
            />
          </motion.div>
        </motion.div>

        {/* 4. Azul claro: leve, balanca na horizontal */}
        <motion.div variants={enterSky} className="absolute bottom-[48px] right-[22px] h-[88px] w-[62px]">
          <motion.div style={skyDepth} className="h-full w-full">
            <motion.div
              animate={skySway}
              className="h-full w-full rounded-l-[28px] rounded-r-full will-change-transform"
              style={{ backgroundColor: brandSky }}
            />
          </motion.div>
        </motion.div>

        {/* Olhos do azul (3 pontos) */}
        <motion.div variants={enterDetail} className="absolute bottom-[96px] left-[94px]">
          <motion.div style={blueEyesDepth}>
            <motion.div animate={followBlue} className="flex gap-[18px] will-change-transform">
              <motion.span animate={blink(4.6, 1.2)} className="h-[5px] w-[5px] rounded-full bg-white/95" />
              <motion.span animate={blink(4.6, 1.2)} className="h-[5px] w-[5px] rounded-full bg-white/95" />
              <motion.span animate={blink(4.6, 1.2)} className="h-[5px] w-[5px] rounded-full bg-white/95" />
            </motion.div>
          </motion.div>
        </motion.div>

        {/* Olhos do violeta */}
        <motion.div variants={enterDetail} className="absolute bottom-[130px] left-[126px]">
          <motion.div style={violetEyesDepth}>
            <motion.div animate={followViolet} className="flex gap-4 will-change-transform">
              <motion.span animate={blink(4, 0.6)} className="h-[5px] w-[3px] rounded-full bg-white/90" />
              <motion.span animate={blink(4, 0.6)} className="h-[5px] w-[3px] rounded-full bg-white/90" />
            </motion.div>
          </motion.div>
        </motion.div>

        {/* Olhos do escuro */}
        <motion.div variants={enterDetail} className="absolute bottom-[124px] left-[186px]">
          <motion.div style={inkEyesDepth}>
            <motion.div animate={followInk} className="flex gap-3 will-change-transform">
              <motion.span animate={blink(5, 2.3)} className="h-[5px] w-[5px] rounded-full bg-white/90" />
              <motion.span animate={blink(5, 2.3)} className="h-[5px] w-[5px] rounded-full bg-white/90" />
            </motion.div>
          </motion.div>
        </motion.div>

        {/* Boca do azul */}
        <motion.div variants={enterDetail} className="absolute bottom-[98px] left-[112px]">
          <motion.div style={blueEyesDepth}>
            <motion.span
              animate={followBlue}
              className="block h-[3px] w-[14px] rounded-full bg-white/95 will-change-transform"
            />
          </motion.div>
        </motion.div>

        {/* Detalhe lateral do azul claro: oscila junto com o personagem */}
        <motion.div variants={enterDetail} className="absolute bottom-[96px] right-[24px]">
          <motion.div style={skyDepth}>
            <motion.span
              animate={followSky}
              className="block h-[2px] w-[34px] origin-left will-change-transform"
              style={{ backgroundColor: ink }}
            />
          </motion.div>
        </motion.div>
      </motion.div>
    </div>
  );
}

export default function LoginPage() {
  const navigate = useNavigate();
  const reduceMotion = useReducedMotion();
  const [showPass, setShowPass] = useState(false);
  const [banNotice, setBanNotice] = useState<{ reason?: string | null; expiresAt?: string | null } | null>(null);
  const setUser = useAuthStore((state) => state.setUser);
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({ resolver: zodResolver(schema) });

  async function onSubmit(data: FormData) {
    try {
      const session = await login(data.email, data.password);
      setUser(session.user);
      navigate(session.user.subscriptionStatus === 'active' ? '/app/dashboard' : '/app/billing');
    } catch (error: any) {
      if (error?.code === 'BAN_ACTIVE') {
        setBanNotice({ reason: error.banReason, expiresAt: error.banExpiresAt });
        return;
      }
      toast.error(parseFirebaseError(error.code));
    }
  }

  // Cascata do formulario: logo -> titulo -> subtitulo -> inputs -> acoes -> rodape
  const formContainer: Variants = {
    hidden: {},
    visible: { transition: { staggerChildren: 0.08, delayChildren: 0.35 } },
  };
  const formItem: Variants = reduceMotion
    ? { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { duration: 0.4 } } }
    : { hidden: { opacity: 0, y: 8 }, visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: easePremium } } };

  if (banNotice) {
    return <BannedAccountNotice reason={banNotice.reason} expiresAt={banNotice.expiresAt} />;
  }

  return (
    <main className="six3-grid-bg flex min-h-screen items-center justify-center overflow-x-hidden bg-surface px-4 py-8 sm:px-6">
      <motion.section
        initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 18, scale: 0.96 }}
        animate={reduceMotion ? { opacity: 1 } : { opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.8, ease: easePremium }}
        className="relative z-10 grid w-full max-w-[820px] overflow-hidden rounded-[12px] bg-white shadow-[0_30px_90px_-20px_rgba(59,109,255,0.35)] ring-1 ring-white/10 md:grid-cols-2"
      >
        <div className="relative flex min-h-[260px] items-center justify-center bg-brand-50 p-8 sm:min-h-[330px] md:min-h-[520px] md:p-10">
          <LoginIllustration />
        </div>

        <div className="flex min-h-[460px] items-center justify-center bg-white px-7 py-10 sm:px-10 md:min-h-[520px]">
          <div className="w-full max-w-[282px]">
            <motion.form
              variants={formContainer}
              initial="hidden"
              animate="visible"
              onSubmit={handleSubmit(onSubmit)}
              className="space-y-5"
              noValidate
            >
              <div className="text-center">
                <motion.div
                  variants={formItem}
                  className="mx-auto mb-7 flex h-9 w-9 items-center justify-center rounded-full bg-gradient-brand text-white shadow-glow"
                  aria-hidden="true"
                >
                  <Sparkles className="h-[18px] w-[18px]" />
                </motion.div>
                <motion.h1 variants={formItem} className="text-[22px] font-extrabold leading-tight text-neutral-950">
                  Welcome back!
                </motion.h1>
                <motion.p variants={formItem} className="mt-1 text-[11px] font-medium text-neutral-500">
                  Please enter your details
                </motion.p>
              </div>

              <div className="space-y-4 pt-1">
                <motion.label variants={formItem} className="block">
                  <span className="text-[11px] font-semibold text-neutral-800">Email</span>
                  <input
                    type="email"
                    autoComplete="email"
                    placeholder="example@email.com"
                    className="mt-1 w-full border-0 border-b border-neutral-300 bg-transparent px-0 py-1.5 text-[12px] font-medium text-neutral-950 outline-none transition-colors duration-200 placeholder:text-neutral-400 autofill:shadow-[inset_0_0_0_1000px_#ffffff] autofill:[-webkit-text-fill-color:#0a0a0a] focus:border-brand-500 focus:ring-0"
                    {...register('email')}
                  />
                  {errors.email && <p className="mt-1 text-[11px] text-red-500">{errors.email.message}</p>}
                </motion.label>

                <motion.label variants={formItem} className="block">
                  <span className="text-[11px] font-semibold text-neutral-800">Password</span>
                  <div className="relative">
                    <input
                      type={showPass ? 'text' : 'password'}
                      autoComplete="current-password"
                      placeholder="********"
                      className="mt-1 w-full border-0 border-b border-neutral-300 bg-transparent px-0 py-1.5 pr-9 text-[12px] font-medium text-neutral-950 outline-none transition-colors duration-200 placeholder:text-neutral-400 autofill:shadow-[inset_0_0_0_1000px_#ffffff] autofill:[-webkit-text-fill-color:#0a0a0a] focus:border-brand-500 focus:ring-0"
                      {...register('password')}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPass(!showPass)}
                      aria-label={showPass ? 'Ocultar senha' : 'Mostrar senha'}
                      className="absolute bottom-1.5 right-0 flex h-6 w-6 items-center justify-center text-neutral-500 transition hover:text-brand-600 focus:outline-none focus-visible:text-brand-600"
                    >
                      {showPass ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                    </button>
                  </div>
                  {errors.password && <p className="mt-1 text-[11px] text-red-500">{errors.password.message}</p>}
                </motion.label>
              </div>

              <motion.div variants={formItem} className="flex items-center justify-between gap-3 text-[10px]">
                <label className="flex min-w-0 cursor-pointer items-center gap-1.5 text-neutral-600">
                  <input
                    type="checkbox"
                    className="h-3 w-3 shrink-0 rounded-[2px] border-neutral-300 accent-brand-600 focus:ring-brand-500"
                  />
                  <span className="truncate">Remember for 30 days</span>
                </label>

                <Link
                  to="/forgot-password"
                  className="shrink-0 text-neutral-500 transition hover:text-brand-600"
                >
                  Forgot password?
                </Link>
              </motion.div>

              <div className="space-y-3 pt-1">
                <motion.button
                  variants={formItem}
                  type="submit"
                  disabled={isSubmitting}
                  className="six3-btn-shine h-9 w-full rounded-full bg-gradient-brand text-[12px] font-bold text-white shadow-glow ring-1 ring-white/[0.16] transition hover:shadow-[0_22px_70px_-26px_rgba(139,92,246,0.95)] focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSubmitting ? (
                    <span className="inline-flex items-center gap-2">
                      <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                      Logging in...
                    </span>
                  ) : (
                    'Log In'
                  )}
                </motion.button>

                {/*
                  Login com Google ainda nao existe no backend (authService so expoe login por e-mail/senha).
                  Para integrar: criar signInWithGoogle() em src/services/authService.ts e chamar aqui no onClick,
                  seguindo o mesmo fluxo de onSubmit (setUser + navigate).
                */}
                <motion.button
                  variants={formItem}
                  type="button"
                  onClick={() => toast.error('Login com Google ainda nao disponivel')}
                  className="inline-flex h-9 w-full items-center justify-center gap-2 rounded-full bg-neutral-100 text-[12px] font-bold text-neutral-800 transition hover:bg-neutral-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 active:scale-[0.98]"
                >
                  <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.1A6.6 6.6 0 0 1 5.49 12c0-.73.13-1.43.35-2.1V7.06H2.18A11 11 0 0 0 1 12c0 1.77.43 3.45 1.18 4.94l3.66-2.84z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.16-3.16A11 11 0 0 0 12 1 11 11 0 0 0 2.18 7.06l3.66 2.84C6.71 7.3 9.14 5.38 12 5.38z" />
                  </svg>
                  Log in with Google
                </motion.button>
              </div>

              <motion.p variants={formItem} className="pt-5 text-center text-[10px] text-neutral-500">
                Don&apos;t have an account?{' '}
                <Link to="/register" className="font-semibold text-brand-600 transition hover:underline">
                  Sign Up
                </Link>
              </motion.p>
            </motion.form>

            <LoginSupportChat variant="floating" />
          </div>
        </div>
      </motion.section>
    </main>
  );
}
