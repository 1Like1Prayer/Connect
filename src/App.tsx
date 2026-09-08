import { appCopy } from './copies/index'
import { lazy, Suspense } from 'react'
import { BrowserRouter, Route, Routes } from 'react-router'
import { RequireProfile, Shell } from './components/Shell'
import { EmptyState } from './components/UI'
import { WelcomePage } from './features/welcome/WelcomePage'
import './styles/global.css'

const DiscoverPage = lazy(() => import('./features/discovery/DiscoverPage').then(m => ({ default: m.DiscoverPage })))
const DetailPage = lazy(() => import('./features/discovery/DetailPage').then(m => ({ default: m.DetailPage })))
const SignupPage = lazy(() => import('./features/identity').then(m => ({ default: m.SignupPage })))
const ProfilePage = lazy(() => import('./features/identity').then(m => ({ default: m.ProfilePage })))
const HostPage = lazy(() => import('./features/hosting').then(m => ({ default: m.HostPage })))
const ManagePage = lazy(() => import('./features/hosting').then(m => ({ default: m.ManagePage })))
const CategoriesPage = lazy(() => import('./features/community').then(m => ({ default: m.CategoriesPage })))
const MyConnectsPage = lazy(() => import('./features/community').then(m => ({ default: m.MyConnectsPage })))
const ChatPage = lazy(() => import('./features/community').then(m => ({ default: m.ChatPage })))
const AlertsPage = lazy(() => import('./features/community').then(m => ({ default: m.AlertsPage })))
const KitPage = lazy(() => import('./features/community').then(m => ({ default: m.KitPage })))

export default function App() {
  return <BrowserRouter><Suspense fallback={<div className="page" role="status">{appCopy.openingConnect}</div>}><Routes><Route element={<Shell />}>
    <Route index element={<WelcomePage />} />
    <Route path="signup" element={<SignupPage />} />
    <Route path="discover" element={<DiscoverPage />} />
    <Route path="categories" element={<CategoriesPage />} />
    <Route path="connect/:id" element={<DetailPage />} />
    <Route path="host" element={<RequireProfile><HostPage /></RequireProfile>} />
    <Route path="connect/:id/edit" element={<RequireProfile><HostPage /></RequireProfile>} />
    <Route path="connect/:id/manage" element={<RequireProfile><ManagePage /></RequireProfile>} />
    <Route path="mine" element={<RequireProfile><MyConnectsPage /></RequireProfile>} />
    <Route path="chats" element={<RequireProfile><ChatPage /></RequireProfile>} />
    <Route path="chats/:id" element={<RequireProfile><ChatPage /></RequireProfile>} />
    <Route path="profile" element={<RequireProfile><ProfilePage /></RequireProfile>} />
    <Route path="profile/:id" element={<RequireProfile><ProfilePage /></RequireProfile>} />
    <Route path="alerts" element={<RequireProfile><AlertsPage /></RequireProfile>} />
    <Route path="kit" element={<KitPage />} />
    <Route path="*" element={<EmptyState title={appCopy.thisPageIsNotOnTheBoard} action={<a href="/discover">{appCopy.backToDiscover}</a>}>{appCopy.theLinkMayBeOutOfDate}</EmptyState>} />
  </Route></Routes></Suspense></BrowserRouter>
}
