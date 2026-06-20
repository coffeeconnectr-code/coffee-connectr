import { useEffect, useState } from 'react'
import { Link, Navigate, Outlet, Route, Routes, useParams } from 'react-router-dom'
import BrandMark from './components/BrandMark'
import { supabase } from './lib/supabase'
import { fetchMemberAccess } from './lib/subscriptionApi'
import { notifyWelcomeEmail } from './lib/notificationsApi'
import DiscoverBrowse from './components/DiscoverBrowse'
import DiscoverMap from './components/DiscoverMap'
import DiscoverRecommend from './components/DiscoverRecommend'
import DiscoverRoasters from './components/DiscoverRoasters'
import LandingPage from './components/LandingPage'
import AboutPage from './components/AboutPage'
import HowToUsePage from './components/HowToUsePage'
import PricingPage from './components/PricingPage'
import TermsPage from './components/TermsPage'
import PrivacyPage from './components/PrivacyPage'
import ContactPage from './components/ContactPage'
import MessageThread from './components/MessageThread'
import MessagesInbox from './components/MessagesInbox'
import NoticeboardBrowse from './components/NoticeboardBrowse'
import NoticeboardForm from './components/NoticeboardForm'
import NoticeboardMap from './components/NoticeboardMap'
import NoticeboardPostView from './components/NoticeboardPostView'
import ResourcesBrowse from './components/ResourcesBrowse'
import ResourceForm from './components/ResourceForm'
import ResourcePostView from './components/ResourcePostView'
import SavedProfiles from './components/SavedProfiles'
import SignUpPage from './components/SignUpPage'
import ProfileForm from './components/ProfileForm'
import ProfileView from './components/ProfileView'
import MemberDashboard from './components/MemberDashboard'
import MemberGate from './components/MemberGate'
import MemberAccessBanner from './components/MemberAccessBanner'
import ErrorBoundary from './components/ErrorBoundary'
import SubscribePage from './components/SubscribePage'
import AdminDashboard from './components/admin/AdminDashboard'
import AdminGate from './components/admin/AdminGate'
import AdminLayout from './components/admin/AdminLayout'
import AdminModeration from './components/admin/AdminModeration'
import AdminReports from './components/admin/AdminReports'
import AdminVerification from './components/admin/AdminVerification'
import AdminFeatured from './components/admin/AdminFeatured'
import AdminFeedback from './components/admin/AdminFeedback'
import AdminAudit from './components/admin/AdminAudit'
import AdminWelcomeEmails from './components/admin/AdminWelcomeEmails'
import AdminProfileReminders from './components/admin/AdminProfileReminders'
import AdminFreeProfiles from './components/admin/AdminFreeProfiles'
import AdminFreeYearMembership from './components/admin/AdminFreeYearMembership'
import useAdminAccess from './hooks/useAdminAccess'
import useMemberAccess from './hooks/useMemberAccess'
import { isUuid } from './lib/uuid'
import { redeemStoredFreeProfileInvite } from './lib/freeProfileInvite'
import {
  enforceEmailConfirmation,
  userNeedsEmailConfirmation,
} from './lib/authEmailConfirmation'
import './App.css'

function ProfileViewRoute({ session }) {
  const { userId } = useParams()

  if (!isUuid(userId)) {
    return <Navigate to="/discover/map" replace />
  }

  return (
    <MemberGate session={session}>
      <ProfileView
        userId={userId}
        currentUserId={session?.user?.id ?? null}
      />
    </MemberGate>
  )
}

function MemberFeatureRoute({ session, children }) {
  return <MemberGate session={session}>{children}</MemberGate>
}

function MessagesRoute({ session }) {
  return (
    <MemberGate session={session}>
      <MessagesInbox currentUserId={session.user.id} />
    </MemberGate>
  )
}

function MessageThreadRoute({ session }) {
  const { userId } = useParams()

  if (!isUuid(userId)) {
    return <Navigate to="/messages" replace />
  }

  return (
    <MemberGate session={session}>
      <MessageThread currentUserId={session.user.id} otherUserId={userId} />
    </MemberGate>
  )
}

function DashboardRoute({ session }) {
  if (!session) {
    return <Navigate to="/sign-up" replace />
  }

  return (
    <MemberDashboard
      userId={session.user.id}
      userEmail={session.user.email ?? 'your account'}
      session={session}
    />
  )
}

function SignUpRoute({ session }) {
  if (session) {
    return <Navigate to="/dashboard" replace />
  }

  return <SignUpPage />
}

function SavedProfilesRoute({ session }) {
  return (
    <MemberGate session={session}>
      <SavedProfiles currentUserId={session.user.id} />
    </MemberGate>
  )
}

function EditProfileRoute({ session }) {
  if (!session) {
    return <Navigate to="/sign-up" replace />
  }

  return (
    <ProfileForm
      userId={session.user.id}
      userEmail={session.user.email ?? 'your account'}
    />
  )
}

function NoticeboardNewRoute({ session }) {
  return (
    <MemberGate session={session}>
      <NoticeboardForm userId={session.user.id} />
    </MemberGate>
  )
}

function NoticeboardPostRoute({ session }) {
  const { postId } = useParams()

  if (postId === 'map') {
    return <Navigate to="/noticeboard/map" replace />
  }

  if (postId === 'new') {
    return <Navigate to="/noticeboard/new" replace />
  }

  if (!isUuid(postId)) {
    return <Navigate to="/noticeboard" replace />
  }

  return (
    <MemberFeatureRoute session={session}>
      <NoticeboardPostView
        postId={postId}
        currentUserId={session?.user?.id ?? null}
      />
    </MemberFeatureRoute>
  )
}

function NoticeboardEditRoute({ session }) {
  const { postId } = useParams()

  if (!isUuid(postId)) {
    return <Navigate to="/noticeboard" replace />
  }

  return (
    <MemberGate session={session}>
      <NoticeboardForm userId={session.user.id} postId={postId} />
    </MemberGate>
  )
}

function ResourcesNewRoute({ session }) {
  return (
    <MemberGate session={session}>
      <ResourceForm userId={session.user.id} />
    </MemberGate>
  )
}

function ResourcePostRoute({ session }) {
  const { resourceId } = useParams()

  if (resourceId === 'new') {
    return <Navigate to="/resources/new" replace />
  }

  if (!isUuid(resourceId)) {
    return <Navigate to="/resources" replace />
  }

  return (
    <MemberFeatureRoute session={session}>
      <ResourcePostView resourceId={resourceId} currentUserId={session?.user?.id ?? null} />
    </MemberFeatureRoute>
  )
}

function ResourcesEditRoute({ session }) {
  const { resourceId } = useParams()

  if (!isUuid(resourceId)) {
    return <Navigate to="/resources" replace />
  }

  return (
    <MemberGate session={session}>
      <ResourceForm userId={session.user.id} resourceId={resourceId} />
    </MemberGate>
  )
}

function SubscribeRoute({ session }) {
  if (!session) {
    return <Navigate to="/sign-up" replace />
  }

  return <SubscribePage session={session} />
}

function AdminRoute({ session }) {
  return (
    <AdminGate session={session}>
      <AdminLayout />
    </AdminGate>
  )
}

function AppShell({ session, onSignOut }) {
  const { isAdmin } = useAdminAccess(session)
  const { access, hasAccess, loading: accessLoading } = useMemberAccess(session)
  const showMemberFeatures = Boolean(session && hasAccess)

  return (
    <main className="page">
      <header className="page-header">
        <Link to="/" className="brand-link">
          <BrandMark titleAs="h1" />
        </Link>
        <div className="header-actions">
          <Link to="/discover/map" className="secondary-button profile-action-link">
            Map
          </Link>
          {showMemberFeatures ? (
            <>
              <Link to="/discover" className="secondary-button profile-action-link">
                Discover
              </Link>
              <Link to="/noticeboard" className="secondary-button profile-action-link">
                Noticeboard
              </Link>
              <Link to="/resources" className="secondary-button profile-action-link">
                Resources
              </Link>
            </>
          ) : null}
          <Link to="/about" className="secondary-button profile-action-link">
            About
          </Link>
          <Link to="/how-to-use" className="secondary-button profile-action-link">
            How to use
          </Link>
          <Link to="/pricing" className="secondary-button profile-action-link">
            Pricing
          </Link>
          {session ? (
            <>
              <Link to="/dashboard" className="secondary-button profile-action-link dashboard-nav-link">
                Dashboard
              </Link>
              {!showMemberFeatures && !accessLoading ? (
                <Link to="/subscribe" className="secondary-button profile-action-link">
                  Subscribe
                </Link>
              ) : null}
              {isAdmin ? (
                <Link to="/admin" className="secondary-button profile-action-link">
                  Admin
                </Link>
              ) : null}
              {showMemberFeatures ? (
                <>
                  <Link to="/messages" className="secondary-button profile-action-link">
                    Messages
                  </Link>
                  <Link to="/saved" className="secondary-button profile-action-link">
                    Saved
                  </Link>
                </>
              ) : null}
              <button type="button" className="secondary-button" onClick={onSignOut}>
                Sign out
              </button>
            </>
          ) : (
            <Link to="/sign-up" className="secondary-button profile-action-link">
              Sign in
            </Link>
          )}
        </div>
      </header>

      {session ? (
        <MemberAccessBanner access={access} loading={accessLoading} />
      ) : null}

      <ErrorBoundary>
        <Outlet />
      </ErrorBoundary>
    </main>
  )
}

export default function App() {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true

    async function initializeSession() {
      const { data } = await supabase.auth.getSession()
      const nextSession = await enforceEmailConfirmation(data.session)

      if (active) {
        setSession(nextSession)
        setLoading(false)
      }
    }

    initializeSession()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, nextSession) => {
      const session = await enforceEmailConfirmation(nextSession)

      if (!active) {
        return
      }

      setSession(session)

      if (
        session?.user?.id &&
        (event === 'SIGNED_IN' || event === 'INITIAL_SESSION' || event === 'TOKEN_REFRESHED')
      ) {
        fetchMemberAccess().catch(() => {})
      }

      if (
        session?.user?.id &&
        (event === 'SIGNED_IN' || event === 'INITIAL_SESSION') &&
        !userNeedsEmailConfirmation(session.user)
      ) {
        redeemStoredFreeProfileInvite()
          .then((result) => {
            if (result?.redeemed) {
              fetchMemberAccess().catch(() => {})
            }
          })
          .catch(() => {})
      }

      if (
        session?.user?.id &&
        event === 'SIGNED_IN' &&
        !userNeedsEmailConfirmation(session.user)
      ) {
        notifyWelcomeEmail(session.user.id, session.access_token)
      }
    })

    return () => {
      active = false
      subscription.unsubscribe()
    }
  }, [])

  async function handleSignOut() {
    await supabase.auth.signOut()
  }

  if (loading) {
    return (
      <main className="page">
        <p className="status-message">Loading...</p>
      </main>
    )
  }

  return (
    <ErrorBoundary>
      <Routes>
        <Route path="/" element={<LandingPage session={session} />} />
        <Route path="/about" element={<AboutPage session={session} />} />
        <Route path="/how-to-use" element={<HowToUsePage session={session} />} />
        <Route path="/pricing" element={<PricingPage session={session} />} />
        <Route path="/terms" element={<TermsPage session={session} />} />
        <Route path="/privacy" element={<PrivacyPage session={session} />} />
        <Route path="/contact" element={<ContactPage session={session} />} />
        <Route path="/sign-up" element={<SignUpRoute session={session} />} />
        <Route path="/admin" element={<AdminRoute session={session} />}>
          <Route index element={<AdminDashboard />} />
          <Route path="moderation" element={<AdminModeration />} />
          <Route path="welcome-emails" element={<AdminWelcomeEmails />} />
          <Route path="profile-reminders" element={<AdminProfileReminders />} />
          <Route path="free-profiles" element={<AdminFreeProfiles />} />
          <Route path="free-year" element={<AdminFreeYearMembership />} />
          <Route path="reports" element={<AdminReports />} />
          <Route path="verification" element={<AdminVerification />} />
          <Route path="featured" element={<AdminFeatured />} />
          <Route path="feedback" element={<AdminFeedback />} />
          <Route path="audit" element={<AdminAudit />} />
        </Route>
        <Route element={<AppShell session={session} onSignOut={handleSignOut} />}>
          <Route
            path="/discover"
            element={
              <MemberFeatureRoute session={session}>
                <DiscoverBrowse currentUserId={session?.user?.id ?? null} />
              </MemberFeatureRoute>
            }
          />
          <Route path="/discover/map" element={<DiscoverMap session={session} />} />
          <Route
            path="/discover/roasters"
            element={
              <MemberFeatureRoute session={session}>
                <DiscoverRoasters />
              </MemberFeatureRoute>
            }
          />
          <Route
            path="/discover/recommend"
            element={
              <MemberFeatureRoute session={session}>
                <DiscoverRecommend session={session} />
              </MemberFeatureRoute>
            }
          />
          <Route path="/dashboard" element={<DashboardRoute session={session} />} />
          <Route path="/subscribe" element={<SubscribeRoute session={session} />} />
          <Route
            path="/noticeboard"
            element={
              <MemberFeatureRoute session={session}>
                <NoticeboardBrowse currentUserId={session?.user?.id ?? null} />
              </MemberFeatureRoute>
            }
          />
          <Route
            path="/noticeboard/map"
            element={
              <MemberFeatureRoute session={session}>
                <NoticeboardMap />
              </MemberFeatureRoute>
            }
          />
          <Route path="/noticeboard/new" element={<NoticeboardNewRoute session={session} />} />
          <Route path="/noticeboard/:postId/edit" element={<NoticeboardEditRoute session={session} />} />
          <Route path="/noticeboard/:postId" element={<NoticeboardPostRoute session={session} />} />
          <Route
            path="/resources"
            element={
              <MemberFeatureRoute session={session}>
                <ResourcesBrowse currentUserId={session?.user?.id ?? null} />
              </MemberFeatureRoute>
            }
          />
          <Route path="/resources/new" element={<ResourcesNewRoute session={session} />} />
          <Route path="/resources/:resourceId/edit" element={<ResourcesEditRoute session={session} />} />
          <Route path="/resources/:resourceId" element={<ResourcePostRoute session={session} />} />
          <Route path="/saved" element={<SavedProfilesRoute session={session} />} />
          <Route path="/messages" element={<MessagesRoute session={session} />} />
          <Route path="/messages/:userId" element={<MessageThreadRoute session={session} />} />
          <Route path="/profile/edit" element={<EditProfileRoute session={session} />} />
          <Route path="/profile/:userId" element={<ProfileViewRoute session={session} />} />
        </Route>
      </Routes>
    </ErrorBoundary>
  )
}
