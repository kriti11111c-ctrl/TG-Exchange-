import React, { useState, useEffect } from 'react';
import { TelegramLogo, X } from '@phosphor-icons/react';

const TelegramPopup = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [timeLeft, setTimeLeft] = useState(10);

  useEffect(() => {
    // Check if user has already joined
    const hasJoined = localStorage.getItem('tg_channel_joined');
    
    if (!hasJoined) {
      // Show popup after 2 seconds delay
      const showTimer = setTimeout(() => {
        setIsVisible(true);
      }, 2000);

      return () => clearTimeout(showTimer);
    }
  }, []);

  useEffect(() => {
    if (isVisible && timeLeft > 0) {
      const countdown = setInterval(() => {
        setTimeLeft(prev => prev - 1);
      }, 1000);

      return () => clearInterval(countdown);
    } else if (timeLeft === 0) {
      setIsVisible(false);
    }
  }, [isVisible, timeLeft]);

  const handleJoin = () => {
    localStorage.setItem('tg_channel_joined', 'true');
    window.open('https://t.me/+BQgWwaC0W69iZTM1', '_blank');
    setIsVisible(false);
  };

  const handleClose = () => {
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-50 p-4 animate-slideDown">
      <div className="max-w-md mx-auto bg-gradient-to-r from-[#0088cc] to-[#00a0e3] rounded-2xl shadow-2xl overflow-hidden">
        {/* Progress bar */}
        <div className="h-1 bg-white/20">
          <div 
            className="h-full bg-white transition-all duration-1000 ease-linear"
            style={{ width: `${(timeLeft / 10) * 100}%` }}
          />
        </div>
        
        <div className="p-4">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center flex-shrink-0">
                <TelegramLogo size={28} weight="fill" className="text-[#0088cc]" />
              </div>
              <div>
                <h3 className="text-white font-bold text-lg">TG Exchange</h3>
                <p className="text-white/80 text-sm">Official Channel</p>
              </div>
            </div>
            <button 
              onClick={handleClose}
              className="text-white/60 hover:text-white p-1"
            >
              <X size={20} />
            </button>
          </div>
          
          <p className="text-white/90 text-sm mt-3 mb-4">
            Join our official Telegram channel for updates, announcements & support!
          </p>
          
          <div className="flex items-center gap-3">
            <button
              onClick={handleJoin}
              className="flex-1 bg-white text-[#0088cc] font-bold py-3 rounded-xl hover:bg-white/90 transition-colors flex items-center justify-center gap-2"
              data-testid="telegram-join-btn"
            >
              <TelegramLogo size={20} weight="fill" />
              JOIN NOW
            </button>
            <span className="text-white/60 text-sm">{timeLeft}s</span>
          </div>
        </div>
      </div>
      
      <style jsx>{`
        @keyframes slideDown {
          from {
            transform: translateY(-100%);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
        .animate-slideDown {
          animation: slideDown 0.5s ease-out;
        }
      `}</style>
    </div>
  );
};

export default TelegramPopup;
