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
  const [selectedPeriod, setSelectedPeriod] = useState("all");
  const [periodBusiness, setPeriodBusiness] = useState({});
  const [loadingPeriod, setLoadingPeriod] = useState(false);

  // Theme colors
  const bg = isDark ? 'bg-[#0B0E11]' : 'bg-[#FAFAFA]';
  const cardBg = isDark ? 'bg-[#1E2329]' : 'bg-white';
  const border = isDark ? 'border-[#2B3139]' : 'border-gray-200';
  const text = isDark ? 'text-white' : 'text-gray-900';
  const textMuted = isDark ? 'text-[#848E9C]' : 'text-gray-500';
  const hoverBg = isDark ? 'hover:bg-[#2B3139]' : 'hover:bg-gray-100';

  useEffect(() => {
    // Parallel fetch for faster loading
    const loadData = async () => {
      try {
        const headers = token ? { Authorization: `Bearer ${token}` } : {};
        const [statsRes, profileRes] = await Promise.all([
          axios.get(`${API}/referral/stats`, { withCredentials: true, headers }),
          axios.get(`${API}/auth/me`, { withCredentials: true, headers })
        ]);
        
        setStats(statsRes.data);
        if (statsRes.data?.referral_code) {
          setUserReferralCode(statsRes.data.referral_code);
        }
        if (profileRes.data?.referral_code) {
          setUserReferralCode(profileRes.data.referral_code);
        }
      } catch (error) {
        console.error("Error fetching referral data:", error);
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
    loadData();
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

  // Fetch business for a specific period
  const fetchPeriodBusiness = async (period) => {
    setLoadingPeriod(true);
    try {
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const response = await axios.get(`${API}/referral/stats?period=${period}`, { 
        withCredentials: true, 
        headers 
      });
      setPeriodBusiness(prev => ({
        ...prev,
        [period]: response.data.total_business || 0
      }));
    } catch (error) {
      console.error("Error fetching period business:", error);
    } finally {
      setLoadingPeriod(false);
    }
  };

  // Handle period change
  const handlePeriodChange = (period) => {
    setSelectedPeriod(period);
    if (!periodBusiness[period]) {
      fetchPeriodBusiness(period);
    }
  };

  // Get current business value based on selected period
  const getCurrentBusiness = () => {
    if (selectedPeriod === "all") {
      return stats?.total_business || 0;
    }
    return periodBusiness[selectedPeriod] || 0;
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

      {/* Banner - Colorful Gradient */}
      <div className="mx-4 mt-4 rounded-2xl overflow-hidden relative" style={{
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%)',
        boxShadow: '0 8px 32px rgba(102, 126, 234, 0.3)'
      }}>
        <div className="absolute -right-8 -top-8 w-32 h-32 rounded-full bg-white/10"></div>
        <div className="absolute -left-4 -bottom-4 w-24 h-24 rounded-full bg-white/10"></div>
        <div className="p-5 relative z-10">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-white font-bold text-xl mb-1">Invite & Earn</h2>
              <p className="text-white/80 text-sm">Earn 0.6% on every trade from your referrals!</p>
              <p className="text-white/90 text-xs mt-2 font-medium">10 Levels Deep • Unlimited Earnings</p>
            </div>
            <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
              <Gift size={32} className="text-white" />
            </div>
          </div>
        </div>
      </div>

      {/* Referral Code Card - Gradient Border */}
      <div 
        className="mx-4 mt-4 rounded-2xl overflow-hidden"
        style={{
          background: isDark ? '#1E2329' : '#FFFFFF',
          border: '2px solid transparent',
          backgroundImage: isDark 
            ? 'linear-gradient(#1E2329, #1E2329), linear-gradient(135deg, #00E5FF, #0ECB81)'
            : 'linear-gradient(#FFFFFF, #FFFFFF), linear-gradient(135deg, #00E5FF, #0ECB81)',
          backgroundOrigin: 'border-box',
          backgroundClip: 'padding-box, border-box',
          boxShadow: isDark ? '0 4px 20px rgba(0, 229, 255, 0.15)' : '0 4px 20px rgba(0, 229, 255, 0.2)'
        }}
      >
        <div className="p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#00E5FF] to-[#0ECB81] flex items-center justify-center">
                <QrCode size={20} className="text-white" />
              </div>
              <div>
                <p className={`text-xs ${textMuted}`}>Your Referral Code</p>
                <p className="text-[#00E5FF] font-bold text-xl">{getReferralCode() || "LOADING..."}</p>
              </div>
            </div>
            <button 
              onClick={copyReferralCode} 
              className="w-10 h-10 rounded-xl bg-[#00E5FF]/20 flex items-center justify-center"
            >
              {copied ? <CheckCircle size={24} className="text-[#0ECB81]" /> : <Copy size={24} className="text-[#00E5FF]" />}
            </button>
          </div>
          
          <div className="flex gap-3">
            <Button 
              onClick={copyReferralLink}
              className="flex-1 bg-gradient-to-r from-[#00E5FF] to-[#0ECB81] hover:opacity-90 text-black font-bold rounded-xl"
            >
              <Copy size={18} className="mr-2" />
              Copy Link
            </Button>
            <Button 
              onClick={shareReferral}
              className={`flex-1 ${isDark ? 'bg-[#2B3139] text-white hover:bg-[#3B4149]' : 'bg-gray-100 text-gray-800 hover:bg-gray-200'} font-medium rounded-xl`}
            >
              <Share size={18} className="mr-2" />
              Share
            </Button>
          </div>
        </div>
      </div>

      {/* Stats Cards - Colorful Gradients */}
      <div className="grid grid-cols-2 gap-3 mx-4 mt-4">
        {/* Total Referrals Card */}
        <div 
          className="rounded-2xl p-4 relative overflow-hidden"
          style={{
            background: 'linear-gradient(135deg, #00E5FF 0%, #00B4D8 100%)',
            boxShadow: '0 4px 15px rgba(0, 229, 255, 0.3)'
          }}
        >
          <div className="absolute -right-4 -bottom-4 w-16 h-16 rounded-full bg-white/20"></div>
          <div className="relative z-10">
            <div className="w-8 h-8 rounded-lg bg-white/30 flex items-center justify-center mb-2">
              <Users size={18} className="text-white" />
            </div>
            <p className="text-white/80 text-xs">Total Referrals</p>
            <p className="text-white font-bold text-2xl">{stats?.total_referrals || 0}</p>
          </div>
        </div>
        
        {/* Total Business Card */}
        <div 
          className="rounded-2xl p-4 relative overflow-hidden"
          style={{
            background: 'linear-gradient(135deg, #0ECB81 0%, #00A86B 100%)',
            boxShadow: '0 4px 15px rgba(14, 203, 129, 0.3)'
          }}
        >
          <div className="absolute -right-4 -bottom-4 w-16 h-16 rounded-full bg-white/20"></div>
          <div className="relative z-10">
            <div className="w-8 h-8 rounded-lg bg-white/30 flex items-center justify-center mb-2">
              <ChartLineUp size={18} className="text-white" />
            </div>
            <p className="text-white/80 text-xs">Total Business</p>
            <p className="text-white font-bold text-2xl">
              {loadingPeriod ? '...' : `$${Math.abs(getCurrentBusiness()).toFixed(2)}`}
            </p>
          </div>
        </div>
      </div>

      {/* Period Filter - Pill Style */}
      <div className="mx-4 mt-3">
        <div 
          className={`rounded-2xl p-1.5 flex gap-1`}
          style={{
            background: isDark ? '#1E2329' : '#F3F4F6',
            border: isDark ? '1px solid #2B3139' : '1px solid #E5E7EB'
          }}
        >
          {[
            { id: '24h', label: '24H' },
            { id: '7d', label: '7D' },
            { id: '30d', label: '30D' },
            { id: 'all', label: 'MAX' }
          ].map(period => (
            <button
              key={period.id}
              onClick={() => handlePeriodChange(period.id)}
              className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-all ${
                selectedPeriod === period.id
                  ? 'bg-gradient-to-r from-[#0ECB81] to-[#00E5FF] text-white shadow-lg'
                  : `${isDark ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-gray-900'}`
              }`}
            >
              {period.label}
            </button>
          ))}
        </div>
      </div>

      {/* Claim Button */}
      {stats?.total_earnings > 0 && (
        <div className="mx-4 mt-4">
          <Button 
            onClick={claimCommission}
            disabled={claiming}
            className="w-full bg-gradient-to-r from-[#F0B90B] to-[#FCD535] hover:opacity-90 text-black font-bold py-6 rounded-2xl text-base"
            style={{ boxShadow: '0 4px 15px rgba(240, 185, 11, 0.4)' }}
          >
            <Gift size={24} className="mr-2" />
            {claiming ? "Claiming..." : `Claim $${stats?.total_earnings?.toFixed(2)} USDT`}
          </Button>
        </div>
      )}

      {/* 10 Level Team Structure - Colorful */}
      <div 
        className="mx-4 mt-4 rounded-2xl overflow-hidden"
        style={{
          background: isDark ? '#1E2329' : '#FFFFFF',
          border: isDark ? '1.5px solid #F0B90B30' : '1.5px solid #F0B90B50',
          boxShadow: isDark ? '0 4px 15px rgba(240, 185, 11, 0.1)' : '0 4px 15px rgba(240, 185, 11, 0.15)'
        }}
      >
        <div className="p-4">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#F0B90B] to-[#FCD535] flex items-center justify-center">
              <Crown size={18} className="text-black" />
            </div>
            <h3 className={`font-bold ${text}`}>10-Level Team Structure</h3>
          </div>
          <div className="space-y-2">
          {stats?.level_stats?.map((level) => {
            // Level specific gradient colors
            const levelGradients = {
              1: 'linear-gradient(135deg, #00E5FF 0%, #00B4D8 100%)',
              2: 'linear-gradient(135deg, #0ECB81 0%, #00A86B 100%)',
              3: 'linear-gradient(135deg, #3498DB 0%, #2980B9 100%)',
              4: 'linear-gradient(135deg, #9B59B6 0%, #8E44AD 100%)',
              5: 'linear-gradient(135deg, #E74C3C 0%, #C0392B 100%)',
              6: 'linear-gradient(135deg, #1ABC9C 0%, #16A085 100%)',
              7: 'linear-gradient(135deg, #F39C12 0%, #E67E22 100%)',
              8: 'linear-gradient(135deg, #2ECC71 0%, #27AE60 100%)',
              9: 'linear-gradient(135deg, #E91E63 0%, #C2185B 100%)',
              10: 'linear-gradient(135deg, #00BCD4 0%, #0097A7 100%)'
            };
            
            return (
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
                className={`flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all ${
                  selectedLevel === level.level 
                    ? 'ring-2 ring-[#00E5FF] ring-offset-2 ring-offset-transparent' 
                    : ''
                }`}
                style={{
                  background: isDark ? '#181C21' : '#F9FAFB',
                  border: isDark ? '1px solid #2B3139' : '1px solid #E5E7EB'
                }}
              >
                <div className="flex items-center gap-3">
                  <div 
                    className="w-10 h-10 rounded-xl flex items-center justify-center"
                    style={{ background: levelGradients[level.level] }}
                  >
                    <span className="text-white font-bold text-sm">{level.level}</span>
                  </div>
                  <div>
                    <p className={`font-medium ${text}`}>Level {level.level}</p>
                    <p className="text-xs text-[#F0B90B] font-medium">0.6% Commission</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <p className={`font-bold ${text}`}>{level.count} <span className={`font-normal text-xs ${textMuted}`}>members</span></p>
                    <p className="text-xs text-[#0ECB81] font-bold">${level.earnings.toFixed(2)}</p>
                  </div>
                  <div 
                    className={`w-6 h-6 rounded-lg flex items-center justify-center transition-transform ${selectedLevel === level.level ? 'rotate-90' : ''}`}
                    style={{ background: isDark ? '#2B3139' : '#E5E7EB' }}
                  >
                    <CaretRight size={14} className={textMuted} />
                  </div>
                </div>
              </div>
              
              {/* Expanded Team Members for this level - Sorted by balance (highest first) */}
              {selectedLevel === level.level && team.length > 0 && (
                <div className={`mt-2 ml-4 space-y-1.5 border-l-2 pl-3`} style={{ borderColor: isDark ? '#00E5FF50' : '#00E5FF80' }}>
                  {[...team]
                    .sort((a, b) => (b.fund || 0) - (a.fund || 0))
                    .map((member, index) => {
                    const fullName = member.name || 'User';
                    
                    return (
                      <div 
                        key={index} 
                        className="flex items-center justify-between p-2.5 rounded-xl"
                        style={{
                          background: isDark ? '#0B0E11' : '#FFFFFF',
                          border: isDark ? '1px solid #2B3139' : '1px solid #E5E7EB'
                        }}
                      >
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <div 
                            className="w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold text-white"
                            style={{ background: levelGradients[level.level] }}
                          >
                            {index + 1}
                          </div>
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#00E5FF] to-[#0ECB81] flex items-center justify-center flex-shrink-0">
                            <span className="text-white font-bold text-xs">{member.name?.charAt(0)?.toUpperCase() || 'U'}</span>
                          </div>
                          <div className="min-w-0">
                            <p className={`font-medium ${text} text-sm`}>{fullName}</p>
                            <p className={`text-xs ${textMuted} truncate`}>{member.email}</p>
                          </div>
                        </div>
                        
                        <div className="text-right flex-shrink-0 ml-2">
                          <p className="text-[#0ECB81] font-bold text-sm">${member.fund?.toFixed(2) || '0.00'}</p>
                          <p className={`${textMuted} text-[10px]`}>
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
                <div 
                  className="mt-2 ml-4 p-4 rounded-xl text-center"
                  style={{
                    background: isDark ? '#0B0E11' : '#F9FAFB',
                    border: isDark ? '1px solid #2B3139' : '1px solid #E5E7EB'
                  }}
                >
                  <Users size={32} className={`mx-auto mb-2 ${textMuted}`} />
                  <p className={textMuted}>No members in Level {level.level}</p>
                </div>
              )}
            </div>
          );
          })}
          </div>
        </div>
      </div>

      {/* How It Works - Colorful */}
      <div 
        className="mx-4 mt-4 rounded-2xl overflow-hidden"
        style={{
          background: isDark ? '#1E2329' : '#FFFFFF',
          border: isDark ? '1.5px solid #00E5FF30' : '1.5px solid #00E5FF50',
          boxShadow: isDark ? '0 4px 15px rgba(0, 229, 255, 0.1)' : '0 4px 15px rgba(0, 229, 255, 0.15)'
        }}
      >
        <div className="p-4">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#00E5FF] to-[#0ECB81] flex items-center justify-center">
              <Star size={18} className="text-white" />
            </div>
            <h3 className={`font-bold ${text}`}>How It Works</h3>
          </div>
        
        <div className="space-y-3">
          <div 
            className="flex items-start gap-3 p-3 rounded-xl"
            style={{ background: isDark ? '#00E5FF10' : '#00E5FF08', border: '1px solid #00E5FF30' }}
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#00E5FF] to-[#00B4D8] flex items-center justify-center flex-shrink-0">
              <span className="text-white font-bold">1</span>
            </div>
            <div>
              <p className={`font-medium ${text}`}>Share your referral link</p>
              <p className={`text-sm ${textMuted}`}>Send your unique link to friends</p>
            </div>
          </div>
          
          <div 
            className="flex items-start gap-3 p-3 rounded-xl"
            style={{ background: isDark ? '#0ECB8110' : '#0ECB8108', border: '1px solid #0ECB8130' }}
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#0ECB81] to-[#00A86B] flex items-center justify-center flex-shrink-0">
              <span className="text-white font-bold">2</span>
            </div>
            <div>
              <p className={`font-medium ${text}`}>Friends sign up & trade</p>
              <p className={`text-sm ${textMuted}`}>They join using your code and start trading</p>
            </div>
          </div>
          
          <div 
            className="flex items-start gap-3 p-3 rounded-xl"
            style={{ background: isDark ? '#F0B90B10' : '#F0B90B08', border: '1px solid #F0B90B30' }}
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#F0B90B] to-[#FCD535] flex items-center justify-center flex-shrink-0">
              <span className="text-black font-bold">3</span>
            </div>
            <div>
              <p className={`font-medium ${text}`}>Earn commissions</p>
              <p className={`text-sm ${textMuted}`}>Get 0.6% from team trading - 10 levels deep!</p>
            </div>
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
