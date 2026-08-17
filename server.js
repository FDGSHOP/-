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

// สร้าง Schema สำหรับ Admin
const adminSchema = new mongoose.Schema({
    password: { type: String, default: 'admin123' },
    lastLogin: { type: Date, default: null }
});
const Admin = mongoose.model('admins', adminSchema);

// Endpoint ทดสอบระบบ
app.get('/', (req, res) => res.send("Freedom Backend is Running!"));

// API ตรวจสอบรหัสผ่าน Admin และบันทึกเวลา Log ล่าสุด
app.post('/api/admin/login', async (req, res) => {
    try {
        const { password } = req.body;
        let admin = await Admin.findOne();
        
        // ถ้ายังไม่มีข้อมูลใน DB ให้สร้างค่าเริ่มต้นเป็น admin123
        if (!admin) {
            admin = new Admin({ password: 'admin123' });
            await admin.save();
        }

        if (admin.password === password) {
            const previousLogin = admin.lastLogin;
            // อัปเดตเวลาล็อกอินปัจจุบัน
            admin.lastLogin = new Date();
            await admin.save();

            res.json({ success: true, lastLogin: previousLogin });
        } else {
            res.status(401).json({ error: 'รหัสผ่านไม่ถูกต้อง!' });
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// API สำหรับเปลี่ยนรหัสผ่านแอดมิน
app.post('/api/admin/change-password', async (req, res) => {
    try {
        const { newPassword } = req.body;
        let admin = await Admin.findOne();
        if (!admin) {
            admin = new Admin();
        }
        admin.password = newPassword;
        await admin.save();
        res.json({ success: true, message: 'Password updated successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
