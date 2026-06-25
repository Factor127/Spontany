export type Ownership = 'mine' | 'free';

export type EventKind = 'mine' | 'invite';
export type Rsvp = 'pending' | 'accepted' | 'maybe' | 'declined';

export interface DayEvent {
  title: string;
  kind: EventKind;
  // invite-only:
  direction?: 'outgoing' | 'incoming'; // outgoing = I invited my partner; incoming = they invited me
  rsvp?: Rsvp;
  movedFrom?: number; // day-of-month the event was moved from via "propose a change"
  // details (from the dropped link):
  url?: string;
  venue?: string;
  timeLabel?: string;
}

export interface Day {
  date: number;
  ownership: Ownership; // Layer 1 — the ONLY thing allowed to set the cell fill
  bothFree?: boolean; // Layer 2 — overlap frame (meaningful only on free days)
  partnerFree?: boolean; // is the partner free this day — kept so overlap can be recomputed when custody is overridden
  event?: DayEvent; // Layer 3 — event chip
  note?: string; // Layer 4 — quiet note label
  isToday?: boolean;
}
