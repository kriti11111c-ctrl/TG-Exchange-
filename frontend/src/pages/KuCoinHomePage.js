import { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth, API, useTheme } from "../App";
import axios from "axios";
import useWebSocket from "../hooks/useWebSocket";
import { toast } from "sonner";
import TelegramPopup from "../components/TelegramPopup";
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
  CaretLeft,
  Trophy,
  Ticket,
  Copy,
  Clock,
  CheckCircle,
  XCircle,
  CaretUp,
  Bell,
  X,
  Gift,
  Coin,
  Rocket,
  Lightning,
  GameController,
  PiggyBank,
  ChartPie,
  Sparkle,
  Medal,
  Crown,
  HandCoins,
  ArrowDown,
  Confetti
} from "@phosphor-icons/react";
import { Button } from "../components/ui/button";
import BottomNav from "../components/BottomNav";

const KuCoinHomePage = () => {
  const { user } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [wallet, setWallet] = useState(null);
  const [prices, setPrices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("hot");
  const [subTab, setSubTab] = useState("crypto");
  const [showBalance, setShowBalance] = useState(true);
  const [activePriceIndex, setActivePriceIndex] = useState(0);
  
  // Trade Codes State
  const [tradeCodes, setTradeCodes] = useState([]);
  const [showCodeHistory, setShowCodeHistory] = useState(false);
  const [countdowns, setCountdowns] = useState({});
  const [showNotifications, setShowNotifications] = useState(false);
  const notificationRef = useRef(null);
  
  // WebSocket for real-time prices
  const { prices: wsPrices, isConnected } = useWebSocket(true);

  // Theme colors
  const bg = isDark ? 'bg-[#0B0E11]' : 'bg-[#F5F5F5]';
  const cardBg = isDark ? 'bg-[#1E2329]' : 'bg-white';
  const text = isDark ? 'text-white' : 'text-gray-900';
  const textMuted = isDark ? 'text-[#848E9C]' : 'text-gray-500';
  const border = isDark ? 'border-[#2B3139]' : 'border-gray-200';
  const green = 'text-[#0ECB81]';
  const red = 'text-[#F6465D]';

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

  // Countdown timer effect
  useEffect(() => {
    const interval = setInterval(() => {
      setCountdowns(prev => {
        const updated = {};
        tradeCodes.forEach(code => {
          if (code.is_live && code.time_remaining > 0) {
            const key = `${code.code}_remaining`;
            const currentRemaining = prev[key] !== undefined ? prev[key] : code.time_remaining;
            updated[key] = Math.max(0, currentRemaining - 1);
          }
          if (code.countdown_to_live > 0) {
            const key = `${code.code}_tolive`;
            const currentCountdown = prev[key] !== undefined ? prev[key] : code.countdown_to_live;
            updated[key] = Math.max(0, currentCountdown - 1);
          }
        });
        return updated;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [tradeCodes]);

  // Price ticker auto-scroll
  useEffect(() => {
    const interval = setInterval(() => {
      setActivePriceIndex(prev => (prev + 1) % Math.max(1, Math.ceil(prices.length / 3)));
    }, 3000);
    return () => clearInterval(interval);
  }, [prices.length]);

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
          axios.get(`${API}/market/prices`, { timeout: 5000 })
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
    fetchTradeCodes();
    
    const interval = setInterval(() => {
      if (!isConnected) {
        fetchData();
      }
      fetchTradeCodes();
    }, 60000);
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

  // KuCoin style feature icons - 2 rows
  const featureIcons = [
    { icon: ArrowDown, label: "Deposit", path: "/deposit", color: "#0ECB81", badge: null },
    { icon: Users, label: "Referral", path: "/referral", color: "#F0B90B", badge: "NEW" },
    { icon: Robot, label: "Trading Bot", path: "/trade", color: "#E74C3C", badge: "HOT" },
    { icon: Trophy, label: "VIP Rank", path: "/rank", color: "#9B59B6", badge: null },
    { icon: Gift, label: "Rewards", path: "/profile", color: "#00E5FF", badge: "NEW" },
    { icon: Coin, label: "P2P", path: "/wallet", color: "#3498DB", badge: null },
    { icon: PiggyBank, label: "Earn", path: "/staking", color: "#2ECC71", badge: null },
    { icon: Rocket, label: "Launchpad", path: "/trade", color: "#F39C12", badge: null },
    { icon: Medal, label: "Rewards Hub", path: "/profile", color: "#1ABC9C", badge: null },
    { icon: ChartPie, label: "Wealth", path: "/wallet", color: "#8E44AD", badge: null },
  ];

  // Calculate portfolio value
  const calculatePortfolioValue = () => {
    if (!wallet || !prices.length) return 0;
    let total = wallet.balances?.usdt || 0;
    const coinMap = { btc: 'bitcoin', eth: 'ethereum', bnb: 'binancecoin', xrp: 'ripple', sol: 'solana' };
    Object.entries(wallet.balances || {}).forEach(([coin, amount]) => {
      if (coin === 'usdt') return;
      const coinId = coinMap[coin];
      const priceData = prices.find(p => p.coin_id === coinId);
      if (priceData && amount > 0) {
        total += amount * priceData.current_price;
      }
    });
    return total;
  };

  // Get top 3 prices for ticker
  const getTickerPrices = () => {
    const topCoins = prices.filter(c => ['bitcoin', 'ethereum', 'binancecoin', 'solana', 'ripple'].includes(c.coin_id));
    return topCoins.slice(0, 3);
  };

  if (loading) {
    return (
      <div className={`min-h-screen ${bg} flex items-center justify-center`}>
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-[#0ECB81] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className={textMuted}>Loading...</p>
        </div>
      </div>
    );
  }

  const portfolioValue = calculatePortfolioValue();
  const tickerPrices = getTickerPrices();
  const activeOrScheduledCodes = tradeCodes.filter(c => (c.is_live || (c.countdown_to_live > 0 && c.status !== "used")));

  return (
    <div className={`min-h-screen ${bg} pb-20`}>
      <TelegramPopup />
      
      {/* Top Header Bar */}
      <div className={`${isDark ? 'bg-[#1E2329]' : 'bg-white'} px-4 py-3 flex items-center justify-between sticky top-0 z-40`}>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg overflow-hidden bg-[#0ECB81]">
            <img src="/images/tg-logo.png" alt="TG" className="w-full h-full object-cover" />
          </div>
          <span className={`font-bold text-lg ${text}`}>TG Exchange</span>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={toggleTheme} className={`p-2 rounded-full ${isDark ? 'bg-[#2B3139]' : 'bg-gray-100'}`}>
            {isDark ? <Sun size={18} className="text-[#F0B90B]" /> : <Moon size={18} className="text-gray-600" />}
          </button>
          <div className="relative" ref={notificationRef}>
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className={`p-2 rounded-full ${isDark ? 'bg-[#2B3139]' : 'bg-gray-100'} relative`}
            >
              <Bell size={18} className={text} />
              {activeOrScheduledCodes.length > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 rounded-full text-[10px] text-white flex items-center justify-center font-bold animate-pulse">
                  {activeOrScheduledCodes.length}
                </span>
              )}
            </button>
          </div>
          <Link to="/profile">
            <div className="w-8 h-8 rounded-full bg-[#0ECB81] flex items-center justify-center">
              <User size={16} className="text-white" weight="fill" />
            </div>
          </Link>
        </div>
      </div>

      {/* Hero Banner - Promotional */}
      <div className="px-4 py-3">
        <div className={`relative rounded-2xl overflow-hidden ${isDark ? 'bg-gradient-to-r from-[#1a3a2e] to-[#0d1f18]' : 'bg-gradient-to-r from-[#e8f5e9] to-[#c8e6c9]'}`}>
          {/* Background Pattern */}
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-0 right-0 w-32 h-32 bg-[#0ECB81] rounded-full blur-3xl"></div>
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-[#F0B90B] rounded-full blur-3xl"></div>
          </div>
          
          <div className="relative p-4 flex items-center justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className={`text-xs px-2 py-0.5 rounded ${isDark ? 'bg-[#0ECB81]/20 text-[#0ECB81]' : 'bg-[#0ECB81] text-white'}`}>TG EXCHANGE</span>
              </div>
              <h2 className={`text-lg font-bold ${text} mb-1`}>Deposit & Transfer Assets</h2>
              <h1 className="text-2xl font-black text-[#F0B90B] mb-1">Win a Share of</h1>
              <h1 className="text-3xl font-black text-[#0ECB81]">1 MILLION USDT</h1>
              <p className={`text-xs ${textMuted} mt-2`}>BONUSES!</p>
            </div>
            <div className="w-24 h-24 relative">
              <div className="absolute inset-0 bg-[#0ECB81]/20 rounded-full animate-pulse"></div>
              <div className="absolute inset-2 bg-[#F0B90B]/30 rounded-full flex items-center justify-center">
                <Coin size={48} className="text-[#F0B90B]" weight="fill" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Marquee Announcement */}
      <div className={`${cardBg} px-4 py-2 flex items-center gap-2 overflow-hidden`}>
        <div className="w-6 h-6 rounded-full bg-[#0ECB81]/20 flex items-center justify-center flex-shrink-0">
          <Lightning size={14} className="text-[#0ECB81]" weight="fill" />
        </div>
        <div className="overflow-hidden flex-1">
          <p className={`text-sm ${text} whitespace-nowrap animate-marquee`}>
            Margin Trade Adds SRM, KEEP - Enjoy Double Rewards &nbsp;&nbsp;&nbsp; | &nbsp;&nbsp;&nbsp; New Trading Pairs Added &nbsp;&nbsp;&nbsp; | &nbsp;&nbsp;&nbsp; VIP Benefits Updated
          </p>
        </div>
        <CaretRight size={16} className={textMuted} />
      </div>

      {/* Price Ticker Carousel */}
      <div className={`${cardBg} px-4 py-3`}>
        <div className="flex items-center justify-between">
          {tickerPrices.map((coin, index) => {
            const change = coin.price_change_percentage_24h || 0;
            const isPositive = change >= 0;
            return (
              <div key={coin.coin_id || index} className="flex-1 text-center">
                <div className="flex items-center justify-center gap-1 mb-1">
                  <span className={`text-xs font-medium ${text}`}>{coin.symbol?.toUpperCase()}/USDT</span>
                  <span className={`text-xs ${isPositive ? green : red}`}>
                    {isPositive ? '+' : ''}{change.toFixed(2)}%
                  </span>
                </div>
                <p className={`text-lg font-bold ${text}`}>
                  {coin.current_price?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: coin.current_price > 100 ? 1 : 2 })}
                </p>
                <p className={`text-xs ${textMuted}`}>
                  ${coin.current_price?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
              </div>
            );
          })}
        </div>
        {/* Dots Indicator */}
        <div className="flex justify-center gap-1 mt-2">
          {[0, 1, 2].map(i => (
            <div key={i} className={`w-1.5 h-1.5 rounded-full transition-all ${activePriceIndex === i ? 'bg-[#0ECB81] w-4' : isDark ? 'bg-[#2B3139]' : 'bg-gray-300'}`}></div>
          ))}
        </div>
      </div>

      {/* Buy Crypto Banner */}
      <div className="px-4 py-2">
        <div className={`${isDark ? 'bg-[#2B3139]' : 'bg-gray-100'} rounded-xl p-4 flex items-center justify-between`}>
          <div>
            <h3 className={`font-bold ${text}`}>Buy Crypto</h3>
            <p className={`text-xs ${textMuted}`}>Min. 0 trading fee, support BTC, USDT and ETH</p>
          </div>
          <div className="w-12 h-12 bg-[#F0B90B]/20 rounded-full flex items-center justify-center">
            <HandCoins size={28} className="text-[#F0B90B]" />
          </div>
        </div>
      </div>

      {/* Feature Icons Grid - 2 Rows */}
      <div className={`${cardBg} px-4 py-4`}>
        <div className="grid grid-cols-5 gap-y-4">
          {featureIcons.map((item, index) => (
            <Link key={index} to={item.path} className="flex flex-col items-center gap-1.5 group relative">
              <div className={`w-12 h-12 rounded-xl ${isDark ? 'bg-[#2B3139]' : 'bg-gray-100'} flex items-center justify-center transition-all duration-300 group-hover:scale-110 group-active:scale-95 relative`}>
                <item.icon size={26} style={{ color: item.color }} weight="duotone" />
                {item.badge && (
                  <span className={`absolute -top-1 -right-1 px-1.5 py-0.5 text-[8px] font-bold rounded ${
                    item.badge === 'HOT' ? 'bg-[#F6465D] text-white' : 
                    item.badge === 'NEW' ? 'bg-[#0ECB81] text-white' :
                    'bg-[#F0B90B] text-black'
                  }`}>
                    {item.badge}
                  </span>
                )}
              </div>
              <span className={`text-[11px] ${textMuted} text-center leading-tight`}>{item.label}</span>
            </Link>
          ))}
        </div>
      </div>

      {/* New Users Only Section */}
      <div className="px-4 py-3">
        <div className={`${cardBg} rounded-2xl overflow-hidden`}>
          {/* Header Banner */}
          <div className="bg-[#0ECB81] py-2 px-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkle size={16} className="text-white" weight="fill" />
              <span className="text-white font-bold text-sm">New Users Only</span>
            </div>
            <button className="text-white/80 hover:text-white">
              <X size={16} />
            </button>
          </div>
          
          {/* Steps */}
          <div className="px-4 py-3">
            <div className="flex items-center justify-between mb-4">
              {['Sign Up', 'Deposit/Buy Crypto', 'Trade', 'Pro Trading'].map((step, i) => (
                <div key={i} className="flex flex-col items-center">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold mb-1 ${
                    i === 0 ? 'bg-[#0ECB81] text-white' : `${isDark ? 'bg-[#2B3139]' : 'bg-gray-100'} ${textMuted}`
                  }`}>
                    {i + 1}
                  </div>
                  <span className={`text-[10px] ${i === 0 ? green : textMuted} text-center`}>{step}</span>
                </div>
              ))}
            </div>
            
            {/* Reward Card */}
            <div className={`${isDark ? 'bg-[#0ECB81]/10' : 'bg-[#e8f5e9]'} rounded-xl p-4`}>
              <div className="flex items-center justify-between">
                <div>
                  <h3 className={`font-bold text-lg ${green}`}>Sign Up</h3>
                  <p className={`text-sm ${text}`}>You have a token reward worth</p>
                  <p className={`text-sm ${text}`}>up to <span className="font-bold text-[#F0B90B]">3,200 USDT</span> to claim!</p>
                </div>
                <div className="w-16 h-16 bg-[#0ECB81]/20 rounded-xl flex items-center justify-center">
                  <Gift size={36} className="text-[#0ECB81]" weight="duotone" />
                </div>
              </div>
              <div className="flex items-center gap-3 mt-4">
                <Link to="/register" className="flex-1">
                  <Button className="w-full bg-[#0ECB81] hover:bg-[#0ECB81]/90 text-white font-semibold py-2.5 rounded-xl">
                    Sign Up <CaretRight size={16} />
                  </Button>
                </Link>
                <Link to="/profile" className={`text-sm ${green} font-medium`}>
                  Rewards Hub &gt;
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* GemBox & Promotions */}
      <div className="px-4 py-2">
        <div className="flex gap-3">
          <div className={`flex-1 ${cardBg} rounded-xl p-3`}>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg bg-[#9B59B6]/20 flex items-center justify-center">
                <Crown size={18} className="text-[#9B59B6]" weight="fill" />
              </div>
              <span className={`font-bold ${text}`}>GemBox</span>
            </div>
            <p className={`text-xs ${textMuted}`}>Discover new gems</p>
          </div>
          <div className={`flex-1 ${cardBg} rounded-xl p-3`}>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg bg-[#F0B90B]/20 flex items-center justify-center">
                <Star size={18} className="text-[#F0B90B]" weight="fill" />
              </div>
              <div className="flex">
                {[1,2,3,4,5].map(i => (
                  <Star key={i} size={10} className="text-[#F0B90B]" weight="fill" />
                ))}
              </div>
            </div>
            <p className={`text-xs ${textMuted}`}>4.8 App Rating</p>
          </div>
        </div>
      </div>

      {/* Market Section Header */}
      <div className={`${cardBg} px-4 pt-4 pb-2 mt-2`}>
        <div className="flex items-center justify-between mb-3">
          <h2 className={`font-bold text-lg ${text}`}>Markets</h2>
          <Link to="/markets" className={`text-sm ${green} font-medium flex items-center gap-1`}>
            See All <CaretRight size={14} />
          </Link>
        </div>
        
        {/* Market Tabs */}
        <div className="flex gap-4 border-b ${border}">
          {[
            { id: 'favorites', label: 'Favorites', icon: Star },
            { id: 'hot', label: 'Hot', icon: Fire }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1 pb-2 text-sm font-medium border-b-2 transition-all ${
                activeTab === tab.id 
                  ? `${text} border-[#0ECB81]` 
                  : `${textMuted} border-transparent`
              }`}
            >
              <tab.icon size={14} weight={activeTab === tab.id ? "fill" : "regular"} />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Coin List */}
      <div className={`${cardBg} px-4 pb-4`}>
        {prices.slice(0, 5).map((coin, index) => {
          const change = coin.price_change_percentage_24h || 0;
          const isPositive = change >= 0;
          
          return (
            <Link
              key={coin.coin_id || index}
              to={`/trade?symbol=${coin.symbol || 'BTC'}`}
              className={`flex items-center py-3 ${index !== 4 ? `border-b ${border}` : ''}`}
            >
              <div className="flex items-center gap-3 flex-1">
                <div className="w-10 h-10 rounded-full overflow-hidden bg-white/10 flex items-center justify-center">
                  {coin.image ? (
                    <img src={coin.image} alt={coin.symbol} className="w-8 h-8 object-contain" />
                  ) : (
                    <span className="text-[#0ECB81] font-bold">{coin.symbol?.charAt(0)}</span>
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className={`font-semibold ${text}`}>{coin.symbol?.toUpperCase()}</span>
                    <span className={`text-xs ${textMuted}`}>/USDT</span>
                  </div>
                  <span className={`text-xs ${textMuted}`}>Vol {(coin.total_volume / 1e6).toFixed(1)}M</span>
                </div>
              </div>
              
              <div className="text-right mr-4">
                <p className={`font-semibold ${text}`}>
                  {coin.current_price?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
                <p className={`text-xs ${textMuted}`}>
                  ${coin.current_price?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
              </div>
              
              <div className={`px-3 py-1.5 rounded-lg text-sm font-semibold ${
                isPositive ? 'bg-[#0ECB81] text-white' : 'bg-[#F6465D] text-white'
              }`}>
                {isPositive ? '+' : ''}{change.toFixed(2)}%
              </div>
            </Link>
          );
        })}
      </div>

      {/* Bottom Navigation */}
      <BottomNav />

      {/* Custom Marquee Animation Style */}
      <style>{`
        @keyframes marquee {
          0% { transform: translateX(0%); }
          100% { transform: translateX(-50%); }
        }
        .animate-marquee {
          animation: marquee 20s linear infinite;
        }
      `}</style>
    </div>
  );
};

export default KuCoinHomePage;
