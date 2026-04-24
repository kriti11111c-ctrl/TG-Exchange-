import { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth, API, useTheme } from "../App";
import axios from "axios";
import { toast } from "sonner";
import { 
  Eye, 
  EyeSlash, 
  TelegramLogo, 
  Gift, 
  Sun, 
  Moon,
  User,
  EnvelopeSimple,
  Lock,
  UserPlus,
  CheckCircle,
  ArrowRight,
  ShieldCheck,
  Coins,
  Rocket,
  Trophy
} from "@phosphor-icons/react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";

const RegisterPage = () => {
  const { isDark, toggleTheme } = useTheme();
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState("email");
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

  useEffect(() => {
    const refCode = searchParams.get("ref");
    if (refCode) {
      setReferralCode(refCode);
    }
  }, [searchParams]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!referralCode.trim()) {
      toast.error("Referral Code is required to sign up");
      return;
    }

    if (password !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    setLoading(true);

    try {
      const response = await axios.post(`${API}/auth/register`, {
        name: name || email.split('@')[0],
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

  // Password strength indicator
  const getPasswordStrength = () => {
    if (!password) return { strength: 0, label: '', color: '' };
    let strength = 0;
    if (password.length >= 8) strength++;
    if (/[A-Z]/.test(password)) strength++;
    if (/[0-9]/.test(password)) strength++;
    if (/[^A-Za-z0-9]/.test(password)) strength++;
    
    const labels = ['Weak', 'Fair', 'Good', 'Strong'];
    const colors = ['#F6465D', '#F0B90B', '#00E5FF', '#0ECB81'];
    
    return { 
      strength, 
      label: labels[strength - 1] || '', 
      color: colors[strength - 1] || '#F6465D' 
    };
  };

  const passwordStrength = getPasswordStrength();

  return (
    <div className="min-h-screen bg-[#0B0E11] flex relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-[#0ECB81]/10 rounded-full blur-[120px]"></div>
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-[#00E5FF]/10 rounded-full blur-[120px]"></div>
        <div className="absolute top-[50%] left-[50%] w-[400px] h-[400px] bg-[#F0B90B]/5 rounded-full blur-[100px]"></div>
        
        <div className="absolute inset-0 opacity-[0.02]" style={{
          backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
          backgroundSize: '50px 50px'
        }}></div>
      </div>

      {/* Left Side - Features (Hidden on mobile) */}
      <div className="hidden lg:flex flex-1 flex-col justify-center items-center p-12 relative z-10">
        <div className="max-w-lg">
          {/* Logo */}
          <div className="flex items-center gap-4 mb-12">
            <div className="relative">
              <div className="absolute inset-0 bg-[#0ECB81] rounded-full blur-2xl opacity-40"></div>
              <div className="w-16 h-16 rounded-full overflow-hidden bg-black ring-2 ring-[#0ECB81]/50 relative z-10">
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
            Start Your
            <span className="block bg-gradient-to-r from-[#0ECB81] via-[#00E5FF] to-[#F0B90B] bg-clip-text text-transparent">
              Crypto Journey
            </span>
          </h2>
          <p className="text-[#848E9C] text-lg mb-12">
            Join the world's fastest-growing crypto exchange and get exclusive rewards.
          </p>

          {/* Benefits */}
          <div className="space-y-4">
            <div className="flex items-center gap-4 p-4 rounded-2xl bg-gradient-to-r from-[#0ECB81]/20 to-transparent border border-[#0ECB81]/30 backdrop-blur-sm">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#0ECB81] to-[#0ECB81]/50 flex items-center justify-center">
                <Gift size={24} className="text-white" weight="fill" />
              </div>
              <div>
                <h3 className="text-white font-semibold">$200 USDT Welcome Bonus</h3>
                <p className="text-[#848E9C] text-sm">Free bonus on registration</p>
              </div>
            </div>
            
            <div className="flex items-center gap-4 p-4 rounded-2xl bg-gradient-to-r from-[#00E5FF]/20 to-transparent border border-[#00E5FF]/30 backdrop-blur-sm">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#00E5FF] to-[#00E5FF]/50 flex items-center justify-center">
                <Rocket size={24} className="text-white" weight="fill" />
              </div>
              <div>
                <h3 className="text-white font-semibold">Up to 65% Daily Profit</h3>
                <p className="text-[#848E9C] text-sm">With our AI trading signals</p>
              </div>
            </div>
            
            <div className="flex items-center gap-4 p-4 rounded-2xl bg-gradient-to-r from-[#F0B90B]/20 to-transparent border border-[#F0B90B]/30 backdrop-blur-sm">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#F0B90B] to-[#F0B90B]/50 flex items-center justify-center">
                <Trophy size={24} className="text-white" weight="fill" />
              </div>
              <div>
                <h3 className="text-white font-semibold">VIP Rank Rewards</h3>
                <p className="text-[#848E9C] text-sm">Earn up to $15,000/month</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Side - Register Form */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12 relative z-10">
        <div className="w-full max-w-md">
          {/* Mobile Logo */}
          <div className="lg:hidden flex items-center justify-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-full overflow-hidden bg-black ring-2 ring-[#0ECB81]/50">
              <img src="/images/tg-logo.png" alt="TG Exchange" className="w-full h-full object-cover" />
            </div>
            <span className="text-2xl font-bold text-white" style={{ fontFamily: 'Unbounded' }}>TG Exchange</span>
          </div>

          {/* Register Card */}
          <div className="bg-[#1E2329]/80 backdrop-blur-xl rounded-3xl p-8 border border-[#2B3139] shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold text-white mb-1">Create Account</h2>
                <p className="text-[#848E9C] text-sm">Join TG Exchange today</p>
              </div>
              <button
                onClick={toggleTheme}
                className="p-2.5 rounded-xl bg-[#2B3139] hover:bg-[#3B4149] transition-colors"
              >
                {isDark ? <Sun size={20} className="text-[#F0B90B]" /> : <Moon size={20} className="text-[#848E9C]" />}
              </button>
            </div>

            {/* Welcome Bonus Banner */}
            <div className="flex items-center gap-3 p-3 rounded-xl bg-gradient-to-r from-[#0ECB81]/20 to-[#F0B90B]/20 border border-[#0ECB81]/30 mb-6">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#0ECB81] to-[#F0B90B] flex items-center justify-center">
                <Gift size={20} className="text-white" weight="fill" />
              </div>
              <div>
                <p className="text-white font-semibold text-sm">Get $200 USDT Welcome Bonus!</p>
                <p className="text-[#848E9C] text-xs">Register now and start trading</p>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 p-1 bg-[#0B0E11] rounded-xl mb-6">
              <button
                onClick={() => setActiveTab("email")}
                className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-all ${
                  activeTab === "email" 
                    ? "bg-[#2B3139] text-white" 
                    : "text-[#848E9C] hover:text-white"
                }`}
              >
                Email
              </button>
              <button
                onClick={() => setActiveTab("phone")}
                className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-all ${
                  activeTab === "phone" 
                    ? "bg-[#2B3139] text-white" 
                    : "text-[#848E9C] hover:text-white"
                }`}
              >
                Phone
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Name */}
              <div className="space-y-1.5">
                <Label className="text-[#848E9C] text-sm">Full Name</Label>
                <div className="relative group">
                  <User size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#848E9C] group-focus-within:text-[#0ECB81] transition-colors" />
                  <Input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter your name"
                    className="pl-11 h-12 bg-[#0B0E11] border-[#2B3139] focus:border-[#0ECB81] text-white rounded-xl placeholder:text-[#5E6673]"
                    required
                    data-testid="register-name-input"
                  />
                </div>
              </div>

              {/* Email/Phone */}
              {activeTab === "email" ? (
                <div className="space-y-1.5">
                  <Label className="text-[#848E9C] text-sm">Email Address</Label>
                  <div className="relative group">
                    <EnvelopeSimple size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#848E9C] group-focus-within:text-[#0ECB81] transition-colors" />
                    <Input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Enter email"
                      className="pl-11 h-12 bg-[#0B0E11] border-[#2B3139] focus:border-[#0ECB81] text-white rounded-xl placeholder:text-[#5E6673]"
                      required
                      data-testid="register-email-input"
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-1.5">
                  <Label className="text-[#848E9C] text-sm">Phone Number</Label>
                  <div className="relative group">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#848E9C]">+91</span>
                    <Input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="Enter phone number"
                      className="pl-14 h-12 bg-[#0B0E11] border-[#2B3139] focus:border-[#0ECB81] text-white rounded-xl placeholder:text-[#5E6673]"
                      required
                      data-testid="register-phone-input"
                    />
                  </div>
                </div>
              )}

              {/* Password */}
              <div className="space-y-1.5">
                <Label className="text-[#848E9C] text-sm">Password</Label>
                <div className="relative group">
                  <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#848E9C] group-focus-within:text-[#0ECB81] transition-colors" />
                  <Input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Min 8 characters"
                    className="pl-11 pr-11 h-12 bg-[#0B0E11] border-[#2B3139] focus:border-[#0ECB81] text-white rounded-xl placeholder:text-[#5E6673]"
                    required
                    minLength={8}
                    data-testid="register-password-input"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-[#848E9C] hover:text-white"
                  >
                    {showPassword ? <EyeSlash size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                {/* Password Strength */}
                {password && (
                  <div className="flex items-center gap-2 mt-2">
                    <div className="flex-1 h-1.5 bg-[#2B3139] rounded-full overflow-hidden flex gap-1">
                      {[1, 2, 3, 4].map((i) => (
                        <div 
                          key={i}
                          className="flex-1 rounded-full transition-all duration-300"
                          style={{ 
                            backgroundColor: i <= passwordStrength.strength ? passwordStrength.color : 'transparent' 
                          }}
                        />
                      ))}
                    </div>
                    <span className="text-xs font-medium" style={{ color: passwordStrength.color }}>
                      {passwordStrength.label}
                    </span>
                  </div>
                )}
              </div>

              {/* Confirm Password */}
              <div className="space-y-1.5">
                <Label className="text-[#848E9C] text-sm">Confirm Password</Label>
                <div className="relative group">
                  <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#848E9C] group-focus-within:text-[#0ECB81] transition-colors" />
                  <Input
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter password"
                    className={`pl-11 pr-11 h-12 bg-[#0B0E11] text-white rounded-xl placeholder:text-[#5E6673] ${
                      confirmPassword && password !== confirmPassword 
                        ? "border-[#F6465D] focus:border-[#F6465D]" 
                        : "border-[#2B3139] focus:border-[#0ECB81]"
                    }`}
                    required
                    minLength={8}
                    data-testid="register-confirm-password-input"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-[#848E9C] hover:text-white"
                  >
                    {showConfirmPassword ? <EyeSlash size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                {confirmPassword && password === confirmPassword && (
                  <div className="flex items-center gap-1 text-[#0ECB81] text-xs mt-1">
                    <CheckCircle size={14} weight="fill" />
                    <span>Passwords match</span>
                  </div>
                )}
              </div>

              {/* Referral Code */}
              <div className="space-y-1.5">
                <Label className="text-[#848E9C] text-sm">
                  Referral Code <span className="text-[#F6465D]">*</span>
                </Label>
                <div className="relative group">
                  <UserPlus size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#848E9C] group-focus-within:text-[#F0B90B] transition-colors" />
                  <Input
                    type="text"
                    value={referralCode}
                    onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
                    placeholder="Enter referral code"
                    className="pl-11 h-12 bg-[#0B0E11] border-[#2B3139] focus:border-[#F0B90B] text-white rounded-xl placeholder:text-[#5E6673] uppercase tracking-wider"
                    required
                    data-testid="register-referral-input"
                  />
                </div>
                {!referralCode && (
                  <p className="text-[#F6465D] text-xs">Referral code is required to register</p>
                )}
              </div>

              {/* Submit */}
              <Button
                type="submit"
                disabled={loading || !referralCode.trim() || !password || password !== confirmPassword}
                className="w-full h-14 bg-gradient-to-r from-[#0ECB81] to-[#0ECB81]/80 hover:from-[#0ECB81]/90 hover:to-[#0ECB81]/70 text-white font-bold text-lg rounded-xl shadow-lg shadow-[#0ECB81]/20 hover:shadow-[#0ECB81]/40 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center justify-center gap-2"
                data-testid="register-submit-btn"
              >
                {loading ? (
                  <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                ) : (
                  <>
                    Create Account
                    <ArrowRight size={20} weight="bold" />
                  </>
                )}
              </Button>
            </form>

            {/* Divider */}
            <div className="flex items-center gap-4 my-6">
              <div className="flex-1 h-px bg-[#2B3139]"></div>
              <span className="text-[#5E6673] text-sm">or continue with</span>
              <div className="flex-1 h-px bg-[#2B3139]"></div>
            </div>

            {/* Social Login */}
            <button
              type="button"
              className="w-full h-12 rounded-xl border border-[#2B3139] hover:border-[#0088CC] bg-[#0B0E11] hover:bg-[#0088CC]/10 flex items-center justify-center gap-3 transition-all"
            >
              <TelegramLogo size={24} className="text-[#0088CC]" weight="fill" />
              <span className="text-white font-medium">Continue with Telegram</span>
            </button>

            {/* Login Link */}
            <p className="text-center text-[#848E9C] mt-6">
              Already have an account?{" "}
              <Link to="/login" className="text-[#00E5FF] hover:text-[#00E5FF]/80 font-semibold transition-colors">
                Sign In
              </Link>
            </p>
          </div>

          {/* Trust Badges */}
          <div className="flex items-center justify-center gap-6 mt-6">
            <div className="flex items-center gap-2 text-[#5E6673]">
              <CheckCircle size={14} className="text-[#0ECB81]" weight="fill" />
              <span className="text-xs">Verified</span>
            </div>
            <div className="flex items-center gap-2 text-[#5E6673]">
              <ShieldCheck size={14} className="text-[#0ECB81]" weight="fill" />
              <span className="text-xs">Secure</span>
            </div>
            <div className="flex items-center gap-2 text-[#5E6673]">
              <Coins size={14} className="text-[#0ECB81]" weight="fill" />
              <span className="text-xs">$200 Bonus</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;
