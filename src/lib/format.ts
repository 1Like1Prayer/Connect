import { formatCopy } from '../copies/index'
import type { Connect } from './types'

export function dayLabel(value: string, timeZone?: string) {
  const date = new Date(value)
  const today = new Date()
  const tomorrow = new Date()
  tomorrow.setDate(today.getDate() + 1)
  const key = (currentDate: Date) => currentDate.toLocaleDateString('en-CA', { timeZone: timeZone })
  if (key(date) === key(today)) return formatCopy.today
  if (key(date) === key(tomorrow)) return formatCopy.tomorrow
  return date.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', timeZone: timeZone })
}
export const timeLabel = (value: string, timeZone?: string) => new Date(value).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: timeZone })
export function durationLabel(connect: Connect) {
  const minutes = Math.round((Date.parse(connect.endsAt) - Date.parse(connect.startsAt)) / 60000)
  return `${Math.floor(minutes / 60) ? formatCopy.formatHours(String(Math.floor(minutes / 60))) : ''}${minutes % 60 ? formatCopy.formatMinutes(String(minutes % 60)) : ''}`.trim()
}
export function costLabel(connect: Connect) {
  return connect.costType === 'free' ? formatCopy.free : connect.costType === 'own' ? formatCopy.payYourOwn : formatCopy.formatCost(String(connect.costType === 'split' ? formatCopy.split : formatCopy.ticketed), String(connect.costType === 'split' ? Math.ceil(connect.costAmount / Math.max(1, connect.attendees.length)) : connect.costAmount))
}
export function spotsLabel(connect: Connect) {
  if (connect.capacity === null) return formatCopy.attendanceCountLabel(String(connect.attendees.length))
  const spots = Math.max(0, connect.capacity - connect.attendees.length)
  return spots === 0 ? formatCopy.fullJoinWaitlist : formatCopy.remainingSpotsLabel(String(spots), String(connect.capacity))
}
export const isEnded = (connect: Connect) => Date.parse(connect.endsAt) <= Date.now()
export const distanceLabel = (connect: Connect) => connect.locationType === 'online' ? formatCopy.online : connect.locationType === 'undecided' ? formatCopy.placeToBeDecided : connect.distanceKilometers !== null ? formatCopy.formatDistanceKilometers(String(connect.distanceKilometers)) : formatCopy.distanceUnavailable
export const hasMapPoint = (connect: Connect): connect is Connect & { latitude: number; longitude: number } => (!connect.locationType || connect.locationType === 'physical') && connect.latitude !== null && connect.longitude !== null
export const isSoon = (connect: Connect) => Date.parse(connect.startsAt) > Date.now() && Date.parse(connect.startsAt) - Date.now() <= 4 * 3600000
export function startsIn(connect: Connect) {
  const minutes = Math.ceil((Date.parse(connect.startsAt) - Date.now()) / 60000)
  return minutes <= 0 ? formatCopy.happeningNow : minutes < 60 ? formatCopy.startsInMinutes(String(minutes)) : formatCopy.startsInHours(String(Math.round(minutes / 60)))
}
export function getDistanceKilometers(latitude: number, longitude: number, targetLatitude: number, targetLongitude: number) {
  const radians = (value: number) => value * Math.PI / 180
  const latitudeDifference = radians(targetLatitude - latitude), longitudeDifference = radians(targetLongitude - longitude)
  const haversineCoefficient = Math.sin(latitudeDifference / 2) ** 2 + Math.cos(radians(latitude)) * Math.cos(radians(targetLatitude)) * Math.sin(longitudeDifference / 2) ** 2
  return Math.round(6371 * 2 * Math.atan2(Math.sqrt(haversineCoefficient), Math.sqrt(1 - haversineCoefficient)) * 10) / 10
}
