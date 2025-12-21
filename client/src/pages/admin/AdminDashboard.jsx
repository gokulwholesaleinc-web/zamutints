import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Calendar,
  DollarSign,
  Clock,
  CheckCircle,
  PlayCircle,
  UserCheck,
  AlertCircle,
  ChevronRight,
  Car,
  Phone,
  RefreshCw
} from 'lucide-react';
import { api } from '../../utils/api';

// Color constants
const COLORS = {
  cyan: '#36B9EB',
  dark: '#1B1B1B',
  gray: '#919191',
  darkBg: '#0D0D0D',
  cardBg: '#1A1A1A',
  border: '#2A2A2A'
};

// Inline styles
const styles = {
  container: {
    minHeight: '100vh',
    backgroundColor: COLORS.darkBg
  },
  header: {
    marginBottom: '2rem'
  },
  title: {
    fontSize: '1.5rem',
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: '0.25rem'
  },
  subtitle: {
    color: COLORS.gray,
    fontSize: '0.875rem'
  },
  card: {
    backgroundColor: COLORS.cardBg,
    borderRadius: '0.75rem',
    padding: '1.25rem',
    border: `1px solid ${COLORS.border}`
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '1rem',
    marginBottom: '2rem'
  },
  statCard: {
    backgroundColor: COLORS.cardBg,
    borderRadius: '0.75rem',
    padding: '1.25rem',
    border: `1px solid ${COLORS.border}`,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  statValue: {
    fontSize: '1.75rem',
    fontWeight: 'bold',
    color: '#FFFFFF'
  },
  statLabel: {
    color: COLORS.gray,
    fontSize: '0.875rem',
    marginTop: '0.25rem'
  },
  iconBox: (bgColor) => ({
    width: '48px',
    height: '48px',
    borderRadius: '0.5rem',
    backgroundColor: bgColor,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  }),
  sectionTitle: {
    fontSize: '1.125rem',
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: '1rem',
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem'
  },
  timeline: {
    position: 'relative',
    paddingLeft: '1rem'
  },
  timelineItem: {
    position: 'relative',
    paddingBottom: '1.5rem',
    paddingLeft: '1.5rem',
    borderLeft: `2px solid ${COLORS.border}`
  },
  timelineDot: (color) => ({
    position: 'absolute',
    left: '-9px',
    top: '0',
    width: '16px',
    height: '16px',
    borderRadius: '50%',
    backgroundColor: color,
    border: `3px solid ${COLORS.cardBg}`
  }),
  appointmentCard: {
    backgroundColor: COLORS.dark,
    borderRadius: '0.5rem',
    padding: '1rem',
    marginBottom: '0.75rem',
    border: `1px solid ${COLORS.border}`,
    transition: 'border-color 0.2s'
  },
  appointmentHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '0.75rem'
  },
  appointmentTime: {
    color: COLORS.cyan,
    fontWeight: '600',
    fontSize: '0.875rem'
  },
  statusBadge: (bgColor, textColor) => ({
    padding: '0.25rem 0.75rem',
    borderRadius: '9999px',
    fontSize: '0.75rem',
    fontWeight: '500',
    backgroundColor: bgColor,
    color: textColor
  }),
  customerInfo: {
    color: '#FFFFFF',
    fontWeight: '500',
    marginBottom: '0.25rem'
  },
  vehicleInfo: {
    color: COLORS.gray,
    fontSize: '0.875rem',
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem'
  },
  serviceInfo: {
    color: COLORS.cyan,
    fontSize: '0.875rem',
    marginTop: '0.5rem'
  },
  actionButtons: {
    display: 'flex',
    gap: '0.5rem',
    marginTop: '0.75rem'
  },
  actionButton: (bgColor, hoverColor) => ({
    padding: '0.5rem 1rem',
    borderRadius: '0.375rem',
    fontSize: '0.75rem',
    fontWeight: '500',
    backgroundColor: bgColor,
    color: '#FFFFFF',
    border: 'none',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '0.25rem',
    transition: 'background-color 0.2s'
  }),
  upcomingGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(7, 1fr)',
    gap: '0.5rem',
    marginBottom: '1.5rem'
  },
  dayCard: (isToday) => ({
    backgroundColor: isToday ? COLORS.cyan + '20' : COLORS.dark,
    borderRadius: '0.5rem',
    padding: '0.75rem',
    textAlign: 'center',
    border: isToday ? `2px solid ${COLORS.cyan}` : `1px solid ${COLORS.border}`
  }),
  dayName: {
    color: COLORS.gray,
    fontSize: '0.75rem',
    marginBottom: '0.25rem'
  },
  dayNumber: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: '1.25rem',
    marginBottom: '0.25rem'
  },
  dayAppointments: {
    color: COLORS.cyan,
    fontSize: '0.75rem'
  },
  refreshButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    padding: '0.5rem 1rem',
    backgroundColor: 'transparent',
    border: `1px solid ${COLORS.border}`,
    borderRadius: '0.375rem',
    color: COLORS.gray,
    cursor: 'pointer',
    fontSize: '0.875rem',
    transition: 'all 0.2s'
  },
  loading: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: '16rem'
  },
  spinner: {
    width: '48px',
    height: '48px',
    border: `3px solid ${COLORS.border}`,
    borderTopColor: COLORS.cyan,
    borderRadius: '50%',
    animation: 'spin 1s linear infinite'
  },
  emptyState: {
    textAlign: 'center',
    padding: '3rem',
    color: COLORS.gray
  },
  twoColumnGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
    gap: '1.5rem',
    marginBottom: '2rem'
  }
};

// Status configuration
const STATUS_CONFIG = {
  pending_deposit: { label: 'Pending Deposit', bg: '#FFA50020', text: '#FFA500', dot: '#FFA500' },
  confirmed: { label: 'Confirmed', bg: '#3B82F620', text: '#3B82F6', dot: '#3B82F6' },
  paid: { label: 'Paid', bg: '#10B98120', text: '#10B981', dot: '#10B981' },
  checked_in: { label: 'Checked In', bg: '#8B5CF620', text: '#8B5CF6', dot: '#8B5CF6' },
  in_progress: { label: 'In Progress', bg: '#36B9EB20', text: '#36B9EB', dot: '#36B9EB' },
  completed: { label: 'Completed', bg: '#10B98140', text: '#10B981', dot: '#10B981' },
  cancelled: { label: 'Cancelled', bg: '#EF444420', text: '#EF4444', dot: '#EF4444' },
  no_show: { label: 'No Show', bg: '#6B728020', text: '#6B7280', dot: '#6B7280' }
};

function formatTime(timeStr) {
  if (!timeStr) return '';
  const [hours, minutes] = timeStr.split(':');
  const h = parseInt(hours, 10);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const hour = h % 12 || 12;
  return `${hour}:${minutes} ${ampm}`;
}

function formatDate(dateStr) {
  const date = new Date(dateStr + 'T00:00:00');
  return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

function getDayName(dateStr) {
  const date = new Date(dateStr + 'T00:00:00');
  return date.toLocaleDateString('en-US', { weekday: 'short' });
}

function getDayNumber(dateStr) {
  const date = new Date(dateStr + 'T00:00:00');
  return date.getDate();
}

function AdminDashboard() {
  const [todayAppointments, setTodayAppointments] = useState([]);
  const [stats, setStats] = useState(null);
  const [upcoming, setUpcoming] = useState({ dailySummary: [], upcomingAppointments: [] });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async (showRefreshing = false) => {
    if (showRefreshing) setRefreshing(true);
    try {
      const [todayData, statsData, upcomingData] = await Promise.all([
        api.get('/admin/dashboard/today'),
        api.get('/admin/dashboard/stats'),
        api.get('/admin/dashboard/upcoming')
      ]);
      setTodayAppointments(todayData.appointments || []);
      setStats(statsData);
      setUpcoming(upcomingData);
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    // Auto-refresh every 2 minutes
    const interval = setInterval(() => fetchData(), 120000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const handleStatusUpdate = async (bookingId, newStatus) => {
    try {
      await api.patch(`/admin/dashboard/bookings/${bookingId}/status`, { status: newStatus });
      fetchData(true);
    } catch (error) {
      console.error('Failed to update status:', error);
      alert('Failed to update booking status');
    }
  };

  const getNextAction = (status) => {
    switch (status) {
      case 'confirmed':
      case 'paid':
        return { action: 'checked_in', label: 'Check In', icon: UserCheck, color: '#8B5CF6' };
      case 'checked_in':
        return { action: 'in_progress', label: 'Start Work', icon: PlayCircle, color: COLORS.cyan };
      case 'in_progress':
        return { action: 'completed', label: 'Complete', icon: CheckCircle, color: '#10B981' };
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div style={styles.loading}>
        <div style={styles.spinner} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  const today = new Date().toISOString().split('T')[0];

  // Build 7-day calendar starting from today
  const weekDays = [];
  for (let i = 0; i < 7; i++) {
    const date = new Date();
    date.setDate(date.getDate() + i);
    const dateStr = date.toISOString().split('T')[0];
    const dayData = upcoming.dailySummary.find(d => d.date === dateStr);
    weekDays.push({
      date: dateStr,
      dayName: getDayName(dateStr),
      dayNumber: getDayNumber(dateStr),
      appointments: i === 0 ? todayAppointments.length : (dayData?.appointmentCount || 0),
      revenue: dayData?.expectedRevenue || 0,
      isToday: i === 0
    });
  }

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={{ ...styles.header, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 style={styles.title}>Daily Operations</h1>
          <p style={styles.subtitle}>
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
          </p>
        </div>
        <button
          onClick={() => fetchData(true)}
          style={styles.refreshButton}
          disabled={refreshing}
        >
          <RefreshCw size={16} style={{ animation: refreshing ? 'spin 1s linear infinite' : 'none' }} />
          {refreshing ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      {/* Revenue Stats */}
      <div style={styles.statsGrid}>
        <div style={{ ...styles.statCard, borderLeft: `4px solid ${COLORS.cyan}` }}>
          <div>
            <div style={styles.statValue}>${stats?.todayRevenue?.toLocaleString() || '0'}</div>
            <div style={styles.statLabel}>Today's Revenue</div>
          </div>
          <div style={styles.iconBox(COLORS.cyan + '20')}>
            <DollarSign size={24} color={COLORS.cyan} />
          </div>
        </div>

        <div style={{ ...styles.statCard, borderLeft: '4px solid #10B981' }}>
          <div>
            <div style={styles.statValue}>${stats?.weekRevenue?.toLocaleString() || '0'}</div>
            <div style={styles.statLabel}>This Week</div>
          </div>
          <div style={styles.iconBox('#10B98120')}>
            <DollarSign size={24} color="#10B981" />
          </div>
        </div>

        <div style={{ ...styles.statCard, borderLeft: '4px solid #3B82F6' }}>
          <div>
            <div style={styles.statValue}>${stats?.monthRevenue?.toLocaleString() || '0'}</div>
            <div style={styles.statLabel}>This Month</div>
          </div>
          <div style={styles.iconBox('#3B82F620')}>
            <DollarSign size={24} color="#3B82F6" />
          </div>
        </div>

        <div style={{ ...styles.statCard, borderLeft: '4px solid #8B5CF6' }}>
          <div>
            <div style={styles.statValue}>
              {stats?.todayCompleted || 0} / {stats?.todayTotal || 0}
            </div>
            <div style={styles.statLabel}>Jobs Completed Today</div>
          </div>
          <div style={styles.iconBox('#8B5CF620')}>
            <CheckCircle size={24} color="#8B5CF6" />
          </div>
        </div>
      </div>

      {/* Quick Status Overview */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', flexWrap: 'wrap' }}>
        <div style={{
          ...styles.card,
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          padding: '0.75rem 1rem',
          borderLeft: '3px solid #8B5CF6'
        }}>
          <UserCheck size={20} color="#8B5CF6" />
          <span style={{ color: '#FFFFFF', fontWeight: '500' }}>{stats?.checkedIn || 0}</span>
          <span style={{ color: COLORS.gray, fontSize: '0.875rem' }}>Checked In</span>
        </div>
        <div style={{
          ...styles.card,
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          padding: '0.75rem 1rem',
          borderLeft: `3px solid ${COLORS.cyan}`
        }}>
          <PlayCircle size={20} color={COLORS.cyan} />
          <span style={{ color: '#FFFFFF', fontWeight: '500' }}>{stats?.inProgress || 0}</span>
          <span style={{ color: COLORS.gray, fontSize: '0.875rem' }}>In Progress</span>
        </div>
      </div>

      {/* 7-Day Overview */}
      <div style={styles.card}>
        <h2 style={styles.sectionTitle}>
          <Calendar size={20} color={COLORS.cyan} />
          7-Day Overview
        </h2>
        <div style={styles.upcomingGrid}>
          {weekDays.map((day) => (
            <div key={day.date} style={styles.dayCard(day.isToday)}>
              <div style={styles.dayName}>{day.dayName}</div>
              <div style={styles.dayNumber}>{day.dayNumber}</div>
              <div style={styles.dayAppointments}>
                {day.appointments} {day.appointments === 1 ? 'apt' : 'apts'}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Main Content - Two Columns */}
      <div style={{ ...styles.twoColumnGrid, marginTop: '1.5rem' }}>
        {/* Today's Schedule */}
        <div style={styles.card}>
          <h2 style={styles.sectionTitle}>
            <Clock size={20} color={COLORS.cyan} />
            Today's Schedule
            <span style={{
              marginLeft: 'auto',
              backgroundColor: COLORS.cyan + '20',
              color: COLORS.cyan,
              padding: '0.25rem 0.75rem',
              borderRadius: '9999px',
              fontSize: '0.75rem'
            }}>
              {todayAppointments.length} appointments
            </span>
          </h2>

          {todayAppointments.length === 0 ? (
            <div style={styles.emptyState}>
              <Calendar size={48} color={COLORS.gray} style={{ marginBottom: '1rem', opacity: 0.5 }} />
              <p>No appointments scheduled for today</p>
            </div>
          ) : (
            <div style={{ maxHeight: '500px', overflowY: 'auto' }}>
              {todayAppointments.map((appointment) => {
                const statusConfig = STATUS_CONFIG[appointment.status] || STATUS_CONFIG.confirmed;
                const nextAction = getNextAction(appointment.status);

                return (
                  <div
                    key={appointment.id}
                    style={styles.appointmentCard}
                  >
                    <div style={styles.appointmentHeader}>
                      <div>
                        <div style={styles.appointmentTime}>
                          {formatTime(appointment.appointment_time)}
                          <span style={{ color: COLORS.gray, fontWeight: 'normal', marginLeft: '0.5rem' }}>
                            ({appointment.duration_minutes} min)
                          </span>
                        </div>
                        <div style={styles.customerInfo}>
                          {appointment.first_name} {appointment.last_name}
                        </div>
                      </div>
                      <span style={styles.statusBadge(statusConfig.bg, statusConfig.text)}>
                        {statusConfig.label}
                      </span>
                    </div>

                    <div style={styles.vehicleInfo}>
                      <Car size={14} />
                      {appointment.vehicle_year} {appointment.vehicle_make} {appointment.vehicle_model}
                    </div>

                    <div style={styles.serviceInfo}>
                      {appointment.service_name} - {appointment.variant_name}
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.75rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        {appointment.phone && (
                          <a
                            href={`tel:${appointment.phone}`}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.25rem',
                              color: COLORS.gray,
                              fontSize: '0.75rem',
                              textDecoration: 'none'
                            }}
                          >
                            <Phone size={12} />
                            {appointment.phone}
                          </a>
                        )}
                      </div>
                      <span style={{ color: COLORS.cyan, fontWeight: '600', fontSize: '0.875rem' }}>
                        ${appointment.total_amount?.toLocaleString() || '0'}
                      </span>
                    </div>

                    {nextAction && appointment.status !== 'completed' && appointment.status !== 'cancelled' && (
                      <div style={styles.actionButtons}>
                        <button
                          onClick={() => handleStatusUpdate(appointment.id, nextAction.action)}
                          style={styles.actionButton(nextAction.color, nextAction.color)}
                        >
                          <nextAction.icon size={14} />
                          {nextAction.label}
                        </button>
                        {appointment.status !== 'no_show' && appointment.status !== 'checked_in' && appointment.status !== 'in_progress' && (
                          <button
                            onClick={() => handleStatusUpdate(appointment.id, 'no_show')}
                            style={styles.actionButton('#6B7280', '#6B7280')}
                          >
                            <AlertCircle size={14} />
                            No Show
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Upcoming Appointments */}
        <div style={styles.card}>
          <h2 style={styles.sectionTitle}>
            <ChevronRight size={20} color={COLORS.cyan} />
            Upcoming Appointments
          </h2>

          {upcoming.upcomingAppointments.length === 0 ? (
            <div style={styles.emptyState}>
              <Calendar size={48} color={COLORS.gray} style={{ marginBottom: '1rem', opacity: 0.5 }} />
              <p>No upcoming appointments</p>
            </div>
          ) : (
            <div style={{ maxHeight: '500px', overflowY: 'auto' }}>
              {upcoming.upcomingAppointments.map((appointment) => {
                const statusConfig = STATUS_CONFIG[appointment.status] || STATUS_CONFIG.confirmed;

                return (
                  <div
                    key={appointment.id}
                    style={styles.appointmentCard}
                  >
                    <div style={styles.appointmentHeader}>
                      <div>
                        <div style={{ color: COLORS.gray, fontSize: '0.75rem', marginBottom: '0.25rem' }}>
                          {formatDate(appointment.appointment_date)}
                        </div>
                        <div style={styles.appointmentTime}>
                          {formatTime(appointment.appointment_time)}
                        </div>
                      </div>
                      <span style={styles.statusBadge(statusConfig.bg, statusConfig.text)}>
                        {statusConfig.label}
                      </span>
                    </div>

                    <div style={styles.customerInfo}>
                      {appointment.first_name} {appointment.last_name}
                    </div>

                    <div style={styles.vehicleInfo}>
                      <Car size={14} />
                      {appointment.vehicle_year} {appointment.vehicle_make} {appointment.vehicle_model}
                    </div>

                    <div style={styles.serviceInfo}>
                      {appointment.service_name} - {appointment.variant_name}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <Link
            to="/admin/bookings"
            style={{
              display: 'block',
              textAlign: 'center',
              marginTop: '1rem',
              padding: '0.75rem',
              backgroundColor: COLORS.dark,
              borderRadius: '0.5rem',
              color: COLORS.cyan,
              textDecoration: 'none',
              fontSize: '0.875rem',
              border: `1px solid ${COLORS.border}`
            }}
          >
            View All Bookings
          </Link>
        </div>
      </div>

      {/* CSS for animations */}
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

export default AdminDashboard;
