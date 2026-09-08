import { signupPageCopy } from '../../copies/index'
import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { Controller, useForm } from 'react-hook-form'
import type { FieldErrors, FieldPath } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { Avatar, Button, CategoryLabel, Field, Input, Panel } from '../../components/UI'
import { useAppStore } from '../../lib/store'
import type { Profile } from '../../lib/types'
import { BirthdayField, GenderPicker, InterestPicker, PhotoField, PrivacyFields, PublicDetails, RadiusField, ValidationError } from './IdentityFields'
import { EMPTY_IDENTITY, profileChanges, safeReturnTo, signupSchema } from './identity'
import type { SignupValues } from './identity'
import styles from './Identity.module.css'

const STEPS = [
  { kicker: signupPageCopy.whoYouAre, title: signupPageCopy.whatShouldWeCallYou, blurb: signupPageCopy.yourNameShowsOnConnectsYouHostAndJoin },
  { kicker: signupPageCopy.account, title: signupPageCopy.emailAndAPassword, blurb: signupPageCopy.addYourEmailAndChooseAPassword },
  { kicker: signupPageCopy.aboutYou, title: signupPageCopy.aCoupleOfDetails, blurb: signupPageCopy.youChooseWhichDetailsToShareOnYourProfile },
  { kicker: signupPageCopy.photo, title: signupPageCopy.addAProfilePhoto, blurb: signupPageCopy.optionalButItHelpsHostsRecogniseYouAtThe },
  { kicker: signupPageCopy.interests, title: signupPageCopy.whatDoYouWantToDo, blurb: signupPageCopy.pickTheCategoriesYouCareAboutTheyShapeYour },
  { kicker: signupPageCopy.whereYouAre, title: signupPageCopy.whereShouldWeLook, blurb: signupPageCopy.addYourNeighbourhoodOrCityOrLeaveItBlank },
  { kicker: signupPageCopy.done, title: signupPageCopy.readyToGo, blurb: signupPageCopy.reviewYourPublicProfileThenFinishToSaveYour },
]
const STEP_FIELDS: FieldPath<SignupValues>[][] = [
  ['name', 'username'], ['email', 'password'],
  ['gender', 'birthDate', 'birthDateWithheld', 'phoneNumber', 'shareGender', 'shareAge', 'shareEmail', 'sharePhone'],
  ['avatarDataUrl'], ['interests'], ['location', 'radiusKilometers'],
]

export function SignupPage() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const pendingPath = safeReturnTo(params.get('returnTo'), window.location.origin)
  const completeSignup = useAppStore(state => state.completeSignup)
  const defaultRadiusKilometers = useAppStore(state => state.defaultRadiusKilometers)
  const setDefaultRadiusKilometers = useAppStore(state => state.setDefaultRadiusKilometers)
  const notify = useAppStore(state => state.notify)
  const [step, setStep] = useState(0)
  const [photoBusy, setPhotoBusy] = useState(false)
  const [locationBusy, setLocationBusy] = useState(false)
  const [locationMessage, setLocationMessage] = useState('')
  const [locationFailed, setLocationFailed] = useState(false)
  const heading = useRef<HTMLHeadingElement>(null)
  const moving = useRef(false)
  const completed = useRef(false)
  const locationRequest = useRef(0)
  const form = useForm<SignupValues>({
    resolver: zodResolver(signupSchema), defaultValues: { ...EMPTY_IDENTITY, radiusKilometers: defaultRadiusKilometers, password: '' },
    // Blur-time error removal can move Continue between pointer-down and click.
    mode: 'onChange', shouldUnregister: false,
  })
  const values = form.watch()
  const { errors, isSubmitting } = form.formState
  const current = STEPS[step]
  useEffect(() => {
    heading.current?.focus()
    locationRequest.current += 1
    setLocationBusy(false)
    return () => { locationRequest.current += 1 }
  }, [step])

  function revealInvalidStep(invalid: FieldErrors<SignupValues>) {
    const first = STEP_FIELDS.findIndex(fields => fields.some(field => field in invalid))
    if (first !== -1) setStep(first)
    form.setError('root', { message: signupPageCopy.pleaseCorrectTheHighlightedFieldsBeforeFinishing })
  }

  function finish(data: SignupValues, destination = '/discover') {
    if (completed.current) return
    const profile: Profile = {
      ...profileChanges(data), id: `preview-${crypto.randomUUID()}`,
      isVerified: false, rating: 0, hostedConnectCount: 0, attendanceRate: 0,
    }
    form.resetField('password', { defaultValue: '' })
    completeSignup(profile)
    setDefaultRadiusKilometers(data.radiusKilometers)
    completed.current = true
    notify(signupPageCopy.profileSaved)
    navigate(pendingPath ?? destination, { replace: true })
  }

  async function advance(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (moving.current || photoBusy || isSubmitting) return
    if (step === 3 && errors.avatarDataUrl?.type === 'file') return
    if (step === 6) {
      await form.handleSubmit(data => finish(data), revealInvalidStep)()
      return
    }
    moving.current = true
    try {
      if (await form.trigger(STEP_FIELDS[step], { shouldFocus: true })) {
        form.clearErrors('root')
        setStep(step + 1)
      }
    } finally {
      moving.current = false
    }
  }

  function requestLocation() {
    const request = ++locationRequest.current
    if (!navigator.geolocation) {
      setLocationFailed(true)
      setLocationMessage(signupPageCopy.thisBrowserDoesNotSupportLocationAccessEnterA)
      return
    }
    setLocationBusy(true)
    setLocationMessage(signupPageCopy.waitingForBrowserPermissionYouCanUseTheManual)
    navigator.geolocation.getCurrentPosition(() => {
      if (request !== locationRequest.current) return
      setLocationBusy(false)
      setLocationFailed(false)
      setLocationMessage(signupPageCopy.locationPermissionGrantedAddANeighbourhoodOrCityBelow)
    }, failure => {
      if (request !== locationRequest.current) return
      setLocationBusy(false)
      setLocationFailed(true)
      setLocationMessage(failure.code === 1
        ? signupPageCopy.locationPermissionWasDeniedYouCanAllowItIn
        : signupPageCopy.yourLocationCouldNotBeRetrievedRetryEnterA)
    }, { enableHighAccuracy: false, timeout: 10000, maximumAge: 0 })
  }

  return <div className={styles.signup}>
    <div className={styles.progressHeading}><span>{signupPageCopy.makeYourselfAtHome}</span><span>{signupPageCopy.step}{step + 1}{signupPageCopy.of7}</span></div>
    <ol className={styles.progress} aria-label={signupPageCopy.signupProgress}>{STEPS.map((item, index) => <li key={item.kicker}
      className={index <= step ? styles.reached : undefined} aria-current={index === step ? 'step' : undefined}>
      <span className="srOnly">{signupPageCopy.step}{index + 1}{signupPageCopy.colonSeparatorWithSpace}{item.kicker}{index < step ? signupPageCopy.completed : ''}</span>
    </li>)}</ol>
    <div className={styles.signupGrid}>
      <div className={styles.signupMain}>
        <div className={styles.kicker}>{signupPageCopy.step}{step + 1} {signupPageCopy.middleDotSeparator} {current.kicker}</div>
        <h1 className={styles.stepTitle} ref={heading} tabIndex={-1}>{current.title}</h1>
        <p className={styles.blurb}>{current.blurb}</p>
        <form noValidate onSubmit={advance} aria-label={signupPageCopy.signupStep(String(step + 1))}>
          {step === 0 && <div className={styles.nameFields}>
            <Field label={signupPageCopy.fullName} htmlFor="signup-name">
              <Input id="signup-name" placeholder={signupPageCopy.noaBerkovich} autoComplete="off" maxLength={80} {...form.register('name')}
                aria-invalid={!!errors.name} aria-describedby="signup-name-error" />
              <ValidationError id="signup-name-error" message={errors.name?.message} />
            </Field>
            <Field label={signupPageCopy.username} htmlFor="signup-username">
              <div className={styles.username}><span aria-hidden="true">{signupPageCopy.usernamePrefix}</span>
                <Input id="signup-username" className={styles.usernameInput} placeholder={signupPageCopy.noab} autoCapitalize="none" autoComplete="off" spellCheck={false}
                  maxLength={24} {...form.register('username')} aria-invalid={!!errors.username} aria-describedby="signup-username-help signup-username-error" />
              </div>
              <small id="signup-username-help">{signupPageCopy.text324LettersNumbersOrUnderscores}</small>
              <ValidationError id="signup-username-error" message={errors.username?.message} />
            </Field>
          </div>}
          {step === 1 && <div className={styles.narrowFields}>
            <Field label={signupPageCopy.email} htmlFor="signup-email">
              <Input id="signup-email" type="email" placeholder={signupPageCopy.youExampleCom} autoComplete="off" maxLength={254}
                {...form.register('email', { onChange: () => form.setValue('shareEmail', false) })}
                aria-invalid={!!errors.email} aria-describedby="signup-email-error signup-email-help" />
              <small id="signup-email-help">{signupPageCopy.yourEmailIsHiddenFromYourPublicProfileBy}</small>
              <ValidationError id="signup-email-error" message={errors.email?.message} />
            </Field>
            <Field label={signupPageCopy.password} htmlFor="signup-password">
              <Input id="signup-password" type="password" placeholder={signupPageCopy.atLeast8Characters} autoComplete="new-password"
                maxLength={128} {...form.register('password')} aria-invalid={!!errors.password} aria-describedby="signup-password-help signup-password-error" />
              <small id="signup-password-help">{signupPageCopy.use8CharactersOrMoreWithANumber}</small>
              <ValidationError id="signup-password-error" message={errors.password?.message} />
            </Field>
          </div>}
          {step === 2 && <div className={styles.aboutFields}>
            <Controller name="gender" control={form.control} render={({ field }) => <GenderPicker {...field} inputRef={field.ref}
              onChange={value => {
                field.onChange(value)
                if (value === signupPageCopy.preferNotToSay) form.setValue('shareGender', false)
              }} error={errors.gender?.message} />} />
            <Controller name="birthDate" control={form.control} render={({ field }) => <BirthdayField {...field} inputRef={field.ref}
              withheld={values.birthDateWithheld} onWithheldChange={withheld => {
                form.setValue('birthDateWithheld', withheld, { shouldDirty: true })
                if (withheld) form.setValue('shareAge', false, { shouldDirty: true })
                void form.trigger(['birthDate', 'birthDateWithheld'])
              }}
              onChange={value => {
                field.onChange(value)
                if (!value) form.setValue('shareAge', false)
              }} error={errors.birthDate?.message} />} />
            <Field label={signupPageCopy.phoneOptional} htmlFor="signup-phone">
              <Input id="signup-phone" type="tel" autoComplete="off" placeholder={signupPageCopy.phoneNumber} maxLength={30}
                {...form.register('phoneNumber', { onChange: () => form.setValue('sharePhone', false) })}
                aria-invalid={!!errors.phoneNumber} aria-describedby="signup-phone-error" />
              <ValidationError id="signup-phone-error" message={errors.phoneNumber?.message} />
            </Field>
            <div className={styles.privacyBox}><PrivacyFields values={values} onChange={(key, value) => form.setValue(key, value, { shouldDirty: true })} /></div>
          </div>}
          {step === 3 &&
            <PhotoField name={values.name} value={values.avatarDataUrl} error={errors.avatarDataUrl?.message}
              onChange={value => form.setValue('avatarDataUrl', value, { shouldDirty: true, shouldValidate: true })}
              onError={message => message ? form.setError('avatarDataUrl', { type: 'file', message }) : form.clearErrors('avatarDataUrl')} onBusyChange={setPhotoBusy} />
          }
          {step === 4 && <Controller name="interests" control={form.control} render={({ field }) => <InterestPicker {...field} inputRef={field.ref} error={errors.interests?.message} />} />}
          {step === 5 && <div className={styles.narrowFields}>
            <Button className={styles.locationButton} variant="primary" disabled={locationBusy} onClick={requestLocation}>
              {locationBusy ? signupPageCopy.waitingForPermission : locationFailed ? signupPageCopy.retryLocationAccess : signupPageCopy.allowLocationAccess}
            </Button>
            <p className={styles.help}>{signupPageCopy.youCanAlsoEnterANeighbourhoodOrCityBelow}</p>
            {locationMessage && <p role="status" className={locationFailed ? styles.caveat : styles.help}>{locationMessage}</p>}
            <div className={styles.divider}>{signupPageCopy.orTypeIt}</div>
            <Field label={signupPageCopy.neighbourhoodOrCityOptional} htmlFor="signup-location">
              <Input id="signup-location" placeholder={signupPageCopy.neighbourhoodOrCity} autoComplete="off" maxLength={100} {...form.register('location')}
                aria-invalid={!!errors.location} aria-describedby="signup-location-error" />
              <ValidationError id="signup-location-error" message={errors.location?.message} />
            </Field>
            <Controller name="radiusKilometers" control={form.control} render={({ field }) => <RadiusField value={field.value} onChange={field.onChange} error={errors.radiusKilometers?.message} />} />
          </div>}
          {step === 6 && <>
            <section className={styles.done} aria-label={signupPageCopy.finishSignup}>
              <h2>{signupPageCopy.youReReady}{values.name.trim().split(/\s+/)[0]}{signupPageCopy.sentenceEnding}</h2>
              <p>{values.interests.length}{signupPageCopy.interests3}{values.location.trim() ? `, ${values.location.trim()}` : signupPageCopy.noLocationNeeded}{signupPageCopy.yourProfileIsReadyToSave}</p>
              <div className={styles.actions}>
                <Button type="submit" variant="dark" disabled={isSubmitting}>{pendingPath ? signupPageCopy.finishAndContinue : signupPageCopy.startBrowsing}</Button>
                {!pendingPath && <Button disabled={isSubmitting} onClick={() => void form.handleSubmit(data => finish(data, '/host'), revealInvalidStep)()}>{signupPageCopy.hostAConnect}</Button>}
              </div>
            </section>
            <Panel className={styles.summary}>
              <h3>{signupPageCopy.publicProfilePreview}</h3>
              <div className={styles.summaryHeader}><Avatar name={values.name} src={values.avatarDataUrl} size={58} />
                <div><h2>{values.name.trim()}</h2><p>{signupPageCopy.usernamePrefix}{values.username.trim()}{values.location.trim() ? signupPageCopy.separator5(String(values.location.trim())) : ''}</p></div>
              </div>
              <PublicDetails profile={profileChanges(values)} />
              <div className={styles.chips}>{values.interests.map(category => <CategoryLabel key={category} category={category} />)}</div>
              <p className={styles.help}>{signupPageCopy.hiddenDetailsAreNotShownOnYourPublicProfile}</p>
            </Panel>
          </>}
          {errors.root?.message && <p className={styles.error} role="alert">{errors.root.message}</p>}
          <div className={styles.navigation}>
            {step > 0 ? <Button variant="ghost" disabled={photoBusy || isSubmitting} onClick={() => { form.clearErrors('root'); setStep(step - 1) }}>{signupPageCopy.back}</Button>
              : <Link to={pendingPath ?? '/'}>{signupPageCopy.back}</Link>}
            {step < 6 && <Button type="submit" variant="dark" disabled={photoBusy || isSubmitting}>{step === 5 ? signupPageCopy.reviewProfile : signupPageCopy.continue}</Button>}
            {step === 3 && <Button className={styles.skipButton} variant="ghost" disabled={photoBusy} onClick={() => {
              form.setValue('avatarDataUrl', undefined)
              form.clearErrors('avatarDataUrl')
              setStep(4)
            }}>{signupPageCopy.skipForNow}</Button>}
          </div>
        </form>
      </div>
    </div>
  </div>
}
