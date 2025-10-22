
import pool from './index';

export const createTables = async () => {
  const client = await pool.connect();
  try {
    await client.query(`
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
    `);
    console.log('Tables created successfully');
  } catch (error) {
    console.error('Error creating tables:', error);
  } finally {
    client.release();
  }
};
