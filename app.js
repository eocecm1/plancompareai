// Fixed app.js with better error handling
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rootRouter = require('./routes/root');

const app = express();

// Security and CORS middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
      scriptSrcAttr: ["'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "http://localhost:3000"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  }
}));
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/health', (req, res) => {
  console.log('Health check requested');
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    server: 'PlanCompareAI'
  });
});

// Simple test endpoint
app.get('/api/test', (req, res) => {
  console.log('API test requested');
  res.json({ 
    message: 'API is working!', 
    timestamp: new Date().toISOString(),
    endpoints: [
      'GET /api/plans',
      'POST /api/plans/refresh',
      'GET /api/plans/status',
      'POST /api/plans/recommend',
      'POST /api/plans/compare',
      'POST /api/chatkit/session',
      'POST /api/chatkit/message'
    ]
  });
});

// Debug endpoint to add test data
app.get('/api/debug/add-test-data', async (req, res) => {
  try {
    const { Pool } = require('pg');
    const pool = new Pool({
      host: process.env.DB_HOST,
      port: process.env.DB_PORT,
      database: process.env.DB_NAME,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
    });

    // Add some test data
    await pool.query(`
      INSERT INTO prepaid_plans (provider, name, price, data_limit, features, description) 
      VALUES 
      ('T-Mobile', 'Connect', 15.00, '2.5GB', '{"unlimited_text": true, "unlimited_talk": true}', 'Basic prepaid plan with 2.5GB data'),
      ('T-Mobile', 'Simply Prepaid', 40.00, '10GB', '{"unlimited_text": true, "unlimited_talk": true, "mobile_hotspot": true}', 'Mid-tier plan with 10GB data'),
      ('AT&T', 'Prepaid Unlimited', 50.00, 'Unlimited', '{"unlimited_text": true, "unlimited_talk": true, "mobile_hotspot": true}', 'Unlimited data plan'),
      ('Verizon', 'Prepaid', 35.00, '5GB', '{"unlimited_text": true, "unlimited_talk": true}', '5GB prepaid plan')
      ON CONFLICT (provider, name) DO NOTHING
    `);

    res.json({ 
      success: true, 
      message: 'Test data added successfully',
      note: 'Test plans for T-Mobile, AT&T, and Verizon have been added'
    });
  } catch (error) {
    console.error('Error adding test data:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// ChatKit session endpoint
app.post('/api/chatkit/session', async (req, res) => {
  console.log('ChatKit session requested');
  
  try {
    const { deviceId } = req.body;
    
    if (!process.env.OPENAI_AB_API_KEY) {
      throw new Error('OPENAI_AB_API_KEY not configured');
    }
    
    if (!process.env.OPENAI_CHATKIT_WORKFLOW_ID) {
      throw new Error('OPENAI_CHATKIT_WORKFLOW_ID not configured');
    }

    // Make request to OpenAI ChatKit API
    const axios = require('axios');
    
    const response = await axios.post('https://api.openai.com/v1/chatkit/sessions', {
      workflow: { 
        id: process.env.OPENAI_CHATKIT_WORKFLOW_ID 
      },
      user: deviceId || `user_${Date.now()}`
    }, {
      headers: {
        'Content-Type': 'application/json',
        'OpenAI-Beta': 'chatkit_beta=v1',
        'Authorization': `Bearer ${process.env.OPENAI_AB_API_KEY}`
      }
    });

    console.log('ChatKit session created successfully');
    res.json({ 
      client_secret: response.data.client_secret,
      success: true 
    });
    
  } catch (error) {
    console.error('ChatKit session error:', error.message);
    res.status(500).json({ 
      success: false,
      error: 'Failed to create ChatKit session',
      message: error.message
    });
  }
});

// ChatKit message endpoint
app.post('/api/chatkit/message', async (req, res) => {
  console.log('ChatKit message requested');
  
  try {
    const { message, clientSecret, conversationId } = req.body;
    
    if (!message) {
      throw new Error('Message is required');
    }
    
    if (!clientSecret) {
      throw new Error('Client secret is required');
    }

    // Make request to OpenAI ChatKit conversation API
    const axios = require('axios');
    
    const requestBody = {
      message: {
        content: message,
        role: 'user'
      }
    };
    
    // Add conversation ID if continuing existing conversation
    if (conversationId) {
      requestBody.conversation_id = conversationId;
    }
    
    // Try different ChatKit API endpoints based on OpenAI documentation
    let response;
    try {
      // First try the conversations endpoint
      response = await axios.post('https://api.openai.com/v1/chatkit/conversations/messages', requestBody, {
        headers: {
          'Content-Type': 'application/json',
          'OpenAI-Beta': 'chatkit_beta=v1',
          'Authorization': `Bearer ${clientSecret}`
        }
      });
    } catch (error1) {
      console.log('First endpoint failed, trying alternative...');
      try {
        // Alternative endpoint structure
        response = await axios.post('https://api.openai.com/v1/chat/completions', {
          model: 'gpt-4',
          messages: [
            {
              role: 'system',
              content: `You are the PlanCompareAI Assistant, an expert in mobile phone plan comparisons. Your goal is to provide immediate, helpful recommendations without asking excessive questions.

BEHAVIOR GUIDELINES:
- Give direct recommendations when users ask for plans
- If budget is mentioned, focus on plans within that range
- Provide 2-3 specific plan options with carrier, price, and key features
- Only ask 1 follow-up question maximum if absolutely necessary
- Be concise but informative

KNOWLEDGE BASE:
Under $50 Plans:
- Visible: $40/month unlimited on Verizon network
- Mint Mobile: $30-40/month unlimited on T-Mobile network  
- T-Mobile Connect: $25/month (5.5GB) or $35/month (6GB)
- Cricket: $40/month unlimited on AT&T network
- Metro by T-Mobile: $40/month unlimited

$50+ Plans:
- T-Mobile Magenta: $70/month unlimited
- Verizon Unlimited: $80/month
- AT&T Unlimited: $75/month

When user asks for "best plans" or mentions a budget, immediately provide relevant recommendations. Don't ask for extensive details - make reasonable assumptions and provide helpful options.`
            },
            {
              role: 'user',
              content: message
            }
          ],
          max_tokens: 400,
          temperature: 0.3
        }, {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.OPENAI_AB_API_KEY}`
          }
        });
        
        // Format response for chat completions API
        response.data = {
          messages: [
            { role: 'user', content: message },
            { role: 'assistant', content: response.data.choices[0].message.content }
          ],
          conversation_id: conversationId || `conv_${Date.now()}`
        };
      } catch (error2) {
        throw error1; // Throw the original error
      }
    }

    console.log('ChatKit message sent successfully');
    
    // Extract the assistant's response
    const assistantMessage = response.data.messages?.find(msg => msg.role === 'assistant');
    const responseText = assistantMessage?.content || 'I received your message but had trouble generating a response.';
    
    res.json({ 
      success: true,
      response: responseText,
      conversationId: response.data.conversation_id,
      messages: response.data.messages
    });
    
  } catch (error) {
    console.error('ChatKit message error:', error.response?.data || error.message);
    res.status(500).json({ 
      success: false,
      error: 'Failed to send message to ChatKit',
      message: error.response?.data?.error?.message || error.message
    });
  }
});

// API routes
app.use('/api', rootRouter);

// Serve static files
app.use(express.static(__dirname));

// Serve the API test page
app.get('/test', (req, res) => {
  console.log('Test dashboard requested');
  res.sendFile('test-api.html', { root: __dirname });
});

// Serve the button test page
app.get('/button-test', (req, res) => {
  console.log('Button test requested');
  res.sendFile('button-test.html', { root: __dirname });
});

// Serve the ChatKit demo page
app.get('/chat', (req, res) => {
  console.log('ChatKit demo requested');
  res.sendFile('chatkit-demo.html', { root: __dirname });
});

// Serve the ChatKit debug page
app.get('/debug', (req, res) => {
  console.log('ChatKit debug requested');
  res.sendFile('chatkit-debug.html', { root: __dirname });
});

// Serve the main page
app.get('/', (req, res) => {
  console.log('Main page requested');
  res.sendFile('chatkit-demo.html', { root: __dirname });
});

// 404 handler for API routes
app.use('/api/*', (req, res) => {
  console.log(`API 404: ${req.method} ${req.originalUrl}`);
  res.status(404).json({ 
    success: false,
    error: 'API endpoint not found',
    path: req.originalUrl,
    method: req.method
  });
});

// 404 handler for all other routes
app.use('*', (req, res) => {
  console.log(`404: ${req.method} ${req.originalUrl}`);
  res.status(404).json({ 
    error: 'Endpoint not found',
    path: req.originalUrl 
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Server error:', err.stack);
  res.status(500).json({ 
    success: false,
    error: 'Internal server error',
    message: err.message
  });
});

const PORT = process.env.PORT || 3000;

// Test database connection without blocking server startup
async function testDatabaseConnection() {
  const maxRetries = 3;
  let retries = 0;
  
  while (retries < maxRetries) {
    try {
      const db = require('./config/database');
      await db.query('SELECT NOW() as current_time');
      console.log('✅ Database connection successful');
      return;
    } catch (error) {
      retries++;
      console.log(`⚠️  Database connection attempt ${retries}/${maxRetries} failed:`, error.message);
      
      if (retries < maxRetries) {
        console.log(`   Retrying in ${retries * 2} seconds...`);
        await new Promise(resolve => setTimeout(resolve, retries * 2000));
      } else {
        console.log('   All connection attempts failed. Server will continue, but database features may not work');
        console.log('   Check your database configuration and network connectivity');
      }
    }
  }
}

// Start server
app.listen(PORT, (err) => {
  if (err) {
    console.error('❌ Failed to start server:', err);
    return;
  }
  
  console.log(`🚀 PlanCompareAI server running on port ${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🌐 Test dashboard: http://localhost:${PORT}/test`);
  console.log(`🔍 Health check: http://localhost:${PORT}/health`);
  console.log(`📱 API test: http://localhost:${PORT}/api/test`);
  
  // Test database connection after server starts
  setTimeout(testDatabaseConnection, 1000);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  process.exit(0);
});
