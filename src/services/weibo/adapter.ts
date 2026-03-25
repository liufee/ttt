import {AbstractService} from '../service';
import {BeenPosted, Comment, Like, Media, Weibo, TSR, Location} from './model';
import goWeiboService from './goWeibo';
import {Setting} from '../setting';

export default interface Adapter {
    createWeibo(uid: string, content: string, mediaItems: Media[], location:Location|null, repostWeibo: Weibo | null): Promise<[boolean, string]>

    deleteWeibo(weibo: Weibo): Promise<[boolean, string]>

    getWeiboByPage(uid: string, page: number, offset: number, limit: number, keyword: string, startDate?: string, endDate?: string, sortOrder?: string): Promise<[boolean, Weibo[], string]>

    getWeibo(feedId: string): Promise<[boolean, Weibo, string]>

    saveComment(content: string, media:Media[], location:Location|null, replyToId: string, feedId: string, uid: string): Promise<[boolean, string]>

    getComments(feedId: string): Promise<[boolean, Comment[], string]>

    getLikes(feedId: string): Promise<[boolean, Like[], string]>

    getBeenReposted(feedId: string): Promise<[boolean, BeenPosted[], string]>

    saveMediaToLocal(mediaPath: string): Promise<[Boolean, string]>

    assembleStrToCreateTSR(type:string, model:Weibo|Comment):Promise<[boolean, string]>

    getTSR(type:string, id: string): Promise<[boolean, TSR, string]>

    backupDB():Promise<[boolean, string]>

    createTables(setting:Setting):Promise<[boolean, string]>
};

export class WeiboService  extends AbstractService<WeiboService> implements Adapter{
    private service:Adapter;

    protected async onInit(setting: Setting){
        await goWeiboService.init(setting);
        this.service = goWeiboService.getInstance();
    }
    public async createWeibo(uid:string, content:string, mediaItems: Media[], location:Location|null, repostWeibo: Weibo|null):Promise<[boolean, string]> {
        return this.service.createWeibo(uid, content, mediaItems, location, repostWeibo);
    }

    public async  deleteWeibo(weibo:Weibo):Promise<[boolean, string]>{
        return this.service.deleteWeibo(weibo);
    }
    public async  getWeiboByPage(uid:string, page:number, offset:number, limit:number, keyword:string = '', startDate?:string, endDate?:string, sortOrder:string = 'desc'):Promise<[boolean, Weibo[], string]>{
        return this.service.getWeiboByPage(uid, page, offset, limit, keyword, startDate, endDate, sortOrder);
    }
    public async  getWeibo(feedId:string):Promise<[boolean, Weibo, string]>{
        return this.service.getWeibo(feedId);
    }
    public async  saveComment(content:string, media:Media[], location:Location|null, replyToId:string, feedId:string, uid:string):Promise<[boolean, string]>{
        return this.service.saveComment(content, media, location, replyToId, feedId, uid);
    }
    public async  getComments(feedId:string):Promise<[boolean, Comment[], string]>{
        return this.service.getComments(feedId);
    }
    public async  getLikes(feedId:string):Promise<[boolean, Like[], string]>{
        return this.service.getLikes(feedId);
    }
    public async  getBeenReposted(feedId:string):Promise<[boolean, BeenPosted[], string]>{
        return this.service.getBeenReposted(feedId);
    }

    public async  saveMediaToLocal(mediaPath:string):Promise<[Boolean, string]>{
        return this.service.saveMediaToLocal(mediaPath);
    }

    public async assembleStrToCreateTSR(type:string, model:Weibo|Comment):Promise<[boolean, string]>{
        return this.service.assembleStrToCreateTSR(type, model);
    }

    public async getTSR(type:string, id: string): Promise<[boolean, TSR, string]> {
        return this.service.getTSR(type, id);
    }

    public async backupDB():Promise<[boolean, string]>{
        return this.service.backupDB();
    }

    public async createTables(setting:Setting):Promise<[boolean, string]>{
        return this.service.createTables(setting);
    }
}
