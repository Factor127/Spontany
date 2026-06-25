import React, { useState } from 'react';
import {
  Modal, View, Text, TextInput, Pressable, FlatList,
  ActivityIndicator, StyleSheet, Platform,
} from 'react-native';
import * as Contacts from 'expo-contacts';
import { Tokens } from '../theme/tokens';

export interface PickedContact {
  name: string;
  mobile?: string;
  email?: string;
}

// One result row in the search list
function ContactRow({ contact, onPick, t }: { contact: PickedContact; onPick: () => void; t: Tokens }) {
  return (
    <Pressable style={[styles.row, { borderBottomColor: t.hairline }]} onPress={onPick}>
      <View style={[styles.avatar, { backgroundColor: t.custody.mine.fill }]}>
        <Text style={[styles.avatarText, { color: t.custody.mine.text }]}>
          {contact.name.charAt(0).toUpperCase()}
        </Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.rowName, { color: t.heading }]} numberOfLines={1}>{contact.name}</Text>
        {contact.mobile ? <Text style={[styles.rowDetail, { color: t.muted }]}>{contact.mobile}</Text> : null}
        {contact.email ? <Text style={[styles.rowDetail, { color: t.muted }]}>{contact.email}</Text> : null}
      </View>
    </Pressable>
  );
}

interface Props {
  visible: boolean;
  onClose: () => void;
  onPick: (contact: PickedContact) => void;
  t: Tokens;
}

export function ContactPickerModal({ visible, onClose, onPick, t }: Props) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<PickedContact[]>([]);
  const [status, setStatus] = useState<'idle' | 'loading' | 'denied' | 'ready'>('idle');

  const load = async () => {
    setStatus('loading');
    const { status: s } = await Contacts.requestPermissionsAsync();
    if (s !== 'granted') { setStatus('denied'); return; }
    const { data } = await Contacts.getContactsAsync({
      fields: [Contacts.Fields.Name, Contacts.Fields.PhoneNumbers, Contacts.Fields.Emails],
    });
    const mapped: PickedContact[] = data
      .filter((c) => c.name)
      .map((c) => ({
        name: c.name!,
        mobile: c.phoneNumbers?.[0]?.number,
        email: c.emails?.[0]?.email,
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
    setResults(mapped);
    setStatus('ready');
  };

  const onOpen = () => {
    setQuery('');
    if (status === 'idle' || status === 'denied') load();
  };

  const filtered = results.filter((c) => {
    if (!query.trim()) return true;
    const q = query.toLowerCase();
    return (
      c.name.toLowerCase().includes(q) ||
      c.mobile?.includes(q) ||
      c.email?.toLowerCase().includes(q)
    );
  });

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle={Platform.OS === 'ios' ? 'pageSheet' : 'fullScreen'}
      onRequestClose={onClose}
      onShow={onOpen}
    >
      <View style={[styles.sheet, { backgroundColor: t.screenBg }]}>
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: t.hairline }]}>
          <Text style={[styles.title, { color: t.heading }]}>Choose a contact</Text>
          <Pressable onPress={onClose} style={styles.closeBtn}>
            <Text style={[styles.closeText, { color: t.muted }]}>Cancel</Text>
          </Pressable>
        </View>

        {/* Search */}
        <View style={[styles.searchWrap, { backgroundColor: t.surface, borderColor: t.hairline }]}>
          <Text style={[styles.searchIcon, { color: t.muted }]}>⌕</Text>
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Name, phone or email"
            placeholderTextColor={t.muted}
            autoCorrect={false}
            autoCapitalize="none"
            style={[styles.searchInput, { color: t.heading }]}
          />
        </View>

        {/* States */}
        {status === 'loading' ? (
          <View style={styles.center}>
            <ActivityIndicator color={t.overlap.ring} />
            <Text style={[styles.stateText, { color: t.muted }]}>Loading contacts…</Text>
          </View>
        ) : status === 'denied' ? (
          <View style={styles.center}>
            <Text style={[styles.stateText, { color: t.muted }]}>
              Contacts access was denied. You can grant it in Settings.
            </Text>
          </View>
        ) : (
          <FlatList
            data={filtered}
            keyExtractor={(_, i) => String(i)}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => (
              <ContactRow
                contact={item}
                t={t}
                onPick={() => { onPick(item); onClose(); }}
              />
            )}
            ListEmptyComponent={
              status === 'ready' ? (
                <View style={styles.center}>
                  <Text style={[styles.stateText, { color: t.muted }]}>No contacts found</Text>
                </View>
              ) : null
            }
          />
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  sheet: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingTop: 56, paddingBottom: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  title: { fontSize: 17, fontWeight: '700' },
  closeBtn: { paddingVertical: 4, paddingHorizontal: 8 },
  closeText: { fontSize: 15 },
  searchWrap: {
    flexDirection: 'row', alignItems: 'center',
    marginHorizontal: 16, marginVertical: 12,
    borderWidth: 1, borderRadius: 12,
    paddingHorizontal: 12, gap: 8,
  },
  searchIcon: { fontSize: 18 },
  searchInput: { flex: 1, height: 44, fontSize: 15 },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 20, paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  avatar: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 16, fontWeight: '600' },
  rowName: { fontSize: 15, fontWeight: '500' },
  rowDetail: { fontSize: 13, marginTop: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 48, gap: 12 },
  stateText: { fontSize: 14, textAlign: 'center', paddingHorizontal: 32 },
});
