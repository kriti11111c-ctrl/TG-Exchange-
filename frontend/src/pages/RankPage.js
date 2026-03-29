import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth, API, useTheme } from "../App";
import axios from "axios";
import BottomNav from "../components/BottomNav";
import { 
  CaretLeft,
  Info,
  ChartLineUp,
  Fire,
  Lightning
} from "@phosphor-icons/react";

const RankPage = () => {
  const { user } = useAuth();
  const { isDark } = useTheme();
  const navigate = useNavigate();
  const [rankInfo, setRankInfo] = useState(null);
  const [allRanks, setAllRanks] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [activeTab, setActiveTab] = useState("myRank");
  const [loading, setLoading] = useState(true);
  const [selectedRank, setSelectedRank] = useState(null);

  // Theme colors
  const bg = isDark ? 'bg-[#0B0E11]' : 'bg-gray-50';
  const cardBg = isDark ? 'bg-[#1E2329]' : 'bg-white';
  const text = isDark ? 'text-white' : 'text-gray-900';
  const textMuted = isDark ? 'text-[#848E9C]' : 'text-gray-500';

  // Rank colors for circular badges
  const rankColors = {
    1: "#6B7280", // Bronze - Gray
    2: "#3B82F6", // Silver - Blue
    3: "#10B981", // Gold - Green
    4: "#F59E0B", // Platinum - Yellow
    5: "#F97316", // Diamond - Orange
    6: "#A855F7", // Master - Purple
    7: "#EC4899", // Grandmaster - Pink
    8: "#EF4444", // Champion - Red
    9: "#F59E0B", // Legend - Gold
    10: "#DC2626"  // Immortal - Deep Red
  };

  // Rank names
  const rankNames = {
    1: "Bronze",
    2: "Silver", 
    3: "Gold",
    4: "Platinum",
    5: "Diamond",
    6: "Master",
    7: "Grandmaster",
    8: "Champion",
    9: "Legend",
    10: "Immortal"
  };

  // Rank requirements (Bronze users / Team)
  const rankRequirements = {
    1: { bronze: 0, team: 6 },           // 0 Bronze / 6T (Starting rank)
    2: { bronze: 2, team: 30 },         // 2 Bronze / 30T
    3: { bronze: 3, team: 75 },         // 3 Bronze / 75T
    4: { bronze: 4, team: 150 },        // 4 Bronze / 150T
    5: { bronze: 5, team: 300 },        // 5 Bronze / 300T
    6: { bronze: 6, team: 600 },        // 6 Bronze / 600T
    7: { bronze: 7, team: 1000 },       // 7 Bronze / 1000T
    8: { bronze: 8, team: 2000 },       // 8 Bronze / 2000T
    9: { bronze: 9, team: 4000 },       // 9 Bronze / 4000T
    10: { bronze: 10, team: 8000 }      // 10 Bronze / 8000T
  };

  // Format requirement text
  const formatRequirement = (level) => {
    const req = rankRequirements[level];
    if (!req) return '0 Bronze/0T';
    return `${req.bronze} Bronze/${req.team}T`;
  };

  // Rank benefits (Bonus %, Monthly Salary, Level-up Reward)
  const rankBenefits = {
    1: { bonus: 0.5, salary: 30, reward: 50 },
    2: { bonus: 1.0, salary: 100, reward: 150 },
    3: { bonus: 1.5, salary: 250, reward: 400 },
    4: { bonus: 2.0, salary: 500, reward: 800 },
    5: { bonus: 2.5, salary: 1000, reward: 1500 },
    6: { bonus: 3.0, salary: 2000, reward: 3000 },
    7: { bonus: 3.5, salary: 4000, reward: 6000 },
    8: { bonus: 4.0, salary: 7000, reward: 10000 },
    9: { bonus: 4.5, salary: 12000, reward: 18000 },
    10: { bonus: 5.0, salary: 20000, reward: 30000 }
  };

  // Calculate progress to a specific rank
  const calculateProgressToRank = (targetLevel) => {
    const currentBronze = rankInfo?.bronze_members || 0;
    const currentTeam = rankInfo?.total_team || 0;
    const targetReq = rankRequirements[targetLevel];
    
    if (!targetReq) return 100;
    
    const bronzeProgress = targetReq.bronze > 0 ? Math.min(100, (currentBronze / targetReq.bronze) * 100) : 100;
    const teamProgress = targetReq.team > 0 ? Math.min(100, (currentTeam / targetReq.team) * 100) : 100;
    
    return Math.min(bronzeProgress, teamProgress);
  };

  useEffect(() => {
    fetchRankInfo();
    fetchAllRanks();
    fetchLeaderboard();
  }, []);

  const fetchRankInfo = async () => {
    try {
      const [rankRes, teamRes] = await Promise.all([
        axios.get(`${API}/rank/info`, { withCredentials: true }),
        axios.get(`${API}/team-rank/info`, { withCredentials: true }).catch(() => ({ data: {} }))
      ]);
      
      // Merge team stats into rankInfo
      setRankInfo({
        ...rankRes.data,
        direct_referrals: teamRes.data?.direct_referrals || 0,
        bronze_members: teamRes.data?.bronze_members || 0,
        total_team: teamRes.data?.total_team || 0
      });
    } catch (error) {
      console.error("Error fetching rank info:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAllRanks = async () => {
    try {
      const response = await axios.get(`${API}/rank/all-levels`, { withCredentials: true });
      setAllRanks(response.data.ranks || []);
    } catch (error) {
      console.error("Error fetching ranks:", error);
    }
  };

  const fetchLeaderboard = async () => {
    try {
      const response = await axios.get(`${API}/rank/leaderboard`, { withCredentials: true });
      setLeaderboard(response.data.leaderboard || []);
    } catch (error) {
      console.error("Error fetching leaderboard:", error);
    }
  };

  const formatVolume = (vol) => {
    if (vol >= 1e6) return `$${(vol / 1e6).toFixed(1)}M`;
    if (vol >= 1e3) return `$${(vol / 1e3).toFixed(1)}K`;
    return `$${vol?.toFixed(0) || '0'}`;
  };

  if (loading) {
    return (
      <div className={`min-h-screen ${bg} flex items-center justify-center`}>
        <div className="animate-spin w-8 h-8 border-2 border-[#F0B90B] border-t-transparent rounded-full"></div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${bg}`}>
      {/* Header */}
      <div className={`${isDark ? 'bg-[#0B0E11]' : 'bg-white'} px-4 py-3 flex items-center justify-between sticky top-0 z-50 border-b ${isDark ? 'border-[#2B3139]' : 'border-gray-200'}`}>
        <button onClick={() => navigate(-1)} className={text}>
          <CaretLeft size={24} weight="bold" />
        </button>
        <span className={`font-semibold text-lg ${text}`}>VIP Rank</span>
        <button className={textMuted}>
          <Info size={22} />
        </button>
      </div>

      {/* Current Rank Card */}
      <div className="px-4 py-4">
        <div 
          className={`rounded-2xl p-5 relative overflow-hidden`}
          style={{
            background: `linear-gradient(135deg, ${rankColors[rankInfo?.rank?.level || 1]}40, ${rankColors[rankInfo?.rank?.level || 1]}20)`
          }}
        >
          <div className="flex items-center gap-4">
            {/* Circular Badge */}
            <div 
              className="w-20 h-20 rounded-full flex items-center justify-center shadow-lg"
              style={{ backgroundColor: rankColors[rankInfo?.rank?.level || 1] }}
            >
              <span className="text-white text-3xl font-bold">{rankInfo?.rank?.level || 1}</span>
            </div>
            
            {/* Info */}
            <div className="flex-1">
              <p className={`text-sm ${textMuted}`}>Current Rank</p>
              <h2 className={`text-2xl font-bold ${text}`}>
                {rankNames[rankInfo?.rank?.level || 1]}
              </h2>
              <p className={`text-sm ${textMuted}`}>
                {rankRequirements[rankInfo?.rank?.level || 1]?.direct || 0}D/{rankRequirements[rankInfo?.rank?.level || 1]?.team || 0}T
              </p>
            </div>
          </div>

          {/* Progress to next */}
          {rankInfo?.next_rank && (
            <div className="mt-4">
              <div className="flex justify-between text-xs mb-1.5">
                <span className={textMuted}>Next: {rankNames[rankInfo?.next_rank?.level]}</span>
                <span className="text-[#F0B90B] font-medium">{rankInfo?.progress?.toFixed(0)}%</span>
              </div>
              <div className={`h-2 rounded-full ${isDark ? 'bg-[#2B3139]' : 'bg-gray-200'} overflow-hidden`}>
                <div 
                  className="h-full rounded-full transition-all duration-700"
                  style={{ 
                    width: `${rankInfo?.progress || 0}%`,
                    backgroundColor: rankColors[rankInfo?.next_rank?.level]
                  }}
                />
              </div>
              <p className={`text-xs mt-1.5 ${textMuted}`}>
                Need: {rankRequirements[rankInfo?.next_rank?.level]?.direct || 0} direct + {rankRequirements[rankInfo?.next_rank?.level]?.team || 0} team (min $50 deposit)
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="px-4 mt-4 flex gap-2">
        <button
          onClick={() => setActiveTab("myRank")}
          className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-all ${
            activeTab === "myRank" 
              ? 'bg-[#F0B90B] text-black' 
              : `${cardBg} ${text}`
          }`}
        >
          All Levels
        </button>
        <button
          onClick={() => setActiveTab("leaderboard")}
          className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-all ${
            activeTab === "leaderboard" 
              ? 'bg-[#F0B90B] text-black' 
              : `${cardBg} ${text}`
          }`}
        >
          Leaderboard
        </button>
      </div>

      {/* Content */}
      <div className="px-4 mt-4 pb-8">
        {activeTab === "myRank" && (
          <div className="space-y-2">
            {allRanks.map((rank) => {
              const isCurrentRank = rankInfo?.rank?.level === rank.level;
              const isLocked = rank.level > (rankInfo?.rank?.level || 0);
              const isSelected = selectedRank === rank.level;
              const progress = calculateProgressToRank(rank.level);
              const benefits = rankBenefits[rank.level];
              const requirements = rankRequirements[rank.level];
              
              return (
                <div key={rank.level}>
                  {/* Rank Card - Clickable */}
                  <div 
                    onClick={() => setSelectedRank(isSelected ? null : rank.level)}
                    className={`rounded-xl p-4 cursor-pointer transition-all ${isSelected ? 'rounded-b-none' : ''}`}
                    style={{
                      background: isCurrentRank 
                        ? (isDark 
                            ? 'linear-gradient(135deg, rgba(240, 185, 11, 0.15) 0%, rgba(240, 185, 11, 0.05) 100%)'
                            : 'linear-gradient(135deg, rgba(240, 185, 11, 0.2) 0%, rgba(255, 250, 230, 1) 100%)')
                        : (isDark ? '#1E2329' : 'white'),
                      border: isCurrentRank 
                        ? '3px solid #F0B90B'
                        : `2px solid ${isDark ? '#3B4149' : '#D1D5DB'}`,
                      boxShadow: isCurrentRank 
                        ? '0 0 20px rgba(240, 185, 11, 0.4), inset 0 0 20px rgba(240, 185, 11, 0.05)'
                        : 'none',
                      opacity: isLocked ? 0.5 : 1
                    }}
                  >
                    <div className="flex items-center gap-3">
                      {/* Circular Badge */}
                      <div 
                        className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0"
                        style={{ 
                          backgroundColor: rankColors[rank.level],
                          boxShadow: isCurrentRank ? `0 0 15px ${rankColors[rank.level]}80` : 'none'
                        }}
                      >
                        <span className="text-white font-bold text-lg">{rank.level}</span>
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={`font-semibold ${text} truncate`}>
                            {rankNames[rank.level]}
                          </span>
                          {isCurrentRank && (
                            <span 
                              className="text-[10px] px-2 py-0.5 rounded font-bold flex-shrink-0"
                              style={{
                                background: 'linear-gradient(135deg, #F0B90B, #FFD700)',
                                color: '#000'
                              }}
                            >
                              YOU
                            </span>
                          )}
                        </div>
                        {/* Requirements on second line */}
                        <p className={`text-sm ${isCurrentRank ? 'text-[#F0B90B]' : textMuted}`}>
                          {formatRequirement(rank.level)}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Expanded Details - Classic Card */}
                  {isSelected && (
                    <div 
                      className="rounded-b-xl overflow-hidden"
                      style={{
                        background: isDark 
                          ? 'linear-gradient(145deg, #1a1a2e 0%, #16213e 50%, #1a1a2e 100%)'
                          : 'linear-gradient(145deg, #fefbf3 0%, #f8f4e8 50%, #fefbf3 100%)',
                        border: '2px solid',
                        borderTop: 'none',
                        borderColor: rankColors[rank.level] + '50'
                      }}
                    >
                      {/* Decorative Header */}
                      <div 
                        className="h-1"
                        style={{ background: `linear-gradient(90deg, transparent, ${rankColors[rank.level]}, transparent)` }}
                      />
                      
                      <div className="p-4">
                        {/* Progress Bars Section */}
                        <div className="space-y-4 mb-5">
                          {/* Direct/Bronze Progress */}
                          <div>
                            <div className="flex justify-between items-center mb-2">
                              <div className="flex items-center gap-2">
                                <div className="w-6 h-6 rounded-full bg-[#F0B90B]/20 flex items-center justify-center">
                                  <span className="text-[#F0B90B] text-xs font-bold">{requirements?.type === 'direct' ? 'D' : 'B'}</span>
                                </div>
                                <span className={`text-sm ${text}`}>
                                  {requirements?.type === 'direct' ? 'Direct Referrals' : 'Bronze Members'}
                                </span>
                              </div>
                              <span className={`text-sm font-medium`} style={{ color: rankColors[rank.level] }}>
                                {requirements?.type === 'direct' 
                                  ? `${rankInfo?.direct_referrals || 0}/${requirements?.direct}`
                                  : `${rankInfo?.bronze_members || 0}/${requirements?.bronze}`
                                }
                              </span>
                            </div>
                            <div className={`h-3 rounded-full ${isDark ? 'bg-[#2B3139]' : 'bg-gray-200'} overflow-hidden`}>
                              <div 
                                className="h-full rounded-full transition-all duration-500"
                                style={{ 
                                  width: `${Math.min(100, requirements?.type === 'direct' 
                                    ? ((rankInfo?.direct_referrals || 0) / requirements?.direct) * 100
                                    : ((rankInfo?.bronze_members || 0) / requirements?.bronze) * 100
                                  )}%`,
                                  background: `linear-gradient(90deg, ${rankColors[rank.level]}, ${rankColors[rank.level]}90)`
                                }}
                              />
                            </div>
                            <p className={`text-xs mt-1 ${textMuted}`}>
                              {requirements?.type === 'direct' 
                                ? `${Math.max(0, requirements?.direct - (rankInfo?.direct_referrals || 0))} more needed`
                                : `${Math.max(0, requirements?.bronze - (rankInfo?.bronze_members || 0))} more Bronze needed`
                              }
                            </p>
                          </div>

                          {/* Team Progress */}
                          <div>
                            <div className="flex justify-between items-center mb-2">
                              <div className="flex items-center gap-2">
                                <div className="w-6 h-6 rounded-full bg-[#0ECB81]/20 flex items-center justify-center">
                                  <span className="text-[#0ECB81] text-xs font-bold">T</span>
                                </div>
                                <span className={`text-sm ${text}`}>Team Members</span>
                              </div>
                              <span className="text-sm font-medium text-[#0ECB81]">
                                {rankInfo?.total_team || 0}/{requirements?.team}
                              </span>
                            </div>
                            <div className={`h-3 rounded-full ${isDark ? 'bg-[#2B3139]' : 'bg-gray-200'} overflow-hidden`}>
                              <div 
                                className="h-full rounded-full transition-all duration-500"
                                style={{ 
                                  width: `${requirements?.team > 0 ? Math.min(100, ((rankInfo?.total_team || 0) / requirements?.team) * 100) : 100}%`,
                                  background: 'linear-gradient(90deg, #0ECB81, #0ECB8190)'
                                }}
                              />
                            </div>
                            <p className={`text-xs mt-1 ${textMuted}`}>
                              {requirements?.team > 0 ? `${Math.max(0, requirements?.team - (rankInfo?.total_team || 0))} more needed` : 'No team required'}
                            </p>
                          </div>
                        </div>

                        {/* Divider */}
                        <div className="flex items-center gap-3 my-4">
                          <div className="flex-1 h-px" style={{ background: `linear-gradient(90deg, transparent, ${rankColors[rank.level]}50, transparent)` }}></div>
                          <span style={{ color: rankColors[rank.level] }} className="text-xs">◆</span>
                          <div className="flex-1 h-px" style={{ background: `linear-gradient(90deg, transparent, ${rankColors[rank.level]}50, transparent)` }}></div>
                        </div>

                        {/* Benefits Grid */}
                        <div className="grid grid-cols-3 gap-3">
                          <div 
                            className="text-center p-3 rounded-xl"
                            style={{ 
                              background: isDark ? 'rgba(240, 185, 11, 0.1)' : 'rgba(240, 185, 11, 0.15)',
                              border: '1px solid rgba(240, 185, 11, 0.2)'
                            }}
                          >
                            <p className="text-[#F0B90B] text-xl font-bold">{benefits?.bonus}%</p>
                            <p className={`text-[10px] ${textMuted} mt-1`}>Bonus</p>
                          </div>
                          <div 
                            className="text-center p-3 rounded-xl"
                            style={{ 
                              background: isDark ? 'rgba(14, 203, 129, 0.1)' : 'rgba(14, 203, 129, 0.15)',
                              border: '1px solid rgba(14, 203, 129, 0.2)'
                            }}
                          >
                            <p className="text-[#0ECB81] text-xl font-bold">${benefits?.salary >= 1000 ? (benefits?.salary/1000) + 'K' : benefits?.salary}</p>
                            <p className={`text-[10px] ${textMuted} mt-1`}>Monthly</p>
                          </div>
                          <div 
                            className="text-center p-3 rounded-xl"
                            style={{ 
                              background: isDark ? 'rgba(59, 130, 246, 0.1)' : 'rgba(59, 130, 246, 0.15)',
                              border: '1px solid rgba(59, 130, 246, 0.2)'
                            }}
                          >
                            <p className="text-[#3B82F6] text-xl font-bold">${benefits?.reward >= 1000 ? (benefits?.reward/1000) + 'K' : benefits?.reward}</p>
                            <p className={`text-[10px] ${textMuted} mt-1`}>Reward</p>
                          </div>
                        </div>

                        {/* Footer Note */}
                        <p className={`text-[10px] ${textMuted} text-center mt-4`}>
                          {requirements?.type === 'direct' 
                            ? '* Min $50 deposit required per referral'
                            : '* Bronze rank members count towards requirement'
                          }
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {activeTab === "leaderboard" && (
          <div className={`${cardBg} rounded-xl overflow-hidden`}>
            {leaderboard.length > 0 ? (
              <div className="divide-y divide-[#2B3139]/50">
                {leaderboard.map((trader, index) => (
                  <div key={index} className="p-4 flex items-center gap-3">
                    {/* Position Badge */}
                    <div 
                      className={`w-10 h-10 rounded-full flex items-center justify-center font-bold flex-shrink-0`}
                      style={{ 
                        backgroundColor: trader.position <= 3 
                          ? rankColors[trader.position] 
                          : isDark ? '#2B3139' : '#E5E7EB'
                      }}
                    >
                      <span className={trader.position <= 3 ? 'text-white' : text}>{trader.position}</span>
                    </div>
                    
                    {/* User Info */}
                    <div className="flex-1 min-w-0">
                      <p className={`font-medium ${text} truncate`}>{trader.name}</p>
                      <p className={`text-xs ${textMuted} truncate`}>{trader.email}</p>
                    </div>
                    
                    {/* Volume */}
                    <div className="text-right flex-shrink-0">
                      <p className="text-[#0ECB81] font-bold">{formatVolume(trader.total_volume)}</p>
                      <p className={`text-xs ${textMuted}`}>{trader.trade_count} trades</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className={`text-center py-12 ${textMuted}`}>
                <ChartLineUp size={48} className="mx-auto mb-3 opacity-30" />
                <p className="font-medium">No traders yet</p>
                <p className="text-xs mt-1">Start trading to rank up!</p>
              </div>
            )}
          </div>
        )}
      </div>
      
      {/* Bottom Spacing for Navigation */}
      <div className="h-24"></div>
      
      {/* Bottom Navigation */}
      <BottomNav />
    </div>
  );
};

export default RankPage;
