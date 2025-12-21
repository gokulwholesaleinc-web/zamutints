import { Routes, Route } from 'react-router-dom';
import { loadStripe } from '@stripe/stripe-js';
import { Elements } from '@stripe/react-stripe-js';
import Layout from './components/Layout';
import ScrollToTop from './components/ScrollToTop';
import Home from './pages/Home';
import Services from './pages/Services';
import Booking from './pages/Booking';
import BookingConfirmation from './pages/BookingConfirmation';
import Payment from './pages/Payment';
import AdminLogin from './pages/admin/AdminLogin';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminBookings from './pages/admin/AdminBookings';
import AdminCustomers from './pages/admin/AdminCustomers';
import AdminServices from './pages/admin/AdminServices';
import AdminSettings from './pages/admin/AdminSettings';
import AdminAnalytics from './pages/admin/AdminAnalytics';
import AdminFinance from './pages/admin/AdminFinance';
import AdminInventory from './pages/admin/AdminInventory';
import AdminNotifications from './pages/admin/AdminNotifications';
import ProtectedRoute from './components/ProtectedRoute';

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || 'pk_test_placeholder');

function App() {
  return (
    <Elements stripe={stripePromise}>
      <ScrollToTop />
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="services" element={<Services />} />
          <Route path="book" element={<Booking />} />
          <Route path="booking/:id" element={<BookingConfirmation />} />
          <Route path="payment/:bookingId" element={<Payment />} />
        </Route>

        {/* Admin Routes */}
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route path="/admin" element={<ProtectedRoute />}>
          <Route index element={<AdminDashboard />} />
          <Route path="bookings" element={<AdminBookings />} />
          <Route path="customers" element={<AdminCustomers />} />
          <Route path="services" element={<AdminServices />} />
          <Route path="settings" element={<AdminSettings />} />
          <Route path="analytics" element={<AdminAnalytics />} />
          <Route path="finance" element={<AdminFinance />} />
          <Route path="inventory" element={<AdminInventory />} />
          <Route path="notifications" element={<AdminNotifications />} />
        </Route>
      </Routes>
    </Elements>
  );
}

export default App;
