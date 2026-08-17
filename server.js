const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(express.json());
app.use(cors());

// เชื่อมต่อ MongoDB Atlas
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("Connected to MongoDB"))
  .catch(err => console.error(err));

// 1. Schema สำหรับข้อมูลลูกค้า (User / สมัครใช้งาน)
const userSchema = new mongoose.Schema({
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    createdAt: { type: Date, default: Date.now }
});
const User = mongoose.model('users', userSchema);

// 2. Schema สำหรับ Admin และสถานะร้านค้า (เปิด/ปิดซื้อขาย)
const adminSchema = new mongoose.Schema({
    password: { type: String, default: 'admin123' },
    lastLogin: { type: Date, default: null },
    isStoreOpen: { type: Boolean, default: true } // สถานะเปิด-ปิดร้าน
});
const Admin = mongoose.model('admins', adminSchema);

// 3. Schema สำหรับ Key สินค้า
const keySchema = new mongoose.Schema({
    productName: String,
    keyCode: String,
    isSold: { type: Boolean, default: false }
});
const KeyItem = mongoose.model('keys', keySchema);

// --- API ฝั่งลูกค้า ---
// สมัครสมาชิก
app.post('/api/register', async (req, res) => {
    try {
        const { email, password } = req.body;
        const existingUser = await User.findOne({ email });
        if (existingUser) return res.status(400).json({ error: 'อีเมลนี้ถูกใช้งานแล้ว' });

        const newUser = new User({ email, password });
        await newUser.save();
        res.status(201).json({ success: true, message: 'สมัครสมาชิกสำเร็จ' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ล็อกอินลูกค้า
app.post('/api/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email, password });
        if (!user) return res.status(401).json({ error: 'อีเมลหรือรหัสผ่านไม่ถูกต้อง' });
        res.json({ success: true, message: 'เข้าสู่ระบบสำเร็จ' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ดึงสถานะร้านค้าสำหรับลูกค้า
app.post('/api/store-status', async (req, res) => {
    let admin = await Admin.findOne();
    const isOpen = admin ? admin.isStoreOpen : true;
    res.json({ isOpen });
});

// --- API ฝั่งแอดมิน ---
// ล็อกอินแอดมิน (ใช้ช่องทางเดียวกัน แต่เช็ครหัสแอดมิน)
app.post('/api/admin/login', async (req, res) => {
    try {
        const { password } = req.body;
        let admin = await Admin.findOne();
        if (!admin) {
            admin = new Admin({ password: 'admin123' });
            await admin.save();
        }

        if (admin.password === password) {
            const previousLogin = admin.lastLogin;
            admin.lastLogin = new Date();
            await admin.save();
            res.json({ success: true, lastLogin: previousLogin, isStoreOpen: admin.isStoreOpen });
        } else {
            res.status(401).json({ error: 'รหัสผ่านแอดมินไม่ถูกต้อง' });
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// เปลี่ยนรหัสผ่านแอดมิน
app.post('/api/admin/change-password', async (req, res) => {
    try {
        const { newPassword } = req.body;
        let admin = await Admin.findOne();
        if (!admin) admin = new Admin();
        admin.password = newPassword;
        await admin.save();
        res.json({ success: true, message: 'เปลี่ยนรหัสผ่านสำเร็จ' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// เปิด-ปิดสถานะร้านค้า
app.post('/api/admin/toggle-store', async (req, res) => {
    try {
        const { isOpen } = req.body;
        let admin = await Admin.findOne();
        if (!admin) admin = new Admin();
        admin.isStoreOpen = isOpen;
        await admin.save();
        res.json({ success: true, isStoreOpen: admin.isStoreOpen });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// เพิ่ม Key สินค้า
app.post('/api/admin/add-key', async (req, res) => {
    try {
        const { productName, keyCode } = req.body;
        const newKey = new KeyItem({ productName, keyCode });
        await newKey.save();
        res.json({ success: true, message: 'เพิ่ม Key สำเร็จ' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ดูรายการ Key ทั้งหมด
app.get('/api/admin/keys', async (req, res) => {
    try {
        const keys = await KeyItem.find();
        res.json(keys);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
