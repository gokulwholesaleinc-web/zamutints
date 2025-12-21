import { useEffect, useState } from 'react';
import { Search, Filter, ChevronDown, FileText } from 'lucide-react';
import { api } from '../../utils/api';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

function AdminBookings() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    status: '',
    startDate: '',
    endDate: '',
  });
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 20;

  useEffect(() => {
    fetchBookings();
  }, [page, filters]);

  const fetchBookings = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        ...(filters.status && { status: filters.status }),
        ...(filters.startDate && { startDate: filters.startDate }),
        ...(filters.endDate && { endDate: filters.endDate }),
      });

      const data = await api.get(`/admin/bookings?${params}`);
      setBookings(data.bookings);
      setTotal(data.total);
    } catch (error) {
      console.error('Failed to fetch bookings:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (bookingId, status) => {
    try {
      await api.patch(`/admin/bookings/${bookingId}/status`, { status });
      fetchBookings();
    } catch (error) {
      console.error('Failed to update status:', error);
      alert('Failed to update booking status');
    }
  };

  const downloadInvoice = async (bookingId) => {
    try {
      const token = localStorage.getItem('admin_token');
      const response = await fetch(`${API_URL}/invoices/${bookingId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) throw new Error('Failed to download invoice');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `invoice-${bookingId}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Failed to download invoice:', error);
      alert('Failed to download invoice');
    }
  };

  const formatDate = (dateStr) => {
    return new Date(dateStr + 'T12:00:00').toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatTime = (timeStr) => {
    const [hours, minutes] = timeStr.split(':');
    const h = parseInt(hours);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const hour = h % 12 || 12;
    return `${hour}:${minutes} ${ampm}`;
  };

  const getStatusBadge = (status) => {
    const styles = {
      pending_deposit: 'bg-yellow-500/20 text-yellow-400',
      confirmed: 'bg-blue-500/20 text-blue-400',
      paid: 'bg-green-500/20 text-green-400',
      completed: 'bg-green-500/20 text-green-400',
      cancelled: 'bg-red-500/20 text-red-400',
      no_show: 'bg-dark-600 text-dark-400',
    };

    return (
      <span className={`px-2 py-1 text-xs rounded-full ${styles[status] || styles.pending_deposit}`}>
        {status.replace('_', ' ')}
      </span>
    );
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Bookings</h1>
        <p className="text-dark-400">Manage all customer appointments</p>
      </div>

      {/* Filters */}
      <div className="card mb-6">
        <div className="flex flex-wrap gap-4">
          <div>
            <label className="block text-sm font-medium text-dark-400 mb-1">Status</label>
            <select
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              className="input w-40"
            >
              <option value="">All Status</option>
              <option value="pending_deposit">Pending Deposit</option>
              <option value="confirmed">Confirmed</option>
              <option value="paid">Paid</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
              <option value="no_show">No Show</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-dark-400 mb-1">From Date</label>
            <input
              type="date"
              value={filters.startDate}
              onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
              className="input w-40"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-dark-400 mb-1">To Date</label>
            <input
              type="date"
              value={filters.endDate}
              onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
              className="input w-40"
            />
          </div>
          <div className="flex items-end">
            <button
              onClick={() => setFilters({ status: '', startDate: '', endDate: '' })}
              className="btn-secondary"
            >
              Clear Filters
            </button>
          </div>
        </div>
      </div>

      {/* Bookings Table */}
      <div className="card overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
          </div>
        ) : bookings.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-dark-400">No bookings found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-dark-800">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-dark-400 uppercase tracking-wider">
                    Customer
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-dark-400 uppercase tracking-wider">
                    Service
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-dark-400 uppercase tracking-wider">
                    Vehicle
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-dark-400 uppercase tracking-wider">
                    Date & Time
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-dark-400 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-dark-400 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-dark-400 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dark-800">
                {bookings.map((booking) => (
                  <tr key={booking.id} className="hover:bg-dark-800/50">
                    <td className="px-4 py-4">
                      <div>
                        <p className="text-white font-medium">
                          {booking.first_name} {booking.last_name}
                        </p>
                        <p className="text-dark-400 text-sm">{booking.email}</p>
                        <p className="text-dark-500 text-xs">{booking.phone}</p>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <p className="text-white">{booking.service_name}</p>
                      <p className="text-dark-400 text-sm">{booking.variant_name}</p>
                    </td>
                    <td className="px-4 py-4">
                      <p className="text-white">
                        {booking.vehicle_year} {booking.vehicle_make}
                      </p>
                      <p className="text-dark-400 text-sm">{booking.vehicle_model}</p>
                    </td>
                    <td className="px-4 py-4">
                      <p className="text-white">{formatDate(booking.appointment_date)}</p>
                      <p className="text-dark-400 text-sm">
                        {formatTime(booking.appointment_time)}
                      </p>
                    </td>
                    <td className="px-4 py-4">
                      <p className="text-white">${parseFloat(booking.total_amount).toFixed(2)}</p>
                      <p className="text-green-400 text-sm">
                        Paid: ${parseFloat(booking.paid_amount || 0).toFixed(2)}
                      </p>
                    </td>
                    <td className="px-4 py-4">{getStatusBadge(booking.status)}</td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2">
                        <select
                          value={booking.status}
                          onChange={(e) => updateStatus(booking.id, e.target.value)}
                          className="input text-sm py-1 px-2"
                        >
                          <option value="pending_deposit">Pending Deposit</option>
                          <option value="confirmed">Confirmed</option>
                          <option value="paid">Paid</option>
                          <option value="completed">Completed</option>
                          <option value="cancelled">Cancelled</option>
                          <option value="no_show">No Show</option>
                        </select>
                        <button
                          onClick={() => downloadInvoice(booking.id)}
                          className="p-2 text-zamu-cyan hover:text-zamu-cyan-light hover:bg-zamu-gray-dark rounded transition-colors"
                          title="Download Invoice"
                        >
                          <FileText className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {total > limit && (
          <div className="px-4 py-3 bg-dark-800 flex items-center justify-between">
            <p className="text-dark-400 text-sm">
              Showing {(page - 1) * limit + 1} to {Math.min(page * limit, total)} of {total}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setPage(page - 1)}
                disabled={page === 1}
                className="btn-secondary text-sm py-1 px-3 disabled:opacity-50"
              >
                Previous
              </button>
              <button
                onClick={() => setPage(page + 1)}
                disabled={page * limit >= total}
                className="btn-secondary text-sm py-1 px-3 disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default AdminBookings;
