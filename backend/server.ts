
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { createTables } from './db/schema';

const app = express();

// Serverless-friendly configuration
const isServerless = !!process.env.VERCEL;
const port = process.env.PORT || 3000;

// CORS configuration for both local and production
const corsOptions = {
  origin: function (origin: any, callback: any) {
    const allowedOrigins = [
      'http://localhost:5173',
      'http://localhost:3000',
      process.env.FRONTEND_URL,
      process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null
    ].filter(Boolean);

    // Allow requests with no origin (mobile apps, etc.)
    if (!origin) return callback(null, true);

    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    } else {
      return callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));
app.use(express.json({ limit: '10mb' }));

import pool from './db';

app.get('/', (req, res) => {
  res.send('Hello from the backend!');
});

app.post('/api/documents', async (req, res) => {
  const { fileName, documentText, analysis } = req.body;
  try {
    const newDocument = await pool.query(
      'INSERT INTO documents (file_name, document_text, analysis) VALUES ($1, $2, $3) RETURNING *',
      [fileName, documentText, analysis]
    );
    res.json(newDocument.rows[0]);
  } catch (error) {
    console.error('Error inserting document:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/documents', async (req, res) => {
  try {
    const allDocuments = await pool.query('SELECT * FROM documents ORDER BY created_at DESC');
    res.json(allDocuments.rows);
  } catch (error) {
    console.error('Error getting documents:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/interviews', async (req, res) => {
  const { cvContent, cvFileName, targetPosition, interviewType, customPrompt, questions, answers, overallScore, feedback, completedAt, status } = req.body;
  try {
    const newInterview = await pool.query(
      'INSERT INTO interviews (cv_content, cv_file_name, target_position, interview_type, custom_prompt, questions, answers, overall_score, feedback, completed_at, status) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *',
      [cvContent, cvFileName, targetPosition, interviewType, customPrompt, questions, answers, overallScore, feedback, completedAt, status]
    );
    res.json(newInterview.rows[0]);
  } catch (error) {
    console.error('Error inserting interview:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/interviews', async (req, res) => {
  try {
    const allInterviews = await pool.query('SELECT * FROM interviews ORDER BY created_at DESC');
    res.json(allInterviews.rows);
  } catch (error) {
    console.error('Error getting interviews:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/questions', async (req, res) => {
  const { type, question, options, correctAnswerIndex, explanation, keyTopic } = req.body;
  try {
    const newQuestion = await pool.query(
      'INSERT INTO questions (type, question, options, correct_answer_index, explanation, key_topic) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [type, question, options, correctAnswerIndex, explanation, keyTopic]
    );
    res.json(newQuestion.rows[0]);
  } catch (error) {
    console.error('Error inserting question:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/questions', async (req, res) => {
  try {
    const allQuestions = await pool.query('SELECT * FROM questions ORDER BY created_at DESC');
    res.json(allQuestions.rows);
  } catch (error) {
    console.error('Error getting questions:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/question_banks', async (req, res) => {
  const { name, description, subject, tags, questions, isPublic, usageCount } = req.body;
  try {
    const newQuestionBank = await pool.query(
      'INSERT INTO question_banks (name, description, subject, tags, questions, is_public, usage_count) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
      [name, description, subject, tags, questions, isPublic, usageCount]
    );
    res.json(newQuestionBank.rows[0]);
  } catch (error) {
    console.error('Error inserting question bank:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/question_banks', async (req, res) => {
  try {
    const allQuestionBanks = await pool.query('SELECT * FROM question_banks ORDER BY created_at DESC');
    res.json(allQuestionBanks.rows);
  } catch (error) {
    console.error('Error getting question banks:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

const startServer = async () => {
  await createTables();
  app.listen(port, () => {
    console.log(`Backend server is running on http://localhost:${port}`);
  });
};

startServer();
