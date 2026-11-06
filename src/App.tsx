import { AuthProvider, useAuth } from './context/AuthContext'
import { Auth0BridgeProvider } from './context/Auth0Bridge'
import { AdminDashboard } from './components/AdminDashboard'
import { AuthModal } from './components/AuthModal'
import { JoinCohortModal } from './components/JoinCohortModal'
import { StudentDashboardModal } from './components/StudentDashboardModal'
import { Cta } from './sections/Cta'
import { Faq } from './sections/Faq'
import { Features } from './sections/Features'
import { Footer } from './sections/Footer'
import { Hero } from './sections/Hero'
import { LogoCloud } from './sections/LogoCloud'
import { Metrics } from './sections/Metrics'
import { Nav } from './sections/Nav'
import { Pricing } from './sections/Pricing'
import { Showcase } from './sections/Showcase'
import { Steps } from './sections/Steps'
import { Testimonials } from './sections/Testimonials'
import { Transformation } from './sections/Transformation'

function AppContent() {
  const { isAuthModalOpen, authModalMode, closeAuthModal, openAuthModal } = useAuth()

  return (
    <>
      <Nav onOpenAuth={openAuthModal} />
      <main>
        <Hero />
        <LogoCloud />
        <Features />
        <Steps />
        <Showcase />
        <Transformation />
        <Metrics />
        <Testimonials />
        <Pricing onOpenAuth={openAuthModal} />
        <Faq />
        <Cta />
      </main>
      <Footer />

      <AuthModal
        isOpen={isAuthModalOpen}
        initialMode={authModalMode}
        onClose={closeAuthModal}
      />

      <JoinCohortModal />

      <StudentDashboardModal />

      <AdminDashboard />
    </>
  )
}

export function App() {
  return (
    <Auth0BridgeProvider>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </Auth0BridgeProvider>
  )
}
