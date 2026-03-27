import { useNavigate } from "react-router-dom";
import { useTheme } from "../App";
import { ArrowLeft, Vault, Clock } from "@phosphor-icons/react";

const StakingPage = () => {
  const { isDark } = useTheme();
  const navigate = useNavigate();

  const bg = isDark ? 'bg-[#0B0E11]' : 'bg-gray-50';
  const cardBg = isDark ? 'bg-[#1E2329]' : 'bg-white';
  const text = isDark ? 'text-white' : 'text-gray-900';
  const textMuted = isDark ? 'text-[#848E9C]' : 'text-gray-500';
  const border = isDark ? 'border-[#2B3139]' : 'border-gray-200';

  return (
    <div className={`min-h-screen ${bg}`}>
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
            <h1 className={`text-xl font-bold ${text}`}>Staking</h1>
          </div>
        </div>
      </div>

      {/* Coming Soon Content */}
      <div className="flex flex-col items-center justify-center px-6 py-20">
        {/* Icon */}
        <div className="w-24 h-24 rounded-full bg-[#0ECB81]/20 flex items-center justify-center mb-6">
          <Vault size={48} className="text-[#0ECB81]" weight="duotone" />
        </div>

        {/* Coming Soon Text */}
        <div className="flex items-center gap-2 mb-4">
          <Clock size={24} className="text-[#F0B90B]" weight="fill" />
          <h2 className={`text-2xl font-bold ${text}`}>Coming Soon</h2>
        </div>

        {/* Description */}
        <p className={`text-center ${textMuted} max-w-sm mb-8`}>
          Staking feature is under development. Earn passive income by staking your crypto assets. Stay tuned!
        </p>

        {/* Features Preview */}
        <div className={`${cardBg} rounded-xl p-6 border ${border} w-full max-w-sm`}>
          <h3 className={`font-semibold ${text} mb-4`}>Upcoming Features</h3>
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-[#0ECB81]"></div>
              <span className={textMuted}>Flexible & Locked Staking</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-[#F0B90B]"></div>
              <span className={textMuted}>Up to 25% APY Rewards</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-[#3498DB]"></div>
              <span className={textMuted}>Multiple Crypto Support</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-[#9B59B6]"></div>
              <span className={textMuted}>Auto-compound Interest</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StakingPage;
