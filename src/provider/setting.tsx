import React, {createContext, useContext, useState, useEffect} from 'react';
import {Alert} from 'react-native';
import Toast from '../components/toast';
import SettingService, {Setting} from '../services/setting';
import Loading from '../components/loading';
import WeiboService from '../services/weibo';
import ExerciseService from '../services/exercise';

interface SettingContextType {
    setting: Setting;
    updateSetting: (userSetting: Setting) => Promise<[boolean, string]>;
}

const SettingContext = createContext<SettingContextType|null>(null);

export const SettingProvider = ({ children }) => {
    const [setting, setSetting] = useState<Setting|null>(null);
    const [showDBTip, setShowDBTip] = useState(true);

    const settingService = SettingService.getInstanceNoNeedInit();

    useEffect(() => {
        const loadConfig = async () => {
            const [success, userSetting, err] = await settingService.getSetting();
            if(!success){
                Alert.alert('失败', err);
                return;
            }
            setSetting(userSetting);
        };
        loadConfig();
    }, []);

    const updateSetting = async (userSetting: Setting):Promise<[boolean, string]> => {
        const [success, err] = await settingService.updateSetting(userSetting);
        if(!success) {
            return [false, err];
        }
        const createTablesErr = await createDBTables(userSetting);
        if(createTablesErr !== ''){
            return [false, createTablesErr];
        }
        setSetting(userSetting);
        return [true, ''];
    };

    const createDBTables = async (userSetting:Setting):Promise<string> => {
        if(userSetting.global.dbSuffix === setting?.global.dbSuffix) {
            return '';
        }

        await WeiboService.init(userSetting);
        const weiboService = WeiboService.getInstance();
        let [success, err] = await weiboService.createTables(userSetting);
        if(!success){
            return err;
        }

        await ExerciseService.init(userSetting);
        const exerciseService = ExerciseService.getInstance();
        [success, err] = await exerciseService.createTables(userSetting);
        if(!success){
            return err;
        }

        return '';
    };

    if (setting === null) {
        return <Loading></Loading>;
    }

    let tips = '';
    setting.global.debugMode ? tips += 'Debug: true ' : '';
    setting.global.dbSuffix.length > 0 ? tips += 'DB Suffix:' +  setting.global.dbSuffix : '';
    tips = tips.trimEnd();
    return (
        <SettingContext.Provider value={{setting, updateSetting}}>
            {tips.length>0 && <Toast onDismiss={()=>setShowDBTip(false)} visible={showDBTip} message={tips} autoHide={false} backgroundColor={'rgba(0, 0, 0, 0.3)'} fontSize={10} ></Toast>}
            {children}
        </SettingContext.Provider>
    );
};

export const useSetting = () => {
    const context = useContext(SettingContext);
    if (!context) {
        throw new Error('useSetting 必须在 SettingProvider 内使用');
    }
    return context;
};
