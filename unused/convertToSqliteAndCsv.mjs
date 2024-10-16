import fs from 'fs-extra';
import path from 'node:path';
import Database from 'better-sqlite3';
import { fileURLToPath } from 'node:url';
import { parse } from 'json2csv';
import createDBjson from './createDB.mjs';


await createDBjson(fs, path, fileURLToPath);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// قراءة ملف JSON
const jsonPath = path.join(__dirname, '../database.json');
const data = fs.readJsonSync(jsonPath);

// إعداد قاعدة البيانات
const db = new Database(path.join(__dirname, '../database.sqlite'));

// إنشاء الجداول
db.exec(`
  CREATE TABLE IF NOT EXISTS Categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    arabicName TEXT NOT NULL,
    englishName TEXT NOT NULL,
    description TEXT,
    icons TEXT
  );

  CREATE TABLE IF NOT EXISTS Topics (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    slug TEXT NOT NULL,
    category_id INTEGER NOT NULL,
    FOREIGN KEY (category_id) REFERENCES Categories(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS Questions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    question_text TEXT NOT NULL,
    link TEXT,
    topic_id INTEGER NOT NULL,
    FOREIGN KEY (topic_id) REFERENCES Topics(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS Answers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    answer_text TEXT NOT NULL,
    is_correct INTEGER NOT NULL,
    question_id INTEGER NOT NULL,
    FOREIGN KEY (question_id) REFERENCES Questions(id) ON DELETE CASCADE
  );
`);

// إضافة الفئات الرئيسية إلى جدول Categories
const insertCategoryStmt = db.prepare(`
  INSERT INTO Categories (arabicName, englishName, description, icons) VALUES (?, ?, ?, ?)
`);

// إضافة المواضيع إلى جدول Topics
const insertTopicStmt = db.prepare(`
  INSERT INTO Topics (name, slug, category_id) VALUES (?, ?, ?)
`);

// إضافة الأسئلة إلى جدول Questions
const insertQuestionStmt = db.prepare(`
  INSERT INTO Questions (question_text, link, topic_id) VALUES (?, ?, ?)
`);

// إضافة الإجابات إلى جدول Answers
const insertAnswerStmt = db.prepare(`
  INSERT INTO Answers (answer_text, is_correct, question_id) VALUES (?, ?, ?)
`);

// استخدام معرفات فريدة
data.mainCategories.forEach(category => {
  // إدخال الفئة
  const categoryId = insertCategoryStmt.run(category.arabicName, category.englishName, category.description, category.icons).lastInsertRowid;

  category.topics.forEach(topic => {
    // إدخال الموضوع
    const topicId = insertTopicStmt.run(topic.name, topic.slug, categoryId).lastInsertRowid;

    // إضافة الأسئلة إلى جدول Questions
    topic.levelsData.level1.forEach(question => {
      // إدخال السؤال
      const questionId = insertQuestionStmt.run(question.q, question.link, topicId).lastInsertRowid;

      // إضافة الإجابات إلى جدول Answers
      question.answers.forEach(answer => {
        // التحقق من أن answer.answer ليس null أو undefined
        if (answer.answer !== null && answer.answer !== undefined) {
          // استخدام questionId هنا لضمان الربط الصحيح
          insertAnswerStmt.run(answer.answer, answer.t, questionId);
        } else {
          console.error(`Skipping invalid answer for question ID ${questionId}: ${JSON.stringify(answer)}`);
        }
      });
    });
  });
});

// تحويل البيانات إلى CSV
const categoriesCSV = parse(data.mainCategories);
fs.writeFileSync(path.join(__dirname, '../database.csv'), categoriesCSV);
