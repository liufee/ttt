import SQLite from 'react-native-sqlite-storage';
import {Alert} from 'react-native';
import {AppDBBasePath} from '../constant';

SQLite.enablePromise(true);

const directoryPath = `${AppDBBasePath}/weibo`;

class Weibo{
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
        }catch (e) {
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

    private async createTable(){
        return new Promise((resolve, reject) => {
            this.db.transaction( (tx) => {
                tx.executeSql(
                    'CREATE TABLE IF NOT EXISTS `feeds` (`id` text,`link_href` text,`url` text,`uid` text,`time` datetime,`content` text,`coordinates` text,`location` text,`comment_num` integer,`like_num` integer,`repost_num` integer,`by_id` integer,`retweet_id` text, type integer DEFAULT 1, tsr integer DEFAULT 0, PRIMARY KEY (`id`));',
                    [],
                    () => { resolve(true); },
                    (error) => { reject(error); },
                );
                tx.executeSql(
                    'CREATE TABLE IF NOT EXISTS `pictures` (`id` integer,`type` text,`third_id` text,`picture` text,PRIMARY KEY (`id`));',
                    [],
                    () => { resolve(true); },
                    (error) => { reject(error); },
                );
                tx.executeSql(
                    'CREATE TABLE IF NOT EXISTS `comments` (`id` text,`time` datetime,`like_num` integer,`content` text,`location` text,`reply_to` text,`feed_id` text,`user_id` text,tsr integer DEFAULT 0,PRIMARY KEY (`id`));',
                    [],
                    () => { resolve(true); },
                    (error) => { reject(error); },
                );
                tx.executeSql(
                    'CREATE TABLE IF NOT EXISTS `retweets` (`id` text,`link_href` text,`url` text,`uid` text,`time` datetime,`content` text,`coordinates` text,`location` text,`comment_num` integer,`like_num` integer,`repost_num` integer,`by_id` integer,`retweet_id` text,PRIMARY KEY (`id`));',
                    [],
                    () => { resolve(true); },
                    (error) => { reject(error); },
                );
                tx.executeSql(
                    'CREATE TABLE IF NOT EXISTS `bies` (`id` integer,`url` text,`title` text,PRIMARY KEY (`id`));',
                    [],
                    () => { resolve(true); },
                    (error) => { reject(error); },
                );
                tx.executeSql(
                    'CREATE TABLE IF NOT EXISTS `users` (`id` text,`name` text,`pic` text,`pic_local` text,`home_page` text,PRIMARY KEY (`id`));',
                    [],
                    () => { resolve(true); },
                    (error) => { reject(error); },
                );
                tx.executeSql(
                    'CREATE TABLE IF NOT EXISTS `likes` (`id` integer,`feed_id` text,`user_id` text,`count` integer,PRIMARY KEY (`id`));',
                    [],
                    () => { resolve(true); },
                    (error) => { reject(error); },
                );
                tx.executeSql(
                    'CREATE TABLE IF NOT EXISTS `been_reposts` (`id` text,`feed_id` text,`user_id` text,`content` text,`time` datetime,`href_link` text,`location` text,`url` text,PRIMARY KEY (`id`));',
                    [],
                    () => { resolve(true); },
                    (error) => { reject(error); },
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


    // 创建微博
    public async createWeibo(record){
        return new Promise((resolve, reject) => {
            this.db.transaction( (tx) => {
                tx.executeSql(
                    'INSERT INTO feeds (`id`, `link_href`, `url`, `uid`, `time`, `content`, `coordinates`,`location`, `comment_num`, `like_num`, `repost_num`,`by_id`,`retweet_id`, `type`, `tsr`) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
                    [record.id, record.link_href, record.url, record.uid, record.time, record.content, record.coordinates, record.location, record.comment_num, record.like_num, record.repost_num, record.by_id, record.retweet_id, record.type, record.tsr === '' ? 0 : 1],
                    (tx) => {
                        for (let i in record.medias) {
                            const media = record.medias[i];
                            tx.executeSql(
                                'INSERT INTO pictures (type, third_id, picture) VALUES (?, ?, ?)',
                                [media.type, media.third_id, media.picture],
                                () => {},
                                (error) => {
                                    console.error('保存失败', error);
                                    reject(error);
                                }
                            );
                        }
                        tx.executeSql(
                            'INSERT INTO tsr (type, third_id, tsr) VALUES (?, ?, ?)',
                            ['feed', record.id, record.tsr],
                            () => {
                            },
                            (error) => {
                                console.error('保存失败', error);
                                reject(error);
                            }
                        );
                        resolve(true);
                    },
                    (error) => {
                        console.error('保存失败', error);
                        reject(error);
                    }
                );
            });
        });
    }

    public async deleteWeibo(id){
        return new Promise((resolve, reject)=>{
            this.db.transaction(async (tx) => {
                tx.executeSql(
                    'DELETE from feeds where id=?',
                    [id],
                    () => {resolve(true);},
                    (error) => { reject(error);}
                );
                tx.executeSql(
                    'DELETE from pictures where third_id=?',
                    [id],
                    () => {resolve(true);},
                    (error) => { reject(error);}
                );
                tx.executeSql(
                    'DELETE from comments where feed_id=?',
                    [id],
                    () => {resolve(true);},
                    (error) => { reject(error);}
                );

                tx.executeSql(
                    'DELETE from tsr where type="feed" and third_id=?',
                    [id],
                    () => {resolve(true);},
                    (error) => { reject(error);}
                );
            });
        });
    };

    public async getWeiboByPage(uids:number[], page, offset, limit, types:string[], startDate?:string, endDate?:string, sortOrder:string = 'desc'){
        return new Promise((resolve, reject) => {
            this.db.transaction((tx) => {
                const uidStr = uids.join(',');
                const typesStr = types.join(',');
                let sql = `SELECT * FROM feeds where uid in (${uidStr}) and type in (${typesStr})`;
                let params = [];
                if (startDate) {
                    sql += ' and time >= ?';
                    params.push(startDate);
                }
                if (endDate) {
                    sql += ' and time <= ?';
                    params.push(endDate);
                }
                sql += ` ORDER BY time ${sortOrder}  limit ? offset ?`;
                params.push(limit);
                params.push(offset);
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
                    (error) => {reject(error);}
                );
            });
        });
    }

    public getWeiboByPageWithKeyword (uids:number[], page, offset, limit, types:string[], keyword:string, startDate?:string, endDate?:string, sortOrder:string = 'desc'){
        return new Promise((resolve, reject) => {
            this.db.transaction((tx) => {
                const uidStr = uids.join(',');
                const typesStr = types.join(',');
                let sql = `SELECT feeds.*
                     FROM feeds
                              left join retweets on feeds.retweet_id = retweets.id
                              left join comments on feeds.id = comments.feed_id
                              left join users on retweets.uid = users.id
                     where feeds.uid in (${uidStr})
                       and feeds.type in (${typesStr})
                       and (
                         feeds.content like ? or retweets.content like ? or comments.content like ? or users.name like ?
                         )
                     `;
                let params = ['%' + keyword + '%', '%' + keyword + '%', '%' + keyword + '%', '%' + keyword + '%'];
                if (startDate) {
                    sql += ' and feeds.time >= ?';
                    params.push(startDate);
                }
                if (endDate) {
                    sql += ' and feeds.time <= ?';
                    params.push(endDate);
                }
                sql += ` GROUP BY feeds.id ORDER BY feeds.time ${sortOrder} limit ? offset ?`;
                params.push(limit);
                params.push(offset);
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
                    (error) => {reject(error);}
                );
            });
        });

    }

    public async getWeibo(feedId){
        return new Promise((resolve, reject) => {
            this.db.transaction((tx) => {
                tx.executeSql(
                    `SELECT * FROM feeds where id=?`,
                    [feedId],
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

    public async getAttachments(type: string, thirdIds: string[]){
        return new Promise((resolve, reject) => {
            this.db.transaction((tx) => {
                const thirdIdsStr = thirdIds.map(id => `'${id}'`).join(', ');
                tx.executeSql(
                    `SELECT * FROM pictures where type=? and third_id in (${thirdIdsStr})`,
                    [type],
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

    public async getRetweets(repostIds: string[]){
        return new Promise((resolve, reject) => {
            this.db.transaction((tx) => {
                const repostIdsStr = repostIds.map(id => `'${id}'`).join(', ');
                tx.executeSql(
                    `SELECT * FROM feeds where id in (${repostIdsStr})`,
                    [],
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

    public async getUsers(userIds: string[]){
        return new Promise((resolve, reject) => {
            this.db.transaction((tx) => {
                const userIdsStr = userIds.map(id => `'${id}'`).join(', ');
                tx.executeSql(
                    `SELECT * FROM users where id in (${userIdsStr})`,
                    [],
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
    };

    public async getRetweetsCompatible(retweetIds: string[]) {
        return new Promise((resolve, reject) => {
            this.db.transaction((tx) => {
                const retweetIdsStr = retweetIds.map(id => `'${id}'`).join(', ');
                tx.executeSql(
                    `SELECT * FROM retweets where id in (${retweetIdsStr})`,
                    [],
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
    };

    public async IncrWeibo(field, feedId){
        return new Promise((resolve, reject) => {
            this.db.transaction((tx) => {
                tx.executeSql(
                    `update feeds set ${field}=${field}+1 where id=?`,
                    [feedId],
                    () => {
                        resolve(true)
                    },
                    (error) => {reject(error);}
                );
            });
        });
    };

    public async saveComment(record){
        return new Promise((resolve, reject) => {
            this.db.transaction((tx) => {
                tx.executeSql(
                    `INSERT INTO comments(id, time, like_num, content, location, reply_to, feed_id, user_id, tsr) VALUES(?,?,?,?,?,?,?,?, ?)`,
                    [record.id,  record.time, record.like_num, record.content, record.location, record.reply_to, record.feed_id, record.user_id, record === '' ? 0 : 1],
                    () => {resolve(true)},
                    (error) => {
                        console.log(error);
                        reject(error);
                    }
                );
                for (let i in record.medias) {
                    const media = record.medias[i];
                    tx.executeSql(
                        'INSERT INTO pictures (type, third_id, picture) VALUES (?, ?, ?)',
                        [media.type, media.third_id, media.picture],
                        () => {},
                        (error) => {
                            console.error('保存失败', error);
                            reject(error);
                        }
                    );
                }
                tx.executeSql(
                    'INSERT INTO tsr (type, third_id, tsr) VALUES (?, ?, ?)',
                    ['comment', record.id, record.tsr],
                    () => {resolve(true);},
                    (error) => {reject(error);}
                );
            });
        });
    }

    public async getComments(feedId: string){
        return new Promise((resolve, reject) => {
            this.db.transaction((tx) => {
                tx.executeSql(
                    `SELECT * FROM comments where feed_id=? order by time desc`,
                    [feedId],
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

    public async getCommentsByIds(ids: string[]) {
        const idsStr = ids.join(',')
        return new Promise((resolve, reject) => {
            this.db.transaction((tx) => {
                tx.executeSql(
                    `SELECT * FROM comments where id in (${idsStr})`,
                    [],
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

    public async getBies(){
        return new Promise((resolve, reject) => {
            this.db.transaction((tx) => {
                tx.executeSql(
                    `SELECT * FROM bies`,
                    [],
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

    public async getLikes(feedId: string) {
        return new Promise((resolve, reject) => {
            this.db.transaction((tx) => {
                tx.executeSql(
                    `SELECT * FROM likes where feed_id=?`,
                    [feedId],
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

    public async getBeenReposted(feedId: string){
        return new Promise((resolve, reject) => {
            this.db.transaction((tx) => {
                tx.executeSql(
                    `SELECT * FROM been_reposts where feed_id=?`,
                    [feedId],
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

export default Weibo;
