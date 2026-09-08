import { hostSchemaCopy } from '../../copies/index'
import { z } from 'zod'
import { SUBCATEGORIES } from '../../lib/catalog'
import type { Connect } from '../../lib/types'
import { localToInstant, validTimezone, zonedFields } from './hostTime'
import type { TimeResult } from './hostTime'

export { localTimeCandidates, localToInstant, validTimezone, zonedFields } from './hostTime'

export const STEPS = [
  { name: hostSchemaCopy.category, title: hostSchemaCopy.whatKindOfConnectIsThis, description: hostSchemaCopy.categorySetsTheColourPeopleScanForInThe },
  { name: hostSchemaCopy.subcategory, title: hostSchemaCopy.narrowItDown, description: hostSchemaCopy.pickAsManyAsFitPeopleFilterOnThese },
  { name: hostSchemaCopy.theWords, title: hostSchemaCopy.titleAndDescription, description: hostSchemaCopy.plainAndSpecificBeatsCleverPeopleDecideFromThe },
  { name: hostSchemaCopy.when, title: hostSchemaCopy.dateStartAndEnd, description: hostSchemaCopy.everyConnectHasAnEndTimeSoPeopleKnow },
  { name: hostSchemaCopy.where, title: hostSchemaCopy.locationAndMeetingPoint, description: hostSchemaCopy.aPinGetsPeopleToThePlaceTheMeeting },
  { name: hostSchemaCopy.theRules, title: hostSchemaCopy.spotsVisibilityAndJoining, description: hostSchemaCopy.startWithTheDefaultsThenMakeThisConnectWork },
  { name: hostSchemaCopy.details, title: hostSchemaCopy.skillAgeAndCost, description: hostSchemaCopy.allThreeDefaultToOpenSetThemOnlyWhere },
  { name: hostSchemaCopy.review, title: hostSchemaCopy.checkItOver, description: hostSchemaCopy.reviewYourConnectBeforePublishingYouCanEditAny },
] as const

export const SKILL_OPTIONS = [hostSchemaCopy.openToEveryone, hostSchemaCopy.beginner, hostSchemaCopy.intermediate, hostSchemaCopy.advanced] as const
export const AGE_OPTIONS = [hostSchemaCopy.everyoneWelcome, '18-25', '25-35', '35+', hostSchemaCopy.over18] as const
export const COST_OPTIONS = [
  { value: 'free', label: hostSchemaCopy.free },
  { value: 'split', label: hostSchemaCopy.splitCost },
  { value: 'own', label: hostSchemaCopy.payYourOwn },
  { value: 'ticketed', label: hostSchemaCopy.ticketed },
] as const

export const draftSchema = z.object({
  categoryKey: z.enum(['sports', 'gaming', 'social', 'outdoors', 'arts', 'learn', 'wellness', 'family', 'other']),
  subcategoryNames: z.array(z.string()),
  title: z.string(),
  description: z.string(),
  whatToBring: z.string(),
  otherDescription: z.string(),
  creationMode: z.enum(['now', 'later']),
  startDate: z.string(),
  startTime: z.string(),
  startOccurrence: z.enum(['', 'first', 'second']),
  endDate: z.string(),
  endTime: z.string(),
  endOccurrence: z.enum(['', 'first', 'second']),
  timeZone: z.string(),
  locationType: z.enum(['physical', 'online', 'undecided']),
  meetingNotes: z.string(),
  location: z.object({ label: z.string(), latitude: z.number(), longitude: z.number(), confirmed: z.boolean() }).nullable(),
  publicAreaLabel: z.string(),
  meetingInstructions: z.string(),
  capacity: z.string(),
  unlimited: z.boolean(),
  visibility: z.enum([hostSchemaCopy.everyone, hostSchemaCopy.linkOnly]),
  joinPolicy: z.enum(['instant', 'approval']),
  locationVisibility: z.enum(['public', 'private']),
  isGuestListPrivate: z.boolean(),
  skillLevel: z.string(),
  ageRestriction: z.string(),
  costType: z.enum(['free', 'split', 'own', 'ticketed']),
  costAmount: z.string(),
})

export type HostValues = z.infer<typeof draftSchema>
export const savedDraftSchema = z.object({
  values: draftSchema,
  step: z.number().int().min(0).max(7),
  furthest: z.number().int().min(0).max(7),
})
export type HostingConnect = Connect
export const STEP_FIELDS: (keyof HostValues)[][] = [
  ['categoryKey'],
  ['subcategoryNames'],
  ['title', 'description', 'whatToBring', 'otherDescription'],
  ['creationMode', 'startDate', 'startTime', 'startOccurrence', 'endDate', 'endTime', 'endOccurrence', 'timeZone'],
  ['locationType', 'meetingNotes', 'location', 'publicAreaLabel', 'meetingInstructions'],
  ['capacity', 'unlimited', 'visibility', 'joinPolicy', 'locationVisibility', 'isGuestListPrivate'],
  ['skillLevel', 'ageRestriction', 'costType', 'costAmount'],
  [],
]

export const needsOtherDetails = (values: Pick<HostValues, 'categoryKey' | 'subcategoryNames'>) => values.categoryKey === 'other' || values.subcategoryNames.includes(hostSchemaCopy.other)

export function eventTimes(values: HostValues, existing?: Connect, now = new Date()): { start: TimeResult; end: TimeResult } {
  const preserveSeconds = (selected: TimeResult, original?: string): TimeResult => selected.success && original && Date.parse(selected.iso) === Math.floor(Date.parse(original) / 60000) * 60000
    ? { success: true, iso: original }
    : selected
  return {
    start: values.creationMode === 'now'
      ? { success: true, iso: existing?.creationMode === 'now' ? existing.startsAt : now.toISOString() }
      : preserveSeconds(localToInstant(values.startDate, values.startTime, values.timeZone, values.startOccurrence), existing?.startsAt),
    end: preserveSeconds(localToInstant(values.endDate, values.endTime, values.timeZone, values.endOccurrence), existing?.endsAt),
  }
}

export function createHostSchema(existing?: Connect) {
  return draftSchema.superRefine((values, context) => {
    const issue = (field: keyof HostValues, message: string) => context.addIssue({ code: 'custom', path: [field], message })
    const text = (field: 'title' | 'description' | 'whatToBring' | 'otherDescription' | 'publicAreaLabel' | 'meetingInstructions', minimum: number, maximum: number, label: string) => {
      if (values[field].trim().length < minimum || values[field].length > maximum) issue(field, hostSchemaCopy.mustBeCharacters(String(label), String(minimum ? `${minimum}-${maximum}` : hostSchemaCopy.atMost(String(maximum)))))
    }
    if (!values.subcategoryNames.length) issue('subcategoryNames', hostSchemaCopy.chooseAtLeastOneSubcategory)
    if (new Set(values.subcategoryNames).size !== values.subcategoryNames.length || values.subcategoryNames.some(subcategoryName => !SUBCATEGORIES[values.categoryKey].includes(subcategoryName))) issue('subcategoryNames', hostSchemaCopy.chooseSubcategoriesFromTheSelectedCategory)
    text('title', 5, 100, hostSchemaCopy.theTitle)
    text('description', 0, 3000, hostSchemaCopy.theDescription)
    text('whatToBring', 0, 500, hostSchemaCopy.whatToBring)
    if (needsOtherDetails(values)) text('otherDescription', 3, 500, hostSchemaCopy.theOtherDescription)
    if (values.locationType === 'physical' && values.locationVisibility === 'private') text('publicAreaLabel', 2, 100, hostSchemaCopy.thePublicNeighbourhoodOrArea)
    text('meetingInstructions', 0, 500, hostSchemaCopy.meetingInstructions)
    if (values.meetingNotes.trim().length > 500) issue('meetingNotes', hostSchemaCopy.keepMeetingDetailsTo500CharactersOrFewer)
    if (values.locationType === 'physical') {
      if (!values.location?.confirmed) issue('location', hostSchemaCopy.chooseAVenueAndExplicitlyConfirmItsMapPin)
      if (values.location && (!values.location.label.trim() || Math.abs(values.location.latitude) > 90 || Math.abs(values.location.longitude) > 180)) issue('location', hostSchemaCopy.selectAValidLocationFromTheMapPicker)
    }
    if (!values.unlimited && (!/^\d+$/.test(values.capacity) || !Number.isSafeInteger(Number(values.capacity)) || Number(values.capacity) < Math.max(1, existing?.attendees.length ?? 1))) {
      issue('capacity', hostSchemaCopy.capacityMustBeAWholeNumberOfAtLeast(String(Math.max(1, existing?.attendees.length ?? 1))))
    }
    if (values.locationVisibility === 'private' && values.joinPolicy !== 'approval') issue('joinPolicy', hostSchemaCopy.privateLocationsRequireHostApproval)
    if (!SKILL_OPTIONS.some(option => option === values.skillLevel)) issue('skillLevel', hostSchemaCopy.chooseASkillLevel)
    if (!AGE_OPTIONS.some(option => option === values.ageRestriction) && values.ageRestriction !== hostSchemaCopy.womenOnly) issue('ageRestriction', hostSchemaCopy.chooseAnAgeRange)
    if (values.costType === 'split' || values.costType === 'ticketed') {
      if (!/^\d+(?:\.\d{1,2})?$/.test(values.costAmount) || Number(values.costAmount) <= 0 || Number(values.costAmount) > 1000000) issue('costAmount', hostSchemaCopy.enterAnAmountAbove0AndUpTo1)
    }
    if (!validTimezone(values.timeZone)) issue('timeZone', hostSchemaCopy.chooseAValidTimezone)
    const { start, end } = eventTimes(values, existing)
    if (!start.success) {
      issue(start.kind === 'ambiguous' ? 'startOccurrence' : 'startTime', start.message)
    }
    if (!end.success) {
      issue(end.kind === 'ambiguous' ? 'endOccurrence' : 'endTime', end.message)
    }
    if (start.success && values.creationMode === 'later' && Date.parse(start.iso) <= Date.now()) {
      const unchangedOngoing = existing?.creationMode === 'later' && start.iso === existing.startsAt
      if (!unchangedOngoing) issue('startTime', hostSchemaCopy.aScheduledConnectMustStartInTheFutureChoose)
    }
    if (start.success && end.success && Date.parse(end.iso) <= Date.parse(start.iso)) issue('endTime', hostSchemaCopy.theEndMustBeAfterTheStartUseA)
    if (end.success && Date.parse(end.iso) <= Date.now()) issue('endTime', hostSchemaCopy.theEndMustStillBeInTheFuture)
  })
}

export function defaultHostValues(existing?: HostingConnect): HostValues {
  const timeZone = existing?.timeZone ?? Intl.DateTimeFormat().resolvedOptions().timeZone
  const start = zonedFields(existing ? new Date(existing.startsAt) : new Date(Math.ceil((Date.now() + 3600000) / 60000) * 60000), timeZone)
  const end = zonedFields(existing ? new Date(existing.endsAt) : new Date(Math.ceil((Date.now() + 7200000) / 60000) * 60000), timeZone)
  return {
    categoryKey: existing?.categoryKey ?? 'sports', subcategoryNames: existing?.subcategoryNames ?? [], title: existing?.title ?? '',
    description: existing?.description ?? '', whatToBring: existing?.whatToBring ?? '', otherDescription: existing?.otherDescription ?? '',
    creationMode: existing?.creationMode ?? 'later', startDate: start.date, startTime: start.time, startOccurrence: start.occurrence,
    endDate: end.date, endTime: end.time, endOccurrence: end.occurrence, timeZone,
    locationType: existing?.locationType ?? 'physical', meetingNotes: existing?.meetingNotes ?? '',
    location: existing && existing.latitude !== null && existing.longitude !== null && (!existing.locationType || existing.locationType === 'physical') ? { label: existing.venueName, latitude: existing.latitude, longitude: existing.longitude, confirmed: true } : null,
    publicAreaLabel: existing?.locationVisibility === 'private' ? existing.publicAreaLabel : '', meetingInstructions: existing?.meetingInstructions ?? '',
    capacity: String(existing?.capacity ?? 10), unlimited: existing?.capacity === null,
    visibility: existing?.visibility ?? 'Everyone', joinPolicy: existing?.joinPolicy ?? 'instant',
    locationVisibility: existing?.locationVisibility ?? 'public', isGuestListPrivate: existing?.isGuestListPrivate ?? false,
    skillLevel: existing?.skillLevel ?? hostSchemaCopy.openToEveryone, ageRestriction: existing?.ageRestriction.replace(/[\u2013\u2014]/g, '-') ?? hostSchemaCopy.everyoneWelcome,
    costType: existing?.costType ?? 'free', costAmount: existing?.costAmount ? String(existing.costAmount) : '',
  }
}

export function connectArea(values: Pick<HostValues, 'locationType' | 'locationVisibility' | 'location' | 'publicAreaLabel'>) {
  if (values.locationType === 'online') return hostSchemaCopy.online
  if (values.locationType === 'undecided') return hostSchemaCopy.placeToBeDecided
  return values.locationVisibility === 'private' ? values.publicAreaLabel.trim() : values.location?.label.trim() ?? ''
}

export const joiningExplanation = (privateLocation: boolean, approval: boolean, locationType: Connect['locationType'] = 'physical') => privateLocation
  ? locationType === 'physical'
    ? hostSchemaCopy.hostApprovalIsRequiredOnlyYouAndConfirmedAttendees
    : hostSchemaCopy.hostApprovalIsRequiredOnlyYouAndConfirmedAttendees2
  : locationType === 'online'
    ? approval ? hostSchemaCopy.youApproveEachRequestJoiningDetailsAreSharedWith : hostSchemaCopy.peopleCanJoinInstantlyWhileThereIsSpaceJoining
  : approval
    ? hostSchemaCopy.everyRequestWaitsForYourApprovalYouChooseWho
    : hostSchemaCopy.anyoneEligibleWhoCanSeeThisConnectCanJoin

export function hostCostLabel(values: Pick<HostValues, 'costType' | 'costAmount'>) {
  if (values.costType === 'free') return hostSchemaCopy.free
  if (values.costType === 'own') return hostSchemaCopy.everyonePaysTheirOwnWay
  return values.costAmount ? hostSchemaCopy.iLS(String(values.costAmount), String(values.costType === 'split' ? hostSchemaCopy.totalSplitBetweenEveryone : hostSchemaCopy.perPerson)) : hostSchemaCopy.amountToBeSet
}
