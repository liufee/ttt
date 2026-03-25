import {Setting} from './types';
import {BianshenHuangGuaGeiNiYongUID} from '../weibo/data';

const defaultSetting: Setting = {
    global: {
        defaultPage: 'index',
        debugMode: true,
        dbSuffix:'',
        goServerAPIURL: 'http://gcp.feehi.com:8080',
    },
    exercise: {
        runningWithoutPosition: false,
        showHandInputRunRecord: true,
        enableTSR:true,
        showRecordsListPeriod: 0,
    },
    weibo: {
        newsMedia: ['zaobao'],
        detailPageShowRepost: true,
        contentType:'parsed',
        enabledUsers:[BianshenHuangGuaGeiNiYongUID],
        defaultUser:BianshenHuangGuaGeiNiYongUID,
        enableTSR:true,
        anonymous: 0,
        showTipFilesSize: '10',
        maxTotalFilesSize: '20',
        hotSearchs: ['randomweibo', 'zaobao', 'baidu', 'weibo', 'douyin', 'toutiao'],
    },
    tool: {
        showNovel: true,
        showPregnancy: true,
    },
    dictionary: {
        rememberWordPageSize: 500,
    },
};

export default defaultSetting;
