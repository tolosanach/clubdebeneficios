/**
 * Segmentation logic for customer classification
 */

/**
 * Classify a customer into a segment based on their behavior
 * @param {Object} membership - Membership data with visits_count, points/stars, last_visit
 * @param {Array} visits - Array of visit records
 * @param {number} pointsThreshold - Point threshold for VIP classification (default: 500)
 * @returns {string} Segment: 'nuevos' | 'frecuentes' | 'vip' | 'inactivos'
 */
export function classifySegment(membership, visits = [], pointsThreshold = 500) {
  const visitsCount = membership?.visits_count || 0
  const balance = membership?.points || membership?.stars || 0
  const lastVisit = membership?.last_visit ? new Date(membership.last_visit) : null

  // Calcular visitas en últimas 4 semanas
  const fourWeeksAgo = new Date()
  fourWeeksAgo.setDate(fourWeeksAgo.getDate() - 28)
  const recentVisits = (visits || []).filter(v =>
    new Date(v.created_at) > fourWeeksAgo
  ).length

  // Inactivos: última visita > 8 semanas atrás
  if (lastVisit) {
    const eightWeeksAgo = new Date()
    eightWeeksAgo.setDate(eightWeeksAgo.getDate() - 56)
    if (lastVisit < eightWeeksAgo) {
      return 'inactivos'
    }
  }

  // VIP: 10+ visitas lifetime OR saldo alto
  if (visitsCount >= 10 || balance >= pointsThreshold) {
    return 'vip'
  }

  // Frecuentes: 3+ visitas en últimas 4 semanas
  if (recentVisits >= 3) {
    return 'frecuentes'
  }

  // Nuevos: 0-2 visitas en últimas 4 semanas
  return 'nuevos'
}

/**
 * Get segment display info
 */
export const SEGMENT_INFO = {
  nuevos: {
    label: 'Nuevos',
    icon: '🌟',
    color: '#40C8FF',
    description: 'Clientes que acaban de unirse',
  },
  frecuentes: {
    label: 'Frecuentes',
    icon: '🔥',
    color: '#FE5000',
    description: 'Clientes que visitan regularmente',
  },
  vip: {
    label: 'VIP',
    icon: '👑',
    color: '#BD4BF8',
    description: 'Clientes más leales y comprometidos',
  },
  inactivos: {
    label: 'Inactivos',
    icon: '😴',
    color: '#9B85CC',
    description: 'Clientes sin visitas recientes',
  },
}
