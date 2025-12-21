import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Calendar, Clock, Car, User, ChevronLeft, ChevronRight } from 'lucide-react';
import { api } from '../utils/api';

function Booking() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const preselectedServiceId = searchParams.get('service');

  const [step, setStep] = useState(1);
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [availableSlots, setAvailableSlots] = useState([]);
  const [slotsLoading, setSlotsLoading] = useState(false);

  const [formData, setFormData] = useState({
    serviceId: preselectedServiceId || '',
    variantId: '',
    appointmentDate: '',
    appointmentTime: '',
    vehicleYear: '',
    vehicleMake: '',
    vehicleModel: '',
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    notes: '',
  });

  useEffect(() => {
    fetchServices();
  }, []);

  useEffect(() => {
    if (formData.appointmentDate && formData.variantId) {
      fetchAvailability();
    }
  }, [formData.appointmentDate, formData.variantId]);

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

  const fetchAvailability = async () => {
    setSlotsLoading(true);
    try {
      const data = await api.get(
        `/bookings/availability/${formData.appointmentDate}?serviceVariantId=${formData.variantId}`
      );
      setAvailableSlots(data.slots || []);
    } catch (error) {
      console.error('Failed to fetch availability:', error);
      setAvailableSlots([]);
    } finally {
      setSlotsLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));

    // Reset variant when service changes
    if (name === 'serviceId') {
      setFormData((prev) => ({ ...prev, variantId: '' }));
    }
    // Reset time when date changes
    if (name === 'appointmentDate') {
      setFormData((prev) => ({ ...prev, appointmentTime: '' }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const result = await api.post('/bookings', {
        serviceVariantId: parseInt(formData.variantId),
        appointmentDate: formData.appointmentDate,
        appointmentTime: formData.appointmentTime,
        vehicleYear: parseInt(formData.vehicleYear),
        vehicleMake: formData.vehicleMake,
        vehicleModel: formData.vehicleModel,
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        phone: formData.phone,
        notes: formData.notes,
      });

      navigate(`/payment/${result.booking.id}`);
    } catch (error) {
      console.error('Booking failed:', error);
      alert(error.message || 'Failed to create booking. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const selectedService = services.find((s) => s.id === parseInt(formData.serviceId));
  const selectedVariant = selectedService?.variants?.find(
    (v) => v.id === parseInt(formData.variantId)
  );

  // Generate date options (next 30 days, excluding Sundays)
  const getAvailableDates = () => {
    const dates = [];
    const today = new Date();
    for (let i = 1; i <= 30; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      if (date.getDay() !== 0) {
        // Exclude Sunday
        dates.push(date.toISOString().split('T')[0]);
      }
    }
    return dates;
  };

  const formatDate = (dateStr) => {
    const date = new Date(dateStr + 'T12:00:00');
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  return (
    <div className="py-12">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="section-title text-center">Book Your Appointment</h1>
        <p className="section-subtitle text-center">
          Select your service, pick a time, and pay your deposit online
        </p>

        {/* Progress Steps */}
        <div className="flex items-center justify-center mb-12">
          {[
            { num: 1, label: 'Service', icon: Car },
            { num: 2, label: 'Date & Time', icon: Calendar },
            { num: 3, label: 'Your Info', icon: User },
          ].map((s, i) => (
            <div key={s.num} className="flex items-center">
              <div
                className={`flex items-center justify-center w-10 h-10 rounded-full ${
                  step >= s.num
                    ? 'bg-primary-600 text-white'
                    : 'bg-dark-800 text-dark-400'
                }`}
              >
                <s.icon className="w-5 h-5" />
              </div>
              {i < 2 && (
                <div
                  className={`w-16 h-1 mx-2 ${
                    step > s.num ? 'bg-primary-600' : 'bg-dark-800'
                  }`}
                />
              )}
            </div>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="card">
          {/* Step 1: Select Service */}
          {step === 1 && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold text-white mb-4">Select Service</h2>

              <div>
                <label className="block text-sm font-medium text-dark-300 mb-2">
                  Service Type
                </label>
                <select
                  name="serviceId"
                  value={formData.serviceId}
                  onChange={handleChange}
                  className="input"
                  required
                >
                  <option value="">Choose a service...</option>
                  {services.map((service) => (
                    <option key={service.id} value={service.id}>
                      {service.name}
                    </option>
                  ))}
                </select>
              </div>

              {selectedService && selectedService.variants?.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-dark-300 mb-2">
                    Package
                  </label>
                  <div className="space-y-2">
                    {selectedService.variants.map((variant) => (
                      <label
                        key={variant.id}
                        className="flex items-center justify-between p-4 rounded-lg border cursor-pointer transition-colors"
                        style={formData.variantId === variant.id.toString()
                          ? { borderColor: 'var(--zamu-cyan)', backgroundColor: 'rgba(54, 185, 235, 0.15)' }
                          : { borderColor: '#333', backgroundColor: 'transparent' }
                        }
                      >
                        <div className="flex items-center">
                          <input
                            type="radio"
                            name="variantId"
                            value={variant.id}
                            checked={formData.variantId === variant.id.toString()}
                            onChange={handleChange}
                            className="sr-only"
                          />
                          <div>
                            <p className="text-white font-medium">{variant.name}</p>
                            {variant.description && (
                              <p style={{ color: '#919191' }} className="text-sm">{variant.description}</p>
                            )}
                          </div>
                        </div>
                        <span style={{ color: 'var(--zamu-cyan)' }} className="font-semibold">
                          ${parseFloat(variant.price).toFixed(0)}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              <button
                type="button"
                onClick={() => setStep(2)}
                disabled={!formData.variantId}
                className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Continue
                <ChevronRight className="w-5 h-5 inline ml-2" />
              </button>
            </div>
          )}

          {/* Step 2: Date & Time */}
          {step === 2 && (
            <div className="space-y-6">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="text-dark-400 hover:text-white flex items-center"
              >
                <ChevronLeft className="w-5 h-5 mr-1" />
                Back
              </button>

              <h2 className="text-xl font-semibold text-white">Select Date & Time</h2>

              <div>
                <label className="block text-sm font-medium text-dark-300 mb-2">
                  Appointment Date
                </label>
                <select
                  name="appointmentDate"
                  value={formData.appointmentDate}
                  onChange={handleChange}
                  className="input"
                  required
                >
                  <option value="">Choose a date...</option>
                  {getAvailableDates().map((date) => (
                    <option key={date} value={date}>
                      {formatDate(date)}
                    </option>
                  ))}
                </select>
              </div>

              {formData.appointmentDate && (
                <div>
                  <label className="block text-sm font-medium text-dark-300 mb-2">
                    Available Times
                  </label>
                  {slotsLoading ? (
                    <div className="text-center py-4">
                      <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary-500 mx-auto"></div>
                    </div>
                  ) : availableSlots.length > 0 ? (
                    <div className="grid grid-cols-3 gap-2">
                      {availableSlots.map((slot) => (
                        <button
                          key={slot.time}
                          type="button"
                          onClick={() =>
                            setFormData((prev) => ({ ...prev, appointmentTime: slot.time }))
                          }
                          className="py-3 px-4 rounded-lg text-sm font-medium transition-colors"
                          style={formData.appointmentTime === slot.time
                            ? { backgroundColor: 'var(--zamu-cyan)', color: 'black' }
                            : { backgroundColor: '#1B1B1B', color: '#919191' }
                          }
                        >
                          {slot.formatted}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <p className="text-dark-400 text-center py-4">
                      No available slots for this date. Please choose another date.
                    </p>
                  )}
                </div>
              )}

              <button
                type="button"
                onClick={() => setStep(3)}
                disabled={!formData.appointmentTime}
                className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Continue
                <ChevronRight className="w-5 h-5 inline ml-2" />
              </button>
            </div>
          )}

          {/* Step 3: Vehicle & Contact Info */}
          {step === 3 && (
            <div className="space-y-6">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="text-dark-400 hover:text-white flex items-center"
              >
                <ChevronLeft className="w-5 h-5 mr-1" />
                Back
              </button>

              <h2 className="text-xl font-semibold text-white">Your Information</h2>

              {/* Vehicle Info */}
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-dark-300 mb-2">Year</label>
                  <input
                    type="number"
                    name="vehicleYear"
                    value={formData.vehicleYear}
                    onChange={handleChange}
                    placeholder="2024"
                    min="1990"
                    max="2100"
                    className="input"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-dark-300 mb-2">Make</label>
                  <input
                    type="text"
                    name="vehicleMake"
                    value={formData.vehicleMake}
                    onChange={handleChange}
                    placeholder="Toyota"
                    className="input"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-dark-300 mb-2">Model</label>
                  <input
                    type="text"
                    name="vehicleModel"
                    value={formData.vehicleModel}
                    onChange={handleChange}
                    placeholder="Camry"
                    className="input"
                    required
                  />
                </div>
              </div>

              {/* Contact Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-dark-300 mb-2">
                    First Name
                  </label>
                  <input
                    type="text"
                    name="firstName"
                    value={formData.firstName}
                    onChange={handleChange}
                    className="input"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-dark-300 mb-2">
                    Last Name
                  </label>
                  <input
                    type="text"
                    name="lastName"
                    value={formData.lastName}
                    onChange={handleChange}
                    className="input"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-dark-300 mb-2">Email</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className="input"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-dark-300 mb-2">Phone</label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="(123) 456-7890"
                  className="input"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-dark-300 mb-2">
                  Notes (optional)
                </label>
                <textarea
                  name="notes"
                  value={formData.notes}
                  onChange={handleChange}
                  rows={3}
                  className="input"
                  placeholder="Any special requests or notes..."
                />
              </div>

              {/* Summary */}
              <div className="bg-dark-800 rounded-lg p-4">
                <h3 className="text-white font-semibold mb-2">Booking Summary</h3>
                <div className="space-y-1 text-sm">
                  <p className="text-dark-300">
                    <span className="text-dark-500">Service:</span>{' '}
                    {selectedService?.name} - {selectedVariant?.name}
                  </p>
                  <p className="text-dark-300">
                    <span className="text-dark-500">Date:</span>{' '}
                    {formatDate(formData.appointmentDate)} at{' '}
                    {availableSlots.find((s) => s.time === formData.appointmentTime)?.formatted}
                  </p>
                  <p className="text-dark-300">
                    <span className="text-dark-500">Vehicle:</span>{' '}
                    {formData.vehicleYear} {formData.vehicleMake} {formData.vehicleModel}
                  </p>
                </div>
                <div className="border-t border-dark-700 mt-3 pt-3 flex justify-between">
                  <span className="text-dark-400">Deposit Required</span>
                  <span className="text-primary-400 font-bold">$35.00</span>
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="btn-primary w-full disabled:opacity-50"
              >
                {submitting ? 'Processing...' : 'Continue to Payment'}
                <ChevronRight className="w-5 h-5 inline ml-2" />
              </button>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}

export default Booking;
