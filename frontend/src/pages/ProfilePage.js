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
  Ticket,
  Gear,
  Headset,
  Megaphone,
  Code,
  Question,
  Info,
  Copy,
  CheckCircle,
  User,
  Crown,
  Users,
  Sun,
  Moon,
  SignOut,
  Key,
  Bell,
  Eye,
  Lock,
  Fingerprint,
  UserPlus,
  Wallet,
  EnvelopeSimple,
  Robot,
  UsersThree,
  PencilSimple,
  CurrencyBtc,
  TelegramLogo,
  CalendarBlank,
  PlusCircle,
  Broadcast,
  Star,
  Ranking,
  ChartLineUp
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

  // Generate masked email
  const getMaskedEmail = () => {
    if (!user?.email) return "us***@email.com";
    const [localPart, domain] = user.email.split("@");
    const masked = localPart.substring(0, 2) + "****";
    return `${masked}@${domain}`;
  };

  // Generate UID
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

  // Get rank display name
  const getRankName = (level) => {
    if (!level || level === 0) return null; // No rank
    const names = {
      1: "Bronze", 2: "Silver", 3: "Gold", 4: "Platinum", 5: "Diamond",
      6: "Master", 7: "Grandmaster", 8: "Champion", 9: "Legend", 10: "Immortal"
    };
    return names[level] || null;
  };

  // Theme colors
  const bg = isDark ? 'bg-[#0B0E11]' : 'bg-[#FAFAFA]';
  const cardBg = isDark ? 'bg-[#1E2329]' : 'bg-white';
  const border = isDark ? 'border-[#2B3139]' : 'border-gray-200';
  const text = isDark ? 'text-white' : 'text-gray-900';
  const textMuted = isDark ? 'text-[#848E9C]' : 'text-gray-500';
  const hoverBg = isDark ? 'hover:bg-[#2B3139]' : 'hover:bg-gray-100';
  const iconBg = isDark ? 'bg-[#2B3139]' : 'bg-gray-100';

  // Recommend items (merged with shortcuts)
  const recommendItems = [
    { icon: UserPlus, label: "Referral", path: "/referral", color: "#00E5FF" },
    { icon: UsersThree, label: "Team Building", path: "/team-rank", color: "#00E5FF" },
    { icon: Coins, label: "Earn", path: "/wallet", color: "#00E5FF" },
    { icon: Robot, label: "Trading Bots", path: "/trade", color: "#848E9C" },
    { icon: CurrencyBtc, label: "Bitcoin", path: "/trade/bitcoin", color: "#F7931A" },
    { icon: Star, label: "VIP Rank", path: "/rank", color: "#00E5FF" },
    { icon: PlusCircle, label: "Add Funds", path: "/wallet", color: "#00E5FF" },
    { icon: ChartLineUp, label: "Markets", path: "/trade", color: "#0ECB81" },
  ];

  const handleLogout = () => {
    logout();
    navigate("/login");
    toast.success("Logged out successfully");
  };

  return (
    <div className={`min-h-screen ${bg} pb-6`}>
      {/* Header */}
      <div className={`${isDark ? 'bg-[#0B0E11]' : 'bg-white'} px-4 py-3 flex items-center justify-between sticky top-0 z-50`}>
        <button onClick={() => navigate(-1)} className={text}>
          <CaretLeft size={24} weight="bold" />
        </button>
        <div className="flex items-center gap-3">
          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            className={`p-2 rounded-full ${iconBg}`}
          >
            {isDark ? <Sun size={20} className="text-[#00E5FF]" /> : <Moon size={20} className="text-gray-600" />}
          </button>
          <Headset size={22} className={textMuted} />
          <Gear size={22} className={textMuted} />
        </div>
      </div>

      {/* Profile Card - Clickable */}
      <Link to="/profile/details" className="block">
        <div className={`mx-4 mt-4 ${cardBg} rounded-2xl p-4`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {/* Avatar */}
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#00E5FF] to-[#F7931A] flex items-center justify-center overflow-hidden">
                {user?.picture ? (
                  <img src={user.picture} alt="avatar" className="w-full h-full object-cover" />
                ) : (
                  <User size={32} className="text-black" weight="fill" />
                )}
              </div>
              
              {/* Info */}
              <div>
                <div className="flex items-center gap-2">
                  <p className={`text-xs ${textMuted}`}>ID: {getUID()}</p>
                  <button onClick={(e) => { e.preventDefault(); copyUID(); }}>
                    {copied ? <CheckCircle size={14} className="text-[#0ECB81]" /> : <Copy size={14} className={textMuted} />}
                  </button>
                </div>
                <h2 className={`text-lg font-bold ${text}`}>{user?.name || "User"}</h2>
                <div className="flex items-center gap-2 mt-1">
                  {getRankName(rankInfo?.rank?.level) ? (
                    <span className="text-xs px-2 py-0.5 rounded bg-[#00E5FF]/20 text-[#00E5FF] font-medium">
                      {getRankName(rankInfo?.rank?.level)}
                    </span>
                  ) : (
                    <span className="text-xs px-2 py-0.5 rounded bg-[#848E9C]/20 text-[#848E9C] font-medium">
                      No Rank
                    </span>
                  )}
                  {kycStatus === "verified" ? (
                    <span className="text-xs px-2 py-0.5 rounded bg-[#0ECB81]/20 text-[#0ECB81] font-medium">
                      Verified
                    </span>
                  ) : kycStatus === "pending" ? (
                    <span className="text-xs px-2 py-0.5 rounded bg-yellow-500/20 text-yellow-500 font-medium">
                      Pending
                    </span>
                  ) : (
                    <span className="text-xs px-2 py-0.5 rounded bg-red-500/20 text-red-500 font-medium">
                      Unverified
                    </span>
                  )}
                </div>
              </div>
            </div>
            <CaretRight size={20} className={textMuted} />
          </div>
        </div>
      </Link>

      {/* Recommend Section */}
      <div className="mx-4 mt-6">
        <h3 className={`font-semibold mb-3 ${text}`}>Recommend</h3>
        <div className={`${cardBg} rounded-2xl p-4`}>
          <div className="grid grid-cols-4 gap-4">
            {recommendItems.map((item, index) => (
              <Link 
                key={index} 
                to={item.path}
                className="flex flex-col items-center gap-2"
              >
                <div className={`w-12 h-12 rounded-full ${iconBg} flex items-center justify-center`}>
                  <item.icon size={24} style={{ color: item.color }} />
                </div>
                <span className={`text-xs ${text} text-center leading-tight`}>{item.label}</span>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* More Services Button */}
      <div className="mx-4 mt-4">
        <button className={`w-full py-3 rounded-full ${cardBg} ${text} font-medium border ${border}`}>
          More Services
        </button>
      </div>

      {/* Quick Actions */}
      <div className="mx-4 mt-6">
        <h3 className={`font-semibold mb-3 ${text}`}>Account</h3>
        <div className={`${cardBg} rounded-2xl overflow-hidden`}>
          {/* KYC Verification */}
          <Link to="/kyc" className={`flex items-center justify-between p-4 ${hoverBg}`}>
            <div className="flex items-center gap-3">
              <Fingerprint size={22} className="text-[#00E5FF]" />
              <span className={text}>KYC Verification</span>
            </div>
            <div className="flex items-center gap-2">
              {kycStatus === "verified" ? (
                <span className="text-xs px-2 py-1 rounded-full bg-[#0ECB81]/20 text-[#0ECB81] font-medium">Verified</span>
              ) : (
                <span className="text-xs px-2 py-1 rounded-full bg-[#00E5FF]/20 text-[#00E5FF] font-medium">Verify Now</span>
              )}
              <CaretRight size={18} className={textMuted} />
            </div>
          </Link>
          <div className={`h-px ${isDark ? 'bg-[#2B3139]' : 'bg-gray-100'} mx-4`}></div>
          <Link to="/profile/security" className={`flex items-center justify-between p-4 ${hoverBg}`}>
            <div className="flex items-center gap-3">
              <Shield size={22} className="text-[#3498DB]" />
              <span className={text}>Security</span>
            </div>
            <CaretRight size={18} className={textMuted} />
          </Link>
          <div className={`h-px ${isDark ? 'bg-[#2B3139]' : 'bg-gray-100'} mx-4`}></div>
          <Link to="/referral" className={`flex items-center justify-between p-4 ${hoverBg}`}>
            <div className="flex items-center gap-3">
              <Users size={22} className="text-[#00E5FF]" />
              <span className={text}>Referral Program</span>
            </div>
            <CaretRight size={18} className={textMuted} />
          </Link>
          <div className={`h-px ${isDark ? 'bg-[#2B3139]' : 'bg-gray-100'} mx-4`}></div>
          <Link to="/rank" className={`flex items-center justify-between p-4 ${hoverBg}`}>
            <div className="flex items-center gap-3">
              <Crown size={22} className="text-[#00E5FF]" />
              <span className={text}>VIP Rank</span>
            </div>
            <CaretRight size={18} className={textMuted} />
          </Link>
          <div className={`h-px ${isDark ? 'bg-[#2B3139]' : 'bg-gray-100'} mx-4`}></div>
          <Link to="/team-rank" className={`flex items-center justify-between p-4 ${hoverBg}`}>
            <div className="flex items-center gap-3">
              <UsersThree size={22} className="text-[#0ECB81]" />
              <span className={text}>Team Building</span>
            </div>
            <CaretRight size={18} className={textMuted} />
          </Link>
          <div className={`h-px ${isDark ? 'bg-[#2B3139]' : 'bg-gray-100'} mx-4`}></div>
          <Link to="/transactions" className={`flex items-center justify-between p-4 ${hoverBg}`}>
            <div className="flex items-center gap-3">
              <Wallet size={22} className="text-[#0ECB81]" />
              <span className={text}>Transaction History</span>
            </div>
            <CaretRight size={18} className={textMuted} />
          </Link>
        </div>
      </div>

      {/* Support Section */}
      <div className="mx-4 mt-6">
        <h3 className={`font-semibold mb-3 ${text}`}>Support</h3>
        <div className={`${cardBg} rounded-2xl overflow-hidden`}>
          <Link to="/profile/support" className={`flex items-center justify-between p-4 ${hoverBg}`}>
            <div className="flex items-center gap-3">
              <Headset size={22} className="text-[#9B59B6]" />
              <span className={text}>Help Center</span>
            </div>
            <CaretRight size={18} className={textMuted} />
          </Link>
          <div className={`h-px ${isDark ? 'bg-[#2B3139]' : 'bg-gray-100'} mx-4`}></div>
          <a 
            href="mailto:TGexchange.support@gmail.com?subject=Support Request - TG Exchange" 
            className={`flex items-center justify-between p-4 ${hoverBg}`}
            data-testid="email-support-link"
          >
            <div className="flex items-center gap-3">
              <EnvelopeSimple size={22} className="text-[#EA4335]" />
              <span className={text}>Email Support</span>
            </div>
            <span className="bg-[#0ECB81] text-white text-xs px-2 py-1 rounded-full font-semibold">TAP</span>
          </a>
          <div className={`h-px ${isDark ? 'bg-[#2B3139]' : 'bg-gray-100'} mx-4`}></div>
          <a 
            href="https://t.me/+vgak-EfN1p81NWE1" 
            target="_blank"
            rel="noopener noreferrer"
            className={`flex items-center justify-between p-4 ${hoverBg}`}
            data-testid="telegram-channel-link"
            onClick={() => {
              localStorage.setItem('tg_channel_joined', 'true');
            }}
          >
            <div className="flex items-center gap-3">
              <TelegramLogo size={22} weight="fill" className="text-[#0088cc]" />
              <span className={text}>TG Exchange Official Channel</span>
            </div>
            <span className="bg-[#0088cc] text-white text-xs px-2 py-1 rounded-full font-semibold">JOIN</span>
          </a>
          <div className={`h-px ${isDark ? 'bg-[#2B3139]' : 'bg-gray-100'} mx-4`}></div>
          <Link to="/profile/about" className={`flex items-center justify-between p-4 ${hoverBg}`}>
            <div className="flex items-center gap-3">
              <Info size={22} className={textMuted} />
              <span className={text}>About TG Exchange</span>
            </div>
            <span className={`text-sm ${textMuted}`}>v1.0.0</span>
          </Link>
        </div>
      </div>

      {/* Logout Button */}
      <div className="mx-4 mt-6">
        <button 
          onClick={handleLogout}
          className="w-full py-4 rounded-2xl bg-[#F6465D]/10 text-[#F6465D] font-semibold flex items-center justify-center gap-2"
        >
          <SignOut size={20} />
          Log Out
        </button>
      </div>

      {/* Bottom Spacing */}
      <div className="h-20"></div>
      
      {/* Bottom Navigation */}
      <BottomNav />
    </div>
  );
};

export default ProfilePage;
