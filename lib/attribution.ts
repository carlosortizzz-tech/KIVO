'use client';

// Atribución por canal (36-ANALITICA-Y-EVENTOS.md, "ATRIBUCIÓN POR CANAL"). Los 4 links cortos de
// KIVO (Instagram/TikTok/Facebook/ManyChat) ya traen `utm_source` en la URL de destino — esto los
// lee UNA vez al entrar y los guarda hasta el registro, para que `profiles.source` (y por lo tanto
// el funnel de PostHog partido por canal) deje de estar vacío.

const KEY = 'kivo_attrib_source';

export function captureAttribution() {
  if (typeof window === 'undefined') return;
  if (localStorage.getItem(KEY)) return; // primer toque gana — no se sobreescribe
  const p = new URLSearchParams(window.location.search);
  const src = p.get('src') ?? p.get('utm_source');
  if (!src) return;
  // utm_medium distingue links que comparten el mismo utm_source (los 3 de Instagram: bio,
  // manychat_guia, manychat_bts) — sin esto, PostHog y profiles.source los mezclaba a todos
  // como "instagram" y no se podía ver cuál link/video convierte mejor (2026-09-27).
  const medium = p.get('utm_medium');
  localStorage.setItem(KEY, medium ? `${src}_${medium}` : src);
}

export function getAttribution(): string {
  if (typeof window === 'undefined') return 'directo';
  return localStorage.getItem(KEY) ?? 'directo';
}
