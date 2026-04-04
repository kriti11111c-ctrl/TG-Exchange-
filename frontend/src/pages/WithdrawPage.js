import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTheme, API } from "../App";
import axios from "axios";
import BottomNav from "../components/BottomNav";
import { 
  ArrowLeft, 
  Wallet,
  CaretDown,
  CheckCircle,
  Clock,
  XCircle,
  Warning
} from "@phosphor-icons/react";
import { Button } from "../components/ui/button";
import { toast } from "sonner";

const NETWORKS = [
  { id: "bep20", name: "BNB Smart Chain", shortName: "BSC (BEP20)", icon: "https://assets.coingecko.com/coins/images/825/small/bnb-icon2_2x.png", color: "#00E5FF" },
  { id: "trc20", name: "Tron Network", shortName: "TRC20", icon: "https://assets.coingecko.com/coins/images/1094/small/tron-logo.png", color: "#FF0013" },
  { id: "erc20", name: "Ethereum", shortName: "ERC20", icon: "https://assets.coingecko.com/coins/images/279/small/ethereum.png", color: "#627EEA" },
  { id: "solana", name: "Solana", shortName: "SOL", icon: "https://assets.coingecko.com/coins/images/4128/small/solana.png", color: "#00FFA3" },
  { id: "polygon", name: "Polygon", shortName: "MATIC", icon: "https://assets.coingecko.com/coins/images/4713/small/polygon.png", color: "#8247E5" }
];

const WithdrawPage = () => {
  const { isDark } = useTheme();
  const navigate = useNavigate();
  const [selectedNetwork, setSelectedNetwork] = useState(NETWORKS[0]);
  const [showNetworkSelect, setShowNetworkSelect] = useState(false);
  const [wallet, setWallet] = useState(null);
  const [amount, setAmount] = useState("");
  const [walletAddress, setWalletAddress] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [withdrawalRequests, setWithdrawalRequests] = useState([]);
  
  // Success screen state
  const [showSuccess, setShowSuccess] = useState(false);
  const [successData, setSuccessData] = useState(null);

  const bg = isDark ? 'bg-[#0B0E11]' : 'bg-gray-50';
  const cardBg = isDark ? 'bg-[#1E2329]' : 'bg-white';
  const text = isDark ? 'text-white' : 'text-gray-900';
  const textMuted = isDark ? 'text-[#848E9C]' : 'text-gray-500';
  const border = isDark ? 'border-[#2B3139]' : 'border-gray-200';

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [walletRes, requestsRes] = await Promise.all([
          axios.get(`${API}/wallet`, { withCredentials: true }),
          axios.get(`${API}/user/withdraw-requests`, { withCredentials: true })
        ]);
        setWallet(walletRes.data);
        setWithdrawalRequests(requestsRes.data.requests || []);
      } catch (error) {
        console.error("Error fetching data:", error);
      }
    };
    fetchData();
  }, []);

  const usdtBalance = wallet?.balances?.usdt || 0;

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!amount || parseFloat(amount) < 10) {
      toast.error("Minimum withdrawal is $10");
      return;
    }

    if (parseFloat(amount) > usdtBalance) {
      toast.error(`Insufficient balance. Available: $${usdtBalance.toFixed(2)}`);
      return;
    }

    if (!walletAddress || walletAddress.length < 20) {
      toast.error("Please enter a valid wallet address");
      return;
    }

    setSubmitting(true);
    try {
      const response = await axios.post(`${API}/user/withdraw-request`, {
        network: selectedNetwork.id,
        coin: "USDT",
        amount: parseFloat(amount),
        wallet_address: walletAddress
      }, { withCredentials: true });

      // Show success screen with data
      setSuccessData({
        amount: parseFloat(amount),
        fee: parseFloat(amount) * 0.10,
        netAmount: parseFloat(amount) * 0.90,
        network: selectedNetwork.shortName,
        address: walletAddress,
        date: new Date().toLocaleString(),
        requestId: response.data.request_id || `WD${Date.now()}`
      });
      setShowSuccess(true);
      
      setAmount("");
      setWalletAddress("");
      
      // Refresh requests
      const res = await axios.get(`${API}/user/withdraw-requests`, { withCredentials: true });
      setWithdrawalRequests(res.data.requests || []);
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to submit request");
    } finally {
      setSubmitting(false);
    }
  };

  const setMaxAmount = () => {
    setAmount(usdtBalance.toString());
  };

  const getStatusBadge = (status) => {
    const styles = {
      pending: "bg-yellow-500/20 text-yellow-400",
      approved: "bg-green-500/20 text-green-400",
      rejected: "bg-red-500/20 text-red-400"
    };
    return styles[status] || "bg-gray-500/20 text-gray-400";
  };

  const getStatusIcon = (status) => {
    if (status === "approved") return <CheckCircle size={16} className="text-green-400" />;
    if (status === "rejected") return <XCircle size={16} className="text-red-400" />;
    return <Clock size={16} className="text-yellow-400" />;
  };

  // Withdrawal Success Screen (Binance style)
  if (showSuccess && successData) {
    return (
      <div className={`min-h-screen ${bg} pb-20`}>
        {/* Header */}
        <div className={`${cardBg} border-b ${border} sticky top-0 z-40`}>
          <div className="flex items-center justify-between p-4">
            <div className="flex items-center gap-3">
              <button onClick={() => setShowSuccess(false)} className={`p-2 rounded-lg ${isDark ? 'hover:bg-[#2B3139]' : 'hover:bg-gray-100'}`}>
                <ArrowLeft size={24} className={text} />
              </button>
              <h1 className={`text-xl font-bold ${text}`}>Withdrawal</h1>
            </div>
          </div>
        </div>

        <div className="max-w-lg mx-auto p-4">
          {/* Success Card */}
          <div className={`${cardBg} rounded-2xl p-6 border ${border} text-center`}>
            {/* Amount */}
            <p className="text-[#F6465D] text-3xl font-bold mb-2">
              -{successData.amount.toFixed(2)} USDT
            </p>
            
            {/* Status */}
            <div className="flex items-center justify-center gap-2 mb-4">
              <CheckCircle size={24} weight="fill" className="text-[#0ECB81]" />
              <span className="text-[#0ECB81] font-semibold text-lg">Successful</span>
            </div>

            {/* Divider */}
            <div className={`border-t ${border} my-4`}></div>

            {/* Transaction Details */}
            <div className="space-y-3 text-left">
              <div className="flex justify-between">
                <span className={textMuted}>Network</span>
                <span className={`font-medium ${text}`}>{successData.network}</span>
              </div>
              
              <div className="flex justify-between">
                <span className={textMuted}>Address</span>
                <span className={`font-mono text-sm ${text} max-w-[180px] truncate`}>{successData.address}</span>
              </div>
              
              <div className="flex justify-between">
                <span className={textMuted}>Amount</span>
                <span className={`font-medium ${text}`}>{successData.amount.toFixed(2)} USDT</span>
              </div>
              
              <div className="flex justify-between">
                <span className={textMuted}>Fee (10%)</span>
                <span className="text-[#F6465D] font-medium">{successData.fee.toFixed(2)} USDT</span>
              </div>
              
              <div className="flex justify-between">
                <span className={textMuted}>You Receive</span>
                <span className="text-[#0ECB81] font-bold">{successData.netAmount.toFixed(2)} USDT</span>
              </div>
              
              <div className="flex justify-between">
                <span className={textMuted}>Date</span>
                <span className={`text-sm ${text}`}>{successData.date}</span>
              </div>
              
              <div className="flex justify-between">
                <span className={textMuted}>Request ID</span>
                <span className={`font-mono text-xs ${text}`}>{successData.requestId}</span>
              </div>
            </div>

            {/* Done Button */}
            <Button
              onClick={() => setShowSuccess(false)}
              className="w-full mt-6 py-4 bg-[#00E5FF] hover:bg-[#00E5FF]/80 text-black font-bold"
            >
              Done
            </Button>
          </div>
        </div>

        <BottomNav />
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${bg} pb-20`}>
      {/* Header */}
      <div className={`${cardBg} border-b ${border} sticky top-0 z-40`}>
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate(-1)} className={`p-2 rounded-lg ${isDark ? 'hover:bg-[#2B3139]' : 'hover:bg-gray-100'}`}>
              <ArrowLeft size={24} className={text} />
            </button>
            <h1 className={`text-xl font-bold ${text}`}>Withdraw</h1>
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto p-4 space-y-4">
        {/* Balance Card */}
        <div className={`${cardBg} rounded-xl p-4 border ${border}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[#0ECB81]/20 flex items-center justify-center">
                <Wallet size={20} className="text-[#0ECB81]" />
              </div>
              <div>
                <p className={`text-sm ${textMuted}`}>Available Balance</p>
                <p className={`text-xl font-bold ${text}`}>${usdtBalance.toFixed(2)} USDT</p>
              </div>
            </div>
          </div>
        </div>

        {/* Network Selection */}
        <div className={`${cardBg} rounded-xl p-4 border ${border}`}>
          <p className={`text-sm ${textMuted} mb-2`}>Select Network</p>
          <button
            onClick={() => setShowNetworkSelect(!showNetworkSelect)}
            className={`w-full flex items-center justify-between p-3 rounded-lg border-2 ${border} ${isDark ? 'bg-[#0B0E11]' : 'bg-gray-50'}`}
          >
            <div className="flex items-center gap-3">
              <div 
                className="w-8 h-8 rounded-full flex items-center justify-center"
                style={{ backgroundColor: `${selectedNetwork.color}20` }}
              >
                <img src={selectedNetwork.icon} alt={selectedNetwork.name} className="w-5 h-5" />
              </div>
              <span className={`font-medium ${text}`}>{selectedNetwork.shortName}</span>
            </div>
            <CaretDown size={20} className={textMuted} />
          </button>

          {showNetworkSelect && (
            <div className={`mt-2 rounded-lg border ${border} overflow-hidden`}>
              {NETWORKS.map((network) => (
                <button
                  key={network.id}
                  onClick={() => {
                    setSelectedNetwork(network);
                    setShowNetworkSelect(false);
                  }}
                  className={`w-full flex items-center gap-3 p-4 border-b last:border-b-0 ${border} ${isDark ? 'hover:bg-[#2B3139]' : 'hover:bg-gray-100'} ${selectedNetwork.id === network.id ? (isDark ? 'bg-[#2B3139]' : 'bg-gray-100') : ''}`}
                >
                  <div 
                    className="w-8 h-8 rounded-full flex items-center justify-center"
                    style={{ backgroundColor: `${network.color}20` }}
                  >
                    <img src={network.icon} alt={network.name} className="w-5 h-5" />
                  </div>
                  <span className={`font-medium ${text}`}>{network.name}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Withdrawal Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Amount */}
          <div className={`${cardBg} rounded-xl p-4 border ${border}`}>
            <div className="flex items-center justify-between mb-2">
              <p className={`text-sm ${textMuted}`}>Amount (USDT)</p>
              <button 
                type="button"
                onClick={setMaxAmount}
                className="text-[#00E5FF] text-sm font-medium"
              >
                MAX
              </button>
            </div>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Enter amount"
              className={`w-full p-3 rounded-lg border ${border} ${isDark ? 'bg-[#0B0E11] text-white' : 'bg-gray-50 text-gray-900'} text-xl font-bold`}
              min="10"
              step="0.01"
              data-testid="withdraw-amount-input"
            />
            <p className={`text-xs ${textMuted} mt-1`}>Minimum: $10</p>
          </div>

          {/* Wallet Address */}
          <div className={`${cardBg} rounded-xl p-4 border ${border}`}>
            <p className={`text-sm ${textMuted} mb-2`}>Your {selectedNetwork.shortName} Wallet Address</p>
            <input
              type="text"
              value={walletAddress}
              onChange={(e) => setWalletAddress(e.target.value)}
              placeholder="Enter your wallet address"
              className={`w-full p-3 rounded-lg border ${border} ${isDark ? 'bg-[#0B0E11] text-white' : 'bg-gray-50 text-gray-900'} font-mono text-sm`}
              data-testid="withdraw-address-input"
            />
            <p className={`text-xs text-[#F6465D] mt-2 flex items-center gap-1`}>
              <Warning size={14} />
              Make sure the address is correct. Wrong address = Lost funds!
            </p>
          </div>

          {/* Fee Info */}
          <div className={`${cardBg} rounded-xl p-4 border ${border}`}>
            <div className="flex justify-between items-center">
              <span className={textMuted}>Withdrawal Fee (10%)</span>
              <span className="text-[#F6465D] font-medium">
                -${amount ? (parseFloat(amount) * 0.10).toFixed(2) : '0.00'}
              </span>
            </div>
            <div className="flex justify-between items-center mt-2 pt-2 border-t border-[#2B3139]">
              <span className={`font-medium ${text}`}>You will receive</span>
              <span className="text-[#0ECB81] font-bold text-lg">
                ${amount ? (parseFloat(amount) * 0.90).toFixed(2) : '0.00'} USDT
              </span>
            </div>
          </div>

          {/* Submit Button */}
          <Button
            type="submit"
            disabled={submitting || !amount || !walletAddress}
            className="w-full py-6 bg-[#F6465D] hover:bg-[#D9304A] text-white font-bold text-lg"
            data-testid="submit-withdraw-btn"
          >
            {submitting ? "Submitting..." : "Request Withdrawal"}
          </Button>
        </form>

        {/* Recent Withdrawal Requests */}
        {withdrawalRequests.length > 0 && (
          <div className={`${cardBg} rounded-xl p-4 border ${border}`}>
            <h3 className={`font-bold mb-3 ${text}`}>Recent Withdrawals</h3>
            <div className="space-y-3">
              {withdrawalRequests.slice(0, 5).map((req) => (
                <div key={req.request_id} className={`p-3 rounded-lg border ${border} ${isDark ? 'bg-[#0B0E11]' : 'bg-gray-50'}`}>
                  <div className="flex justify-between items-center mb-2">
                    <span className={`font-semibold ${text}`}>-{req.amount} USDT</span>
                    <div className="flex items-center gap-1">
                      {getStatusIcon(req.status)}
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadge(req.status)}`}>
                        {req.status.charAt(0).toUpperCase() + req.status.slice(1)}
                      </span>
                    </div>
                  </div>
                  <div className={`text-xs ${textMuted}`}>
                    <p>Network: {req.network}</p>
                    <p className="font-mono truncate">To: {req.wallet_address}</p>
                    <p>{new Date(req.created_at).toLocaleString()}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
      
      {/* Bottom Navigation */}
      <BottomNav />
    </div>
  );
};

export default WithdrawPage;
