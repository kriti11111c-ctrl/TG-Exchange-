import { useState, useEffect, useCallback } from "react";
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
  Lightning,
  Clock,
  ArrowsClockwise,
  CurrencyDollar,
  ArrowSquareOut
} from "@phosphor-icons/react";
import { Button } from "../components/ui/button";
import { toast } from "sonner";
import BottomNav from "../components/BottomNav";

// Default network info (will be updated from API)
const DEFAULT_NETWORKS = [
  { id: "bsc", name: "BNB Smart Chain (BEP20)", shortName: "BSC", icon: "https://assets.coingecko.com/coins/images/825/small/bnb-icon2_2x.png", color: "#F0B90B", explorer: "https://bscscan.com/tx/" },
  { id: "eth", name: "Ethereum (ERC20)", shortName: "ERC20", icon: "https://assets.coingecko.com/coins/images/279/small/ethereum.png", color: "#627EEA", explorer: "https://etherscan.io/tx/" },
  { id: "tron", name: "TRON (TRC20)", shortName: "TRC20", icon: "https://assets.coingecko.com/coins/images/1094/small/tron-logo.png", color: "#FF0013", explorer: "https://tronscan.org/#/transaction/" },
  { id: "solana", name: "Solana", shortName: "SOL", icon: "https://assets.coingecko.com/coins/images/4128/small/solana.png", color: "#00FFA3", explorer: "https://solscan.io/tx/" },
  { id: "polygon", name: "Polygon", shortName: "MATIC", icon: "https://assets.coingecko.com/coins/images/4713/small/polygon.png", color: "#8247E5", explorer: "https://polygonscan.com/tx/" }
];

const AMOUNT_OPTIONS = [50, 100, 200, 300, 400, 500];
const COUNTDOWN_SECONDS = 60; // 1 minute wait time

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
  
  // Countdown and check deposit state
  const [countdown, setCountdown] = useState(0);
  const [countdownStarted, setCountdownStarted] = useState(false);
  const [canCheck, setCanCheck] = useState(false);
  const [checking, setChecking] = useState(false);
  const [depositHistory, setDepositHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const [autoCheckDone, setAutoCheckDone] = useState(false);
  const [depositSuccess, setDepositSuccess] = useState(false);
  const [creditedAmount, setCreditedAmount] = useState(0);

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
        
        // Fetch deposit history
        const historyRes = await axios.get(`${API}/user/deposit-history`, { withCredentials: true });
        if (historyRes.data.history) {
          setDepositHistory(historyRes.data.history);
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

  // Countdown timer - only runs when countdownStarted is true
  useEffect(() => {
    if (countdownStarted && countdown > 0) {
      const timer = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            setCanCheck(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [countdownStarted, countdown]);

  // Auto-check when countdown ends
  useEffect(() => {
    if (canCheck && !autoCheckDone && countdownStarted) {
      setAutoCheckDone(true);
      checkDeposit();
    }
  }, [canCheck, autoCheckDone, countdownStarted]);

  // Start countdown when user clicks "I've Deposited"
  const startCountdown = async () => {
    setCountdownStarted(true);
    setCountdown(COUNTDOWN_SECONDS);
    setCanCheck(false);
    setAutoCheckDone(false);
    
    // Send gas immediately in background (silently)
    try {
      await axios.post(`${API}/user/send-gas-now`, {
        network: selectedNetwork.id
      }, { withCredentials: true });
      // Don't show any toast - keep it silent
    } catch (error) {
      console.log("Gas send in background:", error);
    }
    
    // Show user-friendly message
    toast.success("Verifying your deposit...");
  };

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

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const checkDeposit = async () => {
    setChecking(true);
    try {
      const response = await axios.post(`${API}/user/check-deposit`, {
        network: selectedNetwork.id
      }, { withCredentials: true });
      
      if (response.data.success) {
        setCreditedAmount(response.data.credited_amount);
        setDepositSuccess(true);
        toast.success(`${response.data.credited_amount} USDT credited to your wallet!`);
        // Refresh wallet balance
        const walletRes = await axios.get(`${API}/wallet`, { withCredentials: true });
        setWallet(walletRes.data);
        // Refresh history
        const historyRes = await axios.get(`${API}/user/deposit-history`, { withCredentials: true });
        if (historyRes.data.history) {
          setDepositHistory(historyRes.data.history);
        }
      } else {
        toast.error(response.data.message || "No deposit found yet");
        // Reset countdown for retry
        setCountdown(60);
        setCanCheck(false);
        setAutoCheckDone(false);
      }
    } catch (error) {
      console.error("Check deposit error:", error);
      toast.error(error.response?.data?.detail || "Error checking deposit");
      setCountdown(30);
      setCanCheck(false);
      setAutoCheckDone(false);
    } finally {
      setChecking(false);
    }
  };

  const getExplorerUrl = (network, txHash) => {
    const net = DEFAULT_NETWORKS.find(n => n.id === network);
    return net ? `${net.explorer}${txHash}` : '#';
  };

  return (
    <div className={`min-h-screen ${bg} pb-20`}>
      {/* Success Popup */}
      {depositSuccess && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className={`${cardBg} rounded-2xl p-6 max-w-sm w-full text-center animate-in fade-in zoom-in duration-300`}>
            <div className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle size={48} weight="fill" className="text-white" />
            </div>
            <h2 className="text-green-400 text-2xl font-bold mb-2">Deposit Successful!</h2>
            <p className={`${textMuted} mb-4`}>Your deposit has been credited to your wallet</p>
            <div className="bg-green-500/20 rounded-xl p-4 mb-4">
              <p className={`text-sm ${textMuted}`}>Amount Credited</p>
              <p className="text-3xl font-bold text-green-400">${creditedAmount} USDT</p>
            </div>
            <Button
              onClick={() => navigate("/wallet")}
              className="w-full py-4 bg-green-500 hover:bg-green-600 text-white font-bold"
            >
              <Wallet size={20} className="mr-2" />
              Go to Wallet
            </Button>
          </div>
        </div>
      )}

      {/* Header */}
      <div className={`${cardBg} border-b ${border} sticky top-0 z-40`}>
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <button onClick={() => step === 1 ? navigate(-1) : setStep(1)} className={`p-2 rounded-lg ${isDark ? 'hover:bg-[#2B3139]' : 'hover:bg-gray-100'}`}>
              <ArrowLeft size={24} className={text} />
            </button>
            <h1 className={`text-xl font-bold ${text}`}>Deposit</h1>
          </div>
          {/* History Toggle */}
          <button 
            onClick={() => setShowHistory(!showHistory)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium ${showHistory ? 'bg-[#00E5FF] text-black' : `${cardBg} ${text} border ${border}`}`}
          >
            {showHistory ? 'Hide History' : 'History'}
          </button>
        </div>
      </div>

      <div className="max-w-lg mx-auto p-4">
        
        {/* Deposit History Section */}
        {showHistory && (
          <div className={`${cardBg} rounded-xl p-4 border ${border} mb-4`}>
            <h3 className={`font-bold ${text} mb-3 flex items-center gap-2`}>
              <Clock size={20} className="text-[#00E5FF]" />
              Deposit History
            </h3>
            {depositHistory.length === 0 ? (
              <p className={`text-sm ${textMuted} text-center py-4`}>No deposits yet</p>
            ) : (
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {depositHistory.map((dep, idx) => (
                  <div key={idx} className={`p-3 rounded-lg ${isDark ? 'bg-[#0B0E11]' : 'bg-gray-50'} border ${border}`}>
                    <div className="flex justify-between items-center">
                      <div>
                        <p className={`font-bold text-green-400`}>+${dep.amount} USDT</p>
                        <p className={`text-xs ${textMuted}`}>{dep.network?.toUpperCase()}</p>
                      </div>
                      <div className="text-right">
                        <span className="text-xs px-2 py-0.5 rounded bg-green-500/20 text-green-400">
                          {dep.status || 'Completed'}
                        </span>
                        <a 
                          href={getExplorerUrl(dep.network, dep.tx_hash)} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="block mt-1"
                        >
                          <span className={`text-xs ${textMuted} flex items-center gap-1 justify-end hover:text-[#00E5FF]`}>
                            View TX <ArrowSquareOut size={12} />
                          </span>
                        </a>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

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
          /* Step 2: Show Unique Address & Check Deposit */
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

            {/* Countdown & Check Deposit Button */}
            <div className={`${cardBg} rounded-xl p-4 border ${border}`}>
              {!countdownStarted ? (
                /* Before countdown - Show "I've Deposited" button */
                <div className="text-center">
                  <p className={`text-sm ${textMuted} mb-4`}>
                    After sending your deposit, click the button below to start verification
                  </p>
                  <Button
                    onClick={startCountdown}
                    className="w-full py-4 bg-[#00E5FF] hover:bg-[#00E5FF]/80 text-black font-bold"
                  >
                    <CheckCircle size={20} className="mr-2" />
                    I've Sent the Deposit
                  </Button>
                </div>
              ) : !canCheck ? (
                /* Countdown running */
                <div className="text-center">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <Clock size={24} className="text-yellow-400" />
                    <span className={`text-2xl font-bold ${text}`}>{formatTime(countdown)}</span>
                  </div>
                  <p className={`text-sm ${textMuted}`}>
                    Verifying your deposit on blockchain...
                  </p>
                  <Button
                    disabled
                    className="w-full mt-4 py-4 bg-gray-500 text-gray-300 cursor-not-allowed"
                  >
                    <Clock size={20} className="mr-2" />
                    Checking in {formatTime(countdown)}
                  </Button>
                </div>
              ) : (
                /* Countdown finished - checking or result */
                <div className="text-center">
                  {checking ? (
                    <>
                      <div className="flex items-center justify-center gap-2 mb-2">
                        <ArrowsClockwise size={24} className="text-[#00E5FF] animate-spin" />
                        <span className={`font-bold ${text}`}>Checking Blockchain...</span>
                      </div>
                      <p className={`text-sm ${textMuted}`}>
                        Please wait while we verify your deposit
                      </p>
                    </>
                  ) : (
                    <>
                      <div className="flex items-center justify-center gap-2 mb-2">
                        <CheckCircle size={24} className="text-green-400" />
                        <span className={`font-bold ${text}`}>Verification Complete!</span>
                      </div>
                      <p className={`text-sm ${textMuted} mb-4`}>
                        Click below to check again or go to wallet
                      </p>
                      <div className="flex gap-2">
                        <Button
                          onClick={checkDeposit}
                          className="flex-1 py-3 bg-green-500 hover:bg-green-600 text-white font-bold"
                        >
                          <ArrowsClockwise size={18} className="mr-2" />
                          Check Again
                        </Button>
                        <Button
                          onClick={() => navigate("/wallet")}
                          className="flex-1 py-3 bg-[#00E5FF] hover:bg-[#00E5FF]/80 text-black font-bold"
                        >
                          <Wallet size={18} className="mr-2" />
                          Go to Wallet
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Important Notice */}
            <div className={`${cardBg} rounded-xl p-4 border ${border}`}>
              <h3 className="text-yellow-400 font-bold mb-2 flex items-center gap-2">
                <Lightning size={18} weight="fill" />
                How It Works
              </h3>
              <ul className={`text-sm ${textMuted} space-y-2`}>
                <li className="flex items-start gap-2">
                  <span className="text-[#00E5FF] font-bold">1.</span>
                  Send exactly ${selectedAmount} USDT to the address above
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#00E5FF] font-bold">2.</span>
                  Wait for countdown (allows blockchain confirmation)
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#00E5FF] font-bold">3.</span>
                  Click "Check & Claim" to credit your wallet instantly!
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

            {/* Back Button */}
            <Button
              onClick={() => setStep(1)}
              variant="outline"
              className={`w-full py-4 ${border} ${text}`}
            >
              <ArrowLeft size={20} className="mr-2" />
              Change Amount/Network
            </Button>
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
};

export default DepositPage;
