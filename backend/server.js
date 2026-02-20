// ============================================================
//   CAMPUS COMPASS — Backend Server
//   Stack: Node.js + Express + MySQL + Multer (file uploads)
// ============================================================

const express   = require('express');
const mysql     = require('mysql2/promise');
const multer    = require('multer');
const bcrypt    = require('bcryptjs');
const jwt       = require('jsonwebtoken');
const cors      = require('cors');
const path      = require('path');
const fs        = require('fs');

const app  = express();
const PORT = 3000;
const JWT_SECRET = 'campus_compass_secret_key'; // Change in production!

// ─── MIDDLEWARE ───────────────────────────────────────────────
app.use(cors());
app.use(express.json());
// ─── SERVE FRONTEND FILES ─────────────────────────────────────
// This tells Express to serve your CSS, JS, and Images from the frontend folder
app.use(express.static(path.join(__dirname, '../frontend')));

// This handles the main URL (http://localhost:3000) and sends your HTML file
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend', 'index.html'));
});
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ─── FILE UPLOAD (Multer) ─────────────────────────────────────
if (!fs.existsSync('uploads')) fs.mkdirSync('uploads');

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename:    (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname))
});
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } }); // 5MB max

// ─── DATABASE CONNECTION ──────────────────────────────────────
const db = mysql.createPool({
  host:     'localhost',
  user:     'root',
  password: '',                       // XAMPP default — change if you set a password
  database: 'campus_compass',
  waitForConnections: true,
  connectionLimit: 10
});

// ─── AUTH MIDDLEWARE ──────────────────────────────────────────
function authMiddleware(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token provided' });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
}

// ═══════════════════════════════════════════════════════════════
//   AUTH ROUTES
// ═══════════════════════════════════════════════════════════════

// POST /api/register
app.post('/api/register', async (req, res) => {
  const { full_name, register_no, email, phone, password, role } = req.body;
  if (!full_name || !register_no || !email || !password)
    return res.status(400).json({ error: 'Missing required fields' });
  try {
    const hash = await bcrypt.hash(password, 10);
    const [result] = await db.execute(
      `INSERT INTO users (full_name, register_no, email, phone, password_hash, role)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [full_name, register_no, email, phone, hash, role || 'student']
    );
    res.json({ message: 'Registered successfully', user_id: result.insertId });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY')
      return res.status(409).json({ error: 'Register number or email already exists' });
    res.status(500).json({ error: err.message });
  }
});

// POST /api/login
app.post('/api/login', async (req, res) => {
  const { register_no, password } = req.body;
  try {
    const [rows] = await db.execute(
      'SELECT * FROM users WHERE register_no = ?', [register_no]
    );
    if (!rows.length) return res.status(401).json({ error: 'User not found' });
    const user = rows[0];
    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) return res.status(401).json({ error: 'Incorrect password' });
    const token = jwt.sign(
      { user_id: user.user_id, register_no: user.register_no, role: user.role },
      JWT_SECRET, { expiresIn: '7d' }
    );
    res.json({
      token,
      user: { user_id: user.user_id, full_name: user.full_name,
              register_no: user.register_no, email: user.email,
              phone: user.phone, role: user.role }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ═══════════════════════════════════════════════════════════════
//   LOST ITEMS ROUTES
// ═══════════════════════════════════════════════════════════════

// GET /api/lost-items  — list all lost items with reporter info
app.get('/api/lost-items', async (req, res) => {
  try {
    const [rows] = await db.execute(`
      SELECT l.*, c.category_name,
             u.full_name, u.register_no, u.phone, u.email
      FROM lost_items l
      JOIN users u ON l.user_id = u.user_id
      LEFT JOIN categories c ON l.category_id = c.category_id
      ORDER BY l.reported_at DESC
    `);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/lost-items  — report a new lost item
app.post('/api/lost-items', authMiddleware, upload.single('photo'), async (req, res) => {
  const { item_name, category_id, description, date_lost, location } = req.body;
  if (!item_name || !date_lost || !location)
    return res.status(400).json({ error: 'item_name, date_lost, location are required' });
  const photo_path = req.file ? `/uploads/${req.file.filename}` : null;
  try {
    const [result] = await db.execute(
      `INSERT INTO lost_items (user_id, category_id, item_name, description, date_lost, location, photo_path)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [req.user.user_id, category_id || null, item_name, description, date_lost, location, photo_path]
    );
    res.json({ message: 'Lost item reported', lost_id: result.insertId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/lost-items/:id/status  — update status
app.patch('/api/lost-items/:id/status', authMiddleware, async (req, res) => {
  const { status } = req.body;
  try {
    await db.execute('UPDATE lost_items SET status = ? WHERE lost_id = ?', [status, req.params.id]);
    res.json({ message: 'Status updated' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ═══════════════════════════════════════════════════════════════
//   FOUND ITEMS ROUTES
// ═══════════════════════════════════════════════════════════════

// GET /api/found-items  — list all found items with finder info
app.get('/api/found-items', async (req, res) => {
  try {
    const [rows] = await db.execute(`
      SELECT f.*, c.category_name,
             u.full_name, u.register_no, u.phone, u.email
      FROM found_items f
      JOIN users u ON f.user_id = u.user_id
      LEFT JOIN categories c ON f.category_id = c.category_id
      ORDER BY f.reported_at DESC
    `);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/found-items  — report a newly found item
app.post('/api/found-items', authMiddleware, upload.single('photo'), async (req, res) => {
  const { item_name, category_id, description, date_found, location, kept_at } = req.body;
  if (!item_name || !date_found || !location)
    return res.status(400).json({ error: 'item_name, date_found, location are required' });
  const photo_path = req.file ? `/uploads/${req.file.filename}` : null;
  try {
    const [result] = await db.execute(
      `INSERT INTO found_items (user_id, category_id, item_name, description, date_found, location, kept_at, photo_path)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [req.user.user_id, category_id || null, item_name, description, date_found, location, kept_at, photo_path]
    );
    res.json({ message: 'Found item reported', found_id: result.insertId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/found-items/:id/collect  — mark as collected
app.patch('/api/found-items/:id/collect', authMiddleware, async (req, res) => {
  try {
    await db.execute(
      'UPDATE found_items SET status = "Collected" WHERE found_id = ?', [req.params.id]
    );
    await db.execute(
      'UPDATE claims SET status = "Collected", collected_at = NOW() WHERE found_id = ?', [req.params.id]
    );
    res.json({ message: 'Item marked as collected' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ═══════════════════════════════════════════════════════════════
//   CLAIMS ROUTES
// ═══════════════════════════════════════════════════════════════

// GET /api/claims  — full status board
app.get('/api/claims', async (req, res) => {
  try {
    const [rows] = await db.execute(`
      SELECT cl.*,
             l.item_name AS lost_item, f.item_name AS found_item, f.kept_at,
             owner.full_name  AS owner_name,  owner.register_no  AS owner_regno,
             owner.phone      AS owner_phone, owner.email        AS owner_email,
             finder.full_name AS finder_name, finder.register_no AS finder_regno,
             finder.phone     AS finder_phone,finder.email       AS finder_email
      FROM claims cl
      JOIN lost_items  l      ON cl.lost_id    = l.lost_id
      JOIN found_items f      ON cl.found_id   = f.found_id
      JOIN users       owner  ON cl.claimed_by = owner.user_id
      JOIN users       finder ON f.user_id     = finder.user_id
      ORDER BY cl.claim_date DESC
    `);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/claims  — owner claims a found item
app.post('/api/claims', authMiddleware, async (req, res) => {
  const { lost_id, found_id } = req.body;
  try {
    const [result] = await db.execute(
      `INSERT INTO claims (lost_id, found_id, claimed_by) VALUES (?, ?, ?)`,
      [lost_id, found_id, req.user.user_id]
    );
    await db.execute('UPDATE found_items SET status = "Claimed" WHERE found_id = ?', [found_id]);
    res.json({ message: 'Claim submitted', claim_id: result.insertId });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY')
      return res.status(409).json({ error: 'Already claimed' });
    res.status(500).json({ error: err.message });
  }
});

// ═══════════════════════════════════════════════════════════════
//   STATS ROUTE
// ═══════════════════════════════════════════════════════════════
app.get('/api/stats', async (req, res) => {
  try {
    const [[stats]] = await db.execute(`
      SELECT
        (SELECT COUNT(*) FROM lost_items)                              AS total_lost,
        (SELECT COUNT(*) FROM lost_items  WHERE status = 'Searching') AS still_searching,
        (SELECT COUNT(*) FROM found_items)                             AS total_found,
        (SELECT COUNT(*) FROM found_items WHERE status = 'Unclaimed') AS unclaimed,
        (SELECT COUNT(*) FROM found_items WHERE status = 'Collected') AS collected,
        (SELECT COUNT(*) FROM claims      WHERE status = 'Pending')   AS pending_claims
    `);
    res.json(stats);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── CATEGORIES ───────────────────────────────────────────────
app.get('/api/categories', async (req, res) => {
  const [rows] = await db.execute('SELECT * FROM categories ORDER BY category_name');
  res.json(rows);
});

// ─── START SERVER ─────────────────────────────────────────────
app.listen(PORT, () => console.log(`🧭 Campus Compass server running at http://localhost:${PORT}`));