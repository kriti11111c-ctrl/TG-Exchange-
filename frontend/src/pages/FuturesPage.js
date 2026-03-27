import { useState, useEffect, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useTheme, API } from "../App";
import axios from "axios";
import { toast } from "sonner";
import BottomNav from "../components/BottomNav";
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
  TrendDown
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
  const [currentPrice, setCurrentPrice] = useState(67850);
  const [positions, setPositions] = useState([]);
  const [showChart, setShowChart] = useState(true);

  const bg = isDark ? 'bg-[#0B0E11]' : 'bg-gray-50';
  const cardBg = isDark ? 'bg-[#1E2329]' : 'bg-white';
  const text = isDark ? 'text-white' : 'text-gray-900';
  const textMuted = isDark ? 'text-[#848E9C]' : 'text-gray-500';
  const border = isDark ? 'border-[#2B3139]' : 'border-gray-200';
  const inputBg = isDark ? 'bg-[#0B0E11]' : 'bg-gray-100';

  useEffect(() => {
    const fetchWallet = async () => {
      try {
        const res = await axios.get(`${API}/wallet`, { withCredentials: true });
        setWallet(res.data);
      } catch (error) {
        console.error("Error fetching wallet:", error);
      }
    };
    fetchWallet();

    // Simulate price updates
    const interval = setInterval(() => {
      setCurrentPrice(prev => prev + (Math.random() - 0.5) * 100);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const tabs = [
    { id: "positions", label: "Positions", count: positions.length },
    { id: "orders", label: "Open Orders", count: 0 },
    { id: "bots", label: "Bots", count: null }
  ];

  const leverageOptions = [1, 2, 5, 10, 20, 50, 75, 100, 125];

  const handleTrade = (side) => {
    if (!amount || parseFloat(amount) <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }
    
    const tradeAmount = parseFloat(amount);
    const tradePrice = orderType === "market" ? currentPrice : parseFloat(price);
    
    // Add to positions
    const newPosition = {
      id: Date.now(),
      coin: selectedCoin,
      side: side,
      size: tradeAmount,
      entryPrice: tradePrice,
      leverage: leverage,
      pnl: 0,
      pnlPercent: 0,
      liquidationPrice: side === "long" 
        ? tradePrice * (1 - 1/leverage) 
        : tradePrice * (1 + 1/leverage),
      margin: (tradeAmount * tradePrice) / leverage,
      timestamp: new Date().toISOString()
    };
    
    setPositions(prev => [...prev, newPosition]);
    setAmount("");
    toast.success(`${side.toUpperCase()} ${tradeAmount} ${selectedCoin} @ ${tradePrice.toFixed(2)}`);
  };

  const closePosition = (positionId) => {
    setPositions(prev => prev.filter(p => p.id !== positionId));
    toast.success("Position closed");
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
          <div className="h-48 px-3 pb-3">
            {/* Simple chart placeholder with price line */}
            <div className={`h-full rounded-lg ${isDark ? 'bg-[#0B0E11]' : 'bg-gray-100'} relative overflow-hidden`}>
              <svg className="w-full h-full">
                <defs>
                  <linearGradient id="chartGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#0ECB81" stopOpacity="0.3"/>
                    <stop offset="100%" stopColor="#0ECB81" stopOpacity="0"/>
                  </linearGradient>
                </defs>
                <path
                  d="M0,120 Q50,100 100,80 T200,90 T300,70 T400,85 T500,60"
                  fill="none"
                  stroke="#0ECB81"
                  strokeWidth="2"
                />
                <path
                  d="M0,120 Q50,100 100,80 T200,90 T300,70 T400,85 T500,60 L500,150 L0,150 Z"
                  fill="url(#chartGradient)"
                />
              </svg>
              <div className="absolute top-2 left-2 text-xs">
                <span className="text-[#0ECB81]">+2.45%</span>
              </div>
              <div className={`absolute bottom-2 right-2 text-xs ${textMuted}`}>
                24H Vol: 1.2B USDT
              </div>
            </div>
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
        <div className="grid grid-cols-2 gap-2">
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
                  const pnl = pos.side === 'long' 
                    ? (currentPrice - pos.entryPrice) * pos.size
                    : (pos.entryPrice - currentPrice) * pos.size;
                  const pnlPercent = (pnl / pos.margin) * 100;
                  
                  return (
                    <div key={pos.id} className={`p-3 rounded-lg border ${border}`}>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                            pos.side === 'long' ? 'bg-[#0ECB81]/20 text-[#0ECB81]' : 'bg-[#F6465D]/20 text-[#F6465D]'
                          }`}>
                            {pos.side.toUpperCase()} {pos.leverage}x
                          </span>
                          <span className={`font-medium ${text}`}>{pos.coin}USDT</span>
                        </div>
                        <button 
                          onClick={() => closePosition(pos.id)}
                          className="text-xs text-[#F6465D] font-medium"
                        >
                          Close
                        </button>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-xs">
                        <div>
                          <p className={textMuted}>Size</p>
                          <p className={text}>{pos.size} {pos.coin}</p>
                        </div>
                        <div>
                          <p className={textMuted}>Entry Price</p>
                          <p className={text}>${pos.entryPrice.toFixed(2)}</p>
                        </div>
                        <div>
                          <p className={textMuted}>PNL</p>
                          <p className={pnl >= 0 ? 'text-[#0ECB81]' : 'text-[#F6465D]'}>
                            {pnl >= 0 ? '+' : ''}{pnl.toFixed(2)} ({pnlPercent.toFixed(2)}%)
                          </p>
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
