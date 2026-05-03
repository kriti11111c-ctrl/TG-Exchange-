import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth, API, useTheme } from "../App";
import axios from "axios";
import { toast } from "sonner";
import { 
  EnvelopeSimple, 
  Lock, 
  ShieldCheck, 
  Sun, 
  Moon,
  Eye,
  EyeSlash,
  ArrowRight,
  CheckCircle,
  Globe,
  Lightning,
  LockKey,
  Fingerprint,
  Phone
} from "@phosphor-icons/react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";

const LoginPage = () => {
  const { isDark, toggleTheme } = useTheme();
  const [loginMethod, setLoginMethod] = useState("email"); // "email" or "phone"
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [totpCode, setTotpCode] = useState("");
  const [requires2FA, setRequires2FA] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Use email or phone based on login method
      const loginIdentifier = loginMethod === "email" ? email : `${phone}@phone.tgxchange.com`;
      
      const payload = { email: loginIdentifier, password };
      if (requires2FA && totpCode) {
        payload.totp_code = totpCode;
      }

      const response = await axios.post(`${API}/auth/login`, payload, { withCredentials: true });

      login(response.data.user, response.data.access_token);
      toast.success("Login successful!");
      navigate("/dashboard");
    } catch (error) {
      const detail = error.response?.data?.detail;
      
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
    <div className="min-h-screen bg-[#0B0E11] flex relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Gradient Mesh */}
        <div className="absolute top-0 left-0 w-full h-full">
          <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] bg-[#00E5FF]/10 rounded-full blur-[120px]"></div>
          <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] bg-[#F0B90B]/10 rounded-full blur-[120px]"></div>
          <div className="absolute top-[40%] right-[20%] w-[300px] h-[300px] bg-[#0ECB81]/10 rounded-full blur-[100px]"></div>
        </div>
        
        {/* Grid Pattern */}
        <div className="absolute inset-0 opacity-[0.02]" style={{
          backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
          backgroundSize: '50px 50px'
        }}></div>
      </div>

      {/* Left Side - Branding & Features (Hidden on mobile) */}
      <div className="hidden lg:flex flex-1 flex-col justify-center items-center p-12 relative z-10">
        <div className="max-w-lg">
          {/* Logo */}
          <div className="flex items-center gap-4 mb-12">
            <div className="relative">
              <div className="absolute inset-0 bg-[#00E5FF] rounded-full blur-2xl opacity-40"></div>
              <div className="w-16 h-16 rounded-full overflow-hidden bg-black ring-2 ring-[#00E5FF]/50 relative z-10">
                <img src="/images/tg-logo.png" alt="TG Exchange" className="w-full h-full object-cover" />
              </div>
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white" style={{ fontFamily: 'Unbounded' }}>TG Exchange</h1>
              <p className="text-[#848E9C] text-sm">Trade Genius Platform</p>
            </div>
          </div>

          {/* Tagline */}
          <h2 className="text-5xl font-bold text-white mb-6 leading-tight" style={{ fontFamily: 'Unbounded' }}>
            Trade Like a
            <span className="block bg-gradient-to-r from-[#00E5FF] via-[#0ECB81] to-[#F0B90B] bg-clip-text text-transparent">
              Genius
            </span>
          </h2>
          <p className="text-[#848E9C] text-lg mb-12">
            Join millions of traders worldwide on the most trusted cryptocurrency exchange platform.
          </p>

          {/* Features */}
          <div className="space-y-4">
            <div className="flex items-center gap-4 p-4 rounded-2xl bg-gradient-to-r from-[#1E2329]/80 to-transparent border border-[#2B3139]/50 backdrop-blur-sm">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#00E5FF] to-[#00E5FF]/50 flex items-center justify-center">
                <Lightning size={24} className="text-white" weight="fill" />
              </div>
              <div>
                <h3 className="text-white font-semibold">Lightning Fast</h3>
                <p className="text-[#848E9C] text-sm">Execute trades in milliseconds</p>
              </div>
            </div>
            
            <div className="flex items-center gap-4 p-4 rounded-2xl bg-gradient-to-r from-[#1E2329]/80 to-transparent border border-[#2B3139]/50 backdrop-blur-sm">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#0ECB81] to-[#0ECB81]/50 flex items-center justify-center">
                <LockKey size={24} className="text-white" weight="fill" />
              </div>
              <div>
                <h3 className="text-white font-semibold">Bank-Grade Security</h3>
                <p className="text-[#848E9C] text-sm">Your assets are always safe</p>
              </div>
            </div>
            
            <div className="flex items-center gap-4 p-4 rounded-2xl bg-gradient-to-r from-[#1E2329]/80 to-transparent border border-[#2B3139]/50 backdrop-blur-sm">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#F0B90B] to-[#F0B90B]/50 flex items-center justify-center">
                <Globe size={24} className="text-white" weight="fill" />
              </div>
              <div>
                <h3 className="text-white font-semibold">Global Access</h3>
                <p className="text-[#848E9C] text-sm">Trade anywhere, anytime</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Side - Login Form */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12 relative z-10">
        <div className="w-full max-w-md">
          {/* Mobile Logo */}
          <div className="lg:hidden flex items-center justify-center gap-3 mb-8">
            <div className="w-12 h-12 rounded-full overflow-hidden bg-black ring-2 ring-[#00E5FF]/50">
              <img src="/images/tg-logo.png" alt="TG Exchange" className="w-full h-full object-cover" />
            </div>
            <span className="text-2xl font-bold text-white" style={{ fontFamily: 'Unbounded' }}>TG Exchange</span>
          </div>

          {/* Login Card */}
          <div className="bg-[#1E2329]/80 backdrop-blur-xl rounded-3xl p-8 border border-[#2B3139] shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-2xl font-bold text-white mb-1">Welcome Back</h2>
                <p className="text-[#848E9C] text-sm">Sign in to continue trading</p>
              </div>
              <button
                onClick={toggleTheme}
                className="p-2.5 rounded-xl bg-[#2B3139] hover:bg-[#3B4149] transition-colors"
              >
                {isDark ? <Sun size={20} className="text-[#F0B90B]" /> : <Moon size={20} className="text-[#848E9C]" />}
              </button>
            </div>

            {/* Security Badge */}
            <div className="flex items-center gap-2 p-3 rounded-xl bg-[#0ECB81]/10 border border-[#0ECB81]/20 mb-6">
              <ShieldCheck size={20} className="text-[#0ECB81]" weight="fill" />
              <span className="text-[#0ECB81] text-sm font-medium">Secure SSL Encrypted Connection</span>
            </div>

            {/* Email/Phone Toggle */}
            <div className="flex bg-[#0B0E11] rounded-xl p-1 mb-6">
              <button
                type="button"
                onClick={() => setLoginMethod("email")}
                className={`flex-1 py-3 rounded-lg text-sm font-semibold transition-all ${
                  loginMethod === "email"
                    ? "bg-[#2B3139] text-white"
                    : "text-[#848E9C] hover:text-white"
                }`}
              >
                Email
              </button>
              <button
                type="button"
                onClick={() => setLoginMethod("phone")}
                className={`flex-1 py-3 rounded-lg text-sm font-semibold transition-all ${
                  loginMethod === "phone"
                    ? "bg-[#2B3139] text-white"
                    : "text-[#848E9C] hover:text-white"
                }`}
              >
                Phone
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Email or Phone */}
              {loginMethod === "email" ? (
                <div className="space-y-2">
                  <Label className="text-[#848E9C] text-sm font-medium">Email Address</Label>
                  <div className="relative group">
                    <EnvelopeSimple 
                      size={20} 
                      className="absolute left-4 top-1/2 -translate-y-1/2 text-[#848E9C] group-focus-within:text-[#00E5FF] transition-colors"
                    />
                    <Input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Enter your email"
                      className="pl-12 h-14 bg-[#0B0E11] border-[#2B3139] focus:border-[#00E5FF] focus:ring-1 focus:ring-[#00E5FF]/20 text-white rounded-xl transition-all placeholder:text-[#5E6673]"
                      required
                      data-testid="login-email-input"
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <Label className="text-[#848E9C] text-sm font-medium">Phone Number</Label>
                  <div className="relative group">
                    <Phone 
                      size={20} 
                      className="absolute left-4 top-1/2 -translate-y-1/2 text-[#848E9C] group-focus-within:text-[#00E5FF] transition-colors"
                    />
                    <Input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                      placeholder="Enter your phone number"
                      className="pl-12 h-14 bg-[#0B0E11] border-[#2B3139] focus:border-[#00E5FF] focus:ring-1 focus:ring-[#00E5FF]/20 text-white rounded-xl transition-all placeholder:text-[#5E6673]"
                      required
                      data-testid="login-phone-input"
                    />
                  </div>
                </div>
              )}

              {/* Password */}
              <div className="space-y-2">
                <Label className="text-[#848E9C] text-sm font-medium">Password</Label>
                <div className="relative group">
                  <Lock 
                    size={20} 
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-[#848E9C] group-focus-within:text-[#00E5FF] transition-colors"
                  />
                  <Input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    className="pl-12 pr-12 h-14 bg-[#0B0E11] border-[#2B3139] focus:border-[#00E5FF] focus:ring-1 focus:ring-[#00E5FF]/20 text-white rounded-xl transition-all placeholder:text-[#5E6673]"
                    required
                    data-testid="login-password-input"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-[#848E9C] hover:text-white transition-colors"
                  >
                    {showPassword ? <EyeSlash size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </div>

              {/* 2FA Code */}
              {requires2FA && (
                <div className="space-y-2">
                  <Label className="text-[#848E9C] text-sm font-medium flex items-center gap-2">
                    <Fingerprint size={16} className="text-[#F0B90B]" />
                    2FA Verification Code
                  </Label>
                  <div className="relative">
                    <ShieldCheck 
                      size={20} 
                      className="absolute left-4 top-1/2 -translate-y-1/2 text-[#F0B90B]" 
                    />
                    <Input
                      type="text"
                      inputMode="numeric"
                      maxLength={6}
                      value={totpCode}
                      onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, ''))}
                      placeholder="000000"
                      className="pl-12 h-14 bg-[#0B0E11] border-[#F0B90B]/30 focus:border-[#F0B90B] text-center text-2xl tracking-[0.5em] font-mono text-white rounded-xl"
                      autoFocus
                      data-testid="login-2fa-input"
                    />
                  </div>
                  <p className="text-xs text-[#848E9C]">
                    Enter the 6-digit code from Google Authenticator
                  </p>
                </div>
              )}

              {/* Forgot Password */}
              <div className="flex justify-end">
                <Link to="/forgot-password" className="text-[#00E5FF] hover:text-[#00E5FF]/80 text-sm font-medium transition-colors">
                  Forgot password?
                </Link>
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                disabled={loading}
                className="w-full h-14 bg-gradient-to-r from-[#00E5FF] to-[#00E5FF]/80 hover:from-[#00E5FF]/90 hover:to-[#00E5FF]/70 text-black font-bold text-lg rounded-xl shadow-lg shadow-[#00E5FF]/20 hover:shadow-[#00E5FF]/40 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2"
                data-testid="login-submit-btn"
              >
                {loading ? (
                  <div className="w-6 h-6 border-2 border-black/30 border-t-black rounded-full animate-spin"></div>
                ) : (
                  <>
                    Sign In
                    <ArrowRight size={20} weight="bold" />
                  </>
                )}
              </Button>
            </form>

            {/* Divider */}
            <div className="flex items-center gap-4 my-6">
              <div className="flex-1 h-px bg-[#2B3139]"></div>
              <span className="text-[#5E6673] text-sm">or</span>
              <div className="flex-1 h-px bg-[#2B3139]"></div>
            </div>

            {/* Register Link */}
            <p className="text-center text-[#848E9C]">
              New to TG Exchange?{" "}
              <Link 
                to="/register" 
                className="text-[#00E5FF] hover:text-[#00E5FF]/80 font-semibold transition-colors"
                data-testid="login-register-link"
              >
                Create Account
              </Link>
            </p>
          </div>

          {/* Trust Badges */}
          <div className="flex items-center justify-center gap-6 mt-8">
            <div className="flex items-center gap-2 text-[#5E6673]">
              <CheckCircle size={16} className="text-[#0ECB81]" weight="fill" />
              <span className="text-xs">Licensed</span>
            </div>
            <div className="flex items-center gap-2 text-[#5E6673]">
              <CheckCircle size={16} className="text-[#0ECB81]" weight="fill" />
              <span className="text-xs">Regulated</span>
            </div>
            <div className="flex items-center gap-2 text-[#5E6673]">
              <CheckCircle size={16} className="text-[#0ECB81]" weight="fill" />
              <span className="text-xs">Insured</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
