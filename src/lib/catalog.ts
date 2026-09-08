import { catalogCopy } from '../copies/index'
import type { Category, CategoryKey } from './types'

export const CATEGORIES: Category[] = [
  { key: 'sports', name: catalogCopy.sports, glyph: catalogCopy.separator, a: '#35793f', b: '#79b06a' },
  { key: 'gaming', name: catalogCopy.gaming, glyph: catalogCopy.separator2, a: '#6b4fc8', b: '#9186d8' },
  { key: 'social', name: catalogCopy.social, glyph: catalogCopy.separator3, a: '#c93f7d', b: '#d97fa2' },
  { key: 'outdoors', name: catalogCopy.outdoors, glyph: catalogCopy.separator4, a: '#256f78', b: '#6fb0b4' },
  { key: 'arts', name: catalogCopy.artsCulture, glyph: catalogCopy.separator5, a: '#8f5c14', b: '#cfa063' },
  { key: 'learn', name: catalogCopy.learnMake, glyph: catalogCopy.separator6, a: '#3a63c4', b: '#7f9bd6' },
  { key: 'wellness', name: catalogCopy.wellness, glyph: catalogCopy.separator7, a: '#187260', b: '#67b3a1' },
  { key: 'family', name: catalogCopy.familyKids, glyph: catalogCopy.separator8, a: '#a84824', b: '#dd9273' },
  { key: 'other', name: catalogCopy.other, glyph: catalogCopy.separator9, a: '#5c6672', b: '#94a0ac' },
]
export const SUBCATEGORIES: Record<CategoryKey, string[]> = {
  sports: [catalogCopy.footballSoccer, catalogCopy.basketball, catalogCopy.volleyball, catalogCopy.tennisPadel, catalogCopy.running, catalogCopy.cycling, catalogCopy.swimming, catalogCopy.climbing, catalogCopy.other],
  gaming: [catalogCopy.pC, catalogCopy.console, catalogCopy.boardGames, catalogCopy.tabletopRPG, catalogCopy.cardGames, catalogCopy.arcadeLAN, catalogCopy.other],
  social: [catalogCopy.movieNight, catalogCopy.barCrawl, catalogCopy.houseParty, catalogCopy.karaoke, catalogCopy.dinnerPotluck, catalogCopy.coffeeMeetup, catalogCopy.other],
  outdoors: [catalogCopy.hiking, catalogCopy.beach, catalogCopy.picnic, catalogCopy.camping, catalogCopy.dogWalk, catalogCopy.other],
  arts: [catalogCopy.liveMusic, catalogCopy.museums, catalogCopy.theater, catalogCopy.photographyWalk, catalogCopy.crafts, catalogCopy.other],
  learn: [catalogCopy.languageExchange, catalogCopy.studyGroup, catalogCopy.codingHackNight, catalogCopy.workshops, catalogCopy.bookClub, catalogCopy.other],
  wellness: [catalogCopy.yoga, catalogCopy.gymSession, catalogCopy.meditation, catalogCopy.groupWalk, catalogCopy.other],
  family: [catalogCopy.playgroundMeetup, catalogCopy.kidsSports, catalogCopy.familyOuting, catalogCopy.other],
  other: [catalogCopy.anythingElse],
}
export const AVATAR_COLORS = ['#d9c7f0', '#c8f24a', '#f6c9d8', '#bfe3e8', '#f2dda6', '#c9d8f5', '#d5ecc9', '#f0cdbb']
export const getCategory = (key: CategoryKey) => CATEGORIES.find(c => c.key === key)!
export const initials = (name: string) => name.trim().split(/\s+/).slice(0, 2).map(part => part[0]).join('').toUpperCase()
export function ageFrom(birthDate: string) {
  if (!birthDate) return null
  const date = new Date(`${birthDate}T12:00:00`)
  if (Number.isNaN(date.getTime())) return null
  const now = new Date()
  return now.getFullYear() - date.getFullYear() - (now.getMonth() < date.getMonth() || (now.getMonth() === date.getMonth() && now.getDate() < date.getDate()) ? 1 : 0)
}
