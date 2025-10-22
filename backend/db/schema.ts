
import pool from './index';

// Database migration system
interface Migration {
  version: number;
  description: string;
  up: (client: any) => Promise<void>;
}

const migrations: Migration[] = [
  {
    version: 1,
    description: 'Initial schema setup',
    up: async (client) => {
      await client.query(`
        CREATE TABLE IF NOT EXISTS schema_version (
          version INTEGER PRIMARY KEY DEFAULT 1
        );

        CREATE TABLE IF NOT EXISTS documents (
          id SERIAL PRIMARY KEY,
          file_name VARCHAR(255) NOT NULL,
          document_text TEXT NOT NULL,
          analysis JSONB NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS interviews (
          id SERIAL PRIMARY KEY,
          cv_content TEXT NOT NULL,
          cv_file_name VARCHAR(255),
          target_position VARCHAR(255) NOT NULL,
          interview_type VARCHAR(50) NOT NULL,
          custom_prompt TEXT,
          questions JSONB NOT NULL,
          answers JSONB NOT NULL,
          overall_score NUMERIC,
          feedback JSONB,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          completed_at TIMESTAMP WITH TIME ZONE,
          status VARCHAR(50) NOT NULL
        );

        CREATE TABLE IF NOT EXISTS questions (
          id SERIAL PRIMARY KEY,
          type VARCHAR(50) NOT NULL,
          question TEXT NOT NULL,
          options JSONB,
          correct_answer_index INTEGER,
          explanation TEXT,
          key_topic VARCHAR(255),
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS question_banks (
          id SERIAL PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          description TEXT,
          subject VARCHAR(255),
          tags JSONB,
          questions JSONB NOT NULL,
          is_public BOOLEAN DEFAULT false,
          usage_count INTEGER DEFAULT 0,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE
        );

        INSERT INTO schema_version (version) VALUES (1) ON CONFLICT DO NOTHING;
      `);
    }
  },
  {
    version: 2,
    description: 'Add content hash to documents table for better duplicate detection',
    up: async (client) => {
      // Check if column already exists to make migration idempotent
      const result = await client.query(`
        SELECT column_name FROM information_schema.columns
        WHERE table_name = 'documents' AND column_name = 'content_hash'
      `);

      if (result.rows.length === 0) {
        await client.query(`
          ALTER TABLE documents ADD COLUMN content_hash VARCHAR(64)
        `);
        console.log('Added content_hash column to documents table');
      } else {
        console.log('content_hash column already exists, skipping migration');
      }
    }
  },
  {
    version: 3,
    description: 'Add indexes for better query performance',
    up: async (client) => {
      // Add indexes if they don't exist (outside transaction for CONCURRENTLY)
      const indexes = [
        'CREATE INDEX IF NOT EXISTS idx_documents_created_at ON documents (created_at)',
        'CREATE INDEX IF NOT EXISTS idx_documents_content_hash ON documents (content_hash) WHERE content_hash IS NOT NULL',
        'CREATE INDEX IF NOT EXISTS idx_interviews_created_at ON interviews (created_at)',
        'CREATE INDEX IF NOT EXISTS idx_question_banks_created_at ON question_banks (created_at)'
      ];

      // Run index creation outside of transaction to avoid CONCURRENTLY restriction
      for (const indexQuery of indexes) {
        try {
          await client.query(indexQuery);
        } catch (error: any) {
          // Check if it's just an "already exists" error
          if (!error?.message?.includes('already exists')) {
            throw error;
          }
        }
      }
      console.log('Added performance indexes');
    }
  }
];

export const migrateDatabase = async (): Promise<void> => {
  const client = await pool.connect();
  try {
    // Create schema_version table if it doesn't exist
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_version (
        version INTEGER PRIMARY KEY DEFAULT 1
      )
    `);

    // Get current version
    const currentVersionResult = await client.query('SELECT version FROM schema_version ORDER BY version DESC LIMIT 1');
    const currentVersion = currentVersionResult.rows.length > 0 ? currentVersionResult.rows[0].version : 0;

    console.log(`Current database schema version: ${currentVersion}`);

    // Run pending migrations
    const pendingMigrations = migrations.filter(m => m.version > currentVersion);

    if (pendingMigrations.length === 0) {
      console.log('Database schema is up to date');
      return;
    }

    console.log(`Running ${pendingMigrations.length} migration(s)...`);

    for (const migration of pendingMigrations.sort((a, b) => a.version - b.version)) {
      console.log(`Applying migration v${migration.version}: ${migration.description}`);

      try {
        await client.query('BEGIN');

        await migration.up(client);

        // Update schema version
        await client.query(
          'INSERT INTO schema_version (version) VALUES ($1) ON CONFLICT (version) DO NOTHING',
          [migration.version]
        );

        await client.query('COMMIT');
        console.log(`✓ Migration v${migration.version} applied successfully`);

      } catch (error) {
        await client.query('ROLLBACK');
        console.error(`✗ Migration v${migration.version} failed:`, error);
        throw error;
      }
    }

    console.log('All migrations completed successfully');

  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  } finally {
    client.release();
  }
};

// Legacy function for backwards compatibility
export const createTables = migrateDatabase;

export const getSchemaVersion = async (): Promise<number> => {
  const client = await pool.connect();
  try {
    const result = await client.query('SELECT version FROM schema_version ORDER BY version DESC LIMIT 1');
    return result.rows.length > 0 ? result.rows[0].version : 0;
  } catch (error) {
    console.error('Error getting schema version:', error);
    return 0;
  } finally {
    client.release();
  }
};
