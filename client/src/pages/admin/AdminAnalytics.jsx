import { useEffect, useState } from 'react';
import { Calendar, DollarSign, Users, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { api } from '../../utils/api';

// Shared colors
const COLORS = {
  cyan: '#36B9EB',
  dark: '#1B1B1B',
  gray: '#919191',
  success: '#10B981',
  warning: '#F59E0B',
  danger: '#EF4444',
};

// Shared styles
const styles = {
  card: {
    backgroundColor: '#111',
    borderRadius: '12px',
    padding: '24px',
    border: '1px solid #333',
  },
  cardTitle: {
    color: '#fff',
    fontSize: '18px',
    fontWeight: '600',
    marginBottom: '16px',
  },
  statValue: {
    color: '#fff',
    fontSize: '28px',
    fontWeight: '700',
  },
  statLabel: {
    color: COLORS.gray,
    fontSize: '14px',
  },
  barContainer: {
    backgroundColor: '#222',
    borderRadius: '4px',
    height: '24px',
    overflow: 'hidden',
  },
  bar: {
    height: '100%',
    borderRadius: '4px',
    transition: 'width 0.5s ease',
  },
};

function AdminAnalytics() {
  const [loading, setLoading] = useState(true);
  const [overview, setOverview] = useState(null);
  const [popularServices, setPopularServices] = useState(null);
  const [peakHours, setPeakHours] = useState(null);
  const [customerRetention, setCustomerRetention] = useState(null);
  const [revenueTrends, setRevenueTrends] = useState(null);
  const [conversion, setConversion] = useState(null);

  // Date range state
  const [startDate, setStartDate] = useState(() => {
    const date = new Date();
    date.setDate(date.getDate() - 30);
    return date.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0]);

  useEffect(() => {
    fetchAnalytics();
  }, [startDate, endDate]);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const params = `?startDate=${startDate}&endDate=${endDate}`;
      const [
        overviewData,
        servicesData,
        peakData,
        retentionData,
        trendsData,
        conversionData
      ] = await Promise.all([
        api.get(`/admin/analytics/overview${params}`).catch(() => null),
        api.get(`/admin/analytics/popular-services${params}`).catch(() => null),
        api.get(`/admin/analytics/peak-hours${params}`).catch(() => null),
        api.get(`/admin/analytics/customer-retention${params}`).catch(() => null),
        api.get(`/admin/analytics/revenue-trends${params}&groupBy=week`).catch(() => null),
        api.get(`/admin/analytics/conversion${params}`).catch(() => null),
      ]);

      setOverview(overviewData);
      setPopularServices(servicesData);
      setPeakHours(peakData);
      setCustomerRetention(retentionData);
      setRevenueTrends(trendsData);
      setConversion(conversionData);
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '400px' }}>
        <div style={{
          width: '48px',
          height: '48px',
          border: `3px solid ${COLORS.cyan}`,
          borderTopColor: 'transparent',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite',
        }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <div>
      {/* Header with Date Range */}
      <div style={{ marginBottom: '32px', display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: '700', color: '#fff', marginBottom: '4px' }}>Analytics Dashboard</h1>
          <p style={{ color: COLORS.gray }}>Track your business performance and insights</p>
        </div>
        <DateRangePicker
          startDate={startDate}
          endDate={endDate}
          onStartChange={setStartDate}
          onEndChange={setEndDate}
        />
      </div>

      {/* Stats Cards Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        <StatCard
          title="Total Bookings"
          value={overview?.totalBookings || 0}
          icon={Calendar}
          color={COLORS.cyan}
        />
        <StatCard
          title="Total Revenue"
          value={`$${(overview?.totalRevenue || 0).toLocaleString()}`}
          icon={DollarSign}
          color={COLORS.success}
        />
        <StatCard
          title="Avg Ticket"
          value={`$${(overview?.avgTicket || 0).toFixed(0)}`}
          icon={TrendingUp}
          color={COLORS.warning}
        />
        <StatCard
          title="Retention Rate"
          value={`${overview?.retentionRate || 0}%`}
          icon={Users}
          color={COLORS.cyan}
        />
      </div>

      {/* Charts Row 1: Popular Services & Revenue Trends */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '24px', marginBottom: '24px' }}>
        <PopularServicesChart data={popularServices} />
        <RevenueTrendsChart data={revenueTrends} />
      </div>

      {/* Charts Row 2: Peak Hours Heatmap & Customer Breakdown */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '24px', marginBottom: '24px' }}>
        <PeakHoursHeatmap data={peakHours} />
        <CustomerBreakdownChart data={customerRetention} conversion={conversion} />
      </div>
    </div>
  );
}

// Date Range Picker Component
function DateRangePicker({ startDate, endDate, onStartChange, onEndChange }) {
  const inputStyle = {
    backgroundColor: '#222',
    border: '1px solid #444',
    borderRadius: '8px',
    padding: '8px 12px',
    color: '#fff',
    fontSize: '14px',
    outline: 'none',
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
      <span style={{ color: COLORS.gray, fontSize: '14px' }}>From:</span>
      <input
        type="date"
        value={startDate}
        onChange={(e) => onStartChange(e.target.value)}
        style={inputStyle}
      />
      <span style={{ color: COLORS.gray, fontSize: '14px' }}>To:</span>
      <input
        type="date"
        value={endDate}
        onChange={(e) => onEndChange(e.target.value)}
        style={inputStyle}
      />
    </div>
  );
}

// Stat Card Component
function StatCard({ title, value, icon: Icon, color }) {
  return (
    <div style={styles.card}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <p style={styles.statLabel}>{title}</p>
          <p style={{ ...styles.statValue, color }}>{value}</p>
        </div>
        <div style={{
          backgroundColor: `${color}20`,
          padding: '12px',
          borderRadius: '8px',
        }}>
          <Icon style={{ width: '24px', height: '24px', color }} />
        </div>
      </div>
    </div>
  );
}

// Popular Services Bar Chart
function PopularServicesChart({ data }) {
  const services = data?.services || [];

  return (
    <div style={styles.card}>
      <h3 style={styles.cardTitle}>Popular Services</h3>
      {services.length === 0 ? (
        <p style={{ color: COLORS.gray, textAlign: 'center', padding: '40px 0' }}>No data available</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {services.map((service, index) => (
            <div key={index}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                <span style={{ color: '#fff', fontSize: '14px' }}>{service.serviceName}</span>
                <span style={{ color: COLORS.gray, fontSize: '12px' }}>
                  {service.bookingCount} bookings - ${service.revenue.toLocaleString()}
                </span>
              </div>
              <div style={styles.barContainer}>
                <div style={{
                  ...styles.bar,
                  width: `${service.percentage}%`,
                  backgroundColor: COLORS.cyan,
                }} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Revenue Trends Chart (Table with arrows)
function RevenueTrendsChart({ data }) {
  const trends = data?.trends || [];

  const formatPeriod = (period) => {
    if (!period) return '';
    if (period.includes('-W')) {
      const [year, week] = period.split('-');
      return `Week ${week.replace('W', '')}`;
    }
    return period;
  };

  const getGrowthIcon = (growth) => {
    if (growth > 0) return <TrendingUp style={{ width: '16px', height: '16px', color: COLORS.success }} />;
    if (growth < 0) return <TrendingDown style={{ width: '16px', height: '16px', color: COLORS.danger }} />;
    return <Minus style={{ width: '16px', height: '16px', color: COLORS.gray }} />;
  };

  const getGrowthColor = (growth) => {
    if (growth > 0) return COLORS.success;
    if (growth < 0) return COLORS.danger;
    return COLORS.gray;
  };

  return (
    <div style={styles.card}>
      <h3 style={styles.cardTitle}>Revenue Trends</h3>
      {trends.length === 0 ? (
        <p style={{ color: COLORS.gray, textAlign: 'center', padding: '40px 0' }}>No data available</p>
      ) : (
        <>
          {/* Summary Row */}
          <div style={{ display: 'flex', gap: '24px', marginBottom: '16px', paddingBottom: '16px', borderBottom: '1px solid #333' }}>
            <div>
              <p style={{ color: COLORS.gray, fontSize: '12px' }}>Total</p>
              <p style={{ color: COLORS.success, fontSize: '20px', fontWeight: '700' }}>${data.totalRevenue?.toLocaleString()}</p>
            </div>
            <div>
              <p style={{ color: COLORS.gray, fontSize: '12px' }}>Avg/Period</p>
              <p style={{ color: '#fff', fontSize: '20px', fontWeight: '700' }}>${data.avgRevenue?.toFixed(0)}</p>
            </div>
          </div>

          {/* Trends Table */}
          <div style={{ maxHeight: '250px', overflowY: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #333' }}>
                  <th style={{ textAlign: 'left', padding: '8px 0', color: COLORS.gray, fontSize: '12px', fontWeight: '500' }}>Period</th>
                  <th style={{ textAlign: 'right', padding: '8px 0', color: COLORS.gray, fontSize: '12px', fontWeight: '500' }}>Revenue</th>
                  <th style={{ textAlign: 'right', padding: '8px 0', color: COLORS.gray, fontSize: '12px', fontWeight: '500' }}>Bookings</th>
                  <th style={{ textAlign: 'right', padding: '8px 0', color: COLORS.gray, fontSize: '12px', fontWeight: '500' }}>Growth</th>
                </tr>
              </thead>
              <tbody>
                {trends.map((trend, index) => (
                  <tr key={index} style={{ borderBottom: '1px solid #222' }}>
                    <td style={{ padding: '10px 0', color: '#fff', fontSize: '14px' }}>{formatPeriod(trend.period)}</td>
                    <td style={{ padding: '10px 0', color: '#fff', fontSize: '14px', textAlign: 'right' }}>${trend.revenue.toLocaleString()}</td>
                    <td style={{ padding: '10px 0', color: COLORS.gray, fontSize: '14px', textAlign: 'right' }}>{trend.bookingCount}</td>
                    <td style={{ padding: '10px 0', textAlign: 'right' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: getGrowthColor(trend.growth) }}>
                        {getGrowthIcon(trend.growth)}
                        {trend.growth !== 0 && `${Math.abs(trend.growth)}%`}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

// Peak Hours Heatmap
function PeakHoursHeatmap({ data }) {
  const heatmap = data?.heatmap || [];
  const hours = data?.hours || [8, 9, 10, 11, 12, 13, 14, 15, 16, 17];

  const formatHour = (hour) => {
    if (hour === 12) return '12p';
    if (hour > 12) return `${hour - 12}p`;
    return `${hour}a`;
  };

  const getIntensityColor = (intensity) => {
    if (intensity === 0) return '#222';
    if (intensity < 25) return `${COLORS.cyan}33`;
    if (intensity < 50) return `${COLORS.cyan}66`;
    if (intensity < 75) return `${COLORS.cyan}99`;
    return COLORS.cyan;
  };

  return (
    <div style={styles.card}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h3 style={{ ...styles.cardTitle, marginBottom: 0 }}>Peak Hours</h3>
        {data?.busiestDay && (
          <span style={{ color: COLORS.gray, fontSize: '12px' }}>
            Busiest: {data.busiestDay} at {data.busiestHour}
          </span>
        )}
      </div>

      {heatmap.length === 0 ? (
        <p style={{ color: COLORS.gray, textAlign: 'center', padding: '40px 0' }}>No data available</p>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          {/* Hour labels */}
          <div style={{ display: 'flex', marginBottom: '4px', marginLeft: '44px' }}>
            {hours.map(hour => (
              <div key={hour} style={{ width: '32px', textAlign: 'center', color: COLORS.gray, fontSize: '11px' }}>
                {formatHour(hour)}
              </div>
            ))}
          </div>

          {/* Heatmap grid */}
          {heatmap.map((row, dayIndex) => (
            <div key={dayIndex} style={{ display: 'flex', alignItems: 'center', marginBottom: '4px' }}>
              <span style={{ width: '40px', color: COLORS.gray, fontSize: '12px' }}>{row.day}</span>
              {row.hours.map((cell, hourIndex) => (
                <div
                  key={hourIndex}
                  style={{
                    width: '28px',
                    height: '28px',
                    margin: '2px',
                    borderRadius: '4px',
                    backgroundColor: getIntensityColor(cell.intensity),
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '10px',
                    color: cell.count > 0 ? '#fff' : 'transparent',
                    cursor: 'default',
                  }}
                  title={`${row.day} ${formatHour(cell.hour)}: ${cell.count} bookings`}
                >
                  {cell.count > 0 ? cell.count : ''}
                </div>
              ))}
            </div>
          ))}

          {/* Legend */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '12px', marginLeft: '44px' }}>
            <span style={{ color: COLORS.gray, fontSize: '11px' }}>Less</span>
            {[0, 25, 50, 75, 100].map((intensity) => (
              <div
                key={intensity}
                style={{
                  width: '16px',
                  height: '16px',
                  borderRadius: '3px',
                  backgroundColor: getIntensityColor(intensity),
                }}
              />
            ))}
            <span style={{ color: COLORS.gray, fontSize: '11px' }}>More</span>
          </div>
        </div>
      )}
    </div>
  );
}

// Customer Breakdown Pie Chart (CSS conic-gradient)
function CustomerBreakdownChart({ data, conversion }) {
  const newCustomers = data?.newCustomers || 0;
  const returningCustomers = data?.returningCustomers || 0;
  const total = newCustomers + returningCustomers;

  const newPercentage = total > 0 ? Math.round((newCustomers / total) * 100) : 0;
  const returningPercentage = total > 0 ? Math.round((returningCustomers / total) * 100) : 0;

  // Pie chart gradient
  const pieGradient = total > 0
    ? `conic-gradient(${COLORS.cyan} 0deg ${newPercentage * 3.6}deg, ${COLORS.success} ${newPercentage * 3.6}deg 360deg)`
    : `conic-gradient(#333 0deg 360deg)`;

  return (
    <div style={styles.card}>
      <h3 style={styles.cardTitle}>Customer Breakdown</h3>

      {total === 0 ? (
        <p style={{ color: COLORS.gray, textAlign: 'center', padding: '40px 0' }}>No data available</p>
      ) : (
        <div style={{ display: 'flex', gap: '32px', alignItems: 'center', flexWrap: 'wrap' }}>
          {/* Pie Chart */}
          <div style={{ position: 'relative', width: '160px', height: '160px' }}>
            <div style={{
              width: '100%',
              height: '100%',
              borderRadius: '50%',
              background: pieGradient,
            }} />
            <div style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              width: '100px',
              height: '100px',
              borderRadius: '50%',
              backgroundColor: '#111',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <span style={{ color: '#fff', fontSize: '24px', fontWeight: '700' }}>{total}</span>
              <span style={{ color: COLORS.gray, fontSize: '12px' }}>Customers</span>
            </div>
          </div>

          {/* Legend & Stats */}
          <div style={{ flex: 1, minWidth: '150px' }}>
            <div style={{ marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <div style={{ width: '12px', height: '12px', borderRadius: '3px', backgroundColor: COLORS.cyan }} />
                <span style={{ color: '#fff', fontSize: '14px' }}>New Customers</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <span style={{ color: COLORS.cyan, fontSize: '24px', fontWeight: '700' }}>{newCustomers}</span>
                <span style={{ color: COLORS.gray, fontSize: '14px' }}>{newPercentage}%</span>
              </div>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <div style={{ width: '12px', height: '12px', borderRadius: '3px', backgroundColor: COLORS.success }} />
                <span style={{ color: '#fff', fontSize: '14px' }}>Returning</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <span style={{ color: COLORS.success, fontSize: '24px', fontWeight: '700' }}>{returningCustomers}</span>
                <span style={{ color: COLORS.gray, fontSize: '14px' }}>{returningPercentage}%</span>
              </div>
            </div>

            {/* Conversion Stats */}
            {conversion && (
              <div style={{ borderTop: '1px solid #333', paddingTop: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ color: COLORS.gray, fontSize: '12px' }}>Conversion Rate</span>
                  <span style={{ color: COLORS.success, fontSize: '14px', fontWeight: '600' }}>{conversion.conversionRate}%</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ color: COLORS.gray, fontSize: '12px' }}>Cancellation Rate</span>
                  <span style={{ color: COLORS.warning, fontSize: '14px', fontWeight: '600' }}>{conversion.cancellationRate}%</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: COLORS.gray, fontSize: '12px' }}>No-Show Rate</span>
                  <span style={{ color: COLORS.danger, fontSize: '14px', fontWeight: '600' }}>{conversion.noShowRate}%</span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminAnalytics;
