// Base design tokens (SPEC §5). Pure data — no RN imports.

export const palette = {
  secondary: '#0cb6fd', // cyan
  ink: '#1A1C1C',
  cream: '#f9f9f9',
  night: '#0e0e0e',
  red: '#ef4444',
  white: '#ffffff',
} as const;

export const radii = {
  pill: 9999,
  card: 26,
  cardLg: 28,
  cardSm: 24,
  stage: 16,
  cover: 18,
  sheet: 28,
  tile: 20,
} as const;

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 24 } as const;

export const motion = {
  fadeup: { duration: 450, easing: [0.2, 0.8, 0.2, 1] as const, translateY: 8 },
  pop: { duration: 550, easing: [0.2, 0.9, 0.3, 1.25] as const },
  ring: { duration: 700 },
  shake: { duration: 500 },
  stagger: [80, 160, 240, 320, 400] as const,
} as const;

export const shadow = {
  soft: {
    shadowColor: 'rgba(26,28,28,1)',
    shadowOpacity: 0.1,
    shadowRadius: 30,
    shadowOffset: { width: 0, height: 18 },
    elevation: 8,
  },
} as const;

/** "245 158 11" + alpha → "rgba(245,158,11, a)" */
export const rgb = (triplet: string, a = 1) => `rgba(${triplet.split(' ').join(',')}, ${a})`;
