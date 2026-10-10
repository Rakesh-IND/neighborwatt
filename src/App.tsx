import { lazy, Suspense, type ReactNode } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider, useAuth } from './auth/AuthContext'
import { RequireRole } from './auth/RequireRole'
import { SiteLayout } from './components/layout/SiteLayout'
import { PortalLayout } from './components/layout/PortalLayout'

const Landing = lazy(() => import('./pages/Landing'))
const HowItWorks = lazy(() => import('./pages/HowItWorks'))
const Marketplace = lazy(() => import('./pages/Marketplace'))
const Impact = lazy(() => import('./pages/Impact'))
const AuthPage = lazy(() => import('./pages/auth/AuthPage'))
const BuyerDashboard = lazy(() => import('./pages/buyer/BuyerDashboard'))
const BuyerWallet = lazy(() => import('./pages/buyer/BuyerWallet'))
const BuyerTransactions = lazy(() => import('./pages/buyer/BuyerTransactions'))
const SellerDashboard = lazy(() => import('./pages/seller/SellerDashboard'))
const SellerOffers = lazy(() => import('./pages/seller/SellerOffers'))
const SellerTransactions = lazy(() => import('./pages/seller/SellerTransactions'))
const EnergyFlow = lazy(() => import('./pages/EnergyFlow'))
const Forecast = lazy(() => import('./pages/Forecast'))
const Ussd = lazy(() => import('./pages/Ussd'))
const Settings = lazy(() => import('./pages/Settings'))
const NotFound = lazy(() => import('./pages/NotFound'))

function PageFallback() {
  return (
    <div className="flex min-h-[50dvh] items-center justify-center text-sm text-ink-muted" role="status">
      Loading…
    </div>
  )
}

/** Settings is for any signed-in account. Anonymous visitors go to buyer login. */
function RequireSignedIn({ children }: { children: ReactNode }) {
  const { account } = useAuth()
  if (!account) return <Navigate to="/buyer/login" replace />
  return <>{children}</>
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Suspense fallback={<PageFallback />}>
          <Routes>
            <Route element={<SiteLayout />}>
              <Route index element={<Landing />} />
              <Route path="how-it-works" element={<HowItWorks />} />
              <Route path="marketplace" element={<Marketplace />} />
              <Route path="impact" element={<Impact />} />
              <Route path="energy-flow" element={<EnergyFlow />} />
              <Route path="forecast" element={<Forecast />} />
              <Route path="ussd" element={<Ussd />} />
              <Route path="settings" element={<RequireSignedIn><Settings /></RequireSignedIn>} />
              <Route path="buyer/login" element={<AuthPage role="buyer" mode="login" />} />
              <Route path="buyer/register" element={<AuthPage role="buyer" mode="register" />} />
              <Route path="seller/login" element={<AuthPage role="seller" mode="login" />} />
              <Route path="seller/register" element={<AuthPage role="seller" mode="register" />} />
              <Route path="*" element={<NotFound />} />
            </Route>

            <Route element={<RequireRole role="buyer"><PortalLayout role="buyer" /></RequireRole>}>
              <Route path="buyer/dashboard" element={<BuyerDashboard />} />
              <Route path="buyer/wallet" element={<BuyerWallet />} />
              <Route path="buyer/transactions" element={<BuyerTransactions />} />
            </Route>

            <Route element={<RequireRole role="seller"><PortalLayout role="seller" /></RequireRole>}>
              <Route path="seller/dashboard" element={<SellerDashboard />} />
              <Route path="seller/offers" element={<SellerOffers />} />
              <Route path="seller/transactions" element={<SellerTransactions />} />
            </Route>
          </Routes>
        </Suspense>
      </AuthProvider>
    </BrowserRouter>
  )
}
