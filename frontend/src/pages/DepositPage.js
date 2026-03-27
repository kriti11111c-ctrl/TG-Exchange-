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
  Wallet
} from "@phosphor-icons/react";
import { Button } from "../components/ui/button";
import { toast } from "sonner";

// Network configurations with admin wallet addresses
const NETWORKS = [
  { 
    id: "bep20", 
    name: "BNB Smart Chain (BEP20)", 
    shortName: "BSC",
    address: "0x189aEFFDf472b34450A7623e8F032D5A4AC256A2",
    icon: "https://cryptologos.cc/logos/bnb-bnb-logo.png",
    color: "#F0B90B"
  },
  { 
    id: "trc20", 
    name: "TRON (TRC20)", 
    shortName: "TRC20",
    address: "TDqncKUgq4PpCpfZwsXeupQ5SnRKEsG9qV",
    icon: "https://cryptologos.cc/logos/tron-trx-logo.png",
    color: "#FF0013"
  },
  { 
    id: "erc20", 
    name: "Ethereum (ERC20)", 
    shortName: "ERC20",
    address: "0x189aEFFDf472b34450A7623e8F032D5A4AC256A2",
    icon: "https://cryptologos.cc/logos/ethereum-eth-logo.png",
    color: "#627EEA"
  },
  { 
    id: "solana", 
    name: "Solana", 
    shortName: "SOL",
    address: "6FQY4KqjyBUELJynQZXfgcC2zseURQQASBY5rJsSUHmR",
    icon: "https://cryptologos.cc/logos/solana-sol-logo.png",
    color: "#00FFA3"
  },
  { 
    id: "polygon", 
    name: "Polygon", 
    shortName: "MATIC",
    address: "0x189aEFFDf472b34450A7623e8F032D5A4AC256A2",
    icon: "https://cryptologos.cc/logos/polygon-matic-logo.png",
    color: "#8247E5"
  }
];

const AMOUNT_OPTIONS = [50, 100, 200, 300, 400, 500];

const DepositPage = () => {
  const { isDark } = useTheme();
  const navigate = useNavigate();
  const [step, setStep] = useState(1); // 1: Select Amount, 2: Show Address & Submit
  const [selectedAmount, setSelectedAmount] = useState(null);
  const [selectedNetwork, setSelectedNetwork] = useState(NETWORKS[0]);
  const [showNetworkSelect, setShowNetworkSelect] = useState(false);
  const [txHash, setTxHash] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [copied, setCopied] = useState(false);
  const [wallet, setWallet] = useState(null);

  const bg = isDark ? 'bg-[#0B0E11]' : 'bg-gray-50';
  const cardBg = isDark ? 'bg-[#1E2329]' : 'bg-white';
  const text = isDark ? 'text-white' : 'text-gray-900';
  const textMuted = isDark ? 'text-[#848E9C]' : 'text-gray-500';
  const border = isDark ? 'border-[#2B3139]' : 'border-gray-200';

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
  }, []);

  const copyAddress = () => {
    navigator.clipboard.writeText(selectedNetwork.address);
    setCopied(true);
    toast.success("Address copied!");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleAmountSelect = (amount) => {
    setSelectedAmount(amount);
    setStep(2);
  };

  const handleSubmit = async () => {
    if (!txHash || txHash.trim().length < 10) {
      toast.error("Please enter a valid transaction hash");
      return;
    }

    setSubmitting(true);
    try {
      const response = await axios.post(`${API}/user/deposit-request`, {
        network: selectedNetwork.id,
        coin: "USDT",
        amount: selectedAmount,
        tx_hash: txHash.trim()
      }, { withCredentials: true });

      if (response.data.blockchain_verified) {
        toast.success(`✅ Verified! $${response.data.amount_credited} USDT credited!`);
      } else {
        toast.success("Deposit submitted! Verifying...");
      }
      
      // Reset and go back
      setStep(1);
      setSelectedAmount(null);
      setTxHash("");
      
      // Refresh wallet
      const walletRes = await axios.get(`${API}/wallet`, { withCredentials: true });
      setWallet(walletRes.data);
      
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to submit deposit");
    } finally {
      setSubmitting(false);
    }
  };

  const totalBalance = wallet?.balances?.usdt || 0;

  return (
    <div className={`min-h-screen ${bg} pb-20`}>
      {/* Header */}
      <div className={`${cardBg} border-b ${border} sticky top-0 z-40`}>
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => step === 2 ? setStep(1) : navigate(-1)} 
              className={`p-2 rounded-lg ${isDark ? 'hover:bg-[#2B3139]' : 'hover:bg-gray-100'}`}
            >
              <ArrowLeft size={24} className={text} />
            </button>
            <h1 className={`text-xl font-bold ${text}`}>Deposit</h1>
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto p-4 space-y-4">
        {/* Balance Card */}
        <div className={`${cardBg} rounded-xl p-4 border ${border}`}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#0ECB81]/20 flex items-center justify-center">
              <Wallet size={20} className="text-[#0ECB81]" />
            </div>
            <div>
              <p className={`text-sm ${textMuted}`}>Available Balance</p>
              <p className={`text-xl font-bold ${text}`}>${totalBalance.toFixed(2)} USDT</p>
            </div>
          </div>
        </div>

        {/* Network Selection */}
        <div className={`${cardBg} rounded-xl p-4 border ${border}`}>
          <p className={`text-sm ${textMuted} mb-2`}>Select Network</p>
          <button
            onClick={() => setShowNetworkSelect(!showNetworkSelect)}
            className={`w-full flex items-center justify-between p-3 rounded-lg border ${border} ${isDark ? 'bg-[#0B0E11]' : 'bg-gray-50'}`}
          >
            <div className="flex items-center gap-3">
              <img src={selectedNetwork.icon} alt="" className="w-6 h-6 rounded-full" />
              <span className={text}>{selectedNetwork.name}</span>
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
                  className={`w-full flex items-center gap-3 p-3 ${isDark ? 'hover:bg-[#2B3139]' : 'hover:bg-gray-100'} ${selectedNetwork.id === network.id ? (isDark ? 'bg-[#2B3139]' : 'bg-gray-100') : ''}`}
                >
                  <img src={network.icon} alt="" className="w-6 h-6 rounded-full" />
                  <span className={text}>{network.name}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Step 1: Select Amount */}
        {step === 1 && (
          <div className={`${cardBg} rounded-xl p-4 border ${border}`}>
            <p className={`text-sm ${textMuted} mb-4`}>Select Deposit Amount (USDT)</p>
            <div className="grid grid-cols-3 gap-3">
              {AMOUNT_OPTIONS.map((amount) => (
                <button
                  key={amount}
                  onClick={() => handleAmountSelect(amount)}
                  className={`py-4 rounded-xl font-bold text-lg transition-all border-2 ${
                    selectedAmount === amount
                      ? 'bg-[#F0B90B] border-[#F0B90B] text-black'
                      : `${isDark ? 'bg-[#2B3139] border-[#2B3139] hover:border-[#F0B90B]' : 'bg-gray-100 border-gray-200 hover:border-[#F0B90B]'} ${text}`
                  }`}
                >
                  ${amount}
                </button>
              ))}
            </div>
            <p className={`text-xs ${textMuted} mt-3 text-center`}>
              Minimum deposit: $50 USDT
            </p>
          </div>
        )}

        {/* Step 2: Show Address & Submit */}
        {step === 2 && selectedAmount && (
          <>
            {/* Selected Amount */}
            <div className={`${cardBg} rounded-xl p-4 border-2 border-[#F0B90B]`}>
              <div className="text-center">
                <p className={`text-sm ${textMuted}`}>Deposit Amount</p>
                <p className="text-3xl font-bold text-[#F0B90B]">${selectedAmount} USDT</p>
              </div>
            </div>

            {/* QR Code & Address */}
            <div className={`${cardBg} rounded-xl p-6 border ${border}`}>
              {/* QR Code */}
              <div className="flex justify-center mb-4">
                <div className="bg-white p-3 rounded-xl">
                  <QRCode 
                    value={selectedNetwork.address} 
                    size={180}
                    level="H"
                  />
                </div>
              </div>

              {/* Network Badge */}
              <div className="flex justify-center mb-3">
                <div 
                  className="flex items-center gap-2 px-3 py-1.5 rounded-full"
                  style={{ backgroundColor: `${selectedNetwork.color}20` }}
                >
                  <img src={selectedNetwork.icon} alt="" className="w-5 h-5 rounded-full" />
                  <span style={{ color: selectedNetwork.color }} className="font-medium text-sm">
                    {selectedNetwork.shortName}
                  </span>
                </div>
              </div>

              {/* Address */}
              <div className="text-center mb-4">
                <p className={`text-xs ${textMuted} mb-2`}>Deposit Address</p>
                <p className={`font-mono text-sm ${text} break-all px-2 mb-3`}>
                  {selectedNetwork.address}
                </p>
                <Button
                  onClick={copyAddress}
                  variant="outline"
                  className={`${border} ${text}`}
                >
                  {copied ? <CheckCircle size={18} className="text-green-500" /> : <Copy size={18} />}
                  <span className="ml-2">{copied ? "Copied!" : "Copy Address"}</span>
                </Button>
              </div>
            </div>

            {/* Transaction Hash Input */}
            <div className={`${cardBg} rounded-xl p-4 border ${border}`}>
              <p className={`text-sm ${textMuted} mb-2`}>Transaction Hash</p>
              <input
                type="text"
                value={txHash}
                onChange={(e) => setTxHash(e.target.value)}
                placeholder="Paste your transaction hash here"
                className={`w-full p-4 rounded-lg border ${border} ${isDark ? 'bg-[#0B0E11] text-white' : 'bg-gray-50 text-gray-900'} font-mono text-sm`}
                data-testid="deposit-tx-hash-input"
              />
              <p className={`text-xs ${textMuted} mt-2`}>
                After sending USDT, paste the transaction hash from your wallet
              </p>
            </div>

            {/* Submit Button */}
            <Button
              onClick={handleSubmit}
              disabled={submitting || !txHash.trim()}
              className={`w-full py-6 font-bold text-lg ${
                txHash.trim() 
                  ? 'bg-[#F0B90B] hover:bg-[#E5AF0A] text-black' 
                  : 'bg-gray-600 text-gray-400 cursor-not-allowed'
              }`}
              data-testid="submit-deposit-btn"
            >
              {submitting ? "Verifying..." : "Submit & Verify Deposit"}
            </Button>

            {/* Info */}
            <p className={`text-xs ${textMuted} text-center`}>
              System will automatically verify your transaction on blockchain
            </p>
          </>
        )}
      </div>
    </div>
  );
};

export default DepositPage;
