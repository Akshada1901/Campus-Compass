# 🧭 Campus Compass
**Lost & Found Management System** — DBMS Project

![HTML](https://img.shields.io/badge/HTML5-E34F26?style=flat&logo=html5&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-339933?style=flat&logo=nodedotjs&logoColor=white)
![MySQL](https://img.shields.io/badge/MySQL-4479A1?style=flat&logo=mysql&logoColor=white)
![Express](https://img.shields.io/badge/Express.js-000000?style=flat&logo=express&logoColor=white)

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
├── frontend/
│   └── index.html       # Complete UI
├── backend/
│   ├── server.js        # Express REST API
│   └── package.json
└── sql/
    └── schema.sql       # MySQL schema + sample data
```

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

## 🗄️ Database Tables
| Table | Description |
|-------|-------------|
| `users` | Student/staff login & contact info |
| `categories` | Item category lookup |
| `lost_items` | Lost item reports |
| `found_items` | Found item reports |
| `claims` | Links lost ↔ found items |

---

## 👩‍💻 Author
**Akshada B** ·
