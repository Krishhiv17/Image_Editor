"""
Add thumbnail_url column to photos table directly.
"""
import psycopg2

# Connect to Azure PostgreSQL
conn = psycopg2.connect(
    host="photo-editor-db.postgres.database.azure.com",
    database="postgres",
    user="photoeditor_admin",
    password="bunkers@123",
    sslmode="require"
)

cur = conn.cursor()

try:
    # Add thumbnail_url column
    cur.execute("ALTER TABLE photos ADD COLUMN IF NOT EXISTS thumbnail_url TEXT")
    conn.commit()
    print("✅ Added thumbnail_url column to photos table")
except Exception as e:
    print(f"❌ Error: {e}")
    conn.rollback()
finally:
    cur.close()
    conn.close()
