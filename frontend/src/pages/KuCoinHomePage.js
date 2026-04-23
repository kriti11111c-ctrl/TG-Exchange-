import { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth, API, useTheme } from "../App";
import axios from "axios";
import useWebSocket from "../hooks/useWebSocket";
import { toast } from "sonner";
import TelegramPopup from "../components/TelegramPopup";
import { 
  TrendUp,
  TrendDown,
  Sun,
  Moon,
  Star,
  Fire,
  User,
  Users,
  Robot,
  Eye,
  EyeSlash,
  CaretRight,
  Trophy,
  Bell,
  Gift,
  Coin,
  Rocket,
  PiggyBank,
  ChartPie,
  Medal,
  Crown,
  ArrowDown,
  Wallet,
  ShieldCheck,
  CurrencyBtc,
  CurrencyEth,
  Lightning,
  Copy,
  QrCode,
  ArrowUp
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
  const [showBalance, setShowBalance] = useState(true);
  const [activeSlide, setActiveSlide] = useState(0);
  const [tradeCodes, setTradeCodes] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [countdowns, setCountdowns] = useState({});
  const notificationRef = useRef(null);
  
  const { prices: wsPrices, isConnected } = useWebSocket(true);

  // CLEAN THEME COLORS - High Contrast for Clarity
  const colors = {
    bg: isDark ? '#0D0D0D' : '#FFFFFF',
    card: isDark ? '#1A1A1A' : '#FFFFFF',
    cardHover: isDark ? '#222222' : '#F0F1F3',
    text: isDark ? '#FFFFFF' : '#1A1A1A',
    textSecondary: isDark ? '#888888' : '#666666',
    border: isDark ? '#333333' : '#E0E0E0',
    green: '#00C853',
    red: '#FF3B30',
    gold: '#FFD700',
    purple: '#8B5CF6',
    blue: '#3B82F6',
    orange: '#F97316'
  };
  
  // Card style with border
  const cardStyle = {
    backgroundColor: colors.card,
    border: `1.5px solid ${colors.border}`,
    borderRadius: '16px'
  };

  // Fetch data
  const fetchTradeCodes = async () => {
    try {
      const res = await axios.get(`${API}/user/trade-codes`, { withCredentials: true });
      setTradeCodes(res.data.codes || []);
    } catch (error) {
      console.error("Error fetching trade codes:", error);
    }
  };

  // Format countdown time
  const formatCountdown = (seconds) => {
    if (!seconds || seconds <= 0) return "00:00";
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Copy code to clipboard
  const copyCode = async (code) => {
    try {
      await navigator.clipboard.writeText(code);
      toast.success("Code copied!");
    } catch (err) {
      toast.error("Copy failed");
    }
  };

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveSlide(prev => (prev + 1) % 3);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

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
      if (!isConnected) fetchData();
      fetchTradeCodes();
    }, 60000);
    return () => clearInterval(interval);
  }, [isConnected]);

  useEffect(() => {
    if (wsPrices && Object.keys(wsPrices).length > 0) {
      setPrices(prev => prev.map(coin => {
        const wsData = wsPrices[coin.symbol?.toLowerCase()];
        if (wsData) return { ...coin, current_price: wsData.price, price_change_percentage_24h: wsData.change24h };
        return coin;
      }));
    }
  }, [wsPrices]);

  // Feature icons - CLEAN design
  const featureIcons = [
    { icon: ArrowDown, label: "Deposit", path: "/deposit", bg: "#E8F5E9", iconColor: "#00C853" },
    { icon: Users, label: "Referral", path: "/referral", bg: "#FFF3E0", iconColor: "#F97316", badge: "HOT" },
    { icon: Robot, label: "Trade Bot", path: "/trade", bg: "#FCE4EC", iconColor: "#E91E63", badge: "NEW" },
    { icon: Trophy, label: "VIP Rank", path: "/rank", bg: "#F3E5F5", iconColor: "#8B5CF6" },
    { icon: Gift, label: "Rewards", path: "/profile", bg: "#E3F2FD", iconColor: "#2196F3" },
    { icon: Coin, label: "P2P", path: "/wallet", bg: "#E8F5E9", iconColor: "#4CAF50" },
    { icon: PiggyBank, label: "Staking", path: "/staking", bg: "#FFF8E1", iconColor: "#FFC107" },
    { icon: Rocket, label: "Launchpad", path: "/trade", bg: "#FFEBEE", iconColor: "#F44336" },
    { icon: Medal, label: "Rewards Hub", path: "/profile", bg: "#E0F2F1", iconColor: "#009688" },
    { icon: ChartPie, label: "Wealth", path: "/wallet", bg: "#EDE7F6", iconColor: "#673AB7" },
  ];

  const calculatePortfolioValue = () => {
    if (!wallet || !prices.length) return 0;
    let total = wallet.balances?.usdt || 0;
    const coinMap = { btc: 'bitcoin', eth: 'ethereum', bnb: 'binancecoin', xrp: 'ripple', sol: 'solana' };
    Object.entries(wallet.balances || {}).forEach(([coin, amount]) => {
      if (coin === 'usdt') return;
      const coinId = coinMap[coin];
      const priceData = prices.find(p => p.coin_id === coinId);
      if (priceData && amount > 0) total += amount * priceData.current_price;
    });
    return total;
  };

  const getTickerPrices = () => {
    return prices.filter(c => ['bitcoin', 'ethereum', 'binancecoin', 'solana', 'ripple'].includes(c.coin_id)).slice(0, 3);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{backgroundColor: colors.bg}}>
        <div className="w-12 h-12 border-4 border-t-transparent rounded-full animate-spin" style={{borderColor: colors.green, borderTopColor: 'transparent'}}></div>
      </div>
    );
  }

  const portfolioValue = calculatePortfolioValue();
  const tickerPrices = getTickerPrices();
  const activeOrScheduledCodes = tradeCodes.filter(c => (c.is_live || (c.countdown_to_live > 0 && c.status !== "used")));

  return (
    <div className="min-h-screen pb-24" style={{backgroundColor: colors.bg}}>
      <TelegramPopup />
      
      {/* CLEAN HEADER */}
      <header className="sticky top-0 z-40 px-4 py-3" style={{backgroundColor: colors.bg, borderBottom: `1px solid ${colors.border}`}}>
        <div className="flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{backgroundColor: colors.green}}>
              <span className="text-white font-black text-lg">TG</span>
            </div>
            <div>
              <h1 className="font-bold text-lg" style={{color: colors.text}}>TG Exchange</h1>
              <p className="text-xs" style={{color: colors.textSecondary}}>Trade Genius</p>
            </div>
          </div>
          
          {/* Actions */}
          <div className="flex items-center gap-2">
            <button onClick={toggleTheme} className="w-10 h-10 rounded-xl flex items-center justify-center" style={{backgroundColor: colors.card}}>
              {isDark ? <Sun size={20} color="#FFD700" weight="fill" /> : <Moon size={20} color="#8B5CF6" weight="fill" />}
            </button>
            
            <div className="relative" ref={notificationRef}>
              <button onClick={() => setShowNotifications(!showNotifications)} className="w-10 h-10 rounded-xl flex items-center justify-center relative" style={{backgroundColor: colors.card, border: `1.5px solid ${colors.border}`}}>
                <Bell size={20} color={colors.text} weight="fill" />
                {activeOrScheduledCodes.length > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full text-[10px] text-white flex items-center justify-center font-bold" style={{backgroundColor: colors.red}}>
                    {activeOrScheduledCodes.length}
                  </span>
                )}
              </button>
              
              {/* Notification Dropdown */}
              {showNotifications && (
                <div className="absolute right-0 top-12 w-72 rounded-2xl shadow-2xl z-50 overflow-hidden" style={{backgroundColor: colors.card, border: `1.5px solid ${colors.border}`}}>
                  <div className="p-3 flex items-center justify-between" style={{borderBottom: `1px solid ${colors.border}`}}>
                    <span className="font-bold" style={{color: colors.text}}>Trade Codes</span>
                    <button onClick={() => setShowNotifications(false)}>
                      <span style={{color: colors.textSecondary}}>✕</span>
                    </button>
                  </div>
                  
                  <div className="max-h-80 overflow-y-auto">
                    {activeOrScheduledCodes.length === 0 ? (
                      <div className="p-4 text-center">
                        <p style={{color: colors.textSecondary}}>No active codes</p>
                      </div>
                    ) : (
                      activeOrScheduledCodes.map((code, idx) => (
                        <div key={idx} className="p-3" style={{borderBottom: `1px solid ${colors.border}`}}>
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-bold text-lg" style={{color: colors.green}}>{code.code}</span>
                            <button 
                              onClick={() => copyCode(code.code)}
                              className="px-3 py-1 rounded-lg text-xs font-bold text-white"
                              style={{backgroundColor: colors.green}}
                            >
                              COPY
                            </button>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-xs" style={{color: colors.textSecondary}}>
                              {code.is_live ? 'LIVE NOW' : `Starts in ${formatCountdown(code.countdown_to_live)}`}
                            </span>
                            {code.is_live && (
                              <span className="text-xs font-bold" style={{color: colors.gold}}>
                                {formatCountdown(countdowns[`${code.code}_remaining`] || code.time_remaining)}
                              </span>
                            )}
                          </div>
                          {code.reward && (
                            <p className="text-xs mt-1" style={{color: colors.gold}}>Reward: ${code.reward}</p>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                  
                  <Link to="/profile" className="block p-3 text-center font-semibold" style={{color: colors.green, borderTop: `1px solid ${colors.border}`}}>
                    View All Codes
                  </Link>
                </div>
              )}
            </div>
            
            <Link to="/profile">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{backgroundColor: colors.green}}>
                <User size={20} className="text-white" weight="fill" />
              </div>
            </Link>
          </div>
        </div>
      </header>

      {/* HERO BANNER - CLEAN & CLEAR */}
      <div className="px-4 py-4">
        <div className="relative h-44 rounded-2xl overflow-hidden" style={{backgroundColor: isDark ? '#1A2E1A' : '#E8F5E9'}}>
          {/* Slide Content */}
          <div className="absolute inset-0 p-5 flex flex-col justify-center">
            {activeSlide === 0 && (
              <>
                <span className="inline-block px-3 py-1 rounded-full text-xs font-bold w-fit mb-2" style={{backgroundColor: colors.green, color: 'white'}}>
                  WELCOME BONUS
                </span>
                <h2 className="text-2xl font-black mb-1" style={{color: colors.text}}>Deposit & Earn</h2>
                <p className="text-3xl font-black" style={{color: colors.gold}}>Up to 1M USDT!</p>
                <p className="text-sm mt-2" style={{color: colors.textSecondary}}>Start trading today</p>
              </>
            )}
            {activeSlide === 1 && (
              <>
                <span className="inline-block px-3 py-1 rounded-full text-xs font-bold w-fit mb-2" style={{backgroundColor: colors.purple, color: 'white'}}>
                  VIP PROGRAM
                </span>
                <h2 className="text-2xl font-black mb-1" style={{color: colors.text}}>Daily Salary</h2>
                <p className="text-3xl font-black" style={{color: colors.purple}}>Up to $500/Day</p>
                <p className="text-sm mt-2" style={{color: colors.textSecondary}}>Exclusive VIP benefits</p>
              </>
            )}
            {activeSlide === 2 && (
              <>
                <span className="inline-block px-3 py-1 rounded-full text-xs font-bold w-fit mb-2" style={{backgroundColor: colors.blue, color: 'white'}}>
                  REFERRAL
                </span>
                <h2 className="text-2xl font-black mb-1" style={{color: colors.text}}>Invite & Earn</h2>
                <p className="text-3xl font-black" style={{color: colors.blue}}>10-Level Commission</p>
                <p className="text-sm mt-2" style={{color: colors.textSecondary}}>Unlimited earnings</p>
              </>
            )}
          </div>
          
          {/* Icon */}
          <div className="absolute right-4 top-1/2 -translate-y-1/2">
            <div className="w-20 h-20 rounded-2xl flex items-center justify-center" style={{backgroundColor: activeSlide === 0 ? colors.green : activeSlide === 1 ? colors.purple : colors.blue}}>
              {activeSlide === 0 && <Coin size={40} className="text-white" weight="fill" />}
              {activeSlide === 1 && <Crown size={40} className="text-white" weight="fill" />}
              {activeSlide === 2 && <Users size={40} className="text-white" weight="fill" />}
            </div>
          </div>
          
          {/* Dots */}
          <div className="absolute bottom-3 left-5 flex gap-2">
            {[0, 1, 2].map(i => (
              <button key={i} onClick={() => setActiveSlide(i)} className="h-2 rounded-full transition-all" style={{
                width: activeSlide === i ? 24 : 8,
                backgroundColor: activeSlide === i ? colors.green : colors.textSecondary
              }} />
            ))}
          </div>
        </div>
      </div>

      {/* PRICE TICKER - CLEAN */}
      <div className="px-4 py-2">
        <div className="rounded-2xl p-4" style={{backgroundColor: colors.card, border: `1.5px solid ${colors.border}`}}>
          <div className="flex items-center justify-between">
            {tickerPrices.map((coin, index) => {
              const change = coin.price_change_percentage_24h || 0;
              const isPositive = change >= 0;
              return (
                <div key={coin.coin_id || index} className="flex-1 text-center">
                  <div className="flex items-center justify-center gap-1 mb-1">
                    <span className="text-xs font-bold" style={{color: colors.text}}>{coin.symbol?.toUpperCase()}</span>
                    <span className="text-xs font-medium" style={{color: colors.textSecondary}}>/USDT</span>
                  </div>
                  <p className="text-lg font-bold" style={{color: colors.text}}>
                    ${coin.current_price?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                  <span className="text-xs font-bold" style={{color: isPositive ? colors.green : colors.red}}>
                    {isPositive ? '+' : ''}{change.toFixed(2)}%
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* FEATURE ICONS - CRYSTAL CLEAR */}
      <div className="px-4 py-4">
        <div className="grid grid-cols-5 gap-3">
          {featureIcons.map((item, index) => (
            <Link key={index} to={item.path} className="flex flex-col items-center gap-2">
              <div className="relative">
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center transition-transform active:scale-95" style={{backgroundColor: isDark ? colors.card : item.bg, border: `1.5px solid ${colors.border}`}}>
                  <item.icon size={28} color={item.iconColor} weight="duotone" />
                </div>
                {item.badge && (
                  <span className="absolute -top-1 -right-1 px-1.5 py-0.5 text-[9px] font-bold rounded-md text-white" style={{
                    backgroundColor: item.badge === 'HOT' ? colors.red : colors.green
                  }}>
                    {item.badge}
                  </span>
                )}
              </div>
              <span className="text-[11px] font-medium text-center" style={{color: colors.textSecondary}}>{item.label}</span>
            </Link>
          ))}
        </div>
      </div>

      {/* QUICK ACTIONS - CLEAN CARDS */}
      <div className="px-4 py-2">
        <div className="grid grid-cols-3 gap-3">
          {/* Deposit */}
          <Link to="/deposit" className="rounded-2xl p-4 text-center transition-transform active:scale-95" style={{backgroundColor: colors.card, border: `1.5px solid ${colors.border}`}}>
            <div className="w-10 h-10 rounded-full mx-auto mb-2 flex items-center justify-center" style={{backgroundColor: '#E8F5E9'}}>
              <ArrowDown size={20} color={colors.green} weight="bold" />
            </div>
            <span className="text-sm font-semibold" style={{color: colors.text}}>Deposit</span>
          </Link>
          
          {/* Withdraw */}
          <Link to="/withdraw" className="rounded-2xl p-4 text-center transition-transform active:scale-95" style={{backgroundColor: colors.card, border: `1.5px solid ${colors.border}`}}>
            <div className="w-10 h-10 rounded-full mx-auto mb-2 flex items-center justify-center" style={{backgroundColor: '#FFF3E0'}}>
              <ArrowUp size={20} color={colors.orange} weight="bold" />
            </div>
            <span className="text-sm font-semibold" style={{color: colors.text}}>Withdraw</span>
          </Link>
          
          {/* Trade */}
          <Link to="/trade" className="rounded-2xl p-4 text-center transition-transform active:scale-95" style={{backgroundColor: colors.card, border: `1.5px solid ${colors.border}`}}>
            <div className="w-10 h-10 rounded-full mx-auto mb-2 flex items-center justify-center" style={{backgroundColor: '#E3F2FD'}}>
              <TrendUp size={20} color={colors.blue} weight="bold" />
            </div>
            <span className="text-sm font-semibold" style={{color: colors.text}}>Trade</span>
          </Link>
        </div>
      </div>

      {/* PORTFOLIO CARD */}
      <div className="px-4 py-2">
        <div className="rounded-2xl p-4" style={{backgroundColor: colors.card, border: `1.5px solid ${colors.border}`}}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Wallet size={20} color={colors.green} weight="fill" />
              <span className="font-semibold" style={{color: colors.text}}>Total Balance</span>
            </div>
            <button onClick={() => setShowBalance(!showBalance)}>
              {showBalance ? <Eye size={20} color={colors.textSecondary} /> : <EyeSlash size={20} color={colors.textSecondary} />}
            </button>
          </div>
          <p className="text-3xl font-black" style={{color: colors.text}}>
            {showBalance ? `$${portfolioValue.toFixed(2)}` : '••••••'}
          </p>
          <p className="text-sm mt-1" style={{color: colors.green}}>+0.00% today</p>
        </div>
      </div>

      {/* REWARDS BANNER */}
      <div className="px-4 py-2">
        <div className="rounded-2xl p-4 flex items-center justify-between" style={{backgroundColor: isDark ? '#2D2A1A' : '#FFFBEB', border: `1.5px solid ${isDark ? '#4A4520' : '#FFE082'}`}}>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{backgroundColor: colors.gold}}>
              <Gift size={24} className="text-white" weight="fill" />
            </div>
            <div>
              <p className="font-bold" style={{color: colors.text}}>Claim Your Rewards</p>
              <p className="text-2xl font-black" style={{color: colors.gold}}>3,200 USDT</p>
            </div>
          </div>
          <CaretRight size={24} color={colors.textSecondary} />
        </div>
      </div>

      {/* MARKETS SECTION */}
      <div className="px-4 py-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold" style={{color: colors.text}}>Markets</h2>
          <Link to="/markets" className="text-sm font-medium flex items-center gap-1" style={{color: colors.green}}>
            See All <CaretRight size={14} />
          </Link>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-4">
          {[
            { id: 'hot', label: 'Hot', icon: Fire },
            { id: 'gainers', label: 'Gainers', icon: TrendUp },
            { id: 'losers', label: 'Losers', icon: TrendDown }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold transition-all"
              style={{
                backgroundColor: activeTab === tab.id ? colors.green : colors.card,
                color: activeTab === tab.id ? 'white' : colors.textSecondary
              }}
            >
              <tab.icon size={14} weight={activeTab === tab.id ? "fill" : "regular"} />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Coin List */}
        <div className="space-y-2">
          {prices.slice(0, 5).map((coin, index) => {
            const change = coin.price_change_percentage_24h || 0;
            const isPositive = change >= 0;
            
            return (
              <Link
                key={coin.coin_id || index}
                to={`/trade?symbol=${coin.symbol || 'BTC'}`}
                className="flex items-center gap-3 p-3 rounded-2xl transition-all"
                style={{backgroundColor: colors.card, border: `1.5px solid ${colors.border}`}}
              >
                {/* Coin Icon */}
                <div className="w-11 h-11 rounded-full overflow-hidden flex items-center justify-center" style={{backgroundColor: isDark ? '#2A2A2A' : '#F0F0F0'}}>
                  {coin.image ? (
                    <img src={coin.image} alt={coin.symbol} className="w-7 h-7 object-contain" />
                  ) : (
                    <span className="font-bold" style={{color: colors.green}}>{coin.symbol?.charAt(0)}</span>
                  )}
                </div>
                
                {/* Info */}
                <div className="flex-1">
                  <div className="flex items-center gap-1">
                    <span className="font-bold" style={{color: colors.text}}>{coin.symbol?.toUpperCase()}</span>
                    <span className="text-xs" style={{color: colors.textSecondary}}>/USDT</span>
                  </div>
                  <span className="text-xs" style={{color: colors.textSecondary}}>Vol {(coin.total_volume / 1e6).toFixed(1)}M</span>
                </div>
                
                {/* Price */}
                <div className="text-right mr-2">
                  <p className="font-bold" style={{color: colors.text}}>
                    ${coin.current_price?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                </div>
                
                {/* Change */}
                <div className="px-3 py-1.5 rounded-lg text-sm font-bold text-white min-w-[70px] text-center" style={{
                  backgroundColor: isPositive ? colors.green : colors.red
                }}>
                  {isPositive ? '+' : ''}{change.toFixed(2)}%
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      {/* SECURITY */}
      <div className="px-4 py-2 mb-4">
        <div className="rounded-2xl p-4 flex items-center gap-3" style={{backgroundColor: colors.card, border: `1.5px solid ${colors.border}`}}>
          <div className="w-11 h-11 rounded-xl flex items-center justify-center" style={{backgroundColor: '#E8F5E9'}}>
            <ShieldCheck size={22} color={colors.green} weight="fill" />
          </div>
          <div className="flex-1">
            <p className="font-bold" style={{color: colors.text}}>Bank-Grade Security</p>
            <p className="text-xs" style={{color: colors.textSecondary}}>Your assets are protected 24/7</p>
          </div>
        </div>
      </div>

      <BottomNav />
    </div>
  );
};

export default KuCoinHomePage;
