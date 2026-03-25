import SQLite from 'react-native-sqlite-storage';
import {AppDBBasePath} from '../constant';
import {Alert} from 'react-native';

SQLite.enablePromise(true);

const directoryPath = `${AppDBBasePath}/exercise`;

class Exercise {
    private db;
    private dbSuffix;

    public constructor() {

    }

    public async init(dbSuffix: string) {
        this.dbSuffix = dbSuffix;
        dbSuffix.length <= 0 && __DEV__ ? dbSuffix = '_debug' : '';
        try {
            this.db = await SQLite.openDatabase({name: directoryPath + dbSuffix, location: 'default'});
            await this.enableWal();
            await this.createTable();
        } catch (e) {
            Alert.alert('失败', JSON.stringify(e));
            return;
        }
    }

    public async reconnectDB(){
        if(!this.db){
            return;
        }
        await this.db.close();
        await this.init(this.dbSuffix);
    }

    private async enableWal(){
        return new Promise((resolve, reject) => {
            this.db.executeSql(
                'PRAGMA journal_mode=WAL;',
                [],
                (result) => {
                    console.log('Journal mode set to:', result.rows.item(0).journal_mode);

                    resolve(true);
                },
                (error) => {
                    reject(error);
                },
            );
        });
    }

    // 创建表
    public async createTable(){
        return new Promise((resolve, reject) => {
            this.db.transaction((tx) => {
                tx.executeSql(
                    'CREATE TABLE IF NOT EXISTS exercise(id INTEGER PRIMARY KEY AUTOINCREMENT, type INTEGER, start_at TEXT, end_at TEXT, status TEXT, ext TEXT, tsr integer DEFAULT 0)',
                    [],
                    () => {resolve(true);},
                    (error) => {reject(error);}
                );
                tx.executeSql(
                    'CREATE TABLE IF NOT EXISTS exercise_run_paths(id INTEGER PRIMARY KEY AUTOINCREMENT, record_id TEXT, paths TEXT)',
                    [],
                    () => {resolve(true);},
                    (error) => {reject(error);}
                );
                tx.executeSql(
                    'CREATE TABLE IF NOT EXISTS run_records(id INTEGER PRIMARY KEY AUTOINCREMENT, start_at TEXT, end_at TEXT, avg_pace TEXT, distance TEXT, duration TEXT, paths TEXT)',
                    [],
                    () => {resolve(true);},
                    (error) => {reject(error);}
                );
                tx.executeSql(
                    'CREATE TABLE IF NOT EXISTS `tsr` (`type` text,`third_id` text,`tsr`,PRIMARY KEY (`type`, `third_id`));',
                    [],
                    () => { resolve(true); },
                    (error) => { reject(error); },
                );
            });
        });
    }

    // 保存打卡记录
    public async saveRecord(record){
        return new Promise((resolve, reject)=>{
            this.db.transaction((tx) => {
                tx.executeSql(
                    'INSERT INTO exercise (type, start_at, end_at, ext, status, tsr) VALUES (?, ?, ?, ?, ?, ?)',
                    [record.type, record.start_at, record.end_at, record.ext, record.status, record.tsr === '' ? 0 : 1],
                    (tx, result) => {
                        if (record.type === 2 && record.paths !== '') {
                            tx.executeSql(
                                'INSERT INTO exercise_run_paths (record_id, paths) VALUES (?, ?)',
                                [result.insertId, record.paths],
                                () => {resolve(true);},
                                (error) => {reject(error);}
                            );
                        }
                        if(record.tsr !== '') {
                            tx.executeSql(
                                'INSERT INTO tsr (type, third_id, tsr) VALUES (?, ?, ?)',
                                [record.tsrType, result.insertId, record.tsr],
                                () => {
                                    resolve(true);
                                },
                                (error) => {
                                    reject(error);
                                }
                            );
                        }
                        resolve(true);
                    },
                    (error) => {reject(error);}
                );
            });
        });
    }


    // 保存打卡记录
    public async updateRecord(id, record) {
        return new Promise((resolve, reject) => {
            this.db.transaction((tx) => {
                tx.executeSql(
                    'UPDATE exercise set start_at=?, end_at=?, ext=?, status=?, tsr=? where id=?',
                    [record.start_at, record.end_at, record.ext, record.status, record.tsr === '' ? 0 : 1, id],
                    () => {
                        if(record.tsr === ''){
                            tx.executeSql(
                                'DELETE FROM tsr where type=? and third_id=?',
                                [record.tsr, record.tsrType, id],
                                () => {resolve(true);},
                                (error) => {reject(error);}
                            );
                        }else {
                            tx.executeSql(
                                'SELECT type,third_id from tsr where type=? and third_id=?',
                                [record.tsrType, id],
                                (tx, results) => {
                                    let sql = '';
                                    let params = [];
                                    if( results.rows.length > 0 ){
                                        sql = 'UPDATE tsr set tsr=? where type=? and third_id=?';
                                        params = [record.tsr, record.tsrType, id];
                                    }else{
                                        sql = 'INSERT INTO tsr(type, third_id, tsr) values(?, ?, ?)';
                                        params = [record.tsrType, id, record.tsr];
                                    }
                                    tx.executeSql(
                                        sql,
                                        params,
                                        () => {resolve(true);},
                                        (error) => {reject(error);}
                                    );
                                },
                                (error) => {reject(error);}
                            );
                        }
                    },
                    (error) => {reject(error);}
                );
            });
        });
    }

    public async deleteRecord(record){
        return new Promise((resolve, reject)=>{
            this.db.transaction((tx) => {
                tx.executeSql(
                    'DELETE from exercise where id=?',
                    [record.id],
                    () => {resolve(true);},
                    (error) => {reject(error);}
                );
                tx.executeSql(
                    'DELETE from exercise_run_paths where record_id=?',
                    [record.id],
                    () => {resolve(true);},
                    (error) => {reject(error);}
                );
            });
        });
    }

    public async saveRunRecord(record){
        return new Promise((resolve, reject)=>{
            this.db.transaction((tx) => {
                tx.executeSql(
                    'INSERT INTO run_records (start_at, end_at, avg_pace, distance, duration, paths) VALUES (?, ?, ?, ?, ?, ?)',
                    [record.start_at, record.end_at, record.avg_pace, record.distance, record.duration, record.paths],
                    () => {resolve(true);},
                    (error) => {reject(error);}
                );
            });
        });
    }

    // 获取打卡记录
    public async getRecordsByType(types: string[], page: number = 1, perPage: number = 10, startTime?: string, endTime?: string, sortOrder:string = 'desc') {
        if (!['asc', 'desc'].includes(sortOrder.toUpperCase())) {
            sortOrder = 'desc';
        }

        const params: (string | number)[] = [];

        let whereClauses: string[] = [];

        // types
        if (types.length > 0) {
            const placeholders = types.map(() => '?').join(',');
            whereClauses.push(`type IN (${placeholders})`);
            params.push(...types);
        }

        // startTime / endTime
        if (startTime) {
            whereClauses.push(`start_at >= ?`);
            params.push(startTime);
        }
        if (endTime) {
            whereClauses.push(`start_at <= ?`);
            params.push(endTime);
        }

        const whereSQL = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

        return new Promise((resolve, reject) => {
            this.db.transaction((tx) => {
                let sql = `SELECT * FROM exercise ${whereSQL} ORDER BY start_at ${sortOrder}`;
                if (page !== -1) {
                    const offset = (page - 1) * perPage;
                    sql += ` LIMIT ? OFFSET ?`;
                    params.push(perPage, offset);
                }
                tx.executeSql(
                    sql,
                    params,
                    (tx, results) => {
                        const records = [];
                        for (let i = 0; i < results.rows.length; i++) {
                            records.push(results.rows.item(i));
                        }
                        resolve(records);
                    },
                    (error) => reject(error)
                );
            });
        });
    }

    // 获取运动详情
    public async getRecordById(id){
        return new Promise((resolve, reject)=>{
            this.db.transaction((tx) => {
                tx.executeSql(
                    'SELECT * FROM exercise where id=?',
                    [id],
                    (tx, results) => {
                        const records = [];
                        for (let i = 0; i < results.rows.length; i++) {
                            records.push(results.rows.item(i));
                        }
                        let record = {};
                        if (records.length > 0) {
                            record = records[0];
                        }
                        if (record.type === 2) {
                            this.db.transaction((tx) => {
                                tx.executeSql(
                                    'SELECT * FROM exercise_run_paths where record_id=? limit 1',
                                    [record.id],
                                    (tx, pathResults) => {
                                        const pathRecords = [];
                                        for (let i = 0; i < pathResults.rows.length; i++) {
                                            pathRecords.push(pathResults.rows.item(i));
                                        }
                                        record.paths = pathRecords.length > 0 ? record.paths = pathRecords[0].paths : '';
                                        resolve(record);
                                    },
                                    (error) => {resolve(error);}
                                );
                            });
                        } else {
                            resolve(record);
                        }
                    },
                    (error) => {reject(error);}
                );
            });
        });
    }

    public async getTSR(type:string, id: string){
        return new Promise((resolve, reject) => {
            this.db.transaction((tx) => {
                tx.executeSql(
                    `SELECT * FROM tsr where type=? and third_id=?`,
                    [type, id],
                    (tx, results) => {
                        const records = [];
                        for (let i = 0; i < results.rows.length; i++) {
                            records.push(results.rows.item(i));
                        }
                        resolve(records);
                    },
                    (error) => {reject(error);}
                );
            });
        });
    }
}
export default Exercise;
