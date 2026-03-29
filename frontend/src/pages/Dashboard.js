import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth, API, useTheme } from "../App";
import axios from "axios";
import useWebSocket from "../hooks/useWebSocket";
import { toast } from "sonner";
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
  Trophy,
  Ticket,
  Copy,
  Clock,
  CheckCircle,
  XCircle,
  CaretUp
} from "@phosphor-icons/react";
import { Button } from "../components/ui/button";
import BottomNav from "../components/BottomNav";

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
  
  // Trade Codes State
  const [tradeCodes, setTradeCodes] = useState([]);
  const [showCodeHistory, setShowCodeHistory] = useState(false);
  const [countdowns, setCountdowns] = useState({});
  
  // WebSocket for real-time prices
  const { prices: wsPrices, isConnected } = useWebSocket(true);

  // Theme colors
  const bg = isDark ? 'bg-[#0B0E11]' : 'bg-[#FAFAFA]';
  const cardBg = isDark ? 'bg-[#1E2329]' : 'bg-white';
  const text = isDark ? 'text-white' : 'text-gray-900';
  const textMuted = isDark ? 'text-[#848E9C]' : 'text-gray-500';
  const border = isDark ? 'border-[#2B3139]' : 'border-gray-200';

  // Fetch Trade Codes
  const fetchTradeCodes = async () => {
    try {
      const res = await axios.get(`${API}/user/trade-codes`, { withCredentials: true });
      setTradeCodes(res.data.codes || []);
    } catch (error) {
      console.error("Error fetching trade codes:", error);
    }
  };

  // Copy code to clipboard
  const copyCode = async (code) => {
    try {
      await navigator.clipboard.writeText(code);
      toast.success("Code copied!");
    } catch (err) {
      // Fallback for environments where clipboard API is not available
      const textArea = document.createElement("textarea");
      textArea.value = code;
      textArea.style.position = "fixed";
      textArea.style.left = "-999999px";
      document.body.appendChild(textArea);
      textArea.select();
      try {
        document.execCommand('copy');
        toast.success("Code copied!");
      } catch (e) {
        toast.error("Copy failed. Code: " + code);
      }
      document.body.removeChild(textArea);
    }
  };

  // Format countdown time
  const formatCountdown = (seconds) => {
    if (seconds <= 0) return "Expired";
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Countdown timer effect
  useEffect(() => {
    const interval = setInterval(() => {
      setCountdowns(prev => {
        const updated = {};
        tradeCodes.forEach(code => {
          if (code.status === "active" && !code.is_expired && code.time_remaining > 0) {
            const currentRemaining = prev[code.code] !== undefined 
              ? prev[code.code] 
              : code.time_remaining;
            updated[code.code] = Math.max(0, currentRemaining - 1);
          }
        });
        return updated;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [tradeCodes]);

  // Apply trade code
  const applyTradeCode = async (code) => {
    try {
      const res = await axios.post(`${API}/trade/apply-code`, { code }, { withCredentials: true });
      toast.success(res.data.message);
      fetchTradeCodes();
      // Refresh wallet
      const walletRes = await axios.get(`${API}/wallet`, { withCredentials: true });
      setWallet(walletRes.data);
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to apply code");
    }
  };

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
    fetchTradeCodes(); // Fetch trade codes on mount
    
    const interval = setInterval(() => {
      if (!isConnected) {
        fetchData();
      }
      fetchTradeCodes(); // Refresh trade codes every 30 seconds
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
    { icon: Vault, label: "Staking", path: "/staking", color: "text-[#0ECB81]" },
    { icon: Trophy, label: "VIP Rank", path: "/rank", color: "text-[#9B59B6]" },
    { icon: Users, label: "Referral", path: "/referral", color: "text-[#F0B90B]" },
    { icon: Robot, label: "Trading Bots", path: "/trade", color: "text-[#3498DB]" },
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
  
  // Get active codes (not used and not expired)
  const activeCodes = tradeCodes.filter(c => 
    c.status === "active" && !c.is_expired && (countdowns[c.code] > 0 || c.time_remaining > 0)
  );

  return (
    <div className={`min-h-screen ${bg} pb-20`}>
      {/* Trade Code Notification Bar */}
      {activeCodes.length > 0 && (
        <div className="bg-gradient-to-r from-[#F0B90B] to-[#FCD535] px-4 py-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Ticket size={18} className="text-black" weight="fill" />
              <span className="text-black text-sm font-semibold">New Trade Code!</span>
            </div>
            <button 
              onClick={() => setShowCodeHistory(!showCodeHistory)}
              className="text-black text-xs underline"
            >
              {showCodeHistory ? 'Hide' : 'View All'}
            </button>
          </div>
          
          {/* Active Code Display */}
          <div className="mt-2 space-y-2">
            {activeCodes.slice(0, showCodeHistory ? activeCodes.length : 1).map((code) => {
              const remaining = countdowns[code.code] !== undefined 
                ? countdowns[code.code] 
                : code.time_remaining;
              const isExpired = remaining <= 0;
              
              return (
                <div 
                  key={code.code}
                  className="bg-black/10 rounded-lg p-2 flex items-center justify-between"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => copyCode(code.code)}
                        className="flex items-center gap-1 bg-black/20 hover:bg-black/30 rounded px-2 py-1 transition-all"
                        data-testid={`copy-code-${code.code}`}
                      >
                        <span className="text-black font-mono font-bold text-sm">{code.code}</span>
                        <Copy size={14} className="text-black" />
                      </button>
                      
                      {/* Countdown Timer */}
                      <div className={`flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${
                        isExpired ? 'bg-red-500/20 text-red-700' : 'bg-green-500/20 text-green-700'
                      }`}>
                        <Clock size={12} />
                        <span>{isExpired ? 'Expired' : formatCountdown(remaining)}</span>
                      </div>
                    </div>
                    
                    <div className="text-[10px] text-black/70 mt-1">
                      {code.trade_type?.toUpperCase()} {code.amount} {code.coin?.toUpperCase()} @ ${code.price}
                    </div>
                  </div>
                  
                  {!isExpired && (
                    <Button
                      onClick={() => applyTradeCode(code.code)}
                      size="sm"
                      className="bg-black hover:bg-black/80 text-[#F0B90B] font-bold text-xs px-3"
                      data-testid={`apply-code-${code.code}`}
                    >
                      Apply
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
      
      {/* Code History Section */}
      {showCodeHistory && tradeCodes.length > 0 && (
        <div className={`${cardBg} border-b ${border} px-4 py-3`}>
          <div className="flex items-center justify-between mb-2">
            <span className={`text-sm font-semibold ${text}`}>Code History</span>
            <button onClick={() => setShowCodeHistory(false)}>
              <CaretUp size={16} className={textMuted} />
            </button>
          </div>
          
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {tradeCodes.map((code) => {
              const remaining = countdowns[code.code] !== undefined 
                ? countdowns[code.code] 
                : code.time_remaining;
              const isExpired = code.is_expired || remaining <= 0;
              const isUsed = code.status === "used";
              
              return (
                <div 
                  key={code.code}
                  className={`p-2 rounded-lg border ${border} flex items-center justify-between ${
                    isUsed ? 'opacity-60' : ''
                  }`}
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => copyCode(code.code)}
                        className={`flex items-center gap-1 ${isDark ? 'bg-[#2B3139]' : 'bg-gray-100'} rounded px-2 py-0.5`}
                      >
                        <span className={`font-mono text-xs ${text}`}>{code.code}</span>
                        <Copy size={12} className={textMuted} />
                      </button>
                      
                      {/* Status Badge */}
                      {isUsed ? (
                        <span className="flex items-center gap-1 text-[10px] text-green-500">
                          <CheckCircle size={12} />
                          Used
                        </span>
                      ) : isExpired ? (
                        <span className="flex items-center gap-1 text-[10px] text-red-500">
                          <XCircle size={12} />
                          Expired
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-[10px] text-[#F0B90B]">
                          <Clock size={12} />
                          {formatCountdown(remaining)}
                        </span>
                      )}
                    </div>
                    
                    <div className={`text-[10px] ${textMuted} mt-1`}>
                      {code.trade_type?.toUpperCase()} {code.amount} {code.coin?.toUpperCase()} @ ${code.price}
                    </div>
                  </div>
                  
                  {!isUsed && !isExpired && (
                    <Button
                      onClick={() => applyTradeCode(code.code)}
                      size="sm"
                      variant="outline"
                      className="text-[#F0B90B] border-[#F0B90B] text-xs h-7"
                    >
                      Apply
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Header */}
      <div className={`${cardBg} px-4 pt-4 pb-2`}>
        {/* Top Bar */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <img src="/images/tg-logo.png" alt="TG Exchange" className="w-8 h-8 rounded-full" />
            <span className={`font-bold text-lg ${text}`} style={{ fontFamily: 'Unbounded' }}>
              TG Exchange
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
      <BottomNav />
    </div>
  );
};

export default Dashboard;
