import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTheme, API } from "../App";
import axios from "axios";
import { 
  CaretLeft, 
  Copy, 
  CheckCircle, 
  Warning,
  QrCode,
  Share,
  CaretDown,
  Wallet,
  Eye,
  EyeSlash
} from "@phosphor-icons/react";
import { Button } from "../components/ui/button";
import { toast } from "sonner";
import QRCode from "react-qr-code";

// Admin Deposit Addresses - Reordered as per user preference
const DEPOSIT_NETWORKS = [
  {
    id: "trc20",
    name: "TRON (TRC20)",
    shortName: "TRX/TRC20",
    address: "TDqncKUgq4PpCpfZwsXeupQ5SnRKEsG9qV",
    icon: "https://assets.coingecko.com/coins/images/1094/small/tron-logo.png",
    color: "#FF0013",
    warning: "Only send TRX/TRC20 tokens to this address",
    coins: ["TRX", "USDT"]
  },
  {
    id: "erc20",
    name: "Ethereum (ERC20)",
    shortName: "ETH/ERC20",
    address: "0x189aEFFDf472b34450A7623e8F032D5A4AC256A2",
    icon: "https://assets.coingecko.com/coins/images/279/small/ethereum.png",
    color: "#627EEA",
    warning: "Only send ETH/ERC20 tokens to this address",
    coins: ["ETH", "USDT", "USDC", "DAI"]
  },
  {
    id: "solana",
    name: "Solana",
    shortName: "SOL",
    address: "6FQY4KqjyBUELJynQZXfgcC2zseURQQASBY5rJsSUHmR",
    icon: "https://assets.coingecko.com/coins/images/4128/small/solana.png",
    color: "#9945FF",
    warning: "Only send Solana tokens to this address",
    coins: ["SOL", "USDT", "USDC"]
  },
  {
    id: "bep20",
    name: "BNB Smart Chain (BEP20)",
    shortName: "BSC/BEP20",
    address: "0x189aEFFDf472b34450A7623e8F032D5A4AC256A2",
    icon: "https://assets.coingecko.com/coins/images/825/small/bnb-icon2_2x.png",
    color: "#F0B90B",
    warning: "Only send BSC/BEP20 tokens to this address",
    coins: ["BNB", "USDT", "BUSD"]
  },
  {
    id: "polygon",
    name: "Polygon",
    shortName: "MATIC",
    address: "0x189aEFFDf472b34450A7623e8F032D5A4AC256A2",
    icon: "https://assets.coingecko.com/coins/images/4713/small/polygon.png",
    color: "#8247E5",
    warning: "Only send Polygon tokens to this address",
    coins: ["MATIC", "USDT", "USDC"]
  }
];

const DepositPage = () => {
  const { isDark } = useTheme();
  const navigate = useNavigate();
  const [selectedNetwork, setSelectedNetwork] = useState(DEPOSIT_NETWORKS[0]);
  const [showNetworkSelect, setShowNetworkSelect] = useState(false);
  const [copied, setCopied] = useState(false);
  const [wallet, setWallet] = useState(null);
  const [showBalance, setShowBalance] = useState(true);

  const bg = isDark ? 'bg-[#0B0E11]' : 'bg-gray-50';
  const cardBg = isDark ? 'bg-[#1E2329]' : 'bg-white';
  const text = isDark ? 'text-white' : 'text-gray-900';
  const textMuted = isDark ? 'text-[#848E9C]' : 'text-gray-500';
  const border = isDark ? 'border-[#2B3139]' : 'border-gray-200';

  // Fetch wallet balance
  useEffect(() => {
    const fetchWallet = async () => {
      try {
        const response = await axios.get(`${API}/wallet`, { withCredentials: true });
        setWallet(response.data);
      } catch (error) {
        console.error("Error fetching wallet:", error);
      }
    };
    fetchWallet();
  }, []);

  // Calculate total balance
  const totalBalance = wallet ? (wallet.balances?.usdt || 0) : 0;

  const copyAddress = () => {
    navigator.clipboard.writeText(selectedNetwork.address);
    setCopied(true);
    toast.success("Address copied!");
    setTimeout(() => setCopied(false), 2000);
  };

  const shareAddress = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${selectedNetwork.shortName} Deposit Address`,
          text: selectedNetwork.address
        });
      } catch (err) {
        copyAddress();
      }
    } else {
      copyAddress();
    }
  };

  return (
    <div className={`min-h-screen ${bg}`}>
      {/* Header */}
      <div className={`sticky top-0 z-50 ${cardBg} border-b ${border}`}>
        <div className="flex items-center justify-between px-4 py-4">
          <button onClick={() => navigate(-1)} className="p-2 -ml-2">
            <CaretLeft size={24} className={text} />
          </button>
          <h1 className={`font-bold text-lg ${text}`}>Deposit</h1>
          <div className="w-8"></div>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Balance Card - First */}
        <div className={`${cardBg} rounded-xl p-4 border ${border}`}>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Wallet size={20} className="text-[#F0B90B]" />
              <span className={`text-sm ${textMuted}`}>Available Balance</span>
            </div>
            <button onClick={() => setShowBalance(!showBalance)}>
              {showBalance ? <Eye size={18} className={textMuted} /> : <EyeSlash size={18} className={textMuted} />}
            </button>
          </div>
          <div className="flex items-baseline gap-2">
            <span className={`text-3xl font-bold ${text}`}>
              {showBalance ? `$${totalBalance.toFixed(2)}` : '****'}
            </span>
            <span className="text-[#0ECB81] text-sm">USDT</span>
          </div>
        </div>

        {/* Network Selector */}
        <div className={`${cardBg} rounded-xl p-4 border ${border}`}>
          <label className={`text-sm ${textMuted} mb-2 block`}>Select Network</label>
          <button
            onClick={() => setShowNetworkSelect(!showNetworkSelect)}
            className={`w-full flex items-center justify-between p-3 rounded-lg border ${border} ${isDark ? 'bg-[#0B0E11]' : 'bg-gray-50'}`}
          >
            <div className="flex items-center gap-3">
              <img src={selectedNetwork.icon} alt={selectedNetwork.name} className="w-8 h-8 rounded-full" />
              <div className="text-left">
                <p className={`font-medium ${text}`}>{selectedNetwork.name}</p>
                <p className={`text-xs ${textMuted}`}>{selectedNetwork.coins.join(", ")}</p>
              </div>
            </div>
            <CaretDown size={20} className={`${textMuted} transition-transform ${showNetworkSelect ? 'rotate-180' : ''}`} />
          </button>

          {/* Network Dropdown */}
          {showNetworkSelect && (
            <div className={`mt-2 rounded-lg border ${border} overflow-hidden`}>
              {DEPOSIT_NETWORKS.map((network) => (
                <button
                  key={network.id}
                  onClick={() => {
                    setSelectedNetwork(network);
                    setShowNetworkSelect(false);
                  }}
                  className={`w-full flex items-center gap-3 p-3 ${isDark ? 'hover:bg-[#2B3139]' : 'hover:bg-gray-100'} transition-colors ${
                    selectedNetwork.id === network.id ? (isDark ? 'bg-[#2B3139]' : 'bg-gray-100') : ''
                  }`}
                >
                  <img src={network.icon} alt={network.name} className="w-8 h-8 rounded-full" />
                  <div className="text-left flex-1">
                    <p className={`font-medium ${text}`}>{network.name}</p>
                    <p className={`text-xs ${textMuted}`}>{network.coins.join(", ")}</p>
                  </div>
                  {selectedNetwork.id === network.id && (
                    <CheckCircle size={20} className="text-[#0ECB81]" weight="fill" />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Warning */}
        <div className="bg-[#FEF3CD] rounded-xl p-4 flex items-start gap-3">
          <Warning size={24} className="text-[#856404] flex-shrink-0 mt-0.5" weight="fill" />
          <p className="text-[#856404] text-sm font-medium">
            {selectedNetwork.warning}. Sending other tokens may result in permanent loss.
          </p>
        </div>

        {/* QR Code Card */}
        <div className={`${cardBg} rounded-xl p-6 border ${border}`}>
          {/* QR Code */}
          <div className="flex justify-center mb-6">
            <div className="bg-white p-4 rounded-xl">
              <QRCode 
                value={selectedNetwork.address} 
                size={200}
                level="H"
                style={{ height: "auto", maxWidth: "100%", width: "100%" }}
              />
            </div>
          </div>

          {/* Network Badge */}
          <div className="flex justify-center mb-4">
            <div 
              className="flex items-center gap-2 px-3 py-1.5 rounded-full"
              style={{ backgroundColor: `${selectedNetwork.color}20` }}
            >
              <img src={selectedNetwork.icon} alt={selectedNetwork.name} className="w-5 h-5 rounded-full" />
              <span style={{ color: selectedNetwork.color }} className="font-medium text-sm">
                {selectedNetwork.shortName}
              </span>
            </div>
          </div>

          {/* Address */}
          <div className="text-center mb-4">
            <p className={`text-xs ${textMuted} mb-2`}>Deposit Address</p>
            <p className={`font-mono text-sm ${text} break-all px-2`}>
              {selectedNetwork.address}
            </p>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-3 gap-3">
            <Button
              variant="outline"
              onClick={shareAddress}
              className={`flex flex-col items-center gap-1 h-auto py-3 ${border}`}
            >
              <Share size={20} className={textMuted} />
              <span className={`text-xs ${textMuted}`}>Share</span>
            </Button>
            <Button
              variant="outline"
              onClick={copyAddress}
              className={`flex flex-col items-center gap-1 h-auto py-3 ${border}`}
            >
              {copied ? (
                <CheckCircle size={20} className="text-[#0ECB81]" />
              ) : (
                <Copy size={20} className={textMuted} />
              )}
              <span className={`text-xs ${copied ? 'text-[#0ECB81]' : textMuted}`}>
                {copied ? 'Copied!' : 'Copy'}
              </span>
            </Button>
            <Button
              variant="outline"
              onClick={() => toast.info("Scan QR code to deposit")}
              className={`flex flex-col items-center gap-1 h-auto py-3 ${border}`}
            >
              <QrCode size={20} className={textMuted} />
              <span className={`text-xs ${textMuted}`}>QR Code</span>
            </Button>
          </div>
        </div>

        {/* Instructions */}
        <div className={`${cardBg} rounded-xl p-4 border ${border}`}>
          <h3 className={`font-bold mb-3 ${text}`}>Deposit Instructions</h3>
          <ul className={`space-y-2 text-sm ${textMuted}`}>
            <li className="flex items-start gap-2">
              <span className="text-[#F0B90B] font-bold">1.</span>
              <span>Copy the deposit address or scan QR code</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-[#F0B90B] font-bold">2.</span>
              <span>Send {selectedNetwork.coins.join("/")} from your wallet</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-[#F0B90B] font-bold">3.</span>
              <span>Wait for network confirmation (10-30 mins)</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-[#F0B90B] font-bold">4.</span>
              <span>Your balance will be credited automatically</span>
            </li>
          </ul>
        </div>

        {/* Min Deposit */}
        <div className={`${cardBg} rounded-xl p-4 border ${border}`}>
          <div className="flex justify-between items-center">
            <span className={textMuted}>Minimum Deposit</span>
            <span className={`font-medium ${text}`}>$50.00</span>
          </div>
          <div className="flex justify-between items-center mt-2">
            <span className={textMuted}>Network Fee</span>
            <span className="text-[#0ECB81] font-medium">FREE</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DepositPage;
