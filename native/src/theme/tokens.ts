// The four-layer palette. Each layer owns a different visual channel:
//   custody -> fill   |   overlap -> ring   |   event -> chip   |   note -> label

export interface CustodyTone {
  fill: string;
  border: string;
  text: string;
}

export interface EventTone {
  bg: string;
  text: string;
  border: string;
}

export interface Tokens {
  screenBg: string;
  surface: string;
  hairline: string;
  heading: string;
  muted: string;
  custody: { mine: CustodyTone; free: CustodyTone };
  overlap: { ring: string };
  event: { proposed: EventTone; confirmed: EventTone };
  note: { text: string };
}

export const lightTokens: Tokens = {
  screenBg:  '#F5F1EB',   // warm ivory
  surface:   '#FFFFFF',
  hairline:  '#E3DDD3',   // warm taupe
  heading:   '#1C1917',   // warm near-black
  muted:     '#9A9389',   // warm gray
  custody: {
    mine: { fill: '#EAE6FF', border: '#BEB5F5', text: '#3730A3' },  // soft indigo
    free: { fill: '#FDFAF7', border: '#E3DDD3', text: '#1C1917' },  // warm white
  },
  overlap: { ring: '#059669' },   // vivid emerald
  event: {
    proposed:  { bg: '#FFF3EE', text: '#7C2D12', border: '#FB923C' },
    confirmed: { bg: '#EA580C', text: '#FFFFFF', border: '#C2410C' },
  },
  note: { text: '#706860' },
};

export const darkTokens: Tokens = {
  screenBg:  '#0C0B08',   // very dark warm
  surface:   '#161410',   // dark brown-black
  hairline:  '#28251E',   // warm dark border
  heading:   '#EAE7E0',   // warm near-white
  muted:     '#857F73',   // warm gray
  custody: {
    mine: { fill: '#1E1A4E', border: '#3730A3', text: '#C4BBFF' },  // deep indigo
    free: { fill: '#161410', border: '#28251E', text: '#EAE7E0' },
  },
  overlap: { ring: '#34D399' },   // bright emerald
  event: {
    proposed:  { bg: '#3C1910', text: '#FDBA74', border: '#EA580C' },
    confirmed: { bg: '#EA580C', text: '#FFFFFF', border: '#FDBA74' },
  },
  note: { text: '#A89F94' },
};

export function getTokens(scheme: 'light' | 'dark' | null | undefined): Tokens {
  return scheme === 'dark' ? darkTokens : lightTokens;
}

export function withHighlight(t: Tokens, highlight: 'custody' | 'free'): Tokens {
  if (highlight === 'custody') return t;
  return { ...t, custody: { mine: t.custody.free, free: t.custody.mine } };
}
