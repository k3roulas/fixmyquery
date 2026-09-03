// Human-readable duration with adaptive unit: seconds (≥1s), milliseconds (≥1ms), else microseconds.
export function formatMs(ms: number): string {
  if (ms >= 1000) return `${(ms / 1000).toFixed(2)}s`;
  if (ms >= 1) return `${ms.toFixed(1)}ms`;
  return `${Math.round(ms * 1000)}µs`;
}
