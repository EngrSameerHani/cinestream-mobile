// ============================================================
// CineStream Design System — Dark Cinematic Theme
// ============================================================

export const Colors = {
  // ── Backgrounds ─────────────────────────────────────────────
  background:       '#0a0a0a',   // deep black
  surface:          '#141414',   // card/modal background
  surfaceElevated:  '#1f1f1f',   // slightly lighter surface
  border:           '#2a2a2a',   // subtle borders

  // ── Brand ────────────────────────────────────────────────────
  primary:          '#E50914',   // Netflix red
  primaryDark:      '#b20710',
  primaryLight:     '#ff1e2d',

  // ── Text ─────────────────────────────────────────────────────
  text:             '#ffffff',
  textSecondary:    '#a3a3a3',
  textMuted:        '#525252',
  textInverse:      '#0a0a0a',

  // ── Status ───────────────────────────────────────────────────
  success:          '#22c55e',
  warning:          '#f59e0b',
  error:            '#ef4444',
  info:             '#3b82f6',

  // ── Overlay ──────────────────────────────────────────────────
  overlay:          'rgba(0,0,0,0.6)',
  overlayHeavy:     'rgba(0,0,0,0.85)',
  overlayLight:     'rgba(0,0,0,0.3)',

  // ── Gradient stops ───────────────────────────────────────────
  gradientStart:    'transparent',
  gradientEnd:      '#0a0a0a',

  // ── Tab bar ──────────────────────────────────────────────────
  tabBar:           '#111111',
  tabBarBorder:     '#1f1f1f',
  tabActive:        '#ffffff',
  tabInactive:      '#525252',

  // ── Rating badge ─────────────────────────────────────────────
  ratingBg:         'rgba(229,9,20,0.15)',
  ratingBorder:     '#E50914',
} as const;

export const Spacing = {
  xs:  4,
  sm:  8,
  md:  16,
  lg:  24,
  xl:  32,
  xxl: 48,
} as const;

export const BorderRadius = {
  sm:   4,
  md:   8,
  lg:   12,
  xl:   16,
  full: 9999,
} as const;

export const FontSize = {
  xs:   11,
  sm:   13,
  md:   15,
  lg:   17,
  xl:   20,
  xxl:  24,
  xxxl: 30,
  hero: 38,
} as const;

export const FontWeight = {
  regular: '400' as const,
  medium:  '500' as const,
  semibold:'600' as const,
  bold:    '700' as const,
  black:   '900' as const,
};

export const Shadow = {
  sm: {
    shadowColor:   '#000',
    shadowOffset:  { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius:  2,
    elevation:     2,
  },
  md: {
    shadowColor:   '#000',
    shadowOffset:  { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius:  8,
    elevation:     6,
  },
  lg: {
    shadowColor:   '#000',
    shadowOffset:  { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius:  16,
    elevation:     12,
  },
} as const;

export const HEADER_HEIGHT  = 56;
export const TAB_BAR_HEIGHT = 64;
export const POSTER_RATIO   = 2 / 3;   // height / width
export const BACKDROP_RATIO = 9 / 16;  // height / width
