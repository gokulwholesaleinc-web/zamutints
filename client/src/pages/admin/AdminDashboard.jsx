import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Calendar, DollarSign, Users, Clock } from 'lucide-react';
import { api } from '../../utils/api';

function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const data = await api.get('/admin/stats');
      setStats(data);
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  const statCards = [
    {
      title: "Today's Appointments",
      value: stats?.today_appointments || 0,
      icon: Calendar,
      color: 'text-blue-400',
      bgColor: 'bg-blue-400/10',
    },
    {
      title: 'Upcoming Bookings',
      value: stats?.upcoming_appointments || 0,
      icon: Clock,
      color: 'text-green-400',
      bgColor: 'bg-green-400/10',
    },
    {
      title: 'Pending Deposits',
      value: stats?.pending_deposits || 0,
      icon: DollarSign,
      color: 'text-yellow-400',
      bgColor: 'bg-yellow-400/10',
    },
    {
      title: 'Week Revenue',
      value: `$${parseFloat(stats?.week_revenue || 0).toFixed(0)}`,
      icon: DollarSign,
      color: 'text-primary-400',
      bgColor: 'bg-primary-400/10',
    },
  ];

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Dashboard</h1>
        <p className="text-dark-400">Welcome back! Here's what's happening today.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {statCards.map((stat, index) => (
          <div key={index} className="card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-dark-400 text-sm">{stat.title}</p>
                <p className="text-2xl font-bold text-white mt-1">{stat.value}</p>
              </div>
              <div className={`p-3 rounded-lg ${stat.bgColor}`}>
                <stat.icon className={`w-6 h-6 ${stat.color}`} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="card">
          <h2 className="text-lg font-semibold text-white mb-4">Quick Actions</h2>
          <div className="space-y-2">
            <Link
              to="/admin/bookings"
              className="block p-3 bg-dark-800 rounded-lg hover:bg-dark-700 transition-colors"
            >
              <span className="text-white">View All Bookings</span>
              <span className="text-dark-400 text-sm block">
                Manage and update appointment status
              </span>
            </Link>
            <Link
              to="/admin/services"
              className="block p-3 bg-dark-800 rounded-lg hover:bg-dark-700 transition-colors"
            >
              <span className="text-white">Manage Services</span>
              <span className="text-dark-400 text-sm block">
                Add or edit services and pricing
              </span>
            </Link>
            <Link
              to="/admin/settings"
              className="block p-3 bg-dark-800 rounded-lg hover:bg-dark-700 transition-colors"
            >
              <span className="text-white">Business Settings</span>
              <span className="text-dark-400 text-sm block">
                Update hours and block dates
              </span>
            </Link>
          </div>
        </div>

        <div className="card">
          <h2 className="text-lg font-semibold text-white mb-4">System Status</h2>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-dark-800 rounded-lg">
              <span className="text-dark-300">API Server</span>
              <span className="px-2 py-1 bg-green-500/20 text-green-400 text-xs rounded-full">
                Online
              </span>
            </div>
            <div className="flex items-center justify-between p-3 bg-dark-800 rounded-lg">
              <span className="text-dark-300">Database</span>
              <span className="px-2 py-1 bg-green-500/20 text-green-400 text-xs rounded-full">
                Connected
              </span>
            </div>
            <div className="flex items-center justify-between p-3 bg-dark-800 rounded-lg">
              <span className="text-dark-300">Stripe Payments</span>
              <span className="px-2 py-1 bg-green-500/20 text-green-400 text-xs rounded-full">
                Active
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AdminDashboard;
