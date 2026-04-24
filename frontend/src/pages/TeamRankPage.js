import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth, API, useTheme } from "../App";
import axios from "axios";
import { toast } from "sonner";
import BottomNav from "../components/BottomNav";
import { 
  CaretLeft,
  Trophy,
  Users,
  UserPlus,
  Star,
  Crown,
  Money,
  ChartLineUp,
  Gift,
  Info,
  CheckCircle,
  Clock,
  Wallet
} from "@phosphor-icons/react";
import { Button } from "../components/ui/button";

const TeamRankPage = () => {
  const { user } = useAuth();
  const { isDark } = useTheme();
  const navigate = useNavigate();
  const [rankInfo, setRankInfo] = useState(null);
  const [allRanks, setAllRanks] = useState([]);
  const [salaryHistory, setSalaryHistory] = useState([]);
  const [activeTab, setActiveTab] = useState("overview");
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState(false);

  // Theme colors
  const bg = isDark ? 'bg-[#0B0E11]' : 'bg-gray-50';
  const cardBg = isDark ? 'bg-[#1E2329]' : 'bg-white';
  const text = isDark ? 'text-white' : 'text-gray-900';
  const textMuted = isDark ? 'text-[#848E9C]' : 'text-gray-500';

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [rankRes, levelsRes, historyRes] = await Promise.all([
        axios.get(`${API}/team-rank/info`, { withCredentials: true }),
        axios.get(`${API}/team-rank/all-levels`, { withCredentials: true }),
        axios.get(`${API}/team-rank/salary-history`, { withCredentials: true })
      ]);
      
      // Debug: Log the actual response
      console.log("RANK API RESPONSE:", JSON.stringify(rankRes.data));
      
      setRankInfo(rankRes.data);
      setAllRanks(levelsRes.data.ranks || []);
      setSalaryHistory(historyRes.data.salaries || []);
      
      // Show levelup reward notification
      if (rankRes.data.levelup_reward_received) {
        toast.success(`🎉 Congratulations! You received $${rankRes.data.levelup_reward_received} level-up reward!`);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleClaimSalary = async () => {
    setClaiming(true);
    try {
      const response = await axios.post(`${API}/team-rank/claim-salary`, {}, { withCredentials: true });
      toast.success(response.data.message);
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to claim salary");
    } finally {
      setClaiming(false);
    }
  };

  const formatMoney = (amount) => {
    if (amount >= 1000) return `$${(amount / 1000).toFixed(1)}K`;
    return `$${amount?.toFixed(0) || 0}`;
  };

  // Get rank gradient
  const getRankGradient = (level) => {
    const gradients = {
      1: "from-slate-400 to-slate-500",
      2: "from-blue-400 to-blue-600",
      3: "from-emerald-400 to-emerald-600",
      4: "from-yellow-400 to-amber-500",
      5: "from-orange-400 to-orange-600",
      6: "from-blue-500 to-indigo-600",
      7: "from-purple-400 to-purple-600",
      8: "from-pink-400 to-rose-600",
      9: "from-amber-400 to-yellow-500",
      10: "from-red-500 to-red-700"
    };
    return gradients[level] || gradients[1];
  };

  // Get emoji for rank
  const getRankEmoji = (level) => {
    if (level <= 5) return "⭐".repeat(level);
    return "🌟".repeat(level - 5);
  };

  if (loading) {
    return (
      <div className={`min-h-screen ${bg} flex items-center justify-center`}>
        <div className="animate-spin w-8 h-8 border-2 border-[#00E5FF] border-t-transparent rounded-full"></div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${bg} pb-6`}>
      {/* Header */}
      <div className={`${isDark ? 'bg-[#0B0E11]' : 'bg-white'} px-4 py-3 flex items-center justify-between sticky top-0 z-50 border-b ${isDark ? 'border-[#2B3139]' : 'border-gray-200'}`}>
        <button onClick={() => navigate(-1)} className={text}>
          <CaretLeft size={24} weight="bold" />
        </button>
        <span className={`font-semibold text-lg ${text}`}>Team Building</span>
        <button className={textMuted}>
          <Info size={22} />
        </button>
      </div>

      {/* Current Rank Card */}
      <div className="px-4 py-4">
        <div 
          className={`rounded-2xl p-5 relative overflow-hidden`}
          style={{
            background: rankInfo?.current_rank 
              ? `linear-gradient(135deg, ${rankInfo.current_rank.color}40, ${rankInfo.current_rank.color}20)`
              : isDark ? '#1E2329' : 'white'
          }}
        >
          {/* Decorative */}
          <div className="absolute top-0 right-0 w-32 h-32 rounded-full bg-white/5 -mr-10 -mt-10"></div>
          
          <div className="relative">
            {/* Rank Badge */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div 
                  className={`w-16 h-16 rounded-full bg-gradient-to-br ${getRankGradient(rankInfo?.current_rank?.level || 1)} flex items-center justify-center shadow-lg`}
                >
                  <Crown size={28} className="text-white" weight="fill" />
                </div>
                <div>
                  <p className={`text-sm ${textMuted}`}>Current Rank</p>
                  <h2 className={`text-xl font-bold ${text}`}>
                    {rankInfo?.current_rank?.name || "No Rank Yet"}
                  </h2>
                  {rankInfo?.current_rank && (
                    <p className={`text-xs ${textMuted}`}>Level {rankInfo.current_rank.level}</p>
                  )}
                </div>
              </div>
              
              {/* Monthly Salary Badge */}
              {rankInfo?.current_rank && (
                <div className="text-right">
                  <p className={`text-xs ${textMuted}`}>Monthly Salary</p>
                  <p className="text-[#0ECB81] font-bold text-xl">${rankInfo.current_rank.monthly_salary}</p>
                </div>
              )}
            </div>

            {/* Team Stats */}
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className={`${cardBg} rounded-xl p-3`}>
                <div className="flex items-center gap-2 mb-1">
                  <UserPlus size={18} className="text-[#00E5FF]" />
                  <span className={`text-xs ${textMuted}`}>Direct Referrals</span>
                </div>
                <p className={`text-lg font-bold ${text}`}>{rankInfo?.direct_referrals || 0}</p>
              </div>
              <div className={`${cardBg} rounded-xl p-3`}>
                <div className="flex items-center gap-2 mb-1">
                  <Users size={18} className="text-[#3498DB]" />
                  <span className={`text-xs ${textMuted}`}>Total Team</span>
                </div>
                <p className={`text-lg font-bold ${text}`}>{rankInfo?.total_team || 0}</p>
              </div>
            </div>

            {/* Progress to Next Rank Header */}
            {rankInfo?.next_rank && rankInfo?.current_rank && (
              <div className="mb-3">
                <p className={`text-sm font-medium ${text}`}>
                  Next Rank: <span style={{color: rankInfo.next_rank.color}}>{rankInfo.next_rank.name}</span>
                </p>
              </div>
            )}
            
            {/* === 3 PROGRESS BARS (When user HAS a rank) === */}
            {rankInfo?.next_rank && rankInfo?.current_rank && (
              <div className="space-y-3 mb-4">
                {/* Progress Bar 1 - Futures Balance (Yellow/Gold) */}
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className={textMuted}>💰 Your Futures Balance</span>
                    <span className="text-[#F0B90B]">
                      ${rankInfo.futures_balance || 0}/${rankInfo.balance_required || 50}
                    </span>
                  </div>
                  <div className={`h-2.5 rounded-full ${isDark ? 'bg-[#2B3139]' : 'bg-gray-200'}`}>
                    <div 
                      className="h-full rounded-full bg-gradient-to-r from-[#F0B90B] to-[#FCD535]"
                      style={{ width: `${Math.min(rankInfo.balance_progress || 0, 100)}%` }}
                    />
                  </div>
                  <p className={`text-xs mt-0.5 ${textMuted}`}>
                    {rankInfo.balance_progress >= 100 ? '✅ Balance requirement met!' : `${(rankInfo.balance_required - rankInfo.futures_balance).toFixed(0)} more needed`}
                  </p>
                </div>
                
                {/* Progress Bar 2 - Direct/Bronze Members (Orange) */}
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className={textMuted}>
                      {rankInfo.next_rank?.type === 'team' ? '👥 Direct Members' : '🥉 Bronze Members'}
                    </span>
                    <span className="text-[#FF6B35]">
                      {rankInfo.members_current || 0}/{rankInfo.members_required || 0}
                    </span>
                  </div>
                  <div className={`h-2.5 rounded-full ${isDark ? 'bg-[#2B3139]' : 'bg-gray-200'}`}>
                    <div 
                      className="h-full rounded-full bg-gradient-to-r from-[#FF6B35] to-[#FF9F1C]"
                      style={{ width: `${Math.min(rankInfo.members_progress || 0, 100)}%` }}
                    />
                  </div>
                  <p className={`text-xs mt-0.5 ${textMuted}`}>
                    {rankInfo.members_progress >= 100 ? '✅ Members requirement met!' : `${(rankInfo.members_required - rankInfo.members_current)} more ${rankInfo.next_rank?.type === 'team' ? 'direct' : 'Bronze'} needed`}
                  </p>
                </div>
                
                {/* Progress Bar 3 - Total Team (Cyan/Blue) */}
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className={textMuted}>👥 Total Team</span>
                    <span className="text-[#00E5FF]">
                      {rankInfo.total_team || 0}/{rankInfo.team_required || 0}
                    </span>
                  </div>
                  <div className={`h-2.5 rounded-full ${isDark ? 'bg-[#2B3139]' : 'bg-gray-200'}`}>
                    <div 
                      className="h-full rounded-full bg-gradient-to-r from-[#00E5FF] to-[#00B4D8]"
                      style={{ width: `${Math.min(rankInfo.team_progress || 0, 100)}%` }}
                    />
                  </div>
                  <p className={`text-xs mt-0.5 ${textMuted}`}>
                    {rankInfo.team_progress >= 100 ? '✅ Team requirement met!' : `${(rankInfo.team_required - rankInfo.total_team)} more team members needed`}
                  </p>
                </div>
              </div>
            )}
            
            {/* No rank yet - show first rank requirements with 3 progress bars */}
            {!rankInfo?.current_rank && (
              <div className="mb-4">
                <div className={`p-3 rounded-xl ${isDark ? 'bg-[#00E5FF]/10' : 'bg-yellow-50'} border border-[#00E5FF]/30 mb-3`}>
                  <p className={`text-sm ${text} font-medium`}>🎯 Get your first rank!</p>
                  <p className={`text-xs ${textMuted} mt-1`}>
                    Complete all 3 requirements to unlock Bronze rank
                  </p>
                </div>
                
                <div className="space-y-3">
                  {/* Progress Bar 1 - Futures Balance (Yellow/Gold) */}
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className={textMuted}>💰 Your Futures Balance</span>
                      <span className="text-[#F0B90B]">
                        ${rankInfo?.futures_balance || 0}/${rankInfo?.balance_required || 50}
                      </span>
                    </div>
                    <div className={`h-2.5 rounded-full ${isDark ? 'bg-[#2B3139]' : 'bg-gray-200'}`}>
                      <div 
                        className="h-full rounded-full bg-gradient-to-r from-[#F0B90B] to-[#FCD535]"
                        style={{ width: `${Math.min(rankInfo?.balance_progress || 0, 100)}%` }}
                      />
                    </div>
                    <p className={`text-xs mt-0.5 ${textMuted}`}>
                      {rankInfo?.balance_progress >= 100 ? '✅ Balance requirement met!' : `${((rankInfo?.balance_required || 50) - (rankInfo?.futures_balance || 0)).toFixed(0)} more needed`}
                    </p>
                  </div>
                  
                  {/* Progress Bar 2 - Direct Members (Orange) */}
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className={textMuted}>👥 Direct Members</span>
                      <span className="text-[#FF6B35]">
                        {rankInfo?.members_current || rankInfo?.direct_referrals || 0}/{rankInfo?.members_required || 6}
                      </span>
                    </div>
                    <div className={`h-2.5 rounded-full ${isDark ? 'bg-[#2B3139]' : 'bg-gray-200'}`}>
                      <div 
                        className="h-full rounded-full bg-gradient-to-r from-[#FF6B35] to-[#FF9F1C]"
                        style={{ width: `${Math.min(rankInfo?.members_progress || rankInfo?.progress || 0, 100)}%` }}
                      />
                    </div>
                    <p className={`text-xs mt-0.5 ${textMuted}`}>
                      {(rankInfo?.members_progress || rankInfo?.progress || 0) >= 100 ? '✅ Members requirement met!' : `${((rankInfo?.members_required || 6) - (rankInfo?.members_current || rankInfo?.direct_referrals || 0))} more direct members needed`}
                    </p>
                  </div>
                  
                  {/* Progress Bar 3 - Total Team (Cyan/Blue) */}
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className={textMuted}>👥 Total Team</span>
                      <span className="text-[#00E5FF]">
                        {rankInfo?.total_team || 0}/{rankInfo?.team_required || 6}
                      </span>
                    </div>
                    <div className={`h-2.5 rounded-full ${isDark ? 'bg-[#2B3139]' : 'bg-gray-200'}`}>
                      <div 
                        className="h-full rounded-full bg-gradient-to-r from-[#00E5FF] to-[#00B4D8]"
                        style={{ width: `${Math.min(rankInfo?.team_progress || 0, 100)}%` }}
                      />
                    </div>
                    <p className={`text-xs mt-0.5 ${textMuted}`}>
                      {(rankInfo?.team_progress || 0) >= 100 ? '✅ Team requirement met!' : `${((rankInfo?.team_required || 6) - (rankInfo?.total_team || 0))} more team members needed`}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Income Info */}
            <div className={`${cardBg} rounded-xl p-3 mb-4`}>
              <div className="flex justify-between items-center">
                <div>
                  <p className={`text-xs ${textMuted}`}>Team Level Income</p>
                  <p className={`font-bold ${text}`}>{formatMoney(rankInfo?.team_level_income || 0)}</p>
                </div>
                <div className="text-center">
                  <p className={`text-xs ${textMuted}`}>Bonus Rate</p>
                  <p className="text-[#00E5FF] font-bold">{rankInfo?.bonus_percent || 0}%</p>
                </div>
                <div className="text-right">
                  <p className={`text-xs ${textMuted}`}>Bonus Income</p>
                  <p className="text-[#0ECB81] font-bold">{formatMoney(rankInfo?.bonus_income || 0)}</p>
                </div>
              </div>
            </div>

            {/* Claim Salary Button */}
            {rankInfo?.current_rank && (
              <Button 
                onClick={handleClaimSalary}
                disabled={claiming}
                className="w-full bg-[#00E5FF] hover:bg-[#00E5FF]/90 text-black font-semibold py-3"
              >
                <Wallet size={20} className="mr-2" />
                {claiming ? "Processing..." : `Claim Salary (${formatMoney((rankInfo.monthly_salary || 0) / 3)})`}
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="px-4 flex gap-2 mb-4">
        <button
          onClick={() => setActiveTab("overview")}
          className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-all ${
            activeTab === "overview" 
              ? 'bg-[#00E5FF] text-black' 
              : `${cardBg} ${text}`
          }`}
        >
          All Ranks
        </button>
        <button
          onClick={() => setActiveTab("history")}
          className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-all ${
            activeTab === "history" 
              ? 'bg-[#00E5FF] text-black' 
              : `${cardBg} ${text}`
          }`}
        >
          Salary History
        </button>
      </div>

      {/* Content */}
      <div className="px-4">
        {activeTab === "overview" && (
          <div className="space-y-4">
            {/* Rank Cards - KuCoin Style */}
            {allRanks.map((rank) => {
              const isCurrentRank = rankInfo?.current_rank?.level === rank.level;
              const isNextRank = rankInfo?.next_rank?.level === rank.level;
              
              // Calculate progress for this rank
              const rankBalanceReq = rank.self_deposit_required || (rank.level === 1 ? 50 : rank.level === 2 ? 200 : rank.level === 3 ? 500 : rank.level === 4 ? 1000 : rank.level === 5 ? 2000 : rank.level === 6 ? 5000 : rank.level === 7 ? 10000 : rank.level === 8 ? 15000 : rank.level === 9 ? 30000 : 50000);
              const balanceProgress = Math.min(100, ((rankInfo?.futures_balance || 0) / rankBalanceReq) * 100);
              const bronzeProgress = rank.bronze_required > 0 ? Math.min(100, ((rankInfo?.bronze_members || 0) / rank.bronze_required) * 100) : 100;
              const teamProgress = Math.min(100, ((rankInfo?.total_team || 0) / rank.team_required) * 100);
              
              // Rank specific colors
              const rankColors = {
                1: { bg: 'linear-gradient(135deg, #CD7F32 0%, #8B4513 100%)', glow: '#CD7F32' }, // Bronze
                2: { bg: 'linear-gradient(135deg, #C0C0C0 0%, #808080 100%)', glow: '#C0C0C0' }, // Silver
                3: { bg: 'linear-gradient(135deg, #FFD700 0%, #FFA500 100%)', glow: '#FFD700' }, // Gold
                4: { bg: 'linear-gradient(135deg, #E5E4E2 0%, #B4B4B4 100%)', glow: '#E5E4E2' }, // Platinum
                5: { bg: 'linear-gradient(135deg, #B9F2FF 0%, #00BFFF 100%)', glow: '#00BFFF' }, // Diamond
                6: { bg: 'linear-gradient(135deg, #9400D3 0%, #4B0082 100%)', glow: '#9400D3' }, // Master
                7: { bg: 'linear-gradient(135deg, #FF4500 0%, #DC143C 100%)', glow: '#FF4500' }, // Grandmaster
                8: { bg: 'linear-gradient(135deg, #00FF00 0%, #008000 100%)', glow: '#00FF00' }, // Champion
                9: { bg: 'linear-gradient(135deg, #FF1493 0%, #C71585 100%)', glow: '#FF1493' }, // Legend
                10: { bg: 'linear-gradient(135deg, #FFD700 0%, #FF6347 50%, #9400D3 100%)', glow: '#FFD700' } // Immortal
              };
              
              const currentRankColor = rankColors[rank.level] || rankColors[1];
              
              return (
                <div 
                  key={rank.level}
                  className="rounded-2xl overflow-hidden"
                  style={{
                    background: isDark ? '#1A1A1A' : '#FFFFFF',
                    border: isCurrentRank ? `2px solid ${currentRankColor.glow}` : `1.5px solid ${isDark ? '#333' : '#E0E0E0'}`,
                    boxShadow: isCurrentRank ? `0 0 20px ${currentRankColor.glow}40` : 'none'
                  }}
                >
                  {/* Header with Gradient */}
                  <div 
                    className="p-4 relative overflow-hidden"
                    style={{ background: currentRankColor.bg }}
                  >
                    {/* Decorative circles */}
                    <div className="absolute -right-4 -top-4 w-24 h-24 rounded-full opacity-20" style={{backgroundColor: 'white'}}></div>
                    <div className="absolute -right-8 -bottom-8 w-32 h-32 rounded-full opacity-10" style={{backgroundColor: 'white'}}></div>
                    
                    <div className="flex items-center justify-between relative z-10">
                      <div className="flex items-center gap-3">
                        {/* Rank Badge */}
                        <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-white/20 backdrop-blur-sm">
                          <span className="text-white font-black text-xl">{rank.level}</span>
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-white font-bold text-lg">{rank.name}</span>
                            {isCurrentRank && (
                              <span className="px-2 py-0.5 rounded-full bg-white/30 text-white text-[10px] font-bold">
                                YOU
                              </span>
                            )}
                          </div>
                          <span className="text-white/70 text-xs">
                            {rank.bronze_required > 0 ? `${rank.bronze_required} Bronze / ` : ''}{rank.team_required} Team
                          </span>
                        </div>
                      </div>
                      
                      {/* Monthly Salary Badge */}
                      <div className="bg-white/20 backdrop-blur-sm px-3 py-1.5 rounded-xl">
                        <p className="text-white/70 text-[10px]">Monthly</p>
                        <p className="text-white font-bold text-lg">${rank.monthly_salary}</p>
                      </div>
                    </div>
                  </div>
                  
                  {/* Body */}
                  <div className="p-4">
                    {/* Reward & Future Balance Tags */}
                    <div className="flex gap-2 mb-4">
                      <span className="px-3 py-1 rounded-full text-xs font-medium" style={{
                        backgroundColor: isDark ? '#F0B90B20' : '#FFF8E1',
                        color: '#F0B90B'
                      }}>
                        🎁 Reward: ${rank.one_time_reward || (rank.level === 1 ? 20 : rank.level === 2 ? 100 : rank.level * 80)}
                      </span>
                      <span className="px-3 py-1 rounded-full text-xs font-medium" style={{
                        backgroundColor: isDark ? '#F0B90B20' : '#FFF8E1',
                        color: '#F0B90B'
                      }}>
                        💰 Min Balance: ${rankBalanceReq}
                      </span>
                    </div>
                    
                    {/* 3 Progress Bars */}
                    <div className="space-y-3">
                      {/* Progress Bar 1 - Futures Balance (Yellow) */}
                      <div className="p-3 rounded-xl" style={{backgroundColor: isDark ? '#1E1E1E' : '#F9FAFB'}}>
                        <div className="flex justify-between text-xs mb-2">
                          <span className={`font-medium ${text}`}>💰 Futures Balance</span>
                          <span className="text-[#F0B90B] font-bold">${rankInfo?.futures_balance || 0} / ${rankBalanceReq}</span>
                        </div>
                        <div className={`h-2 rounded-full ${isDark ? 'bg-[#2B3139]' : 'bg-gray-200'}`}>
                          <div 
                            className="h-full rounded-full bg-gradient-to-r from-[#F0B90B] to-[#FCD535] transition-all duration-500"
                            style={{ width: `${balanceProgress}%` }}
                          />
                        </div>
                        <p className={`text-[10px] mt-1 ${textMuted}`}>
                          {balanceProgress >= 100 ? '✅ Completed' : `${(rankBalanceReq - (rankInfo?.futures_balance || 0)).toFixed(0)} more needed`}
                        </p>
                      </div>
                      
                      {/* Progress Bar 2 - Bronze Members (Orange) - Only for Silver+ */}
                      {rank.bronze_required > 0 && (
                        <div className="p-3 rounded-xl" style={{backgroundColor: isDark ? '#1E1E1E' : '#F9FAFB'}}>
                          <div className="flex justify-between text-xs mb-2">
                            <span className={`font-medium ${text}`}>🥉 Bronze Members</span>
                            <span className="text-[#FF6B35] font-bold">{rankInfo?.bronze_members || 0} / {rank.bronze_required}</span>
                          </div>
                          <div className={`h-2 rounded-full ${isDark ? 'bg-[#2B3139]' : 'bg-gray-200'}`}>
                            <div 
                              className="h-full rounded-full bg-gradient-to-r from-[#FF6B35] to-[#FF9F1C] transition-all duration-500"
                              style={{ width: `${bronzeProgress}%` }}
                            />
                          </div>
                          <p className={`text-[10px] mt-1 ${textMuted}`}>
                            {bronzeProgress >= 100 ? '✅ Completed' : `${rank.bronze_required - (rankInfo?.bronze_members || 0)} more Bronze needed`}
                          </p>
                        </div>
                      )}
                      
                      {/* Progress Bar 3 - Team Members (Cyan) */}
                      <div className="p-3 rounded-xl" style={{backgroundColor: isDark ? '#1E1E1E' : '#F9FAFB'}}>
                        <div className="flex justify-between text-xs mb-2">
                          <span className={`font-medium ${text}`}>👥 Team Members</span>
                          <span className="text-[#00E5FF] font-bold">{rankInfo?.total_team || 0} / {rank.team_required}</span>
                        </div>
                        <div className={`h-2 rounded-full ${isDark ? 'bg-[#2B3139]' : 'bg-gray-200'}`}>
                          <div 
                            className="h-full rounded-full bg-gradient-to-r from-[#00E5FF] to-[#00B4D8] transition-all duration-500"
                            style={{ width: `${teamProgress}%` }}
                          />
                        </div>
                        <p className={`text-[10px] mt-1 ${textMuted}`}>
                          {teamProgress >= 100 ? '✅ Completed' : `${rank.team_required - (rankInfo?.total_team || 0)} more needed`}
                        </p>
                      </div>
                    </div>
                    
                    {/* Bottom Stats Grid */}
                    <div className="grid grid-cols-4 gap-2 mt-4">
                      <div className="p-2 rounded-xl text-center" style={{backgroundColor: isDark ? '#00E5FF15' : '#E0F7FA', border: `1px solid ${isDark ? '#00E5FF30' : '#B2EBF2'}`}}>
                        <p className="text-[#00E5FF] font-bold text-sm">{rank.bonus_percent || (rank.level * 0.5)}%</p>
                        <p className={`text-[9px] ${textMuted}`}>Bonus</p>
                      </div>
                      <div className="p-2 rounded-xl text-center" style={{backgroundColor: isDark ? '#0ECB8115' : '#E8F5E9', border: `1px solid ${isDark ? '#0ECB8130' : '#C8E6C9'}`}}>
                        <p className="text-[#0ECB81] font-bold text-sm">${rank.monthly_salary}</p>
                        <p className={`text-[9px] ${textMuted}`}>Monthly</p>
                      </div>
                      <div className="p-2 rounded-xl text-center" style={{backgroundColor: isDark ? '#F0B90B15' : '#FFF8E1', border: `1px solid ${isDark ? '#F0B90B30' : '#FFECB3'}`}}>
                        <p className="text-[#F0B90B] font-bold text-sm">${rank.one_time_reward || (rank.level === 1 ? 20 : rank.level === 2 ? 100 : rank.level * 80)}</p>
                        <p className={`text-[9px] ${textMuted}`}>Reward</p>
                      </div>
                      <div className="p-2 rounded-xl text-center" style={{backgroundColor: isDark ? '#F0B90B15' : '#FFF8E1', border: `1px solid ${isDark ? '#F0B90B30' : '#FFECB3'}`}}>
                        <p className="text-[#F0B90B] font-bold text-sm">${rankBalanceReq}</p>
                        <p className={`text-[9px] ${textMuted}`}>Future Bal</p>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {activeTab === "history" && (
          <div className={`${cardBg} rounded-xl overflow-hidden`}>
            {salaryHistory.length > 0 ? (
              <div className="divide-y divide-[#2B3139]">
                {salaryHistory.map((item, index) => (
                  <div key={index} className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        item.type === 'levelup_reward' ? 'bg-[#00E5FF]/20' :
                        item.type === 'monthly_salary' ? 'bg-[#0ECB81]/20' : 'bg-[#3498DB]/20'
                      }`}>
                        {item.type === 'levelup_reward' ? (
                          <Gift size={20} className="text-[#00E5FF]" />
                        ) : item.type === 'monthly_salary' ? (
                          <Money size={20} className="text-[#0ECB81]" />
                        ) : (
                          <ChartLineUp size={20} className="text-[#3498DB]" />
                        )}
                      </div>
                      <div>
                        <p className={`font-medium ${text} text-sm`}>
                          {item.type === 'levelup_reward' ? 'Level Up Reward' :
                           item.type === 'monthly_salary' ? 'Monthly Salary' : 'Team Bonus'}
                        </p>
                        <p className={`text-xs ${textMuted}`}>{item.note}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-[#0ECB81] font-bold">+${item.amount?.toFixed(2)}</p>
                      <p className={`text-xs ${textMuted}`}>
                        {new Date(item.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className={`text-center py-12 ${textMuted}`}>
                <Clock size={48} className="mx-auto mb-3 opacity-30" />
                <p className="font-medium">No salary history yet</p>
                <p className="text-xs mt-1">Start building your team to earn!</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Info Card */}
      <div className="px-4 mt-4">
        <div className={`${cardBg} rounded-xl p-4`}>
          <h3 className={`font-semibold mb-3 ${text}`}>How It Works</h3>
          <div className="space-y-3 text-sm">
            <div className="flex gap-3">
              <div className="w-6 h-6 rounded-full bg-[#00E5FF] flex items-center justify-center flex-shrink-0">
                <span className="text-black text-xs font-bold">1</span>
              </div>
              <div>
                <p className={text}>Build Your Team</p>
                <p className={`text-xs ${textMuted}`}>Invite direct referrals with min $50 deposit</p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="w-6 h-6 rounded-full bg-[#0ECB81] flex items-center justify-center flex-shrink-0">
                <span className="text-white text-xs font-bold">2</span>
              </div>
              <div>
                <p className={text}>Unlock Ranks</p>
                <p className={`text-xs ${textMuted}`}>6 direct + $50 each = Bronze rank</p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="w-6 h-6 rounded-full bg-[#F0B90B] flex items-center justify-center flex-shrink-0">
                <span className="text-black text-xs font-bold">3</span>
              </div>
              <div>
                <p className={text}>Maintain Future Balance</p>
                <p className={`text-xs ${textMuted}`}>Keep required amount in Futures to receive salary</p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="w-6 h-6 rounded-full bg-[#3498DB] flex items-center justify-center flex-shrink-0">
                <span className="text-white text-xs font-bold">4</span>
              </div>
              <div>
                <p className={text}>Earn Daily Salary</p>
                <p className={`text-xs ${textMuted}`}>Salary credited at midnight IST daily</p>
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

export default TeamRankPage;
