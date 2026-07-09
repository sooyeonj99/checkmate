import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { ThemeProvider } from './context/ThemeContext'
import HomePage from './pages/HomePage'
import UploadPage from './pages/UploadPage'
import LoadingPage from './pages/LoadingPage'
import ResultPage from './pages/ResultPage'
import AuthPage from './pages/AuthPage'
import DashboardPage from './pages/DashboardPage'
import MaskingPage from './pages/MaskingPage'
import TermsPage from './pages/TermsPage'
import PrivacyPage from './pages/PrivacyPage'
import ComingSoonPage from './pages/ComingSoonPage'
import VerifyEmailPage from './pages/VerifyEmailPage'
import ResetPasswordPage from './pages/ResetPasswordPage'
import SigningPage from './pages/SigningPage'
import TemplateEditorPage from './pages/TemplateEditorPage'
import TeamAcceptPage from './pages/TeamAcceptPage'
import ProfilePage from './pages/ProfilePage'
import SitemapPage from './pages/SitemapPage'
import FranchisePage from './pages/FranchisePage'
import AdminPage from './pages/AdminPage'
import ComparePage from './pages/ComparePage'
import GeneratePage from './pages/GeneratePage'
import BulkPage from './pages/BulkPage'
import StatsPage from './pages/StatsPage'
import LawTrackerPage from './pages/LawTrackerPage'
import ChatWidget from './components/ChatWidget'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isLoggedIn } = useAuth()
  return isLoggedIn ? <>{children}</> : <Navigate to="/auth" replace />
}

function AppRoutes() {
  return (
    <>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/upload" element={<ProtectedRoute><UploadPage /></ProtectedRoute>} />
        <Route path="/masking" element={<ProtectedRoute><MaskingPage /></ProtectedRoute>} />
        <Route path="/loading" element={<ProtectedRoute><LoadingPage /></ProtectedRoute>} />
        <Route path="/result" element={<ProtectedRoute><ResultPage /></ProtectedRoute>} />
        <Route path="/auth" element={<AuthPage />} />
        <Route path="/terms" element={<TermsPage />} />
        <Route path="/privacy" element={<PrivacyPage />} />
        <Route path="/coming-soon" element={<ComingSoonPage />} />
        <Route path="/verify-email" element={<VerifyEmailPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/sign/:token" element={<SigningPage />} />
        <Route path="/template-editor" element={<ProtectedRoute><TemplateEditorPage /></ProtectedRoute>} />
        <Route path="/template-editor/:id" element={<ProtectedRoute><TemplateEditorPage /></ProtectedRoute>} />
        <Route path="/team/accept" element={<TeamAcceptPage />} />
        <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
        <Route path="/sitemap" element={<SitemapPage />} />
        <Route path="/franchise" element={<ProtectedRoute><FranchisePage /></ProtectedRoute>} />
        <Route path="/franchise/accept" element={<ProtectedRoute><FranchisePage /></ProtectedRoute>} />
        <Route path="/admin" element={<ProtectedRoute><AdminPage /></ProtectedRoute>} />
        <Route path="/compare" element={<ProtectedRoute><ComparePage /></ProtectedRoute>} />
        <Route path="/generate" element={<ProtectedRoute><GeneratePage /></ProtectedRoute>} />
        <Route path="/bulk" element={<ProtectedRoute><BulkPage /></ProtectedRoute>} />
        <Route path="/stats" element={<ProtectedRoute><StatsPage /></ProtectedRoute>} />
        <Route path="/law-tracker" element={<ProtectedRoute><LawTrackerPage /></ProtectedRoute>} />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <DashboardPage />
            </ProtectedRoute>
          }
        />
      </Routes>
      <ChatWidget />
    </>
  )
}

export default function App() {
  return (
    <BrowserRouter basename="/checkmate">
      <ThemeProvider>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  )
}
