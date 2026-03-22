# 🎰 Lucky Fortune Casino — Project Info
> Yeh file Claude ko upload karo jab bhi nayi session start karo — sab context mil jayega.
> Last Updated: March 2026

---

## 📌 Project Name: Lucky Fortune Casino
## 🗂️ Stack: Node.js + Express + MySQL (port 5000) | React + Vite Frontend (port 5173)

---

## 📁 Folder Structure
```
lucky-fortune/
├── backend/
│   ├── server.js           ← Main Express server (port 5000)
│   ├── routes/
│   │   ├── auth.js         ← Login, Register, Daily Bonus, Profile, Avatar, Refer
│   │   ├── games.js        ← Aviator, Slots, Wingo, Cards, Jackpot
│   │   ├── wallet.js       ← Balance, Deposit, Withdraw, History, Leaderboard
│   │   └── admin.js        ← Admin panel routes
│   ├── config/db.js        ← MySQL pool connection
│   ├── middleware/auth.js  ← JWT verify middleware
│   ├── database.sql        ← Full MySQL schema
│   ├── .env                ← DB credentials + JWT secret
│   └── package.json
└── frontend/
    ├── src/
    │   ├── App.jsx           ← Router + MainLayout + Particles
    │   ├── main.jsx          ← Entry point
    │   ├── index.css         ← Global casino dark theme CSS
    │   ├── api/axios.js      ← Axios instance (baseURL: /api)
    │   ├── context/
    │   │   ├── AuthContext.jsx  ← user, coins, bonus, withdrawable, gameSettings, siteSettings
    │   │   └── UIContext.jsx    ← toast, modal, confetti
    │   ├── components/
    │   │   ├── Header.jsx/css   ← Avatar(left) + Coins(center) + Telegram+Settings(right)
    │   │   ├── TabBar.jsx/css   ← Bottom nav: HOME|WALLET|HISTORY|RANKS|REFER
    │   │   └── AvatarPicker.jsx ← 30 emoji avatars bottom sheet
    │   └── pages/
    │       ├── Auth.jsx/css     ← Login + Register
    │       ├── Home.jsx/css     ← Jackpot banner, Daily Bonus CLAIM, Games grid
    │       ├── Wallet.jsx/css   ← Deposit, Withdraw (UPI+Bank), History
    │       ├── History.jsx/css  ← Game history with filters
    │       ├── Leaderboard.jsx  ← Top players
    │       ├── Refer.jsx        ← Refer code + share
    │       ├── Profile.jsx/css  ← Edit profile, Change password, Support
    │       ├── Admin.jsx/css    ← Admin panel (5 tabs)
    │       └── games/
    │           ├── Aviator.jsx/css  ← Canvas plane game
    │           ├── Slots.jsx/css    ← 3-reel slot machine with sound
    │           ├── Wingo.jsx/css    ← Color prediction 2-min timer
    │           ├── Cards.jsx/css    ← Find the Ace (SVG cards)
    │           └── Jackpot.jsx/css  ← Pick 5 numbers lotto
    └── package.json
```

---

## 🔐 Credentials & Config

| Item | Value |
|------|-------|
| Admin Login | `admin` / `admin123` |
| JWT Secret | `LuckyFortune_SuperSecret_2024_Casino` |
| DB Name | `u137390330_123` (Hostinger) |
| Server Port | `5000` |
| Frontend Port | `5173` |
| Coin Rate | 1 coin = ₹1 |

---

## 💰 Coin System

| Type | Source | Withdrawable? |
|------|--------|---------------|
| **coins** | Deposit / Total balance | ❌ Deposit nahi |
| **bonus_coins** | Daily / Joining / Refer | ❌ Never |
| **withdrawable_coins** | Game se jeete | ✅ Yes |

- `withdrawable_coins` column users table mein hai (ALTER TABLE add kiya)
- Sirf game wins `withdrawable_coins` mein jaate hain
- Deposit admin approve kare toh sirf `coins` mein jaata hai

---

## 🎮 Games

| Game | Route | Bet | Notes |
|------|-------|-----|-------|
| ✈️ Aviator | `/aviator` | 10-5000 | Canvas plane, HTP, realistic crash |
| 🎰 Slots | `/slots` | 10-5000 | 3 reels, staggered stop, sound |
| 🎨 Wingo | `/wingo` | Min 10 | 2-min timer, color/size/number |
| 🃏 Cards | `/cards` | 20 fixed | SVG Ekka/Badsha/Rani cards, sound |
| 💎 Jackpot | `/jackpot` | 100 fixed | Pick 5 from 35 numbers |

---

## 🖥️ Frontend Pages

| Page | Path | Notes |
|------|------|-------|
| Auth | `/` (if not logged in) | Login + Register tabs |
| Home | `/` | Jackpot banner, Daily bonus, 5 game cards |
| Wallet | `/wallet` | Deposit + Withdraw (UPI/Bank) + History |
| History | `/history` | Game history with filter tabs |
| Leaderboard | `/ranks` | Top 20 players |
| Refer | `/refer` | Refer code + share link |
| Profile | `/profile` | Edit profile, Change password, Support |
| Admin | `/admin` | Dashboard, Users, Payments, Games, Wingo |
| Aviator | `/aviator` | — |
| Slots | `/slots` | — |
| Wingo | `/wingo` | — |
| Cards | `/cards` | — |
| Jackpot | `/jackpot` | — |

---

## 🎁 Bonus System

| Bonus | Amount | Condition |
|-------|--------|-----------|
| Joining | 🎁 50 bonus | Refer code se join karne par |
| Daily | 🎁 50 bonus | Har 24 ghante |
| Refer | 🎁 150 bonus | Jab koi tumhara code use kare |

---

## ⚙️ Admin Panel (5 Tabs)

1. **Dashboard** — Stats: Players, Active Today, Total Bets, Pending
2. **Users** — User list, Add coins, Ban/Unban
3. **Payments** — UPI ID, Site URL, Telegram Link + Approve/Reject deposits
4. **Games** — Toggle ON/OFF: Aviator, Slots, Wingo, Cards, Jackpot
5. **Wingo** — Override next result (0-9)

---

## 📡 API Routes (all prefixed with /api)

```
POST /auth/login
POST /auth/register
POST /auth/daily-bonus
GET  /auth/profile
PUT  /auth/profile
PUT  /auth/change-password
GET  /auth/refer-info

GET  /games/status
POST /games/aviator/start
POST /games/aviator/cashout
POST /games/aviator/crash
GET  /games/aviator/history
POST /games/slots/spin
POST /games/wingo/bet
GET  /games/wingo/period
POST /games/wingo/resolve
GET  /games/wingo/history
POST /games/cards/play       ← uses selected_card OR picked_card
POST /games/jackpot/buy

GET  /wallet/balance
GET  /wallet/transactions
POST /wallet/deposit
POST /wallet/withdraw        ← min ₹500, withdrawable_coins only
GET  /wallet/leaderboard
GET  /wallet/game-history

GET  /admin/stats
GET  /admin/users
PUT  /admin/users/:id/coins
PUT  /admin/users/:id/ban
GET  /admin/deposits
PUT  /admin/deposits/:id
GET  /admin/payment-settings
POST /admin/payment-settings
GET  /admin/game-settings
POST /admin/game-settings
POST /admin/wingo/override
GET  /admin/wingo/current
```

---

## 🐛 Fixed Bugs (all resolved)

| Bug | Fix |
|-----|-----|
| Cards win nahi hoti thi | Backend `picked_card` → `selected_card` mismatch fix |
| Cards win modal timing | Cards flip hone ke 1.2s baad modal show |
| Wingo history nahi aati | `result_number/color/size` → `number/color/size` mapping fix |
| Wallet deposit money withdraw ho rahi thi | `withdrawable_coins` column add kiya |
| Aviator bahut slow tha | Faster formula: `1 + t*0.4 + (t*0.18)^2` |
| Admin mein logout nahi tha | Logout button add kiya |
| Header coins side mein the | Center mein kiya |
| Min withdraw 100 tha | 500 kiya |

---

## 🚀 How to Run

```bash
# Terminal 1 — Backend
cd lucky-fortune/backend
npm install
node server.js

# Terminal 2 — Frontend
cd lucky-fortune/frontend
npm install
npm run dev
```

Browser: http://localhost:5173
Admin setup: http://localhost:5000/create-admin

---

## 💡 Next Session Mein Kaise Resume Karein

1. **Yeh `PROJECT_INFO.md` Claude ko upload karo**
2. Latest changed files bhi upload karo agar koi specific fix chahiye
3. Kaho: *"Yeh mera Lucky Fortune Casino React project hai, [jo change chahiye] karna hai"*
