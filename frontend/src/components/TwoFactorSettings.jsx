import { useState, useEffect } from 'react';
import { API, useTheme } from '../App';
import axios from 'axios';
import { toast } from 'sonner';
import { Shield, ShieldCheck, QrCode, Copy, CheckCircle } from '@phosphor-icons/react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';

const TwoFactorSettings = () => {
  const { isDark } = useTheme();
  const [status, setStatus] = useState({ enabled: false, pending: false });
  const [setupData, setSetupData] = useState(null);
  const [verifyCode, setVerifyCode] = useState('');
  const [disableCode, setDisableCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [showSetup, setShowSetup] = useState(false);
  const [showDisable, setShowDisable] = useState(false);
  const [copied, setCopied] = useState(false);

  const cardBg = isDark ? 'bg-[#1E2329]' : 'bg-white';
  const text = isDark ? 'text-white' : 'text-gray-900';
  const textMuted = isDark ? 'text-[#848E9C]' : 'text-gray-500';
  const border = isDark ? 'border-[#2B3139]' : 'border-gray-200';

  useEffect(() => {
    fetchStatus();
  }, []);

  const fetchStatus = async () => {
    try {
      const response = await axios.get(`${API}/2fa/status`, { });
      setStatus(response.data);
    } catch (error) {
      console.error('Error fetching 2FA status:', error);
    }
  };

  const startSetup = async () => {
    setLoading(true);
    try {
      const response = await axios.post(`${API}/2fa/setup`, {}, { });
      setSetupData(response.data);
      setShowSetup(true);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to start 2FA setup');
    } finally {
      setLoading(false);
    }
  };

  const verifyAndEnable = async () => {
    if (verifyCode.length !== 6) {
      toast.error('Please enter 6-digit code');
      return;
    }

    setLoading(true);
    try {
      await axios.post(`${API}/2fa/verify`, { code: verifyCode }, { });
      toast.success('2FA enabled successfully!');
      setShowSetup(false);
      setSetupData(null);
      setVerifyCode('');
      fetchStatus();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Invalid code');
    } finally {
      setLoading(false);
    }
  };

  const disable2FA = async () => {
    if (disableCode.length !== 6) {
      toast.error('Please enter 6-digit code');
      return;
    }

    setLoading(true);
    try {
      await axios.post(`${API}/2fa/disable`, { code: disableCode }, { });
      toast.success('2FA disabled successfully');
      setShowDisable(false);
      setDisableCode('');
      fetchStatus();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Invalid code');
    } finally {
      setLoading(false);
    }
  };

  const copySecret = () => {
    if (setupData?.manual_key) {
      navigator.clipboard.writeText(setupData.manual_key);
      setCopied(true);
      toast.success('Secret key copied!');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className={`${cardBg} rounded-xl p-4 border ${border}`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          {status.enabled ? (
            <ShieldCheck size={24} className="text-[#0ECB81]" />
          ) : (
            <Shield size={24} className={textMuted} />
          )}
          <div>
            <h3 className={`font-bold ${text}`}>Two-Factor Authentication</h3>
            <p className={`text-sm ${textMuted}`}>
              {status.enabled ? 'Enabled - Your account is protected' : 'Add an extra layer of security'}
            </p>
          </div>
        </div>
        
        {!showSetup && !showDisable && (
          <Button
            onClick={status.enabled ? () => setShowDisable(true) : startSetup}
            disabled={loading}
            className={status.enabled 
              ? 'bg-red-500 hover:bg-red-600 text-white' 
              : 'bg-[#00E5FF] hover:bg-[#00E5FF]/90 text-black'
            }
          >
            {loading ? 'Loading...' : status.enabled ? 'Disable' : 'Enable 2FA'}
          </Button>
        )}
      </div>

      {/* Setup Modal */}
      {showSetup && setupData && (
        <div className={`mt-4 p-4 rounded-lg ${isDark ? 'bg-[#0B0E11]' : 'bg-gray-50'} border ${border}`}>
          <h4 className={`font-bold mb-4 ${text}`}>Setup Google Authenticator</h4>
          
          <div className="space-y-4">
            {/* Step 1: QR Code */}
            <div>
              <p className={`text-sm ${textMuted} mb-2`}>
                1. Scan this QR code with Google Authenticator app
              </p>
              <div className="flex justify-center p-4 bg-white rounded-lg">
                <img src={setupData.qr_code} alt="2FA QR Code" className="w-48 h-48" />
              </div>
            </div>

            {/* Step 2: Manual Key */}
            <div>
              <p className={`text-sm ${textMuted} mb-2`}>
                2. Or enter this key manually:
              </p>
              <div className={`flex items-center gap-2 p-3 rounded-lg ${isDark ? 'bg-[#1E2329]' : 'bg-gray-100'}`}>
                <code className={`flex-1 font-mono text-sm ${text} break-all`}>
                  {setupData.manual_key}
                </code>
                <button onClick={copySecret} className="p-2 hover:bg-white/10 rounded">
                  {copied ? (
                    <CheckCircle size={20} className="text-[#0ECB81]" />
                  ) : (
                    <Copy size={20} className={textMuted} />
                  )}
                </button>
              </div>
            </div>

            {/* Step 3: Verify */}
            <div>
              <p className={`text-sm ${textMuted} mb-2`}>
                3. Enter the 6-digit code from the app:
              </p>
              <div className="flex gap-2">
                <Input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  placeholder="000000"
                  value={verifyCode}
                  onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, ''))}
                  className={`flex-1 text-center text-2xl tracking-widest font-mono ${isDark ? 'bg-[#1E2329] border-[#2B3139]' : ''}`}
                />
                <Button
                  onClick={verifyAndEnable}
                  disabled={loading || verifyCode.length !== 6}
                  className="bg-[#0ECB81] hover:bg-[#0ECB81]/90 text-white px-6"
                >
                  {loading ? 'Verifying...' : 'Verify'}
                </Button>
              </div>
            </div>

            <Button
              variant="ghost"
              onClick={() => { setShowSetup(false); setSetupData(null); setVerifyCode(''); }}
              className={textMuted}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Disable Modal */}
      {showDisable && (
        <div className={`mt-4 p-4 rounded-lg ${isDark ? 'bg-[#0B0E11]' : 'bg-gray-50'} border ${border}`}>
          <h4 className={`font-bold mb-4 text-red-500`}>Disable 2FA</h4>
          
          <p className={`text-sm ${textMuted} mb-4`}>
            Enter your current 6-digit code to disable 2FA:
          </p>
          
          <div className="flex gap-2">
            <Input
              type="text"
              inputMode="numeric"
              maxLength={6}
              placeholder="000000"
              value={disableCode}
              onChange={(e) => setDisableCode(e.target.value.replace(/\D/g, ''))}
              className={`flex-1 text-center text-2xl tracking-widest font-mono ${isDark ? 'bg-[#1E2329] border-[#2B3139]' : ''}`}
            />
            <Button
              onClick={disable2FA}
              disabled={loading || disableCode.length !== 6}
              className="bg-red-500 hover:bg-red-600 text-white px-6"
            >
              {loading ? 'Disabling...' : 'Disable'}
            </Button>
          </div>

          <Button
            variant="ghost"
            onClick={() => { setShowDisable(false); setDisableCode(''); }}
            className={`mt-2 ${textMuted}`}
          >
            Cancel
          </Button>
        </div>
      )}
    </div>
  );
};

export default TwoFactorSettings;
