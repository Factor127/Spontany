import React from 'react';
import { ScrollView, View, Text, Pressable, Linking, StyleSheet, useColorScheme } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { getTokens, Tokens } from '../src/theme/tokens';
import { getAllStoredEvents } from '../src/mock/store';
import { streamItems } from '../src/linkdrop/stream';
import { MONTHS_ABBR } from '../src/calendar/month';
import { DayEvent } from '../src/types';

const openLink = (u?: string) => {
  if (u) Linking.openURL(u).catch(() => {});
};

interface Row {
  dateISO: string;
  event: DayEvent;
}

const labelFor = (iso: string) => {
  const [, m, d] = iso.split('-').map(Number);
  return `${MONTHS_ABBR[m - 1]} ${d}`;
};

function Section({ title, rows, t }: { title: string; rows: Row[]; t: Tokens }) {
  if (!rows.length) return null;
  return (
    <>
      <Text style={[styles.section, { color: t.muted }]}>{title}</Text>
      {rows.map(({ dateISO, event }) => {
        const solid = event.kind === 'mine' || event.rsvp === 'accepted';
        const tone = solid ? t.event.confirmed : t.event.proposed;
        const status =
          event.kind === 'mine'
            ? 'Saved'
            : event.rsvp === 'accepted'
              ? 'Confirmed'
              : event.rsvp === 'maybe'
                ? 'Maybe'
                : event.rsvp === 'declined'
                  ? 'Declined'
                  : event.direction === 'incoming'
                    ? 'Invited you'
                    : 'Awaiting';
        return (
          <Pressable
            key={dateISO + event.title}
            style={[styles.card, { backgroundColor: t.surface, borderColor: t.hairline }]}
            onPress={() => router.push({ pathname: '/', params: { open: dateISO } })}
          >
            <View style={{ flex: 1 }}>
              <Text style={[styles.title, { color: t.heading }]}>{event.title}</Text>
              <Text style={[styles.sub, { color: t.muted }]}>
                {[labelFor(dateISO), event.timeLabel, event.venue].filter(Boolean).join(' · ')}
              </Text>
            </View>
            <View style={[styles.pill, { backgroundColor: tone.bg, borderColor: tone.border }]}>
              <Text style={[styles.pillText, { color: tone.text }]}>{status}</Text>
            </View>
          </Pressable>
        );
      })}
    </>
  );
}

export default function Activity() {
  const t = getTokens(useColorScheme());
  const all = getAllStoredEvents().sort((a, b) => a.dateISO.localeCompare(b.dateISO));

  const isInvite = (e: DayEvent) => e.kind === 'invite';
  const needsResponse = all.filter((r) => isInvite(r.event) && r.event.direction === 'incoming' && (r.event.rsvp === 'pending' || r.event.rsvp === 'maybe'));
  const waiting = all.filter((r) => isInvite(r.event) && r.event.direction === 'outgoing' && (r.event.rsvp === 'pending' || r.event.rsvp === 'maybe'));
  const confirmed = all.filter((r) => r.event.rsvp === 'accepted');
  const declined = all.filter((r) => r.event.rsvp === 'declined');
  const saved = streamItems();

  const empty = !needsResponse.length && !waiting.length && !confirmed.length && !declined.length && !saved.length;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.screenBg }} edges={['top']}>
      <ScrollView contentContainerStyle={{ padding: 16 }}>
        <View style={styles.header}>
          <Pressable style={styles.back} onPress={() => router.back()} accessibilityLabel="Back">
            <Text style={[styles.backText, { color: t.heading }]}>‹</Text>
          </Pressable>
          <Text style={[styles.h1, { color: t.heading }]}>Activity</Text>
          <View style={styles.back} />
        </View>

        {empty ? (
          <Text style={[styles.sub, { color: t.muted }]}>Nothing yet — invites and plans show up here.</Text>
        ) : (
          <>
            <Section title="Needs your response" rows={needsResponse} t={t} />
            <Section title="Waiting on your partner" rows={waiting} t={t} />
            <Section title="Confirmed" rows={confirmed} t={t} />
            <Section title="Declined" rows={declined} t={t} />

            {saved.length ? (
              <>
                <Text style={[styles.section, { color: t.muted }]}>Saved to go</Text>
                {saved.map((s, i) => (
                  <View key={`${s.title}${i}`} style={[styles.card, { backgroundColor: t.surface, borderColor: t.hairline }]}>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.title, { color: t.heading }]}>{s.title}</Text>
                      <Text style={[styles.sub, { color: t.muted }]}>{[s.dateLabel, s.venue].filter(Boolean).join(' · ') || 'Saved for later'}</Text>
                    </View>
                    {s.url ? (
                      <Pressable onPress={() => openLink(s.url)}>
                        <Text style={[styles.link, { color: t.overlap.ring }]}>See ↗</Text>
                      </Pressable>
                    ) : null}
                  </View>
                ))}
              </>
            ) : null}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 },
  back: { width: 36, alignItems: 'flex-start' },
  backText: { fontSize: 28, fontWeight: '500', lineHeight: 30 },
  h1: { fontSize: 20, fontWeight: '500' },
  section: { fontSize: 12, fontWeight: '500', marginTop: 12, marginBottom: 8 },
  card: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderRadius: 12, padding: 14, marginBottom: 10 },
  title: { fontSize: 15, fontWeight: '500' },
  sub: { fontSize: 12, marginTop: 2 },
  pill: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  pillText: { fontSize: 12, fontWeight: '500' },
  link: { fontSize: 13, fontWeight: '500' },
});
