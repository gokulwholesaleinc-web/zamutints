const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function initDatabase() {
  const client = await pool.connect();
  try {
    await client.query(`
      -- Services table
      CREATE TABLE IF NOT EXISTS services (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        category VARCHAR(100) NOT NULL,
        base_price DECIMAL(10, 2) NOT NULL,
        duration_minutes INTEGER NOT NULL DEFAULT 60,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- Service variants (e.g., 2 front windows, all around, etc.)
      CREATE TABLE IF NOT EXISTS service_variants (
        id SERIAL PRIMARY KEY,
        service_id INTEGER REFERENCES services(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        price DECIMAL(10, 2) NOT NULL,
        duration_minutes INTEGER,
        description TEXT
      );

      -- Customers table
      CREATE TABLE IF NOT EXISTS customers (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        phone VARCHAR(20),
        first_name VARCHAR(100),
        last_name VARCHAR(100),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- Bookings table
      CREATE TABLE IF NOT EXISTS bookings (
        id SERIAL PRIMARY KEY,
        customer_id INTEGER REFERENCES customers(id),
        service_variant_id INTEGER REFERENCES service_variants(id),
        vehicle_year INTEGER,
        vehicle_make VARCHAR(100),
        vehicle_model VARCHAR(100),
        appointment_date DATE NOT NULL,
        appointment_time TIME NOT NULL,
        status VARCHAR(50) DEFAULT 'pending',
        notes TEXT,
        deposit_amount DECIMAL(10, 2),
        total_amount DECIMAL(10, 2),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- Payments table
      CREATE TABLE IF NOT EXISTS payments (
        id SERIAL PRIMARY KEY,
        booking_id INTEGER REFERENCES bookings(id),
        stripe_payment_intent_id VARCHAR(255),
        amount DECIMAL(10, 2) NOT NULL,
        status VARCHAR(50) DEFAULT 'pending',
        payment_type VARCHAR(50) DEFAULT 'deposit',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- Admin users table
      CREATE TABLE IF NOT EXISTS admin_users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        name VARCHAR(255),
        role VARCHAR(50) DEFAULT 'admin',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- Business hours table
      CREATE TABLE IF NOT EXISTS business_hours (
        id SERIAL PRIMARY KEY,
        day_of_week INTEGER NOT NULL, -- 0 = Sunday, 6 = Saturday
        open_time TIME,
        close_time TIME,
        is_closed BOOLEAN DEFAULT false
      );

      -- Blocked dates (holidays, time off)
      CREATE TABLE IF NOT EXISTS blocked_dates (
        id SERIAL PRIMARY KEY,
        blocked_date DATE NOT NULL,
        reason VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- Business settings table
      CREATE TABLE IF NOT EXISTS business_settings (
        id SERIAL PRIMARY KEY,
        business_name VARCHAR(255) DEFAULT 'Zamu Tints',
        phone VARCHAR(20) DEFAULT '872-203-1857',
        email VARCHAR(255),
        address_line1 VARCHAR(255),
        address_line2 VARCHAR(255),
        city VARCHAR(100) DEFAULT 'Chicago',
        state VARCHAR(50) DEFAULT 'IL',
        zip VARCHAR(20),
        logo_url VARCHAR(500),
        instagram_url VARCHAR(255) DEFAULT 'https://instagram.com/zamutints',
        tiktok_url VARCHAR(255),
        deposit_amount DECIMAL(10,2) DEFAULT 35.00,
        cancellation_policy TEXT,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- Seed default services if empty
      INSERT INTO services (name, description, category, base_price, duration_minutes)
      SELECT * FROM (VALUES
        ('Carbon Film Tint', 'High-quality carbon window tint with 5-year warranty', 'window_tint', 100.00, 90),
        ('Ceramic Film Tint', 'Premium ceramic window tint with lifetime warranty', 'window_tint', 150.00, 90),
        ('Glass Replacement', 'Professional auto glass replacement', 'glass', 200.00, 120),
        ('Rim Restoration', 'Complete rim refinishing and restoration', 'wheels', 80.00, 60),
        ('Caliper Painting', 'Custom brake caliper painting', 'wheels', 150.00, 90),
        ('Vinyl Wrap', 'Full or partial vehicle vinyl wrap', 'wrap', 500.00, 480),
        ('Chrome Delete', 'Chrome trim blackout', 'wrap', 200.00, 120),
        ('Headlight Tint', 'Headlight or taillight tint', 'lighting', 60.00, 45),
        ('Taillight Tint', 'Taillight smoke or tint', 'lighting', 60.00, 45)
      ) AS v(name, description, category, base_price, duration_minutes)
      WHERE NOT EXISTS (SELECT 1 FROM services LIMIT 1);

      -- Seed service variants if empty (pricing from zamutints.com)
      INSERT INTO service_variants (service_id, name, price, duration_minutes, description)
      SELECT sv.* FROM (
        SELECT s.id, v.name, v.price, v.duration, v.descr FROM services s
        CROSS JOIN (VALUES
          ('Carbon Film Tint', 'Two Front Windows', 100.00, 45, 'Driver and passenger front windows'),
          ('Carbon Film Tint', 'All Around', 240.00, 90, 'All windows including rear'),
          ('Carbon Film Tint', 'Windshield (Sedan)', 140.00, 60, 'Windshield tint for sedans'),
          ('Carbon Film Tint', 'Windshield (SUV/Pickup)', 150.00, 60, 'Windshield tint for SUVs and pickups'),
          ('Ceramic Film Tint', 'Two Front Windows', 150.00, 45, 'Driver and passenger front windows'),
          ('Ceramic Film Tint', 'All Around', 340.00, 90, 'All windows including rear'),
          ('Ceramic Film Tint', 'Windshield (Sedan)', 200.00, 60, 'Windshield tint for sedans'),
          ('Ceramic Film Tint', 'Windshield (SUV/Pickup)', 220.00, 60, 'Windshield tint for SUVs and pickups')
        ) AS v(service_name, name, price, duration, descr)
        WHERE s.name = v.service_name
      ) AS sv(service_id, name, price, duration_minutes, description)
      WHERE NOT EXISTS (SELECT 1 FROM service_variants LIMIT 1);

      -- Seed business hours if empty
      INSERT INTO business_hours (day_of_week, open_time, close_time, is_closed)
      SELECT * FROM (VALUES
        (0, NULL::TIME, NULL::TIME, true),
        (1, '09:00'::TIME, '17:00'::TIME, false),
        (2, '09:00'::TIME, '17:00'::TIME, false),
        (3, '09:00'::TIME, '17:00'::TIME, false),
        (4, '09:00'::TIME, '17:00'::TIME, false),
        (5, '09:00'::TIME, '17:00'::TIME, false),
        (6, '09:00'::TIME, '17:00'::TIME, false)
      ) AS v(day_of_week, open_time, close_time, is_closed)
      WHERE NOT EXISTS (SELECT 1 FROM business_hours LIMIT 1);

      -- Seed default business settings if empty
      INSERT INTO business_settings (business_name, phone, city, state, instagram_url, deposit_amount)
      SELECT 'Zamu Tints', '872-203-1857', 'Chicago', 'IL', 'https://instagram.com/zamutints', 35.00
      WHERE NOT EXISTS (SELECT 1 FROM business_settings LIMIT 1);
    `);

    console.log('Database tables created/verified');
  } finally {
    client.release();
  }
}

module.exports = { pool, initDatabase };
