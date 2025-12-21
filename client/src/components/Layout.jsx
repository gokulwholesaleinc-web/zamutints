import { Outlet, Link, useLocation } from 'react-router-dom';
import { Menu, X, Phone, Instagram } from 'lucide-react';
import { useState } from 'react';

function Layout() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();

  const navigation = [
    { name: 'Home', href: '/' },
    { name: 'Services', href: '/services' },
    { name: 'Book Now', href: '/book' },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-black">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-black/95 backdrop-blur-sm border-b border-zamu-gray-dark">
        <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            {/* Logo */}
            <Link to="/" className="flex items-center">
              <img
                src="/images/logo.png"
                alt="Zamu Tints"
                className="h-14 w-auto"
              />
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center space-x-10">
              {navigation.map((item) => (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`text-base font-medium transition-colors font-serif ${
                    location.pathname === item.href
                      ? 'text-zamu-cyan'
                      : 'text-white hover:text-zamu-cyan'
                  }`}
                >
                  {item.name}
                </Link>
              ))}
              <a href="tel:872-203-1857" className="btn-primary flex items-center">
                <Phone className="w-4 h-4 mr-2" />
                872-203-1857
              </a>
            </div>

            {/* Mobile menu button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 text-white hover:text-zamu-cyan"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>

          {/* Mobile Navigation */}
          {mobileMenuOpen && (
            <div className="md:hidden py-4 border-t border-zamu-gray-dark">
              {navigation.map((item) => (
                <Link
                  key={item.name}
                  to={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`block py-3 text-lg font-serif ${
                    location.pathname === item.href
                      ? 'text-zamu-cyan'
                      : 'text-white'
                  }`}
                >
                  {item.name}
                </Link>
              ))}
              <a href="tel:872-203-1857" className="block py-3 text-zamu-cyan font-serif">
                <Phone className="w-4 h-4 inline mr-2" />
                872-203-1857
              </a>
            </div>
          )}
        </nav>
      </header>

      {/* Main Content */}
      <main className="flex-1 pt-20">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="bg-zamu-gray-dark border-t border-zamu-gray-dark">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {/* Brand */}
            <div className="col-span-1 md:col-span-2">
              <Link to="/" className="inline-block mb-4">
                <img
                  src="/images/logo.png"
                  alt="Zamu Tints"
                  className="h-12 w-auto"
                />
              </Link>
              <p className="text-zamu-gray-medium font-serif mb-4">
                Professional window tinting, vinyl wraps, and auto customization in Chicago.
                Quality work with lifetime warranties on ceramic films.
              </p>
              <div className="flex space-x-4">
                <a
                  href="https://instagram.com/zamutints"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-zamu-gray-medium hover:text-zamu-cyan transition-colors"
                >
                  <Instagram className="w-6 h-6" />
                </a>
              </div>
            </div>

            {/* Quick Links */}
            <div>
              <h3 className="text-white font-display font-semibold mb-4 text-lg">Quick Links</h3>
              <ul className="space-y-2">
                {navigation.map((item) => (
                  <li key={item.name}>
                    <Link
                      to={item.href}
                      className="text-zamu-gray-medium hover:text-zamu-cyan transition-colors font-serif"
                    >
                      {item.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Contact */}
            <div>
              <h3 className="text-white font-display font-semibold mb-4 text-lg">Contact</h3>
              <ul className="space-y-2 text-zamu-gray-medium font-serif">
                <li>
                  <a href="tel:872-203-1857" className="hover:text-zamu-cyan transition-colors">
                    872-203-1857
                  </a>
                </li>
                <li>Chicago, IL</li>
                <li>Mon-Sat: 9am - 5pm</li>
                <li>Sun: Closed</li>
              </ul>
            </div>
          </div>

          <div className="border-t border-black mt-8 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm font-serif">
            <span style={{ color: '#919191' }}>
              &copy; {new Date().getFullYear()} Zamu Tints Corp. All rights reserved.
            </span>
            <Link
              to="/admin"
              style={{ color: '#919191' }}
              className="hover:text-white transition-colors"
            >
              Admin Login
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default Layout;
