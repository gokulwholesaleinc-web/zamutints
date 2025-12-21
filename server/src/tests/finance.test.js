
const request = require('supertest');
const jwt = require('jsonwebtoken');
const { app } = require('../index');
const { pool } = require('../db/pool');

const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret';

describe('Finance API', () => {
  let authToken;
  let testExpenseId;

  beforeAll(async () => {
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Create auth token for testing
    authToken = jwt.sign(
      { id: 1, email: 'test1', role: 'super_admin' },
      JWT_SECRET,
      { expiresIn: '1h' }
    );

    // Clean up any test data
    await pool.query("DELETE FROM expenses WHERE description LIKE 'test-%'");
    await pool.query("DELETE FROM cash_drawer WHERE notes LIKE 'test-%'");
  });

  afterAll(async () => {
    // Clean up test data
    await pool.query("DELETE FROM expenses WHERE description LIKE 'test-%'");
    await pool.query("DELETE FROM cash_drawer WHERE notes LIKE 'test-%'");
  });

  describe('GET /api/admin/finance/revenue', () => {
    it('should require authentication', async () => {
      const response = await request(app)
        .get('/api/admin/finance/revenue')
        .expect(401);

      expect(response.body).toHaveProperty('error');
    });

    it('should return revenue data with authentication', async () => {
      const response = await request(app)
        .get('/api/admin/finance/revenue')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('summary');
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.summary).toHaveProperty('totalRevenue');
      expect(response.body.summary).toHaveProperty('totalTransactions');
    });

    it('should accept date filters', async () => {
      const startDate = '2024-01-01';
      const endDate = '2024-12-31';

      const response = await request(app)
        .get('/api/admin/finance/revenue')
        .query({ startDate, endDate, groupBy: 'month' })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.summary.startDate).toBe(startDate);
      expect(response.body.summary.endDate).toBe(endDate);
    });
  });

  describe('GET /api/admin/finance/deposits', () => {
    it('should return deposit tracking data', async () => {
      const response = await request(app)
        .get('/api/admin/finance/deposits')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('collected');
      expect(response.body).toHaveProperty('pending');
      expect(response.body).toHaveProperty('daily');
      expect(response.body.collected).toHaveProperty('amount');
      expect(response.body.collected).toHaveProperty('count');
      expect(response.body.pending).toHaveProperty('amount');
      expect(response.body.pending).toHaveProperty('count');
    });
  });

  describe('POST /api/admin/finance/expenses', () => {
    it('should create a new expense', async () => {
      const expenseData = {
        category: 'Supplies',
        amount: 50.00,
        description: 'test-expense-001',
        date: new Date().toISOString().split('T')[0]
      };

      const response = await request(app)
        .post('/api/admin/finance/expenses')
        .set('Authorization', `Bearer ${authToken}`)
        .send(expenseData)
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.category).toBe('Supplies');
      expect(response.body.amount).toBe(50.00);
      expect(response.body.description).toBe('test-expense-001');

      testExpenseId = response.body.id;
    });

    it('should reject expense without category', async () => {
      const expenseData = {
        amount: 50.00,
        description: 'test-missing-category'
      };

      const response = await request(app)
        .post('/api/admin/finance/expenses')
        .set('Authorization', `Bearer ${authToken}`)
        .send(expenseData)
        .expect(400);

      expect(response.body).toHaveProperty('errors');
    });

    it('should reject expense with invalid amount', async () => {
      const expenseData = {
        category: 'Supplies',
        amount: -10,
        description: 'test-negative-amount'
      };

      const response = await request(app)
        .post('/api/admin/finance/expenses')
        .set('Authorization', `Bearer ${authToken}`)
        .send(expenseData)
        .expect(400);

      expect(response.body).toHaveProperty('errors');
    });
  });

  describe('GET /api/admin/finance/expenses', () => {
    it('should return expenses list', async () => {
      const response = await request(app)
        .get('/api/admin/finance/expenses')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('expenses');
      expect(response.body).toHaveProperty('byCategory');
      expect(response.body).toHaveProperty('grandTotal');
      expect(Array.isArray(response.body.expenses)).toBe(true);
    });

    it('should filter by category', async () => {
      const response = await request(app)
        .get('/api/admin/finance/expenses')
        .query({ category: 'Supplies' })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('expenses');
      response.body.expenses.forEach(expense => {
        expect(expense.category).toBe('Supplies');
      });
    });
  });

  describe('DELETE /api/admin/finance/expenses/:id', () => {
    it('should delete an expense', async () => {
      // First create an expense to delete
      const createResponse = await request(app)
        .post('/api/admin/finance/expenses')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          category: 'Other',
          amount: 25.00,
          description: 'test-to-delete'
        })
        .expect(201);

      const expenseId = createResponse.body.id;

      const response = await request(app)
        .delete(`/api/admin/finance/expenses/${expenseId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('deleted');
    });

    it('should return 404 for non-existent expense', async () => {
      const response = await request(app)
        .delete('/api/admin/finance/expenses/999999')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('GET /api/admin/finance/profit', () => {
    it('should return profit analysis', async () => {
      const response = await request(app)
        .get('/api/admin/finance/profit')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('byService');
      expect(response.body).toHaveProperty('byCategory');
      expect(response.body).toHaveProperty('summary');
      expect(response.body.summary).toHaveProperty('totalRevenue');
      expect(response.body.summary).toHaveProperty('totalExpenses');
      expect(response.body.summary).toHaveProperty('netProfit');
      expect(response.body.summary).toHaveProperty('profitMargin');
    });
  });

  describe('POST /api/admin/finance/cash-drawer', () => {
    it('should create/update cash drawer entry', async () => {
      const today = new Date().toISOString().split('T')[0];
      const drawerData = {
        date: today,
        openingBalance: 100.00,
        cashIn: 500.00,
        cashOut: 150.00,
        closingBalance: 450.00,
        notes: 'test-drawer-entry',
        reconciled: false
      };

      const response = await request(app)
        .post('/api/admin/finance/cash-drawer')
        .set('Authorization', `Bearer ${authToken}`)
        .send(drawerData)
        .expect(201);

      expect(response.body.opening_balance).toBe(100.00);
      expect(response.body.cash_in).toBe(500.00);
      expect(response.body.cash_out).toBe(150.00);
      expect(response.body.closing_balance).toBe(450.00);
    });

    it('should reject drawer without date', async () => {
      const drawerData = {
        openingBalance: 100.00,
        cashIn: 500.00,
        cashOut: 150.00,
        closingBalance: 450.00
      };

      const response = await request(app)
        .post('/api/admin/finance/cash-drawer')
        .set('Authorization', `Bearer ${authToken}`)
        .send(drawerData)
        .expect(400);

      expect(response.body).toHaveProperty('errors');
    });
  });

  describe('GET /api/admin/finance/cash-drawer/:date', () => {
    it('should return drawer for specific date', async () => {
      const today = new Date().toISOString().split('T')[0];

      // First create a drawer entry
      await request(app)
        .post('/api/admin/finance/cash-drawer')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          date: today,
          openingBalance: 200.00,
          cashIn: 600.00,
          cashOut: 100.00,
          closingBalance: 700.00,
          notes: 'test-get-drawer',
          reconciled: true
        });

      const response = await request(app)
        .get(`/api/admin/finance/cash-drawer/${today}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('date');
      expect(response.body).toHaveProperty('opening_balance');
      expect(response.body).toHaveProperty('cash_in');
      expect(response.body).toHaveProperty('cash_out');
      expect(response.body).toHaveProperty('closing_balance');
      expect(response.body.exists).toBe(true);
    });

    it('should return empty drawer for date without entry', async () => {
      const pastDate = '2020-01-01';

      const response = await request(app)
        .get(`/api/admin/finance/cash-drawer/${pastDate}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.exists).toBe(false);
      expect(response.body.opening_balance).toBe(0);
    });
  });

  describe('GET /api/admin/finance/cash-drawer', () => {
    it('should return drawer history', async () => {
      const response = await request(app)
        .get('/api/admin/finance/cash-drawer')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('drawers');
      expect(Array.isArray(response.body.drawers)).toBe(true);
      expect(response.body).toHaveProperty('startDate');
      expect(response.body).toHaveProperty('endDate');
    });
  });
});
