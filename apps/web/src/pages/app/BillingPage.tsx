import { useEffect, useRef, useState } from 'react';
import { CheckCircle2, Copy, Loader2, LockKeyhole, QrCode, TriangleAlert } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { PlanCards } from '@/components/billing/PlanCards';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { toast } from '@/components/ui/Toast';
import { useAuth } from '@/hooks/useAuth';
import { useAuthStore } from '@/store/authStore';
import { createPixPayment, getPixPayment, type PixPayment } from '@/services/billingService';
import { getCurrentUser } from '@/services/authService';
import type { PlanId } from '@/config/plans';

function formatDate(value?: string | null) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeZone: 'UTC' }).format(date);
}

function formatPaymentDeadline(value?: string | null) {
  if (!value) return null;
  return new Intl.DateTimeFormat('pt-BR', { timeStyle: 'short' }).format(new Date(value));
}

function normalizeSelectedPlan(planId?: string | null, isAdmin = false): PlanId | null {
  if (isAdmin) return 'unlimited';
  return planId === 'starter' || planId === 'pro' || planId === 'unlimited' ? planId : null;
}

// PixGo exige CPF/CNPJ do pagador a partir de 25/06/2026: o QR Code só pode
// ser pago pelo documento informado. Validação com dígito verificador.
function cpfCheckDigit(digits: number[], factor: number) {
  const sum = digits.reduce((acc, digit, index) => acc + digit * (factor - index), 0);
  const rest = (sum * 10) % 11;
  return rest === 10 ? 0 : rest;
}

function cnpjCheckDigit(digits: number[]) {
  const weights = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2].slice(13 - digits.length);
  const sum = digits.reduce((acc, digit, index) => acc + digit * weights[index], 0);
  const rest = sum % 11;
  return rest < 2 ? 0 : 11 - rest;
}

function isValidCpfOrCnpj(digits: string) {
  if (/^\d{11}$/.test(digits) && !/^(\d)\1{10}$/.test(digits)) {
    const numbers = digits.split('').map(Number);
    return cpfCheckDigit(numbers.slice(0, 9), 10) === numbers[9]
      && cpfCheckDigit(numbers.slice(0, 10), 11) === numbers[10];
  }
  if (/^\d{14}$/.test(digits) && !/^(\d)\1{13}$/.test(digits)) {
    const numbers = digits.split('').map(Number);
    return cnpjCheckDigit(numbers.slice(0, 12)) === numbers[12]
      && cnpjCheckDigit(numbers.slice(0, 13)) === numbers[13];
  }
  return false;
}

function formatPayerDocument(value: string) {
  const digits = value.replace(/\D/g, '').slice(0, 14);
  if (digits.length <= 11) {
    return digits
      .replace(/^(\d{3})(\d)/, '$1.$2')
      .replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3')
      .replace(/^(\d{3})\.(\d{3})\.(\d{3})(\d)/, '$1.$2.$3-$4');
  }
  return digits
    .replace(/^(\d{2})(\d)/, '$1.$2')
    .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/^(\d{2})\.(\d{3})\.(\d{3})(\d)/, '$1.$2.$3/$4')
    .replace(/^(\d{2})\.(\d{3})\.(\d{3})\/(\d{4})(\d)/, '$1.$2.$3/$4-$5');
}

const currencyFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
});

function paymentStatusLabel(status?: PixPayment['status']) {
  if (status === 'completed') return 'Pagamento confirmado';
  if (status === 'expired') return 'Pix expirado';
  if (status === 'cancelled') return 'Pix cancelado';
  if (status === 'refunded') return 'Pagamento estornado';
  if (status === 'failed') return 'Falha no pagamento';
  return 'Aguardando Pix';
}

function paymentStatusTone(status?: PixPayment['status']) {
  if (status === 'completed') return 'border-emerald-300/25 bg-emerald-400/12 text-emerald-100';
  if (status === 'expired' || status === 'cancelled' || status === 'failed') return 'border-amber-300/25 bg-amber-400/12 text-amber-100';
  if (status === 'refunded') return 'border-red-300/25 bg-red-400/12 text-red-100';
  return 'border-brand-300/25 bg-brand-500/12 text-brand-100';
}

export default function BillingPage() {
  const { user, hasActiveSubscription, isAdmin } = useAuth();
  const setUser = useAuthStore((state) => state.setUser);
  const [loadingPlan, setLoadingPlan] = useState<PlanId | null>(null);
  const [payment, setPayment] = useState<PixPayment | null>(null);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [payerOpen, setPayerOpen] = useState(false);
  const [pendingPlanId, setPendingPlanId] = useState<PlanId | null>(null);
  const [payerDocument, setPayerDocument] = useState('');
  const [payerName, setPayerName] = useState('');
  const [payerError, setPayerError] = useState('');
  const [checkingPayment, setCheckingPayment] = useState(false);
  const autoStartedPlan = useRef<PlanId | null>(null);
  const confirmedPaymentRef = useRef<string | null>(null);
  const periodEnd = formatDate(user?.currentPeriodEnd);
  const selectedPlanId = normalizeSelectedPlan(user?.planId || user?.entitlements?.planId, isAdmin);
  const hasSelectedPlan = Boolean(selectedPlanId && (hasActiveSubscription || isAdmin));
  const selectedDescription = isAdmin
    ? 'Seu acesso administrativo e ilimitado.'
    : hasActiveSubscription && periodEnd
      ? `Expira em: ${periodEnd}`
      : hasActiveSubscription
        ? 'Sua plataforma está liberada para operar.'
        : null;

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const checkout = params.get('checkout');
    if (!checkout) return;

    window.history.replaceState({}, '', '/app/billing');

    if (checkout === 'success') {
      toast.info('Pagamento recebido. Assim que o PixGo confirmar, seu acesso será liberado.');
      getCurrentUser().then((freshUser) => {
        if (freshUser) setUser(freshUser);
      });
    }

    if (checkout === 'cancelled') {
      toast.info('Pagamento cancelado.');
    }
  }, [setUser]);

  useEffect(() => {
    if (!paymentOpen || !payment?.paymentId || payment.status !== 'pending') return;

    let cancelled = false;
    const activePaymentId = payment.paymentId;

    async function refreshPaymentStatus(showSpinner = false) {
      try {
        if (showSpinner) setCheckingPayment(true);
        const nextPayment = await getPixPayment(activePaymentId);
        if (cancelled) return;
        setPayment(nextPayment);

        if (nextPayment.status === 'completed' && confirmedPaymentRef.current !== nextPayment.paymentId) {
          confirmedPaymentRef.current = nextPayment.paymentId;
          toast.info('Pagamento Pix confirmado. Seu acesso será atualizado agora.');
          const freshUser = await getCurrentUser();
          if (!cancelled && freshUser) setUser(freshUser);
        }
      } catch {
        // A consulta de status e complementar; o webhook continua sendo a fonte de liberacao.
      } finally {
        if (!cancelled && showSpinner) setCheckingPayment(false);
      }
    }

    const firstCheck = window.setTimeout(() => {
      void refreshPaymentStatus(true);
    }, 2_000);
    const timer = window.setInterval(() => {
      void refreshPaymentStatus(false);
    }, 10_000);
    const onFocus = () => {
      void refreshPaymentStatus(true);
    };
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onFocus);

    return () => {
      cancelled = true;
      window.clearTimeout(firstCheck);
      window.clearInterval(timer);
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onFocus);
    };
  }, [payment?.paymentId, payment?.status, paymentOpen, setUser]);

  function startPixPayment(planId: PlanId) {
    setPendingPlanId(planId);
    setPayerError('');
    if (!payerName) setPayerName(user?.name || '');
    setPaymentOpen(false);
    setPayerOpen(true);
  }

  async function confirmPayerAndGeneratePix() {
    const digits = payerDocument.replace(/\D/g, '');
    if (!isValidCpfOrCnpj(digits)) {
      setPayerError('CPF ou CNPJ inválido. Confira os números digitados.');
      return;
    }
    if (!pendingPlanId) return;

    setPayerOpen(false);
    try {
      setLoadingPlan(pendingPlanId);
      const nextPayment = await createPixPayment(pendingPlanId, {
        document: digits,
        name: payerName.trim() || undefined,
      });
      setPayment(nextPayment);
      setPaymentOpen(true);
      toast.info('Pix gerado. Use o QR Code ou o Pix copia e cola nesta tela.');
    } catch (error) {
      const code = error instanceof Error ? error.message : '';
      const message = code === 'PIXGO_NOT_CONFIGURED'
        ? 'PixGo ainda precisa da API Key configurada no backend.'
        : code === 'INVALID_PAYER_DOCUMENT'
          ? 'CPF/CNPJ recusado. Confira o documento e tente novamente.'
          : 'Não foi possível gerar o Pix agora.';
      toast.error(message);
      if (code === 'INVALID_PAYER_DOCUMENT') setPayerOpen(true);
    } finally {
      setLoadingPlan(null);
    }
  }

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const requestedPlan = normalizeSelectedPlan(params.get('plan'), false);
    if (!requestedPlan) return;

    window.history.replaceState({}, '', '/app/billing');
    if (hasActiveSubscription || isAdmin || loadingPlan || paymentOpen || autoStartedPlan.current === requestedPlan) return;

    autoStartedPlan.current = requestedPlan;
    startPixPayment(requestedPlan);
  }, [hasActiveSubscription, isAdmin, loadingPlan, paymentOpen]);

  async function copyPixCode() {
    if (!payment?.pixCode) return;

    try {
      await navigator.clipboard.writeText(payment.pixCode);
      toast.info('Código Pix copiado.');
    } catch {
      toast.error('Não foi possível copiar o código Pix.');
    }
  }

  const qrSource = payment?.qrCodeDataUrl || payment?.qrCodeUrl || '';
  const isPaymentFinal = payment?.status && payment.status !== 'pending';
  const paymentDeadline = formatPaymentDeadline(payment?.expiresAt);

  return (
    <div className="space-y-4 sm:space-y-6">
      {!hasActiveSubscription && !isAdmin && (
        <div className="rounded-2xl border border-white/[0.08] bg-gradient-glass p-4 sm:p-5">
          <div className="flex min-w-0 items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-yellow-500/15 text-yellow-400">
              <LockKeyhole className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h1 className="text-xl font-bold leading-tight text-white sm:text-2xl">
                Conta bloqueada até o pagamento
              </h1>
              <p className="mt-1 max-w-3xl text-sm leading-relaxed text-white/55">
                {`${user?.name || 'Sua conta'} já pode entrar, mas as áreas principais do SaaS ficam protegidas por cadeado até a confirmação do pagamento.`}
              </p>
            </div>
          </div>
        </div>
      )}

      <PlanCards
        ctaLabel="Pagar com Pix"
        loadingLabel="Gerando Pix..."
        loadingPlanId={loadingPlan}
        onSelect={(planId) => startPixPayment(planId)}
        disabled={hasActiveSubscription || isAdmin}
        selectedPlanId={hasSelectedPlan ? selectedPlanId : null}
        selectedLabel={isAdmin ? 'Acesso ilimitado' : 'Selecionado'}
        selectedDescription={selectedDescription}
        paymentHint="O QR Code Pix abre nesta página. Não armazenamos dados de cartão."
      />

      <Modal
        open={payerOpen}
        onClose={() => setPayerOpen(false)}
        title="Identificação do pagador"
        size="md"
        panelClassName="!rounded-2xl !border-white/10 [background:#101218!important] [backdrop-filter:none!important] [-webkit-backdrop-filter:none!important] before:hidden"
        headerClassName="!p-4"
        bodyClassName="!p-4"
      >
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            void confirmPayerAndGeneratePix();
          }}
        >
          <div className="rounded-xl border border-amber-300/25 bg-amber-400/10 px-3 py-2 text-xs leading-relaxed text-amber-50/80">
            O Pix será vinculado ao CPF ou CNPJ informado. Use o documento de quem vai pagar pelo banco.
          </div>

          <label className="block">
            <span className="text-sm font-semibold text-white">CPF ou CNPJ do pagador</span>
            <input
              value={payerDocument}
              onChange={(event) => {
                setPayerDocument(formatPayerDocument(event.target.value));
                setPayerError('');
              }}
              inputMode="numeric"
              autoComplete="off"
              placeholder="000.000.000-00"
              className="mt-2 h-11 w-full rounded-xl border border-white/10 bg-[#171a22] px-3 text-sm text-white outline-none transition focus:border-brand-300/60 focus:ring-2 focus:ring-brand-500/20"
            />
          </label>

          <label className="block">
            <span className="text-sm font-semibold text-white">Nome do pagador</span>
            <input
              value={payerName}
              onChange={(event) => setPayerName(event.target.value)}
              autoComplete="name"
              placeholder={user?.name || 'Nome opcional'}
              className="mt-2 h-11 w-full rounded-xl border border-white/10 bg-[#171a22] px-3 text-sm text-white outline-none transition focus:border-brand-300/60 focus:ring-2 focus:ring-brand-500/20"
            />
            <span className="mt-1 block text-xs text-white/45">Opcional, mas ajuda na conciliação do pagamento.</span>
          </label>

          {payerError && (
            <p className="rounded-xl border border-red-300/25 bg-red-400/10 px-3 py-2 text-xs font-semibold text-red-100">
              {payerError}
            </p>
          )}

          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="secondary" className="justify-center" onClick={() => setPayerOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" className="justify-center" disabled={!pendingPlanId}>
              Gerar Pix
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        open={paymentOpen}
        onClose={() => setPaymentOpen(false)}
        title="Pagar com Pix"
        size="lg"
        panelClassName="!rounded-2xl !border-white/10 [background:#101218!important] [backdrop-filter:none!important] [-webkit-backdrop-filter:none!important] before:hidden"
        headerClassName="!p-4"
        bodyClassName="!p-4"
      >
        <div className="space-y-3">
          {payment && (
            <>
              <div className={`rounded-xl border p-3 ${paymentStatusTone(payment.status)}`}>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex min-w-0 gap-2.5">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/10">
                      {payment.status === 'completed' ? (
                        <CheckCircle2 className="h-[18px] w-[18px]" />
                      ) : isPaymentFinal ? (
                        <TriangleAlert className="h-[18px] w-[18px]" />
                      ) : checkingPayment ? (
                        <Loader2 className="h-[18px] w-[18px] animate-spin" />
                      ) : (
                        <QrCode className="h-[18px] w-[18px]" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold uppercase tracking-normal text-white/40">Plano escolhido</p>
                      <h2 className="mt-0.5 text-lg font-bold leading-tight text-white">{payment.planName}</h2>
                      <p className="mt-1 text-xs leading-relaxed text-white/62">
                        O Pix vale por 20 minutos{paymentDeadline ? `, até ${paymentDeadline}` : ''}. Depois disso, gere um novo pagamento.
                      </p>
                    </div>
                  </div>
                  <div className="w-full shrink-0 rounded-lg border border-white/10 bg-[#171a22] px-3 py-2 text-left sm:w-auto sm:text-right">
                    <p className="text-xs text-white/55">Valor</p>
                    <p className="text-lg font-black text-white">{currencyFormatter.format(payment.amount)}</p>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-amber-300/25 bg-amber-400/10 px-3 py-2 text-xs leading-relaxed text-amber-50/80">
                Você tem 20 minutos para pagar este Pix. Se o tempo acabar, gere uma nova cobrança antes de pagar.
              </div>

              <div className="grid gap-3 sm:grid-cols-[11.5rem_1fr]">
                <div id="pix-qr-code" className="rounded-xl border border-white/[0.08] bg-white p-3 text-surface">
                  <div className="flex aspect-square items-center justify-center">
                    {qrSource ? (
                      <img src={qrSource} alt="QR Code Pix" className="h-full w-full object-contain" />
                    ) : payment.pixCode ? (
                      <QRCodeSVG value={payment.pixCode} size={156} className="h-full w-full" />
                    ) : (
                      <QrCode className="h-16 w-16 text-surface/30" />
                    )}
                  </div>
                  <div className="mt-2 flex justify-center">
                    <span className={`rounded-full border px-2.5 py-1 text-xs font-bold ${paymentStatusTone(payment.status)}`}>
                      {checkingPayment ? 'Verificando...' : paymentStatusLabel(payment.status)}
                    </span>
                  </div>
                </div>

                <div className="min-w-0 rounded-xl border border-white/[0.08] bg-[#171a22] p-3">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
                    <div>
                      <p className="text-sm font-semibold text-white">Pix copia e cola</p>
                      <p className="text-xs text-white/45">Abra o app do banco, escolha Pix e cole este código.</p>
                    </div>
                    <span className="w-fit rounded-full border border-white/10 px-2.5 py-1 text-xs font-semibold text-white/55">
                      {checkingPayment ? 'Verificando...' : paymentStatusLabel(payment.status)}
                    </span>
                  </div>

                  <textarea
                    readOnly
                    value={payment.pixCode || 'Código Pix indisponível. Use o QR Code acima ou gere uma nova cobrança.'}
                    className="mt-3 min-h-[5.25rem] w-full resize-none rounded-xl border border-white/10 bg-[#0b0d12] p-3 text-xs leading-relaxed text-white/72 outline-none"
                  />

                  <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                    <Button
                      type="button"
                      size="sm"
                      className="justify-center"
                      icon={<Copy className="h-4 w-4" />}
                      disabled={!payment.pixCode}
                      onClick={copyPixCode}
                    >
                      Copiar código Pix
                    </Button>
                    {payment.status === 'expired' && (
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        className="justify-center"
                        loading={loadingPlan === payment.planId}
                        onClick={() => startPixPayment(payment.planId)}
                      >
                        Gerar novo Pix
                      </Button>
                    )}
                  </div>

                  <div className="mt-3 grid gap-1.5 text-[11px] leading-relaxed text-white/52">
                    <p>Pagamento confirmado automaticamente via Pix.</p>
                    <p>Use o QR Code ou o Pix copia e cola no app do seu banco.</p>
                    <p>A liberação do plano acontece após a confirmação da PixGo.</p>
                    <p>A verificação continua enquanto este modal estiver aberto e o Pix não expirar.</p>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </Modal>
    </div>
  );
}
