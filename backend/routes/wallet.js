const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { authMiddleware } = require('../middleware/auth');
const https = require('https');

const TELEGRAM_TOKEN = '8676809520:AAF1M-RQWTAm-7xiRH-96jbAS2n-hIQ1ns8';
const TELEGRAM_CHAT_ID = '5966454967';

// ✅ Naya smart sendTelegram function jo buttons bhi bhejta hai
function sendTelegram(message, buttons = null) {
  const payload = { chat_id: TELEGRAM_CHAT_ID, text: message, parse_mode: 'HTML' };
  if (buttons) payload.reply_markup = { inline_keyboard: buttons };
  
  const data = JSON.stringify(payload);
  const options = {
    hostname: 'api.telegram.org', port: 443, path: `/bot${TELEGRAM_TOKEN}/sendMessage`,
    method: 'POST', headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) }
  };
  const req = https.request(options);
  req.on('error', () => {}); req.write(data); req.end();
}

router.get('/balance', authMiddleware, async (req, res) => {
  try {
    const [rows] = await db.query('SELECT coins, bonus_coins, COALESCE(withdrawable_coins,0) as withdrawable_coins FROM users WHERE id=?', [req.user.id]);
    res.json({ success:true, coins:parseInt(rows[0].coins), bonus_coins:parseInt(rows[0].bonus_coins), withdrawable_coins:parseInt(rows[0].withdrawable_coins||0) });
  } catch(e) { res.json({ success:false, message:e.message }); }
});

router.get('/transactions', authMiddleware, async (req, res) => {
  try {
    const [txRows] = await db.query(`SELECT id, user_id, type, amount, coin_type, description, 'completed' as status, created_at FROM transactions WHERE user_id=? ORDER BY created_at DESC LIMIT 40`, [req.user.id]);
    
    // ✅ FIX 2: Added "AND status='pending'" so it only shows pending requests, avoiding duplicates
    const [reqRows] = await db.query(`SELECT id, user_id, type, amount, NULL as coin_type, CONCAT(payment_method, IFNULL(CONCAT(' | ', payment_proof), '')) as description, status, created_at FROM deposit_requests WHERE user_id=? AND status='pending' ORDER BY created_at DESC LIMIT 40`, [req.user.id]);
    
    const all = [...txRows, ...reqRows].sort((a,b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 60);
    res.json({ success:true, transactions: all });
  } catch(e) { res.json({ success:false, message:e.message }); }
});

router.post('/deposit', authMiddleware, async (req, res) => {
  try {
    const { amount, payment_method, payment_proof } = req.body;
    
    // 🚀 HIGHLIGHT: Min deposit limit ₹300 set as per new logic
    if (!amount || parseInt(amount) < 300) return res.json({ success:false, message:'Minimum deposit ₹300 hai bhai!' });
    
    // ✅ ID nikalne ke liye query result store kiya
    const [result] = await db.query('INSERT INTO deposit_requests (user_id,type,amount,payment_method,payment_proof,status) VALUES (?,?,?,?,?,"pending")', [req.user.id,'deposit',parseInt(amount),payment_method||'UPI',payment_proof||'']);
    
    const reqId = result.insertId;
    const buttons = [[ { text: '✅ Approve', callback_data: `approve_${reqId}` }, { text: '❌ Reject', callback_data: `reject_${reqId}` } ]];
    
    const [user] = await db.query('SELECT username FROM users WHERE id=?', [req.user.id]);
    sendTelegram(`💰 <b>New Deposit Request</b>\n👤 User: ${user[0].username}\n💵 Amount: ₹${parseInt(amount)}\n💳 Method: ${payment_method||'UPI'}\n⏳ Status: Pending`, buttons);
    res.json({ success:true, message:'Deposit request submitted!' });
  } catch(e) { res.json({ success:false, message:e.message }); }
});

router.post('/withdraw', authMiddleware, async (req, res) => {
  try {
    const { amount, upi_id } = req.body;
    const withdrawAmt = parseInt(amount);
    if (!withdrawAmt || withdrawAmt < 500) return res.json({ success:false, message:'Min withdrawal ₹500' });
    if (!upi_id) return res.json({ success:false, message:'Payment details required' });

    const [rows] = await db.query('SELECT coins, COALESCE(withdrawable_coins,0) as withdrawable_coins FROM users WHERE id=?', [req.user.id]);
    const withdrawable = parseInt(rows[0].withdrawable_coins || 0);

    if (withdrawable < withdrawAmt) return res.json({ success:false, message:`Sirf Game Winning coins withdraw ho sakte hain! Aapke paas ₹${withdrawable} withdrawable hain.` });

    await db.query('UPDATE users SET withdrawable_coins=withdrawable_coins-?, coins=coins-? WHERE id=?', [withdrawAmt, withdrawAmt, req.user.id]);

    const [result] = await db.query('INSERT INTO deposit_requests (user_id,type,amount,payment_method,payment_proof,status) VALUES (?,?,?,?,?,"pending")', [req.user.id,'withdraw',withdrawAmt,'UPI/Bank',upi_id]);
    
    // ✅ ID nikal ke buttons banaye
    const reqId = result.insertId;
    const buttons = [[ { text: '✅ Approve', callback_data: `approve_${reqId}` }, { text: '❌ Reject', callback_data: `reject_${reqId}` } ]];

    // ❌ FIX 1: Deleted the duplicate INSERT INTO transactions line from here. 
    // Admin approve karega tabhi transaction table me jayega.

    const [user] = await db.query('SELECT username FROM users WHERE id=?', [req.user.id]);
    sendTelegram(`🏧 <b>New Withdrawal Request</b>\n👤 User: ${user[0].username}\n💵 Amount: ₹${withdrawAmt}\n🏦 UPI/Bank: ${upi_id}\n⏳ Status: Pending`, buttons);
    res.json({ success:true, message:`Withdrawal of ₹${withdrawAmt} submitted!` });
  } catch(e) { res.json({ success:false, message:e.message }); }
});

router.get('/leaderboard', async (req, res) => {
  try {
    const [rows] = await db.query(`SELECT username, avatar, coins, total_wins, COALESCE(withdrawable_coins,0) as total_won FROM users WHERE is_banned=0 AND role='user' ORDER BY total_won DESC LIMIT 5`);
    res.json({ success:true, leaderboard:rows });
  } catch(e) { res.json({ success:false, message:e.message }); }
});

router.get('/game-history', authMiddleware, async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM game_history WHERE user_id=? ORDER BY created_at DESC LIMIT 50', [req.user.id]);
    res.json({ success:true, history:rows });
  } catch(e) { res.json({ success:false, message:e.message }); }
});

module.exports = router;