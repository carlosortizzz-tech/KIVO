export type CalendarEvent = {
  id: string;
  title: string;
  startsAt: string; // ISO
  endsAt?: string | null; // ISO
  description?: string | null;
  url?: string | null;
};

function toGoogleDate(iso: string): string {
  return iso.replace(/[-:]/g, '').split('.')[0] + 'Z';
}

const DEFAULT_DURATION_MS = 60 * 60 * 1000; // 1h si el evento no trae fecha de fin

export function googleCalendarUrl(event: CalendarEvent): string {
  const start = new Date(event.startsAt);
  const end = event.endsAt ? new Date(event.endsAt) : new Date(start.getTime() + DEFAULT_DURATION_MS);
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: `KIVO — ${event.title}`,
    dates: `${toGoogleDate(start.toISOString())}/${toGoogleDate(end.toISOString())}`,
    details: [event.description, event.url].filter(Boolean).join('\n\n'),
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

// .ics funciona en Apple Calendar, Outlook y cualquier app de calendario — no solo Google.
export function generateIcs(event: CalendarEvent): string {
  const start = new Date(event.startsAt);
  const end = event.endsAt ? new Date(event.endsAt) : new Date(start.getTime() + DEFAULT_DURATION_MS);
  const toIcsDate = (d: Date) => d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  const escapeIcs = (s: string) => s.replace(/([,;])/g, '\\$1').replace(/\n/g, '\\n');

  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//KIVO//Radar//ES',
    'BEGIN:VEVENT',
    `UID:${event.id}@kivoapp.app`,
    `DTSTAMP:${toIcsDate(new Date())}`,
    `DTSTART:${toIcsDate(start)}`,
    `DTEND:${toIcsDate(end)}`,
    `SUMMARY:${escapeIcs(`KIVO — ${event.title}`)}`,
    event.description ? `DESCRIPTION:${escapeIcs(event.description)}` : '',
    event.url ? `URL:${event.url}` : '',
    'END:VEVENT',
    'END:VCALENDAR',
  ].filter(Boolean).join('\r\n');
}
