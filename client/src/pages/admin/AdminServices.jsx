import { useEffect, useState } from 'react';
import { Plus, Edit, Trash2 } from 'lucide-react';
import { api } from '../../utils/api';

function AdminServices() {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchServices();
  }, []);

  const fetchServices = async () => {
    try {
      const data = await api.get('/admin/services');
      setServices(data);
    } catch (error) {
      console.error('Failed to fetch services:', error);
    } finally {
      setLoading(false);
    }
  };

  const getCategoryLabel = (category) => {
    const labels = {
      window_tint: 'Window Tinting',
      wrap: 'Wraps',
      wheels: 'Wheels',
      lighting: 'Lighting',
      glass: 'Glass',
    };
    return labels[category] || category;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Services</h1>
          <p className="text-dark-400">Manage your service offerings and pricing</p>
        </div>
        <button className="btn-primary">
          <Plus className="w-5 h-5 mr-2 inline" />
          Add Service
        </button>
      </div>

      <div className="space-y-6">
        {services.map((service) => (
          <div key={service.id} className="card">
            <div className="flex items-start justify-between mb-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-lg font-semibold text-white">{service.name}</h3>
                  <span
                    className={`px-2 py-0.5 text-xs rounded-full ${
                      service.is_active
                        ? 'bg-green-500/20 text-green-400'
                        : 'bg-red-500/20 text-red-400'
                    }`}
                  >
                    {service.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>
                <p className="text-dark-400 text-sm">{service.description}</p>
                <p className="text-dark-500 text-xs mt-1">
                  Category: {getCategoryLabel(service.category)} | Base duration:{' '}
                  {service.duration_minutes} min
                </p>
              </div>
              <div className="flex gap-2">
                <button className="p-2 text-dark-400 hover:text-white hover:bg-dark-700 rounded-lg">
                  <Edit className="w-4 h-4" />
                </button>
                <button className="p-2 text-dark-400 hover:text-red-400 hover:bg-dark-700 rounded-lg">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Variants */}
            {service.variants && service.variants.length > 0 && (
              <div className="border-t border-dark-700 pt-4">
                <h4 className="text-sm font-medium text-dark-300 mb-3">Pricing Packages</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {service.variants.map((variant) => (
                    <div
                      key={variant.id}
                      className="p-3 bg-dark-800 rounded-lg flex items-center justify-between"
                    >
                      <div>
                        <p className="text-white text-sm">{variant.name}</p>
                        <p className="text-dark-500 text-xs">
                          {variant.duration_minutes || service.duration_minutes} min
                        </p>
                      </div>
                      <p className="text-primary-400 font-semibold">
                        ${parseFloat(variant.price).toFixed(0)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Base price if no variants */}
            {(!service.variants || service.variants.length === 0) && (
              <div className="border-t border-dark-700 pt-4">
                <p className="text-dark-400">
                  Base Price:{' '}
                  <span className="text-primary-400 font-semibold">
                    ${parseFloat(service.base_price).toFixed(0)}
                  </span>
                </p>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default AdminServices;
