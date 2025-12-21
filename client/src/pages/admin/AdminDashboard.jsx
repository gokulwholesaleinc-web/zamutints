import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Calendar, DollarSign, Users, Clock, TrendingUp, BarChart3 } from 'lucide-react';
import { api } from '../../utils/api';

function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [salesReport, setSalesReport] = useState(null);
  const [topServices, setTopServices] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [statsData, salesData, servicesData] = await Promise.all([
        api.get('/admin/stats'),
        api.get('/admin/reports/sales').catch(() => null),
        api.get('/admin/reports/top-services').catch(() => [])
      ]);
      setStats(statsData);
      setSalesReport(salesData);
      setTopServices(servicesData);
    } catch (error) {
      console.error('Failed to fetch data:', error);
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

      {/* Sales Overview */}
      {salesReport && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="card border-l-4 border-zamu-cyan">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-zamu-gray-medium text-sm font-serif">Total Revenue</p>
                <p className="text-2xl font-display font-bold text-white mt-1">
                  ${salesReport.totalRevenue?.toLocaleString() || '0'}
                </p>
              </div>
              <TrendingUp className="w-8 h-8 text-zamu-cyan" />
            </div>
          </div>
          <div className="card border-l-4 border-green-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-zamu-gray-medium text-sm font-serif">This Month</p>
                <p className="text-2xl font-display font-bold text-white mt-1">
                  ${salesReport.monthRevenue?.toLocaleString() || '0'}
                </p>
              </div>
              <BarChart3 className="w-8 h-8 text-green-500" />
            </div>
          </div>
          <div className="card border-l-4 border-blue-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-zamu-gray-medium text-sm font-serif">Avg Order Value</p>
                <p className="text-2xl font-display font-bold text-white mt-1">
                  ${salesReport.averageOrderValue?.toFixed(0) || '0'}
                </p>
              </div>
              <DollarSign className="w-8 h-8 text-blue-500" />
            </div>
          </div>
        </div>
      )}

      {/* Top Services & Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {/* Top Services */}
        {topServices.length > 0 && (
          <div className="card">
            <h2 className="text-lg font-display font-semibold text-white mb-4">Top Services</h2>
            <div className="space-y-3">
              {topServices.slice(0, 5).map((service, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-black/50 rounded-lg border border-zamu-gray-dark">
                  <div>
                    <span className="text-white font-serif">{service.serviceName}</span>
                    <span className="text-zamu-gray-medium text-sm block">{service.bookingCount} bookings</span>
                  </div>
                  <span className="text-zamu-cyan font-display font-bold">${service.revenue?.toLocaleString()}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <div className="card">
          <h2 className="text-lg font-display font-semibold text-white mb-4">Quick Actions</h2>
          <div className="space-y-2">
            <Link
              to="/admin/bookings"
              className="block p-3 bg-black/50 rounded-lg border border-zamu-gray-dark hover:border-zamu-cyan transition-colors"
            >
              <span className="text-white font-serif">View All Bookings</span>
              <span className="text-zamu-gray-medium text-sm block">
                Manage and update appointment status
              </span>
            </Link>
            <Link
              to="/admin/services"
              className="block p-3 bg-black/50 rounded-lg border border-zamu-gray-dark hover:border-zamu-cyan transition-colors"
            >
              <span className="text-white font-serif">Manage Services</span>
              <span className="text-zamu-gray-medium text-sm block">
                Add or edit services and pricing
              </span>
            </Link>
            <Link
              to="/admin/settings"
              className="block p-3 bg-black/50 rounded-lg border border-zamu-gray-dark hover:border-zamu-cyan transition-colors"
            >
              <span className="text-white font-serif">Business Settings</span>
              <span className="text-zamu-gray-medium text-sm block">
                Update hours and block dates
              </span>
            </Link>
          </div>
        </div>
      </div>

      {/* System Status */}
      <div className="card">
        <h2 className="text-lg font-display font-semibold text-white mb-4">System Status</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="flex items-center justify-between p-3 bg-black/50 rounded-lg border border-zamu-gray-dark">
            <span className="text-zamu-gray-medium font-serif">API Server</span>
            <span className="px-2 py-1 bg-green-500/20 text-green-400 text-xs font-display">
              Online
            </span>
          </div>
          <div className="flex items-center justify-between p-3 bg-black/50 rounded-lg border border-zamu-gray-dark">
            <span className="text-zamu-gray-medium font-serif">Database</span>
            <span className="px-2 py-1 bg-green-500/20 text-green-400 text-xs font-display">
              Connected
            </span>
          </div>
          <div className="flex items-center justify-between p-3 bg-black/50 rounded-lg border border-zamu-gray-dark">
            <span className="text-zamu-gray-medium font-serif">Stripe Payments</span>
            <span className="px-2 py-1 bg-green-500/20 text-green-400 text-xs font-display">
              Active
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AdminDashboard;
