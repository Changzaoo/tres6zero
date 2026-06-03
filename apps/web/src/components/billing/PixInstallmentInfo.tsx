import { AlertTriangle, CheckCircle2, Copy, CreditCard, QrCode, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/Button';

type PixInstallmentInfoProps = {
  pixCode?: string | null;
  onCopyPix?: () => void;
  onShowQrCode?: () => void;
  onClose?: () => void;
  copyDisabled?: boolean;
};

export function PixInstallmentInfo({
  pixCode,
  onCopyPix,
  onShowQrCode,
  onClose,
  copyDisabled,
}: PixInstallmentInfoProps) {
  const canCopy = Boolean(pixCode && onCopyPix && !copyDisabled);

  return (
    <section className="rounded-2xl border border-sky-300/18 bg-sky-400/[0.07] p-4 text-left shadow-[0_18px_70px_-50px_rgba(56,189,248,0.65)]">
      <div className="flex min-w-0 items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sky-400/12 text-sky-200">
          <CreditCard className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-normal text-sky-100/65">Pix parcelado com cartão</p>
          <h3 className="mt-1 text-base font-bold leading-tight text-white">Quer pagar com cartão de crédito?</h3>
          <p className="mt-2 text-sm leading-relaxed text-white/68">
            A SIX3° recebe pagamentos via Pix. Se você quiser usar cartão de crédito, alguns bancos e carteiras digitais permitem fazer Pix parcelado no cartão. Basta copiar o código Pix ou escanear o QR Code no app do seu banco e escolher a opção de parcelamento, se ela estiver disponível para você.
          </p>
          <div className="mt-3 rounded-xl border border-amber-300/20 bg-amber-300/[0.08] p-3 text-xs leading-relaxed text-amber-50/82">
            <div className="mb-1 flex items-center gap-2 font-semibold text-amber-100">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              Taxas do banco
            </div>
            A disponibilidade, juros, taxas e quantidade de parcelas dependem exclusivamente do seu banco ou carteira digital. A SIX3° não controla essas condições.
          </div>

          <div className="mt-3 grid gap-2 text-xs leading-relaxed text-white/60 sm:grid-cols-2">
            <span className="inline-flex items-start gap-2">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" />
              Não armazenamos dados de cartão.
            </span>
            <span className="inline-flex items-start gap-2">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" />
              O pagamento é confirmado automaticamente via Pix.
            </span>
            <span className="inline-flex items-start gap-2">
              <CreditCard className="mt-0.5 h-4 w-4 shrink-0 text-sky-200" />
              Se seu banco oferecer Pix parcelado, você pode parcelar usando o cartão diretamente no aplicativo do banco.
            </span>
            <span className="inline-flex items-start gap-2">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-200" />
              Taxas e parcelas são definidas pelo seu banco.
            </span>
          </div>
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <Button
          type="button"
          size="sm"
          className="justify-center"
          variant="primary"
          icon={<Copy className="h-4 w-4" />}
          disabled={!canCopy}
          onClick={onCopyPix}
        >
          Copiar código Pix
        </Button>
        <Button
          type="button"
          size="sm"
          className="justify-center"
          variant="secondary"
          icon={<QrCode className="h-4 w-4" />}
          disabled={!onShowQrCode}
          onClick={onShowQrCode}
        >
          Ver QR Code Pix
        </Button>
        {onClose && (
          <Button type="button" size="sm" className="justify-center" variant="ghost" onClick={onClose}>
            Entendi
          </Button>
        )}
      </div>
    </section>
  );
}
