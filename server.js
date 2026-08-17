const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');

const app = express();
app.use(express.json());
app.use(cors());

// เชื่อมต่อ MongoDB (ใช้ Connection String ของคุณ)
const MONGO_URI = process.env.MONGO_URI || "ใส่_MongoDB_Connection_String_ของคุณตรงนี้";
mongoose.connect(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => console.log("MongoDB Connected Successfully"))
    .catch(err => console.log("MongoDB Connection Error: ", err));

// --- Schemas & Models ---
const UserSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, default: 'member' }, // 'admin' หรือ 'member'
    balance: { type: Number, default: 0 }
});
const User = mongoose.model('User', UserSchema);

const GameSchema = new mongoose.Schema({
    title: { type: String, required: true },
    sub: { type: String },
    price: { type: String, default: 'MOD Available' },
    status: { type: String, default: 'safe' }, // safe, updating, down
    statusText: { type: String, default: 'Undetected (ปลอดภัย 100%)' },
    modLink: { type: String, default: '#' },
    gameLink: { type: String, default: '#' },
    images: [String],
    glowColor: { type: String, default: 'rgba(0, 255, 204, 0.35)' },
    accentColor: { type: String, default: '#00ffcc' }
});
const Game = mongoose.model('Game', GameSchema);

const KeySchema = new mongoose.Schema({
    gameId: { type: String, required: true },
    days: { type: Number, required: true },
    keyCode: { type: String, required: true, unique: true },
    isUsed: { type: Boolean, default: false }
});
const KeyStore = mongoose.model('KeyStore', KeySchema);


// --- API Routes ---

// 1. สมัครสมาชิก (Register)
app.post('/api/auth/register', async (req, res) => {
    try {
        const { username, password } = req.body;
        const existingUser = await User.findOne({ username });
        if (existingUser) return res.status(400).json({ error: "ชื่อผู้ใช้นี้ถูกใช้งานแล้ว" });

        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = new User({ username, password: hashedPassword, role: 'member' });
        await newUser.save();
        res.json({ message: "สมัครสมาชิกสำเร็จ" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 2. เข้าสู่ระบบ (Login - รองรับทั้ง Admin และ User)
app.post('/api/auth/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        const user = await User.findOne({ username });
        if (!user) return res.status(400).json({ error: "ไม่พบชื่อผู้ใช้นี้ในระบบ" });

        // กรณีแอดมินตั้งรหัสผ่านตรงๆ หรือเช็คผ่าน bcrypt
        let isMatch = false;
        if (user.role === 'admin') {
            isMatch = (password === user.password) || (await bcrypt.compare(password, user.password));
        } else {
            isMatch = await bcrypt.compare(password, user.password);
        }

        if (!isMatch) return res.status(400).json({ error: "รหัสผ่านไม่ถูกต้อง" });

        res.json({ message: "เข้าสู่ระบบสำเร็จ", user: { username: user.username, role: user.role, balance: user.balance } });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 3. ดึงรายการเกมทั้งหมด (หน้าร้านใช้งาน)
app.api = app.get('/api/games', async (req, res) => {
    try {
        const games = await Game.find();
        res.json(games);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 4. แอดมิน: เพิ่มเกมใหม่
app.post('/api/admin/games', async (req, res) => {
    try {
        const newGame = new Game(req.body);
        await newGame.save();
        res.json({ message: "เพิ่มเกมสำเร็จ", game: newGame });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 5. แอดมิน: ลบเกม
app.delete('/api/admin/games/:id', async (req, res) => {
    try {
        await Game.findByIdAndDelete(req.params.id);
        res.json({ message: "ลบเกมสำเร็จ" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 6. แอดมิน: จัดการเปลี่ยนรหัสผ่าน User
app.put('/api/admin/user/password', async (req, res) => {
    try {
        const { username, newPassword } = req.body;
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        await User.findOneAndUpdate({ username }, { password: hashedPassword });
        res.json({ message: "เปลี่ยนรหัสผ่านสำเร็จ" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
