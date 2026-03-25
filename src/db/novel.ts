import SQLite from 'react-native-sqlite-storage';
import {Alert} from 'react-native';
import * as stream from "stream";

SQLite.enablePromise(true);

export default class Novel {
    private db;

    public constructor() {

    }

    private static instance: Novel = new Novel();

    public static async init(path:string) {
        await this.instance.init(path);
    }

    public static getInstance(): Novel {
        return Novel.instance;
    }

    public async init(path: string) {
        try {
            this.db = await SQLite.openDatabase({name: path, location: 'default'});
        } catch (e) {
            Alert.alert('失败', JSON.stringify(e));
            return;
        }
    }

    public async changeDataBase(path: string) {
        try {
            this.db = await SQLite.openDatabase({name: path, location: 'default'});
        } catch (e) {
            Alert.alert('失败', JSON.stringify(e));
            return;
        }
    }

    // 搜索小说
    public async searchNovels(page, offset, limit, keyword, platform) {
        let ids = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
        if (platform !== '' && platform !== '0') {
            ids = [Number(platform)];
        }
        let idsStr = ids.join(',');

        return new Promise((resolve, reject) => {
            this.db.transaction((tx) => {
                tx.executeSql(
                    `SELECT id, title, platform, tid
                    FROM novels
                    WHERE platform in (${idsStr})
                        and (title LIKE ? OR content LIKE ?)
                        order by id asc
                    limit ? offset ?`,
                    [`%${keyword}%`, `%${keyword}%`, limit, offset],
                    (_, results) => {
                        const items = [];
                        for (let i = 0; i < results.rows.length; i++) {
                            items.push(results.rows.item(i)); // 提取每一行
                        }
                        tx.executeSql(
                            `SELECT count(id) as total
                            FROM novels
                            WHERE platform in (${idsStr})
                              and (title LIKE ? OR content LIKE ?)`,
                            [`%${keyword}%`, `%${keyword}%`],
                            (tx, countResults) => {
                                const total = countResults.rows.item(0).total;
                                resolve({items, total}); // 返回列表和总条数
                            },
                            (err) => reject(err),
                        );
                    },
                    (err) => reject(err)
                );
            });
        });
    }

    public async getNovel(id) {
        return new Promise((resolve, reject)=>{
            this.db.transaction((tx) => {
                tx.executeSql(
                    'SELECT id,title,content FROM novels where id = ? limit 1',
                    [id],
                    (_, results) => resolve(results.rows.raw()),
                    (err) => reject(err),
                );
            });
        });
    }
}
