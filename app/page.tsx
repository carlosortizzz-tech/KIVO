import Link from 'next/link';
import { Calendar, Search, Globe2, ShieldAlert, UserRound } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { Countdown } from '@/components/app/Countdown';
import { Reveal } from '@/components/app/Reveal';

export const revalidate = 60;

async function getNextEvent() {
  const supabase = await createClient();
  const { data } = await supabase
    .from('events')
    .select('title, platform, starts_at')
    .order('starts_at', { ascending: true })
    .limit(1)
    .maybeSingle();
  return data;
}

const problems = [
  { icon: Calendar, text: '¿Llegaste tarde a una preventa porque no sabías que ya había empezado?' },
  { icon: Search, text: '¿Te perdiste un live porque no lo encontrabas por fecha o título?' },
  { icon: Globe2, text: '¿Te frustra pagar por traducciones que deberían ser gratis?' },
  { icon: ShieldAlert, text: '¿El spam en Weverse no te deja encontrar lo que de verdad importa?' },
  { icon: UserRound, text: '¿Te preocupa quedar fuera de lo que pasa y sentir que no eres un ARMY tan al día como los demás?' },
];

const faqs = [
  { q: '¿Esto no es lo mismo que Weverse?', a: 'No. Weverse transmite contenido; KIVO te organiza y te dice cuándo y cómo actuar en Weverse, Bubble y todas las demás plataformas.' },
  { q: '¿KIVO es oficial de BTS o de HYBE?', a: 'No. KIVO es 100% hecho por fans, no afiliado a HYBE — por eso nos enfocamos en lo que a ti te sirve, no en lo que a ellos les conviene vender.' },
  { q: '¿Por qué pagar si lo consigo gratis en TikTok o Reddit?', a: 'Porque ahí llega disperso y tarde. KIVO lo junta y te avisa ANTES de que se te escape — tu tiempo también vale.' },
  { q: '¿Va a durar o va a desaparecer como ARMY Amino?', a: 'Publicamos actualizaciones cada semana y compartimos el roadmap con la comunidad. No es un proyecto que se abandona.' },
  { q: '¿Es caro / no sé si lo voy a usar lo suficiente?', a: 'Menos de lo que cuesta un café al mes — y tienes 7 días gratis para comprobarlo antes de que se cobre nada.' },
];

export default async function LandingPage() {
  const nextEvent = await getNextEvent();
  const eventTitle = nextEvent?.title ?? 'BTS World Tour 2026 — Preventa Membresía';
  const eventStartsAt = nextEvent?.starts_at ?? new Date(Date.now() + (2 * 86400 + 14 * 3600 + 37 * 60) * 1000).toISOString();

  return (
    <div className="max-w-[480px] mx-auto w-full px-5">
      {/* HEADER */}
      <header className="flex items-center justify-between py-5">
        <div className="relative inline-block font-display font-extrabold text-xl">
          <span className="relative z-10">KIVO</span>
          <span
            className="absolute -inset-y-1 -inset-x-2.5 -rotate-2 rounded-[9999px_9999px_9999px_12px] border-2 border-accent"
            style={{ boxShadow: 'var(--glow)' }}
          />
        </div>
        <Link href="/login" className="text-sm font-semibold text-text2">Entrar</Link>
      </header>

      {/* HERO */}
      <section>
        <h1 className="font-display text-[32px] font-extrabold leading-tight mb-3.5 tracking-tight">
          No te pierdas otra preventa de BTS
        </h1>
        <p className="text-[15px] text-text2 mb-5 max-w-[40ch]">
          <b className="text-text font-semibold">KIVO Radar</b> junta Weverse, Bubble y todas las fuentes en un solo calendario, y te avisa antes de que empiece — no cuando ya se agotó.
        </p>
        <Link
          href="/onboarding"
          className="flex items-center justify-center gap-2 bg-accent-btn text-white font-bold text-[15px] rounded-2xl py-4 px-6 w-full"
          style={{ boxShadow: 'var(--glow)' }}
        >
          Crear mi cuenta gratis →
        </Link>
        <div className="flex items-center gap-2.5 mt-3.5 text-xs text-text2">
          <span className="w-1.5 h-1.5 rounded-full bg-success" />
          7 días gratis · Cancela cuando quieras · Hecho por fans, no afiliado a HYBE
        </div>

        <div
          className="rounded-[20px] p-5.5 my-6 border border-accent/35"
          style={{ background: 'linear-gradient(180deg, #1B1128, #0F0817)', boxShadow: '0 0 40px rgba(180,79,245,0.15)' }}
        >
          <div className="text-[11px] font-bold uppercase tracking-wide text-accent2 mb-2">Próximo en tu radar</div>
          <div className="text-[17px] font-bold mb-3.5">{eventTitle}</div>
          <Countdown target={eventStartsAt} />
          <div className="text-[11px] text-text2 mt-3">Datos en vivo desde la base de KIVO — el mecanismo real detrás de KIVO Radar.</div>
        </div>
      </section>

      {/* PROBLEMA */}
      <Reveal>
        <section className="py-10">
          <div className="text-xs font-bold uppercase tracking-wide text-accent2 mb-1.5">¿Te suena?</div>
          <h2 className="font-display text-[20px] font-extrabold mb-4">Si eres ARMY, esto ya te pasó</h2>
          <div className="flex flex-col gap-3">
            {problems.map(({ icon: Icon, text }, i) => (
              <div key={i} className="flex gap-3 items-start bg-surface border border-border rounded-[18px] p-4">
                <div className="w-9 h-9 rounded-[10px] bg-accent-soft text-accent2 flex items-center justify-center flex-shrink-0">
                  <Icon size={16} strokeWidth={2} />
                </div>
                <div className="text-sm font-medium">{text}</div>
              </div>
            ))}
          </div>
        </section>
      </Reveal>

      {/* AGITACION */}
      <Reveal>
        <section className="pb-10">
          <div className="bg-sunken rounded-[20px] p-5.5">
            <p className="text-sm mb-2.5">
              No es solo un ticket agotado. Es pagar 3-5 veces más en reventa, o quedarte fuera del concierto directamente. Un ARMY activo vive entre 8 y 12 ventanas así cada año — preventas, comebacks, renovaciones.
            </p>
            <p className="text-sm mb-3">
              <b>Perderte 2 o 3 es la norma</b> cuando dependes de enterarte por Twitter o un grupo de Discord que capaz revisas tarde.
            </p>
            <div className="font-display text-[32px] font-extrabold text-accent tabular-nums">8–12</div>
            <div className="text-xs text-text2">ventanas clave al año que un ARMY activo puede perderse sin un sistema que avise a tiempo</div>
          </div>
        </section>
      </Reveal>

      {/* SOLUCION */}
      <Reveal>
        <section className="pb-10">
          <div className="text-xs font-bold uppercase tracking-wide text-accent2 mb-1.5">La solución</div>
          <h2 className="font-display text-[20px] font-extrabold mb-2.5">No es que no te importe lo suficiente</h2>
          <p className="text-sm text-text2 mb-5">
            Es que HYBE reparte la información entre Weverse, Bubble, Twitter y comunicados que nadie centraliza. <b className="text-accent">KIVO Radar</b> lo hace por ti.
          </p>
          <div className="flex flex-col gap-3.5">
            {[
              ['Eliges qué te importa', 'Tickets, membresía, comebacks, lives — tú decides qué avisar.'],
              ['KIVO Radar vigila 24/7', 'Revisamos las fuentes oficiales para que tú no tengas que hacerlo.'],
              ['Te avisamos a tiempo', '48h y 1h antes, con la guía exacta de qué hacer en cada plataforma.'],
            ].map(([title, desc], i) => (
              <div key={title} className="flex gap-3.5 items-start">
                <div className="w-8 h-8 rounded-full bg-[#1a1424] text-white font-display font-extrabold text-sm flex items-center justify-center flex-shrink-0" style={{ boxShadow: 'var(--glow)', background: 'var(--accent-btn)' }}>
                  {i + 1}
                </div>
                <div>
                  <div className="text-sm font-bold mb-0.5">{title}</div>
                  <div className="text-[13px] text-text2">{desc}</div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </Reveal>

      {/* OFERTA */}
      <Reveal>
        <section className="pb-10">
          <div className="text-xs font-bold uppercase tracking-wide text-accent2 mb-1.5">Tu acceso</div>
          <h2 className="font-display text-[20px] font-extrabold mb-4">Todo esto, por menos de un café al mes</h2>
          <div className="flex flex-col gap-3">
            <div className="border-2 border-accent bg-accent-soft rounded-[18px] p-4.5 relative" style={{ boxShadow: 'var(--glow)' }}>
              <div className="absolute -top-2.5 right-4 bg-accent-btn text-white text-[10px] font-bold px-2.5 py-1 rounded-full uppercase">Mejor valor</div>
              <div className="text-xs font-bold uppercase text-text2">Anual</div>
              <div className="font-display text-[26px] font-extrabold my-1 tabular-nums">$1.67<span className="text-[13px] font-medium text-text2">/mes</span></div>
              <div className="text-[11px] text-text2">Se cobra $19.99/año · 2 meses gratis</div>
            </div>
            <div className="border border-border rounded-[18px] p-4.5">
              <div className="text-xs font-bold uppercase text-text2">Mensual</div>
              <div className="font-display text-[26px] font-extrabold my-1 tabular-nums">$2.99<span className="text-[13px] font-medium text-text2">/mes</span></div>
              <div className="text-[11px] text-text2">Cancela cuando quieras</div>
            </div>
          </div>
          <Link href="/onboarding" className="mt-4 flex items-center justify-center gap-2 bg-accent-btn text-white font-bold text-[15px] rounded-2xl py-4 px-6 w-full" style={{ boxShadow: 'var(--glow)' }}>
            Crear mi cuenta gratis →
          </Link>
        </section>
      </Reveal>

      {/* FAQ */}
      <Reveal>
        <section className="pb-10">
          <div className="text-xs font-bold uppercase tracking-wide text-accent2 mb-1.5">Preguntas</div>
          <h2 className="font-display text-[20px] font-extrabold mb-1">Antes de que dudes</h2>
          <div>
            {faqs.map((f) => (
              <div key={f.q} className="border-b border-border py-4">
                <div className="text-sm font-bold">{f.q}</div>
                <div className="text-[13px] text-text2 mt-2 leading-relaxed">{f.a}</div>
              </div>
            ))}
          </div>
        </section>
      </Reveal>

      {/* CTA FINAL */}
      <Reveal>
        <section className="pb-10">
          <div className="rounded-[20px] p-7 text-center border border-accent/35" style={{ background: 'linear-gradient(180deg, #1B1128, #0F0817)', boxShadow: '0 0 40px rgba(180,79,245,0.15)' }}>
            <h2 className="font-display text-[19px] font-extrabold mb-2.5">Imagina abrir el celular y ya saber exactamente qué hacer</h2>
            <p className="text-sm text-text2 mb-4.5">
              No más refrescar 3 apps a la mitad de la noche. Solo tú, tranquilo, con tu recordatorio ya puesto — el ARMY que está al día, no el que se entera tarde.
            </p>
            <Link href="/onboarding" className="flex items-center justify-center gap-2 bg-accent-btn text-white font-bold text-[15px] rounded-2xl py-4 px-6 w-full" style={{ boxShadow: 'var(--glow)' }}>
              Crear mi cuenta gratis →
            </Link>
            <div className="text-[12px] text-accent2 mt-3.5 font-semibold">$1.67/mes, 7 días gratis, sin trucos — cancela cuando quieras</div>
            <div className="text-xs text-text2 mt-4.5 text-left leading-relaxed border-t border-border pt-4">
              <b>PD:</b> KIVO Radar te avisa de cada preventa de BTS antes de que se agote. Hoy entras con KIVO Guide y KIVO Community incluidos, la Garantía de la Primera Preventa y 7 días gratis antes de que se cobre nada.
            </div>
          </div>
        </section>
      </Reveal>

      {/* FOOTER */}
      <footer className="pb-16 pt-2">
        <div className="text-[11px] text-text2 leading-relaxed bg-sunken rounded-xl p-3.5 mb-4">
          KIVO es un proyecto independiente hecho por fans, sin ninguna afiliación con HYBE, BIGHIT MUSIC ni con BTS. No usamos contenido oficial con derechos de autor; toda la información se basa en fuentes públicas.
        </div>
        <div className="flex flex-wrap gap-3.5 text-xs mb-4">
          <Link href="/privacidad" className="text-text2">Política de Privacidad</Link>
          <Link href="/terminos" className="text-text2">Términos y Condiciones</Link>
          <Link href="/reembolso" className="text-text2">Política de Reembolso</Link>
          <a href="mailto:hola@kivo.app" className="text-text2">Contacto</a>
        </div>
        <div className="text-xs text-text2">© 2026 KIVO. Proyecto independiente de fans.</div>
      </footer>
    </div>
  );
}
