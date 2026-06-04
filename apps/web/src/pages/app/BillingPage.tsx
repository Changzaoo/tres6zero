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
        ? 'Sua plataforma esta liberada para operar.'
        : null;

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const checkout = params.get('checkout');
    if (!checkout) return;

    window.history.replaceState({}, '', '/app/billing');

    if (checkout === 'success') {
      toast.info('Pagamento recebido. Assim que o PixGo confirmar, seu acesso sera liberado.');
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
          toast.info('Pagamento Pix confirmado. Seu acesso sera atualizado agora.');
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

  async function startPixPayment(planId: PlanId) {
    try {
      setLoadingPlan(planId);
      const nextPayment = await createPixPayment(planId);
      setPayment(nextPayment);
      setPaymentOpen(true);
      toast.info('Pix gerado. Use o QR Code ou o Pix copia e cola nesta tela.');
    } catch (error) {
      const code = error instanceof Error ? error.message : '';
      const message = code === 'PIXGO_NOT_CONFIGURED'
        ? 'PixGo ainda precisa da API Key configurada no backend.'
        : 'Nao foi possivel gerar o Pix agora.';
      toast.error(message);
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
      toast.info('Codigo Pix copiado.');
    } catch {
      toast.error('Nao foi possivel copiar o codigo Pix.');
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
                Conta bloqueada ate o pagamento
              </h1>
              <p className="mt-1 max-w-3xl text-sm leading-relaxed text-white/55">
                {`${user?.name || 'Sua conta'} ja pode entrar, mas as areas principais do SaaS ficam protegidas por cadeado ate a confirmacao do pagamento.`}
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
        paymentHint="O QR Code Pix abre nesta pagina. Nao armazenamos dados de cartao."
      />

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
                <div className="flex items-start justify-between gap-3">
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
                        O Pix vale por 20 minutos{paymentDeadline ? `, ate ${paymentDeadline}` : ''}. Depois disso, gere um novo pagamento.
                      </p>
                    </div>
                  </div>
                  <div className="shrink-0 rounded-lg border border-white/10 bg-[#171a22] px-3 py-2 text-right">
                    <p className="text-xs text-white/55">Valor</p>
                    <p className="text-lg font-black text-white">{currencyFormatter.format(payment.amount)}</p>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-amber-300/25 bg-amber-400/10 px-3 py-2 text-xs leading-relaxed text-amber-50/80">
                Voce tem 20 minutos para pagar este Pix. Se o tempo acabar, gere uma nova cobranca antes de pagar.
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
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-white">Pix copia e cola</p>
                      <p className="text-xs text-white/45">Abra o app do banco, escolha Pix e cole este codigo.</p>
                    </div>
                    <span className="rounded-full border border-white/10 px-2.5 py-1 text-xs font-semibold text-white/55">
                      {checkingPayment ? 'Verificando...' : paymentStatusLabel(payment.status)}
                    </span>
                  </div>

                  <textarea
                    readOnly
                    value={payment.pixCode || 'Codigo Pix indisponivel. Use o QR Code acima ou gere uma nova cobranca.'}
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
                      Copiar codigo Pix
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
                    <p>A liberacao do plano acontece apos a confirmacao da PixGo.</p>
                    <p>A verificacao continua enquanto este modal estiver aberto e o Pix nao expirar.</p>
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
