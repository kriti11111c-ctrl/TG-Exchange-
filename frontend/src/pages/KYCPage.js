import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTheme, API } from "../App";
import axios from "axios";
import { toast } from "sonner";
import BottomNav from "../components/BottomNav";
import { 
  ArrowLeft, 
  IdentificationCard,
  Phone,
  Calendar,
  Globe,
  CheckCircle,
  Clock,
  XCircle,
  ShieldCheck,
  Warning
} from "@phosphor-icons/react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";

const COUNTRIES = [
  "India", "United States", "United Kingdom", "Canada", "Australia",
  "Germany", "France", "Japan", "Singapore", "UAE", "Other"
];

const KYCPage = () => {
  const { isDark } = useTheme();
  const navigate = useNavigate();
  const [kycStatus, setKycStatus] = useState("loading");
  const [kycData, setKycData] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  
  // Form fields
  const [aadharNumber, setAadharNumber] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [country, setCountry] = useState("India");

  const bg = isDark ? 'bg-[#0B0E11]' : 'bg-gray-50';
  const cardBg = isDark ? 'bg-[#1E2329]' : 'bg-white';
  const text = isDark ? 'text-white' : 'text-gray-900';
  const textMuted = isDark ? 'text-[#848E9C]' : 'text-gray-500';
  const border = isDark ? 'border-[#2B3139]' : 'border-gray-200';
  const inputBg = isDark ? 'bg-[#0B0E11]' : 'bg-gray-50';

  useEffect(() => {
    fetchKYCStatus();
  }, []);

  const fetchKYCStatus = async () => {
    try {
      const res = await axios.get(`${API}/user/kyc/status`, { withCredentials: true });
      setKycStatus(res.data.status);
      setKycData(res.data.kyc);
    } catch (error) {
      console.error("Error fetching KYC status:", error);
      setKycStatus("not_submitted");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validation
    if (!aadharNumber || aadharNumber.length !== 12) {
      toast.error("Please enter valid 12-digit Aadhar number");
      return;
    }
    
    if (!phoneNumber || phoneNumber.length < 10) {
      toast.error("Please enter valid phone number");
      return;
    }
    
    if (!dateOfBirth) {
      toast.error("Please enter your date of birth");
      return;
    }
    
    setSubmitting(true);
    try {
      await axios.post(`${API}/user/kyc/submit`, {
        aadhar_number: aadharNumber,
        phone_number: phoneNumber,
        date_of_birth: dateOfBirth,
        country: country
      }, { withCredentials: true });
      
      toast.success("KYC submitted! Under verification.");
      fetchKYCStatus();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to submit KYC");
    } finally {
      setSubmitting(false);
    }
  };

  const formatAadhar = (value) => {
    // Only allow digits
    const digits = value.replace(/\D/g, '');
    // Limit to 12 digits
    return digits.slice(0, 12);
  };

  const getStatusColor = (status) => {
    switch(status) {
      case "verified": return "text-[#0ECB81]";
      case "pending": return "text-[#00E5FF]";
      case "rejected": return "text-[#F6465D]";
      default: return textMuted;
    }
  };

  const getStatusIcon = (status) => {
    switch(status) {
      case "verified": return <CheckCircle size={48} className="text-[#0ECB81]" weight="fill" />;
      case "pending": return <Clock size={48} className="text-[#00E5FF]" weight="fill" />;
      case "rejected": return <XCircle size={48} className="text-[#F6465D]" weight="fill" />;
      default: return <ShieldCheck size={48} className={textMuted} />;
    }
  };

  const getStatusText = (status) => {
    switch(status) {
      case "verified": return "Verified";
      case "pending": return "Under Verification";
      case "rejected": return "Rejected";
      default: return "Not Submitted";
    }
  };

  return (
    <div className={`min-h-screen ${bg} pb-20`}>
      {/* Header */}
      <div className={`${cardBg} border-b ${border} sticky top-0 z-40`}>
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate(-1)} className={`p-2 rounded-lg ${isDark ? 'hover:bg-[#2B3139]' : 'hover:bg-gray-100'}`}>
              <ArrowLeft size={24} className={text} />
            </button>
            <h1 className={`text-xl font-bold ${text}`}>KYC Verification</h1>
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto p-4 space-y-4">
        {/* Status Card */}
        <div className={`${cardBg} rounded-xl p-6 border ${border} text-center`}>
          <div className="flex flex-col items-center gap-3">
            {getStatusIcon(kycStatus)}
            <h2 className={`text-xl font-bold ${getStatusColor(kycStatus)}`}>
              {getStatusText(kycStatus)}
            </h2>
            {kycStatus === "pending" && (
              <p className={`text-sm ${textMuted}`}>
                Your documents are being reviewed. This usually takes 24-48 hours.
              </p>
            )}
            {kycStatus === "verified" && (
              <p className={`text-sm ${textMuted}`}>
                Your identity has been verified. You have full access to all features.
              </p>
            )}
            {kycStatus === "rejected" && kycData?.rejection_reason && (
              <div className="bg-[#F6465D]/10 rounded-lg p-3 mt-2 w-full">
                <p className="text-[#F6465D] text-sm">
                  <Warning size={16} className="inline mr-1" />
                  Reason: {kycData.rejection_reason}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Show KYC Details if submitted */}
        {(kycStatus === "pending" || kycStatus === "verified") && kycData && (
          <div className={`${cardBg} rounded-xl p-4 border ${border}`}>
            <h3 className={`font-bold mb-4 ${text}`}>Submitted Details</h3>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <IdentificationCard size={20} className={textMuted} />
                <div>
                  <p className={`text-xs ${textMuted}`}>Aadhar Number</p>
                  <p className={`font-medium ${text}`}>
                    {kycData.aadhar_number.slice(0,4)}****{kycData.aadhar_number.slice(-4)}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Phone size={20} className={textMuted} />
                <div>
                  <p className={`text-xs ${textMuted}`}>Phone Number</p>
                  <p className={`font-medium ${text}`}>{kycData.phone_number}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Calendar size={20} className={textMuted} />
                <div>
                  <p className={`text-xs ${textMuted}`}>Date of Birth</p>
                  <p className={`font-medium ${text}`}>{kycData.date_of_birth}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Globe size={20} className={textMuted} />
                <div>
                  <p className={`text-xs ${textMuted}`}>Country</p>
                  <p className={`font-medium ${text}`}>{kycData.country}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* KYC Form - Show only if not submitted or rejected */}
        {(kycStatus === "not_submitted" || kycStatus === "rejected") && (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Aadhar Number */}
            <div className={`${cardBg} rounded-xl p-4 border ${border}`}>
              <Label className={`${textMuted} flex items-center gap-2 mb-2`}>
                <IdentificationCard size={18} />
                Aadhar Card Number
              </Label>
              <Input
                type="text"
                value={aadharNumber}
                onChange={(e) => setAadharNumber(formatAadhar(e.target.value))}
                placeholder="Enter 12-digit Aadhar number"
                className={`${inputBg} border ${border} ${text}`}
                maxLength={12}
                data-testid="kyc-aadhar-input"
              />
              <p className={`text-xs ${textMuted} mt-1`}>
                {aadharNumber.length}/12 digits
              </p>
            </div>

            {/* Phone Number */}
            <div className={`${cardBg} rounded-xl p-4 border ${border}`}>
              <Label className={`${textMuted} flex items-center gap-2 mb-2`}>
                <Phone size={18} />
                Phone Number
              </Label>
              <Input
                type="tel"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value.replace(/[^0-9+\-\s]/g, ''))}
                placeholder="+91 9876543210"
                className={`${inputBg} border ${border} ${text}`}
                data-testid="kyc-phone-input"
              />
            </div>

            {/* Date of Birth */}
            <div className={`${cardBg} rounded-xl p-4 border ${border}`}>
              <Label className={`${textMuted} flex items-center gap-2 mb-2`}>
                <Calendar size={18} />
                Date of Birth
              </Label>
              <Input
                type="date"
                value={dateOfBirth}
                onChange={(e) => setDateOfBirth(e.target.value)}
                className={`${inputBg} border ${border} ${text}`}
                max={new Date(new Date().setFullYear(new Date().getFullYear() - 18)).toISOString().split('T')[0]}
                data-testid="kyc-dob-input"
              />
              <p className={`text-xs ${textMuted} mt-1`}>
                You must be at least 18 years old
              </p>
            </div>

            {/* Country */}
            <div className={`${cardBg} rounded-xl p-4 border ${border}`}>
              <Label className={`${textMuted} flex items-center gap-2 mb-2`}>
                <Globe size={18} />
                Country
              </Label>
              <select
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                className={`w-full p-3 rounded-lg border ${border} ${inputBg} ${text}`}
                data-testid="kyc-country-select"
              >
                {COUNTRIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              disabled={submitting}
              className="w-full py-6 bg-[#00E5FF] hover:bg-[#E5AF0A] text-black font-bold text-lg"
              data-testid="kyc-submit-btn"
            >
              {submitting ? "Submitting..." : "Submit for Verification"}
            </Button>

            {/* Info */}
            <p className={`text-xs ${textMuted} text-center`}>
              By submitting, you agree to our verification process. Your data is encrypted and secure.
            </p>
          </form>
        )}
      </div>
      
      <BottomNav />
    </div>
  );
};

export default KYCPage;
