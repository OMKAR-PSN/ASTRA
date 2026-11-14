export function formatTimestamp(iso: string): string {
  const date = new Date(iso);
  const pad = (value: number) => String(value).padStart(2, '0');
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}, ${pad(date.getHours())}:${pad(
    date.getMinutes(),
  )}`;
}

export function formatReadingValue(value: number | null, unit: string, decimals: number): string {
  if (value === null) return 'Not recorded';
  return `${value.toFixed(decimals)} ${unit}`;
}
