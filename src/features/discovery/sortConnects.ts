import { getCategory } from '../../lib/catalog'
import type { CategoryKey, Connect } from '../../lib/types'

export type DiscoverySort = 'distance' | 'relevance' | 'popularity'

export function normalizeDiscoverySort(value: string | null): DiscoverySort {
  if (value === 'relevance' || value === 'soonest') return 'relevance'
  if (value === 'popularity' || value === 'popular') return 'popularity'
  return 'distance'
}

function relevanceScore(connect: Connect, query: string, interests: readonly CategoryKey[]) {
  let score = interests.includes(connect.categoryKey) ? 20 : 0
  if (!query) return score
  const title = connect.title.toLowerCase()
  if (title === query) score += 100
  else if (title.includes(query)) score += 60
  if (connect.subcategoryNames.some(subcategoryName => subcategoryName.toLowerCase().includes(query))) score += 45
  if (getCategory(connect.categoryKey).name.toLowerCase().includes(query)) score += 30
  if (connect.publicAreaLabel.toLowerCase().includes(query)) score += 15
  if (connect.hostName.toLowerCase().includes(query)) score += 10
  return score
}

export function sortConnects(
  connects: readonly Connect[],
  sort: DiscoverySort,
  query: string,
  interests: readonly CategoryKey[],
) {
  const search = query.trim().toLowerCase()
  return connects
    .map(connect => ({ connect, relevance: sort === 'relevance' ? relevanceScore(connect, search, interests) : 0 }))
    .sort((firstRankedConnect, secondRankedConnect) => {
      const first = firstRankedConnect.connect, second = secondRankedConnect.connect
      const primary = sort === 'relevance' ? secondRankedConnect.relevance - firstRankedConnect.relevance
        : sort === 'popularity' ? second.attendees.length - first.attendees.length
        : (first.distanceKilometers ?? Number.MAX_SAFE_INTEGER) - (second.distanceKilometers ?? Number.MAX_SAFE_INTEGER)
      return primary || Date.parse(first.startsAt) - Date.parse(second.startsAt) || first.id.localeCompare(second.id)
    })
    .map(item => item.connect)
}
