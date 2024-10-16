import express from 'express';
import fs from 'fs-extra';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { logError } from '../logger.mjs';

const router = express.Router();

// تحديد المسار المطلق لملف JSON
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const jsonPath = path.join(__dirname, '../../database/database.json');

// قراءة البيانات من ملف JSON
const loadData = async () => {
    try {
        const data = await fs.readJson(jsonPath);
        return data;
    } catch (error) {
        logError('Failed to load JSON data:', error);
        throw new Error('Error loading data');
    }
};

// دالة لاختيار عدد معين من الأسئلة عشوائيًا
const getRandomQuestions = (questions, count) => {
    return questions.sort(() => 0.5 - Math.random()).slice(0, count);
};

// عرض الفئات مع المواضيع الخاصة بكل فئة
router.get('/categories', async (req, res) => {
    try {
        const data = await loadData();
        const categoriesWithTopics = data.mainCategories.map(category => ({
            id: category.id,
            arabicName: category.arabicName,
            englishName: category.englishName,
            description: category.description, // إذا كان هناك وصف
            topics: category.topics.map(topic => ({
                slug: topic.slug,
                name: topic.name,
                description: topic.description, // إذا كان هناك وصف للموضوع
            })),
        }));
        res.json(categoriesWithTopics);
    } catch (error) {
        logError(error.message, error);
        res.status(500).json({ error: error.message });
    }
});

// جلب جميع الأسئلة مع التصفح والحد
router.get('/questions', async (req, res) => {
    const { page = 1, limit = 10 } = req.query; // الصفحة الافتراضية 1 والحد الافتراضي 10 أسئلة لكل صفحة

    try {
        const data = await loadData();
        const allQuestions = [];

        let num = 1;
        data.mainCategories.forEach(category => {
            category.topics.forEach(topic => {
                Object.values(topic.levelsData).flat().forEach(question => {
                    allQuestions.push({
                        ...question,
                        id: num++,
                        category: category.arabicName,
                        topic: topic.name,
                    });
                });
            });
        });

        // حساب إجمالي الصفحات
        const totalQuestions = allQuestions.length;
        const totalPages = Math.ceil(totalQuestions / limit);

        // التحقق من أن الصفحة المطلوبة صالحة
        if (page < 1 || page > totalPages) {
            return res.status(400).json({
                error: 'Invalid page number. Please provide a valid page.',
                totalQuestions,
                totalPages,
            });
        }

        // استخراج الأسئلة المطلوبة للصفحة الحالية
        const startIndex = (page - 1) * limit;
        const endIndex = startIndex + parseInt(limit);

        const questions = allQuestions.slice(startIndex, endIndex);

        // إرسال الاستجابة مع عدد الأسئلة والصفحات
        res.json({
            page: parseInt(page),
            limit: parseInt(limit),
            totalQuestions,
            totalPages,
            questions,
        });
    } catch (error) {
        logError(error.message, error);
        res.status(500).json({ error: error.message });
    }
});

// عرض مواضيع فئة معينة
router.get('/categories/:categoryId/topics', async (req, res) => {
    const { categoryId } = req.params;

    try {
        const data = await loadData();
        const category = data.mainCategories.find(c => c.id === parseInt(categoryId));

        if (!category) {
            return res.status(404).json({ error: 'Category not found' });
        }

        const topics = category.topics.map(topic => ({
            slug: topic.slug,
            name: topic.name,
            description: topic.description, // إذا كان هناك وصف
        }));

        res.json(topics);
    } catch (error) {
        logError(error.message, error);
        res.status(500).json({ error: error.message });
    }
});

// جلب جميع الأسئلة لفئة معينة مع التصفح والحد
router.get('/categories/:categoryId/questions', async (req, res) => {
    const { categoryId } = req.params;
    const { page = 1, limit = 10 } = req.query; // الصفحة الافتراضية 1 والحد الافتراضي 10 أسئلة

    try {
        const data = await loadData();
        const category = data.mainCategories.find(c => c.id === parseInt(categoryId));

        if (!category) {
            return res.status(404).json({ error: 'Category not found' });
        }

        const questions = [];
        category.topics.forEach(topic => {                        
            Object.values(topic.levelsData).flat().forEach(question => {
                questions.push({
                    ...question,
                    category: category.arabicName,
                    topic: topic.name,
                });
            });
        });

        // حساب إجمالي الصفحات
        const totalQuestions = questions.length;
        const totalPages = Math.ceil(totalQuestions / limit);

        // التحقق من أن الصفحة المطلوبة صالحة
        if (page < 1 || page > totalPages) {
            return res.status(400).json({
                error: 'Invalid page number. Please provide a valid page.',
                totalQuestions,
                totalPages,
            });
        }

        // استخراج الأسئلة المطلوبة للصفحة الحالية
        const startIndex = (page - 1) * limit;
        const endIndex = startIndex + parseInt(limit);

        const paginatedQuestions = questions.slice(startIndex, endIndex);

        // إرسال الاستجابة مع عدد الأسئلة والصفحات
        res.json({
            page: parseInt(page),
            limit: parseInt(limit),
            totalQuestions,
            totalPages,
            questions: paginatedQuestions,
        });
    } catch (error) {
        logError(error.message, error);
        res.status(500).json({ error: error.message });
    }
});

// جلب جميع الأسئلة لموضوع معين
router.get('/categories/:categoryId/topics/:slug/questions', async (req, res) => {
    const { categoryId, slug } = req.params;

    try {
        const data = await loadData();
        const category = data.mainCategories.find(c => c.id === parseInt(categoryId));

        if (!category) {
            return res.status(404).json({ error: 'Category not found' });
        }

        const topic = category.topics.find(t => t.slug === slug);
        if (!topic) {
            return res.status(404).json({ error: 'Topic not found' });
        }

        const questions = Object.values(topic.levelsData).flat().map(question => ({
            ...question,
            category: category.arabicName,
            topic: topic.name,
        }));

        res.json(questions);
    } catch (error) {
        logError(error.message, error);
        res.status(500).json({ error: error.message });
    }
});

// جلب أسئلة عشوائية
router.get('/questions/random', async (req, res) => {
    const { count = 5 } = req.query; // عدد الأسئلة العشوائية المطلوبة (افتراضيًا 5)

    try {
        const data = await loadData();
        const allQuestions = [];

        data.mainCategories.forEach(category => {
            category.topics.forEach(topic => {
                Object.values(topic.levelsData).flat().forEach(question => {
                    allQuestions.push({
                        ...question,
                        category: category.arabicName,
                        topic: topic.name,
                    });
                });
            });
        });

        const randomQuestions = getRandomQuestions(allQuestions, parseInt(count));
        res.json(randomQuestions);
    } catch (error) {
        logError(error.message, error);
        res.status(500).json({ error: error.message });
    }
});

// البحث في الأسئلة عبر النص
router.get('/search', async (req, res) => {
    const { q } = req.query;

    try {
        const data = await loadData();
        const results = [];

        data.mainCategories.forEach(category => {
            category.topics.forEach(topic => {
                Object.values(topic.levelsData).flat().forEach(question => {
                    if (question.q.includes(q)) {
                        results.push({
                            ...question,
                            category: category.arabicName,
                            topic: topic.name,
                        });
                    }
                });
            });
        });

        res.json(results);
    } catch (error) {
        logError(error.message, error);
        res.status(500).json({ error: error.message });
    }
});

export default router;
