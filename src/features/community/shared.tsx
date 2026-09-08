import { sharedCopy } from '../../copies/index'
import { useId, useRef } from 'react'
import type { CSSProperties, ReactNode } from 'react'
import { Link } from 'react-router'
import { getCategory } from '../../lib/catalog'
import { useAppStore } from '../../lib/store'
import type { CategoryKey } from '../../lib/types'
import styles from './Community.module.css'

export function PageLink({ to, children, primary = false, quiet = false, className = '', onClick }: {
  to: string
  children: ReactNode
  primary?: boolean
  quiet?: boolean
  className?: string
  onClick?: () => void
}) {
  return <Link to={to} onClick={onClick} className={`${styles.linkButton} ${primary ? styles.actionLink : ''} ${quiet ? styles.quietLink : ''} ${className}`}>{children}</Link>
}

export function useCategoryColor(key: CategoryKey) {
  const palette = useAppStore(applicationState => applicationState.palette)
  const theme = useAppStore(applicationState => applicationState.theme)
  const category = getCategory(key)
  return theme === 'dark' || palette === 'riso' ? category.alternateColor : category.primaryColor
}

export function CategoryGlyph({ category, small = false }: { category: CategoryKey; small?: boolean }) {
  const color = useCategoryColor(category)
  return <span aria-hidden="true" className={`${styles.categoryGlyph} ${small ? styles.smallGlyph : ''}`} style={{ background: color }}>{getCategory(category).glyph}</span>
}

export function Tabs<T extends string>({ label, tabs, value, onChange, panelId }: {
  label: string
  tabs: { value: T; label: string; count?: number }[]
  value: T
  onChange: (value: T) => void
  panelId: string
}) {
  const id = useId()
  const refs = useRef<(HTMLButtonElement | null)[]>([])
  return <div className={styles.tabs} role="tablist" aria-label={label}>
    {tabs.map((tab, index) => <button
      key={tab.value}
      ref={element => { refs.current[index] = element }}
      id={`${id}-${tab.value}`}
      type="button"
      role="tab"
      aria-selected={tab.value === value}
      aria-controls={panelId}
      tabIndex={tab.value === value ? 0 : -1}
      className={`${styles.tab} ${tab.value === value ? styles.activeTab : ''}`}
      onClick={() => onChange(tab.value)}
      onKeyDown={event => {
        let next: number
        if (event.key === 'ArrowRight') next = (index + 1) % tabs.length
        else if (event.key === 'ArrowLeft') next = (index - 1 + tabs.length) % tabs.length
        else if (event.key === 'Home') next = 0
        else if (event.key === 'End') next = tabs.length - 1
        else return
        event.preventDefault()
        onChange(tabs[next].value)
        refs.current[next]?.focus()
      }}
    >{tab.label}{tab.count !== undefined && <span className={styles.tabCount}>{tab.count}</span>}</button>)}
  </div>
}

export const categoryStyle = (color: string): CSSProperties => ({ borderLeftColor: color })

export function relativeTime(value: string) {
  const seconds = Math.max(0, (Date.now() - Date.parse(value)) / 1000)
  if (seconds < 60) return sharedCopy.justNow
  const formatter = new Intl.RelativeTimeFormat('en', { numeric: 'auto' })
  if (seconds < 3600) return formatter.format(-Math.floor(seconds / 60), 'minute')
  if (seconds < 86400) return formatter.format(-Math.floor(seconds / 3600), 'hour')
  return formatter.format(-Math.floor(seconds / 86400), 'day')
}
