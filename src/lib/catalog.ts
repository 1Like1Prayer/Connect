import { catalogCopy } from '../copies/index'
import type { Category, CategoryKey } from './types'

export const CATEGORIES: Category[] = [
  { key: 'sports', name: catalogCopy.sports, glyph: catalogCopy.circleSymbol, primaryColor: '#35793f', alternateColor: '#79b06a' },
  { key: 'gaming', name: catalogCopy.gaming, glyph: catalogCopy.squareSymbol, primaryColor: '#6b4fc8', alternateColor: '#9186d8' },
  { key: 'social', name: catalogCopy.social, glyph: catalogCopy.diamondSymbol, primaryColor: '#c93f7d', alternateColor: '#d97fa2' },
  { key: 'outdoors', name: catalogCopy.outdoors, glyph: catalogCopy.triangleSymbol, primaryColor: '#256f78', alternateColor: '#6fb0b4' },
  { key: 'arts', name: catalogCopy.artsCulture, glyph: catalogCopy.asteriskSymbol, primaryColor: '#8f5c14', alternateColor: '#cfa063' },
  { key: 'learn', name: catalogCopy.learnMake, glyph: catalogCopy.sparkleSymbol, primaryColor: '#3a63c4', alternateColor: '#7f9bd6' },
  { key: 'wellness', name: catalogCopy.wellness, glyph: catalogCopy.halfCircleSymbol, primaryColor: '#187260', alternateColor: '#67b3a1' },
  { key: 'family', name: catalogCopy.familyKids, glyph: catalogCopy.plusSymbol, primaryColor: '#a84824', alternateColor: '#dd9273' },
  { key: 'other', name: catalogCopy.other, glyph: catalogCopy.hollowCircleSymbol, primaryColor: '#5c6672', alternateColor: '#94a0ac' },
]
export const SUBCATEGORIES: Record<CategoryKey, string[]> = {
  sports: [catalogCopy.footballSoccer, catalogCopy.basketball, catalogCopy.volleyball, catalogCopy.tennisPadel, catalogCopy.running, catalogCopy.cycling, catalogCopy.swimming, catalogCopy.climbing, catalogCopy.other],
  gaming: [catalogCopy.personalComputer, catalogCopy.console, catalogCopy.boardGames, catalogCopy.tabletopRolePlayingGames, catalogCopy.cardGames, catalogCopy.arcadeLocalNetwork, catalogCopy.other],
  social: [catalogCopy.movieNight, catalogCopy.barCrawl, catalogCopy.houseParty, catalogCopy.karaoke, catalogCopy.dinnerPotluck, catalogCopy.coffeeMeetup, catalogCopy.other],
  outdoors: [catalogCopy.hiking, catalogCopy.beach, catalogCopy.picnic, catalogCopy.camping, catalogCopy.dogWalk, catalogCopy.other],
  arts: [catalogCopy.liveMusic, catalogCopy.museums, catalogCopy.theater, catalogCopy.photographyWalk, catalogCopy.crafts, catalogCopy.other],
  learn: [catalogCopy.languageExchange, catalogCopy.studyGroup, catalogCopy.codingHackNight, catalogCopy.workshops, catalogCopy.bookClub, catalogCopy.other],
  wellness: [catalogCopy.yoga, catalogCopy.gymSession, catalogCopy.meditation, catalogCopy.groupWalk, catalogCopy.other],
  family: [catalogCopy.playgroundMeetup, catalogCopy.kidsSports, catalogCopy.familyOuting, catalogCopy.other],
  other: [catalogCopy.anythingElse],
}
export const AVATAR_COLORS = ['#d9c7f0', '#c8f24a', '#f6c9d8', '#bfe3e8', '#f2dda6', '#c9d8f5', '#d5ecc9', '#f0cdbb']
export const getCategory = (key: CategoryKey) => CATEGORIES.find(category => category.key === key)!
export const initials = (name: string) => name.trim().split(/\s+/).slice(0, 2).map(part => part[0]).join('').toUpperCase()
export function getAgeFromBirthDate(birthDate: string) {
  if (!birthDate) return null
  const date = new Date(`${birthDate}T12:00:00`)
  if (Number.isNaN(date.getTime())) return null
  const now = new Date()
  return now.getFullYear() - date.getFullYear() - (now.getMonth() < date.getMonth() || (now.getMonth() === date.getMonth() && now.getDate() < date.getDate()) ? 1 : 0)
}
