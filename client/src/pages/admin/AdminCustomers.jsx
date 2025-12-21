import { useEffect, useState } from 'react';
import {
  Search, Mail, Phone, Car, Calendar, MessageSquare, Plus, X,
  ChevronLeft, ChevronRight, Clock, DollarSign, ExternalLink, Trash2
} from 'lucide-react';
import { api } from '../../utils/api';

// Color constants
const COLORS = {
  cyan: '#36B9EB',
  dark: '#1B1B1B',
  gray: '#919191',
};

// Inline styles
const styles = {
  modal: {
    position: 'fixed',
    inset: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 50,
    padding: '1rem',
  },
  modalContent: {
    backgroundColor: COLORS.dark,
    borderRadius: '0.75rem',
    width: '100%',
    maxWidth: '900px',
    maxHeight: '90vh',
    overflow: 'hidden',
    border: `1px solid ${COLORS.gray}33`,
  },
  modalHeader: {
    padding: '1.5rem',
    borderBottom: `1px solid ${COLORS.gray}33`,
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalBody: {
    padding: '1.5rem',
    overflowY: 'auto',
    maxHeight: 'calc(90vh - 80px)',
  },
  tab: (active) => ({
    padding: '0.75rem 1.5rem',
    backgroundColor: active ? COLORS.cyan + '22' : 'transparent',
    color: active ? COLORS.cyan : COLORS.gray,
    border: 'none',
    borderBottom: active ? `2px solid ${COLORS.cyan}` : '2px solid transparent',
    cursor: 'pointer',
    fontWeight: '500',
    transition: 'all 0.2s',
  }),
  badge: (status) => {
    const statusColors = {
      completed: { bg: '#22c55e22', color: '#22c55e' },
      paid: { bg: '#3b82f622', color: '#3b82f6' },
      confirmed: { bg: '#36B9EB22', color: '#36B9EB' },
      pending_deposit: { bg: '#eab30822', color: '#eab308' },
      cancelled: { bg: '#ef444422', color: '#ef4444' },
      no_show: { bg: '#ef444422', color: '#ef4444' },
    };
    const colors = statusColors[status] || { bg: `${COLORS.gray}22`, color: COLORS.gray };
    return {
      padding: '0.25rem 0.75rem',
      borderRadius: '9999px',
      fontSize: '0.75rem',
      fontWeight: '500',
      backgroundColor: colors.bg,
      color: colors.color,
    };
  },
  vehicleCard: {
    padding: '1rem',
    backgroundColor: '#000',
    borderRadius: '0.5rem',
    border: `1px solid ${COLORS.gray}33`,
    marginBottom: '0.75rem',
  },
  noteCard: {
    padding: '1rem',
    backgroundColor: '#000',
    borderRadius: '0.5rem',
    border: `1px solid ${COLORS.gray}33`,
    marginBottom: '0.75rem',
  },
  input: {
    width: '100%',
    padding: '0.75rem 1rem',
    backgroundColor: '#000',
    border: `1px solid ${COLORS.gray}33`,
    borderRadius: '0.5rem',
    color: '#fff',
    fontSize: '0.875rem',
  },
  button: (variant = 'primary') => ({
    padding: '0.75rem 1.5rem',
    borderRadius: '0.5rem',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'all 0.2s',
    border: 'none',
    ...(variant === 'primary' ? {
      backgroundColor: COLORS.cyan,
      color: '#000',
    } : {
      backgroundColor: 'transparent',
      border: `1px solid ${COLORS.gray}33`,
      color: '#fff',
    }),
  }),
  quickAction: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    padding: '0.5rem 1rem',
    backgroundColor: '#000',
    border: `1px solid ${COLORS.gray}33`,
    borderRadius: '0.5rem',
    color: COLORS.cyan,
    cursor: 'pointer',
    textDecoration: 'none',
    fontSize: '0.875rem',
    transition: 'border-color 0.2s',
  },
};

function AdminCustomers() {
  const [customers, setCustomers] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [activeTab, setActiveTab] = useState('info');
  const [vehicles, setVehicles] = useState([]);
  const [history, setHistory] = useState([]);
  const [notes, setNotes] = useState([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [showAddVehicle, setShowAddVehicle] = useState(false);
  const [vehicleForm, setVehicleForm] = useState({
    year: '', make: '', model: '', color: '', licensePlate: '', vin: '', notes: ''
  });
  const [newNote, setNewNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const limit = 20;

  useEffect(() => {
    fetchCustomers();
  }, [page]);

  const fetchCustomers = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        ...(search && { search }),
      });
      const data = await api.get(`/admin/customers?${params}`);
      setCustomers(data.customers);
      setTotal(data.total);
    } catch (error) {
      console.error('Failed to fetch customers:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
    fetchCustomers();
  };

  const openCustomerDetail = async (customer) => {
    setSelectedCustomer(customer);
    setActiveTab('info');
    setDetailLoading(true);
    try {
      const [vehiclesData, historyData, notesData] = await Promise.all([
        api.get(`/admin/customers/${customer.id}/vehicles`),
        api.get(`/admin/customers/${customer.id}/history`),
        api.get(`/admin/customers/${customer.id}/notes`),
      ]);
      setVehicles(vehiclesData.vehicles || []);
      setHistory(historyData.history || []);
      setNotes(notesData.notes || []);
    } catch (error) {
      console.error('Failed to fetch customer details:', error);
    } finally {
      setDetailLoading(false);
    }
  };

  const closeModal = () => {
    setSelectedCustomer(null);
    setShowAddVehicle(false);
    setVehicleForm({ year: '', make: '', model: '', color: '', licensePlate: '', vin: '', notes: '' });
    setNewNote('');
  };

  const handleAddVehicle = async (e) => {
    e.preventDefault();
    if (!vehicleForm.make || !vehicleForm.model) return;
    setSubmitting(true);
    try {
      await api.post(`/admin/customers/${selectedCustomer.id}/vehicles`, vehicleForm);
      const data = await api.get(`/admin/customers/${selectedCustomer.id}/vehicles`);
      setVehicles(data.vehicles || []);
      setShowAddVehicle(false);
      setVehicleForm({ year: '', make: '', model: '', color: '', licensePlate: '', vin: '', notes: '' });
    } catch (error) {
      console.error('Failed to add vehicle:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteVehicle = async (vehicleId) => {
    if (!confirm('Are you sure you want to delete this vehicle?')) return;
    try {
      await api.delete(`/admin/customers/${selectedCustomer.id}/vehicles/${vehicleId}`);
      setVehicles(vehicles.filter(v => v.id !== vehicleId));
    } catch (error) {
      console.error('Failed to delete vehicle:', error);
    }
  };

  const handleAddNote = async (e) => {
    e.preventDefault();
    if (!newNote.trim()) return;
    setSubmitting(true);
    try {
      const note = await api.post(`/admin/customers/${selectedCustomer.id}/notes`, { note: newNote });
      setNotes([note, ...notes]);
      setNewNote('');
    } catch (error) {
      console.error('Failed to add note:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteNote = async (noteId) => {
    if (!confirm('Are you sure you want to delete this note?')) return;
    try {
      await api.delete(`/admin/customers/${selectedCustomer.id}/notes/${noteId}`);
      setNotes(notes.filter(n => n.id !== noteId));
    } catch (error) {
      console.error('Failed to delete note:', error);
    }
  };

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatTime = (timeStr) => {
    if (!timeStr) return '';
    const [hours, minutes] = timeStr.split(':');
    const h = parseInt(hours);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const hour = h % 12 || 12;
    return `${hour}:${minutes} ${ampm}`;
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <div>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#fff' }}>Customers</h1>
        <p style={{ color: COLORS.gray }}>View and manage customer information</p>
      </div>

      {/* Search */}
      <form onSubmit={handleSearch} className="card" style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <div style={{ flex: 1, position: 'relative' }}>
            <Search style={{
              position: 'absolute',
              left: '0.75rem',
              top: '50%',
              transform: 'translateY(-50%)',
              width: '1.25rem',
              height: '1.25rem',
              color: COLORS.gray
            }} />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, email, phone, or license plate..."
              style={{ ...styles.input, paddingLeft: '2.5rem' }}
            />
          </div>
          <button type="submit" style={styles.button('primary')}>
            Search
          </button>
        </div>
      </form>

      {/* Customers Grid */}
      {loading ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '16rem' }}>
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2" style={{ borderColor: COLORS.cyan }}></div>
        </div>
      ) : customers.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
          <p style={{ color: COLORS.gray }}>No customers found</p>
        </div>
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1rem' }}>
            {customers.map((customer) => (
              <div
                key={customer.id}
                className="card"
                style={{ cursor: 'pointer', transition: 'border-color 0.2s' }}
                onClick={() => openCustomerDetail(customer)}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                  <div>
                    <h3 style={{ color: '#fff', fontWeight: '600' }}>
                      {customer.first_name} {customer.last_name}
                    </h3>
                    <p style={{ color: COLORS.gray, fontSize: '0.875rem' }}>
                      Customer since{' '}
                      {new Date(customer.created_at).toLocaleDateString('en-US', {
                        month: 'short',
                        year: 'numeric',
                      })}
                    </p>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <p style={{ color: COLORS.cyan, fontWeight: '600' }}>
                      ${parseFloat(customer.total_spent || 0).toFixed(0)}
                    </p>
                    <p style={{ color: COLORS.gray, fontSize: '0.75rem' }}>Total Spent</p>
                  </div>
                </div>

                <div style={{ fontSize: '0.875rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', color: '#d1d5db', marginBottom: '0.5rem' }}>
                    <Mail style={{ width: '1rem', height: '1rem', marginRight: '0.5rem', color: COLORS.gray }} />
                    {customer.email}
                  </div>
                  {customer.phone && (
                    <div style={{ display: 'flex', alignItems: 'center', color: '#d1d5db' }}>
                      <Phone style={{ width: '1rem', height: '1rem', marginRight: '0.5rem', color: COLORS.gray }} />
                      {customer.phone}
                    </div>
                  )}
                </div>

                <div style={{
                  marginTop: '1rem',
                  paddingTop: '1rem',
                  borderTop: `1px solid ${COLORS.gray}33`,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <span style={{ color: COLORS.gray, fontSize: '0.875rem' }}>
                    {customer.total_bookings || 0} bookings
                  </span>
                  <span style={{ color: COLORS.cyan, fontSize: '0.875rem' }}>
                    View Details
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '1rem', marginTop: '2rem' }}>
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                style={{
                  ...styles.button('secondary'),
                  opacity: page === 1 ? 0.5 : 1,
                  cursor: page === 1 ? 'not-allowed' : 'pointer',
                }}
              >
                <ChevronLeft style={{ width: '1.25rem', height: '1.25rem' }} />
              </button>
              <span style={{ color: '#fff' }}>
                Page {page} of {totalPages}
              </span>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                style={{
                  ...styles.button('secondary'),
                  opacity: page === totalPages ? 0.5 : 1,
                  cursor: page === totalPages ? 'not-allowed' : 'pointer',
                }}
              >
                <ChevronRight style={{ width: '1.25rem', height: '1.25rem' }} />
              </button>
            </div>
          )}
        </>
      )}

      {/* Customer Detail Modal */}
      {selectedCustomer && (
        <div style={styles.modal} onClick={closeModal}>
          <div style={styles.modalContent} onClick={e => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <div>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#fff', marginBottom: '0.25rem' }}>
                  {selectedCustomer.first_name} {selectedCustomer.last_name}
                </h2>
                <p style={{ color: COLORS.gray, fontSize: '0.875rem' }}>
                  Customer since {formatDate(selectedCustomer.created_at)}
                </p>
              </div>
              <button
                onClick={closeModal}
                style={{ background: 'none', border: 'none', color: COLORS.gray, cursor: 'pointer' }}
              >
                <X style={{ width: '1.5rem', height: '1.5rem' }} />
              </button>
            </div>

            {/* Quick Actions */}
            <div style={{ padding: '1rem 1.5rem', borderBottom: `1px solid ${COLORS.gray}33`, display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
              <a
                href={`tel:${selectedCustomer.phone}`}
                style={styles.quickAction}
              >
                <Phone style={{ width: '1rem', height: '1rem' }} />
                Call
              </a>
              <a
                href={`mailto:${selectedCustomer.email}`}
                style={styles.quickAction}
              >
                <Mail style={{ width: '1rem', height: '1rem' }} />
                Email
              </a>
              <a
                href="/booking"
                target="_blank"
                style={styles.quickAction}
              >
                <Calendar style={{ width: '1rem', height: '1rem' }} />
                New Booking
              </a>
            </div>

            {/* Tabs */}
            <div style={{ display: 'flex', borderBottom: `1px solid ${COLORS.gray}33` }}>
              <button style={styles.tab(activeTab === 'info')} onClick={() => setActiveTab('info')}>
                Info
              </button>
              <button style={styles.tab(activeTab === 'vehicles')} onClick={() => setActiveTab('vehicles')}>
                Vehicles ({vehicles.length})
              </button>
              <button style={styles.tab(activeTab === 'history')} onClick={() => setActiveTab('history')}>
                History ({history.length})
              </button>
              <button style={styles.tab(activeTab === 'notes')} onClick={() => setActiveTab('notes')}>
                Notes ({notes.length})
              </button>
            </div>

            <div style={styles.modalBody}>
              {detailLoading ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
                  <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2" style={{ borderColor: COLORS.cyan }}></div>
                </div>
              ) : (
                <>
                  {/* Info Tab */}
                  {activeTab === 'info' && (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1.5rem' }}>
                      <div style={styles.vehicleCard}>
                        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '0.5rem' }}>
                          <Mail style={{ width: '1rem', height: '1rem', marginRight: '0.5rem', color: COLORS.cyan }} />
                          <span style={{ color: COLORS.gray, fontSize: '0.75rem', textTransform: 'uppercase' }}>Email</span>
                        </div>
                        <p style={{ color: '#fff' }}>{selectedCustomer.email}</p>
                      </div>
                      <div style={styles.vehicleCard}>
                        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '0.5rem' }}>
                          <Phone style={{ width: '1rem', height: '1rem', marginRight: '0.5rem', color: COLORS.cyan }} />
                          <span style={{ color: COLORS.gray, fontSize: '0.75rem', textTransform: 'uppercase' }}>Phone</span>
                        </div>
                        <p style={{ color: '#fff' }}>{selectedCustomer.phone || 'Not provided'}</p>
                      </div>
                      <div style={styles.vehicleCard}>
                        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '0.5rem' }}>
                          <Calendar style={{ width: '1rem', height: '1rem', marginRight: '0.5rem', color: COLORS.cyan }} />
                          <span style={{ color: COLORS.gray, fontSize: '0.75rem', textTransform: 'uppercase' }}>Total Bookings</span>
                        </div>
                        <p style={{ color: '#fff', fontSize: '1.5rem', fontWeight: 'bold' }}>{selectedCustomer.total_bookings || 0}</p>
                      </div>
                      <div style={styles.vehicleCard}>
                        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '0.5rem' }}>
                          <DollarSign style={{ width: '1rem', height: '1rem', marginRight: '0.5rem', color: COLORS.cyan }} />
                          <span style={{ color: COLORS.gray, fontSize: '0.75rem', textTransform: 'uppercase' }}>Total Spent</span>
                        </div>
                        <p style={{ color: COLORS.cyan, fontSize: '1.5rem', fontWeight: 'bold' }}>
                          ${parseFloat(selectedCustomer.total_spent || 0).toFixed(2)}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Vehicles Tab */}
                  {activeTab === 'vehicles' && (
                    <div>
                      <button
                        onClick={() => setShowAddVehicle(true)}
                        style={{ ...styles.button('primary'), marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                      >
                        <Plus style={{ width: '1rem', height: '1rem' }} />
                        Add Vehicle
                      </button>

                      {showAddVehicle && (
                        <form onSubmit={handleAddVehicle} style={{ ...styles.vehicleCard, marginBottom: '1.5rem' }}>
                          <h4 style={{ color: '#fff', fontWeight: '600', marginBottom: '1rem' }}>Add New Vehicle</h4>
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem', marginBottom: '0.75rem' }}>
                            <input
                              type="number"
                              placeholder="Year"
                              value={vehicleForm.year}
                              onChange={e => setVehicleForm({ ...vehicleForm, year: e.target.value })}
                              style={styles.input}
                            />
                            <input
                              type="text"
                              placeholder="Make *"
                              value={vehicleForm.make}
                              onChange={e => setVehicleForm({ ...vehicleForm, make: e.target.value })}
                              style={styles.input}
                              required
                            />
                            <input
                              type="text"
                              placeholder="Model *"
                              value={vehicleForm.model}
                              onChange={e => setVehicleForm({ ...vehicleForm, model: e.target.value })}
                              style={styles.input}
                              required
                            />
                          </div>
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem', marginBottom: '0.75rem' }}>
                            <input
                              type="text"
                              placeholder="Color"
                              value={vehicleForm.color}
                              onChange={e => setVehicleForm({ ...vehicleForm, color: e.target.value })}
                              style={styles.input}
                            />
                            <input
                              type="text"
                              placeholder="License Plate"
                              value={vehicleForm.licensePlate}
                              onChange={e => setVehicleForm({ ...vehicleForm, licensePlate: e.target.value })}
                              style={styles.input}
                            />
                            <input
                              type="text"
                              placeholder="VIN"
                              value={vehicleForm.vin}
                              onChange={e => setVehicleForm({ ...vehicleForm, vin: e.target.value })}
                              style={styles.input}
                              maxLength={17}
                            />
                          </div>
                          <textarea
                            placeholder="Notes"
                            value={vehicleForm.notes}
                            onChange={e => setVehicleForm({ ...vehicleForm, notes: e.target.value })}
                            style={{ ...styles.input, resize: 'none', height: '60px', marginBottom: '0.75rem' }}
                          />
                          <div style={{ display: 'flex', gap: '0.75rem' }}>
                            <button type="submit" style={styles.button('primary')} disabled={submitting}>
                              {submitting ? 'Adding...' : 'Add Vehicle'}
                            </button>
                            <button type="button" onClick={() => setShowAddVehicle(false)} style={styles.button('secondary')}>
                              Cancel
                            </button>
                          </div>
                        </form>
                      )}

                      {vehicles.length === 0 ? (
                        <p style={{ color: COLORS.gray, textAlign: 'center', padding: '2rem' }}>No vehicles on file</p>
                      ) : (
                        vehicles.map(vehicle => (
                          <div key={vehicle.id} style={styles.vehicleCard}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                              <div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                                  <Car style={{ width: '1.25rem', height: '1.25rem', color: COLORS.cyan }} />
                                  <span style={{ color: '#fff', fontWeight: '600' }}>
                                    {vehicle.year} {vehicle.make} {vehicle.model}
                                  </span>
                                </div>
                                <div style={{ display: 'flex', gap: '1rem', fontSize: '0.875rem', color: COLORS.gray }}>
                                  {vehicle.color && <span>Color: {vehicle.color}</span>}
                                  {vehicle.license_plate && <span>Plate: {vehicle.license_plate}</span>}
                                  {vehicle.vin && <span>VIN: {vehicle.vin}</span>}
                                </div>
                                {vehicle.notes && (
                                  <p style={{ color: COLORS.gray, fontSize: '0.875rem', marginTop: '0.5rem', fontStyle: 'italic' }}>
                                    {vehicle.notes}
                                  </p>
                                )}
                              </div>
                              <button
                                onClick={() => handleDeleteVehicle(vehicle.id)}
                                style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '0.25rem' }}
                              >
                                <Trash2 style={{ width: '1rem', height: '1rem' }} />
                              </button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}

                  {/* History Tab */}
                  {activeTab === 'history' && (
                    <div>
                      {history.length === 0 ? (
                        <p style={{ color: COLORS.gray, textAlign: 'center', padding: '2rem' }}>No service history</p>
                      ) : (
                        <div style={{ position: 'relative', paddingLeft: '1.5rem', borderLeft: `2px solid ${COLORS.cyan}33` }}>
                          {history.map((visit, index) => (
                            <div key={visit.id} style={{ position: 'relative', paddingBottom: '1.5rem' }}>
                              <div style={{
                                position: 'absolute',
                                left: '-1.75rem',
                                width: '0.75rem',
                                height: '0.75rem',
                                borderRadius: '50%',
                                backgroundColor: COLORS.cyan,
                                border: `2px solid ${COLORS.dark}`,
                              }} />
                              <div style={styles.vehicleCard}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                                  <div>
                                    <h4 style={{ color: '#fff', fontWeight: '600', marginBottom: '0.25rem' }}>
                                      {visit.service_name}
                                    </h4>
                                    <p style={{ color: COLORS.cyan, fontSize: '0.875rem' }}>{visit.variant_name}</p>
                                  </div>
                                  <span style={styles.badge(visit.status)}>
                                    {visit.status.replace('_', ' ')}
                                  </span>
                                </div>
                                <div style={{ display: 'flex', gap: '1.5rem', fontSize: '0.875rem', color: COLORS.gray, marginBottom: '0.5rem' }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                    <Calendar style={{ width: '0.875rem', height: '0.875rem' }} />
                                    {formatDate(visit.appointment_date)}
                                  </div>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                    <Clock style={{ width: '0.875rem', height: '0.875rem' }} />
                                    {formatTime(visit.appointment_time)}
                                  </div>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                    <DollarSign style={{ width: '0.875rem', height: '0.875rem' }} />
                                    ${parseFloat(visit.total_amount || 0).toFixed(0)}
                                  </div>
                                </div>
                                <p style={{ color: COLORS.gray, fontSize: '0.875rem' }}>
                                  Vehicle: {visit.vehicle_year} {visit.vehicle_make} {visit.vehicle_model}
                                  {visit.license_plate && ` (${visit.license_plate})`}
                                </p>
                                {visit.notes && (
                                  <p style={{ color: COLORS.gray, fontSize: '0.875rem', marginTop: '0.5rem', fontStyle: 'italic' }}>
                                    Notes: {visit.notes}
                                  </p>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Notes Tab */}
                  {activeTab === 'notes' && (
                    <div>
                      <form onSubmit={handleAddNote} style={{ marginBottom: '1.5rem' }}>
                        <textarea
                          placeholder="Add an internal note..."
                          value={newNote}
                          onChange={e => setNewNote(e.target.value)}
                          style={{ ...styles.input, resize: 'none', height: '80px', marginBottom: '0.75rem' }}
                        />
                        <button
                          type="submit"
                          style={styles.button('primary')}
                          disabled={!newNote.trim() || submitting}
                        >
                          {submitting ? 'Adding...' : 'Add Note'}
                        </button>
                      </form>

                      {notes.length === 0 ? (
                        <p style={{ color: COLORS.gray, textAlign: 'center', padding: '2rem' }}>No notes yet</p>
                      ) : (
                        notes.map(note => (
                          <div key={note.id} style={styles.noteCard}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                              <div style={{ flex: 1 }}>
                                <p style={{ color: '#fff', marginBottom: '0.5rem', whiteSpace: 'pre-wrap' }}>{note.note}</p>
                                <div style={{ display: 'flex', gap: '1rem', fontSize: '0.75rem', color: COLORS.gray }}>
                                  <span>{note.created_by_name || 'Unknown'}</span>
                                  <span>{formatDate(note.created_at)}</span>
                                </div>
                              </div>
                              <button
                                onClick={() => handleDeleteNote(note.id)}
                                style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '0.25rem' }}
                              >
                                <Trash2 style={{ width: '1rem', height: '1rem' }} />
                              </button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminCustomers;
