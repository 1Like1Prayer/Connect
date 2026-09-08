import { shellCopy } from '../copies/index'
import { useEffect, useState } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate, useSearchParams } from 'react-router'
import type { ReactNode } from 'react'
import { useAppStore } from '../lib/store'
import { Avatar, Button, Panel } from './UI'
import styles from './Shell.module.css'

const routes = [['/', shellCopy.welcome], ['/signup', shellCopy.signUp], ['/discover', shellCopy.discover], ['/connect/1', shellCopy.detail], ['/host', shellCopy.host], ['/categories', shellCopy.categories], ['/mine', shellCopy.myConnects], ['/connect/1/manage', shellCopy.manage], ['/chats', shellCopy.chat], ['/profile', shellCopy.profile], ['/alerts', shellCopy.alerts], ['/kit', shellCopy.kit]]
export function Shell() {
  const state = useAppStore(), location = useLocation(), navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const [showPreviewNavigation, setShowPreviewNavigation] = useState(false)
  const welcome = location.pathname === '/', discover = location.pathname === '/discover'
  const alertCount = state.profile ? state.alerts.filter(notification => !notification.isRead).length : 0
  useEffect(() => { document.documentElement.dataset.theme = state.theme }, [state.theme])
  useEffect(() => {
    const toggleNavigation = (event: KeyboardEvent) => {
      if (event.altKey && event.shiftKey && !event.ctrlKey && !event.metaKey && !event.repeat && event.code === 'KeyO') {
        event.preventDefault()
        setShowPreviewNavigation(visible => !visible)
      }
    }
    window.addEventListener('keydown', toggleNavigation)
    return () => window.removeEventListener('keydown', toggleNavigation)
  }, [])
  useEffect(() => {
    window.scrollTo(0, 0)
    document.getElementById('main-content')?.focus({ preventScroll: true })
  }, [location.pathname])
  useEffect(() => {
    if (!state.toast) return
    const timer = setTimeout(state.clearToast, 6500)
    return () => clearTimeout(timer)
  }, [state.toast, state.clearToast])
  return <div className={`${styles.app} ${discover ? styles.discoverApp : ''}`}>
    <a href="#main-content" className={styles.skip}>{shellCopy.skipToContent}</a>
    {showPreviewNavigation && <div className={styles.prototype} aria-label={shellCopy.previewNavigation} aria-keyshortcuts={shellCopy.altShiftO}>
      <div className={styles.screenNav}><strong>{shellCopy.preview}</strong><nav aria-label={shellCopy.allPreviewScreens}>{routes.map(([to, text]) => <NavLink key={to} to={to} end className={({ isActive }) => isActive ? styles.activeTab : ''}>{text}</NavLink>)}</nav></div>
      <div className={styles.options}><label>{shellCopy.layout}<select value={state.layout} onChange={changeEvent => { state.setLayout(changeEvent.target.value === 'board' ? 'board' : 'split'); state.setCardStyle(changeEvent.target.value === 'board' ? 'tile' : 'row') }}><option value="split">{shellCopy.split}</option><option value="board">{shellCopy.board}</option></select></label><label>{shellCopy.card}<select value={state.cardStyle} onChange={changeEvent => state.setCardStyle(changeEvent.target.value === 'tile' ? 'tile' : 'row')}><option value="row">{shellCopy.row}</option><option value="tile">{shellCopy.tile}</option></select></label><label>{shellCopy.palette}<select value={state.palette} onChange={changeEvent => state.setPalette(changeEvent.target.value === 'riso' ? 'riso' : 'ink')}><option value="ink">{shellCopy.ink}</option><option value="riso">{shellCopy.riso}</option></select></label><button onClick={() => state.setTheme(state.theme === 'light' ? 'dark' : 'light')} aria-label={shellCopy.switchToTheme(String(state.theme === shellCopy.light2 ? shellCopy.dark2 : shellCopy.light2))}>{state.theme === 'light' ? shellCopy.light : shellCopy.dark}</button></div>
    </div>}
    <div className={`${styles.surface} ${discover ? styles.discoverSurface : ''}`}>
      <header className={`${styles.header} ${welcome ? styles.welcomeHeader : ''}`}>
        <div className={welcome ? styles.brandGroup : undefined}>
          <span className={styles.brand}><span />{shellCopy.connect}</span>
          {welcome && <p className={styles.tagline}>{shellCopy.findYourPeople}</p>}
        </div>
        {discover && <div className={styles.search}><label htmlFor="global-search">{shellCopy.search}</label><input id="global-search" placeholder={shellCopy.footballBoardGamesFlorentin} value={params.get('q') ?? ''} onChange={changeEvent => { const next = new URLSearchParams(params); if (changeEvent.target.value) next.set('q', changeEvent.target.value); else next.delete('q'); setParams(next, { replace: true }) }} />{params.get('q') && <button aria-label={shellCopy.clearSearch} onClick={() => { const next = new URLSearchParams(params); next.delete('q'); setParams(next, { replace: true }) }}>{shellCopy.closeSymbol}</button>}</div>}
        {!welcome && <nav className={styles.mainNav} aria-label={shellCopy.mainNavigation}><NavLink to="/discover">{shellCopy.discover}</NavLink><NavLink to="/mine">{shellCopy.myConnects}</NavLink><NavLink to="/chats">{shellCopy.chats}</NavLink></nav>}
        <div className={styles.headerActions}>
          {welcome ? <><Button onClick={() => document.getElementById('login-email')?.focus()}>{shellCopy.logIn}</Button><Button variant="primary" onClick={() => navigate('/signup')}>{shellCopy.signUp}</Button></> : <><Link to="/alerts" className={styles.alertButton} aria-label={shellCopy.notifications(String(alertCount ? shellCopy.unread(String(alertCount)) : ''))}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M9 21h6" /></svg>{alertCount > 0 && <span>{alertCount}</span>}</Link><Button variant="primary" onClick={() => navigate('/host')}>{shellCopy.hostAConnect}</Button><Link to={state.profile ? '/profile' : '/signup'} aria-label={state.profile ? shellCopy.yourProfile : shellCopy.signUp}><Avatar name={state.profile?.name ?? '?'} src={state.profile?.avatarDataUrl} /></Link></>}
        </div>
      </header>
      <main id="main-content" tabIndex={-1}><Outlet /></main>
    </div>
    {state.toast && <div className={styles.toast} role="status"><span>{state.toast.message}</span><button onClick={state.clearToast} aria-label={shellCopy.dismissNotification}>{shellCopy.closeSymbol}</button></div>}
  </div>
}
export function RequireProfile({ children }: { children: ReactNode }) {
  const profile = useAppStore(applicationState => applicationState.profile)
  const location = useLocation(), navigate = useNavigate()
  if (profile) return children
  return <div className={styles.gate}><Panel><span className={styles.gateLabel}>{shellCopy.yourNextPlanStartsHere}</span><h1>{shellCopy.aNameToExpectAtTheGate}</h1><p>{shellCopy.youCanBrowseAnyConnectAsAGuestSign}</p><div className="row"><Button variant="primary" onClick={() => navigate(`/signup?returnTo=${encodeURIComponent(location.pathname + location.search)}`)}>{shellCopy.signUp}</Button><Button onClick={() => navigate(`/?returnTo=${encodeURIComponent(location.pathname + location.search)}`)}>{shellCopy.iHaveAnAccount}</Button></div></Panel></div>
}
