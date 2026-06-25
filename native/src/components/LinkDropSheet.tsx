import React, { useEffect, useRef, useState } from 'react';
import {
  Modal, View, Text, TextInput, Pressable, ActivityIndicator,
  Image, ScrollView, StyleSheet, KeyboardAvoidingView, Platform,
} from 'react-native';
import { Tokens } from '../theme/tokens';
import { parseLink, ParsedLink } from '../linkdrop/parse';
import { MatchDate } from '../calendar/matches';
import { DayEvent, Ownership } from '../types';

type Stage = 'choose' | 'pick-date' | 'input' | 'loading' | 'craft' | 'done';
type DayInfo = { ownership: Ownership; bothFree: boolean; event?: DayEvent; note?: string };

const SAMPLE_URL = 'https://en.wikipedia.org/wiki/Jazz';
const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const ABBR = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);

function DayChips({ info, t }: { info: DayInfo; t: Tokens }) {
  const chips: { label: string; color: string; bg: string; border: string }[] = [];

  if (info.bothFree) {
    chips.push({ label: 'Both free', color: '#fff', bg: t.overlap.ring, border: t.overlap.ring });
  } else if (info.ownership === 'mine') {
    chips.push({ label: 'My day', color: t.custody.mine.text, bg: t.custody.mine.fill, border: t.custody.mine.border });
  }

  if (info.event) {
    const ev = info.event;
    let label = ev.title;
    if (ev.kind === 'invite') {
      if (ev.direction === 'incoming') {
        label = ev.rsvp === 'accepted' ? `${ev.title} · accepted` : `Invite: ${ev.title}`;
      } else {
        label = `Proposed: ${ev.title}`;
      }
    }
    chips.push({ label, color: t.event.confirmed.border, bg: t.event.confirmed.bg + '22', border: t.event.confirmed.border });
  }

  if (info.note) {
    chips.push({ label: info.note, color: t.muted, bg: 'transparent', border: t.hairline });
  }

  if (!chips.length) return null;

  return (
    <View style={styles.chips}>
      {chips.map((c, i) => (
        <View key={i} style={[styles.chip, { backgroundColor: c.bg, borderColor: c.border }]}>
          <Text style={[styles.chipText, { color: c.color }]} numberOfLines={1}>{c.label}</Text>
        </View>
      ))}
    </View>
  );
}

export function LinkDropSheet({
  t, matches, getDayInfo, onClose, onSave, onInvite, onNote,
}: {
  t: Tokens;
  matches: MatchDate[];
  getDayInfo: (iso: string) => DayInfo;
  onClose: () => void;
  onSave: (parsed: ParsedLink | null, iso: string) => void;
  onInvite: (iso: string, parsed: ParsedLink | null) => void;
  onNote: (iso: string, note: string) => void;
}) {
  const [stage, setStage] = useState<Stage>('choose');
  const [url, setUrl] = useState('');
  const [parsed, setParsed] = useState<ParsedLink | null>(null);
  const [focus, setFocus] = useState(0);
  const [matchIdx, setMatchIdx] = useState(0);
  const [pagerW, setPagerW] = useState(0);
  const [doneMsg, setDoneMsg] = useState('');
  // Second tier: opened by tapping the centred date box
  const [actionsOpen, setActionsOpen] = useState(false);
  const [noteMode, setNoteMode] = useState(false);
  const [noteText, setNoteText] = useState('');
  const scrollRef = useRef<ScrollView>(null);
  const centeredForStage = useRef<Stage | null>(null);

  const go = async (link: string) => {
    setStage('loading');
    const p = await parseLink(link);
    setParsed(p);
    setStage('craft');
  };

  const coral = t.event.confirmed;
  const itemW = pagerW > 0 ? pagerW / 3 : 0;

  const matchSet = new Set(matches.map((m) => m.iso));
  const today = new Date();
  const runDays = Array.from({ length: 60 }, (_, i) => {
    const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() + i);
    const iso = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    return { iso, dow: DOW[d.getDay()], date: d.getDate(), label: `${DOW[d.getDay()]}, ${ABBR[d.getMonth()]} ${d.getDate()}`, match: matchSet.has(iso) };
  });
  const focused = runDays[focus];
  const focusedInfo = focused ? getDayInfo(focused.iso) : null;

  // Auto-scroll to first both-free day when entering a carousel stage.
  useEffect(() => {
    if ((stage !== 'craft' && stage !== 'pick-date') || itemW === 0) return;
    if (centeredForStage.current === stage) return;
    centeredForStage.current = stage;
    const fm = runDays.findIndex((d) => d.match);
    if (fm > 0) {
      setFocus(fm);
      scrollRef.current?.scrollTo({ x: fm * itemW, animated: false });
    }
  }, [stage, itemW]);

  // Reset action panel whenever the focused date changes.
  useEffect(() => {
    setActionsOpen(false);
    setNoteMode(false);
    setNoteText(focusedInfo?.note ?? '');
  }, [focus]);

  // Reset matchIdx when entering pick-date.
  useEffect(() => {
    if (stage === 'pick-date') setMatchIdx(0);
  }, [stage]);

  const goNextMatch = () => {
    if (!matches.length) return;
    const next = (matchIdx + 1) % matches.length;
    setMatchIdx(next);
    const idx = runDays.findIndex((d) => d.iso === matches[next].iso);
    if (idx >= 0) {
      setFocus(idx);
      scrollRef.current?.scrollTo({ x: idx * itemW, animated: true });
    }
  };

  const handleScroll = (x: number) => {
    if (itemW <= 0) return;
    const idx = Math.round(x / itemW);
    const clamped = Math.max(0, Math.min(runDays.length - 1, idx));
    if (clamped !== focus) setFocus(clamped);
  };

  const renderCarousel = (p: ParsedLink | null) => (
    <>
      {/* Scrollable day strip */}
      <View style={styles.runWrap}>
        <ScrollView
          ref={scrollRef}
          horizontal
          showsHorizontalScrollIndicator={false}
          snapToInterval={itemW || 1}
          decelerationRate="fast"
          scrollEventThrottle={16}
          onLayout={(e) => setPagerW(e.nativeEvent.layout.width)}
          onScroll={(e) => handleScroll(e.nativeEvent.contentOffset.x)}
          contentContainerStyle={{ paddingHorizontal: itemW }}
        >
          {runDays.map((d, i) => {
            const isFocus = i === focus;
            return (
              <Pressable
                key={d.iso}
                style={{ width: itemW, alignItems: 'center', justifyContent: 'center' }}
                onPress={() => {
                  if (isFocus) {
                    // Second tap on the already-centred box → open actions
                    setActionsOpen((v) => !v);
                  } else {
                    setFocus(i);
                    scrollRef.current?.scrollTo({ x: i * itemW, animated: true });
                  }
                }}
              >
                <View
                  style={[
                    styles.runBox,
                    {
                      borderColor: d.match ? t.overlap.ring : t.hairline,
                      backgroundColor: isFocus
                        ? actionsOpen
                          ? t.heading           // solid when actions are open
                          : d.match ? t.overlap.ring : t.heading
                        : 'transparent',
                      transform: [{ scale: isFocus ? 1.1 : 0.82 }],
                    },
                  ]}
                >
                  <Text style={{ color: isFocus ? t.surface : d.match ? t.overlap.ring : t.muted, fontSize: 10, fontWeight: '500' }}>{d.dow}</Text>
                  <Text style={{ color: isFocus ? t.surface : d.match ? t.overlap.ring : t.heading, fontSize: 20, fontWeight: '500' }}>{d.date}</Text>
                </View>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {/* Date label */}
      <Text style={[styles.swipeHint, { color: t.muted }]}>
        {focused?.label ?? ''}
        {matches.length ? ' · teal = both free' : ''}
      </Text>

      {/* Day detail chips — always visible */}
      {focusedInfo ? <DayChips info={focusedInfo} t={t} /> : null}

      {/* "Next free day" button — only shown when actions are closed */}
      {!actionsOpen && matches.length > 0 ? (
        <Pressable style={[styles.matchBtn, { borderColor: t.overlap.ring }]} onPress={goNextMatch}>
          <Text style={[styles.matchBtnText, { color: t.overlap.ring }]}>Next free day with partner →</Text>
        </Pressable>
      ) : null}

      {/* Tap-to-confirm hint when actions are closed */}
      {!actionsOpen ? (
        <Text style={[styles.tapHint, { color: t.muted }]}>Tap the date to plan</Text>
      ) : null}

      {/* ── Action tier (revealed by tapping the centred date) ── */}
      {actionsOpen ? (
        <View style={styles.actionTier}>
          <View style={[styles.tierDivider, { backgroundColor: t.hairline }]} />

          {/* Note mode */}
          {noteMode ? (
            <View style={{ gap: 8 }}>
              <TextInput
                value={noteText}
                onChangeText={setNoteText}
                placeholder="Add a note for this day…"
                placeholderTextColor={t.muted}
                multiline
                style={[styles.noteInput, { color: t.heading, borderColor: t.hairline, backgroundColor: t.screenBg }]}
                autoFocus
              />
              <View style={styles.actRow}>
                <Pressable style={[styles.actionBtn, { borderColor: t.hairline, flex: 1 }]} onPress={() => setNoteMode(false)}>
                  <Text style={[styles.actionTitle, { color: t.muted }]}>Cancel</Text>
                </Pressable>
                <Pressable
                  style={[styles.actionBtn, { borderColor: t.custody.mine.border, flex: 2 }]}
                  onPress={() => {
                    onNote(focused.iso, noteText);
                    setNoteMode(false);
                    setActionsOpen(false);
                  }}
                >
                  <Text style={[styles.actionTitle, { color: t.heading }]}>Save note</Text>
                </Pressable>
              </View>
            </View>
          ) : (
            <View style={styles.actRow}>
              <Pressable
                style={[styles.actionBtn, { borderColor: t.custody.mine.border, flex: 1 }]}
                onPress={() => {
                  onSave(p, focused.iso);
                  setDoneMsg(`Saved to ${focused.label}`);
                  setStage('done');
                }}
              >
                <Text style={[styles.actionTitle, { color: t.heading }]}>Save</Text>
                <Text style={[styles.actionSub, { color: t.muted }]}>Just me</Text>
              </Pressable>

              <Pressable
                style={[styles.actionBtn, { borderColor: matches.length ? t.overlap.ring : t.hairline, flex: 1, opacity: matches.length ? 1 : 0.4 }]}
                disabled={!matches.length}
                onPress={() => {
                  onInvite(focused.iso, p);
                  setDoneMsg(`Proposed for ${focused.label} · waiting for your partner`);
                  setStage('done');
                }}
              >
                <Text style={[styles.actionTitle, { color: t.heading }]}>Invite</Text>
                <Text style={[styles.actionSub, { color: t.muted }]}>{matches.length ? 'Partner' : 'No partner'}</Text>
              </Pressable>

              <Pressable
                style={[styles.actionBtn, { borderColor: t.hairline, flex: 1 }]}
                onPress={() => {
                  setNoteText(focusedInfo?.note ?? '');
                  setNoteMode(true);
                }}
              >
                <Text style={[styles.actionTitle, { color: t.heading }]}>Note</Text>
                <Text style={[styles.actionSub, { color: t.muted }]}>Add</Text>
              </Pressable>
            </View>
          )}
        </View>
      ) : null}
    </>
  );

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.layer}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={[styles.sheet, { backgroundColor: t.surface, borderColor: t.hairline }]}>
          <View style={[styles.handle, { backgroundColor: t.hairline }]} />

          {/* ── Choose ── */}
          {stage === 'choose' ? (
            <>
              <Text style={[styles.title, { color: t.heading }]}>What do you want to plan?</Text>
              <Pressable
                style={[styles.choiceBtn, { borderColor: t.custody.mine.border, backgroundColor: t.screenBg }]}
                onPress={() => setStage('pick-date')}
              >
                <Text style={[styles.choiceTitle, { color: t.heading }]}>Pick a date</Text>
                <Text style={[styles.choiceSub, { color: t.muted }]}>Browse days and find a time together</Text>
              </Pressable>
              <Pressable
                style={[styles.choiceBtn, { borderColor: t.hairline, backgroundColor: t.screenBg }]}
                onPress={() => setStage('input')}
              >
                <Text style={[styles.choiceTitle, { color: t.heading }]}>Got an event link</Text>
                <Text style={[styles.choiceSub, { color: t.muted }]}>Drop a link to an event or venue</Text>
              </Pressable>
            </>
          ) : null}

          {/* ── Pick a date ── */}
          {stage === 'pick-date' && focused ? (
            <>
              <Text style={[styles.label, { color: t.muted }]}>When?</Text>
              {renderCarousel(null)}
            </>
          ) : null}

          {/* ── Input (event link) ── */}
          {stage === 'input' ? (
            <>
              <Text style={[styles.title, { color: t.heading }]}>Drop a link</Text>
              <TextInput
                value={url}
                onChangeText={setUrl}
                placeholder="Paste an event or venue link"
                placeholderTextColor={t.muted}
                autoCapitalize="none"
                autoCorrect={false}
                style={[styles.input, { color: t.heading, borderColor: t.hairline, backgroundColor: t.screenBg }]}
              />
              <View style={styles.actions}>
                <Pressable style={[styles.btn, { borderColor: t.hairline }]} onPress={() => go(SAMPLE_URL)}>
                  <Text style={[styles.btnText, { color: t.muted }]}>Use a sample</Text>
                </Pressable>
                <Pressable
                  style={[styles.btn, styles.primary, { backgroundColor: url.trim() ? t.heading : t.hairline }]}
                  disabled={!url.trim()}
                  onPress={() => go(url.trim())}
                >
                  <Text style={[styles.btnText, { color: t.surface }]}>Continue</Text>
                </Pressable>
              </View>
            </>
          ) : null}

          {/* ── Loading ── */}
          {stage === 'loading' ? (
            <View style={styles.loading}>
              <ActivityIndicator color={coral.bg} />
              <Text style={[styles.muted, { color: t.muted }]}>Reading the link…</Text>
            </View>
          ) : null}

          {/* ── Craft (event link parsed) ── */}
          {stage === 'craft' && parsed && focused ? (
            <>
              <View style={styles.card}>
                {parsed.image ? (
                  <Image source={{ uri: parsed.image }} style={styles.thumbImg} resizeMode="cover" />
                ) : (
                  <View style={[styles.thumb, { backgroundColor: t.custody.mine.fill }]}>
                    <Text style={[styles.thumbText, { color: t.custody.mine.text }]}>{parsed.title.charAt(0)}</Text>
                  </View>
                )}
                <View style={{ flex: 1 }}>
                  <Text style={[styles.cardTitle, { color: t.heading }]}>{parsed.title}</Text>
                  {parsed.venue ? <Text style={[styles.muted, { color: t.muted }]}>{parsed.venue}</Text> : null}
                </View>
              </View>
              <Text style={[styles.label, { color: t.muted }]}>When?</Text>
              {renderCarousel(parsed)}
            </>
          ) : null}

          {/* ── Done ── */}
          {stage === 'done' ? (
            <View style={styles.loading}>
              <View style={[styles.check, { backgroundColor: t.overlap.ring }]}>
                <Text style={styles.checkMark}>✓</Text>
              </View>
              <Text style={[styles.doneText, { color: t.heading }]}>{doneMsg}</Text>
              <Pressable style={[styles.btn, styles.primary, { backgroundColor: t.heading }]} onPress={onClose}>
                <Text style={[styles.btnText, { color: t.surface }]}>Done</Text>
              </Pressable>
            </View>
          ) : null}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  layer: { flex: 1, justifyContent: 'flex-end', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)' },
  sheet: {
    width: '100%', maxWidth: 420,
    borderTopLeftRadius: 26, borderTopRightRadius: 26,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 20, paddingBottom: 32, gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.14,
    shadowRadius: 24,
    elevation: 24,
  },
  handle: { alignSelf: 'center', width: 40, height: 5, borderRadius: 3, marginBottom: 4 },
  title: { fontSize: 18, fontWeight: '700' },
  choiceBtn: { borderWidth: 1, borderRadius: 16, padding: 18, gap: 5 },
  choiceTitle: { fontSize: 16, fontWeight: '600' },
  choiceSub: { fontSize: 13 },
  input: { minHeight: 44, borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, fontSize: 15 },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10 },
  btn: { borderWidth: 1, borderRadius: 12, paddingVertical: 11, paddingHorizontal: 18 },
  primary: { borderWidth: 0 },
  btnText: { fontSize: 14, fontWeight: '600' },
  loading: { alignItems: 'center', gap: 14, paddingVertical: 18 },
  muted: { fontSize: 13 },
  label: { fontSize: 12, fontWeight: '500' },
  card: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  thumb: { width: 52, height: 52, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  thumbImg: { width: 52, height: 52, borderRadius: 10 },
  thumbText: { fontSize: 22, fontWeight: '500' },
  cardTitle: { fontSize: 15, fontWeight: '600', marginBottom: 2 },
  // Carousel
  runWrap: { height: 92, justifyContent: 'center' },
  runBox: { width: 72, minHeight: 72, borderWidth: 1.5, borderRadius: 14, alignItems: 'center', justifyContent: 'center', gap: 3 },
  swipeHint: { fontSize: 12, textAlign: 'center', marginTop: -2 },
  tapHint: { fontSize: 11, textAlign: 'center', opacity: 0.5 },
  matchBtn: { borderWidth: 1, borderRadius: 10, paddingVertical: 9, alignItems: 'center' },
  matchBtnText: { fontSize: 13, fontWeight: '500' },
  // Day detail chips
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, justifyContent: 'center' },
  chip: { borderWidth: 1, borderRadius: 99, paddingHorizontal: 10, paddingVertical: 3 },
  chipText: { fontSize: 12, fontWeight: '500' },
  // Action tier
  actionTier: { gap: 10 },
  tierDivider: { height: StyleSheet.hairlineWidth, marginHorizontal: -20 },
  actRow: { flexDirection: 'row', gap: 8 },
  actionBtn: { borderWidth: 1, borderRadius: 14, paddingVertical: 12, paddingHorizontal: 8, alignItems: 'center', gap: 2 },
  actionTitle: { fontSize: 13, fontWeight: '700' },
  actionSub: { fontSize: 11 },
  // Note input
  noteInput: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, fontSize: 14, minHeight: 76 },
  // Done
  check: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  checkMark: { color: '#fff', fontSize: 22, fontWeight: '500' },
  doneText: { fontSize: 15, fontWeight: '500', textAlign: 'center' },
});
