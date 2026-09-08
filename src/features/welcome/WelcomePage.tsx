import { welcomePageCopy } from '../../copies/index'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button, Field, ImagePlaceholder, Input, Modal } from '../../components/UI'
import styles from './WelcomePage.module.css'

const loginSchema = z.object({ email: z.email(welcomePageCopy.enterAValidEmailAddress), password: z.string().min(8, welcomePageCopy.useAtLeast8Characters) })
const resetSchema = z.object({ email: z.email(welcomePageCopy.enterAValidEmailAddress) })
export function WelcomePage() {
  const navigate = useNavigate()
  const [reset, setReset] = useState(false), [provider, setProvider] = useState('')
  const { register, handleSubmit, setError, formState: { errors } } = useForm({ resolver: zodResolver(loginSchema), defaultValues: { email: '', password: '' } })
  const resetForm = useForm({ resolver: zodResolver(resetSchema), defaultValues: { email: '' } })
  const signIn = () => setError('root', { message: welcomePageCopy.weCouldnTSignYouInPleaseTryAgain })
  return <>
    <div className={styles.hero}>
      <section className={styles.introduction}>
        <h1>{welcomePageCopy.easyPlansWithTheFriendsYouHaveNotMet}</h1>
        <p className={styles.lead}>{welcomePageCopy.itSTheGroupChatYouWereNeverAdded}</p>
        <div className={styles.actions}><Button variant="dark" onClick={() => navigate('/discover')}>{welcomePageCopy.browseAsGuest}</Button><Button variant="primary" onClick={() => navigate('/signup')}>{welcomePageCopy.signUp}</Button><span>{welcomePageCopy.noAccountNeededToLookAround}</span></div>
        <div className={styles.steps}>
          {[
            [welcomePageCopy.findOneNearby, welcomePageCopy.sortedByDistanceAndStartTimeSoTheClosest],
            [welcomePageCopy.joinAConnect, welcomePageCopy.oneButtonAndYouAreExpectedSomewhereOnTuesday],
            [welcomePageCopy.hostAConnect, welcomePageCopy.pickACategorySetATimeAndAPublic],
          ].map(([title, text], index) => <div key={title}><span className={styles.stepNumber}>{index + 1}</span><div><h3>{title}</h3><p>{text}</p></div></div>)}
        </div>
        <section className={styles.safety}><h3>{welcomePageCopy.meetingStrangersSensibly}</h3><div><p><b>{welcomePageCopy.memberProfiles}</b>{welcomePageCopy.getToKnowThePeopleYouReMeeting}</p><p><b>{welcomePageCopy.reliabilityScore}</b>{welcomePageCopy.attendanceRateIsPublic}</p><p><b>{welcomePageCopy.publicMeetingPoints}</b>{welcomePageCopy.theDefaultWhenYouHost}</p><p><b>{welcomePageCopy.reportAndBlock}</b>{welcomePageCopy.onEveryProfileAndConnect}</p></div></section>
        <div className={styles.facts}><span><b>{welcomePageCopy.text2Min}</b>{welcomePageCopy.toHostAConnect}</span><span><b>{welcomePageCopy.openByDefault}</b>{welcomePageCopy.anyoneNearbyCanJoin}</span></div>
        <p className={styles.footnote}>{welcomePageCopy.guestsCanBrowseAndOpenAnyConnectYouLl}</p>
      </section>
      <section className={styles.board} aria-label={welcomePageCopy.communityNoticeBoardAndLogin}>
        <div className={`${styles.note} ${styles.soccer}`}><ImagePlaceholder label={welcomePageCopy.soccerPhoto} /><small>{welcomePageCopy.circleSymbol}{welcomePageCopy.football}</small><b>{welcomePageCopy.fiveASideShortTwoPlayers}</b><span>{welcomePageCopy.parkHaYarkonTonight1930}</span></div>
        <div className={`${styles.note} ${styles.bar}`}><ImagePlaceholder label={welcomePageCopy.peopleAtABar} /><small>{welcomePageCopy.diamondSymbol}{welcomePageCopy.barCrawl}</small><b>{welcomePageCopy.thursdayFourStopsRothschild}</b></div>
        <div className={`${styles.note} ${styles.catan}`}><ImagePlaceholder label={welcomePageCopy.boardGameNightPhoto} /><small>{welcomePageCopy.squareSymbol}{welcomePageCopy.boardGames}</small><b>{welcomePageCopy.catanTableLookingForAFourth}</b><span>{welcomePageCopy.florentinTonight20001Seat}</span></div>
        <div className={`${styles.note} ${styles.console}`}><ImagePlaceholder label={welcomePageCopy.consoleGamingPhoto} /><small>{welcomePageCopy.squareSymbol}{welcomePageCopy.console}</small><b>{welcomePageCopy.marioKartOnTheCouch4Controllers}</b></div>
        <div className={`${styles.note} ${styles.basketball}`}><ImagePlaceholder label={welcomePageCopy.basketballPhoto} /><small>{welcomePageCopy.circleSymbol}{welcomePageCopy.basketball}</small><b>{welcomePageCopy.text3On3UntilItGetsDark}</b></div>
        <div className={`${styles.note} ${styles.computerGaming}`}><ImagePlaceholder label={welcomePageCopy.computerGamingPhotoLabel} /><small>{welcomePageCopy.squareSymbol}{welcomePageCopy.personalComputerLabel}</small><b>{welcomePageCopy.lANNightBringYourOwnRig}</b></div>
        <div className={styles.sticky}><b>{welcomePageCopy.yourNextPlanIsCloserThanYouThink}</b><span>{welcomePageCopy.findAConnectNearbyAndMakeItHappen}</span></div>
        <div className={styles.login} id="login">
          <h2>{welcomePageCopy.welcomeBack}</h2><p>{welcomePageCopy.somebodyNearbyIsTwoPlayersShortRightNow}</p>
          <form onSubmit={handleSubmit(signIn)} noValidate>
            <Field label={welcomePageCopy.email} htmlFor="login-email" error={errors.email?.message}><Input id="login-email" type="email" autoComplete="email" placeholder={welcomePageCopy.youExampleCom} {...register('email')} aria-invalid={!!errors.email} /></Field>
            <div className={styles.passwordLabel}><label htmlFor="login-password">{welcomePageCopy.password}</label><button type="button" onClick={() => setReset(true)}>{welcomePageCopy.forgotPassword}</button></div>
            <Input id="login-password" type="password" autoComplete="current-password" placeholder={welcomePageCopy.atLeast8Characters} {...register('password')} aria-invalid={!!errors.password} />
            {errors.password && <p className={styles.error} role="alert">{errors.password.message}</p>}
            {errors.root && <p className={styles.error} role="alert">{errors.root.message}</p>}
            <Button variant="dark" type="submit" className={styles.loginButton}>{welcomePageCopy.logIn}</Button>
          </form>
          <div className={styles.or}>{welcomePageCopy.or}</div><div className={styles.providers}><Button onClick={() => setProvider(welcomePageCopy.google)}><span className={styles.google}>{welcomePageCopy.g}</span>{welcomePageCopy.google2}</Button><Button onClick={() => setProvider(welcomePageCopy.apple)}>{welcomePageCopy.apple}</Button></div>
          <div className={styles.loginFooter}><span>{welcomePageCopy.newHere}<Link to="/signup">{welcomePageCopy.signUp}</Link></span><Button variant="ghost" onClick={() => navigate('/discover')}>{welcomePageCopy.browseAsGuest}</Button></div>
        </div>
      </section>
    </div>
    {reset && <Modal title={welcomePageCopy.resetYourPassword} onClose={() => setReset(false)}><p className="muted">{welcomePageCopy.enterTheEmailAddressAssociatedWithYourAccount}</p><form noValidate onSubmit={resetForm.handleSubmit(() => resetForm.setError('root', { message: welcomePageCopy.passwordRecoveryIsUnavailableRightNowPleaseTryAgain }))}><Field label={welcomePageCopy.emailAddress} htmlFor="reset-email" error={resetForm.formState.errors.email?.message}><Input id="reset-email" type="email" {...resetForm.register('email')} /></Field>{resetForm.formState.errors.root && <p className={styles.error} role="alert">{resetForm.formState.errors.root.message}</p>}<Button type="submit" variant="primary">{welcomePageCopy.resetPassword}</Button></form></Modal>}
    {provider && <Modal title={welcomePageCopy.continueWith(String(provider))} onClose={() => setProvider('')}><p>{provider}{welcomePageCopy.signInIsCurrentlyUnavailablePleaseTryAgainLater}</p><Button onClick={() => setProvider('')}>{welcomePageCopy.close}</Button></Modal>}
  </>
}
