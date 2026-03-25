const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const pkg = require('../package.json');
const appName = pkg.name;
const version = pkg.version;
const reactNativeVersion = pkg.dependencies['react-native'];

const nodeVersion = process.version;

// 获取当前时间并转为东八区 ISO 格式
function getBeijingISOTime() {
    const now = new Date();
    const beijingOffset = 8 * 60; // 东八区偏移分钟
    const local = new Date(now.getTime() + beijingOffset * 60 * 1000);

    const pad = (n) => n.toString().padStart(2, '0');

    const year = local.getUTCFullYear();
    const month = pad(local.getUTCMonth() + 1);
    const day = pad(local.getUTCDate());
    const hour = pad(local.getUTCHours());
    const minute = pad(local.getUTCMinutes());
    const second = pad(local.getUTCSeconds());

    return `${year}-${month}-${day} ${hour}:${minute}:${second}`;
}

// 获取 Git commit hash
let commitHash = 'unknown';
try {
    commitHash = execSync('git rev-parse --short HEAD').toString().trim();
} catch (e) {
    console.warn('⚠️ 获取 git commit hash 失败:', e.message);
}

const buildTime = getBeijingISOTime();
const versionTag = `v${version}+${buildTime.slice(0,10).replace(/-/g, '')}.${commitHash}`;

const data = {
    appName,
    version,
    buildTime,
    commitHash,
    versionTag,
    nodeVersion,
    reactNativeVersion,
};

const outputPath = path.resolve(__dirname, '../src/config/_generated/version.json');
fs.writeFileSync(outputPath, JSON.stringify(data, null, 2));
console.log('生成 version.json:', data);
