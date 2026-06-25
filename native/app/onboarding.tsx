import React, { useState } from 'react';
import { ScrollView, View, Text, TextInput, Pressable, StyleSheet, useColorScheme } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { getTokens, Tokens } from '../src/theme/tokens';
import { usePrefs } from '../src/prefs/PrefsContext';
import { CustodyPattern, PatternType, defaultPattern, reanchor, mondayOf } from '../src/custody/pattern';
import { ContactPickerModal, PickedContact } from '../src/components/ContactPicker';

const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
type Step = 'name' | 'schedule' | 'coparent' | 'partner';

const STEPS: Step[] = ['name', 'schedule', 'coparent', 'partner'];
const STEP_LABELS: Record<Step, string> = {
  name: 'About you',
  schedule: 'Custody schedule',
  coparent: 'Co-parent',
  partner: 'Your partner',
};

function Seg<T extends string>({ value, opts, onChange, t }: { value: T; opts: { key: T; label: string }[]; onChange: (v: T) => void; t: Tokens }) {
  return (
    <View style={[styles.segment, { borderColor: t.hairline, backgroundColor: t.screenBg }]}>
      {opts.map((o) => {
        const on = o.key === value;
        return (
          <Pressable key={o.key} style={[styles.segBtn, { backgroundColor: on ? t.surface : 'transparent' }]} onPress={() => onChange(o.key)}>
            <Text style={{ color: on ? t.heading : t.muted, fontSize: 13, fontWeight: on ? '600' : '400' }}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function ScheduleEditor({ draft, setDraft, t }: { draft: CustodyPattern; setDraft: (f: (d: CustodyPattern) => CustodyPattern) => void; t: Tokens }) {
  const monday = mondayOf(new Date());
  const mk = (offset: number) => new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + offset);
  const week1 = Array.from({ length: 7 }, (_, i) => mk(i));
  const week2 = Array.from({ length: 7 }, (_, i) => mk(7 + i));

  const toggleWeekday = (dow: number) =>
    setDraft((d) => ({ ...d, weekdays: d.weekdays.includes(dow) ? d.weekdays.filter((x) => x !== dow) : [...d.weekdays, dow] }));
  const toggleSlot = (slot: number) =>
    setDraft((d) => { const f = [...d.fortnight]; f[slot] = !f[slot]; return { ...d, fortnight: f }; });

  const Week = ({ dates, base }: { dates: Date[]; base: number }) => (
    <View style={styles.weekRow}>
      {dates.map((dt, i) => {
        const selected = draft.type === 'weekdays' ? draft.weekdays.includes(dt.getDay()) : draft.fortnight[base + i];
        const tone = selected ? t.custody.mine : t.custody.free;
        const onPress = draft.type === 'weekdays' ? () => toggleWeekday(dt.getDay()) : () => toggleSlot(base + i);
        return (
          <Pressable key={i} onPress={onPress} style={[styles.dayBox, { backgroundColor: tone.fill, borderColor: tone.border }]}>
            <Text style={{ color: t.muted, fontSize: 10 }}>{DOW[dt.getDay()]}</Text>
            <Text style={{ color: tone.text, fontSize: 14, fontWeight: '600' }}>{dt.getDate()}</Text>
          </Pressable>
        );
      })}
    </View>
  );

  return (
    <>
      <Seg
        value={draft.type}
        opts={[{ key: 'alternating', label: 'Alternating weeks' }, { key: 'weekdays', label: 'Same days weekly' }]}
        onChange={(type: PatternType) => setDraft((d) => ({ ...d, type }))}
        t={t}
      />
      <Text style={[styles.caption, { color: t.muted }]}>
        Tap the days you have the kids{draft.type === 'alternating' ? ' · repeats every two weeks' : ' · repeats every week'}
      </Text>
      {draft.type === 'weekdays' ? (
        <Week dates={week1} base={0} />
      ) : (
        <>
          <Text style={[styles.weekLabel, { color: t.muted }]}>This week</Text>
          <Week dates={week1} base={0} />
          <Text style={[styles.weekLabel, { color: t.muted }]}>Next week</Text>
          <Week dates={week2} base={7} />
        </>
      )}
    </>
  );
}

function Field({ label, value, onChange, placeholder, keyboardType, t, optional }: {
  label: string; value: string; onChange: (v: string) => void;
  placeholder: string; t: Tokens; optional?: boolean;
  keyboardType?: 'default' | 'email-address' | 'phone-pad';
}) {
  return (
    <View style={styles.fieldWrap}>
      <View style={styles.fieldHead}>
        <Text style={[styles.fieldLabel, { color: t.muted }]}>{label}</Text>
        {optional ? <Text style={[styles.optional, { color: t.muted }]}>optional</Text> : null}
      </View>
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={t.muted}
        autoCapitalize={keyboardType ? 'none' : 'words'}
        autoCorrect={false}
        keyboardType={keyboardType ?? 'default'}
        style={[styles.input, { color: t.heading, borderColor: t.hairline, backgroundColor: t.surface }]}
      />
    </View>
  );
}

// Contact block: name + pick-from-contacts button + mobile + email
function ContactBlock({
  label,
  description,
  name,
  setName,
  mobile,
  setMobile,
  email,
  setEmail,
  t,
}: {
  label: string;
  description: string;
  name: string;
  setName: (v: string) => void;
  mobile: string;
  setMobile: (v: string) => void;
  email: string;
  setEmail: (v: string) => void;
  t: Tokens;
}) {
  const [pickerOpen, setPickerOpen] = useState(false);

  const onPick = (c: PickedContact) => {
    setName(c.name);
    if (c.mobile) setMobile(c.mobile);
    if (c.email) setEmail(c.email);
  };

  return (
    <>
      <ContactPickerModal visible={pickerOpen} onClose={() => setPickerOpen(false)} onPick={onPick} t={t} />
      <Text style={[styles.lead, { color: t.muted }]}>{description}</Text>

      <Pressable
        style={[styles.contactPickBtn, { backgroundColor: t.surface, borderColor: t.hairline }]}
        onPress={() => setPickerOpen(true)}
      >
        <Text style={[styles.contactPickIcon, { color: t.overlap.ring }]}>👤</Text>
        <Text style={[styles.contactPickText, { color: t.heading }]}>Choose from contacts</Text>
        <Text style={[styles.contactPickChev, { color: t.muted }]}>›</Text>
      </Pressable>

      <View style={[styles.orRow]}>
        <View style={[styles.orLine, { backgroundColor: t.hairline }]} />
        <Text style={[styles.orText, { color: t.muted }]}>or type manually</Text>
        <View style={[styles.orLine, { backgroundColor: t.hairline }]} />
      </View>

      <Field label={`${label}'s name`} value={name} onChange={setName} placeholder="First name" t={t} />
      <Field label="Mobile" value={mobile} onChange={setMobile} placeholder="+44 7700 900000" keyboardType="phone-pad" t={t} optional />
      <Field label="Email" value={email} onChange={setEmail} placeholder="name@example.com" keyboardType="email-address" t={t} optional />
    </>
  );
}

export default function Onboarding() {
  const t = getTokens(useColorScheme());
  const { name, setName, pattern, setPattern, onboarded, setOnboarded, setPartner, setCoParent } = usePrefs();

  const editing = onboarded;
  const [step, setStep] = useState<Step>('name');
  const [draftName, setDraftName] = useState(name ?? '');
  const [draft, setDraft] = useState<CustodyPattern>(() => reanchor(pattern ?? defaultPattern(new Date()), new Date()));

  // Co-parent
  const [coparentName, setCoparentName] = useState('');
  const [coparentMobile, setCoparentMobile] = useState('');
  const [coparentEmail, setCoparentEmail] = useState('');

  // Partner
  const [partnerName, setPartnerName] = useState('');
  const [partnerMobile, setPartnerMobile] = useState('');
  const [partnerEmail, setPartnerEmail] = useState('');

  const stepIndex = STEPS.indexOf(step) + 1;

  const finish = (invite: boolean) => {
    setName(draftName.trim() || null);
    setPattern(draft);
    if (coparentName.trim()) {
      setCoParent({
        name: coparentName.trim(),
        mobile: coparentMobile.trim() || undefined,
        email: coparentEmail.trim() || undefined,
      });
    }
    if (invite && partnerName.trim()) {
      setPartner({
        name: partnerName.trim(),
        status: 'invited',
        mobile: partnerMobile.trim() || undefined,
        email: partnerEmail.trim() || undefined,
      });
    }
    setOnboarded(true);
    router.replace('/');
  };

  // Edit-schedule-only mode (reached from Settings)
  if (editing) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: t.screenBg }} edges={['top']}>
        <ScrollView contentContainerStyle={styles.scroll}>
          <View style={styles.headerRow}>
            <Pressable style={styles.back} onPress={() => router.back()}>
              <Text style={[styles.backText, { color: t.heading }]}>‹</Text>
            </Pressable>
            <Text style={[styles.h1s, { color: t.heading }]}>Custody schedule</Text>
            <View style={styles.back} />
          </View>
          <ScheduleEditor draft={draft} setDraft={setDraft} t={t} />
          <Pressable style={[styles.primaryBtn, { backgroundColor: t.heading }]} onPress={() => { setPattern(draft); router.back(); }}>
            <Text style={[styles.primaryText, { color: t.surface }]}>Save schedule</Text>
          </Pressable>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.screenBg }} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">

        {/* Progress indicator */}
        <View style={styles.progressRow}>
          {STEPS.map((s, i) => (
            <View
              key={s}
              style={[
                styles.progressDot,
                {
                  backgroundColor: i < stepIndex ? t.heading : i === stepIndex - 1 ? t.heading : t.hairline,
                  width: i === stepIndex - 1 ? 20 : 8,
                },
              ]}
            />
          ))}
        </View>
        <Text style={[styles.kicker, { color: t.muted }]}>Step {stepIndex} of {STEPS.length} · {STEP_LABELS[step]}</Text>

        {/* ── Step 1: Name ── */}
        {step === 'name' ? (
          <>
            <Text style={[styles.h1, { color: t.heading }]}>Welcome to Spontany</Text>
            <Text style={[styles.lead, { color: t.muted }]}>Let's set up your calendar. What should we call you?</Text>
            <Field label="Your name" value={draftName} onChange={setDraftName} placeholder="First name" t={t} />
            <Pressable
              style={[styles.primaryBtn, { backgroundColor: draftName.trim() ? t.heading : t.hairline }]}
              disabled={!draftName.trim()}
              onPress={() => setStep('schedule')}
            >
              <Text style={[styles.primaryText, { color: t.surface }]}>Continue</Text>
            </Pressable>
          </>
        ) : null}

        {/* ── Step 2: Schedule ── */}
        {step === 'schedule' ? (
          <>
            <Text style={[styles.h1, { color: t.heading }]}>Your custody schedule</Text>
            <Text style={[styles.lead, { color: t.muted }]}>Tap the days you have the kids. We'll use this to show you when you're free.</Text>
            <ScheduleEditor draft={draft} setDraft={setDraft} t={t} />
            <View style={styles.row}>
              <Pressable style={[styles.ghostBtn, { borderColor: t.hairline }]} onPress={() => setStep('name')}>
                <Text style={[styles.ghostText, { color: t.muted }]}>Back</Text>
              </Pressable>
              <Pressable style={[styles.primaryBtn, { backgroundColor: t.heading, flex: 1 }]} onPress={() => setStep('coparent')}>
                <Text style={[styles.primaryText, { color: t.surface }]}>Continue</Text>
              </Pressable>
            </View>
          </>
        ) : null}

        {/* ── Step 3: Co-parent ── */}
        {step === 'coparent' ? (
          <>
            <Text style={[styles.h1, { color: t.heading }]}>Who do you share custody with?</Text>
            <ContactBlock
              label="Co-parent"
              description="The other parent of your kids — kept private, for your reference only."
              name={coparentName}
              setName={setCoparentName}
              mobile={coparentMobile}
              setMobile={setCoparentMobile}
              email={coparentEmail}
              setEmail={setCoparentEmail}
              t={t}
            />
            <View style={styles.row}>
              <Pressable style={[styles.ghostBtn, { borderColor: t.hairline }]} onPress={() => setStep('schedule')}>
                <Text style={[styles.ghostText, { color: t.muted }]}>Back</Text>
              </Pressable>
              <Pressable style={[styles.primaryBtn, { backgroundColor: t.heading, flex: 1 }]} onPress={() => setStep('partner')}>
                <Text style={[styles.primaryText, { color: t.surface }]}>{coparentName.trim() ? 'Continue' : 'Skip for now'}</Text>
              </Pressable>
            </View>
          </>
        ) : null}

        {/* ── Step 4: Partner ── */}
        {step === 'partner' ? (
          <>
            <Text style={[styles.h1, { color: t.heading }]}>Invite your partner</Text>
            <ContactBlock
              label="Partner"
              description="Who you want to plan free time with — when you're both free, Spontany shows you the overlap."
              name={partnerName}
              setName={setPartnerName}
              mobile={partnerMobile}
              setMobile={setPartnerMobile}
              email={partnerEmail}
              setEmail={setPartnerEmail}
              t={t}
            />
            <Text style={[styles.note, { color: t.muted }]}>Real invites activate once the app is connected to the backend.</Text>
            <View style={styles.row}>
              <Pressable style={[styles.ghostBtn, { borderColor: t.hairline }]} onPress={() => setStep('coparent')}>
                <Text style={[styles.ghostText, { color: t.muted }]}>Back</Text>
              </Pressable>
              <Pressable style={[styles.ghostBtn, { borderColor: t.hairline }]} onPress={() => finish(false)}>
                <Text style={[styles.ghostText, { color: t.muted }]}>Skip</Text>
              </Pressable>
              <Pressable
                style={[styles.primaryBtn, { backgroundColor: partnerName.trim() ? t.heading : t.hairline, flex: 1 }]}
                disabled={!partnerName.trim()}
                onPress={() => finish(true)}
              >
                <Text style={[styles.primaryText, { color: t.surface }]}>Send invite</Text>
              </Pressable>
            </View>
          </>
        ) : null}

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: 24, paddingBottom: 48 },

  // Progress
  progressRow: { flexDirection: 'row', gap: 6, alignItems: 'center', marginBottom: 10 },
  progressDot: { height: 8, borderRadius: 4 },
  kicker: { fontSize: 12, fontWeight: '500', marginBottom: 20 },

  // Header (edit mode)
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
  back: { width: 36, alignItems: 'flex-start' },
  backText: { fontSize: 28, fontWeight: '500', lineHeight: 30 },
  h1s: { fontSize: 18, fontWeight: '700' },

  // Copy
  h1: { fontSize: 24, fontWeight: '800', marginBottom: 8, letterSpacing: -0.3 },
  lead: { fontSize: 15, lineHeight: 22, marginBottom: 20, fontWeight: '400' },
  note: { fontSize: 12, marginTop: 4, marginBottom: 4 },

  // Schedule editor
  segment: { flexDirection: 'row', borderRadius: 12, padding: 4, gap: 4, marginTop: 12 },
  segBtn: { flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: 9 },
  caption: { fontSize: 13, marginTop: 14, marginBottom: 10 },
  weekLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 0.6, textTransform: 'uppercase', marginTop: 14, marginBottom: 8 },
  weekRow: { flexDirection: 'row', gap: 5 },
  dayBox: { flex: 1, alignItems: 'center', borderRadius: 10, borderWidth: 1, paddingVertical: 10, gap: 2 },

  // Contact picker button
  contactPickBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    borderWidth: 1, borderRadius: 14, padding: 14, marginBottom: 16,
  },
  contactPickIcon: { fontSize: 18 },
  contactPickText: { flex: 1, fontSize: 15, fontWeight: '500' },
  contactPickChev: { fontSize: 20 },

  // Or divider
  orRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 },
  orLine: { flex: 1, height: StyleSheet.hairlineWidth },
  orText: { fontSize: 12 },

  // Field
  fieldWrap: { gap: 6, marginBottom: 14 },
  fieldHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  fieldLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 0.6, textTransform: 'uppercase' },
  optional: { fontSize: 11 },
  input: { height: 48, borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, fontSize: 15 },

  // Buttons
  row: { flexDirection: 'row', gap: 10, marginTop: 24, alignItems: 'center' },
  primaryBtn: { borderRadius: 14, paddingVertical: 15, alignItems: 'center', marginTop: 8 },
  primaryText: { fontSize: 15, fontWeight: '700' },
  ghostBtn: { borderWidth: 1, borderRadius: 14, paddingVertical: 14, paddingHorizontal: 18 },
  ghostText: { fontSize: 14, fontWeight: '500' },
});
