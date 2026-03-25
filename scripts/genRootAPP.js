const fs = require('fs');
const path = require('path');
const app = process.env.app || 'all';

console.log('build app =', app);

const appTSXFile = path.resolve(__dirname, '../src/config/_generated/App.tsx');
let content = '';

switch (app) {
    case 'dictionary':
        content = fs.readFileSync(path.resolve(__dirname, './template/dictionary.tsx'), 'utf8');
        content = content.replaceAll("'../../src/", "'../../");
        break;
    case 'download':
        content = fs.readFileSync(path.resolve(__dirname, './template/download.tsx'), 'utf8');
        content = content.replaceAll("'../../src/", "'../../");
        break;
    default:
        content = fs.readFileSync(path.resolve(__dirname, '../App.tsx'), 'utf8');
        content = content.replaceAll("'./src/", "'../../");
}

fs.writeFileSync(appTSXFile, content,'utf-8');
