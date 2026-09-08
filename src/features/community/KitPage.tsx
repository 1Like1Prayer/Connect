import { kitPageCopy } from '../../copies/index'
import { useEffect, useId, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Link } from 'react-router'
import { Avatar, Badge, Button, CategoryLabel, Field, Input, Panel, Toggle } from '../../components/UI'
import { CATEGORIES, getCategory } from '../../lib/catalog'
import { costLabel, dayLabel, distanceLabel, isEnded, timeLabel } from '../../lib/format'
import { useAppStore } from '../../lib/store'
import { CategoryGlyph, PageLink, useCategoryColor } from './shared'
import styles from './Community.module.css'

const exampleSchema = z.object({
  name: z.string().trim().min(2, kitPageCopy.enterANameWithAtLeastTwoCharacters).max(50, kitPageCopy.use50CharactersOrFewer),
  email: z.email(kitPageCopy.enterAValidEmailAddress),
})
type ExampleValues = z.infer<typeof exampleSchema>

function KitInputs() {
  const id = useId()
  const [saved, setSaved] = useState(false)
  const { register, handleSubmit, trigger, formState: { errors } } = useForm<ExampleValues>({
    resolver: zodResolver(exampleSchema),
    mode: 'onBlur',
    defaultValues: { name: '', email: kitPageCopy.notAnEmail },
  })
  useEffect(() => { void trigger('email') }, [trigger])
  return <form className={styles.kitForm} onSubmit={handleSubmit(() => setSaved(true))} onChange={() => setSaved(false)} noValidate>
    <div className={styles.inputGrid}>
      <Field htmlFor={`${id}-name`} label={kitPageCopy.name} hint={kitPageCopy.required}>
        <Input id={`${id}-name`} placeholder={kitPageCopy.yourName} autoComplete="off" {...register('name')} aria-invalid={!!errors.name} aria-describedby={errors.name ? `${id}-name-error` : undefined} />
        <span id={`${id}-name-error`} className={`${styles.formError} ${styles.fieldFeedback}`} aria-live="polite">{errors.name?.message}</span>
      </Field>
      <Field htmlFor={`${id}-focus`} label={kitPageCopy.focusedField}>
        <Input id={`${id}-focus`} className={styles.focusExample} placeholder={kitPageCopy.readOnly} readOnly aria-label={kitPageCopy.readOnlyField} />
      </Field>
      <Field htmlFor={`${id}-email`} label={kitPageCopy.emailAddress}>
        <Input id={`${id}-email`} type="email" autoComplete="off" {...register('email')} aria-invalid={!!errors.email} aria-describedby={errors.email ? `${id}-email-error` : undefined} />
        <span id={`${id}-email-error`} className={`${styles.formError} ${styles.fieldFeedback}`} aria-live="polite">{errors.email?.message}</span>
      </Field>
      <Field htmlFor={`${id}-disabled`} label={kitPageCopy.disabledField}>
        <Input id={`${id}-disabled`} value="Unavailable" disabled />
      </Field>
    </div>
    <div className="row"><Button type="submit">{kitPageCopy.validate}</Button>{saved && <span className={styles.savedMessage} role="status">{kitPageCopy.looksGood}</span>}</div>
  </form>
}

function PaletteChip({ categoryKey }: { categoryKey: typeof CATEGORIES[number]['key'] }) {
  const category = getCategory(categoryKey)
  const color = useCategoryColor(categoryKey)
  return <Link to={`/discover?category=${category.key}`} className={styles.paletteChip} style={{ borderColor: color }}><span aria-hidden="true" style={{ color }}>{category.glyph}</span>{category.name}</Link>
}

function KitExample() {
  const connects = useAppStore(applicationState => applicationState.connects)
  const example = connects.find(connect => connect.categoryKey === 'sports' && connect.status === 'published' && !isEnded(connect)) ?? connects.find(connect => connect.status === 'published')
  const color = useCategoryColor(example?.categoryKey ?? 'sports')
  if (!example) return <Panel><h2>{kitPageCopy.noConnectsAvailable}</h2><p className="muted">{kitPageCopy.findYourNextPlanOnDiscover}</p><PageLink to="/discover">{kitPageCopy.browseConnects}</PageLink></Panel>
  const available = example.capacity === null ? null : Math.max(0, example.capacity - example.attendees.length)
  const attendance = kitPageCopy.going2(String(example.attendees.length), String(available === null ? kitPageCopy.openCapacity : kitPageCopy.left(String(available), String(available === 1 ? 'spot' : 'spots'))))
  return <div className={styles.kitColumns}>
    <Panel className={styles.kitPanel}>
      <h2>{kitPageCopy.connectCardAvatarStackFormInputs}</h2>
      <article className={styles.kitConnectCard} style={{ borderLeftColor: color }}>
        <CategoryLabel category={example.categoryKey} subcategoryName={example.subcategoryNames.join(', ')} />
        <h3><Link to={`/connect/${example.id}`}>{example.title}</Link></h3>
        <div className={styles.kitCardMetadata}><strong>{distanceLabel(example)}</strong><span>{dayLabel(example.startsAt, example.timeZone)}{kitPageCopy.commaSeparatorWithSpace}{timeLabel(example.startsAt, example.timeZone)}</span><span>{available === null ? kitPageCopy.openCapacity2 : kitPageCopy.spotsLeft(String(available))}</span><Badge>{costLabel(example)}</Badge></div>
      </article>
      <div className={styles.avatarExample}><div className={styles.avatarStack}>{example.attendees.slice(0, 4).map(person => <Avatar key={person.id} name={person.name} color={person.color} size={30} />)}</div><span>{attendance}</span></div>
      <KitInputs />
    </Panel>
    <Panel className={styles.kitPanel}>
      <h2>{kitPageCopy.joinPanel}</h2>
      <div className={styles.joinExample}>
        <h3>{dayLabel(example.startsAt, example.timeZone)}{kitPageCopy.commaSeparatorWithSpace}{timeLabel(example.startsAt, example.timeZone)}</h3>
        <p>{kitPageCopy.ends}{timeLabel(example.endsAt, example.timeZone)} {kitPageCopy.middleDotSeparator} {distanceLabel(example)}</p>
        <div className={styles.capacityTrack} role="meter" aria-label={kitPageCopy.confirmedSpots} aria-valuenow={example.attendees.length} aria-valuemin={0} aria-valuemax={example.capacity ?? Math.max(example.attendees.length, 1)} aria-valuetext={attendance}><div style={{ width: example.capacity ? `${Math.min(100, example.attendees.length / example.capacity * 100)}%` : '100%', background: color }} /></div>
        <p className={styles.joinAttendance}>{attendance}</p>
        <PageLink to={`/connect/${example.id}`} className={styles.darkLink}>{kitPageCopy.openConnect}</PageLink>
      </div>
    </Panel>
  </div>
}

export function KitPage() {
  const [buttonMessage, setButtonMessage] = useState('')
  const [toggleOn, setToggleOn] = useState(true)
  const [toggleOff, setToggleOff] = useState(false)
  const pressButton = (name: string) => setButtonMessage(kitPageCopy.buttonPressed(String(name)))
  return <div className={`page ${styles.kitPage}`}>
    <h1>{kitPageCopy.componentSheet}</h1>
    <p className={styles.introduction}>{kitPageCopy.theColoursTypographyAndComponentsThatBringConnectTogether}</p>
    <div className={styles.kitSections}>
      <Panel className={styles.kitPanel}>
        <h2>{kitPageCopy.buttons}</h2>
        <div className={styles.buttonExamples}>
          <Button variant="dark" onClick={() => pressButton(kitPageCopy.primary)}>{kitPageCopy.primary}</Button>
          <Button variant="primary" onClick={() => pressButton(kitPageCopy.action)}>{kitPageCopy.action}</Button>
          <Button onClick={() => pressButton(kitPageCopy.secondary)}>{kitPageCopy.secondary}</Button>
          <Button variant="ghost" className={styles.quietExample} onClick={() => pressButton(kitPageCopy.quiet)}>{kitPageCopy.quiet}</Button>
          <Button disabled>{kitPageCopy.disabled}</Button>
          <Button disabled aria-label={kitPageCopy.loading}><span className={styles.spinner} aria-hidden="true" />{kitPageCopy.loading}</Button>
        </div>
        <p className={styles.buttonFeedback} role="status">{buttonMessage}</p>
      </Panel>
      <Panel className={styles.kitPanel}>
        <h2>{kitPageCopy.categoryPillsAndMapPins}</h2>
        <div className={styles.palettePills}>{CATEGORIES.map(category => <PaletteChip key={category.key} categoryKey={category.key} />)}</div>
        <div className={styles.mapPinExamples}>{CATEGORIES.map(category => <span key={category.key} role="img" aria-label={kitPageCopy.mapPin(String(category.name))}><CategoryGlyph category={category.key} small /></span>)}<span className={styles.clusterPin} role="img" aria-label={kitPageCopy.clusterOf7Connects}><span>{kitPageCopy.text7}</span></span></div>
        <div className={styles.swatchGrid}>{CATEGORIES.map(category => <div key={category.key} className={styles.swatch}><span className={styles.swatchPair} aria-hidden="true"><span style={{ background: category.primaryColor }} /><span style={{ background: category.alternateColor }} /></span><strong>{category.name}</strong><span>{category.primaryColor}{kitPageCopy.textSeparator}{category.alternateColor}</span></div>)}</div>
      </Panel>
      <KitExample />
      <div className={styles.kitEqualColumns}>
        <Panel className={styles.kitPanel}>
          <h2>{kitPageCopy.typography}</h2>
          <div className={styles.typeSamples}><p className={styles.typeDisplay}>{kitPageCopy.goodPlansStartNearby}</p><p className={styles.typeHeading}>{kitPageCopy.aLittleMoreTogether}</p><p className={styles.typeTitle}>{kitPageCopy.fiveASideShortTwoPlayers}</p><p className={styles.typeBody}>{kitPageCopy.findYourPeoplePickAPublicSpotAndMake}</p><p className={styles.typeMeta}>{kitPageCopy.today1930}{kitPageCopy.middleDotSeparator}{kitPageCopy.parkHaYarkon}</p><p className={styles.typeCaption}>{kitPageCopy.captionAndSupportingInformation}</p></div>
        </Panel>
        <Panel className={styles.kitPanel}>
          <h2>{kitPageCopy.badgesAndToggles}</h2>
          <div className={styles.badgeExamples}><Badge>{kitPageCopy.published}</Badge><Badge active>{kitPageCopy.text3RequestsWaiting}</Badge><Badge>{kitPageCopy.going}</Badge><Badge>{kitPageCopy.approvalPending}</Badge><Badge>{kitPageCopy.waitlisted}</Badge><Badge>{kitPageCopy.cancelled}</Badge><Badge color="var(--success-color)">{kitPageCopy.free}</Badge><Badge>{kitPageCopy.split}{kitPageCopy.textSeparator2}{kitPageCopy.text20}</Badge><Badge>{kitPageCopy.ticketed}{kitPageCopy.textSeparator2}{kitPageCopy.text50}</Badge><Badge>{kitPageCopy.payYourOwn}</Badge></div>
          <Toggle checked={toggleOn} onChange={setToggleOn} label={kitPageCopy.onByDefault} />
          <Toggle checked={toggleOff} onChange={setToggleOff} label={kitPageCopy.optionalSetting} />
          <Toggle checked={false} onChange={() => {}} disabled label={kitPageCopy.disabledSwitch} />
        </Panel>
      </div>
      <Panel className={styles.kitPanel}>
        <h2>{kitPageCopy.topNavigation}</h2>
        <nav className={styles.navigationExample} aria-label={kitPageCopy.connectNavigation}><Link to="/" className={styles.exampleBrand}><span aria-hidden="true" />{kitPageCopy.connect}</Link><Link to="/discover" className={styles.exampleActive}>{kitPageCopy.discover}</Link><Link to="/mine">{kitPageCopy.myConnects}</Link><Link to="/chats">{kitPageCopy.chats}</Link><PageLink to="/host" primary>{kitPageCopy.hostAConnect}</PageLink></nav>
      </Panel>
    </div>
  </div>
}
