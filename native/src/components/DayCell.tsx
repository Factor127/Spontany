import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Tokens } from '../theme/tokens';
import { Day, DayEvent } from '../types';

function EventChip({ event, t }: { event: DayEvent; t: Tokens }) {
  const solid = event.kind === 'mine' || event.rsvp === 'accepted';
  const tone = solid ? t.event.confirmed : t.event.proposed;
  const glyph = event.kind === 'mine' || event.rsvp === 'accepted' ? '✓ ' : event.rsvp === 'maybe' ? '? ' : '';
  return (
    <View style={[styles.chip, { backgroundColor: tone.bg, borderColor: tone.border, borderStyle: solid ? 'solid' : 'dashed' }]}>
      <Text numberOfLines={1} style={[styles.chipText, { color: tone.text }]}>
        {glyph}{event.title}
      </Text>
    </View>
  );
}

export function DayCell({ day, t, onPress }: { day: Day; t: Tokens; onPress?: (day: Day) => void }) {
  const custody = day.ownership === 'mine' ? t.custody.mine : t.custody.free;
  const showOverlap = day.ownership === 'free' && day.bothFree;
  const isMine = day.ownership === 'mine';

  return (
    <Pressable style={styles.wrap} onPress={onPress ? () => onPress(day) : undefined}>
      <View
        style={[
          styles.cell,
          {
            backgroundColor: custody.fill,
            borderColor: custody.border,
            borderWidth: isMine ? 1 : 0.5,
          },
        ]}
      >
        {/* Layer 2 — overlap ring, never changes the fill */}
        {showOverlap ? (
          <View pointerEvents="none" style={[styles.ring, { borderColor: t.overlap.ring }]} />
        ) : null}

        <View style={styles.headRow}>
          {/* Today: filled pill; otherwise transparent */}
          <View style={[styles.numWrap, day.isToday ? { backgroundColor: custody.text, borderColor: 'transparent' } : null]}>
            <Text style={[styles.num, { color: day.isToday ? t.surface : custody.text }]}>{day.date}</Text>
          </View>
        </View>

        <View style={styles.stack}>
          {day.event && day.event.rsvp !== 'declined' ? <EventChip event={day.event} t={t} /> : null}
          {day.note ? (
            <Text numberOfLines={1} style={[styles.note, { color: t.note.text }]}>{'· '}{day.note}</Text>
          ) : null}
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1 },
  cell: {
    minHeight: 96,
    borderRadius: 14,
    padding: 8,
    overflow: 'hidden',
  },
  ring: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    borderRadius: 14,
    borderWidth: 2.5,
  },
  headRow: { flexDirection: 'row', alignItems: 'center' },
  numWrap: {
    minWidth: 22,
    height: 22,
    paddingHorizontal: 4,
    borderRadius: 11,
    borderWidth: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  num: { fontSize: 14, fontWeight: '600' },
  stack: { marginTop: 'auto', gap: 3, paddingTop: 6 },
  chip: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 5,
    paddingVertical: 3,
    alignSelf: 'flex-start',
    maxWidth: '100%',
  },
  chipText: { fontSize: 10, fontWeight: '600' },
  note: { fontSize: 10, fontWeight: '400' },
});
