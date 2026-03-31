const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { adminMiddleware } = require('../middleware/auth');

router.get('/stats', adminMiddleware, async (req, res) => {
  try {
    const [[{ total_users }]] = await db.query('SELECT COUNT(*) as total_users FROM users WHERE role="user"');
    const [[{ active_today }]] = await db.query('SELECT COUNT(DISTINCT user_id) as active_today FROM transactions WHERE DATE(created_at)=CURDATE()');
    const [[{ total_bets }]] = await db.query('SELECT COALESCE(SUM(total_bets),0) as total_bets FROM users');
    const [[{ pending_deposits }]] = await db.query('SELECT COUNT(*) as pending_deposits FROM deposit_requests WHERE status="pending"');
    const [[{ total_real_coins }]] = await db.query('SELECT COALESCE(SUM(coins),0) as total_real_coins FROM users');
    const [[{ total_bonus_coins }]] = await db.query('SELECT COALESCE(SUM(bonus_coins),0) as total_bonus_coins FROM users');
    res.json({ success: true, stats: { total_users, active_today, total_bets, pending_deposits, total_real_coins, total_bonus_coins } });
  } catch(e) { res.json({ success: false, message: e.message }); }
});

router.get('/users', adminMiddleware, async (req, res) => {
  try {
    const [rows] = await db.query('SELECT id,username,email,coins,bonus_coins,role,is_banned,total_wins,total_bets,refer_code,created_at FROM users ORDER BY created_at DESC');
    res.json({ success: true, users: rows });
  } catch(e) { res.json({ success: false, message: e.message }); }
});

router.put('/users/:id/coins', adminMiddleware, async (req, res) => {
  try {
    const { amount, action, reason, coin_type } = req.body;
    const userId = req.params.id;
    const cType = coin_type || 'real';
    const col = cType === 'bonus' ? 'bonus_coins' : 'coins';
    const txType = cType === 'bonus' ? 'bonus' : 'admin_add';
    if (action === 'add') {
      await db.query(`UPDATE users SET ${col}=${col}+? WHERE id=?`, [amount, userId]);
      await db.query('INSERT INTO transactions (user_id,type,amount,coin_type,description) VALUES (?,?,?,?,?)', [userId, txType, amount, cType, reason || `⚙️ Admin Added Coins`]);
    } else {
      await db.query(`UPDATE users SET ${col}=GREATEST(0,${col}-?) WHERE id=?`, [amount, userId]);
      await db.query('INSERT INTO transactions (user_id,type,amount,coin_type,description) VALUES (?,?,?,?,?)', [userId, 'loss', amount, cType, reason || '⚙️ Admin Removed']);
    }
    const [rows] = await db.query('SELECT coins,bonus_coins FROM users WHERE id=?', [userId]);
    res.json({ success: true, coins: parseInt(rows[0].coins), bonus_coins: parseInt(rows[0].bonus_coins) });
  } catch(e) { res.json({ success: false, message: e.message }); }
});

router.put('/users/:id/ban', adminMiddleware, async (req, res) => {
  try {
    await db.query('UPDATE users SET is_banned=? WHERE id=?', [req.body.ban ? 1 : 0, req.params.id]);
    res.json({ success: true });
  } catch(e) { res.json({ success: false, message: e.message }); }
});

router.get('/deposits', adminMiddleware, async (req, res) => {
  try {
    const { status } = req.query;
    let q = `SELECT dr.*, u.username, u.email FROM deposit_requests dr JOIN users u ON dr.user_id=u.id`;
    const params = [];
    if (status) { q += ' WHERE dr.status=?'; params.push(status); }
    q += ' ORDER BY dr.created_at DESC LIMIT 100';
    const [rows] = await db.query(q, params);
    res.json({ success: true, deposits: rows });
  } catch(e) { res.json({ success: false, message: e.message }); }
});

// ✅ UPDATED ROUTE: Approve / Reject logic fixed
router.put('/deposits/:id', adminMiddleware, async (req, res) => {
  try {
    const { action } = req.body;
    const [deps] = await db.query('SELECT * FROM deposit_requests WHERE id=?', [req.params.id]);
    if (!deps.length) return res.json({ success: false, message: 'Not found' });
    
    const dep = deps[0];
    if (dep.status !== 'pending') return res.json({ success: false, message: 'Already processed' });
    
    const isWithdraw = dep.type === 'withdraw';

    // Pehle status update kar do
    await db.query('UPDATE deposit_requests SET status=? WHERE id=?', [action === 'approve' ? 'approved' : 'rejected', dep.id]);
    
    if (action === 'approve') {
      if (isWithdraw) {
        // ✅ Withdraw Approve: Coins wallet.js mein request par pehle hi cut gaye the, toh bas history mein daalo
        await db.query('INSERT INTO transactions (user_id,type,amount,coin_type,description) VALUES (?,?,?,?,?)', [dep.user_id, 'withdraw', dep.amount, 'real', `📤 Withdrawal Approved ₹${dep.amount}`]);
      } else {
        // ✅ Deposit Approve: User ko coins de do
        await db.query('UPDATE users SET coins=coins+? WHERE id=?', [dep.amount, dep.user_id]);
        await db.query('INSERT INTO transactions (user_id,type,amount,coin_type,description) VALUES (?,?,?,?,?)', [dep.user_id, 'deposit', dep.amount, 'real', `📥 Deposit Approved ₹${dep.amount}`]);
      }
    } else if (action === 'reject') {
      if (isWithdraw) {
        // ✅ Withdraw Reject (REFUND): Kate hue coins dono jagah wapas de do
        await db.query('UPDATE users SET coins=coins+?, withdrawable_coins=withdrawable_coins+? WHERE id=?', [dep.amount, dep.amount, dep.user_id]);
        await db.query('INSERT INTO transactions (user_id,type,amount,coin_type,description) VALUES (?,?,?,?,?)', [dep.user_id, 'refund', dep.amount, 'real', `❌ Withdrawal Rejected - Refund ₹${dep.amount}`]);
      } else {
        // ✅ Deposit Reject: Bas history log kar lo
        await db.query('INSERT INTO transactions (user_id,type,amount,coin_type,description) VALUES (?,?,?,?,?)', [dep.user_id, 'refund', dep.amount, 'real', `❌ Deposit Rejected ₹${dep.amount}`]);
      }
    }
    
    res.json({ success: true, message: action === 'approve' ? 'Approved!' : 'Rejected & Refunded (if applicable)' });
  } catch(e) { res.json({ success: false, message: e.message }); }
});

router.post('/wingo/override', adminMiddleware, async (req, res) => {
  try {
    const { period_number, override_number } = req.body;
    if (override_number === null || override_number === undefined) {
      await db.query('UPDATE wingo_periods SET admin_override=NULL WHERE period_number=?', [period_number]);
      return res.json({ success: true, message: 'Override cleared' });
    }
    const n = parseInt(override_number);
    if (n < 0 || n > 9) return res.json({ success: false, message: 'Number 0-9' });
    const [rows] = await db.query('SELECT * FROM wingo_periods WHERE period_number=?', [period_number]);
    if (!rows.length) await db.query('INSERT INTO wingo_periods (period_number,status,admin_override) VALUES (?,?,?)', [period_number,'open',n]);
    else {
      if (rows[0].status === 'closed') return res.json({ success: false, message: 'Period closed' });
      await db.query('UPDATE wingo_periods SET admin_override=? WHERE period_number=?', [n, period_number]);
    }
    const COLOR_MAP = {0:'violet',1:'green',2:'red',3:'green',4:'red',5:'violet',6:'red',7:'green',8:'red',9:'green'};
    const SIZE_MAP = {0:'small',1:'small',2:'small',3:'small',4:'small',5:'big',6:'big',7:'big',8:'big',9:'big'};
    res.json({ success: true, message: `Override set: #${n}`, number: n, color: COLOR_MAP[n], size: SIZE_MAP[n] });
  } catch(e) { res.json({ success: false, message: e.message }); }
});

router.get('/wingo/current', adminMiddleware, async (req, res) => {
  try {
    const n = new Date(), pad = x => String(x).padStart(2,'0');
    const period = `${n.getFullYear()}${pad(n.getMonth()+1)}${pad(n.getDate())}${pad(n.getHours())}${pad(Math.floor(n.getMinutes()/2))}`;
    const [rows] = await db.query('SELECT * FROM wingo_periods WHERE period_number=?', [period]);
    const sec = 120 - (Math.floor(Date.now()/1000) % 120);
    const COLOR_MAP = {0:'violet',1:'green',2:'red',3:'green',4:'red',5:'violet',6:'red',7:'green',8:'red',9:'green'};
    const SIZE_MAP = {0:'small',1:'small',2:'small',3:'small',4:'small',5:'big',6:'big',7:'big',8:'big',9:'big'};
    const override = rows[0]?.admin_override;
    res.json({ success: true, period, seconds_left: sec, admin_override: override ?? null, status: rows[0]?.status || 'open',
      override_preview: override !== null && override !== undefined ? { number: override, color: COLOR_MAP[override], size: SIZE_MAP[override] } : null });
  } catch(e) { res.json({ success: false, message: e.message }); }
});

router.get('/game-history', adminMiddleware, async (req, res) => {
  try {
    const [rows] = await db.query(`SELECT gh.*, u.username FROM game_history gh JOIN users u ON gh.user_id=u.id ORDER BY gh.created_at DESC LIMIT 50`);
    res.json({ success: true, history: rows });
  } catch(e) { res.json({ success: false, message: e.message }); }
});

// ✅ UPDATED: win_rate bhi fetch karo
router.get('/game-settings', adminMiddleware, async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM game_settings');
    const settings = {};
    const winRates = {};
    rows.forEach(r => {
      settings[r.game_name] = r.is_enabled == 1;
      winRates[r.game_name] = r.win_rate !== undefined && r.win_rate !== null ? parseInt(r.win_rate) : 25;
    });
    ['slots','wingo','cards','jackpot','aviator'].forEach(g => {
      if (settings[g] === undefined) settings[g] = true;
      if (winRates[g] === undefined) winRates[g] = 25;
    });
    res.json({ success: true, settings, winRates });
  } catch(e) { res.json({ success: false, message: e.message }); }
});

// ✅ UPDATED: win_rate bhi save karo
router.post('/game-settings', adminMiddleware, async (req, res) => {
  try {
    const { game_name, is_enabled, win_rate } = req.body;
    const val = is_enabled !== undefined ? (is_enabled ? 1 : 0) : undefined;
    const rate = win_rate !== undefined ? Math.min(100, Math.max(0, parseInt(win_rate))) : undefined;

    if (val !== undefined && rate !== undefined) {
      await db.query(
        'INSERT INTO game_settings (game_name, is_enabled, win_rate) VALUES (?,?,?) ON DUPLICATE KEY UPDATE is_enabled=?, win_rate=?',
        [game_name, val, rate, val, rate]
      );
    } else if (val !== undefined) {
      await db.query(
        'INSERT INTO game_settings (game_name, is_enabled) VALUES (?,?) ON DUPLICATE KEY UPDATE is_enabled=?',
        [game_name, val, val]
      );
    } else if (rate !== undefined) {
      await db.query(
        'INSERT INTO game_settings (game_name, win_rate) VALUES (?,?) ON DUPLICATE KEY UPDATE win_rate=?',
        [game_name, rate, rate]
      );
    }

    res.json({ success: true, message: `${game_name} settings saved` });
  } catch(e) { res.json({ success: false, message: e.message }); }
});

router.get('/payment-settings', adminMiddleware, async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM site_settings WHERE setting_key IN ("upi_id","site_url","site_name","telegram_link")');
    const settings = {};
    rows.forEach(r => settings[r.setting_key] = r.setting_value);
    res.json({ success: true, settings });
  } catch(e) { res.json({ success: false, message: e.message }); }
});

router.post('/payment-settings', adminMiddleware, async (req, res) => {
  try {
    const { upi_id, site_url, site_name, telegram_link } = req.body;
    const updates = [];
    if (upi_id !== undefined) updates.push(['upi_id', upi_id]);
    if (site_url !== undefined) updates.push(['site_url', site_url]);
    if (site_name !== undefined) updates.push(['site_name', site_name]);
    if (telegram_link !== undefined) updates.push(['telegram_link', telegram_link || '']);
    for (const [k, v] of updates) {
      await db.query('INSERT INTO site_settings (setting_key,setting_value) VALUES (?,?) ON DUPLICATE KEY UPDATE setting_value=?', [k, v, v]);
    }
    res.json({ success: true, message: 'Settings saved!' });
  } catch(e) { res.json({ success: false, message: e.message }); }
});

module.exports = router;