import {Comment, Weibo, Media, By, User, Like, TSR, BeenPosted, Location} from './model';
import repository from '../../db/weibo';
import {format} from 'date-fns';
import RNFS from 'react-native-fs';
import {NativeModules} from 'react-native';
import {
    AppPicturesBasePath,
    AppWeiboBasePath,
    AppWeiboLargeBasePath,
} from '../../constant';
import {
    usernames,
    anonymousUsernames,
    ByFeehiAPP,
    bies,
    BianshenHuangGuaGeiNiYongUID,
    ZunshoujimochengxuID,
} from './data';
import {userErrorMessage} from '../../utils';
import {AbstractService} from '../service';
import adapter from './adapter';
import {Setting} from '../setting';

export default class WeiboService extends AbstractService<WeiboService> implements adapter{

    private setting:Setting;
    private repository:repository;

    protected async onInit(setting:Setting){
        this.setting = setting;
        this.repository = new repository();
        await this.repository.init(this.setting.global.dbSuffix);
    }

    private defaultUser:User = {
        id:'0',
        name:'guest',
        avatar:'users/guest.png',
    };

    public async createWeibo(uid:string, content:string, media: Media[], location:Location|null, repostWeibo: Weibo|null):Promise<[boolean, string]>{
        try {
            const date = new Date();
            const weiboID = date.getTime().toString();
            const time = format(date, 'yyyy-MM-dd HH:mm:ss') + '+08:00';
            let repostId = repostWeibo != null ? repostWeibo.id : '';

            let medias = [];
            for (let i in media) {
                const item = media[i];
                const fileName = weiboID + '_' + i.toString() + '.' + item.Origin.split('.').pop();
                const [res, path, isLarge] = await this.writeToFile(fileName, item.Origin, uid);
                if (!res) {
                    return [false, path];
                }
                item.Origin = path;
                item.IsLarge = isLarge ? 1 : 0;
                medias.push({
                    type: 'feed',
                    third_id: weiboID,
                    picture: JSON.stringify(item),
                });
            }

            const weibo = {
                id: weiboID,
                uid: uid,
                type: 2,//自己发布的，1为新浪微博搬迁
                link_href: '',///新浪微博搬迁
                url: '',//新浪微博搬迁
                time: time,
                content: content,
                coordinates: location !== null ? location.coordinates.longitude + ',' + location.coordinates.latitude : '',
                location: location !== null ? location.address : '',
                comment_num: 0,
                like_num: 0,
                repost_num: 0,
                by_id: ByFeehiAPP,
                retweet_id: repostId,
                medias: medias,
                tsr: '',
            };
            if (this.setting.weibo.enableTSR) {
                for(let i in media){
                    if(media[i].IsLarge){
                        media[i].Origin = AppWeiboLargeBasePath + '/' + media[i].Origin + ',';
                    }else{
                        media[i].Origin  = AppWeiboBasePath + '/' + media[i].Origin + ',';
                    }
                }
                const obj: Partial<Weibo> = {};
                obj.id = weibo.id;
                obj.text = weibo.content;
                obj.createdAt = weibo.time.replace('+08:00', '');
                obj.media = media;
                const [result, info] = await this.generateTSR('weibo', obj as Weibo);
                if (!result) {
                    return [false, '创建tsr失败:' + info];
                }
                weibo.tsr = info;
            }
            await this.repository.createWeibo(weibo);
            return [true, ''];
        }catch (e){
            return [false, userErrorMessage(e)];
        }
    }

    public async deleteWeibo(weibo:Weibo):Promise<[boolean, string]>{
        try {
            for (let i in weibo.media) {
                const path = weibo.media[i].Origin;
                await RNFS.exists(path) && await RNFS.unlink(path);
            }
            const result = await this.repository.deleteWeibo(weibo.id);
            if(!result){
                return [false, '删除失败'];
            }
            return [true, ''];
        }catch (e){
            return [false, userErrorMessage(e)];
        }
    }

    public async getWeiboByPage(uid:string, page:number, offset:number, limit:number, keyword:string = '', startDate?:string, endDate?:string, sortOrder:string = 'desc'):Promise<[boolean, Weibo[], string]>{
        let uids = [];
        if(uid === '0'){
            uids = this.setting.weibo.enabledUsers;
        }else{
            uids = [uid];
        }
        let weibos:Weibo[] = [];
        try {
            let rows:any = [];
            if (keyword === '') {
                rows = await this.repository.getWeiboByPage(uids, page, offset, limit, ['1', '2'], startDate, endDate, sortOrder);
            } else {
                rows = await this.repository.getWeiboByPageWithKeyword(uids, page, offset, limit, ['1', '2'], keyword, startDate, endDate, sortOrder);
            }

            let attachmentIds = [];
            let repostIds = [];
            let userIds = [];

            for (let i in rows) {
                const item = rows[i];
                attachmentIds.push(item.id);
                if (item.retweet_id.length > 0) {
                    repostIds.push(item.retweet_id);
                }
                userIds.push(item.uid);
            }

            let attachmentsMap = await this.getAttachmentsMap('feed', attachmentIds);
            let repostMaps = await this.getRetweetsMap(repostIds);
            let biesMap = await this.getBiesMap();
            let usersMap = await this.getUsersMap(userIds);

            weibos = this.convertFeedsToWeibo(rows, attachmentsMap, repostMaps, biesMap, usersMap);
            return [true, weibos, ''];
        }catch (e){
            return [false, weibos, userErrorMessage(e)];
        }
    }

    public async getWeibo(feedId:string):Promise<[boolean, Weibo, string]>{
        let weibo:Weibo;
        try {
            let rows = await this.repository.getWeibo(feedId);
            let item = rows[0];

            let attachmentsMap = await this.getAttachmentsMap('feed',[feedId]);
            let repostMaps = await this.getRetweetsMap([item.retweet_id]);
            let biesMap = await this.getBiesMap();
            let usersMap = await this.getUsersMap([item.uid]);
            const weibos = this.convertFeedsToWeibo(rows, attachmentsMap, repostMaps, biesMap, usersMap);
            weibo = weibos[0];
            return [true, weibo, ''];
        }catch (e){
            return [false, weibo, userErrorMessage(e)];
        }
    }

    public async getComments(id:string):Promise<[boolean, Comment[], string]>{
        let comments: Comment[] = [];
        try {
            const rows = await this.repository.getComments(id);
            const commentIds = [];
            const replyIds = [];
            const userIds = [];
            for (let i in rows) {
                const item = rows[i];
                userIds.push(item.user_id);
                commentIds.push(item.id);

                if (item.reply_to && item.reply_to.length > 0) {
                    replyIds.push(item.reply_to);
                    commentIds.push(item.reply_to);
                }
            }


            const attachmentsMap = await this.getAttachmentsMap('comment', commentIds);

            const repliesMap: Map<string, Comment> = new Map();
            if (replyIds.length > 0) {
                const cmts = await this.repository.getCommentsByIds(replyIds);
                for (let i in cmts) {
                    const item = cmts[i];
                    userIds.push(item.user_id);
                    repliesMap.set(item.id.toString(), this.convertToComment(item, attachmentsMap, new Map(), new Map()));
                }
            };

            const usersMap = await this.getUsersMap(userIds);

            comments = this.convertToComments(rows, attachmentsMap, usersMap, repliesMap);
            for(let i in comments){
                if (comments[i].replyToComment) {
                    comments[i].replyToComment.author = usersMap.get(comments[i].replyToComment.user_id) ?? this.defaultUser;
                }
            };
            return [true, comments, ''];
        }catch (e){
            return [false, comments, userErrorMessage(e)];
        }
    }

    public async getLikes(feedId:string):Promise<[boolean, Like[], string]>{
        let likes: Like[] = [];
        try {
            const rows = await this.repository.getLikes(feedId);
            const userIds = [];
            for (let i in rows) {
                const item = rows[i];
                userIds.push(item.user_id);
            }

            const usersMap = await this.getUsersMap(userIds);
            for (let i in rows) {
                const item = rows[i];
                const user = usersMap.has(item.user_id) ? usersMap.get(item.user_id)! : this.defaultUser;
                likes.push({
                    id: item.id,
                    user: user,
                    count: item.count,
                });
            }
            return [true, likes, ''];
        }catch (e){
            return [false, likes, userErrorMessage(e)];
        }
    }

    public async getBeenReposted(feedId:string):Promise<[boolean, BeenPosted[], string]>{
        let beenReposted: BeenPosted[] = [];
        try {
            const rows = await this.repository.getBeenReposted(feedId);
            const userIds = [];
            for (let i in rows) {
                const item = rows[i];
                userIds.push(item.user_id);
            }

            const usersMap = await this.getUsersMap(userIds);

            for (let i in rows) {
                const item = rows[i];
                const user = usersMap.has(item.user_id) ? usersMap.get(item.user_id)! : this.defaultUser;
                beenReposted.push({
                    id: item.id,
                    user: user,
                    text: this.getContent(item.content),
                    time: item.time,
                });
            }
            return [true, beenReposted, ''];
        }catch (e){
            return [false, beenReposted, userErrorMessage(e)];
        }
    }

    public async getTSR(type:string, id:string):Promise<[boolean, TSR, string]>{
        let tsr:TSR;
        try {
            const rows = await this.repository.getTSR(type, id);
            if(rows.length <= 0){
                return [false, tsr, ''];
            }
            tsr = {
                type:rows[0].type,
                thirdId:rows[0].third_id,
                tsr:rows[0].tsr,
            };
            return [true, tsr, ''];
        }catch (e){
            return [false, tsr, userErrorMessage(e)];
        }
    }

    public async saveComment(content:string, media:Media[], location:Location, replyToId:string, feedId:string, uid:string):Promise<[boolean, string]>{
        const commentId = Date.now();
        try {
            let medias = [];
            for (let i in media) {
                const item = media[i];
                const fileName = feedId + '_comment_' + commentId + '_' + i.toString() + '.' + item.Origin.split('.').pop();
                const [res, path, isLarge] = await this.writeToFile(fileName, item.Origin, uid);
                if (!res) {
                    return [false, path];
                }
                item.Origin = path;
                item.IsLarge = isLarge ? 1 : 0;
                medias.push({
                    type: 'comment',
                    third_id: commentId,
                    picture: JSON.stringify(item),
                });
            }

            const record  = {
                id: commentId,
                like_num: 0,
                content: content,
                medias: medias,
                location: location !== null ? location.coordinates.longitude + ',' + location.coordinates.latitude + ',' + location.address : '',
                reply_to: replyToId,
                feed_id:feedId,
                user_id:uid,
                time:format(new Date(), 'yyyy-MM-dd HH:mm:ssXXX'),
                tsr:'',
            };
            if (this.setting.weibo.enableTSR) {
                for(let i in media){
                    if(media[i].IsLarge){
                        media[i].Origin = AppWeiboLargeBasePath + '/' + media[i].Origin + ',';
                    }else{
                        media[i].Origin  = AppWeiboBasePath + '/' + media[i].Origin + ',';
                    }
                }
                let obj:Partial<Comment> = {text:'', createdAt:''};
                obj.text = record.content;
                obj.media = media;
                obj.createdAt = record.time;
                const [result, info] = await this.generateTSR('comment', obj);
                if (!result) {
                    return [false, info];
                }
                record.tsr = info;
            };
            await this.repository.saveComment(record);
            await this.repository.IncrWeibo('comment_num', feedId);
            return [true, ''];
        }catch (e){
            return [false, userErrorMessage(e)];
        }
    }

    public async assembleStrToCreateTSR(type:string, obj:Weibo|Comment):Promise<[boolean, string]>{
        if(type === 'comment'){
            if( new Date(obj.createdAt).getTime() < new Date('2026-02-18').getTime() ) {
                return [true, `${obj.createdAt}+${obj.text}`];
            }else{
                const comment = obj as Comment;
                let filesStr = '';
                for(let i in comment.media){
                    filesStr += comment.media[i].Origin + ',';
                }
                if(filesStr.length > 0){
                    filesStr = filesStr.slice(0, -1);
                }
                const originString = await NativeModules.RNHelper.assembleStrToCreateTSR(`${obj.createdAt}+${obj.text}+`, filesStr);
                if(originString.indexOf('error:') === 0){
                    return [false, originString];
                }
                return [true, originString];
            }
        }
        const weibo = obj as Weibo;
        let filesStr = '';
        for(let i in weibo.media){
            filesStr += weibo.media[i].Origin + ',';
        }
        if(filesStr.length > 0){
            filesStr = filesStr.slice(0, -1);
        }
        let createdAt = '';
        if(weibo.id === '1744011193022' || weibo.id === '1743846080172'){
            createdAt = weibo.createdAt;
        }else{
            createdAt = weibo.createdAt + '+08:00';
        }

        if(filesStr === ''){//没有 media，tsr 的 v1 和 v2 没差别
            return [true, `${createdAt}+${weibo.text}+`];
        }

        if( new Date(createdAt).getTime() < new Date('2025-12-18').getTime() ){//之前的 tsr 计算是把文件 base64 后连接
            let mediaContents = '';
            for(let i in weibo.media){
                const item = weibo.media[i];
                mediaContents += await RNFS.readFile(item.Origin, 'base64');
            }
            return [true, `${createdAt}+${weibo.text}+${mediaContents}`];
        }
        const originString = await NativeModules.RNHelper.assembleStrToCreateTSR(`${createdAt}+${weibo.text}+`, filesStr);
        if(originString.indexOf('error:') === 0){
            return [false, originString];
        }
        return [true, originString];
    }

    public async saveMediaToLocal(mediaPath: string):Promise<[boolean, string]>{
        try {
            const destPath = AppPicturesBasePath;
            const dirExists = await RNFS.exists(destPath);
            if (!dirExists) {
                await RNFS.mkdir(destPath);
            }
            const filename = mediaPath.split('/').pop();
            const fullPath = destPath + '/' + filename;

            await RNFS.mkdir(destPath);
            if(mediaPath.startsWith('http://') || mediaPath.startsWith('https://')){
                await RNFS.downloadFile({
                    fromUrl: mediaPath,
                    toFile: fullPath,
                }).promise;
            }else {
                await RNFS.copyFile(mediaPath, fullPath);
            }
            return [true, fullPath];
        } catch (e) {
            return [false, userErrorMessage(e)];
        }
    }

    public async backupDB(): Promise<[boolean, string]> {
        throw new Error('Method not implemented.');
    }

    public async createTables(setting:Setting):Promise<[boolean, string]> {
        await this.onInit(setting);
        return [true, ''];
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

    public async generateTSR(type:string, obj:Weibo|Comment):Promise<[boolean, string]>{
        const [success, str] = await this.assembleStrToCreateTSR(type, obj);
        if(!success){
            return [false, str];
        }
        let result = await NativeModules.RNHelper.generateTSR(str);
        if (result.indexOf('error:') === 0){
            return [false, result];
        }
        return [true, result];
    }

    private async  getUsersMap(uids:string[]):Promise<Map<string, User>>{
        const userIds = [...new Set(uids)];
        let usersMap:Map<string, User> = new Map();
        for(let i in usernames){
            let user:User = {
                id:usernames[i].id,
                name:usernames[i].name,
                avatar:usernames[i].avatar,
            };
            const anonymousUser =  anonymousUsernames.find(item => item.id === user.id);
            if(this.setting.weibo.anonymous === 1 && anonymousUser){
                user.name = anonymousUser.name;
                user.avatar = anonymousUser.avatar;
            }else if(this.setting.weibo.anonymous === 2 && anonymousUser){
                user.name = anonymousUser.name;
            } if(this.setting.weibo.anonymous === 3 && anonymousUser){
                user.avatar = anonymousUser.avatar;
            }
            user.avatar = AppWeiboBasePath + '/' + user.avatar;
            usersMap.set(usernames[i].id.toString(), user);
        }
        if( userIds.every(v => v === BianshenHuangGuaGeiNiYongUID || v === ZunshoujimochengxuID || v === '3' ) ){
            return usersMap;
        }

        if(userIds.length <= 0){
            return usersMap;
        }
        let rows = await this.repository.getUsers(userIds);
        for(let i in rows){
            const item = rows[i];
            if( this.setting.weibo.anonymous !== 0 ){
                const anonymousUser =  anonymousUsernames.find(temp => temp.id === item.id);
                if( anonymousUser && this.setting.weibo.anonymous === 1 ){
                    item.name = anonymousUser.name;
                    item.pic = anonymousUser.avatar;
                }
                if( anonymousUser && this.setting.weibo.anonymous === 2){
                    item.name = anonymousUser.name;
                }
                if( anonymousUser && this.setting.weibo.anonymous === 3){
                    item.pic = anonymousUser.avatar;
                }
            }
            usersMap.set(item.id.toString(), {
                id:item.id,
                name:item.name,
                avatar:AppWeiboBasePath + '/' + item.pic,
            });
        }
        return usersMap;
    }

    private async getAttachmentsMap(type: string, thirdIds:string[]):Promise<Map<string, Media[]>>{
        const tempMap:Map<string, Media[]> = new Map();
        if(thirdIds.length === 0){
            return tempMap;
        }
        let attachments = await this.repository.getAttachments(type, thirdIds);
        for(let i in attachments){
            const attachment = attachments[i];
            let media:Media = JSON.parse(attachment.picture);
            const basePath = media.IsLarge === 1 ? AppWeiboLargeBasePath : AppWeiboBasePath;
            if(media.Origin !== '') {
                media.Origin = media.Origin.startsWith('http') ? media.Origin : basePath + '/' + media.Origin;
            }
            if(media.LivePhoto !== '') {
                media.Origin = media.LivePhoto.startsWith('http') ? media.LivePhoto : basePath + '/' + media.LivePhoto;
            }
            if(media.IsLarge && !await RNFS.exists(media.Origin)){//如果大文件尝试看一下 media.Origin 是否存在，否则替换成远端文件地址
                media.Origin = 'http://192.168.1.2:8080/weibo/file?path=' + (media.Origin.startsWith(basePath) ? media.Origin.slice(basePath.length) : '');
            }
            if( tempMap.has(attachment.third_id) ){
                tempMap.get(attachment.third_id)?.push(media);
            }else {
                tempMap.set(attachment.third_id, [media]);
            }
        }
        return tempMap;
    }

    private async getRetweetsMap(retweetIds: string[]):Promise<Map<string, Weibo>>{
        let repostsMap:Map<string, Weibo> = new Map();
        if(retweetIds.length === 0){
            return repostsMap;
        }

        let feedIds = [];
        let repostIds = [];
        for(let i in retweetIds){
            if(retweetIds[i].length === 13){
                feedIds.push(retweetIds[i]);
            }else{
                repostIds.push(retweetIds[i]);
            }
        }

        if( feedIds.length > 0 ){
            const rows = await this.repository.getRetweets(feedIds);
            let attachmentIds = [];
            let userIds = [];
            for(let i in rows) {
                const item = rows[i];
                attachmentIds.push(item.id);
                repostIds.push(item.retweet_id);
                userIds.push(item.uid);
            }
            const attachmentsMap = await this.getAttachmentsMap('feed', attachmentIds);
            const nullRepostsMap:Map<string, Weibo> = new Map();
            const biesMap = await this.getBiesMap();
            const usersMap = await this.getUsersMap(userIds);
            const weibos = this.convertFeedsToWeibo(rows, attachmentsMap, nullRepostsMap, biesMap, usersMap);
            for(let i in weibos){
                repostsMap.set(weibos[i].id.toString(), weibos[i]);
            }
        }

        if( repostIds.length > 0 ){
            const retweets = await this.repository.getRetweetsCompatible(repostIds);
            let attachmentIds = [];
            let userIds = [];
            for(let i in retweets){
                attachmentIds.push(retweets[i].id);
                userIds.push(retweets[i].uid);
            }
            const attachmentsMap = await this.getAttachmentsMap('retweet', attachmentIds);
            const usersMap = await this.getUsersMap(userIds);

            let weibos:Weibo[] = [];
            for(let i in retweets){
                const item = retweets[i];
                const user:User = usersMap.has(item.uid) ? usersMap.get(item.uid)! : this.defaultUser;
                let location:Location|null = null;
                if( item.coordinates ){
                    const coordinates = item.coordinates.split(',');
                    if(coordinates.length === 2){
                        location = {
                            address:item.location,
                            coordinates:{longitude:Number(coordinates[0]), latitude:Number(coordinates[1])}
                        };
                    }
                }
                weibos.push({
                    id: item.id,
                    type:item.type,
                    text: this.getContent(item.content),
                    media: attachmentsMap.has(item.id) ? attachmentsMap.get(item.id)! : [],
                    comments: [],
                    forwardCount: item.repost_num,
                    likeCount: item.like_num,
                    commentCount: item.comment_num,
                    createdAt: item.time.trim().replace('+08:00', ''),
                    uid: item.user_id,
                    user: user,
                    repost: null,
                    by:{ id:0, title:'',url:''},
                    location: location,
                    tsr: item.tsr,
                    tsrVerified: 1,
                });
            }
            for(let i in weibos){
                repostsMap.set(weibos[i].id, weibos[i]);
            }
        }
        return repostsMap;
    }

    private async getBiesMap():Promise<Map<string, By>>{
        let biesMap:Map<string, By> = new Map();
        const rows = await this.repository.getBies();
        for(let i in rows){
            biesMap.set(rows[i].id.toString(), {
                id: rows[i].id,
                title: rows[i].title,
                url: rows[i].url,
            });
        }
        biesMap.set(ByFeehiAPP.toString(), bies.ByFeehiAPP);
        return biesMap;
    }

    static readonly LargeFileAtLeastSize = 50 * 1024 * 1024;
    private async  writeToFile(fileName: string, sourcePath: string, uid:string):Promise<[boolean, string, boolean]>{
        const now = new Date();
        const year = now.getFullYear().toString();
        const month = String(now.getMonth() + 1).padStart(2, '0'); // 保证两位数
        const filePath = `${uid}/${year}/${month}`;
        let basePath = '';
        try {
            const stat = await RNFS.stat(sourcePath);
            const isLarge = stat.size > WeiboService.LargeFileAtLeastSize;
            if(isLarge){
                basePath = `${AppWeiboLargeBasePath}/${filePath}`;
            }else{
                basePath = `${AppWeiboBasePath}/${filePath}`;
            }
            // 检查目录是否存在
            const dirExists = await RNFS.exists(basePath);
            if (!dirExists) {
                await RNFS.mkdir(basePath); // 创建目录
            }
            const wholePath = `${basePath}/${fileName}`;
            await RNFS.copyFile(sourcePath, wholePath);
            return [true, filePath + '/' + fileName, isLarge];
        } catch (e) {
            return [false, userErrorMessage(e), false];
        }
    }

    private convertFeedsToWeibo(items, attachmentsMap:Map<string, Media[]>, repostsMap:Map<string, Weibo>, biesMap:Map<string, By>, usersMap:Map<string, User>):Weibo[]{
        let weibos:Weibo[] = [];
        for(let i in items){
            const weibo:Weibo  = this.convertFeedToWeibo(items[i], attachmentsMap, repostsMap, biesMap, usersMap);
            weibos.push(weibo);
        }
        return weibos;
    }

    private convertFeedToWeibo(item, attachmentsMap:Map<string, Media[]>, repostsMap:Map<string, Weibo>, biesMap:Map<string, By>, usersMap:Map<string, User>):Weibo{
        let location:Location|null = null;
        if( item.coordinates ){
            const coordinates = item.coordinates.split(',');
            if(coordinates.length === 2){
                location = {
                    address:item.location,
                    coordinates:{longitude:Number(coordinates[0]), latitude:Number(coordinates[1])}
                };
            }
        }
        return {
            id: item.id,
            type:item.type,
            text: this.getContent(item.content),
            media: attachmentsMap.has(item.id) ? attachmentsMap.get(item.id)! : [],
            comments: [],
            forwardCount: item.repost_num,
            likeCount: item.like_num,
            commentCount: item.comment_num,
            createdAt: item.time.replace('+08:00', '').replace('+00:00', ''),
            uid: item.uid,
            user:usersMap.has(item.uid?.toString()) ? usersMap.get(item.uid?.toString())! : this.defaultUser,
            repost: repostsMap.has(item.retweet_id) ? repostsMap.get(item.retweet_id)! : null,
            retweet_id: item.retweet_id,
            location: location,
            by: biesMap.has(item.by_id.toString()) ? biesMap.get(item.by_id.toString())! : {'id':0, 'title':'', url:''},
            tsr: item.tsr,
            tsrVerified: 1, // js 版本需要进入详情页再验证
        };
    }

    private convertToComments(items, attachmentsMap:Map<string, Media[]>, usersMap:Map<string, User>, repliesMap:Map<string, Comment>){
        let comments:Comment[] = [];
        for(let i in items){
            comments.push(this.convertToComment(items[i], attachmentsMap, usersMap, repliesMap));
        }
        return comments;
    }

    private convertToComment(item, attachmentsMap:Map<string, Media[]>, usersMap:Map<string, User>, repliesMap:Map<string, Comment>):Comment{
        let location:Location|null = null;
        if(item.location !== '') {
            const temp = item.location.split(",", 3);
            if (temp.length === 3) {
                const longitude = parseFloat(temp[0]);
                if (isNaN(longitude)) {
                    throw new Error(`Invalid longitude: ${temp[0]}`);
                }

                const latitude = parseFloat(temp[1]);
                if (isNaN(latitude)) {
                    throw new Error(`Invalid latitude: ${temp[1]}`);
                }

                location = {
                    address: temp[2],
                    coordinates: {
                        longitude,
                        latitude,
                    },
                };
            } else {
                location = {
                    coordinates: {longitude:0, latitude:0},
                    address: item.location.replaceAll('来自', ''),
                };
            }
        }
        return {
            id: item.id,
            text: this.getContent(item.content),
            location: location,
            media: attachmentsMap.has(item.id) ? attachmentsMap.get(item.id)! : [],
            author: usersMap.has(item.user_id) ? usersMap.get(item.user_id)! : this.defaultUser,
            replyToComment: repliesMap.has(item.id) ? repliesMap.get(item.id)! : null,
            createdAt: item.time,
            tsr: item.tsr,
            tsrVerified: 1, // js版本进入验证详情再验证
        };
    }
}
