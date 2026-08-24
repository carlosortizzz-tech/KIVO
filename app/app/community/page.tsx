import { ShieldCheck, MessageCircle } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { Reveal } from '@/components/app/Reveal';

function timeAgo(iso: string) {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 60) return `hace ${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `hace ${hours} h`;
  return `hace ${Math.floor(hours / 24)} d`;
}

export default async function CommunityPage() {
  const supabase = await createClient();
  const { data: posts, error } = await supabase
    .from('forum_posts')
    .select('id, category, body, created_at, user_id')
    .order('created_at', { ascending: false })
    .limit(20);

  if (error) {
    throw new Error('No se pudo cargar la comunidad de KIVO');
  }

  return (
    <div>
      <Reveal>
        <div className="text-xs font-bold uppercase tracking-wide text-accent2 mb-1">Comunidad</div>
        <h1 className="font-display text-lg font-extrabold mb-4">Lo que se habla hoy</h1>

        <div className="flex items-center gap-2.5 bg-success/[0.08] border border-success/25 rounded-2xl px-3.5 py-3 mb-4 text-xs text-text2">
          <ShieldCheck size={16} color="var(--success)" strokeWidth={2} />
          Moderado de verdad — sin spam
        </div>

        <button className="flex items-center gap-2.5 bg-surface border border-border rounded-2xl px-3.5 py-3 mb-4 text-sm text-text2 w-full text-left transition-transform duration-150 active:scale-[0.98]">
          <div className="firma-icon w-7 h-7 rounded-full bg-accent-btn flex-shrink-0" />
          ¿Qué está pasando, ARMY?
        </button>
      </Reveal>

      {posts && posts.length > 0 ? (
        <div className="flex flex-col gap-3">
          {posts.map((p, i) => (
            <Reveal key={p.id} delayMs={100 + i * 60}>
              <div className="bg-surface border border-border rounded-2xl p-3.5">
                <div className="flex items-center gap-2 mb-2">
                  <div className="firma-icon w-7 h-7 rounded-full bg-accent-soft text-accent2 flex items-center justify-center text-[11px] font-bold flex-shrink-0">
                    A
                  </div>
                  <div>
                    <div className="text-xs font-bold">ARMY</div>
                    <div className="text-[11px] text-text2">{timeAgo(p.created_at)}</div>
                  </div>
                  <div className="ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full bg-accent-soft text-accent2">{p.category}</div>
                </div>
                <p className="text-sm leading-relaxed">{p.body}</p>
              </div>
            </Reveal>
          ))}
        </div>
      ) : (
        <Reveal delayMs={100}>
          <div className="flex flex-col items-center text-center gap-3 py-14 px-4">
            <div className="firma-icon w-14 h-14 rounded-full bg-accent-soft flex items-center justify-center">
              <MessageCircle size={24} color="var(--accent2)" strokeWidth={1.8} />
            </div>
            <div className="text-sm font-bold">Todavía no hay publicaciones</div>
            <p className="text-sm text-text2 max-w-[26ch]">Sé el primer ARMY en contar qué está pasando hoy.</p>
          </div>
        </Reveal>
      )}
    </div>
  );
}
