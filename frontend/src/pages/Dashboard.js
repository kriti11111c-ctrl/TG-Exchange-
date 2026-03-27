import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth, API, useTheme } from "../App";
import axios from "axios";
import useWebSocket from "../hooks/useWebSocket";
import { 
  Vault, 
  ChartLineUp, 
  Wallet, 
  ArrowsLeftRight, 
  TrendUp,
  TrendDown,
  CaretDown,
  Sun,
  Moon,
  Star,
  Fire,
  User,
  Users,
  CurrencyCircleDollar,
  Robot,
  Swap,
  DotsThree,
  Plus,
  Eye,
  EyeSlash,
  CaretRight,
  Trophy
} from "@phosphor-icons/react";
import { Button } from "../components/ui/button";

const Dashboard = () => {
  const { user } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [wallet, setWallet] = useState(null);
  const [prices, setPrices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("hot");
  const [subTab, setSubTab] = useState("crypto");
  const [showBalance, setShowBalance] = useState(true);
  
  // WebSocket for real-time prices
  const { prices: wsPrices, isConnected } = useWebSocket(true);

  // Theme colors
  const bg = isDark ? 'bg-[#0B0E11]' : 'bg-[#FAFAFA]';
  const cardBg = isDark ? 'bg-[#1E2329]' : 'bg-white';
  const text = isDark ? 'text-white' : 'text-gray-900';
  const textMuted = isDark ? 'text-[#848E9C]' : 'text-gray-500';
  const border = isDark ? 'border-[#2B3139]' : 'border-gray-200';

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [walletRes, pricesRes] = await Promise.all([
          axios.get(`${API}/wallet`, { withCredentials: true }),
          axios.get(`${API}/market/prices`)
        ]);
        setWallet(walletRes.data);
        setPrices(pricesRes.data);
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    const interval = setInterval(() => {
      if (!isConnected) {
        fetchData();
      }
    }, 30000);
    return () => clearInterval(interval);
  }, [isConnected]);

  // Update prices from WebSocket
  useEffect(() => {
    if (wsPrices && Object.keys(wsPrices).length > 0) {
      setPrices(prev => prev.map(coin => {
        const wsData = wsPrices[coin.symbol?.toLowerCase()];
        if (wsData) {
          return {
            ...coin,
            current_price: wsData.price,
            price_change_percentage_24h: wsData.change24h
          };
        }
        return coin;
      }));
    }
  }, [wsPrices]);

  // Quick action items
  const quickActions = [
    { icon: Users, label: "Referral", path: "/referral", color: "text-[#F0B90B]" },
    { icon: CurrencyCircleDollar, label: "Earn", path: "/wallet", color: "text-[#0ECB81]" },
    { icon: Robot, label: "Trading Bots", path: "/trade", color: "text-[#3498DB]" },
    { icon: Trophy, label: "VIP Rank", path: "/rank", color: "text-[#9B59B6]" },
    { icon: DotsThree, label: "More", path: "/profile", color: "text-[#848E9C]" }
  ];

  // Market tabs - Only Favorites and Hot
  const marketTabs = [
    { id: "favorites", label: "Favorites", icon: Star },
    { id: "hot", label: "Hot", icon: Fire }
  ];

  // Format volume
  const formatVolume = (vol) => {
    if (vol >= 1e9) return `${(vol / 1e9).toFixed(2)}B`;
    if (vol >= 1e6) return `${(vol / 1e6).toFixed(2)}M`;
    if (vol >= 1e3) return `${(vol / 1e3).toFixed(2)}K`;
    return vol?.toFixed(2) || '0';
  };

  // Get filtered and sorted prices
  const getFilteredPrices = () => {
    let filtered = [...prices];
    
    switch (activeTab) {
      case "favorites":
        // Show top 5 by market cap
        filtered = filtered.filter(c => ["bitcoin", "ethereum", "binancecoin", "solana", "ripple"].includes(c.coin_id));
        break;
      case "hot":
      default:
        // Show ALL coins sorted by volatility (most active first)
        filtered = filtered.sort((a, b) => Math.abs(b.price_change_percentage_24h || 0) - Math.abs(a.price_change_percentage_24h || 0));
        break;
    }
    
    return filtered;
  };

  // Calculate portfolio value
  const calculatePortfolioValue = () => {
    if (!wallet || !prices.length) return 0;
    
    let total = wallet.balances.usdt || 0;
    
    const coinMap = {
      btc: 'bitcoin',
      eth: 'ethereum',
      bnb: 'binancecoin',
      xrp: 'ripple',
      sol: 'solana'
    };

    Object.entries(wallet.balances).forEach(([coin, amount]) => {
      if (coin === 'usdt') return;
      const coinId = coinMap[coin];
      const priceData = prices.find(p => p.coin_id === coinId);
      if (priceData && amount > 0) {
        total += amount * priceData.current_price;
      }
    });

    return total;
  };

  if (loading) {
    return (
      <div className={`min-h-screen ${bg} flex items-center justify-center`}>
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-[#F0B90B] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className={textMuted}>Loading...</p>
        </div>
      </div>
    );
  }

  const filteredPrices = getFilteredPrices();
  const portfolioValue = calculatePortfolioValue();

  return (
    <div className={`min-h-screen ${bg} pb-20`}>
      {/* Header */}
      <div className={`${cardBg} px-4 pt-4 pb-2`}>
        {/* Top Bar */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Vault size={28} weight="duotone" className="text-[#00E599]" />
            <span className={`font-bold text-lg ${text}`} style={{ fontFamily: 'Unbounded' }}>
              TG Xchange
            </span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={toggleTheme}
              className={`p-2 rounded-full ${isDark ? 'bg-[#2B3139]' : 'bg-gray-100'}`}
            >
              {isDark ? <Sun size={18} className="text-[#F0B90B]" /> : <Moon size={18} className="text-gray-600" />}
            </button>
            <Link to="/profile">
              <div className="w-8 h-8 rounded-full bg-[#F0B90B] flex items-center justify-center">
                <User size={16} className="text-black" weight="fill" />
              </div>
            </Link>
          </div>
        </div>

        {/* Est. Total Value */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className={`text-sm ${textMuted}`}>Est. Total Value (USD)</span>
              <button onClick={() => setShowBalance(!showBalance)}>
                {showBalance ? <Eye size={16} className={textMuted} /> : <EyeSlash size={16} className={textMuted} />}
              </button>
              <CaretDown size={14} className={textMuted} />
            </div>
            <div className="flex items-baseline gap-2">
              <span className={`text-2xl font-bold ${text}`}>
                {showBalance ? `$${portfolioValue.toFixed(2)}` : '****'}
              </span>
            </div>
          </div>
          <Link to="/wallet">
            <Button className="bg-[#F0B90B] hover:bg-[#F0B90B]/90 text-black font-medium px-4 rounded-lg">
              <Plus size={16} className="mr-1" />
              Add Funds
            </Button>
          </Link>
        </div>
      </div>

      {/* Quick Actions */}
      <div className={`${cardBg} px-4 py-4 border-t ${border}`}>
        <div className="flex justify-between">
          {quickActions.map((action, index) => (
            <Link key={index} to={action.path} className="flex flex-col items-center gap-1">
              <div className={`w-12 h-12 rounded-xl ${isDark ? 'bg-[#2B3139]' : 'bg-gray-100'} flex items-center justify-center`}>
                <action.icon size={24} className={action.color} weight="duotone" />
              </div>
              <span className={`text-xs ${textMuted}`}>{action.label}</span>
            </Link>
          ))}
        </div>
      </div>

      {/* Discover Banner */}
      <div className="px-4 py-3">
        <div className="bg-gradient-to-r from-[#F0B90B] to-[#FCD535] rounded-xl p-4 flex items-center justify-between">
          <div>
            <p className="text-black font-bold text-sm">Discover personalized home</p>
            <p className="text-black font-bold text-sm">experiences!</p>
          </div>
          <CaretRight size={20} className="text-black" />
        </div>
      </div>

      {/* Market Tabs */}
      <div className={`${cardBg} px-2 pt-3`}>
        {/* Main Tabs - Scrollable */}
        <div className="overflow-x-auto scrollbar-hide">
          <div className="flex gap-1 min-w-max pb-2">
            {marketTabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                  activeTab === tab.id 
                    ? 'bg-[#F0B90B]/20 text-[#F0B90B]' 
                    : `${textMuted} hover:bg-white/5`
                }`}
              >
                <tab.icon size={16} weight={activeTab === tab.id ? "fill" : "regular"} />
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Sub Tabs */}
        <div className={`flex gap-4 px-2 py-2 border-b ${border}`}>
          {['crypto', 'futures'].map(tab => (
            <button
              key={tab}
              onClick={() => setSubTab(tab)}
              className={`text-sm font-medium capitalize ${
                subTab === tab ? text : textMuted
              }`}
            >
              {tab}
              {subTab === tab && <div className="h-0.5 bg-[#F0B90B] mt-1 rounded-full"></div>}
            </button>
          ))}
        </div>
      </div>

      {/* Coin List */}
      <div className={`${cardBg}`}>
        {/* Table Header */}
        <div className={`flex items-center px-4 py-2 text-xs ${textMuted} border-b ${border}`}>
          <div className="flex-1">Name</div>
          <div className="w-28 text-right">Last Price</div>
          <div className="w-20 text-right">24h chg%</div>
        </div>

        {/* Coin Rows */}
        <div className="px-2 space-y-2 pb-4">
          {filteredPrices.length === 0 ? (
            <div className="py-12 text-center">
              <TrendUp size={48} className={`mx-auto mb-3 ${textMuted}`} />
              <p className={`font-medium ${text}`}>No coins in this category</p>
              <p className={`text-sm ${textMuted}`}>
                {activeTab === 'gainers' ? 'Market is down, no gainers right now' : 'Check back later'}
              </p>
            </div>
          ) : (
            filteredPrices.map((coin, index) => {
              const change = coin.price_change_percentage_24h || 0;
              const isPositive = change >= 0;
              
              return (
                <Link
                  key={coin.coin_id || index}
                  to={`/trade?symbol=${coin.symbol || 'BTC'}`}
                  className={`flex items-center px-4 py-3 rounded-xl border-2 ${isDark ? 'border-[#2B3139] hover:border-[#3B4149] hover:bg-[#1E2329]' : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'} transition-all`}
                >
                {/* Coin Name */}
                <div className="flex-1 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full overflow-hidden bg-white/10 flex items-center justify-center flex-shrink-0">
                    {coin.image ? (
                      <img 
                        src={coin.image} 
                        alt={coin.symbol} 
                        className="w-8 h-8 object-contain"
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.src = `https://ui-avatars.com/api/?name=${coin.symbol}&background=F0B90B&color=000&size=32&bold=true`;
                        }}
                      />
                    ) : (
                      <span className="text-[#F0B90B] font-bold text-sm">{coin.symbol?.charAt(0)}</span>
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-1">
                      <span className={`font-medium ${text}`}>{coin.symbol?.toUpperCase()}</span>
                      <span className="text-[10px] px-1 py-0.5 rounded bg-[#F0B90B]/20 text-[#F0B90B]">3x</span>
                    </div>
                    <span className={`text-xs ${textMuted}`}>/USDT</span>
                  </div>
                </div>

                {/* Last Price */}
                <div className="w-28 text-right">
                  <p className={`font-medium ${text}`}>
                    {coin.current_price?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                  <p className={`text-xs ${textMuted}`}>
                    ${coin.current_price?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                </div>

                {/* 24h Change */}
                <div className="w-20 flex justify-end">
                  <span className={`px-2 py-1 rounded text-sm font-medium ${
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
        </div>
      </div>

      {/* Bottom Navigation - 5 Tabs: Home, Market, Trade, Futures, Assets */}
      <div className={`fixed bottom-0 left-0 right-0 ${cardBg} border-t ${border} px-2 py-2 flex justify-around items-center z-50`}>
        <Link to="/dashboard" className="flex flex-col items-center py-1">
          <ChartLineUp size={22} className="text-[#F0B90B]" weight="fill" />
          <span className="text-[10px] text-[#F0B90B] mt-0.5">Home</span>
        </Link>
        <Link to="/trade" className="flex flex-col items-center py-1">
          <ArrowsLeftRight size={22} className={textMuted} />
          <span className={`text-[10px] ${textMuted} mt-0.5`}>Market</span>
        </Link>
        <Link to="/trade" className="flex flex-col items-center py-1">
          <div className="w-12 h-12 rounded-full bg-[#F0B90B] flex items-center justify-center -mt-6 shadow-lg">
            <Swap size={24} className="text-black" weight="bold" />
          </div>
          <span className={`text-[10px] ${textMuted} mt-0.5`}>Trade</span>
        </Link>
        <Link to="/trade?futures=true" className="flex flex-col items-center py-1">
          <TrendUp size={22} className={textMuted} />
          <span className={`text-[10px] ${textMuted} mt-0.5`}>Futures</span>
        </Link>
        <Link to="/wallet" className="flex flex-col items-center py-1">
          <Wallet size={22} className={textMuted} />
          <span className={`text-[10px] ${textMuted} mt-0.5`}>Assets</span>
        </Link>
      </div>
    </div>
  );
};

export default Dashboard;
