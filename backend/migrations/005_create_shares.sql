-- Create ENUM types for shares
DO $$ BEGIN
    CREATE TYPE resource_type AS ENUM ('photo', 'album');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE share_scope AS ENUM ('view', 'edit');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Drop existing shares table if it exists
DROP TABLE IF EXISTS shares CASCADE;

-- Create shares table
CREATE TABLE shares (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    share_token VARCHAR(64) NOT NULL UNIQUE,
    resource_type resource_type NOT NULL,
    resource_id UUID NOT NULL,
    owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    scope share_scope NOT NULL DEFAULT 'view',
    expires_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_accessed_at TIMESTAMP,
    access_count INTEGER DEFAULT 0
);

-- Create indexes for performance
CREATE INDEX idx_shares_token ON shares(share_token);
CREATE INDEX idx_shares_owner ON shares(owner_id);
CREATE INDEX idx_shares_resource ON shares(resource_type, resource_id);
CREATE INDEX idx_shares_expires ON shares(expires_at);
