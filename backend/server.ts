
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { migrateDatabase, getSchemaVersion } from './db/schema';

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
  const { fileName, documentText, analysis, contentHash } = req.body;
  try {
    const newDocument = await pool.query(
      'INSERT INTO documents (file_name, document_text, analysis, content_hash) VALUES ($1, $2, $3, $4) RETURNING *',
      [fileName, documentText, analysis, contentHash]
    );
    res.json(newDocument.rows[0]);
  } catch (error) {
    console.error('Error inserting document:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/documents/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const document = await pool.query('SELECT * FROM documents WHERE id = $1', [id]);
    if (document.rows.length === 0) {
      return res.status(404).json({ error: 'Document not found' });
    }
    res.json(document.rows[0]);
  } catch (error) {
    console.error('Error getting document:', error);
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

app.get('/api/interviews/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const interview = await pool.query('SELECT * FROM interviews WHERE id = $1', [id]);
    if (interview.rows.length === 0) {
      return res.status(404).json({ error: 'Interview not found' });
    }
    res.json(interview.rows[0]);
  } catch (error) {
    console.error('Error getting interview:', error);
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

app.get('/api/question_banks/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const questionBank = await pool.query('SELECT * FROM question_banks WHERE id = $1', [id]);
    if (questionBank.rows.length === 0) {
      return res.status(404).json({ error: 'Question bank not found' });
    }
    res.json(questionBank.rows[0]);
  } catch (error) {
    console.error('Error getting question bank:', error);
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

// URL to text extraction endpoint
app.post('/api/extract-url', async (req, res) => {
  try {
    const { url } = req.body;

    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }

    const axios = await import('axios');

    const apiUrl = "https://urltotext.com/api/v1/urltotext/";
    const headers = {
      "Authorization": `Token ${process.env.URLTOTEXT_API_KEY}`,
      "Content-Type": "application/x-www-form-urlencoded"
    };

    // Form data as URL-encoded string
    const payloadData = new URLSearchParams({
      "url": url,
      "output_format": "text",
      "extract_main_content": "false",
      "render_javascript": "false",
      "residential_proxy": "false",
      "stealth_proxy": "false"
    }).toString();

    const response = await axios.default.post(apiUrl, payloadData, {
      headers,
      timeout: 60000
    });

    console.log("URLTOTEXT API response status:", response.status);

    // Parse response and extract content
    const data = response.data;
    if (data && data.data && data.data.content) {
      res.json({
        extractedText: data.data.content.trim(),
        title: data.data.page_title,
        url: data.data.url
      });
    } else {
      throw new Error('Invalid response format from URLTOTEXT API');
    }
  } catch (error: any) {
    console.error('URLTOTEXT API error:', error.response?.status, error.response?.data || error.message);
    res.status(500).json({
      error: 'Failed to extract text from URL',
      details: error.response?.data || error.message
    });
  }
});

// Database info endpoint
app.get('/api/db/info', async (req, res) => {
  try {
    const schemaVersion = await getSchemaVersion();
    const [documentsCount] = (await pool.query('SELECT COUNT(*) FROM documents')).rows;
    const [interviewsCount] = (await pool.query('SELECT COUNT(*) FROM interviews')).rows;
    const [questionBanksCount] = (await pool.query('SELECT COUNT(*) FROM question_banks')).rows;

    res.json({
      schemaVersion,
      lastMigration: new Date().toISOString(),
      counts: {
        documents: parseInt(documentsCount.count),
        interviews: parseInt(interviewsCount.count),
        questionBanks: parseInt(questionBanksCount.count)
      }
    });
  } catch (error) {
    console.error('Error getting database info:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

const startServer = async () => {
  await migrateDatabase();
  app.listen(port, () => {
    console.log(`Backend server is running on http://localhost:${port}`);
  });
};

startServer();
