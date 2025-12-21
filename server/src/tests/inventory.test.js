
const request = require('supertest');
const { app } = require('../index');
const { pool } = require('../db/pool');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret';

describe('Inventory API', () => {
  let authToken;
  let testItemId;

  beforeAll(async () => {
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Create auth token for testing
    authToken = jwt.sign(
      { id: 1, email: 'test1', role: 'super_admin' },
      JWT_SECRET,
      { expiresIn: '1h' }
    );
  });

  afterAll(async () => {
    // Clean up test data
    await pool.query("DELETE FROM inventory_usage WHERE notes LIKE '%test%'");
    await pool.query("DELETE FROM inventory_items WHERE name LIKE '%Test%'");
    await pool.end();
  });

  describe('GET /api/admin/inventory', () => {
    it('should return all inventory items', async () => {
      const response = await request(app)
        .get('/api/admin/inventory')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      if (response.body.length > 0) {
        const item = response.body[0];
        expect(item).toHaveProperty('id');
        expect(item).toHaveProperty('name');
        expect(item).toHaveProperty('category');
        expect(item).toHaveProperty('quantity');
        expect(item).toHaveProperty('unit');
      }
    });

    it('should filter by category', async () => {
      const response = await request(app)
        .get('/api/admin/inventory')
        .query({ category: 'film' })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      response.body.forEach(item => {
        expect(item.category).toBe('film');
      });
    });

    it('should filter by search term', async () => {
      const response = await request(app)
        .get('/api/admin/inventory')
        .query({ search: 'Carbon' })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      response.body.forEach(item => {
        expect(item.name.toLowerCase()).toContain('carbon');
      });
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .get('/api/admin/inventory')
        .expect(401);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('POST /api/admin/inventory', () => {
    it('should create a new inventory item', async () => {
      const newItem = {
        name: 'Test Film Roll',
        category: 'film',
        sku: 'TEST-001',
        quantity: 100,
        unit: 'feet',
        costPerUnit: 2.50,
        reorderLevel: 25,
        supplier: 'Test Supplier',
        notes: 'Test item for unit testing'
      };

      const response = await request(app)
        .post('/api/admin/inventory')
        .set('Authorization', `Bearer ${authToken}`)
        .send(newItem)
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.name).toBe(newItem.name);
      expect(response.body.category).toBe(newItem.category);
      expect(response.body.sku).toBe(newItem.sku);
      expect(parseFloat(response.body.quantity)).toBe(newItem.quantity);

      testItemId = response.body.id;
    });

    it('should reject duplicate SKU', async () => {
      const duplicateItem = {
        name: 'Test Duplicate',
        category: 'film',
        sku: 'TEST-001',
        quantity: 50,
        unit: 'feet',
        costPerUnit: 3.00,
        reorderLevel: 10
      };

      const response = await request(app)
        .post('/api/admin/inventory')
        .set('Authorization', `Bearer ${authToken}`)
        .send(duplicateItem)
        .expect(400);

      expect(response.body.error).toBe('SKU already exists');
    });

    it('should reject invalid data', async () => {
      const invalidItem = {
        name: '',
        category: 'film',
        quantity: -10,
        unit: 'feet',
        costPerUnit: 2.50,
        reorderLevel: 25
      };

      const response = await request(app)
        .post('/api/admin/inventory')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidItem)
        .expect(400);

      expect(response.body).toHaveProperty('errors');
    });
  });

  describe('PATCH /api/admin/inventory/:id', () => {
    it('should update an inventory item', async () => {
      const updates = {
        quantity: 150,
        costPerUnit: 3.00
      };

      const response = await request(app)
        .patch(`/api/admin/inventory/${testItemId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updates)
        .expect(200);

      expect(parseFloat(response.body.quantity)).toBe(150);
      expect(parseFloat(response.body.cost_per_unit)).toBe(3.00);
    });

    it('should return 404 for non-existent item', async () => {
      const response = await request(app)
        .patch('/api/admin/inventory/99999')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ quantity: 100 })
        .expect(404);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('PATCH /api/admin/inventory/:id/adjust', () => {
    it('should increase quantity', async () => {
      const response = await request(app)
        .patch(`/api/admin/inventory/${testItemId}/adjust`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ adjustment: 10, reason: 'Test stock added' })
        .expect(200);

      expect(parseFloat(response.body.quantity)).toBe(160);
    });

    it('should decrease quantity and log usage', async () => {
      const response = await request(app)
        .patch(`/api/admin/inventory/${testItemId}/adjust`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ adjustment: -5, reason: 'Test manual deduction' })
        .expect(200);

      expect(parseFloat(response.body.quantity)).toBe(155);
    });
  });

  describe('POST /api/admin/inventory/:id/usage', () => {
    it('should log usage and deduct from inventory', async () => {
      const usageData = {
        quantityUsed: 10,
        notes: 'Test usage for job'
      };

      const response = await request(app)
        .post(`/api/admin/inventory/${testItemId}/usage`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(usageData)
        .expect(201);

      expect(response.body).toHaveProperty('usage');
      expect(response.body).toHaveProperty('updatedItem');
      expect(parseFloat(response.body.usage.quantity_used)).toBe(10);
      expect(parseFloat(response.body.updatedItem.quantity)).toBe(145);
    });

    it('should reject usage exceeding available quantity', async () => {
      const usageData = {
        quantityUsed: 1000,
        notes: 'Test excessive usage'
      };

      const response = await request(app)
        .post(`/api/admin/inventory/${testItemId}/usage`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(usageData)
        .expect(400);

      expect(response.body.error).toBe('Insufficient quantity');
    });
  });

  describe('GET /api/admin/inventory/low-stock', () => {
    it('should return low stock items', async () => {
      const response = await request(app)
        .get('/api/admin/inventory/low-stock')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      response.body.forEach(item => {
        expect(parseFloat(item.quantity)).toBeLessThanOrEqual(parseFloat(item.reorder_level));
      });
    });
  });

  describe('GET /api/admin/inventory/usage-report', () => {
    it('should return usage report', async () => {
      const response = await request(app)
        .get('/api/admin/inventory/usage-report')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('summary');
      expect(response.body).toHaveProperty('usageByItem');
      expect(response.body).toHaveProperty('usageByCategory');
      expect(response.body).toHaveProperty('dateRange');
      expect(response.body.summary).toHaveProperty('totalMaterialCost');
      expect(response.body.summary).toHaveProperty('totalJobs');
    });
  });

  describe('GET /api/admin/inventory/:id', () => {
    it('should return item with usage history', async () => {
      const response = await request(app)
        .get(`/api/admin/inventory/${testItemId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('item');
      expect(response.body).toHaveProperty('usageHistory');
      expect(response.body.item.id).toBe(testItemId);
      expect(Array.isArray(response.body.usageHistory)).toBe(true);
    });

    it('should return 404 for non-existent item', async () => {
      const response = await request(app)
        .get('/api/admin/inventory/99999')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('DELETE /api/admin/inventory/:id', () => {
    it('should delete an inventory item', async () => {
      const response = await request(app)
        .delete(`/api/admin/inventory/${testItemId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.deleted.id).toBe(testItemId);
    });

    it('should return 404 for non-existent item', async () => {
      const response = await request(app)
        .delete('/api/admin/inventory/99999')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body).toHaveProperty('error');
    });
  });
});
