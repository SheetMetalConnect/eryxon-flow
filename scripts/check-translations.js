
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const rootDir = path.resolve(__dirname, '..');
const srcDir = path.join(rootDir, 'src');
const localesDir = path.join(srcDir, 'i18n/locales');

// Regex to find t('key') or t("key")
const tRegex = /\bt\(['"]([^'"]+)['"]\)/g;

function getAllFiles(dirPath, arrayOfFiles) {
    const files = fs.readdirSync(dirPath);

    arrayOfFiles = arrayOfFiles || [];

    files.forEach(function (file) {
        if (fs.statSync(dirPath + "/" + file).isDirectory()) {
            arrayOfFiles = getAllFiles(dirPath + "/" + file, arrayOfFiles);
        } else {
            if (file.endsWith('.ts') || file.endsWith('.tsx')) {
                arrayOfFiles.push(path.join(dirPath, file));
            }
        }
    });

    return arrayOfFiles;
}

function getTranslationKeysFromCode() {
    const files = getAllFiles(srcDir);
    const keys = new Set();

    files.forEach(file => {
        const content = fs.readFileSync(file, 'utf-8');
        let match;
        while ((match = tRegex.exec(content)) !== null) {
            keys.add(match[1]);
        }
    });

    return Array.from(keys);
}

function getKeysFromJson(obj, prefix = '') {
    let keys = [];
    for (const key in obj) {
        if (typeof obj[key] === 'object' && obj[key] !== null) {
            keys = keys.concat(getKeysFromJson(obj[key], prefix + key + '.'));
        } else {
            keys.push(prefix + key);
        }
    }
    return keys;
}

function checkTranslations() {
    const codeKeys = getTranslationKeysFromCode();
    const languages = ['en', 'nl', 'de'];

    console.log(`Found ${codeKeys.length} unique translation keys in code.`);

    languages.forEach(lang => {
        const jsonPath = path.join(localesDir, lang, 'translation.json');
        if (!fs.existsSync(jsonPath)) {
            console.error(`Missing translation file for ${lang}: ${jsonPath}`);
            return;
        }

        const jsonContent = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
        const jsonKeys = new Set(getKeysFromJson(jsonContent));

        const missingInJson = codeKeys.filter(key => !jsonKeys.has(key));

        if (missingInJson.length > 0) {
            console.log(`\nMissing keys in ${lang.toUpperCase()}:`);
            missingInJson.forEach(key => console.log(`  - ${key}`));
        } else {
            console.log(`\nAll keys found in ${lang.toUpperCase()}!`);
        }
    });
}

checkTranslations();
