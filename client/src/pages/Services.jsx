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
    <div className="py-12 bg-black">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-display font-bold text-white mb-4">SERVICES & PRICING</h1>
          <p style={{ color: '#919191' }} className="text-xl font-serif">
            Quality auto customization services with transparent pricing
          </p>
        </div>

        {/* Category Filter */}
        <div className="flex flex-wrap justify-center gap-2 mb-12">
          {categories.map((category) => (
            <button
              key={category.id}
              onClick={() => setActiveCategory(category.id)}
              className="px-5 py-2 font-display text-sm font-semibold transition-colors border"
              style={activeCategory === category.id
                ? { backgroundColor: '#36B9EB', color: 'black', borderColor: '#36B9EB' }
                : { backgroundColor: 'transparent', color: '#919191', borderColor: '#333' }
              }
            >
              {category.name}
            </button>
          ))}
        </div>

        {/* Services Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredServices.map((service) => (
            <div key={service.id} className="bg-black p-6 transition-all" style={{ border: '1px solid #333' }}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-display font-semibold text-white">{service.name}</h3>
                <span className="px-3 py-1 text-xs font-display capitalize" style={{ backgroundColor: 'rgba(54, 185, 235, 0.1)', color: '#36B9EB' }}>
                  {service.category.replace('_', ' ')}
                </span>
              </div>

              <p style={{ color: '#919191' }} className="font-serif mb-4">{service.description}</p>

              {/* Variants/Pricing */}
              {service.variants && service.variants.length > 0 ? (
                <div className="space-y-3 mb-6">
                  {service.variants.map((variant) => (
                    <div
                      key={variant.id}
                      className="flex items-center justify-between py-2"
                      style={{ borderBottom: '1px solid #333' }}
                    >
                      <div>
                        <p className="text-white font-serif text-sm">{variant.name}</p>
                        {variant.description && (
                          <p style={{ color: '#919191' }} className="text-xs">{variant.description}</p>
                        )}
                      </div>
                      <span style={{ color: '#36B9EB' }} className="font-display font-bold">
                        ${parseFloat(variant.price).toFixed(0)}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-2xl font-display font-bold mb-6" style={{ color: '#36B9EB' }}>
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
          <h2 className="text-3xl font-display font-bold text-white text-center mb-8">
            CARBON VS CERAMIC FILM
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {/* Carbon */}
            <div className="p-8" style={{ border: '1px solid #333' }}>
              <h3 className="text-2xl font-display font-bold text-white mb-2">Carbon Film</h3>
              <p style={{ color: '#919191' }} className="font-serif mb-4">5-Year Warranty</p>
              <p className="text-3xl font-display font-bold mb-6" style={{ color: '#36B9EB' }}>From $100</p>
              <ul className="space-y-3 mb-8">
                {[
                  'Heat Rejection',
                  'UV Protection',
                  'No Signal Interference',
                  'Matte Finish',
                ].map((feature, i) => (
                  <li key={i} className="flex items-center font-serif" style={{ color: '#919191' }}>
                    <Check className="w-5 h-5 mr-3 flex-shrink-0" style={{ color: '#36B9EB' }} />
                    {feature}
                  </li>
                ))}
              </ul>
              <Link to="/book?service=1" className="block text-center py-4 font-display font-semibold transition-colors" style={{ border: '1px solid #36B9EB', color: '#36B9EB' }}>
                Select Carbon
              </Link>
            </div>

            {/* Ceramic */}
            <div className="p-8 relative" style={{ border: '2px solid #36B9EB' }}>
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 text-xs font-display font-bold" style={{ backgroundColor: '#36B9EB', color: 'black' }}>
                MOST POPULAR
              </div>
              <h3 className="text-2xl font-display font-bold text-white mb-2">Ceramic Film</h3>
              <p style={{ color: '#919191' }} className="font-serif mb-4">Lifetime Warranty</p>
              <p className="text-3xl font-display font-bold mb-6" style={{ color: '#36B9EB' }}>From $150</p>
              <ul className="space-y-3 mb-8">
                {[
                  'Superior Heat Rejection',
                  'Maximum UV Protection',
                  'No Signal Interference',
                  'Crystal Clear Clarity',
                  'Best-in-Class Performance',
                ].map((feature, i) => (
                  <li key={i} className="flex items-center font-serif" style={{ color: '#919191' }}>
                    <Check className="w-5 h-5 mr-3 flex-shrink-0" style={{ color: '#36B9EB' }} />
                    {feature}
                  </li>
                ))}
              </ul>
              <Link to="/book?service=2" className="block text-center py-4 font-display font-semibold transition-colors" style={{ backgroundColor: '#36B9EB', color: 'black' }}>
                Select Ceramic
              </Link>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="mt-20 text-center py-16" style={{ backgroundColor: '#1B1B1B', borderTop: '1px solid #333', borderBottom: '1px solid #333' }}>
          <h2 className="text-2xl md:text-3xl font-display font-bold text-white mb-4">
            NOT SURE WHICH SERVICE IS RIGHT FOR YOU?
          </h2>
          <p style={{ color: '#919191' }} className="font-serif mb-8 text-lg">
            Call us and we'll help you choose the best option for your vehicle.
          </p>
          <a href="tel:872-203-1857" className="btn-outline text-lg">
            Call 872-203-1857
          </a>
        </div>
      </div>
    </div>
  );
}

export default Services;
