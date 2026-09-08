import { apiCopy } from '../copies/index'
import { z } from 'zod'

const configuredOrigin = import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, '') ?? ''
export const mapsConfigured = Boolean(configuredOrigin && import.meta.env.VITE_AZURE_MAPS_CLIENT_ID)
export const apiConfigured = Boolean(configuredOrigin)
export async function apiGet<T>(path: string, schema: z.ZodType<T>, signal?: AbortSignal): Promise<T> {
  if (!configuredOrigin) throw new Error(apiCopy.theMapServiceIsCurrentlyUnavailablePleaseTryAgain)
  const response = await fetch(`${configuredOrigin}/api/v1${path}`, { signal, cache: 'no-store', headers: { Accept: 'application/json' } })
  if (!response.ok) throw new Error(response.status === 429 ? apiCopy.tooManyMapRequestsPleaseWaitAndRetry : apiCopy.mapServiceUnavailablePleaseRetry(String(response.status)))
  const parsed = schema.safeParse(await response.json())
  if (!parsed.success) throw new Error(apiCopy.theMapServiceReturnedAnUnexpectedResponsePleaseTry)
  return parsed.data
}
export const mapTokenSchema = z.object({ token: z.string().min(1) })
export const locationSchema = z.object({ label: z.string(), lat: z.number().min(-90).max(90), lng: z.number().min(-180).max(180) })
export const locationResultsSchema = z.object({ results: z.array(locationSchema) })
