import {
  Accessibility, Check, Pencil, Trash2, X,
} from 'lucide-react-native';
import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  AccessibilityInfo,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
  type ViewStyle,
} from 'react-native';
import Svg, { Circle, Ellipse, Path, Rect } from 'react-native-svg';

import { PrimaryButton } from '@/components/PrimaryButton';
import { DIFFERENCE_THRESHOLD_PERCENT } from '@/lib/comparison';
import { formatTimestamp } from '@/lib/format';
import {
  INTENSITY_LEVELS,
  SYMPTOM_NOTE_MAX,
  SYMPTOM_TYPE_DEFINITIONS,
  createSymptomEntry,
  describeSelection,
  findDuplicateSymptomEntry,
  intensityLabel,
  locationLabel,
  regionDefinition,
  regionsForView,
  sanitizeSymptomEntries,
  typeLabel,
} from '@/lib/symptoms';
import { svgPress } from '@/lib/svgPress';
import { colors, fonts, radius, stitch, type as typography } from '@/constants/theme';
import type {
  SymptomBodySide,
  SymptomBodyView,
  SymptomEntry,
  SymptomRegionId,
  SymptomTypeId,
} from '@/types/astra';

type EditorTarget =
  | { kind: 'region'; region: SymptomRegionId; side: SymptomBodySide; view: SymptomBodyView }
  | { kind: 'general' };

type SymptomBodyMapProps = {
  visible: boolean;
  entries: SymptomEntry[];
  onChange: (next: SymptomEntry[]) => void;
  onClose: () => void;
  onNoSymptoms?: () => void;
};

const VIEW_LABEL: Record<SymptomBodyView, string> = { front: 'Front view', back: 'Back view' };

function targetMatches(target: EditorTarget | null, region: SymptomRegionId, side: SymptomBodySide, view: SymptomBodyView): boolean {
  return target?.kind === 'region' && target.region === region && target.side === side && target.view === view;
}

function FocusButton({
  label,
  selected,
  count,
  onPress,
  accessibilityLabel,
  style,
}: {
  label: string;
  selected: boolean;
  count?: number;
  onPress: () => void;
  accessibilityLabel: string;
  style?: ViewStyle;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ selected }}
      aria-pressed={selected}
      onPress={onPress}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      style={({ pressed, hovered }: { pressed: boolean; hovered?: boolean }) => [
        styles.zoneButton,
        selected && styles.zoneButtonSelected,
        (hovered || pressed) && !selected && styles.zoneButtonHover,
        focused && styles.focusRing,
        style,
      ]}
    >
      <Text style={[styles.zoneButtonText, selected && styles.zoneButtonTextSelected]}>{label}</Text>
      {count ? <Text style={[styles.zoneCount, selected && styles.zoneCountSelected]}>{count}</Text> : null}
    </Pressable>
  );
}

function ViewToggle({ view, onChange }: { view: SymptomBodyView; onChange: (view: SymptomBodyView) => void }) {
  return (
    <View style={styles.viewToggle} accessibilityRole="group" accessibilityLabel="Body view">
      {(['front', 'back'] as const).map((option) => (
        <Pressable
          key={option}
          accessibilityRole="button"
          accessibilityLabel={VIEW_LABEL[option]}
          accessibilityState={{ selected: view === option }}
          aria-pressed={view === option}
          onPress={() => onChange(option)}
          style={({ pressed, hovered }: { pressed: boolean; hovered?: boolean }) => [
            styles.viewButton,
            view === option && styles.viewButtonActive,
            (hovered || pressed) && view !== option && styles.viewButtonHover,
          ]}
        >
          <Text style={[styles.viewButtonText, view === option && styles.viewButtonTextActive]}>
            {option.toUpperCase()}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

export function SymptomBodyMap({ visible, entries: rawEntries, onChange, onClose, onNoSymptoms }: SymptomBodyMapProps) {
  const { width } = useWindowDimensions();
  const desktop = width >= 980;
  const entries = useMemo(() => sanitizeSymptomEntries(rawEntries), [rawEntries]);
  const [view, setView] = useState<SymptomBodyView>('front');
  const [target, setTarget] = useState<EditorTarget | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [symptomType, setSymptomType] = useState<SymptomTypeId | null>(null);
  const [intensity, setIntensity] = useState<number | null>(null);
  const [note, setNote] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [reduceMotion, setReduceMotion] = useState(false);
  const sequence = useRef(0);

  useEffect(() => {
    let active = true;
    AccessibilityInfo.isReduceMotionEnabled().then((enabled) => {
      if (active) setReduceMotion(enabled);
    });
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    return () => {
      active = false;
      subscription.remove();
    };
  }, []);

  const announce = (text: string) => {
    setMessage(text);
    AccessibilityInfo.announceForAccessibility(text);
  };

  const resetEditor = () => {
    setTarget(null);
    setEditingId(null);
    setSymptomType(null);
    setIntensity(null);
    setNote('');
    setFormError(null);
  };

  const close = () => {
    resetEditor();
    setMessage(null);
    onClose();
  };

  const selectRegion = (region: SymptomRegionId, side: SymptomBodySide) => {
    if (regionDefinition(region).paired && side !== 'left' && side !== 'right') return;
    setTarget({ kind: 'region', region, side, view });
    setEditingId(null);
    setSymptomType(null);
    setIntensity(null);
    setNote('');
    setFormError(null);
    announce(`Selected ${describeSelection({ region, side, view })}. Choose what you feel.`);
  };

  const selectGeneral = () => {
    setTarget({ kind: 'general' });
    setEditingId(null);
    setSymptomType(null);
    setIntensity(null);
    setNote('');
    setFormError(null);
    announce('Selected general symptom without a body area. Choose what you feel.');
  };

  const editEntry = (entry: SymptomEntry) => {
    if (entry.bodyRegion === null || entry.bodyView === null) {
      setTarget({ kind: 'general' });
    } else {
      setView(entry.bodyView);
      setTarget({ kind: 'region', region: entry.bodyRegion, side: entry.bodySide, view: entry.bodyView });
    }
    setEditingId(entry.symptomEntryId);
    setSymptomType(entry.symptomType);
    setIntensity(entry.discomfortIntensity);
    setNote(entry.symptomNote);
    setFormError(null);
    setMessage(`Editing ${locationLabel(entry)}.`);
  };

  const removeEntry = (entry: SymptomEntry) => {
    onChange(entries.filter((item) => item.symptomEntryId !== entry.symptomEntryId));
    if (editingId === entry.symptomEntryId) resetEditor();
    announce(`${locationLabel(entry)} symptom removed.`);
  };

  const saveEntry = () => {
    if (!target) {
      setFormError('Select a body region or choose a general symptom first.');
      return;
    }
    if (!symptomType) {
      setFormError('Choose what you are feeling before adding the symptom.');
      return;
    }
    const candidate = target.kind === 'general'
      ? {
        bodyRegion: null,
        bodySide: 'not_applicable' as const,
        bodyView: null,
        symptomType,
        discomfortIntensity: intensity,
        symptomNote: note.trim(),
      }
      : {
        bodyRegion: target.region,
        bodySide: target.side,
        bodyView: target.view,
        symptomType,
        discomfortIntensity: intensity,
        symptomNote: note.trim(),
      };
    const duplicate = findDuplicateSymptomEntry(entries, candidate, editingId ?? undefined);
    if (duplicate) {
      setFormError('That exact symptom is already listed. Edit the existing entry instead.');
      return;
    }

    let next: SymptomEntry[];
    let saved: SymptomEntry;
    if (editingId) {
      const existing = entries.find((entry) => entry.symptomEntryId === editingId);
      if (!existing) {
        setFormError('That symptom is no longer in the list. Add it again.');
        setEditingId(null);
        return;
      }
      saved = { ...existing, ...candidate };
      next = entries.map((entry) => entry.symptomEntryId === editingId ? saved : entry);
    } else {
      sequence.current += 1;
      const id = `SYM-${Date.now().toString(36)}-${sequence.current}`;
      saved = createSymptomEntry(candidate, { id, recordedAtUTC: new Date().toISOString() });
      next = [...entries, saved];
    }
    onChange(next);
    announce(`${locationLabel(saved)} symptom ${editingId ? 'updated' : 'added'}. ${entries.length === next.length ? 'The list still has' : 'The list now has'} ${next.length} ${next.length === 1 ? 'entry' : 'entries'}.`);
    resetEditor();
  };

  const changeView = (next: SymptomBodyView) => {
    setView(next);
    if (target?.kind === 'region' && target.view !== next) {
      setTarget(null);
      setEditingId(null);
      setSymptomType(null);
      setIntensity(null);
      setNote('');
    }
    setFormError(null);
    AccessibilityInfo.announceForAccessibility(`${VIEW_LABEL[next]} shown. Saved symptoms for both views are kept.`);
  };

  const noSymptoms = () => {
    onChange([]);
    onNoSymptoms?.();
    close();
  };

  const activeLabel = target?.kind === 'general'
    ? 'General symptom'
    : target?.kind === 'region'
      ? describeSelection(target)
      : null;
  const viewEntries = entries.filter((entry) => entry.bodyView === view || entry.bodyRegion === null);
  const regionEntries = entries.filter((entry) => entry.bodyRegion !== null);
  const centerRegions = regionsForView(view).filter((region) => !region.paired);
  const pairedRegions = regionsForView(view).filter((region) => region.paired);

  const sideHasEntries = (region: SymptomRegionId, side: SymptomBodySide) =>
    entries.some((entry) => entry.bodyRegion === region && entry.bodySide === side && entry.bodyView === view);

  const zoneStyle = (region: SymptomRegionId, side: SymptomBodySide) => {
    const active = targetMatches(target, region, side, view);
    const saved = sideHasEntries(region, side);
    return {
      fill: active ? 'rgba(0, 214, 198, 0.58)' : saved ? 'rgba(0, 214, 198, 0.22)' : 'rgba(166, 187, 208, 0.16)',
      stroke: active ? colors.primary[300] : saved ? 'rgba(0, 214, 198, 0.64)' : 'rgba(201, 217, 232, 0.42)',
      strokeWidth: active ? 2.2 : 1.2,
    };
  };

  const zonePress = (region: SymptomRegionId, side: SymptomBodySide) => ({
    ...zoneStyle(region, side),
    ...svgPress(() => selectRegion(region, side)),
  });

  return (
    <Modal
      visible={visible}
      transparent
      animationType={reduceMotion ? 'none' : 'fade'}
      onRequestClose={close}
      accessibilityViewIsModal
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.backdrop}
      >
        <View style={[styles.panel, desktop && styles.panelDesktop]} testID="symptom-body-map">
          <View style={styles.header}>
            <View style={styles.headerCopy}>
              <Text style={styles.eyebrow}>SELF-REPORTED SYMPTOMS</Text>
              <Text accessibilityRole="header" style={styles.title}>Where do you feel discomfort?</Text>
              <Text style={styles.subtitle}>Select a body area or use the word list. This is a record of what you feel, not a diagnosis.</Text>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Close symptom body map"
              onPress={close}
              style={({ pressed }) => [styles.closeButton, pressed && styles.closeButtonPressed]}
            >
              <X size={18} color={colors.slate[300]} strokeWidth={2.2} />
            </Pressable>
          </View>

          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={[styles.columns, desktop && styles.columnsDesktop]}>
              <View style={[styles.mapColumn, desktop && styles.mapColumnDesktop]}>
                <View style={styles.mapHead}>
                  <Text style={styles.sectionLabel}>BODY MAP</Text>
                  <ViewToggle view={view} onChange={changeView} />
                </View>

                <View style={styles.figureWrap}>
                  <Svg
                    width={desktop ? 230 : 186}
                    height={desktop ? 506 : 414}
                    viewBox="0 0 200 440"
                    testID="symptom-body-figure"
                    accessibilityLabel={`Human body outline, ${view} view. Use the word list for selection without the illustration.`}
                  >
                    <Circle cx={100} cy={38} r={25} {...zonePress('head', 'center')} />
                    <Rect x={89} y={61} width={22} height={15} rx={6} {...zonePress('neck', 'center')} />
                    {view === 'front' ? (
                      <>
                        <Path d="M72 82 Q100 74 128 82 L124 150 Q100 158 76 150 Z" {...zonePress('chest', 'center')} />
                        <Path d="M76 150 Q100 158 124 150 L118 226 Q100 234 82 226 Z" {...zonePress('abdomen', 'center')} />
                      </>
                    ) : (
                      <>
                        <Path d="M72 82 Q100 74 128 82 L124 150 Q100 158 76 150 Z" {...zonePress('upper-back', 'center')} />
                        <Path d="M76 150 Q100 158 124 150 L118 226 Q100 234 82 226 Z" {...zonePress('lower-back', 'center')} />
                        <Path d="M100 90 L100 220 M76 108 Q88 126 98 128 M124 108 Q112 126 102 128" stroke="rgba(201, 217, 232, 0.3)" strokeWidth={1.1} fill="none" pointerEvents="none" />
                      </>
                    )}
                    <Rect x={42} y={92} width={22} height={76} rx={11} transform="rotate(12 53 92)" {...zonePress('upper-arm', 'left')} />
                    <Rect x={136} y={92} width={22} height={76} rx={11} transform="rotate(-12 147 92)" {...zonePress('upper-arm', 'right')} />
                    <Ellipse cx={62} cy={88} rx={22} ry={16} {...zonePress('shoulder', 'left')} />
                    <Ellipse cx={138} cy={88} rx={22} ry={16} {...zonePress('shoulder', 'right')} />
                    <Rect x={30} y={170} width={20} height={70} rx={10} transform="rotate(6 40 170)" {...zonePress('forearm', 'left')} />
                    <Rect x={150} y={170} width={20} height={70} rx={10} transform="rotate(-6 160 170)" {...zonePress('forearm', 'right')} />
                    <Ellipse cx={38} cy={252} rx={14} ry={18} {...zonePress('hand', 'left')} />
                    <Ellipse cx={162} cy={252} rx={14} ry={18} {...zonePress('hand', 'right')} />
                    <Ellipse cx={84} cy={240} rx={21} ry={18} {...zonePress('hip', 'left')} />
                    <Ellipse cx={116} cy={240} rx={21} ry={18} {...zonePress('hip', 'right')} />
                    <Rect x={74} y={250} width={25} height={84} rx={12} {...zonePress('thigh', 'left')} />
                    <Rect x={101} y={250} width={25} height={84} rx={12} {...zonePress('thigh', 'right')} />
                    <Circle cx={86.5} cy={341} r={15} {...zonePress('knee', 'left')} />
                    <Circle cx={113.5} cy={341} r={15} {...zonePress('knee', 'right')} />
                    <Rect x={77} y={353} width={19} height={64} rx={9} {...zonePress('lower-leg', 'left')} />
                    <Rect x={104} y={353} width={19} height={64} rx={9} {...zonePress('lower-leg', 'right')} />
                    <Ellipse cx={84} cy={424} rx={17} ry={10} {...zonePress('foot', 'left')} />
                    <Ellipse cx={116} cy={424} rx={17} ry={10} {...zonePress('foot', 'right')} />
                  </Svg>
                </View>
                <Text style={styles.figureHint}>Tap a region. Left and right are separate selections.</Text>

                <View style={styles.listHead}>
                  <Accessibility size={14} color={colors.primary[300]} strokeWidth={2} />
                  <Text style={styles.sectionLabel}>WORD LIST · SAME OPTIONS</Text>
                </View>
                <Text style={styles.listHint}>Use these buttons to complete the same selection without the illustration.</Text>

                <View style={styles.regionGroup}>
                  {centerRegions.map((region) => {
                    const selected = targetMatches(target, region.id, 'center', view);
                    const count = entries.filter((entry) => entry.bodyRegion === region.id && entry.bodyView === view).length;
                    return (
                      <FocusButton
                        key={region.id}
                        label={region.label}
                        selected={selected}
                        count={count || undefined}
                        onPress={() => selectRegion(region.id, 'center')}
                        accessibilityLabel={`Select ${region.label}, ${view} view${count ? `, ${count} saved` : ''}`}
                        style={styles.centerButton}
                      />
                    );
                  })}
                </View>

                <View style={styles.regionGroup}>
                  {pairedRegions.map((region) => {
                    const leftSelected = targetMatches(target, region.id, 'left', view);
                    const rightSelected = targetMatches(target, region.id, 'right', view);
                    const leftCount = entries.filter((entry) => entry.bodyRegion === region.id && entry.bodySide === 'left' && entry.bodyView === view).length;
                    const rightCount = entries.filter((entry) => entry.bodyRegion === region.id && entry.bodySide === 'right' && entry.bodyView === view).length;
                    return (
                      <View key={region.id} style={styles.pairedRow}>
                        <Text style={styles.pairedLabel}>{region.label}</Text>
                        <View style={styles.pairedButtons}>
                          <FocusButton
                            label="Left"
                            selected={leftSelected}
                            count={leftCount || undefined}
                            onPress={() => selectRegion(region.id, 'left')}
                            accessibilityLabel={`Select left ${region.label}, ${view} view${leftCount ? `, ${leftCount} saved` : ''}`}
                            style={styles.pairButton}
                          />
                          <FocusButton
                            label="Right"
                            selected={rightSelected}
                            count={rightCount || undefined}
                            onPress={() => selectRegion(region.id, 'right')}
                            accessibilityLabel={`Select right ${region.label}, ${view} view${rightCount ? `, ${rightCount} saved` : ''}`}
                            style={styles.pairButton}
                          />
                        </View>
                      </View>
                    );
                  })}
                </View>

                <FocusButton
                  label="General symptom · no body area"
                  selected={target?.kind === 'general'}
                  onPress={selectGeneral}
                  accessibilityLabel="Select a general symptom without a body area"
                  style={styles.generalButton}
                />
              </View>

              <View style={[styles.detailColumn, desktop && styles.detailColumnDesktop]}>
                <View style={styles.liveRegion} accessibilityLiveRegion="polite">
                  <Text style={styles.liveText}>{message ?? activeLabel ?? 'No region selected.'}</Text>
                </View>

                {target ? (
                  <View style={styles.editor}>
                    <View style={styles.editorHead}>
                      <View style={styles.editorCopy}>
                        <Text style={styles.editorEyebrow}>{editingId ? 'EDITING SAVED SYMPTOM' : 'NEW SYMPTOM'}</Text>
                        <Text style={styles.editorTitle}>{activeLabel}</Text>
                      </View>
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel="Cancel this symptom selection"
                        onPress={() => { resetEditor(); setMessage('Selection cleared.'); }}
                        style={styles.cancelButton}
                      >
                        <Text style={styles.cancelText}>Cancel</Text>
                      </Pressable>
                    </View>

                    <Text style={styles.question}>What are you feeling here?</Text>
                    <View style={styles.typeGrid} accessibilityRole="radiogroup">
                      {SYMPTOM_TYPE_DEFINITIONS.map((type) => {
                        const selected = symptomType === type.id;
                        return (
                          <Pressable
                            key={type.id}
                            accessibilityRole="radio"
                            accessibilityLabel={type.label}
                            accessibilityState={{ checked: selected }}
                            aria-checked={selected}
                            onPress={() => { setSymptomType(type.id); setFormError(null); }}
                            style={({ pressed, hovered }: { pressed: boolean; hovered?: boolean }) => [
                              styles.typeButton,
                              selected && styles.typeButtonSelected,
                              (hovered || pressed) && !selected && styles.typeButtonHover,
                            ]}
                          >
                            <Text style={[styles.typeText, selected && styles.typeTextSelected]}>{type.label}</Text>
                          </Pressable>
                        );
                      })}
                    </View>

                    <Text style={styles.fieldLabel}>Describe it in your own words · optional</Text>
                    <TextInput
                      accessibilityLabel="Describe the discomfort in your own words"
                      value={note}
                      onChangeText={(text) => { setNote(text); setFormError(null); }}
                      placeholder="For example: a dull headache behind my eyes"
                      placeholderTextColor={colors.slate[500]}
                      multiline
                      maxLength={SYMPTOM_NOTE_MAX}
                      style={styles.noteInput}
                    />
                    <Text style={styles.counter}>{note.length} / {SYMPTOM_NOTE_MAX}</Text>

                    <Text style={styles.fieldLabel}>How noticeable is it? · optional</Text>
                    <Text style={styles.help}>This describes how noticeable the discomfort feels to you. It is not a clinical pain scale.</Text>
                    <View style={styles.intensityGrid} accessibilityRole="radiogroup">
                      {INTENSITY_LEVELS.map((level) => {
                        const selected = intensity === level.value;
                        return (
                          <Pressable
                            key={level.value}
                            accessibilityRole="radio"
                            accessibilityLabel={`${level.value}, ${level.label}`}
                            accessibilityState={{ checked: selected }}
                            aria-checked={selected}
                            onPress={() => { setIntensity(selected ? null : level.value); setFormError(null); }}
                            style={({ pressed, hovered }: { pressed: boolean; hovered?: boolean }) => [
                              styles.intensityButton,
                              selected && styles.intensityButtonSelected,
                              (hovered || pressed) && !selected && styles.typeButtonHover,
                            ]}
                          >
                            <Text style={[styles.intensityNumber, selected && styles.intensityNumberSelected]}>{level.value}</Text>
                            <Text style={[styles.intensityText, selected && styles.intensityTextSelected]}>{level.label}</Text>
                          </Pressable>
                        );
                      })}
                    </View>
                    {intensity !== null ? (
                      <Pressable accessibilityRole="button" accessibilityLabel="Clear discomfort intensity" onPress={() => setIntensity(null)} style={styles.clearIntensity}>
                        <Text style={styles.clearIntensityText}>Clear intensity selection</Text>
                      </Pressable>
                    ) : null}

                    {formError ? <Text accessibilityRole="alert" style={styles.formError}>{formError}</Text> : null}
                    <View style={styles.editorActions}>
                      <PrimaryButton
                        label={editingId ? 'Save changes' : 'Add symptom'}
                        disabled={!symptomType}
                        onPress={saveEntry}
                        style={styles.addButton}
                      />
                    </View>
                  </View>
                ) : (
                  <View style={styles.emptyEditor}>
                    <Text style={styles.emptyTitle}>{entries.length > 0 ? 'Add another symptom' : 'Choose where it feels uncomfortable'}</Text>
                    <Text style={styles.emptyText}>
                      Select a body region or a word-list button. You can add symptoms on the front and back views, and you can describe general symptoms without choosing an area.
                    </Text>
                    <View style={styles.steps}>
                      {['Select a region or general symptom.', 'Choose what you feel.', 'Optionally add intensity and your own words.', 'Add the symptom, then repeat if needed.'].map((step, index) => (
                        <View key={step} style={styles.stepRow}>
                          <Text style={styles.stepNumber}>{index + 1}</Text>
                          <Text style={styles.stepText}>{step}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                )}

                <View style={styles.entriesSection}>
                  <View style={styles.entriesHead}>
                    <Text style={styles.sectionLabel}>REPORTED SYMPTOMS</Text>
                    <Text style={styles.entryCount}>{entries.length} {entries.length === 1 ? 'ENTRY' : 'ENTRIES'}</Text>
                  </View>
                  {entries.length === 0 ? (
                    <Text style={styles.emptyEntries}>No symptom entries yet. Selecting a region alone does not report a symptom.</Text>
                  ) : (
                    <View style={styles.entriesList}>
                      {entries.map((entry) => (
                        <View key={entry.symptomEntryId} style={[styles.entryCard, editingId === entry.symptomEntryId && styles.entryCardEditing]}>
                          <View style={styles.entryCopy}>
                            <Text style={styles.entryLocation}>{locationLabel(entry)}</Text>
                            <Text style={styles.entryType}>{typeLabel(entry.symptomType)}</Text>
                            {entry.discomfortIntensity !== null ? (
                              <Text style={styles.entryMeta}>Noticeable: {entry.discomfortIntensity}/5 · {intensityLabel(entry.discomfortIntensity)}</Text>
                            ) : null}
                            {entry.symptomNote ? <Text style={styles.entryNote}>“{entry.symptomNote}”</Text> : null}
                            <Text style={styles.entryTime}>Recorded {formatTimestamp(entry.recordedAtUTC)}</Text>
                          </View>
                          <View style={styles.entryActions}>
                            <Pressable
                              accessibilityRole="button"
                              accessibilityLabel={`Edit ${locationLabel(entry)} symptom`}
                              onPress={() => editEntry(entry)}
                              style={({ pressed }) => [styles.iconButton, pressed && styles.iconButtonPressed]}
                            >
                              <Pencil size={14} color={colors.primary[300]} strokeWidth={2} />
                              <Text style={styles.iconButtonText}>Edit</Text>
                            </Pressable>
                            <Pressable
                              accessibilityRole="button"
                              accessibilityLabel={`Remove ${locationLabel(entry)} symptom`}
                              onPress={() => removeEntry(entry)}
                              style={({ pressed }) => [styles.iconButton, styles.removeButton, pressed && styles.iconButtonPressed]}
                            >
                              <Trash2 size={14} color={colors.error[400]} strokeWidth={2} />
                              <Text style={[styles.iconButtonText, styles.removeText]}>Remove</Text>
                            </Pressable>
                          </View>
                        </View>
                      ))}
                    </View>
                  )}
                </View>

                <Text style={styles.safetyNote}>
                  Body-region selection and intensity are self-reported context. They do not diagnose a condition, determine urgency, or change the {DIFFERENCE_THRESHOLD_PERCENT}% demonstration assessment rule.
                </Text>
              </View>
            </View>
          </ScrollView>

          <View style={styles.footer}>
            <View style={styles.footerNote}>
              <Check size={13} color={colors.primary[300]} strokeWidth={2.2} />
              <Text style={styles.footerText}>{viewEntries.length === entries.length ? `${entries.length} of ${entries.length} saved entries visible on this view` : `${viewEntries.length} on this view · ${regionEntries.length} body-region entries in total`}</Text>
            </View>
            <View style={styles.footerActions}>
              {onNoSymptoms ? (
                <PrimaryButton variant="secondary" label="No symptoms to report" onPress={noSymptoms} style={styles.footerButton} />
              ) : null}
              <PrimaryButton label="Done" onPress={close} style={styles.footerButton} />
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const focusRing = Platform.OS === 'web'
  ? ({ outlineStyle: 'solid', outlineColor: colors.primary[300], outlineWidth: 2, outlineOffset: 2 } as ViewStyle)
  : { borderColor: colors.primary[300] };

const styles = StyleSheet.create({
  backdrop: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 10, backgroundColor: 'rgba(1, 7, 14, 0.78)' },
  panel: {
    width: '100%',
    maxHeight: '94%',
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: stitch.glassBorderStrong,
    backgroundColor: '#071B2B',
    overflow: 'hidden',
    flexShrink: 1,
    elevation: 18,
    shadowColor: '#000814',
    shadowOpacity: 0.55,
    shadowRadius: 30,
    shadowOffset: { width: 0, height: 18 },
  },
  panelDesktop: { maxWidth: 1120, maxHeight: '90%' },
  header: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingHorizontal: 18, paddingTop: 16, paddingBottom: 13, borderBottomWidth: 1, borderBottomColor: stitch.glassBorder, backgroundColor: 'rgba(4, 16, 28, 0.72)' },
  headerCopy: { flex: 1, minWidth: 0, gap: 4 },
  eyebrow: { ...typography.labelWide, color: colors.primary[300] },
  title: { ...typography.sectionMobile, color: colors.offWhite },
  subtitle: { ...typography.bodySmall, color: colors.slate[300], maxWidth: 720 },
  closeButton: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: stitch.glassBorder, backgroundColor: 'rgba(169, 189, 206, 0.08)' },
  closeButtonPressed: { backgroundColor: 'rgba(169, 189, 206, 0.18)' },
  scroll: { flexShrink: 1 },
  scrollContent: { padding: 16, gap: 16 },
  columns: { gap: 18 },
  columnsDesktop: { flexDirection: 'row', alignItems: 'flex-start', gap: 22 },
  mapColumn: { gap: 10, width: '100%' },
  mapColumnDesktop: { flexBasis: 430, flexGrow: 0, flexShrink: 0 },
  mapHead: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  sectionLabel: { ...typography.labelWide, color: colors.slate[400] },
  viewToggle: { flexDirection: 'row', gap: 4, padding: 3, borderRadius: 11, borderWidth: 1, borderColor: stitch.glassBorder, backgroundColor: 'rgba(4, 16, 28, 0.7)' },
  viewButton: { minHeight: 40, minWidth: 76, paddingHorizontal: 13, alignItems: 'center', justifyContent: 'center', borderRadius: 8 },
  viewButtonActive: { backgroundColor: stitch.cyanMuted, borderWidth: 1, borderColor: stitch.glassBorderStrong },
  viewButtonHover: { backgroundColor: 'rgba(169, 189, 206, 0.10)' },
  viewButtonText: { fontFamily: fonts.semibold, fontSize: 11, letterSpacing: 0.8, color: colors.slate[300] },
  viewButtonTextActive: { color: colors.primary[300] },
  figureWrap: { alignItems: 'center', justifyContent: 'center', paddingVertical: 2, borderRadius: radius.md, borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.07)', backgroundColor: 'rgba(4, 16, 28, 0.34)' },
  figureHint: { ...typography.meta, color: colors.slate[500], textAlign: 'center' },
  listHead: { flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 4 },
  listHint: { ...typography.meta, color: colors.slate[400] },
  regionGroup: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  zoneButton: { minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, paddingHorizontal: 12, borderRadius: radius.sm, borderWidth: 1, borderColor: 'rgba(40, 60, 80, 0.9)', backgroundColor: stitch.panelDeep },
  zoneButtonSelected: { borderColor: colors.primary[300], backgroundColor: stitch.cyanMuted },
  zoneButtonHover: { backgroundColor: 'rgba(30, 50, 71, 0.72)' },
  zoneButtonText: { fontFamily: fonts.semibold, fontSize: 12, lineHeight: 17, color: colors.slate[200] },
  zoneButtonTextSelected: { color: colors.primary[300] },
  zoneCount: { fontFamily: fonts.mono, fontSize: 10, lineHeight: 14, color: colors.slate[400] },
  zoneCountSelected: { color: colors.primary[300] },
  centerButton: { flexBasis: '47%', flexGrow: 1 },
  pairedRow: { flexBasis: '47%', flexGrow: 1, gap: 5 },
  pairedLabel: { ...typography.meta, color: colors.slate[300], paddingLeft: 2 },
  pairedButtons: { flexDirection: 'row', gap: 6 },
  pairButton: { flex: 1, paddingHorizontal: 8 },
  generalButton: { alignSelf: 'stretch', marginTop: 2 },
  focusRing,
  detailColumn: { flex: 1, minWidth: 0, gap: 12 },
  detailColumnDesktop: { flexBasis: 0, flexGrow: 1 },
  liveRegion: { minHeight: 18 },
  liveText: { ...typography.meta, color: colors.primary[300] },
  editor: { gap: 10, padding: 14, borderRadius: radius.md, borderWidth: 1, borderColor: 'rgba(0, 214, 198, 0.30)', backgroundColor: 'rgba(4, 18, 31, 0.72)' },
  editorHead: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 },
  editorCopy: { flex: 1, minWidth: 0, gap: 2 },
  editorEyebrow: { ...typography.label, color: colors.primary[300] },
  editorTitle: { ...typography.cardTitle, color: colors.offWhite },
  cancelButton: { minHeight: 40, paddingHorizontal: 10, justifyContent: 'center', borderRadius: 8 },
  cancelText: { fontFamily: fonts.semibold, fontSize: 12, color: colors.slate[300] },
  question: { ...typography.bodySmall, fontFamily: fonts.semibold, color: colors.offWhite },
  typeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  typeButton: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 12, borderRadius: radius.sm, borderWidth: 1, borderColor: 'rgba(40, 60, 80, 0.9)', backgroundColor: stitch.panelDeep },
  typeButtonSelected: { borderColor: colors.primary[300], backgroundColor: stitch.cyanMuted },
  typeButtonHover: { backgroundColor: 'rgba(30, 50, 71, 0.75)' },
  typeText: { fontFamily: fonts.semibold, fontSize: 12, lineHeight: 17, color: colors.slate[200] },
  typeTextSelected: { color: colors.primary[300] },
  fieldLabel: { ...typography.label, color: colors.slate[400], marginTop: 2 },
  help: { ...typography.meta, color: colors.slate[500] },
  noteInput: { minHeight: 78, textAlignVertical: 'top', padding: 11, borderRadius: radius.sm, borderWidth: 1, borderColor: 'rgba(40, 60, 80, 0.9)', backgroundColor: '#041322', color: colors.offWhite, fontFamily: fonts.regular, fontSize: 14, lineHeight: 21 },
  counter: { ...typography.monoSmall, color: colors.slate[500], textAlign: 'right' },
  intensityGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  intensityButton: { minHeight: 54, flexBasis: 92, flexGrow: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, paddingHorizontal: 8, borderRadius: radius.sm, borderWidth: 1, borderColor: 'rgba(40, 60, 80, 0.9)', backgroundColor: stitch.panelDeep },
  intensityButtonSelected: { borderColor: colors.primary[300], backgroundColor: stitch.cyanMuted },
  intensityNumber: { fontFamily: fonts.semibold, fontSize: 18, color: colors.slate[200], fontVariant: ['tabular-nums'] },
  intensityNumberSelected: { color: colors.primary[300] },
  intensityText: { flexShrink: 1, fontFamily: fonts.regular, fontSize: 10.5, lineHeight: 14, color: colors.slate[400] },
  intensityTextSelected: { color: colors.offWhite },
  clearIntensity: { alignSelf: 'flex-start', minHeight: 36, justifyContent: 'center' },
  clearIntensityText: { fontFamily: fonts.semibold, fontSize: 11.5, color: colors.primary[300] },
  formError: { ...typography.bodySmall, color: colors.error[400] },
  editorActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8, flexWrap: 'wrap' },
  addButton: { minWidth: 150 },
  emptyEditor: { gap: 10, padding: 14, borderRadius: radius.md, borderWidth: 1, borderColor: stitch.glassBorder, backgroundColor: 'rgba(4, 16, 28, 0.5)' },
  emptyTitle: { ...typography.cardTitle, color: colors.offWhite },
  emptyText: { ...typography.bodySmall, color: colors.slate[300] },
  steps: { gap: 7 },
  stepRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  stepNumber: { width: 20, height: 20, borderRadius: 10, textAlign: 'center', fontFamily: fonts.semibold, fontSize: 11, lineHeight: 20, color: colors.primary.ink, backgroundColor: colors.primary[400] },
  stepText: { flex: 1, ...typography.meta, color: colors.slate[300] },
  entriesSection: { gap: 8 },
  entriesHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  entryCount: { ...typography.monoSmall, color: colors.slate[500] },
  emptyEntries: { ...typography.meta, color: colors.slate[500] },
  entriesList: { gap: 8 },
  entryCard: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, padding: 11, borderRadius: radius.sm, borderWidth: 1, borderColor: stitch.glassBorder, backgroundColor: 'rgba(4, 16, 28, 0.58)' },
  entryCardEditing: { borderColor: 'rgba(0, 214, 198, 0.48)' },
  entryCopy: { flex: 1, minWidth: 0, gap: 3 },
  entryLocation: { fontFamily: fonts.semibold, fontSize: 13, lineHeight: 18, color: colors.offWhite },
  entryType: { ...typography.bodySmall, color: colors.slate[200] },
  entryMeta: { ...typography.meta, color: colors.slate[400] },
  entryNote: { ...typography.bodySmall, color: colors.slate[300], fontStyle: 'italic' },
  entryTime: { ...typography.monoSmall, color: colors.slate[500] },
  entryActions: { gap: 5, alignItems: 'flex-end' },
  iconButton: { minHeight: 36, flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 8, borderRadius: 8, borderWidth: 1, borderColor: 'rgba(0, 214, 198, 0.26)', backgroundColor: stitch.cyanMuted },
  iconButtonPressed: { opacity: 0.75 },
  iconButtonText: { fontFamily: fonts.semibold, fontSize: 10.5, color: colors.primary[300] },
  removeButton: { borderColor: 'rgba(255, 143, 151, 0.28)', backgroundColor: stitch.redMuted },
  removeText: { color: colors.error[400] },
  safetyNote: { ...typography.meta, color: colors.slate[500], lineHeight: 16 },
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10, paddingHorizontal: 16, paddingVertical: 12, borderTopWidth: 1, borderTopColor: stitch.glassBorder, backgroundColor: 'rgba(4, 16, 28, 0.82)' },
  footerNote: { flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 1, minWidth: 0 },
  footerText: { ...typography.meta, color: colors.slate[400] },
  footerActions: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' },
  footerButton: { minWidth: 100 },
});
