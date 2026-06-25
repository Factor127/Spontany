import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Tokens } from '../theme/tokens';
import { Day } from '../types';

// "Coming up together" — the next few both-free days, surfaced so overlap is
// glanceable without scanning the grid. Overlap only exists once a partner is
// connected, so when they're not, this nudges you to connect.
export function TogetherStrip({
  weeks,
  monthAbbr,
  connected,
  onConnect,
  t,
}: {
  weeks: (Day | null)[][];
  monthAbbr: string;
  connected: boolean;
  onConnect: () => void;
  t: Tokens;
}) {
  const free = weeks.flat().filter((d): d is Day => !!d && !!d.bothFree);

  return (
    <View style={[styles.wrap, { backgroundColor: t.surface, borderColor: t.hairline }]}>
      <Text style={[styles.label, { color: t.muted }]}>Coming up together</Text>
      {!connected ? (
        <Pressable onPress={onConnect}>
          <Text style={[styles.connect, { color: t.overlap.ring }]}>Connect your partner to see shared free days →</Text>
        </Pressable>
      ) : free.length === 0 ? (
        <Text style={[styles.empty, { color: t.muted }]}>No shared free days this month</Text>
      ) : (
        <View style={styles.row}>
          {free.map((d) => (
            <View key={d.date} style={[styles.pill, { borderColor: t.overlap.ring }]}>
              <Text style={[styles.pillText, { color: t.overlap.ring }]}>
                {monthAbbr} {d.date}
              </Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { borderWidth: 1, borderRadius: 12, padding: 12, marginBottom: 16 },
  label: { fontSize: 12, fontWeight: '500', marginBottom: 8 },
  empty: { fontSize: 13 },
  connect: { fontSize: 13, fontWeight: '500' },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  pill: { borderWidth: 1.5, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  pillText: { fontSize: 12, fontWeight: '500' },
});
