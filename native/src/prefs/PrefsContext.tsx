import React, { createContext, useContext, useState } from 'react';
import { CustodyPattern } from '../custody/pattern';

export type Highlight = 'custody' | 'free';

export type PartnerStatus = 'invited' | 'pending' | 'connected';

export interface Partner {
  name: string;
  status: PartnerStatus;
  mobile?: string;
  email?: string;
}

export interface CoParent {
  name: string;
  mobile?: string;
  email?: string;
}

interface PrefsValue {
  highlight: Highlight;
  setHighlight: (h: Highlight) => void;
  pattern: CustodyPattern | null;
  setPattern: (p: CustodyPattern | null) => void;
  name: string | null;
  setName: (n: string | null) => void;
  onboarded: boolean;
  setOnboarded: (v: boolean) => void;
  partner: Partner | null;
  setPartner: (p: Partner | null) => void;
  coparent: CoParent | null;
  setCoParent: (c: CoParent | null) => void;
}

const PrefsContext = createContext<PrefsValue | null>(null);

export function PrefsProvider({ children }: { children: React.ReactNode }) {
  const [highlight, setHighlight] = useState<Highlight>('custody');
  const [pattern, setPattern] = useState<CustodyPattern | null>(null);
  const [name, setName] = useState<string | null>(null);
  const [onboarded, setOnboarded] = useState(false);
  const [partner, setPartner] = useState<Partner | null>(null);
  const [coparent, setCoParent] = useState<CoParent | null>(null);
  return (
    <PrefsContext.Provider
      value={{ highlight, setHighlight, pattern, setPattern, name, setName, onboarded, setOnboarded, partner, setPartner, coparent, setCoParent }}
    >
      {children}
    </PrefsContext.Provider>
  );
}

export function usePrefs(): PrefsValue {
  const v = useContext(PrefsContext);
  if (!v) throw new Error('usePrefs must be used within PrefsProvider');
  return v;
}
