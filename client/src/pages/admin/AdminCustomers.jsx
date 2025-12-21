import { useEffect, useState } from 'react';
import { Search, Mail, Phone } from 'lucide-react';
import { api } from '../../utils/api';

function AdminCustomers() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  useEffect(() => {
    fetchCustomers();
  }, [page, search]);

  const fetchCustomers = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
        ...(search && { search }),
      });
      const data = await api.get(`/admin/customers?${params}`);
      setCustomers(data.customers);
    } catch (error) {
      console.error('Failed to fetch customers:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
    fetchCustomers();
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Customers</h1>
        <p className="text-dark-400">View and manage customer information</p>
      </div>

      {/* Search */}
      <form onSubmit={handleSearch} className="card mb-6">
        <div className="flex gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, email, or phone..."
              className="input pl-10"
            />
          </div>
          <button type="submit" className="btn-primary">
            Search
          </button>
        </div>
      </form>

      {/* Customers Grid */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
        </div>
      ) : customers.length === 0 ? (
        <div className="card text-center py-12">
          <p className="text-dark-400">No customers found</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {customers.map((customer) => (
            <div key={customer.id} className="card">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-white font-semibold">
                    {customer.first_name} {customer.last_name}
                  </h3>
                  <p className="text-dark-400 text-sm">
                    Customer since{' '}
                    {new Date(customer.created_at).toLocaleDateString('en-US', {
                      month: 'short',
                      year: 'numeric',
                    })}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-primary-400 font-semibold">
                    ${parseFloat(customer.total_spent || 0).toFixed(0)}
                  </p>
                  <p className="text-dark-500 text-xs">Total Spent</p>
                </div>
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex items-center text-dark-300">
                  <Mail className="w-4 h-4 mr-2 text-dark-500" />
                  {customer.email}
                </div>
                {customer.phone && (
                  <div className="flex items-center text-dark-300">
                    <Phone className="w-4 h-4 mr-2 text-dark-500" />
                    {customer.phone}
                  </div>
                )}
              </div>

              <div className="mt-4 pt-4 border-t border-dark-700 flex justify-between items-center">
                <span className="text-dark-400 text-sm">
                  {customer.total_bookings || 0} bookings
                </span>
                <a
                  href={`mailto:${customer.email}`}
                  className="text-primary-400 text-sm hover:text-primary-300"
                >
                  Send Email
                </a>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default AdminCustomers;
