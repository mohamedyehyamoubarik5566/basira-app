-- Supabase Database Schema for ERP System

-- Enable Row Level Security
ALTER DATABASE postgres SET "app.jwt_secret" TO 'your-jwt-secret';

-- Create Companies Table
CREATE TABLE IF NOT EXISTS companies (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    company_code VARCHAR(50) UNIQUE NOT NULL,
    company_name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create Users Table (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS users (
    id UUID REFERENCES auth.users(id) PRIMARY KEY,
    company_code VARCHAR(50) REFERENCES companies(company_code),
    role VARCHAR(50) NOT NULL DEFAULT 'viewer',
    full_name VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create Sales Table
CREATE TABLE IF NOT EXISTS sales (
    id BIGSERIAL PRIMARY KEY,
    company_code VARCHAR(50) REFERENCES companies(company_code),
    client_name VARCHAR(255) NOT NULL,
    permission_number VARCHAR(100),
    car_number VARCHAR(50),
    trailer_number VARCHAR(50),
    material_type VARCHAR(50),
    sand_type VARCHAR(50),
    volume DECIMAL(10,2),
    price_per_meter DECIMAL(10,2),
    total_price DECIMAL(12,2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create Staff Table
CREATE TABLE IF NOT EXISTS staff (
    id BIGSERIAL PRIMARY KEY,
    company_code VARCHAR(50) REFERENCES companies(company_code),
    staff_name VARCHAR(255) NOT NULL,
    staff_id VARCHAR(50),
    position VARCHAR(100),
    salary DECIMAL(10,2),
    attendance_date DATE,
    hours_worked DECIMAL(4,2),
    advance_payment DECIMAL(10,2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create Clients Table
CREATE TABLE IF NOT EXISTS clients (
    id BIGSERIAL PRIMARY KEY,
    company_code VARCHAR(50) REFERENCES companies(company_code),
    client_name VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    price_sen DECIMAL(10,2) DEFAULT 0,
    price_adasa DECIMAL(10,2) DEFAULT 0,
    opening_balance DECIMAL(12,2) DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(company_code, client_name)
);

-- Create Transactions Table
CREATE TABLE IF NOT EXISTS transactions (
    id BIGSERIAL PRIMARY KEY,
    company_code VARCHAR(50) REFERENCES companies(company_code),
    transaction_type VARCHAR(50) NOT NULL, -- 'income', 'expense', 'payment'
    description TEXT,
    amount DECIMAL(12,2) NOT NULL,
    client_name VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create Checks Table
CREATE TABLE IF NOT EXISTS checks (
    id BIGSERIAL PRIMARY KEY,
    company_code VARCHAR(50) REFERENCES companies(company_code),
    check_number VARCHAR(100) NOT NULL,
    bank_name VARCHAR(255),
    client_name VARCHAR(255),
    amount DECIMAL(12,2),
    due_date DATE,
    status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'cleared', 'bounced'
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Row Level Security Policies

-- Sales RLS
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can only access their company's sales" ON sales
    FOR ALL USING (
        company_code = (
            SELECT company_code FROM users WHERE id = auth.uid()
        )
    );

-- Staff RLS
ALTER TABLE staff ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can only access their company's staff" ON staff
    FOR ALL USING (
        company_code = (
            SELECT company_code FROM users WHERE id = auth.uid()
        )
    );

-- Clients RLS
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can only access their company's clients" ON clients
    FOR ALL USING (
        company_code = (
            SELECT company_code FROM users WHERE id = auth.uid()
        )
    );

-- Transactions RLS
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can only access their company's transactions" ON transactions
    FOR ALL USING (
        company_code = (
            SELECT company_code FROM users WHERE id = auth.uid()
        )
    );

-- Checks RLS
ALTER TABLE checks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can only access their company's checks" ON checks
    FOR ALL USING (
        company_code = (
            SELECT company_code FROM users WHERE id = auth.uid()
        )
    );

-- Users RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can only access their own profile" ON users
    FOR ALL USING (id = auth.uid());

-- Companies RLS
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can only access their company" ON companies
    FOR SELECT USING (
        company_code = (
            SELECT company_code FROM users WHERE id = auth.uid()
        )
    );

-- Create Indexes for Performance
CREATE INDEX IF NOT EXISTS idx_sales_company_code ON sales(company_code);
CREATE INDEX IF NOT EXISTS idx_sales_created_at ON sales(created_at);
CREATE INDEX IF NOT EXISTS idx_staff_company_code ON staff(company_code);
CREATE INDEX IF NOT EXISTS idx_clients_company_code ON clients(company_code);
CREATE INDEX IF NOT EXISTS idx_transactions_company_code ON transactions(company_code);
CREATE INDEX IF NOT EXISTS idx_checks_company_code ON checks(company_code);

-- Insert Sample Company
INSERT INTO companies (company_code, company_name) 
VALUES ('DEMO', 'شركة البصيرة التجريبية')
ON CONFLICT (company_code) DO NOTHING;

-- Create Functions for Real-time Updates
CREATE OR REPLACE FUNCTION handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create Triggers
CREATE TRIGGER update_companies_updated_at
    BEFORE UPDATE ON companies
    FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

CREATE TRIGGER update_sales_updated_at
    BEFORE UPDATE ON sales
    FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

CREATE TRIGGER update_staff_updated_at
    BEFORE UPDATE ON staff
    FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

CREATE TRIGGER update_clients_updated_at
    BEFORE UPDATE ON clients
    FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

CREATE TRIGGER update_checks_updated_at
    BEFORE UPDATE ON checks
    FOR EACH ROW EXECUTE FUNCTION handle_updated_at();