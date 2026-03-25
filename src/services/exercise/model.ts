export enum RecordType{
    RecordTypeAbdominal = 1,
    RecordTypeRun = 2,
    RecordTypeSitUpPushUp = 3,
}

export enum Status{
    StatusUndone = 0,
    StatusFinished = 1,
}

export interface Record{
    id:string,
    type:RecordType,
    startAt:string,
    endAt:string,
    abdominal:Abdominal,
    run:Run,
    status:Status,
    sitUpPushUp:SitUpPushUp,
    tsr:number,
    tsrVerified:number,
}

export interface Abdominal{

}

export interface Run{
    avgPace:number,
    distance:number,
    runDuration:string,
    runningWithoutPosition:number,
    paths: Path[],
}

export interface SitUpPushUp{
    sitUp:number,
    pushUp:number,
    curlUp:number,
    legsUpTheWallPose:number,
}

export interface Path{ latitude: number; longitude: number; time: number }

export interface DailyExercise {
    date:string
    exercises: Record[]
    completedTypes:number
    allCompleted:boolean
}
