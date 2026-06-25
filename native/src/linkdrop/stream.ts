import { ParsedLink } from './parse';

// Mock personal stream — the "save for me" side of the fork. In-memory only;
// the real version lands on the backend's pulse_items in a later phase.
const saved: ParsedLink[] = [];

export function addToStream(item: ParsedLink): void {
  saved.push(item);
}

export function streamCount(): number {
  return saved.length;
}

export function streamItems(): ParsedLink[] {
  return saved.slice();
}
