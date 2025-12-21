import { useEffect, useState } from 'react';
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Receipt,
  CreditCard,
  PiggyBank,
  Calendar,
  Plus,
  Trash2,
  Check,
  BarChart3
} from 'lucide-react';
import { api } from '../../utils/api';

// Shared styles
const styles = {
  colors: {
    cyan: '#36B9EB',
    dark: '#1B1B1B',
    gray: '#919191'
  },
  card: {
    backgroundColor: '#1B1B1B',
    border: '1px solid #333',
    borderRadius: '8px',
    padding: '20px'
  },
  input: {
    backgroundColor: '#2a2a2a',
    border: '1px solid #444',
    borderRadius: '6px',
    padding: '10px 14px',
    color: '#fff',
    width: '100%',
    fontSize: '14px'
  },
  button: {
    primary: {
      backgroundColor: '#36B9EB',
      color: '#1B1B1B',
      border: 'none',
      borderRadius: '6px',
      padding: '10px 20px',
      fontWeight: '600',
      cursor: 'pointer'
    },
    secondary: {
      backgroundColor: 'transparent',
      color: '#919191',
      border: '1px solid #444',
      borderRadius: '6px',
      padding: '10px 20px',
      cursor: 'pointer'
    }
  },
  tab: {
    active: {
      backgroundColor: '#36B9EB',
      color: '#1B1B1B',
      border: 'none',
      borderRadius: '6px',
      padding: '10px 20px',
      fontWeight: '600',
      cursor: 'pointer'
    },
    inactive: {
      backgroundColor: 'transparent',
      color: '#919191',
      border: '1px solid #444',
      borderRadius: '6px',
      padding: '10px 20px',
      cursor: 'pointer'
    }
  }
};

// Date helper
const formatDate = (date) => new Date(date).toLocaleDateString();
const formatCurrency = (amount) => `$${parseFloat(amount || 0).toFixed(2)}`;

// Date range presets
const getDateRange = (preset) => {
  const today = new Date();
  const endDate = today.toISOString().split('T')[0];
  let startDate;

  switch (preset) {
    case 'today':
      startDate = endDate;
      break;
    case 'week':
      startDate = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      break;
    case 'month':
      startDate = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
      break;
    case 'quarter':
      startDate = new Date(today.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      break;
    case 'year':
      startDate = new Date(today.getFullYear(), 0, 1).toISOString().split('T')[0];
      break;
    default:
      startDate = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  }

  return { startDate, endDate };
};

// Tab Components
function RevenueTab() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState(getDateRange('month'));
  const [groupBy, setGroupBy] = useState('day');

  useEffect(() => {
    fetchRevenue();
  }, [dateRange, groupBy]);

  const fetchRevenue = async () => {
    setLoading(true);
    try {
      const result = await api.get(
        `/admin/finance/revenue?startDate=${dateRange.startDate}&endDate=${dateRange.endDate}&groupBy=${groupBy}`
      );
      setData(result);
    } catch (error) {
      console.error('Failed to fetch revenue:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div style={{ color: styles.colors.gray, padding: '40px', textAlign: 'center' }}>Loading revenue data...</div>;
  }

  const maxRevenue = Math.max(...(data?.data || []).map(d => d.totalRevenue), 1);

  return (
    <div>
      {/* Date Range Filters */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', flexWrap: 'wrap' }}>
        {['today', 'week', 'month', 'quarter', 'year'].map((preset) => (
          <button
            key={preset}
            onClick={() => setDateRange(getDateRange(preset))}
            style={styles.button.secondary}
          >
            {preset.charAt(0).toUpperCase() + preset.slice(1)}
          </button>
        ))}
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginLeft: 'auto' }}>
          <input
            type="date"
            value={dateRange.startDate}
            onChange={(e) => setDateRange(prev => ({ ...prev, startDate: e.target.value }))}
            style={{ ...styles.input, width: 'auto' }}
          />
          <span style={{ color: styles.colors.gray }}>to</span>
          <input
            type="date"
            value={dateRange.endDate}
            onChange={(e) => setDateRange(prev => ({ ...prev, endDate: e.target.value }))}
            style={{ ...styles.input, width: 'auto' }}
          />
        </div>
      </div>

      {/* Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        <div style={{ ...styles.card, borderLeft: `4px solid ${styles.colors.cyan}` }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <p style={{ color: styles.colors.gray, fontSize: '14px', marginBottom: '4px' }}>Total Revenue</p>
              <p style={{ color: '#fff', fontSize: '24px', fontWeight: 'bold' }}>
                {formatCurrency(data?.summary?.totalRevenue)}
              </p>
            </div>
            <DollarSign style={{ color: styles.colors.cyan, width: '32px', height: '32px' }} />
          </div>
        </div>

        <div style={{ ...styles.card, borderLeft: '4px solid #22c55e' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <p style={{ color: styles.colors.gray, fontSize: '14px', marginBottom: '4px' }}>Transactions</p>
              <p style={{ color: '#fff', fontSize: '24px', fontWeight: 'bold' }}>
                {data?.summary?.totalTransactions || 0}
              </p>
            </div>
            <CreditCard style={{ color: '#22c55e', width: '32px', height: '32px' }} />
          </div>
        </div>

        <div style={{ ...styles.card, borderLeft: '4px solid #f59e0b' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <p style={{ color: styles.colors.gray, fontSize: '14px', marginBottom: '4px' }}>Avg per Transaction</p>
              <p style={{ color: '#fff', fontSize: '24px', fontWeight: 'bold' }}>
                {formatCurrency((data?.summary?.totalRevenue || 0) / Math.max(data?.summary?.totalTransactions || 1, 1))}
              </p>
            </div>
            <TrendingUp style={{ color: '#f59e0b', width: '32px', height: '32px' }} />
          </div>
        </div>
      </div>

      {/* Group By Toggle */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '16px' }}>
        {['day', 'week', 'month'].map((g) => (
          <button
            key={g}
            onClick={() => setGroupBy(g)}
            style={groupBy === g ? styles.tab.active : styles.tab.inactive}
          >
            By {g.charAt(0).toUpperCase() + g.slice(1)}
          </button>
        ))}
      </div>

      {/* Revenue Chart (Simple bar chart) */}
      <div style={styles.card}>
        <h3 style={{ color: '#fff', marginBottom: '16px' }}>Revenue Over Time</h3>
        {data?.data?.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {data.data.map((item, index) => (
              <div key={index} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ color: styles.colors.gray, minWidth: '100px', fontSize: '12px' }}>
                  {formatDate(item.period)}
                </span>
                <div style={{ flex: 1, height: '24px', backgroundColor: '#2a2a2a', borderRadius: '4px', overflow: 'hidden' }}>
                  <div
                    style={{
                      width: `${(item.totalRevenue / maxRevenue) * 100}%`,
                      height: '100%',
                      backgroundColor: styles.colors.cyan,
                      borderRadius: '4px',
                      transition: 'width 0.3s ease'
                    }}
                  />
                </div>
                <span style={{ color: '#fff', minWidth: '80px', textAlign: 'right', fontWeight: '600' }}>
                  {formatCurrency(item.totalRevenue)}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p style={{ color: styles.colors.gray, textAlign: 'center', padding: '40px' }}>No revenue data for this period</p>
        )}
      </div>
    </div>
  );
}

function ExpensesTab() {
  const [expenses, setExpenses] = useState([]);
  const [byCategory, setByCategory] = useState([]);
  const [grandTotal, setGrandTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState(getDateRange('month'));
  const [showForm, setShowForm] = useState(false);
  const [newExpense, setNewExpense] = useState({ category: '', amount: '', description: '', date: '' });

  const expenseCategories = [
    'Supplies', 'Rent', 'Utilities', 'Payroll', 'Marketing',
    'Equipment', 'Insurance', 'Maintenance', 'Other'
  ];

  useEffect(() => {
    fetchExpenses();
  }, [dateRange]);

  const fetchExpenses = async () => {
    setLoading(true);
    try {
      const result = await api.get(
        `/admin/finance/expenses?startDate=${dateRange.startDate}&endDate=${dateRange.endDate}`
      );
      setExpenses(result.expenses || []);
      setByCategory(result.byCategory || []);
      setGrandTotal(result.grandTotal || 0);
    } catch (error) {
      console.error('Failed to fetch expenses:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddExpense = async (e) => {
    e.preventDefault();
    try {
      await api.post('/admin/finance/expenses', {
        ...newExpense,
        amount: parseFloat(newExpense.amount),
        date: newExpense.date || new Date().toISOString().split('T')[0]
      });
      setNewExpense({ category: '', amount: '', description: '', date: '' });
      setShowForm(false);
      fetchExpenses();
    } catch (error) {
      console.error('Failed to add expense:', error);
    }
  };

  const handleDeleteExpense = async (id) => {
    if (!window.confirm('Delete this expense?')) return;
    try {
      await api.delete(`/admin/finance/expenses/${id}`);
      fetchExpenses();
    } catch (error) {
      console.error('Failed to delete expense:', error);
    }
  };

  if (loading) {
    return <div style={{ color: styles.colors.gray, padding: '40px', textAlign: 'center' }}>Loading expenses...</div>;
  }

  return (
    <div>
      {/* Header with Add Button */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div style={{ display: 'flex', gap: '10px' }}>
          {['week', 'month', 'quarter'].map((preset) => (
            <button
              key={preset}
              onClick={() => setDateRange(getDateRange(preset))}
              style={styles.button.secondary}
            >
              {preset.charAt(0).toUpperCase() + preset.slice(1)}
            </button>
          ))}
        </div>
        <button onClick={() => setShowForm(!showForm)} style={styles.button.primary}>
          <Plus style={{ display: 'inline', width: '16px', height: '16px', marginRight: '6px', verticalAlign: 'middle' }} />
          Add Expense
        </button>
      </div>

      {/* Add Expense Form */}
      {showForm && (
        <form onSubmit={handleAddExpense} style={{ ...styles.card, marginBottom: '20px' }}>
          <h3 style={{ color: '#fff', marginBottom: '16px' }}>New Expense</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
            <div>
              <label style={{ color: styles.colors.gray, display: 'block', marginBottom: '6px', fontSize: '14px' }}>Category</label>
              <select
                value={newExpense.category}
                onChange={(e) => setNewExpense(prev => ({ ...prev, category: e.target.value }))}
                style={styles.input}
                required
              >
                <option value="">Select category</option>
                {expenseCategories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={{ color: styles.colors.gray, display: 'block', marginBottom: '6px', fontSize: '14px' }}>Amount</label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                value={newExpense.amount}
                onChange={(e) => setNewExpense(prev => ({ ...prev, amount: e.target.value }))}
                style={styles.input}
                placeholder="0.00"
                required
              />
            </div>
            <div>
              <label style={{ color: styles.colors.gray, display: 'block', marginBottom: '6px', fontSize: '14px' }}>Date</label>
              <input
                type="date"
                value={newExpense.date}
                onChange={(e) => setNewExpense(prev => ({ ...prev, date: e.target.value }))}
                style={styles.input}
              />
            </div>
            <div>
              <label style={{ color: styles.colors.gray, display: 'block', marginBottom: '6px', fontSize: '14px' }}>Description</label>
              <input
                type="text"
                value={newExpense.description}
                onChange={(e) => setNewExpense(prev => ({ ...prev, description: e.target.value }))}
                style={styles.input}
                placeholder="Optional description"
              />
            </div>
          </div>
          <div style={{ marginTop: '16px', display: 'flex', gap: '10px' }}>
            <button type="submit" style={styles.button.primary}>Save Expense</button>
            <button type="button" onClick={() => setShowForm(false)} style={styles.button.secondary}>Cancel</button>
          </div>
        </form>
      )}

      {/* Summary by Category */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        <div style={{ ...styles.card, borderLeft: '4px solid #ef4444' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <p style={{ color: styles.colors.gray, fontSize: '14px', marginBottom: '4px' }}>Total Expenses</p>
              <p style={{ color: '#fff', fontSize: '24px', fontWeight: 'bold' }}>{formatCurrency(grandTotal)}</p>
            </div>
            <TrendingDown style={{ color: '#ef4444', width: '32px', height: '32px' }} />
          </div>
        </div>

        <div style={styles.card}>
          <h4 style={{ color: '#fff', marginBottom: '12px' }}>By Category</h4>
          {byCategory.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {byCategory.map((cat, index) => (
                <div key={index} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: styles.colors.gray }}>{cat.category}</span>
                  <span style={{ color: '#fff', fontWeight: '600' }}>{formatCurrency(cat.total)}</span>
                </div>
              ))}
            </div>
          ) : (
            <p style={{ color: styles.colors.gray }}>No expenses recorded</p>
          )}
        </div>
      </div>

      {/* Expenses List */}
      <div style={styles.card}>
        <h3 style={{ color: '#fff', marginBottom: '16px' }}>Recent Expenses</h3>
        {expenses.length > 0 ? (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #444' }}>
                  <th style={{ color: styles.colors.gray, textAlign: 'left', padding: '12px 8px', fontSize: '12px' }}>Date</th>
                  <th style={{ color: styles.colors.gray, textAlign: 'left', padding: '12px 8px', fontSize: '12px' }}>Category</th>
                  <th style={{ color: styles.colors.gray, textAlign: 'left', padding: '12px 8px', fontSize: '12px' }}>Description</th>
                  <th style={{ color: styles.colors.gray, textAlign: 'right', padding: '12px 8px', fontSize: '12px' }}>Amount</th>
                  <th style={{ color: styles.colors.gray, textAlign: 'center', padding: '12px 8px', fontSize: '12px' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {expenses.map((expense) => (
                  <tr key={expense.id} style={{ borderBottom: '1px solid #333' }}>
                    <td style={{ color: '#fff', padding: '12px 8px', fontSize: '14px' }}>{formatDate(expense.date)}</td>
                    <td style={{ padding: '12px 8px' }}>
                      <span style={{ backgroundColor: '#2a2a2a', color: styles.colors.cyan, padding: '4px 10px', borderRadius: '4px', fontSize: '12px' }}>
                        {expense.category}
                      </span>
                    </td>
                    <td style={{ color: styles.colors.gray, padding: '12px 8px', fontSize: '14px' }}>{expense.description || '-'}</td>
                    <td style={{ color: '#ef4444', padding: '12px 8px', fontSize: '14px', textAlign: 'right', fontWeight: '600' }}>
                      -{formatCurrency(expense.amount)}
                    </td>
                    <td style={{ padding: '12px 8px', textAlign: 'center' }}>
                      <button
                        onClick={() => handleDeleteExpense(expense.id)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}
                      >
                        <Trash2 style={{ color: '#ef4444', width: '16px', height: '16px' }} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p style={{ color: styles.colors.gray, textAlign: 'center', padding: '40px' }}>No expenses for this period</p>
        )}
      </div>
    </div>
  );
}

function CashDrawerTab() {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [drawer, setDrawer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    openingBalance: '',
    cashIn: '',
    cashOut: '',
    closingBalance: '',
    notes: '',
    reconciled: false
  });

  useEffect(() => {
    fetchDrawer();
  }, [selectedDate]);

  const fetchDrawer = async () => {
    setLoading(true);
    try {
      const result = await api.get(`/admin/finance/cash-drawer/${selectedDate}`);
      setDrawer(result);
      setFormData({
        openingBalance: result.opening_balance?.toString() || '',
        cashIn: result.cash_in?.toString() || '',
        cashOut: result.cash_out?.toString() || '',
        closingBalance: result.closing_balance?.toString() || '',
        notes: result.notes || '',
        reconciled: result.reconciled || false
      });
    } catch (error) {
      console.error('Failed to fetch drawer:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post('/admin/finance/cash-drawer', {
        date: selectedDate,
        openingBalance: parseFloat(formData.openingBalance) || 0,
        cashIn: parseFloat(formData.cashIn) || 0,
        cashOut: parseFloat(formData.cashOut) || 0,
        closingBalance: parseFloat(formData.closingBalance) || 0,
        notes: formData.notes,
        reconciled: formData.reconciled
      });
      fetchDrawer();
    } catch (error) {
      console.error('Failed to save drawer:', error);
    } finally {
      setSaving(false);
    }
  };

  const calculateExpected = () => {
    const opening = parseFloat(formData.openingBalance) || 0;
    const cashIn = parseFloat(formData.cashIn) || 0;
    const cashOut = parseFloat(formData.cashOut) || 0;
    return opening + cashIn - cashOut;
  };

  const calculateDifference = () => {
    const expected = calculateExpected();
    const actual = parseFloat(formData.closingBalance) || 0;
    return actual - expected;
  };

  if (loading) {
    return <div style={{ color: styles.colors.gray, padding: '40px', textAlign: 'center' }}>Loading cash drawer...</div>;
  }

  return (
    <div>
      {/* Date Selector */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
        <Calendar style={{ color: styles.colors.cyan, width: '24px', height: '24px' }} />
        <input
          type="date"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          style={{ ...styles.input, width: 'auto' }}
        />
        {drawer?.exists && drawer?.reconciled && (
          <span style={{ backgroundColor: '#22c55e20', color: '#22c55e', padding: '6px 12px', borderRadius: '4px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Check style={{ width: '14px', height: '14px' }} /> Reconciled
          </span>
        )}
      </div>

      <form onSubmit={handleSave}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px', marginBottom: '24px' }}>
          {/* Opening Balance */}
          <div style={styles.card}>
            <label style={{ color: styles.colors.gray, display: 'block', marginBottom: '8px', fontSize: '14px' }}>
              Opening Balance
            </label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ color: styles.colors.gray, fontSize: '20px' }}>$</span>
              <input
                type="number"
                step="0.01"
                min="0"
                value={formData.openingBalance}
                onChange={(e) => setFormData(prev => ({ ...prev, openingBalance: e.target.value }))}
                style={{ ...styles.input, fontSize: '24px', fontWeight: 'bold' }}
                placeholder="0.00"
              />
            </div>
          </div>

          {/* Cash In */}
          <div style={{ ...styles.card, borderLeft: '4px solid #22c55e' }}>
            <label style={{ color: styles.colors.gray, display: 'block', marginBottom: '8px', fontSize: '14px' }}>
              Cash In (Deposits + Payments)
            </label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ color: '#22c55e', fontSize: '20px' }}>+$</span>
              <input
                type="number"
                step="0.01"
                min="0"
                value={formData.cashIn}
                onChange={(e) => setFormData(prev => ({ ...prev, cashIn: e.target.value }))}
                style={{ ...styles.input, fontSize: '24px', fontWeight: 'bold' }}
                placeholder="0.00"
              />
            </div>
          </div>

          {/* Cash Out */}
          <div style={{ ...styles.card, borderLeft: '4px solid #ef4444' }}>
            <label style={{ color: styles.colors.gray, display: 'block', marginBottom: '8px', fontSize: '14px' }}>
              Cash Out (Expenses + Deposits)
            </label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ color: '#ef4444', fontSize: '20px' }}>-$</span>
              <input
                type="number"
                step="0.01"
                min="0"
                value={formData.cashOut}
                onChange={(e) => setFormData(prev => ({ ...prev, cashOut: e.target.value }))}
                style={{ ...styles.input, fontSize: '24px', fontWeight: 'bold' }}
                placeholder="0.00"
              />
            </div>
          </div>

          {/* Closing Balance */}
          <div style={{ ...styles.card, borderLeft: `4px solid ${styles.colors.cyan}` }}>
            <label style={{ color: styles.colors.gray, display: 'block', marginBottom: '8px', fontSize: '14px' }}>
              Actual Closing Balance
            </label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ color: styles.colors.cyan, fontSize: '20px' }}>$</span>
              <input
                type="number"
                step="0.01"
                min="0"
                value={formData.closingBalance}
                onChange={(e) => setFormData(prev => ({ ...prev, closingBalance: e.target.value }))}
                style={{ ...styles.input, fontSize: '24px', fontWeight: 'bold' }}
                placeholder="0.00"
              />
            </div>
          </div>
        </div>

        {/* Reconciliation Summary */}
        <div style={{ ...styles.card, marginBottom: '24px' }}>
          <h3 style={{ color: '#fff', marginBottom: '16px' }}>Reconciliation Summary</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
            <div>
              <p style={{ color: styles.colors.gray, fontSize: '14px', marginBottom: '4px' }}>Expected Balance</p>
              <p style={{ color: '#fff', fontSize: '20px', fontWeight: 'bold' }}>{formatCurrency(calculateExpected())}</p>
            </div>
            <div>
              <p style={{ color: styles.colors.gray, fontSize: '14px', marginBottom: '4px' }}>Actual Balance</p>
              <p style={{ color: '#fff', fontSize: '20px', fontWeight: 'bold' }}>{formatCurrency(formData.closingBalance || 0)}</p>
            </div>
            <div>
              <p style={{ color: styles.colors.gray, fontSize: '14px', marginBottom: '4px' }}>Difference</p>
              <p style={{
                fontSize: '20px',
                fontWeight: 'bold',
                color: calculateDifference() === 0 ? '#22c55e' : calculateDifference() > 0 ? '#f59e0b' : '#ef4444'
              }}>
                {calculateDifference() >= 0 ? '+' : ''}{formatCurrency(calculateDifference())}
              </p>
            </div>
          </div>
        </div>

        {/* Notes */}
        <div style={{ ...styles.card, marginBottom: '24px' }}>
          <label style={{ color: styles.colors.gray, display: 'block', marginBottom: '8px', fontSize: '14px' }}>
            Notes (discrepancies, issues, etc.)
          </label>
          <textarea
            value={formData.notes}
            onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
            style={{ ...styles.input, minHeight: '80px', resize: 'vertical' }}
            placeholder="Any notes about today's drawer..."
          />
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
          <button type="submit" style={styles.button.primary} disabled={saving}>
            {saving ? 'Saving...' : 'Save Drawer'}
          </button>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={formData.reconciled}
              onChange={(e) => setFormData(prev => ({ ...prev, reconciled: e.target.checked }))}
              style={{ width: '18px', height: '18px', accentColor: styles.colors.cyan }}
            />
            <span style={{ color: '#fff' }}>Mark as Reconciled</span>
          </label>
        </div>
      </form>
    </div>
  );
}

function ProfitTab() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState(getDateRange('month'));

  useEffect(() => {
    fetchProfit();
  }, [dateRange]);

  const fetchProfit = async () => {
    setLoading(true);
    try {
      const result = await api.get(
        `/admin/finance/profit?startDate=${dateRange.startDate}&endDate=${dateRange.endDate}`
      );
      setData(result);
    } catch (error) {
      console.error('Failed to fetch profit:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div style={{ color: styles.colors.gray, padding: '40px', textAlign: 'center' }}>Loading profit analysis...</div>;
  }

  const summary = data?.summary || {};
  const isProfitable = summary.netProfit >= 0;

  return (
    <div>
      {/* Date Range Filters */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', flexWrap: 'wrap' }}>
        {['week', 'month', 'quarter', 'year'].map((preset) => (
          <button
            key={preset}
            onClick={() => setDateRange(getDateRange(preset))}
            style={styles.button.secondary}
          >
            {preset.charAt(0).toUpperCase() + preset.slice(1)}
          </button>
        ))}
      </div>

      {/* Profit Summary */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        <div style={{ ...styles.card, borderLeft: '4px solid #22c55e' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <p style={{ color: styles.colors.gray, fontSize: '14px', marginBottom: '4px' }}>Total Revenue</p>
              <p style={{ color: '#fff', fontSize: '24px', fontWeight: 'bold' }}>{formatCurrency(summary.totalRevenue)}</p>
            </div>
            <TrendingUp style={{ color: '#22c55e', width: '32px', height: '32px' }} />
          </div>
        </div>

        <div style={{ ...styles.card, borderLeft: '4px solid #ef4444' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <p style={{ color: styles.colors.gray, fontSize: '14px', marginBottom: '4px' }}>Total Expenses</p>
              <p style={{ color: '#fff', fontSize: '24px', fontWeight: 'bold' }}>{formatCurrency(summary.totalExpenses)}</p>
            </div>
            <Receipt style={{ color: '#ef4444', width: '32px', height: '32px' }} />
          </div>
        </div>

        <div style={{ ...styles.card, borderLeft: `4px solid ${isProfitable ? '#22c55e' : '#ef4444'}` }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <p style={{ color: styles.colors.gray, fontSize: '14px', marginBottom: '4px' }}>Net Profit</p>
              <p style={{ color: isProfitable ? '#22c55e' : '#ef4444', fontSize: '24px', fontWeight: 'bold' }}>
                {formatCurrency(summary.netProfit)}
              </p>
            </div>
            <PiggyBank style={{ color: isProfitable ? '#22c55e' : '#ef4444', width: '32px', height: '32px' }} />
          </div>
        </div>

        <div style={{ ...styles.card, borderLeft: `4px solid ${styles.colors.cyan}` }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <p style={{ color: styles.colors.gray, fontSize: '14px', marginBottom: '4px' }}>Profit Margin</p>
              <p style={{ color: '#fff', fontSize: '24px', fontWeight: 'bold' }}>{summary.profitMargin || 0}%</p>
            </div>
            <BarChart3 style={{ color: styles.colors.cyan, width: '32px', height: '32px' }} />
          </div>
        </div>
      </div>

      {/* Revenue by Service */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '16px' }}>
        <div style={styles.card}>
          <h3 style={{ color: '#fff', marginBottom: '16px' }}>Revenue by Service</h3>
          {data?.byService?.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {data.byService.filter(s => s.revenue > 0).map((service, index) => {
                const maxRev = Math.max(...data.byService.map(s => s.revenue), 1);
                return (
                  <div key={index}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <span style={{ color: '#fff', fontSize: '14px' }}>{service.serviceName}</span>
                      <span style={{ color: styles.colors.cyan, fontWeight: '600' }}>{formatCurrency(service.revenue)}</span>
                    </div>
                    <div style={{ height: '8px', backgroundColor: '#2a2a2a', borderRadius: '4px', overflow: 'hidden' }}>
                      <div
                        style={{
                          width: `${(service.revenue / maxRev) * 100}%`,
                          height: '100%',
                          backgroundColor: styles.colors.cyan,
                          borderRadius: '4px'
                        }}
                      />
                    </div>
                    <span style={{ color: styles.colors.gray, fontSize: '12px' }}>{service.bookingCount} bookings</span>
                  </div>
                );
              })}
              {data.byService.filter(s => s.revenue > 0).length === 0 && (
                <p style={{ color: styles.colors.gray, textAlign: 'center', padding: '20px' }}>No revenue data for this period</p>
              )}
            </div>
          ) : (
            <p style={{ color: styles.colors.gray, textAlign: 'center', padding: '40px' }}>No service data available</p>
          )}
        </div>

        <div style={styles.card}>
          <h3 style={{ color: '#fff', marginBottom: '16px' }}>Revenue by Category</h3>
          {data?.byCategory?.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {data.byCategory.filter(c => c.revenue > 0).map((category, index) => {
                const maxRev = Math.max(...data.byCategory.map(c => c.revenue), 1);
                const categoryColors = {
                  window_tint: '#36B9EB',
                  glass: '#22c55e',
                  wheels: '#f59e0b',
                  wrap: '#a855f7',
                  lighting: '#ec4899'
                };
                const color = categoryColors[category.category] || styles.colors.cyan;
                return (
                  <div key={index}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <span style={{ color: '#fff', fontSize: '14px', textTransform: 'capitalize' }}>
                        {category.category.replace('_', ' ')}
                      </span>
                      <span style={{ color, fontWeight: '600' }}>{formatCurrency(category.revenue)}</span>
                    </div>
                    <div style={{ height: '8px', backgroundColor: '#2a2a2a', borderRadius: '4px', overflow: 'hidden' }}>
                      <div
                        style={{
                          width: `${(category.revenue / maxRev) * 100}%`,
                          height: '100%',
                          backgroundColor: color,
                          borderRadius: '4px'
                        }}
                      />
                    </div>
                    <span style={{ color: styles.colors.gray, fontSize: '12px' }}>{category.bookingCount} bookings</span>
                  </div>
                );
              })}
              {data.byCategory.filter(c => c.revenue > 0).length === 0 && (
                <p style={{ color: styles.colors.gray, textAlign: 'center', padding: '20px' }}>No revenue data for this period</p>
              )}
            </div>
          ) : (
            <p style={{ color: styles.colors.gray, textAlign: 'center', padding: '40px' }}>No category data available</p>
          )}
        </div>
      </div>
    </div>
  );
}

// Main Component
function AdminFinance() {
  const [activeTab, setActiveTab] = useState('revenue');

  const tabs = [
    { id: 'revenue', label: 'Revenue Reports', icon: TrendingUp },
    { id: 'expenses', label: 'Expenses', icon: Receipt },
    { id: 'drawer', label: 'Cash Drawer', icon: PiggyBank },
    { id: 'profit', label: 'Profit Analysis', icon: BarChart3 }
  ];

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#0a0a0a', padding: '24px' }}>
      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ color: '#fff', fontSize: '28px', fontWeight: 'bold', marginBottom: '8px' }}>Financial Management</h1>
        <p style={{ color: styles.colors.gray }}>Track revenue, expenses, and profitability</p>
      </div>

      {/* Tab Navigation */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', flexWrap: 'wrap', borderBottom: '1px solid #333', paddingBottom: '16px' }}>
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              ...(activeTab === tab.id ? styles.tab.active : styles.tab.inactive)
            }}
          >
            <tab.icon style={{ width: '18px', height: '18px' }} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'revenue' && <RevenueTab />}
      {activeTab === 'expenses' && <ExpensesTab />}
      {activeTab === 'drawer' && <CashDrawerTab />}
      {activeTab === 'profit' && <ProfitTab />}
    </div>
  );
}

export default AdminFinance;
