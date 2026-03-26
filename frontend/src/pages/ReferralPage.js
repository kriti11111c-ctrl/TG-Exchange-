import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth, API, useTheme } from "../App";
import axios from "axios";
import { toast } from "sonner";
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
  const { user } = useAuth();
  const { isDark } = useTheme();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [team, setTeam] = useState([]);
  const [selectedLevel, setSelectedLevel] = useState(0);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [claiming, setClaiming] = useState(false);

  // Theme colors
  const bg = isDark ? 'bg-[#0B0E11]' : 'bg-[#FAFAFA]';
  const cardBg = isDark ? 'bg-[#1E2329]' : 'bg-white';
  const border = isDark ? 'border-[#2B3139]' : 'border-gray-200';
  const text = isDark ? 'text-white' : 'text-gray-900';
  const textMuted = isDark ? 'text-[#848E9C]' : 'text-gray-500';
  const hoverBg = isDark ? 'hover:bg-[#2B3139]' : 'hover:bg-gray-100';

  useEffect(() => {
    fetchStats();
    fetchTeam();
  }, [selectedLevel]);

  const fetchStats = async () => {
    try {
      const response = await axios.get(`${API}/referral/stats`, { withCredentials: true });
      setStats(response.data);
    } catch (error) {
      console.error("Error fetching referral stats:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTeam = async () => {
    try {
      const url = selectedLevel > 0 
        ? `${API}/referral/team?level=${selectedLevel}` 
        : `${API}/referral/team`;
      const response = await axios.get(url, { withCredentials: true });
      setTeam(response.data.team_members || []);
    } catch (error) {
      console.error("Error fetching team:", error);
    }
  };

  const copyReferralLink = () => {
    const link = `${window.location.origin}/register?ref=${stats?.referral_code}`;
    navigator.clipboard.writeText(link);
    setCopied(true);
    toast.success("Referral link copied!");
    setTimeout(() => setCopied(false), 2000);
  };

  const copyReferralCode = () => {
    navigator.clipboard.writeText(stats?.referral_code || "");
    setCopied(true);
    toast.success("Referral code copied!");
    setTimeout(() => setCopied(false), 2000);
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
    const link = `${window.location.origin}/register?ref=${stats?.referral_code}`;
    const text = `Join TG Xchange and start trading crypto! Use my referral code: ${stats?.referral_code}`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: "Join TG Xchange",
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
      "bg-[#F0B90B]", // Level 1 - Gold
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
        <button onClick={shareReferral} className="text-[#F0B90B]">
          <Share size={24} />
        </button>
      </div>

      {/* Banner */}
      <div className="mx-4 mt-4 rounded-xl overflow-hidden bg-gradient-to-r from-[#F0B90B] to-[#F8D12F] p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-black font-bold text-xl mb-2">Invite & Earn</h2>
            <p className="text-black/70 text-sm">Earn up to 20% commission on every trade from your referrals!</p>
          </div>
          <div className="text-5xl">🎁</div>
        </div>
      </div>

      {/* Referral Code Card */}
      <div className={`${cardBg} mx-4 mt-4 rounded-xl p-4`}>
        <div className="flex items-center justify-between mb-4">
          <span className={textMuted}>Your Referral Code</span>
          <div className="flex items-center gap-2">
            <span className={`font-bold text-lg ${text}`}>{stats?.referral_code}</span>
            <button onClick={copyReferralCode} className="text-[#F0B90B]">
              {copied ? <CheckCircle size={20} /> : <Copy size={20} />}
            </button>
          </div>
        </div>
        
        <div className="flex gap-3">
          <Button 
            onClick={copyReferralLink}
            className="flex-1 bg-[#F0B90B] hover:bg-[#F0B90B]/90 text-black font-medium"
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
            <Users size={20} className="text-[#F0B90B]" />
            <span className={textMuted}>Total Referrals</span>
          </div>
          <p className={`text-2xl font-bold ${text}`}>{stats?.total_referrals || 0}</p>
        </div>
        
        <div className={`${cardBg} rounded-xl p-4`}>
          <div className="flex items-center gap-2 mb-2">
            <Coins size={20} className="text-[#0ECB81]" />
            <span className={textMuted}>Total Earnings</span>
          </div>
          <p className="text-2xl font-bold text-[#0ECB81]">${stats?.total_earnings?.toFixed(2) || '0.00'}</p>
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

      {/* 10 Level Commission Structure */}
      <div className={`${cardBg} mx-4 mt-4 rounded-xl p-4`}>
        <h3 className={`font-bold mb-4 ${text}`}>10-Level Commission Structure</h3>
        
        <div className="space-y-2">
          {stats?.level_stats?.map((level) => (
            <div key={level.level}>
              <div 
                onClick={() => setSelectedLevel(selectedLevel === level.level ? 0 : level.level)}
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
                    <p className={`text-xs ${textMuted}`}>{level.commission_rate}% Commission</p>
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
                    // Mask name - show first 3 chars + ****
                    const maskedName = member.name?.length > 3 
                      ? member.name.substring(0, 3) + '****' 
                      : member.name || 'User';
                    
                    return (
                      <div 
                        key={index} 
                        className={`flex items-center justify-between p-2 rounded-lg ${isDark ? 'bg-[#181C21]' : 'bg-gray-50'} border ${border}`}
                      >
                        {/* Serial Number + Avatar + Masked Name + Email */}
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <span className={`text-xs font-bold text-[#F0B90B] w-5`}>{index + 1}.</span>
                          <div className={`w-7 h-7 rounded-full bg-gradient-to-br from-[#F0B90B] to-[#0ECB81] flex items-center justify-center flex-shrink-0`}>
                            <span className="text-white font-bold text-xs">{member.name?.charAt(0)?.toUpperCase() || 'U'}</span>
                          </div>
                          <div className="min-w-0">
                            <p className={`font-medium ${text} text-sm`}>{maskedName}</p>
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
            <div className="w-8 h-8 rounded-full bg-[#F0B90B] flex items-center justify-center flex-shrink-0">
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
              <p className={`text-sm ${textMuted}`}>Get up to 20% from their trading fees - 10 levels deep!</p>
            </div>
          </div>
        </div>
      </div>

      {/* Commission Rates Table */}
      <div className={`${cardBg} mx-4 mt-4 rounded-xl p-4 mb-4`}>
        <h3 className={`font-bold mb-4 ${text}`}>Commission Rates</h3>
        
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className={textMuted}>
                <th className="text-left py-2">Level</th>
                <th className="text-right py-2">Rate</th>
                <th className="text-right py-2">Example (on $100 fee)</th>
              </tr>
            </thead>
            <tbody>
              {[
                { level: 1, rate: "20%", example: "$20.00" },
                { level: 2, rate: "10%", example: "$10.00" },
                { level: 3, rate: "5%", example: "$5.00" },
                { level: 4, rate: "3%", example: "$3.00" },
                { level: 5, rate: "2%", example: "$2.00" },
                { level: 6, rate: "1%", example: "$1.00" },
                { level: 7, rate: "0.5%", example: "$0.50" },
                { level: 8, rate: "0.3%", example: "$0.30" },
                { level: 9, rate: "0.2%", example: "$0.20" },
                { level: 10, rate: "0.1%", example: "$0.10" },
              ].map((item) => (
                <tr key={item.level} className={`border-t ${border}`}>
                  <td className={`py-2 ${text}`}>
                    <div className="flex items-center gap-2">
                      <div className={`w-5 h-5 rounded-full ${getLevelColor(item.level)} flex items-center justify-center`}>
                        <span className="text-white text-xs font-bold">{item.level}</span>
                      </div>
                      Level {item.level}
                    </div>
                  </td>
                  <td className={`text-right py-2 ${text} font-medium`}>{item.rate}</td>
                  <td className="text-right py-2 text-[#0ECB81]">{item.example}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ReferralPage;
