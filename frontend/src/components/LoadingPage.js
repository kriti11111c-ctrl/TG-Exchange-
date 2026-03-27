import { useState, useEffect } from "react";

const LoadingPage = ({ onComplete }) => {
  const [progress, setProgress] = useState(0);
  const [candles, setCandles] = useState([]);
  
  useEffect(() => {
    // Generate random candles
    const generatedCandles = [...Array(12)].map((_, i) => ({
      id: i,
      isGreen: Math.random() > 0.4,
      height: 30 + Math.random() * 70,
      wickTop: 10 + Math.random() * 15,
      wickBottom: 5 + Math.random() * 10,
      delay: i * 0.1
    }));
    setCandles(generatedCandles);
    
    const timer = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(timer);
          setTimeout(() => onComplete && onComplete(), 500);
          return 100;
        }
        return prev + 2;
      });
    }, 50);
    
    return () => clearInterval(timer);
  }, [onComplete]);

  return (
    <div className="fixed inset-0 bg-[#0B0E11] flex flex-col items-center justify-center z-[9999]">
      {/* Logo */}
      <div className="mb-8 flex flex-col items-center">
        <img 
          src="/images/tg-logo.png" 
          alt="TG Exchange" 
          className="w-24 h-24 rounded-full mb-4"
          style={{ animation: 'pulse 2s ease-in-out infinite' }}
        />
        <h1 className="text-3xl font-bold text-white" style={{ fontFamily: 'Unbounded' }}>
          TG Exchange
        </h1>
        <p className="text-[#F0B90B] text-sm mt-2 tracking-widest">CRYPTOCURRENCY INVESTMENT</p>
      </div>

      {/* Animated Candle Chart */}
      <div className="flex items-end justify-center gap-[6px] h-36 mb-8">
        {candles.map((candle) => (
          <div key={candle.id} className="flex flex-col items-center">
            {/* Wick top */}
            <div 
              className={`w-[2px] ${candle.isGreen ? 'bg-[#0ECB81]' : 'bg-[#F6465D]'}`}
              style={{
                height: `${candle.wickTop}px`,
                animation: 'candleWick 1.5s ease-in-out infinite',
                animationDelay: `${candle.delay}s`
              }}
            />
            {/* Body */}
            <div 
              className={`w-4 rounded-sm ${candle.isGreen ? 'bg-[#0ECB81]' : 'bg-[#F6465D]'}`}
              style={{
                height: `${candle.height}px`,
                animation: 'candleGrow 1.5s ease-in-out infinite',
                animationDelay: `${candle.delay}s`
              }}
            />
            {/* Wick bottom */}
            <div 
              className={`w-[2px] ${candle.isGreen ? 'bg-[#0ECB81]' : 'bg-[#F6465D]'}`}
              style={{
                height: `${candle.wickBottom}px`,
                animation: 'candleWick 1.5s ease-in-out infinite',
                animationDelay: `${candle.delay}s`
              }}
            />
          </div>
        ))}
      </div>

      {/* Progress Bar */}
      <div className="w-72 mb-4">
        <div className="h-1.5 bg-[#2B3139] rounded-full overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-[#F0B90B] via-[#0ECB81] to-[#F0B90B] rounded-full transition-all duration-100"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Loading Text */}
      <div className="flex items-center gap-3">
        <span className="text-[#F0B90B] font-bold text-xl">{progress}%</span>
        <span className="text-[#848E9C]">Loading market data...</span>
      </div>

      {/* Floating Candles Animation */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(10)].map((_, i) => (
          <div
            key={i}
            className="absolute"
            style={{
              left: `${5 + i * 10}%`,
              bottom: '-60px',
              animation: `floatUp ${5 + Math.random() * 4}s ease-in-out infinite`,
              animationDelay: `${i * 0.7}s`,
            }}
          >
            <div className="flex flex-col items-center opacity-20">
              <div className={`w-[1px] h-2 ${i % 2 === 0 ? 'bg-[#0ECB81]' : 'bg-[#F6465D]'}`} />
              <div 
                className={`w-2 ${i % 2 === 0 ? 'bg-[#0ECB81]' : 'bg-[#F6465D]'}`} 
                style={{ height: `${15 + Math.random() * 25}px` }} 
              />
              <div className={`w-[1px] h-1 ${i % 2 === 0 ? 'bg-[#0ECB81]' : 'bg-[#F6465D]'}`} />
            </div>
          </div>
        ))}
      </div>

      {/* Bottom glow */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-[#F0B90B]/10 to-transparent" />
    </div>
  );
};

export default LoadingPage;
