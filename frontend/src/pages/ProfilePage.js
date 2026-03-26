import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth, useTheme } from "../App";
import { toast } from "sonner";
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
  Fingerprint
} from "@phosphor-icons/react";
import { Button } from "../components/ui/button";
import { Switch } from "../components/ui/switch";

const ProfilePage = () => {
  const { user, logout } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);

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
    // Generate a deterministic UID from email
    const hash = user.email.split("").reduce((a, b) => {
      a = ((a << 5) - a) + b.charCodeAt(0);
      return a & a;
    }, 0);
    return `CV${Math.abs(hash).toString().slice(0, 8).padStart(8, '0')}`;
  };

  const copyUID = () => {
    navigator.clipboard.writeText(getUID());
    setCopied(true);
    toast.success("UID copied!");
    setTimeout(() => setCopied(false), 2000);
  };

  // Theme colors
  const bg = isDark ? 'bg-[#0B0E11]' : 'bg-[#FAFAFA]';
  const cardBg = isDark ? 'bg-[#1E2329]' : 'bg-white';
  const border = isDark ? 'border-[#2B3139]' : 'border-gray-200';
  const text = isDark ? 'text-white' : 'text-gray-900';
  const textMuted = isDark ? 'text-[#848E9C]' : 'text-gray-500';
  const hoverBg = isDark ? 'hover:bg-[#2B3139]' : 'hover:bg-gray-100';
  const dividerBg = isDark ? 'bg-[#2B3139]' : 'bg-gray-200';

  // Menu items grouped
  const accountMenu = [
    { icon: Shield, label: "Security", desc: "Protect your account", path: "/profile/security" },
    { icon: Coins, label: "My Points", desc: "0 Points", path: "/profile/points" },
    { icon: Gift, label: "My Red Packets", desc: "Send & receive rewards", path: "/profile/packets" },
    { icon: Ticket, label: "My Coupons", desc: "Trading fee discounts", path: "/profile/coupons" },
    { icon: Gear, label: "Preference", desc: "App settings", path: "/profile/preference" },
  ];

  const supportMenu = [
    { icon: Headset, label: "Self-service", desc: "Quick solutions", path: "/profile/self-service" },
    { icon: Megaphone, label: "Official Channel", desc: "News & updates", path: "/profile/channel" },
    { icon: Code, label: "API Settings", desc: "Manage API keys", path: "/profile/api" },
    { icon: Question, label: "Support Center", desc: "Get help", path: "/profile/support" },
    { icon: Info, label: "About CryptoVault", desc: "v1.0.0", path: "/profile/about" },
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
          <CaretLeft size={24} />
        </button>
        <span className={`font-medium ${text}`}>Profile</span>
        <button onClick={toggleTheme} className={text}>
          <Globe size={24} />
        </button>
      </div>

      {/* Profile Card */}
      <div className={`${cardBg} mx-4 mt-4 rounded-xl p-4`}>
        <div className="flex items-center gap-4">
          {/* Avatar */}
          <div className="w-16 h-16 rounded-full bg-[#F0B90B] flex items-center justify-center">
            {user?.picture ? (
              <img src={user.picture} alt="avatar" className="w-full h-full rounded-full object-cover" />
            ) : (
              <User size={32} className="text-black" weight="fill" />
            )}
          </div>
          
          {/* User Info */}
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className={`font-semibold text-lg ${text}`}>{getMaskedEmail()}</span>
              <CaretRight size={16} className={textMuted} />
            </div>
            <div className="flex items-center gap-2 mt-1">
              <span className={`text-sm ${textMuted}`}>UID: {getUID()}</span>
              <button onClick={copyUID} className={textMuted}>
                {copied ? <CheckCircle size={14} className="text-[#0ECB81]" /> : <Copy size={14} />}
              </button>
            </div>
            <div className="flex items-center gap-1 mt-2">
              <CheckCircle size={16} className="text-[#0ECB81]" weight="fill" />
              <span className="text-[#0ECB81] text-sm font-medium">Verified</span>
            </div>
          </div>
        </div>

        {/* VIP Section */}
        <div className={`flex items-center justify-between mt-4 pt-4 border-t ${border}`}>
          <div className="flex items-center gap-2">
            <Crown size={20} className="text-[#F0B90B]" weight="fill" />
            <span className={`font-bold ${text}`}>VIP 0</span>
          </div>
          <Link to="/profile/vip" className="flex items-center gap-1 text-[#F0B90B]">
            <span className="text-sm">View Benefits</span>
            <CaretRight size={14} />
          </Link>
        </div>
      </div>

      {/* Referral Banner */}
      <Link to="/referral" className={`${cardBg} mx-4 mt-4 rounded-xl p-4 flex items-center justify-between`}>
        <div>
          <p className={`font-semibold ${text}`}>Invite friends, earn together</p>
          <p className={`text-sm ${textMuted} mt-1`}>Earn up to 20% commission - 10 levels!</p>
        </div>
        <div className="flex items-center gap-2">
          <Users size={32} className="text-[#F0B90B]" />
          <CaretRight size={20} className={textMuted} />
        </div>
      </Link>

      {/* Account Menu */}
      <div className={`${cardBg} mx-4 mt-4 rounded-xl overflow-hidden`}>
        {accountMenu.map((item, index) => {
          const Icon = item.icon;
          return (
            <Link 
              key={item.label}
              to={item.path}
              className={`flex items-center justify-between p-4 ${hoverBg} ${
                index !== accountMenu.length - 1 ? `border-b ${border}` : ''
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon size={22} className={textMuted} />
                <span className={text}>{item.label}</span>
              </div>
              <CaretRight size={18} className={textMuted} />
            </Link>
          );
        })}
      </div>

      {/* Quick Settings */}
      <div className={`${cardBg} mx-4 mt-4 rounded-xl overflow-hidden`}>
        {/* Theme Toggle */}
        <div className={`flex items-center justify-between p-4 border-b ${border}`}>
          <div className="flex items-center gap-3">
            {isDark ? <Moon size={22} className={textMuted} /> : <Sun size={22} className={textMuted} />}
            <span className={text}>Dark Mode</span>
          </div>
          <Switch checked={isDark} onCheckedChange={toggleTheme} />
        </div>
        
        {/* Notifications */}
        <div className={`flex items-center justify-between p-4`}>
          <div className="flex items-center gap-3">
            <Bell size={22} className={textMuted} />
            <span className={text}>Notifications</span>
          </div>
          <Switch defaultChecked />
        </div>
      </div>

      {/* Support Menu */}
      <div className={`${cardBg} mx-4 mt-4 rounded-xl overflow-hidden`}>
        {supportMenu.map((item, index) => {
          const Icon = item.icon;
          return (
            <Link 
              key={item.label}
              to={item.path}
              className={`flex items-center justify-between p-4 ${hoverBg} ${
                index !== supportMenu.length - 1 ? `border-b ${border}` : ''
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon size={22} className={textMuted} />
                <span className={text}>{item.label}</span>
              </div>
              <div className="flex items-center gap-2">
                {item.label === "About CryptoVault" && (
                  <span className={`text-sm ${textMuted}`}>{item.desc}</span>
                )}
                <CaretRight size={18} className={textMuted} />
              </div>
            </Link>
          );
        })}
      </div>

      {/* Logout Button */}
      <div className="mx-4 mt-6">
        <Button 
          onClick={handleLogout}
          className={`w-full ${isDark ? 'bg-[#2B3139] hover:bg-[#3B4149]' : 'bg-gray-200 hover:bg-gray-300'} ${text} font-medium py-6`}
        >
          <SignOut size={20} className="mr-2" />
          Log Out
        </Button>
      </div>

      {/* Version */}
      <p className={`text-center text-sm ${textMuted} mt-4`}>
        CryptoVault v1.0.0
      </p>
    </div>
  );
};

export default ProfilePage;
