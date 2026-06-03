import { useNavigate } from 'react-router-dom';
import { ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useAuthStore } from '@/store/authStore';

function formatBanDate(value?: string | null) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(date);
}

export function BannedAccountNotice({ reason, expiresAt }: { reason?: string | null; expiresAt?: string | null }) {
  const reset = useAuthStore((state) => state.reset);
  const navigate = useNavigate();
  const expiration = formatBanDate(expiresAt);

  function handleOtherAccount() {
    reset();
    navigate('/login', { replace: true });
  }

  return (
    <div className="six3-grid-bg flex min-h-screen items-center justify-center bg-surface p-4">
      <div className="six3-glass w-full max-w-md p-6 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-red-300/20 bg-red-500/12 text-red-100">
          <ShieldAlert className="h-7 w-7" />
        </div>
        <h1 className="text-xl font-bold text-white">Sua conta foi suspensa.</h1>
        {reason && <p className="mt-3 text-sm leading-relaxed text-white/58">{reason}</p>}
        {expiration && <p className="mt-2 text-sm text-white/42">Suspensao expira em {expiration}.</p>}
        {!expiration && <p className="mt-2 text-sm text-white/42">Suspensao permanente ate revisao administrativa.</p>}
        <Button onClick={handleOtherAccount} className="mt-6 w-full justify-center">
          Entrar com outra conta
        </Button>
      </div>
    </div>
  );
}
