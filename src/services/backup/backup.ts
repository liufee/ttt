import config from '../../config';
import {NativeModules} from 'react-native';
import {APPRuntimePath, AppWeiboBasePath} from '../../constant';
import Webdav from '../../repository/webdav';
import RNFS from 'react-native-fs';
import {AbstractService} from '../service';
import {usernames} from '../weibo/data';
import {base64ToArrayBuffer, userErrorMessage} from '../../utils';
import WeiboService from '../weibo';
import ExerciseService from '../exercise';
import NotificationService from '../notification';
import {Setting} from '../setting';
import ChildrenService from '../children';

export default class BackupService extends AbstractService<BackupService> {
    private key: string;
    private webdav: Webdav;
    private setting: Setting;

    protected async onInit(setting:Setting) {
        this.setting = setting;
        this.key = config.encryptKey;
        this.webdav = new Webdav(config.webdav.webdavURL, config.webdav.username, config.webdav.password);
    }

    public async backup(): Promise<[boolean, string]> {
        await this.backupExercise();
        await this.backupWeibo();
    }

    public async backupExercise(): Promise<[boolean, string]> {
        try {
            console.log('---备份 exercise 数据库开始---');
            await this._backupDb('exercise');
            console.log('---备份 exercise 数据库结束---');
            return [true, ''];
        } catch (e) {
            console.log('备份 exercise 失败', e);
            return [false, userErrorMessage(e)];
        }
    }

    public async backupWeibo(): Promise<[boolean, string]> {
        try {
            console.log('---备份 weibo 数据库开始---');
            await this._backupDb('weibo');
            console.log('---备份 weibo 数据库结束---');
            console.log('===备份 weibo 附件开始===');
            await this._backupWeiboFiles();
            console.log('===备份 weibo 附件结束===');
            return [true, ''];
        } catch (e) {
            console.log('备份 weibo 失败', e);
            return [false, userErrorMessage(e)];
        }
    }

    public async backupChildren(): Promise<[boolean, string]> {
        try {
            console.log('---备份 children 数据库开始---');
            await this._backupDb('children');
            console.log('---备份 children 数据库结束---');
            return [true, ''];
        } catch (e) {
            console.log('备份 children 失败', e);
            return [false, userErrorMessage(e)];
        }
    }

    private async _backupDb(type: string): Promise<[boolean, string]> {
        if(this.setting.global.dbSuffix !== ''){
            console.log('db suffix 为', this.setting.global.dbSuffix, '跳过备份');
            return;
        }
        let success, result;
        if (type === 'weibo') {
            await WeiboService.init(this.setting);
            [success, result] = await WeiboService.getInstance().backupDB();
        } else if(type === 'exercise') {
            await ExerciseService.init(this.setting);
            [success, result] = await ExerciseService.getInstance().backupDB();
        } else if(type === 'children'){
            await ChildrenService.init(this.setting);
            [success, result] = await ChildrenService.getInstance().backupDB();
        }else{
            await NotificationService.getInstanceNoNeedInit().sendMessage(`备份数据库类型:${type}不存在`, '');
            return;
        }
        if(success){
            return;
        }
        if (result === 'error:wal is empty') {
            console.log('wal 为空，不需要备份');
            return;
        }
        await NotificationService.getInstanceNoNeedInit().sendMessage(`备份数据库${type}失败`, result);
    }

    private async _backupWeiboFiles(): Promise<void> {
        const now = new Date();

        const thisYear = now.getFullYear();
        const thisMonth = now.getMonth() + 1; // 0-11 -> 1-12

        const lastMonthDate = new Date(thisYear, now.getMonth() - 1, 1);
        const lastYear = lastMonthDate.getFullYear();
        const lastMonth = lastMonthDate.getMonth() + 1;

        const thisMonthPath = `${thisYear}/${String(thisMonth).padStart(2, '0')}`;
        const lastMonthPath = `${lastYear}/${String(lastMonth).padStart(2, '0')}`;

        const remoteBackupPath = '/feehiApp/files/' + (__DEV__ ? 'weibo_debug' : 'weibo');
        for (const user of usernames) {
            console.log(`开始备份用户 ${user.name} 的微博数据`);
            await this._backupWeiboMonthDirectory(`${AppWeiboBasePath}/${user.id}/${thisMonthPath}`, remoteBackupPath);
            await this._backupWeiboMonthDirectory(`${AppWeiboBasePath}/${user.id}/${lastMonthPath}`, remoteBackupPath);
        }
    }

    private async _backupWeiboMonthDirectory(localPath: string, baseRemotePath: string): Promise<void> {
        try {
            const localPathExists = await this.checkIfDirectoryExists(localPath); // 首先判断localPath是否存在，如果不存在则跳过备份
            if (!localPathExists) {
                console.log(`本地目录 ${localPath} 不存在，跳过备份`);
                return;
            }
            const remotePath = baseRemotePath + localPath.replace(AppWeiboBasePath, '');
            const remoteDirExists = await this.webdav.checkDirExists(remotePath); // 检查远程路径是否存在，如果不存在则递归创建
            if (!remoteDirExists) {
                const createResult = await this.webdav.createDirectory(remotePath); // 递归创建远程目录
                if (!createResult) {
                    console.log(`创建远程目录 ${remotePath} 失败`);
                    return;
                }
            }

            const files = await RNFS.readDir(localPath); // 获取目录下所有文件（无子目录）
            const [remoteFiles, listRemoteFilesSuccess] = await this.listRemoteDirectory(remotePath); // 一次性获取远程目录下的所有文件列表
            if (!listRemoteFilesSuccess) {
                console.log('获取 webdav 远程目录内容失败', remoteFiles);
                return;
            }
            const remoteFileSet = new Set(remoteFiles.map(file => file.filename));

            for (const file of files) {
                if (file.isDirectory()) continue; // 只处理文件，跳过目录
                const remoteFileName = `${file.name}.enc`; // 构造远程文件名
                if (remoteFileSet.has(remotePath + '/' + remoteFileName)) { // 检查远程是否已存在该文件
                    console.log(`文件 ${remotePath + '/' + remoteFileName} 已存在，跳过备份`);
                    continue;
                }
                const outPath = APPRuntimePath + '/' + remoteFileName;
                const result = await NativeModules.RNHelper.encryptFile(file.path, outPath, this.key);
                if (result.indexOf('error:') === 0) {
                    console.log('加密文件失败', file.path, result);
                    continue;
                }
                const fileContent = await RNFS.readFile(outPath, 'base64'); // 读取并加密文件
                await RNFS.unlink(outPath);
                const uploadResult = await this.uploadToCloud(`${remotePath}/${remoteFileName}`, base64ToArrayBuffer(fileContent)); // 上传到云端
                if (uploadResult) {
                    console.log(`文件 ${file.name} 备份成功`);
                } else {
                    console.log(`文件 ${file.name} 备份失败`);
                }
            }
        } catch (error) {
            console.error(`备份目录 ${localPath} 出错:`, error);
        }
    }

    private async checkIfDirectoryExists(dirPath: string): Promise<boolean> {
        try {
            const stat = await RNFS.stat(dirPath);
            return stat.isDirectory();
        } catch (error) {
            return false;
        }
    }

    private async listRemoteDirectory(remotePath: string) {
        try {
            const result = await this.webdav.listFiles(remotePath);
            return [result, true];
        } catch (error) {
            console.log('开始获取远程目录内容失败', error);
            return [error, false];
        }
    }

    public async uploadToCloud(remoteBackupPath: string, content: string | ArrayBuffer) {
        return await this.uploadToJianguoyun(remoteBackupPath, content);
    }

    public async uploadToJianguoyun(remoteBackupPath: string, content: string | ArrayBuffer) {
        return await this.webdav.uploadFile(remoteBackupPath, content);
    }
}
