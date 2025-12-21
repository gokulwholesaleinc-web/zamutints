import { useEffect, useState } from 'react';
import { Bell, Mail, MessageSquare, Send, Settings, Edit2, Save, X, RefreshCw } from 'lucide-react';
import { api } from '../../utils/api';

// Shared styles
const styles = {
  colors: {
    cyan: '#36B9EB',
    dark: '#1B1B1B',
    darkBg: '#0f0f0f',
    darkCard: '#1a1a1a',
    darkBorder: '#2a2a2a',
    gray: '#919191',
    white: '#ffffff',
    green: '#22c55e',
    red: '#ef4444',
    yellow: '#eab308'
  },
  card: {
    backgroundColor: '#1a1a1a',
    borderRadius: '12px',
    border: '1px solid #2a2a2a',
    padding: '24px'
  },
  input: {
    width: '100%',
    padding: '10px 14px',
    backgroundColor: '#0f0f0f',
    border: '1px solid #2a2a2a',
    borderRadius: '8px',
    color: '#ffffff',
    fontSize: '14px',
    outline: 'none'
  },
  button: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    padding: '10px 20px',
    borderRadius: '8px',
    fontWeight: '500',
    cursor: 'pointer',
    border: 'none',
    transition: 'all 0.2s'
  },
  primaryButton: {
    backgroundColor: '#36B9EB',
    color: '#1B1B1B'
  },
  secondaryButton: {
    backgroundColor: '#2a2a2a',
    color: '#ffffff'
  },
  tab: {
    padding: '12px 20px',
    borderRadius: '8px',
    cursor: 'pointer',
    border: 'none',
    fontWeight: '500',
    transition: 'all 0.2s'
  },
  activeTab: {
    backgroundColor: '#36B9EB',
    color: '#1B1B1B'
  },
  inactiveTab: {
    backgroundColor: 'transparent',
    color: '#919191'
  }
};

function AdminNotifications() {
  const [activeTab, setActiveTab] = useState('templates');
  const [templates, setTemplates] = useState([]);
  const [notificationLog, setNotificationLog] = useState([]);
  const [settings, setSettings] = useState({});
  const [loading, setLoading] = useState(true);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [sendForm, setSendForm] = useState({
    type: 'sms',
    recipient: '',
    message: '',
    subject: ''
  });
  const [testForm, setTestForm] = useState({
    type: 'sms',
    recipient: ''
  });
  const [sendStatus, setSendStatus] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [templatesData, settingsData, logData] = await Promise.all([
        api.get('/admin/notifications/templates'),
        api.get('/admin/notifications/settings'),
        api.get('/admin/notifications/log?limit=50')
      ]);
      setTemplates(templatesData);
      setSettings(settingsData);
      setNotificationLog(logData.logs || []);
    } catch (error) {
      console.error('Failed to fetch notification data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveTemplate = async (template) => {
    try {
      await api.put(`/admin/notifications/templates/${template.id}`, {
        name: template.name,
        type: template.type,
        subject: template.subject,
        content: template.content
      });
      setEditingTemplate(null);
      fetchData();
    } catch (error) {
      console.error('Failed to save template:', error);
      alert('Failed to save template');
    }
  };

  const handleUpdateSettings = async (key, value) => {
    try {
      const newSettings = { ...settings, [key]: value };
      setSettings(newSettings);
      await api.put('/admin/notifications/settings', { [key]: value });
    } catch (error) {
      console.error('Failed to update setting:', error);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    setSendStatus({ loading: true });
    try {
      if (sendForm.type === 'sms') {
        const result = await api.post('/admin/notifications/send-sms', {
          phone: sendForm.recipient,
          message: sendForm.message
        });
        setSendStatus({ success: true, message: result.message, stub: result.stub });
      } else {
        const result = await api.post('/admin/notifications/send-email', {
          to: sendForm.recipient,
          subject: sendForm.subject,
          html: sendForm.message
        });
        setSendStatus({ success: true, message: result.message, stub: result.stub });
      }
      setSendForm({ ...sendForm, recipient: '', message: '', subject: '' });
      fetchData();
    } catch (error) {
      setSendStatus({ success: false, message: error.message || 'Failed to send' });
    }
  };

  const handleSendTest = async () => {
    setSendStatus({ loading: true });
    try {
      const result = await api.post('/admin/notifications/test', {
        type: testForm.type,
        recipient: testForm.recipient
      });
      setSendStatus({ success: true, message: result.message, stub: result.stub });
      setTestForm({ type: 'sms', recipient: '' });
    } catch (error) {
      setSendStatus({ success: false, message: error.message || 'Failed to send test' });
    }
  };

  const formatTemplateName = (name) => {
    return name.split('_').map(word =>
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '256px' }}>
        <div style={{
          width: '48px',
          height: '48px',
          border: '3px solid #2a2a2a',
          borderTopColor: '#36B9EB',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 'bold', color: styles.colors.white, marginBottom: '8px' }}>
          Notifications
        </h1>
        <p style={{ color: styles.colors.gray }}>Manage SMS and email notifications for your customers</p>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', borderBottom: `1px solid ${styles.colors.darkBorder}`, paddingBottom: '12px' }}>
        {[
          { id: 'templates', label: 'Templates', icon: Edit2 },
          { id: 'send', label: 'Send Message', icon: Send },
          { id: 'log', label: 'History', icon: Bell },
          { id: 'settings', label: 'Settings', icon: Settings }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              ...styles.tab,
              ...(activeTab === tab.id ? styles.activeTab : styles.inactiveTab),
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <tab.icon size={16} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Templates Tab */}
      {activeTab === 'templates' && (
        <div style={{ display: 'grid', gap: '16px' }}>
          {templates.map(template => (
            <div key={template.id} style={styles.card}>
              {editingTemplate?.id === template.id ? (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <h3 style={{ fontSize: '18px', fontWeight: '600', color: styles.colors.white }}>
                      {formatTemplateName(template.name)}
                    </h3>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        onClick={() => handleSaveTemplate(editingTemplate)}
                        style={{ ...styles.button, ...styles.primaryButton, padding: '8px 16px' }}
                      >
                        <Save size={16} /> Save
                      </button>
                      <button
                        onClick={() => setEditingTemplate(null)}
                        style={{ ...styles.button, ...styles.secondaryButton, padding: '8px 16px' }}
                      >
                        <X size={16} /> Cancel
                      </button>
                    </div>
                  </div>
                  <div style={{ marginBottom: '16px' }}>
                    <label style={{ display: 'block', fontSize: '14px', color: styles.colors.gray, marginBottom: '6px' }}>
                      Email Subject
                    </label>
                    <input
                      type="text"
                      value={editingTemplate.subject || ''}
                      onChange={(e) => setEditingTemplate({ ...editingTemplate, subject: e.target.value })}
                      style={styles.input}
                      placeholder="Email subject line"
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '14px', color: styles.colors.gray, marginBottom: '6px' }}>
                      Message Content
                    </label>
                    <textarea
                      value={editingTemplate.content}
                      onChange={(e) => setEditingTemplate({ ...editingTemplate, content: e.target.value })}
                      style={{ ...styles.input, minHeight: '200px', resize: 'vertical', fontFamily: 'monospace' }}
                    />
                    <p style={{ fontSize: '12px', color: styles.colors.gray, marginTop: '8px' }}>
                      Available variables: {'{{first_name}}'}, {'{{service_name}}'}, {'{{variant_name}}'}, {'{{vehicle}}'}, {'{{appointment_date}}'}, {'{{appointment_time}}'}, {'{{total_amount}}'}, {'{{business_name}}'}, {'{{business_phone}}'}
                    </p>
                  </div>
                </div>
              ) : (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <h3 style={{ fontSize: '18px', fontWeight: '600', color: styles.colors.white }}>
                        {formatTemplateName(template.name)}
                      </h3>
                      <span style={{
                        padding: '4px 8px',
                        borderRadius: '4px',
                        fontSize: '12px',
                        backgroundColor: template.type === 'both' ? styles.colors.cyan + '20' :
                          template.type === 'sms' ? styles.colors.green + '20' : styles.colors.yellow + '20',
                        color: template.type === 'both' ? styles.colors.cyan :
                          template.type === 'sms' ? styles.colors.green : styles.colors.yellow
                      }}>
                        {template.type === 'both' ? 'SMS & Email' : template.type.toUpperCase()}
                      </span>
                    </div>
                    <button
                      onClick={() => setEditingTemplate({ ...template })}
                      style={{ ...styles.button, ...styles.secondaryButton, padding: '8px 16px' }}
                    >
                      <Edit2 size={16} /> Edit
                    </button>
                  </div>
                  {template.subject && (
                    <p style={{ color: styles.colors.gray, fontSize: '14px', marginBottom: '8px' }}>
                      <strong>Subject:</strong> {template.subject}
                    </p>
                  )}
                  <pre style={{
                    backgroundColor: styles.colors.darkBg,
                    padding: '16px',
                    borderRadius: '8px',
                    fontSize: '13px',
                    color: styles.colors.gray,
                    whiteSpace: 'pre-wrap',
                    fontFamily: 'monospace',
                    maxHeight: '150px',
                    overflow: 'auto'
                  }}>
                    {template.content}
                  </pre>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Send Message Tab */}
      {activeTab === 'send' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
          {/* Manual Send Form */}
          <div style={styles.card}>
            <h3 style={{ fontSize: '18px', fontWeight: '600', color: styles.colors.white, marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Send size={20} style={{ color: styles.colors.cyan }} />
              Send Manual Message
            </h3>
            <form onSubmit={handleSendMessage}>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '14px', color: styles.colors.gray, marginBottom: '6px' }}>
                  Message Type
                </label>
                <div style={{ display: 'flex', gap: '12px' }}>
                  <button
                    type="button"
                    onClick={() => setSendForm({ ...sendForm, type: 'sms' })}
                    style={{
                      ...styles.button,
                      flex: 1,
                      ...(sendForm.type === 'sms' ? styles.primaryButton : styles.secondaryButton)
                    }}
                  >
                    <MessageSquare size={16} /> SMS
                  </button>
                  <button
                    type="button"
                    onClick={() => setSendForm({ ...sendForm, type: 'email' })}
                    style={{
                      ...styles.button,
                      flex: 1,
                      ...(sendForm.type === 'email' ? styles.primaryButton : styles.secondaryButton)
                    }}
                  >
                    <Mail size={16} /> Email
                  </button>
                </div>
              </div>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '14px', color: styles.colors.gray, marginBottom: '6px' }}>
                  {sendForm.type === 'sms' ? 'Phone Number' : 'Email Address'}
                </label>
                <input
                  type={sendForm.type === 'sms' ? 'tel' : 'email'}
                  value={sendForm.recipient}
                  onChange={(e) => setSendForm({ ...sendForm, recipient: e.target.value })}
                  style={styles.input}
                  placeholder={sendForm.type === 'sms' ? '(312) 555-0123' : 'customer@email.com'}
                  required
                />
              </div>
              {sendForm.type === 'email' && (
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', fontSize: '14px', color: styles.colors.gray, marginBottom: '6px' }}>
                    Subject
                  </label>
                  <input
                    type="text"
                    value={sendForm.subject}
                    onChange={(e) => setSendForm({ ...sendForm, subject: e.target.value })}
                    style={styles.input}
                    placeholder="Message subject"
                    required
                  />
                </div>
              )}
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '14px', color: styles.colors.gray, marginBottom: '6px' }}>
                  Message
                </label>
                <textarea
                  value={sendForm.message}
                  onChange={(e) => setSendForm({ ...sendForm, message: e.target.value })}
                  style={{ ...styles.input, minHeight: '120px', resize: 'vertical' }}
                  placeholder="Type your message here..."
                  required
                />
              </div>
              <button
                type="submit"
                style={{ ...styles.button, ...styles.primaryButton, width: '100%' }}
                disabled={sendStatus?.loading}
              >
                {sendStatus?.loading ? <RefreshCw size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <Send size={16} />}
                Send Message
              </button>
            </form>
          </div>

          {/* Test Notification */}
          <div style={styles.card}>
            <h3 style={{ fontSize: '18px', fontWeight: '600', color: styles.colors.white, marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Bell size={20} style={{ color: styles.colors.cyan }} />
              Send Test Notification
            </h3>
            <p style={{ color: styles.colors.gray, marginBottom: '20px', fontSize: '14px' }}>
              Send a test message to verify your notification settings are working correctly.
            </p>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '14px', color: styles.colors.gray, marginBottom: '6px' }}>
                Test Type
              </label>
              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  type="button"
                  onClick={() => setTestForm({ ...testForm, type: 'sms' })}
                  style={{
                    ...styles.button,
                    flex: 1,
                    ...(testForm.type === 'sms' ? styles.primaryButton : styles.secondaryButton)
                  }}
                >
                  <MessageSquare size={16} /> SMS
                </button>
                <button
                  type="button"
                  onClick={() => setTestForm({ ...testForm, type: 'email' })}
                  style={{
                    ...styles.button,
                    flex: 1,
                    ...(testForm.type === 'email' ? styles.primaryButton : styles.secondaryButton)
                  }}
                >
                  <Mail size={16} /> Email
                </button>
              </div>
            </div>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '14px', color: styles.colors.gray, marginBottom: '6px' }}>
                {testForm.type === 'sms' ? 'Phone Number' : 'Email Address'}
              </label>
              <input
                type={testForm.type === 'sms' ? 'tel' : 'email'}
                value={testForm.recipient}
                onChange={(e) => setTestForm({ ...testForm, recipient: e.target.value })}
                style={styles.input}
                placeholder={testForm.type === 'sms' ? 'Your phone number' : 'Your email'}
              />
            </div>
            <button
              onClick={handleSendTest}
              style={{ ...styles.button, ...styles.secondaryButton, width: '100%' }}
              disabled={!testForm.recipient || sendStatus?.loading}
            >
              Send Test
            </button>

            {/* Status Message */}
            {sendStatus && !sendStatus.loading && (
              <div style={{
                marginTop: '16px',
                padding: '12px 16px',
                borderRadius: '8px',
                backgroundColor: sendStatus.success ? styles.colors.green + '20' : styles.colors.red + '20',
                color: sendStatus.success ? styles.colors.green : styles.colors.red,
                fontSize: '14px'
              }}>
                {sendStatus.message}
                {sendStatus.stub && (
                  <p style={{ marginTop: '4px', fontSize: '12px', opacity: 0.8 }}>
                    (Running in stub mode - configure environment variables for real notifications)
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* History/Log Tab */}
      {activeTab === 'log' && (
        <div style={styles.card}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: '600', color: styles.colors.white }}>
              Notification History
            </h3>
            <button
              onClick={fetchData}
              style={{ ...styles.button, ...styles.secondaryButton, padding: '8px 16px' }}
            >
              <RefreshCw size={16} /> Refresh
            </button>
          </div>
          {notificationLog.length === 0 ? (
            <p style={{ color: styles.colors.gray, textAlign: 'center', padding: '40px' }}>
              No notifications sent yet
            </p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: `1px solid ${styles.colors.darkBorder}` }}>
                    <th style={{ padding: '12px', textAlign: 'left', color: styles.colors.gray, fontWeight: '500', fontSize: '14px' }}>Type</th>
                    <th style={{ padding: '12px', textAlign: 'left', color: styles.colors.gray, fontWeight: '500', fontSize: '14px' }}>Recipient</th>
                    <th style={{ padding: '12px', textAlign: 'left', color: styles.colors.gray, fontWeight: '500', fontSize: '14px' }}>Customer</th>
                    <th style={{ padding: '12px', textAlign: 'left', color: styles.colors.gray, fontWeight: '500', fontSize: '14px' }}>Message</th>
                    <th style={{ padding: '12px', textAlign: 'left', color: styles.colors.gray, fontWeight: '500', fontSize: '14px' }}>Status</th>
                    <th style={{ padding: '12px', textAlign: 'left', color: styles.colors.gray, fontWeight: '500', fontSize: '14px' }}>Sent</th>
                  </tr>
                </thead>
                <tbody>
                  {notificationLog.map((log) => (
                    <tr key={log.id} style={{ borderBottom: `1px solid ${styles.colors.darkBorder}` }}>
                      <td style={{ padding: '12px' }}>
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '4px 8px',
                          borderRadius: '4px',
                          fontSize: '12px',
                          backgroundColor: log.type === 'sms' ? styles.colors.green + '20' : styles.colors.cyan + '20',
                          color: log.type === 'sms' ? styles.colors.green : styles.colors.cyan
                        }}>
                          {log.type === 'sms' ? <MessageSquare size={12} /> : <Mail size={12} />}
                          {log.type.toUpperCase()}
                        </span>
                      </td>
                      <td style={{ padding: '12px', color: styles.colors.white, fontSize: '14px' }}>
                        {log.recipient}
                      </td>
                      <td style={{ padding: '12px', color: styles.colors.gray, fontSize: '14px' }}>
                        {log.first_name ? `${log.first_name} ${log.last_name || ''}` : '-'}
                      </td>
                      <td style={{ padding: '12px', color: styles.colors.gray, fontSize: '14px', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {log.message}
                      </td>
                      <td style={{ padding: '12px' }}>
                        <span style={{
                          padding: '4px 8px',
                          borderRadius: '4px',
                          fontSize: '12px',
                          backgroundColor: log.status === 'sent' ? styles.colors.green + '20' : styles.colors.red + '20',
                          color: log.status === 'sent' ? styles.colors.green : styles.colors.red
                        }}>
                          {log.status}
                        </span>
                      </td>
                      <td style={{ padding: '12px', color: styles.colors.gray, fontSize: '14px' }}>
                        {new Date(log.sent_at).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Settings Tab */}
      {activeTab === 'settings' && (
        <div style={styles.card}>
          <h3 style={{ fontSize: '18px', fontWeight: '600', color: styles.colors.white, marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Settings size={20} style={{ color: styles.colors.cyan }} />
            Auto-Notification Settings
          </h3>
          <div style={{ display: 'grid', gap: '16px' }}>
            {[
              { key: 'auto_confirmation', label: 'Send Confirmation', desc: 'Automatically send confirmation when a booking is created' },
              { key: 'auto_reminder', label: 'Send Reminder', desc: 'Automatically send reminder before appointment' },
              { key: 'auto_service_complete', label: 'Service Complete', desc: 'Notify customer when service is marked complete' },
              { key: 'auto_review_request', label: 'Review Request', desc: 'Send review request after service completion' }
            ].map(setting => (
              <div
                key={setting.key}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '16px',
                  backgroundColor: styles.colors.darkBg,
                  borderRadius: '8px'
                }}
              >
                <div>
                  <p style={{ color: styles.colors.white, fontWeight: '500', marginBottom: '4px' }}>
                    {setting.label}
                  </p>
                  <p style={{ color: styles.colors.gray, fontSize: '14px' }}>
                    {setting.desc}
                  </p>
                </div>
                <label style={{ position: 'relative', display: 'inline-block', width: '48px', height: '26px' }}>
                  <input
                    type="checkbox"
                    checked={settings[setting.key] === 'true'}
                    onChange={(e) => handleUpdateSettings(setting.key, e.target.checked ? 'true' : 'false')}
                    style={{ opacity: 0, width: 0, height: 0 }}
                  />
                  <span style={{
                    position: 'absolute',
                    cursor: 'pointer',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: settings[setting.key] === 'true' ? styles.colors.cyan : styles.colors.darkBorder,
                    borderRadius: '26px',
                    transition: 'all 0.3s'
                  }}>
                    <span style={{
                      position: 'absolute',
                      height: '20px',
                      width: '20px',
                      left: settings[setting.key] === 'true' ? '24px' : '3px',
                      bottom: '3px',
                      backgroundColor: styles.colors.white,
                      borderRadius: '50%',
                      transition: 'all 0.3s'
                    }} />
                  </span>
                </label>
              </div>
            ))}

            {/* Reminder Hours Setting */}
            <div style={{
              padding: '16px',
              backgroundColor: styles.colors.darkBg,
              borderRadius: '8px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <p style={{ color: styles.colors.white, fontWeight: '500', marginBottom: '4px' }}>
                    Reminder Timing
                  </p>
                  <p style={{ color: styles.colors.gray, fontSize: '14px' }}>
                    Hours before appointment to send reminder
                  </p>
                </div>
                <select
                  value={settings.reminder_hours_before || '24'}
                  onChange={(e) => handleUpdateSettings('reminder_hours_before', e.target.value)}
                  style={{
                    ...styles.input,
                    width: 'auto',
                    minWidth: '120px'
                  }}
                >
                  <option value="12">12 hours</option>
                  <option value="24">24 hours</option>
                  <option value="48">48 hours</option>
                  <option value="72">72 hours</option>
                </select>
              </div>
            </div>
          </div>

          {/* Configuration Status */}
          <div style={{ marginTop: '32px', padding: '16px', backgroundColor: styles.colors.darkBg, borderRadius: '8px' }}>
            <h4 style={{ color: styles.colors.white, fontWeight: '500', marginBottom: '12px' }}>
              Service Configuration Status
            </h4>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  backgroundColor: styles.colors.yellow
                }} />
                <span style={{ color: styles.colors.gray, fontSize: '14px' }}>
                  Twilio SMS: Stub Mode
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  backgroundColor: styles.colors.yellow
                }} />
                <span style={{ color: styles.colors.gray, fontSize: '14px' }}>
                  SMTP Email: Stub Mode
                </span>
              </div>
            </div>
            <p style={{ color: styles.colors.gray, fontSize: '12px', marginTop: '12px' }}>
              Configure TWILIO_SID, TWILIO_AUTH, TWILIO_PHONE and SMTP_* environment variables for production use.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminNotifications;
