import { redirect } from 'next/navigation';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { createClient } from '@supabase/supabase-js';
import { isAdminEmail } from '@/lib/admin';
import { AdminUsersTable, type AdminUserRow } from '@/components/app/AdminUsersTable';
import { AdminReportsQueue, type ReportRow } from '@/components/app/AdminReportsQueue';
import { AdminSafeQueue, type SafeReportRow } from '@/components/app/AdminSafeQueue';
import { TriangleAlert } from 'lucide-react';

function getAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

// Precio de referencia (02C) — no hay en BD el monto real de cada cobro (Hotmart no lo manda al
// webhook), así que el MRR se ESTIMA con este precio y se etiqueta como estimado en pantalla.
// No distingue mensual/anual porque esa info tampoco llega al webhook actual.
const PRECIO_REFERENCIA_USD = 2.99;

export default async function AdminPanelPage() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !isAdminEmail(user.email)) {
    redirect('/app');
  }

  const admin = getAdmin();

  const { data: profiles } = await admin
    .from('profiles')
    .select('id, email, display_name, plan, status, created_at, trial_ends_at, last_active_date')
    .order('created_at', { ascending: false });

  // webhook_log también recibe entradas de otras integraciones (youtube:fetch, spotify:fetch,
  // admin:*, email:*) que siguen la convención "espacio:acción" — los eventos REALES de Hotmart
  // son nombres planos (PURCHASE_APPROVED...) o vienen sin type (fallos de firma/hottok). Esta
  // sección es específicamente la salud de Hotmart, así que se excluye cualquier type con ":" en
  // vez de mantener una lista de prefijos que hay que recordar actualizar con cada integración
  // nueva (así se evitó dos veces seguidas: primero con Spotify, ahora con YouTube).
  const { data: recentLogs } = await admin
    .from('webhook_log')
    .select('type, result, received_at, detail')
    .not('type', 'ilike', '%:%')
    .order('received_at', { ascending: false })
    .limit(15);

  const { data: pendingReports } = await admin
    .from('forum_reports')
    .select('id, target_id, reason, created_at, reported_by')
    .eq('status', 'pending')
    .order('created_at', { ascending: false });

  const { data: pendingSafeReports } = await admin
    .from('safe_reports')
    .select('id, url_or_seller, reason, created_at, reported_by')
    .eq('status', 'pending')
    .order('created_at', { ascending: false });

  const reporterIds = [...new Set([
    ...(pendingReports ?? []).map((r) => r.reported_by),
    ...(pendingSafeReports ?? []).map((r) => r.reported_by),
  ])];
  const { data: reporterProfiles } = reporterIds.length
    ? await admin.from('profiles').select('id, email').in('id', reporterIds)
    : { data: [] as { id: string; email: string | null }[] };
  const reporterEmailById = new Map((reporterProfiles ?? []).map((p) => [p.id, p.email]));

  const reports: ReportRow[] = (pendingReports ?? []).map((r) => ({
    id: r.id,
    targetId: r.target_id,
    reason: r.reason,
    reporterEmail: reporterEmailById.get(r.reported_by) ?? null,
    createdAt: r.created_at,
  }));

  const safeReports: SafeReportRow[] = (pendingSafeReports ?? []).map((r) => ({
    id: r.id,
    urlOrSeller: r.url_or_seller,
    reason: r.reason,
    reporterEmail: reporterEmailById.get(r.reported_by) ?? null,
    createdAt: r.created_at,
  }));

  const rows = profiles ?? [];
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const activos = rows.filter((r) => r.status === 'active').length;
  const trialing = rows.filter((r) => r.status === 'trialing').length;
  const pastDue = rows.filter((r) => r.status === 'past_due').length;
  const cancelados = rows.filter((r) => ['cancelled', 'refunded', 'chargeback'].includes(r.status)).length;
  const nuevosEsteMes = rows.filter((r) => new Date(r.created_at) >= startOfMonth).length;
  const mrrEstimado = (activos * PRECIO_REFERENCIA_USD).toFixed(2);

  const logs = recentLogs ?? [];
  const fallosRecientes = logs.filter((l) => ['error', 'unauthorized', 'illegal'].includes(l.result)).length;
  const ultimoEvento = logs[0]?.received_at ?? null;

  const users: AdminUserRow[] = rows.map((r) => ({
    id: r.id,
    email: r.email,
    displayName: r.display_name,
    plan: r.plan,
    status: r.status,
    createdAt: r.created_at,
    lastActiveDate: r.last_active_date,
  }));

  return (
    <div>
      <div className="text-xs font-bold uppercase tracking-wide text-accent2 mb-1">Admin</div>
      <h1 className="font-display text-lg font-extrabold mb-4">Panel del negocio</h1>

      <AdminReportsQueue reports={reports} />
      <AdminSafeQueue reports={safeReports} />

      {fallosRecientes > 0 && (
        <div className="flex items-start gap-2.5 bg-danger/10 border border-danger/30 rounded-2xl p-3.5 mb-4">
          <TriangleAlert size={16} strokeWidth={2} className="text-danger flex-shrink-0 mt-0.5" />
          <div className="text-xs text-text">
            <b className="block mb-0.5">Hay {fallosRecientes} evento(s) de Hotmart con error recientes.</b>
            Podría significar que un pago no le dio acceso a alguien, o que la conexión con Hotmart falló. Revisa el registro abajo.
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-2.5 mb-4">
        <div className="bg-surface border border-border rounded-2xl p-3.5">
          <div className="font-display text-xl font-extrabold text-accent2">{activos}</div>
          <div className="text-xs text-text2">Usuarios Pro activos</div>
        </div>
        <div className="bg-surface border border-border rounded-2xl p-3.5">
          <div className="font-display text-xl font-extrabold text-accent2">${mrrEstimado}</div>
          <div className="text-xs text-text2">Ingreso mensual estimado</div>
        </div>
        <div className="bg-surface border border-border rounded-2xl p-3.5">
          <div className="font-display text-xl font-extrabold text-text">{nuevosEsteMes}</div>
          <div className="text-xs text-text2">Altas este mes</div>
        </div>
        <div className="bg-surface border border-border rounded-2xl p-3.5">
          <div className="font-display text-xl font-extrabold text-text">{cancelados}</div>
          <div className="text-xs text-text2">Cancelados / reembolsados</div>
        </div>
      </div>

      {(trialing > 0 || pastDue > 0) && (
        <div className="flex gap-2.5 mb-4 text-xs text-text2">
          {trialing > 0 && <span>{trialing} en prueba gratis</span>}
          {pastDue > 0 && <span>· {pastDue} con pago fallido</span>}
        </div>
      )}

      <div className="text-xs text-text2 mb-4">
        Este ingreso es un estimado (usa ${PRECIO_REFERENCIA_USD}/mes por cada Pro activo) — Hotmart no manda el monto exacto de cada cobro a KIVO. Los números exactos están en tu panel de Hotmart.
      </div>

      <div className="text-sm font-bold mb-2">Últimos eventos de Hotmart</div>
      <div className="flex flex-col gap-1.5 mb-5">
        {logs.length === 0 && <div className="text-xs text-text2">Sin eventos registrados todavía.</div>}
        {logs.map((l, i) => (
          <div key={i} className="flex items-center justify-between text-xs bg-surface border border-border rounded-xl px-3 py-2">
            <span className="text-text2">{l.type ?? '(sin tipo)'}</span>
            <span className={l.result === 'applied' ? 'text-success' : ['error', 'unauthorized', 'illegal'].includes(l.result) ? 'text-danger' : 'text-text2'}>
              {l.result}
            </span>
            <span className="text-text2">{new Date(l.received_at).toLocaleString('es', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
          </div>
        ))}
      </div>
      {ultimoEvento && (
        <div className="text-xs text-text2 mb-5">Último evento recibido: {new Date(ultimoEvento).toLocaleString('es')}</div>
      )}

      <div className="text-sm font-bold mb-2">Usuarios ({users.length})</div>
      <AdminUsersTable users={users} />
    </div>
  );
}
