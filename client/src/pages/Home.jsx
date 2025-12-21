import { Link } from 'react-router-dom';
import { Shield, Award, Clock, Star, ChevronRight } from 'lucide-react';

function Home() {
  const features = [
    {
      icon: Shield,
      title: 'Lifetime Warranty',
      description: 'Ceramic films come with a lifetime warranty for peace of mind',
    },
    {
      icon: Award,
      title: 'Premium Materials',
      description: 'We use only top-quality carbon and ceramic films',
    },
    {
      icon: Clock,
      title: 'Quick Service',
      description: 'Most tinting jobs completed within 2-3 hours',
    },
    {
      icon: Star,
      title: '5-Star Reviews',
      description: 'Trusted by hundreds of satisfied customers',
    },
  ];

  const services = [
    {
      title: 'Window Tinting',
      description: 'Carbon & ceramic films with UV protection',
      price: 'From $100',
      image: '/images/tinting.jpg',
    },
    {
      title: 'Vinyl Wraps',
      description: 'Full or partial vehicle color change',
      price: 'From $500',
      image: '/images/wrap.jpg',
    },
    {
      title: 'Chrome Delete',
      description: 'Sleek blackout for chrome trim',
      price: 'From $200',
      image: '/images/chrome-delete.jpg',
    },
    {
      title: 'Rim Restoration',
      description: 'Refinishing and color matching',
      price: 'From $80/wheel',
      image: '/images/rims.jpg',
    },
  ];

  return (
    <div>
      {/* Hero Section */}
      <section className="relative min-h-[80vh] flex items-center">
        <div className="absolute inset-0 bg-gradient-to-r from-dark-950 via-dark-950/95 to-dark-950/80" />
        <div className="absolute inset-0 bg-[url('/images/hero-bg.jpg')] bg-cover bg-center opacity-30" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <div className="max-w-2xl">
            <h1 className="text-4xl md:text-6xl font-bold text-white mb-6 leading-tight">
              Premium Auto
              <span className="text-primary-500"> Customization</span>
            </h1>
            <p className="text-xl text-dark-300 mb-8">
              Professional window tinting, vinyl wraps, and auto customization
              services in Chicago. Quality work backed by industry-leading warranties.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Link to="/book" className="btn-primary text-center">
                Book Appointment
                <ChevronRight className="w-5 h-5 inline ml-2" />
              </Link>
              <Link to="/services" className="btn-secondary text-center">
                View Services
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-dark-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <div
                key={index}
                className="text-center p-6 rounded-xl bg-dark-800/50 border border-dark-700"
              >
                <div className="w-12 h-12 mx-auto mb-4 bg-primary-600/20 rounded-lg flex items-center justify-center">
                  <feature.icon className="w-6 h-6 text-primary-400" />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">{feature.title}</h3>
                <p className="text-dark-400 text-sm">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Services Preview */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="section-title">Our Services</h2>
            <p className="section-subtitle">
              Comprehensive auto customization services to make your vehicle stand out
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {services.map((service, index) => (
              <div
                key={index}
                className="card group hover:border-primary-600 transition-colors cursor-pointer"
              >
                <div className="h-40 bg-dark-800 rounded-lg mb-4 overflow-hidden">
                  <div className="w-full h-full bg-gradient-to-br from-primary-600/20 to-dark-800 flex items-center justify-center">
                    <span className="text-4xl">🚗</span>
                  </div>
                </div>
                <h3 className="text-lg font-semibold text-white mb-2 group-hover:text-primary-400 transition-colors">
                  {service.title}
                </h3>
                <p className="text-dark-400 text-sm mb-3">{service.description}</p>
                <p className="text-primary-400 font-semibold">{service.price}</p>
              </div>
            ))}
          </div>

          <div className="text-center mt-10">
            <Link to="/services" className="btn-outline">
              View All Services & Pricing
            </Link>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-primary-600">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Ready to Transform Your Vehicle?
          </h2>
          <p className="text-primary-100 text-lg mb-8">
            Book your appointment online and pay your deposit securely.
            No more Zelle hassles - simple, fast, and secure.
          </p>
          <Link to="/book" className="btn bg-white text-primary-600 hover:bg-primary-50">
            Book Now - $35 Deposit
          </Link>
        </div>
      </section>

      {/* FAQ Preview */}
      <section className="py-20 bg-dark-900">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="section-title text-center">Frequently Asked Questions</h2>

          <div className="space-y-4 mt-8">
            {[
              {
                q: 'How long does window tinting take?',
                a: 'Most window tinting jobs take 2-3 hours depending on the vehicle and coverage.',
              },
              {
                q: 'What is your warranty?',
                a: 'Carbon films come with a 5-year warranty. Ceramic films include a lifetime warranty.',
              },
              {
                q: 'Do I need an appointment?',
                a: 'Yes, appointments are required to ensure we have adequate time for your vehicle.',
              },
            ].map((faq, index) => (
              <div key={index} className="card">
                <h3 className="text-white font-semibold mb-2">{faq.q}</h3>
                <p className="text-dark-400">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

export default Home;
