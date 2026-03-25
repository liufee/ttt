import {AbstractService} from '../service';
import {NativeModules} from 'react-native';
import {Setting} from '../setting';
import {AppDBBasePath, ScheduleTask} from '../../constant';
import {Event, EventType} from './model';
import config from '../../config';

export default class ChildrenService extends AbstractService<ChildrenService>{

    protected readonly serviceType = 'children';

    private setting:Setting;
    private dbPath: string;

    protected async onInit(setting:Setting){
        this.setting = setting;
        const dbSuffix = this.setting.global.dbSuffix.length > 0 ? this.setting.global.dbSuffix : (__DEV__ ? '_debug' : '');
        this.dbPath = AppDBBasePath + '/children' + dbSuffix;
        await this.callGo('InitChildrenService', {
            DBPath: this.dbPath,
        });
    }

    public async createEvent(event:Event): Promise<[Boolean, string]> {
        const [success, err] = await this.callGo('CreateChildrenEvent', event);
        if(!success){
            return [false, err];
        }
        this.triggerBackup();
        return [true, ''];
    }

    public async getEvents(children:string[], eventTypes:EventType[], startAt:string, endAt:string, orderBy:string, OrderSort:string, limit:number): Promise<[boolean, Event[], string]> {
        const args = {
            children:children,
            eventTypes: eventTypes,
            startAt:startAt,
            endAt:endAt,
            orderBy:orderBy,
            orderSort:OrderSort,
            limit: limit,
        };
        const [success, result] = await this.callGo('GetEventsByFilter', args);
        if(!success){
            return [false, [], result];
        }
        return [true, result, ''];
    }

    public async deleteEvent(id:string):Promise<[boolean, string]>{
        const [success, result] = await this.callGo('DeleteEventById', id);
        if(!success){
            return [false, result];
        }
        return [true, ''];
    }

    public async backupDB():Promise<[boolean, string]>{
        const args = {
            DBPath: this.dbPath,
            Key: config.encryptKey,
            BackupPath: '/feehiApp/db/' + (__DEV__ ? 'children_debug' : 'children'),
            WEBDAV:{
                URL: config.webdav.webdavURL,
                Username: config.webdav.username,
                Password: config.webdav.password,
            },
        };
        const [success, result] = await this.callGo('BackupDB', args);
        if(!success) {
            return [false, result];
        }
        return [true, ''];
    }

    public async createTables(setting:Setting):Promise<[boolean, string]>{
        this.setting = setting;
        const dbSuffix = this.setting.global.dbSuffix.length > 0 ? this.setting.global.dbSuffix : (__DEV__ ? '_debug' : '');
        this.dbPath = AppDBBasePath + '/children' + dbSuffix;
        const [success, result] = await this.callGo('CreateChildrenTables', {
            DBPath: this.dbPath,
            Stmts: [
                'CREATE TABLE IF NOT EXISTS events (id INTEGER PRIMARY KEY AUTOINCREMENT,child TEXT NOT NULL,event_type TEXT NOT NULL,start_time DATETIME NOT NULL,end_time DATETIME NOT NULL,duration INTEGER NOT NULL,created_at DATETIME DEFAULT CURRENT_TIMESTAMP,updated_at DATETIME DEFAULT CURRENT_TIMESTAMP)',
                'CREATE TABLE IF NOT EXISTS event_meta (id INTEGER PRIMARY KEY AUTOINCREMENT, event_id INTEGER NOT NULL, meta_key TEXT NOT NULL, meta_value TEXT NOT NULL, FOREIGN KEY (event_id) REFERENCES new_born_events(id) ON DELETE CASCADE)',
            ],
        });
        if(!success){
            return [false, result];
        }
        return [true, ''];
    }

    private triggerBackup(){
        NativeModules.RNHelper.scheduleTask(ScheduleTask.ONCE_BACKUP_CHILDREN.toString(), 'ONCE', {triggerAt: Date.now() + 1 * 60 * 1000} );
    }
}
