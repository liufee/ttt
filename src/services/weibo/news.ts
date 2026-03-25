import {Weibo} from './model';
import {NativeModules} from 'react-native';
import config from '../../config';
import {AbstractService} from '../service';
import {AppWeiboBasePath} from '../../constant';
import {Setting} from "../setting";
import {userErrorMessage} from '../../utils';

const avatarBaseURL = AppWeiboBasePath + '/users/media'
const mediaUsers = {
    101: {
        'id': 101,
        'name': '联合早报',
        'avatar': avatarBaseURL + '/zaobao.jpeg',
    },
    102: {
        'id': 102,
        'name': '彭博社',
        'avatar':  avatarBaseURL + '/bloomberg.jpeg',
    },
    103: {
        'id': 103,
        'name': '生活科学',
        'avatar':  avatarBaseURL + '/liveScience.jpeg',
    },
    104: {
        'id': 104,
        'name': '路透社',
        'avatar':  avatarBaseURL + '/routers.png',
    },
    105: {
        'id': 105,
        'name': 'BBC',
        'avatar': avatarBaseURL + '/bbc.png',
    },
    106: {
        'id': 106,
        'name': '天空新闻',
        'avatar': avatarBaseURL + '/sky.png',
    },
    107: {
        'id': 107,
        'name': '金融时报',
        'avatar':   avatarBaseURL + '/ft.png',
    },
    108: {
        'id': 108,
        'name': '经济学人',
        'avatar':  avatarBaseURL + '/economist.png',
    },
    109: {
        'id': 109,
        'name': '卫报',
        'avatar':  avatarBaseURL + '/guardian.png',
    },
    110: {
        'id': 110,
        'name': '纽约时报',
        'avatar':  avatarBaseURL + '/nytimes.png',
    },
    111: {
        'id': 111,
        'name': '法广',
        'avatar':  avatarBaseURL + '/rfi.png',
    },
};
class NewsService extends AbstractService<NewsService>{
    private setting:Setting;

    protected async onInit(setting: Setting): Promise<void> {
        this.setting = setting;
    }

    private async getNews():Promise<[boolean, Weibo[], string]>{
        try {
            return await this._getNews();
        }catch (e){
            return [false, [], userErrorMessage(e)];
        }
    }

    private async _getNews():Promise<[boolean, Weibo[], string]>{
        const newsMedia = this.setting.weibo.newsMedia;
        const tasks = [];
        if (newsMedia.indexOf('zaobao') !== -1) {
            tasks.push(this.crawZaobao());
        }
        if (newsMedia.indexOf('bloomberg') !== -1) {
            tasks.push(this.crawBloomberg());
        }
        if (newsMedia.indexOf('liveScience') !== -1) {
            tasks.push(this.crawLiveScience());
        }
        if (newsMedia.indexOf('routers') !== -1) {
            tasks.push(this.crawRouters());
        }
        if (newsMedia.indexOf('bbc') !== -1) {
            tasks.push(this.crawBBC());
        }
        if (newsMedia.indexOf('sky') !== -1) {
            tasks.push(this.crawSky());
        }
        if (newsMedia.indexOf('ft') !== -1) {
            tasks.push(this.crawFT());
        }
        if (newsMedia.indexOf('economist') !== -1) {
            tasks.push(this.crawEconomist());
        }
        if (newsMedia.indexOf('guardian') !== -1) {
            tasks.push(this.crawGuardian());
        }
        if (newsMedia.indexOf('nytimes') !== -1) {
            tasks.push(this.crawNytimes());
        }
        if (newsMedia.indexOf('rfi') !== -1) {
            tasks.push(this.crawRfi());
        }

        let news = [];
        let weibos: Weibo[] = [];
        try {
            const results = await Promise.all(tasks);
            news = results.flat();
        }catch (e){
            return [false, weibos, userErrorMessage(e)];
        }

        news.sort((a, b) => {
            return new Date(b.date) - new Date(a.date);
        });

        for (let i in news) {
            const item = news[i];
            const weibo:Weibo = {
                id: item.href,
                type: 3,
                text: item.text,
                media: item.media
                    ? [{
                        Mime: 'image/jpeg',
                        Origin: String(item.media),
                        LivePhoto: '',
                        IsLarge: 0,
                    }]
                    : [],
                comments: [],
                forwardCount: 0,
                likeCount: 0,
                commentCount: 0,
                createdAt: item.date,
                uid: item.uid,
                user: mediaUsers[item.uid],
                repost: null,
                location: null,
                by: { id: 0, title: '', url: '' },
                tsr: 0,
                tsrVerified: 0,
            };
            weibos.push(weibo);
        }
        return [true, weibos, ''];
    }

    private async crawZaobao() {
        const response = await fetch('https://www.zaobao.com/realtime/china', {
            method: 'GET',
            headers: {
                'Content-Type': 'text/html',
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Safari/537.36'
            },
        });
        const body = await response.text();
        let str = await NativeModules.RNHelper.parseNews('zaobao', 'list', body, '//main//article//a');
        let articles = JSON.parse(str);
        for (let i in articles) {
            articles[i].uid = 101;
            let domain = 'https://www.zaobao.com';
            if( !articles[i].href.startsWith('/') ){
                domain += '/';
            }
            articles[i].href = domain + articles[i].href;
        }
        return articles;
    }

    private async crawBloomberg(){
        const response = await fetch('https://bloombergnew.buzzing.cc/', {
            method: 'GET',
            headers: {
                'Content-Type': 'text/html',
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Safari/537.36'
            },
        });
        const body = await response.text();
        let str = await NativeModules.RNHelper.parseNews('buzzing', 'list', body, '//article/div');
        let articles = JSON.parse(str);
        for (let i in articles) {
            articles[i].uid = 102;
        }
        return articles;
    }

    private async crawEconomist(){
        const response = await fetch('https://economistnew.buzzing.cc/', {
            method: 'GET',
            headers: {
                'Content-Type': 'text/html',
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Safari/537.36'
            },
        });
        const body = await response.text();
        let str = await NativeModules.RNHelper.parseNews('buzzing', 'list', body, '//article/div');
        let articles = JSON.parse(str);
        for (let i in articles) {
            articles[i].uid = 108;
        }
        return articles;
    }

    private async crawLiveScience  () {
        const response = await fetch('https://livescience.buzzing.cc/', {
            method: 'GET',
            headers: {
                'Content-Type': 'text/html',
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Safari/537.36'
            },
        });
        const body = await response.text();
        let str = await NativeModules.RNHelper.parseNews('buzzing', 'list', body, '//article/div');
        let articles = JSON.parse(str);
        for (let i in articles) {
            articles[i].uid = 103;
        }
        return articles;
    }

    private async crawRouters(){
        const response = await fetch('https://reutersnew.buzzing.cc/', {
            method: 'GET',
            headers: {
                'Content-Type': 'text/html',
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Safari/537.36'
            },
        });
        const body = await response.text();
        let str = await NativeModules.RNHelper.parseNews('buzzing', 'list', body, '//article/div');
        let articles = JSON.parse(str);
        for (let i in articles) {
            articles[i].uid = 104;
        }
        return articles;
    }

    private async crawBBC () {
        const response = await fetch('https://bbc.buzzing.cc/', {
            method: 'GET',
            headers: {
                'Content-Type': 'text/html',
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Safari/537.36'
            },
        });
        const body = await response.text();
        let str = await NativeModules.RNHelper.parseNews('buzzing', 'list', body, '//article/div');
        let articles = JSON.parse(str);
        for (let i in articles) {
            articles[i].uid = 105;
        }
        return articles;
    }

    private async crawSky() {
        const response = await fetch('https://sky.buzzing.cc/', {
            method: 'GET',
            headers: {
                'Content-Type': 'text/html',
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Safari/537.36'
            },
        });
        const body = await response.text();
        let str = await NativeModules.RNHelper.parseNews('buzzing', 'list', body, '//article/div');
        let articles = JSON.parse(str);
        for (let i in articles) {
            articles[i].uid = 106;
        }
        return articles;
    }

    private async crawFT(){
        const response = await fetch('https://ft.buzzing.cc/', {
            method: 'GET',
            headers: {
                'Content-Type': 'text/html',
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Safari/537.36'
            },
        });
        const body = await response.text();
        let str = await NativeModules.RNHelper.parseNews('buzzing', 'list', body, '//article/div');
        let articles = JSON.parse(str);
        for (let i in articles) {
            articles[i].uid = 107;
        }
        return articles;
    }

    private async crawGuardian(){
        const response = await fetch('https://theguardian.buzzing.cc/', {
            method: 'GET',
            headers: {
                'Content-Type': 'text/html',
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Safari/537.36'
            },
        });
        const body = await response.text();
        let str = await NativeModules.RNHelper.parseNews('buzzing', 'list', body, '//article/div');
        let articles = JSON.parse(str);
        for (let i in articles) {
            articles[i].uid = 109;
        }
        return articles;
    }

    private async crawNytimes(){
        /*const body = await NativeModules.RNHelper.httpClient(JSON.stringify({
            method: 'GET',
            url: 'https://cn.nytimes.com/china/',
            proxy: config.httpProxyURL,
        }));*/
        const response = await fetch(config.httpProxyLink + 'https://cn.nytimes.com/china/', {
            method: 'GET',
            headers: {
                'Content-Type': 'text/html',
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Safari/537.36',
            },
        });
        const body = await response.text();
        let str = await NativeModules.RNHelper.parseNews('nytimes', 'list', body, "//h3[@class='sectionLeadHeader']/a | //h3[@class='regularSummaryHeadline']/a");
        let articles = JSON.parse(str);
        for (let i in articles) {
            articles[i].uid = 110;
            articles[i].href = articles[i].href.indexOf('http') === 0 ? articles[i].href : 'https://cn.nytimes.com' + articles[i].href;
            articles[i].href = config.httpProxyLink + articles[i].href;
            for (let j in articles[i].media) {
                articles[i].media[j] = config.httpProxyLink + articles[i].media[j];
            }
        }
        return articles;
    }

    private async crawRfi(){
        const response = await fetch(config.httpProxyLink + 'https://www.rfi.fr/cn/%E6%BB%9A%E5%8A%A8%E6%96%B0%E9%97%BB/', {
            method: 'GET',
        });
        const body = await response.text();
        let str = await NativeModules.RNHelper.parseNews('rfi', 'list', body,  "//div[@class='m-item-news-feed']/div[@class='news__content']/div");
        let articles = JSON.parse(str);
        for (let i in articles) {
            articles[i].uid = 111;
            articles[i].href = articles[i].href.indexOf('http') === 0 ? articles[i].href : 'https://www.rfi.fr' + articles[i].href;
            articles[i].href = config.httpProxyLink + articles[i].href;
        }
        return articles;
    }
}

export default NewsService;
export {mediaUsers};
