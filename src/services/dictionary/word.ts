import repository from '../../db/words';
import {RememberWordItem} from './model';
import {AbstractService} from '../service';
import {Setting} from '../setting';

export default class WordService extends AbstractService<WordService>{

    private repository:repository;

    protected async onInit(_:Setting): Promise<void> {
        this.repository = new repository();
        await this.repository.init();
    }
    public async getWordsByPage(pageNum:number, perPage:number):Promise<[Boolean, RememberWordItem[]]>{

        try{
            const rows = await this.repository.getWordsByPage(pageNum, perPage);

            let items:RememberWordItem[] = rows as any;
            return [true, items];
        }catch (e){
            return [false, e.message ? e.message : e.toString()];
        }
    }

    public async getTotalPage():Promise<[boolean, number]>{
        try{
            const count = await this.repository.getTotalCount();
            return [true, count];
        }catch (e) {
            return [false, e.message ? e.message : e.toString()];
        }
    }
}
