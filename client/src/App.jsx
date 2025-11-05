import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { SocketProvider, useSocket } from './contexts/SocketContext';
import { useEffect } from 'react';
import Login from './components/Auth/Login';
import ChatRoom from './components/Chat/ChatRoom';

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  const { connect } = useSocket();

  useEffect(() => {
    if (user) {
      console.log('Connecting user to socket:', user);
      connect(user.id);
    }
  }, [user]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!user) {
    console.log('No user found, redirecting to login');
    return <Navigate to="/login" replace />;
  }

  console.log('ProtectedRoute user:', user);
  return children;
};

function App() {
  return (
    <AuthProvider>
      <SocketProvider>
        <BrowserRouter future={{ v7_startTransition: true }}>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route
              path="/chat/:roomId"
              element={
                <ProtectedRoute>
                  <ChatRoom />
                </ProtectedRoute>
              }
            />
            <Route path="/" element={<Navigate to="/login" replace />} />
          </Routes>
        </BrowserRouter>
      </SocketProvider>
    </AuthProvider>
  );
}

export default App;