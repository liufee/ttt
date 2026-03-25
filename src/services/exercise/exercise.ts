import repository from '../../db/exercise';
import {DailyExercise, Path, Record as RecordModel, Record, RecordType, Run, SitUpPushUp} from './model';
import {format, parse} from 'date-fns';
import {NativeModules} from 'react-native';
import {TSR} from '../weibo/model';
import NotificationService from '../notification';
import {userErrorMessage} from '../../utils';
import {AbstractService} from '../service';
import Adapter from './adapter';
import {Setting} from '../setting';
import {FeehiAPPScheme} from '../../constant';

export default class ExerciseService extends AbstractService<ExerciseService> implements Adapter{

    private setting:Setting;
    private repository:repository;
    private notificationService:NotificationService;

    private async onInit(setting:Setting){
        this.setting = setting;
        this.repository = new repository();
        await this.repository.init(this.setting.global.dbSuffix);
        this.notificationService = NotificationService.getInstanceNoNeedInit();
    }

    public async saveRecord(record:Record):Promise<[boolean, string]>{
        try {
            const dbRecord = {
                type: record.type,
                start_at: record.startAt,
                end_at: record.endAt,
                status: record.status,
                ext: this.assembleExt(record),
                tsr: '',
                tsrType: 'exercise',
                paths: '',
            };
            if(record.type === RecordType.RecordTypeRun){
                let pathStr = '';
                for(let i in record.run.paths){
                    const path = record.run.paths[i];
                    pathStr += path.latitude + ',' + path.longitude + ',' + format(path.time, 'yyyy-MM-dd HH:mm:ss') + ';';
                }
                if (pathStr.endsWith(';')) {
                    pathStr = pathStr.slice(0, -1);  // 删除最后一个字符
                }
                dbRecord.paths = pathStr;
            }
            if (this.setting.exercise.enableTSR) {
                const originStr = this.assembleStrToCreateTSRByRecord(dbRecord);
                const [result, info] = await this.generateTSR(originStr);
                if (!result) {
                    return [false, '创建tsr失败:' + info];
                }
                dbRecord.tsr = info;
            }
            await this.repository.saveRecord(dbRecord);
            return [true, ''];
        }catch (e){
            return [false, userErrorMessage(e)];
        }
    }

    public async updateRecord(record:Record):Promise<[boolean, string]>{
        try {
            const dbRecord = {
                type: record.type,
                start_at: record.startAt,
                end_at: record.endAt,
                status: record.status,
                ext: this.assembleExt(record),
                tsr: '',
                tsrType: 'exercise',
                paths: '',
            };
            if (this.setting.exercise.enableTSR) {
                const originStr = this.assembleStrToCreateTSRByRecord(dbRecord);
                const [result, info] = await this.generateTSR(originStr);
                if (!result) {
                    return [false, '创建tsr失败:' + info];
                }
                dbRecord.tsr = info;
            }
            await this.repository.updateRecord(record.id, dbRecord);
            return [true, ''];
        }catch (e){
            return [false, userErrorMessage(e)];
        }
    }

    public async getRecordsByType(type:RecordType):Promise<[boolean, Record[], string]>{
        return this.getRecordsByTypes([type]);
    }

    public async getRecordsByTypes(types:RecordType[]):Promise<[boolean, Record[], string]>{
        let records: Record[] = [];
        try {
            let recordTypes = [];
            for(let i in types){
                recordTypes.push(types[i].toString());
            }
            const rows = await this.repository.getRecordsByType(recordTypes, -1);
            for (let i in rows) {
                const record = this.convertToRecord(rows[i]);
                records.push(record);
            }
            return [true, records, ''];
        }catch (e){
            return [false, records, userErrorMessage(e)];
        }
    }

    public async getDailyExercises(types:RecordType[], startTime:string, endTime:string, sortOrder:string):Promise<[boolean, DailyExercise[], string]>{
        const [success, items, err] = await this.getExercisesByPage(types, 1, -1, startTime, endTime, sortOrder);
        if(!success){
            return [false, [], err];
        }
        // 按日期分组数据
        const groupedData = items.reduce((acc, record:RecordModel) => {
            const startTime = parse(record.startAt, 'yyyy-MM-dd HH:mm:ss', new Date());
            const date = format(startTime, 'yyyy-MM-dd');
            if (!acc[date]) {
                acc[date] = [];
            }
            record.tsrVerified = 1;//js 版本跳过真实检验，需要进入检验详情页再检测
            acc[date].push(record);
            return acc;
        }, {});
        const rcds: DailyExercise[] = Object.keys(groupedData).map(date => {
            const size = new Set(groupedData[date].map(r => r.type)).size;
            return {
                date:date,
                exercises: groupedData[date],
                completedTypes: size,
                allCompleted: size === 3,
            };
        });
        return [true, rcds, ''];
    }

    public async getRecordById(id:string){
        let record:Record;
        try {
            const row = await this.repository.getRecordById(id);
            record = this.convertToRecord(row);
            return [true, record, ''];
        }catch (e){
            return [false, record, userErrorMessage(e)];
        }
    }

    public async saveRunRecord(startAt:string, endAt:string, run:Run):Promise<[boolean, string]>{
        try {
            let pathStr = '';
            for(let i in run.paths){
                const path = run.paths[i];
                pathStr += path.latitude + ',' + path.longitude + ',' + format(path.time, 'yyyy-MM-dd HH:mm:ss') + ';';
            }
            if (pathStr.endsWith(';')) {
                pathStr = pathStr.slice(0, -1);  // 删除最后一个字符
            }
            const dbRecord = {
                start_at:startAt,
                end_at:endAt,
                avg_pace:run.avgPace,
                distance:run.distance,
                duration:run.runDuration,
                paths:pathStr,
            };
            await this.repository.saveRunRecord(dbRecord);
            return [true, ''];
        }catch (e){
            return [false, userErrorMessage(e)];
        }
    }

    public async createTables(setting:Setting):Promise<[boolean, string]> {
        await this.onInit(setting);
        return [true, ''];
    }

    private convertToRecord(row):Record{
        let record:Record = {
            id:row.id,
            type:row.type,
            startAt:row.start_at,
            endAt:row.end_at,
            status:row.status,
            abdominal:null as any,
            run:null as any,
            sitUpPushUp:null as any,
            tsr:row.tsr,
            tsrVerified: 0,
        };
        if(row.type === RecordType.RecordTypeAbdominal){
            record.abdominal = {};
        }else if( row.type === RecordType.RecordTypeSitUpPushUp ){
            record.sitUpPushUp = this.convertSitUpPushUpToRecord(row);
        }else if( row.type === RecordType.RecordTypeRun ){
            record.run = this.convertRunToRecord(row);
        }
        return record;
    }

    private convertSitUpPushUpToRecord(row):SitUpPushUp{
        const temp = row.ext.split(',');
        return {
            sitUp:temp[1],
            pushUp:temp[0],
            curlUp:temp[2],
            legsUpTheWallPose:temp[3],
        };
    }

    private convertRunToRecord(row):Run{
        let paths:Path[] = [];
        const ext = row.ext.split(',');
        if(row.hasOwnProperty('paths') && row.paths !== '') {
            const lines = row.paths.split(';');
            for (let i in lines) {
                const line = lines[i];
                const one = line.split(',');
                paths.push({
                    latitude: parseFloat(one[0]),
                    longitude: parseFloat(one[1]),
                    time: parse(one[2], 'yyyy-MM-dd HH:mm:ss', new Date()).getTime(),
                });
            }
        }
        return {
            avgPace:parseFloat(ext[0]),
            distance:parseFloat(ext[1]),
            runDuration:ext[2],
            runningWithoutPosition:parseInt(ext[3]),
            paths: paths,
        };
    }

    public async deleteRecord(record:Record):Promise<[boolean, string]>{
        try {
            await this.repository.deleteRecord(record);
            return [true, ''];
        }catch (e){
            return [false, userErrorMessage(e)];
        }
    }

    public async getTSR(id:string):Promise<[boolean, string, string]>{
        let tsr:TSR;
        try {
            const rows = await this.repository.getTSR('exercise', id);
            if(rows.length <= 0){
                return [false, '', ''];
            }
            tsr = {
                type:rows[0].type,
                thirdId:rows[0].third_id,
                tsr:rows[0].tsr,
            };
            return [true, tsr.tsr, ''];
        }catch (e){
            return [false, '', userErrorMessage(e)];
        }
    }

    public async checkExerciseCompletionForToday(){
        const today = format(new Date(), 'yyyy-MM-dd');

        type ExerciseNameMap = {
            [K in RecordType]: string;
        };
        const exerciseMap: ExerciseNameMap = {
            [RecordType.RecordTypeAbdominal]: '腹部训练',
            [RecordType.RecordTypeRun]: '跑步',
            [RecordType.RecordTypeSitUpPushUp]: '仰卧起坐/俯卧撑',
        };

        const allTypes = Object.keys(exerciseMap).map(Number) as RecordType[];

        const [success, records, errorMsg] = await this.getExercisesByPage([RecordType.RecordTypeAbdominal, RecordType.RecordTypeRun, RecordType.RecordTypeSitUpPushUp], 1, -1, today + ' 00:00:00', today + ' 23:59:59', 'desc');
        if (!success) throw errorMsg;

        // 今日已完成的运动类型
        const completedTypes = new Set<RecordType>(
            records.map(r => r.type)
        );

        // 未完成的运动名称
        const missingNames = allTypes
            .filter(type => !completedTypes.has(type))
            .map(type => exerciseMap[type]);

        if (missingNames.length === 0) return;// 全部完成，不提醒

        const message = `您今天还未完成：${missingNames.join('、')}。记得坚持运动保持健康！`;
        await this.notificationService.sendMessage('今日运动未完成提醒', message, {url:`${FeehiAPPScheme}://exercise`});
    }

    public async assembleStrToCreateTSR(id: string): Promise<[boolean, string]> {
        try {
            const row = await this.repository.getRecordById(id);
            return [true, this.assembleStrToCreateTSRByRecord(row)];
        }catch (e){
            return [false, userErrorMessage(e)];
        }
    }

    public async getAiPrompts(rangeType:string, start:string, end:string, types:RecordType[]):Promise<[boolean, string, string]> {
        throw new Error('Method not implemented.');
    }

    public async  backupDB(): Promise<[boolean, string]> {
        throw new Error('Method not implemented.');
    }

    public async getExercisesByPage(types: RecordType[], page: number, perPage: number, startTime: string, endTime: string, sortOrder: string): Promise<[boolean, Record[], string]> {
        let records: Record[] = [];
        try {
            let recordTypes = [];
            for(let i in types){
                recordTypes.push(types[i].toString());
            }
            const rows = await this.repository.getRecordsByType(recordTypes, page, perPage, startTime, endTime, sortOrder);
            for (let i in rows) {
                const record = this.convertToRecord(rows[i]);
                records.push(record);
            }
            return [true, records, ''];
        }catch (e){
            return [false, records, userErrorMessage(e)];
        }
    }

    private assembleStrToCreateTSRByRecord(dbRecord){
        let paths = '';
        if(dbRecord.paths !== undefined) {
            paths = dbRecord.paths;
        }
        return `${dbRecord.type}+${dbRecord.start_at}+${dbRecord.end_at}+${dbRecord.ext}+${paths}`;
    }

    private assembleExt(record: Record):string{
        let ext = '';
        if(record.type === RecordType.RecordTypeAbdominal){
            ext = '';
        }else if(record.type === RecordType.RecordTypeSitUpPushUp){
            ext = `${record.sitUpPushUp.pushUp},${record.sitUpPushUp.sitUp},${record.sitUpPushUp.curlUp},${record.sitUpPushUp.legsUpTheWallPose}`;
        }else if(record.type === RecordType.RecordTypeRun){
            ext = `${record.run.avgPace},${record.run.distance},${record.run.runDuration},${record.run.runningWithoutPosition}`;
        }
        return ext;
    }

    private async generateTSR(data:string):Promise<[boolean, string]>{
        let result = await NativeModules.RNHelper.generateTSRWithMediaV2(data, '');
        if (result.indexOf('error:') === 0){
            return [false, result];
        }
        return [true, result];
    }
}
