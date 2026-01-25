const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 3002;

// Middleware
app.use(cors());
app.use(express.json());

// Google Apps Script URL
const GOOGLE_APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxsVZLHNbMA8jLi2UhoCkJPtmnCdFbySvc_2xgFIYWKxVOCMF3vaFIsgzzMBBkgHJLF/exec';

// Replace your login app.post logic with this
app.post('/api/login', async (req, res) => {
    try {
      const { email, password, companyName } = req.body;
      const payload = JSON.stringify({ login: { email, password, companyName } });
  console.log("Payload: ", payload);
      const response = await axios({
        method: 'post',
        url: GOOGLE_APPS_SCRIPT_URL,
        data: payload,
        headers: {
          'Content-Type': 'text/plain;charset=utf-8', // Google prefers text/plain for some POST requests
        },
        maxRedirects: 5 // Ensure redirects are allowed
      });
  
      res.json(response.data);
    } catch (error) {
      console.error('Login error:', error.message);
      res.status(500).json({ success: false, message: 'Server Error' });
    }
  });

// SIGNUP
app.post('/api/signup', async (req, res) => {
  try {
    const { name, email, role, password, companyName } = req.body;

    const payload = { signup: { name, email, role, password, companyName } };
    console.log('Signup request:', payload);

    const response = await axios.post(GOOGLE_APPS_SCRIPT_URL, payload, {
      headers: { 'Content-Type': 'application/json' }
    });

    console.log('Google Apps Script response:', response.data);
    res.json(response.data);

  } catch (error) {
    console.error('Signup error:', error.response?.data || error.message);
    res.status(500).json({
      success: false,
      message: 'Signup failed',
      error: error.response?.data || error.message
    });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Backend server is running' });
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
