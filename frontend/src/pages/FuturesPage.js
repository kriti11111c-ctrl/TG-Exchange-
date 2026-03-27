import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTheme, API } from "../App";
import axios from "axios";
import BottomNav from "../components/BottomNav";
import { 
  ArrowLeft, 
  ClockCounterClockwise,
  Folder,
  Robot,
  CaretUp,
  Warning
} from "@phosphor-icons/react";

const FuturesPage = () => {
  const { isDark } = useTheme();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("positions");
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

  const tabs = [
    { id: "positions", label: "Positions", count: 0 },
    { id: "orders", label: "Open Orders", count: 0 },
    { id: "bots", label: "Bots", count: null }
  ];

  return (
    <div className={`min-h-screen ${bg} pb-20`}>
      {/* Header */}
      <div className={`${cardBg} border-b ${border} sticky top-0 z-40`}>
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => navigate(-1)} 
              className={`p-2 rounded-lg ${isDark ? 'hover:bg-[#2B3139]' : 'hover:bg-gray-100'}`}
            >
              <ArrowLeft size={24} className={text} />
            </button>
            <h1 className={`text-xl font-bold ${text}`}>Futures Trading</h1>
          </div>
        </div>
      </div>

      {/* Tabs Header */}
      <div className={`${cardBg} border-b ${border}`}>
        <div className="flex items-center justify-between px-4">
          <div className="flex items-center gap-6">
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
          
          {/* History Icon */}
          <button 
            className={`p-2 rounded-lg ${textMuted} ${isDark ? 'hover:bg-[#2B3139]' : 'hover:bg-gray-100'}`}
            title="History"
          >
            <ClockCounterClockwise size={20} />
          </button>
        </div>
      </div>

      {/* Tab Content */}
      <div className="p-4">
        {/* Positions Tab */}
        {activeTab === "positions" && (
          <div className="flex flex-col items-center justify-center py-16">
            <div className={`w-20 h-20 rounded-xl ${isDark ? 'bg-[#2B3139]' : 'bg-gray-100'} flex items-center justify-center mb-4`}>
              <Folder size={40} className={textMuted} />
            </div>
            <p className={`text-lg ${text}`}>You have no positions.</p>
            <p className={`text-sm ${textMuted} mt-2 text-center max-w-xs`}>
              Start trading futures to see your positions here
            </p>
          </div>
        )}

        {/* Open Orders Tab */}
        {activeTab === "orders" && (
          <div className="flex flex-col items-center justify-center py-16">
            <div className={`w-20 h-20 rounded-xl ${isDark ? 'bg-[#2B3139]' : 'bg-gray-100'} flex items-center justify-center mb-4`}>
              <Warning size={40} className={textMuted} />
            </div>
            <p className={`text-lg ${text}`}>No open orders</p>
            <p className={`text-sm ${textMuted} mt-2 text-center max-w-xs`}>
              Place a futures order to see it here
            </p>
          </div>
        )}

        {/* Bots Tab */}
        {activeTab === "bots" && (
          <div className="flex flex-col items-center justify-center py-16">
            <div className={`w-20 h-20 rounded-xl bg-[#F0B90B]/20 flex items-center justify-center mb-4`}>
              <Robot size={40} className="text-[#F0B90B]" />
            </div>
            <p className={`text-lg ${text}`}>Trading Bots</p>
            <p className={`text-sm ${textMuted} mt-2 text-center max-w-xs`}>
              Automated trading bots coming soon
            </p>
          </div>
        )}
      </div>

      {/* BTCUSDT Perp Chart Card */}
      <div className={`mx-4 ${cardBg} rounded-xl border-l-4 border-l-[#F0B90B] border ${border}`}>
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-[#F7931A] flex items-center justify-center">
              <span className="text-white font-bold text-xs">₿</span>
            </div>
            <span className={`font-semibold ${text}`}>BTCUSDT Perp Chart</span>
          </div>
          <CaretUp size={20} className={textMuted} />
        </div>
      </div>

      {/* Coming Soon Notice */}
      <div className="px-4 py-6">
        <div className={`${cardBg} rounded-xl p-6 border ${border} text-center`}>
          <div className="w-16 h-16 rounded-full bg-[#F0B90B]/20 flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">🚀</span>
          </div>
          <h3 className={`text-lg font-semibold ${text} mb-2`}>Futures Trading Coming Soon</h3>
          <p className={`text-sm ${textMuted}`}>
            Trade perpetual contracts with up to 125x leverage. Stay tuned for updates!
          </p>
          
          {/* Features Preview */}
          <div className="grid grid-cols-2 gap-3 mt-6">
            <div className={`p-3 rounded-lg ${isDark ? 'bg-[#2B3139]' : 'bg-gray-100'}`}>
              <p className="text-[#0ECB81] font-bold text-lg">125x</p>
              <p className={`text-xs ${textMuted}`}>Max Leverage</p>
            </div>
            <div className={`p-3 rounded-lg ${isDark ? 'bg-[#2B3139]' : 'bg-gray-100'}`}>
              <p className="text-[#F0B90B] font-bold text-lg">24/7</p>
              <p className={`text-xs ${textMuted}`}>Trading Hours</p>
            </div>
            <div className={`p-3 rounded-lg ${isDark ? 'bg-[#2B3139]' : 'bg-gray-100'}`}>
              <p className="text-[#3498DB] font-bold text-lg">50+</p>
              <p className={`text-xs ${textMuted}`}>Trading Pairs</p>
            </div>
            <div className={`p-3 rounded-lg ${isDark ? 'bg-[#2B3139]' : 'bg-gray-100'}`}>
              <p className="text-[#9B59B6] font-bold text-lg">0.02%</p>
              <p className={`text-xs ${textMuted}`}>Maker Fee</p>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Navigation */}
      <BottomNav />
    </div>
  );
};

export default FuturesPage;
