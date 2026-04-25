import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTheme, useAuth, API } from "../App";
import axios from "axios";
import { 
  CaretLeft,
  Fingerprint,
  CheckCircle,
  Warning,
  Clock,
  XCircle
} from "@phosphor-icons/react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { toast } from "sonner";
import BottomNav from "../components/BottomNav";

const KYCPage = () => {
  const { isDark } = useTheme();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [kycStatus, setKycStatus] = useState(null);
  const [formData, setFormData] = useState({
    aadhar_number: "",
    phone_number: "",
    date_of_birth: "",
    country: "India"
  });

  const bg = isDark ? 'bg-[#0B0E11]' : 'bg-gray-50';
  const cardBg = isDark ? 'bg-[#1E2329]' : 'bg-white';
  const text = isDark ? 'text-white' : 'text-gray-900';
  const textMuted = isDark ? 'text-[#848E9C]' : 'text-gray-500';
  const inputBg = isDark ? 'bg-[#2B3139]' : 'bg-gray-100';
  const border = isDark ? 'border-[#2B3139]' : 'border-gray-200';

  useEffect(() => {
    fetchKycStatus();
  }, []);

  const fetchKycStatus = async () => {
    try {
      const response = await axios.get(`${API}/user/kyc/status`, {
        withCredentials: false
      });
      setKycStatus(response.data);
    } catch (error) {
      console.error("Error fetching KYC status:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (formData.aadhar_number.length !== 12) {
      toast.error("Aadhar number must be 12 digits");
      return;
    }
    
    if (formData.phone_number.length < 10) {
      toast.error("Please enter a valid phone number");
      return;
    }

    if (!formData.date_of_birth) {
      toast.error("Please enter your date of birth");
      return;
    }

    setSubmitting(true);
    try {
      const response = await axios.post(`${API}/user/kyc/submit`, formData, {
        withCredentials: false
      });
      toast.success(response.data.message);
      fetchKycStatus();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to submit KYC");
    } finally {
      setSubmitting(false);
    }
  };

  const renderStatusCard = () => {
    if (!kycStatus || kycStatus.status === "unverified") {
      return null;
    }

    const statusConfig = {
      pending: {
        icon: <Clock size={48} className="text-yellow-500" />,
        title: "Verification Pending",
        description: "Your KYC is under review. Please wait for admin approval.",
        color: "bg-yellow-500/20 border-yellow-500/50"
      },
      verified: {
        icon: <CheckCircle size={48} className="text-[#0ECB81]" />,
        title: "KYC Verified",
        description: "Your identity has been verified successfully.",
        color: "bg-[#0ECB81]/20 border-[#0ECB81]/50"
      },
      rejected: {
        icon: <XCircle size={48} className="text-[#F6465D]" />,
        title: "KYC Rejected",
        description: kycStatus.kyc?.rejection_reason || "Your KYC was rejected. Please contact support.",
        color: "bg-[#F6465D]/20 border-[#F6465D]/50"
      }
    };

    const config = statusConfig[kycStatus.status];

    return (
      <div className={`${cardBg} rounded-2xl p-6 border ${config.color} mb-6`}>
        <div className="flex flex-col items-center text-center">
          {config.icon}
          <h3 className={`text-lg font-bold ${text} mt-4`}>{config.title}</h3>
          <p className={`${textMuted} mt-2`}>{config.description}</p>
          {kycStatus.kyc?.submitted_at && (
            <p className={`text-xs ${textMuted} mt-3`}>
              Submitted: {new Date(kycStatus.kyc.submitted_at).toLocaleDateString()}
            </p>
          )}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className={`min-h-screen ${bg} flex items-center justify-center`}>
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#00E5FF]"></div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${bg} pb-24`}>
      {/* Header */}
      <header className={`${cardBg} border-b ${border} sticky top-0 z-50`}>
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate(-1)} className={`p-2 rounded-lg ${isDark ? 'hover:bg-[#2B3139]' : 'hover:bg-gray-100'}`}>
              <CaretLeft size={24} className={text} />
            </button>
            <h1 className={`text-lg font-bold ${text}`}>KYC Verification</h1>
          </div>
        </div>
      </header>

      <main className="px-4 py-6 max-w-md mx-auto">
        {/* Info Card */}
        <div className={`${cardBg} rounded-2xl p-4 mb-6 border ${border}`}>
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-[#00E5FF]/20 flex items-center justify-center flex-shrink-0">
              <Fingerprint size={24} className="text-[#00E5FF]" />
            </div>
            <div>
              <h3 className={`font-semibold ${text}`}>Identity Verification</h3>
              <p className={`text-sm ${textMuted} mt-1`}>
                Complete KYC to unlock all features including withdrawals and higher limits.
              </p>
            </div>
          </div>
        </div>

        {/* Status Card */}
        {renderStatusCard()}

        {/* KYC Form - Only show if not submitted */}
        {(!kycStatus || kycStatus.status === "unverified" || kycStatus.status === "rejected") && (
          <div className={`${cardBg} rounded-2xl p-6 border ${border}`}>
            <h3 className={`font-semibold ${text} mb-4`}>Submit Documents</h3>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Aadhar Number */}
              <div>
                <label className={`text-sm ${textMuted} block mb-2`}>Aadhar Number</label>
                <Input
                  type="text"
                  placeholder="Enter 12-digit Aadhar number"
                  value={formData.aadhar_number}
                  onChange={(e) => setFormData({...formData, aadhar_number: e.target.value.replace(/\D/g, '').slice(0, 12)})}
                  className={`${inputBg} border-0 ${text}`}
                  maxLength={12}
                  data-testid="aadhar-input"
                />
              </div>

              {/* Phone Number */}
              <div>
                <label className={`text-sm ${textMuted} block mb-2`}>Phone Number</label>
                <Input
                  type="tel"
                  placeholder="Enter phone number"
                  value={formData.phone_number}
                  onChange={(e) => setFormData({...formData, phone_number: e.target.value.replace(/\D/g, '').slice(0, 15)})}
                  className={`${inputBg} border-0 ${text}`}
                  data-testid="phone-input"
                />
              </div>

              {/* Date of Birth */}
              <div>
                <label className={`text-sm ${textMuted} block mb-2`}>Date of Birth</label>
                <Input
                  type="date"
                  value={formData.date_of_birth}
                  onChange={(e) => setFormData({...formData, date_of_birth: e.target.value})}
                  className={`${inputBg} border-0 ${text}`}
                  data-testid="dob-input"
                />
              </div>

              {/* Country */}
              <div>
                <label className={`text-sm ${textMuted} block mb-2`}>Country</label>
                <select
                  value={formData.country}
                  onChange={(e) => setFormData({...formData, country: e.target.value})}
                  className={`w-full px-3 py-2 rounded-lg ${inputBg} ${text} border-0`}
                  data-testid="country-select"
                >
                  <option value="India">India</option>
                  <option value="USA">USA</option>
                  <option value="UK">UK</option>
                  <option value="UAE">UAE</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                disabled={submitting}
                className="w-full bg-[#00E5FF] hover:bg-[#00E5FF]/90 text-black font-semibold py-6 mt-4"
                data-testid="submit-kyc-btn"
              >
                {submitting ? "Submitting..." : "Submit for Verification"}
              </Button>
            </form>
          </div>
        )}

        {/* Requirements */}
        <div className={`${cardBg} rounded-2xl p-4 mt-6 border ${border}`}>
          <h3 className={`font-semibold ${text} mb-3`}>Requirements</h3>
          <ul className={`text-sm ${textMuted} space-y-2`}>
            <li className="flex items-center gap-2">
              <CheckCircle size={16} className="text-[#0ECB81]" />
              Valid Aadhar card number
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle size={16} className="text-[#0ECB81]" />
              Active phone number
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle size={16} className="text-[#0ECB81]" />
              Must be 18 years or older
            </li>
          </ul>
        </div>
      </main>

      <BottomNav />
    </div>
  );
};

export default KYCPage;
