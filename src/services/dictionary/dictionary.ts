import repository from '../../db/dictionary';
import {format} from 'date-fns';
import {AbstractService} from '../service';
import {SearchHistory, SearchResult, Status} from './model';
import {userErrorMessage} from '../../utils';
import {Setting} from '../setting';

export default class DictionaryService extends AbstractService<DictionaryService>{

    private repository:repository;

    protected async onInit(setting: Setting): Promise<void> {
        this.repository = new repository();
        await this.repository.init(setting.global.dbSuffix);
    }

    public async getSearchHisCountByStatus(status:number):Promise<number>{
        return await this.repository.getCountByStatus(status);
    }

    public async saveSearchHistory(word:string, translation:string):Promise<[boolean, string]>{
        try{
            const record = {
                word:word,
                translation:translation,
                status:Status.StatusInit,
                created_at:format(new Date(), 'yyyy-MM-dd HH:mm:ss'),
            };
            await this.repository.saveSearchHistory(record);
            return [true, ''];
        }catch (e){
            return [false, userErrorMessage(e)];
        }
    }

    public async searchWord(word:string):Promise<[boolean,SearchResult|null, string]>{
        const query = word.toLowerCase();
        try{
            const rows = await this.repository.searchWord(query);
            if(rows.length >= 1){
                const searchResult:SearchResult = { word: word, translation: rows[0].translation, isLocal: true };
                return [true, searchResult, ''];
            }
            return [true, null, ''];
        }catch (e){
            return [false, null, userErrorMessage(e)];
        }
    }

    public async searchWordRemote(word:string):Promise<[boolean,SearchResult|null, string]> {
        const query = word.toLowerCase();
        try {
            const response = await fetch('https://dict.youdao.com/suggest?q=' + query + '&le=&num=1&ver=2.0&doctype=json&keyfrom=mdict.7.2.0.android&model=honor&mid=5.6.1&imei=659135764921685&vendor=wandoujia&screen=1080x1800&ssid=superman&abtest=2');
            const body = await response.json();
            if (body.result.code !== 200 || body.data.entries.length <= 0) {
                return [true, null, ''];
            }
            const searchResult: SearchResult = {word: word, translation: body.data.entries[0].explain, isLocal: false};
            return [true, searchResult, ''];
        } catch (e) {
            return [false, null, userErrorMessage(e)];
        }
    }

    public async searchHis():Promise<[boolean, SearchHistory[], string]>{
        return this._searchHis(Status.StatusInit);
    }

    public async getRememberedSearchHistory():Promise<[boolean, SearchHistory[], string]>{
        return this._searchHis(Status.StatusRemembered);
    }

    public async _searchHis(status:Number):Promise<[boolean, SearchHistory[], string]>{
        let searchHistories:SearchHistory[] = [];
        try {
            const items = await this.repository.searchHis(status);
            for(let i in items){
                const item = items[i];
                searchHistories.push({
                    id:item.id,
                    word:item.word,
                    translation:item.translation,
                    status:item.status,
                    createdAt:item.created_at,
                });
            }
            return [true, searchHistories, ''];
        }catch (e){
            return [false, searchHistories, userErrorMessage(e)];
        }
    }

    public async updateStatus(id:Number,status:Status):Promise<[boolean, string]>{
        try{
            await this.repository.updateStatus(id, status);
            return [true, ''];
        }catch (e){
            return [false, userErrorMessage(e)];
        }
    }

    public async deleteSearchHistory(id:number):Promise<[boolean, string]>{
        try {
            await this.repository.deleteSearchHistory(id);
            return [true, ''];
        }catch (e){
            return [false, userErrorMessage(e)];
        }
    }
}
