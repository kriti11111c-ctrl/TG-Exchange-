import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTheme, API } from "../App";
import axios from "axios";
import BottomNav from "../components/BottomNav";
import { 
  MagnifyingGlass,
  Star,
  Fire,
  Rocket,
  ChartLineUp,
  Coin,
  CaretUp,
  CaretDown,
  TrendUp,
  TrendDown,
  Lightning,
  Trophy,
  Sparkle,
  Sun,
  Moon
} from "@phosphor-icons/react";

const MarketsPage = () => {
  const { isDark, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [prices, setPrices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("spot");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("volume");
  const [sortOrder, setSortOrder] = useState("desc");

  // Theme-aware colors
  const bg = isDark ? 'bg-[#0B0E11]' : 'bg-gray-50';
  const cardBg = isDark ? 'bg-[#1E2329]' : 'bg-white';
  const headerBg = isDark ? 'from-[#1E2329] to-[#0B0E11]' : 'from-gray-100 to-gray-50';
  const text = isDark ? 'text-white' : 'text-gray-900';
  const textMuted = isDark ? 'text-[#848E9C]' : 'text-gray-500';
  const border = isDark ? 'border-[#2B3139]' : 'border-gray-200';
  const inputBg = isDark ? 'bg-[#2B3139]' : 'bg-white';
  const hoverBg = isDark ? 'hover:bg-[#1E2329]/50' : 'hover:bg-gray-100';

  useEffect(() => {
    const fetchPrices = async () => {
      try {
        const response = await axios.get(`${API}/market/prices`);
        setPrices(response.data);
      } catch (error) {
        console.error("Error fetching prices:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchPrices();
    const interval = setInterval(fetchPrices, 30000);
    return () => clearInterval(interval);
  }, []);

  const mainTabs = [
    { id: "favorites", label: "Favorites", icon: Star, color: "#F0B90B" },
    { id: "hot", label: "Hot", icon: Fire, color: "#F6465D" },
    { id: "gainers", label: "Gainers", icon: TrendUp, color: "#0ECB81" },
    { id: "spot", label: "Spot", icon: Coin, color: "#00E5FF" },
    { id: "futures", label: "Futures", icon: ChartLineUp, color: "#A855F7" },
  ];

  const getFilteredCoins = () => {
    let filtered = [...prices];

    if (searchQuery) {
      filtered = filtered.filter(coin => 
        coin.symbol?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        coin.name?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    if (activeTab === "favorites") {
      filtered = filtered.filter(coin => 
        ["bitcoin", "ethereum", "binancecoin", "solana", "ripple"].includes(coin.coin_id)
      );
    } else if (activeTab === "hot") {
      filtered = filtered.filter(coin => 
        ["bitcoin", "ethereum", "dogecoin", "pepe", "shiba-inu", "bonk"].includes(coin.coin_id)
      );
    } else if (activeTab === "gainers") {
      filtered = filtered.filter(coin => (coin.price_change_percentage_24h || 0) > 0);
    }

    filtered.sort((a, b) => {
      let aVal, bVal;
      switch (sortBy) {
        case "price":
          aVal = a.current_price || 0;
          bVal = b.current_price || 0;
          break;
        case "change":
          aVal = a.price_change_percentage_24h || 0;
          bVal = b.price_change_percentage_24h || 0;
          break;
        case "volume":
        default:
          aVal = a.total_volume || 0;
          bVal = b.total_volume || 0;
      }
      return sortOrder === "desc" ? bVal - aVal : aVal - bVal;
    });

    return filtered;
  };

  const formatVolume = (vol) => {
    if (!vol) return "0";
    if (vol >= 1e9) return `${(vol / 1e9).toFixed(2)}B`;
    if (vol >= 1e6) return `${(vol / 1e6).toFixed(2)}M`;
    if (vol >= 1e3) return `${(vol / 1e3).toFixed(2)}K`;
    return vol.toFixed(2);
  };

  const formatPrice = (price) => {
    if (!price) return "0.00";
    if (price >= 1000) return price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    if (price >= 1) return price.toFixed(4);
    if (price >= 0.0001) return price.toFixed(6);
    return price.toFixed(8);
  };

  const toggleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === "desc" ? "asc" : "desc");
    } else {
      setSortBy(field);
      setSortOrder("desc");
    }
  };

  const filteredCoins = getFilteredCoins();

  // Top Gainers/Losers for header cards
  const topGainer = prices.reduce((max, coin) => 
    (coin.price_change_percentage_24h || 0) > (max?.price_change_percentage_24h || -999) ? coin : max
  , null);
  
  const topLoser = prices.reduce((min, coin) => 
    (coin.price_change_percentage_24h || 0) < (min?.price_change_percentage_24h || 999) ? coin : min
  , null);

  if (loading) {
    return (
      <div className={`min-h-screen ${bg} flex items-center justify-center`}>
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 border-4 border-[#00E5FF] border-t-transparent rounded-full animate-spin"></div>
          <p className={textMuted}>Loading markets...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${bg} pb-20`}>
      {/* Header */}
      <div className={`bg-gradient-to-b ${headerBg} px-4 pt-4 pb-2`}>
        {/* Top Bar with Theme Toggle */}
        <div className="flex items-center justify-between mb-4">
          <h1 className={`text-xl font-bold ${text}`}>Markets</h1>
          <button
            onClick={toggleTheme}
            className={`p-2.5 rounded-xl ${isDark ? 'bg-[#2B3139]' : 'bg-white shadow-md'} transition-colors`}
          >
            {isDark ? <Sun size={20} className="text-[#F0B90B]" /> : <Moon size={20} className="text-gray-600" />}
          </button>
        </div>

        {/* Search Bar */}
        <div className="relative mb-4">
          <MagnifyingGlass size={20} className={`absolute left-4 top-1/2 -translate-y-1/2 ${textMuted}`} />
          <input
            type="text"
            placeholder="Search coin name"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={`w-full pl-12 pr-4 py-3 rounded-xl ${inputBg} ${text} ${isDark ? '' : 'border border-gray-200 shadow-sm'} placeholder-${isDark ? '[#5E6673]' : 'gray-400'} outline-none focus:ring-2 focus:ring-[#00E5FF]/50 transition-all`}
          />
          <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-1">
            <Fire size={16} className="text-[#F6465D]" weight="fill" />
            <span className="text-[#F6465D] text-sm font-bold">HOT</span>
          </div>
        </div>

        {/* Quick Stats Cards */}
        <div className="flex gap-3 overflow-x-auto pb-3 scrollbar-hide">
          {/* Top Gainer Card */}
          <div className={`flex-shrink-0 w-40 rounded-2xl p-3 border ${isDark ? 'bg-gradient-to-br from-[#0ECB81]/20 to-[#0ECB81]/5 border-[#0ECB81]/20' : 'bg-gradient-to-br from-[#0ECB81]/10 to-white border-[#0ECB81]/30 shadow-sm'}`}>
            <div className="flex items-center gap-2 mb-2">
              <TrendUp size={16} className="text-[#0ECB81]" weight="bold" />
              <span className="text-[#0ECB81] text-xs font-bold">TOP GAINER</span>
            </div>
            <div className="flex items-center gap-2">
              {topGainer?.image && (
                <img src={topGainer.image} alt="" className="w-6 h-6 rounded-full" />
              )}
              <span className={`font-bold ${text}`}>{topGainer?.symbol?.toUpperCase()}</span>
            </div>
            <p className="text-[#0ECB81] font-bold text-lg mt-1">
              +{(topGainer?.price_change_percentage_24h || 0).toFixed(2)}%
            </p>
          </div>

          {/* Top Loser Card */}
          <div className={`flex-shrink-0 w-40 rounded-2xl p-3 border ${isDark ? 'bg-gradient-to-br from-[#F6465D]/20 to-[#F6465D]/5 border-[#F6465D]/20' : 'bg-gradient-to-br from-[#F6465D]/10 to-white border-[#F6465D]/30 shadow-sm'}`}>
            <div className="flex items-center gap-2 mb-2">
              <TrendDown size={16} className="text-[#F6465D]" weight="bold" />
              <span className="text-[#F6465D] text-xs font-bold">TOP LOSER</span>
            </div>
            <div className="flex items-center gap-2">
              {topLoser?.image && (
                <img src={topLoser.image} alt="" className="w-6 h-6 rounded-full" />
              )}
              <span className={`font-bold ${text}`}>{topLoser?.symbol?.toUpperCase()}</span>
            </div>
            <p className="text-[#F6465D] font-bold text-lg mt-1">
              {(topLoser?.price_change_percentage_24h || 0).toFixed(2)}%
            </p>
          </div>

          {/* Volume Card */}
          <div className={`flex-shrink-0 w-40 rounded-2xl p-3 border ${isDark ? 'bg-gradient-to-br from-[#00E5FF]/20 to-[#00E5FF]/5 border-[#00E5FF]/20' : 'bg-gradient-to-br from-[#00E5FF]/10 to-white border-[#00E5FF]/30 shadow-sm'}`}>
            <div className="flex items-center gap-2 mb-2">
              <Lightning size={16} className="text-[#00E5FF]" weight="fill" />
              <span className="text-[#00E5FF] text-xs font-bold">24H VOLUME</span>
            </div>
            <p className={`font-bold text-lg ${text}`}>
              ${formatVolume(prices.reduce((sum, c) => sum + (c.total_volume || 0), 0))}
            </p>
            <p className={textMuted} style={{fontSize: '11px'}}>{prices.length} Coins</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className={`sticky top-0 z-40 ${bg} border-b ${border}`}>
        <div className="overflow-x-auto scrollbar-hide">
          <div className="flex gap-1 px-4 py-2 min-w-max">
            {mainTabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2.5 rounded-xl text-sm font-semibold whitespace-nowrap flex items-center gap-2 transition-all ${
                  activeTab === tab.id 
                    ? isDark ? 'bg-[#2B3139] text-white' : 'bg-white text-gray-900 shadow-md'
                    : `${textMuted} ${hoverBg}`
                }`}
              >
                <tab.icon 
                  size={18} 
                  weight={activeTab === tab.id ? "fill" : "regular"}
                  style={{ color: activeTab === tab.id ? tab.color : undefined }}
                />
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Table Header */}
      <div className={`sticky top-[52px] z-30 ${bg} border-b ${border}`}>
        <div className={`grid grid-cols-12 px-4 py-3 text-xs ${textMuted}`}>
          <div className="col-span-5 flex items-center gap-2">
            <span>Name / Vol</span>
          </div>
          <div 
            className={`col-span-3 text-right flex items-center justify-end gap-1 cursor-pointer hover:${text} transition-colors`}
            onClick={() => toggleSort("price")}
          >
            Price
            <div className="flex flex-col -space-y-1">
              <CaretUp size={10} className={sortBy === "price" && sortOrder === "asc" ? "text-[#00E5FF]" : ""} weight="bold" />
              <CaretDown size={10} className={sortBy === "price" && sortOrder === "desc" ? "text-[#00E5FF]" : ""} weight="bold" />
            </div>
          </div>
          <div 
            className={`col-span-4 text-right flex items-center justify-end gap-1 cursor-pointer hover:${text} transition-colors`}
            onClick={() => toggleSort("change")}
          >
            24h Change
            <div className="flex flex-col -space-y-1">
              <CaretUp size={10} className={sortBy === "change" && sortOrder === "asc" ? "text-[#00E5FF]" : ""} weight="bold" />
              <CaretDown size={10} className={sortBy === "change" && sortOrder === "desc" ? "text-[#00E5FF]" : ""} weight="bold" />
            </div>
          </div>
        </div>
      </div>

      {/* Coin List */}
      <div className={cardBg}>
        {filteredCoins.length === 0 ? (
          <div className="py-16 text-center">
            <MagnifyingGlass size={48} className={isDark ? 'text-[#2B3139]' : 'text-gray-300'} />
            <p className={`${textMuted} mt-4`}>No coins found</p>
          </div>
        ) : (
          filteredCoins.map((coin, index) => {
            const change = coin.price_change_percentage_24h || 0;
            const isPositive = change >= 0;
            
            return (
              <Link
                key={coin.coin_id || index}
                to={`/trade?symbol=${coin.symbol || 'BTC'}`}
                className={`grid grid-cols-12 px-4 py-4 items-center border-b ${border} ${hoverBg} transition-colors active:bg-[#00E5FF]/10`}
              >
                {/* Coin Info */}
                <div className="col-span-5">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      {coin.image ? (
                        <img 
                          src={coin.image} 
                          alt={coin.symbol} 
                          className={`w-10 h-10 rounded-full object-cover ring-2 ${isDark ? 'ring-[#2B3139]' : 'ring-gray-200'}`}
                          onError={(e) => {
                            e.target.onerror = null;
                            e.target.src = `https://ui-avatars.com/api/?name=${coin.symbol}&background=00E5FF&color=000`;
                          }}
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#00E5FF] to-[#00E5FF]/50 flex items-center justify-center">
                          <span className="text-black font-bold">{coin.symbol?.charAt(0).toUpperCase()}</span>
                        </div>
                      )}
                      {index < 3 && (
                        <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[#F0B90B] flex items-center justify-center">
                          <span className="text-[8px] text-black font-bold">{index + 1}</span>
                        </div>
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className={`font-bold ${text}`}>{coin.symbol?.toUpperCase()}</span>
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-[#00E5FF]/20 text-[#00E5FF] font-bold">USDT</span>
                      </div>
                      <span className={`text-xs ${textMuted}`}>Vol {formatVolume(coin.total_volume)}</span>
                    </div>
                  </div>
                </div>

                {/* Price */}
                <div className="col-span-3 text-right">
                  <p className={`font-semibold ${text}`}>${formatPrice(coin.current_price)}</p>
                </div>

                {/* Change */}
                <div className="col-span-4 flex justify-end">
                  <div className={`px-3 py-2 rounded-lg text-sm font-bold min-w-[90px] text-center flex items-center justify-center gap-1 ${
                    isPositive 
                      ? 'bg-[#0ECB81] text-white' 
                      : 'bg-[#F6465D] text-white'
                  }`}>
                    {isPositive ? <TrendUp size={14} weight="bold" /> : <TrendDown size={14} weight="bold" />}
                    {isPositive ? '+' : ''}{change.toFixed(2)}%
                  </div>
                </div>
              </Link>
            );
          })
        )}
        
        {/* End indicator */}
        <div className="py-8 text-center">
          <p className={textMuted} style={{fontSize: '12px'}}>— End of List —</p>
        </div>
      </div>

      {/* Bottom Navigation */}
      <BottomNav />
    </div>
  );
};

export default MarketsPage;
