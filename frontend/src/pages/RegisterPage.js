import { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth, API, useTheme } from "../App";
import axios from "axios";
import { toast } from "sonner";
import { Eye, EyeSlash, GoogleLogo, TelegramLogo, Gift, Sun, Moon } from "@phosphor-icons/react";
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

  const handleGoogleLogin = () => {
    if (!referralCode.trim()) {
      toast.error("Please enter Referral Code first");
      return;
    }
    // Store referral code for after Google auth
    localStorage.setItem("pending_referral_code", referralCode);
    const redirectUrl = window.location.origin + '/dashboard';
    window.location.href = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;
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
    <div className={`min-h-screen ${bg} flex items-center justify-center p-4`}>
      <div className="w-full max-w-md">
        {/* Theme Toggle */}
        <div className="flex justify-end mb-4">
          <button
            onClick={toggleTheme}
            className={`p-2 rounded-lg ${isDark ? 'bg-[#1E2329] hover:bg-[#2B3139]' : 'bg-white hover:bg-gray-100'} border ${isDark ? 'border-[#2B3139]' : 'border-gray-200'}`}
          >
            {isDark ? <Sun size={20} className="text-[#F0B90B]" /> : <Moon size={20} className="text-gray-600" />}
          </button>
        </div>

        {/* Header */}
        <div className="mb-8">
          <h1 className={`text-2xl font-bold ${text} mb-2`}>TG Exchange Registration</h1>
          <div className="h-1 w-32 bg-gradient-to-r from-[#F0B90B] to-[#F0B90B]/50 rounded"></div>
        </div>

        {/* Email/Phone Tabs */}
        <div className="flex gap-6 mb-6">
          <button
            onClick={() => setActiveTab("email")}
            className={`text-lg font-medium pb-2 border-b-2 transition-colors ${
              activeTab === "email" 
                ? `${text} border-[#F0B90B]` 
                : `${textSubtle} border-transparent hover:${isDark ? 'text-gray-300' : 'text-gray-600'}`
            }`}
          >
            Email
          </button>
          <button
            onClick={() => setActiveTab("phone")}
            className={`text-lg font-medium pb-2 border-b-2 transition-colors ${
              activeTab === "phone" 
                ? `${text} border-[#F0B90B]` 
                : `${textSubtle} border-transparent hover:${isDark ? 'text-gray-300' : 'text-gray-600'}`
            }`}
          >
            Phone
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Email or Phone Input */}
          {activeTab === "email" ? (
            <div>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter email"
                className={`w-full py-4 px-4 bg-transparent border-0 border-b ${inputBorder} rounded-none ${inputText} ${inputPlaceholder} focus:border-[#F0B90B] focus:ring-0`}
                required
                data-testid="register-email-input"
              />
            </div>
          ) : (
            <div>
              <Input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Enter phone number"
                className={`w-full py-4 px-4 bg-transparent border-0 border-b ${inputBorder} rounded-none ${inputText} ${inputPlaceholder} focus:border-[#F0B90B] focus:ring-0`}
                required
                data-testid="register-phone-input"
              />
            </div>
          )}

          {/* Password Input */}
          <div>
            <p className={`${textMuted} text-sm mb-2`}>Set the login password (min 8 characters)</p>
            <div className="relative">
              <Input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                className={`w-full py-4 px-4 pr-12 bg-transparent border-0 border-b ${inputBorder} rounded-none ${inputText} ${inputPlaceholder} focus:border-[#F0B90B] focus:ring-0`}
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

          {/* Confirm Password Input */}
          <div>
            <p className={`${textMuted} text-sm mb-2`}>Confirm password</p>
            <div className="relative">
              <Input
                type={showConfirmPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm password"
                className={`w-full py-4 px-4 pr-12 bg-transparent border-0 border-b rounded-none ${inputText} ${inputPlaceholder} focus:ring-0 ${
                  confirmPassword && password !== confirmPassword 
                    ? "border-red-500 focus:border-red-500" 
                    : `${inputBorder} focus:border-[#F0B90B]`
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

          {/* Referral Code - REQUIRED */}
          <div>
            <p className={`${textMuted} text-sm mb-2`}>
              Referral Code <span className="text-red-500">*</span>
            </p>
            <Input
              type="text"
              value={referralCode}
              onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
              placeholder="Enter referral code (Required)"
              className={`w-full py-4 px-4 bg-transparent border-0 border-b ${inputBorder} rounded-none ${inputText} ${inputPlaceholder} focus:border-[#F0B90B] focus:ring-0 uppercase`}
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
            className={`w-full py-6 font-semibold text-lg transition-all ${
              referralCode.trim() && password && password === confirmPassword
                ? "bg-[#F0B90B] hover:bg-[#E5AF0A] text-black"
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
            <span className="text-[#F0B90B] font-bold">200 USDT</span>!
          </p>
        </div>

        {/* Login Link */}
        <div className="mt-8 text-center">
          <p className={textMuted}>
            Already have an account?{" "}
            <Link to="/login" className={`${text} hover:text-[#F0B90B] font-medium`}>
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

        {/* Social Login Buttons */}
        <div className="flex justify-center gap-6">
          <button
            type="button"
            onClick={handleGoogleLogin}
            className={`w-14 h-14 rounded-full border ${socialBorder} flex items-center justify-center transition-colors`}
            data-testid="google-register-btn"
          >
            <GoogleLogo size={28} className={text} />
          </button>
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
          <Link to="#" className={`${text} hover:text-[#F0B90B]`}>
            TG Exchange Service Agreement
          </Link>
        </p>
      </div>
    </div>
  );
};

export default RegisterPage;
