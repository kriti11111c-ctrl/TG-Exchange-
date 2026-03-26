import { useNavigate } from "react-router-dom";
import { useTheme } from "../App";
import { CaretLeft, Shield } from "@phosphor-icons/react";
import TwoFactorSettings from "../components/TwoFactorSettings";

const SecurityPage = () => {
  const { isDark } = useTheme();
  const navigate = useNavigate();

  const bg = isDark ? 'bg-[#0B0E11]' : 'bg-gray-50';
  const text = isDark ? 'text-white' : 'text-gray-900';

  return (
    <div className={`min-h-screen ${bg} ${text}`}>
      {/* Header */}
      <div className={`sticky top-0 z-50 ${isDark ? 'bg-[#1E2329]' : 'bg-white'} border-b ${isDark ? 'border-[#2B3139]' : 'border-gray-200'}`}>
        <div className="flex items-center justify-between px-4 py-4">
          <button onClick={() => navigate(-1)} className="p-2 -ml-2">
            <CaretLeft size={24} className={text} />
          </button>
          <h1 className={`font-bold text-lg ${text}`}>Security</h1>
          <div className="w-8"></div>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 space-y-4">
        {/* Security Header */}
        <div className="flex items-center gap-3 mb-6">
          <Shield size={32} className="text-[#3498DB]" />
          <div>
            <h2 className={`font-bold text-xl ${text}`}>Account Security</h2>
            <p className={`text-sm ${isDark ? 'text-[#848E9C]' : 'text-gray-500'}`}>
              Protect your account with additional security measures
            </p>
          </div>
        </div>

        {/* 2FA Settings */}
        <TwoFactorSettings />

        {/* Other Security Options */}
        <div className={`${isDark ? 'bg-[#1E2329]' : 'bg-white'} rounded-xl p-4 border ${isDark ? 'border-[#2B3139]' : 'border-gray-200'}`}>
          <h3 className={`font-bold mb-4 ${text}`}>Security Tips</h3>
          <ul className={`space-y-3 text-sm ${isDark ? 'text-[#848E9C]' : 'text-gray-500'}`}>
            <li className="flex items-start gap-2">
              <span className="text-[#0ECB81]">✓</span>
              Enable 2FA for maximum account protection
            </li>
            <li className="flex items-start gap-2">
              <span className="text-[#0ECB81]">✓</span>
              Never share your password or 2FA codes with anyone
            </li>
            <li className="flex items-start gap-2">
              <span className="text-[#0ECB81]">✓</span>
              Use a strong, unique password
            </li>
            <li className="flex items-start gap-2">
              <span className="text-[#0ECB81]">✓</span>
              Keep your recovery codes in a safe place
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default SecurityPage;
