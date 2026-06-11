import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion } from 'framer-motion';
import { Eye, EyeOff } from 'lucide-react';
import { login, parseFirebaseError } from '@/services/authService';
import { useAuthStore } from '@/store/authStore';
import { toast } from '@/components/ui/Toast';
import { LoginSupportChat } from '@/components/support/LoginSupportChat';
import { BannedAccountNotice } from '@/components/auth/BannedAccountNotice';

const schema = z.object({
  email: z.string().email('E-mail inválido'),
  password: z.string().min(6, 'Mínimo 6 caracteres'),
});

type FormData = z.infer<typeof schema>;

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
    <main className="flex min-h-screen items-center justify-center overflow-x-hidden bg-[#18181d] px-4 py-10">
      <motion.section
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="grid w-full max-w-5xl overflow-hidden rounded-[28px] bg-white shadow-2xl shadow-black/40 md:grid-cols-2"
      >
        {/* Coluna esquerda — ilustração abstrata */}
        <div className="relative hidden min-h-[360px] items-center justify-center bg-[#f1f1f1] p-10 sm:flex md:min-h-full">
          <div className="relative h-56 w-72" aria-hidden="true">
            <div className="absolute bottom-0 left-4 h-28 w-36 rounded-t-full bg-orange-400" />
            <div className="absolute bottom-0 left-28 h-48 w-24 rotate-3 rounded-md bg-violet-600" />
            <div className="absolute bottom-0 left-44 h-40 w-20 -rotate-3 rounded-md bg-neutral-950" />
            <div className="absolute bottom-0 right-4 h-32 w-24 rounded-l-3xl rounded-r-full bg-yellow-400" />

            <span className="absolute bottom-20 left-24 h-2 w-2 rounded-full bg-neutral-900" />
            <span className="absolute bottom-20 left-32 h-2 w-2 rounded-full bg-neutral-900" />
            <span className="absolute bottom-20 left-40 h-2 w-2 rounded-full bg-neutral-900" />

            <span className="absolute bottom-20 right-2 h-0.5 w-10 bg-neutral-900" />
            <span className="absolute left-44 top-12 h-4 w-1 rounded-full bg-neutral-900" />
            <span className="absolute left-52 top-12 h-2 w-1 rounded-full bg-neutral-900" />
          </div>
        </div>

        {/* Coluna direita — formulário */}
        <div className="flex min-h-[560px] items-center justify-center px-6 py-12 sm:px-8">
          <div className="w-full max-w-sm">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6" noValidate>
              <div className="text-center">
                {/* Logo em chip escuro: o wordmark "SIX3" do PNG é branco e precisa de fundo escuro */}
                <div className="mx-auto mb-8 inline-flex h-12 items-center justify-center overflow-hidden rounded-full bg-[#18181d] px-5">
                  <img
                    src="/brand/six3-logo.png"
                    alt="SIX3"
                    className="h-16 w-auto max-w-none select-none object-contain"
                    draggable={false}
                  />
                </div>
                <h1 className="text-3xl font-bold tracking-tight text-neutral-950">Welcome back!</h1>
                <p className="mt-2 text-sm text-neutral-500">Please enter your details</p>
              </div>

              <div className="space-y-5">
                <label className="block">
                  <span className="text-xs font-medium text-neutral-700">Email</span>
                  <input
                    type="email"
                    autoComplete="email"
                    placeholder="seu@email.com"
                    className="mt-1 w-full border-0 border-b border-neutral-300 bg-transparent px-0 py-2 text-sm text-neutral-950 outline-none transition placeholder:text-neutral-400 focus:border-neutral-950 focus:ring-0"
                    {...register('email')}
                  />
                  {errors.email && <p className="mt-1 text-xs text-red-500">{errors.email.message}</p>}
                </label>

                <label className="block">
                  <span className="text-xs font-medium text-neutral-700">Password</span>
                  <div className="relative">
                    <input
                      type={showPass ? 'text' : 'password'}
                      autoComplete="current-password"
                      placeholder="••••••••"
                      className="mt-1 w-full border-0 border-b border-neutral-300 bg-transparent px-0 py-2 pr-10 text-sm text-neutral-950 outline-none transition placeholder:text-neutral-400 focus:border-neutral-950 focus:ring-0"
                      {...register('password')}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPass(!showPass)}
                      aria-label={showPass ? 'Ocultar senha' : 'Mostrar senha'}
                      className="absolute bottom-2 right-0 text-neutral-400 transition hover:text-neutral-950 focus:outline-none focus-visible:text-neutral-950"
                    >
                      {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {errors.password && <p className="mt-1 text-xs text-red-500">{errors.password.message}</p>}
                </label>
              </div>

              <div className="flex items-center justify-between text-xs">
                {/* "Remember" é apenas visual por enquanto: a sessão já persiste via authService/localStorage */}
                <label className="flex cursor-pointer items-center gap-2 text-neutral-600">
                  <input
                    type="checkbox"
                    className="h-3.5 w-3.5 rounded border-neutral-300 text-neutral-950 accent-neutral-950 focus:ring-neutral-950"
                  />
                  Remember for 30 days
                </label>

                <Link
                  to="/forgot-password"
                  className="text-neutral-500 transition hover:text-neutral-950"
                >
                  Forgot password?
                </Link>
              </div>

              <div className="space-y-3">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full rounded-full bg-black py-3 text-sm font-semibold text-white transition hover:bg-neutral-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-950 focus-visible:ring-offset-2 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSubmitting ? (
                    <span className="inline-flex items-center gap-2">
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                      Logging in…
                    </span>
                  ) : (
                    'Log In'
                  )}
                </button>

                {/*
                  Login com Google ainda não existe no backend (authService só expõe login por e-mail/senha).
                  Para integrar: criar signInWithGoogle() em src/services/authService.ts e chamar aqui no onClick,
                  seguindo o mesmo fluxo de onSubmit (setUser + navigate).
                */}
                <button
                  type="button"
                  onClick={() => toast.error('Login com Google ainda não disponível')}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-neutral-100 py-3 text-sm font-semibold text-neutral-800 transition hover:bg-neutral-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-950 focus-visible:ring-offset-2 active:scale-[0.99]"
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

              <p className="pt-6 text-center text-xs text-neutral-500">
                Don&apos;t have an account?{' '}
                <Link to="/register" className="font-semibold text-neutral-950 transition hover:underline">
                  Sign Up
                </Link>
              </p>
            </form>

            <LoginSupportChat />
          </div>
        </div>
      </motion.section>
    </main>
  );
}
