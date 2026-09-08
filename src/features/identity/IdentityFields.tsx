import { identityFieldsCopy } from '../../copies/index'
import { useEffect, useId, useRef, useState } from 'react'
import type { Ref } from 'react'
import { Avatar, Badge, Button, CategoryLabel, Field, Toggle } from '../../components/UI'
import { getAgeFromBirthDate, CATEGORIES } from '../../lib/catalog'
import type { CategoryKey, Profile } from '../../lib/types'
import { GENDERS, readAvatar, todayDate } from './identity'
import type { IdentityValues } from './identity'
import styles from './Identity.module.css'

export function ValidationError({ id, message }: { id: string; message?: string }) {
  return message ? <span id={id} className={styles.error} role="alert">{message}</span> : null
}

export function GenderPicker({ value, onChange, onBlur, inputRef, error }: {
  value: string; onChange: (value: string) => void; onBlur?: () => void; inputRef?: Ref<HTMLInputElement>; error?: string
}) {
  const id = useId()
  return <fieldset className={styles.fieldset} aria-describedby={error ? `${id}-error` : undefined}>
    <legend>{identityFieldsCopy.gender}</legend>
    <div className={styles.chips}>
      {GENDERS.map((gender, index) => <label key={gender} className={`${styles.choice} ${value === gender ? styles.selected : ''}`}>
        <input ref={index === 0 ? inputRef : undefined} type="radio" name={id} value={gender}
          checked={value === gender} onChange={() => onChange(gender)} onBlur={onBlur} />
        {gender}
      </label>)}
    </div>
    {error && <p id={`${id}-error`} className={styles.error} role="alert">{error}</p>}
  </fieldset>
}

export function BirthdayField({ value, withheld, onChange, onWithheldChange, onBlur, inputRef, error }: {
  value: string; withheld: boolean; onChange: (value: string) => void; onWithheldChange: (withheld: boolean) => void
  onBlur?: () => void; inputRef?: Ref<HTMLInputElement>; error?: string
}) {
  const id = useId()
  const age = withheld ? null : getAgeFromBirthDate(value)
  const validationError = withheld ? undefined : error
  return <div>
    <Field label={identityFieldsCopy.dateOfBirthOptional} htmlFor={id}>
      <div className={styles.birthdayRow}>
        <input id={id} ref={inputRef} type="date" value={value} disabled={withheld} onChange={event => onChange(event.target.value)}
          onBlur={onBlur} max={todayDate()} min={`${new Date().getFullYear() - 120}-01-01`}
          aria-invalid={!!validationError} aria-describedby={`${id}-help${validationError ? ` ${id}-error` : ''}`} />
        <span className={styles.age}>{withheld ? identityFieldsCopy.notShared : value && !validationError && age !== null ? identityFieldsCopy.formatAge(String(age)) : identityFieldsCopy.notProvided}</span>
      </div>
      <Button className={styles.optionalButton} aria-pressed={withheld} onClick={() => onWithheldChange(!withheld)}>{identityFieldsCopy.preferNotToSay}</Button>
      <small id={`${id}-help`}>{identityFieldsCopy.onlyYourAgeNeverYourBirthDateCanAppear}</small>
      {validationError && <span id={`${id}-error`} className={styles.error} role="alert">{validationError}</span>}
    </Field>
    {(withheld || !value) && <p className={styles.caveat}>{withheld
      ? identityFieldsCopy.yourAgeIsNotSharedOrUsedForEligibility
      : identityFieldsCopy.withoutADateOfBirthYouCannotJoinAge}</p>}
  </div>
}

const VISIBILITY_ROWS = [
  { key: 'shareGender', label: identityFieldsCopy.showMyGenderOnMyProfile, hint: undefined },
  { key: 'shareAge', label: identityFieldsCopy.showMyAgeOnMyProfile, hint: identityFieldsCopy.ageVisibilityHint },
  { key: 'shareEmail', label: identityFieldsCopy.showMyEmailOnMyProfile, hint: identityFieldsCopy.emailVisibilityHint },
  { key: 'sharePhone', label: identityFieldsCopy.showMyPhoneNumberOnMyProfile, hint: identityFieldsCopy.phoneVisibilityHint },
] as const
export type VisibilityKey = typeof VISIBILITY_ROWS[number]['key']

export function PrivacyFields({ values, onChange }: { values: IdentityValues; onChange: (key: VisibilityKey, value: boolean) => void }) {
  return <div className={styles.privacyFields}>
    {VISIBILITY_ROWS.map(row => {
      const withheld = row.key === 'shareAge' && values.birthDateWithheld
      const unavailable = row.key === 'shareAge' ? withheld || !values.birthDate
        : row.key === 'sharePhone' ? !values.phoneNumber.trim()
        : row.key === 'shareEmail' ? !values.email.trim()
        : !values.gender || values.gender === identityFieldsCopy.preferNotToSay
      return <div key={row.key}>
        <Toggle checked={!unavailable && values[row.key]} onChange={value => onChange(row.key, value)}
          disabled={unavailable} label={row.label} hint={row.hint} />
        <span className={styles.visibilityStatus}>{withheld ? identityFieldsCopy.withheldHidden : unavailable ? identityFieldsCopy.notProvidedHidden : values[row.key] ? identityFieldsCopy.visibleOnYourPublicProfile : identityFieldsCopy.hiddenFromYourPublicProfile}</span>
      </div>
    })}
  </div>
}

export function InterestPicker({ value, onChange, error, inputRef, onBlur }: {
  value: CategoryKey[]; onChange: (value: CategoryKey[]) => void; error?: string; inputRef?: Ref<HTMLInputElement>; onBlur?: () => void
}) {
  const id = useId()
  return <fieldset className={styles.fieldset} aria-describedby={`${id}-hint${error ? ` ${id}-error` : ''}`}>
    <legend>{identityFieldsCopy.interests}</legend>
    <div className={styles.chips}>{CATEGORIES.map((category, index) => {
      const selected = value.includes(category.key)
      return <label key={category.key} className={`${styles.interest} ${selected ? styles.interestSelected : ''}`}
        style={{ borderColor: selected ? category.primaryColor : undefined }}>
        <input ref={index === 0 ? inputRef : undefined} type="checkbox" checked={selected} onBlur={onBlur}
          onChange={() => onChange(selected ? value.filter(key => key !== category.key) : [...value, category.key])} />
        <CategoryLabel category={category.key} />
        {selected && <span aria-hidden="true">{identityFieldsCopy.checkmarkSymbol}</span>}
      </label>
    })}</div>
    <p id={`${id}-hint`} className={styles.help}>{value.length}{identityFieldsCopy.selected}{identityFieldsCopy.middleDotSeparator}{identityFieldsCopy.pickAtLeastTwoForAUsefulFeed}</p>
    {error && <p id={`${id}-error`} className={styles.error} role="alert">{error}</p>}
  </fieldset>
}

export function PhotoField({ name, value, onChange, error, onError, onBusyChange, compact = false }: {
  name: string; value?: string; onChange: (value: string | undefined) => void; error?: string
  onError: (message: string | null) => void; onBusyChange: (busy: boolean) => void; compact?: boolean
}) {
  const id = useId()
  const input = useRef<HTMLInputElement>(null)
  const version = useRef(0)
  const [busy, setBusy] = useState(false)
  useEffect(() => () => { version.current += 1 }, [])
  async function choose(file: File) {
    const current = ++version.current
    setBusy(true)
    onBusyChange(true)
    onError(null)
    try {
      const image = await readAvatar(file)
      if (current === version.current) onChange(image)
    } catch (failure) {
      if (current === version.current) onError(failure instanceof Error ? failure.message : identityFieldsCopy.theImageCouldNotBeLoadedPleaseTryAnother)
    } finally {
      if (current === version.current) {
        setBusy(false)
        onBusyChange(false)
      }
    }
  }
  return <div className={`${styles.photoField} ${compact ? styles.compactPhoto : ''}`}>
    {value ? <Avatar name={name || 'Profile photo'} size={compact ? 96 : 150} src={value} />
      : <div className={styles.photoPlaceholder} style={{ width: compact ? 96 : 150, height: compact ? 96 : 150 }} aria-hidden="true">{identityFieldsCopy.profile}<br />{identityFieldsCopy.photo}</div>}
    <div className={styles.photoControls}>
      <label className="srOnly" htmlFor={id}>{identityFieldsCopy.uploadAProfilePhoto}</label>
      <input id={id} className="srOnly" ref={input} type="file" tabIndex={-1} accept="image/png,image/jpeg,image/gif,image/webp"
        aria-describedby={`${id}-help${error ? ` ${id}-error` : ''}`} aria-invalid={!!error} disabled={busy}
        onChange={event => {
          const file = event.target.files?.[0]
          event.target.value = ''
          if (file) void choose(file)
        }} />
      <div className={styles.actions}>
        <Button variant="primary" disabled={busy} onClick={() => input.current?.click()}>{busy ? identityFieldsCopy.loadingPhoto : value ? identityFieldsCopy.changePhoto : identityFieldsCopy.uploadAPhoto}</Button>
        {(value || error) && <Button disabled={busy} onClick={() => { onChange(undefined); onError(null) }}>{identityFieldsCopy.removePhoto}</Button>}
      </div>
      <p id={`${id}-help`} className={styles.help}>{identityFieldsCopy.optionalChooseAPNGJPEGGIFOrWebPImage}</p>
      {error && <p id={`${id}-error`} className={styles.error} role="alert">{error}</p>}
      {busy && <span className="srOnly" role="status">{identityFieldsCopy.readingAndCheckingImageContents}</span>}
    </div>
  </div>
}

export function RadiusField({ value, onChange, error }: { value: number; onChange: (value: number) => void; error?: string }) {
  const id = useId()
  return <div className={styles.radius}>
    <div className={styles.sectionHeading}><label htmlFor={id}>{identityFieldsCopy.defaultRadius}</label><strong>{value}{identityFieldsCopy.kilometersSuffix}</strong></div>
    <input id={id} type="range" min="1" max="100" value={value} onChange={event => onChange(Number(event.target.value))}
      aria-describedby={`${id}-help`} aria-invalid={!!error} />
    <div className={styles.rangeLabels}><span>{identityFieldsCopy.text1Km}</span><span>{identityFieldsCopy.walkable}</span><span>{identityFieldsCopy.text100Km}</span></div>
    <p id={`${id}-help`} className={styles.help}>{identityFieldsCopy.savedWithSignupOrProfileChangesDiscoverUsesThis}</p>
    {error && <p className={styles.error} role="alert">{error}</p>}
  </div>
}

export function PublicDetails({ profile }: { profile: Pick<Profile, 'gender' | 'birthDate' | 'birthDateWithheld' | 'email' | 'phoneNumber' | VisibilityKey> }) {
  const age = profile.shareAge && !profile.birthDateWithheld ? getAgeFromBirthDate(profile.birthDate) : null
  const shown = [
    profile.shareGender && profile.gender && profile.gender !== identityFieldsCopy.preferNotToSay ? profile.gender : null,
    profile.shareAge && age !== null ? identityFieldsCopy.formatAge(String(age)) : null,
    profile.shareEmail && profile.email ? profile.email : null,
    profile.sharePhone && profile.phoneNumber ? profile.phoneNumber : null,
  ].filter((value): value is string => !!value)
  return <div className={styles.publicDetails}>{shown.length ? shown.map((value, index) => <Badge key={index}>{value}</Badge>)
    : <p className={styles.help}>{identityFieldsCopy.genderAgeAndContactDetailsAreHidden}</p>}</div>
}
