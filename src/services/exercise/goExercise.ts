import Adapter from './adapter';
import {AppDBBasePath, FeehiAPPScheme, ScheduleTask} from '../../constant';
import {DailyExercise, Record, RecordType, Run} from './model';
import {AbstractService} from '../service';
import {format} from 'date-fns';
import NotificationService from '../notification';
import {NativeModules} from 'react-native';
import config from '../../config';
import {Setting} from '../setting';

export default class ExerciseService  extends AbstractService<ExerciseService> implements Adapter{

    protected readonly serviceType = 'exercise';

    private setting:Setting;
    private notificationService:NotificationService;
    private dbPath:string;
    protected async onInit(setting:Setting) {
        this.setting = setting;
        const dbSuffix = this.setting.global.dbSuffix.length > 0 ? this.setting.global.dbSuffix : (__DEV__ ? '_debug' : '');
        this.dbPath = AppDBBasePath + '/exercise' + dbSuffix;
        await this.callGo('InitExercise', this.dbPath);
        this.notificationService = NotificationService.getInstanceNoNeedInit();
    }

    public async saveRecord(record:Record):Promise<[boolean, string]>{
        record.tsr = this.setting.exercise.enableTSR ? 1 : 0;
        const [success, result] = await this.callGo('SaveRecord', record);
        if(!success){
            return [false, result];
        }
        this.triggerBackup();
        return [true, result];
    }

    public async updateRecord(record:Record):Promise<[boolean, string]>{
        record.tsr = this.setting.exercise.enableTSR ? 1 : 0;
        const [success, result] = await this.callGo('UpdateRecord', record);
        if(!success){
            return [false, result];
        }
        this.triggerBackup();
        return [true, result];
    }
    public async getRecordsByType(type:RecordType):Promise<[boolean, Record[], string]>{
        return await this.getRecordsByTypes([type]);
    }
    public async getRecordsByTypes(types:RecordType[]):Promise<[boolean, Record[], string]>{

        const[success, result] = await this.callGo('GetExercises', types);
        if(!success){
            return [false, [], result];
        }
        const records: Record[] = this.fillExercises(result);
        return [true, records, ''];
    }
    public async getExercisesByPage(types:RecordType[], page:number, perPage:number, startTime:string, endTime:string, sortOrder:string):Promise<[boolean, Record[], string]>{
        const [success, result] = await this.callGo('GetExercisesByPage', {
            types: types,
            page: page,
            perPage: perPage,
            startTime: startTime,
            endTime: endTime,
            sortOrder: sortOrder,
        });
        if(!success){
            return [false, [], result];
        }
        return [true, this.fillExercises(result.exercises) as Record[], ''];
    }
    public async getRecordById(id:string):Promise<[boolean, Record, string]>{
        const [success, result] = await this.callGo('GetExerciseByID', id);
        if(!success){
            return [false, null as Record, result];
        }
        const record:Record = this.fillExercise(result);
        return [true, record, ''];
    }
    public async saveRunRecord(startAt:string, endAt:string, run:Run):Promise<[boolean, string]>{
        let params:Record = {} as Record;
        params.type = RecordType.RecordTypeRun;
        params.startAt = startAt;
        params.endAt = endAt;
        params.run = run;
        const[success, result] = await this.callGo('SaveRunPaths', params);
        if(!success){
            return [false, result];
        }
        this.triggerBackup();
        return [true, result];
    }
    public async deleteRecord(record:Record):Promise<[boolean, string]> {
        const [success, result] = await this.callGo('DeleteExercise', record.id);
        if(!success){
            return [false, result];
        }
        this.triggerBackup();
        return [true, result];
    }

    public async getTSR(id:string):Promise<[boolean, string, string]>{
        const [success, result] = await this.callGo('GetTSR', id);
        if(!success){
            return [false, '', result];
        }
        return [true, result.tsr as string, ''];
    }

    public async assembleStrToCreateTSR(id:string):Promise<[boolean, string]> {
        const [success, result] = await this.callGo('AssembleCreateTSRStr', id);
        if (!success) {
            return [false, result];
        }
        return [true, result];
    }

    public async getDailyExercises(types:RecordType[], startTime:string, endTime:string, sortOrder:string):Promise<[boolean, DailyExercise[], string]>{
        let params = {
            types: types,
            startTime: startTime,
            endTime: endTime,
            sortOrder: sortOrder,
        };
        const [success, result] = await this.callGo('GetDailyExercises', params);
        if(!success){
            return [false, [], result];
        }
        return [true, result, ''];
    }

    public async getAiPrompts(rangeType:string, start:string, end:string, types:RecordType[]):Promise<[boolean, string, string]> {
        let params = {
            rangeType: rangeType,
            start: start,
            end: end,
            types: types,
        };
        const [success, result] = await this.callGo('GetAiPrompts', params);
        if(!success){
            return [false, '', result];
        }
        return [true, result, ''];
    }

    public async checkExerciseCompletionForToday(){
        const allExerciseTypes = [RecordType.RecordTypeAbdominal, RecordType.RecordTypeRun, RecordType.RecordTypeSitUpPushUp];
        const today = format(new Date(), 'yyyy-MM-dd');
        const [success, items, err] = await this.getExercisesByPage(allExerciseTypes, 1, -1, today + ' 00:00:00', today + ' 23:59:59', 'desc');
        if(!success){
            throw new Error(err);
        }

        const finishedTypes = new Set(items.map(item => item.type));
        const allDone = allExerciseTypes.every(type => finishedTypes.has(type));
        if(allDone){
            return true;
        }

        type ExerciseNameMap = {
            [K in RecordType]: string;
        };
        const exerciseMap: ExerciseNameMap = {
            [RecordType.RecordTypeAbdominal]: '腹部训练',
            [RecordType.RecordTypeRun]: '跑步',
            [RecordType.RecordTypeSitUpPushUp]: '仰卧起坐/俯卧撑',
        };

        const missingTypes = allExerciseTypes.filter(
            type => !finishedTypes.has(type)
        );

        const missingNames = missingTypes.map(type => exerciseMap[type]);
        const message = `您今天还未完成：${missingNames.join('、')}。记得坚持运动保持健康！`;
        await this.notificationService.sendMessage('今日运动未完成提醒', message, {url:`${FeehiAPPScheme}://exercise`});
    }

    public async backupDB():Promise<[boolean, string]>{
        const args = {
            DBPath: this.dbPath,
            Key: config.encryptKey,
            BackupPath: '/feehiApp/db/' + (__DEV__ ? 'exercise_debug' : 'exercise'),
            WEBDAV:{
                URL: config.webdav.webdavURL,
                Username: config.webdav.username,
                Password: config.webdav.password,
            },
        };
        const [success, result] = await this.callGo('BackupDB', args);
        if(!success){
            return [false, result];
        }
        return [true, ''];
    }

    public async createTables(setting:Setting):Promise<[boolean, string]>{
        this.setting = setting;
        const dbSuffix = this.setting.global.dbSuffix.length > 0 ? this.setting.global.dbSuffix : (__DEV__ ? '_debug' : '');
        this.dbPath = AppDBBasePath + '/exercise' + dbSuffix;
        const [success, result] = await this.callGo('CreateExerciseTables', {
            DBPath: this.dbPath,
            Stmts: [
                'CREATE TABLE IF NOT EXISTS exercise(id INTEGER PRIMARY KEY AUTOINCREMENT, type INTEGER, start_at TEXT, end_at TEXT, status TEXT, ext TEXT, tsr integer DEFAULT 0)',
                'CREATE TABLE IF NOT EXISTS exercise_run_paths(id INTEGER PRIMARY KEY AUTOINCREMENT, record_id TEXT, paths TEXT)',
                'CREATE TABLE IF NOT EXISTS run_records(id INTEGER PRIMARY KEY AUTOINCREMENT, start_at TEXT, end_at TEXT, avg_pace TEXT, distance TEXT, duration TEXT, paths TEXT)',
                'CREATE TABLE IF NOT EXISTS `tsr` (`type` text,`third_id` text,`tsr`,PRIMARY KEY (`type`, `third_id`));'
            ],
        });
        if(!success){
            return [false, result];
        }
        return [true, ''];
    }

    private triggerBackup(){
        NativeModules.RNHelper.scheduleTask(ScheduleTask.ONCE_BACKUP_EXERCISE.toString(), 'ONCE', {triggerAt: Date.now() + 1 * 60 * 1000} );
    }

    private fillExercises(exercises:any):Record[]{
        return exercises.map(exercise => {
            return this.fillExercise(exercise);
        });
    }

    private fillExercise(exercise:any):Record {
        return exercise;
    }
}
