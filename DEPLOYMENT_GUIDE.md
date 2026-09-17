# 🚀 คู่มือการนำ LifeOS ขึ้นสู่เว็บ (Deployment Guide to Render.com)

คู่มือนี้สรุปขั้นตอนการนำเว็บ **LifeOS (Companion AI & Financial Simulator)** ขึ้นใช้งานบนอินเทอร์เน็ตจริงผ่าน **Render.com** (ฟรีตลอด 24 ชั่วโมง)

---

## 📌 สรุปขั้นตอน 3 ขั้นตอนหลัก

### ขั้นตอนที่ 1: นำโค้ดขึ้น GitHub (Push Code to GitHub)

1. เปิด **Git Bash** หรือ **Terminal / PowerShell** ในโฟลเดอร์โครงการนี้ (`c:\BumjiJob\LifeOS`)
2. ตรวจสอบและ Commit โค้ดลง Git:
   ```bash
   git init
   git add .
   git commit -m "Initial commit for LifeOS deployment"
   ```
3. สร้าง Repository ใหม่บน [GitHub.com](https://github.com/new) (ตั้งชื่อว่า `LifeOS`)
4. เชื่อมต่อและ Push โค้ดขึ้น GitHub:
   ```bash
   git remote add origin https://github.com/<ชื่อ-username-ของคุณ>/LifeOS.git
   git branch -M main
   git push -u origin main
   ```

---

### ขั้นตอนที่ 2: เชื่อมต่อและ Deploy บน Render.com

1. เข้าไปที่ [Render.com](https://render.com) แล้วลงชื่อเข้าใช้ (สามารถเข้าด้วย GitHub Account ได้เลย)
2. คลิกปุ่ม **New +** ที่มุมขวาบน แล้วเลือก **Web Service**
3. เลือก **Connect a repository** และเลือกโปรเจกต์ `LifeOS` ที่เพิ่ง Push ขึ้นไป
4. Render จะสแกนอ่านไฟล์ `render.yaml` ให้อัตโนมัติ:
   - **Name:** `lifeos-app`
   - **Environment:** `Node`
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
5. ในช่อง **Environment Variables** ให้เพิ่มค่า:
   - **Key:** `OPENAI_API_KEY`
   - **Value:** `<ใส่ OpenAI API Key ของคุณ>` (หากยังไม่มี สามารถใส่เป็น `dummy_key` เพื่อรันในโหมด Demo ก่อนได้)
6. กดปุ่ม **Create Web Service**

---

### ขั้นตอนที่ 3: รับลิงก์เว็บพร้อมใช้งาน (Web URL)

- Render จะเริ่มการ Build และ Deploy (ใช้เวลาประมาณ 2-3 นาที)
- เมื่อขึ้นสถานะ **Live** คุณจะได้รับ URL ประจำแอปพลิเคชัน เช่น:
  👉 `https://lifeos-app.onrender.com`
- สามารถนำลิงก์นี้ไปเปิดใช้งานบนมือถือ คอมพิวเตอร์ หรือแชร์ให้ผู้อื่นทดลองใช้งานได้ทันที!

---

💡 **คำแนะนำเพิ่มเติม (Free Tier Note):**
- บน Render Free Tier หากไม่มีคำขอเข้ามานานเกิน 15 นาที ระบบจะเข้าสู่โหมดพัก (Sleep)
- เมื่อมีคนเปิดหน้าเว็บขึ้นมาใหม่ ระบบจะใช้เวลาตื่นประมาณ 30-40 วินาทีในครั้งแรก หลังจากนั้นจะทำงานได้ลื่นไหลตามปกติครับ
