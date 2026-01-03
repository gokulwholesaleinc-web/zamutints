const os = require('os');
const crypto = require('crypto');

/**
 * License client for validating software licenses
 */
class LicenseClient {
  constructor(config) {
    this.licenseKey = config.licenseKey;
    this.serverUrl = (config.serverUrl || '').replace(/\/$/, '');
    this.appSlug = config.appSlug;
    this.timeout = config.timeout || 10000;
    this.cachedValidation = null;
    this.cachedValidationTime = 0;
    this.cacheValidityMs = 60000; // 1 minute cache
    this.machineFingerprint = this.generateMachineFingerprint();
  }

  generateMachineFingerprint() {
    const data = [
      os.hostname(),
      os.platform(),
      os.arch(),
      os.cpus().map(c => c.model).join(','),
      Object.values(os.networkInterfaces())
        .flat()
        .filter(n => !n.internal && n.mac !== '00:00:00:00:00:00')
        .map(n => n.mac)
        .join(',')
    ].join('|');

    return crypto.createHash('sha256').update(data).digest('hex').substring(0, 32);
  }

  async request(endpoint, options = {}) {
    const url = `${this.serverUrl}${endpoint}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        const error = new Error(data.error || data.message || 'License server error');
        error.code = data.code || 'SERVER_ERROR';
        error.statusCode = response.status;
        throw error;
      }

      return data;
    } catch (error) {
      if (error.name === 'AbortError') {
        const timeoutError = new Error('Request timeout');
        timeoutError.code = 'TIMEOUT';
        throw timeoutError;
      }
      throw error;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  async validate(useCache = true) {
    if (
      useCache &&
      this.cachedValidation &&
      Date.now() - this.cachedValidationTime < this.cacheValidityMs
    ) {
      return this.cachedValidation;
    }

    const response = await this.request('/api/validate', {
      method: 'POST',
      body: JSON.stringify({
        licenseKey: this.licenseKey,
        appSlug: this.appSlug,
        machineFingerprint: this.machineFingerprint
      }),
    });

    this.cachedValidation = response;
    this.cachedValidationTime = Date.now();

    return response;
  }

  async activate(machineName) {
    const response = await this.request('/api/validate/activate', {
      method: 'POST',
      body: JSON.stringify({
        licenseKey: this.licenseKey,
        machineFingerprint: this.machineFingerprint,
        machineName: machineName || os.hostname()
      }),
    });

    this.cachedValidation = null;
    return response;
  }

  async deactivate() {
    const response = await this.request('/api/validate/deactivate', {
      method: 'POST',
      body: JSON.stringify({
        licenseKey: this.licenseKey,
        machineFingerprint: this.machineFingerprint
      }),
    });

    this.cachedValidation = null;
    return response;
  }

  async heartbeat() {
    return this.request('/api/validate/heartbeat', {
      method: 'POST',
      body: JSON.stringify({
        licenseKey: this.licenseKey,
        machineFingerprint: this.machineFingerprint
      }),
    });
  }

  async hasFeature(feature) {
    const validation = await this.validate();
    return validation.features && validation.features.includes(feature);
  }

  clearCache() {
    this.cachedValidation = null;
    this.cachedValidationTime = 0;
  }
}

module.exports = { LicenseClient };
