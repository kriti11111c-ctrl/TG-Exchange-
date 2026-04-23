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
  Confetti,
  DiamondsFour,
  CurrencyBtc,
  CurrencyEth,
  Cube,
  Globe,
  ShieldCheck
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
  const [activePriceIndex, setActivePriceIndex] = useState(0);
  const [activeSlide, setActiveSlide] = useState(0);
  
  // Trade Codes State
  const [tradeCodes, setTradeCodes] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [countdowns, setCountdowns] = useState({});
  const notificationRef = useRef(null);
  
  // WebSocket for real-time prices
  const { prices: wsPrices, isConnected } = useWebSocket(true);

  // Theme colors with glassmorphism
  const bg = isDark ? 'bg-[#0a0a0f]' : 'bg-[#f0f2f5]';
  const cardBg = isDark ? 'bg-[#12121a]/80 backdrop-blur-xl' : 'bg-white/80 backdrop-blur-xl';
  const glassBg = isDark ? 'bg-white/5 backdrop-blur-xl' : 'bg-white/70 backdrop-blur-xl';
  const text = isDark ? 'text-white' : 'text-gray-900';
  const textMuted = isDark ? 'text-gray-400' : 'text-gray-500';
  const border = isDark ? 'border-white/10' : 'border-gray-200';
  const green = 'text-[#00DC82]';
  const red = 'text-[#FF4757]';

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
      toast.error("Copy failed");
    }
  };

  // Format countdown time
  const formatCountdown = (seconds) => {
    if (seconds <= 0) return "00:00";
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
          if (code.is_live && code.time_remaining > 0) {
            const key = `${code.code}_remaining`;
            const currentRemaining = prev[key] !== undefined ? prev[key] : code.time_remaining;
            updated[key] = Math.max(0, currentRemaining - 1);
          }
        });
        return updated;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [tradeCodes]);

  // Banner auto-scroll
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveSlide(prev => (prev + 1) % 3);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  // Close notification dropdown
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

  // Update prices from WebSocket
  useEffect(() => {
    if (wsPrices && Object.keys(wsPrices).length > 0) {
      setPrices(prev => prev.map(coin => {
        const wsData = wsPrices[coin.symbol?.toLowerCase()];
        if (wsData) {
          return { ...coin, current_price: wsData.price, price_change_percentage_24h: wsData.change24h };
        }
        return coin;
      }));
    }
  }, [wsPrices]);

  // Feature icons with 3D style
  const featureIcons = [
    { icon: ArrowDown, label: "Deposit", path: "/deposit", gradient: "from-[#00DC82] to-[#00B36B]", badge: null },
    { icon: Users, label: "Referral", path: "/referral", gradient: "from-[#FFD700] to-[#FFA500]", badge: "HOT" },
    { icon: Robot, label: "Trading Bot", path: "/trade", gradient: "from-[#FF6B6B] to-[#EE5A5A]", badge: "NEW" },
    { icon: Trophy, label: "VIP Rank", path: "/rank", gradient: "from-[#A855F7] to-[#7C3AED]", badge: null },
    { icon: Gift, label: "Rewards", path: "/profile", gradient: "from-[#00D4FF] to-[#0099CC]", badge: "WIN" },
    { icon: Coin, label: "P2P", path: "/wallet", gradient: "from-[#3B82F6] to-[#2563EB]", badge: null },
    { icon: PiggyBank, label: "Earn", path: "/staking", gradient: "from-[#10B981] to-[#059669]", badge: null },
    { icon: Rocket, label: "Launchpad", path: "/trade", gradient: "from-[#F59E0B] to-[#D97706]", badge: null },
    { icon: Medal, label: "Rewards Hub", path: "/profile", gradient: "from-[#14B8A6] to-[#0D9488]", badge: null },
    { icon: ChartPie, label: "Wealth", path: "/wallet", gradient: "from-[#8B5CF6] to-[#6D28D9]", badge: null },
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
      if (priceData && amount > 0) total += amount * priceData.current_price;
    });
    return total;
  };

  // Get top prices for ticker
  const getTickerPrices = () => {
    return prices.filter(c => ['bitcoin', 'ethereum', 'binancecoin', 'solana', 'ripple'].includes(c.coin_id)).slice(0, 3);
  };

  if (loading) {
    return (
      <div className={`min-h-screen ${bg} flex items-center justify-center`}>
        <div className="relative">
          <div className="w-20 h-20 rounded-full border-4 border-[#00DC82]/20 border-t-[#00DC82] animate-spin"></div>
          <div className="absolute inset-0 w-20 h-20 rounded-full border-4 border-transparent border-r-[#FFD700]/50 animate-spin" style={{animationDirection: 'reverse', animationDuration: '1.5s'}}></div>
        </div>
      </div>
    );
  }

  const portfolioValue = calculatePortfolioValue();
  const tickerPrices = getTickerPrices();
  const activeOrScheduledCodes = tradeCodes.filter(c => (c.is_live || (c.countdown_to_live > 0 && c.status !== "used")));

  return (
    <div className={`min-h-screen ${bg} pb-24 overflow-x-hidden`}>
      <TelegramPopup />
      
      {/* Animated Background Orbs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 -left-20 w-72 h-72 bg-[#00DC82]/20 rounded-full blur-[100px] animate-pulse"></div>
        <div className="absolute top-1/2 -right-20 w-80 h-80 bg-[#A855F7]/20 rounded-full blur-[100px] animate-pulse" style={{animationDelay: '1s'}}></div>
        <div className="absolute bottom-20 left-1/4 w-60 h-60 bg-[#FFD700]/10 rounded-full blur-[100px] animate-pulse" style={{animationDelay: '2s'}}></div>
      </div>

      {/* 3D Header */}
      <div className={`${glassBg} border-b ${border} px-4 py-3 sticky top-0 z-40`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* 3D Logo */}
            <div className="relative group">
              <div className="absolute inset-0 bg-gradient-to-r from-[#00DC82] to-[#FFD700] rounded-xl blur-md opacity-60 group-hover:opacity-100 transition-opacity"></div>
              <div className="relative w-10 h-10 rounded-xl bg-gradient-to-br from-[#00DC82] to-[#00B36B] flex items-center justify-center shadow-lg transform hover:scale-105 transition-transform">
                <span className="text-white font-black text-lg">TG</span>
              </div>
            </div>
            <div>
              <h1 className={`font-bold text-lg ${text}`}>TG Exchange</h1>
              <p className={`text-[10px] ${textMuted}`}>Trade Genius</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {/* 3D Theme Toggle */}
            <button
              onClick={toggleTheme}
              className={`relative p-2.5 rounded-xl ${isDark ? 'bg-white/10' : 'bg-gray-100'} hover:scale-105 active:scale-95 transition-all shadow-lg`}
              style={{
                boxShadow: isDark ? '0 4px 15px rgba(0,220,130,0.2)' : '0 4px 15px rgba(0,0,0,0.1)'
              }}
            >
              {isDark ? <Sun size={18} className="text-[#FFD700]" weight="fill" /> : <Moon size={18} className="text-[#A855F7]" weight="fill" />}
            </button>
            
            {/* 3D Bell */}
            <div className="relative" ref={notificationRef}>
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className={`relative p-2.5 rounded-xl ${isDark ? 'bg-white/10' : 'bg-gray-100'} hover:scale-105 active:scale-95 transition-all shadow-lg`}
              >
                <Bell size={18} className={text} weight="fill" />
                {activeOrScheduledCodes.length > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-gradient-to-r from-[#FF6B6B] to-[#EE5A5A] rounded-full text-[10px] text-white flex items-center justify-center font-bold animate-bounce shadow-lg">
                    {activeOrScheduledCodes.length}
                  </span>
                )}
              </button>
            </div>
            
            {/* 3D Profile */}
            <Link to="/profile">
              <div className="relative group">
                <div className="absolute inset-0 bg-gradient-to-r from-[#00DC82] to-[#00B36B] rounded-xl blur opacity-60 group-hover:opacity-100 transition-opacity"></div>
                <div className="relative w-10 h-10 rounded-xl bg-gradient-to-br from-[#00DC82] to-[#00B36B] flex items-center justify-center shadow-lg transform hover:scale-105 transition-transform">
                  <User size={18} className="text-white" weight="fill" />
                </div>
              </div>
            </Link>
          </div>
        </div>
      </div>

      {/* 3D Hero Banner Carousel */}
      <div className="px-4 py-4">
        <div className="relative h-48 rounded-3xl overflow-hidden shadow-2xl" style={{
          boxShadow: isDark ? '0 25px 50px -12px rgba(0,220,130,0.25)' : '0 25px 50px -12px rgba(0,0,0,0.25)'
        }}>
          {/* Slide 1 - Million USDT */}
          <div className={`absolute inset-0 transition-all duration-700 ${activeSlide === 0 ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-full'}`}>
            <div className="absolute inset-0 bg-gradient-to-br from-[#0a2e1f] via-[#0d3d2a] to-[#041f14]">
              <div className="absolute inset-0 opacity-30" style={{
                backgroundImage: 'radial-gradient(circle at 30% 50%, #00DC82 0%, transparent 50%)',
              }}></div>
              {/* Floating Coins */}
              <div className="absolute top-8 right-8 animate-float">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#FFD700] to-[#FFA500] flex items-center justify-center shadow-2xl" style={{boxShadow: '0 10px 40px rgba(255,215,0,0.4)'}}>
                  <CurrencyBtc size={32} className="text-white" weight="fill" />
                </div>
              </div>
              <div className="absolute bottom-12 right-20 animate-float" style={{animationDelay: '0.5s'}}>
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#627EEA] to-[#4A5FC1] flex items-center justify-center shadow-xl">
                  <CurrencyEth size={24} className="text-white" weight="fill" />
                </div>
              </div>
            </div>
            <div className="relative p-6 h-full flex flex-col justify-center">
              <span className="inline-block px-3 py-1 rounded-full bg-[#00DC82]/20 text-[#00DC82] text-xs font-bold mb-2 w-fit">TG EXCHANGE</span>
              <h2 className="text-white text-xl font-bold mb-1">Deposit & Transfer Assets</h2>
              <p className="text-[#FFD700] text-3xl font-black">Win Up To</p>
              <p className="text-[#00DC82] text-4xl font-black">1 MILLION USDT!</p>
            </div>
          </div>

          {/* Slide 2 - VIP */}
          <div className={`absolute inset-0 transition-all duration-700 ${activeSlide === 1 ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-full'}`}>
            <div className="absolute inset-0 bg-gradient-to-br from-[#2d1f4e] via-[#3d2a6b] to-[#1a1132]">
              <div className="absolute inset-0 opacity-30" style={{
                backgroundImage: 'radial-gradient(circle at 70% 50%, #A855F7 0%, transparent 50%)',
              }}></div>
              <div className="absolute top-6 right-6 animate-float">
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[#FFD700] to-[#FFA500] flex items-center justify-center shadow-2xl transform rotate-12" style={{boxShadow: '0 10px 40px rgba(255,215,0,0.4)'}}>
                  <Crown size={40} className="text-white" weight="fill" />
                </div>
              </div>
            </div>
            <div className="relative p-6 h-full flex flex-col justify-center">
              <span className="inline-block px-3 py-1 rounded-full bg-[#A855F7]/20 text-[#A855F7] text-xs font-bold mb-2 w-fit">VIP PROGRAM</span>
              <h2 className="text-white text-xl font-bold mb-1">Exclusive VIP Benefits</h2>
              <p className="text-[#FFD700] text-2xl font-black">Earn Daily Salary</p>
              <p className="text-[#A855F7] text-3xl font-black">Up to $500/Day!</p>
            </div>
          </div>

          {/* Slide 3 - Referral */}
          <div className={`absolute inset-0 transition-all duration-700 ${activeSlide === 2 ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-full'}`}>
            <div className="absolute inset-0 bg-gradient-to-br from-[#1f3d4e] via-[#2a5268] to-[#112232]">
              <div className="absolute inset-0 opacity-30" style={{
                backgroundImage: 'radial-gradient(circle at 30% 70%, #00D4FF 0%, transparent 50%)',
              }}></div>
              <div className="absolute top-4 right-4 animate-float">
                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-[#00D4FF] to-[#0099CC] flex items-center justify-center shadow-2xl" style={{boxShadow: '0 10px 40px rgba(0,212,255,0.4)'}}>
                  <Users size={48} className="text-white" weight="fill" />
                </div>
              </div>
            </div>
            <div className="relative p-6 h-full flex flex-col justify-center">
              <span className="inline-block px-3 py-1 rounded-full bg-[#00D4FF]/20 text-[#00D4FF] text-xs font-bold mb-2 w-fit">REFERRAL</span>
              <h2 className="text-white text-xl font-bold mb-1">Invite Friends & Earn</h2>
              <p className="text-[#FFD700] text-2xl font-black">10-Level Commission</p>
              <p className="text-[#00D4FF] text-3xl font-black">Unlimited Earnings!</p>
            </div>
          </div>

          {/* Dots */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
            {[0, 1, 2].map(i => (
              <button
                key={i}
                onClick={() => setActiveSlide(i)}
                className={`h-2 rounded-full transition-all ${activeSlide === i ? 'w-6 bg-[#00DC82]' : 'w-2 bg-white/30'}`}
              />
            ))}
          </div>
        </div>
      </div>

      {/* 3D Price Ticker */}
      <div className={`mx-4 rounded-2xl ${glassBg} border ${border} p-4 shadow-xl`} style={{
        boxShadow: isDark ? '0 10px 40px rgba(0,0,0,0.3)' : '0 10px 40px rgba(0,0,0,0.1)'
      }}>
        <div className="flex items-center justify-between">
          {tickerPrices.map((coin, index) => {
            const change = coin.price_change_percentage_24h || 0;
            const isPositive = change >= 0;
            return (
              <div key={coin.coin_id || index} className="flex-1 text-center group cursor-pointer">
                <div className="flex items-center justify-center gap-1 mb-1">
                  <span className={`text-xs font-semibold ${text} group-hover:text-[#00DC82] transition-colors`}>
                    {coin.symbol?.toUpperCase()}/USDT
                  </span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded ${isPositive ? 'bg-[#00DC82]/20 text-[#00DC82]' : 'bg-[#FF4757]/20 text-[#FF4757]'}`}>
                    {isPositive ? '+' : ''}{change.toFixed(2)}%
                  </span>
                </div>
                <p className={`text-lg font-bold ${text}`}>
                  ${coin.current_price?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: coin.current_price > 100 ? 1 : 2 })}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* 3D Feature Icons Grid */}
      <div className="px-4 py-6">
        <div className="grid grid-cols-5 gap-3">
          {featureIcons.map((item, index) => (
            <Link key={index} to={item.path} className="group">
              <div className="flex flex-col items-center gap-2">
                {/* 3D Icon Box */}
                <div className="relative">
                  {/* Glow Effect */}
                  <div className={`absolute inset-0 bg-gradient-to-r ${item.gradient} rounded-2xl blur-lg opacity-0 group-hover:opacity-60 transition-opacity`}></div>
                  
                  {/* Icon Container */}
                  <div 
                    className={`relative w-14 h-14 rounded-2xl bg-gradient-to-br ${item.gradient} flex items-center justify-center shadow-lg transform group-hover:scale-110 group-hover:-translate-y-1 group-active:scale-95 transition-all duration-300`}
                    style={{
                      boxShadow: `0 8px 25px -5px rgba(0,0,0,0.3)`
                    }}
                  >
                    <item.icon size={26} className="text-white" weight="duotone" />
                    
                    {/* Badge */}
                    {item.badge && (
                      <span className={`absolute -top-1.5 -right-1.5 px-1.5 py-0.5 text-[8px] font-black rounded-md shadow-lg ${
                        item.badge === 'HOT' ? 'bg-gradient-to-r from-[#FF6B6B] to-[#EE5A5A]' : 
                        item.badge === 'NEW' ? 'bg-gradient-to-r from-[#00DC82] to-[#00B36B]' :
                        'bg-gradient-to-r from-[#FFD700] to-[#FFA500]'
                      } text-white`}>
                        {item.badge}
                      </span>
                    )}
                  </div>
                </div>
                
                <span className={`text-[11px] font-medium ${textMuted} group-hover:text-[#00DC82] transition-colors text-center`}>
                  {item.label}
                </span>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* 3D Quick Stats Cards */}
      <div className="px-4 grid grid-cols-2 gap-3">
        {/* Portfolio Card */}
        <div className={`${glassBg} rounded-2xl p-4 border ${border} relative overflow-hidden group hover:scale-[1.02] transition-transform`}
          style={{boxShadow: isDark ? '0 10px 40px rgba(0,220,130,0.1)' : '0 10px 40px rgba(0,0,0,0.1)'}}>
          <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-[#00DC82]/20 to-transparent rounded-full blur-2xl"></div>
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#00DC82] to-[#00B36B] flex items-center justify-center">
              <Wallet size={16} className="text-white" weight="fill" />
            </div>
            <span className={`text-xs ${textMuted}`}>Portfolio</span>
          </div>
          <p className={`text-xl font-bold ${text}`}>
            {showBalance ? `$${portfolioValue.toFixed(2)}` : '****'}
          </p>
          <button onClick={() => setShowBalance(!showBalance)} className={`text-xs ${green} mt-1`}>
            {showBalance ? 'Hide' : 'Show'}
          </button>
        </div>

        {/* Rewards Card */}
        <div className={`${glassBg} rounded-2xl p-4 border ${border} relative overflow-hidden group hover:scale-[1.02] transition-transform`}
          style={{boxShadow: isDark ? '0 10px 40px rgba(168,85,247,0.1)' : '0 10px 40px rgba(0,0,0,0.1)'}}>
          <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-[#A855F7]/20 to-transparent rounded-full blur-2xl"></div>
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#A855F7] to-[#7C3AED] flex items-center justify-center">
              <Gift size={16} className="text-white" weight="fill" />
            </div>
            <span className={`text-xs ${textMuted}`}>Rewards</span>
          </div>
          <p className={`text-xl font-bold text-[#FFD700]`}>3,200 USDT</p>
          <Link to="/profile" className={`text-xs ${green} mt-1 block`}>Claim Now</Link>
        </div>
      </div>

      {/* 3D Security Banner */}
      <div className="px-4 py-4">
        <div className={`${glassBg} rounded-2xl p-4 border ${border} flex items-center gap-4`}>
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#00DC82] to-[#00B36B] flex items-center justify-center shadow-lg">
            <ShieldCheck size={24} className="text-white" weight="fill" />
          </div>
          <div className="flex-1">
            <h3 className={`font-bold ${text}`}>Bank-Grade Security</h3>
            <p className={`text-xs ${textMuted}`}>Your assets are protected 24/7</p>
          </div>
          <CaretRight size={20} className={textMuted} />
        </div>
      </div>

      {/* 3D Markets Section */}
      <div className="px-4 py-2">
        <div className="flex items-center justify-between mb-4">
          <h2 className={`text-lg font-bold ${text}`}>Live Markets</h2>
          <Link to="/markets" className={`text-sm ${green} font-medium flex items-center gap-1`}>
            See All <CaretRight size={14} />
          </Link>
        </div>

        {/* Market Tabs */}
        <div className="flex gap-2 mb-4">
          {[
            { id: 'hot', label: 'Hot', icon: Fire },
            { id: 'gainers', label: 'Gainers', icon: TrendUp },
            { id: 'losers', label: 'Losers', icon: TrendDown }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                activeTab === tab.id 
                  ? 'bg-gradient-to-r from-[#00DC82] to-[#00B36B] text-white shadow-lg' 
                  : `${glassBg} ${textMuted} hover:text-[#00DC82]`
              }`}
              style={activeTab === tab.id ? {boxShadow: '0 4px 15px rgba(0,220,130,0.4)'} : {}}
            >
              <tab.icon size={14} weight={activeTab === tab.id ? "fill" : "regular"} />
              {tab.label}
            </button>
          ))}
        </div>

        {/* 3D Coin Cards */}
        <div className="space-y-3">
          {prices.slice(0, 5).map((coin, index) => {
            const change = coin.price_change_percentage_24h || 0;
            const isPositive = change >= 0;
            
            return (
              <Link
                key={coin.coin_id || index}
                to={`/trade?symbol=${coin.symbol || 'BTC'}`}
                className={`block ${glassBg} rounded-2xl p-4 border ${border} hover:scale-[1.02] hover:border-[#00DC82]/50 transition-all`}
                style={{boxShadow: isDark ? '0 4px 20px rgba(0,0,0,0.2)' : '0 4px 20px rgba(0,0,0,0.05)'}}
              >
                <div className="flex items-center gap-3">
                  {/* Coin Icon */}
                  <div className="relative">
                    <div className="w-12 h-12 rounded-xl overflow-hidden bg-gradient-to-br from-gray-700 to-gray-800 flex items-center justify-center">
                      {coin.image ? (
                        <img src={coin.image} alt={coin.symbol} className="w-8 h-8 object-contain" />
                      ) : (
                        <span className="text-[#00DC82] font-bold">{coin.symbol?.charAt(0)}</span>
                      )}
                    </div>
                  </div>
                  
                  {/* Coin Info */}
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className={`font-bold ${text}`}>{coin.symbol?.toUpperCase()}</span>
                      <span className={`text-xs ${textMuted}`}>/USDT</span>
                    </div>
                    <span className={`text-xs ${textMuted}`}>Vol {(coin.total_volume / 1e6).toFixed(1)}M</span>
                  </div>
                  
                  {/* Price */}
                  <div className="text-right">
                    <p className={`font-bold ${text}`}>
                      ${coin.current_price?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                  </div>
                  
                  {/* Change Badge */}
                  <div className={`px-3 py-2 rounded-xl text-sm font-bold ${
                    isPositive 
                      ? 'bg-gradient-to-r from-[#00DC82] to-[#00B36B] text-white' 
                      : 'bg-gradient-to-r from-[#FF4757] to-[#EE3B4B] text-white'
                  }`} style={{boxShadow: isPositive ? '0 4px 15px rgba(0,220,130,0.3)' : '0 4px 15px rgba(255,71,87,0.3)'}}>
                    {isPositive ? '+' : ''}{change.toFixed(2)}%
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Bottom Navigation */}
      <BottomNav />

      {/* Custom Animations */}
      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-10px) rotate(5deg); }
        }
        .animate-float {
          animation: float 3s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
};

export default KuCoinHomePage;
