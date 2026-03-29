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
    <div className={`min-h-screen ${bg} flex`}>
      {/* Left side - Form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md space-y-8">
          {/* Theme Toggle */}
          <div className="flex justify-end">
            <button
              onClick={toggleTheme}
              className={`p-2 rounded-lg ${isDark ? 'bg-[#12121A] hover:bg-[#1E1E2A]' : 'bg-white hover:bg-gray-100'} border ${isDark ? 'border-white/10' : 'border-gray-200'}`}
            >
              {isDark ? <Sun size={20} className="text-[#00E5FF]" /> : <Moon size={20} className="text-gray-600" />}
            </button>
          </div>
          
          {/* Logo */}
          <Link to="/" className="flex items-center gap-3 mb-12" data-testid="login-logo">
            <div className="w-12 h-12 rounded-full overflow-hidden bg-black ring-2 ring-[#00E5FF]/30">
              <img src="/images/tg-logo.png" alt="TG Exchange" className="w-full h-full object-cover" />
            </div>
            <span className={`font-bold text-xl tracking-tight ${text}`} style={{ fontFamily: 'Unbounded' }}>
              TG Exchange
            </span>
          </Link>

          <div>
            <h1 
              className={`text-3xl font-bold mb-2 ${text}`}
              style={{ fontFamily: 'Unbounded' }}
              data-testid="login-title"
            >
              Welcome Back
            </h1>
            <p className={textMuted}>Enter your credentials to access your account</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="email" className={textMuted}>Email</Label>
              <div className="relative">
                <EnvelopeSimple 
                  size={20} 
                  className={`absolute left-3 top-1/2 -translate-y-1/2 ${textMuted}`}
                />
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  className={`pl-10 py-6 ${inputBg} ${inputBorder} focus:border-[#00E599] focus:ring-[#00E599] ${text}`}
                  required
                  data-testid="login-email-input"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className={textMuted}>Password</Label>
              <div className="relative">
                <Lock 
                  size={20} 
                  className={`absolute left-3 top-1/2 -translate-y-1/2 ${textMuted}`}
                />
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className={`pl-10 py-6 ${inputBg} ${inputBorder} focus:border-[#00E599] focus:ring-[#00E599] ${text}`}
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
              className="w-full py-6 bg-[#00E599] hover:bg-[#00C282] text-black font-semibold"
              data-testid="login-submit-btn"
            >
              {loading ? "Signing in..." : "Sign In"}
            </Button>
          </form>

          <p className={`text-center ${textMuted}`}>
            Don't have an account?{" "}
            <Link to="/register" className="text-[#00E599] hover:underline" data-testid="login-register-link">
              Create one
            </Link>
          </p>
        </div>
      </div>

      {/* Right side - Image */}
      <div className="hidden lg:block lg:flex-1 relative">
        <img
          src="https://images.unsplash.com/photo-1642413598014-7742a18e85aa?w=1200&q=80"
          alt="Crypto"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className={`absolute inset-0 bg-gradient-to-l from-transparent ${isDark ? 'to-[#0A0A0A]' : 'to-gray-50'}`} />
      </div>
    </div>
  );
};

export default LoginPage;
