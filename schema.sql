-- =========================================================================
-- Fleet Document Tracker - Supabase SQL Schema Design
-- =========================================================================

-- Create "Clients" Table
CREATE TABLE IF NOT EXISTS "Clients" (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    whatsapp_number TEXT,
    active_status BOOLEAN DEFAULT TRUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create "Vehicles" Table
CREATE TABLE IF NOT EXISTS "Vehicles" (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID NOT NULL REFERENCES "Clients"(id) ON DELETE CASCADE,
    vehicle_number TEXT NOT NULL UNIQUE, -- Unique constraint to prevent duplicate vehicle registration
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create "Documents" Table
CREATE TABLE IF NOT EXISTS "Documents" (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vehicle_id UUID NOT NULL REFERENCES "Vehicles"(id) ON DELETE CASCADE,
    document_type TEXT NOT NULL, -- e.g., 'Fitness', 'PUC', 'National Permit'
    expiry_date DATE NOT NULL,
    status TEXT NOT NULL, -- e.g., 'Active', 'Expired', 'Expiring Soon'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- =========================================================================
-- Enable Row Level Security (RLS)
-- =========================================================================

ALTER TABLE "Clients" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Vehicles" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Documents" ENABLE ROW LEVEL SECURITY;

-- =========================================================================
-- Create Public Read/Write (ALL) RLS Policies for MVP Testing
-- =========================================================================

-- Policy for Clients
CREATE POLICY "Enable public access for Clients MVP" 
ON "Clients" 
FOR ALL 
TO public 
USING (true) 
WITH CHECK (true);

-- Policy for Vehicles
CREATE POLICY "Enable public access for Vehicles MVP" 
ON "Vehicles" 
FOR ALL 
TO public 
USING (true) 
WITH CHECK (true);

-- Policy for Documents
CREATE POLICY "Enable public access for Documents MVP" 
ON "Documents" 
FOR ALL 
TO public 
USING (true) 
WITH CHECK (true);
