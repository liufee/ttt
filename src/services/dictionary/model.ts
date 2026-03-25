export interface SearchResult{
    word: string,
    translation: string,
    isLocal: boolean
}

export interface SearchHistory{
    id:number,
    word:string,
    translation:string,
    status:Status,
    createdAt:string,
}

export enum Status{
    StatusInit = 0,
    StatusRemembered = 1,
    StatusDeleted = 2,
}

export interface RememberWordItem {
    id: number;
    word: string;
    type: string;
    level: string;
    examples: string;
    translation: string;
    phonetics_us: string;
    us_mp3: string;
}
