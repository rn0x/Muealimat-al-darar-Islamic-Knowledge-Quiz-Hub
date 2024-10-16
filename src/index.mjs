import dotenv from 'dotenv';
dotenv.config();
import helmet from 'helmet';
import express from 'express';
import rateLimit from 'express-rate-limit';
import cors from 'cors';
import quizRoutes from './routes/quizRoutes.mjs';
import { logError, logInfo } from './logger.mjs';


const app = express();
const PORT = process.env.PORT || 3000;

// إعداد معدل التحديد: 500 طلب لكل IP في الساعة
const limiter = rateLimit({
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 60 * 60 * 1000, // 1 ساعة كقيمة افتراضية
    max: parseInt(process.env.RATE_LIMIT_MAX, 10) || 500, // الحد الأقصى للطلبات كقيمة افتراضية
    message: {
        success: false,
        message: 'Too many requests from this IP, please try again after an hour.'
    },
    keyGenerator: (req) => req.socket.remoteAddress,
    standardHeaders: true,
    legacyHeaders: false,
});

app.use(helmet());
app.use(cors());
app.use(express.json({ limit: process.env.BODY_SIZE_LIMIT || '10mb' }));
app.use(limiter);

// معالجة خطأ حجم المدخلات الكبير
app.use((err, req, res, next) => {
    if (err.type === 'entity.too.large') {
        return res.status(413).json({
            success: false,
            message: 'Payload too large. Please reduce the size of your input.',
        });
    }
    next(err); // تابع معالجة الأخطاء الأخرى
});


// إعداد المسارات
app.use('/api', quizRoutes);

// مسار توضيحي لأي طلبات غير صحيحة
app.use((req, res) => {
    const currentTime = new Date().toLocaleString('ar-SA', { timeZone: 'Asia/Riyadh' });
    const message = {
        success: false,
        message: '🤔 يبدو أنك طلبت مسارًا غير صحيح!',
        requestedPath: `🔗 المسار المطلوب: ${req.originalUrl}`,
        timestamp: `📅 التاريخ والوقت: ${currentTime}`,
        advice: '⚠️ يرجى التأكد من صحة الرابط أو استخدام واجهة برمجة التطبيقات الصحيحة.'
    };
    res.status(404).json(message);
});


// استخدام middleware لمعالجة الأخطاء العامة
function errorHandler(err, req, res, next) {
    logError('Error:', err);
    res.status(err.status || 500).json({
        success: false,
        message: err.message || 'Internal Server Error',
        stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    });
}
app.use(errorHandler);


// أحداث النظام لإغلاق السيرفر بشكل نظيف
process.on('SIGINT', () => {
    logInfo('🚨 Server is shutting down...');
    process.exit(0);
});

process.on('SIGTERM', () => {
    logInfo('🚨 Server is shutting down due to SIGTERM...');
    process.exit(0);
});

process.on('uncaughtException', async (error) => {
    logError('Uncaught exception:', error);
    process.exit(1); // إنهاء العملية بعد إغلاق المتصفح
});

// تشغيل السيرفر
app.listen(PORT, () => {
    const environment = process.env.NODE_ENV || 'development';
    const rateLimitWindow = process.env.RATE_LIMIT_WINDOW_MS ? `${parseInt(process.env.RATE_LIMIT_WINDOW_MS) / 1000} seconds` : '1 hour';
    const rateLimitMax = process.env.RATE_LIMIT_MAX || 500;

    logInfo(`
        🚀 Server is running successfully on: 
        📍 Server Address: http://localhost:${PORT} 
        🌍 Environment: ${environment} 
        ⏳ Rate Limit Window: ${rateLimitWindow} 
        🚦 Maximum Requests: ${rateLimitMax} requests per hour 
        🎉 Get ready for an amazing learning experience!
    `);
});