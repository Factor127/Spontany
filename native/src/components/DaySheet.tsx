import React, { useState } from 'react';
import { Modal, View, Text, TextInput, Pressable, Linking, StyleSheet } from 'react-native';
import { Tokens } from '../theme/tokens';
import { Day, DayEvent, Ownership, Rsvp } from '../types';

const openLink = (u?: string) => {
  if (u) Linking.openURL(u).catch(() => {});
};

const SECTION: object = {
  fontSize: 10,
  fontWeight: '700' as const,
  letterSpacing: 0.8,
  textTransform: 'uppercase' as const,
};

export function DaySheet({
  day, dateLabel, monthAbbr, bothFree, t, onClose, onSave,
  onEvent, onRsvp, onProposeChange, onProposePlan, onOwnership, overridden,
}: {
  day: Day;
  dateLabel: string;
  monthAbbr: string;
  bothFree: number[];
  t: Tokens;
  onClose: () => void;
  onSave: (note: string | null) => void;
  onEvent?: (event: DayEvent | undefined) => void;
  onRsvp?: (rsvp: Rsvp) => void;
  onProposeChange?: (newDay: number) => void;
  onProposePlan?: (title: string) => void;
  onOwnership?: (ownership: Ownership | undefined) => void;
  overridden?: boolean;
}) {
  const [text, setText] = useState(day.note ?? '');
  const [changing, setChanging] = useState(false);
  const [changeDay, setChangeDay] = useState<number | null>(null);
  const [planText, setPlanText] = useState('');
  const event = day.event;

  const solid = event && (event.kind === 'mine' || event.rsvp === 'accepted');
  const evTone = solid ? t.event.confirmed : t.event.proposed;
  const statusLabel = !event ? ''
    : event.kind === 'mine' ? 'Saved'
    : event.rsvp === 'accepted' ? 'Confirmed'
    : event.rsvp === 'maybe' ? 'Maybe'
    : event.rsvp === 'declined' ? 'Declined'
    : 'Awaiting RSVP';

  const framing = !event || event.kind === 'mine' ? ''
    : event.direction === 'incoming' ? 'Your partner invited you'
    : 'Waiting for your partner';

  const rsvpOpts: [Rsvp, string][] = [['declined', 'Decline'], ['maybe', 'Maybe'], ['accepted', 'Accept']];
  const custodyOpts: [Ownership, string][] = [['mine', 'With me'], ['free', 'Free']];

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.layer}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={[styles.sheet, { backgroundColor: t.surface, borderColor: t.hairline }]}>
          <View style={[styles.handle, { backgroundColor: t.hairline }]} />

          {/* Date */}
          <Text style={[styles.date, { color: t.heading }]}>{dateLabel}</Text>

          {/* Custody */}
          <View style={styles.sectionHead}>
            <Text style={[SECTION, { color: t.muted }]}>Custody</Text>
            {overridden ? (
              <Pressable onPress={() => onOwnership?.(undefined)}>
                <Text style={[styles.textBtn, { color: t.muted }]}>↺ Reset to schedule</Text>
              </Pressable>
            ) : null}
          </View>
          <View style={[styles.segment, { borderColor: t.hairline, backgroundColor: t.screenBg }]}>
            {custodyOpts.map(([key, lbl]) => {
              const on = day.ownership === key;
              return (
                <Pressable
                  key={key}
                  style={[styles.segBtn, { backgroundColor: on ? t.surface : 'transparent' }]}
                  onPress={() => onOwnership?.(key)}
                >
                  <Text style={[styles.segText, { color: on ? t.heading : t.muted, fontWeight: on ? '600' : '400' }]}>{lbl}</Text>
                </Pressable>
              );
            })}
          </View>

          {/* Event */}
          {event ? (
            <View style={[styles.block, { borderColor: t.hairline }]}>
              <View style={styles.sectionHead}>
                <Text style={[SECTION, { color: t.muted }]}>Event</Text>
                <View style={[styles.pill, { backgroundColor: evTone.bg, borderColor: evTone.border }]}>
                  <Text style={[styles.pillText, { color: evTone.text }]}>{statusLabel}</Text>
                </View>
              </View>
              <Text style={[styles.eventTitle, { color: t.heading }]}>{event.title}</Text>
              {event.timeLabel || event.venue ? (
                <Text style={[styles.hint, { color: t.muted }]}>{[event.timeLabel, event.venue].filter(Boolean).join(' · ')}</Text>
              ) : null}
              {event.movedFrom ? (
                <Text style={[styles.hint, { color: t.muted }]}>Moved from {monthAbbr} {event.movedFrom}</Text>
              ) : null}
              {event.url ? (
                <Pressable onPress={() => openLink(event.url)}>
                  <Text style={[styles.link, { color: t.overlap.ring }]}>See event ↗</Text>
                </Pressable>
              ) : null}

              {event.kind === 'mine' ? (
                <View style={styles.actions}>
                  <Pressable style={[styles.btn, { borderColor: t.hairline }]} onPress={() => onEvent?.(undefined)}>
                    <Text style={[styles.btnText, { color: t.muted }]}>Remove</Text>
                  </Pressable>
                </View>
              ) : changing ? (
                <>
                  <Text style={[styles.hint, { color: t.muted }]}>Move to a both-free day</Text>
                  <View style={styles.changeRow}>
                    {bothFree.map((d) => {
                      const on = d === changeDay;
                      return (
                        <Pressable
                          key={d}
                          onPress={() => setChangeDay(d)}
                          style={[styles.dayChip, { borderColor: t.overlap.ring, backgroundColor: on ? t.overlap.ring : 'transparent' }]}
                        >
                          <Text style={{ color: on ? '#fff' : t.overlap.ring, fontSize: 12, fontWeight: '600' }}>
                            {monthAbbr} {d}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                  <View style={styles.actions}>
                    <Pressable style={[styles.btn, { borderColor: t.hairline }]} onPress={() => { setChanging(false); setChangeDay(null); }}>
                      <Text style={[styles.btnText, { color: t.muted }]}>Cancel</Text>
                    </Pressable>
                    <Pressable
                      style={[styles.btn, styles.primary, { backgroundColor: changeDay ? t.heading : t.hairline }]}
                      disabled={!changeDay}
                      onPress={() => {
                        if (changeDay != null) onProposeChange?.(changeDay);
                        setChanging(false); setChangeDay(null);
                      }}
                    >
                      <Text style={[styles.btnText, { color: t.surface }]}>Move here</Text>
                    </Pressable>
                  </View>
                </>
              ) : (
                <>
                  <Text style={[styles.hint, { color: t.muted }]}>
                    {framing}{event.direction === 'outgoing' ? ' · demo: respond as them' : ''}
                  </Text>
                  <View style={styles.rsvpRow}>
                    {rsvpOpts.map(([key, lbl]) => {
                      const on = event.rsvp === key;
                      return (
                        <Pressable
                          key={key}
                          style={[styles.rsvpBtn, { borderColor: on ? t.heading : t.hairline, backgroundColor: on ? t.heading : 'transparent' }]}
                          onPress={() => onRsvp?.(key)}
                        >
                          <Text style={[styles.rsvpText, { color: on ? t.surface : t.muted }]}>{lbl}</Text>
                        </Pressable>
                      );
                    })}
                  </View>
                  <View style={styles.sectionHead}>
                    {bothFree.length ? (
                      <Pressable onPress={() => setChanging(true)}>
                        <Text style={[styles.textBtn, { color: t.overlap.ring }]}>Propose a change</Text>
                      </Pressable>
                    ) : <View />}
                    <Pressable onPress={() => onEvent?.(undefined)}>
                      <Text style={[styles.textBtn, { color: t.muted }]}>Cancel invite</Text>
                    </Pressable>
                  </View>
                </>
              )}
            </View>
          ) : null}

          {/* Both-free propose block */}
          {!event && day.bothFree ? (
            <View style={[styles.block, { borderColor: t.overlap.ring + '60' }]}>
              <Text style={[styles.freeLabel, { color: t.overlap.ring }]}>You're both free — propose a plan</Text>
              <TextInput
                value={planText}
                onChangeText={setPlanText}
                placeholder="e.g. Dinner out, a hike…"
                placeholderTextColor={t.muted}
                style={[styles.planInput, { color: t.heading, borderColor: t.hairline, backgroundColor: t.screenBg }]}
              />
              <View style={styles.actions}>
                <Pressable
                  style={[styles.btn, styles.primary, { backgroundColor: planText.trim() ? t.heading : t.hairline }]}
                  disabled={!planText.trim()}
                  onPress={() => onProposePlan?.(planText.trim())}
                >
                  <Text style={[styles.btnText, { color: t.surface }]}>Propose to partner</Text>
                </Pressable>
              </View>
            </View>
          ) : null}

          {/* Note */}
          <Text style={[SECTION, { color: t.muted, marginTop: 4 }]}>Note</Text>
          <TextInput
            value={text}
            onChangeText={setText}
            placeholder="e.g. Yael with me · keys at dentist"
            placeholderTextColor={t.muted}
            multiline
            maxLength={280}
            style={[styles.input, { color: t.heading, borderColor: t.hairline, backgroundColor: t.screenBg }]}
          />
          <Text style={[styles.hint, { color: t.muted }]}>Private to you · doesn't affect custody days</Text>

          <View style={styles.actions}>
            {day.note ? (
              <Pressable style={[styles.btn, { borderColor: t.hairline }]} onPress={() => onSave(null)}>
                <Text style={[styles.btnText, { color: t.muted }]}>Clear</Text>
              </Pressable>
            ) : (
              <Pressable style={[styles.btn, { borderColor: t.hairline }]} onPress={onClose}>
                <Text style={[styles.btnText, { color: t.muted }]}>Close</Text>
              </Pressable>
            )}
            <Pressable style={[styles.btn, styles.primary, { backgroundColor: t.heading }]} onPress={() => onSave(text.trim() ? text.trim() : null)}>
              <Text style={[styles.btnText, { color: t.surface }]}>Save note</Text>
            </Pressable>
          </View>
        </View>
      </View>
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
  date: { fontSize: 22, fontWeight: '700' },
  sectionHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  textBtn: { fontSize: 12, fontWeight: '500' },
  segment: { flexDirection: 'row', borderRadius: 12, padding: 4, gap: 4 },
  segBtn: { flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: 9 },
  segText: { fontSize: 14 },
  block: { borderWidth: 1, borderRadius: 16, padding: 14, gap: 8 },
  eventTitle: { fontSize: 16, fontWeight: '600' },
  pill: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  pillText: { fontSize: 11, fontWeight: '600' },
  rsvpRow: { flexDirection: 'row', gap: 8 },
  rsvpBtn: { flex: 1, alignItems: 'center', borderWidth: 1, borderRadius: 12, paddingVertical: 10 },
  rsvpText: { fontSize: 13, fontWeight: '500' },
  changeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  dayChip: { borderWidth: 1.5, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 },
  freeLabel: { fontSize: 14, fontWeight: '600' },
  input: { minHeight: 76, borderWidth: 1, borderRadius: 12, padding: 12, fontSize: 15, textAlignVertical: 'top' },
  planInput: { minHeight: 44, borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, fontSize: 15 },
  hint: { fontSize: 12 },
  link: { fontSize: 13, fontWeight: '600' },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 4 },
  btn: { borderWidth: 1, borderRadius: 12, paddingVertical: 11, paddingHorizontal: 18 },
  primary: { borderWidth: 0 },
  btnText: { fontSize: 14, fontWeight: '600' },
});
