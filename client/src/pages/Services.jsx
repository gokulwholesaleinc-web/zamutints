import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Check } from 'lucide-react';
import { api } from '../utils/api';

function Services() {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('all');

  useEffect(() => {
    fetchServices();
  }, []);

  const fetchServices = async () => {
    try {
      const data = await api.get('/services');
      setServices(data);
    } catch (error) {
      console.error('Failed to fetch services:', error);
    } finally {
      setLoading(false);
    }
  };

  const categories = [
    { id: 'all', name: 'All Services' },
    { id: 'window_tint', name: 'Window Tinting' },
    { id: 'wrap', name: 'Wraps' },
    { id: 'wheels', name: 'Wheels' },
    { id: 'lighting', name: 'Lighting' },
    { id: 'glass', name: 'Glass' },
  ];

  const filteredServices =
    activeCategory === 'all'
      ? services
      : services.filter((s) => s.category === activeCategory);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  return (
    <div className="py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="section-title">Services & Pricing</h1>
          <p className="section-subtitle">
            Quality auto customization services with transparent pricing
          </p>
        </div>

        {/* Category Filter */}
        <div className="flex flex-wrap justify-center gap-2 mb-12">
          {categories.map((category) => (
            <button
              key={category.id}
              onClick={() => setActiveCategory(category.id)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                activeCategory === category.id
                  ? 'bg-primary-600 text-white'
                  : 'bg-dark-800 text-dark-300 hover:bg-dark-700'
              }`}
            >
              {category.name}
            </button>
          ))}
        </div>

        {/* Services Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredServices.map((service) => (
            <div key={service.id} className="card">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-semibold text-white">{service.name}</h3>
                <span className="px-3 py-1 bg-primary-600/20 text-primary-400 text-xs rounded-full capitalize">
                  {service.category.replace('_', ' ')}
                </span>
              </div>

              <p className="text-dark-400 mb-4">{service.description}</p>

              {/* Variants/Pricing */}
              {service.variants && service.variants.length > 0 ? (
                <div className="space-y-3 mb-6">
                  {service.variants.map((variant) => (
                    <div
                      key={variant.id}
                      className="flex items-center justify-between py-2 border-b border-dark-700 last:border-0"
                    >
                      <div>
                        <p className="text-white text-sm">{variant.name}</p>
                        {variant.description && (
                          <p className="text-dark-500 text-xs">{variant.description}</p>
                        )}
                      </div>
                      <span className="text-primary-400 font-semibold">
                        ${parseFloat(variant.price).toFixed(0)}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-2xl font-bold text-primary-400 mb-6">
                  From ${parseFloat(service.base_price).toFixed(0)}
                </p>
              )}

              <Link
                to={`/book?service=${service.id}`}
                className="btn-primary w-full text-center block"
              >
                Book Now
              </Link>
            </div>
          ))}
        </div>

        {/* Window Tint Comparison */}
        <div className="mt-20">
          <h2 className="text-2xl font-bold text-white text-center mb-8">
            Carbon vs Ceramic Film Comparison
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            {/* Carbon */}
            <div className="card border-dark-600">
              <h3 className="text-xl font-semibold text-white mb-4">Carbon Film</h3>
              <p className="text-3xl font-bold text-primary-400 mb-6">From $100</p>
              <ul className="space-y-3 mb-6">
                {[
                  '5-Year Warranty',
                  'Heat Rejection',
                  'UV Protection',
                  'No Signal Interference',
                  'Matte Finish',
                ].map((feature, i) => (
                  <li key={i} className="flex items-center text-dark-300">
                    <Check className="w-5 h-5 text-green-500 mr-3" />
                    {feature}
                  </li>
                ))}
              </ul>
              <Link to="/book?service=1" className="btn-secondary w-full text-center block">
                Select Carbon
              </Link>
            </div>

            {/* Ceramic */}
            <div className="card border-primary-600 relative">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-primary-600 text-white text-xs font-semibold rounded-full">
                MOST POPULAR
              </div>
              <h3 className="text-xl font-semibold text-white mb-4">Ceramic Film</h3>
              <p className="text-3xl font-bold text-primary-400 mb-6">From $150</p>
              <ul className="space-y-3 mb-6">
                {[
                  'Lifetime Warranty',
                  'Superior Heat Rejection',
                  'Maximum UV Protection',
                  'No Signal Interference',
                  'Crystal Clear Clarity',
                  'Best-in-Class Performance',
                ].map((feature, i) => (
                  <li key={i} className="flex items-center text-dark-300">
                    <Check className="w-5 h-5 text-primary-400 mr-3" />
                    {feature}
                  </li>
                ))}
              </ul>
              <Link to="/book?service=2" className="btn-primary w-full text-center block">
                Select Ceramic
              </Link>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="mt-20 text-center">
          <h2 className="text-2xl font-bold text-white mb-4">
            Not sure which service is right for you?
          </h2>
          <p className="text-dark-400 mb-6">
            Call us and we'll help you choose the best option for your vehicle.
          </p>
          <a href="tel:872-203-1857" className="btn-outline">
            Call 872-203-1857
          </a>
        </div>
      </div>
    </div>
  );
}

export default Services;
