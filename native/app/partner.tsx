import React, { useState } from 'react';
import { ScrollView, View, Text, TextInput, Pressable, Share, StyleSheet, useColorScheme } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { getTokens } from '../src/theme/tokens';
import { usePrefs } from '../src/prefs/PrefsContext';
import { ContactPickerModal, PickedContact } from '../src/components/ContactPicker';

// Demo invite link — will be server-generated in production
const DEMO_TOKEN = 'AB12CD';
const INVITE_LINK = `spontany.app/join/${DEMO_TOKEN}`;

function Field({ label, value, onChange, placeholder, keyboardType, t }: {
  label: string; value: string; onChange: (v: string) => void;
  placeholder: string; t: ReturnType<typeof getTokens>;
  keyboardType?: 'default' | 'phone-pad' | 'email-address';
}) {
  return (
    <View style={styles.fieldWrap}>
      <Text style={[styles.fieldLabel, { color: t.muted }]}>{label} <Text style={styles.optional}>optional</Text></Text>
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={t.muted}
        keyboardType={keyboardType ?? 'default'}
        autoCapitalize={keyboardType ? 'none' : 'words'}
        autoCorrect={false}
        style={[styles.input, { color: t.heading, borderColor: t.hairline, backgroundColor: t.surface }]}
      />
    </View>
  );
}

export default function PartnerScreen() {
  const t = getTokens(useColorScheme());
  const { partner, setPartner } = usePrefs();

  const [draftName, setDraftName] = useState('');
  const [draftMobile, setDraftMobile] = useState('');
  const [draftEmail, setDraftEmail] = useState('');
  const [pickerOpen, setPickerOpen] = useState(false);

  const onPick = (c: PickedContact) => {
    setDraftName(c.name);
    if (c.mobile) setDraftMobile(c.mobile);
    if (c.email) setDraftEmail(c.email);
  };

  const sendInvite = () => {
    setPartner({
      name: draftName.trim(),
      status: 'invited',
      mobile: draftMobile.trim() || undefined,
      email: draftEmail.trim() || undefined,
    });
  };

  const shareLink = async () => {
    try {
      await Share.share({
        message: `Join me on Spontany so we can see when we're both free 🗓️\n${INVITE_LINK}`,
        url: `https://${INVITE_LINK}`,
        title: 'Spontany invite',
      });
    } catch (_) {}
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.screenBg }} edges={['top']}>
      <ContactPickerModal visible={pickerOpen} onClose={() => setPickerOpen(false)} onPick={onPick} t={t} />

      <ScrollView contentContainerStyle={{ padding: 20 }}>
        <View style={styles.header}>
          <Pressable style={styles.back} onPress={() => router.back()} accessibilityLabel="Back">
            <Text style={[styles.backText, { color: t.heading }]}>‹</Text>
          </Pressable>
          <Text style={[styles.h1, { color: t.heading }]}>Partner</Text>
          <View style={styles.back} />
        </View>

        {/* ── No partner yet ── */}
        {!partner ? (
          <>
            <Text style={[styles.lead, { color: t.muted }]}>
              Connect your partner so Spontany can show the days you're both free. They'll set up their own schedule — you'll only ever see each other's free/busy, never the custody details.
            </Text>

            {/* Pick from contacts */}
            <Pressable
              style={[styles.contactPickBtn, { backgroundColor: t.surface, borderColor: t.hairline }]}
              onPress={() => setPickerOpen(true)}
            >
              <Text style={[styles.contactPickIcon, { color: t.overlap.ring }]}>👤</Text>
              <Text style={[styles.contactPickText, { color: t.heading }]}>Choose from contacts</Text>
              <Text style={[styles.contactPickChev, { color: t.muted }]}>›</Text>
            </Pressable>

            <View style={styles.orRow}>
              <View style={[styles.orLine, { backgroundColor: t.hairline }]} />
              <Text style={[styles.orText, { color: t.muted }]}>or type manually</Text>
              <View style={[styles.orLine, { backgroundColor: t.hairline }]} />
            </View>

            <Field label="Name" value={draftName} onChange={setDraftName} placeholder="Their first name" t={t} />
            <Field label="Mobile" value={draftMobile} onChange={setDraftMobile} placeholder="+44 7700 900000" keyboardType="phone-pad" t={t} />
            <Field label="Email" value={draftEmail} onChange={setDraftEmail} placeholder="name@example.com" keyboardType="email-address" t={t} />

            <Text style={[styles.privacyNote, { color: t.muted }]}>
              Contact details are stored on your device only and used to identify who you invited. Real invites activate when connected to the backend.
            </Text>

            <Pressable
              style={[styles.primary, { backgroundColor: draftName.trim() ? t.heading : t.hairline }]}
              disabled={!draftName.trim()}
              onPress={sendInvite}
            >
              <Text style={[styles.primaryText, { color: t.surface }]}>Generate invite link</Text>
            </Pressable>
          </>

        /* ── Invite sent, waiting for partner ── */
        ) : partner.status === 'invited' ? (
          <>
            <View style={[styles.card, { backgroundColor: t.surface, borderColor: t.hairline }]}>
              <Text style={[styles.cardTitle, { color: t.heading }]}>Invite sent to {partner.name}</Text>
              {partner.mobile ? <Text style={[styles.cardSub, { color: t.muted }]}>{partner.mobile}</Text> : null}
              {partner.email ? <Text style={[styles.cardSub, { color: t.muted }]}>{partner.email}</Text> : null}
              <Text style={[styles.cardBody, { color: t.muted }]}>
                Share the link below. Once they open it and set up their account, you'll both confirm the connection.
              </Text>
            </View>

            {/* Link display + share */}
            <View style={[styles.linkCard, { backgroundColor: t.surface, borderColor: t.hairline }]}>
              <Text style={[styles.linkText, { color: t.overlap.ring }]}>{INVITE_LINK}</Text>
              <Pressable style={[styles.shareBtn, { backgroundColor: t.overlap.ring }]} onPress={shareLink}>
                <Text style={[styles.shareBtnText, { color: '#fff' }]}>Share link ↗</Text>
              </Pressable>
            </View>

            {/* Demo shortcut */}
            <Pressable
              style={[styles.demo, { borderColor: t.hairline }]}
              onPress={() => setPartner({ ...partner, status: 'pending' })}
            >
              <Text style={[styles.demoText, { color: t.muted }]}>Simulate: {partner.name} joins</Text>
            </Pressable>
            <Text style={[styles.demoTag, { color: t.muted }]}>demo only — stands in for your partner opening the link on their device</Text>

            <Pressable style={[styles.secondary, { borderColor: t.hairline }]} onPress={() => setPartner(null)}>
              <Text style={[styles.secondaryText, { color: t.muted }]}>Cancel invite</Text>
            </Pressable>
          </>

        /* ── Partner joined, awaiting mutual confirmation ── */
        ) : partner.status === 'pending' ? (
          <>
            <View style={[styles.card, { backgroundColor: t.surface, borderColor: t.hairline }]}>
              <View style={styles.statusRow}>
                <View style={[styles.statusDot, { backgroundColor: '#F59E0B' }]} />
                <Text style={[styles.cardTitle, { color: t.heading }]}>{partner.name} has joined</Text>
              </View>
              <Text style={[styles.cardBody, { color: t.muted }]}>
                They've set up their account. Confirm the connection to start seeing your free days overlap.
              </Text>
            </View>

            <Pressable
              style={[styles.primary, { backgroundColor: t.overlap.ring }]}
              onPress={() => setPartner({ ...partner, status: 'connected' })}
            >
              <Text style={[styles.primaryText, { color: '#fff' }]}>Confirm connection</Text>
            </Pressable>

            <Pressable style={[styles.secondary, { borderColor: t.hairline }]} onPress={() => setPartner(null)}>
              <Text style={[styles.secondaryText, { color: t.muted }]}>Decline</Text>
            </Pressable>
          </>

        /* ── Connected ── */
        ) : (
          <>
            <View style={[styles.card, { backgroundColor: t.surface, borderColor: t.hairline }]}>
              <View style={styles.statusRow}>
                <View style={[styles.statusDot, { backgroundColor: t.overlap.ring }]} />
                <Text style={[styles.cardTitle, { color: t.heading }]}>Connected with {partner.name}</Text>
              </View>
              {partner.mobile ? <Text style={[styles.cardSub, { color: t.muted }]}>{partner.mobile}</Text> : null}
              {partner.email ? <Text style={[styles.cardSub, { color: t.muted }]}>{partner.email}</Text> : null}
              <Text style={[styles.cardBody, { color: t.muted }]}>
                Days when you're both free now show on your calendar and in "Coming up together".
              </Text>
            </View>

            <Pressable style={[styles.secondary, { borderColor: t.hairline }]} onPress={() => setPartner(null)}>
              <Text style={[styles.secondaryText, { color: t.muted }]}>Disconnect</Text>
            </Pressable>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
  back: { width: 36, alignItems: 'flex-start' },
  backText: { fontSize: 28, fontWeight: '500', lineHeight: 30 },
  h1: { fontSize: 20, fontWeight: '700' },
  lead: { fontSize: 14, lineHeight: 20, marginBottom: 20 },

  // Contact picker
  contactPickBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    borderWidth: 1, borderRadius: 14, padding: 14, marginBottom: 16,
  },
  contactPickIcon: { fontSize: 18 },
  contactPickText: { flex: 1, fontSize: 15, fontWeight: '500' },
  contactPickChev: { fontSize: 20 },
  orRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 },
  orLine: { flex: 1, height: StyleSheet.hairlineWidth },
  orText: { fontSize: 12 },

  // Fields
  fieldWrap: { gap: 6, marginBottom: 14 },
  fieldLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 0.6, textTransform: 'uppercase' },
  optional: { fontSize: 11, fontWeight: '400', letterSpacing: 0, textTransform: 'none' },
  input: { height: 48, borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, fontSize: 15 },

  privacyNote: { fontSize: 12, lineHeight: 17, marginBottom: 16 },

  // Cards
  card: { borderWidth: 1, borderRadius: 14, padding: 16, marginBottom: 16, gap: 6 },
  cardTitle: { fontSize: 16, fontWeight: '600' },
  cardSub: { fontSize: 13 },
  cardBody: { fontSize: 13, lineHeight: 18 },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  statusDot: { width: 10, height: 10, borderRadius: 5 },

  // Link card
  linkCard: {
    borderWidth: 1, borderRadius: 14, padding: 16, marginBottom: 16,
    gap: 12,
  },
  linkText: { fontSize: 15, fontWeight: '500' },
  shareBtn: { borderRadius: 10, paddingVertical: 11, alignItems: 'center' },
  shareBtnText: { fontSize: 14, fontWeight: '600' },

  // Buttons
  primary: { borderRadius: 14, paddingVertical: 15, alignItems: 'center', marginBottom: 12 },
  primaryText: { fontSize: 15, fontWeight: '700' },
  secondary: { borderWidth: 1, borderRadius: 14, paddingVertical: 13, alignItems: 'center', marginTop: 8 },
  secondaryText: { fontSize: 14, fontWeight: '500' },
  demo: { borderWidth: 1, borderStyle: 'dashed', borderRadius: 12, paddingVertical: 12, alignItems: 'center', marginTop: 16 },
  demoText: { fontSize: 13 },
  demoTag: { fontSize: 11, fontStyle: 'italic', textAlign: 'center', marginTop: 6, marginBottom: 4 },
});
