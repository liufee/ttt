import SQLite from 'react-native-sqlite-storage';
import {AppDBBasePath} from '../constant';
import {Alert} from 'react-native';

SQLite.enablePromise(true);

const directoryPath = `${AppDBBasePath}/dictionary`;


export default class Dictionary {
    private db;

    public constructor() {

    }

    public async init(dbSuffix: string) {
        try {
            this.db = await SQLite.openDatabase( {name: directoryPath + dbSuffix, location: 'default'} );
            await this.createTable();
        } catch (e) {
            Alert.alert('失败', JSON.stringify(e));
            return;
        }
    }



    //创建表
    public async createTable(){
        return new Promise((resolve, reject)=>{
            this.db.transaction((tx) => {
                tx.executeSql(
                    'CREATE TABLE IF NOT EXISTS search_history(id INTEGER PRIMARY KEY AUTOINCREMENT, word TEXT, translation TEXT, status INTEGER, created_at TEXT)',
                    [],
                    () => resolve(true),
                    (error) => reject(error),
                );
            });
        });
    }

    // 查询单词
    public async searchWord(word: string){
        return new Promise((resolve,reject)=>{
            this.db.transaction((tx) => {
                tx.executeSql(
                    'SELECT * FROM stardict where sw = ? limit 1',
                    [word],
                    (_, results) => {resolve(results.rows.raw());},
                    (err) => reject(err),
                );
            });
        });
    }

    // 保存查询记录
    public async saveSearchHistory(record){
        return new Promise((resolve, reject)=>{
            this.db.transaction((tx) => {
                tx.executeSql(
                    'INSERT INTO search_history (word, translation, status, created_at) VALUES (?, ?, ?, ?)',
                    [record.word, record.translation, record.status, record.created_at],
                    () => resolve(true),
                    (error) => reject(error),
                );
            });
        });
    }

    // 查询搜索记录
    public async searchHis(status:Number){
        return new Promise((resolve, reject)=>{
            this.db.transaction((tx) => {
                tx.executeSql(
                    'SELECT * FROM search_history where status=?',
                    [status],
                    (_, results) => {resolve(results.rows.raw());},
                    (err) => reject(err),
                );
            });
        });
    }

    // 修改状态
    public async updateStatus(id, status){
        return new Promise((resolve, reject)=>{
            this.db.transaction((tx) => {
                tx.executeSql(
                    'update search_history set status=? where id=?',
                    [status, id],
                    () => resolve(true),
                    (err) => reject(err),
                );
            });
        });
    }

    // 根据状态获取数量
    public async getCountByStatus(status:number):Promise<Number>{
        return new Promise((resolve, reject)=>{
            this.db.transaction((tx) => {
                tx.executeSql(
                    'SELECT count(id) as total FROM search_history where status=?',
                    [status],
                    (_, results) => { resolve(results.rows.item(0).total);},
                    (err) => reject(err),
                );
            });
        });
    }

    // 删除查询记录
    public async deleteSearchHistory(id){
        return new Promise((resolve, reject)=>{
            this.db.transaction((tx) => {
                tx.executeSql(
                    'delete from search_history where id=?',
                    [id],
                    () => {resolve(true);},
                    (error) => {reject(error);}
                );
            });
        });
    }
}
