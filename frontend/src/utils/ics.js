/** Tiny helpers for "Add to calendar": builds an .ics file in the browser (nothing is uploaded). */

const pad = (n) => String(n).padStart(2, '0');

/** "2026-11-10" + "11:00 AM" -> Date (local time) or null */
export function slotToDate(dateStr, slot) {
  const m = /^(\d{1,2}):(\d{2})\s*(AM|PM)$/i.exec(String(slot || '').trim());
  const d = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(dateStr || ''));
  if (!m || !d) return null;
  let h = Number(m[1]) % 12;
  if (m[3].toUpperCase() === 'PM') h += 12;
  return new Date(Number(d[1]), Number(d[2]) - 1, Number(d[3]), h, Number(m[2]));
}

const stamp = (d) => `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}T${pad(d.getHours())}${pad(d.getMinutes())}00`;
const clean = (t) => String(t || '').replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/[,;]/g, (c) => `\\${c}`);

/** Download a 50-minute calendar event. Floating local time, so it lands at the right clock time for the student. */
export function downloadIcs({ id, title, date, slot, description = '' }) {
  const start = slotToDate(date, slot);
  if (!start) return false;
  const end = new Date(start.getTime() + 50 * 60000);
  const lines = [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Serenova//Counselling//EN', 'CALSCALE:GREGORIAN', 'BEGIN:VEVENT',
    `UID:${clean(id || `${date}-${slot}`)}@serenova`, `DTSTAMP:${stamp(new Date())}`,
    `DTSTART:${stamp(start)}`, `DTEND:${stamp(end)}`,
    `SUMMARY:${clean(title)}`, `DESCRIPTION:${clean(description)}`,
    'BEGIN:VALARM', 'TRIGGER:-PT30M', 'ACTION:DISPLAY', 'DESCRIPTION:Counselling session in 30 minutes', 'END:VALARM',
    'END:VEVENT', 'END:VCALENDAR',
  ];
  const blob = new Blob([lines.join('\r\n')], { type: 'text/calendar;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'serenova-counselling-session.ics';
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  return true;
}
