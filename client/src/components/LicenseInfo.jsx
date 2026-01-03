import { useEffect, useState } from 'react';
import { Shield, CheckCircle, XCircle, AlertTriangle, Calendar, Key, Server } from 'lucide-react';
import { api } from '../utils/api';

function LicenseInfo() {
  const [license, setLicense] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchLicenseInfo();
  }, []);

  const fetchLicenseInfo = async () => {
    try {
      const data = await api.get('/admin/license');
      setLicense(data);
    } catch (err) {
      setError(err.message || 'Failed to fetch license info');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return 'text-green-400';
      case 'expired': return 'text-red-400';
      case 'suspended': return 'text-yellow-400';
      default: return 'text-dark-400';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'active': return <CheckCircle className="w-5 h-5 text-green-400" />;
      case 'expired': return <XCircle className="w-5 h-5 text-red-400" />;
      case 'suspended': return <AlertTriangle className="w-5 h-5 text-yellow-400" />;
      default: return <Shield className="w-5 h-5 text-dark-400" />;
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="card">
        <h2 className="text-lg font-semibold text-white mb-6 flex items-center">
          <Shield className="w-5 h-5 mr-2 text-primary-400" />
          License Information
        </h2>
        <div className="flex items-center justify-center h-32">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary-500"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card">
        <h2 className="text-lg font-semibold text-white mb-6 flex items-center">
          <Shield className="w-5 h-5 mr-2 text-primary-400" />
          License Information
        </h2>
        <div className="text-center py-8">
          <XCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <p className="text-red-400">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      <h2 className="text-lg font-semibold text-white mb-6 flex items-center">
        <Shield className="w-5 h-5 mr-2 text-primary-400" />
        License Information
      </h2>

      <div className="space-y-4">
        {/* Status */}
        <div className="flex items-center justify-between p-3 bg-dark-800 rounded-lg">
          <div className="flex items-center gap-3">
            {getStatusIcon(license?.status)}
            <div>
              <p className="text-dark-400 text-sm">Status</p>
              <p className={`font-semibold capitalize ${getStatusColor(license?.status)}`}>
                {license?.status || 'Unknown'}
              </p>
            </div>
          </div>
        </div>

        {/* License Type */}
        <div className="flex items-center justify-between p-3 bg-dark-800 rounded-lg">
          <div className="flex items-center gap-3">
            <Key className="w-5 h-5 text-primary-400" />
            <div>
              <p className="text-dark-400 text-sm">License Type</p>
              <p className="text-white font-semibold capitalize">{license?.type || 'Standard'}</p>
            </div>
          </div>
        </div>

        {/* Features */}
        {license?.features?.length > 0 && (
          <div className="p-3 bg-dark-800 rounded-lg">
            <p className="text-dark-400 text-sm mb-2">Licensed Features</p>
            <div className="flex flex-wrap gap-2">
              {license.features.map((feature) => (
                <span
                  key={feature}
                  className="px-2 py-1 bg-primary-500/20 text-primary-400 text-sm rounded"
                >
                  {feature}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Activations */}
        <div className="flex items-center justify-between p-3 bg-dark-800 rounded-lg">
          <div className="flex items-center gap-3">
            <Server className="w-5 h-5 text-blue-400" />
            <div>
              <p className="text-dark-400 text-sm">Activations</p>
              <p className="text-white font-semibold">
                {license?.currentActivations || 0} / {license?.maxActivations || 1}
              </p>
            </div>
          </div>
        </div>

        {/* Expiration */}
        <div className="flex items-center justify-between p-3 bg-dark-800 rounded-lg">
          <div className="flex items-center gap-3">
            <Calendar className="w-5 h-5 text-yellow-400" />
            <div>
              <p className="text-dark-400 text-sm">Expires</p>
              <p className={`font-semibold ${license?.expiresAt ? 'text-white' : 'text-green-400'}`}>
                {license?.expiresAt ? formatDate(license.expiresAt) : 'Never (Lifetime)'}
              </p>
            </div>
          </div>
        </div>

        {/* Activated At */}
        <div className="p-3 bg-dark-800 rounded-lg">
          <p className="text-dark-400 text-sm">Activated On This Machine</p>
          <p className="text-white">{formatDate(license?.activatedAt)}</p>
          <p className="text-dark-500 text-xs mt-1 font-mono">
            {license?.machineFingerprint}
          </p>
        </div>
      </div>
    </div>
  );
}

export default LicenseInfo;
