import { DIFFERENCE_THRESHOLD_PERCENT, formatSigned } from '@/lib/comparison';
import { formatReadingValue } from '@/lib/format';
import type { ExplanationSections, MetricComparison } from '@/types/astra';

const describeValue = (comparison: MetricComparison): string =>
  `${comparison.label}: ${formatReadingValue(comparison.current, comparison.unit, comparison.decimals)}`;

const describeCalculation = (comparison: MetricComparison): string => {
  if (comparison.current === null || comparison.change === null || comparison.percentChange === null) {
    return `${comparison.label}: insufficient data for a comparison`;
  }
  const { decimals, unit, baseline } = comparison;
  return `${comparison.label}: ${formatSigned(comparison.change, decimals)} ${unit} (${formatSigned(
    comparison.percentChange,
    2,
  )}%) against a baseline of ${baseline.toFixed(decimals)} ${unit}`;
};

export function buildExplanation(comparisons: MetricComparison[]): ExplanationSections {
  const compared = comparisons.filter((item) => item.percentChange !== null);
  const differing = compared.filter(
    (item) => Math.abs(item.percentChange as number) >= DIFFERENCE_THRESHOLD_PERCENT,
  );
  const missing = comparisons.filter((item) => item.current === null);

  let possibleInterpretation: string;
  if (compared.length === 0) {
    possibleInterpretation = 'Insufficient data to compare this check-in with your synthetic baseline.';
  } else if (differing.length > 0) {
    const names = differing.map((item) => item.label.toLowerCase()).join(', ');
    possibleInterpretation = `This reading differs from your synthetic baseline for ${names}. Everyday factors such as activity, rest, or stress can shift readings. This demo does not identify a cause.`;
  } else {
    possibleInterpretation = 'Recorded readings are close to your synthetic baseline.';
  }

  const nextSteps: string[] = [];
  if (differing.length > 0) {
    nextSteps.push('Recheck the reading after a few minutes at rest, then note the result in the activity field.');
  }
  if (missing.length > 0) {
    nextSteps.push('Add the missing readings to complete the comparison.');
  }
  if (nextSteps.length === 0) {
    nextSteps.push('Continue routine check-ins.');
  }

  return {
    observed: comparisons.map(describeValue),
    calculated: comparisons.map(describeCalculation),
    possibleInterpretation,
    suggestedNextStep: nextSteps.join(' '),
  };
}
