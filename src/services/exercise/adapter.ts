import {AbstractService} from '../service';
import {DailyExercise, Record, RecordType, Run} from './model';
import goExerciseService from './goExercise';
import {Setting} from '../setting';

export default interface Adapter {
    saveRecord(record:Record):Promise<[boolean, string]>
    updateRecord(record:Record):Promise<[boolean, string]>
    getRecordsByType(type:RecordType):Promise<[boolean, Record[], string]>
    getRecordsByTypes(types:RecordType[]):Promise<[boolean, Record[], string]>
    getExercisesByPage(types:RecordType[], page:number, perPage:number, startTime:string, endTime:string, sortOrder:string):Promise<[boolean, Record[], string]>
    getDailyExercises(types:RecordType[], startTime:string, endTime:string, sortOrder:string):Promise<[boolean, DailyExercise[], string]>
    getRecordById(id:string)
    saveRunRecord(startAt:string, endAt:string, run:Run):Promise<[boolean, string]>
    deleteRecord(record:Record):Promise<[boolean, string]>
    getTSR(id:string):Promise<[boolean, string, string]>
    assembleStrToCreateTSR(id:string):Promise<[boolean, string]>
    getAiPrompts(rangeType:string, start:string, end:string, types:RecordType[]):Promise<[boolean, string, string]>
    backupDB():Promise<[boolean, string]>
    checkExerciseCompletionForToday()
    createTables(setting:Setting):Promise<[boolean, string]>
};

export class ExerciseService extends AbstractService<ExerciseService> implements Adapter{
    private service:Adapter;

    protected async onInit(setting: Setting){
        await goExerciseService.init(setting);
        this.service = goExerciseService.getInstance();
    }
    public async saveRecord(record:Record):Promise<[boolean, string]>{
        return this.service.saveRecord(record);
    }
    public async updateRecord(record:Record):Promise<[boolean, string]>{
        return this.service.updateRecord(record);
    }
    public async getRecordsByType(type:RecordType):Promise<[boolean, Record[], string]>{
        return this.service.getRecordsByType(type);
    }
    public async getRecordsByTypes(types:RecordType[]):Promise<[boolean, Record[], string]>{
        return this.service.getRecordsByTypes(types);
    }
    public async getExercisesByPage(types:RecordType[], page:number, perPage:number, startTime:string, endTime:string, sortOrder:string):Promise<[boolean, Record[], string]>{
        return this.service.getExercisesByPage(types, page, perPage, startTime, endTime, sortOrder);
    }
    public getDailyExercises(types:RecordType[], startTime:string, endTime:string, sortOrder:string):Promise<[boolean, DailyExercise[], string]>{
        return this.service.getDailyExercises(types, startTime, endTime, sortOrder);
    }
    public async getRecordById(id:string):Promise<[boolean, Record, string]>{
        return this.service.getRecordById(id);
    }
    public async saveRunRecord(startAt:string, endAt:string, run:Run):Promise<[boolean, string]>{
        return this.service.saveRunRecord(startAt, endAt, run);
    }
    public async deleteRecord(record:Record):Promise<[boolean, string]>{
        return this.service.deleteRecord(record);
    }

    public async getTSR(id:string):Promise<[boolean, string, string]>{
        return this.service.getTSR(id);
    }

    public async assembleStrToCreateTSR(id:string):Promise<[boolean, string]>{
        return this.service.assembleStrToCreateTSR(id);
    }

    public async getAiPrompts(rangeType:string, start:string, end:string, types:RecordType[]):Promise<[boolean, string, string]>{
        return this.service.getAiPrompts(rangeType, start, end, types);
    }

    public async backupDB():Promise<[boolean, string]>{
        return this.service.backupDB();
    }

    public async checkExerciseCompletionForToday(){
        return this.service.checkExerciseCompletionForToday();
    }

    public async createTables(setting:Setting){
        return this.service.createTables(setting);
    }
}
