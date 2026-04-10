import React from "react";
import { useNavigate } from "react-router-dom";
import { CaretLeft, EnvelopeSimple, ChatCircleDots, Question } from "@phosphor-icons/react";
import { useTheme } from "../App";
import BottomNav from "../components/BottomNav";

const SupportPage = () => {
  const navigate = useNavigate();
  const { isDark } = useTheme();
  
  const bgColor = isDark ? "bg-[#0B0E11]" : "bg-gray-50";
  const cardBg = isDark ? "bg-[#1E2329]" : "bg-white";
  const text = isDark ? "text-white" : "text-gray-900";
  const textMuted = isDark ? "text-[#848E9C]" : "text-gray-500";
  const hoverBg = isDark ? "hover:bg-[#2B3139]" : "hover:bg-gray-50";
  
  const SUPPORT_EMAIL = "TGexchange.support@gmail.com";
  
  const handleEmailSupport = () => {
    // Opens Gmail/Email app with pre-filled To address
    window.location.href = `mailto:${SUPPORT_EMAIL}?subject=Support Request - TG Exchange&body=Hi TG Exchange Support,%0A%0AI need help with:%0A%0A`;
  };

  return (
    <div className={`min-h-screen ${bgColor} pb-20`}>
      {/* Header */}
      <div className={`sticky top-0 z-10 ${cardBg} border-b ${isDark ? 'border-[#2B3139]' : 'border-gray-200'}`}>
        <div className="flex items-center justify-between p-4">
          <button onClick={() => navigate(-1)} className={text}>
            <CaretLeft size={24} />
          </button>
          <h1 className={`text-lg font-semibold ${text}`}>Help Center</h1>
          <div className="w-6"></div>
        </div>
      </div>

      {/* Support Banner */}
      <div className="p-4">
        <div className="bg-gradient-to-r from-[#9B59B6] to-[#8E44AD] rounded-2xl p-6 text-white">
          <div className="flex items-center gap-3 mb-3">
            <ChatCircleDots size={32} weight="fill" />
            <h2 className="text-xl font-bold">Need Help?</h2>
          </div>
          <p className="text-white/80 text-sm">
            Our support team is here to help you 24/7. Send us an email and we'll get back to you as soon as possible.
          </p>
        </div>
      </div>

      {/* Email Support - Main Option */}
      <div className="mx-4 mt-2">
        <h3 className={`font-semibold mb-3 ${text}`}>Contact Us</h3>
        <div className={`${cardBg} rounded-2xl overflow-hidden`}>
          <button 
            onClick={handleEmailSupport}
            className={`w-full flex items-center justify-between p-4 ${hoverBg} transition-colors`}
            data-testid="email-support-btn"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-gradient-to-r from-[#EA4335] to-[#FBBC05] flex items-center justify-center">
                <EnvelopeSimple size={24} weight="fill" className="text-white" />
              </div>
              <div className="text-left">
                <span className={`font-semibold ${text} block`}>Email Support</span>
                <span className={`text-sm ${textMuted}`}>{SUPPORT_EMAIL}</span>
              </div>
            </div>
            <div className="bg-[#0ECB81] text-white text-xs px-3 py-1 rounded-full font-semibold">
              TAP TO EMAIL
            </div>
          </button>
        </div>
      </div>

      {/* FAQ Section */}
      <div className="mx-4 mt-6">
        <h3 className={`font-semibold mb-3 ${text}`}>Frequently Asked Questions</h3>
        <div className={`${cardBg} rounded-2xl overflow-hidden`}>
          <FAQItem 
            question="How do I deposit funds?"
            answer="Go to Assets → Deposit → Select Network → Copy your unique deposit address and send funds to it."
            isDark={isDark}
            text={text}
            textMuted={textMuted}
            hoverBg={hoverBg}
          />
          <div className={`h-px ${isDark ? 'bg-[#2B3139]' : 'bg-gray-100'} mx-4`}></div>
          <FAQItem 
            question="How do I withdraw funds?"
            answer="Go to Assets → Withdraw → Enter withdrawal address → Enter amount → Submit. Admin will approve within 24 hours."
            isDark={isDark}
            text={text}
            textMuted={textMuted}
            hoverBg={hoverBg}
          />
          <div className={`h-px ${isDark ? 'bg-[#2B3139]' : 'bg-gray-100'} mx-4`}></div>
          <FAQItem 
            question="What is Welcome Bonus?"
            answer="New users receive $200 Welcome Bonus in Futures wallet. This bonus can be used for trading but cannot be withdrawn."
            isDark={isDark}
            text={text}
            textMuted={textMuted}
            hoverBg={hoverBg}
          />
          <div className={`h-px ${isDark ? 'bg-[#2B3139]' : 'bg-gray-100'} mx-4`}></div>
          <FAQItem 
            question="How does Referral Program work?"
            answer="Share your referral code. When your referrals deposit and trade, you earn up to 5% commission on their first deposit and trading fees."
            isDark={isDark}
            text={text}
            textMuted={textMuted}
            hoverBg={hoverBg}
          />
          <div className={`h-px ${isDark ? 'bg-[#2B3139]' : 'bg-gray-100'} mx-4`}></div>
          <FAQItem 
            question="How do I achieve VIP Ranks?"
            answer="Maintain required Future Balance: Bronze ($50), Silver ($200), Gold ($500), Platinum ($1000), Diamond ($2500)."
            isDark={isDark}
            text={text}
            textMuted={textMuted}
            hoverBg={hoverBg}
          />
        </div>
      </div>

      {/* Support Info */}
      <div className="mx-4 mt-6 mb-8">
        <div className={`${cardBg} rounded-2xl p-4`}>
          <div className="flex items-center gap-3 mb-2">
            <Question size={20} className="text-[#F0B90B]" />
            <span className={`font-semibold ${text}`}>Response Time</span>
          </div>
          <p className={`text-sm ${textMuted}`}>
            We typically respond to all queries within 24 hours. For urgent matters, please mention "URGENT" in your email subject.
          </p>
        </div>
      </div>

      <BottomNav />
    </div>
  );
};

// FAQ Item Component
const FAQItem = ({ question, answer, isDark, text, textMuted, hoverBg }) => {
  const [isOpen, setIsOpen] = React.useState(false);
  
  return (
    <div className={`${hoverBg} transition-colors`}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full p-4 text-left"
      >
        <div className="flex items-center justify-between">
          <span className={`font-medium ${text} pr-4`}>{question}</span>
          <span className={textMuted}>{isOpen ? '−' : '+'}</span>
        </div>
        {isOpen && (
          <p className={`mt-2 text-sm ${textMuted}`}>{answer}</p>
        )}
      </button>
    </div>
  );
};

export default SupportPage;
