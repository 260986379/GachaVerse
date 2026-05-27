const ROLE_STYLES = {
  Owner: {
    color: '#f04e28',
    textShadow: '0 0 14px rgba(240, 78, 40, 0.6)',
    glow: 'rgba(240, 78, 40, 0.55)',
  },
  Dev: {
    color: '#7c3aed',
    textShadow: '0 0 14px rgba(124, 58, 237, 0.65)',
    glow: 'rgba(124, 58, 237, 0.55)',
  },
  VIP: {
    color: '#2563eb',
    textShadow: '0 0 14px rgba(37, 99, 235, 0.65)',
    glow: 'rgba(37, 99, 235, 0.55)',
  },
  Member: {
    color: '#60a5fa',
    textShadow: '0 0 14px rgba(96, 165, 250, 0.6)',
    glow: 'rgba(96, 165, 250, 0.45)',
  },
  Regular: {
    color: 'rgba(255, 255, 255, 0.88)',
    // no glow — intentionally plain
  },
  Debug: {
    color: '#f59e0b',
    textShadow: '0 0 14px rgba(245, 158, 11, 0.6)',
    glow: 'rgba(245, 158, 11, 0.5)',
  },
}

/**
 * Returns an inline style object { color, textShadow?, glow? } for a given role.
 */
export function getRoleStyle(role) {
  return ROLE_STYLES[role] ?? ROLE_STYLES.Regular
}

/** Convenience: just the color string */
export function getRoleColor(role) {
  return getRoleStyle(role).color
}

/** Convenience: glow color string, or null for roles without glow (Regular) */
export function getRoleGlow(role) {
  return ROLE_STYLES[role]?.glow ?? null
}
