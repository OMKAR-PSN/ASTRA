import { useEffect, useMemo, useRef, useState } from 'react';
import { AccessibilityInfo, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { ArrowLeft, ArrowRight, Check, MessageCircleQuestion, ShieldCheck } from 'lucide-react-native';

import { KnowledgeLink } from '@/components/KnowledgeLink';
import { PrimaryButton } from '@/components/PrimaryButton';
import { VoiceControls } from '@/components/VoiceControls';
import { colors, fonts, radius, stitch, type as typography } from '@/constants/theme';
import {
  ADAPTIVE_NOTE_MAX,
  ADAPTIVE_QUESTION_LIMIT,
  activeAdaptiveQuestionIds,
  buildAdaptiveContext,
  createAdaptiveResponse,
  describeAdaptiveResponse,
  evaluateAdaptiveQuestions,
  findInactiveAdaptiveResponses,
  sanitizeAdaptiveResponses,
  validateAdaptiveAnswer,
  type AdaptiveQuestion,
} from '@/lib/adaptiveQuestions';
import type { CheckInFormValues } from '@/lib/checkInForm';
import { buildAdaptiveQuestionRequest } from '@/lib/voice/builders';
import { useVoiceGuidance } from '@/state/VoiceGuidanceProvider';
import type { AdaptiveAnswer, AdaptiveAnswerSource, AdaptiveResponse } from '@/types/astra';

type Props = {
  values: CheckInFormValues;
  source: AdaptiveAnswerSource;
  onChange: (responses: AdaptiveResponse[]) => void;
  onSkippedChange: (skipped: string[]) => void;
};

const emptyAnswer = (): AdaptiveAnswer => ({ optionIds: [], text: null });

export function AdaptiveQuestions({ values, source, onChange, onSkippedChange }: Props) {
  const context = useMemo(() => buildAdaptiveContext(values), [values]);
  const [showAll, setShowAll] = useState(false);
  const [index, setIndex] = useState(0);
  const [draft, setDraft] = useState<AdaptiveAnswer>(emptyAnswer);
  const [error, setError] = useState<string | null>(null);
  const responsesRef = useRef(values.adaptiveResponses);
  const { stopScope } = useVoiceGuidance();

  useEffect(() => {
    responsesRef.current = values.adaptiveResponses;
  }, [values.adaptiveResponses]);

  const result = useMemo(
    () => evaluateAdaptiveQuestions(context, { limit: showAll ? Number.POSITIVE_INFINITY : ADAPTIVE_QUESTION_LIMIT }),
    [context, showAll],
  );
  const questions = result.questions;
  const current: AdaptiveQuestion | null = index < questions.length ? questions[index] : null;
  const responses = sanitizeAdaptiveResponses(values.adaptiveResponses ?? []);
  const activeIds = activeAdaptiveQuestionIds(context);
  const inactive = findInactiveAdaptiveResponses(values);
  const skipped = values.adaptiveSkipped ?? [];
  const answeredCount = responses.filter((response) => activeIds.has(response.questionId)).length;

  useEffect(() => {
    const existing = (responsesRef.current ?? []).find((response) => response.questionId === current?.id)?.answer;
    setDraft(existing ? { optionIds: [...existing.optionIds], text: existing.text } : emptyAnswer());
    setError(null);
    stopScope('adaptive');
  }, [current?.id, stopScope]);

  useEffect(() => () => stopScope('adaptive'), [stopScope]);

  const goTo = (next: number) => {
    const target = questions[next];
    setIndex(next);
    setError(null);
    if (target) {
      AccessibilityInfo.announceForAccessibility(
        `Optional question ${next + 1} of ${questions.length}. ${target.prompt}`,
      );
    } else {
      AccessibilityInfo.announceForAccessibility('Optional questions finished.');
    }
  };

  const replaceResponses = (next: AdaptiveResponse[]) => {
    onChange(sanitizeAdaptiveResponses(next));
  };

  const toggleOption = (optionId: string) => {
    if (!current) return;
    setError(null);
    if (current.type === 'multi-select') {
      setDraft((value) => ({
        ...value,
        optionIds: value.optionIds.includes(optionId)
          ? value.optionIds.filter((id) => id !== optionId)
          : [...value.optionIds, optionId],
      }));
      return;
    }
    setDraft((value) => {
      const keepsNote = current.requiresTextForOptionIds?.includes(optionId) ?? false;
      return { optionIds: [optionId], text: keepsNote ? value.text : null };
    });
  };

  const commit = () => {
    if (!current) return;
    const message = validateAdaptiveAnswer(current, draft);
    if (message) {
      setError(message);
      AccessibilityInfo.announceForAccessibility(message);
      return;
    }
    const response = createAdaptiveResponse(
      current,
      draft,
      source,
      new Date().toISOString(),
      current.contextLabel,
    );
    if (!response) {
      setError('This answer could not be prepared. Review the answer and try again.');
      return;
    }
    replaceResponses([...(values.adaptiveResponses ?? []).filter((item) => item.questionId !== current.id), response]);
    onSkippedChange(skipped.filter((id) => id !== current.id));
    AccessibilityInfo.announceForAccessibility('Optional answer saved with this check-in. It is not saved until you save the check-in.');
    goTo(index + 1);
  };

  const skip = () => {
    if (!current) return;
    replaceResponses((values.adaptiveResponses ?? []).filter((item) => item.questionId !== current.id));
    onSkippedChange(skipped.includes(current.id) ? skipped : [...skipped, current.id]);
    AccessibilityInfo.announceForAccessibility('Question skipped. It stays unanswered and is not recorded as No.');
    goTo(index + 1);
  };

  const removeInactive = () => {
    replaceResponses((values.adaptiveResponses ?? []).filter((item) => activeIds.has(item.questionId)));
    AccessibilityInfo.announceForAccessibility('Earlier optional answer removed.');
  };

  if (result.totalAvailable === 0 && responses.length === 0) return null;

  const showNote = current !== null && (
    current.type === 'short-text'
    || Boolean(current.requiresTextForOptionIds?.some((id) => draft.optionIds.includes(id)))
  );

  return (
    <View style={styles.panel}>
      <View style={styles.head}>
        <View style={styles.headIcon}>
          <MessageCircleQuestion size={16} color={colors.primary[300]} strokeWidth={2.2} />
        </View>
        <View style={styles.headCopy}>
          <Text accessibilityRole="header" style={styles.title}>Would you like to tell us a little more?</Text>
          <Text style={styles.subtitle}>These optional questions help document your observation. Nothing here is required.</Text>
        </View>
        <Text style={styles.badge}>OPTIONAL</Text>
      </View>

      {current ? (
        <>
          <View style={styles.progressRow}>
            <Text style={styles.progressText}>
              Optional question {index + 1} of {questions.length}
            </Text>
            {result.hiddenCount > 0 ? <Text style={styles.progressMeta}>+{result.hiddenCount} more available</Text> : null}
          </View>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${((index + 1) / Math.max(1, questions.length)) * 100}%` }]} />
          </View>

          <View style={styles.questionCard}>
            <Text style={styles.reason}>{current.reason}</Text>
            <Text accessibilityLiveRegion="polite" style={styles.prompt}>{current.prompt}</Text>
            <Text style={styles.helper}>{current.helper}</Text>

            <VoiceControls
              request={buildAdaptiveQuestionRequest(current)}
              scope="adaptive"
              listenLabel="Listen to optional question"
              detail="full"
            />

            {current.type === 'short-text' ? (
              <View style={styles.noteWrap}>
                <TextInput
                  accessibilityLabel={`${current.prompt} note`}
                  value={draft.text ?? ''}
                  onChangeText={(text) => {
                    setDraft((value) => ({ ...value, text }));
                    setError(null);
                  }}
                  placeholder="Your words, briefly"
                  placeholderTextColor={colors.slate[500]}
                  multiline
                  maxLength={ADAPTIVE_NOTE_MAX}
                  style={styles.note}
                />
                <Text style={styles.counter}>{(draft.text ?? '').length} / {ADAPTIVE_NOTE_MAX}</Text>
              </View>
            ) : (
              <View style={styles.options}>
                {current.options.map((option) => {
                  const selected = draft.optionIds.includes(option.id);
                  return (
                    <Pressable
                      key={option.id}
                      accessibilityRole={current.type === 'multi-select' ? 'checkbox' : 'radio'}
                      accessibilityLabel={option.label}
                      accessibilityState={{ checked: selected }}
                      aria-checked={selected}
                      onPress={() => toggleOption(option.id)}
                      style={({ pressed, hovered }: { pressed: boolean; hovered?: boolean }) => [
                        styles.option,
                        selected && styles.optionSelected,
                        (hovered || pressed) && !selected && styles.optionHover,
                      ]}
                    >
                      <View style={[styles.optionMark, selected && styles.optionMarkSelected]}>
                        {selected ? <Check size={12} color={colors.primary.ink} strokeWidth={3} /> : null}
                      </View>
                      <Text style={[styles.optionLabel, selected && styles.optionLabelSelected]}>{option.label}</Text>
                      {selected ? <Text style={styles.optionState}>Selected</Text> : null}
                    </Pressable>
                  );
                })}
              </View>
            )}

            {showNote && current.type !== 'short-text' ? (
              <View style={styles.noteWrap}>
                <Text style={styles.noteLabel}>SHORT NOTE · REQUIRED FOR OTHER</Text>
                <TextInput
                  accessibilityLabel={`${current.prompt} note`}
                  value={draft.text ?? ''}
                  onChangeText={(text) => {
                    setDraft((value) => ({ ...value, text }));
                    setError(null);
                  }}
                  placeholder="A few words in your own words"
                  placeholderTextColor={colors.slate[500]}
                  maxLength={ADAPTIVE_NOTE_MAX}
                  style={styles.noteSingle}
                />
                <Text style={styles.counter}>{(draft.text ?? '').length} / {ADAPTIVE_NOTE_MAX}</Text>
              </View>
            ) : null}

            {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}

            <View style={styles.actions}>
              <PrimaryButton
                variant="secondary"
                label="Back"
                Icon={ArrowLeft}
                disabled={index === 0}
                onPress={() => goTo(Math.max(0, index - 1))}
                style={styles.actionButton}
              />
              <PrimaryButton variant="secondary" label="Skip" onPress={skip} style={styles.actionButton} />
              <PrimaryButton
                label="Continue"
                Icon={ArrowRight}
                onPress={commit}
                accessibilityHint="Saves this optional answer with the check-in and moves to the next optional question."
                style={styles.actionButton}
              />
            </View>
            <Text style={styles.answerNote}>Continue saves this answer with the check-in. Skip leaves it unanswered; skipped is never recorded as No.</Text>

            <KnowledgeLink cardId={current.knowledgeCardId} />
          </View>
        </>
      ) : (
        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>Optional answers</Text>
          <Text style={styles.summaryBody}>
            {answeredCount} of {questions.length} answered. Answers are saved only when you save the check-in. Skipped questions stay unanswered and are not recorded as No.
          </Text>
          <View style={styles.summaryList}>
            {questions.map((question, questionIndex) => {
              const response = responses.find((item) => item.questionId === question.id);
              const wasSkipped = skipped.includes(question.id);
              const answer = response ? describeAdaptiveResponse(response).answer : wasSkipped ? 'Skipped — not answered' : 'Not answered';
              return (
                <View key={question.id} style={styles.summaryRow}>
                  <View style={styles.summaryCopy}>
                    <Text style={styles.summaryQuestion}>{question.prompt}</Text>
                    <Text style={[styles.summaryAnswer, !response && styles.summaryAnswerEmpty]}>{answer}</Text>
                  </View>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Edit optional answer: ${question.prompt}`}
                    onPress={() => goTo(questionIndex)}
                    style={({ pressed, hovered }: { pressed: boolean; hovered?: boolean }) => [styles.editButton, (hovered || pressed) && styles.editButtonHover]}
                  >
                    <Text style={styles.editLabel}>Edit</Text>
                  </Pressable>
                </View>
              );
            })}
          </View>
          <View style={styles.summaryActions}>
            <PrimaryButton variant="secondary" label="Back" Icon={ArrowLeft} onPress={() => goTo(Math.max(0, questions.length - 1))} style={styles.actionButton} />
            {result.hiddenCount > 0 ? (
              <PrimaryButton
                variant="secondary"
                label={`View more optional questions (${result.hiddenCount})`}
                onPress={() => setShowAll(true)}
                style={styles.actionButton}
              />
            ) : null}
          </View>
          <Text style={styles.answerNote}>You can keep editing these answers, or use Back on the check-in to change a symptom. Answers for removed symptoms are not saved.</Text>
        </View>
      )}

      {inactive.length > 0 ? (
        <View style={styles.inactive}>
          <Text style={styles.inactiveTitle}>Earlier optional answer kept on this screen</Text>
          <Text style={styles.inactiveText}>
            An answer is no longer linked to a recorded symptom, so it will not be saved unless that symptom is recorded again.
          </Text>
          {inactive.map((response) => {
            const described = describeAdaptiveResponse(response);
            return (
              <Text key={response.questionId} style={styles.inactiveLine}>
                {described.question} · {described.answer}
              </Text>
            );
          })}
          <Pressable accessibilityRole="button" accessibilityLabel="Remove earlier optional answer" onPress={removeInactive} style={styles.inactiveAction}>
            <Text style={styles.inactiveActionLabel}>Remove answer</Text>
          </Pressable>
        </View>
      ) : null}

      <View style={styles.safety}>
        <ShieldCheck size={13} color={colors.secondary[400]} strokeWidth={2.2} />
        <Text style={styles.safetyText}>
          Optional answers document what you reported. They are not a diagnosis, do not classify urgency, and are never sent automatically. If anything concerns you, follow your crew&apos;s approved mission procedures.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    gap: 12,
    padding: 14,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: 'rgba(0, 214, 198, 0.26)',
    backgroundColor: 'rgba(0, 214, 198, 0.05)',
  },
  head: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, flexWrap: 'wrap' },
  headIcon: {
    width: 30,
    height: 30,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(80, 222, 216, 0.24)',
    backgroundColor: stitch.cyanMuted,
    flexShrink: 0,
  },
  headCopy: { flex: 1, minWidth: 180, gap: 3 },
  title: { fontFamily: fonts.semibold, fontSize: 16, lineHeight: 22, color: colors.offWhite },
  subtitle: { ...typography.bodySmall, color: colors.slate[300] },
  badge: { fontFamily: fonts.mono, fontSize: 8, lineHeight: 12, letterSpacing: 0.7, color: colors.slate[500] },

  progressRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' },
  progressText: { fontFamily: fonts.mono, fontSize: 9.5, lineHeight: 14, letterSpacing: 0.4, color: colors.primary[300] },
  progressMeta: { fontFamily: fonts.mono, fontSize: 9, lineHeight: 13, color: colors.slate[500] },
  progressTrack: { height: 4, borderRadius: 2, backgroundColor: 'rgba(40, 60, 80, 0.8)', overflow: 'hidden' },
  progressFill: { height: 4, borderRadius: 2, backgroundColor: colors.primary[400] },

  questionCard: {
    gap: 10,
    padding: 13,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: stitch.glassBorder,
    backgroundColor: 'rgba(4, 16, 28, 0.62)',
  },
  reason: { ...typography.meta, color: colors.primary[300] },
  prompt: { fontFamily: fonts.semibold, fontSize: 16.5, lineHeight: 23, color: colors.offWhite },
  helper: { ...typography.meta, color: colors.slate[400] },

  options: { gap: 7 },
  option: {
    minHeight: 46,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    paddingVertical: 8,
    paddingHorizontal: 11,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: 'rgba(40, 60, 80, 0.9)',
    backgroundColor: stitch.panelDeep,
  },
  optionSelected: { borderColor: colors.primary[400], backgroundColor: 'rgba(0, 214, 198, 0.14)' },
  optionHover: { backgroundColor: 'rgba(9, 29, 42, 0.92)' },
  optionMark: {
    width: 19,
    height: 19,
    borderRadius: 5,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(141, 187, 255, 0.35)',
    backgroundColor: 'rgba(4, 16, 28, 0.7)',
    flexShrink: 0,
  },
  optionMarkSelected: { borderColor: colors.primary[400], backgroundColor: colors.primary[400] },
  optionLabel: { flex: 1, minWidth: 0, fontFamily: fonts.regular, fontSize: 14, lineHeight: 20, color: colors.slate[200] },
  optionLabelSelected: { fontFamily: fonts.semibold, color: colors.offWhite },
  optionState: { fontFamily: fonts.mono, fontSize: 8.5, lineHeight: 12, letterSpacing: 0.5, color: colors.primary[300] },

  noteWrap: { gap: 4 },
  noteLabel: { ...typography.label, fontSize: 8.5, lineHeight: 12, color: colors.slate[500] },
  note: {
    minHeight: 84,
    padding: 11,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: 'rgba(40, 60, 80, 0.9)',
    backgroundColor: stitch.panelDeep,
    fontFamily: fonts.regular,
    fontSize: 14.5,
    lineHeight: 21,
    color: colors.offWhite,
    textAlignVertical: 'top',
  },
  noteSingle: {
    minHeight: 46,
    paddingHorizontal: 11,
    paddingVertical: 8,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: 'rgba(40, 60, 80, 0.9)',
    backgroundColor: stitch.panelDeep,
    fontFamily: fonts.regular,
    fontSize: 14.5,
    lineHeight: 21,
    color: colors.offWhite,
  },
  counter: { fontFamily: fonts.mono, fontSize: 9, lineHeight: 13, color: colors.slate[500], textAlign: 'right' },
  error: { fontFamily: fonts.semibold, fontSize: 12, lineHeight: 17, color: colors.error[400] },

  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  actionButton: { flexGrow: 1, flexBasis: 128 },
  answerNote: { ...typography.meta, fontSize: 10, lineHeight: 15, color: colors.slate[500] },

  summaryCard: { gap: 10, padding: 13, borderRadius: radius.sm, borderWidth: 1, borderColor: stitch.glassBorder, backgroundColor: 'rgba(4, 16, 28, 0.62)' },
  summaryTitle: { fontFamily: fonts.semibold, fontSize: 15, lineHeight: 21, color: colors.offWhite },
  summaryBody: { ...typography.bodySmall, color: colors.slate[300] },
  summaryList: { gap: 6 },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    padding: 9,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: 'rgba(40, 60, 80, 0.75)',
    backgroundColor: 'rgba(9, 29, 42, 0.58)',
  },
  summaryCopy: { flex: 1, minWidth: 0, gap: 2 },
  summaryQuestion: { ...typography.bodySmall, color: colors.slate[200] },
  summaryAnswer: { fontFamily: fonts.semibold, fontSize: 12.5, lineHeight: 18, color: colors.offWhite },
  summaryAnswerEmpty: { fontFamily: fonts.regular, color: colors.slate[500] },
  editButton: { minHeight: 32, justifyContent: 'center', paddingHorizontal: 6, borderRadius: 6 },
  editButtonHover: { backgroundColor: 'rgba(255, 255, 255, 0.07)' },
  editLabel: { fontFamily: fonts.semibold, fontSize: 11, lineHeight: 16, color: colors.primary[300] },
  summaryActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },

  inactive: {
    gap: 5,
    padding: 11,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: 'rgba(242, 192, 120, 0.3)',
    backgroundColor: stitch.amberMuted,
  },
  inactiveTitle: { fontFamily: fonts.semibold, fontSize: 12, lineHeight: 17, color: colors.accent[400] },
  inactiveText: { ...typography.meta, color: colors.slate[300] },
  inactiveLine: { fontFamily: fonts.mono, fontSize: 9.5, lineHeight: 14, color: colors.slate[300] },
  inactiveAction: { alignSelf: 'flex-start', minHeight: 36, justifyContent: 'center', paddingHorizontal: 2 },
  inactiveActionLabel: { fontFamily: fonts.semibold, fontSize: 11.5, lineHeight: 16, color: colors.accent[400] },

  safety: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  safetyText: { ...typography.meta, color: colors.slate[400], flex: 1, minWidth: 0 },
});
