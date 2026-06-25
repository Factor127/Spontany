import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ScrollView, View, Text, StyleSheet, ActivityIndicator, Pressable, useColorScheme, PanResponder } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams, Redirect } from 'expo-router';
import { getTokens, Tokens, withHighlight } from '../src/theme/tokens';
import { usePrefs } from '../src/prefs/PrefsContext';
import { DayCell } from '../src/components/DayCell';
import { DaySheet } from '../src/components/DaySheet';
import { LinkDropSheet } from '../src/components/LinkDropSheet';
import { useCalendarMonth, Source } from '../src/hooks/useCalendarMonth';
import { MONTHS, MONTHS_ABBR, dateStr } from '../src/calendar/month';
import { upcomingMatches } from '../src/calendar/matches';
import { setDayNote } from '../src/api/client';
import { addToStream } from '../src/linkdrop/stream';
import { ParsedLink } from '../src/linkdrop/parse';
import { getStoredOwnership, getStoredEvent, getStoredNote, setStoredNote, getAllStoredEvents } from '../src/mock/store';
import { ownershipFor, partnerFreeFor } from '../src/custody/pattern';
import { Day, DayEvent, Ownership, Rsvp } from '../src/types';

const DOW = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];

function SourceBanner({ source, error, t }: { source: Source; error?: string; t: Tokens }) {
  if (source === 'live') return null;
  const msg = error
    ? `Couldn't reach the backend — showing sample data`
    : 'Showing sample data · set an access token to go live';
  return (
    <View style={[styles.banner, { backgroundColor: t.surface, borderColor: t.hairline }]}>
      <Text style={[styles.bannerText, { color: t.muted }]}>{msg}</Text>
    </View>
  );
}

function Legend({ t }: { t: Tokens }) {
  return (
    <View style={[styles.legend, { borderTopColor: t.hairline }]}>
      <View style={styles.legItem}>
        <View style={[styles.sw, { backgroundColor: t.custody.mine.fill, borderColor: t.custody.mine.border, borderWidth: 1 }]} />
        <Text style={[styles.legText, { color: t.muted }]}>my day</Text>
      </View>
      <View style={styles.legItem}>
        <View style={[styles.sw, { backgroundColor: t.custody.free.fill, borderColor: t.custody.free.border, borderWidth: 1 }]} />
        <Text style={[styles.legText, { color: t.muted }]}>free</Text>
      </View>
      <View style={styles.legItem}>
        <View style={[styles.sw, { backgroundColor: t.custody.free.fill, borderColor: t.overlap.ring, borderWidth: 2 }]} />
        <Text style={[styles.legText, { color: t.muted }]}>both free</Text>
      </View>
      <View style={styles.legItem}>
        <View style={[styles.sw, { backgroundColor: t.event.confirmed.bg, borderColor: t.event.confirmed.border, borderWidth: 1 }]} />
        <Text style={[styles.legText, { color: t.muted }]}>event</Text>
      </View>
    </View>
  );
}

export default function Calendar() {
  const { highlight, onboarded, partner, pattern } = usePrefs();
  const connected = partner?.status === 'connected';
  const t = withHighlight(getTokens(useColorScheme()), highlight);
  const params = useLocalSearchParams<{ open?: string }>();
  const now = new Date();
  const [cursor, setCursor] = useState({ year: now.getFullYear(), month: now.getMonth() });
  const { year, month } = cursor;

  const shiftMonth = (delta: number) =>
    setCursor((c) => {
      const idx = c.year * 12 + c.month + delta;
      return { year: Math.floor(idx / 12), month: ((idx % 12) + 12) % 12 };
    });

  const { weeks, loading, error, source, applyNote, applyEvent, applyEventAt, applyOwnership } = useCalendarMonth(year, month);

  const matches = connected ? upcomingMatches(pattern, now, 12) : [];

  const getDayInfo = useCallback((iso: string) => {
    const [y, mo, d] = iso.split('-').map(Number);
    const m = mo - 1;
    const storedOwnership = getStoredOwnership(iso);
    const ownership = storedOwnership ?? ownershipFor(pattern, y, m, d);
    const partnerFree = connected && partnerFreeFor(y, m, d);
    const bothFree = ownership === 'free' && partnerFree;
    return { ownership, bothFree, event: getStoredEvent(iso), note: getStoredNote(iso) };
  }, [pattern, connected]);

  const [selectedDate, setSelectedDate] = useState<number | null>(null);
  const [linkOpen, setLinkOpen] = useState(false);

  const swipe = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > Math.abs(g.dy) * 1.5 && Math.abs(g.dx) > 8,
      onPanResponderRelease: (_, g) => {
        if (g.dx < -40) shiftMonth(1);
        else if (g.dx > 40) shiftMonth(-1);
      },
    }),
  ).current;

  useEffect(() => {
    const m = params.open?.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!m) return;
    setCursor({ year: Number(m[1]), month: Number(m[2]) - 1 });
    setSelectedDate(Number(m[3]));
  }, [params.open]);

  const selected = selectedDate != null ? weeks.flat().find((d): d is Day => !!d && d.date === selectedDate) ?? null : null;
  const selectedOverridden = selectedDate != null && getStoredOwnership(dateStr(year, month, selectedDate)) !== undefined;
  const bothFree = weeks.flat().filter((d): d is Day => !!d && !!d.bothFree).map((d) => d.date);
  const inboxCount = getAllStoredEvents().filter(
    (e) => e.event.kind === 'invite' && e.event.direction === 'incoming' && e.event.rsvp === 'pending',
  ).length;

  const handleSave = async (note: string | null) => {
    if (selectedDate == null) return;
    const dayNum = selectedDate;
    setSelectedDate(null);
    applyNote(dayNum, note);
    try { await setDayNote(dateStr(year, month, dayNum), note); } catch {}
  };

  const handleInvite = (iso: string, parsed: ParsedLink | null) => {
    applyEventAt(iso, {
      title: parsed?.title ?? 'Plan something together',
      kind: 'invite',
      direction: 'outgoing',
      rsvp: 'pending',
      url: parsed?.url,
      venue: parsed?.venue,
      timeLabel: parsed?.dateLabel,
    });
    const [y, m] = iso.split('-').map(Number);
    setCursor({ year: y, month: m - 1 });
  };

  const handleLinkSave = (parsed: ParsedLink | null, iso: string) => {
    if (parsed) addToStream(parsed);
    applyEventAt(iso, { title: parsed?.title ?? 'Day marked', kind: 'mine', url: parsed?.url, venue: parsed?.venue, timeLabel: parsed?.dateLabel });
    const [y, m] = iso.split('-').map(Number);
    setCursor({ year: y, month: m - 1 });
  };

  const handleEvent = (event: DayEvent | undefined) => {
    if (selectedDate != null) applyEvent(selectedDate, event);
  };

  const handleRsvp = (rsvp: Rsvp) => {
    if (selectedDate != null && selected?.event) applyEvent(selectedDate, { ...selected.event, rsvp });
  };

  const handleProposeChange = (newDay: number) => {
    if (selectedDate == null || !selected?.event) return;
    const ev = selected.event;
    applyEvent(selectedDate, undefined);
    applyEvent(newDay, { ...ev, rsvp: 'pending', movedFrom: selectedDate });
    setSelectedDate(newDay);
  };

  const handleOwnership = (ownership: Ownership | undefined) => {
    if (selectedDate != null) applyOwnership(selectedDate, ownership);
  };

  const handleProposePlan = (title: string) => {
    if (selectedDate != null) applyEvent(selectedDate, { title, kind: 'invite', direction: 'outgoing', rsvp: 'pending' });
  };

  if (!onboarded) return <Redirect href="/onboarding" />;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.screenBg }} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll}>

        {/* ── Header ── */}
        <View style={styles.header}>
          <View style={styles.monthRow}>
            <Text style={[styles.monthName, { color: t.heading }]}>{MONTHS[month]}</Text>
            <Text style={[styles.monthYear, { color: t.muted }]}>{year}</Text>
            {year !== now.getFullYear() || month !== now.getMonth() ? (
              <Pressable
                style={[styles.todayPill, { borderColor: t.hairline }]}
                onPress={() => setCursor({ year: now.getFullYear(), month: now.getMonth() })}
              >
                <Text style={[styles.todayText, { color: t.muted }]}>Today</Text>
              </Pressable>
            ) : null}
          </View>
          <View style={styles.headerRight}>
            <Pressable style={styles.iconBtn} onPress={() => router.push('/activity')} accessibilityLabel="Activity">
              <Text style={[styles.icon, { color: t.muted }]}>≡</Text>
              {inboxCount > 0 ? (
                <View style={[styles.badge, { backgroundColor: t.event.confirmed.bg }]}>
                  <Text style={styles.badgeText}>{inboxCount}</Text>
                </View>
              ) : null}
            </Pressable>
            <Pressable style={styles.iconBtn} onPress={() => router.push('/settings')} accessibilityLabel="Settings">
              <Text style={[styles.icon, { color: t.muted }]}>⚙</Text>
            </Pressable>
          </View>
        </View>

        <SourceBanner source={source} error={error} t={t} />

        {loading ? (
          <ActivityIndicator style={{ marginVertical: 40 }} color={t.overlap.ring} />
        ) : (
          <View {...swipe.panHandlers}>
            {/* Day-of-week header */}
            <View style={styles.dowRow}>
              {DOW.map((d) => (
                <Text key={d} style={[styles.dow, { color: t.muted }]}>{d}</Text>
              ))}
            </View>

            {/* Calendar grid */}
            <View style={styles.grid}>
              {weeks.map((week, wi) => (
                <View key={wi} style={styles.week}>
                  {week.map((day, di) =>
                    day ? (
                      <DayCell key={day.date} day={day} t={t} onPress={(d) => setSelectedDate(d.date)} />
                    ) : (
                      <View key={`x${di}`} style={styles.spacer} />
                    ),
                  )}
                </View>
              ))}
            </View>

            <Legend t={t} />
          </View>
        )}
      </ScrollView>

      {/* FAB */}
      {!loading ? (
        <Pressable
          style={[styles.fab, { backgroundColor: t.event.confirmed.bg }]}
          onPress={() => setLinkOpen(true)}
          accessibilityLabel="Plan something"
        >
          <Text style={styles.fabPlus}>+</Text>
        </Pressable>
      ) : null}

      {selected ? (
        <DaySheet
          day={selected}
          dateLabel={`${MONTHS_ABBR[month]} ${selected.date}`}
          monthAbbr={MONTHS_ABBR[month]}
          bothFree={bothFree}
          t={t}
          overridden={selectedOverridden}
          onClose={() => setSelectedDate(null)}
          onSave={handleSave}
          onEvent={handleEvent}
          onRsvp={handleRsvp}
          onProposeChange={handleProposeChange}
          onProposePlan={handleProposePlan}
          onOwnership={handleOwnership}
        />
      ) : null}

      {linkOpen ? (
        <LinkDropSheet
          t={t}
          matches={matches}
          getDayInfo={getDayInfo}
          onClose={() => setLinkOpen(false)}
          onSave={handleLinkSave}
          onInvite={handleInvite}
          onNote={(iso, note) => setStoredNote(iso, note || null)}
        />
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: 20, paddingBottom: 100 },

  // Header
  header: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 },
  monthRow: { flexDirection: 'row', alignItems: 'baseline', gap: 8 },
  monthName: { fontSize: 32, fontWeight: '800', letterSpacing: -0.5 },
  monthYear: { fontSize: 18, fontWeight: '400' },
  todayPill: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3, marginLeft: 4 },
  todayText: { fontSize: 12, fontWeight: '500' },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 2, paddingTop: 6 },
  iconBtn: { paddingHorizontal: 8, paddingVertical: 4 },
  icon: { fontSize: 20 },
  badge: {
    position: 'absolute', top: -2, right: 4,
    minWidth: 15, height: 15, borderRadius: 8,
    paddingHorizontal: 3, alignItems: 'center', justifyContent: 'center',
  },
  badgeText: { color: '#fff', fontSize: 9, fontWeight: '700' },

  banner: { borderWidth: 1, borderRadius: 10, paddingVertical: 8, paddingHorizontal: 12, marginBottom: 16 },
  bannerText: { fontSize: 12 },

  // Grid
  dowRow: { flexDirection: 'row', gap: 5, marginBottom: 8 },
  dow: { flex: 1, fontSize: 10, fontWeight: '700', textAlign: 'center', letterSpacing: 0.8 },
  grid: { gap: 5 },
  week: { flexDirection: 'row', gap: 5 },
  spacer: { flex: 1 },

  // Legend
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: 14, marginTop: 20, paddingTop: 16, borderTopWidth: StyleSheet.hairlineWidth },
  legItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legText: { fontSize: 11 },
  sw: { width: 13, height: 13, borderRadius: 4 },

  // FAB
  fab: {
    position: 'absolute', right: 20, bottom: 28,
    width: 58, height: 58, borderRadius: 29,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#EA580C',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.45,
    shadowRadius: 14,
    elevation: 10,
  },
  fabPlus: { color: '#fff', fontSize: 32, fontWeight: '300', lineHeight: 36, marginTop: -2 },
});
