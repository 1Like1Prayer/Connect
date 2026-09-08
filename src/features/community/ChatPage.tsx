import { chatPageCopy } from '../../copies/index'
import { useEffect, useId, useRef } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Link, useParams } from 'react-router'
import { Avatar, Badge, Button, EmptyState, Input } from '../../components/UI'
import { AVATAR_COLORS } from '../../lib/catalog'
import { dayLabel, isEnded, timeLabel } from '../../lib/format'
import { getAttendance, useAppStore } from '../../lib/store'
import type { Connect, Message, Profile } from '../../lib/types'
import { placeDetails, placeLabel } from './place'
import { CategoryGlyph, PageLink } from './shared'
import styles from './Community.module.css'

const messageSchema = z.object({
  text: z.string().trim().min(1, chatPageCopy.writeAMessageBeforeSending).max(2000, chatPageCopy.use2000CharactersOrFewer),
})
type MessageValues = z.infer<typeof messageSchema>

function MessageComposer({ connectId }: { connectId: string }) {
  const id = useId()
  const { register, handleSubmit, reset, setError, watch, formState: { errors, isSubmitting } } = useForm<MessageValues>({
    resolver: zodResolver(messageSchema),
    defaultValues: { text: '' },
  })
  const draft = watch('text')
  const submit = handleSubmit(values => {
    const result = useAppStore.getState().sendMessage(connectId, values.text)
    if (result.success) reset({ text: '' })
    else setError('root', { message: result.message })
  })
  return <div className={styles.composerArea}>
    <form className={styles.composer} onSubmit={submit} noValidate>
      <label className={styles.visuallyHidden} htmlFor={id}>{chatPageCopy.messageTheGroup}</label>
      <Input
        id={id}
        className={styles.messageInput}
        {...register('text')}
        maxLength={2000}
        placeholder={chatPageCopy.messageTheGroup}
        autoComplete="off"
        aria-invalid={!!errors.text}
        aria-describedby={errors.text || errors.root ? `${id}-error` : undefined}
      />
      <Button type="submit" variant="primary" disabled={!draft.trim() || isSubmitting}>{chatPageCopy.send}</Button>
    </form>
    {(errors.text || errors.root) && <p id={`${id}-error`} className={styles.formError} role="alert">{errors.text?.message ?? errors.root?.message}</p>}
  </div>
}

function MessageBubble({ message, connect, profile }: { message: Message; connect: Connect; profile: Profile }) {
  const own = message.authorId === profile.id
  const person = connect.attendees.find(item => item.id === message.authorId)
  const color = person?.color ?? AVATAR_COLORS[message.authorName.length % AVATAR_COLORS.length]
  return <div className={`${styles.messageRow} ${own ? styles.ownMessage : ''}`}>
    <div className={styles.messageGroup}>
      <Avatar name={message.authorName} color={color} size={28} />
      <div className={styles.bubble}>
        <div className={styles.messageAuthor}>
          <span>{own ? chatPageCopy.you : message.authorName}</span>
          <span aria-hidden="true">{chatPageCopy.middleDotSeparator}</span>
          <time dateTime={message.sentAt} title={new Date(message.sentAt).toLocaleString(chatPageCopy.enGB, { timeZone: connect.timeZone })}>{timeLabel(message.sentAt, connect.timeZone)}</time>
          {message.isPinned && <span className={styles.pinnedLabel}>{chatPageCopy.pinned}</span>}
        </div>
        <p>{message.text}</p>
      </div>
    </div>
  </div>
}

function Conversation({ connect, profile }: { connect: Connect; profile: Profile }) {
  const messages = useAppStore(applicationState => applicationState.messages)
  const attendance = getAttendance(connect, profile)
  const joined = attendance === 'joined'
  const ended = isEnded(connect) || connect.status === 'cancelled'
  const channel = joined ? messages.filter(message => message.connectId === connect.id).sort((firstMessage, secondMessage) => Date.parse(firstMessage.sentAt) - Date.parse(secondMessage.sentAt)) : []
  const scroller = useRef<HTMLDivElement>(null)
  const lastMessageId = channel.at(-1)?.id
  useEffect(() => {
    const element = scroller.current
    if (element) element.scrollTop = element.scrollHeight
  }, [connect.id, lastMessageId, joined])
  return <section className={styles.conversation} aria-label={chatPageCopy.groupChat(String(connect.title))}>
    <header className={styles.chatHeader}>
      <div>
        <h1>{connect.title}</h1>
        <p>{dayLabel(connect.startsAt, connect.timeZone)} {timeLabel(connect.startsAt, connect.timeZone)} {chatPageCopy.textSeparator} {timeLabel(connect.endsAt, connect.timeZone)} <span aria-hidden="true">{chatPageCopy.middleDotSeparator}</span> {placeLabel(connect)} <span aria-hidden="true">{chatPageCopy.middleDotSeparator}</span> {connect.attendees.length}{chatPageCopy.going}</p>
      </div>
      <PageLink to={`/connect/${connect.id}`}>{chatPageCopy.openConnect}</PageLink>
    </header>
    {!joined ? <div className={styles.lockedChat}>
      <EmptyState
        title={attendance === chatPageCopy.pending ? chatPageCopy.yourRequestIsAwaitingApproval : attendance === chatPageCopy.waitlist ? chatPageCopy.youAreOnTheWaitlist : chatPageCopy.joinThisConnectToOpenItsChat}
        action={<PageLink to={`/connect/${connect.id}`} primary>{chatPageCopy.viewConnect}</PageLink>}
      >{attendance === 'pending' ? chatPageCopy.onlyConfirmedAttendeesCanReadAndSendGroupMessages : attendance === 'waitlist' ? chatPageCopy.groupMessagesUnlockWhenYouGetAConfirmedSpot : chatPageCopy.joinThisConnectToTakePartInTheGroup}</EmptyState>
    </div> : <>
      <div className={styles.pinnedMeeting}>
        <span className={styles.pinSymbol} aria-hidden="true">{chatPageCopy.locationSymbol}</span>
        <div><strong>{connect.locationType === 'online' ? chatPageCopy.pinnedOnlineDetails : connect.locationType === 'undecided' ? chatPageCopy.meetingPlaceToBeDecided : chatPageCopy.pinnedMeetingPoint}</strong><p>{placeDetails(connect, profile) ?? chatPageCopy.theHostHasNotAddedMeetingDetailsYet}</p></div>
      </div>
      {ended && <div className={styles.archivedNotice}><Badge>{connect.status === 'cancelled' ? chatPageCopy.cancelled : chatPageCopy.ended}</Badge><span>{chatPageCopy.chatHistoryIsReadOnlyNoNewMessagesCan}</span></div>}
      <div ref={scroller} className={styles.messageFeed} role="log" aria-label={chatPageCopy.groupMessages} aria-live="polite" aria-relevant="additions text" tabIndex={0}>
        {channel.length === 0 && <div className={styles.emptyChat}><h2>{chatPageCopy.noMessagesYet}</h2><p>{ended ? chatPageCopy.thereAreNoSavedMessagesForThisConnect : chatPageCopy.sayHelloAskAQuestionOrCoordinateWhatTo}</p></div>}
        {channel.map((message, index) => {
          const previous = channel[index - 1]
          const date = dayLabel(message.sentAt, connect.timeZone)
          const showDate = !previous || dayLabel(previous.sentAt, connect.timeZone) !== date
          return <div className={styles.messageEntry} key={message.id}>{showDate && <div className={styles.dayDivider}><time dateTime={message.sentAt}>{date}</time></div>}<MessageBubble message={message} connect={connect} profile={profile} /></div>
        })}
      </div>
      {!ended && <MessageComposer key={connect.id} connectId={connect.id} />}
    </>}
  </section>
}

export function ChatPage() {
  const { id } = useParams<{ id: string }>()
  const profile = useAppStore(applicationState => applicationState.profile)
  const connects = useAppStore(applicationState => applicationState.connects)
  const messages = useAppStore(applicationState => applicationState.messages)
  const threads = connects.filter(connect => getAttendance(connect, profile)).sort((firstConnect, secondConnect) => Number(isEnded(firstConnect) || firstConnect.status === 'cancelled') - Number(isEnded(secondConnect) || secondConnect.status === 'cancelled') || Date.parse(firstConnect.startsAt) - Date.parse(secondConnect.startsAt))
  const selected = id ? connects.find(connect => connect.id === id) : threads.find(connect => getAttendance(connect, profile) === 'joined') ?? threads[0]
  if (!profile) return <div className="page"><EmptyState title={chatPageCopy.aPlaceForYourGroupToTalk} action={<PageLink to="/signup" primary>{chatPageCopy.createAProfile}</PageLink>}>{chatPageCopy.joinAConnectToStartAConversationWithThe}</EmptyState></div>
  return <div className={styles.chatLayout}>
    <aside className={styles.threadSidebar}>
      <h2>{chatPageCopy.yourThreads}</h2>
      <nav className={styles.threadList} aria-label={chatPageCopy.connectGroupChats}>
        {threads.map(connect => {
          const attendance = getAttendance(connect, profile)
          const joined = attendance === 'joined'
          const latest = joined ? messages.filter(message => message.connectId === connect.id).sort((firstMessage, secondMessage) => Date.parse(secondMessage.sentAt) - Date.parse(firstMessage.sentAt))[0] : undefined
          const subtitle = attendance === 'pending' ? chatPageCopy.approvalPendingChatLocked : attendance === 'waitlist' ? chatPageCopy.waitlistedChatLocked : latest ? `${latest.authorId === profile.id ? chatPageCopy.you : latest.authorName.split(' ')[0]}: ${latest.text}` : isEnded(connect) || connect.status === 'cancelled' ? chatPageCopy.readOnlyChatHistory : chatPageCopy.noMessagesYetSayHello
          return <Link key={connect.id} to={`/chats/${connect.id}`} className={`${styles.thread} ${selected?.id === connect.id ? styles.selectedThread : ''}`} aria-current={selected?.id === connect.id ? 'page' : undefined}>
            <CategoryGlyph category={connect.categoryKey} small />
            <div><strong>{connect.title}</strong><p>{subtitle}</p>{(isEnded(connect) || connect.status === 'cancelled') && <span className={styles.threadStatus}>{connect.status === 'cancelled' ? chatPageCopy.cancelled : chatPageCopy.ended}</span>}</div>
          </Link>
        })}
      </nav>
      {threads.length === 0 && <div className={styles.noThreads}><p>{chatPageCopy.joinAConnectAndItsGroupWillAppearHere}</p><PageLink to="/discover">{chatPageCopy.browseConnects}</PageLink></div>}
    </aside>
    {selected ? <Conversation key={selected.id} connect={selected} profile={profile} /> : <div className={styles.noConversation}><EmptyState title={id ? chatPageCopy.thisConnectWasNotFound : chatPageCopy.yourNextConversationStartsNearby} action={<PageLink to="/discover" primary>{chatPageCopy.browseConnects}</PageLink>}>{id ? chatPageCopy.theLinkMayBeOutOfDateChooseA : chatPageCopy.joinAGroupToSayHelloAndCoordinateYour}</EmptyState></div>}
  </div>
}
