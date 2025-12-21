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
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-dark-950/95 backdrop-blur-sm border-b border-dark-800">
        <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link to="/" className="flex items-center space-x-2">
              <span className="text-2xl font-bold text-white">ZAMU</span>
              <span className="text-2xl font-bold text-primary-500">TINTS</span>
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center space-x-8">
              {navigation.map((item) => (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`text-sm font-medium transition-colors ${
                    location.pathname === item.href
                      ? 'text-primary-400'
                      : 'text-dark-300 hover:text-white'
                  }`}
                >
                  {item.name}
                </Link>
              ))}
              <a href="tel:872-203-1857" className="btn-primary text-sm">
                <Phone className="w-4 h-4 inline mr-2" />
                872-203-1857
              </a>
            </div>

            {/* Mobile menu button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 text-dark-400 hover:text-white"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>

          {/* Mobile Navigation */}
          {mobileMenuOpen && (
            <div className="md:hidden py-4 border-t border-dark-800">
              {navigation.map((item) => (
                <Link
                  key={item.name}
                  to={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`block py-3 text-base font-medium ${
                    location.pathname === item.href
                      ? 'text-primary-400'
                      : 'text-dark-300'
                  }`}
                >
                  {item.name}
                </Link>
              ))}
              <a href="tel:872-203-1857" className="block py-3 text-primary-400 font-medium">
                <Phone className="w-4 h-4 inline mr-2" />
                872-203-1857
              </a>
            </div>
          )}
        </nav>
      </header>

      {/* Main Content */}
      <main className="flex-1 pt-16">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="bg-dark-900 border-t border-dark-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {/* Brand */}
            <div className="col-span-1 md:col-span-2">
              <Link to="/" className="flex items-center space-x-2 mb-4">
                <span className="text-2xl font-bold text-white">ZAMU</span>
                <span className="text-2xl font-bold text-primary-500">TINTS</span>
              </Link>
              <p className="text-dark-400 mb-4">
                Professional window tinting, vinyl wraps, and auto customization in Chicago.
                Quality work with lifetime warranties on ceramic films.
              </p>
              <div className="flex space-x-4">
                <a
                  href="https://instagram.com/zamutints"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-dark-400 hover:text-primary-400 transition-colors"
                >
                  <Instagram className="w-6 h-6" />
                </a>
              </div>
            </div>

            {/* Quick Links */}
            <div>
              <h3 className="text-white font-semibold mb-4">Quick Links</h3>
              <ul className="space-y-2">
                {navigation.map((item) => (
                  <li key={item.name}>
                    <Link
                      to={item.href}
                      className="text-dark-400 hover:text-primary-400 transition-colors"
                    >
                      {item.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Contact */}
            <div>
              <h3 className="text-white font-semibold mb-4">Contact</h3>
              <ul className="space-y-2 text-dark-400">
                <li>
                  <a href="tel:872-203-1857" className="hover:text-primary-400 transition-colors">
                    872-203-1857
                  </a>
                </li>
                <li>Chicago, IL</li>
                <li>Mon-Sat: 9am - 5pm</li>
                <li>Sun: Closed</li>
              </ul>
            </div>
          </div>

          <div className="border-t border-dark-800 mt-8 pt-8 text-center text-dark-500 text-sm">
            &copy; {new Date().getFullYear()} Zamu Tints Corp. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}

export default Layout;
