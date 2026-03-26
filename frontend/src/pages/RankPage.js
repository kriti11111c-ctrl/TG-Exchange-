import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth, API, useTheme } from "../App";
import axios from "axios";
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

  // Rank requirements (Direct/Team)
  const rankRequirements = {
    1: { direct: 6, team: 0 },
    2: { direct: 10, team: 30 },
    3: { direct: 15, team: 75 },
    4: { direct: 20, team: 150 },
    5: { direct: 30, team: 300 },
    6: { direct: 40, team: 600 },
    7: { direct: 50, team: 1000 },
    8: { direct: 75, team: 2000 },
    9: { direct: 100, team: 4000 },
    10: { direct: 150, team: 8000 }
  };

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
              const isLocked = rank.level > (rankInfo?.rank?.level || 1);
              
              return (
                <div 
                  key={rank.level}
                  className={`${cardBg} rounded-xl p-4 flex items-center gap-4 ${
                    isCurrentRank ? 'ring-2 ring-[#F0B90B]' : ''
                  } ${isLocked ? 'opacity-50' : ''}`}
                >
                  {/* Circular Badge */}
                  <div 
                    className="w-14 h-14 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: rankColors[rank.level] }}
                  >
                    <span className="text-white font-bold text-xl">{rank.level}</span>
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`font-semibold ${text}`}>
                        {rankNames[rank.level]}
                      </span>
                      {isCurrentRank && (
                        <span className="text-[10px] px-2 py-0.5 rounded bg-[#0ECB81] text-white font-medium">
                          YOU
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Requirements */}
                  <div className="text-right flex-shrink-0">
                    <p className={`font-medium ${textMuted}`}>
                      {rankRequirements[rank.level]?.direct || 0}D/{rankRequirements[rank.level]?.team || 0}T
                    </p>
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
    </div>
  );
};

export default RankPage;
