-- Drop existing tables if they exist (to fix schema issues)
DROP TABLE IF EXISTS album_photos CASCADE;
DROP TABLE IF EXISTS albums CASCADE;

-- Create albums table with correct schema
CREATE TABLE albums (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    cover_photo_id UUID REFERENCES photos(id) ON DELETE SET NULL,
    is_public BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for albums
CREATE INDEX idx_albums_user_id ON albums(user_id);
CREATE INDEX idx_albums_created_at ON albums(created_at DESC);

-- Create album_photos junction table
CREATE TABLE album_photos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    album_id UUID NOT NULL REFERENCES albums(id) ON DELETE CASCADE,
    photo_id UUID NOT NULL REFERENCES photos(id) ON DELETE CASCADE,
    position INTEGER NOT NULL DEFAULT 0,
    added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(album_id, photo_id)
);

-- Create indexes for album_photos
CREATE INDEX idx_album_photos_album_id ON album_photos(album_id);
CREATE INDEX idx_album_photos_photo_id ON album_photos(photo_id);
CREATE INDEX idx_album_photos_position ON album_photos(album_id, position);

-- Create trigger function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_album_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
CREATE TRIGGER trigger_update_album_timestamp
    BEFORE UPDATE ON albums
    FOR EACH ROW
    EXECUTE FUNCTION update_album_updated_at();
