import { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth, API, useTheme } from "../App";
import axios from "axios";
import { toast } from "sonner";
import { Eye, EyeSlash, TelegramLogo, Gift, Sun, Moon } from "@phosphor-icons/react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";

const RegisterPage = () => {
  const { isDark, toggleTheme } = useTheme();
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState("email"); // email or phone
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [referralCode, setReferralCode] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  // Get referral code from URL if present
  useEffect(() => {
    const refCode = searchParams.get("ref");
    if (refCode) {
      setReferralCode(refCode);
    }
  }, [searchParams]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate referral code is required
    if (!referralCode.trim()) {
      toast.error("Referral Code is required to sign up");
      return;
    }

    // Validate passwords match
    if (password !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    setLoading(true);

    try {
      const response = await axios.post(`${API}/auth/register`, {
        name: name || email.split('@')[0], // Use email prefix as name if not provided
        email: activeTab === "email" ? email : `${phone}@phone.tgxchange.com`,
        password,
        referral_code: referralCode.trim()
      }, { withCredentials: true });

      login(response.data.user, response.data.access_token);
      toast.success("Account created! You received $200 USDT Welcome Bonus!");
      navigate("/dashboard");
    } catch (error) {
      toast.error(error.response?.data?.detail || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  // Theme colors
  const bg = isDark ? 'bg-[#0B0E11]' : 'bg-gray-50';
  const text = isDark ? 'text-white' : 'text-gray-900';
  const textMuted = isDark ? 'text-gray-400' : 'text-gray-600';
  const textSubtle = isDark ? 'text-gray-500' : 'text-gray-400';
  const inputBorder = isDark ? 'border-gray-700' : 'border-gray-300';
  const inputText = isDark ? 'text-white' : 'text-gray-900';
  const inputPlaceholder = isDark ? 'placeholder-gray-500' : 'placeholder-gray-400';
  const dividerBg = isDark ? 'bg-gray-700' : 'bg-gray-300';
  const socialBorder = isDark ? 'border-gray-700 hover:border-gray-500' : 'border-gray-300 hover:border-gray-400';

  return (
    <div className={`min-h-screen ${bg} flex items-center justify-center p-4 relative overflow-hidden`}>
      {/* Cinematic Background Effects */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Animated Gradient Orbs */}
        <div className="absolute top-10 -right-20 w-72 h-72 bg-[#00E5FF]/15 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-20 -left-20 w-80 h-80 bg-[#00E5FF]/10 rounded-full blur-3xl animate-pulse" style={{animationDelay: '1.5s'}}></div>
        
        {/* Grid Pattern */}
        <div className="absolute inset-0 opacity-[0.02]" style={{
          backgroundImage: 'linear-gradient(rgba(0,229,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(0,229,255,0.5) 1px, transparent 1px)',
          backgroundSize: '50px 50px'
        }}></div>
        
        {/* Floating Particles */}
        <div className="absolute top-[15%] right-[15%] w-2 h-2 bg-[#00E5FF]/40 rounded-full animate-bounce" style={{animationDuration: '3s'}}></div>
        <div className="absolute bottom-[30%] left-[10%] w-1.5 h-1.5 bg-[#00E5FF]/30 rounded-full animate-bounce" style={{animationDuration: '4s', animationDelay: '1s'}}></div>
      </div>

      <div className="w-full max-w-md relative z-10">
        {/* Theme Toggle */}
        <div className="flex justify-end mb-4">
          <button
            onClick={toggleTheme}
            className={`p-2.5 rounded-xl ${isDark ? 'bg-white/5 hover:bg-white/10' : 'bg-black/5 hover:bg-black/10'} backdrop-blur-sm border ${isDark ? 'border-white/10' : 'border-gray-200'} transition-all duration-300 hover:scale-105`}
          >
            {isDark ? <Sun size={20} className="text-[#00E5FF]" /> : <Moon size={20} className="text-gray-600" />}
          </button>
        </div>

        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4 group">
            <div className="relative">
              <div className="absolute inset-0 bg-[#00E5FF] rounded-full blur-xl opacity-30 group-hover:opacity-50 transition-opacity duration-500"></div>
              <div className="w-14 h-14 rounded-full overflow-hidden bg-black ring-2 ring-[#00E5FF]/50 relative z-10">
                <img src="/images/tg-logo.png" alt="TG Exchange" className="w-full h-full object-cover" />
              </div>
            </div>
            <h1 className={`text-2xl font-bold ${text}`} style={{ fontFamily: 'Unbounded' }}>TG Exchange</h1>
          </div>
          <p className={`${textMuted} text-sm`}>Create your account</p>
          <div className="h-1 w-32 bg-gradient-to-r from-[#00E5FF] to-transparent rounded mt-2"></div>
        </div>

        {/* Email/Phone Tabs */}
        <div className="flex gap-6 mb-6">
          <button
            onClick={() => setActiveTab("email")}
            className={`text-lg font-medium pb-2 border-b-2 transition-colors ${
              activeTab === "email" 
                ? `${text} border-[#00E5FF]` 
                : `${textSubtle} border-transparent hover:${isDark ? 'text-gray-300' : 'text-gray-600'}`
            }`}
          >
            Email
          </button>
          <button
            onClick={() => setActiveTab("phone")}
            className={`text-lg font-medium pb-2 border-b-2 transition-colors ${
              activeTab === "phone" 
                ? `${text} border-[#00E5FF]` 
                : `${textSubtle} border-transparent hover:${isDark ? 'text-gray-300' : 'text-gray-600'}`
            }`}
          >
            Phone
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* 1. Name Input - FIRST */}
          <div>
            <p className={`${textMuted} text-sm mb-2`}>Full Name</p>
            <Input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter your full name"
              className={`w-full py-4 px-4 bg-transparent border-0 border-b ${inputBorder} rounded-none ${inputText} ${inputPlaceholder} focus:border-[#00E5FF] focus:ring-0`}
              required
              data-testid="register-name-input"
            />
          </div>

          {/* 2. Email or Phone Input */}
          {activeTab === "email" ? (
            <div>
              <p className={`${textMuted} text-sm mb-2`}>Email Address</p>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter email"
                className={`w-full py-4 px-4 bg-transparent border-0 border-b ${inputBorder} rounded-none ${inputText} ${inputPlaceholder} focus:border-[#00E5FF] focus:ring-0`}
                required
                data-testid="register-email-input"
              />
            </div>
          ) : (
            <div>
              <p className={`${textMuted} text-sm mb-2`}>Phone Number</p>
              <Input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Enter phone number"
                className={`w-full py-4 px-4 bg-transparent border-0 border-b ${inputBorder} rounded-none ${inputText} ${inputPlaceholder} focus:border-[#00E5FF] focus:ring-0`}
                required
                data-testid="register-phone-input"
              />
            </div>
          )}

          {/* 3. Password Input */}
          <div>
            <p className={`${textMuted} text-sm mb-2`}>Password (min 8 characters)</p>
            <div className="relative">
              <Input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                className={`w-full py-4 px-4 pr-12 bg-transparent border-0 border-b ${inputBorder} rounded-none ${inputText} ${inputPlaceholder} focus:border-[#00E5FF] focus:ring-0`}
                required
                minLength={8}
                data-testid="register-password-input"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className={`absolute right-3 top-1/2 -translate-y-1/2 ${textSubtle} hover:${isDark ? 'text-gray-300' : 'text-gray-600'}`}
              >
                {showPassword ? <EyeSlash size={22} /> : <Eye size={22} />}
              </button>
            </div>
          </div>

          {/* 4. Confirm Password Input */}
          <div>
            <p className={`${textMuted} text-sm mb-2`}>Confirm Password</p>
            <div className="relative">
              <Input
                type={showConfirmPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm password"
                className={`w-full py-4 px-4 pr-12 bg-transparent border-0 border-b rounded-none ${inputText} ${inputPlaceholder} focus:ring-0 ${
                  confirmPassword && password !== confirmPassword 
                    ? "border-red-500 focus:border-red-500" 
                    : `${inputBorder} focus:border-[#00E5FF]`
                }`}
                required
                minLength={8}
                data-testid="register-confirm-password-input"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className={`absolute right-3 top-1/2 -translate-y-1/2 ${textSubtle} hover:${isDark ? 'text-gray-300' : 'text-gray-600'}`}
              >
                {showConfirmPassword ? <EyeSlash size={22} /> : <Eye size={22} />}
              </button>
            </div>
            {confirmPassword && password !== confirmPassword && (
              <p className="text-red-400 text-xs mt-1">Passwords do not match</p>
            )}
          </div>

          {/* 5. Referral Code - REQUIRED */}
          <div>
            <p className={`${textMuted} text-sm mb-2`}>
              Referral Code <span className="text-red-500">*</span>
            </p>
            <Input
              type="text"
              value={referralCode}
              onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
              placeholder="Enter referral code (Required)"
              className={`w-full py-4 px-4 bg-transparent border-0 border-b ${inputBorder} rounded-none ${inputText} ${inputPlaceholder} focus:border-[#00E5FF] focus:ring-0 uppercase`}
              required
              data-testid="register-referral-input"
            />
            {!referralCode && (
              <p className="text-red-400 text-xs mt-1">Referral code is required to register</p>
            )}
          </div>

          {/* Sign Up Button */}
          <Button
            type="submit"
            disabled={loading || !referralCode.trim() || !password || password !== confirmPassword}
            className={`w-full py-6 font-bold text-lg rounded-xl transition-all duration-300 ${
              referralCode.trim() && password && password === confirmPassword
                ? "bg-[#00E5FF] hover:bg-[#00E5FF]/90 text-black shadow-lg shadow-[#00E5FF]/25 hover:shadow-[#00E5FF]/40 hover:scale-[1.02] active:scale-[0.98]"
                : `${isDark ? 'bg-gray-700 text-gray-400' : 'bg-gray-300 text-gray-500'} cursor-not-allowed`
            }`}
            data-testid="register-submit-btn"
          >
            {loading ? "Creating account..." : "Sign up"}
          </Button>
        </form>

        {/* Gift Banner */}
        <div className="mt-6 text-center">
          <p className={`${textMuted} text-sm`}>
            It only takes 1 minute to register and receive a new user gift worth{" "}
            <span className="text-[#00E5FF] font-bold animate-pulse">200 USDT</span>!
          </p>
        </div>

        {/* Login Link */}
        <div className="mt-8 text-center">
          <p className={textMuted}>
            Already have an account?{" "}
            <Link to="/login" className={`${text} hover:text-[#00E5FF] font-semibold transition-colors`}>
              Log in
            </Link>
          </p>
        </div>

        {/* Divider */}
        <div className="flex items-center gap-4 my-6">
          <div className={`flex-1 h-px ${dividerBg}`}></div>
          <span className={textSubtle}>or</span>
          <div className={`flex-1 h-px ${dividerBg}`}></div>
        </div>

        {/* Social Login - Telegram only */}
        <div className="flex justify-center gap-6">
          <button
            type="button"
            className={`w-14 h-14 rounded-full border ${socialBorder} flex items-center justify-center transition-colors`}
          >
            <TelegramLogo size={28} className="text-[#0088CC]" />
          </button>
        </div>

        {/* Terms */}
        <p className={`mt-8 text-center ${textSubtle} text-xs`}>
          By clicking the button, you agree to{" "}
          <Link to="#" className={`${text} hover:text-[#00E5FF]`}>
            TG Exchange Service Agreement
          </Link>
        </p>
      </div>
    </div>
  );
};

export default RegisterPage;
