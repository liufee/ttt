/**
 * @format
 */

import {AppRegistry, DeviceEventEmitter} from 'react-native';
import App from './src/config/_generated/App';
import {name as appName} from './app.json';
import ScheduleService from './src/services/schedule';

AppRegistry.registerComponent(appName, () => App);
AppRegistry.registerHeadlessTask('HeadLessEvent', () => async (data) => {
    if(data.event === 'BackgroundTask'){
        await ScheduleService.getInstanceNoNeedInit().handleEvent(data.taskId);
    }else {
        DeviceEventEmitter.emit(data.event, data);
    }
});
