import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion, useReducedMotion, type Variants } from 'framer-motion';
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

const illustrationContainer: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1, delayChildren: 0.18 } },
};

const shapeEnter: Variants = {
  hidden: { opacity: 0, scale: 0.9, y: 24 },
  visible: { opacity: 1, scale: 1, y: 0, transition: { duration: 0.48, ease: 'easeOut' } },
};

function LoginIllustration() {
  const reduceMotion = useReducedMotion();

  const breathe = (delay: number, amount = 4, duration = 4.6) =>
    reduceMotion
      ? undefined
      : { y: [0, -amount, 0], transition: { duration, repeat: Infinity, ease: 'easeInOut' as const, delay } };

  const sway = (from: number, to: number, delay: number, duration = 5.2) =>
    reduceMotion
      ? { rotate: from }
      : {
          rotate: [from, to, from],
          y: [0, -5, 0],
          transition: { duration, repeat: Infinity, ease: 'easeInOut' as const, delay },
        };

  const blink = reduceMotion
    ? undefined
    : {
        scaleY: [1, 1, 0.1, 1],
        transition: {
          duration: 0.45,
          times: [0, 0.72, 0.84, 1],
          repeat: Infinity,
          repeatDelay: 3.4,
          ease: 'easeInOut' as const,
        },
      };

  return (
    <motion.div
      variants={illustrationContainer}
      initial="hidden"
      animate="visible"
      className="relative h-[238px] w-[292px] max-w-full"
      aria-hidden="true"
    >
      <motion.div variants={shapeEnter} className="absolute bottom-[48px] left-[24px] h-[72px] w-[132px]">
        <motion.div
          animate={reduceMotion ? undefined : { scaleY: [1, 1.04, 1] }}
          transition={reduceMotion ? undefined : { duration: 4.1, repeat: Infinity, ease: 'easeInOut' }}
          className="h-full w-full origin-bottom rounded-t-full bg-[#ff8a22]"
        />
      </motion.div>

      <motion.div variants={shapeEnter} className="absolute bottom-[78px] left-[106px] h-[124px] w-[72px]">
        <motion.div animate={sway(1.5, 3.5, 0.25, 5.4)} className="h-full w-full origin-bottom rounded-[4px] bg-[#6236ff]" />
      </motion.div>

      <motion.div variants={shapeEnter} className="absolute bottom-[78px] left-[166px] h-[96px] w-[56px]">
        <motion.div animate={sway(-2.5, -1, 0.85, 6.2)} className="h-full w-full origin-bottom rounded-[4px] bg-[#111111]" />
      </motion.div>

      <motion.div variants={shapeEnter} className="absolute bottom-[48px] right-[22px] h-[88px] w-[62px]">
        <motion.div
          animate={breathe(0.65, 5, 4.9)}
          className="h-full w-full rounded-l-[28px] rounded-r-full bg-[#f4c400]"
        />
      </motion.div>

      <motion.div variants={shapeEnter} className="absolute bottom-[96px] left-[94px]">
        <motion.div animate={breathe(0.35, 4)} className="flex gap-[18px]">
          <motion.span animate={blink} className="h-[5px] w-[5px] rounded-full bg-[#121212]" />
          <motion.span animate={blink} className="h-[5px] w-[5px] rounded-full bg-[#121212]" />
          <motion.span animate={blink} className="h-[5px] w-[5px] rounded-full bg-[#121212]" />
        </motion.div>
      </motion.div>

      <motion.div variants={shapeEnter} className="absolute bottom-[130px] left-[126px]">
        <motion.div animate={breathe(0.3, 3)} className="flex gap-4">
          <motion.span animate={blink} className="h-[5px] w-[3px] rounded-full bg-white/90" />
          <motion.span animate={blink} className="h-[5px] w-[3px] rounded-full bg-white/90" />
        </motion.div>
      </motion.div>

      <motion.div variants={shapeEnter} className="absolute bottom-[124px] left-[186px]">
        <motion.div animate={breathe(0.75, 3, 6)} className="flex gap-3">
          <motion.span animate={blink} className="h-[5px] w-[5px] rounded-full bg-white/90" />
          <motion.span animate={blink} className="h-[5px] w-[5px] rounded-full bg-white/90" />
        </motion.div>
      </motion.div>

      <motion.div variants={shapeEnter} className="absolute bottom-[98px] left-[112px]">
        <motion.span animate={breathe(0.45, 4)} className="block h-[3px] w-[14px] rounded-full bg-[#121212]" />
      </motion.div>

      <motion.div variants={shapeEnter} className="absolute bottom-[96px] right-[24px]">
        <motion.span animate={breathe(0.65, 5, 4.9)} className="block h-[2px] w-[34px] bg-[#121212]" />
      </motion.div>
    </motion.div>
  );
}

export default function LoginPage() {
  const navigate = useNavigate();
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

  if (banNotice) {
    return <BannedAccountNotice reason={banNotice.reason} expiresAt={banNotice.expiresAt} />;
  }

  return (
    <main className="flex min-h-screen items-center justify-center overflow-x-hidden bg-[#18181d] px-4 py-8 sm:px-6">
      <motion.section
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="grid w-full max-w-[820px] overflow-hidden rounded-[12px] bg-white shadow-[0_26px_80px_rgba(0,0,0,0.45)] ring-1 ring-white/10 md:grid-cols-2"
      >
        <div className="relative flex min-h-[260px] items-center justify-center bg-[#eeeeee] p-8 sm:min-h-[330px] md:min-h-[520px] md:p-10">
          <LoginIllustration />
        </div>

        <div className="flex min-h-[460px] items-center justify-center bg-white px-7 py-10 sm:px-10 md:min-h-[520px]">
          <div className="w-full max-w-[282px]">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
              <div className="text-center">
                <div className="mx-auto mb-7 flex h-7 w-7 items-center justify-center text-black" aria-hidden="true">
                  <Sparkles className="h-5 w-5 fill-black stroke-[2.4]" />
                </div>
                <h1 className="text-[22px] font-extrabold leading-tight text-neutral-950">Welcome back!</h1>
                <p className="mt-1 text-[11px] font-medium text-neutral-500">Please enter your details</p>
              </div>

              <div className="space-y-4 pt-1">
                <label className="block">
                  <span className="text-[11px] font-semibold text-neutral-800">Email</span>
                  <input
                    type="email"
                    autoComplete="email"
                    placeholder="example@email.com"
                    className="mt-1 w-full border-0 border-b border-neutral-300 bg-transparent px-0 py-1.5 text-[12px] font-medium text-neutral-950 outline-none transition placeholder:text-neutral-400 autofill:shadow-[inset_0_0_0_1000px_#ffffff] autofill:[-webkit-text-fill-color:#0a0a0a] focus:border-neutral-950 focus:ring-0"
                    {...register('email')}
                  />
                  {errors.email && <p className="mt-1 text-[11px] text-red-500">{errors.email.message}</p>}
                </label>

                <label className="block">
                  <span className="text-[11px] font-semibold text-neutral-800">Password</span>
                  <div className="relative">
                    <input
                      type={showPass ? 'text' : 'password'}
                      autoComplete="current-password"
                      placeholder="********"
                      className="mt-1 w-full border-0 border-b border-neutral-300 bg-transparent px-0 py-1.5 pr-9 text-[12px] font-medium text-neutral-950 outline-none transition placeholder:text-neutral-400 autofill:shadow-[inset_0_0_0_1000px_#ffffff] autofill:[-webkit-text-fill-color:#0a0a0a] focus:border-neutral-950 focus:ring-0"
                      {...register('password')}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPass(!showPass)}
                      aria-label={showPass ? 'Ocultar senha' : 'Mostrar senha'}
                      className="absolute bottom-1.5 right-0 flex h-6 w-6 items-center justify-center text-neutral-500 transition hover:text-neutral-950 focus:outline-none focus-visible:text-neutral-950"
                    >
                      {showPass ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                    </button>
                  </div>
                  {errors.password && <p className="mt-1 text-[11px] text-red-500">{errors.password.message}</p>}
                </label>
              </div>

              <div className="flex items-center justify-between gap-3 text-[10px]">
                <label className="flex min-w-0 cursor-pointer items-center gap-1.5 text-neutral-600">
                  <input
                    type="checkbox"
                    className="h-3 w-3 shrink-0 rounded-[2px] border-neutral-300 text-neutral-950 accent-neutral-950 focus:ring-neutral-950"
                  />
                  <span className="truncate">Remember for 30 days</span>
                </label>

                <Link
                  to="/forgot-password"
                  className="shrink-0 text-neutral-500 transition hover:text-neutral-950"
                >
                  Forgot password?
                </Link>
              </div>

              <div className="space-y-3 pt-1">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="h-9 w-full rounded-full bg-black text-[12px] font-bold text-white transition hover:bg-neutral-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-950 focus-visible:ring-offset-2 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSubmitting ? (
                    <span className="inline-flex items-center gap-2">
                      <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                      Logging in...
                    </span>
                  ) : (
                    'Log In'
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => toast.error('Login com Google ainda nao disponivel')}
                  className="inline-flex h-9 w-full items-center justify-center gap-2 rounded-full bg-neutral-100 text-[12px] font-bold text-neutral-800 transition hover:bg-neutral-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-950 focus-visible:ring-offset-2 active:scale-[0.99]"
                >
                  <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.1A6.6 6.6 0 0 1 5.49 12c0-.73.13-1.43.35-2.1V7.06H2.18A11 11 0 0 0 1 12c0 1.77.43 3.45 1.18 4.94l3.66-2.84z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.16-3.16A11 11 0 0 0 12 1 11 11 0 0 0 2.18 7.06l3.66 2.84C6.71 7.3 9.14 5.38 12 5.38z" />
                  </svg>
                  Log in with Google
                </button>
              </div>

              <p className="pt-5 text-center text-[10px] text-neutral-500">
                Don&apos;t have an account?{' '}
                <Link to="/register" className="font-semibold text-neutral-950 transition hover:underline">
                  Sign Up
                </Link>
              </p>
            </form>

            <LoginSupportChat variant="floating" />
          </div>
        </div>
      </motion.section>
    </main>
  );
}
