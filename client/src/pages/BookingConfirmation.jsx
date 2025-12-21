import { useEffect, useState } from 'react';
import { useParams, Link, useSearchParams } from 'react-router-dom';
import { CheckCircle, Calendar, Clock, Car, Phone, MapPin } from 'lucide-react';
import { api } from '../utils/api';

function BookingConfirmation() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);

  // Check if coming from Stripe redirect
  const paymentIntent = searchParams.get('payment_intent');
  const redirectStatus = searchParams.get('redirect_status');

  useEffect(() => {
    fetchBooking();
  }, [id]);

  const fetchBooking = async () => {
    try {
      const data = await api.get(`/bookings/${id}`);
      setBooking(data);
    } catch (error) {
      console.error('Failed to fetch booking:', error);
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

  if (!booking) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="card max-w-md text-center">
          <h2 className="text-xl font-bold text-white mb-4">Booking Not Found</h2>
          <p className="text-dark-400 mb-6">
            We couldn't find this booking. Please check your confirmation email.
          </p>
          <Link to="/book" className="btn-primary">
            Make a New Booking
          </Link>
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

  const isConfirmed = booking.status === 'confirmed' || booking.status === 'paid';
  const isPending = booking.status === 'pending_deposit';

  return (
    <div className="py-12">
      <div className="max-w-xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Status Header */}
        <div className="text-center mb-8">
          {isConfirmed ? (
            <>
              <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
              <h1 className="text-3xl font-bold text-white mb-2">Booking Confirmed!</h1>
              <p className="text-dark-400">
                Thank you for your booking. We've sent a confirmation to {booking.email}.
              </p>
            </>
          ) : isPending ? (
            <>
              <div className="w-16 h-16 bg-yellow-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Clock className="w-8 h-8 text-yellow-500" />
              </div>
              <h1 className="text-3xl font-bold text-white mb-2">Deposit Required</h1>
              <p className="text-dark-400">
                Complete your deposit payment to confirm your appointment.
              </p>
              <Link
                to={`/payment/${booking.id}`}
                className="btn-primary inline-block mt-4"
              >
                Pay $35 Deposit
              </Link>
            </>
          ) : (
            <>
              <h1 className="text-3xl font-bold text-white mb-2">Booking Details</h1>
              <p className="text-dark-400">Status: {booking.status}</p>
            </>
          )}
        </div>

        {/* Booking Details Card */}
        <div className="card">
          <h2 className="text-lg font-semibold text-white mb-6 pb-4 border-b border-dark-700">
            Appointment Details
          </h2>

          <div className="space-y-4">
            <div className="flex items-start">
              <Calendar className="w-5 h-5 text-primary-400 mt-0.5 mr-3" />
              <div>
                <p className="text-white font-medium">{formatDate(booking.appointment_date)}</p>
                <p className="text-dark-400 text-sm">{formatTime(booking.appointment_time)}</p>
              </div>
            </div>

            <div className="flex items-start">
              <Car className="w-5 h-5 text-primary-400 mt-0.5 mr-3" />
              <div>
                <p className="text-white font-medium">
                  {booking.vehicle_year} {booking.vehicle_make} {booking.vehicle_model}
                </p>
                <p className="text-dark-400 text-sm">
                  {booking.service_name} - {booking.variant_name}
                </p>
              </div>
            </div>

            <div className="flex items-start">
              <MapPin className="w-5 h-5 text-primary-400 mt-0.5 mr-3" />
              <div>
                <p className="text-white font-medium">Zamu Tints</p>
                <p className="text-dark-400 text-sm">Chicago, IL</p>
              </div>
            </div>
          </div>

          {/* Payment Summary */}
          <div className="mt-6 pt-6 border-t border-dark-700">
            <div className="flex justify-between mb-2">
              <span className="text-dark-400">Service Total</span>
              <span className="text-white">${parseFloat(booking.total_amount).toFixed(2)}</span>
            </div>
            <div className="flex justify-between mb-2">
              <span className="text-dark-400">Deposit Paid</span>
              <span className="text-green-400">
                {isConfirmed ? `-$${parseFloat(booking.deposit_amount).toFixed(2)}` : '$0.00'}
              </span>
            </div>
            <div className="flex justify-between pt-2 border-t border-dark-700">
              <span className="text-white font-semibold">Balance Due at Appointment</span>
              <span className="text-primary-400 font-bold">
                $
                {isConfirmed
                  ? (parseFloat(booking.total_amount) - parseFloat(booking.deposit_amount)).toFixed(2)
                  : parseFloat(booking.total_amount).toFixed(2)}
              </span>
            </div>
          </div>
        </div>

        {/* Contact Info */}
        <div className="card mt-6">
          <h2 className="text-lg font-semibold text-white mb-4">Need to Make Changes?</h2>
          <p className="text-dark-400 mb-4">
            To reschedule or cancel your appointment, please contact us at least 24 hours
            in advance.
          </p>
          <a
            href="tel:872-203-1857"
            className="btn-secondary w-full text-center flex items-center justify-center"
          >
            <Phone className="w-5 h-5 mr-2" />
            Call 872-203-1857
          </a>
        </div>

        {/* Back to Home */}
        <div className="text-center mt-8">
          <Link to="/" className="text-primary-400 hover:text-primary-300">
            &larr; Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}

export default BookingConfirmation;
