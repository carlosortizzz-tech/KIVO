export type MembershipStatus = 'trialing' | 'active' | 'past_due' | 'cancelled' | 'refunded' | 'chargeback';

// ⚠️ PLACEHOLDER — verificar con una compra sandbox CON trial antes de confiar en la métrica
// trial→pago (ver docs/sistema/18-VENTA-HOTMART.md → "El evento de inicio de trial"). Es plausible
// que Hotmart dispare PURCHASE_APPROVED con valor 0 al iniciar el trial en vez de un evento propio.
const TRIAL_START_EVENT = 'SUBSCRIPTION_TRIAL_START'; // (verificar) — ajustar al nombre real de la cuenta

const EVENT_TO_STATUS: Record<string, MembershipStatus> = {
  [TRIAL_START_EVENT]: 'trialing',
  PURCHASE_APPROVED: 'active',
  PURCHASE_COMPLETE: 'active',
  PURCHASE_DELAYED: 'past_due',
  SUBSCRIPTION_CANCELLATION: 'cancelled',
  PURCHASE_EXPIRED: 'cancelled',
  PURCHASE_REFUNDED: 'refunded',
  PURCHASE_CHARGEBACK: 'chargeback',
};

// La transición ilegal (reactivar un refund/chargeback con un evento reentregado) la bloquea
// la RPC apply_hotmart_event del lado del servidor — es la única fuente de verdad atómica.
export function statusForEvent(event: string): MembershipStatus | null {
  return EVENT_TO_STATUS[event] ?? null;
}
