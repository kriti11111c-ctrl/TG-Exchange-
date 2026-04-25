import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTheme, API } from "../App";
import axios from "axios";
import BottomNav from "../components/BottomNav";
import { 
  ArrowLeft, 
  ArrowDown,
  ArrowUp,
  Funnel,
  Calendar,
  MagnifyingGlass
} from "@phosphor-icons/react";

const TradeHistoryPage = () => {
  const { isDark } = useTheme();
  const navigate = useNavigate();
  const [trades, setTrades] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  const bg = isDark ? 'bg-[#0B0E11]' : 'bg-gray-50';
  const cardBg = isDark ? 'bg-[#1E2329]' : 'bg-white';
  const text = isDark ? 'text-white' : 'text-gray-900';
  const textMuted = isDark ? 'text-[#848E9C]' : 'text-gray-500';
  const border = isDark ? 'border-[#2B3139]' : 'border-gray-200';
  const inputBg = isDark ? 'bg-[#2B3139]' : 'bg-gray-100';

  useEffect(() => {
    const fetchTrades = async () => {
      try {
        const response = await axios.get(`${API}/transactions`, { withCredentials: false });
        // Filter for buy/sell trades
        const tradeTransactions = response.data.filter(t => 
          t.type === 'buy' || t.type === 'sell'
        );
        setTrades(tradeTransactions);
      } catch (error) {
        console.error("Error fetching trades:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchTrades();
  }, []);

  const filters = [
    { id: "all", label: "All" },
    { id: "buy", label: "Buy" },
    { id: "sell", label: "Sell" }
  ];

  const getFilteredTrades = () => {
    let filtered = [...trades];

    // Type filter
    if (activeFilter !== "all") {
      filtered = filtered.filter(t => t.type === activeFilter);
    }

    // Search filter
    if (searchQuery) {
      filtered = filtered.filter(t => 
        t.coin?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    return filtered;
  };

  const filteredTrades = getFilteredTrades();

  const formatDate = (dateStr) => {
    if (!dateStr) return "N/A";
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return "N/A";
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
    });
  };

  const formatTime = (dateStr) => {
    if (!dateStr) return "";
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return "";
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit'
    });
  };

  return (
    <div className={`min-h-screen ${bg} pb-20`}>
      {/* Header */}
      <div className={`${cardBg} border-b ${border} sticky top-0 z-40`}>
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => navigate(-1)} 
              className={`p-2 rounded-lg ${isDark ? 'hover:bg-[#2B3139]' : 'hover:bg-gray-100'}`}
            >
              <ArrowLeft size={24} className={text} />
            </button>
            <h1 className={`text-xl font-bold ${text}`}>Trade History</h1>
          </div>
          <div className="flex items-center gap-2">
            <button className={`p-2 rounded-lg ${isDark ? 'hover:bg-[#2B3139]' : 'hover:bg-gray-100'}`}>
              <Calendar size={20} className={textMuted} />
            </button>
            <button className={`p-2 rounded-lg ${isDark ? 'hover:bg-[#2B3139]' : 'hover:bg-gray-100'}`}>
              <Funnel size={20} className={textMuted} />
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="px-4 pb-3">
          <div className={`flex items-center gap-2 px-3 py-2 rounded-lg ${inputBg}`}>
            <MagnifyingGlass size={18} className={textMuted} />
            <input
              type="text"
              placeholder="Search by coin..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`flex-1 bg-transparent outline-none text-sm ${text}`}
            />
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-2 px-4 pb-3">
          {filters.map(filter => (
            <button
              key={filter.id}
              onClick={() => setActiveFilter(filter.id)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium ${
                activeFilter === filter.id 
                  ? 'bg-[#00E5FF] text-black' 
                  : `${isDark ? 'bg-[#2B3139]' : 'bg-gray-100'} ${textMuted}`
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </div>

      {/* Trade List */}
      <div className="p-4">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-10 h-10 border-4 border-[#00E5FF] border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : filteredTrades.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16">
            <div className={`w-20 h-20 rounded-full ${isDark ? 'bg-[#2B3139]' : 'bg-gray-100'} flex items-center justify-center mb-4`}>
              <Calendar size={40} className={textMuted} />
            </div>
            <p className={`text-lg ${text}`}>No trade history</p>
            <p className={`text-sm ${textMuted} mt-1`}>Your trades will appear here</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredTrades.map((trade, index) => (
              <div 
                key={index} 
                className={`${cardBg} rounded-xl p-4 border ${border}`}
              >
                {/* Top Row: Coin & Type */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      trade.type === 'buy' ? 'bg-[#0ECB81]/20' : 'bg-[#F6465D]/20'
                    }`}>
                      {trade.type === 'buy' ? (
                        <ArrowDown size={20} className="text-[#0ECB81]" weight="bold" />
                      ) : (
                        <ArrowUp size={20} className="text-[#F6465D]" weight="bold" />
                      )}
                    </div>
                    <div>
                      <p className={`font-semibold ${text}`}>{trade.coin?.toUpperCase()}/USDT</p>
                      <p className={`text-xs ${textMuted}`}>Spot • Market</p>
                    </div>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                    trade.type === 'buy' 
                      ? 'bg-[#0ECB81]/20 text-[#0ECB81]' 
                      : 'bg-[#F6465D]/20 text-[#F6465D]'
                  }`}>
                    {trade.type.toUpperCase()}
                  </span>
                </div>

                {/* Details Grid */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className={`text-xs ${textMuted}`}>Amount</p>
                    <p className={`font-medium ${text}`}>
                      {trade.amount?.toFixed(6)} {trade.coin?.toUpperCase()}
                    </p>
                  </div>
                  <div>
                    <p className={`text-xs ${textMuted}`}>Price</p>
                    <p className={`font-medium ${text}`}>
                      ${trade.price_at_trade?.toLocaleString() || '0.00'}
                    </p>
                  </div>
                  <div>
                    <p className={`text-xs ${textMuted}`}>Total</p>
                    <p className={`font-medium ${text}`}>
                      ${trade.total_usd?.toFixed(2) || '0.00'}
                    </p>
                  </div>
                  <div>
                    <p className={`text-xs ${textMuted}`}>Date</p>
                    <p className={`font-medium ${text}`}>
                      {formatDate(trade.timestamp)}
                    </p>
                  </div>
                </div>

                {/* Bottom: Time & Status */}
                <div className={`flex items-center justify-between mt-3 pt-3 border-t ${border}`}>
                  <span className={`text-xs ${textMuted}`}>
                    {formatTime(trade.timestamp)}
                  </span>
                  <span className="text-xs text-[#0ECB81] flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#0ECB81]"></span>
                    Completed
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Summary Card */}
      {filteredTrades.length > 0 && (
        <div className={`mx-4 mb-4 ${cardBg} rounded-xl p-4 border ${border}`}>
          <h3 className={`font-semibold ${text} mb-3`}>Summary</h3>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <p className={`text-2xl font-bold ${text}`}>{filteredTrades.length}</p>
              <p className={`text-xs ${textMuted}`}>Total Trades</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-[#0ECB81]">
                {filteredTrades.filter(t => t.type === 'buy').length}
              </p>
              <p className={`text-xs ${textMuted}`}>Buy Orders</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-[#F6465D]">
                {filteredTrades.filter(t => t.type === 'sell').length}
              </p>
              <p className={`text-xs ${textMuted}`}>Sell Orders</p>
            </div>
          </div>
        </div>
      )}

      {/* Bottom Navigation */}
      <BottomNav />
    </div>
  );
};

export default TradeHistoryPage;
