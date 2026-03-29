import { useState, useEffect } from "react";

const LoadingPage = ({ onComplete, minimal = false }) => {
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
      delay: i * 0.08
    }));
    setCandles(generatedCandles);
    
    // Faster loading: complete in ~1.2 seconds (progress +5 every 60ms)
    const timer = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(timer);
          setTimeout(() => onComplete && onComplete(), 200);
          return 100;
        }
        return prev + 5;
      });
    }, 60);
    
    return () => clearInterval(timer);
  }, [onComplete]);

  // Minimal loader for quick auth checks
  if (minimal) {
    return (
      <div className="fixed inset-0 bg-[#0B0E11] flex flex-col items-center justify-center z-[9999]">
        {/* Mini Candle Animation */}
        <div className="flex items-end justify-center gap-1 h-16 mb-4">
          {candles.slice(0, 6).map((candle) => (
            <div key={candle.id} className="flex flex-col items-center">
              <div 
                className={`w-[1px] ${candle.isGreen ? 'bg-[#0ECB81]' : 'bg-[#F6465D]'}`}
                style={{
                  height: `${candle.wickTop * 0.5}px`,
                  animation: 'candleWick 1s ease-in-out infinite',
                  animationDelay: `${candle.delay}s`
                }}
              />
              <div 
                className={`w-2 rounded-sm ${candle.isGreen ? 'bg-[#0ECB81]' : 'bg-[#F6465D]'}`}
                style={{
                  height: `${candle.height * 0.4}px`,
                  animation: 'candleGrow 1s ease-in-out infinite',
                  animationDelay: `${candle.delay}s`
                }}
              />
              <div 
                className={`w-[1px] ${candle.isGreen ? 'bg-[#0ECB81]' : 'bg-[#F6465D]'}`}
                style={{
                  height: `${candle.wickBottom * 0.5}px`,
                  animation: 'candleWick 1s ease-in-out infinite',
                  animationDelay: `${candle.delay}s`
                }}
              />
            </div>
          ))}
        </div>
        <p className="text-[#848E9C] text-sm">Loading...</p>
      </div>
    );
  }

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
        <p className="text-[#00E5FF] text-sm mt-2 tracking-widest">CRYPTOCURRENCY INVESTMENT</p>
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
                animation: 'candleWick 1.2s ease-in-out infinite',
                animationDelay: `${candle.delay}s`
              }}
            />
            {/* Body */}
            <div 
              className={`w-4 rounded-sm ${candle.isGreen ? 'bg-[#0ECB81]' : 'bg-[#F6465D]'}`}
              style={{
                height: `${candle.height}px`,
                animation: 'candleGrow 1.2s ease-in-out infinite',
                animationDelay: `${candle.delay}s`
              }}
            />
            {/* Wick bottom */}
            <div 
              className={`w-[2px] ${candle.isGreen ? 'bg-[#0ECB81]' : 'bg-[#F6465D]'}`}
              style={{
                height: `${candle.wickBottom}px`,
                animation: 'candleWick 1.2s ease-in-out infinite',
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
            className="h-full bg-gradient-to-r from-[#00E5FF] via-[#0ECB81] to-[#00E5FF] rounded-full transition-all duration-100"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Loading Text */}
      <div className="flex items-center gap-3">
        <span className="text-[#00E5FF] font-bold text-xl">{progress}%</span>
        <span className="text-[#848E9C]">Loading market data...</span>
      </div>

      {/* Floating Candles Animation */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(8)].map((_, i) => (
          <div
            key={i}
            className="absolute"
            style={{
              left: `${5 + i * 12}%`,
              bottom: '-60px',
              animation: `floatUp ${4 + Math.random() * 3}s ease-in-out infinite`,
              animationDelay: `${i * 0.5}s`,
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
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-[#00E5FF]/10 to-transparent" />
    </div>
  );
};

export default LoadingPage;
