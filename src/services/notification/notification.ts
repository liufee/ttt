import notifee, {
    TimestampTrigger,
    TriggerType,
    RepeatFrequency,
    AndroidImportance,
} from '@notifee/react-native';
import {AbstractService} from '../service';
import {Setting} from '../setting';
export default class NotificationService extends AbstractService<NotificationService>{
    protected async onInit(_: Setting): Promise<void> {
        throw new Error('no need init');
    }
    public async sendMessage(title: string,message:string, data?:Record<string, string>|null) {
        const channelID = 'default';
        const channelName = 'default';

        await notifee.requestPermission();
        await notifee.createChannel({
            id: channelID,
            name: channelName,
            importance: AndroidImportance.HIGH,
        });

        await notifee.displayNotification({
            id: `${channelID}-${Date.now()}`,
            title: (__DEV__ ? '[测试]' : '') + title,
            body: message,
            data: data || undefined,
            android: {
                channelId: channelID,
                smallIcon: 'ic_launcher',
                pressAction: {
                    id: 'default',
                },
            },
        });
    }

    public async scheduleNotification() {
        const channelID = 'default';
        const channelName = 'default';
        await notifee.requestPermission();
        await notifee.createChannel({
            id: channelID,
            name: channelName,
            importance: AndroidImportance.HIGH,
        });

        // 清除旧的 trigger 类型的通知（防止重复）
        const scheduled = await notifee.getTriggerNotifications();
        for (const notif of scheduled) {
            await notifee.cancelTriggerNotification(notif.notification.id ?? '');
        }

        const now = new Date();
        const notificationTime = new Date();
        notificationTime.setHours(10, 0, 0, 0);

        if (notificationTime.getTime() <= now.getTime()) {
            notificationTime.setDate(notificationTime.getDate() + 1);
        }

        const trigger: TimestampTrigger = {
            type: TriggerType.TIMESTAMP,
            timestamp: notificationTime.getTime(),
            repeatFrequency: RepeatFrequency.DAILY,
            alarmManager: true,
        };

        await notifee.createTriggerNotification(
            {
                title: (__DEV__ ? 'Debug-' : '') + '淘宝红包签到领100元',
                body: (__DEV__ ? 'Debug-' : '') + '连续签到90天领100元 😎',
                android: {
                    channelId: channelID,
                    smallIcon: 'ic_launcher', // optional
                    pressAction: {
                        id: 'default',
                    },
                },
            },
            trigger
        );
    }
}
