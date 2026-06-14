export function formatPc(value: number): string {
  if (value === 0) {
    return "0";
  }
  if (value < 0.001) {
    return value.toExponential(3);
  }
  return value.toFixed(4);
}

export function formatDistanceMeters(value: number): string {
  if (value >= 1000) {
    return `${(value / 1000).toFixed(2)} km`;
  }
  return `${value.toFixed(1)} m`;
}

export function formatDeltaV(value: number): string {
  return `${value.toFixed(2)} m/s`;
}

export function formatDirection(value: string): string {
  return value.replaceAll("-", " ");
}

export function severityLabel(value: string): string {
  return value.replaceAll("-", " ").toUpperCase();
}

export function operatorLabel(value?: string | null, fallback = "syncing"): string {
  if (!value) {
    return fallback;
  }

  return value.replaceAll("_", " ").replaceAll("-", " ");
}
