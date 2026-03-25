import SQLite from 'react-native-sqlite-storage';
import {AppDBBasePath} from '../constant';
import {Alert} from 'react-native';

SQLite.enablePromise(true);

const directoryPath = `${AppDBBasePath}/words`;


export default class Words {
    private db;

    public constructor() {

    }

    public async init() {
        try {
            this.db = await SQLite.openDatabase( {name: directoryPath, location: 'default'} );
        } catch (e) {
            Alert.alert('失败', JSON.stringify(e));
            return;
        }
    }

    public async getWordsByPage(pageNum: number, limit: number){
        const offset = (pageNum - 1) * limit;
        const results = await new Promise((resolve, reject) => {
            this.db.transaction(tx => {
                tx.executeSql(
                    `SELECT id, word, phonetics_us, us_mp3, translation, type, level, examples FROM words LIMIT ? OFFSET ?`,
                    [limit, offset],
                    (_, res) => {
                        const len = res.rows.length;
                        const list = [];
                        for (let i = 0; i < len; i++) {
                            const row = res.rows.item(i);
                            list.push(row);
                        }
                        resolve(list);
                    },
                    (_, err) => reject(err)
                );
            });
        });
        return results;
    }

    public async getTotalCount(){
        const count = await new Promise<number>((resolve, reject) => {
            this.db.transaction(tx => {
                tx.executeSql(
                    `SELECT COUNT(*) as count FROM words`,
                    [],
                    (_, res) => resolve(res.rows.item(0).count),
                    (_, err) => reject(err)
                );
            });
        });
        return count;
    }
}
