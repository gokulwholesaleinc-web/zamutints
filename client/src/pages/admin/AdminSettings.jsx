import { useEffect, useState } from 'react';
import { Calendar, Clock, Plus, X } from 'lucide-react';
import { api } from '../../utils/api';
import LicenseInfo from '../../components/LicenseInfo';
import LicenseActivation from '../../components/LicenseActivation';

function AdminSettings() {
  const [businessHours, setBusinessHours] = useState([]);
  const [blockedDates, setBlockedDates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newBlockedDate, setNewBlockedDate] = useState({ date: '', reason: '' });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const [hoursData, blockedData] = await Promise.all([
        api.get('/admin/business-hours'),
        api.get('/admin/blocked-dates'),
      ]);
      setBusinessHours(hoursData);
      setBlockedDates(blockedData);
    } catch (error) {
      console.error('Failed to fetch settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateHours = async (dayOfWeek, updates) => {
    try {
      await api.put(`/admin/business-hours/${dayOfWeek}`, updates);
      fetchSettings();
    } catch (error) {
      console.error('Failed to update hours:', error);
      alert('Failed to update business hours');
    }
  };

  const addBlockedDate = async (e) => {
    e.preventDefault();
    try {
      await api.post('/admin/blocked-dates', {
        blockedDate: newBlockedDate.date,
        reason: newBlockedDate.reason,
      });
      setNewBlockedDate({ date: '', reason: '' });
      fetchSettings();
    } catch (error) {
      console.error('Failed to block date:', error);
      alert('Failed to block date');
    }
  };

  const removeBlockedDate = async (id) => {
    try {
      await api.delete(`/admin/blocked-dates/${id}`);
      fetchSettings();
    } catch (error) {
      console.error('Failed to remove blocked date:', error);
    }
  };

  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Business Settings</h1>
        <p className="text-dark-400">Manage business hours and blocked dates</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Business Hours */}
        <div className="card">
          <h2 className="text-lg font-semibold text-white mb-6 flex items-center">
            <Clock className="w-5 h-5 mr-2 text-primary-400" />
            Business Hours
          </h2>

          <div className="space-y-4">
            {businessHours.map((day) => (
              <div
                key={day.day_of_week}
                className="flex items-center justify-between p-3 bg-dark-800 rounded-lg"
              >
                <div className="flex items-center gap-4">
                  <span className="text-white w-24">{dayNames[day.day_of_week]}</span>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={!day.is_closed}
                      onChange={(e) =>
                        updateHours(day.day_of_week, {
                          isClosed: !e.target.checked,
                          openTime: day.open_time || '09:00',
                          closeTime: day.close_time || '17:00',
                        })
                      }
                      className="w-4 h-4 rounded border-dark-600 bg-dark-700 text-primary-500 focus:ring-primary-500"
                    />
                    <span className="text-dark-400 text-sm">Open</span>
                  </label>
                </div>

                {!day.is_closed && (
                  <div className="flex items-center gap-2">
                    <input
                      type="time"
                      value={day.open_time || '09:00'}
                      onChange={(e) =>
                        updateHours(day.day_of_week, {
                          isClosed: false,
                          openTime: e.target.value,
                          closeTime: day.close_time || '17:00',
                        })
                      }
                      className="input py-1 px-2 w-28 text-sm"
                    />
                    <span className="text-dark-400">to</span>
                    <input
                      type="time"
                      value={day.close_time || '17:00'}
                      onChange={(e) =>
                        updateHours(day.day_of_week, {
                          isClosed: false,
                          openTime: day.open_time || '09:00',
                          closeTime: e.target.value,
                        })
                      }
                      className="input py-1 px-2 w-28 text-sm"
                    />
                  </div>
                )}

                {day.is_closed && (
                  <span className="text-dark-500 text-sm">Closed</span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Blocked Dates */}
        <div className="card">
          <h2 className="text-lg font-semibold text-white mb-6 flex items-center">
            <Calendar className="w-5 h-5 mr-2 text-primary-400" />
            Blocked Dates
          </h2>

          {/* Add Blocked Date Form */}
          <form onSubmit={addBlockedDate} className="mb-6 p-4 bg-dark-800 rounded-lg">
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-dark-400 mb-1">Date</label>
                <input
                  type="date"
                  value={newBlockedDate.date}
                  onChange={(e) =>
                    setNewBlockedDate({ ...newBlockedDate, date: e.target.value })
                  }
                  className="input"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-dark-400 mb-1">
                  Reason (optional)
                </label>
                <input
                  type="text"
                  value={newBlockedDate.reason}
                  onChange={(e) =>
                    setNewBlockedDate({ ...newBlockedDate, reason: e.target.value })
                  }
                  placeholder="e.g., Holiday"
                  className="input"
                />
              </div>
            </div>
            <button type="submit" className="btn-primary w-full">
              <Plus className="w-4 h-4 mr-2 inline" />
              Block Date
            </button>
          </form>

          {/* Blocked Dates List */}
          {blockedDates.length === 0 ? (
            <p className="text-dark-400 text-center py-4">No blocked dates</p>
          ) : (
            <div className="space-y-2">
              {blockedDates.map((blocked) => (
                <div
                  key={blocked.id}
                  className="flex items-center justify-between p-3 bg-dark-800 rounded-lg"
                >
                  <div>
                    <p className="text-white">
                      {new Date(blocked.blocked_date + 'T12:00:00').toLocaleDateString('en-US', {
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </p>
                    {blocked.reason && (
                      <p className="text-dark-400 text-sm">{blocked.reason}</p>
                    )}
                  </div>
                  <button
                    onClick={() => removeBlockedDate(blocked.id)}
                    className="p-2 text-dark-400 hover:text-red-400 hover:bg-dark-700 rounded-lg"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* License Section */}
        <div className="lg:col-span-2">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <LicenseInfo />
            <LicenseActivation
              onSuccess={() => {
                // Refresh the page to show updated license info
                window.location.reload();
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default AdminSettings;
