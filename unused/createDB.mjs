export default async function createDBjson(fs, path, fileURLToPath) {
    // تحديد المسارات الأساسية
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);

    const dbPath = path.join(__dirname, '../database');
    const mainPath = path.join(dbPath, 'main.json');
    const main = fs.readJsonSync(mainPath);

    let obJson = {};
    obJson.description = main.description;
    obJson.mainCategories = [];

    // قراءة الفئات الرئيسية
    for (const [index, element] of main.categories.entries()) {
        const topicPath = path.join(__dirname, '..', element.path);
        const topic = fs.readJsonSync(topicPath);

        obJson.mainCategories.push({
            id: element.id,
            arabicName: element.arabicName,
            englishName: element.englishName,
            description: element.description,
            icons: element.icons,
            topics: [],
        });

        // قراءة المواضيع داخل كل فئة
        for (const item of topic.DataArray) {
            const levelsData = {};

            // قراءة المستويات (1، 2، 3)
            const levelFiles = [item.files[0], item.files[1], item.files[2]];

            levelFiles.forEach((file, idx) => {
                const levelData = fs.readJsonSync(path.join(__dirname, '..', file.path));

                // إعادة ترتيب الـ IDs بشكل متسلسل لكل مستوى
                const cleanedLevelData = levelData.map((entry, newIndex) => ({
                    id: newIndex + 1, // ترتيب من 1 إلى آخر عنصر
                    q: entry.q,
                    link: entry.link,
                    answers: entry.answers,
                }));

                // إضافة البيانات إلى المستويات المقابلة
                levelsData[`level${idx + 1}`] = cleanedLevelData;
            });

            obJson.mainCategories[index].topics.push({
                name: item.arabicName,
                slug: item.englishName,
                levelsData,
            });
        }
    }

    // كتابة الملف النهائي
    fs.writeJsonSync(path.join(__dirname, '../database.json'), obJson, { spaces: 2 });

}