import { Link } from 'react-router-dom';
import { Shield, Award, Clock, Star, ChevronRight, Phone } from 'lucide-react';

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
      description: 'Trusted by hundreds of satisfied customers in Chicago',
    },
  ];

  const services = [
    {
      title: 'Window Tinting',
      description: 'Carbon & ceramic films with UV protection',
      price: 'From $100',
    },
    {
      title: 'Vinyl Wraps',
      description: 'Full or partial vehicle color change',
      price: 'Call for Quote',
    },
    {
      title: 'Chrome Delete',
      description: 'Sleek blackout for chrome trim',
      price: 'Call for Quote',
    },
    {
      title: 'Rim Restoration',
      description: 'Refinishing and color matching',
      price: 'Call for Quote',
    },
    {
      title: 'Glass Replacement',
      description: 'Professional auto glass services',
      price: 'Call for Quote',
    },
    {
      title: 'Caliper Painting',
      description: 'Custom brake caliper colors',
      price: 'Call for Quote',
    },
  ];

  const pricingTiers = [
    { name: 'Carbon Film', warranty: '5-Year Warranty', items: [
      { service: 'Two Front Windows', price: 'From $100' },
      { service: 'All Around', price: 'From $240' },
      { service: 'Windshield (Sedan)', price: 'From $140' },
      { service: 'Windshield (SUV/Pickup)', price: 'From $150' },
    ]},
    { name: 'Ceramic Film', warranty: 'Lifetime Warranty', items: [
      { service: 'Two Front Windows', price: 'From $150' },
      { service: 'All Around', price: 'From $340' },
      { service: 'Windshield (Sedan)', price: 'From $200' },
      { service: 'Windshield (SUV/Pickup)', price: 'From $220' },
    ]},
  ];

  const addOnServices = [
    { service: 'Tint Removal (All Around)', price: 'From $120' },
    { service: 'Windshield Tint Removal', price: '$100' },
    { service: 'Single Window Removal', price: '$15' },
    { service: 'Adhesive Removal', price: '$15/door or $120 all' },
    { service: 'Sun Strip (6")', price: '$40' },
    { service: 'Door Cup Guard', price: '$40/pair' },
    { service: 'Edge Guard (PPF)', price: '$15/door' },
    { service: 'Sun/Moon Roof (Carbon)', price: 'From $60' },
    { service: 'Sun/Moon Roof (Ceramic)', price: 'From $90' },
  ];

  const products = [
    { name: 'Plate Covers', price: '$15 each' },
    { name: 'License Plate Frame', price: '$10' },
    { name: 'Broadway Rearview Mirror', price: '$20' },
    { name: 'Glass Cleaner', price: '$15 (2 for $25)' },
    { name: 'Key Fob Covers', price: 'From $10' },
    { name: 'LED Visor Mirror', price: '$20' },
    { name: 'Car Air Fresheners', price: '$2 each' },
  ];

  return (
    <div className="bg-black">
      {/* Hero Section */}
      <section className="relative min-h-[90vh] flex items-center justify-center text-center">
        <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/50 to-black" />

        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <img
            src="/images/logo-large.png"
            alt="Zamu Tints"
            className="h-32 md:h-40 w-auto mx-auto mb-8"
          />
          <h1 className="text-4xl md:text-6xl font-display font-bold text-white mb-6 leading-tight tracking-wide">
            PROFESSIONAL AUTO
            <span className="block text-zamu-cyan">CUSTOMIZATION</span>
          </h1>
          <p className="text-xl md:text-2xl text-zamu-gray-light font-serif mb-10 max-w-2xl mx-auto">
            Premium window tinting, vinyl wraps, and auto customization
            services in Chicago. Quality work backed by industry-leading warranties.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/book" className="btn-primary text-lg px-8 py-4">
              Book Appointment
              <ChevronRight className="w-5 h-5 inline ml-2" />
            </Link>
            <a href="tel:872-203-1857" className="btn-secondary text-lg px-8 py-4 flex items-center justify-center">
              <Phone className="w-5 h-5 mr-2" />
              Call Now
            </a>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-black" style={{ borderTop: '1px solid #333' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <div
                key={index}
                className="text-center p-8 transition-colors"
                style={{ border: '1px solid #333' }}
              >
                <div className="w-16 h-16 mx-auto mb-6 flex items-center justify-center">
                  <feature.icon className="w-10 h-10" style={{ color: '#36B9EB' }} />
                </div>
                <h3 className="text-xl font-display font-semibold text-white mb-3">{feature.title}</h3>
                <p style={{ color: '#919191' }} className="font-serif">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Services Preview */}
      <section className="py-20" style={{ backgroundColor: '#1B1B1B' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-display font-bold text-white mb-4">OUR SERVICES</h2>
            <p style={{ color: '#919191' }} className="text-xl font-serif">
              Comprehensive auto customization services to make your vehicle stand out
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {services.map((service, index) => (
              <div
                key={index}
                className="bg-black p-8 transition-all"
                style={{ border: '1px solid #333' }}
              >
                <h3 className="text-xl font-display font-semibold text-white mb-3">
                  {service.title}
                </h3>
                <p style={{ color: '#919191' }} className="font-serif mb-4">{service.description}</p>
                <p style={{ color: '#36B9EB' }} className="font-display font-bold text-xl">{service.price}</p>
              </div>
            ))}
          </div>

          <div className="text-center mt-12">
            <Link to="/services" className="btn-outline text-lg">
              View All Services & Pricing
            </Link>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="py-20 bg-black">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-display font-bold text-white mb-4">WINDOW TINTING</h2>
            <p style={{ color: '#919191' }} className="text-xl font-serif">
              Professional installation with premium films
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {pricingTiers.map((tier, index) => (
              <div
                key={index}
                className="p-8"
                style={{ border: index === 1 ? '2px solid #36B9EB' : '1px solid #333' }}
              >
                <h3 className="text-2xl font-display font-bold text-white mb-2">{tier.name}</h3>
                <p style={{ color: '#919191' }} className="font-serif mb-6">
                  {tier.warranty}
                </p>
                <ul className="space-y-4">
                  {tier.items.map((item, i) => (
                    <li key={i} className="flex justify-between items-center py-3" style={{ borderBottom: '1px solid #333' }}>
                      <span className="text-white font-serif">{item.service}</span>
                      <span style={{ color: '#36B9EB' }} className="font-display font-bold text-lg">{item.price}</span>
                    </li>
                  ))}
                </ul>
                <Link
                  to={`/book?service=${index + 1}`}
                  className="block mt-8 text-center py-4 font-display font-semibold transition-colors"
                  style={index === 1
                    ? { backgroundColor: '#36B9EB', color: 'black' }
                    : { border: '1px solid #36B9EB', color: '#36B9EB' }
                  }
                >
                  Book {tier.name}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Add-on Services */}
      <section className="py-16" style={{ backgroundColor: '#1B1B1B' }}>
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-display font-bold text-white text-center mb-10">ADD-ON SERVICES</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {addOnServices.map((item, index) => (
              <div key={index} className="flex justify-between items-center p-4" style={{ backgroundColor: 'black', border: '1px solid #333' }}>
                <span className="text-white font-serif">{item.service}</span>
                <span style={{ color: '#36B9EB' }} className="font-display font-bold">{item.price}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Products */}
      <section className="py-16 bg-black">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-display font-bold text-white text-center mb-10">PRODUCTS</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {products.map((item, index) => (
              <div key={index} className="text-center p-4" style={{ backgroundColor: '#1B1B1B', border: '1px solid #333' }}>
                <p className="text-white font-serif mb-2">{item.name}</p>
                <p style={{ color: '#36B9EB' }} className="font-display font-bold">{item.price}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24" style={{ backgroundColor: '#36B9EB' }}>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-5xl font-display font-bold text-black mb-6">
            READY TO TRANSFORM YOUR VEHICLE?
          </h2>
          <p className="text-black/80 text-xl font-serif mb-10">
            Book your appointment online and pay your deposit securely.
            No more Zelle hassles - simple, fast, and secure.
          </p>
          <Link to="/book" className="inline-block bg-black text-white px-10 py-4 font-display font-semibold text-lg hover:bg-zamu-gray-dark transition-colors">
            Book Now - $35 Deposit
          </Link>
        </div>
      </section>

      {/* FAQ Preview */}
      <section className="py-20 bg-black">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-4xl font-display font-bold text-white text-center mb-12">
            FREQUENTLY ASKED QUESTIONS
          </h2>

          <div className="space-y-4">
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
              {
                q: 'What is the deposit for?',
                a: 'The $35 deposit secures your appointment time. It is applied to your final balance.',
              },
            ].map((faq, index) => (
              <div key={index} className="border border-zamu-gray-dark p-6">
                <h3 className="text-white font-display font-semibold text-lg mb-3">{faq.q}</h3>
                <p className="text-zamu-gray-medium font-serif">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Location Section */}
      <section className="py-16 bg-zamu-gray-dark border-t border-zamu-gray-dark">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-display font-bold text-white mb-4">CHICAGO'S PREMIER TINT SHOP</h2>
          <p className="text-zamu-gray-medium font-serif text-lg mb-6">
            Serving the greater Chicago area with professional auto customization services.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center text-zamu-gray-light font-serif">
            <span>Mon-Sat: 9am - 5pm</span>
            <span className="hidden sm:inline text-zamu-gray-dark">|</span>
            <a href="tel:872-203-1857" className="text-zamu-cyan hover:text-zamu-cyan-light">
              872-203-1857
            </a>
            <span className="hidden sm:inline text-zamu-gray-dark">|</span>
            <a
              href="https://instagram.com/zamutints"
              target="_blank"
              rel="noopener noreferrer"
              className="text-zamu-cyan hover:text-zamu-cyan-light"
            >
              @zamutints
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}

export default Home;
