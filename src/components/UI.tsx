import { uiCopy } from '../copies/index'
import { useEffect, useId, useRef } from 'react'
import type { ButtonHTMLAttributes, ComponentProps, CSSProperties, ReactNode } from 'react'
import { initials, getCategory } from '../lib/catalog'
import type { CategoryKey } from '../lib/types'
import { useAppStore } from '../lib/store'
import styles from './UI.module.css'

export function Button({ variant = 'default', className = '', type = 'button', ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'default' | 'primary' | 'dark' | 'danger' | 'ghost' }) {
  return <button type={type} className={`${styles.button} ${styles[variant]} ${className}`} {...props} />
}
export function Panel({ children, className = '', style }: { children: ReactNode; className?: string; style?: CSSProperties }) {
  return <section className={`${styles.panel} ${className}`} style={style}>{children}</section>
}
export function Field({ label, error, hint, children, htmlFor }: { label: string; error?: string; hint?: string; children: ReactNode; htmlFor?: string }) {
  return <div className={styles.field}><label htmlFor={htmlFor}>{label}</label>{children}{hint && <small>{hint}</small>}{error && <span className={styles.error} role="alert">{error}</span>}</div>
}
export function Input(props: ComponentProps<'input'>) {
  return <input {...props} className={`${styles.input} ${props.className ?? ''}`} />
}
export function Avatar({ name, color = '#d9c7f0', size = 38, src }: { name: string; color?: string; size?: number; src?: string }) {
  return <span className={styles.avatar} style={{ width: size, height: size, background: color }} aria-label={name}>{src ? <img src={src} alt="" /> : initials(name)}</span>
}
export function Badge({ children, color, active }: { children: ReactNode; color?: string; active?: boolean }) {
  return <span className={`${styles.badge} ${active ? styles.badgeActive : ''}`} style={color ? { color } : undefined}>{children}</span>
}
export function CategoryLabel({ category, subcategoryName }: { category: CategoryKey; subcategoryName?: string }) {
  const palette = useAppStore(applicationState => applicationState.palette), theme = useAppStore(applicationState => applicationState.theme), categoryDefinition = getCategory(category)
  return <span className={styles.category} style={{ color: theme === 'dark' || palette === 'riso' ? categoryDefinition.alternateColor : categoryDefinition.primaryColor }}>{categoryDefinition.glyph} {subcategoryName ?? categoryDefinition.name}</span>
}
export function Toggle({ checked, onChange, label, hint, disabled, divider = true }: { checked: boolean; onChange: (checked: boolean) => void; label: string; hint?: string; disabled?: boolean; divider?: boolean }) {
  const id = useId()
  return <div className={`${styles.toggleRow} ${divider ? '' : styles.withoutDivider}`}><div><label htmlFor={id}>{label}</label>{hint && <p>{hint}</p>}</div><input id={id} className={styles.toggle} type="checkbox" role="switch" checked={checked} onChange={changeEvent => onChange(changeEvent.target.checked)} disabled={disabled} /></div>
}
export function EmptyState({ title, children, action }: { title: string; children?: ReactNode; action?: ReactNode }) {
  return <div className={styles.empty}><div className={styles.emptyArt} aria-hidden="true" /><h2>{title}</h2><p>{children}</p>{action}</div>
}
export function Modal({ title, children, onClose }: { title: string; children: ReactNode; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null), titleId = useId()
  useEffect(() => {
    const dialog = ref.current!
    const previous = document.activeElement
    dialog.showModal()
    const oldOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      dialog.close()
      document.body.style.overflow = oldOverflow
      if (previous instanceof HTMLElement) previous.focus()
    }
  }, [])
  return <dialog ref={ref} className={styles.modal} aria-labelledby={titleId} onCancel={changeEvent => { changeEvent.preventDefault(); onClose() }} onClick={mouseEvent => { if (mouseEvent.target === mouseEvent.currentTarget) onClose() }}><div className={styles.modalBody}><div className={styles.modalHeading}><h2 id={titleId}>{title}</h2><Button variant="ghost" aria-label={uiCopy.closeDialog} onClick={onClose}>{uiCopy.closeSymbol}</Button></div>{children}</div></dialog>
}
export function ImagePlaceholder({ label, className = '' }: { label: string; className?: string }) {
  return <div className={`${styles.placeholder} ${className}`} role="img" aria-label={label}><svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8" cy="8" r="1.5" /><path d="m4 18 5-6 3 3 3-5 6 7" /></svg><span>{label}</span></div>
}
