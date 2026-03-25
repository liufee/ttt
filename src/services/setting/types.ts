import { BianshenHuangGuaGeiNiYongUID } from '../weibo/data';

export type Setting = {
    global: {
        defaultPage: string
        debugMode: boolean
        dbSuffix: string
        goServerAPIURL: string
    }
    exercise: {
        runningWithoutPosition: boolean
        showHandInputRunRecord: boolean
        enableTSR: boolean
        showRecordsListPeriod: number
    }
    weibo: {
        newsMedia: string[]
        detailPageShowRepost: boolean
        contentType: string
        enabledUsers: typeof BianshenHuangGuaGeiNiYongUID[]
        defaultUser: typeof BianshenHuangGuaGeiNiYongUID
        enableTSR: boolean
        anonymous: number
        showTipFilesSize: string
        maxTotalFilesSize: string
        hotSearchs: string[]
    }
    tool: {
        showNovel: boolean
        showPregnancy: boolean
    }
    dictionary: {
        rememberWordPageSize: number
    }
}
