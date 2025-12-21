import { useEffect, useState } from 'react';
import { Package, Plus, Search, AlertTriangle, Minus, Edit, Trash2, X, BarChart3 } from 'lucide-react';
import AdminLayout from '../../components/AdminLayout';
import { api } from '../../utils/api';

// Color constants
const colors = {
  cyan: '#36B9EB',
  dark: '#1B1B1B',
  darkBg: '#111111',
  darkCard: '#1a1a1a',
  darkBorder: '#2a2a2a',
  gray: '#919191',
  warning: '#F59E0B',
  danger: '#EF4444',
  success: '#22C55E',
  white: '#FFFFFF',
};

// Shared styles
const styles = {
  card: {
    backgroundColor: colors.darkCard,
    borderRadius: '12px',
    border: `1px solid ${colors.darkBorder}`,
    padding: '24px',
  },
  input: {
    width: '100%',
    padding: '10px 12px',
    backgroundColor: colors.dark,
    border: `1px solid ${colors.darkBorder}`,
    borderRadius: '8px',
    color: colors.white,
    fontSize: '14px',
    outline: 'none',
  },
  select: {
    padding: '10px 12px',
    backgroundColor: colors.dark,
    border: `1px solid ${colors.darkBorder}`,
    borderRadius: '8px',
    color: colors.white,
    fontSize: '14px',
    outline: 'none',
    cursor: 'pointer',
  },
  button: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    padding: '10px 16px',
    borderRadius: '8px',
    fontWeight: '500',
    cursor: 'pointer',
    border: 'none',
    transition: 'all 0.2s',
  },
  primaryButton: {
    backgroundColor: colors.cyan,
    color: colors.dark,
  },
  secondaryButton: {
    backgroundColor: colors.darkBorder,
    color: colors.white,
  },
  dangerButton: {
    backgroundColor: colors.danger,
    color: colors.white,
  },
  label: {
    display: 'block',
    marginBottom: '6px',
    color: colors.gray,
    fontSize: '14px',
  },
};

const categories = [
  { value: 'film', label: 'Tint Film' },
  { value: 'ppf', label: 'PPF' },
  { value: 'wrap', label: 'Vinyl Wrap' },
  { value: 'tools', label: 'Tools' },
  { value: 'supplies', label: 'Supplies' },
];

const getCategoryLabel = (category) => {
  const cat = categories.find(c => c.value === category);
  return cat ? cat.label : category;
};

function AdminInventory() {
  const [inventory, setInventory] = useState([]);
  const [lowStockItems, setLowStockItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showUsageModal, setShowUsageModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [selectedItem, setSelectedItem] = useState(null);
  const [activeTab, setActiveTab] = useState('inventory');
  const [usageReport, setUsageReport] = useState(null);

  useEffect(() => {
    fetchInventory();
    fetchLowStock();
  }, []);

  const fetchInventory = async () => {
    try {
      const data = await api.get('/admin/inventory');
      setInventory(data);
    } catch (error) {
      console.error('Failed to fetch inventory:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchLowStock = async () => {
    try {
      const data = await api.get('/admin/inventory/low-stock');
      setLowStockItems(data);
    } catch (error) {
      console.error('Failed to fetch low stock items:', error);
    }
  };

  const fetchUsageReport = async () => {
    try {
      const data = await api.get('/admin/inventory/usage-report');
      setUsageReport(data);
    } catch (error) {
      console.error('Failed to fetch usage report:', error);
    }
  };

  const handleQuickAdjust = async (item, adjustment) => {
    try {
      await api.patch(`/admin/inventory/${item.id}/adjust`, {
        adjustment,
        reason: adjustment > 0 ? 'Stock added' : 'Manual deduction'
      });
      fetchInventory();
      fetchLowStock();
    } catch (error) {
      console.error('Failed to adjust quantity:', error);
      alert(error.message || 'Failed to adjust quantity');
    }
  };

  const handleSaveItem = async (formData) => {
    try {
      if (editingItem) {
        await api.patch(`/admin/inventory/${editingItem.id}`, formData);
      } else {
        await api.post('/admin/inventory', formData);
      }
      setShowModal(false);
      setEditingItem(null);
      fetchInventory();
      fetchLowStock();
    } catch (error) {
      console.error('Failed to save item:', error);
      alert(error.message || 'Failed to save item');
    }
  };

  const handleDeleteItem = async (id) => {
    if (!confirm('Are you sure you want to delete this item?')) return;
    try {
      await api.delete(`/admin/inventory/${id}`);
      fetchInventory();
      fetchLowStock();
    } catch (error) {
      console.error('Failed to delete item:', error);
      alert(error.message || 'Failed to delete item');
    }
  };

  const handleLogUsage = async (itemId, quantityUsed, notes) => {
    try {
      await api.post(`/admin/inventory/${itemId}/usage`, { quantityUsed, notes });
      setShowUsageModal(false);
      setSelectedItem(null);
      fetchInventory();
      fetchLowStock();
    } catch (error) {
      console.error('Failed to log usage:', error);
      alert(error.message || 'Failed to log usage');
    }
  };

  const filteredInventory = inventory.filter(item => {
    const matchesSearch = !search ||
      item.name.toLowerCase().includes(search.toLowerCase()) ||
      item.sku?.toLowerCase().includes(search.toLowerCase()) ||
      item.supplier?.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = !categoryFilter || item.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const getStockStatus = (item) => {
    const quantity = parseFloat(item.quantity);
    const reorderLevel = parseFloat(item.reorder_level);
    if (quantity <= reorderLevel * 0.5) return 'critical';
    if (quantity <= reorderLevel) return 'low';
    return 'ok';
  };

  const getStockStyle = (status) => {
    switch (status) {
      case 'critical':
        return { backgroundColor: `${colors.danger}20`, color: colors.danger };
      case 'low':
        return { backgroundColor: `${colors.warning}20`, color: colors.warning };
      default:
        return { backgroundColor: `${colors.success}20`, color: colors.success };
    }
  };

  if (loading) {
    return (
      <AdminLayout>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '256px' }}>
          <div style={{
            width: '48px',
            height: '48px',
            border: `2px solid ${colors.cyan}`,
            borderTopColor: 'transparent',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite'
          }} />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
          <div>
            <h1 style={{ fontSize: '24px', fontWeight: 'bold', color: colors.white, margin: 0 }}>Inventory</h1>
            <p style={{ color: colors.gray, margin: '4px 0 0 0' }}>Manage film rolls, PPF, and supplies</p>
          </div>
          <button
            onClick={() => { setEditingItem(null); setShowModal(true); }}
            style={{ ...styles.button, ...styles.primaryButton }}
          >
            <Plus size={20} />
            Add Item
          </button>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '24px' }}>
          {[
            { id: 'inventory', label: 'Inventory', icon: Package },
            { id: 'low-stock', label: `Low Stock (${lowStockItems.length})`, icon: AlertTriangle },
            { id: 'usage', label: 'Usage Report', icon: BarChart3 },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id);
                if (tab.id === 'usage' && !usageReport) fetchUsageReport();
              }}
              style={{
                ...styles.button,
                backgroundColor: activeTab === tab.id ? colors.cyan : colors.darkCard,
                color: activeTab === tab.id ? colors.dark : colors.white,
                border: `1px solid ${activeTab === tab.id ? colors.cyan : colors.darkBorder}`,
              }}
            >
              <tab.icon size={18} />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Inventory Tab */}
        {activeTab === 'inventory' && (
          <>
            {/* Search and Filter */}
            <div style={{ display: 'flex', gap: '12px', marginBottom: '24px', flexWrap: 'wrap' }}>
              <div style={{ position: 'relative', flex: 1, minWidth: '200px' }}>
                <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: colors.gray }} />
                <input
                  type="text"
                  placeholder="Search items..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  style={{ ...styles.input, paddingLeft: '40px' }}
                />
              </div>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                style={{ ...styles.select, minWidth: '150px' }}
              >
                <option value="">All Categories</option>
                {categories.map(cat => (
                  <option key={cat.value} value={cat.value}>{cat.label}</option>
                ))}
              </select>
            </div>

            {/* Inventory Table */}
            <div style={{ ...styles.card, padding: 0, overflow: 'hidden' }}>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ backgroundColor: colors.dark }}>
                      {['Item', 'SKU', 'Category', 'Quantity', 'Cost', 'Reorder Level', 'Supplier', 'Actions'].map(header => (
                        <th key={header} style={{ padding: '12px 16px', textAlign: 'left', color: colors.gray, fontWeight: '500', fontSize: '12px', textTransform: 'uppercase' }}>
                          {header}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredInventory.map(item => {
                      const stockStatus = getStockStatus(item);
                      return (
                        <tr key={item.id} style={{ borderBottom: `1px solid ${colors.darkBorder}` }}>
                          <td style={{ padding: '16px' }}>
                            <div style={{ color: colors.white, fontWeight: '500' }}>{item.name}</div>
                            {item.notes && <div style={{ color: colors.gray, fontSize: '12px', marginTop: '4px' }}>{item.notes}</div>}
                          </td>
                          <td style={{ padding: '16px', color: colors.gray, fontFamily: 'monospace' }}>{item.sku || '-'}</td>
                          <td style={{ padding: '16px' }}>
                            <span style={{
                              padding: '4px 8px',
                              borderRadius: '4px',
                              fontSize: '12px',
                              backgroundColor: colors.darkBorder,
                              color: colors.white
                            }}>
                              {getCategoryLabel(item.category)}
                            </span>
                          </td>
                          <td style={{ padding: '16px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <button
                                onClick={() => handleQuickAdjust(item, -1)}
                                style={{ ...styles.button, padding: '4px', backgroundColor: colors.darkBorder }}
                              >
                                <Minus size={14} color={colors.white} />
                              </button>
                              <span style={{
                                padding: '4px 12px',
                                borderRadius: '4px',
                                fontWeight: '600',
                                minWidth: '60px',
                                textAlign: 'center',
                                ...getStockStyle(stockStatus)
                              }}>
                                {parseFloat(item.quantity).toFixed(0)} {item.unit}
                              </span>
                              <button
                                onClick={() => handleQuickAdjust(item, 1)}
                                style={{ ...styles.button, padding: '4px', backgroundColor: colors.darkBorder }}
                              >
                                <Plus size={14} color={colors.white} />
                              </button>
                            </div>
                          </td>
                          <td style={{ padding: '16px', color: colors.white }}>${parseFloat(item.cost_per_unit).toFixed(2)}/{item.unit}</td>
                          <td style={{ padding: '16px', color: stockStatus !== 'ok' ? colors.warning : colors.gray }}>
                            {parseFloat(item.reorder_level).toFixed(0)} {item.unit}
                          </td>
                          <td style={{ padding: '16px', color: colors.gray }}>{item.supplier || '-'}</td>
                          <td style={{ padding: '16px' }}>
                            <div style={{ display: 'flex', gap: '8px' }}>
                              <button
                                onClick={() => { setSelectedItem(item); setShowUsageModal(true); }}
                                title="Log Usage"
                                style={{ ...styles.button, padding: '8px', backgroundColor: 'transparent', border: `1px solid ${colors.darkBorder}` }}
                              >
                                <Package size={16} color={colors.cyan} />
                              </button>
                              <button
                                onClick={() => { setEditingItem(item); setShowModal(true); }}
                                title="Edit"
                                style={{ ...styles.button, padding: '8px', backgroundColor: 'transparent', border: `1px solid ${colors.darkBorder}` }}
                              >
                                <Edit size={16} color={colors.gray} />
                              </button>
                              <button
                                onClick={() => handleDeleteItem(item.id)}
                                title="Delete"
                                style={{ ...styles.button, padding: '8px', backgroundColor: 'transparent', border: `1px solid ${colors.darkBorder}` }}
                              >
                                <Trash2 size={16} color={colors.danger} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {filteredInventory.length === 0 && (
                <div style={{ padding: '48px', textAlign: 'center', color: colors.gray }}>
                  No inventory items found
                </div>
              )}
            </div>
          </>
        )}

        {/* Low Stock Tab */}
        {activeTab === 'low-stock' && (
          <div style={styles.card}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
              <AlertTriangle size={24} color={colors.warning} />
              <h2 style={{ color: colors.white, margin: 0, fontSize: '18px' }}>Low Stock Alerts</h2>
            </div>
            {lowStockItems.length === 0 ? (
              <p style={{ color: colors.gray, textAlign: 'center', padding: '24px' }}>
                All items are well stocked!
              </p>
            ) : (
              <div style={{ display: 'grid', gap: '12px' }}>
                {lowStockItems.map(item => {
                  const stockStatus = getStockStatus(item);
                  const percentage = Math.round((parseFloat(item.quantity) / parseFloat(item.reorder_level)) * 100);
                  return (
                    <div key={item.id} style={{
                      padding: '16px',
                      backgroundColor: colors.dark,
                      borderRadius: '8px',
                      borderLeft: `4px solid ${stockStatus === 'critical' ? colors.danger : colors.warning}`
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                        <div>
                          <h3 style={{ color: colors.white, margin: 0, fontSize: '16px' }}>{item.name}</h3>
                          <p style={{ color: colors.gray, margin: '4px 0 0 0', fontSize: '14px' }}>
                            {item.sku} | {item.supplier || 'No supplier'}
                          </p>
                        </div>
                        <span style={{
                          padding: '4px 12px',
                          borderRadius: '4px',
                          fontSize: '14px',
                          fontWeight: '600',
                          ...getStockStyle(stockStatus)
                        }}>
                          {stockStatus === 'critical' ? 'Critical' : 'Low Stock'}
                        </span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                            <span style={{ color: colors.gray, fontSize: '12px' }}>Current: {parseFloat(item.quantity).toFixed(0)} {item.unit}</span>
                            <span style={{ color: colors.gray, fontSize: '12px' }}>Reorder: {parseFloat(item.reorder_level).toFixed(0)} {item.unit}</span>
                          </div>
                          <div style={{ height: '6px', backgroundColor: colors.darkBorder, borderRadius: '3px', overflow: 'hidden' }}>
                            <div style={{
                              height: '100%',
                              width: `${Math.min(percentage, 100)}%`,
                              backgroundColor: stockStatus === 'critical' ? colors.danger : colors.warning,
                              borderRadius: '3px',
                              transition: 'width 0.3s'
                            }} />
                          </div>
                        </div>
                        <button
                          onClick={() => { setEditingItem(item); setShowModal(true); }}
                          style={{ ...styles.button, ...styles.secondaryButton, padding: '8px 12px', fontSize: '12px' }}
                        >
                          Restock
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Usage Report Tab */}
        {activeTab === 'usage' && (
          <div style={{ display: 'grid', gap: '24px' }}>
            {/* Summary Cards */}
            {usageReport && (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                  <div style={styles.card}>
                    <p style={{ color: colors.gray, margin: '0 0 8px 0', fontSize: '14px' }}>Total Material Cost</p>
                    <p style={{ color: colors.white, margin: 0, fontSize: '28px', fontWeight: 'bold' }}>
                      ${usageReport.summary.totalMaterialCost.toFixed(2)}
                    </p>
                  </div>
                  <div style={styles.card}>
                    <p style={{ color: colors.gray, margin: '0 0 8px 0', fontSize: '14px' }}>Jobs Completed</p>
                    <p style={{ color: colors.white, margin: 0, fontSize: '28px', fontWeight: 'bold' }}>
                      {usageReport.summary.totalJobs}
                    </p>
                  </div>
                  <div style={styles.card}>
                    <p style={{ color: colors.gray, margin: '0 0 8px 0', fontSize: '14px' }}>Items Used</p>
                    <p style={{ color: colors.white, margin: 0, fontSize: '28px', fontWeight: 'bold' }}>
                      {usageReport.summary.itemsUsed}
                    </p>
                  </div>
                </div>

                {/* Usage by Category */}
                <div style={styles.card}>
                  <h3 style={{ color: colors.white, margin: '0 0 16px 0' }}>Usage by Category</h3>
                  <div style={{ display: 'grid', gap: '12px' }}>
                    {usageReport.usageByCategory.map(cat => (
                      <div key={cat.category} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', backgroundColor: colors.dark, borderRadius: '8px' }}>
                        <span style={{ color: colors.white }}>{getCategoryLabel(cat.category)}</span>
                        <div style={{ textAlign: 'right' }}>
                          <span style={{ color: colors.cyan, fontWeight: '600' }}>${cat.total_cost.toFixed(2)}</span>
                          <span style={{ color: colors.gray, marginLeft: '12px', fontSize: '14px' }}>{cat.total_used.toFixed(0)} units</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Top Used Items */}
                <div style={styles.card}>
                  <h3 style={{ color: colors.white, margin: '0 0 16px 0' }}>Top Used Items (Last 30 Days)</h3>
                  <div style={{ display: 'grid', gap: '8px' }}>
                    {usageReport.usageByItem.filter(i => i.total_used > 0).slice(0, 10).map((item, idx) => (
                      <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', backgroundColor: colors.dark, borderRadius: '8px' }}>
                        <span style={{ color: colors.gray, width: '24px' }}>#{idx + 1}</span>
                        <span style={{ color: colors.white, flex: 1 }}>{item.name}</span>
                        <span style={{ color: colors.gray }}>{item.total_used.toFixed(0)} {item.unit}</span>
                        <span style={{ color: colors.cyan, fontWeight: '600', minWidth: '80px', textAlign: 'right' }}>${item.total_cost.toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* Add/Edit Modal */}
        {showModal && (
          <ItemModal
            item={editingItem}
            onSave={handleSaveItem}
            onClose={() => { setShowModal(false); setEditingItem(null); }}
          />
        )}

        {/* Usage Modal */}
        {showUsageModal && selectedItem && (
          <UsageModal
            item={selectedItem}
            onSave={handleLogUsage}
            onClose={() => { setShowUsageModal(false); setSelectedItem(null); }}
          />
        )}
      </div>
    </AdminLayout>
  );
}

function ItemModal({ item, onSave, onClose }) {
  const [formData, setFormData] = useState({
    name: item?.name || '',
    category: item?.category || 'film',
    sku: item?.sku || '',
    quantity: item?.quantity || 0,
    unit: item?.unit || 'feet',
    costPerUnit: item?.cost_per_unit || 0,
    reorderLevel: item?.reorder_level || 0,
    supplier: item?.supplier || '',
    notes: item?.notes || '',
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({
      ...formData,
      quantity: parseFloat(formData.quantity),
      costPerUnit: parseFloat(formData.costPerUnit),
      reorderLevel: parseFloat(formData.reorderLevel),
    });
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      backgroundColor: 'rgba(0,0,0,0.7)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 50,
      padding: '16px',
    }}>
      <div style={{ ...styles.card, width: '100%', maxWidth: '500px', maxHeight: '90vh', overflow: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <h2 style={{ color: colors.white, margin: 0 }}>{item ? 'Edit Item' : 'Add New Item'}</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
            <X size={24} color={colors.gray} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gap: '16px' }}>
            <div>
              <label style={styles.label}>Name *</label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                style={styles.input}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={styles.label}>Category *</label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  style={{ ...styles.select, width: '100%' }}
                >
                  {categories.map(cat => (
                    <option key={cat.value} value={cat.value}>{cat.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={styles.label}>SKU</label>
                <input
                  type="text"
                  value={formData.sku}
                  onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                  style={styles.input}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
              <div>
                <label style={styles.label}>Quantity *</label>
                <input
                  type="number"
                  required
                  min="0"
                  step="0.01"
                  value={formData.quantity}
                  onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                  style={styles.input}
                />
              </div>
              <div>
                <label style={styles.label}>Unit *</label>
                <input
                  type="text"
                  required
                  value={formData.unit}
                  onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                  style={styles.input}
                  placeholder="feet, units, gallons..."
                />
              </div>
              <div>
                <label style={styles.label}>Cost/Unit *</label>
                <input
                  type="number"
                  required
                  min="0"
                  step="0.01"
                  value={formData.costPerUnit}
                  onChange={(e) => setFormData({ ...formData, costPerUnit: e.target.value })}
                  style={styles.input}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={styles.label}>Reorder Level *</label>
                <input
                  type="number"
                  required
                  min="0"
                  step="0.01"
                  value={formData.reorderLevel}
                  onChange={(e) => setFormData({ ...formData, reorderLevel: e.target.value })}
                  style={styles.input}
                />
              </div>
              <div>
                <label style={styles.label}>Supplier</label>
                <input
                  type="text"
                  value={formData.supplier}
                  onChange={(e) => setFormData({ ...formData, supplier: e.target.value })}
                  style={styles.input}
                />
              </div>
            </div>

            <div>
              <label style={styles.label}>Notes</label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                style={{ ...styles.input, minHeight: '80px', resize: 'vertical' }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', gap: '12px', marginTop: '24px', justifyContent: 'flex-end' }}>
            <button type="button" onClick={onClose} style={{ ...styles.button, ...styles.secondaryButton }}>
              Cancel
            </button>
            <button type="submit" style={{ ...styles.button, ...styles.primaryButton }}>
              {item ? 'Update Item' : 'Add Item'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function UsageModal({ item, onSave, onClose }) {
  const [quantityUsed, setQuantityUsed] = useState('');
  const [notes, setNotes] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(item.id, parseFloat(quantityUsed), notes);
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      backgroundColor: 'rgba(0,0,0,0.7)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 50,
      padding: '16px',
    }}>
      <div style={{ ...styles.card, width: '100%', maxWidth: '400px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <h2 style={{ color: colors.white, margin: 0 }}>Log Usage</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
            <X size={24} color={colors.gray} />
          </button>
        </div>

        <div style={{ padding: '16px', backgroundColor: colors.dark, borderRadius: '8px', marginBottom: '24px' }}>
          <p style={{ color: colors.white, margin: 0, fontWeight: '500' }}>{item.name}</p>
          <p style={{ color: colors.gray, margin: '4px 0 0 0', fontSize: '14px' }}>
            Available: {parseFloat(item.quantity).toFixed(0)} {item.unit}
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '16px' }}>
            <label style={styles.label}>Quantity Used *</label>
            <input
              type="number"
              required
              min="0.01"
              max={parseFloat(item.quantity)}
              step="0.01"
              value={quantityUsed}
              onChange={(e) => setQuantityUsed(e.target.value)}
              style={styles.input}
              placeholder={`Max: ${parseFloat(item.quantity).toFixed(0)} ${item.unit}`}
            />
          </div>

          <div style={{ marginBottom: '24px' }}>
            <label style={styles.label}>Notes (optional)</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              style={styles.input}
              placeholder="Job description, vehicle, etc."
            />
          </div>

          <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
            <button type="button" onClick={onClose} style={{ ...styles.button, ...styles.secondaryButton }}>
              Cancel
            </button>
            <button type="submit" style={{ ...styles.button, ...styles.primaryButton }}>
              Log Usage
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default AdminInventory;
