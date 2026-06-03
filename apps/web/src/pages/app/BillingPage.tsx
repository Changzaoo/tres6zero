import { useEffect, useState } from 'react';
import { Copy, ExternalLink, LockKeyhole, QrCode } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { PlanCards } from '@/components/billing/PlanCards';
import { PixInstallmentInfo } from '@/components/billing/PixInstallmentInfo';
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
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short' }).format(new Date(value));
}

function normalizeSelectedPlan(planId?: string | null, isAdmin = false): PlanId | null {
  if (isAdmin) return 'unlimited';
  return planId === 'starter' || planId === 'pro' || planId === 'unlimited' ? planId : null;
}

const currencyFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
});

export default function BillingPage() {
  const { user, hasActiveSubscription, isAdmin } = useAuth();
  const setUser = useAuthStore((state) => state.setUser);
  const [loadingPlan, setLoadingPlan] = useState<PlanId | null>(null);
  const [payment, setPayment] = useState<PixPayment | null>(null);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [installmentInfoOpen, setInstallmentInfoOpen] = useState(false);
  const periodEnd = formatDate(user?.currentPeriodEnd);
  const selectedPlanId = normalizeSelectedPlan(user?.planId || user?.entitlements?.planId, isAdmin);
  const hasSelectedPlan = Boolean(selectedPlanId && (hasActiveSubscription || isAdmin));
  const selectedDescription = isAdmin
    ? 'Seu acesso administrativo e ilimitado.'
    : hasActiveSubscription && periodEnd
      ? `Seu acesso esta liberado ate ${periodEnd}. A renovacao mantem o mesmo dia da assinatura.`
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

    const timer = window.setInterval(async () => {
      try {
        const nextPayment = await getPixPayment(payment.paymentId);
        setPayment(nextPayment);

        if (nextPayment.status === 'completed') {
          toast.info('Pagamento Pix confirmado. Seu acesso sera atualizado agora.');
          const freshUser = await getCurrentUser();
          if (freshUser) setUser(freshUser);
        }
      } catch {
        // A consulta de status e complementar; o webhook continua sendo a fonte de liberacao.
      }
    }, 30_000);

    return () => window.clearInterval(timer);
  }, [payment?.paymentId, payment?.status, paymentOpen, setUser]);

  async function startPixPayment(planId: PlanId, options?: { showInstallmentInfo?: boolean }) {
    try {
      setLoadingPlan(planId);
      const nextPayment = await createPixPayment(planId);
      setPayment(nextPayment);
      setPaymentOpen(true);
      setInstallmentInfoOpen(Boolean(options?.showInstallmentInfo));
      toast.info('Cobranca Pix criada. Use o QR Code ou o Pix copia e cola para pagar.');
    } catch (error) {
      const code = error instanceof Error ? error.message : '';
      const message = code === 'PIXGO_NOT_CONFIGURED'
        ? 'PixGo ainda nao esta configurado no backend.'
        : 'Nao foi possivel gerar o Pix agora.';
      toast.error(message);
    } finally {
      setLoadingPlan(null);
    }
  }

  async function copyPixCode() {
    if (!payment?.pixCode) return;

    try {
      await navigator.clipboard.writeText(payment.pixCode);
      toast.info('Codigo Pix copiado.');
    } catch {
      toast.error('Nao foi possivel copiar o codigo Pix.');
    }
  }

  function showQrCode() {
    setPaymentOpen(true);
    toast.info('QR Code Pix disponivel na tela de pagamento.');
  }

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
        paymentHint="Pagamento via Pix. Para usar cartão, veja se seu banco oferece Pix parcelado."
        secondaryActionLabel="Quero usar cartão de crédito"
        onSecondaryAction={(planId) => startPixPayment(planId, { showInstallmentInfo: true })}
      />

      <Modal open={paymentOpen} onClose={() => setPaymentOpen(false)} title="Pagamento PixGo" size="xl">
        <div className="space-y-4">
          {payment && (
            <>
              <div className="rounded-2xl border border-white/[0.08] bg-white/[0.045] p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-normal text-white/40">Plano escolhido</p>
                    <h2 className="mt-1 text-xl font-bold leading-tight text-white">{payment.planName}</h2>
                    <p className="mt-1 text-sm text-white/55">
                      Pagamento principal: Pix via PixGo. Cartão de crédito: somente por Pix parcelado feito pelo banco/carteira digital do cliente, quando disponível.
                    </p>
                  </div>
                  <div className="shrink-0 rounded-xl border border-emerald-300/16 bg-emerald-400/[0.08] px-3 py-2 text-left sm:text-right">
                    <p className="text-xs text-emerald-100/60">Valor</p>
                    <p className="text-lg font-black text-emerald-50">{currencyFormatter.format(payment.amount)}</p>
                  </div>
                </div>
              </div>

              <div className="grid gap-4 lg:grid-cols-[15rem_1fr]">
                <div id="pix-qr-code" className="rounded-2xl border border-white/[0.08] bg-white p-4 text-surface">
                  <div className="flex aspect-square items-center justify-center">
                    {payment.qrCodeUrl ? (
                      <img src={payment.qrCodeUrl} alt="QR Code Pix" className="h-full w-full object-contain" />
                    ) : payment.pixCode ? (
                      <QRCodeSVG value={payment.pixCode} size={196} className="h-full w-full" />
                    ) : (
                      <QrCode className="h-20 w-20 text-surface/30" />
                    )}
                  </div>
                </div>

                <div className="min-w-0 rounded-2xl border border-white/[0.08] bg-white/[0.045] p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-white">Pix copia e cola</p>
                      <p className="text-xs text-white/45">Abra o app do banco, escolha Pix e cole este código.</p>
                    </div>
                    <span className="rounded-full border border-white/10 px-2.5 py-1 text-xs font-semibold text-white/55">
                      {payment.status === 'completed' ? 'Confirmado' : 'Aguardando Pix'}
                    </span>
                  </div>

                  <textarea
                    readOnly
                    value={payment.pixCode || 'Codigo Pix indisponivel. Use o QR Code acima ou gere uma nova cobranca.'}
                    className="mt-3 min-h-[7rem] w-full resize-none rounded-2xl border border-white/10 bg-black/22 p-3 text-xs leading-relaxed text-white/72 outline-none"
                  />

                  <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                    <Button
                      type="button"
                      className="justify-center"
                      icon={<Copy className="h-4 w-4" />}
                      disabled={!payment.pixCode}
                      onClick={copyPixCode}
                    >
                      Copiar código Pix
                    </Button>
                    {payment.paymentUrl && (
                      <Button
                        type="button"
                        variant="secondary"
                        className="justify-center"
                        icon={<ExternalLink className="h-4 w-4" />}
                        onClick={() => window.open(payment.paymentUrl || '', '_blank', 'noopener,noreferrer')}
                      >
                        Abrir PixGo
                      </Button>
                    )}
                  </div>

                  <div className="mt-4 grid gap-2 text-xs leading-relaxed text-white/52 sm:grid-cols-2">
                    <p>Não armazenamos dados de cartão.</p>
                    <p>O pagamento é confirmado automaticamente via Pix.</p>
                    <p>Se seu banco oferecer Pix parcelado, você pode parcelar usando o cartão diretamente no aplicativo do banco.</p>
                    <p>Taxas e parcelas são definidas pelo seu banco.</p>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-white/[0.08] bg-white/[0.04] p-3">
                <button
                  type="button"
                  className="flex min-h-11 w-full items-center justify-between gap-3 rounded-xl px-2 text-left text-sm font-semibold text-white transition hover:bg-white/[0.045] focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/35"
                  onClick={() => setInstallmentInfoOpen((current) => !current)}
                >
                  <span>Quero usar cartão de crédito</span>
                  <span className="text-xs text-white/42">{installmentInfoOpen ? 'Ocultar' : 'Ver explicação'}</span>
                </button>
                {installmentInfoOpen && (
                  <div className="mt-3">
                    <PixInstallmentInfo
                      pixCode={payment.pixCode}
                      onCopyPix={copyPixCode}
                      onShowQrCode={showQrCode}
                      onClose={() => setInstallmentInfoOpen(false)}
                    />
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </Modal>
    </div>
  );
}
