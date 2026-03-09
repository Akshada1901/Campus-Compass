# 🧭 Campus Compass

**Lost & Found Management System** — DBMS Project

![HTML5](https://img.shields.io/badge/HTML5-E34F26?style=flat-square&logo=html5&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-339933?style=flat-square&logo=node.js&logoColor=white)
![MySQL](https://img.shields.io/badge/MySQL-4479A1?style=flat-square&logo=mysql&logoColor=white)
![Express.js](https://img.shields.io/badge/Express.js-000000?style=flat-square&logo=express&logoColor=white)

A full-stack web app for managing lost and found items on a college campus. Students can report lost items, browse found items, and track collection status — all connected to a live MySQL database.

---

## ✨ Features

- 🔐 Register & Login with JWT authentication
- 📋 Report lost items with photo, date, location & description
- 🔍 Browse & search found items by category
- 📊 Status board with live stats and contact info (name, reg no, phone, email)
- ✅ Mark items as collected

---

## 🗂️ Project Structure

```
campus_lost_found/
│
├── backend/
│   ├── server.js                          ← Express API — routes, auth, DB queries
│   ├── package.json                       ← Backend dependencies
│   └── .env                               ← DB credentials & JWT secret (not committed)
│
└── frontend/
    ├── index.html                         ← All page markup (landing, login, app)
    │
    ├── styles/
    │   ├── theme/
    │   │   └── variables-and-reset.css    ← Global CSS variables, resets, utilities
    │   └── pages/
    │       ├── landing-page.css           ← Hero, about section, CTA, animations
    │       └── app-pages.css              ← Login, nav, forms, tables, badges
    │
    └── scripts/
        ├── animations/
        │   └── starfield-background.js   ← Animated star canvas on landing page
        └── features/
            ├── authentication.js         ← Login, register, logout, JWT session
            └── lost-and-found.js         ← Forms, status board, item rendering
```

---

## 🗄️ Database Tables

| Table         | Description                        |
|---------------|------------------------------------|
| `users`       | Student/staff login & contact info |
| `categories`  | Item category lookup               |
| `lost_items`  | Lost item reports                  |
| `found_items` | Found item reports                 |
| `claims`      | Links lost ↔ found items           |

---

## 🚀 Setup

**1. Database**
- Open phpMyAdmin → create database `campus_compass`
- Import `sql/schema.sql`

**2. Backend**
```bash
cd backend
npm install
node server.js
# → Running at http://localhost:3000
```

**3. Frontend**
- Open `frontend/index.html` in your browser

---

Built by [@Akshada1901](https://github.com/Akshada1901)

