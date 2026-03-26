import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth, API, useTheme } from "../App";
import axios from "axios";
import { toast } from "sonner";
import { 
  CaretLeft,
  CaretRight,
  Trophy,
  Star,
  Crown,
  Lightning,
  Medal,
  Ranking,
  ChartLineUp,
  Coins,
  Clock,
  Fire,
  Sparkle,
  Info
} from "@phosphor-icons/react";
import { Button } from "../components/ui/button";
import { Progress } from "../components/ui/progress";

const RankPage = () => {
  const { user } = useAuth();
  const { isDark } = useTheme();
  const navigate = useNavigate();
  const [rankInfo, setRankInfo] = useState(null);
  const [allRanks, setAllRanks] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [activeTab, setActiveTab] = useState("myRank");
  const [loading, setLoading] = useState(true);

  // Theme colors
  const bg = isDark ? 'bg-[#0B0E11]' : 'bg-[#FAFAFA]';
  const cardBg = isDark ? 'bg-[#1E2329]' : 'bg-white';
  const border = isDark ? 'border-[#2B3139]' : 'border-gray-200';
  const text = isDark ? 'text-white' : 'text-gray-900';
  const textMuted = isDark ? 'text-[#848E9C]' : 'text-gray-500';
  const hoverBg = isDark ? 'hover:bg-[#2B3139]' : 'hover:bg-gray-100';

  useEffect(() => {
    fetchRankInfo();
    fetchAllRanks();
    fetchLeaderboard();
  }, []);

  const fetchRankInfo = async () => {
    try {
      const response = await axios.get(`${API}/rank/info`, { withCredentials: true });
      setRankInfo(response.data);
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
    if (vol >= 1e6) return `$${(vol / 1e6).toFixed(2)}M`;
    if (vol >= 1e3) return `$${(vol / 1e3).toFixed(2)}K`;
    return `$${vol?.toFixed(2) || '0'}`;
  };

  // Get rank stars based on level
  const getRankStars = (level) => {
    if (level <= 5) {
      return "⭐".repeat(level);
    } else {
      return "🌟".repeat(level - 5);
    }
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
        <span className={`font-medium ${text}`}>Rank System</span>
        <button className={textMuted}>
          <Info size={24} />
        </button>
      </div>

      {/* Current Rank Card */}
      <div 
        className="mx-4 mt-4 rounded-2xl p-6 overflow-hidden relative"
        style={{ 
          background: `linear-gradient(135deg, ${rankInfo?.rank?.color || '#F0B90B'}40, ${rankInfo?.rank?.color || '#F0B90B'}20)`,
          borderColor: rankInfo?.rank?.color || '#F0B90B',
          borderWidth: '2px'
        }}
      >
        {/* Decorative circles */}
        <div 
          className="absolute -top-10 -right-10 w-32 h-32 rounded-full opacity-20"
          style={{ background: rankInfo?.rank?.color || '#F0B90B' }}
        />
        <div 
          className="absolute -bottom-10 -left-10 w-24 h-24 rounded-full opacity-10"
          style={{ background: rankInfo?.rank?.color || '#F0B90B' }}
        />
        
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className={textMuted}>Current Rank</p>
              <div className="flex items-center gap-3 mt-1">
                <span className="text-2xl">{getRankStars(rankInfo?.rank?.level)}</span>
                <div>
                  <h2 className={`text-2xl font-bold ${text}`}>{rankInfo?.rank?.name}</h2>
                  <p className={textMuted}>Level {rankInfo?.rank?.level}</p>
                </div>
              </div>
            </div>
            <div 
              className="w-16 h-16 rounded-full flex items-center justify-center"
              style={{ background: rankInfo?.rank?.color || '#F0B90B' }}
            >
              <span className="text-white font-bold text-xl">{rankInfo?.rank?.level}</span>
            </div>
          </div>

          {/* Progress to next rank */}
          {rankInfo?.next_rank && (
            <div className="mt-4">
              <div className="flex justify-between text-sm mb-2">
                <span className={textMuted}>Progress to {rankInfo?.next_rank?.name}</span>
                <span className={text}>{rankInfo?.progress?.toFixed(1)}%</span>
              </div>
              <div className={`h-3 rounded-full ${isDark ? 'bg-[#2B3139]' : 'bg-gray-200'} overflow-hidden`}>
                <div 
                  className="h-full rounded-full transition-all duration-500"
                  style={{ 
                    width: `${rankInfo?.progress || 0}%`,
                    background: rankInfo?.next_rank?.color || '#F0B90B'
                  }}
                />
              </div>
              <p className={`text-sm mt-2 ${textMuted}`}>
                Trade {formatVolume(rankInfo?.volume_needed)} more to reach {rankInfo?.next_rank?.name}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-3 gap-3 mx-4 mt-4">
        <div className={`${cardBg} rounded-xl p-3 text-center`}>
          <ChartLineUp size={24} className="mx-auto text-[#0ECB81] mb-1" />
          <p className={`text-lg font-bold ${text}`}>{formatVolume(rankInfo?.total_volume || 0)}</p>
          <p className={`text-xs ${textMuted}`}>Total Volume</p>
        </div>
        <div className={`${cardBg} rounded-xl p-3 text-center`}>
          <Fire size={24} className="mx-auto text-[#F0B90B] mb-1" />
          <p className={`text-lg font-bold ${text}`}>{rankInfo?.stats?.total_trades || 0}</p>
          <p className={`text-xs ${textMuted}`}>Total Trades</p>
        </div>
        <div className={`${cardBg} rounded-xl p-3 text-center`}>
          <Clock size={24} className="mx-auto text-[#3498DB] mb-1" />
          <p className={`text-lg font-bold ${text}`}>{rankInfo?.stats?.days_as_member || 0}</p>
          <p className={`text-xs ${textMuted}`}>Days Active</p>
        </div>
      </div>

      {/* Benefits Card */}
      <div className={`${cardBg} mx-4 mt-4 rounded-xl p-4`}>
        <h3 className={`font-bold mb-3 ${text}`}>Your Benefits</h3>
        <div className="grid grid-cols-2 gap-3">
          <div className={`p-3 rounded-lg ${isDark ? 'bg-[#2B3139]' : 'bg-gray-100'}`}>
            <p className={`text-sm ${textMuted}`}>Fee Discount</p>
            <p className="text-xl font-bold text-[#0ECB81]">{rankInfo?.rank?.fee_discount || 0}%</p>
          </div>
          <div className={`p-3 rounded-lg ${isDark ? 'bg-[#2B3139]' : 'bg-gray-100'}`}>
            <p className={`text-sm ${textMuted}`}>Withdrawal Limit</p>
            <p className="text-xl font-bold text-[#F0B90B]">{formatVolume(rankInfo?.rank?.withdrawal_limit || 1000)}/day</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className={`mx-4 mt-4 flex gap-2`}>
        <button
          onClick={() => setActiveTab("myRank")}
          className={`flex-1 py-3 rounded-lg font-medium transition-colors ${
            activeTab === "myRank" 
              ? 'bg-[#F0B90B] text-black' 
              : `${cardBg} ${text}`
          }`}
        >
          All Ranks
        </button>
        <button
          onClick={() => setActiveTab("leaderboard")}
          className={`flex-1 py-3 rounded-lg font-medium transition-colors ${
            activeTab === "leaderboard" 
              ? 'bg-[#F0B90B] text-black' 
              : `${cardBg} ${text}`
          }`}
        >
          Leaderboard
        </button>
      </div>

      {/* All Ranks List */}
      {activeTab === "myRank" && (
        <div className={`${cardBg} mx-4 mt-4 rounded-xl overflow-hidden`}>
          <div className="p-4 border-b border-[#2B3139]">
            <h3 className={`font-bold ${text}`}>10-Level Rank System</h3>
          </div>
          <div className="divide-y divide-[#2B3139]">
            {allRanks.map((rank) => {
              const isCurrentRank = rankInfo?.rank?.level === rank.level;
              return (
                <div 
                  key={rank.level}
                  className={`p-4 flex items-center justify-between ${
                    isCurrentRank ? (isDark ? 'bg-[#2B3139]' : 'bg-gray-100') : ''
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-12 h-12 rounded-full flex items-center justify-center"
                      style={{ background: `${rank.color}30`, borderColor: rank.color, borderWidth: '2px' }}
                    >
                      <span className="text-lg">{rank.emoji}</span>
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className={`font-semibold ${text}`}>{rank.name}</p>
                        {isCurrentRank && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-[#0ECB81] text-white">Current</span>
                        )}
                      </div>
                      <p className={`text-sm ${textMuted}`}>
                        Volume: {formatVolume(rank.min_volume)}+
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-[#0ECB81] font-medium">{rank.fee_discount}% off</p>
                    <p className={`text-xs ${textMuted}`}>{formatVolume(rank.withdrawal_limit)}/day</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Leaderboard */}
      {activeTab === "leaderboard" && (
        <div className={`${cardBg} mx-4 mt-4 rounded-xl overflow-hidden`}>
          <div className="p-4 border-b border-[#2B3139]">
            <h3 className={`font-bold ${text}`}>Top Traders</h3>
          </div>
          
          {leaderboard.length > 0 ? (
            <div className="divide-y divide-[#2B3139]">
              {leaderboard.map((trader, index) => (
                <div key={index} className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {/* Position badge */}
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${
                      trader.position === 1 ? 'bg-[#F0B90B] text-black' :
                      trader.position === 2 ? 'bg-[#C0C0C0] text-black' :
                      trader.position === 3 ? 'bg-[#CD7F32] text-white' :
                      isDark ? 'bg-[#2B3139] text-white' : 'bg-gray-200 text-black'
                    }`}>
                      {trader.position}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{trader.rank?.emoji}</span>
                        <p className={`font-medium ${text}`}>{trader.name}</p>
                      </div>
                      <p className={`text-sm ${textMuted}`}>{trader.email}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-[#0ECB81] font-medium">{formatVolume(trader.total_volume)}</p>
                    <p className={`text-xs ${textMuted}`}>{trader.trade_count} trades</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className={`text-center py-8 ${textMuted}`}>
              <Trophy size={48} className="mx-auto mb-3 opacity-50" />
              <p>No traders yet</p>
              <p className="text-sm mt-1">Start trading to appear on the leaderboard!</p>
            </div>
          )}
        </div>
      )}

      {/* How to Rank Up */}
      <div className={`${cardBg} mx-4 mt-4 rounded-xl p-4 mb-4`}>
        <h3 className={`font-bold mb-3 ${text}`}>How to Rank Up</h3>
        <div className="space-y-3">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-[#F0B90B] flex items-center justify-center flex-shrink-0">
              <span className="text-black font-bold">1</span>
            </div>
            <div>
              <p className={text}>Trade More</p>
              <p className={`text-sm ${textMuted}`}>Your rank is based on total trading volume</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-[#0ECB81] flex items-center justify-center flex-shrink-0">
              <span className="text-white font-bold">2</span>
            </div>
            <div>
              <p className={text}>Unlock Benefits</p>
              <p className={`text-sm ${textMuted}`}>Higher ranks get lower fees & higher limits</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-[#3498DB] flex items-center justify-center flex-shrink-0">
              <span className="text-white font-bold">3</span>
            </div>
            <div>
              <p className={text}>Reach Infinity</p>
              <p className={`text-sm ${textMuted}`}>Trade $10M+ to achieve ultimate rank!</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RankPage;
