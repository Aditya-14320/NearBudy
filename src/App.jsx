import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import PageSkeleton from './components/PageSkeleton';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';

// Lazy-load all pages for code splitting
const SplashScreen  = lazy(() => import('./pages/SplashScreen'));
const Welcome       = lazy(() => import('./pages/Welcome'));
const ProfileSetup  = lazy(() => import('./pages/ProfileSetup'));
const Home          = lazy(() => import('./pages/Home'));
const MapPage       = lazy(() => import('./pages/MapPage'));
const Profile       = lazy(() => import('./pages/Profile'));
const Notifications = lazy(() => import('./pages/Notifications'));
const Connections   = lazy(() => import('./pages/Connections'));
const ChatScreen    = lazy(() => import('./pages/ChatScreen'));
const ChatsPage     = lazy(() => import('./pages/ChatsPage'));
const PrivacyPolicy = lazy(() => import('./pages/Policy'));
const Terms         = lazy(() => import('./pages/Terms'));

function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<PageSkeleton />}>
        <Routes>
          <Route path="/" element={<SplashScreen />} />
          <Route path="/welcome" element={<Welcome />} />
          <Route path="/privacy" element={<PrivacyPolicy />} />
          <Route path="/terms" element={<Terms />} />
          <Route path="/profile-setup" element={<ProtectedRoute allowOnboarding><ProfileSetup /></ProtectedRoute>} />
          <Route path="/chat/:id" element={<ProtectedRoute><ChatScreen /></ProtectedRoute>} />
          <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
            <Route path="/home" element={<Home />} />
            <Route path="/map" element={<MapPage />} />
            <Route path="/chats" element={<ChatsPage />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/notifications" element={<Notifications />} />
            <Route path="/connections" element={<Connections />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}

export default App;
