#!/usr/bin/env node

const path = require('path');

function run(task) {
    console.log(`\n▶ running ${task}`);
    require(path.resolve(__dirname, task));
}

run('./genVersion.js');
run('./genRootAPP.js');
run('./genLang.js');

console.log('\n✅ prebuild done\n');
