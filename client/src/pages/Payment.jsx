import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useStripe, useElements, PaymentElement } from '@stripe/react-stripe-js';
import { Elements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { Shield, Lock } from 'lucide-react';
import { api } from '../utils/api';

const stripePromise = loadStripe(
  import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || 'pk_test_placeholder'
);

function PaymentForm({ booking, clientSecret }) {
  const stripe = useStripe();
  const elements = useElements();
  const navigate = useNavigate();
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setProcessing(true);
    setError(null);

    const { error: submitError } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/booking/${booking.id}`,
      },
    });

    if (submitError) {
      setError(submitError.message);
      setProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <PaymentElement />

      {error && (
        <div className="bg-red-500/10 border border-red-500 text-red-400 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={!stripe || processing}
        className="btn-primary w-full disabled:opacity-50"
      >
        {processing ? 'Processing...' : `Pay $${booking.deposit_amount} Deposit`}
      </button>

      <div className="flex items-center justify-center gap-4 text-dark-400 text-sm">
        <div className="flex items-center">
          <Lock className="w-4 h-4 mr-1" />
          Secure Payment
        </div>
        <div className="flex items-center">
          <Shield className="w-4 h-4 mr-1" />
          SSL Encrypted
        </div>
      </div>
    </form>
  );
}

function Payment() {
  const { bookingId } = useParams();
  const navigate = useNavigate();
  const [booking, setBooking] = useState(null);
  const [clientSecret, setClientSecret] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchBookingAndCreatePayment();
  }, [bookingId]);

  const fetchBookingAndCreatePayment = async () => {
    try {
      // Fetch booking details
      const bookingData = await api.get(`/bookings/${bookingId}`);
      setBooking(bookingData);

      // Check if already paid
      if (bookingData.status !== 'pending_deposit') {
        navigate(`/booking/${bookingId}`);
        return;
      }

      // Create payment intent
      const paymentData = await api.post('/payments/create-payment-intent', {
        bookingId: parseInt(bookingId),
      });
      setClientSecret(paymentData.clientSecret);
    } catch (err) {
      console.error('Failed to initialize payment:', err);
      setError(err.message || 'Failed to load payment form');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="card max-w-md text-center">
          <h2 className="text-xl font-bold text-white mb-4">Payment Error</h2>
          <p className="text-dark-400 mb-6">{error}</p>
          <button onClick={() => navigate('/book')} className="btn-primary">
            Start New Booking
          </button>
        </div>
      </div>
    );
  }

  const formatDate = (dateStr) => {
    return new Date(dateStr + 'T12:00:00').toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatTime = (timeStr) => {
    const [hours, minutes] = timeStr.split(':');
    const h = parseInt(hours);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const hour = h % 12 || 12;
    return `${hour}:${minutes} ${ampm}`;
  };

  return (
    <div className="py-12">
      <div className="max-w-xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="section-title text-center">Complete Your Booking</h1>
        <p className="section-subtitle text-center">
          Pay your $35 deposit to confirm your appointment
        </p>

        {/* Booking Summary */}
        <div className="card mb-8">
          <h2 className="text-lg font-semibold text-white mb-4">Booking Summary</h2>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-dark-400">Service</span>
              <span className="text-white">{booking.service_name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-dark-400">Package</span>
              <span className="text-white">{booking.variant_name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-dark-400">Date</span>
              <span className="text-white">{formatDate(booking.appointment_date)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-dark-400">Time</span>
              <span className="text-white">{formatTime(booking.appointment_time)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-dark-400">Vehicle</span>
              <span className="text-white">
                {booking.vehicle_year} {booking.vehicle_make} {booking.vehicle_model}
              </span>
            </div>
            <div className="border-t border-dark-700 pt-3 mt-3">
              <div className="flex justify-between">
                <span className="text-dark-400">Service Total</span>
                <span className="text-white">${parseFloat(booking.total_amount).toFixed(2)}</span>
              </div>
              <div className="flex justify-between mt-2">
                <span className="text-white font-semibold">Deposit Due Now</span>
                <span className="text-primary-400 font-bold">
                  ${parseFloat(booking.deposit_amount).toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between text-dark-500 text-xs mt-1">
                <span>Remaining balance due at appointment</span>
                <span>
                  ${(parseFloat(booking.total_amount) - parseFloat(booking.deposit_amount)).toFixed(2)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Payment Form */}
        <div className="card">
          <h2 className="text-lg font-semibold text-white mb-6">Payment Details</h2>
          {clientSecret && (
            <Elements
              stripe={stripePromise}
              options={{
                clientSecret,
                appearance: {
                  theme: 'night',
                  variables: {
                    colorPrimary: '#3b82f6',
                    colorBackground: '#1e293b',
                    colorText: '#ffffff',
                    colorDanger: '#ef4444',
                    fontFamily: 'Inter, system-ui, sans-serif',
                    borderRadius: '8px',
                  },
                },
              }}
            >
              <PaymentForm booking={booking} clientSecret={clientSecret} />
            </Elements>
          )}
        </div>

        <p className="text-dark-500 text-xs text-center mt-6">
          By completing this payment, you agree to our cancellation policy.
          Deposits are non-refundable for no-shows or cancellations within 24 hours.
        </p>
      </div>
    </div>
  );
}

export default Payment;
