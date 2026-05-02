import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth, API, useTheme } from "../App";
import axios from "axios";
import { toast } from "sonner";
import BottomNav from "../components/BottomNav";
import { Button } from "../components/ui/button";
import { CaretLeft, Info, Lock, Wallet, Clock, CheckCircle } from "@phosphor-icons/react";

const RankPage = () => {
  const { user } = useAuth();
  const { isDark } = useTheme();
  const navigate = useNavigate();
  const [rankInfo, setRankInfo] = useState(null);
  const [allRanks, setAllRanks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedRank, setSelectedRank] = useState(null);

  // Theme colors
  const bg = isDark ? 'bg-[#0B0E11]' : 'bg-gray-50';
  const cardBg = isDark ? 'bg-[#1E2329]' : 'bg-white';
  const text = isDark ? 'text-white' : 'text-gray-900';
  const textMuted = isDark ? 'text-[#848E9C]' : 'text-gray-500';
  const border = isDark ? 'border-[#2B3139]' : 'border-gray-200';

  // 15 Level Rank Data with Trading Income %
  const rankData = [
    { level: 1, name: "Level-01", selfWallet: 50, directL1: 6, totalTeam: 0, rankReward: 20, monthlyRoyalty: 10, tradingPercent: 0.3 },
    { level: 2, name: "Level-02", selfWallet: 100, directL1: 2, totalTeam: 30, rankReward: 100, monthlyRoyalty: 30, tradingPercent: 0.5 },
    { level: 3, name: "Level-03", selfWallet: 150, directL1: 3, totalTeam: 75, rankReward: 150, monthlyRoyalty: 75, tradingPercent: 0.7 },
    { level: 4, name: "Level-04", selfWallet: 200, directL1: 4, totalTeam: 150, rankReward: 300, monthlyRoyalty: 150, tradingPercent: 1.0 },
    { level: 5, name: "Level-05", selfWallet: 200, directL1: 5, totalTeam: 300, rankReward: 400, monthlyRoyalty: 250, tradingPercent: 1.5 },
    { level: 6, name: "Level-06", selfWallet: 200, directL1: 6, totalTeam: 600, rankReward: 800, monthlyRoyalty: 500, tradingPercent: 2.0 },
    { level: 7, name: "Level-07", selfWallet: 200, directL1: 7, totalTeam: 1500, rankReward: 1000, monthlyRoyalty: 600, tradingPercent: 2.3 },
    { level: 8, name: "Level-08", selfWallet: 200, directL1: 8, totalTeam: 3000, rankReward: 2000, monthlyRoyalty: 1200, tradingPercent: 2.5 },
    { level: 9, name: "Level-09", selfWallet: 200, directL1: 9, totalTeam: 6000, rankReward: 5000, monthlyRoyalty: 2400, tradingPercent: 3.0 },
    { level: 10, name: "Level-10", selfWallet: 200, directL1: 10, totalTeam: 12000, rankReward: 12000, monthlyRoyalty: 5000, tradingPercent: 3.5 },
    { level: 11, name: "Level-11", selfWallet: 200, directL1: 11, totalTeam: 30000, rankReward: 25000, monthlyRoyalty: 10000, tradingPercent: 4.0 },
    { level: 12, name: "Level-12", selfWallet: 200, directL1: 12, totalTeam: 60000, rankReward: 50000, monthlyRoyalty: 20000, tradingPercent: 5.0 },
    { level: 13, name: "Level-13", selfWallet: 200, directL1: 13, totalTeam: 120000, rankReward: 100000, monthlyRoyalty: 40000, tradingPercent: 6.0 },
    { level: 14, name: "Level-14", selfWallet: 200, directL1: 14, totalTeam: 240000, rankReward: 200000, monthlyRoyalty: 80000, tradingPercent: 7.0 },
    { level: 15, name: "Level-15", selfWallet: 200, directL1: 15, totalTeam: 480000, rankReward: 400000, monthlyRoyalty: 160000, tradingPercent: 8.0 },
  ];

  useEffect(() => {
    fetchRankInfo();
    fetchAllRanks();
  }, []);

  const fetchRankInfo = async () => {
    try {
      const teamRes = await axios.get(`${API}/team-rank/info`, { withCredentials: true }).catch(() => ({ data: {} }));
      const teamRankData = teamRes.data || {};
      
      setRankInfo({
        rank: teamRankData.current_rank || { level: 0, name: "No Rank" },
        next_rank: teamRankData.next_rank,
        progress: teamRankData.progress || 0,
        direct_referrals: teamRankData.direct_referrals || 0,
        bronze_members: teamRankData.bronze_members || 0,
        total_team: teamRankData.total_team || 0,
        levelup_reward: teamRankData.levelup_reward || 0,
        accumulated_salary: teamRankData.accumulated_salary || 0,
        days_in_cycle: teamRankData.days_in_cycle || 0,
        days_remaining: teamRankData.days_remaining || 10,
        can_claim_salary: teamRankData.can_claim_salary || false
      });
    } catch (error) {
      console.error("Error fetching rank info:", error);
    }
  };

  const fetchAllRanks = async () => {
    try {
      const res = await axios.get(`${API}/team-rank/all-levels`, { withCredentials: true });
      setAllRanks(res.data?.ranks || []);
    } catch (error) {
      console.error("Error fetching ranks:", error);
    } finally {
      setLoading(false);
    }
  };

  const claimLevelupReward = async () => {
    try {
      const res = await axios.post(`${API}/team-rank/claim-levelup-reward`, {}, { withCredentials: true });
      toast.success(`Rank Reward $${res.data.reward_amount} claimed!`);
      fetchRankInfo();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to claim reward");
    }
  };

  const claimSalary = async () => {
    try {
      const res = await axios.post(`${API}/team-rank/claim-salary`, {}, { withCredentials: true });
      toast.success(`Monthly Royalty $${res.data.salary_amount} claimed!`);
      fetchRankInfo();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to claim royalty");
    }
  };

  const currentLevel = rankInfo?.rank?.level || 0;

  // Format large numbers
  const formatNum = (num) => {
    if (num >= 1000000) return `${(num/1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num/1000).toFixed(0)}K`;
    return num.toString();
  };

  return (
    <div className={`min-h-screen ${bg} ${text} pb-20`}>
      {/* Header */}
      <div className={`sticky top-0 z-50 ${cardBg} border-b ${border}`}>
        <div className="flex items-center justify-between p-4">
          <button onClick={() => navigate(-1)} className="p-2 hover:bg-white/10 rounded-full">
            <CaretLeft size={24} />
          </button>
          <h1 className="text-lg font-bold">Rank System</h1>
          <div className="w-10"></div>
        </div>
      </div>

      {/* Important Notice */}
      <div 
        style={{
          background: 'linear-gradient(145deg, rgba(255,200,0,0.1), rgba(255,150,0,0.05))',
          boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.1)'
        }}
        className="mx-4 mt-4 p-3 border border-yellow-500/20 rounded-xl"
      >
        <p className="text-yellow-500/90 text-sm font-medium text-center">
          Only Active Member Required Minimum $50
        </p>
      </div>

      {/* Current Rank Card - 3D Effect */}
      <div className="mx-4 mt-4">
        <div 
          style={{
            background: isDark 
              ? 'linear-gradient(145deg, #1e2126, #15181c)' 
              : 'linear-gradient(145deg, #ffffff, #f0f0f0)',
            boxShadow: '0 20px 50px rgba(0,0,0,0.3), 0 0 0 1px rgba(255,255,255,0.05) inset',
            transform: 'perspective(1000px) rotateX(1deg)'
          }}
          className="rounded-2xl p-5"
        >
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className={`text-sm ${textMuted}`}>Your Current Rank</p>
              <p className={`text-2xl font-bold mt-1 ${isDark ? 'text-gray-100' : 'text-gray-800'}`}>
                {currentLevel > 0 ? `Level-${String(currentLevel).padStart(2, '0')}` : 'No Rank'}
              </p>
            </div>
            {/* 3D Level Badge */}
            <div 
              style={{
                background: 'linear-gradient(145deg, #2a2d32, #1a1d21)',
                boxShadow: '8px 8px 16px rgba(0,0,0,0.4), -4px -4px 12px rgba(255,255,255,0.05), inset 0 2px 2px rgba(255,255,255,0.1)'
              }}
              className="w-16 h-16 rounded-2xl flex items-center justify-center"
            >
              <span className="text-2xl font-bold text-white">{currentLevel || '-'}</span>
            </div>
          </div>

          {/* Stats - 3D Cards */}
          <div className="grid grid-cols-3 gap-3 mt-4">
            <div 
              style={{
                background: isDark ? 'linear-gradient(145deg, #1a1d21, #12151a)' : 'linear-gradient(145deg, #f5f5f5, #e8e8e8)',
                boxShadow: '4px 4px 10px rgba(0,0,0,0.2), -2px -2px 6px rgba(255,255,255,0.03)'
              }}
              className="p-3 rounded-xl"
            >
              <p className={`text-xs ${textMuted}`}>Direct L1</p>
              <p className={`text-lg font-bold ${isDark ? 'text-gray-100' : 'text-gray-800'}`}>{rankInfo?.direct_referrals || 0}</p>
            </div>
            <div 
              style={{
                background: isDark ? 'linear-gradient(145deg, #1a1d21, #12151a)' : 'linear-gradient(145deg, #f5f5f5, #e8e8e8)',
                boxShadow: '4px 4px 10px rgba(0,0,0,0.2), -2px -2px 6px rgba(255,255,255,0.03)'
              }}
              className="p-3 rounded-xl"
            >
              <p className={`text-xs ${textMuted}`}>L1 Active</p>
              <p className={`text-lg font-bold ${isDark ? 'text-gray-100' : 'text-gray-800'}`}>{rankInfo?.bronze_members || 0}</p>
            </div>
            <div 
              style={{
                background: isDark ? 'linear-gradient(145deg, #1a1d21, #12151a)' : 'linear-gradient(145deg, #f5f5f5, #e8e8e8)',
                boxShadow: '4px 4px 10px rgba(0,0,0,0.2), -2px -2px 6px rgba(255,255,255,0.03)'
              }}
              className="p-3 rounded-xl"
            >
              <p className={`text-xs ${textMuted}`}>Total Team</p>
              <p className={`text-lg font-bold ${isDark ? 'text-gray-100' : 'text-gray-800'}`}>{formatNum(rankInfo?.total_team || 0)}</p>
            </div>
          </div>

          {/* Claim Buttons */}
          {rankInfo?.levelup_reward > 0 && (
            <Button 
              onClick={claimLevelupReward}
              className="w-full mt-4 bg-green-600 hover:bg-green-700 text-white"
            >
              Claim Rank Reward ${rankInfo.levelup_reward}
            </Button>
          )}
          
          {/* Monthly Royalty - 10-10-10 Days System */}
          {currentLevel > 0 && (
            <div className={`mt-4 p-3 rounded-xl ${isDark ? 'bg-[#2B3139]' : 'bg-gray-100'}`}>
              <div className="flex justify-between items-center mb-2">
                <p className={`text-sm ${textMuted}`}>Monthly Royalty (10 Days)</p>
                <p className="text-xs text-blue-400">
                  ${formatNum(Math.round((rankData.find(r => r.level === currentLevel)?.monthlyRoyalty || 0) / 3))}/claim
                </p>
              </div>
              <div className="flex justify-between items-center">
                <p className={`text-xs ${textMuted}`}>
                  {rankInfo?.can_claim_salary 
                    ? 'Ready to claim!' 
                    : `${rankInfo?.days_remaining || 10} days remaining`
                  }
                </p>
                <Button 
                  onClick={claimSalary}
                  disabled={!rankInfo?.can_claim_salary}
                  size="sm"
                  className={`${rankInfo?.can_claim_salary 
                    ? 'bg-blue-600 hover:bg-blue-700' 
                    : 'bg-gray-600 cursor-not-allowed'
                  } text-white text-xs`}
                >
                  {rankInfo?.can_claim_salary ? 'Claim Now' : 'Wait'}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* All 15 Levels */}
      <div className="mx-4 mt-6 mb-4">
        <h2 className="text-lg font-bold mb-3">All Ranks (15 Levels)</h2>
        
        <div className="space-y-3">
          {rankData.map((rank) => {
            const isAchieved = currentLevel >= rank.level;
            const isCurrent = currentLevel === rank.level;
            
            return (
              <div 
                key={rank.level}
                onClick={() => setSelectedRank(selectedRank === rank.level ? null : rank.level)}
                style={{
                  background: isDark 
                    ? 'linear-gradient(145deg, #1a1d21, #12151a)' 
                    : 'linear-gradient(145deg, #ffffff, #f5f5f5)',
                  boxShadow: '6px 6px 15px rgba(0,0,0,0.25), -3px -3px 10px rgba(255,255,255,0.03)'
                }}
                className={`rounded-xl overflow-hidden cursor-pointer transition-all duration-300 hover:scale-[1.01] ${
                  isCurrent ? 'ring-1 ring-white/30' : ''
                }`}
              >
                {/* Main Row */}
                <div className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {/* Level Badge - Same for all */}
                    <div 
                      style={{
                        background: 'linear-gradient(145deg, #252830, #1a1d21)',
                        boxShadow: '3px 3px 6px rgba(0,0,0,0.3), -1px -1px 4px rgba(255,255,255,0.05), inset 0 1px 1px rgba(255,255,255,0.08)'
                      }}
                      className="w-11 h-11 rounded-xl flex items-center justify-center font-bold text-sm text-gray-300"
                    >
                      {rank.level}
                    </div>
                    <div>
                      <p className={`font-semibold ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>{rank.name}</p>
                      <p className={`text-xs ${textMuted}`}>
                        {rank.level === 1 
                          ? `$${rank.selfWallet} Self + ${rank.directL1} Direct Active`
                          : `${rank.directL1} L1 Active + ${formatNum(rank.totalTeam)} Team`
                        }
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`font-bold text-lg ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>${formatNum(rank.rankReward)}</p>
                    <p className={`text-xs ${textMuted}`}>Reward</p>
                  </div>
                </div>

                {/* Expanded Details */}
                {selectedRank === rank.level && (
                  <div 
                    style={{
                      background: isDark 
                        ? 'linear-gradient(180deg, rgba(255,255,255,0.02) 0%, rgba(0,0,0,0.1) 100%)' 
                        : 'linear-gradient(180deg, rgba(0,0,0,0.02) 0%, rgba(0,0,0,0.05) 100%)'
                    }}
                    className={`px-4 pb-4 pt-3 border-t ${isDark ? 'border-white/5' : 'border-gray-200'}`}
                  >
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div className={`p-2 rounded-lg ${isDark ? 'bg-black/20' : 'bg-gray-100'}`}>
                        <p className={`text-xs ${textMuted}`}>Self Wallet</p>
                        <p className="font-semibold">${rank.selfWallet}</p>
                      </div>
                      <div className={`p-2 rounded-lg ${isDark ? 'bg-black/20' : 'bg-gray-100'}`}>
                        <p className={`text-xs ${textMuted}`}>Direct L1 Active</p>
                        <p className="font-semibold">{rank.directL1} Members</p>
                      </div>
                      {rank.totalTeam > 0 && (
                        <div className={`p-2 rounded-lg ${isDark ? 'bg-black/20' : 'bg-gray-100'}`}>
                          <p className={`text-xs ${textMuted}`}>Total Team (10 Levels)</p>
                          <p className="font-semibold">{formatNum(rank.totalTeam)} Members</p>
                        </div>
                      )}
                      <div className={`p-2 rounded-lg ${isDark ? 'bg-black/20' : 'bg-gray-100'}`}>
                        <p className={`text-xs ${textMuted}`}>Monthly Royalty</p>
                        <p className="font-semibold">${formatNum(rank.monthlyRoyalty)}/month</p>
                      </div>
                      <div className={`p-2 rounded-lg ${isDark ? 'bg-black/20' : 'bg-gray-100'}`}>
                        <p className={`text-xs ${textMuted}`}>Trading Income</p>
                        <p className="font-semibold">{rank.tradingPercent}% of Team Trading</p>
                      </div>
                    </div>

                    {/* Income Breakdown Info */}
                    <div 
                      style={{
                        background: isDark 
                          ? 'linear-gradient(145deg, rgba(255,255,255,0.03), rgba(0,0,0,0.1))' 
                          : 'linear-gradient(145deg, #f8f8f8, #e8e8e8)',
                        boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.1)'
                      }}
                      className="mt-3 p-3 rounded-lg text-xs"
                    >
                      <p className={`${textMuted} font-medium`}>Income System (10 Days Lock):</p>
                      <p className="mt-1">• 1st Claim: Fixed ${formatNum(Math.round(rank.monthlyRoyalty / 3))}</p>
                      <p>• All Next Claims: {rank.tradingPercent}% Team Trading (10 Levels)</p>
                    </div>

                    {/* Requirements Status */}
                    {!isAchieved && rankInfo && (
                      <div className="mt-3 pt-3 border-t border-dashed border-gray-600">
                        <p className={`text-xs ${textMuted} mb-2`}>Your Progress:</p>
                        <div className="space-y-1 text-xs">
                          {rank.level === 1 ? (
                            <>
                              <div className="flex justify-between">
                                <span>Direct Active Members</span>
                                <span className={rankInfo.bronze_members >= rank.directL1 ? 'text-green-500' : 'text-red-400'}>
                                  {rankInfo.bronze_members || 0}/{rank.directL1}
                                </span>
                              </div>
                            </>
                          ) : (
                            <>
                              <div className="flex justify-between">
                                <span>L1 Active Members</span>
                                <span className={rankInfo.bronze_members >= rank.directL1 ? 'text-green-500' : 'text-red-400'}>
                                  {rankInfo.bronze_members || 0}/{rank.directL1}
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span>Total Team</span>
                                <span className={(rankInfo.total_team || 0) >= rank.totalTeam ? 'text-green-500' : 'text-red-400'}>
                                  {formatNum(rankInfo.total_team || 0)}/{formatNum(rank.totalTeam)}
                                </span>
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <BottomNav />
    </div>
  );
};

export default RankPage;
