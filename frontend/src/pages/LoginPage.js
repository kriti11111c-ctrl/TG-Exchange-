import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth, API, useTheme } from "../App";
import axios from "axios";
import { toast } from "sonner";
import { Vault, EnvelopeSimple, Lock, ShieldCheck, Sun, Moon } from "@phosphor-icons/react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";

const LoginPage = () => {
  const { isDark, toggleTheme } = useTheme();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [totpCode, setTotpCode] = useState("");
  const [requires2FA, setRequires2FA] = useState(false);
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  // Theme colors
  const bg = isDark ? 'bg-[#0A0A0A]' : 'bg-gray-50';
  const cardBg = isDark ? 'bg-[#12121A]' : 'bg-white';
  const text = isDark ? 'text-white' : 'text-gray-900';
  const textMuted = isDark ? 'text-[#8F8F9D]' : 'text-gray-600';
  const inputBg = isDark ? 'bg-[#12121A]' : 'bg-white';
  const inputBorder = isDark ? 'border-white/20' : 'border-gray-300';
  const dividerBorder = isDark ? 'border-white/10' : 'border-gray-200';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const payload = { email, password };
      if (requires2FA && totpCode) {
        payload.totp_code = totpCode;
      }

      const response = await axios.post(`${API}/auth/login`, payload, { withCredentials: true });

      login(response.data.user, response.data.access_token);
      toast.success("Login successful!");
      navigate("/dashboard");
    } catch (error) {
      const detail = error.response?.data?.detail;
      
      // Check if 2FA is required
      if (detail === "2FA_REQUIRED" || error.response?.status === 403) {
        setRequires2FA(true);
        toast.info("Please enter your 2FA code");
      } else if (detail === "Invalid 2FA code") {
        toast.error("Invalid 2FA code. Please try again.");
        setTotpCode("");
      } else {
        toast.error(detail || "Login failed");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`min-h-screen ${bg} flex relative overflow-hidden`}>
      {/* Cinematic Background Effects */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Animated Gradient Orbs */}
        <div className="absolute top-20 -left-20 w-72 h-72 bg-[#00E5FF]/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-20 -right-20 w-96 h-96 bg-[#00E5FF]/10 rounded-full blur-3xl animate-pulse" style={{animationDelay: '1s'}}></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-gradient-radial from-[#00E5FF]/5 to-transparent rounded-full"></div>
        
        {/* Grid Pattern */}
        <div className="absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: 'linear-gradient(rgba(0,229,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(0,229,255,0.5) 1px, transparent 1px)',
          backgroundSize: '60px 60px'
        }}></div>
        
        {/* Floating Particles */}
        <div className="absolute top-[20%] left-[10%] w-2 h-2 bg-[#00E5FF]/40 rounded-full animate-bounce" style={{animationDuration: '3s'}}></div>
        <div className="absolute top-[60%] left-[80%] w-1.5 h-1.5 bg-[#00E5FF]/30 rounded-full animate-bounce" style={{animationDuration: '4s', animationDelay: '1s'}}></div>
        <div className="absolute top-[80%] left-[20%] w-1 h-1 bg-[#00E5FF]/50 rounded-full animate-bounce" style={{animationDuration: '2.5s', animationDelay: '0.5s'}}></div>
      </div>

      {/* Form Container */}
      <div className="flex-1 flex items-center justify-center p-8 relative z-10">
        <div className="w-full max-w-md space-y-8">
          {/* Theme Toggle */}
          <div className="flex justify-end">
            <button
              onClick={toggleTheme}
              className={`p-2.5 rounded-xl ${isDark ? 'bg-white/5 hover:bg-white/10' : 'bg-black/5 hover:bg-black/10'} backdrop-blur-sm border ${isDark ? 'border-white/10' : 'border-gray-200'} transition-all duration-300 hover:scale-105`}
            >
              {isDark ? <Sun size={20} className="text-[#00E5FF]" /> : <Moon size={20} className="text-gray-600" />}
            </button>
          </div>
          
          {/* Logo with Glow */}
          <Link to="/" className="flex items-center gap-4 mb-12 group" data-testid="login-logo">
            <div className="relative">
              <div className="absolute inset-0 bg-[#00E5FF] rounded-full blur-xl opacity-30 group-hover:opacity-50 transition-opacity duration-500"></div>
              <div className="w-14 h-14 rounded-full overflow-hidden bg-black ring-2 ring-[#00E5FF]/50 relative z-10 group-hover:ring-[#00E5FF] transition-all duration-300">
                <img src="/images/tg-logo.png" alt="TG Exchange" className="w-full h-full object-cover" />
              </div>
            </div>
            <span className={`font-bold text-2xl tracking-tight ${text} group-hover:text-[#00E5FF] transition-colors duration-300`} style={{ fontFamily: 'Unbounded' }}>
              TG Exchange
            </span>
          </Link>

          <div className="space-y-2">
            <h1 
              className={`text-4xl font-bold ${text}`}
              style={{ fontFamily: 'Unbounded' }}
              data-testid="login-title"
            >
              Welcome
              <span className="block text-[#00E5FF]">Back</span>
            </h1>
            <p className={`${textMuted} text-lg`}>Enter your credentials to access your account</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="email" className={textMuted}>Email</Label>
              <div className="relative group">
                <EnvelopeSimple 
                  size={20} 
                  className={`absolute left-4 top-1/2 -translate-y-1/2 ${textMuted} group-focus-within:text-[#00E5FF] transition-colors`}
                />
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  className={`pl-12 py-6 ${inputBg} ${inputBorder} focus:border-[#00E5FF] focus:ring-[#00E5FF]/20 ${text} rounded-xl transition-all duration-300 hover:border-[#00E5FF]/50`}
                  required
                  data-testid="login-email-input"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className={textMuted}>Password</Label>
              <div className="relative group">
                <Lock 
                  size={20} 
                  className={`absolute left-4 top-1/2 -translate-y-1/2 ${textMuted} group-focus-within:text-[#00E5FF] transition-colors`}
                />
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className={`pl-12 py-6 ${inputBg} ${inputBorder} focus:border-[#00E5FF] focus:ring-[#00E5FF]/20 ${text} rounded-xl transition-all duration-300 hover:border-[#00E5FF]/50`}
                  required
                  data-testid="login-password-input"
                />
              </div>
            </div>

            {/* 2FA Code Input - Shows when required */}
            {requires2FA && (
              <div className="space-y-2">
                <Label htmlFor="totp" className={`${textMuted} flex items-center gap-2`}>
                  <ShieldCheck size={16} className="text-[#00E599]" />
                  2FA Code (Google Authenticator)
                </Label>
                <div className="relative">
                  <ShieldCheck 
                    size={20} 
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-[#00E599]" 
                  />
                  <Input
                    id="totp"
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    value={totpCode}
                    onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, ''))}
                    placeholder="Enter 6-digit code"
                    className={`pl-10 py-6 ${inputBg} border-[#00E599]/50 focus:border-[#00E599] focus:ring-[#00E599] text-center text-xl tracking-widest font-mono ${text}`}
                    autoFocus
                    data-testid="login-2fa-input"
                  />
                </div>
                <p className={`text-xs ${textMuted}`}>
                  Open Google Authenticator app and enter the 6-digit code
                </p>
              </div>
            )}

            <Button
              type="submit"
              disabled={loading}
              className="w-full py-6 bg-[#00E5FF] hover:bg-[#00E5FF]/90 text-black font-bold text-lg rounded-xl shadow-lg shadow-[#00E5FF]/25 hover:shadow-[#00E5FF]/40 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
              data-testid="login-submit-btn"
            >
              {loading ? "Signing in..." : "Sign In"}
            </Button>
          </form>

          <p className={`text-center ${textMuted}`}>
            Don't have an account?{" "}
            <Link to="/register" className="text-[#00E5FF] hover:text-[#00E5FF]/80 font-semibold transition-colors" data-testid="login-register-link">
              Create one
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
