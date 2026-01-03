import { useState } from 'react';
import { Key, Shield, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { api } from '../utils/api';

function LicenseActivation({ onSuccess, currentKey }) {
  const [licenseKey, setLicenseKey] = useState(currentKey || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const formatLicenseKey = (value) => {
    // Remove all non-alphanumeric characters and convert to uppercase
    const clean = value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    // Add dashes every 4 characters
    const parts = clean.match(/.{1,4}/g) || [];
    return parts.join('-').slice(0, 19); // XXXX-XXXX-XXXX-XXXX = 19 chars
  };

  const handleKeyChange = (e) => {
    const formatted = formatLicenseKey(e.target.value);
    setLicenseKey(formatted);
    setError(null);
    setSuccess(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (licenseKey.length !== 19) {
      setError('Please enter a valid license key (XXXX-XXXX-XXXX-XXXX)');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await api.post('/admin/license/activate', { licenseKey });

      if (response.success) {
        setSuccess('License activated successfully!');
        if (onSuccess) {
          onSuccess(response);
        }
      } else {
        setError(response.error || 'License activation failed');
      }
    } catch (err) {
      setError(err.message || 'Failed to activate license');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card">
      <h2 className="text-lg font-semibold text-white mb-6 flex items-center">
        <Key className="w-5 h-5 mr-2 text-primary-400" />
        License Activation
      </h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-dark-400 mb-2">
            License Key
          </label>
          <div className="relative">
            <input
              type="text"
              value={licenseKey}
              onChange={handleKeyChange}
              placeholder="XXXX-XXXX-XXXX-XXXX"
              className="input font-mono text-lg tracking-wider text-center uppercase"
              maxLength={19}
              disabled={loading}
            />
            <Shield className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-500" />
          </div>
          <p className="text-dark-500 text-xs mt-2">
            Enter your license key from the License Management Platform
          </p>
        </div>

        {error && (
          <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
            <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        {success && (
          <div className="flex items-center gap-2 p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
            <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0" />
            <p className="text-green-400 text-sm">{success}</p>
          </div>
        )}

        <button
          type="submit"
          disabled={loading || licenseKey.length !== 19}
          className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin inline" />
              Validating...
            </>
          ) : (
            <>
              <Shield className="w-4 h-4 mr-2 inline" />
              Activate License
            </>
          )}
        </button>
      </form>

      <div className="mt-6 pt-4 border-t border-dark-700">
        <p className="text-dark-500 text-xs text-center">
          Need a license? Contact your administrator or visit the License Management Platform.
        </p>
      </div>
    </div>
  );
}

export default LicenseActivation;
