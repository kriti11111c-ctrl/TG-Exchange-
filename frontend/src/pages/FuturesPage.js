import { useState, useEffect, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useTheme, API } from "../App";
import axios from "axios";
import { toast } from "sonner";
import BottomNav from "../components/BottomNav";
import CandleChart from "../components/CandleChart";
import { 
  ArrowLeft, 
  ClockCounterClockwise,
  Folder,
  Robot,
  CaretUp,
  CaretDown,
  Warning,
  Lightning,
  TrendUp,
  TrendDown,
  Ticket,
  CheckCircle,
  Confetti,
  ArrowsLeftRight
} from "@phosphor-icons/react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";

const FuturesPage = () => {
  const { isDark } = useTheme();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("positions");
  const [wallet, setWallet] = useState(null);
  const [selectedCoin, setSelectedCoin] = useState("BTC");
  const [leverage, setLeverage] = useState(10);
  const [orderType, setOrderType] = useState("market");
  const [amount, setAmount] = useState("");
  const [price, setPrice] = useState("");
  const [currentPrice, setCurrentPrice] = useState(0);
  const [positions, setPositions] = useState([]);
  const [showChart, setShowChart] = useState(true);
  const [tradeCode, setTradeCode] = useState("");
  const [applyingCode, setApplyingCode] = useState(false);
  const [codeSuccess, setCodeSuccess] = useState(null);
  const [futuresAccount, setFuturesAccount] = useState(null);
  const [loading, setLoading] = useState(false);
  const [callPercent, setCallPercent] = useState("61.23");
  const [putPercent, setPutPercent] = useState("63.45");
  
  // History states
  const [tradeHistory, setTradeHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0]);

  // Update percentages every 1.5 seconds for dynamic effect - within 55-65% range
  useEffect(() => {
    const interval = setInterval(() => {
      // CALL percent between 58-65%
      const newCall = (58 + Math.random() * 7).toFixed(2);
      // PUT percent between 60-68% (slightly different range)
      const newPut = (60 + Math.random() * 8).toFixed(2);
      setCallPercent(newCall);
      setPutPercent(newPut);
    }, 1500);
    return () => clearInterval(interval);
  }, []);

  // Coin ID mapping for API
  const COIN_IDS = {
    BTC: "bitcoin",
    ETH: "ethereum",
    BNB: "binancecoin",
    SOL: "solana",
    XRP: "ripple"
  };

  const bg = isDark ? 'bg-[#0B0E11]' : 'bg-gray-50';
  const cardBg = isDark ? 'bg-[#1E2329]' : 'bg-white';
  const text = isDark ? 'text-white' : 'text-gray-900';
  const textMuted = isDark ? 'text-[#848E9C]' : 'text-gray-500';
  const border = isDark ? 'border-[#2B3139]' : 'border-gray-200';
  const inputBg = isDark ? 'bg-[#0B0E11]' : 'bg-gray-100';

  // Fetch real price from Binance API via backend proxy
  const fetchRealPrice = async () => {
    try {
      // Use backend proxy to Binance API (avoids CORS)
      const response = await fetch(`${API}/market/binance-price/${selectedCoin}`);
      if (response.ok) {
        const data = await response.json();
        if (data.price) {
          setCurrentPrice(data.price);
          return;
        }
      }
      
      // Fallback to backend market prices
      const coinId = COIN_IDS[selectedCoin] || "bitcoin";
      const res = await axios.get(`${API}/market/prices`);
      const prices = res.data;
      const coin = prices.find(p => p.coin_id === coinId);
      if (coin?.current_price) {
        setCurrentPrice(coin.current_price);
      }
    } catch (error) {
      console.error("Error fetching price:", error);
    }
  };

  // Fetch futures account and positions
  const fetchFuturesData = async () => {
    try {
      const [accountRes, positionsRes, walletRes, tradeCodesRes] = await Promise.all([
        axios.get(`${API}/futures/account`, { withCredentials: true }),
        axios.get(`${API}/futures/positions`, { withCredentials: true }),
        axios.get(`${API}/wallet`, { withCredentials: true }),
        axios.get(`${API}/user/trade-codes`, { withCredentials: true })
      ]);
      setFuturesAccount(accountRes.data);
      setPositions(positionsRes.data.positions || []);
      setWallet(walletRes.data);
      
      // Set leverage based on current multiplier from backend
      const multiplier = tradeCodesRes.data.current_multiplier || 1;
      setLeverage(multiplier);
    } catch (error) {
      console.error("Error fetching futures data:", error);
    }
  };

  // Fetch trade history
  const fetchTradeHistory = async () => {
    setHistoryLoading(true);
    try {
      const res = await axios.get(`${API}/futures/history`, {
        params: { start_date: startDate, end_date: endDate },
        withCredentials: true
      });
      setTradeHistory(res.data.history || []);
    } catch (error) {
      console.error("Error fetching history:", error);
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    fetchFuturesData();
    fetchRealPrice();
    
    // Update price every 10 seconds
    const interval = setInterval(fetchRealPrice, 10000);
    return () => clearInterval(interval);
  }, [selectedCoin]);

  // Fetch history when tab changes or dates change
  useEffect(() => {
    if (activeTab === "history") {
      fetchTradeHistory();
    }
  }, [activeTab, startDate, endDate]);

  const tabs = [
    { id: "positions", label: "Position order", count: null },
    { id: "history", label: "Historical orders", count: null },
    { id: "orders", label: "Open Orders", count: 0 }
  ];

  const leverageOptions = [1, 2, 5, 10, 20, 50, 75, 100, 125];

  // Open real futures position
  const handleTrade = async (side) => {
    if (!amount || parseFloat(amount) <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }
    
    const tradeAmount = parseFloat(amount);
    setLoading(true);
    
    try {
      const res = await axios.post(`${API}/futures/open`, {
        coin: selectedCoin,
        side: side,
        leverage: leverage,
        amount: tradeAmount,
        entry_price: currentPrice
      }, { withCredentials: true });
      
      if (res.data.success) {
        toast.success(res.data.message);
        setAmount("");
        fetchFuturesData();
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to open position");
    } finally {
      setLoading(false);
    }
  };

  // Close futures position
  const closePosition = async (positionId) => {
    try {
      const res = await axios.post(`${API}/futures/close`, {
        position_id: positionId
      }, { withCredentials: true });
      
      if (res.data.success) {
        toast.success(res.data.message);
        fetchFuturesData();
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to close position");
    }
  };

  return (
    <div className={`min-h-screen ${bg} pb-36`}>
      {/* Header */}
      <div className={`${cardBg} border-b ${border} sticky top-0 z-40`}>
        <div className="flex items-center justify-between p-3">
          <div className="flex items-center gap-2">
            <button 
              onClick={() => navigate(-1)} 
              className={`p-1.5 rounded-lg ${isDark ? 'hover:bg-[#2B3139]' : 'hover:bg-gray-100'}`}
            >
              <ArrowLeft size={20} className={text} />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <span className={`font-bold ${text}`}>{selectedCoin}USDT</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#00E5FF]/20 text-[#00E5FF]">Perp</span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <span className={currentPrice > 67800 ? 'text-[#0ECB81]' : 'text-[#F6465D]'}>
                  {currentPrice.toFixed(2)}
                </span>
                <span className={textMuted}>Mark: {(currentPrice * 1.001).toFixed(2)}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button className={`px-2 py-1 rounded text-xs ${isDark ? 'bg-[#2B3139]' : 'bg-gray-100'} ${text}`}>
              {leverage}x
            </button>
          </div>
        </div>
      </div>

      {/* Chart Section */}
      <div className={`${cardBg} border-b ${border}`}>
        <button 
          onClick={() => setShowChart(!showChart)}
          className={`w-full flex items-center justify-between p-3 ${text}`}
        >
          <span className="font-medium text-sm">{selectedCoin}USDT Perp Chart</span>
          {showChart ? <CaretUp size={16} /> : <CaretDown size={16} />}
        </button>
        
        {showChart && (
          <div className="pb-2">
            <CandleChart 
              symbol={selectedCoin} 
              currentPrice={currentPrice} 
              isDark={isDark}
              height={320}
            />
          </div>
        )}
      </div>

      {/* Trading Panel */}
      <div className={`${cardBg} p-3 border-b ${border}`}>
        {/* Leverage Display - Fixed by System */}
        <div className="mb-3">
          <div className="flex items-center justify-between">
            <span className={`text-xs ${textMuted}`}>Leverage</span>
            <div className="flex items-center gap-2">
              <div className={`px-4 py-2 rounded-lg ${leverage === 1 ? 'bg-[#00E5FF]/20 border border-[#00E5FF]' : 'bg-[#2B3139]'}`}>
                <span className={`text-sm font-bold ${leverage === 1 ? 'text-[#00E5FF]' : textMuted}`}>1x</span>
              </div>
              <div className={`px-4 py-2 rounded-lg ${leverage === 2 ? 'bg-[#00E5FF]/20 border border-[#00E5FF]' : 'bg-[#2B3139]'}`}>
                <span className={`text-sm font-bold ${leverage === 2 ? 'text-[#00E5FF]' : textMuted}`}>2x</span>
              </div>
            </div>
          </div>
          <p className={`text-[10px] ${textMuted} mt-2 text-center`}>
            {leverage === 1 
              ? "✓ Default 1x leverage active" 
              : "⚡ 2x leverage activated (after missed trade)"
            }
          </p>
        </div>

        {/* Order Type */}
        <div className="flex gap-2 mb-3">
          {['market', 'limit'].map(type => (
            <button
              key={type}
              onClick={() => setOrderType(type)}
              className={`flex-1 py-2 rounded text-xs font-medium capitalize ${
                orderType === type 
                  ? `${isDark ? 'bg-[#2B3139]' : 'bg-gray-200'} ${text}` 
                  : textMuted
              }`}
            >
              {type}
            </button>
          ))}
        </div>

        {/* Price Input (for Limit orders) */}
        {orderType === 'limit' && (
          <div className="mb-3">
            <div className="relative">
              <Input
                type="number"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="Price"
                className={`pr-16 ${inputBg} ${border} ${text} text-right`}
              />
              <span className={`absolute right-3 top-1/2 -translate-y-1/2 text-xs ${textMuted}`}>USDT</span>
            </div>
          </div>
        )}

        {/* Amount Input */}
        <div className="mb-3">
          <div className="relative">
            <Input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Amount"
              className={`pr-16 ${inputBg} ${border} ${text} text-right`}
            />
            <span className={`absolute right-3 top-1/2 -translate-y-1/2 text-xs ${textMuted}`}>{selectedCoin}</span>
          </div>
        </div>

        {/* Percentage buttons */}
        <div className="grid grid-cols-4 gap-2 mb-3">
          {[25, 50, 75, 100].map(pct => (
            <button
              key={pct}
              onClick={() => {
                const max = (wallet?.futures_balance || 0) * leverage / currentPrice;
                setAmount((max * pct / 100).toFixed(4));
              }}
              className={`py-1.5 rounded text-xs ${isDark ? 'bg-[#2B3139]' : 'bg-gray-100'} ${textMuted}`}
            >
              {pct}%
            </button>
          ))}
        </div>

        {/* Available Balance - Futures */}
        <div className={`flex justify-between text-xs mb-3 ${textMuted}`}>
          <span>Futures Balance</span>
          <span className="text-[#10B981]">{wallet?.futures_balance?.toFixed(2) || '0.00'} USDT</span>
        </div>
      </div>

      {/* Trade Code Section - PREMIUM COUPON DESIGN */}
      <div className="px-3 pb-20">
        <div className="relative overflow-hidden rounded-3xl" style={{
          background: 'linear-gradient(135deg, #0f1419 0%, #1a2332 50%, #0d1117 100%)',
          boxShadow: '0 20px 60px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.1)'
        }}>
          {/* Coupon Perforated Edge - Left */}
          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-4 h-8 bg-[#0B0E11] rounded-r-full" style={{boxShadow: 'inset -2px 0 4px rgba(0,0,0,0.3)'}}></div>
          {/* Coupon Perforated Edge - Right */}
          <div className="absolute right-0 top-1/2 -translate-y-1/2 w-4 h-8 bg-[#0B0E11] rounded-l-full" style={{boxShadow: 'inset 2px 0 4px rgba(0,0,0,0.3)'}}></div>
          
          {/* Glowing Border Effect */}
          <div className="absolute inset-0 rounded-3xl" style={{
            background: 'linear-gradient(90deg, #10b981, #f59e0b, #10b981)',
            padding: '2px',
            WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
            WebkitMaskComposite: 'xor',
            maskComposite: 'exclude'
          }}></div>
          
          {/* Header with Gradient */}
          <div className="relative px-5 pt-4 pb-3" style={{
            background: 'linear-gradient(90deg, rgba(16,185,129,0.2) 0%, rgba(245,158,11,0.2) 100%)',
            borderBottom: '1px dashed rgba(255,255,255,0.1)'
          }}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{
                    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                    boxShadow: '0 4px 20px rgba(16,185,129,0.4)'
                  }}>
                    <Ticket size={24} className="text-white" weight="fill" />
                  </div>
                  <div className="absolute -top-1 -right-1 w-4 h-4 bg-yellow-500 rounded-full flex items-center justify-center">
                    <span className="text-[8px] font-bold text-black">AI</span>
                  </div>
                </div>
                <div>
                  <h3 className="text-white font-black text-lg tracking-wide">TRADE SIGNAL</h3>
                  <p className="text-emerald-400 text-xs font-medium">Premium Profit Code</p>
                </div>
              </div>
              <div className="flex flex-col items-end">
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full" style={{
                  background: 'linear-gradient(90deg, #10b981 0%, #059669 100%)',
                  boxShadow: '0 2px 10px rgba(16,185,129,0.4)'
                }}>
                  <span className="w-2 h-2 rounded-full bg-white animate-pulse"></span>
                  <span className="text-xs text-white font-black">LIVE</span>
                </div>
                <span className="text-[10px] text-gray-500 mt-1">60-65% Profit</span>
              </div>
            </div>
          </div>
          
          {/* Main Content */}
          <div className="relative px-5 py-4">
            {/* Success Message - Premium */}
            {codeSuccess && (
              <div className="mb-4 p-4 rounded-2xl relative overflow-hidden" style={{
                background: 'linear-gradient(135deg, rgba(16,185,129,0.3) 0%, rgba(16,185,129,0.1) 100%)',
                border: '1px solid rgba(16,185,129,0.5)'
              }}>
                <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/20 rounded-full blur-3xl"></div>
                <div className="relative flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-full bg-emerald-500 flex items-center justify-center" style={{
                    boxShadow: '0 4px 15px rgba(16,185,129,0.5)'
                  }}>
                    <CheckCircle size={24} className="text-white" weight="fill" />
                  </div>
                  <div>
                    <span className="text-emerald-400 font-black text-lg">Trade Successful!</span>
                    <p className="text-xs text-gray-400">{codeSuccess.coin_name || codeSuccess.coin?.toUpperCase()}</p>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between items-center p-3 rounded-xl bg-black/30">
                    <span className="text-gray-400 text-xs">Trade Amount</span> 
                    <span className="text-white font-bold">${codeSuccess.trade_amount_usdt?.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 rounded-xl bg-black/30">
                    <span className="text-gray-400 text-xs">Profit Earned</span> 
                    <span className="text-emerald-400 font-black text-xl">+${codeSuccess.profit_usdt?.toFixed(2)}</span>
                  </div>
                  <div className="text-center pt-2">
                    <span className="px-4 py-1 rounded-full text-xs font-black" style={{
                      background: 'linear-gradient(90deg, #f59e0b 0%, #d97706 100%)'
                    }}>{codeSuccess.profit_percent}% PROFIT</span>
                  </div>
                </div>
              </div>
            )}
            
            {/* Code Input - Coupon Style */}
            <div className="relative">
              <div className="absolute -left-5 top-1/2 -translate-y-1/2 flex flex-col gap-1">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="w-2 h-2 rounded-full bg-[#0B0E11]"></div>
                ))}
              </div>
              <div className="absolute -right-5 top-1/2 -translate-y-1/2 flex flex-col gap-1">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="w-2 h-2 rounded-full bg-[#0B0E11]"></div>
                ))}
              </div>
              
              <div className="flex gap-2">
                <div className="flex-1 relative">
                  <div className="absolute inset-0 rounded-xl" style={{
                    background: 'linear-gradient(90deg, #10b981, #f59e0b)',
                    padding: '2px'
                  }}>
                    <div className="w-full h-full rounded-xl bg-[#0d1117]"></div>
                  </div>
                  <Input
                    type="text"
                    value={tradeCode}
                    onChange={(e) => setTradeCode(e.target.value.toLowerCase())}
                    placeholder="paste code here"
                    className="relative w-full text-center text-sm bg-transparent border-0 text-white lowercase tracking-[0.3em] font-mono h-14 rounded-xl focus:ring-0 placeholder:text-gray-600 placeholder:tracking-[0.2em]"
                    style={{background: 'transparent'}}
                    data-testid="trade-code-input"
                  />
                </div>
                <Button
                  onClick={async () => {
                if (!tradeCode.trim()) {
                  toast.error("Please enter trade code");
                  return;
                }
                setApplyingCode(true);
                setCodeSuccess(null);
                try {
                  const res = await axios.post(`${API}/trade/apply-code`, {
                    code: tradeCode
                  }, { withCredentials: true });
                  
                  // Show profit prominently in toast
                  const profitAmount = res.data.profit_usdt || res.data.trade_details?.profit || 0;
                  toast.success(
                    <div className="flex flex-col items-center py-1">
                      <span className="text-lg font-bold">🎉 Trade Successful!</span>
                      <span className="text-2xl font-black text-green-400 mt-1">+${profitAmount.toFixed(2)}</span>
                      <span className="text-xs text-gray-400 mt-1">Profit added to wallet</span>
                    </div>,
                    {
                      duration: 4000,
                      style: {
                        background: 'linear-gradient(135deg, #0a2e1a 0%, #1a4a2e 100%)',
                        border: '1px solid #10b981',
                        padding: '16px',
                      }
                    }
                  );
                  
                  setCodeSuccess(res.data.trade_details || {
                    trade_type: res.data.trade_type,
                    amount: res.data.amount,
                    coin: res.data.coin,
                    coin_name: res.data.coin_name,
                    price: res.data.price
                  });
                  
                  setTradeCode("");
                  fetchFuturesData();
                  
                  setTimeout(() => setCodeSuccess(null), 10000);
                } catch (error) {
                  const errorMsg = error.response?.data?.detail || "Invalid or expired trade code";
                  toast.error(
                    <div className="flex flex-col items-center py-1">
                      <span className="text-lg font-bold">❌ Failed</span>
                      <span className="text-sm text-red-300 mt-1">{errorMsg}</span>
                    </div>,
                    {
                      duration: 3000,
                      style: {
                        background: 'linear-gradient(135deg, #2e0a0a 0%, #4a1a1a 100%)',
                        border: '1px solid #ef4444',
                        padding: '12px',
                      }
                    }
                  );
                } finally {
                  setApplyingCode(false);
                }
              }}
              disabled={applyingCode || !tradeCode.trim()}
              className="h-14 px-8 rounded-xl font-black text-white text-sm disabled:opacity-50 transition-all transform hover:scale-105 active:scale-95"
              style={{
                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                boxShadow: '0 4px 20px rgba(16,185,129,0.4)'
              }}
              data-testid="apply-code-button"
            >
              {applyingCode ? "..." : "APPLY"}
            </Button>
              </div>
            </div>
            
            {/* Footer Info */}
            <div className="mt-4 flex items-center justify-center gap-2 text-[10px] text-gray-500">
              <span>🔒 Secure</span>
              <span>•</span>
              <span>⚡ Instant Profit</span>
              <span>•</span>
              <span>💰 1% Trade</span>
            </div>
          </div>
        </div>
      </div>

      {/* CALL/PUT Buttons - Fixed at bottom above nav */}
      <div className="fixed bottom-16 left-0 right-0 px-3 pb-2 z-30" style={{ background: isDark ? '#0B0E11' : '#f9fafb' }}>
        <div className="flex gap-2">
          {/* CALL Button */}
          <button
            onClick={() => handleTrade('long')}
            disabled={loading}
            data-testid="call-button"
            className="flex-1 py-2.5 rounded-lg bg-[#0ECB81] hover:bg-[#0ECB81]/90 text-white font-semibold disabled:opacity-50 transition-all"
          >
            <div className="flex items-center justify-center gap-2">
              <CaretUp size={16} weight="bold" />
              <span className="text-sm font-semibold">CALL</span>
              <span className="text-xs font-medium opacity-90">{callPercent}%</span>
            </div>
          </button>
          
          {/* PUT Button */}
          <button
            onClick={() => handleTrade('short')}
            disabled={loading}
            data-testid="put-button"
            className="flex-1 py-2.5 rounded-lg bg-[#F6465D] hover:bg-[#F6465D]/90 text-white font-semibold disabled:opacity-50 transition-all"
          >
            <div className="flex items-center justify-center gap-2">
              <span className="text-xs font-medium opacity-90">{putPercent}%</span>
              <span className="text-sm font-semibold">PUT</span>
              <CaretDown size={16} weight="bold" />
            </div>
          </button>
        </div>
      </div>

      {/* Tabs Header */}
      <div className={`${cardBg} border-b ${border}`}>
        <div className="flex items-center justify-between px-2">
          <div className="flex items-center">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-3 px-3 text-sm font-medium relative ${
                  activeTab === tab.id ? text : textMuted
                }`}
                data-testid={`tab-${tab.id}`}
              >
                {tab.label} {tab.count !== null && `(${tab.count})`}
                {activeTab === tab.id && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#00E5FF]"></div>
                )}
              </button>
            ))}
          </div>
          
          {/* History Icon - Always visible */}
          <button 
            onClick={() => setActiveTab("history")}
            className={`p-2 rounded-lg ${activeTab === "history" ? 'text-[#00E5FF]' : textMuted} ${isDark ? 'hover:bg-[#2B3139]' : 'hover:bg-gray-100'}`}
            title="Trade History"
            data-testid="history-icon-btn"
          >
            <ClockCounterClockwise size={22} weight={activeTab === "history" ? "fill" : "regular"} />
          </button>
        </div>
      </div>

      {/* Tab Content */}
      <div className={`${cardBg} min-h-[150px]`}>
        {/* Positions Tab */}
        {activeTab === "positions" && (
          <div className="p-4">
            {/* Account Summary */}
            {futuresAccount && (
              <div className={`p-3 rounded-lg border ${border} mb-4 grid grid-cols-2 gap-3`}>
                <div>
                  <p className={`text-[10px] ${textMuted}`}>Available Balance</p>
                  <p className={`font-bold ${text}`}>${futuresAccount.available_balance?.toFixed(2) || '0.00'}</p>
                </div>
                <div>
                  <p className={`text-[10px] ${textMuted}`}>Total PnL</p>
                  <p className={`font-bold ${futuresAccount.total_pnl >= 0 ? 'text-[#0ECB81]' : 'text-[#F6465D]'}`}>
                    ${futuresAccount.total_pnl?.toFixed(2) || '0.00'}
                  </p>
                </div>
                <div>
                  <p className={`text-[10px] ${textMuted}`}>Win Rate</p>
                  <p className={`font-bold text-[#00E5FF]`}>{futuresAccount.win_rate?.toFixed(1) || '0'}%</p>
                </div>
                <div>
                  <p className={`text-[10px] ${textMuted}`}>Total Trades</p>
                  <p className={`font-bold ${text}`}>{futuresAccount.total_trades || 0}</p>
                </div>
              </div>
            )}
            
            {positions.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8">
                <div className={`w-16 h-16 rounded-xl ${isDark ? 'bg-[#2B3139]' : 'bg-gray-100'} flex items-center justify-center mb-3`}>
                  <Folder size={32} className={textMuted} />
                </div>
                <p className={text}>You have no positions.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {positions.map(pos => {
                  // Calculate PnL from real position data
                  const entryPrice = pos.entry_price || pos.entryPrice || currentPrice;
                  const positionSize = pos.position_size || pos.size || 0;
                  const pnl = pos.side === 'long' 
                    ? (currentPrice - entryPrice) * positionSize
                    : (entryPrice - currentPrice) * positionSize;
                  const margin = pos.margin || 0;
                  const pnlPercent = margin > 0 ? (pnl / margin) * 100 : 0;
                  
                  return (
                    <div key={pos.position_id || pos.id} className={`p-3 rounded-lg border ${border}`}>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                            pos.side === 'long' ? 'bg-[#0ECB81]/20 text-[#0ECB81]' : 'bg-[#F6465D]/20 text-[#F6465D]'
                          }`}>
                            {pos.side?.toUpperCase()} {pos.leverage}x
                          </span>
                          <span className={`font-medium ${text}`}>{pos.coin}USDT</span>
                        </div>
                        <button 
                          onClick={() => closePosition(pos.position_id || pos.id)}
                          className="text-xs text-[#F6465D] font-medium px-2 py-1 border border-[#F6465D]/50 rounded"
                        >
                          Close
                        </button>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-xs">
                        <div>
                          <p className={textMuted}>Size</p>
                          <p className={text}>{positionSize.toFixed(4)} {pos.coin}</p>
                        </div>
                        <div>
                          <p className={textMuted}>Entry Price</p>
                          <p className={text}>${entryPrice.toFixed(2)}</p>
                        </div>
                        <div>
                          <p className={textMuted}>PNL</p>
                          <p className={pnl >= 0 ? 'text-[#0ECB81]' : 'text-[#F6465D]'}>
                            {pnl >= 0 ? '+' : ''}{pnl.toFixed(2)} ({pnlPercent.toFixed(2)}%)
                          </p>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs mt-2 pt-2 border-t border-dashed" style={{ borderColor: isDark ? '#2B3139' : '#e5e7eb' }}>
                        <div>
                          <p className={textMuted}>Margin</p>
                          <p className={text}>${margin.toFixed(2)}</p>
                        </div>
                        <div>
                          <p className={textMuted}>Liq. Price</p>
                          <p className="text-[#F6465D]">${(pos.liquidation_price || pos.liquidationPrice || 0).toFixed(2)}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Open Orders Tab */}
        {activeTab === "orders" && (
          <div className="flex flex-col items-center justify-center py-8">
            <div className={`w-16 h-16 rounded-xl ${isDark ? 'bg-[#2B3139]' : 'bg-gray-100'} flex items-center justify-center mb-3`}>
              <Warning size={32} className={textMuted} />
            </div>
            <p className={text}>No open orders</p>
          </div>
        )}

        {/* Historical Orders Tab */}
        {activeTab === "history" && (
          <div className="p-4 space-y-3">
            {/* Date Range Filter - Styled like reference */}
            <div className="flex gap-2 mb-4">
              <div className="flex-1 flex items-center gap-2">
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className={`flex-1 px-3 py-2.5 rounded-lg text-sm ${inputBg} ${text} border ${border}`}
                  data-testid="history-start-date"
                />
                <span className={textMuted}>
                  <ArrowsLeftRight size={16} />
                </span>
              </div>
              <div className="flex-1">
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className={`w-full px-3 py-2.5 rounded-lg text-sm ${inputBg} ${text} border ${border}`}
                  data-testid="history-end-date"
                />
              </div>
            </div>

            {historyLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[#00E5FF]"></div>
              </div>
            ) : tradeHistory.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8">
                <ClockCounterClockwise size={48} className={textMuted} />
                <p className={`${text} mt-3`}>No trade history</p>
                <p className={`text-xs ${textMuted}`}>Your completed trades will appear here</p>
              </div>
            ) : (
              <div className="space-y-3">
                {tradeHistory.map((trade, index) => (
                  <div 
                    key={trade.id || index} 
                    className={`${cardBg} rounded-xl border ${border} overflow-hidden`}
                    data-testid={`history-item-${index}`}
                  >
                    {/* Header with Status Badge */}
                    <div className={`flex items-center justify-between px-4 py-2.5 ${isDark ? 'bg-[#0B0E11]' : 'bg-gray-50'} border-b ${border}`}>
                      <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                        trade.is_profit ? 'bg-[#0ECB81] text-white' : 'bg-[#F6465D] text-white'
                      }`}>
                        {trade.is_profit ? 'SUCCESS' : 'LOSS'}
                      </span>
                      <span className={`text-xs ${textMuted}`}>{trade.date}</span>
                    </div>

                    {/* Trade Details */}
                    <div className="p-4 space-y-2">
                      <div className="flex justify-between items-center">
                        <span className={`text-sm ${textMuted}`}>Product</span>
                        <span className={`text-sm font-semibold ${text}`}>{trade.product}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className={`text-sm ${textMuted}`}>Direction</span>
                        <span className={`text-sm font-bold ${
                          trade.direction === 'CALL' || trade.direction === 'BUY' 
                            ? 'text-[#0ECB81]' 
                            : 'text-[#F6465D]'
                        }`}>
                          {trade.direction}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className={`text-sm ${textMuted}`}>Time Period</span>
                        <span className={`text-sm ${text}`}>{trade.time_period}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className={`text-sm ${textMuted}`}>Amount</span>
                        <span className={`text-sm ${text}`}>{trade.amount} USDT</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className={`text-sm ${textMuted}`}>Open Price</span>
                        <span className={`text-sm font-medium ${text}`}>
                          ${trade.open_price ? trade.open_price.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 6}) : '0.00'}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className={`text-sm ${textMuted}`}>Settlement Price</span>
                        <span className={`text-sm font-medium ${text}`}>
                          ${trade.settlement_price ? trade.settlement_price.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 6}) : '0.00'}
                        </span>
                      </div>
                      
                      {/* Profit Section */}
                      <div className={`pt-2 mt-2 border-t border-dashed ${border}`}>
                        <div className="flex justify-between items-center">
                          <span className={`text-sm ${textMuted}`}>Profit/Loss</span>
                          <span className={`text-lg font-bold ${trade.is_profit ? 'text-[#0ECB81]' : 'text-[#F6465D]'}`}>
                            {trade.is_profit ? '+' : ''}{trade.profit_loss?.toFixed(2)} USDT
                          </span>
                        </div>
                        <div className="flex justify-between items-center mt-1">
                          <span className={`text-sm ${textMuted}`}>Rate of Return</span>
                          <span className={`text-sm font-bold ${trade.is_profit ? 'text-[#0ECB81]' : 'text-[#F6465D]'}`}>
                            {trade.rate_of_return?.toFixed(2)}%
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Bottom Navigation */}
      <BottomNav />
    </div>
  );
};

export default FuturesPage;
