import { DayEvent, Ownership } from '../types';

// Mock persistence keyed by full ISO date (YYYY-MM-DD) so user-added events,
// notes, and one-off custody overrides survive month navigation. The real app
// persists these on the backend; this is the in-memory stand-in for the demo.
const eventStore = new Map<string, DayEvent>();
const noteStore = new Map<string, string>();
const ownershipStore = new Map<string, Ownership>();

// One-off custody override for a single day — does not change the pattern.
export function setStoredOwnership(dateISO: string, ownership: Ownership | undefined): void {
  if (ownership) ownershipStore.set(dateISO, ownership);
  else ownershipStore.delete(dateISO);
}
export function getStoredOwnership(dateISO: string): Ownership | undefined {
  return ownershipStore.get(dateISO);
}

export function setStoredEvent(dateISO: string, event: DayEvent | undefined): void {
  if (event) eventStore.set(dateISO, event);
  else eventStore.delete(dateISO);
}
export function getStoredEvent(dateISO: string): DayEvent | undefined {
  return eventStore.get(dateISO);
}
// All stored events with their dates — powers the activity surface.
export function getAllStoredEvents(): { dateISO: string; event: DayEvent }[] {
  return Array.from(eventStore.entries()).map(([dateISO, event]) => ({ dateISO, event }));
}

// Seed a couple of INCOMING proposals (partner invited me) so the activity inbox
// and the recipient RSVP flow have something to act on in the demo. Runs once at
// import, relative to today, so they land in the current month.
(function seedIncomingProposals() {
  const now = new Date();
  const iso = (offsetDays: number) => {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + offsetDays);
    const p = (n: number) => (n < 10 ? `0${n}` : `${n}`);
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
  };
  eventStore.set(iso(2), {
    title: 'Rooftop dinner',
    kind: 'invite',
    direction: 'incoming',
    rsvp: 'pending',
    venue: 'The Norman, Tel Aviv',
    timeLabel: '8:00 pm',
    url: 'https://thenorman.com',
  });
  eventStore.set(iso(5), {
    title: 'Live comedy night',
    kind: 'invite',
    direction: 'incoming',
    rsvp: 'pending',
    venue: 'Comedy Bar',
    timeLabel: '9:30 pm',
    url: 'https://comedybar.co.il',
  });
})();

export function setStoredNote(dateISO: string, note: string | null): void {
  if (note) noteStore.set(dateISO, note);
  else noteStore.delete(dateISO);
}
export function getStoredNote(dateISO: string): string | undefined {
  return noteStore.get(dateISO);
}
