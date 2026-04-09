import { useState, useEffect, useCallback, createContext, useContext, lazy, Suspense } from "react";
import "@/App.css";
import { BrowserRouter, Routes, Route, useNavigate, useLocation, Navigate, Link } from "react-router-dom";
import axios from "axios";
import { Toaster, toast } from "sonner";

// Components
import LoadingPage from "./components/LoadingPage";

// Critical Pages (load immediately)
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import Dashboard from "./pages/Dashboard";

// Lazy loaded pages (load on demand)
const WalletPage = lazy(() => import("./pages/WalletPage"));
const TradePage = lazy(() => import("./pages/TradePage"));
const TransactionsPage = lazy(() => import("./pages/TransactionsPage"));
const ProfilePage = lazy(() => import("./pages/ProfilePage"));
const ReferralPage = lazy(() => import("./pages/ReferralPage"));
const RankPage = lazy(() => import("./pages/RankPage"));
const TeamRankPage = lazy(() => import("./pages/TeamRankPage"));
const SecurityPage = lazy(() => import("./pages/SecurityPage"));
const DepositPage = lazy(() => import("./pages/DepositPage"));
const WithdrawPage = lazy(() => import("./pages/WithdrawPage"));
const StakingPage = lazy(() => import("./pages/StakingPage"));
const FuturesPage = lazy(() => import("./pages/FuturesPage"));
const MarketsPage = lazy(() => import("./pages/MarketsPage"));
const TradeHistoryPage = lazy(() => import("./pages/TradeHistoryPage"));
const KYCPage = lazy(() => import("./pages/KYCPage"));

// Admin Pages (lazy loaded)
const AdminLoginPage = lazy(() => import("./pages/AdminLoginPage"));
const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));
const AdminDepositsPage = lazy(() => import("./pages/AdminDepositsPage"));
const AdminUsersPage = lazy(() => import("./pages/AdminUsersPage"));
const AdminWithdrawalsPage = lazy(() => import("./pages/AdminWithdrawalsPage"));

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
export const API = `${BACKEND_URL}/api`;

// Configure axios defaults for faster responses
axios.defaults.timeout = 10000; // 10 second timeout (reduced from 15)

// Request deduplication cache
const pendingRequests = new Map();

// Axios interceptor to add auth token and deduplicate requests
axios.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('auth_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    config.withCredentials = true;
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Theme Context
const ThemeContext = createContext(null);

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return context;
};

// Theme Provider
const ThemeProvider = ({ children }) => {
  const [isDark, setIsDark] = useState(() => {
    const saved = localStorage.getItem('theme');
    return saved ? saved === 'dark' : true; // Default to dark
  });

  useEffect(() => {
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
  }, [isDark]);

  const toggleTheme = () => setIsDark(!isDark);

  return (
    <ThemeContext.Provider value={{ isDark, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

// Auth Context
const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
};

// Auth Provider
const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem('auth_token'));
  const [loading, setLoading] = useState(true);

  const checkAuth = useCallback(async () => {
    // CRITICAL: If returning from OAuth callback, skip the /me check.
    // AuthCallback will exchange the session_id and establish the session first.
    if (window.location.hash?.includes('session_id=')) {
      setLoading(false);
      return;
    }

    try {
      // Check for auth_token in localStorage (for admin impersonation)
      const authToken = localStorage.getItem('auth_token');
      const config = {
        withCredentials: true
      };
      
      // If auth_token exists, add Authorization header
      if (authToken) {
        config.headers = {
          Authorization: `Bearer ${authToken}`
        };
        setToken(authToken);
      }
      
      const response = await axios.get(`${API}/auth/me`, config);
      setUser(response.data);
    } catch (error) {
      setUser(null);
      setToken(null);
      // Clear invalid auth_token if exists
      localStorage.removeItem('auth_token');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const login = (userData, newToken) => {
    setUser(userData);
    if (newToken) {
      localStorage.setItem('auth_token', newToken);
      setToken(newToken);
    }
  };

  const logout = async () => {
    try {
      await axios.post(`${API}/auth/logout`, {}, { withCredentials: true });
    } catch (error) {
      console.error("Logout error:", error);
    }
    setUser(null);
    setToken(null);
    localStorage.removeItem('auth_token');
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout, checkAuth }}>
      {children}
    </AuthContext.Provider>
  );
};

// Mini Candle Loader for Auth checks (inline version to avoid circular dependency)
const MiniCandleLoader = () => {
  const candles = [...Array(6)].map((_, i) => ({
    id: i,
    isGreen: i % 2 === 0,
    height: 20 + (i * 8),
    delay: i * 0.08
  }));

  return (
    <div className="fixed inset-0 bg-[#0B0E11] flex flex-col items-center justify-center z-[9999]">
      <div className="flex items-end justify-center gap-1 h-16 mb-4">
        {candles.map((candle) => (
          <div key={candle.id} className="flex flex-col items-center">
            <div 
              className={`w-[1px] ${candle.isGreen ? 'bg-[#0ECB81]' : 'bg-[#F6465D]'}`}
              style={{
                height: '6px',
                animation: 'candleWick 1s ease-in-out infinite',
                animationDelay: `${candle.delay}s`
              }}
            />
            <div 
              className={`w-2 rounded-sm ${candle.isGreen ? 'bg-[#0ECB81]' : 'bg-[#F6465D]'}`}
              style={{
                height: `${candle.height}px`,
                animation: 'candleGrow 1s ease-in-out infinite',
                animationDelay: `${candle.delay}s`
              }}
            />
            <div 
              className={`w-[1px] ${candle.isGreen ? 'bg-[#0ECB81]' : 'bg-[#F6465D]'}`}
              style={{
                height: '4px',
                animation: 'candleWick 1s ease-in-out infinite',
                animationDelay: `${candle.delay}s`
              }}
            />
          </div>
        ))}
      </div>
      <p className="text-[#848E9C] text-sm">Loading...</p>
    </div>
  );
};

// Mini Page Loader for lazy loading
const PageLoader = () => (
  <div className="fixed inset-0 bg-[#0B0E11] flex items-center justify-center z-50">
    <div className="flex flex-col items-center">
      <div className="w-8 h-8 border-2 border-[#F0B90B] border-t-transparent rounded-full animate-spin"></div>
      <p className="text-[#848E9C] text-sm mt-2">Loading...</p>
    </div>
  </div>
);

// Protected Route
const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <MiniCandleLoader />;
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
};

// Auth Callback Component
const AuthCallback = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const location = useLocation();

  useEffect(() => {
    const processSession = async () => {
      const hash = window.location.hash;
      const sessionId = hash.split('session_id=')[1];
      
      if (!sessionId) {
        navigate('/login');
        return;
      }

      try {
        const response = await axios.post(`${API}/auth/session`, {
          session_id: sessionId
        }, { withCredentials: true });

        login(response.data);
        toast.success("Login successful!");
        navigate('/dashboard', { replace: true });
      } catch (error) {
        console.error("Auth callback error:", error);
        toast.error("Authentication failed");
        navigate('/login');
      }
    };

    processSession();
  }, [navigate, login, location]);

  return <MiniCandleLoader />;
};

// App Router
function AppRouter() {
  const location = useLocation();
  const { user, loading } = useAuth();
  
  // Check URL fragment for session_id (OAuth callback)
  if (location.hash?.includes('session_id=')) {
    return <AuthCallback />;
  }

  // Check for referral code in URL - redirect to register
  const searchParams = new URLSearchParams(location.search);
  const refCode = searchParams.get('ref');
  
  // If "/" route and has referral code, redirect to register with ref code
  if (location.pathname === '/' && refCode) {
    return <Navigate to={`/register?ref=${refCode}`} replace />;
  }
  
  // CRITICAL: Wait for auth check to complete before redirecting
  // This fixes admin "Login as User" which sets auth_token and navigates to "/"
  if (loading && location.pathname === '/') {
    return <MiniCandleLoader />;
  }
  
  // If "/" route and no user, redirect to login
  if (location.pathname === '/' && !user) {
    return <Navigate to="/login" replace />;
  }
  
  // If "/" route and user is logged in, redirect to dashboard
  if (location.pathname === '/' && user) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/dashboard" element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        } />
        <Route path="/wallet" element={
          <ProtectedRoute>
            <WalletPage />
          </ProtectedRoute>
        } />
        <Route path="/trade" element={
          <ProtectedRoute>
            <TradePage />
          </ProtectedRoute>
        } />
        <Route path="/transactions" element={
          <ProtectedRoute>
            <TransactionsPage />
          </ProtectedRoute>
        } />
        <Route path="/profile/*" element={
          <ProtectedRoute>
            <ProfilePage />
          </ProtectedRoute>
        } />
        <Route path="/profile/security" element={
          <ProtectedRoute>
            <SecurityPage />
          </ProtectedRoute>
        } />
        <Route path="/referral" element={
          <ProtectedRoute>
            <ReferralPage />
          </ProtectedRoute>
        } />
        <Route path="/rank" element={
          <ProtectedRoute>
            <RankPage />
          </ProtectedRoute>
        } />
        <Route path="/team-rank" element={
          <ProtectedRoute>
            <TeamRankPage />
          </ProtectedRoute>
        } />
        <Route path="/deposit" element={
          <ProtectedRoute>
            <DepositPage />
          </ProtectedRoute>
        } />
        <Route path="/withdraw" element={
          <ProtectedRoute>
            <WithdrawPage />
          </ProtectedRoute>
        } />
        <Route path="/staking" element={
          <ProtectedRoute>
            <StakingPage />
          </ProtectedRoute>
        } />
        <Route path="/futures" element={
          <ProtectedRoute>
            <FuturesPage />
          </ProtectedRoute>
        } />
        <Route path="/markets" element={
          <ProtectedRoute>
            <MarketsPage />
          </ProtectedRoute>
        } />
        <Route path="/trade-history" element={
          <ProtectedRoute>
            <TradeHistoryPage />
          </ProtectedRoute>
        } />
        <Route path="/kyc" element={
          <ProtectedRoute>
            <KYCPage />
          </ProtectedRoute>
        } />
        
        {/* Admin Routes */}
        <Route path="/admin" element={<AdminLoginPage />} />
        <Route path="/admin/dashboard" element={<AdminDashboard />} />
        <Route path="/admin/deposits" element={<AdminDepositsPage />} />
        <Route path="/admin/withdrawals" element={<AdminWithdrawalsPage />} />
        <Route path="/admin/users" element={<AdminUsersPage />} />
      </Routes>
    </Suspense>
  );
}

function App() {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  );
}

function AppContent() {
  const { isDark } = useTheme();
  const [showLoading, setShowLoading] = useState(true);
  
  // Show loading page on first visit
  useEffect(() => {
    const hasVisited = sessionStorage.getItem('tg_visited');
    if (hasVisited) {
      setShowLoading(false);
    }
  }, []);

  const handleLoadingComplete = () => {
    sessionStorage.setItem('tg_visited', 'true');
    setShowLoading(false);
  };

  if (showLoading) {
    return <LoadingPage onComplete={handleLoadingComplete} />;
  }
  
  return (
    <div className={`min-h-screen transition-colors duration-300 ${isDark ? 'bg-[#0B0E11]' : 'bg-[#FAFAFA]'}`}>
      {isDark && <div className="noise-overlay" />}
      <BrowserRouter>
        <AuthProvider>
          <AppRouter />
          <Toaster 
            position="top-right" 
            toastOptions={{
              style: {
                background: isDark ? '#1E2329' : '#FFFFFF',
                border: isDark ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(0,0,0,0.1)',
                color: isDark ? '#fff' : '#1E2329'
              }
            }}
          />
        </AuthProvider>
      </BrowserRouter>
    </div>
  );
}

export default App;
