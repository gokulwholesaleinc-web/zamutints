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

      -- Seed default admin user if empty (username: test1, password: test1)
      INSERT INTO admin_users (email, password_hash, name, role)
      SELECT 'test1', '$2a$10$V0.1FuEkZtzyK2J2.50UG.Fm/S9BfyH08moO2onfMK0j1nEGFfsue', 'Test Admin', 'super_admin'
      WHERE NOT EXISTS (SELECT 1 FROM admin_users LIMIT 1);

      -- Expenses table for tracking business expenses
      CREATE TABLE IF NOT EXISTS expenses (
        id SERIAL PRIMARY KEY,
        category VARCHAR(100) NOT NULL,
        description TEXT,
        amount DECIMAL(10, 2) NOT NULL,
        date DATE NOT NULL DEFAULT CURRENT_DATE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- Cash drawer table for end of day reconciliation
      CREATE TABLE IF NOT EXISTS cash_drawer (
        id SERIAL PRIMARY KEY,
        date DATE NOT NULL UNIQUE,
        opening_balance DECIMAL(10, 2) NOT NULL DEFAULT 0,
        cash_in DECIMAL(10, 2) NOT NULL DEFAULT 0,
        cash_out DECIMAL(10, 2) NOT NULL DEFAULT 0,
        closing_balance DECIMAL(10, 2) NOT NULL DEFAULT 0,
        notes TEXT,
        reconciled BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- Customer vehicles table
      CREATE TABLE IF NOT EXISTS customer_vehicles (
        id SERIAL PRIMARY KEY,
        customer_id INTEGER REFERENCES customers(id) ON DELETE CASCADE,
        year INTEGER,
        make VARCHAR(100),
        model VARCHAR(100),
        color VARCHAR(50),
        license_plate VARCHAR(20),
        vin VARCHAR(17),
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- Customer notes table (internal CRM notes)
      CREATE TABLE IF NOT EXISTS customer_notes (
        id SERIAL PRIMARY KEY,
        customer_id INTEGER REFERENCES customers(id) ON DELETE CASCADE,
        note TEXT NOT NULL,
        created_by INTEGER REFERENCES admin_users(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- Add vehicle_id to bookings if not exists
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                       WHERE table_name='bookings' AND column_name='vehicle_id') THEN
          ALTER TABLE bookings ADD COLUMN vehicle_id INTEGER REFERENCES customer_vehicles(id);
        END IF;
      END $$;

      -- Add booking tracking columns for daily operations
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                       WHERE table_name='bookings' AND column_name='check_in_time') THEN
          ALTER TABLE bookings ADD COLUMN check_in_time TIMESTAMP;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                       WHERE table_name='bookings' AND column_name='started_at') THEN
          ALTER TABLE bookings ADD COLUMN started_at TIMESTAMP;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                       WHERE table_name='bookings' AND column_name='completed_at') THEN
          ALTER TABLE bookings ADD COLUMN completed_at TIMESTAMP;
        END IF;
      END $$;

      -- Inventory items table
      CREATE TABLE IF NOT EXISTS inventory_items (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        category VARCHAR(100) NOT NULL,
        sku VARCHAR(100) UNIQUE,
        quantity DECIMAL(10, 2) NOT NULL DEFAULT 0,
        unit VARCHAR(50) NOT NULL DEFAULT 'units',
        cost_per_unit DECIMAL(10, 2) NOT NULL DEFAULT 0,
        reorder_level DECIMAL(10, 2) NOT NULL DEFAULT 0,
        supplier VARCHAR(255),
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- Inventory usage table (tracks usage per booking/job)
      CREATE TABLE IF NOT EXISTS inventory_usage (
        id SERIAL PRIMARY KEY,
        item_id INTEGER REFERENCES inventory_items(id) ON DELETE CASCADE,
        booking_id INTEGER REFERENCES bookings(id) ON DELETE SET NULL,
        quantity_used DECIMAL(10, 2) NOT NULL,
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- Seed default inventory items if empty
      INSERT INTO inventory_items (name, category, sku, quantity, unit, cost_per_unit, reorder_level, supplier, notes)
      SELECT * FROM (VALUES
        ('Carbon Film 20"', 'film', 'CF-20', 500.00, 'feet', 1.50, 100.00, 'Film Depot', 'Standard carbon tint film'),
        ('Carbon Film 40"', 'film', 'CF-40', 300.00, 'feet', 2.50, 75.00, 'Film Depot', 'Wide carbon tint film'),
        ('Ceramic Film 20"', 'film', 'CER-20', 400.00, 'feet', 3.00, 100.00, 'Film Depot', 'Premium ceramic tint film'),
        ('Ceramic Film 40"', 'film', 'CER-40', 250.00, 'feet', 5.00, 75.00, 'Film Depot', 'Wide premium ceramic film'),
        ('PPF Clear', 'ppf', 'PPF-CLR', 200.00, 'feet', 8.00, 50.00, 'XPEL Distributor', 'Clear paint protection film'),
        ('PPF Matte', 'ppf', 'PPF-MAT', 100.00, 'feet', 10.00, 25.00, 'XPEL Distributor', 'Matte paint protection film'),
        ('Squeegees', 'tools', 'SQ-001', 25.00, 'units', 5.00, 5.00, 'Amazon', 'Installation squeegees'),
        ('Razor Blades', 'tools', 'RZ-100', 500.00, 'units', 0.10, 100.00, 'Local Hardware', 'Replacement razor blades'),
        ('Heat Gun Tips', 'tools', 'HG-TIP', 10.00, 'units', 8.00, 3.00, 'Amazon', 'Heat gun replacement tips'),
        ('Slip Solution', 'supplies', 'SS-GAL', 5.00, 'gallons', 15.00, 2.00, 'Film Depot', 'Mounting solution'),
        ('Glass Cleaner', 'supplies', 'GC-GAL', 8.00, 'gallons', 12.00, 2.00, 'Local Hardware', 'Professional glass cleaner'),
        ('Microfiber Towels', 'supplies', 'MF-12PK', 50.00, 'packs', 8.00, 10.00, 'Amazon', '12-pack microfiber towels'),
        ('Vinyl Wrap - Black Gloss', 'wrap', 'VW-BG', 150.00, 'feet', 4.00, 30.00, 'Wrap Suppliers', 'Black gloss vinyl'),
        ('Vinyl Wrap - Black Matte', 'wrap', 'VW-BM', 120.00, 'feet', 4.50, 30.00, 'Wrap Suppliers', 'Black matte vinyl'),
        ('Headlight Tint Film', 'film', 'HLT-20', 100.00, 'feet', 3.50, 25.00, 'Film Depot', 'Headlight/taillight tint')
      ) AS v(name, category, sku, quantity, unit, cost_per_unit, reorder_level, supplier, notes)
      WHERE NOT EXISTS (SELECT 1 FROM inventory_items LIMIT 1);

      -- Notification templates table
      CREATE TABLE IF NOT EXISTS notification_templates (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) UNIQUE NOT NULL,
        type VARCHAR(20) NOT NULL DEFAULT 'both', -- 'sms', 'email', 'both'
        subject VARCHAR(255),
        content TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- Notification log table
      CREATE TABLE IF NOT EXISTS notification_log (
        id SERIAL PRIMARY KEY,
        booking_id INTEGER REFERENCES bookings(id) ON DELETE SET NULL,
        customer_id INTEGER REFERENCES customers(id) ON DELETE SET NULL,
        type VARCHAR(20) NOT NULL, -- 'sms' or 'email'
        recipient VARCHAR(255) NOT NULL,
        message TEXT,
        status VARCHAR(50) DEFAULT 'pending',
        sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- Notification settings table
      CREATE TABLE IF NOT EXISTS notification_settings (
        id SERIAL PRIMARY KEY,
        setting_key VARCHAR(100) UNIQUE NOT NULL,
        setting_value VARCHAR(255),
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- Seed default notification templates if empty
      INSERT INTO notification_templates (name, type, subject, content)
      SELECT * FROM (VALUES
        ('appointment_confirmation', 'both', 'Booking Confirmed - {{business_name}}',
          'Hi {{first_name}},

Your appointment has been confirmed!

Service: {{service_name}} - {{variant_name}}
Vehicle: {{vehicle}}
Date: {{appointment_date}}
Time: {{appointment_time}}

Total: {{total_amount}}

Please arrive 10 minutes early. If you need to reschedule, please call us at {{business_phone}}.

Thank you for choosing {{business_name}}!'),
        ('appointment_reminder', 'both', 'Reminder: Your Appointment Tomorrow - {{business_name}}',
          'Hi {{first_name}},

This is a friendly reminder about your appointment tomorrow!

Service: {{service_name}} - {{variant_name}}
Vehicle: {{vehicle}}
Date: {{appointment_date}}
Time: {{appointment_time}}

Please remember to arrive 10 minutes early. If you need to reschedule, call us at {{business_phone}}.

See you soon!
{{business_name}}'),
        ('service_complete', 'both', 'Your Service is Complete! - {{business_name}}',
          'Hi {{first_name}},

Great news! Your {{service_name}} service has been completed.

Vehicle: {{vehicle}}

Your car is ready for pickup. If you have any questions, please call us at {{business_phone}}.

Thank you for choosing {{business_name}}!'),
        ('review_request', 'both', 'How was your experience? - {{business_name}}',
          'Hi {{first_name}},

Thank you for choosing {{business_name}} for your {{service_name}} service!

We hope you love the results. If you have a moment, we would really appreciate if you could leave us a review on Google or Instagram.

Your feedback helps us improve and helps others find quality auto services.

Thank you again!
{{business_name}}
{{business_phone}}')
      ) AS v(name, type, subject, content)
      WHERE NOT EXISTS (SELECT 1 FROM notification_templates LIMIT 1);

      -- Seed default notification settings if empty
      INSERT INTO notification_settings (setting_key, setting_value)
      SELECT * FROM (VALUES
        ('auto_confirmation', 'true'),
        ('auto_reminder', 'true'),
        ('auto_service_complete', 'true'),
        ('auto_review_request', 'true'),
        ('reminder_hours_before', '24')
      ) AS v(setting_key, setting_value)
      WHERE NOT EXISTS (SELECT 1 FROM notification_settings LIMIT 1);
    `);

    console.log('Database tables created/verified');
  } finally {
    client.release();
  }
}

module.exports = { pool, initDatabase };
