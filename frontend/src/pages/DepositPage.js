import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTheme, API } from "../App";
import axios from "axios";
import QRCode from "react-qr-code";
import { 
  ArrowLeft, 
  Copy,
  CheckCircle,
  CaretDown,
  Wallet,
  ShieldCheck,
  Lightning
} from "@phosphor-icons/react";
import { Button } from "../components/ui/button";
import { toast } from "sonner";
import BottomNav from "../components/BottomNav";

// Default network info (will be updated from API)
const DEFAULT_NETWORKS = [
  { id: "bsc", name: "BNB Smart Chain (BEP20)", shortName: "BSC", icon: "https://assets.coingecko.com/coins/images/825/small/bnb-icon2_2x.png", color: "#00E5FF" },
  { id: "eth", name: "Ethereum (ERC20)", shortName: "ERC20", icon: "https://assets.coingecko.com/coins/images/279/small/ethereum.png", color: "#627EEA" },
  { id: "tron", name: "TRON (TRC20)", shortName: "TRC20", icon: "https://assets.coingecko.com/coins/images/1094/small/tron-logo.png", color: "#FF0013" },
  { id: "solana", name: "Solana", shortName: "SOL", icon: "https://assets.coingecko.com/coins/images/4128/small/solana.png", color: "#00FFA3" },
  { id: "polygon", name: "Polygon", shortName: "MATIC", icon: "https://assets.coingecko.com/coins/images/4713/small/polygon.png", color: "#8247E5" }
];

const AMOUNT_OPTIONS = [50, 100, 200, 300, 400, 500];

const DepositPage = () => {
  const { isDark } = useTheme();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [selectedAmount, setSelectedAmount] = useState(null);
  const [selectedNetwork, setSelectedNetwork] = useState(DEFAULT_NETWORKS[0]);
  const [showNetworkSelect, setShowNetworkSelect] = useState(false);
  const [copied, setCopied] = useState(false);
  const [wallet, setWallet] = useState(null);
  const [loading, setLoading] = useState(false);
  
  // Unique deposit addresses from API
  const [userAddresses, setUserAddresses] = useState({});
  const [currentAddress, setCurrentAddress] = useState("");

  const bg = isDark ? 'bg-[#0B0E11]' : 'bg-gray-50';
  const cardBg = isDark ? 'bg-[#1E2329]' : 'bg-white';
  const text = isDark ? 'text-white' : 'text-gray-900';
  const textMuted = isDark ? 'text-[#848E9C]' : 'text-gray-500';
  const border = isDark ? 'border-[#2B3139]' : 'border-gray-200';

  // Fetch wallet and unique deposit addresses
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch wallet
        const walletRes = await axios.get(`${API}/wallet`, { withCredentials: true });
        setWallet(walletRes.data);
        
        // Fetch unique deposit addresses for this user
        const addressRes = await axios.get(`${API}/user/deposit-address`, { withCredentials: true });
        
        if (addressRes.data.networks) {
          // Build address map from API response
          const addrMap = {};
          addressRes.data.networks.forEach(net => {
            addrMap[net.id] = net.address;
          });
          setUserAddresses(addrMap);
          
          // Set initial address for selected network
          const netId = selectedNetwork.id.replace("bep20", "bsc").replace("erc20", "eth").replace("trc20", "tron");
          if (addrMap[netId]) {
            setCurrentAddress(addrMap[netId]);
          }
        }
      } catch (error) {
        console.error("Error fetching data:", error);
      }
    };
    
    fetchData();
  }, []);

  // Update address when network changes
  useEffect(() => {
    const netId = selectedNetwork.id.replace("bep20", "bsc").replace("erc20", "eth").replace("trc20", "tron");
    if (userAddresses[netId]) {
      setCurrentAddress(userAddresses[netId]);
    }
  }, [selectedNetwork, userAddresses]);

  const copyAddress = () => {
    if (currentAddress) {
      navigator.clipboard.writeText(currentAddress);
      setCopied(true);
      toast.success("Address copied!");
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleNetworkSelect = (network) => {
    setSelectedNetwork(network);
    setShowNetworkSelect(false);
  };

  const handleProceed = () => {
    if (!selectedAmount) {
      toast.error("Please select deposit amount");
      return;
    }
    setStep(2);
  };

  return (
    <div className={`min-h-screen ${bg} pb-20`}>
      {/* Header */}
      <div className={`${cardBg} border-b ${border} sticky top-0 z-40`}>
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <button onClick={() => step === 1 ? navigate(-1) : setStep(1)} className={`p-2 rounded-lg ${isDark ? 'hover:bg-[#2B3139]' : 'hover:bg-gray-100'}`}>
              <ArrowLeft size={24} className={text} />
            </button>
            <h1 className={`text-xl font-bold ${text}`}>Deposit</h1>
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto p-4">
        
        {/* Auto-Credit Banner */}
        <div className="bg-gradient-to-r from-green-500/20 to-emerald-500/20 border border-green-500/30 rounded-xl p-4 mb-4">
          <div className="flex items-center gap-3">
            <Lightning size={28} weight="fill" className="text-green-400" />
            <div>
              <p className="text-green-400 font-bold text-sm">Auto-Credit System Active</p>
              <p className="text-green-300 text-xs">Your deposit will be automatically credited - No transaction hash needed!</p>
            </div>
          </div>
        </div>

        {step === 1 ? (
          /* Step 1: Select Amount */
          <div className="space-y-4">
            {/* Network Selection */}
            <div className={`${cardBg} rounded-xl p-4 border ${border}`}>
              <label className={`block text-sm font-medium ${textMuted} mb-2`}>Select Network</label>
              <button
                onClick={() => setShowNetworkSelect(!showNetworkSelect)}
                className={`w-full flex items-center justify-between p-3 rounded-lg border ${border} ${isDark ? 'bg-[#0B0E11]' : 'bg-gray-50'}`}
              >
                <div className="flex items-center gap-3">
                  <img src={selectedNetwork.icon} alt="" className="w-6 h-6 rounded-full" />
                  <span className={text}>{selectedNetwork.shortName}</span>
                </div>
                <CaretDown size={20} className={textMuted} />
              </button>

              {showNetworkSelect && (
                <div className={`mt-2 rounded-lg border ${border} ${cardBg} overflow-hidden`}>
                  {DEFAULT_NETWORKS.map((network) => (
                    <button
                      key={network.id}
                      onClick={() => handleNetworkSelect(network)}
                      className={`w-full flex items-center gap-3 p-3 ${isDark ? 'hover:bg-[#2B3139]' : 'hover:bg-gray-100'} ${selectedNetwork.id === network.id ? 'bg-[#00E5FF]/10' : ''}`}
                    >
                      <img src={network.icon} alt="" className="w-6 h-6 rounded-full" />
                      <div className="text-left">
                        <p className={text}>{network.shortName}</p>
                        <p className={`text-xs ${textMuted}`}>{network.name}</p>
                      </div>
                      {selectedNetwork.id === network.id && (
                        <CheckCircle size={20} className="text-[#00E5FF] ml-auto" />
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Amount Selection */}
            <div className={`${cardBg} rounded-xl p-4 border ${border}`}>
              <label className={`block text-sm font-medium ${textMuted} mb-3`}>Select Deposit Amount (USDT)</label>
              <div className="grid grid-cols-3 gap-2">
                {AMOUNT_OPTIONS.map((amount) => (
                  <button
                    key={amount}
                    onClick={() => setSelectedAmount(amount)}
                    className={`p-3 rounded-lg border text-center font-bold transition-all ${
                      selectedAmount === amount
                        ? 'border-[#00E5FF] bg-[#00E5FF]/10 text-[#00E5FF]'
                        : `${border} ${text} hover:border-[#00E5FF]/50`
                    }`}
                  >
                    ${amount}
                  </button>
                ))}
              </div>
            </div>

            {/* Current Balance */}
            {wallet && (
              <div className={`${cardBg} rounded-xl p-4 border ${border}`}>
                <div className="flex justify-between items-center">
                  <span className={textMuted}>Current Spot Balance</span>
                  <span className={`font-bold ${text}`}>${wallet.balances?.usdt?.toFixed(2) || "0.00"} USDT</span>
                </div>
              </div>
            )}

            {/* Proceed Button */}
            <Button
              onClick={handleProceed}
              disabled={!selectedAmount}
              className="w-full py-6 bg-[#00E5FF] hover:bg-[#00E5FF]/80 text-black font-bold"
            >
              Continue to Deposit
            </Button>
          </div>
        ) : (
          /* Step 2: Show Unique Address */
          <div className="space-y-4">
            {/* Selected Amount & Network */}
            <div className={`${cardBg} rounded-xl p-4 border ${border}`}>
              <div className="flex justify-between items-center mb-2">
                <span className={textMuted}>Amount to Deposit</span>
                <span className="text-[#00E5FF] font-bold text-xl">${selectedAmount} USDT</span>
              </div>
              <div className="flex justify-between items-center">
                <span className={textMuted}>Network</span>
                <div className="flex items-center gap-2">
                  <img src={selectedNetwork.icon} alt="" className="w-5 h-5 rounded-full" />
                  <span className={text}>{selectedNetwork.shortName}</span>
                </div>
              </div>
            </div>

            {/* QR Code & Address */}
            <div className={`${cardBg} rounded-xl p-6 border ${border} text-center`}>
              <div className="bg-white p-4 rounded-xl inline-block mb-4">
                <QRCode value={currentAddress || "loading..."} size={180} />
              </div>
              
              <div className="flex items-center justify-center gap-2 mb-2">
                <ShieldCheck size={20} className="text-green-400" />
                <p className="text-green-400 font-semibold text-sm">Your Unique Deposit Address</p>
              </div>
              
              <p className={`text-xs ${textMuted} mb-3`}>
                This address is exclusively for you. Send exactly <span className="text-[#00E5FF] font-bold">${selectedAmount} USDT</span> only.
              </p>
              
              <div className={`p-3 rounded-lg ${isDark ? 'bg-[#0B0E11]' : 'bg-gray-100'} break-all mb-4`}>
                <p className={`${text} font-mono text-sm`}>{currentAddress || "Loading..."}</p>
              </div>
              
              <Button
                onClick={copyAddress}
                variant="outline"
                className={`w-full ${border} ${text} flex items-center justify-center gap-2`}
              >
                {copied ? <CheckCircle size={20} className="text-green-400" /> : <Copy size={20} />}
                {copied ? "Copied!" : "Copy Address"}
              </Button>
            </div>

            {/* Important Notice */}
            <div className={`${cardBg} rounded-xl p-4 border ${border}`}>
              <h3 className="text-yellow-400 font-bold mb-2 flex items-center gap-2">
                <Lightning size={18} weight="fill" />
                How It Works
              </h3>
              <ul className={`text-sm ${textMuted} space-y-2`}>
                <li className="flex items-start gap-2">
                  <CheckCircle size={16} className="text-green-400 mt-0.5 flex-shrink-0" />
                  Send exactly ${selectedAmount} USDT to the address above
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle size={16} className="text-green-400 mt-0.5 flex-shrink-0" />
                  Your deposit will be automatically detected
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle size={16} className="text-green-400 mt-0.5 flex-shrink-0" />
                  Balance credited within seconds - No manual verification needed!
                </li>
              </ul>
            </div>

            {/* Warning */}
            <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4">
              <p className="text-red-400 text-sm">
                <strong>Warning:</strong> Send only <strong>USDT</strong> on <strong>{selectedNetwork.name}</strong> network. 
                Sending other tokens or using wrong network may result in permanent loss.
              </p>
            </div>

            {/* Done Button */}
            <Button
              onClick={() => navigate("/wallet")}
              className="w-full py-6 bg-green-500 hover:bg-green-600 text-white font-bold"
            >
              I've Sent the Deposit
            </Button>
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
};

export default DepositPage;
