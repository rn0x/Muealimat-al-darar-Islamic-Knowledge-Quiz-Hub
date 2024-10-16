# استخدم صورة Node.js الرسمية
FROM node:18-slim

# تعيين دليل العمل في الحاوية
WORKDIR /usr/src/app

# نسخ ملف package.json و package-lock.json
COPY package*.json ./

# تثبيت الاعتماديات
RUN npm install

# نسخ كل الملفات إلى دليل العمل
COPY . .

# تعيين متغير البيئة لـ NODE_ENV إلى الإنتاج
ENV NODE_ENV=production

# الأمر الافتراضي لتشغيل التطبيق
CMD ["npm", "start"]
