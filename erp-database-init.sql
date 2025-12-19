-- ERP Database Initialization Script for Supabase
-- Execute this script in Supabase SQL Editor

-- 1. TABLES CREATION (The Vault)

-- Companies Table
CREATE TABLE companies (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    company_code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    logo_url TEXT,
    license_expiry DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Sales Table
CREATE TABLE sales (
    id BIGSERIAL PRIMARY KEY,
    date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    client_name VARCHAR(255) NOT NULL,
    car_number VARCHAR(50),
    material_type VARCHAR(50),
    volume DECIMAL(10,2),
    price_per_meter DECIMAL(10,2),
    total_price DECIMAL(12,2),
    company_code VARCHAR(50) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Staff Table
CREATE TABLE staff (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    daily_rate DECIMAL(10,2),
    role VARCHAR(100),
    company_code VARCHAR(50) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Attendance Table
CREATE TABLE attendance (
    id BIGSERIAL PRIMARY KEY,
    staff_id BIGINT NOT NULL,
    date DATE NOT NULL,
    status VARCHAR(50) DEFAULT 'present',
    company_code VARCHAR(50) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Treasury Table
CREATE TABLE treasury (
    id BIGSERIAL PRIMARY KEY,
    transaction_type VARCHAR(50) NOT NULL, -- 'income' or 'expense'
    amount DECIMAL(12,2) NOT NULL,
    description TEXT,
    company_code VARCHAR(50) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. DATA INTEGRITY (Foreign Key Constraints)

ALTER TABLE sales 
ADD CONSTRAINT fk_sales_company 
FOREIGN KEY (company_code) REFERENCES companies(company_code) ON DELETE CASCADE;

ALTER TABLE staff 
ADD CONSTRAINT fk_staff_company 
FOREIGN KEY (company_code) REFERENCES companies(company_code) ON DELETE CASCADE;

ALTER TABLE attendance 
ADD CONSTRAINT fk_attendance_company 
FOREIGN KEY (company_code) REFERENCES companies(company_code) ON DELETE CASCADE,
ADD CONSTRAINT fk_attendance_staff 
FOREIGN KEY (staff_id) REFERENCES staff(id) ON DELETE CASCADE;

ALTER TABLE treasury 
ADD CONSTRAINT fk_treasury_company 
FOREIGN KEY (company_code) REFERENCES companies(company_code) ON DELETE CASCADE;

-- 3. MULTI-TENANT SECURITY (RLS Policies)

-- Enable RLS on all tables
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE treasury ENABLE ROW LEVEL SECURITY;

-- Create user_company_code function to get current user's company
CREATE OR REPLACE FUNCTION get_user_company_code()
RETURNS TEXT AS $$
BEGIN
    -- Check if user is master admin (developer)
    IF current_setting('request.jwt.claims', true)::json->>'email' = 'developer@basira.com' THEN
        RETURN NULL; -- Master admin sees all data
    END IF;
    
    -- Return user's company code from JWT claims
    RETURN current_setting('request.jwt.claims', true)::json->>'company_code';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Companies RLS Policy
CREATE POLICY "company_access_policy" ON companies
FOR ALL USING (
    get_user_company_code() IS NULL OR 
    company_code = get_user_company_code()
);

-- Sales RLS Policy
CREATE POLICY "sales_access_policy" ON sales
FOR ALL USING (
    get_user_company_code() IS NULL OR 
    company_code = get_user_company_code()
);

-- Staff RLS Policy
CREATE POLICY "staff_access_policy" ON staff
FOR ALL USING (
    get_user_company_code() IS NULL OR 
    company_code = get_user_company_code()
);

-- Attendance RLS Policy
CREATE POLICY "attendance_access_policy" ON attendance
FOR ALL USING (
    get_user_company_code() IS NULL OR 
    company_code = get_user_company_code()
);

-- Treasury RLS Policy
CREATE POLICY "treasury_access_policy" ON treasury
FOR ALL USING (
    get_user_company_code() IS NULL OR 
    company_code = get_user_company_code()
);

-- 4. REALTIME ENABLEMENT

-- Add tables to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE sales;
ALTER PUBLICATION supabase_realtime ADD TABLE treasury;
ALTER PUBLICATION supabase_realtime ADD TABLE attendance;

-- 5. PERFORMANCE INDEXES

CREATE INDEX idx_sales_company_code ON sales(company_code);
CREATE INDEX idx_sales_date ON sales(date);
CREATE INDEX idx_staff_company_code ON staff(company_code);
CREATE INDEX idx_attendance_company_code ON attendance(company_code);
CREATE INDEX idx_attendance_date ON attendance(date);
CREATE INDEX idx_treasury_company_code ON treasury(company_code);
CREATE INDEX idx_treasury_date ON treasury(created_at);

-- 6. SAMPLE DATA

-- Insert demo company
INSERT INTO companies (company_code, name, license_expiry) 
VALUES ('DEMO', 'شركة البصيرة التجريبية', '2025-12-31')
ON CONFLICT (company_code) DO NOTHING;

-- Insert sample staff
INSERT INTO staff (name, daily_rate, role, company_code) VALUES
('أحمد محمد', 150.00, 'محاسب', 'DEMO'),
('محمد علي', 120.00, 'مشغل ميزان', 'DEMO'),
('سارة أحمد', 100.00, 'مشاهد', 'DEMO')
ON CONFLICT DO NOTHING;

-- Insert sample treasury transactions
INSERT INTO treasury (transaction_type, amount, description, company_code) VALUES
('income', 5000.00, 'رصيد افتتاحي', 'DEMO'),
('expense', 500.00, 'مصروفات إدارية', 'DEMO')
ON CONFLICT DO NOTHING;

-- 7. FUNCTIONS FOR BUSINESS LOGIC

-- Function to calculate daily sales total
CREATE OR REPLACE FUNCTION get_daily_sales_total(target_date DATE, comp_code TEXT)
RETURNS DECIMAL AS $$
BEGIN
    RETURN COALESCE(
        (SELECT SUM(total_price) 
         FROM sales 
         WHERE DATE(date) = target_date 
         AND company_code = comp_code), 
        0
    );
END;
$$ LANGUAGE plpgsql;

-- Function to get staff attendance for date
CREATE OR REPLACE FUNCTION get_staff_attendance(target_date DATE, comp_code TEXT)
RETURNS TABLE(staff_name TEXT, status TEXT) AS $$
BEGIN
    RETURN QUERY
    SELECT s.name, COALESCE(a.status, 'absent')
    FROM staff s
    LEFT JOIN attendance a ON s.id = a.staff_id AND a.date = target_date
    WHERE s.company_code = comp_code;
END;
$$ LANGUAGE plpgsql;

-- 8. TRIGGERS FOR AUTO-UPDATES

-- Function to handle updated_at timestamp
CREATE OR REPLACE FUNCTION handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add updated_at column and triggers where needed
ALTER TABLE companies ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
CREATE TRIGGER companies_updated_at BEFORE UPDATE ON companies FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Complete initialization
SELECT 'ERP Database initialized successfully!' as status;