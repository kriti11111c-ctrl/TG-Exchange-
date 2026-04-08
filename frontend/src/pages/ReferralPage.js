import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth, API, useTheme } from "../App";
import axios from "axios";
import { toast } from "sonner";
import BottomNav from "../components/BottomNav";
import { 
  CaretLeft,
  CaretRight,
  Copy,
  CheckCircle,
  Users,
  Money,
  Trophy,
  Gift,
  Share,
  QrCode,
  ChartLineUp,
  Coins,
  Star,
  Crown
} from "@phosphor-icons/react";
import { Button } from "../components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";

const ReferralPage = () => {
  const { user, token } = useAuth();
  const { isDark } = useTheme();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [team, setTeam] = useState([]);
  const [selectedLevel, setSelectedLevel] = useState(0);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const [userReferralCode, setUserReferralCode] = useState("");

  // Theme colors
  const bg = isDark ? 'bg-[#0B0E11]' : 'bg-[#FAFAFA]';
  const cardBg = isDark ? 'bg-[#1E2329]' : 'bg-white';
  const border = isDark ? 'border-[#2B3139]' : 'border-gray-200';
  const text = isDark ? 'text-white' : 'text-gray-900';
  const textMuted = isDark ? 'text-[#848E9C]' : 'text-gray-500';
  const hoverBg = isDark ? 'hover:bg-[#2B3139]' : 'hover:bg-gray-100';

  useEffect(() => {
    fetchStats();
    fetchUserProfile();
    // Don't fetch team on initial load - only when level is selected
  }, []);

  const fetchUserProfile = async () => {
    try {
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const response = await axios.get(`${API}/auth/me`, { 
        withCredentials: true,
        headers 
      });
      if (response.data?.referral_code) {
        setUserReferralCode(response.data.referral_code);
      }
    } catch (error) {
      console.error("Error fetching user profile:", error);
    }
  };

  const fetchStats = async () => {
    try {
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const response = await axios.get(`${API}/referral/stats`, { 
        withCredentials: true,
        headers
      });
      console.log("Referral stats response:", response.data);
      setStats(response.data);
      if (response.data?.referral_code) {
        setUserReferralCode(response.data.referral_code);
      }
    } catch (error) {
      console.error("Error fetching referral stats:", error);
      // Set a fallback to show something if API fails
      setStats({
        referral_code: userReferralCode || "Loading...",
        total_referrals: 0,
        total_earnings: 0,
        level_stats: []
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchTeam = async (level = selectedLevel) => {
    try {
      const url = level > 0 
        ? `${API}/referral/team?level=${level}` 
        : `${API}/referral/team`;
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const response = await axios.get(url, { withCredentials: true, headers });
      setTeam(response.data.team_members || []);
    } catch (error) {
      console.error("Error fetching team:", error);
      setTeam([]);
    }
  };

  const fallbackCopyToClipboard = (text) => {
    // Fallback for HTTP - create temporary textarea
    const textArea = document.createElement("textarea");
    textArea.value = text;
    textArea.style.position = "fixed";
    textArea.style.left = "-9999px";
    textArea.style.top = "-9999px";
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    try {
      document.execCommand('copy');
      return true;
    } catch (err) {
      console.error('Fallback copy failed:', err);
      return false;
    } finally {
      document.body.removeChild(textArea);
    }
  };

  const copyToClipboard = async (text) => {
    // Try modern API first, fallback to old method
    if (navigator.clipboard && window.isSecureContext) {
      try {
        await navigator.clipboard.writeText(text);
        return true;
      } catch (err) {
        console.error('Clipboard API failed:', err);
      }
    }
    return fallbackCopyToClipboard(text);
  };

  const getReferralCode = () => {
    return stats?.referral_code || userReferralCode || "";
  };

  const copyReferralLink = async () => {
    const code = getReferralCode();
    if (!code) {
      toast.error("Referral code not available");
      return;
    }
    const link = `${window.location.origin}/register?ref=${code}`;
    const success = await copyToClipboard(link);
    if (success) {
      setCopied(true);
      toast.success("Referral link copied!");
      setTimeout(() => setCopied(false), 2000);
    } else {
      toast.error("Copy failed - please copy manually: " + link);
    }
  };

  const copyReferralCode = async () => {
    const code = getReferralCode();
    if (!code) {
      toast.error("Referral code not available");
      return;
    }
    const success = await copyToClipboard(code);
    if (success) {
      setCopied(true);
      toast.success("Referral code copied: " + code);
      setTimeout(() => setCopied(false), 2000);
    } else {
      toast.error("Copy failed");
    }
  };

  const claimCommission = async () => {
    if (stats?.total_earnings <= 0) {
      toast.error("No commission to claim");
      return;
    }
    
    setClaiming(true);
    try {
      const response = await axios.post(`${API}/referral/claim-commission`, {}, { withCredentials: true });
      toast.success(response.data.message);
      fetchStats();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to claim commission");
    } finally {
      setClaiming(false);
    }
  };

  const shareReferral = async () => {
    const code = getReferralCode();
    if (!code) {
      toast.error("Referral code not available");
      return;
    }
    const link = `${window.location.origin}/register?ref=${code}`;
    const text = `Join TG Exchange and start trading crypto! Use my referral code: ${stats?.referral_code}`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: "Join TG Exchange",
          text: text,
          url: link
        });
      } catch (error) {
        copyReferralLink();
      }
    } else {
      copyReferralLink();
    }
  };

  // Level colors for visual distinction
  const getLevelColor = (level) => {
    const colors = [
      "bg-[#00E5FF]", // Level 1 - Gold
      "bg-[#0ECB81]", // Level 2 - Green
      "bg-[#3498DB]", // Level 3 - Blue
      "bg-[#9B59B6]", // Level 4 - Purple
      "bg-[#E74C3C]", // Level 5 - Red
      "bg-[#1ABC9C]", // Level 6 - Teal
      "bg-[#F39C12]", // Level 7 - Orange
      "bg-[#2ECC71]", // Level 8 - Emerald
      "bg-[#E91E63]", // Level 9 - Pink
      "bg-[#00BCD4]", // Level 10 - Cyan
    ];
    return colors[level - 1] || "bg-gray-500";
  };

  if (loading) {
    return (
      <div className={`min-h-screen ${bg} flex items-center justify-center`}>
        <p className={text}>Loading...</p>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${bg} pb-6`}>
      {/* Header */}
      <div className={`${isDark ? 'bg-[#0B0E11]' : 'bg-white'} px-4 py-3 flex items-center justify-between sticky top-0 z-50`}>
        <button onClick={() => navigate(-1)} className={text}>
          <CaretLeft size={24} />
        </button>
        <span className={`font-medium ${text}`}>Referral Program</span>
        <button onClick={shareReferral} className="text-[#00E5FF]">
          <Share size={24} />
        </button>
      </div>

      {/* Banner */}
      <div className="mx-4 mt-4 rounded-xl overflow-hidden bg-gradient-to-r from-[#00E5FF] to-[#F8D12F] p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-black font-bold text-xl mb-2">Invite & Earn</h2>
            <p className="text-black/70 text-sm">Earn rewards on every trade from your referrals!</p>
          </div>
          <div className="text-5xl">🎁</div>
        </div>
      </div>

      {/* Referral Code Card */}
      <div className={`${cardBg} mx-4 mt-4 rounded-xl p-4`}>
        <div className="flex items-center justify-between mb-4">
          <span className={textMuted}>Your Referral Code</span>
          <div className="flex items-center gap-2">
            <span className={`font-bold text-xl text-[#00E5FF]`}>{getReferralCode() || "LOADING..."}</span>
            <button onClick={copyReferralCode} className="text-[#00E5FF] p-1">
              {copied ? <CheckCircle size={24} /> : <Copy size={24} />}
            </button>
          </div>
        </div>
        
        <div className="flex gap-3">
          <Button 
            onClick={copyReferralLink}
            className="flex-1 bg-[#00E5FF] hover:bg-[#00E5FF]/90 text-black font-medium"
          >
            <Copy size={18} className="mr-2" />
            Copy Link
          </Button>
          <Button 
            onClick={shareReferral}
            variant="outline"
            className={`flex-1 ${border} ${text}`}
          >
            <Share size={18} className="mr-2" />
            Share
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-3 mx-4 mt-4">
        <div className={`${cardBg} rounded-xl p-4`}>
          <div className="flex items-center gap-2 mb-2">
            <Users size={20} className="text-[#00E5FF]" />
            <span className={textMuted}>Total Referrals</span>
          </div>
          <p className={`text-2xl font-bold ${text}`}>{stats?.total_referrals || 0}</p>
        </div>
        
        <div className={`${cardBg} rounded-xl p-4`}>
          <div className="flex items-center gap-2 mb-2">
            <ChartLineUp size={20} className="text-[#F0B90B]" />
            <span className={textMuted}>Total Business</span>
          </div>
          <p className={`text-2xl font-bold ${stats?.total_business >= 0 ? 'text-[#0ECB81]' : 'text-[#F6465D]'}`}>
            ${Math.abs(stats?.total_business || 0).toFixed(2)}
          </p>
        </div>
      </div>

      {/* Claim Button */}
      {stats?.total_earnings > 0 && (
        <div className="mx-4 mt-4">
          <Button 
            onClick={claimCommission}
            disabled={claiming}
            className="w-full bg-[#0ECB81] hover:bg-[#0ECB81]/90 text-white font-medium py-6"
          >
            <Gift size={20} className="mr-2" />
            {claiming ? "Claiming..." : `Claim $${stats?.total_earnings?.toFixed(2)} USDT`}
          </Button>
        </div>
      )}

      {/* 10 Level Team Structure */}
      <div className={`${cardBg} mx-4 mt-4 rounded-xl p-4`}>
        <h3 className={`font-bold mb-4 ${text}`}>10-Level Team Structure</h3>
        
        <div className="space-y-2">
          {stats?.level_stats?.map((level) => (
            <div key={level.level}>
              <div 
                onClick={() => {
                  const newLevel = selectedLevel === level.level ? 0 : level.level;
                  setSelectedLevel(newLevel);
                  if (newLevel > 0) {
                    fetchTeam(newLevel);
                  } else {
                    setTeam([]);
                  }
                }}
                className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition-colors ${
                  selectedLevel === level.level ? (isDark ? 'bg-[#2B3139]' : 'bg-gray-100') : hoverBg
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full ${getLevelColor(level.level)} flex items-center justify-center`}>
                    <span className="text-white font-bold text-sm">{level.level}</span>
                  </div>
                  <div>
                    <p className={text}>Level {level.level}</p>
                    <p className={`text-xs text-[#0ECB81]`}>0.6%</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <p className={text}>{level.count} members</p>
                    <p className={`text-xs text-[#0ECB81]`}>${level.earnings.toFixed(2)}</p>
                  </div>
                  <CaretRight 
                    size={16} 
                    className={`${textMuted} transition-transform ${selectedLevel === level.level ? 'rotate-90' : ''}`} 
                  />
                </div>
              </div>
              
              {/* Expanded Team Members for this level */}
              {selectedLevel === level.level && team.length > 0 && (
                <div className={`mt-2 ml-4 space-y-1 border-l-2 ${isDark ? 'border-[#2B3139]' : 'border-gray-200'} pl-3`}>
                  {team.map((member, index) => {
                    // Full name displayed, email remains masked
                    const fullName = member.name || 'User';
                    
                    return (
                      <div 
                        key={index} 
                        className={`flex items-center justify-between p-2 rounded-lg ${isDark ? 'bg-[#181C21]' : 'bg-gray-50'} border ${border}`}
                      >
                        {/* Serial Number + Avatar + Full Name + Masked Email */}
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <span className={`text-xs font-bold text-[#00E5FF] w-5`}>{index + 1}.</span>
                          <div className={`w-7 h-7 rounded-full bg-gradient-to-br from-[#00E5FF] to-[#0ECB81] flex items-center justify-center flex-shrink-0`}>
                            <span className="text-white font-bold text-xs">{member.name?.charAt(0)?.toUpperCase() || 'U'}</span>
                          </div>
                          <div className="min-w-0">
                            <p className={`font-medium ${text} text-sm`}>{fullName}</p>
                            <p className={`text-xs ${textMuted} truncate`}>{member.email}</p>
                          </div>
                        </div>
                        
                        {/* Fund - Clear Display */}
                        <div className="text-right flex-shrink-0 ml-2">
                          <p className="text-[#0ECB81] font-bold text-sm">${member.fund?.toFixed(2) || '0.00'}</p>
                          <p className={`${textMuted} text-xs`}>
                            {new Date(member.joined_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
              
              {/* No members message */}
              {selectedLevel === level.level && team.length === 0 && (
                <div className={`mt-2 ml-4 p-4 rounded-lg ${isDark ? 'bg-[#181C21]' : 'bg-gray-50'} border ${border} text-center`}>
                  <Users size={32} className={`mx-auto mb-2 ${textMuted}`} />
                  <p className={textMuted}>No members in Level {level.level}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* How It Works */}
      <div className={`${cardBg} mx-4 mt-4 rounded-xl p-4`}>
        <h3 className={`font-bold mb-4 ${text}`}>How It Works</h3>
        
        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-[#00E5FF] flex items-center justify-center flex-shrink-0">
              <span className="text-black font-bold">1</span>
            </div>
            <div>
              <p className={text}>Share your referral link</p>
              <p className={`text-sm ${textMuted}`}>Send your unique link to friends</p>
            </div>
          </div>
          
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-[#0ECB81] flex items-center justify-center flex-shrink-0">
              <span className="text-white font-bold">2</span>
            </div>
            <div>
              <p className={text}>Friends sign up & trade</p>
              <p className={`text-sm ${textMuted}`}>They join using your code and start trading</p>
            </div>
          </div>
          
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-[#3498DB] flex items-center justify-center flex-shrink-0">
              <span className="text-white font-bold">3</span>
            </div>
            <div>
              <p className={text}>Earn commissions</p>
              <p className={`text-sm ${textMuted}`}>Get 0.6% from team trading - 10 levels deep!</p>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Navigation */}
      <BottomNav />
    </div>
  );
};

export default ReferralPage;
