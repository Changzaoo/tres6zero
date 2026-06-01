import { LockKeyhole } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/Button';

export default function LockedFeaturePage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="max-w-md text-center rounded-2xl border border-white/[0.08] bg-gradient-glass p-8">
        <div className="mx-auto mb-5 w-16 h-16 rounded-2xl bg-yellow-500/15 border border-yellow-500/25 flex items-center justify-center">
          <LockKeyhole className="w-8 h-8 text-yellow-400" />
        </div>
        <h1 className="text-2xl font-bold text-white">Recurso bloqueado</h1>
        <p className="text-white/50 mt-3 text-sm">
          Sua conta já pode entrar, mas esta área só libera depois da confirmação do pagamento.
        </p>
        <Button className="mt-6 justify-center" onClick={() => navigate('/app/billing')}>
          Ver planos
        </Button>
      </div>
    </div>
  );
}
