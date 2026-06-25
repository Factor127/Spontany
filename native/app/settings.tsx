import React, { useState } from 'react';
import { ScrollView, View, Text, Pressable, Switch, StyleSheet, useColorScheme } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { getTokens, Tokens, withHighlight } from '../src/theme/tokens';
import { usePrefs, Highlight } from '../src/prefs/PrefsContext';
import { summarize } from '../src/custody/pattern';

function Segmented({ value, onChange, t }: { value: Highlight; onChange: (h: Highlight) => void; t: Tokens }) {
  const opts: { key: Highlight; label: string }[] = [
    { key: 'custody', label: 'My days' },
    { key: 'free', label: 'Free days' },
  ];
  return (
    <View style={[styles.segment, { borderColor: t.hairline, backgroundColor: t.screenBg }]}>
      {opts.map((o) => {
        const on = o.key === value;
        return (
          <Pressable
            key={o.key}
            style={[styles.segBtn, { backgroundColor: on ? t.surface : 'transparent' }]}
            onPress={() => onChange(o.key)}
          >
            <Text style={{ color: on ? t.heading : t.muted, fontSize: 13, fontWeight: on ? '600' : '400' }}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export default function Settings() {
  const scheme = useColorScheme();
  const { highlight, setHighlight, pattern, partner, coparent } = usePrefs();
  const t = getTokens(scheme);
  const preview = withHighlight(t, highlight);
  const [rsvpAlerts, setRsvpAlerts] = useState(true);

  const partnerContact = partner ? [partner.mobile, partner.email].filter(Boolean).join(' · ') : '';
  const partnerLabel = !partner
    ? 'Not connected · tap to invite'
    : partner.status === 'invited'
      ? `Invite sent to ${partner.name}${partnerContact ? ` (${partnerContact})` : ''} · waiting`
      : partner.status === 'pending'
        ? `${partner.name} joined · tap to confirm`
        : `Connected with ${partner.name}`;

  const coparentContact = coparent ? [coparent.mobile, coparent.email].filter(Boolean).join(' · ') : '';
  const coparentLabel = !coparent
    ? 'Not set · tap to add'
    : coparentContact
      ? `${coparent.name} · ${coparentContact}`
      : coparent.name;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.screenBg }} edges={['top']}>
      <ScrollView contentContainerStyle={{ padding: 20 }}>
        <View style={styles.header}>
          <Pressable style={styles.back} onPress={() => router.back()} accessibilityLabel="Back">
            <Text style={[styles.backText, { color: t.heading }]}>‹</Text>
          </Pressable>
          <Text style={[styles.h1, { color: t.heading }]}>Settings</Text>
          <View style={styles.back} />
        </View>

        {/* ── Custody ── */}
        <Text style={[styles.section, { color: t.muted }]}>Custody</Text>
        <View style={[styles.card, { backgroundColor: t.surface, borderColor: t.hairline }]}>
          <Pressable style={styles.linkRow} onPress={() => router.push('/onboarding')}>
            <Text style={[styles.rowTitle, { color: t.heading }]}>My custody schedule</Text>
            <Text style={[styles.rowSub, { color: t.muted }]}>
              {pattern ? summarize(pattern) : 'Using sample schedule · tap to set up'}
            </Text>
          </Pressable>
          <View style={[styles.divider, { backgroundColor: t.hairline }]} />
          {/* Co-parent = the other custody parent; their contact is stored for reference only */}
          <Pressable style={styles.linkRow} onPress={() => router.push('/onboarding')}>
            <Text style={[styles.rowTitle, { color: t.heading }]}>Co-parent</Text>
            <Text style={[styles.rowSub, { color: t.muted }]}>{coparentLabel}</Text>
          </Pressable>
        </View>

        {/* ── Partner ── */}
        {/* Partner = romantic partner you plan free time with; connection unlocks both-free overlap */}
        <Text style={[styles.section, { color: t.muted }]}>Partner</Text>
        <View style={[styles.card, { backgroundColor: t.surface, borderColor: t.hairline }]}>
          <Pressable style={styles.linkRow} onPress={() => router.push('/partner')}>
            <Text style={[styles.rowTitle, { color: t.heading }]}>Partner</Text>
            <Text style={[styles.rowSub, { color: t.muted }]}>{partnerLabel}</Text>
          </Pressable>
        </View>

        {/* ── Calendar ── */}
        <Text style={[styles.section, { color: t.muted }]}>Calendar</Text>
        <View style={[styles.card, { backgroundColor: t.surface, borderColor: t.hairline }]}>
          <Text style={[styles.rowTitle, { color: t.heading }]}>Highlight</Text>
          <Text style={[styles.rowSub, { color: t.muted }]}>Which days carry the strong colour.</Text>
          <Segmented value={highlight} onChange={setHighlight} t={t} />
          <View style={styles.swatches}>
            <View style={styles.swItem}>
              <View style={[styles.sw, { backgroundColor: preview.custody.mine.fill, borderColor: preview.custody.mine.border }]} />
              <Text style={[styles.swLabel, { color: t.muted }]}>my day</Text>
            </View>
            <View style={styles.swItem}>
              <View style={[styles.sw, { backgroundColor: preview.custody.free.fill, borderColor: preview.custody.free.border }]} />
              <Text style={[styles.swLabel, { color: t.muted }]}>free day</Text>
            </View>
          </View>
        </View>

        {/* ── Notifications ── */}
        <Text style={[styles.section, { color: t.muted }]}>Notifications</Text>
        <View style={[styles.card, { backgroundColor: t.surface, borderColor: t.hairline }]}>
          <View style={styles.switchRow}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.rowTitle, { color: t.heading }]}>Partner RSVP alerts</Text>
              <Text style={[styles.rowSub, { color: t.muted }]}>Notify me when my partner responds to an invite.</Text>
            </View>
            <Switch value={rsvpAlerts} onValueChange={setRsvpAlerts} />
          </View>
        </View>

        {/* ── Account ── */}
        <Text style={[styles.section, { color: t.muted }]}>Account</Text>
        <View style={[styles.card, { backgroundColor: t.surface, borderColor: t.hairline }]}>
          <Pressable style={styles.linkRow} onPress={() => {}}>
            <Text style={[styles.rowTitle, { color: t.heading }]}>Sign out</Text>
          </Pressable>
        </View>

        <Text style={[styles.foot, { color: t.muted }]}>Preview build · settings are mock only</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 },
  back: { width: 36, alignItems: 'flex-start' },
  backText: { fontSize: 28, fontWeight: '500', lineHeight: 30 },
  h1: { fontSize: 20, fontWeight: '700' },
  section: { fontSize: 11, fontWeight: '700', letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 8, marginTop: 20 },
  card: { borderWidth: 1, borderRadius: 16, paddingVertical: 4, marginBottom: 4, overflow: 'hidden' },
  divider: { height: StyleSheet.hairlineWidth, marginHorizontal: 14 },
  linkRow: { paddingVertical: 14, paddingHorizontal: 14, gap: 3 },
  rowTitle: { fontSize: 15, fontWeight: '500' },
  rowSub: { fontSize: 12 },
  segment: { flexDirection: 'row', borderRadius: 10, padding: 4, gap: 4, marginTop: 10 },
  segBtn: { flex: 1, alignItems: 'center', paddingVertical: 9, borderRadius: 8 },
  swatches: { flexDirection: 'row', gap: 18, marginTop: 4 },
  swItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  sw: { width: 14, height: 14, borderRadius: 4, borderWidth: 1 },
  swLabel: { fontSize: 12 },
  switchRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 14 },
  foot: { fontSize: 11, textAlign: 'center', marginTop: 20, marginBottom: 8 },
});
