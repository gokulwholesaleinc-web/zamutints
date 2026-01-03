const { LicenseClient } = require('../lib/licenseClient');

// Global license client instance
let licenseClient = null;
let licenseValid = false;
let licenseError = null;
let heartbeatInterval = null;
let licenseDetails = null;

/**
 * Initialize the license client and validate license on startup
 */
async function initLicense() {
  const licenseKey = process.env.LICENSE_KEY;
  const licenseServer = process.env.LICENSE_SERVER_URL || 'http://localhost:9001';
  const appSlug = process.env.LICENSE_APP_SLUG || 'zamutints';

  // Skip license check in development if no key provided
  if (process.env.NODE_ENV === 'development' && !licenseKey) {
    console.log('[License] Running in development mode without license');
    licenseValid = true;
    return { valid: true, mode: 'development' };
  }

  if (!licenseKey) {
    throw new Error('LICENSE_KEY environment variable is required');
  }

  licenseClient = new LicenseClient({
    licenseKey,
    serverUrl: licenseServer,
    appSlug
  });

  try {
    // Validate the license
    const validation = await licenseClient.validate(false);

    if (!validation.valid) {
      licenseError = validation.error || 'License validation failed';
      throw new Error(licenseError);
    }

    // Activate on this machine
    const activation = await licenseClient.activate();

    if (!activation.success) {
      licenseError = activation.error || 'License activation failed';
      throw new Error(licenseError);
    }

    licenseValid = true;
    licenseDetails = {
      type: validation.license?.type || 'standard',
      status: validation.license?.status || 'active',
      features: validation.features || [],
      maxActivations: validation.license?.maxActivations || 1,
      currentActivations: validation.license?.currentActivations || 1,
      expiresAt: validation.license?.expiresAt || null,
      activatedAt: activation.activation?.activatedAt || new Date().toISOString()
    };

    console.log('[License] License validated and activated successfully');
    console.log(`[License] Type: ${licenseDetails.type}`);
    console.log(`[License] Features: ${licenseDetails.features.join(', ') || 'none'}`);

    // Start heartbeat every 12 hours
    heartbeatInterval = setInterval(async () => {
      try {
        const heartbeat = await licenseClient.heartbeat();
        if (!heartbeat.valid) {
          console.error('[License] Heartbeat failed:', heartbeat.error);
          licenseValid = false;
          licenseError = heartbeat.error;
        }
      } catch (err) {
        console.error('[License] Heartbeat error:', err.message);
      }
    }, 12 * 60 * 60 * 1000);

    return { valid: true, license: validation.license, features: validation.features };
  } catch (err) {
    licenseValid = false;
    licenseError = err.message;
    throw err;
  }
}

/**
 * Middleware to check if the app has a valid license
 * Only blocks ADMIN routes - customer pages always work
 */
function requireLicense(req, res, next) {
  if (licenseValid) {
    return next();
  }

  // Return license status so frontend can show appropriate message
  res.status(403).json({
    error: 'License required',
    licenseStatus: 'invalid',
    message: 'Your license is not active. Please enter a valid license key in settings.',
    details: process.env.NODE_ENV === 'development' ? licenseError : undefined
  });
}

/**
 * Middleware that checks license but doesn't block - just attaches status
 * Use this for pages that should work but show license warnings
 */
function checkLicenseStatus(req, res, next) {
  req.licenseStatus = {
    valid: licenseValid,
    error: licenseError,
    details: licenseDetails
  };
  next();
}

/**
 * Middleware to check if a specific feature is licensed
 */
function requireFeature(featureName) {
  return async (req, res, next) => {
    if (!licenseClient) {
      if (process.env.NODE_ENV === 'development') {
        return next();
      }
      return res.status(503).json({ error: 'License not initialized' });
    }

    try {
      const hasFeature = await licenseClient.hasFeature(featureName);
      if (hasFeature) {
        return next();
      }

      res.status(403).json({
        error: 'Feature not licensed',
        feature: featureName,
        message: `Your license does not include the "${featureName}" feature`
      });
    } catch (err) {
      res.status(500).json({ error: 'License check failed', message: err.message });
    }
  };
}

/**
 * Get current license status
 */
function getLicenseStatus() {
  return {
    valid: licenseValid,
    error: licenseError,
    machineFingerprint: licenseClient?.machineFingerprint
  };
}

/**
 * Get full license details for admin UI
 */
function getLicenseDetails() {
  if (!licenseValid) {
    return null;
  }

  return {
    ...licenseDetails,
    machineFingerprint: licenseClient?.machineFingerprint,
    serverUrl: process.env.LICENSE_SERVER_URL || 'http://localhost:9001'
  };
}

/**
 * Cleanup on shutdown
 */
async function shutdownLicense() {
  if (heartbeatInterval) {
    clearInterval(heartbeatInterval);
  }

  if (licenseClient && licenseValid) {
    try {
      await licenseClient.deactivate();
      console.log('[License] License deactivated');
    } catch (err) {
      console.error('[License] Failed to deactivate license:', err.message);
    }
  }
}

/**
 * Re-validate license with a new key (for UI activation)
 */
async function activateLicenseKey(newKey) {
  const licenseServer = process.env.LICENSE_SERVER_URL || 'http://localhost:9001';
  const appSlug = process.env.LICENSE_APP_SLUG || 'zamutints';

  // Create new client with new key
  const { LicenseClient } = require('../lib/licenseClient');
  const newClient = new LicenseClient({
    licenseKey: newKey,
    serverUrl: licenseServer,
    appSlug
  });

  try {
    // Validate the new license
    const validation = await newClient.validate(false);

    if (!validation.valid) {
      return { success: false, error: validation.error || 'License validation failed' };
    }

    // Activate on this machine
    const activation = await newClient.activate();

    if (!activation.success) {
      return { success: false, error: activation.error || 'License activation failed' };
    }

    // Update global state
    licenseClient = newClient;
    licenseValid = true;
    licenseError = null;
    licenseDetails = {
      type: validation.license?.type || 'standard',
      status: validation.license?.status || 'active',
      features: validation.features || [],
      maxActivations: validation.license?.maxActivations || 1,
      currentActivations: validation.license?.currentActivations || 1,
      expiresAt: validation.license?.expiresAt || null,
      activatedAt: activation.activation?.activatedAt || new Date().toISOString()
    };

    // Restart heartbeat with new client
    if (heartbeatInterval) {
      clearInterval(heartbeatInterval);
    }
    heartbeatInterval = setInterval(async () => {
      try {
        const heartbeat = await licenseClient.heartbeat();
        if (!heartbeat.valid) {
          console.error('[License] Heartbeat failed:', heartbeat.error);
          licenseValid = false;
          licenseError = heartbeat.error;
        }
      } catch (err) {
        console.error('[License] Heartbeat error:', err.message);
      }
    }, 12 * 60 * 60 * 1000);

    console.log('[License] New license activated successfully');
    return { success: true, license: licenseDetails };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

module.exports = {
  initLicense,
  requireLicense,
  checkLicenseStatus,
  requireFeature,
  getLicenseStatus,
  getLicenseDetails,
  activateLicenseKey,
  shutdownLicense
};
