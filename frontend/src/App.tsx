import { BrowserRouter, Routes, Route } from 'react-router-dom'
import HomePage from './pages/HomePage'
import UploadPage from './pages/UploadPage'
import LoadingPage from './pages/LoadingPage'
import ResultPage from './pages/ResultPage'
import AuthPage from './pages/AuthPage'
import DashboardPage from './pages/DashboardPage'
import ChatWidget from './components/ChatWidget'

export default function App() {
  return (
    <BrowserRouter basename="/checkmate">
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/upload" element={<UploadPage />} />
        <Route path="/loading" element={<LoadingPage />} />
        <Route path="/result" element={<ResultPage />} />
        <Route path="/auth" element={<AuthPage />} />
        <Route path="/dashboard" element={<DashboardPage />} />
      </Routes>
      <ChatWidget />
    </BrowserRouter>
  )
}
