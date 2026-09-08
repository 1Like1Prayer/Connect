import { hostingUICopy } from '../../copies/index'
import { useId, useRef, useState } from 'react'
import { Button, Field } from '../../components/UI'
import { useAppStore } from '../../lib/store'
import styles from './Hosting.module.css'

export function ChoiceGroup<T extends string>({ label, value, options, onChange, disabled, hint }: {
  label: string
  value: T
  options: readonly { value: T; label: string; disabled?: boolean }[]
  onChange: (value: T) => void
  disabled?: boolean
  hint?: string
}) {
  const id = useId()
  return <fieldset className={styles.choices} disabled={disabled} aria-describedby={hint ? `${id}-hint` : undefined}>
    <legend>{label}</legend>
    {hint && <p id={`${id}-hint`} className={styles.help}>{hint}</p>}
    <div className={styles.pills}>{options.map(option => <label key={option.value} className={`${styles.choice} ${value === option.value ? styles.selected : ''} ${option.disabled ? styles.unavailable : ''}`}>
      <input type="radio" name={id} value={option.value} checked={value === option.value} disabled={option.disabled} onChange={() => onChange(option.value)} />
      <span>{option.label}</span>
    </label>)}</div>
  </fieldset>
}

export function ShareInvite({ id, title }: { id: string; title: string }) {
  const input = useRef<HTMLInputElement>(null), fieldId = useId()
  const [message, setMessage] = useState('')
  const notify = useAppStore(applicationState => applicationState.notify)
  const url = `${window.location.origin}/connect/${encodeURIComponent(id)}`
  async function copy() {
    if (!navigator.clipboard?.writeText) {
      setMessage(hostingUICopy.selectTheLinkAndCopyItWithCtrlC)
      input.current?.focus()
      input.current?.select()
      return
    }
    try {
      await navigator.clipboard.writeText(url)
      setMessage(hostingUICopy.linkCopied)
      notify(hostingUICopy.linkCopied)
    } catch (error) {
      if (!(error instanceof DOMException)) throw error
      setMessage(hostingUICopy.theLinkCouldNotBeCopiedAutomaticallyCopyThe)
      input.current?.focus()
      input.current?.select()
    }
  }
  return <div className={styles.share}>
    <Field label={hostingUICopy.inviteLink} htmlFor={fieldId}><div className={styles.copyRow}>
      <input ref={input} id={fieldId} value={url} readOnly aria-label={hostingUICopy.inviteLinkFor(String(title))} onFocus={event => event.currentTarget.select()} />
      <Button variant="dark" onClick={copy}>{hostingUICopy.copyLink}</Button>
    </div></Field>
    {message && <p className={styles.feedback} role="status">{message}</p>}
  </div>
}
