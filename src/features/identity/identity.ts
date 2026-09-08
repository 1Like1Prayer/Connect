import { identityCopy } from '../../copies/index'
import { z } from 'zod'
import { CATEGORIES } from '../../lib/catalog'
import { DEMO_PROFILE, PERSONS } from '../../lib/fixtures'
import type { Connect, Profile } from '../../lib/types'

export const MAX_AVATAR_BYTES = 1024 * 1024
export const GENDERS = [identityCopy.preferNotToSay, identityCopy.woman, identityCopy.man] as const

export function todayDate() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
}

function validBirthDate(value: string) {
  if (!value) return true
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const date = new Date(`${value}T12:00:00`)
  const [year, month, day] = value.split('-').map(Number)
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day
    && year >= new Date().getFullYear() - 120 && value <= todayDate()
}

export const identitySchema = z.object({
  name: z.string().trim().min(2, identityCopy.enterANameWithAtLeast2Characters).max(80, identityCopy.use80CharactersOrFewer),
  username: z.string().trim().min(3, identityCopy.useAtLeast3Characters).max(24, identityCopy.use24CharactersOrFewer)
    .regex(/^[a-zA-Z0-9_]+$/, identityCopy.useLettersNumbersAndUnderscoresOnly),
  email: z.string().trim().max(254, identityCopy.use254CharactersOrFewer).email(identityCopy.enterAValidEmailAddress),
  phoneNumber: z.string().trim().refine(value => !value || (/^\+?[\d ()-]+$/.test(value) && /^\d{7,15}$/.test(value.replace(/\D/g, ''))),
    identityCopy.enter7To15DigitsWithAnOptionalSpaces),
  gender: z.enum(GENDERS),
  birthDate: z.string(),
  birthDateWithheld: z.boolean(),
  biography: z.string().trim().max(500, identityCopy.keepYourBioTo500Characters),
  location: z.string().trim().max(100, identityCopy.use100CharactersOrFewer),
  interests: z.array(z.enum(CATEGORIES.map(category => category.key))).max(9)
    .refine(values => new Set(values).size === values.length, identityCopy.chooseEachInterestOnlyOnce),
  shareEmail: z.boolean(),
  sharePhone: z.boolean(),
  shareGender: z.boolean(),
  shareAge: z.boolean(),
  avatarDataUrl: z.string().max(Math.ceil(MAX_AVATAR_BYTES / 3) * 4 + 32, identityCopy.chooseAnImageNoLargerThan1MB)
    .regex(/^data:image\/(?:png|jpeg|gif|webp);base64,[A-Za-z0-9+/]+={0,2}$/, identityCopy.chooseAPNGJPEGGIFOrWebPImage).optional(),
  radiusKilometers: z.number().int().min(1).max(100),
}).refine(values => values.birthDateWithheld || validBirthDate(values.birthDate), {
  path: ['birthDate'], message: identityCopy.enterARealDateWithinTheLast120Years,
})

export const signupSchema = identitySchema.safeExtend({
  password: z.string().min(8, identityCopy.useAtLeast8Characters).max(128, identityCopy.use128CharactersOrFewer)
    .regex(/\d/, identityCopy.includeAtLeastOneNumber),
  interests: identitySchema.shape.interests.refine(values => values.length >= 2, identityCopy.pickAtLeastTwoInterestsToContinue),
})

export type IdentityValues = z.infer<typeof identitySchema>
export type SignupValues = z.infer<typeof signupSchema>

export const EMPTY_IDENTITY: Omit<IdentityValues, 'radiusKilometers'> = {
  name: '', username: '', email: '', phoneNumber: '', gender: identityCopy.preferNotToSay,
  birthDate: '', birthDateWithheld: false, biography: '', location: '', interests: [], avatarDataUrl: undefined,
  shareEmail: false, sharePhone: false, shareGender: false, shareAge: false,
}

export function profileValues(profile: Profile, radiusKilometers: number): IdentityValues {
  return {
    name: profile.name, username: profile.username, email: profile.email, phoneNumber: profile.phoneNumber,
    gender: GENDERS.find(gender => gender === profile.gender) ?? identityCopy.preferNotToSay,
    birthDate: profile.birthDate, birthDateWithheld: profile.birthDateWithheld ?? false,
    biography: profile.biography, location: profile.location,
    interests: [...profile.interests], avatarDataUrl: profile.avatarDataUrl,
    shareEmail: profile.shareEmail, sharePhone: profile.sharePhone,
    shareGender: profile.shareGender, shareAge: profile.shareAge && !profile.birthDateWithheld, radiusKilometers,
  }
}

// Profile allowlist excludes passwords, coordinates and the separate radius preference.
export function profileChanges(values: Omit<IdentityValues, 'radiusKilometers'>): Pick<Profile,
  'name' | 'username' | 'email' | 'phoneNumber' | 'gender' | 'birthDate' | 'birthDateWithheld' | 'biography' | 'location' | 'interests'
  | 'avatarDataUrl' | 'shareEmail' | 'sharePhone' | 'shareGender' | 'shareAge'> {
  return {
    name: values.name, username: values.username, email: values.email, phoneNumber: values.phoneNumber,
    gender: values.gender, birthDate: values.birthDate, birthDateWithheld: values.birthDateWithheld,
    biography: values.biography, location: values.location,
    interests: values.interests, avatarDataUrl: values.avatarDataUrl,
    shareEmail: values.shareEmail && !!values.email,
    sharePhone: values.sharePhone && !!values.phoneNumber,
    shareGender: values.shareGender && values.gender !== identityCopy.preferNotToSay,
    shareAge: values.shareAge && !!values.birthDate && !values.birthDateWithheld,
  }
}

export function safeReturnTo(value: string | null, origin: string): string | null {
  if (!value || !value.startsWith('/') || value.startsWith('//') || /[\\\u0000-\u0020\u007f]/.test(value)) return null
  try {
    const decoded = decodeURIComponent(value)
    if (decoded.startsWith('//') || /[\\\u0000-\u001f\u007f]/.test(decoded)) return null
    const url = new URL(value, origin)
    if (url.origin !== origin || /^\/(?:signup|login)(?:\/|$)/i.test(decodeURIComponent(url.pathname))) return null
    return `${url.pathname}${url.search}${url.hash}`
  } catch {
    return null
  }
}

export async function readAvatar(file: File): Promise<string> {
  if (!file.size || file.size > MAX_AVATAR_BYTES) throw new Error(identityCopy.chooseAnImageNoLargerThan1MB)
  const bytes = new Uint8Array(await file.slice(0, 12).arrayBuffer())
  const startsWith = (signature: number[]) => signature.every((byte, index) => bytes[index] === byte)
  const mime = startsWith([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]) ? 'image/png'
    : startsWith([0xff, 0xd8, 0xff]) ? 'image/jpeg'
    : startsWith([0x47, 0x49, 0x46, 0x38]) && [0x37, 0x39].includes(bytes[4]) && bytes[5] === 0x61 ? 'image/gif'
    : startsWith([0x52, 0x49, 0x46, 0x46]) && [0x57, 0x45, 0x42, 0x50].every((byte, index) => bytes[index + 8] === byte) ? 'image/webp' : null
  if (!mime || file.type !== mime) throw new Error(identityCopy.theFileContentsMustMatchAPNGJPEGGIF)
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error(identityCopy.theImageCouldNotBeReadPleaseChooseIt))
    reader.onabort = () => reject(new Error(identityCopy.imageLoadingWasInterruptedPleaseTryAgain))
    reader.onload = () => typeof reader.result === 'string' ? resolve(reader.result) : reject(new Error(identityCopy.theImageCouldNotBeRead))
    reader.readAsDataURL(file)
  })
  await new Promise<void>((resolve, reject) => {
    const image = new Image()
    image.onload = () => image.naturalWidth && image.naturalHeight ? resolve() : reject(new Error(identityCopy.thisImageIsEmptyChooseAnotherImage))
    image.onerror = () => reject(new Error(identityCopy.thisImageIsDamagedOrUnsupportedChooseAnotherImage))
    image.src = dataUrl
  })
  return dataUrl
}

export function findMember(id: string, connects: Connect[]): Profile | null {
  if (id === DEMO_PROFILE.id) return { ...DEMO_PROFILE }
  const hostedConnectCount = connects.filter(connect => connect.hostId === id)
  const host = hostedConnectCount[0]
  const person = PERSONS.find(item => item.id === id)
    ?? connects.flatMap(connect => [...connect.attendees, ...connect.joinRequests, ...connect.waitlist]).find(item => item.id === id)
  if (!host && !person) return null
  return {
    ...profileChanges(EMPTY_IDENTITY), id, name: host?.hostName ?? person!.name, username: id,
    location: host?.publicAreaLabel ?? '', interests: [...new Set(hostedConnectCount.map(connect => connect.categoryKey))],
    biography: host ? identityCopy.bringingPeopleTogetherOneConnectAtATime : identityCopy.aMemberOfTheConnectCommunity,
    isVerified: host?.isHostVerified ?? false, rating: host?.hostRating ?? 0,
    hostedConnectCount: host?.hostedConnectCount ?? 0, attendanceRate: host?.hostAttendanceRate ?? 0,
  }
}
