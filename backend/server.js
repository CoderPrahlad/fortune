const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({
  origin: ['https://luckyfortunegame.vercel.app', 'http://localhost:5173'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));
app.options('*', cors());

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const limiter = rateLimit({ windowMs: 15*60*1000, max: 500 });
const gameLimiter = rateLimit({ windowMs: 1000, max: 10 });
app.use('/api', limiter);
app.use('/api/games', gameLimiter);

app.use('/api/auth', require('./routes/auth'));
app.use('/api/games', require('./routes/games'));
app.use('/api/wallet', require('./routes/wallet'));
app.use('/api/admin', require('./routes/admin'));

app.use('/api/telegram', require('./routes/telegram'));

app.get('/api/health', (req, res) => res.json({ success:true, message:'🎰 Lucky Fortune API Running!' }));

app.get('/create-admin', async (req, res) => {
  try {
    const bcrypt = require('bcryptjs');
    const db = require('./config/db');
    const hash = await bcrypt.hash('admin123', 10);
    const [ex] = await db.query('SELECT id FROM users WHERE username=?', ['admin']);
    if (ex.length) {
      await db.query('UPDATE users SET password=?,role="admin",coins=999999 WHERE username=?', [hash,'admin']);
      return res.send('<h2 style="color:green">✅ Admin RESET! user: admin | pass: admin123</h2>');
    }
    await db.query('INSERT INTO users (username,email,password,coins,role) VALUES (?,?,?,?,?)',
      ['admin','admin@casino.com',hash,999999,'admin']);
    res.send('<h2 style="color:green">✅ Admin CREATED! user: admin | pass: admin123</h2>');
  } catch(e) { res.send('<h2 style="color:red">❌ '+e.message+'</h2>'); }
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ success:false, message:'Server error' });
});

app.listen(PORT, () => {
  console.log(`
  ====================================
  🎰 Lucky Fortune Casino Backend
  ====================================
  🚀 Port  : ${PORT}
  📡 API   : http://localhost:${PORT}/api
  🔧 Setup : http://localhost:${PORT}/create-admin
  ====================================
  `);
});

module.exports = app;