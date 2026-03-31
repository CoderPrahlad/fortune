const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { authMiddleware } = require('../middleware/auth');

// ── GAME STATUS (public) ──
router.get('/status', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT game_name, is_enabled FROM game_settings');
    const settings = {};
    rows.forEach(r => { settings[r.game_name] = r.is_enabled === 1; });

    const allGames = ['slots','wingo','cards','jackpot','aviator'];
    for (const g of allGames) {
      if (settings[g] === undefined) {
        settings[g] = true;
        try {
          await db.query('INSERT IGNORE INTO game_settings (game_name, is_enabled) VALUES (?, 1)', [g]);
        } catch(e2) {}
      }
    }

    res.json({ success: true, settings });
  } catch (e) {
    res.json({ success: false, message: e.message });
  }
});

// ── HIGHLIGHT: STRICT LIMIT RIG LOGIC (Dynamic 500-100 logic integration) ──
async function checkRigState(userId) {
  try {
    const [u] = await db.query('SELECT COALESCE(withdrawable_coins,0) as withdrawable_coins, rig_direction FROM users WHERE id=?', [userId]);
    if (!u.length) return { isWin: false, maxAllowedWin: 0 };

    let rawBalance = parseFloat(u[0].withdrawable_coins);
    let balance = Math.max(0, isNaN(rawBalance) ? 0 : rawBalance); 
    let direction = u[0].rig_direction || 'UP';

    // Winning Phase (Lagatar jeetega jab tak 500 na pohoch jaye)
    if (direction === 'UP') {
      if (balance >= 500) { 
        try { await db.query("UPDATE users SET rig_direction='DOWN' WHERE id=?", [userId]); } catch(e){}
        return { isWin: false, maxAllowedWin: 0 }; // Forced Loss start
      }
      return { isWin: true, maxAllowedWin: 500 - balance }; 
    } else { 
      // Forced Loss Phase (Lagatar haarega jab tak 100 tak wapas na gir jaye)
      if (balance <= 100) {
        try { await db.query("UPDATE users SET rig_direction='UP' WHERE id=?", [userId]); } catch(e){}
        return { isWin: true, maxAllowedWin: 500 - balance }; // Recovery start
      }
      return { isWin: false, maxAllowedWin: 0 };
    }
  } catch(e) {
    return { isWin: false, maxAllowedWin: 0 };
  }
}

// ── HELPER: deduct bet ──
async function deductBet(userId, betAmount) {
  const [u] = await db.query('SELECT coins, bonus_coins, COALESCE(withdrawable_coins,0) as withdrawable_coins FROM users WHERE id=?', [userId]);
  if (!u.length) throw new Error('User not found');
  const user = u[0];
  
  const maxBonus = Math.floor(betAmount * 0.1);
  const bonusUse = Math.min(user.bonus_coins, maxBonus);
  const realNeed = betAmount - bonusUse;
  
  if (user.coins < realNeed) throw new Error('Insufficient coins');
  
  // Winnings First Logic. GREATEST(0) ensure karega ki withdrawable 0 se neeche na jaye.
  await db.query('UPDATE users SET coins=coins-?, bonus_coins=bonus_coins-?, withdrawable_coins=GREATEST(0, COALESCE(withdrawable_coins,0)-?) WHERE id=?',
    [realNeed, bonusUse, realNeed, userId]);
    
  return { bonusUsed: bonusUse, realUsed: realNeed };
}

// ── HELPER: pay win ──
async function payWin(userId, amount) {
  await db.query('UPDATE users SET coins=coins+?, withdrawable_coins=COALESCE(withdrawable_coins,0)+? WHERE id=?', [amount, amount, userId]);
}

// ── HELPER: get balance ──
async function getBalance(userId) {
  const [u] = await db.query('SELECT coins, bonus_coins, COALESCE(withdrawable_coins,0) as withdrawable_coins FROM users WHERE id=?', [userId]);
  return u[0];
}

// ════════════════════════════════════════
// 🎰 SLOTS
// ════════════════════════════════════════
const SLOT_SYMBOLS = [
  { sym: '💎', m: 50 }, { sym: '7️⃣', m: 20 }, { sym: '🍒', m: 10 },
  { sym: '⭐', m: 8 },  { sym: '🍇', m: 6 },  { sym: '🍊', m: 5 }, { sym: '🍋', m: 4 }
];

function pickLoseSymbols() {
  const syms = SLOT_SYMBOLS.map(s => s.sym);
  const shuffled = syms.sort(() => Math.random() - 0.5);
  return [shuffled[0], shuffled[1], shuffled[2]];
}

router.post('/slots/spin', authMiddleware, async (req, res) => {
  try {
    const { bet_amount } = req.body;
    const bet = parseInt(bet_amount);
    if (!bet || bet < 10 || bet > 5000) return res.json({ success: false, message: 'Invalid bet (10-5000)' });

    const [gs] = await db.query("SELECT is_enabled FROM game_settings WHERE game_name='slots'");
    if (gs.length && !gs[0].is_enabled) return res.json({ success: false, message: 'Slots disabled' });

    await deductBet(req.user.id, bet);

    const rig = await checkRigState(req.user.id);
    let s, mult = 0, msg = '';

    if (rig && rig.isWin === true) {
      const allowedMult = Math.floor(rig.maxAllowedWin / bet);
      
      if (allowedMult <= 0) {
        s = pickLoseSymbols();
        mult = 0; msg = '';
      } else {
        const validSymbols = SLOT_SYMBOLS.filter(x => x.m <= allowedMult);
        if (validSymbols.length > 0) {
          const pick = validSymbols[Math.floor(Math.random() * validSymbols.length)];
          s = [pick.sym, pick.sym, pick.sym];
          mult = pick.m;
          msg = `JACKPOT! ${s[0]}${s[1]}${s[2]} = x${mult}`;
        } else if (allowedMult >= 2) {
          s = ['🍋', '🍋', '🍒']; 
          mult = 2; msg = `2 Match! x2`;
        } else {
          s = pickLoseSymbols();
          mult = 0; msg = '';
        }
      }
    } else {
      s = pickLoseSymbols();
      mult = 0; msg = '';
    }

    const win = Math.floor(bet * mult);
    if (win > 0) await payWin(req.user.id, win);

    await db.query('INSERT INTO game_history (user_id, game, bet, payout, result) VALUES (?,?,?,?,?)',
      [req.user.id, 'slots', bet, win, msg || `${s[0]}${s[1]}${s[2]}`]);
      
    await db.query('INSERT INTO transactions (user_id, type, amount, description, coin_type) VALUES (?,?,?,?,?)',
      [req.user.id, win > 0 ? 'win' : 'loss', bet, `Slots: ${msg || 'No match'}`, 'real']);
      
    await db.query('UPDATE users SET total_bets=total_bets+1 WHERE id=?', [req.user.id]);
    if (win > 0) await db.query('UPDATE users SET total_wins=total_wins+1 WHERE id=?', [req.user.id]);

    const bal = await getBalance(req.user.id);
    res.json({ success: true, symbols: s, is_win: win > 0, win_amount: win, message: msg, ...bal });
  } catch (e) {
    res.json({ success: false, message: e.message });
  }
});

// ════════════════════════════════════════
// 🎨 WINGO (Multi-Timer + 24/7 AUTO RUNNER)
// ════════════════════════════════════════
const COLOR_MAP = { 0:'violet',1:'green',2:'red',3:'green',4:'red',5:'violet',6:'red',7:'green',8:'red',9:'green' };
const SIZE_MAP  = { 0:'small',1:'small',2:'small',3:'small',4:'small',5:'big',6:'big',7:'big',8:'big',9:'big' };

function getCurrentPeriod(timerMin = 2) {
  const n = new Date();
  const pad = x => String(x).padStart(2, '0');
  const interval = Math.floor(n.getMinutes() / timerMin);
  const period = `${n.getFullYear()}${pad(n.getMonth()+1)}${pad(n.getDate())}${pad(n.getHours())}${pad(interval)}_t${timerMin}`;
  const secondsLeft = (timerMin * 60) - (Math.floor(Date.now()/1000) % (timerMin * 60));
  return { period, secondsLeft };
}

// 🔒 WINGO RESOLVER ENGINE (Handles Logic safely for API & Background Cron)
const resolvingPeriods = new Set();
const resolvedCache = new Map();

async function resolveWingoPeriodCore(period_number) {
  if (resolvedCache.has(period_number)) return resolvedCache.get(period_number);

  // Lock lagaya taaki 2 baar ek hi period resolve na ho (Race condition fix)
  if (resolvingPeriods.has(period_number)) {
    await new Promise(r => setTimeout(r, 600)); // Wait for the other process to finish
    const [ext] = await db.query('SELECT * FROM wingo_periods WHERE period_number=?', [period_number]);
    if (ext.length) {
      const res = { success: true, result_number: ext[0].result_number, result_color: ext[0].result_color, result_size: ext[0].result_size, bettor_ids: [] };
      return res;
    }
    return { success: false, message: 'Still resolving' };
  }

  resolvingPeriods.add(period_number);

  try {
    const [existing] = await db.query('SELECT * FROM wingo_periods WHERE period_number=? AND status=?', [period_number, 'closed']);
    if (existing.length) {
      const res = { success: true, result_number: existing[0].result_number, result_color: existing[0].result_color, result_size: existing[0].result_size, bettor_ids: [] };
      resolvedCache.set(period_number, res);
      return res;
    }

    const [ov] = await db.query('SELECT admin_override FROM wingo_periods WHERE period_number=?', [period_number]);
    let num;

    if (ov.length && ov[0].admin_override !== null && ov[0].admin_override !== undefined) {
      num = parseInt(ov[0].admin_override);
    } else {
      const [bets] = await db.query('SELECT * FROM wingo_bets WHERE period_number=? AND status=?', [period_number, 'pending']);
      
      if (bets.length > 0) {
        const betsData = [];
        for (const bet of bets) {
          const expectedWin = bet.bet_amount * (bet.bet_type === 'number' ? 9 : 2);
          const rig = await checkRigState(bet.user_id);
          betsData.push({ ...bet, allowed: (rig && rig.isWin === true && rig.maxAllowedWin >= expectedWin) });
        }

        let bestNum = Math.floor(Math.random() * 10);
        let minPenalty = Infinity;

        for (let i = 0; i < 10; i++) {
            let penalty = 0;
            const c = COLOR_MAP[i];
            const s = SIZE_MAP[i];

            for (const bet of betsData) {
                let wouldWin = 0;
                if (bet.bet_type === 'number' && parseInt(bet.bet_value) === i) wouldWin = bet.bet_amount * 9;
                else if (bet.bet_type === 'color' && bet.bet_value === c) wouldWin = bet.bet_amount * (c === 'violet' ? 5 : 2);
                else if (bet.bet_type === 'size' && bet.bet_value === s) wouldWin = bet.bet_amount * 2;

                if (wouldWin > 0) {
                    if (!bet.allowed) penalty += 1000000 + wouldWin; 
                    else penalty -= wouldWin; 
                }
            }

            if (penalty < minPenalty) {
                minPenalty = penalty;
                bestNum = i;
            }
        }
        num = bestNum;
      } else {
        num = Math.floor(Math.random() * 10);
      }
    }

    const color = COLOR_MAP[num];
    const size = SIZE_MAP[num];

    if (ov.length) {
        await db.query(`UPDATE wingo_periods SET result_number=?, result_color=?, result_size=?, status='closed' WHERE period_number=?`,
          [num, color, size, period_number]);
    } else {
        await db.query(`INSERT INTO wingo_periods (period_number, result_number, result_color, result_size, status) VALUES (?,?,?,?,'closed')`,
          [period_number, num, color, size]);
    }

    const [bets2] = await db.query('SELECT * FROM wingo_bets WHERE period_number=? AND status=?', [period_number, 'pending']);
    const bettorIds = [];
    for (const bet of bets2) {
      let won = false, mult = 0;
      if (bet.bet_type === 'color' && bet.bet_value === color) { won = true; mult = color === 'violet' ? 5 : 2; }
      else if (bet.bet_type === 'size' && bet.bet_value === size) { won = true; mult = 2; }
      else if (bet.bet_type === 'number' && parseInt(bet.bet_value) === num) { won = true; mult = 9; }

      const win = won ? Math.floor(bet.bet_amount * mult) : 0;
      await db.query('UPDATE wingo_bets SET status=? WHERE id=?', [won ? 'won' : 'lost', bet.id]);

      if (won) {
        await payWin(bet.user_id, win);
        await db.query('UPDATE users SET total_wins=total_wins+1 WHERE id=?', [bet.user_id]);
        bettorIds.push(bet.user_id);
      }
      await db.query('INSERT INTO game_history (user_id, game, bet, payout, result) VALUES (?,?,?,?,?)',
        [bet.user_id, 'wingo', bet.bet_amount, win, `#${num} ${color} ${size} | ${bet.bet_type}:${bet.bet_value} | ${won?'WIN':'LOSS'}`]);
    }

    const finalResult = { success: true, result_number: num, result_color: color, result_size: size, bettor_ids: bettorIds };
    resolvedCache.set(period_number, finalResult);
    setTimeout(() => resolvedCache.delete(period_number), 300000); // 5 min cache clear
    return finalResult;

  } catch (e) {
    console.error("Wingo Resolve Error: ", e);
    return { success: false, message: e.message };
  } finally {
    resolvingPeriods.delete(period_number);
  }
}

// ── WINGO API ROUTES ──
router.get('/wingo/period', authMiddleware, (req, res) => {
  const timer = parseInt(req.query.timer) || 2; 
  const { period, secondsLeft } = getCurrentPeriod(timer);
  res.json({ success: true, period, seconds_left: secondsLeft });
});

router.post('/wingo/bet', authMiddleware, async (req, res) => {
  try {
    const { period_number, bet_type, bet_value, bet_amount, timer } = req.body;
    const bet = parseInt(bet_amount);
    const timeMode = parseInt(timer) || 2; 
    if (!bet || bet < 10) return res.json({ success: false, message: 'Min bet 10' });

    const [gs] = await db.query("SELECT is_enabled FROM game_settings WHERE game_name='wingo'");
    if (gs.length && !gs[0].is_enabled) return res.json({ success: false, message: 'Wingo disabled' });

    const { secondsLeft } = getCurrentPeriod(timeMode);
    if (secondsLeft < 5) return res.json({ success: false, message: 'Betting closed!' });

    await deductBet(req.user.id, bet);
    await db.query('INSERT INTO wingo_bets (period_number, user_id, bet_type, bet_value, bet_amount, status) VALUES (?,?,?,?,?,?)',
      [period_number, req.user.id, bet_type, bet_value, bet, 'pending']);

    await db.query('UPDATE users SET total_bets=total_bets+1 WHERE id=?', [req.user.id]);
    const bal = await getBalance(req.user.id);
    res.json({ success: true, ...bal });
  } catch (e) {
    res.json({ success: false, message: e.message });
  }
});

router.post('/wingo/resolve', authMiddleware, async (req, res) => {
  const result = await resolveWingoPeriodCore(req.body.period_number);
  res.json(result);
});

router.get('/wingo/history', authMiddleware, async (req, res) => {
  try {
    const timer = parseInt(req.query.timer) || 2; 
    const [rows] = await db.query(`SELECT * FROM wingo_periods WHERE status='closed' AND period_number LIKE '%_t${timer}' ORDER BY id DESC LIMIT 20`);
    res.json({ success: true, history: rows });
  } catch (e) {
    res.json({ success: false, message: e.message });
  }
});

// ════════════════════════════════════════
// 🃏 CARDS
// ════════════════════════════════════════
router.post('/cards/play', authMiddleware, async (req, res) => {
  try {
    const cardPicked = req.body.selected_card ?? req.body.picked_card;
    const bet = 50; 
    const winAmount = 150; 

    const [gs] = await db.query("SELECT is_enabled FROM game_settings WHERE game_name='cards'");
    if (gs.length && !gs[0].is_enabled) return res.json({ success: false, message: 'Card game disabled' });

    await deductBet(req.user.id, bet);

    const rig = await checkRigState(req.user.id);
    let isWin = false;
    
    if (rig && rig.isWin === true && rig.maxAllowedWin >= winAmount) {
      isWin = true;
    }

    let acePos;
    if (isWin) {
      acePos = parseInt(cardPicked);
    } else {
      const positions = [0, 1, 2];
      const otherPositions = positions.filter(p => p !== parseInt(cardPicked));
      acePos = otherPositions[Math.floor(Math.random() * otherPositions.length)];
    }

    const win = isWin ? winAmount : 0;
    if (win > 0) await payWin(req.user.id, win);

    await db.query('INSERT INTO game_history (user_id, game, bet, payout, result) VALUES (?,?,?,?,?)',
      [req.user.id, 'cards', bet, win, isWin ? `Found the Ace! WIN 🪙${win}` : 'Missed the Ace']);
    await db.query('UPDATE users SET total_bets=total_bets+1 WHERE id=?', [req.user.id]);
    if (isWin) await db.query('UPDATE users SET total_wins=total_wins+1 WHERE id=?', [req.user.id]);

    const bal = await getBalance(req.user.id);
    res.json({ success: true, is_win: isWin, ace_position: acePos, win_amount: win, ...bal });
  } catch (e) {
    res.json({ success: false, message: e.message });
  }
});

// ════════════════════════════════════════
// 💎 JACKPOT
// ════════════════════════════════════════
router.post('/jackpot/buy', authMiddleware, async (req, res) => {
  try {
    const { selected_numbers } = req.body;
    const bet = 100;

    const [gs] = await db.query("SELECT is_enabled FROM game_settings WHERE game_name='jackpot'");
    if (gs.length && !gs[0].is_enabled) return res.json({ success: false, message: 'Jackpot disabled' });

    if (!selected_numbers || selected_numbers.length !== 5) return res.json({ success: false, message: 'Pick exactly 5 numbers' });

    await deductBet(req.user.id, bet);

    const rig = await checkRigState(req.user.id);
    let targetWin = 0;
    
    if (rig && rig.isWin === true) {
      if (rig.maxAllowedWin >= 300) targetWin = 300;
      else if (rig.maxAllowedWin >= 150) targetWin = 150;
      else if (rig.maxAllowedWin >= 50) targetWin = 50;
    }

    let winning = [];
    if (targetWin === 300) {
      winning = [...selected_numbers]; 
    } else if (targetWin === 150) {
      winning = selected_numbers.slice(0, 3); 
      while (winning.length < 5) {
        const n = Math.floor(Math.random() * 35) + 1;
        if (!winning.includes(n) && !selected_numbers.includes(n)) winning.push(n);
      }
    } else if (targetWin === 50) {
      winning = [selected_numbers[0]]; 
      while (winning.length < 5) {
        const n = Math.floor(Math.random() * 35) + 1;
        if (!winning.includes(n) && !selected_numbers.includes(n)) winning.push(n);
      }
    } else {
      let attempts = 0;
      while (winning.length < 5 && attempts < 200) {
        const n = Math.floor(Math.random() * 35) + 1;
        if (!winning.includes(n) && !selected_numbers.includes(n)) winning.push(n);
        attempts++;
      }
      while (winning.length < 5) {
         const n = Math.floor(Math.random() * 35) + 1;
         if (!winning.includes(n)) winning.push(n);
      }
    }

    const matched = selected_numbers.filter(n => winning.includes(n));
    let win = 0;
    if (matched.length >= 5) win = 300;
    else if (matched.length >= 3) win = 150;
    else if (matched.length >= 1) win = 50;

    if (win > 0) await payWin(req.user.id, win);

    await db.query('INSERT INTO game_history (user_id, game, bet, payout, result) VALUES (?,?,?,?,?)',
      [req.user.id, 'jackpot', bet, win, `${matched.length}/5 match | ${win > 0 ? 'WIN' : 'LOSS'}`]);
    await db.query('UPDATE users SET total_bets=total_bets+1 WHERE id=?', [req.user.id]);
    if (win > 0) await db.query('UPDATE users SET total_wins=total_wins+1 WHERE id=?', [req.user.id]);

    const bal = await getBalance(req.user.id);
    res.json({ success: true, winning_numbers: winning, matched_numbers: matched, matches: matched.length, win_amount: win, ...bal });
  } catch (e) {
    res.json({ success: false, message: e.message });
  }
});

// ════════════════════════════════════════
// ✈️ AVIATOR
// ════════════════════════════════════════
const aviatorSessions = new Map();

router.post('/aviator/start', authMiddleware, async (req, res) => {
  try {
    const { bet_amount } = req.body;
    const bet = parseInt(bet_amount);
    
    if (!bet || bet < 10 || bet > 5000) return res.json({ success: false, message: 'Invalid bet (10-5000)' });

    const [gs] = await db.query("SELECT is_enabled FROM game_settings WHERE game_name='aviator'");
    if (gs.length && !gs[0].is_enabled) return res.json({ success: false, message: 'Aviator disabled' });

    await deductBet(req.user.id, bet);
    await db.query('UPDATE users SET total_bets=total_bets+1 WHERE id=?', [req.user.id]);

    const rig = await checkRigState(req.user.id);
    let crashAt;

    if (rig && rig.isWin === true && rig.maxAllowedWin > 0) {
      let maxCrash = Math.floor((rig.maxAllowedWin / bet) * 100) / 100;
      
      if (maxCrash <= 1.00) {
        crashAt = 1.00; 
      } else {
        let safeHigh = Math.min(maxCrash, 5.00); 
        let safeLow = Math.max(1.10, Math.min(1.50, maxCrash - 0.10));
        crashAt = Math.round((safeLow + Math.random() * (safeHigh - safeLow)) * 100) / 100;
      }
    } else {
      crashAt = 1.00; 
    }

    const sessionId = `av_${req.user.id}_${Date.now()}`;
    aviatorSessions.set(sessionId, { userId: req.user.id, bet, crashAt, startTime: Date.now(), cashed: false });

    setTimeout(() => aviatorSessions.delete(sessionId), 180000);

    const bal = await getBalance(req.user.id);
    res.json({ success: true, session_id: sessionId, crash_at: crashAt, ...bal });
  } catch (e) {
    res.json({ success: false, message: e.message });
  }
});

router.post('/aviator/cashout', authMiddleware, async (req, res) => {
  try {
    const { session_id, multiplier } = req.body;
    const mult = parseFloat(multiplier);

    if (!session_id || !aviatorSessions.has(session_id)) return res.json({ success: false, message: 'Invalid or expired session' });
    const session = aviatorSessions.get(session_id);

    if (session.userId !== req.user.id) return res.json({ success: false, message: 'Not your session' });
    if (session.cashed) return res.json({ success: false, message: 'Already cashed out' });
    if (mult > session.crashAt) return res.json({ success: false, message: `Crashed at ${session.crashAt}x!` });
    if (mult < 1.00) return res.json({ success: false, message: 'Invalid multiplier' });

    session.cashed = true;
    const win = Math.floor(session.bet * mult);
    await payWin(req.user.id, win);

    await db.query('UPDATE users SET total_wins=total_wins+1 WHERE id=?', [req.user.id]);
    await db.query('INSERT INTO game_history (user_id, game, bet, payout, result) VALUES (?,?,?,?,?)',
      [req.user.id, 'aviator', session.bet, win, `Cashout at ${mult}x | Crash was ${session.crashAt}x | WIN +🪙${win}`]);

    aviatorSessions.delete(session_id);
    const bal = await getBalance(req.user.id);
    res.json({ success: true, win_amount: win, multiplier: mult, crash_at: session.crashAt, ...bal });
  } catch (e) {
    res.json({ success: false, message: e.message });
  }
});

router.post('/aviator/crash', authMiddleware, async (req, res) => {
  try {
    const { session_id } = req.body;
    if (!session_id || !aviatorSessions.has(session_id)) return res.json({ success: true });

    const session = aviatorSessions.get(session_id);
    if (session.cashed) return res.json({ success: true });

    session.cashed = true;
    await db.query('INSERT INTO game_history (user_id, game, bet, payout, result) VALUES (?,?,?,?,?)',
      [req.user.id, 'aviator', session.bet, 0, `Crashed at ${session.crashAt}x | LOSS -🪙${session.bet}`]);

    aviatorSessions.delete(session_id);
    const bal = await getBalance(req.user.id);
    res.json({ success: true, ...bal });
  } catch (e) {
    res.json({ success: false, message: e.message });
  }
});

router.get('/aviator/history', authMiddleware, async (req, res) => {
  try {
    const [rows] = await db.query(`SELECT result FROM game_history WHERE game='aviator' ORDER BY id DESC LIMIT 15`);
    const history = rows.map(r => {
      const m = r.result.match(/Crash(?:ed)? (?:was |at )?(\d+\.?\d*)x/i);
      return m ? parseFloat(m[1]) : null;
    }).filter(Boolean);
    res.json({ success: true, history });
  } catch (e) {
    res.json({ success: false, message: e.message });
  }
});

// ════════════════════════════════════════
// 🤖 24/7 BACKGROUND DAEMON FOR WINGO
// ════════════════════════════════════════
setInterval(() => {
  // Check har second, aur aakhri ke 2 second bache ho toh automatically resolve kardo
  [1, 2, 3].forEach(mode => {
    const { period, secondsLeft } = getCurrentPeriod(mode);
    if (secondsLeft <= 2) {
      resolveWingoPeriodCore(period).catch(err => console.error(`[Wingo Daemon] Error resolving ${period}:`, err));
    }
  });
}, 1000);

module.exports = router;