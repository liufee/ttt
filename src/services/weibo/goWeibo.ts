import {Comment, Weibo, Media, User, Like, TSR, BeenPosted, Location} from './model';
import {NativeModules} from 'react-native';
import adapter from './adapter';
import {
    AppDBBasePath, AppPicturesBasePath,
    AppWeiboBasePath,
    AppWeiboLargeBasePath, ScheduleTask,
} from '../../constant';
import {
    anonymousUsernames,
    BianshenHuangGuaGeiNiYongUID,
    ByFeehiAPP,
    HuiHuiID,
    ZunshoujimochengxuID,
} from './data';
import RNFS from 'react-native-fs';
import {AbstractService} from '../service';
import config from '../../config';
import {Setting} from '../setting';
import {getMediaType, userErrorMessage} from '../../utils';

export default class WeiboService extends AbstractService<WeiboService> implements adapter{

    protected readonly serviceType = 'weibo';

    private setting:Setting;
    private dbPath: string;

    protected async onInit(setting:Setting){
        this.setting = setting;
        const dbSuffix = this.setting.global.dbSuffix.length > 0 ? this.setting.global.dbSuffix : (__DEV__ ? '_debug' : '');
        this.dbPath = AppDBBasePath + '/weibo' + dbSuffix;
        await this.callGo('InitWeibo', {
            DBPath: this.dbPath,
            BasePath: AppWeiboBasePath,
            LargeBasePath: AppWeiboLargeBasePath,
        });
    }

    public async createWeibo(uid:string, content:string, media: Media[], location:Location|null, repostWeibo: Weibo|null):Promise<[boolean, string]>{
        for(let i in media){
            media[i].Origin = media[i].Origin.replaceAll('file://', '');
        }
        const retweetId = repostWeibo ? repostWeibo.id : '';
        let args = {
            type: 2,
            uid: uid,
            text: content,
            location: location,
            by: {id:ByFeehiAPP},
            repost: {id: retweetId},
            tsr: this.setting.weibo.enableTSR ? 1 : 0,
            media: media,
        };
        const [success, result] = await this.callGo('CreateWeibo', args);
        if(!success){
            return [false, result];
        }
        this.triggerBackup();
        return [true, ''];
    }

    public async deleteWeibo(weibo:Weibo):Promise<[boolean, string]>{
        const [success, result] = await this.callGo('DeleteWeiboById', weibo.id);
        if(!success){
            return [false, result];
        }
        this.triggerBackup();
        return [true, ''];
    }

    public async getWeiboByPage(uid:string, page:number, offset:number, limit:number, keyword:string = '', startDate?:string, endDate?:string, sortOrder:string = 'desc'):Promise<[boolean, Weibo[], string]>{
        let uids = [];
        if(uid === '0'){
            uids = this.setting.weibo.enabledUsers;
        }else{
            uids = [uid];
        }
        const args = {
            uids: uids,
            page: page,
            perPage: limit,
            keyword: keyword,
            startTime: startDate,
            endTime: endDate,
            sortOrder: sortOrder,
        };
        const [success, result] = await this.callGo('GetWeiboByPage', args);
        if(!success){
            return [false, [], result];
        }
        const weibos: Weibo[] = result.List;
        return [true, await this.fillWeibosInfo(weibos), ''];
    }

    public async getWeibo(feedId:string):Promise<[boolean, Weibo, string]>{
        const [success, result] = await this.callGo('GetWeiboById', feedId);
        if(!success){
            return [false, null as Weibo, result];
        }
        return [true, await this.fillWeiboInfo(result), ''];
    }

    public async saveComment(content:string, media:Media[], location:Location|null, replyToId:string, feedId:string, uid:string):Promise<[boolean, string]>{
        for(let i in media){
            media[i].Origin = media[i].Origin.replaceAll('file://', '');
        }
        const args  = {
            Comment: {
                author: {id:uid},
                text: content,
                tsr: this.setting.weibo.enableTSR ? 1 : 0,
                replyToComment: replyToId !== '' ? {id: replyToId} : null,
                location: location,
                media: media,
            },
            feedId: feedId,
        };
        const [success, result] = await this.callGo('CreateComment', args);
        if(!success){
            return [false, result];
        }
        this.triggerBackup();
        return [true, ''];
    }

    public async getComments(feedId:string):Promise<[boolean, Comment[], string]>{
        const [success, result] = await this.callGo('GetCommentsByFeedId', feedId);
        if(!success){
            return [false, [], result];
        }
        for (let i = 0; i < result.length; i++) {
            result[i] = await this.fillCommentInfo(result[i]);
        }
        return [true, result, ''];
    }

    public async getLikes(feedId:string):Promise<[boolean, Like[], string]>{
        const [success, result] = await this.callGo('GetLikesByFeedId', feedId);
        if(!success){
            return [false, [], result];
        }
        result.map(like => {like.user = this.fillUserInfo(like.user);});
        return [true, result, ''];
    }

    public async getBeenReposted(feedId:string):Promise<[boolean, BeenPosted[], string]>{
        const [success, result] = await this.callGo('GetBeenRepostedByFeedId', feedId);
        if(!success){
            return [false, [], result];
        }
        result.map(beenPosted => {
            beenPosted.user = this.fillUserInfo(beenPosted.user);
            beenPosted.text = this.getContent(beenPosted.text);
        });
        return [true, result, ''];
    }

    public async saveMediaToLocal(mediaPath: string):Promise<[boolean, string]> {
        try {
            const destPath = AppPicturesBasePath;
            const dirExists = await RNFS.exists(destPath);
            if (!dirExists) {
                await RNFS.mkdir(destPath);
            }
            const filename = mediaPath.split('/').pop();
            const fullPath = destPath + '/' + filename;

            await RNFS.mkdir(destPath);
            if (mediaPath.startsWith('http://') || mediaPath.startsWith('https://')) {
                await RNFS.downloadFile({
                    fromUrl: mediaPath,
                    toFile: fullPath,
                }).promise;
            } else {
                await RNFS.copyFile(mediaPath, fullPath);
            }
            return [true, fullPath];
        } catch (e) {
            return [false, userErrorMessage(e)];
        }
    }

    public async assembleStrToCreateTSR(type:string, model:Weibo|Comment):Promise<[boolean, string]>{
        const params = {
            type: type,
            id: model.id,
        };
        const [success, result] = await this.callGo('AssembleStrToCreateTSR', params);
        if(!success){
            return [false, result];
        }
        return [true, result];
    }

    public async getTSR(type:string, id: string): Promise<[boolean, TSR, string]> {
        const params = {
            type: type,
            id: id,
        };
        const [success, result] = await this.callGo('GetTSR', params);
        if (!success) {
            return [false, null as TSR, result];
        }
        return [true, result as TSR, ''];
    }

    public async backupDB():Promise<[boolean, string]>{
        const args = {
            DBPath: this.dbPath,
            Key: config.encryptKey,
            BackupPath: '/feehiApp/db/' + (__DEV__ ? 'weibo_debug' : 'weibo'),
            WEBDAV:{
                URL: config.webdav.webdavURL,
                Username: config.webdav.username,
                Password: config.webdav.password,
            },
        };
        const [success, result] = await this.callGo('BackupDB', args);
        if(!success){
            return [false, result];
        }
        return [true, ''];
    }

    public async createTables(setting:Setting):Promise<[boolean, string]>{
        this.setting = setting;
        const dbSuffix = this.setting.global.dbSuffix.length > 0 ? this.setting.global.dbSuffix : (__DEV__ ? '_debug' : '');
        this.dbPath = AppDBBasePath + '/weibo' + dbSuffix;
        const [success, result] = await this.callGo('CreateWeiboTables', {
            DBPath: this.dbPath,
            BasePath: AppWeiboBasePath,
            LargeBasePath: AppWeiboLargeBasePath,
            Stmts: [
                'CREATE TABLE IF NOT EXISTS `feeds` (`id` text,`link_href` text,`url` text,`uid` text,`time` datetime,`content` text,`coordinates` text,`location` text,`comment_num` integer,`like_num` integer,`repost_num` integer,`by_id` integer,`retweet_id` text, type integer DEFAULT 1, tsr integer DEFAULT 0, PRIMARY KEY (`id`));',
                'CREATE TABLE IF NOT EXISTS `pictures` (`id` integer,`type` text,`third_id` text,`picture` text,PRIMARY KEY (`id`));',
                'CREATE TABLE IF NOT EXISTS `comments` (`id` text,`time` datetime,`like_num` integer,`content` text,`location` text,`reply_to` text,`feed_id` text,`user_id` text,tsr integer DEFAULT 0,PRIMARY KEY (`id`));',
                'CREATE TABLE IF NOT EXISTS `retweets` (`id` text,`link_href` text,`url` text,`uid` text,`time` datetime,`content` text,`coordinates` text,`location` text,`comment_num` integer,`like_num` integer,`repost_num` integer,`by_id` integer,`retweet_id` text,PRIMARY KEY (`id`));',
                'CREATE TABLE IF NOT EXISTS `bies` (`id` integer,`url` text,`title` text,PRIMARY KEY (`id`));',
                'CREATE TABLE IF NOT EXISTS `users` (`id` text,`name` text,`pic` text,`pic_local` text,`home_page` text,PRIMARY KEY (`id`));',
                'CREATE TABLE IF NOT EXISTS `likes` (`id` integer,`feed_id` text,`user_id` text,`count` integer,PRIMARY KEY (`id`));',
                'CREATE TABLE IF NOT EXISTS `been_reposts` (`id` text,`feed_id` text,`user_id` text,`content` text,`time` datetime,`href_link` text,`location` text,`url` text,PRIMARY KEY (`id`));',
                'CREATE TABLE IF NOT EXISTS `tsr` (`type` text,`third_id` text,`tsr`,PRIMARY KEY (`type`, `third_id`));'
            ],
        });
        if(!success){
            return [false, result];
        }
        return [true, ''];
    }

    private triggerBackup(){
        NativeModules.RNHelper.scheduleTask(ScheduleTask.ONCE_BACKUP_WEIBO.toString(), 'ONCE', {triggerAt: Date.now() + 1 * 60 * 1000} );
    }

    private fillUserInfo(user:User):User{
        if( this.setting.weibo.anonymous !== 0 &&
            (user.id === BianshenHuangGuaGeiNiYongUID || user.id === ZunshoujimochengxuID || user.id === HuiHuiID )
        ){
            const anonymousUser =  anonymousUsernames.find(item => item.id === user.id);
            if(this.setting.weibo.anonymous === 1 && anonymousUser){
                user.name = anonymousUser.name;
                user.avatar = anonymousUser.avatar;
            }else if(this.setting.weibo.anonymous === 2 && anonymousUser){
                user.name = anonymousUser.name;
            } if(this.setting.weibo.anonymous === 3 && anonymousUser){
                user.avatar = anonymousUser.avatar;
            }
        }

        return {
            id: user.id,
            name: user.name,
            avatar: user.avatar.startsWith('http') ? user.avatar : AppWeiboBasePath + '/' + user.avatar,
        };
    }

    private async fillMediaInfo(medias:Media[]):Promise<Media[]> {
        let filledMedia:Media[] = [];
        for(let i in medias){
            let media = medias[i];
            if(media.Origin !== '') {
                media.Origin = media.Origin.startsWith('http') ? media.Origin : AppWeiboBasePath + '/' + media.Origin;
            }
            if(media.IsLarge && !await RNFS.exists(media.Origin)){//如果大文件尝试看一下 media.Origin 是否存在，否则替换成远端文件地址
                const basePath = media.IsLarge === 1 ? AppWeiboLargeBasePath : AppWeiboBasePath;
                media.Origin = 'http://192.168.1.2:8080/weibo/file?path=' + (media.Origin.startsWith(basePath) ? media.Origin.slice(basePath.length) : '');
            }
            filledMedia.push(media);
        }
        return filledMedia;
    }

    private async fillWeibosInfo(weibos:Weibo[]):Promise<Weibo[]>{
        return Promise.all(
            weibos.map(weibo => this.fillWeiboInfo(weibo))
        );
    }
    private async fillWeiboInfo(weibo:Weibo):Promise<Weibo>{
        weibo.user = this.fillUserInfo(weibo.user);
        weibo.media = await this.fillMediaInfo(weibo.media);
        weibo.text = this.getContent(weibo.text);
        if(weibo.repost){
            weibo.repost = await this.fillWeiboInfo(weibo.repost);
        }
        return weibo;
    }
    private async fillCommentInfo(comment:Comment):Promise<Comment>{
        comment.author =  this.fillUserInfo(comment.author);
        comment.text = this.getContent(comment.text);
        comment.media = await this.fillMediaInfo(comment.media);
        if(comment.replyToComment){
            comment.replyToComment = await this.fillCommentInfo(comment.replyToComment);
        }
        return comment;
    }

    private getContent(str:string):string{
        if( !str.includes('___SPLIT___') ){
            return str;
        }
        const strs = str.split('___SPLIT___');
        if(this.setting.weibo.contentType === 'raw'){
            return strs[0];
        }else if(this.setting.weibo.contentType === 'all') {
            return str;
        }else{
            return strs[1];
        }
    }
}
