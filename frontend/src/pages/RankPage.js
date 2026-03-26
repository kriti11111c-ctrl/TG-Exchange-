import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth, API, useTheme } from "../App";
import axios from "axios";
import { 
  CaretLeft,
  Trophy,
  Crown,
  Lightning,
  ChartLineUp,
  Fire,
  Info,
  Medal,
  Star,
  DiamondsFour
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

  // Theme colors
  const bg = isDark ? 'bg-[#0B0E11]' : 'bg-gray-50';
  const cardBg = isDark ? 'bg-[#1E2329]' : 'bg-white';
  const text = isDark ? 'text-white' : 'text-gray-900';
  const textMuted = isDark ? 'text-[#848E9C]' : 'text-gray-500';

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
    if (vol >= 1e6) return `$${(vol / 1e6).toFixed(1)}M`;
    if (vol >= 1e3) return `$${(vol / 1e3).toFixed(1)}K`;
    return `$${vol?.toFixed(0) || '0'}`;
  };

  // Rank badge icons based on level
  const getRankIcon = (level) => {
    if (level <= 3) return <Star weight="fill" className="w-5 h-5" />;
    if (level <= 6) return <Medal weight="fill" className="w-5 h-5" />;
    if (level <= 8) return <Crown weight="fill" className="w-5 h-5" />;
    return <DiamondsFour weight="fill" className="w-5 h-5" />;
  };

  // Gradient colors for each rank level
  const getRankGradient = (level) => {
    const gradients = {
      1: "from-slate-400 to-slate-500",
      2: "from-blue-400 to-blue-600",
      3: "from-emerald-400 to-emerald-600",
      4: "from-yellow-400 to-amber-500",
      5: "from-orange-400 to-orange-600",
      6: "from-purple-400 to-purple-600",
      7: "from-pink-400 to-rose-600",
      8: "from-red-400 to-red-600",
      9: "from-amber-300 to-yellow-500",
      10: "from-yellow-300 via-amber-400 to-orange-500"
    };
    return gradients[level] || gradients[1];
  };

  // Simple rank display names
  const getRankDisplayName = (level) => {
    const names = {
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
    return names[level] || `Level ${level}`;
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

      {/* Hero Section - Current Rank */}
      <div className="relative overflow-hidden">
        <div className={`absolute inset-0 bg-gradient-to-br ${getRankGradient(rankInfo?.rank?.level || 1)} opacity-20`}></div>
        <div className="relative px-4 py-6">
          {/* Current Rank Badge */}
          <div className="flex flex-col items-center">
            <div className={`w-24 h-24 rounded-full bg-gradient-to-br ${getRankGradient(rankInfo?.rank?.level || 1)} flex items-center justify-center shadow-lg shadow-black/20`}>
              <div className="w-20 h-20 rounded-full bg-black/20 backdrop-blur flex items-center justify-center">
                <span className="text-white text-4xl font-bold">{rankInfo?.rank?.level || 1}</span>
              </div>
            </div>
            
            <h2 className={`mt-4 text-2xl font-bold ${text}`}>
              {getRankDisplayName(rankInfo?.rank?.level || 1)}
            </h2>
            <p className={`text-sm ${textMuted}`}>Level {rankInfo?.rank?.level || 1} VIP</p>

            {/* Progress to next */}
            {rankInfo?.next_rank && (
              <div className="w-full max-w-xs mt-5">
                <div className="flex justify-between text-xs mb-1.5">
                  <span className={textMuted}>Next: {getRankDisplayName(rankInfo?.next_rank?.level)}</span>
                  <span className="text-[#F0B90B] font-medium">{rankInfo?.progress?.toFixed(0)}%</span>
                </div>
                <div className={`h-2 rounded-full ${isDark ? 'bg-[#2B3139]' : 'bg-gray-200'} overflow-hidden`}>
                  <div 
                    className={`h-full rounded-full bg-gradient-to-r ${getRankGradient(rankInfo?.next_rank?.level)} transition-all duration-700`}
                    style={{ width: `${rankInfo?.progress || 0}%` }}
                  />
                </div>
                <p className={`text-xs mt-1.5 text-center ${textMuted}`}>
                  Trade {formatVolume(rankInfo?.volume_needed)} more
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Stats Row */}
      <div className="px-4 -mt-2">
        <div className={`${cardBg} rounded-2xl p-4 grid grid-cols-3 gap-2 shadow-sm`}>
          <div className="text-center">
            <ChartLineUp size={20} className="mx-auto text-[#0ECB81] mb-1" />
            <p className={`text-sm font-bold ${text}`}>{formatVolume(rankInfo?.total_volume || 0)}</p>
            <p className={`text-[10px] ${textMuted}`}>Volume</p>
          </div>
          <div className="text-center border-x border-[#2B3139]/50">
            <Fire size={20} className="mx-auto text-[#F0B90B] mb-1" />
            <p className={`text-sm font-bold ${text}`}>{rankInfo?.stats?.total_trades || 0}</p>
            <p className={`text-[10px] ${textMuted}`}>Trades</p>
          </div>
          <div className="text-center">
            <Lightning size={20} className="mx-auto text-[#3498DB] mb-1" />
            <p className={`text-sm font-bold text-[#0ECB81]`}>{rankInfo?.rank?.fee_discount || 0}%</p>
            <p className={`text-[10px] ${textMuted}`}>Fee Off</p>
          </div>
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
              const isLocked = rank.level > (rankInfo?.rank?.level || 1);
              
              return (
                <div 
                  key={rank.level}
                  className={`${cardBg} rounded-xl p-3 flex items-center gap-3 ${
                    isCurrentRank ? 'ring-2 ring-[#F0B90B]' : ''
                  } ${isLocked ? 'opacity-60' : ''}`}
                >
                  {/* Rank Badge */}
                  <div className={`w-11 h-11 rounded-full bg-gradient-to-br ${getRankGradient(rank.level)} flex items-center justify-center flex-shrink-0`}>
                    <span className="text-white font-bold text-lg">{rank.level}</span>
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`font-semibold ${text} text-sm`}>
                        {getRankDisplayName(rank.level)}
                      </span>
                      {isCurrentRank && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#0ECB81] text-white font-medium">
                          YOU
                        </span>
                      )}
                    </div>
                    <p className={`text-xs ${textMuted} truncate`}>
                      {formatVolume(rank.min_volume)}+ volume
                    </p>
                  </div>

                  {/* Benefits */}
                  <div className="text-right flex-shrink-0">
                    <p className="text-[#0ECB81] font-semibold text-sm">{rank.fee_discount}% off</p>
                    <p className={`text-[10px] ${textMuted}`}>{formatVolume(rank.withdrawal_limit)}/day</p>
                  </div>
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
                  <div key={index} className="p-3 flex items-center gap-3">
                    {/* Position */}
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0 ${
                      trader.position === 1 ? 'bg-gradient-to-br from-yellow-400 to-amber-500 text-black' :
                      trader.position === 2 ? 'bg-gradient-to-br from-slate-300 to-slate-400 text-black' :
                      trader.position === 3 ? 'bg-gradient-to-br from-orange-400 to-orange-600 text-white' :
                      isDark ? 'bg-[#2B3139] text-white' : 'bg-gray-200 text-black'
                    }`}>
                      {trader.position}
                    </div>
                    
                    {/* User Info */}
                    <div className="flex-1 min-w-0">
                      <p className={`font-medium text-sm ${text} truncate`}>{trader.name}</p>
                      <p className={`text-xs ${textMuted} truncate`}>{trader.email}</p>
                    </div>
                    
                    {/* Volume */}
                    <div className="text-right flex-shrink-0">
                      <p className="text-[#0ECB81] font-semibold text-sm">{formatVolume(trader.total_volume)}</p>
                      <p className={`text-[10px] ${textMuted}`}>{trader.trade_count} trades</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className={`text-center py-12 ${textMuted}`}>
                <Trophy size={48} className="mx-auto mb-3 opacity-30" />
                <p className="font-medium">No traders yet</p>
                <p className="text-xs mt-1">Start trading to rank up!</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default RankPage;
