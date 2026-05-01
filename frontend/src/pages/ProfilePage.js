import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth, useTheme, API } from "../App";
import { toast } from "sonner";
import axios from "axios";
import BottomNav from "../components/BottomNav";
import { 
  CaretLeft,
  CaretRight,
  Globe,
  Shield,
  Coins,
  Gift,
  Gear,
  Headset,
  Info,
  Copy,
  CheckCircle,
  User,
  Crown,
  Users,
  Sun,
  Moon,
  SignOut,
  Fingerprint,
  UserPlus,
  Wallet,
  EnvelopeSimple,
  Robot,
  UsersThree,
  CurrencyBtc,
  TelegramLogo,
  PlusCircle,
  Star,
  ChartLineUp,
  Trophy,
  Lightning,
  Rocket,
  CreditCard,
  ArrowsClockwise,
  Medal,
  Bank,
  QrCode,
  Bell
} from "@phosphor-icons/react";
import { Button } from "../components/ui/button";

const ProfilePage = () => {
  const { user, logout } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);
  const [rankInfo, setRankInfo] = useState(null);
  const [kycStatus, setKycStatus] = useState("unverified");

  useEffect(() => {
    fetchRankInfo();
    fetchKycStatus();
  }, []);

  const fetchRankInfo = async () => {
    try {
      const response = await axios.get(`${API}/rank/info`, { withCredentials: true });
      setRankInfo(response.data);
    } catch (error) {
      console.error("Error fetching rank:", error);
    }
  };

  const fetchKycStatus = async () => {
    try {
      const response = await axios.get(`${API}/user/kyc/status`, { withCredentials: true });
      setKycStatus(response.data.status || "unverified");
    } catch (error) {
      setKycStatus("unverified");
    }
  };

  const getUID = () => {
    if (!user?.email) return "CV12345678";
    const hash = user.email.split("").reduce((a, b) => {
      a = ((a << 5) - a) + b.charCodeAt(0);
      return a & a;
    }, 0);
    return `${Math.abs(hash).toString().slice(0, 10).padStart(10, '0')}`;
  };

  const copyUID = () => {
    navigator.clipboard.writeText(getUID());
    setCopied(true);
    toast.success("UID copied!");
    setTimeout(() => setCopied(false), 2000);
  };

  const getRankName = (level) => {
    if (!level || level === 0) return null;
    const names = {
      1: "Bronze", 2: "Silver", 3: "Gold", 4: "Platinum", 5: "Diamond",
      6: "Master", 7: "Grandmaster", 8: "Champion", 9: "Legend", 10: "Immortal"
    };
    return names[level] || null;
  };

  const getRankColor = (level) => {
    const colors = {
      1: "#CD7F32", 2: "#C0C0C0", 3: "#FFD700", 4: "#00E5FF", 5: "#00E5FF",
      6: "#A855F7", 7: "#F43F5E", 8: "#F97316", 9: "#EAB308", 10: "#EF4444"
    };
    return colors[level] || "#848E9C";
  };

  // Quick Services Grid
  const quickServices = [
    { icon: Gift, label: "Rewards", path: "/referral", gradient: "from-[#F0B90B] to-[#F0B90B]/60", iconColor: "#FFF" },
    { icon: UserPlus, label: "Referral", path: "/referral", gradient: "from-[#00E5FF] to-[#00E5FF]/60", iconColor: "#FFF" },
    { icon: Crown, label: "VIP", path: "/team-rank", gradient: "from-[#A855F7] to-[#A855F7]/60", iconColor: "#FFF" },
    { icon: ChartLineUp, label: "Markets", path: "/trade", gradient: "from-[#0ECB81] to-[#0ECB81]/60", iconColor: "#FFF" },
  ];

  // Main Features
  const mainFeatures = [
    { icon: UsersThree, label: "Team Building", desc: "Build your network", path: "/team-rank", color: "#00E5FF" },
    { icon: Trophy, label: "VIP Rank", desc: "Earn up to $15,000/m", path: "/team-rank", color: "#F0B90B" },
    { icon: Robot, label: "AI Trading", desc: "Auto trade signals", path: "/futures", color: "#A855F7" },
    { icon: CurrencyBtc, label: "Buy Crypto", desc: "Deposit & trade", path: "/deposit", color: "#F7931A" },
  ];

  // Account Items
  const accountItems = [
    { icon: Fingerprint, label: "KYC Verification", path: "/kyc", color: "#00E5FF", badge: kycStatus === "verified" ? "Verified" : "Verify Now", badgeColor: kycStatus === "verified" ? "#0ECB81" : "#00E5FF" },
    { icon: Shield, label: "Security Center", path: "/profile/security", color: "#3B82F6" },
    { icon: Users, label: "Referral Program", path: "/referral", color: "#10B981" },
    { icon: Crown, label: "VIP Privileges", path: "/team-rank", color: "#F59E0B" },
    { icon: Wallet, label: "Transaction History", path: "/transactions", color: "#8B5CF6" },
    { icon: Bell, label: "Notifications", path: "/notifications", color: "#EC4899" },
  ];

  // Support Items
  const supportItems = [
    { icon: Headset, label: "Help Center", path: "/profile/support", color: "#9333EA" },
    { icon: EnvelopeSimple, label: "Email Support", href: "mailto:TGexchange.support@gmail.com", color: "#EF4444", badge: "TAP", badgeColor: "#0ECB81" },
    { icon: TelegramLogo, label: "Official Channel", href: "https://t.me/+BQgWwaC0W69iZTM1", color: "#0088CC", badge: "JOIN", badgeColor: "#0088CC" },
    { icon: Info, label: "About", path: "/profile/about", color: "#6B7280", version: "v2.1.0" },
  ];

  const handleLogout = () => {
    logout();
    navigate("/login");
    toast.success("Logged out successfully");
  };

  return (
    <div className="min-h-screen bg-[#0B0E11] pb-24">
      {/* Header with Gradient Background */}
      <div className="relative">
        {/* Gradient Background */}
        <div className="absolute inset-0 h-48 bg-gradient-to-br from-[#1E2329] via-[#0B0E11] to-[#1E2329]">
          <div className="absolute top-0 right-0 w-40 h-40 bg-[#00E5FF]/10 rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-[#F0B90B]/10 rounded-full blur-3xl"></div>
        </div>
        
        {/* Header Bar */}
        <div className="relative px-4 py-3 flex items-center justify-between">
          <button onClick={() => navigate(-1)} className="text-white p-2">
            <CaretLeft size={24} weight="bold" />
          </button>
          <div className="flex items-center gap-2">
            <button onClick={toggleTheme} className="p-2.5 rounded-xl bg-white/10 backdrop-blur-sm">
              {isDark ? <Sun size={20} className="text-[#F0B90B]" /> : <Moon size={20} className="text-white" />}
            </button>
            <button className="p-2.5 rounded-xl bg-white/10 backdrop-blur-sm">
              <QrCode size={20} className="text-white" />
            </button>
            <button className="p-2.5 rounded-xl bg-white/10 backdrop-blur-sm">
              <Gear size={20} className="text-white" />
            </button>
          </div>
        </div>

        {/* Profile Card */}
        <div className="relative px-4 pt-2 pb-6">
          <Link to="/profile/details" className="block">
            <div className="bg-[#1E2329]/90 backdrop-blur-xl rounded-3xl p-5 border border-[#2B3139]/50 shadow-xl">
              <div className="flex items-center gap-4">
                {/* Avatar with Ring */}
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-br from-[#00E5FF] to-[#F0B90B] rounded-full blur-md opacity-50"></div>
                  <div className="relative w-18 h-18 rounded-full bg-gradient-to-br from-[#00E5FF] via-[#0ECB81] to-[#F0B90B] p-[3px]">
                    <div className="w-full h-full rounded-full bg-[#1E2329] flex items-center justify-center overflow-hidden">
                      {user?.picture ? (
                        <img src={user.picture} alt="avatar" className="w-full h-full object-cover" />
                      ) : (
                        <User size={36} className="text-white" weight="fill" />
                      )}
                    </div>
                  </div>
                </div>
                
                {/* User Info */}
                <div className="flex-1">
                  <h2 className="text-xl font-bold text-white mb-1">{user?.name || "User"}</h2>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-[#848E9C] text-sm">UID: {getUID()}</span>
                    <button onClick={(e) => { e.preventDefault(); copyUID(); }} className="p-1">
                      {copied ? <CheckCircle size={16} className="text-[#0ECB81]" weight="fill" /> : <Copy size={16} className="text-[#848E9C]" />}
                    </button>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    {getRankName(rankInfo?.rank?.level) ? (
                      <span 
                        className="text-xs px-2.5 py-1 rounded-full font-bold flex items-center gap-1"
                        style={{ 
                          backgroundColor: `${getRankColor(rankInfo?.rank?.level)}20`,
                          color: getRankColor(rankInfo?.rank?.level)
                        }}
                      >
                        <Medal size={12} weight="fill" />
                        {getRankName(rankInfo?.rank?.level)}
                      </span>
                    ) : (
                      <span className="text-xs px-2.5 py-1 rounded-full bg-[#2B3139] text-[#848E9C] font-medium">
                        No Rank
                      </span>
                    )}
                    <span 
                      className={`text-xs px-2.5 py-1 rounded-full font-medium flex items-center gap-1 ${
                        kycStatus === "verified" 
                          ? "bg-[#0ECB81]/20 text-[#0ECB81]" 
                          : kycStatus === "pending"
                          ? "bg-[#F0B90B]/20 text-[#F0B90B]"
                          : "bg-[#F6465D]/20 text-[#F6465D]"
                      }`}
                    >
                      <CheckCircle size={12} weight={kycStatus === "verified" ? "fill" : "regular"} />
                      {kycStatus === "verified" ? "Verified" : kycStatus === "pending" ? "Pending" : "Unverified"}
                    </span>
                  </div>
                </div>
                <CaretRight size={24} className="text-[#848E9C]" />
              </div>
            </div>
          </Link>
        </div>
      </div>

      {/* Quick Services */}
      <div className="px-4 py-4">
        <div className="grid grid-cols-4 gap-3">
          {quickServices.map((service, index) => (
            <Link 
              key={index} 
              to={service.path}
              className="flex flex-col items-center gap-2 group"
            >
              <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${service.gradient} flex items-center justify-center shadow-lg transition-transform group-hover:scale-110 group-active:scale-95`}>
                <service.icon size={26} className="text-white" weight="fill" />
              </div>
              <span className="text-xs text-white font-medium">{service.label}</span>
            </Link>
          ))}
        </div>
      </div>

      {/* Main Features - Horizontal Scroll Cards */}
      <div className="px-4 py-3">
        <h3 className="text-white font-bold text-lg mb-3">Explore Features</h3>
        <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
          {mainFeatures.map((feature, index) => (
            <Link 
              key={index} 
              to={feature.path}
              className="flex-shrink-0 w-36 bg-[#1E2329] rounded-2xl p-4 border border-[#2B3139]/50 hover:border-[#00E5FF]/30 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <div 
                className="w-11 h-11 rounded-xl flex items-center justify-center mb-3"
                style={{ backgroundColor: `${feature.color}20` }}
              >
                <feature.icon size={24} style={{ color: feature.color }} weight="fill" />
              </div>
              <h4 className="text-white font-semibold text-sm mb-1">{feature.label}</h4>
              <p className="text-[#848E9C] text-xs">{feature.desc}</p>
            </Link>
          ))}
        </div>
      </div>

      {/* Account Section */}
      <div className="px-4 py-3">
        <h3 className="text-white font-bold text-lg mb-3">Account</h3>
        <div className="bg-[#1E2329] rounded-2xl overflow-hidden border border-[#2B3139]/50">
          {accountItems.map((item, index) => (
            <div key={index}>
              <Link 
                to={item.path} 
                className="flex items-center justify-between p-4 hover:bg-[#2B3139]/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div 
                    className="w-10 h-10 rounded-xl flex items-center justify-center"
                    style={{ backgroundColor: `${item.color}15` }}
                  >
                    <item.icon size={22} style={{ color: item.color }} weight="fill" />
                  </div>
                  <span className="text-white font-medium">{item.label}</span>
                </div>
                <div className="flex items-center gap-2">
                  {item.badge && (
                    <span 
                      className="text-xs px-2.5 py-1 rounded-full font-semibold"
                      style={{ 
                        backgroundColor: `${item.badgeColor}20`,
                        color: item.badgeColor
                      }}
                    >
                      {item.badge}
                    </span>
                  )}
                  <CaretRight size={18} className="text-[#848E9C]" />
                </div>
              </Link>
              {index < accountItems.length - 1 && (
                <div className="h-px bg-[#2B3139] mx-4"></div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Support Section */}
      <div className="px-4 py-3">
        <h3 className="text-white font-bold text-lg mb-3">Support</h3>
        <div className="bg-[#1E2329] rounded-2xl overflow-hidden border border-[#2B3139]/50">
          {supportItems.map((item, index) => {
            const Component = item.href ? 'a' : Link;
            const props = item.href 
              ? { href: item.href, target: "_blank", rel: "noopener noreferrer" }
              : { to: item.path };
            
            return (
              <div key={index}>
                <Component 
                  {...props}
                  className="flex items-center justify-between p-4 hover:bg-[#2B3139]/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-10 h-10 rounded-xl flex items-center justify-center"
                      style={{ backgroundColor: `${item.color}15` }}
                    >
                      <item.icon size={22} style={{ color: item.color }} weight="fill" />
                    </div>
                    <span className="text-white font-medium">{item.label}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {item.badge && (
                      <span 
                        className="text-xs px-3 py-1 rounded-full font-bold text-white"
                        style={{ backgroundColor: item.badgeColor }}
                      >
                        {item.badge}
                      </span>
                    )}
                    {item.version && (
                      <span className="text-[#848E9C] text-sm">{item.version}</span>
                    )}
                    <CaretRight size={18} className="text-[#848E9C]" />
                  </div>
                </Component>
                {index < supportItems.length - 1 && (
                  <div className="h-px bg-[#2B3139] mx-4"></div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Logout Button */}
      <div className="px-4 py-4">
        <button 
          onClick={handleLogout}
          className="w-full py-4 rounded-2xl bg-gradient-to-r from-[#F6465D]/20 to-[#F6465D]/10 border border-[#F6465D]/30 text-[#F6465D] font-bold flex items-center justify-center gap-2 hover:from-[#F6465D]/30 hover:to-[#F6465D]/20 transition-all active:scale-[0.98]"
        >
          <SignOut size={22} weight="bold" />
          Log Out
        </button>
      </div>

      {/* Bottom Navigation */}
      <BottomNav />
    </div>
  );
};

export default ProfilePage;
