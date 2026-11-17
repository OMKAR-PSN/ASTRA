import { useRouter } from 'expo-router';
import {
  ArrowLeft, Check, Gauge, Info, MicOff, RefreshCcw, ShieldCheck, Volume2,
} from 'lucide-react-native';
import {
  Pressable, StyleSheet, Switch, Text, View, useWindowDimensions,
} from 'react-native';

import { ScreenContainer } from '@/components/ScreenContainer';
import { Surface } from '@/components/Surface';
import { VoiceControls } from '@/components/VoiceControls';
import { colors, fonts, layout, radius, stitch, type as typography } from '@/constants/theme';
import { VOICE_RATE_LABELS, type VoiceRate } from '@/lib/voice/types';
import { useVoiceGuidance } from '@/state/VoiceGuidanceProvider';

const RATES: VoiceRate[] = ['slow', 'normal', 'fast'];

const TEST_REQUEST = {
  sourceId: 'voice-settings-test',
  label: 'Voice test',
  text: 'Voice guidance is ready. This is a test of the selected reading speed. The same text stays visible on screen.',
};

function SettingsRow({ label, body }: { label: string; body: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoBody}>{body}</Text>
    </View>
  );
}

function CheckMark({ selected }: { selected: boolean }) {
  return (
    <View style={[styles.radio, selected && styles.radioSelected]}>
      {selected ? <Check size={12} color={colors.primary.ink} strokeWidth={3} /> : null}
    </View>
  );
}

export default function VoiceSettingsScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const desktop = width >= layout.desktopBreakpoint;
  const {
    snapshot,
    preferences,
    setEnabled,
    setRate,
    setVoiceId,
    refreshVoices,
  } = useVoiceGuidance();

  const systemDefaultSelected = preferences.voiceId === null;
  const selectedVoice = snapshot.voices.find((voice) => voice.id === preferences.voiceId);

  return (
    <ScreenContainer title="Voice guidance" hideHeading>
      <View style={[styles.hero, !desktop && styles.heroMobile]}>
        <View style={styles.heroCopy}>
          <View style={styles.eyebrowRow}>
            <Volume2 size={12} color={colors.primary[300]} strokeWidth={2.2} />
            <Text style={styles.eyebrow}>OPTIONAL ACCESSIBILITY LAYER</Text>
          </View>
          <Text accessibilityRole="header" style={[styles.heroTitle, !desktop && styles.heroTitleMobile]}>Voice guidance</Text>
          <Text style={styles.heroSubtitle}>
            Voice reads existing on-screen text aloud. Nothing is read automatically, and every control works without sound.
          </Text>
        </View>
        <Pressable
          accessibilityRole="link"
          accessibilityLabel="Back to the previous screen"
          onPress={() => router.back()}
          style={({ pressed, hovered }: { pressed: boolean; hovered?: boolean }) => [
            styles.backLink,
            (pressed || hovered) && styles.backHover,
          ]}
        >
          <ArrowLeft size={15} color={colors.primary[300]} strokeWidth={2.2} />
          <Text style={styles.backText}>Back</Text>
        </Pressable>
      </View>

      <View style={[styles.columns, desktop && styles.columnsDesktop]}>
        <View style={styles.mainColumn}>
          <Surface variant="glass" tone="panel" style={styles.panel}>
            <View style={styles.panelHead}>
              <View style={styles.panelTitleRow}>
                <Volume2 size={15} color={colors.primary[300]} strokeWidth={2.2} />
                <Text accessibilityRole="header" style={styles.panelTitle}>Playback</Text>
              </View>
              <Text style={styles.panelMeta}>{snapshot.supported ? 'DEVICE SPEECH' : 'NOT AVAILABLE'}</Text>
            </View>

            <View style={styles.toggleRow}>
              <View style={styles.toggleCopy}>
                <Text style={styles.toggleLabel}>Voice guidance</Text>
                <Text style={styles.toggleBody}>
                  {!snapshot.supported
                    ? 'This device reports no speech engine. Text, answers and saving behave exactly the same.'
                    : preferences.enabled
                      ? 'Listen and Read controls are available. Speech starts only when you press them.'
                      : 'Voice is off. Text, answers and saving behave exactly the same.'}
                </Text>
              </View>
              <Switch
                accessibilityLabel="Voice guidance"
                value={preferences.enabled}
                onValueChange={setEnabled}
                trackColor={{ false: colors.navy[600], true: colors.accent[400] }}
                thumbColor={colors.offWhite}
              />
            </View>

            <VoiceControls
              request={TEST_REQUEST}
              scope="voice-settings"
              listenLabel="Test voice"
              style={styles.testControls}
            />

            {snapshot.error ? (
              <View style={styles.banner}>
                <Info size={15} color={colors.accent[400]} strokeWidth={2} />
                <Text style={styles.bannerText}>{snapshot.error}</Text>
              </View>
            ) : null}

            <View style={styles.subsection}>
              <Text style={styles.subsectionTitle}>Reading speed</Text>
              <View style={styles.segmentRow} accessibilityRole="radiogroup" accessibilityLabel="Reading speed">
                {RATES.map((rate) => {
                  const selected = preferences.rate === rate;
                  return (
                    <Pressable
                      key={rate}
                      accessibilityRole="radio"
                      accessibilityLabel={`${VOICE_RATE_LABELS[rate]} reading speed`}
                      accessibilityState={{ selected }}
                      aria-checked={selected}
                      onPress={() => setRate(rate)}
                      style={({ pressed, hovered }: { pressed: boolean; hovered?: boolean }) => [
                        styles.segment,
                        selected && styles.segmentSelected,
                        (pressed || hovered) && !selected && styles.segmentHover,
                      ]}
                    >
                      <Text style={[styles.segmentText, selected && styles.segmentTextSelected]}>{VOICE_RATE_LABELS[rate]}</Text>
                    </Pressable>
                  );
                })}
              </View>
              <Text style={styles.helper}>Speed applies to the next Listen or Read action. Speech that is already playing is not restarted.</Text>
            </View>
          </Surface>

          <Surface variant="glass" tone="panel" style={styles.panel}>
            <View style={styles.panelHead}>
              <View style={styles.panelTitleRow}>
                <Gauge size={15} color={colors.primary[300]} strokeWidth={2.2} />
                <Text accessibilityRole="header" style={styles.panelTitle}>Voice</Text>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Refresh available voices"
                disabled={snapshot.refreshingVoices}
                onPress={() => { void refreshVoices(); }}
                style={({ pressed, hovered }: { pressed: boolean; hovered?: boolean }) => [
                  styles.refreshLink,
                  (pressed || hovered) && styles.refreshHover,
                ]}
              >
                <RefreshCcw size={13} color={colors.primary[300]} strokeWidth={2.2} />
                <Text style={styles.refreshText}>{snapshot.refreshingVoices ? 'Refreshing' : 'Refresh list'}</Text>
              </Pressable>
            </View>

            <Pressable
              accessibilityRole="radio"
              accessibilityLabel="System default voice"
              accessibilityState={{ selected: systemDefaultSelected }}
              aria-checked={systemDefaultSelected}
              onPress={() => setVoiceId(null)}
              style={({ pressed, hovered }: { pressed: boolean; hovered?: boolean }) => [
                styles.voiceRow,
                systemDefaultSelected && styles.voiceRowSelected,
                (pressed || hovered) && styles.voiceRowHover,
              ]}
            >
              <CheckMark selected={systemDefaultSelected} />
              <View style={styles.voiceCopy}>
                <Text style={styles.voiceName}>System default</Text>
                <Text style={styles.voiceMeta}>Uses whichever voice the operating system provides. Voice names differ across platforms.</Text>
              </View>
            </Pressable>

            {snapshot.voices.length === 0 ? (
              <Text style={styles.helper}>
                {snapshot.refreshingVoices
                  ? 'Reading the voice list from this device…'
                  : 'This device did not report additional voices. The system default voice is still used when speech starts.'}
              </Text>
            ) : (
              <View style={styles.voiceList}>
                {snapshot.voices.map((voice) => {
                  const selected = preferences.voiceId === voice.id;
                  return (
                    <Pressable
                      key={voice.id}
                      accessibilityRole="radio"
                      accessibilityLabel={`${voice.name}, ${voice.language || 'language not reported'}`}
                      accessibilityState={{ selected }}
                      aria-checked={selected}
                      onPress={() => setVoiceId(voice.id)}
                      style={({ pressed, hovered }: { pressed: boolean; hovered?: boolean }) => [
                        styles.voiceRow,
                        selected && styles.voiceRowSelected,
                        (pressed || hovered) && styles.voiceRowHover,
                      ]}
                    >
                      <CheckMark selected={selected} />
                      <View style={styles.voiceCopy}>
                        <Text style={styles.voiceName}>{voice.name}</Text>
                        <Text style={styles.voiceMeta}>
                          {voice.language || 'Language not reported'}
                          {' · '}
                          {voice.local === true ? 'On-device voice' : voice.local === false ? 'Network voice' : 'Voice source not reported'}
                        </Text>
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            )}

            {selectedVoice ? (
              <Text style={styles.helper}>
                Selected: {selectedVoice.name}. If that voice becomes unavailable, the system default voice is used instead.
              </Text>
            ) : null}
            {snapshot.voices.length > 0 && !selectedVoice && preferences.voiceId ? (
              <Text style={styles.warning}>
                The previously selected voice is no longer reported by this device. Speech will fall back to the system default.
              </Text>
            ) : null}
          </Surface>

          <Surface variant="glass" tone="panel" style={styles.panel}>
            <View style={styles.panelTitleRow}>
              <MicOff size={15} color={colors.primary[300]} strokeWidth={2.2} />
              <Text accessibilityRole="header" style={styles.panelTitle}>Privacy and behavior</Text>
            </View>
            <SettingsRow
              label="Microphone"
              body="Voice guidance only reads text aloud. ASTRA CARE does not request microphone access, does not listen, and does not record audio."
            />
            <SettingsRow
              label="Speech engine"
              body="Speech is produced by this device or browser. ASTRA CARE does not send health text to a cloud speech service and does not create audio files."
            />
            <SettingsRow
              label="Automatic reading"
              body="Automatic narration is not enabled in this build. A new screen or step never starts speaking on its own."
            />
            <SettingsRow
              label="When speech stops"
              body="Speech stops when you press Stop, open another screen, change crew identity, exit demo mode, turn voice off, or the app leaves the foreground."
            />
            <SettingsRow
              label="Saved on this device"
              body="Only the on/off choice, reading speed and optional preferred voice are stored. Preferences are never sent to the ground receiver."
            />
          </Surface>
        </View>

        <View style={[styles.aside, desktop ? styles.asideDesktop : styles.asideMobile]}>
          <Surface variant="glass" tone="panel" style={styles.asidePanel}>
            <View style={styles.panelTitleRow}>
              <ShieldCheck size={15} color={colors.accent[400]} strokeWidth={2.2} />
              <Text accessibilityRole="header" style={styles.panelTitle}>Known limits</Text>
            </View>
            <Text style={styles.asideText}>
              A device may report speech support yet have no installed voice or may block audio. If speech does not start, the text stays visible and every control keeps working.
            </Text>
            <Text style={styles.asideText}>
              On iPhone, speech may be silent when the device is in silent mode. On Android, pause and resume are not offered because the platform speech API does not support them reliably; use Stop and Listen again.
            </Text>
            <Text style={styles.asideText}>
              Some voices are installed with the operating system, while others may need a network connection. Offline speech is not guaranteed on every device.
            </Text>
            <Text style={styles.asideText}>
              Voice guidance supplements a screen reader and does not replace one. All instructions and medical text remain on screen.
            </Text>
          </Surface>

          <Surface variant="glass" tone="panel" style={styles.asidePanel}>
            <Text style={styles.asideLabel}>HEALTH TEXT</Text>
            <Text style={styles.asideText}>
              Speech repeats only text that already appears in the app: your stored observations, the assessment explanations the app produced, and the bundled knowledge cards. It never adds a diagnosis or a new finding.
            </Text>
          </Surface>
        </View>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  hero: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' },
  heroMobile: { flexDirection: 'column', alignItems: 'flex-start', gap: 10 },
  heroCopy: { gap: 6, flexShrink: 1, minWidth: 0 },
  eyebrowRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  eyebrow: { fontFamily: fonts.semibold, fontSize: 10, lineHeight: 14, letterSpacing: 1.4, color: colors.primary[300] },
  heroTitle: { ...typography.headline, color: colors.offWhite },
  heroTitleMobile: { ...typography.headlineMobile, color: colors.offWhite },
  heroSubtitle: { ...typography.body, color: colors.slate[300], maxWidth: 680 },
  backLink: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: 'rgba(0, 214, 198, 0.26)',
    backgroundColor: stitch.cyanMuted,
  },
  backHover: { backgroundColor: 'rgba(0, 214, 198, 0.2)' },
  backText: { fontFamily: fonts.semibold, fontSize: 12, lineHeight: 16, color: colors.primary[300] },
  columns: { gap: 18 },
  columnsDesktop: { flexDirection: 'row', alignItems: 'flex-start', gap: layout.sectionGap },
  mainColumn: { flex: 1, minWidth: 0, gap: 18 },
  aside: { gap: 18 },
  asideDesktop: { width: 344, flexShrink: 0 },
  asideMobile: { width: '100%' },
  asidePanel: { gap: 10, padding: 16, width: '100%' },
  asideLabel: { fontFamily: fonts.semibold, fontSize: 9, lineHeight: 13, letterSpacing: 1.2, color: colors.slate[500] },
  asideText: { ...typography.meta, fontSize: 12, lineHeight: 18, color: colors.slate[300] },
  panel: { gap: 14, padding: 18 },
  panelHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' },
  panelTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 1 },
  panelTitle: { fontFamily: fonts.semibold, fontSize: 14, lineHeight: 19, color: colors.offWhite },
  panelMeta: { fontFamily: fonts.mono, fontSize: 9, lineHeight: 13, letterSpacing: 0.8, color: colors.slate[500] },
  toggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 14 },
  toggleCopy: { flex: 1, gap: 3, minWidth: 0 },
  toggleLabel: { fontFamily: fonts.semibold, fontSize: 13, lineHeight: 18, color: colors.offWhite },
  toggleBody: { ...typography.meta, fontSize: 11.5, lineHeight: 17, color: colors.slate[400] },
  testControls: { alignSelf: 'flex-start', maxWidth: '100%' },
  subsection: { gap: 8 },
  subsectionTitle: { ...typography.label, color: colors.slate[500] },
  segmentRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  segment: {
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: 18,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: stitch.glassBorder,
    backgroundColor: 'rgba(30, 50, 71, 0.45)',
  },
  segmentSelected: { borderColor: 'rgba(0, 214, 198, 0.6)', backgroundColor: colors.primary[400] },
  segmentHover: { borderColor: 'rgba(0, 214, 198, 0.4)' },
  segmentText: { fontFamily: fonts.semibold, fontSize: 12, lineHeight: 16, color: colors.slate[300] },
  segmentTextSelected: { color: colors.primary.ink },
  refreshLink: { minHeight: 40, flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 8, borderRadius: 8 },
  refreshHover: { backgroundColor: 'rgba(0, 214, 198, 0.1)' },
  refreshText: { fontFamily: fonts.semibold, fontSize: 11.5, lineHeight: 15, color: colors.primary[300] },
  voiceRow: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: stitch.glassBorder,
    backgroundColor: 'rgba(8, 26, 42, 0.5)',
  },
  voiceRowSelected: { borderColor: 'rgba(0, 214, 198, 0.5)', backgroundColor: 'rgba(0, 214, 198, 0.12)' },
  voiceRowHover: { borderColor: 'rgba(0, 214, 198, 0.34)' },
  voiceCopy: { flex: 1, gap: 2, minWidth: 0 },
  voiceName: { fontFamily: fonts.semibold, fontSize: 12.5, lineHeight: 17, color: colors.offWhite },
  voiceMeta: { ...typography.meta, fontSize: 11, lineHeight: 16, color: colors.slate[400] },
  voiceList: { gap: 8 },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: 'rgba(0, 214, 198, 0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  radioSelected: { borderColor: colors.primary[400], backgroundColor: colors.primary[400] },
  helper: { ...typography.meta, fontSize: 11, lineHeight: 16, color: colors.slate[400] },
  warning: { fontFamily: fonts.regular, fontSize: 11.5, lineHeight: 17, color: colors.accent[400] },
  banner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    padding: 10,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: 'rgba(242, 192, 120, 0.3)',
    backgroundColor: stitch.amberMuted,
  },
  bannerText: { flex: 1, fontFamily: fonts.regular, fontSize: 11.5, lineHeight: 17, color: colors.accent[400] },
  infoRow: { gap: 2, paddingTop: 10, borderTopWidth: 1, borderTopColor: 'rgba(255, 255, 255, 0.06)' },
  infoLabel: { ...typography.label, color: colors.slate[500] },
  infoBody: { ...typography.meta, fontSize: 11.5, lineHeight: 17, color: colors.slate[300] },
});
