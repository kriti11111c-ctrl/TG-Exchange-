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
  
  // Countdown timer states for scheduled trade codes
  const [nextCodeTime, setNextCodeTime] = useState(null);
  const [scheduleCountdown, setScheduleCountdown] = useState("");
  const [isCodeActive, setIsCodeActive] = useState(false);
  
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
  const [copiedCode, setCopiedCode] = useState(null);
  
  const copyCode = async (code) => {
    try {
      // Try modern clipboard API first
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(code);
      } else {
        // Fallback for older browsers/environments
        const textArea = document.createElement('textarea');
        textArea.value = code;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }
      setCopiedCode(code);
      toast.success("Code copied! Paste in Futures page");
      setTimeout(() => setCopiedCode(null), 3000);
    } catch (err) {
      // Even if copy fails, show the code for manual copy
      toast.info(`Code: ${code} - Long press to copy`);
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

  // Schedule countdown timer for trade code slots
  // Morning: 10:45 AM IST, Evening: 8:30 PM IST
  useEffect(() => {
    const calculateNextCode = () => {
      const now = new Date();
      const istOffset = 5.5 * 60 * 60 * 1000;
      const istNow = new Date(now.getTime() + istOffset);
      const hours = istNow.getUTCHours();
      const minutes = istNow.getUTCMinutes();
      const seconds = istNow.getUTCSeconds();
      const currentTotalSeconds = hours * 3600 + minutes * 60 + seconds;

      const morningSlot = (10 * 60 + 45) * 60;
      const eveningSlot = (20 * 60 + 30) * 60;
      const morningCountdownStart = morningSlot - 3600;
      const eveningCountdownStart = eveningSlot - 3600;
      const morningEnd = morningSlot + 3600;
      const eveningEnd = eveningSlot + 3600;

      let nextSlot, nextEnd, slotName, countdownStart;
      
      if (currentTotalSeconds < morningCountdownStart) {
        nextSlot = morningSlot; nextEnd = morningEnd;
        countdownStart = morningCountdownStart; slotName = "10:45 AM";
      } else if (currentTotalSeconds >= morningCountdownStart && currentTotalSeconds < morningEnd) {
        nextSlot = morningSlot; nextEnd = morningEnd;
        countdownStart = morningCountdownStart; slotName = "10:45 AM";
      } else if (currentTotalSeconds < eveningCountdownStart) {
        nextSlot = eveningSlot; nextEnd = eveningEnd;
        countdownStart = eveningCountdownStart; slotName = "8:30 PM";
      } else if (currentTotalSeconds >= eveningCountdownStart && currentTotalSeconds < eveningEnd) {
        nextSlot = eveningSlot; nextEnd = eveningEnd;
        countdownStart = eveningCountdownStart; slotName = "8:30 PM";
      } else {
        nextSlot = morningSlot + 24 * 3600; nextEnd = morningEnd + 24 * 3600;
        countdownStart = morningCountdownStart + 24 * 3600; slotName = "10:45 AM (Tomorrow)";
      }

      const isActive = currentTotalSeconds >= nextSlot && currentTotalSeconds < nextEnd;
      setIsCodeActive(isActive);

      let remainingSeconds;
      const showCountdown = currentTotalSeconds >= countdownStart && currentTotalSeconds < nextEnd;
      
      if (currentTotalSeconds < nextSlot) {
        remainingSeconds = nextSlot - currentTotalSeconds;
      } else if (isActive) {
        remainingSeconds = nextEnd - currentTotalSeconds;
      } else {
        remainingSeconds = nextSlot - currentTotalSeconds;
        if (remainingSeconds < 0) remainingSeconds += 24 * 3600;
      }

      const hrs = Math.floor(remainingSeconds / 3600);
      const mins = Math.floor((remainingSeconds % 3600) / 60);
      const secs = remainingSeconds % 60;
      
      setNextCodeTime(slotName);
      if (showCountdown) {
        setScheduleCountdown(`${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`);
      } else {
        setScheduleCountdown(null);
      }
    };

    calculateNextCode();
    const interval = setInterval(calculateNextCode, 1000);
    return () => clearInterval(interval);
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
    { icon: Trophy, label: "VIP Rank", path: "/team-rank", bg: "#F3E5F5", iconColor: "#8B5CF6" },
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
          {/* Logo with Subtle Green Glow */}
          <div className="flex items-center gap-3">
            <div className="relative" style={{width: '48px', height: '48px'}}>
              {/* Subtle Green Glow - Contained around logo only */}
              <div 
                className="absolute rounded-full"
                style={{
                  top: '-4px',
                  left: '-4px',
                  right: '-4px',
                  bottom: '-4px',
                  background: 'radial-gradient(circle, rgba(14,203,129,0.5) 0%, rgba(14,203,129,0.2) 50%, transparent 70%)',
                  filter: 'blur(6px)',
                  animation: 'logoGlow 2.5s ease-in-out infinite'
                }}
              />
              {/* TG Coin Logo - Zoomed to hide black border */}
              <div 
                className="w-12 h-12 rounded-full relative z-10 overflow-hidden"
                style={{
                  boxShadow: '0 0 8px rgba(14,203,129,0.5), 0 0 16px rgba(14,203,129,0.3)'
                }}
              >
                <img 
                  src="/tg-logo.png" 
                  alt="TG Exchange" 
                  className="absolute"
                  style={{
                    width: '145%',
                    height: '145%',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    objectFit: 'cover'
                  }}
                />
              </div>
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
              
              {/* Notification Dropdown - PREMIUM 3D DESIGN with HISTORY */}
              {showNotifications && (
                <div className="fixed inset-0 z-50 flex items-start justify-center pt-16" onClick={() => setShowNotifications(false)}>
                  {/* Backdrop with blur */}
                  <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
                  
                  {/* Main Card - 3D Premium Design */}
                  <div 
                    className="relative w-[340px] rounded-3xl shadow-2xl overflow-hidden mx-4 transform perspective-1000"
                    style={{
                      background: 'linear-gradient(145deg, #0a0f1a 0%, #1a1f3a 50%, #0d1225 100%)',
                      border: '2px solid transparent',
                      borderImage: 'linear-gradient(135deg, #00d4ff, #7c3aed, #f97316, #00d4ff) 1',
                      boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.8), 0 0 40px rgba(0, 212, 255, 0.15), inset 0 1px 0 rgba(255,255,255,0.1)'
                    }} 
                    onClick={(e) => e.stopPropagation()}
                  >
                    {/* Header - Glowing Effect */}
                    <div className="relative p-4" style={{
                      background: 'linear-gradient(90deg, rgba(0,212,255,0.1) 0%, rgba(124,58,237,0.1) 50%, rgba(249,115,22,0.1) 100%)',
                      borderBottom: '1px solid rgba(255,255,255,0.1)'
                    }}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{
                            background: 'linear-gradient(135deg, #00d4ff 0%, #7c3aed 100%)',
                            boxShadow: '0 4px 15px rgba(0,212,255,0.4)'
                          }}>
                            <Bell size={20} className="text-white" weight="fill" />
                          </div>
                          <div>
                            <h3 className="font-bold text-white text-lg">Trade Codes</h3>
                            <p className="text-xs text-gray-400">Profit Signals</p>
                          </div>
                        </div>
                        <button 
                          onClick={() => setShowNotifications(false)}
                          className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-white/10 transition-colors"
                        >
                          <span className="text-gray-400 hover:text-white text-xl">✕</span>
                        </button>
                      </div>
                    </div>
                    
                    {/* Timer Section - Animated Gradient Border */}
                    <div className="mx-4 mt-4 p-4 rounded-2xl relative overflow-hidden" style={{
                      background: 'linear-gradient(135deg, rgba(0,0,0,0.4) 0%, rgba(0,0,0,0.2) 100%)',
                      border: '1px solid rgba(255,255,255,0.1)'
                    }}>
                      {/* Animated glow */}
                      <div className="absolute inset-0 opacity-30" style={{
                        background: isCodeActive 
                          ? 'radial-gradient(circle at 50% 50%, rgba(0,200,83,0.3) 0%, transparent 70%)'
                          : 'radial-gradient(circle at 50% 50%, rgba(255,215,0,0.3) 0%, transparent 70%)'
                      }}></div>
                      
                      <div className="relative flex items-center justify-between">
                        <div>
                          <p className="text-xs text-gray-400 mb-1">
                            {isCodeActive ? "⚡ CODE ACTIVE UNTIL" : "⏳ NEXT CODE AT"}
                          </p>
                          <p className="text-xl font-bold" style={{
                            color: isCodeActive ? '#00C853' : '#FFD700',
                            textShadow: isCodeActive ? '0 0 20px rgba(0,200,83,0.5)' : '0 0 20px rgba(255,215,0,0.5)'
                          }}>
                            {nextCodeTime === "10:45 AM" ? "05:15 UTC" : 
                             nextCodeTime === "8:30 PM" ? "15:00 UTC" : 
                             nextCodeTime === "10:45 AM (Tomorrow)" ? "05:15 UTC (Tomorrow)" :
                             nextCodeTime || "Loading..."}
                          </p>
                        </div>
                        {scheduleCountdown && (
                          <div className="text-right">
                            <p className="text-xs text-gray-400 mb-1">
                              {isCodeActive ? "EXPIRES IN" : "STARTS IN"}
                            </p>
                            <p className="text-2xl font-mono font-black" style={{
                              color: isCodeActive ? '#00C853' : '#FFD700',
                              textShadow: isCodeActive ? '0 0 30px rgba(0,200,83,0.6)' : '0 0 30px rgba(255,215,0,0.6)'
                            }}>
                              {scheduleCountdown}
                            </p>
                          </div>
                        )}
                      </div>
                      
                      {/* Schedule Pills */}
                      <div className="mt-3 flex items-center justify-center gap-2 pt-3" style={{borderTop: '1px dashed rgba(255,255,255,0.1)'}}>
                        <span className="px-3 py-1 rounded-full text-xs font-bold" style={{
                          background: 'linear-gradient(90deg, #00d4ff 0%, #00a8cc 100%)',
                          boxShadow: '0 2px 10px rgba(0,212,255,0.3)'
                        }}>05:15 UTC</span>
                        <span className="text-gray-500">&</span>
                        <span className="px-3 py-1 rounded-full text-xs font-bold" style={{
                          background: 'linear-gradient(90deg, #f97316 0%, #ea580c 100%)',
                          boxShadow: '0 2px 10px rgba(249,115,22,0.3)'
                        }}>15:00 UTC</span>
                      </div>
                    </div>
                    
                    {/* Active Codes Section */}
                    <div className="max-h-64 overflow-y-auto px-4 py-3">
                      {activeOrScheduledCodes.length === 0 ? (
                        <div className="py-8 text-center">
                          <div className="w-16 h-16 mx-auto mb-3 rounded-2xl flex items-center justify-center" style={{
                            background: 'linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.02) 100%)',
                            border: '1px dashed rgba(255,255,255,0.1)'
                          }}>
                            <Bell size={32} className="text-gray-600" />
                          </div>
                          <p className="text-gray-400 font-medium">No Active Codes</p>
                          <p className="text-xs text-gray-500 mt-1">Wait for scheduled time</p>
                        </div>
                      ) : (
                        activeOrScheduledCodes.map((code, idx) => {
                          const isUsed = code.status === "used";
                          const isExpired = code.is_expired;
                          const isLive = code.is_live && !isUsed && !isExpired;
                          const remaining = countdowns[`${code.code}_remaining`] || code.time_remaining;
                          const countdownToLive = countdowns[`${code.code}_tolive`] || code.countdown_to_live;
                          const isComingSoon = !isLive && !isUsed && !isExpired && countdownToLive > 0;
                          
                          return (
                            <div 
                              key={idx} 
                              className="mb-3 rounded-2xl overflow-hidden transform transition-all hover:scale-[1.02]"
                              style={{
                                background: isLive 
                                  ? 'linear-gradient(135deg, rgba(0,200,83,0.15) 0%, rgba(0,100,50,0.1) 100%)'
                                  : isUsed 
                                    ? 'linear-gradient(135deg, rgba(0,200,83,0.1) 0%, rgba(0,50,25,0.1) 100%)'
                                    : isExpired
                                      ? 'linear-gradient(135deg, rgba(255,59,48,0.15) 0%, rgba(150,30,20,0.1) 100%)'
                                      : 'linear-gradient(135deg, rgba(255,215,0,0.15) 0%, rgba(150,100,0,0.1) 100%)',
                                border: `1px solid ${isLive ? 'rgba(0,200,83,0.3)' : isUsed ? 'rgba(0,200,83,0.2)' : isExpired ? 'rgba(255,59,48,0.3)' : 'rgba(255,215,0,0.3)'}`,
                                boxShadow: isLive ? '0 4px 20px rgba(0,200,83,0.2)' : 'none'
                              }}
                            >
                              {/* Status Badge */}
                              <div className={`px-4 py-2 flex items-center gap-2`} style={{
                                background: isLive 
                                  ? 'linear-gradient(90deg, #00C853 0%, #00E676 100%)'
                                  : isUsed
                                    ? 'linear-gradient(90deg, #2E7D32 0%, #388E3C 100%)'
                                    : isExpired
                                      ? 'linear-gradient(90deg, #D32F2F 0%, #F44336 100%)'
                                      : 'linear-gradient(90deg, #F9A825 0%, #FBC02D 100%)'
                              }}>
                                {isLive && <span className="w-2.5 h-2.5 rounded-full bg-white animate-pulse shadow-lg shadow-white/50"></span>}
                                {isUsed && <span className="text-white text-lg">✓</span>}
                                {isExpired && <span className="text-white text-lg">✕</span>}
                                {isComingSoon && <span className="w-2.5 h-2.5 rounded-full bg-white animate-bounce"></span>}
                                <span className="text-white font-black text-sm tracking-wide">
                                  {isLive ? '🔥 LIVE NOW' : isUsed ? '✅ SUCCESS' : isExpired ? '❌ MISSED' : '⏰ COMING'}
                                </span>
                                {isLive && (
                                  <span className="ml-auto text-white text-xs font-mono bg-black/30 px-2 py-1 rounded-lg">
                                    {formatCountdown(remaining)}
                                  </span>
                                )}
                              </div>
                              
                              <div className="p-4">
                                {isComingSoon ? (
                                  <div className="text-center py-2">
                                    <p className="text-gray-400 text-xs mb-2">Code unlocks in</p>
                                    <p className="text-3xl font-mono font-black text-yellow-400" style={{
                                      textShadow: '0 0 30px rgba(255,215,0,0.5)'
                                    }}>
                                      {formatCountdown(countdownToLive)}
                                    </p>
                                  </div>
                                ) : (
                                  <>
                                    <div className="flex items-center justify-between mb-2">
                                      <span className="font-black text-2xl tracking-widest" style={{
                                        color: isExpired ? '#FF6B6B' : '#FF3B30',
                                        textShadow: '0 0 20px rgba(255,59,48,0.3)'
                                      }}>
                                        {code.code}
                                      </span>
                                      {isLive && (
                                        <button 
                                          onClick={() => copyCode(code.code)}
                                          className="px-5 py-2 rounded-xl text-sm font-bold text-white transform transition-all active:scale-95"
                                          style={{
                                            background: copiedCode === code.code 
                                              ? 'linear-gradient(90deg, #00d4ff 0%, #0088cc 100%)'
                                              : 'linear-gradient(90deg, #00C853 0%, #00E676 100%)',
                                            boxShadow: '0 4px 15px rgba(0,200,83,0.4)'
                                          }}
                                        >
                                          {copiedCode === code.code ? '✓ COPIED!' : '📋 COPY'}
                                        </button>
                                      )}
                                    </div>
                                    
                                    {isUsed && code.profit && (
                                      <div className="mt-2 p-2 rounded-xl" style={{background: 'rgba(0,200,83,0.1)'}}>
                                        <p className="text-green-400 font-bold text-lg">+${code.profit?.toFixed(2)} Profit! 🎉</p>
                                        <p className="text-gray-400 text-xs">Traded ${code.amount?.toFixed(2)} @ {code.multiplier || 1}x leverage</p>
                                      </div>
                                    )}
                                    
                                    <p className="text-gray-500 text-[10px] mt-2 flex items-center gap-1">
                                      <span>🕐</span> {code.slot_name || code.created_at}
                                    </p>
                                  </>
                                )}
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                    
                    {/* HISTORY SECTION - NEW */}
                    <div className="mx-4 mb-4 p-3 rounded-2xl" style={{
                      background: 'linear-gradient(135deg, rgba(0,0,0,0.3) 0%, rgba(0,0,0,0.2) 100%)',
                      border: '1px solid rgba(255,255,255,0.05)'
                    }}>
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="text-sm font-bold text-white flex items-center gap-2">
                          <span>📊</span> Trade History
                        </h4>
                        <span className="text-xs text-gray-500">Last 10</span>
                      </div>
                      
                      <div className="space-y-2 max-h-32 overflow-y-auto">
                        {/* Sample history items - will be populated from API */}
                        {[
                          {code: 'X7KM9P', status: 'success', time: '15:00 UTC', profit: '+$12.50'},
                          {code: 'A3BN2L', status: 'missed', time: '05:15 UTC', profit: '-'},
                          {code: 'H8YT5R', status: 'success', time: '15:00 UTC', profit: '+$8.20'},
                          {code: 'K2WQ7M', status: 'success', time: '05:15 UTC', profit: '+$15.00'},
                          {code: 'P9XC3N', status: 'missed', time: '15:00 UTC', profit: '-'},
                        ].map((item, idx) => (
                          <div key={idx} className="flex items-center justify-between py-1.5 px-2 rounded-lg" style={{
                            background: item.status === 'success' 
                              ? 'rgba(0,200,83,0.1)' 
                              : 'rgba(255,59,48,0.1)'
                          }}>
                            <div className="flex items-center gap-2">
                              <span className={`w-2 h-2 rounded-full ${item.status === 'success' ? 'bg-green-500' : 'bg-red-500'}`}></span>
                              <span className="font-mono text-xs text-gray-300">{item.code}</span>
                            </div>
                            <span className="text-[10px] text-gray-500">{item.time}</span>
                            <span className={`text-xs font-bold ${item.status === 'success' ? 'text-green-400' : 'text-red-400'}`}>
                              {item.profit}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                    
                    {/* Footer - CTA Button */}
                    <Link 
                      to="/futures" 
                      className="block p-4 text-center font-bold transition-all"
                      style={{
                        background: 'linear-gradient(90deg, #7c3aed 0%, #a855f7 50%, #7c3aed 100%)',
                        backgroundSize: '200% 100%',
                        animation: 'shimmer 2s linear infinite'
                      }}
                    >
                      <span className="text-white">🚀 Go to Futures Trading</span>
                    </Link>
                  </div>
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
