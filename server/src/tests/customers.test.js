
const request = require('supertest');
const { app } = require('../index');
const { pool } = require('../db/pool');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret';

describe('Customers CRM API', () => {
  let authToken;
  let testCustomerId;
  let testVehicleId;
  let testNoteId;
  let adminUserId;

  const testCustomer = {
    email: 'crmtest@example.com',
    phone: '555-987-6543',
    first_name: 'CRM',
    last_name: 'TestCustomer',
  };

  beforeAll(async () => {
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Get or create admin user for tests
    const adminResult = await pool.query('SELECT id, role FROM admin_users LIMIT 1');
    if (adminResult.rows.length > 0) {
      adminUserId = adminResult.rows[0].id;
      authToken = jwt.sign(
        { id: adminUserId, role: adminResult.rows[0].role },
        JWT_SECRET,
        { expiresIn: '1h' }
      );
    }

    // Clean up any existing test data
    await pool.query("DELETE FROM customer_notes WHERE customer_id IN (SELECT id FROM customers WHERE email = $1)", [testCustomer.email]);
    await pool.query("DELETE FROM customer_vehicles WHERE customer_id IN (SELECT id FROM customers WHERE email = $1)", [testCustomer.email]);
    await pool.query("DELETE FROM customers WHERE email = $1", [testCustomer.email]);

    // Create test customer
    const customerResult = await pool.query(
      `INSERT INTO customers (email, phone, first_name, last_name)
       VALUES ($1, $2, $3, $4) RETURNING id`,
      [testCustomer.email, testCustomer.phone, testCustomer.first_name, testCustomer.last_name]
    );
    testCustomerId = customerResult.rows[0].id;
  });

  afterAll(async () => {
    // Clean up test data
    await pool.query("DELETE FROM customer_notes WHERE customer_id = $1", [testCustomerId]);
    await pool.query("DELETE FROM customer_vehicles WHERE customer_id = $1", [testCustomerId]);
    await pool.query("DELETE FROM customers WHERE id = $1", [testCustomerId]);
    await pool.end();
  });

  describe('GET /api/admin/customers', () => {
    it('should return list of customers with pagination', async () => {
      const response = await request(app)
        .get('/api/admin/customers')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('customers');
      expect(response.body).toHaveProperty('total');
      expect(response.body).toHaveProperty('page');
      expect(response.body).toHaveProperty('limit');
      expect(Array.isArray(response.body.customers)).toBe(true);
    });

    it('should filter customers by search query', async () => {
      const response = await request(app)
        .get('/api/admin/customers')
        .query({ search: 'crmtest' })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.customers.length).toBeGreaterThan(0);
      const found = response.body.customers.find(c => c.email === testCustomer.email);
      expect(found).toBeDefined();
    });

    it('should reject request without auth token', async () => {
      const response = await request(app)
        .get('/api/admin/customers')
        .expect(401);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('GET /api/admin/customers/search', () => {
    it('should perform quick search by name', async () => {
      const response = await request(app)
        .get('/api/admin/customers/search')
        .query({ q: 'CRM' })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('results');
      expect(Array.isArray(response.body.results)).toBe(true);
    });

    it('should return empty results for short query', async () => {
      const response = await request(app)
        .get('/api/admin/customers/search')
        .query({ q: 'a' })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.results).toEqual([]);
    });
  });

  describe('GET /api/admin/customers/:id', () => {
    it('should return full customer profile', async () => {
      const response = await request(app)
        .get(`/api/admin/customers/${testCustomerId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.email).toBe(testCustomer.email);
      expect(response.body.first_name).toBe(testCustomer.first_name);
      expect(response.body).toHaveProperty('total_bookings');
      expect(response.body).toHaveProperty('total_spent');
    });

    it('should return 404 for non-existent customer', async () => {
      const response = await request(app)
        .get('/api/admin/customers/99999')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('Vehicle Management', () => {
    describe('POST /api/admin/customers/:id/vehicles', () => {
      it('should add a vehicle to customer', async () => {
        const vehicleData = {
          year: 2023,
          make: 'Honda',
          model: 'Accord',
          color: 'Blue',
          licensePlate: 'TEST123',
          vin: '1HGCV1F34PA123456',
          notes: 'Test vehicle',
        };

        const response = await request(app)
          .post(`/api/admin/customers/${testCustomerId}/vehicles`)
          .set('Authorization', `Bearer ${authToken}`)
          .send(vehicleData)
          .expect(201);

        expect(response.body.make).toBe(vehicleData.make);
        expect(response.body.model).toBe(vehicleData.model);
        expect(response.body.license_plate).toBe(vehicleData.licensePlate);
        testVehicleId = response.body.id;
      });

      it('should reject vehicle with missing required fields', async () => {
        const response = await request(app)
          .post(`/api/admin/customers/${testCustomerId}/vehicles`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({ year: 2023 })
          .expect(400);

        expect(response.body).toHaveProperty('errors');
      });

      it('should return 404 for non-existent customer', async () => {
        const response = await request(app)
          .post('/api/admin/customers/99999/vehicles')
          .set('Authorization', `Bearer ${authToken}`)
          .send({ make: 'Test', model: 'Car' })
          .expect(404);

        expect(response.body).toHaveProperty('error');
      });
    });

    describe('GET /api/admin/customers/:id/vehicles', () => {
      it('should return customer vehicles', async () => {
        const response = await request(app)
          .get(`/api/admin/customers/${testCustomerId}/vehicles`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body).toHaveProperty('vehicles');
        expect(Array.isArray(response.body.vehicles)).toBe(true);
        expect(response.body.vehicles.length).toBeGreaterThan(0);
      });
    });

    describe('PUT /api/admin/customers/:id/vehicles/:vehicleId', () => {
      it('should update vehicle', async () => {
        const response = await request(app)
          .put(`/api/admin/customers/${testCustomerId}/vehicles/${testVehicleId}`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({ color: 'Red' })
          .expect(200);

        expect(response.body.color).toBe('Red');
      });
    });

    describe('DELETE /api/admin/customers/:id/vehicles/:vehicleId', () => {
      it('should delete vehicle', async () => {
        // First add a vehicle to delete
        const addResponse = await request(app)
          .post(`/api/admin/customers/${testCustomerId}/vehicles`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({ make: 'Delete', model: 'Me' });

        const deleteId = addResponse.body.id;

        const response = await request(app)
          .delete(`/api/admin/customers/${testCustomerId}/vehicles/${deleteId}`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
      });

      it('should return 404 for non-existent vehicle', async () => {
        const response = await request(app)
          .delete(`/api/admin/customers/${testCustomerId}/vehicles/99999`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(404);

        expect(response.body).toHaveProperty('error');
      });
    });
  });

  describe('Customer Notes', () => {
    describe('POST /api/admin/customers/:id/notes', () => {
      it('should add a note to customer', async () => {
        const response = await request(app)
          .post(`/api/admin/customers/${testCustomerId}/notes`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({ note: 'Test internal note' })
          .expect(201);

        expect(response.body.note).toBe('Test internal note');
        expect(response.body.customer_id).toBe(testCustomerId);
        testNoteId = response.body.id;
      });

      it('should reject empty note', async () => {
        const response = await request(app)
          .post(`/api/admin/customers/${testCustomerId}/notes`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({ note: '' })
          .expect(400);

        expect(response.body).toHaveProperty('errors');
      });

      it('should return 404 for non-existent customer', async () => {
        const response = await request(app)
          .post('/api/admin/customers/99999/notes')
          .set('Authorization', `Bearer ${authToken}`)
          .send({ note: 'Test note' })
          .expect(404);

        expect(response.body).toHaveProperty('error');
      });
    });

    describe('GET /api/admin/customers/:id/notes', () => {
      it('should return customer notes', async () => {
        const response = await request(app)
          .get(`/api/admin/customers/${testCustomerId}/notes`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body).toHaveProperty('notes');
        expect(Array.isArray(response.body.notes)).toBe(true);
        expect(response.body.notes.length).toBeGreaterThan(0);
      });
    });

    describe('DELETE /api/admin/customers/:id/notes/:noteId', () => {
      it('should delete note', async () => {
        // First add a note to delete
        const addResponse = await request(app)
          .post(`/api/admin/customers/${testCustomerId}/notes`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({ note: 'Note to delete' });

        const deleteId = addResponse.body.id;

        const response = await request(app)
          .delete(`/api/admin/customers/${testCustomerId}/notes/${deleteId}`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
      });

      it('should return 404 for non-existent note', async () => {
        const response = await request(app)
          .delete(`/api/admin/customers/${testCustomerId}/notes/99999`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(404);

        expect(response.body).toHaveProperty('error');
      });
    });
  });

  describe('Customer History', () => {
    describe('GET /api/admin/customers/:id/history', () => {
      it('should return customer service history', async () => {
        const response = await request(app)
          .get(`/api/admin/customers/${testCustomerId}/history`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body).toHaveProperty('history');
        expect(Array.isArray(response.body.history)).toBe(true);
      });
    });
  });

  describe('Update Customer', () => {
    describe('PUT /api/admin/customers/:id', () => {
      it('should update customer info', async () => {
        const response = await request(app)
          .put(`/api/admin/customers/${testCustomerId}`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({ firstName: 'Updated', lastName: 'Name' })
          .expect(200);

        expect(response.body.first_name).toBe('Updated');
        expect(response.body.last_name).toBe('Name');
      });

      it('should return 404 for non-existent customer', async () => {
        const response = await request(app)
          .put('/api/admin/customers/99999')
          .set('Authorization', `Bearer ${authToken}`)
          .send({ firstName: 'Test' })
          .expect(404);

        expect(response.body).toHaveProperty('error');
      });
    });
  });
});
