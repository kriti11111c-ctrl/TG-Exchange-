import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth, API } from "../App";
import axios from "axios";
import { toast } from "sonner";
import { Vault, EnvelopeSimple, Lock, GoogleLogo } from "@phosphor-icons/react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";

const LoginPage = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await axios.post(`${API}/auth/login`, {
        email,
        password
      }, { withCredentials: true });

      login(response.data.user, response.data.access_token);
      toast.success("Login successful!");
      navigate("/dashboard");
    } catch (error) {
      toast.error(error.response?.data?.detail || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    // REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
    const redirectUrl = window.location.origin + '/dashboard';
    window.location.href = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] flex">
      {/* Left side - Form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md space-y-8">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-3 mb-12" data-testid="login-logo">
            <Vault size={32} weight="duotone" className="text-[#00E599]" />
            <span className="font-bold text-xl tracking-tight" style={{ fontFamily: 'Unbounded' }}>
              CryptoVault
            </span>
          </Link>

          <div>
            <h1 
              className="text-3xl font-bold mb-2" 
              style={{ fontFamily: 'Unbounded' }}
              data-testid="login-title"
            >
              Welcome Back
            </h1>
            <p className="text-[#8F8F9D]">Enter your credentials to access your account</p>
          </div>

          {/* Google Login Button */}
          <Button
            type="button"
            onClick={handleGoogleLogin}
            variant="outline"
            className="w-full py-6 border-white/20 hover:bg-white/10 hover:border-white/40 flex items-center justify-center gap-3"
            data-testid="google-login-btn"
          >
            <GoogleLogo size={24} weight="bold" />
            Continue with Google
          </Button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-white/10" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-[#0A0A0A] px-2 text-[#8F8F9D]">Or continue with email</span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-[#8F8F9D]">Email</Label>
              <div className="relative">
                <EnvelopeSimple 
                  size={20} 
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8F8F9D]" 
                />
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  className="pl-10 py-6 bg-[#12121A] border-white/20 focus:border-[#00E599] focus:ring-[#00E599]"
                  required
                  data-testid="login-email-input"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-[#8F8F9D]">Password</Label>
              <div className="relative">
                <Lock 
                  size={20} 
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8F8F9D]" 
                />
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="pl-10 py-6 bg-[#12121A] border-white/20 focus:border-[#00E599] focus:ring-[#00E599]"
                  required
                  data-testid="login-password-input"
                />
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full py-6 bg-[#00E599] hover:bg-[#00C282] text-black font-semibold"
              data-testid="login-submit-btn"
            >
              {loading ? "Signing in..." : "Sign In"}
            </Button>
          </form>

          <p className="text-center text-[#8F8F9D]">
            Don't have an account?{" "}
            <Link to="/register" className="text-[#00E599] hover:underline" data-testid="login-register-link">
              Create one
            </Link>
          </p>
        </div>
      </div>

      {/* Right side - Image */}
      <div className="hidden lg:block lg:flex-1 relative">
        <img
          src="https://images.unsplash.com/photo-1642413598014-7742a18e85aa?w=1200&q=80"
          alt="Crypto"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-l from-transparent to-[#0A0A0A]" />
      </div>
    </div>
  );
};

export default LoginPage;
