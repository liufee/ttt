import ExerciseService from '../exercise';
import {NativeModules} from 'react-native';
import {AbstractService} from '../service';
import {getProgress, saveProgress} from '../../config';
import {Progress, ScheduleTask} from '../../constant';
import BackupService from '../backup';
import NotificationService from '../notification';
import {userErrorMessage} from '../../utils';
import SettingService, {Setting} from '../setting';

export default class ScheduleService extends AbstractService<ScheduleService>{

    protected async onInit(_: Setting): Promise<void> {
        throw new Error('no need init');
    }

    public async start() {
        try {
            const registeredTasks = await getProgress(Progress.RegisteredBackgroundTasks) || {};
            const tasks = [{
                name:ScheduleTask.DAILY_EXERCISE_CHECK.toString(), interval:'daily', options:{hour: 21, minute: 0},
            }];
            for(let i in tasks){
                const key = JSON.stringify(tasks[i]);
                if( Object.hasOwn(registeredTasks, tasks[i].name) ){
                    if( registeredTasks[tasks[i].name] === key ) {// task name 存在，并且执行时间一致的情况
                        continue;
                    }
                }
                registeredTasks[tasks[i].name] = key;
                await saveProgress(Progress.RegisteredBackgroundTasks, registeredTasks);
                NativeModules.RNHelper.scheduleTask(tasks[i].name, tasks[i].interval, tasks[i].options);
            }
            //NativeModules.RNHelper.scheduleTask('daily-exercise', 'daily', { hour: 22, minute: 50 })
            //NativeModules.RNHelper.scheduleTask('weekly-report', 'weekly', { hour: 9, minute: 0, dayOfWeek: 1 })
            //NativeModules.RNHelper.scheduleTask('minute-check', 'minute', {})
            //NativeModules.RNHelper.scheduleTask('quarterly-report', 'monthly', { hour: 10, minute: 30, intervalMonths: 3 })
            //NativeModules.RNHelper.scheduleTask('upload-once', 'ONCE', {triggerAt: Date.now() + 10 * 60 * 1000} ) // 10 分钟后
        }catch (e){
            console.log('注册任务失败', userErrorMessage(e));
        }
    }

    async handleEvent(notificationId: string) {
        try {
            const [success, setting, err] = await SettingService.getInstanceNoNeedInit().getSetting();
            if(!success){
                throw new Error(err);
            }
            switch (notificationId) {
                case ScheduleTask.DAILY_EXERCISE_CHECK.toString():
                    await ExerciseService.init(setting);
                    await ExerciseService.getInstance().checkExerciseCompletionForToday();
                    break;
                case ScheduleTask.ONCE_BACKUP_WEIBO.toString():
                    await BackupService.init(setting);
                    await BackupService.getInstance().backupWeibo();
                    break;
                case ScheduleTask.ONCE_BACKUP_EXERCISE.toString():
                    await BackupService.init(setting);
                    await BackupService.getInstance().backupExercise();
                    break;
                case ScheduleTask.ONCE_BACKUP_CHILDREN.toString():
                    await BackupService.init(setting);
                    await BackupService.getInstance().backupChildren();
                    break;
            }
        } catch (e) {
            await NotificationService.getInstanceNoNeedInit().sendMessage('执行任务时出错', `执行任务 ${notificationId} 时出错: ${userErrorMessage(e)}`);
            console.error(`执行任务 ${notificationId} 时出错:`, userErrorMessage(e));
        }
    }
}
