import { Link } from "react-router-dom";
import { useAuth } from "../App";
import { 
  Vault, 
  ChartLineUp, 
  ShieldCheck, 
  ArrowRight,
  Lightning,
  Globe,
  CurrencyBtc,
  CurrencyEth,
  Wallet
} from "@phosphor-icons/react";

const LandingPage = () => {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-[#0A0A0A]">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 glass border-b border-white/10">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3" data-testid="nav-logo">
            <Vault size={32} weight="duotone" className="text-[#00E599]" />
            <span className="font-bold text-xl tracking-tight" style={{ fontFamily: 'Unbounded' }}>
              CryptoVault
            </span>
          </Link>
          
          <div className="flex items-center gap-4">
            {user ? (
              <Link to="/dashboard" data-testid="nav-dashboard-btn">
                <button className="btn-primary">
                  Dashboard
                </button>
              </Link>
            ) : (
              <>
                <Link to="/login" data-testid="nav-login-btn">
                  <button className="btn-secondary">
                    Login
                  </button>
                </Link>
                <Link to="/register" data-testid="nav-register-btn">
                  <button className="btn-primary">
                    Get Started
                  </button>
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-8">
              <h1 
                className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight leading-tight animate-fade-in-up"
                style={{ fontFamily: 'Unbounded' }}
                data-testid="hero-title"
              >
                Bank-Grade
                <span className="text-[#00E599] block">Crypto Exchange</span>
              </h1>
              <p className="text-lg text-[#8F8F9D] max-w-xl animate-fade-in-up stagger-1" data-testid="hero-subtitle">
                Trade cryptocurrencies with institutional-level security. 
                Your digital assets, protected like a Swiss vault.
              </p>
              <div className="flex flex-wrap gap-4 animate-fade-in-up stagger-2">
                <Link to="/register" data-testid="hero-cta-primary">
                  <button className="btn-primary flex items-center gap-2">
                    Start Trading <ArrowRight size={20} weight="bold" />
                  </button>
                </Link>
                <Link to="/login" data-testid="hero-cta-secondary">
                  <button className="btn-secondary flex items-center gap-2">
                    <ChartLineUp size={20} weight="bold" /> View Markets
                  </button>
                </Link>
              </div>
              
              {/* Stats */}
              <div className="grid grid-cols-3 gap-6 pt-8 border-t border-white/10 animate-fade-in-up stagger-3">
                <div>
                  <p className="text-2xl font-bold font-mono text-[#00E599]" data-testid="stat-volume">$2.5B+</p>
                  <p className="text-sm text-[#8F8F9D]">24h Volume</p>
                </div>
                <div>
                  <p className="text-2xl font-bold font-mono text-[#00E599]" data-testid="stat-users">500K+</p>
                  <p className="text-sm text-[#8F8F9D]">Active Traders</p>
                </div>
                <div>
                  <p className="text-2xl font-bold font-mono text-[#00E599]" data-testid="stat-countries">150+</p>
                  <p className="text-sm text-[#8F8F9D]">Countries</p>
                </div>
              </div>
            </div>
            
            {/* Hero Image */}
            <div className="relative animate-fade-in-up stagger-2">
              <div className="absolute inset-0 bg-gradient-to-r from-[#00E599]/20 to-transparent rounded-lg blur-3xl" />
              <img 
                src="https://images.unsplash.com/photo-1642432556591-72cbc671b707?w=800&q=80"
                alt="Crypto Trading"
                className="relative rounded-lg border border-white/10 w-full"
                data-testid="hero-image"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Crypto Ticker */}
      <section className="py-6 border-y border-white/10 bg-[#12121A]">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex items-center justify-between gap-8 overflow-x-auto">
            <div className="flex items-center gap-3 whitespace-nowrap">
              <CurrencyBtc size={24} className="text-[#F7931A]" />
              <span className="font-mono font-medium">BTC</span>
              <span className="font-mono text-[#00E599]">$95,234.00</span>
              <span className="font-mono text-xs text-[#00E599]">+2.34%</span>
            </div>
            <div className="flex items-center gap-3 whitespace-nowrap">
              <CurrencyEth size={24} className="text-[#627EEA]" />
              <span className="font-mono font-medium">ETH</span>
              <span className="font-mono text-[#00E599]">$3,456.78</span>
              <span className="font-mono text-xs text-[#00E599]">+1.89%</span>
            </div>
            <div className="flex items-center gap-3 whitespace-nowrap">
              <div className="w-6 h-6 rounded-full bg-[#F0B90B] flex items-center justify-center text-xs font-bold text-black">B</div>
              <span className="font-mono font-medium">BNB</span>
              <span className="font-mono text-[#00E599]">$654.32</span>
              <span className="font-mono text-xs text-[#FF3B30]">-0.45%</span>
            </div>
            <div className="flex items-center gap-3 whitespace-nowrap">
              <div className="w-6 h-6 rounded-full bg-[#23292F] flex items-center justify-center text-xs font-bold">X</div>
              <span className="font-mono font-medium">XRP</span>
              <span className="font-mono text-[#00E599]">$2.54</span>
              <span className="font-mono text-xs text-[#00E599]">+5.67%</span>
            </div>
            <div className="flex items-center gap-3 whitespace-nowrap">
              <div className="w-6 h-6 rounded-full bg-gradient-to-r from-[#9945FF] to-[#14F195] flex items-center justify-center text-xs font-bold">S</div>
              <span className="font-mono font-medium">SOL</span>
              <span className="font-mono text-[#00E599]">$178.90</span>
              <span className="font-mono text-xs text-[#00E599]">+3.21%</span>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 
              className="text-3xl sm:text-4xl font-bold mb-4"
              style={{ fontFamily: 'Unbounded' }}
              data-testid="features-title"
            >
              Why Choose CryptoVault?
            </h2>
            <p className="text-[#8F8F9D] max-w-2xl mx-auto">
              Built for serious traders who demand institutional-grade security and lightning-fast execution.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Feature 1 */}
            <div className="bg-[#12121A] border border-white/10 p-8 hover:border-[#00E599]/50 transition-colors duration-200" data-testid="feature-security">
              <ShieldCheck size={48} weight="duotone" className="text-[#00E599] mb-6" />
              <h3 className="text-xl font-bold mb-3" style={{ fontFamily: 'Unbounded' }}>
                Bank-Grade Security
              </h3>
              <p className="text-[#8F8F9D]">
                Multi-signature wallets, cold storage, and enterprise-level encryption protect your assets 24/7.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="bg-[#12121A] border border-white/10 p-8 hover:border-[#00E599]/50 transition-colors duration-200" data-testid="feature-speed">
              <Lightning size={48} weight="duotone" className="text-[#00E599] mb-6" />
              <h3 className="text-xl font-bold mb-3" style={{ fontFamily: 'Unbounded' }}>
                Lightning Fast
              </h3>
              <p className="text-[#8F8F9D]">
                Execute trades in milliseconds with our high-performance matching engine built for volume.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="bg-[#12121A] border border-white/10 p-8 hover:border-[#00E599]/50 transition-colors duration-200" data-testid="feature-global">
              <Globe size={48} weight="duotone" className="text-[#00E599] mb-6" />
              <h3 className="text-xl font-bold mb-3" style={{ fontFamily: 'Unbounded' }}>
                Global Access
              </h3>
              <p className="text-[#8F8F9D]">
                Trade from anywhere in the world with 24/7 market access and multi-currency support.
              </p>
            </div>

            {/* Feature 4 */}
            <div className="bg-[#12121A] border border-white/10 p-8 hover:border-[#00E599]/50 transition-colors duration-200" data-testid="feature-wallet">
              <Wallet size={48} weight="duotone" className="text-[#00E599] mb-6" />
              <h3 className="text-xl font-bold mb-3" style={{ fontFamily: 'Unbounded' }}>
                Unified Wallet
              </h3>
              <p className="text-[#8F8F9D]">
                Manage all your crypto assets in one secure wallet with instant deposits and withdrawals.
              </p>
            </div>

            {/* Feature 5 */}
            <div className="bg-[#12121A] border border-white/10 p-8 hover:border-[#00E599]/50 transition-colors duration-200" data-testid="feature-charts">
              <ChartLineUp size={48} weight="duotone" className="text-[#00E599] mb-6" />
              <h3 className="text-xl font-bold mb-3" style={{ fontFamily: 'Unbounded' }}>
                Advanced Charts
              </h3>
              <p className="text-[#8F8F9D]">
                Professional trading tools with real-time charts, indicators, and market analysis.
              </p>
            </div>

            {/* Feature 6 - Image */}
            <div className="bg-[#12121A] border border-white/10 overflow-hidden" data-testid="feature-vault-image">
              <img 
                src="https://images.pexels.com/photos/19920920/pexels-photo-19920920.jpeg?w=600&q=80"
                alt="Secure Vault"
                className="w-full h-full object-cover"
              />
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 px-6 bg-[#12121A]">
        <div className="max-w-4xl mx-auto text-center">
          <h2 
            className="text-3xl sm:text-4xl font-bold mb-6"
            style={{ fontFamily: 'Unbounded' }}
            data-testid="cta-title"
          >
            Ready to Start Trading?
          </h2>
          <p className="text-lg text-[#8F8F9D] mb-8">
            Join thousands of traders who trust CryptoVault for their crypto investments.
          </p>
          <Link to="/register" data-testid="cta-button">
            <button className="btn-primary text-lg px-8 py-4 flex items-center gap-3 mx-auto">
              Create Free Account <ArrowRight size={24} weight="bold" />
            </button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-6 border-t border-white/10">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <Vault size={24} weight="duotone" className="text-[#00E599]" />
              <span className="font-bold tracking-tight" style={{ fontFamily: 'Unbounded' }}>
                CryptoVault
              </span>
            </div>
            <p className="text-sm text-[#8F8F9D]" data-testid="footer-copyright">
              © 2025 CryptoVault Exchange. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
