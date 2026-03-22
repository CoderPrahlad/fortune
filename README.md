# 🎰 Lucky Fortune Casino

## Folder Structure
```
lucky-fortune/
├── backend/          ← Node.js + Express + MySQL
│   ├── server.js
│   ├── routes/
│   ├── config/
│   ├── middleware/
│   ├── .env          ← DB credentials yahan set karo
│   ├── database.sql  ← Pehli baar yeh run karo MySQL mein
│   └── package.json
├── frontend/         ← React + Vite
│   ├── src/
│   └── package.json
└── package.json      ← Root (optional)
```

## Setup Steps

### Step 1 — MySQL Database
```sql
-- MySQL mein run karo:
source /path/to/lucky-fortune/backend/database.sql
```

### Step 2 — .env Edit Karo
`backend/.env` mein apna DB password set karo:
```
DB_HOST=localhost
DB_USER=root
DB_PASS=your_mysql_password
DB_NAME=lucky_fortune_casino
```

### Step 3 — Backend Install & Run
```bash
cd lucky-fortune/backend
npm install
node server.js
```

### Step 4 — Frontend Install & Run
```bash
cd lucky-fortune/frontend
npm install
npm run dev
```

### Step 5 — Browser
```
http://localhost:5173
```

### Step 6 — Admin Account Banao
Browser mein open karo:
```
http://localhost:5000/create-admin
```
Login: admin / admin123

## Ports
- Backend: http://localhost:5000
- Frontend: http://localhost:5173
