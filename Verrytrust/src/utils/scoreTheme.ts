export interface ScoreTheme {
  score: number;
  textColor: string;
  bgColor: string;
  borderColor: string;
  badgeBg: string;
  badgeBorder: string;
  badgeText: string;
  glow: string;
  startColor: string;
  endColor: string;
  statusTextKey: string;
  statusDefault: string;
}

/**
 * Single source of truth for score color palettes, gradients, and badges.
 * Eliminates duplicate score color mappings across cards, gauges, and history views.
 */
export function getScoreTheme(score: number): ScoreTheme {
  if (score >= 80) {
    return {
      score,
      textColor: 'text-emerald-400',
      bgColor: 'bg-emerald-500/15',
      borderColor: 'border-emerald-500/40',
      badgeBg: 'bg-emerald-500/15',
      badgeBorder: 'border-emerald-500/40',
      badgeText: 'text-emerald-300',
      glow: 'rgba(16, 185, 129, 0.45)',
      startColor: '#10b981',
      endColor: '#06b6d4',
      statusTextKey: 'statusSafe',
      statusDefault: 'AN TOÀN',
    };
  }

  if (score >= 50) {
    return {
      score,
      textColor: 'text-amber-400',
      bgColor: 'bg-amber-500/15',
      borderColor: 'border-amber-500/40',
      badgeBg: 'bg-amber-500/15',
      badgeBorder: 'border-amber-500/40',
      badgeText: 'text-amber-300',
      glow: 'rgba(245, 158, 11, 0.45)',
      startColor: '#f59e0b',
      endColor: '#eab308',
      statusTextKey: 'statusCaution',
      statusDefault: 'CẦN LƯU Ý',
    };
  }

  return {
    score,
    textColor: 'text-red-400',
    bgColor: 'bg-red-500/15',
    borderColor: 'border-red-500/40',
    badgeBg: 'bg-red-500/15',
    badgeBorder: 'border-red-500/40',
    badgeText: 'text-red-300',
    glow: 'rgba(244, 63, 94, 0.45)',
    startColor: '#f43f5e',
    endColor: '#dc2626',
    statusTextKey: 'statusDanger',
    statusDefault: 'CẢNH BÁO NGUY HIỂM',
  };
}

/**
 * Returns dynamic colors for secondary confidence circles.
 */
export function getConfidenceColors(score: number) {
  if (score >= 90) return { start: '#c084fc', end: '#06b6d4', glow: 'rgba(192, 132, 252, 0.35)' };
  if (score >= 75) return { start: '#34d399', end: '#06b6d4', glow: 'rgba(52, 211, 153, 0.35)' };
  if (score >= 60) return { start: '#fbbf24', end: '#f97316', glow: 'rgba(251, 191, 36, 0.35)' };
  return { start: '#f43f5e', end: '#e11d48', glow: 'rgba(244, 63, 94, 0.35)' };
}

