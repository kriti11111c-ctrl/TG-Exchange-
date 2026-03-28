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
  Ticket
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
  const [futuresAccount, setFuturesAccount] = useState(null);
  const [loading, setLoading] = useState(false);

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

  // Fetch real price from our backend API
  const fetchRealPrice = async () => {
    try {
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
      const [accountRes, positionsRes, walletRes] = await Promise.all([
        axios.get(`${API}/futures/account`, { withCredentials: true }),
        axios.get(`${API}/futures/positions`, { withCredentials: true }),
        axios.get(`${API}/wallet`, { withCredentials: true })
      ]);
      setFuturesAccount(accountRes.data);
      setPositions(positionsRes.data.positions || []);
      setWallet(walletRes.data);
    } catch (error) {
      console.error("Error fetching futures data:", error);
    }
  };

  useEffect(() => {
    fetchFuturesData();
    fetchRealPrice();
    
    // Update price every 10 seconds
    const interval = setInterval(fetchRealPrice, 10000);
    return () => clearInterval(interval);
  }, [selectedCoin]);

  const tabs = [
    { id: "positions", label: "Positions", count: positions.length },
    { id: "orders", label: "Open Orders", count: 0 },
    { id: "bots", label: "Bots", count: null }
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
    <div className={`min-h-screen ${bg} pb-20`}>
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
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#F0B90B]/20 text-[#F0B90B]">Perp</span>
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
        {/* Leverage Selector */}
        <div className="mb-3">
          <div className="flex items-center justify-between mb-2">
            <span className={`text-xs ${textMuted}`}>Leverage</span>
            <span className={`text-xs font-bold text-[#F0B90B]`}>{leverage}x</span>
          </div>
          <div className="flex gap-1 overflow-x-auto pb-1">
            {leverageOptions.map(lev => (
              <button
                key={lev}
                onClick={() => setLeverage(lev)}
                className={`px-3 py-1.5 rounded text-xs font-medium whitespace-nowrap ${
                  leverage === lev 
                    ? 'bg-[#F0B90B] text-black' 
                    : `${isDark ? 'bg-[#2B3139]' : 'bg-gray-100'} ${textMuted}`
                }`}
              >
                {lev}x
              </button>
            ))}
          </div>
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
                const max = (wallet?.balances?.usdt || 0) * leverage / currentPrice;
                setAmount((max * pct / 100).toFixed(4));
              }}
              className={`py-1.5 rounded text-xs ${isDark ? 'bg-[#2B3139]' : 'bg-gray-100'} ${textMuted}`}
            >
              {pct}%
            </button>
          ))}
        </div>

        {/* Available Balance */}
        <div className={`flex justify-between text-xs mb-3 ${textMuted}`}>
          <span>Available</span>
          <span>{wallet?.balances?.usdt?.toFixed(2) || '0.00'} USDT</span>
        </div>

        {/* Buy/Sell Buttons */}
        <div className="grid grid-cols-2 gap-2 mb-4">
          <Button
            onClick={() => handleTrade('long')}
            className="bg-[#0ECB81] hover:bg-[#0ECB81]/90 text-white font-bold py-5"
          >
            <TrendUp size={16} className="mr-1" />
            Long
          </Button>
          <Button
            onClick={() => handleTrade('short')}
            className="bg-[#F6465D] hover:bg-[#F6465D]/90 text-white font-bold py-5"
          >
            <TrendDown size={16} className="mr-1" />
            Short
          </Button>
        </div>

        {/* Trade Code Section */}
        <div className={`p-3 rounded-lg border ${border} ${isDark ? 'bg-[#0B0E11]' : 'bg-gray-50'}`}>
          <div className="flex items-center gap-2 mb-2">
            <Ticket size={16} className="text-[#F0B90B]" />
            <span className={`text-xs font-medium ${text}`}>Trade Code</span>
          </div>
          <div className="flex gap-2">
            <Input
              type="text"
              value={tradeCode}
              onChange={(e) => setTradeCode(e.target.value.toUpperCase())}
              placeholder="Enter admin trade code"
              className={`flex-1 text-sm ${inputBg} ${border} ${text} uppercase`}
            />
            <Button
              onClick={async () => {
                if (!tradeCode.trim()) {
                  toast.error("Please enter trade code");
                  return;
                }
                setApplyingCode(true);
                try {
                  const response = await axios.post(`${API}/trade/apply-code`, {
                    code: tradeCode
                  }, { withCredentials: true });
                  
                  if (response.data.success) {
                    toast.success(`Trade executed: ${response.data.type.toUpperCase()} ${response.data.amount} ${response.data.coin}`);
                    setTradeCode("");
                    // Refresh wallet
                    const walletRes = await axios.get(`${API}/wallet`, { withCredentials: true });
                    setWallet(walletRes.data);
                  }
                } catch (error) {
                  toast.error(error.response?.data?.detail || "Invalid trade code");
                } finally {
                  setApplyingCode(false);
                }
              }}
              disabled={applyingCode || !tradeCode.trim()}
              className="bg-[#F0B90B] hover:bg-[#E5AF0A] text-black font-medium px-4"
            >
              {applyingCode ? "..." : "Apply"}
            </Button>
          </div>
          <p className={`text-[10px] ${textMuted} mt-1`}>
            Get code from admin to execute trade instantly
          </p>
        </div>
      </div>

      {/* Tabs Header */}
      <div className={`${cardBg} border-b ${border}`}>
        <div className="flex items-center justify-between px-4">
          <div className="flex items-center gap-4">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-3 text-sm font-medium relative ${
                  activeTab === tab.id ? text : textMuted
                }`}
              >
                {tab.label} {tab.count !== null && `(${tab.count})`}
                {activeTab === tab.id && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#F0B90B]"></div>
                )}
              </button>
            ))}
          </div>
          
          <Link 
            to="/trade-history"
            className={`p-2 rounded-lg ${textMuted} ${isDark ? 'hover:bg-[#2B3139]' : 'hover:bg-gray-100'}`}
            title="History"
          >
            <ClockCounterClockwise size={20} />
          </Link>
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
                  <p className={`font-bold text-[#F0B90B]`}>{futuresAccount.win_rate?.toFixed(1) || '0'}%</p>
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

        {/* Bots Tab */}
        {activeTab === "bots" && (
          <div className="flex flex-col items-center justify-center py-8">
            <div className={`w-16 h-16 rounded-xl bg-[#F0B90B]/20 flex items-center justify-center mb-3`}>
              <Robot size={32} className="text-[#F0B90B]" />
            </div>
            <p className={text}>Trading Bots</p>
            <p className={`text-xs ${textMuted} mt-1`}>Automated trading coming soon</p>
          </div>
        )}
      </div>

      {/* Bottom Navigation */}
      <BottomNav />
    </div>
  );
};

export default FuturesPage;
