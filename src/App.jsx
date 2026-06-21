import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import SplashScreen from './pages/SplashScreen';
import Login from './pages/Login';
import ProfileSetup from './pages/ProfileSetup';
import Home from './pages/Home';
import MapPage from './pages/MapPage';
import Profile from './pages/Profile';
import Notifications from './pages/Notifications';
import Connections from './pages/Connections';
import ChatScreen from './pages/ChatScreen';
import ChatsPage from './pages/ChatsPage';
import PrivacyPolicy from './pages/Policy';
import Terms from './pages/Terms';
import DeleteAccount from './pages/DeleteAccount';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<SplashScreen />} />
        <Route path="/login" element={<Login />} />
        <Route path="/privacy" element={<PrivacyPolicy />} />
        <Route path="/terms" element={<Terms />} />

        {/* Protected Profile Setup (requires auth check) */}
        <Route path="/profile-setup" element={<ProtectedRoute allowOnboarding><ProfileSetup /></ProtectedRoute>} />
        
        {/* Protected Chat Screen (requires auth check but no global bottom navigation) */}
        <Route path="/chat/:id" element={<ProtectedRoute><ChatScreen /></ProtectedRoute>} />
        
        {/* Protected Delete Account */}
        <Route path="/delete-account" element={<ProtectedRoute><DeleteAccount /></ProtectedRoute>} />
        
        {/* Protected/Main App Routes wrapped in Layout */}
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
    </BrowserRouter>
  );
}

export default App;

