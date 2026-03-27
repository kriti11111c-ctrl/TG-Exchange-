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
  Pencil
} from "@phosphor-icons/react";

const MarketsPage = () => {
  const { isDark } = useTheme();
  const navigate = useNavigate();
  const [prices, setPrices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("spot");
  const [subTab, setSubTab] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("volume");
  const [sortOrder, setSortOrder] = useState("desc");

  const bg = isDark ? 'bg-[#0B0E11]' : 'bg-gray-50';
  const cardBg = isDark ? 'bg-[#1E2329]' : 'bg-white';
  const text = isDark ? 'text-white' : 'text-gray-900';
  const textMuted = isDark ? 'text-[#848E9C]' : 'text-gray-500';
  const border = isDark ? 'border-[#2B3139]' : 'border-gray-200';
  const inputBg = isDark ? 'bg-[#2B3139]' : 'bg-gray-100';

  // Fetch all coins
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
    { id: "favorites", label: "Favorites", icon: Star },
    { id: "new", label: "New Listing", icon: Rocket },
    { id: "spot", label: "Spot", icon: Coin },
    { id: "futures", label: "Futures", icon: ChartLineUp },
    { id: "earn", label: "Earn", icon: Fire }
  ];

  const subTabs = ["All", "Spot", "Futures", "LTs"];

  // Filter and sort coins
  const getFilteredCoins = () => {
    let filtered = [...prices];

    // Search filter
    if (searchQuery) {
      filtered = filtered.filter(coin => 
        coin.symbol?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        coin.name?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Tab filter
    if (activeTab === "favorites") {
      filtered = filtered.filter(coin => 
        ["bitcoin", "ethereum", "binancecoin", "solana", "ripple"].includes(coin.coin_id)
      );
    } else if (activeTab === "new") {
      // Show newer/trending coins
      filtered = filtered.filter(coin => 
        ["sui", "pepe", "floki", "bonk", "wif"].includes(coin.coin_id)
      );
    }

    // Sort
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

  if (loading) {
    return (
      <div className={`min-h-screen ${bg} flex items-center justify-center`}>
        <div className="w-10 h-10 border-4 border-[#F0B90B] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${bg} pb-20`}>
      {/* Search Header */}
      <div className={`${cardBg} border-b ${border} sticky top-0 z-40`}>
        <div className="p-3">
          <div className={`flex items-center gap-2 px-3 py-2 rounded-lg ${inputBg}`}>
            <MagnifyingGlass size={18} className={textMuted} />
            <input
              type="text"
              placeholder="Search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`flex-1 bg-transparent outline-none text-sm ${text}`}
            />
            <span className={`text-xs ${textMuted}`}>🔥 7</span>
          </div>
        </div>

        {/* Main Tabs */}
        <div className="overflow-x-auto scrollbar-hide">
          <div className="flex gap-1 px-3 pb-2 min-w-max">
            {mainTabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap flex items-center gap-1 ${
                  activeTab === tab.id 
                    ? 'bg-[#F0B90B]/20 text-[#F0B90B]' 
                    : `${textMuted}`
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Sub Tabs */}
        <div className={`flex items-center justify-between px-3 py-2 border-t ${border}`}>
          <div className="flex gap-4">
            {subTabs.map(tab => (
              <button
                key={tab}
                onClick={() => setSubTab(tab.toLowerCase())}
                className={`text-sm ${
                  subTab === tab.toLowerCase() ? text : textMuted
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
          <button className={textMuted}>
            <Pencil size={18} />
          </button>
        </div>
      </div>

      {/* Table Header */}
      <div className={`${cardBg} sticky top-[140px] z-30`}>
        <div className={`grid grid-cols-12 px-4 py-2 text-xs ${textMuted} border-b ${border}`}>
          <div 
            className="col-span-4 flex items-center gap-1 cursor-pointer"
            onClick={() => toggleSort("name")}
          >
            Pairs
            <div className="flex flex-col">
              <CaretUp size={8} className={sortBy === "name" && sortOrder === "asc" ? "text-[#F0B90B]" : ""} />
              <CaretDown size={8} className={sortBy === "name" && sortOrder === "desc" ? "text-[#F0B90B]" : ""} />
            </div>
            <span className="ml-1">24h Vol</span>
            <div className="flex flex-col">
              <CaretUp size={8} className={sortBy === "volume" && sortOrder === "asc" ? "text-[#F0B90B]" : ""} />
              <CaretDown size={8} className={sortBy === "volume" && sortOrder === "desc" ? "text-[#F0B90B]" : ""} />
            </div>
          </div>
          <div 
            className="col-span-4 text-right flex items-center justify-end gap-1 cursor-pointer"
            onClick={() => toggleSort("price")}
          >
            Last Price
            <div className="flex flex-col">
              <CaretUp size={8} className={sortBy === "price" && sortOrder === "asc" ? "text-[#F0B90B]" : ""} />
              <CaretDown size={8} className={sortBy === "price" && sortOrder === "desc" ? "text-[#F0B90B]" : ""} />
            </div>
          </div>
          <div 
            className="col-span-4 text-right flex items-center justify-end gap-1 cursor-pointer"
            onClick={() => toggleSort("change")}
          >
            Change
            <div className="flex flex-col">
              <CaretUp size={8} className={sortBy === "change" && sortOrder === "asc" ? "text-[#F0B90B]" : ""} />
              <CaretDown size={8} className={sortBy === "change" && sortOrder === "desc" ? "text-[#F0B90B]" : ""} />
            </div>
          </div>
        </div>
      </div>

      {/* Coin List */}
      <div className={cardBg}>
        {filteredCoins.length === 0 ? (
          <div className="py-12 text-center">
            <p className={textMuted}>No coins found</p>
          </div>
        ) : (
          filteredCoins.map((coin, index) => {
            const change = coin.price_change_percentage_24h || 0;
            const isPositive = change >= 0;
            
            return (
              <Link
                key={coin.coin_id || index}
                to={`/trade?symbol=${coin.symbol || 'BTC'}`}
                className={`grid grid-cols-12 px-4 py-3 items-center border-b ${border} ${isDark ? 'hover:bg-[#2B3139]' : 'hover:bg-gray-50'}`}
              >
                {/* Pair & Volume */}
                <div className="col-span-4">
                  <div className="flex items-center gap-2">
                    {coin.image ? (
                      <img 
                        src={coin.image} 
                        alt={coin.symbol} 
                        className="w-8 h-8 rounded-full object-cover"
                        onError={(e) => {
                          e.target.style.display = 'none';
                          e.target.parentElement.innerHTML = `<div class="w-8 h-8 rounded-full bg-[#F0B90B] flex items-center justify-center"><span class="text-black font-bold">${coin.symbol?.charAt(0).toUpperCase()}</span></div>`;
                        }}
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-[#F0B90B] flex items-center justify-center">
                        <span className="text-black font-bold">{coin.symbol?.charAt(0).toUpperCase()}</span>
                      </div>
                    )}
                    <div>
                      <div className="flex items-center gap-1">
                        <span className={`font-semibold ${text}`}>{coin.symbol?.toUpperCase()}</span>
                        <span className="text-[10px] px-1 py-0.5 rounded bg-[#F0B90B]/20 text-[#F0B90B]">3x</span>
                      </div>
                      <span className={`text-xs ${textMuted}`}>{formatVolume(coin.total_volume)}M</span>
                    </div>
                  </div>
                </div>

                {/* Price */}
                <div className="col-span-4 text-right">
                  <p className={`font-medium ${text}`}>{formatPrice(coin.current_price)}</p>
                  <p className={`text-xs ${textMuted}`}>${formatPrice(coin.current_price)}</p>
                </div>

                {/* Change */}
                <div className="col-span-4 flex justify-end">
                  <span className={`px-3 py-1.5 rounded text-sm font-medium min-w-[80px] text-center ${
                    isPositive 
                      ? 'bg-[#0ECB81] text-white' 
                      : 'bg-[#F6465D] text-white'
                  }`}>
                    {isPositive ? '+' : ''}{change.toFixed(2)}%
                  </span>
                </div>
              </Link>
            );
          })
        )}
        
        {/* No More indicator */}
        <div className={`py-6 text-center ${textMuted}`}>
          <p>No More</p>
        </div>
      </div>

      {/* Bottom Navigation */}
      <BottomNav />
    </div>
  );
};

export default MarketsPage;
