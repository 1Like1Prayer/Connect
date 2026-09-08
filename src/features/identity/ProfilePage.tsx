import { profilePageCopy } from '../../copies/index'
import { useEffect, useRef, useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Link, useParams } from 'react-router'
import { z } from 'zod'
import { Avatar, Badge, Button, CategoryLabel, EmptyState, Field, Input, Modal, Panel } from '../../components/UI'
import { getCategory } from '../../lib/catalog'
import { dayLabel, isEnded } from '../../lib/format'
import { useAppStore } from '../../lib/store'
import type { Connect, Profile } from '../../lib/types'
import { BirthdayField, GenderPicker, InterestPicker, PhotoField, PrivacyFields, PublicDetails, RadiusField, ValidationError } from './IdentityFields'
import { findMember, identitySchema, profileChanges, profileValues } from './identity'
import type { IdentityValues } from './identity'
import styles from './Identity.module.css'

const reportSchema = z.object({
  reason: z.string().min(1, profilePageCopy.chooseAReason).refine(value => Array.of<string>(profilePageCopy.harassment, profilePageCopy.spamOrScam, profilePageCopy.inappropriateContent, profilePageCopy.safetyConcern, profilePageCopy.other).includes(value), profilePageCopy.chooseAListedReason),
  details: z.string().trim().max(1000, profilePageCopy.use1000CharactersOrFewer),
}).refine(values => values.reason !== profilePageCopy.other || values.details.length >= 10, {
  path: ['details'], message: profilePageCopy.addAtLeast10CharactersSoTheReasonIs,
})

function ReportDialog({ member, onClose, onSaved }: { member: Profile; onClose: () => void; onSaved: (message: string) => void }) {
  const report = useAppStore(state => state.report)
  const notify = useAppStore(state => state.notify)
  const form = useForm<z.infer<typeof reportSchema>>({
    resolver: zodResolver(reportSchema), defaultValues: { reason: '', details: '' },
  })
  const { errors } = form.formState
  return <Modal title={profilePageCopy.report(String(member.name))} onClose={onClose}>
    <p className={styles.panelBlurb}>{profilePageCopy.chooseAReasonAndAddAnyDetailsThatHelp}</p>
    <form noValidate className={styles.reportForm} onSubmit={form.handleSubmit(values => {
      report(member.id, `${values.reason}${values.details ? `: ${values.details}` : ''}`)
      onSaved(profilePageCopy.reportSaved)
      notify(profilePageCopy.reportSaved)
      onClose()
    })}>
      <Field label={profilePageCopy.reason} htmlFor="report-reason">
        <select id="report-reason" {...form.register('reason')} aria-invalid={!!errors.reason} aria-describedby="report-reason-error">
          <option value="">{profilePageCopy.chooseAReason2}</option>
          {[profilePageCopy.harassment, profilePageCopy.spamOrScam, profilePageCopy.inappropriateContent, profilePageCopy.safetyConcern, profilePageCopy.other].map(reason => <option key={reason}>{reason}</option>)}
        </select>
        <ValidationError id="report-reason-error" message={errors.reason?.message} />
      </Field>
      <Field label={form.watch(profilePageCopy.reason2) === profilePageCopy.other ? profilePageCopy.whatHappened : profilePageCopy.additionalDetailsOptional} htmlFor="report-details">
        <textarea id="report-details" maxLength={1000} {...form.register('details')} aria-invalid={!!errors.details} aria-describedby="report-details-error" />
        <ValidationError id="report-details-error" message={errors.details?.message} />
      </Field>
      <div className={styles.actions}><Button variant="danger" type="submit" disabled={form.formState.isSubmitting}>{profilePageCopy.saveReport}</Button><Button onClick={onClose}>{profilePageCopy.cancel}</Button></div>
    </form>
  </Modal>
}

function ProfileEditor({ profile, visible }: { profile: Profile; visible: boolean }) {
  const updateProfile = useAppStore(state => state.updateProfile)
  const defaultRadiusKilometers = useAppStore(state => state.defaultRadiusKilometers)
  const setDefaultRadiusKilometers = useAppStore(state => state.setDefaultRadiusKilometers)
  const notify = useAppStore(state => state.notify)
  const [photoBusy, setPhotoBusy] = useState(false)
  const [saved, setSaved] = useState('')
  const form = useForm<IdentityValues>({ resolver: zodResolver(identitySchema), defaultValues: profileValues(profile, defaultRadiusKilometers), mode: 'onTouched' })
  const { errors, isDirty, isSubmitting } = form.formState
  const values = form.watch()
  const savedProfile = useRef(profile)
  const publicEditor = useRef<HTMLDetailsElement>(null)
  useEffect(() => {
    if (savedProfile.current !== profile) {
      savedProfile.current = profile
      form.reset(profileValues(profile, defaultRadiusKilometers))
    }
  }, [profile, defaultRadiusKilometers, form])
  useEffect(() => {
    if (!visible && photoBusy) {
      setPhotoBusy(false)
      setSaved(profilePageCopy.photoLoadingWasCancelledWhenYouOpenedThePublic)
    }
  }, [visible, photoBusy])

  function save(data: IdentityValues) {
    if (photoBusy) return
    const changedEmail = data.email !== profile.email
    const changedPhone = data.phoneNumber !== profile.phoneNumber
    updateProfile({
      ...profileChanges(data),
      shareEmail: changedEmail ? false : data.shareEmail,
      sharePhone: changedPhone || !data.phoneNumber ? false : data.sharePhone,
    })
    setDefaultRadiusKilometers(data.radiusKilometers)
    const message = profilePageCopy.profileSaved
    setSaved(message)
    notify(message)
    form.reset({ ...data, shareEmail: changedEmail ? false : data.shareEmail, sharePhone: changedPhone || !data.phoneNumber ? false : data.sharePhone })
  }

  if (!visible) return null
  return <Panel className={styles.detailsPanel}>
    <div className={styles.sectionHeading}><h2>{profilePageCopy.yourDetails}</h2><span>{profilePageCopy.onlyYouSeeThisPanel}</span></div>
    <p className={styles.panelBlurb}>{profilePageCopy.genderAgeEmailAndPhoneStayOffYourPublic}</p>
    <form noValidate onSubmit={event => {
      if (photoBusy || errors.avatarDataUrl?.type === 'file') { event.preventDefault(); return }
      void form.handleSubmit(save, invalid => {
        if (invalid.name || invalid.biography || invalid.avatarDataUrl || invalid.interests) {
          if (publicEditor.current) publicEditor.current.open = true
          if (invalid.name) form.setFocus('name')
          else if (invalid.biography) form.setFocus('biography')
        }
      })(event)
    }} aria-label={profilePageCopy.editYourProfile} onChange={() => setSaved('')}>
      <div className={styles.editGrid}>
        <Controller name="gender" control={form.control} render={({ field }) => <GenderPicker {...field} inputRef={field.ref}
          onChange={value => {
            field.onChange(value)
            if (value === profilePageCopy.preferNotToSay) form.setValue('shareGender', false, { shouldDirty: true })
          }} error={errors.gender?.message} />} />
        <Controller name="birthDate" control={form.control} render={({ field }) => <BirthdayField {...field} inputRef={field.ref}
          withheld={values.birthDateWithheld} onWithheldChange={withheld => {
            form.setValue('birthDateWithheld', withheld, { shouldDirty: true })
            if (withheld) form.setValue('shareAge', false, { shouldDirty: true })
            void form.trigger(['birthDate', 'birthDateWithheld'])
          }}
          onChange={value => {
            field.onChange(value)
            if (!value) form.setValue('shareAge', false, { shouldDirty: true })
          }} error={errors.birthDate?.message} />} />
        <Field label={profilePageCopy.email} htmlFor="profile-email">
          <Input id="profile-email" type="email" autoComplete="off" maxLength={254}
            {...form.register('email', { onChange: () => form.setValue('shareEmail', false, { shouldDirty: true }) })}
            aria-invalid={!!errors.email} aria-describedby="profile-email-help profile-email-error" />
          <small id="profile-email-help">{profilePageCopy.changingYourEmailResetsItsVisibilityToHidden}</small>
          <ValidationError id="profile-email-error" message={errors.email?.message} />
        </Field>
        <Field label={profilePageCopy.phoneOptional} htmlFor="profile-phone">
          <Input id="profile-phone" type="tel" autoComplete="off" maxLength={30}
            {...form.register('phoneNumber', { onChange: () => form.setValue('sharePhone', false, { shouldDirty: true }) })}
            aria-invalid={!!errors.phoneNumber} aria-describedby="profile-phone-error" />
          <ValidationError id="profile-phone-error" message={errors.phoneNumber?.message} />
        </Field>
        <Field label={profilePageCopy.neighbourhoodOrCityOptional} htmlFor="profile-location">
          <Input id="profile-location" autoComplete="off" maxLength={100} {...form.register('location')} aria-invalid={!!errors.location} aria-describedby="profile-location-error" />
          <ValidationError id="profile-location-error" message={errors.location?.message} />
        </Field>
        <Controller name="radiusKilometers" control={form.control} render={({ field }) => <RadiusField value={field.value} onChange={field.onChange} error={errors.radiusKilometers?.message} />} />
      </div>
      <h3 className={styles.editorSubtitle} id="profile-privacy" tabIndex={-1}>{profilePageCopy.whatOtherPeopleCanSee}</h3>
      <PrivacyFields values={values} onChange={(key, value) => {
        form.setValue(key, value, { shouldDirty: true, shouldValidate: true })
        setSaved('')
      }} />
      <details ref={publicEditor} id="profile-public-editor" className={styles.publicEditor}>
        <summary>{profilePageCopy.editNameBioPhotoAndInterests}</summary>
        <PhotoField compact name={values.name} value={values.avatarDataUrl} error={errors.avatarDataUrl?.message}
          onChange={value => form.setValue('avatarDataUrl', value, { shouldDirty: true, shouldValidate: true })}
          onError={message => message ? form.setError('avatarDataUrl', { type: 'file', message }) : form.clearErrors('avatarDataUrl')} onBusyChange={setPhotoBusy} />
        <div className={styles.editGrid}>
          <Field label={profilePageCopy.fullName} htmlFor="profile-name">
            <Input id="profile-name" maxLength={80} autoComplete="off" {...form.register('name')} aria-invalid={!!errors.name} aria-describedby="profile-name-error" />
            <ValidationError id="profile-name-error" message={errors.name?.message} />
          </Field>
          <Field label={profilePageCopy.username} htmlFor="profile-username">
            <Input id="profile-username" value={profilePageCopy.separator(String(profile.username))} readOnly />
          </Field>
          <div className={styles.fullWidth}>
            <Field label={profilePageCopy.bioOptional} htmlFor="profile-bio">
              <textarea id="profile-bio" maxLength={500} placeholder={profilePageCopy.whatBringsYouHere} {...form.register('biography')}
                aria-invalid={!!errors.biography} aria-describedby="profile-bio-count profile-bio-error" />
              <small id="profile-bio-count">{values.biography.length}{profilePageCopy.text500Characters}</small>
              <ValidationError id="profile-bio-error" message={errors.biography?.message} />
            </Field>
          </div>
        </div>
        <Controller name="interests" control={form.control} render={({ field }) => <InterestPicker {...field} inputRef={field.ref} error={errors.interests?.message} />} />
      </details>
      {Object.keys(errors).length > 0 && <p className={styles.error} role="alert">{profilePageCopy.pleaseCorrectTheHighlightedFieldsBeforeSaving}</p>}
      <div className={styles.saveActions}>
        <Button type="submit" variant="primary" disabled={photoBusy || isSubmitting}>{profilePageCopy.saveChanges}</Button>
        <Button variant="ghost" disabled={photoBusy || !isDirty} onClick={() => {
          form.reset(profileValues(profile, defaultRadiusKilometers))
          setSaved(profilePageCopy.unsavedChangesDiscardedYourSavedProfileIsUnchanged)
        }}>{profilePageCopy.discardChanges}</Button>
        {isDirty && <span className={styles.help}>{profilePageCopy.unsavedChanges}</span>}
      </div>
      {saved && !isDirty && <p className={styles.saved} role="status">{saved}</p>}
    </form>
  </Panel>
}

function ConnectHistory({ title, connects }: { title: string; connects: Connect[] }) {
  return <section>
    <h2 className={styles.connectsHeading}>{title}</h2>
    {connects.length ? <div className={styles.profileConnects}>{connects.map(connect => <Link key={connect.id}
      to={`/connect/${connect.id}`} className={styles.connectCard} style={{ borderLeftColor: getCategory(connect.categoryKey).primaryColor }}>
      <CategoryLabel category={connect.categoryKey} subcategoryName={connect.subcategoryNames[0]} />
      <h3>{connect.title}</h3>
      <p>{connect.publicAreaLabel} {profilePageCopy.middleDotSeparator} {isEnded(connect) ? profilePageCopy.went(String(connect.attendees.length)) : dayLabel(connect.startsAt, connect.timeZone)}</p>
    </Link>)}</div> : <p className={styles.emptyList}>{profilePageCopy.no}{title.toLowerCase()}{profilePageCopy.toShowYet}</p>}
  </section>
}

function ProfileView({ member, own }: { member: Profile; own: boolean }) {
  const connects = useAppStore(state => state.connects)
  const viewer = useAppStore(state => state.profile)
  const blockedUserIds = useAppStore(state => state.blockedUserIds.includes(member.id))
  const blockUser = useAppStore(state => state.blockUser)
  const unblockUser = useAppStore(state => state.unblockUser)
  const notify = useAppStore(state => state.notify)
  const [publicPreview, setPublicPreview] = useState(false)
  const [dialog, setDialog] = useState<'report' | 'block' | null>(null)
  const [feedback, setFeedback] = useState('')
  const otherId = connects.find(connect => connect.hostId !== viewer?.id)?.hostId
  const activity = connects.filter(connect => connect.status === 'published'
    && (connect.hostId === member.id || connect.attendees.some(person => person.id === member.id))
    && ((own && !publicPreview) || (connect.visibility === profilePageCopy.everyone && (connect.hostId === member.id || !connect.isGuestListPrivate))))
  const past = activity.filter(isEnded).sort((firstConnect, secondConnect) => Date.parse(secondConnect.startsAt) - Date.parse(firstConnect.startsAt))
  const upcoming = activity.filter(connect => !isEnded(connect)).sort((firstConnect, secondConnect) => Date.parse(firstConnect.startsAt) - Date.parse(secondConnect.startsAt))
  const stats = [
    { value: member.attendanceRate ? `${member.attendanceRate}%` : profilePageCopy.textSeparator, label: profilePageCopy.attendanceRate },
    { value: member.rating ? member.rating.toFixed(1) : profilePageCopy.textSeparator, label: profilePageCopy.memberRating },
    { value: member.hostedConnectCount, label: profilePageCopy.connectsHosted },
    { value: activity.length, label: profilePageCopy.connectsJoined },
  ]

  function focusEditor(id: string) {
    setPublicPreview(false)
    requestAnimationFrame(() => {
      const publicEditor = document.getElementById('profile-public-editor')
      if (id === 'profile-name' && publicEditor instanceof HTMLDetailsElement) publicEditor.open = true
      const element = document.getElementById(id)
      element?.focus()
      element?.scrollIntoView({ block: 'center', behavior: 'auto' })
    })
  }

  return <div className={styles.profile}>
    <aside className={styles.sidebar}>
      <div className={styles.viewSwitch}>
        {viewer && <Link to="/profile" aria-current={own ? 'page' : undefined}>{profilePageCopy.yourProfile}</Link>}
        {otherId && <Link to={`/profile/${otherId}`} aria-current={!own ? 'page' : undefined}>{profilePageCopy.someoneElseS}</Link>}
      </div>
      {member.avatarDataUrl ? <Avatar name={member.name} size={132} src={member.avatarDataUrl} />
        : <div className={styles.photoPlaceholder} style={{ width: 132, height: 132 }} role="img" aria-label={profilePageCopy.noProfilePhotoFor(String(member.name))}>{profilePageCopy.profile}<br />{profilePageCopy.photo}</div>}
      <div className={styles.profileName}><h1>{member.name}</h1></div>
      <p className={styles.handle}>{profilePageCopy.usernamePrefix}{member.username}{member.location ? profilePageCopy.separator5(String(member.location)) : ''}</p>
      <PublicDetails profile={member} />
      <p className={styles.biography}>{member.biography || profilePageCopy.noBioYet}</p>
      <div className={styles.profileInterests}>{member.interests.map(category => <span key={category}><CategoryLabel category={category} /></span>)}</div>
      {own ? <div className={styles.actions}>
        <Button variant="primary" onClick={() => focusEditor('profile-name')}>{profilePageCopy.editProfile}</Button>
        <Button onClick={() => focusEditor('profile-privacy')}>{profilePageCopy.privacySettings}</Button>
        <Button variant="ghost" onClick={() => setPublicPreview(value => !value)}>{publicPreview ? profilePageCopy.backToEditing : profilePageCopy.previewPublicProfile}</Button>
      </div> : <div className={styles.actions}>
        <Button variant="primary" onClick={() => document.getElementById('member-connects')?.scrollIntoView({ block: 'start' })}>{profilePageCopy.viewConnects}</Button>
        <Button disabled={!viewer} onClick={() => setDialog('report')}>{profilePageCopy.report2}</Button>
        <Button variant="ghost" disabled={!viewer} onClick={() => {
          if (blockedUserIds) {
            unblockUser(member.id)
            const message = profilePageCopy.memberUnblockedPreviousAttendanceAndRequestsHaveNotBeen
            setFeedback(message)
            notify(message)
          } else setDialog('block')
        }}>{blockedUserIds ? profilePageCopy.unblockMember : profilePageCopy.blockMember}</Button>
      </div>}
    </aside>
    <div className={styles.profileMain}>
      <dl className={styles.stats}>{stats.map(stat => <div key={stat.label} className={styles.stat}><dt>{stat.label}</dt><dd>{stat.value}</dd></div>)}</dl>
      <p className={styles.statsNote}>{profilePageCopy.countsReflectVisibleConnectActivity}</p>
      {feedback && <p role="status" className={styles.saved}>{feedback}</p>}
      {blockedUserIds && !own && <Panel className={styles.blocked}><h2>{profilePageCopy.memberBlocked}</h2><p className={styles.panelBlurb}>{profilePageCopy.sharedAttendancePendingRequestsAndPrivateLocationAccessWere}</p></Panel>}
      {own && publicPreview && <section className={styles.publicPreview}>
        <h2>{profilePageCopy.publicProfilePreview}</h2><p className={styles.panelBlurb}>{profilePageCopy.thisIsYourSavedProfileAsAnotherMemberWould}</p>
        <Button onClick={() => setPublicPreview(false)}>{profilePageCopy.backToEditing}</Button>
      </section>}
      {own && <ProfileEditor profile={member} visible={!publicPreview} />}
      <h2 className={styles.badgesHeading}>{profilePageCopy.badges}</h2>
      <div className={styles.badges}>
        {member.hostedConnectCount > 0 && member.attendanceRate >= 95 && <Badge>{profilePageCopy.starSymbol}{profilePageCopy.reliableHost}</Badge>}
        {member.hostedConnectCount > 0 && <Badge>{profilePageCopy.diamondSymbol} {member.hostedConnectCount}{profilePageCopy.hosted}</Badge>}
        {!member.hostedConnectCount && <Badge>{profilePageCopy.newToConnect}</Badge>}
      </div>
      <div id="member-connects">
        <ConnectHistory title={profilePageCopy.pastConnects} connects={past} />
        {!own && <ConnectHistory title={profilePageCopy.upcomingConnects} connects={upcoming} />}
      </div>
    </div>
    {dialog === 'report' && <ReportDialog member={member} onClose={() => setDialog(null)} onSaved={setFeedback} />}
    {dialog === 'block' && <Modal title={profilePageCopy.block(String(member.name))} onClose={() => setDialog(null)}>
      <p>{profilePageCopy.thisRemovesYouFromThisMemberSConnectsAnd}</p>
      <p className={styles.help}>{profilePageCopy.youCanUnblockLaterButAttendanceAndRequestsWill}</p>
      <div className={styles.saveActions}><Button variant="danger" onClick={() => {
        const result = blockUser(member.id)
        const message = result.success ? profilePageCopy.memberBlocked2 : result.message
        setFeedback(message)
        notify(message)
        if (result.success) setDialog(null)
      }}>{profilePageCopy.blockMember}</Button><Button onClick={() => setDialog(null)}>{profilePageCopy.cancel}</Button></div>
    </Modal>}
  </div>
}

export function ProfilePage() {
  const { id } = useParams<{ id?: string }>()
  const profile = useAppStore(state => state.profile)
  const connects = useAppStore(state => state.connects)
  const own = !id || profile?.id === id
  const member = own ? profile : findMember(id, connects)
  if (!member) return <div className="pageNarrow"><EmptyState title={own ? profilePageCopy.noProfileYet : profilePageCopy.memberNotFound}
    action={<Link to="/discover">{profilePageCopy.backToDiscover}</Link>}>
    {own ? profilePageCopy.createAProfileOrSignInToSeeYour : profilePageCopy.thisProfileIsUnavailable}
  </EmptyState></div>
  return <ProfileView key={`${member.id}-${own}`} member={member} own={own} />
}
