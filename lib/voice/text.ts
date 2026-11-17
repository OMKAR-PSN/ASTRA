export const DEFAULT_SPEECH_CHUNK_CHARS = 450;

export function normalizeSpeechText(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

export function splitSpeechText(text: string, maxChars = DEFAULT_SPEECH_CHUNK_CHARS): string[] {
  const normalized = normalizeSpeechText(text);
  if (normalized === '') return [];
  const limit = Math.max(80, maxChars);
  const sentences = normalized.match(/[^.!?]+[.!?]+|[^.!?]+$/g) ?? [normalized];
  const chunks: string[] = [];
  let current = '';

  const push = (value: string) => {
    const trimmed = value.trim();
    if (trimmed !== '') chunks.push(trimmed);
  };

  for (const sentence of sentences) {
    const trimmed = sentence.trim();
    if (trimmed === '') continue;
    if (trimmed.length > limit) {
      push(current);
      current = '';
      let remaining = trimmed;
      while (remaining.length > limit) {
        const space = remaining.lastIndexOf(' ', limit);
        const cut = space >= Math.floor(limit * 0.5) ? space : limit;
        push(remaining.slice(0, cut));
        remaining = remaining.slice(cut).trim();
      }
      current = remaining;
      continue;
    }
    if (current === '') current = trimmed;
    else if (current.length + 1 + trimmed.length <= limit) current = `${current} ${trimmed}`;
    else {
      push(current);
      current = trimmed;
    }
  }
  push(current);
  return chunks;
}

export function spokenUnit(unit: string): string {
  switch (unit) {
    case 'bpm': return 'beats per minute';
    case 'mmHg': return 'millimeters of mercury';
    case '°C': return 'degrees Celsius';
    case 'h':
    case 'hours': return 'hours';
    case 'of 5': return 'out of 5';
    default: return unit.trim();
  }
}

export function spokenValue(value: number, decimals: number): string {
  return Number.isFinite(value) ? value.toFixed(decimals) : '';
}

export function spokenPercent(value: number): string {
  if (!Number.isFinite(value)) return '';
  return Number.isInteger(value) ? String(value) : value.toFixed(2).replace(/0+$/, '').replace(/\.$/, '');
}

export function isUnavailableText(value: string | null | undefined): boolean {
  if (!value) return true;
  return /unavailable|not stated|not recorded|unknown/i.test(value);
}
