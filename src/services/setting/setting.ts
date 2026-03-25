import {AbstractService} from '../service';
import {Setting} from './types';
import defaultSetting from './defaultSetting';
import fs from 'react-native-fs';
import {AppConfigBasePath} from '../../constant';
import {deepMerge} from '../../config';
import {userErrorMessage} from '../../utils';


export default class SettingService extends AbstractService<SettingService>{

    static readonly CONFIG_STORAGE_KEY = AppConfigBasePath + `/app_config${__DEV__ ? '_dev' : ''}.json`;

    protected async onInit(_: Setting): Promise<void> {
        throw new Error('no need init');
    }

    public async getSetting():Promise<[boolean, Setting, string]> {
        try {
            const configData = await fs.readFile(SettingService.CONFIG_STORAGE_KEY);
            return [true, deepMerge(defaultSetting, JSON.parse(configData)), ''];
        } catch (e) {
            return [false, defaultSetting, ''];
        }
    }

    public async updateSetting(setting: Setting):Promise<[boolean, string]>{
        try {
            await fs.mkdir(AppConfigBasePath);
            await fs.writeFile(SettingService.CONFIG_STORAGE_KEY, JSON.stringify(setting));
            return [true, ''];
        } catch (error) {
            return [false, userErrorMessage(error)];
        }
    }
}
