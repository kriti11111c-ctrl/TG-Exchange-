import { useState, useEffect, useRef } from "react";
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
  CaretUp,
  Bell,
  X
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
  const [showNotifications, setShowNotifications] = useState(false);
  const notificationRef = useRef(null);
  
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
    if (seconds <= 0) return "00:00:00";
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hours > 0) {
      return `${hours}h ${mins}m ${secs}s`;
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Countdown timer effect - handles both live timer and countdown to live
  useEffect(() => {
    const interval = setInterval(() => {
      setCountdowns(prev => {
        const updated = {};
        tradeCodes.forEach(code => {
          // For live codes - count down remaining time
          if (code.is_live && code.time_remaining > 0) {
            const key = `${code.code}_remaining`;
            const currentRemaining = prev[key] !== undefined 
              ? prev[key] 
              : code.time_remaining;
            updated[key] = Math.max(0, currentRemaining - 1);
          }
          // For scheduled codes - count down to live
          if (code.countdown_to_live > 0) {
            const key = `${code.code}_tolive`;
            const currentCountdown = prev[key] !== undefined 
              ? prev[key] 
              : code.countdown_to_live;
            updated[key] = Math.max(0, currentCountdown - 1);
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
      setShowNotifications(false);
      // Refresh wallet
      const walletRes = await axios.get(`${API}/wallet`, { withCredentials: true });
      setWallet(walletRes.data);
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to apply code");
    }
  };

  // Close notification dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (notificationRef.current && !notificationRef.current.contains(event.target)) {
        setShowNotifications(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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
  
  // Get codes for notification badge - live or scheduled
  const activeOrScheduledCodes = tradeCodes.filter(c => 
    (c.is_live || (c.countdown_to_live > 0 && c.status !== "used"))
  );

  return (
    <div className={`min-h-screen ${bg} pb-20`}>
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
            
            {/* Bell Icon with Notification Dropdown */}
            <div className="relative" ref={notificationRef}>
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className={`p-2 rounded-full relative ${isDark ? 'bg-[#2B3139]' : 'bg-gray-100'}`}
                data-testid="notification-bell"
              >
                <Bell size={18} className={isDark ? 'text-white' : 'text-gray-600'} />
                {/* Notification Badge */}
                {activeOrScheduledCodes.length > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 rounded-full text-[10px] text-white flex items-center justify-center font-bold">
                    {activeOrScheduledCodes.length}
                  </span>
                )}
              </button>
              
              {/* Notification Dropdown - Fixed Center */}
              {showNotifications && (
                <div className="fixed inset-0 z-50" onClick={() => setShowNotifications(false)}>
                  {/* Backdrop */}
                  <div className="absolute inset-0 bg-black/30" />
                  
                  {/* Dropdown Card */}
                  <div 
                    className={`absolute left-4 right-4 top-20 ${isDark ? 'bg-[#1E2329]' : 'bg-white'} rounded-2xl shadow-2xl border ${border} overflow-hidden`}
                    onClick={(e) => e.stopPropagation()}
                  >
                    {/* Dropdown Header */}
                    <div className={`flex items-center justify-between px-4 py-3 border-b ${border}`}>
                      <div className="flex items-center gap-2">
                        <Bell size={20} className="text-[#0ECB81]" weight="fill" />
                        <span className={`font-bold text-lg ${text}`}>Trade Codes</span>
                      </div>
                      <button 
                        onClick={() => setShowNotifications(false)}
                        className={`p-1.5 rounded-full ${isDark ? 'hover:bg-[#2B3139]' : 'hover:bg-gray-100'}`}
                      >
                        <X size={20} className={textMuted} />
                      </button>
                    </div>
                  
                  {/* Codes List */}
                  <div className="max-h-80 overflow-y-auto">
                    {tradeCodes.length === 0 ? (
                      <div className="p-6 text-center">
                        <Bell size={40} className={`${textMuted} mx-auto mb-2`} />
                        <p className={textMuted}>No trade codes yet</p>
                      </div>
                    ) : (
                      <div className="p-3 space-y-3">
                        {tradeCodes.map((code) => {
                          // Get countdown values from state
                          const remainingKey = `${code.code}_remaining`;
                          const toLiveKey = `${code.code}_tolive`;
                          const remaining = countdowns[remainingKey] !== undefined 
                            ? countdowns[remainingKey] 
                            : code.time_remaining;
                          const countdownToLive = countdowns[toLiveKey] !== undefined
                            ? countdowns[toLiveKey]
                            : code.countdown_to_live;
                          
                          const isUsed = code.status === "used";
                          const isExpired = code.is_expired || (code.is_live && remaining <= 0);
                          const isLive = code.is_live && remaining > 0;
                          const isScheduled = !isLive && !isUsed && !isExpired && countdownToLive > 0;
                          
                          // For scheduled codes - show "Coming Soon" card
                          if (isScheduled) {
                            return (
                              <div 
                                key={code.code}
                                className={`p-4 rounded-xl bg-gradient-to-r from-[#0ECB81]/15 to-[#0ECB81]/5 border border-[#0ECB81]/30`}
                              >
                                {/* Coming Soon Header */}
                                <div className="flex items-center justify-between mb-3">
                                  <div className="flex items-center gap-2">
                                    <div className="w-8 h-8 rounded-full bg-[#0ECB81]/20 flex items-center justify-center">
                                      <Clock size={18} className="text-[#0ECB81]" />
                                    </div>
                                    <div>
                                      <span className="text-[#0ECB81] font-bold text-sm">Coming Soon</span>
                                      <p className={`text-[10px] ${textMuted}`}>{code.slot_name} Slot</p>
                                    </div>
                                  </div>
                                </div>
                                
                                {/* Countdown */}
                                <div className="text-center py-3 bg-[#0ECB81]/10 rounded-lg mb-2">
                                  <p className={`text-[10px] ${textMuted} mb-1`}>Code will be available in</p>
                                  <p className="text-[#0ECB81] font-bold text-xl">{formatCountdown(countdownToLive)}</p>
                                </div>
                                
                                <p className={`text-[10px] ${textMuted} text-center`}>
                                  Be ready at {code.slot_name} to copy & use the code
                                </p>
                              </div>
                            );
                          }
                          
                          // For LIVE, Used, or Expired codes - show full card
                          return (
                            <div 
                              key={code.code}
                              className={`p-3 rounded-xl ${
                                isLive 
                                  ? 'bg-gradient-to-r from-[#0ECB81]/20 to-[#0ECB81]/5 border border-[#0ECB81]/40' 
                                  : isExpired
                                    ? 'bg-gradient-to-r from-red-500/10 to-red-500/5 border border-red-500/30'
                                    : isUsed
                                      ? 'bg-gradient-to-r from-green-500/10 to-green-500/5 border border-green-500/30'
                                      : isDark ? 'bg-[#0B0E11]' : 'bg-gray-50'
                              }`}
                            >
                              {/* Status Header */}
                              <div className="flex items-center justify-between mb-2">
                                {isLive && (
                                  <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-[#0ECB81] text-white text-[10px] font-bold animate-pulse">
                                    <span className="w-1.5 h-1.5 rounded-full bg-white"></span>
                                    LIVE
                                  </div>
                                )}
                                {isUsed && (
                                  <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-green-500 text-white text-[10px] font-bold">
                                    <CheckCircle size={12} weight="fill" />
                                    SUCCESS
                                  </div>
                                )}
                                {isExpired && !isUsed && (
                                  <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-red-500 text-white text-[10px] font-bold">
                                    <XCircle size={12} weight="fill" />
                                    EXPIRED
                                  </div>
                                )}
                                <span className={`text-[10px] ${textMuted}`}>{code.slot_name}</span>
                              </div>
                              
                              {/* Code with Copy - Full Width */}
                              <div className="mb-3">
                                <button
                                  onClick={() => copyCode(code.code)}
                                  className={`w-full flex items-center justify-center gap-2 ${
                                    isLive 
                                      ? 'bg-[#0ECB81]/30 hover:bg-[#0ECB81]/40' 
                                      : isExpired
                                        ? 'bg-red-500/20'
                                        : isUsed
                                          ? 'bg-green-500/20'
                                          : isDark ? 'bg-[#2B3139] hover:bg-[#3B4149]' : 'bg-gray-200 hover:bg-gray-300'
                                  } rounded-lg px-4 py-2.5 transition-all`}
                                  data-testid={`copy-code-${code.code}`}
                                >
                                  <span className={`font-mono font-bold text-base tracking-wider ${
                                    isLive ? 'text-[#0ECB81]' : isExpired ? 'text-red-500' : isUsed ? 'text-green-500' : text
                                  }`}>
                                    {code.code}
                                  </span>
                                  <Copy size={16} className={isLive ? 'text-[#0ECB81]' : isExpired ? 'text-red-500' : isUsed ? 'text-green-500' : textMuted} />
                                </button>
                              </div>
                              
                              {/* Status Row */}
                              <div className="flex items-center justify-between">
                                {/* Status Badge */}
                                <div className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${
                                  isUsed 
                                    ? 'bg-green-500/20 text-green-500' 
                                    : isExpired 
                                      ? 'bg-red-500/20 text-red-500' 
                                      : 'bg-[#0ECB81]/20 text-[#0ECB81]'
                                }`}>
                                  {isUsed ? (
                                    <>
                                      <CheckCircle size={12} weight="fill" />
                                      <span>+${(code.actual_profit || 0).toFixed(2)} Earned</span>
                                    </>
                                  ) : isExpired ? (
                                    <>
                                      <XCircle size={12} weight="fill" />
                                      <span>Missed - Expired</span>
                                    </>
                                  ) : (
                                    <>
                                      <Clock size={12} weight="fill" />
                                      <span>{formatCountdown(remaining)} left</span>
                                    </>
                                  )}
                                </div>
                                
                                {/* Fund Info - only for LIVE */}
                                {isLive && code.trade_fund > 0 && (
                                  <span className={`text-[10px] ${textMuted}`}>
                                    Trade: ${code.trade_fund} ({code.multiplier || 1}x)
                                  </span>
                                )}
                              </div>
                              
                              {/* Instruction for LIVE */}
                              {isLive && (
                                <p className={`text-[10px] ${textMuted} mt-2 italic`}>
                                  Copy code & paste in Futures → Trade Code
                                </p>
                              )}
                              
                              {/* Used code details */}
                              {isUsed && code.actual_trade_amount > 0 && (
                                <p className={`text-[10px] ${textMuted} mt-2`}>
                                  Traded ${code.actual_trade_amount?.toFixed(2)} at {code.multiplier || 1}x
                                </p>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </div>
              )}
            </div>
            
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
