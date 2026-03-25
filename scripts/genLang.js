const fs = require('fs');
const path = require('path');
const lang = process.env.lang || 'zh';

console.log('build lang =', lang);
let data = {};
switch (lang) {
    case 'en':
        data = {
            "dictionary": {
                "search": "Search",
                "searchWord": "Search",
                "rememberWord": "Remember",
                "newWord": "New Word",
                "wordTest": "Word Test",
                "fail": "Fail",
                "writeChineseOrEnglish": "Input Chinese Character or English word",
                "searching": "Searching",
                "noSearchResult": "No search result",
                "localResult": "Local Searched Result",
                "internetResult": "Internet Searched Result",
                "noNewWords": "No New Words",
                "showTranslation": "Show Translation",
                "delete": "Delete",
                "surelyToDelete": "Surely delete?",
                "originWordIs": "Origin word is",
                "cancel": "Cancel",
                "confirm": "Confirm",
                "noWords": "No words",
                "writeWord": "Write word",
                "ok": "OK",
                "skip": "Skip",
                "correct": "Correct",
                "wrongTrayAgain": "Wrong, try again",
                "success": "Success",
                "hideChinese": "Hide Chinese",
                "showChinese": "Show Chinese",
                "hideExample": "Hide Example",
                "showExample": "Show Example",
                "prevPage": "Prev",
                "nextPage": "Next",
                "loading": "Loading"
            },
        };
        break;
    default:
        data = {
            "dictionary":{
                "search": "搜索",
                "searchWord": "搜索",
                "rememberWord": "背单词",
                "newWord": "新单词",
                "wordTest": "单词测试",
                "fail": "失败",
                "writeChineseOrEnglish": "输入中文或者英文",
                "searching": "搜索中",
                "noSearchResult": "无结果",
                "localResult": "本地结果",
                "internetResult": "网络结果",
                "noNewWords": "没有新单词",
                "showTranslation": "显示翻译",
                "delete": "删除",
                "surelyToDelete": "确定删除？",
                "originWordIs": "原单词为",
                "cancel": "取消",
                "confirm": "确定",
                "noWords": "没有单词",
                "writeWord": "输入单词",
                "ok": "确定",
                "skip": "跳过",
                "correct": "正确",
                "wrongTrayAgain": "错误，请重试",
                "success": "成功",
                "hideChinese": "隐藏中文",
                "showChinese": "显示中文",
                "hideExample": "隐藏例句",
                "showExample": "显示例句",
                "prevPage": "上一页",
                "nextPage": "下一页",
                "loading": "加载中"
            },
        };
}

const outputPath = path.resolve(__dirname, '../src/config/_generated/lang.json');
fs.writeFileSync(outputPath, JSON.stringify(data, null, 2));
console.log('生成 lang.json:', data);
