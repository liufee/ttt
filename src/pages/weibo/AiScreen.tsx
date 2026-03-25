import {Alert, Text} from 'react-native';
import React, {useEffect, useState} from 'react';
import Gpt from '../../components/gpt';
import WeiboService from '../../services/weibo';
import config from '../../config';
import {useSetting} from '../../provider/setting';
import {Weibo} from '../../services/weibo/model';
import {ZunshoujimochengxuID} from '../../services/weibo/data';

const AiScreen = () => {
    const [loading, setLoading] = useState(true);
    const [embeddingVersion, setEmbeddingVersion] = useState('无');
    const weiboService = WeiboService.getInstance();
    const {setting} = useSetting();
    const APIKey = config.feehiSecVerify;
    const goServerAPIURL = setting.global.goServerAPIURL;

    const getEmbeddingVersion = async ()=>{
        const res = await fetch(goServerAPIURL + '/version', {
            method: 'POST',
            headers: {
                'x-feehi-sec-verify': APIKey,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                type:'weibo',
                env:__DEV__ ? 'dev' : '',
            }),
        });
        const data = await res.json();
        return data.version;
    };

    const initEmbeddings = async () => {
        let page = 1;
        let perPage = 1000;
        let allWeibos:Weibo[] = [];
        while (true) {
            const [success, items, err] = await weiboService.getWeiboByPage(ZunshoujimochengxuID, page,(page - 1) * perPage, perPage);
            if (!success) {
                Alert.alert('失败', err);
                return;
            }
            allWeibos.push(...items);
            if(items.length < perPage){
                break;
            }
            page++;
        }

        let summaries = [];
        for(let i in allWeibos){
            const summary = allWeibos[i].createdAt + '通过' + allWeibos[i].by.title + '发布了微博:' + allWeibos[i].text;
            summaries.push({content:summary, id:allWeibos[i].id, date:allWeibos[i].createdAt});
        }
        const res = await fetch(goServerAPIURL + '/embedding', {
            method: 'POST',
            headers: {
                'x-feehi-sec-verify': APIKey,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                type:'weibo',
                items: summaries,
                remote: false,
                env:__DEV__ ? 'dev' : '',
            }),
        });
        if(!res.ok){
            Alert.alert('失败', 'ok false' + res.status);
            return;
        }
        const version = await getEmbeddingVersion();
        setEmbeddingVersion(version);
    };

    const assemblePrompt = async (query) => {
        const res = await fetch(goServerAPIURL + '/query', {
            method: 'POST',
            headers: {
                'x-feehi-sec-verify': APIKey,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                type:'weibo',
                query:query,
                env:__DEV__ ? 'dev' : '',
            }),
        });
        if(!res.ok){
            Alert.alert('失败', 'ok false' + res.status);
            return;
        }
        const result = await res.json();
        return result.prompt;
    };


    const commands = [
        { label: '最近关注什么', text: '我最近关注什么' },
        { label: '最近心情', text: '我最近心情怎么样' },
    ];
    const init = async ()=> {
        const version = await getEmbeddingVersion();
        setEmbeddingVersion(version);
        setLoading(false);
    };
    useEffect(()=>{
        init();
    }, []);

    if(loading){
        return <Text>loading</Text>;
    }
    return <Gpt embeddingVersion={embeddingVersion} initEmbeddings={initEmbeddings} getCurrentPrompt={assemblePrompt} commands={commands}></Gpt>
};

function cleanWeiboContent(html) {
    // 替换 a 标签：只保留文本内容
    html = html.replace(/<a[^>]*>(.*?)<\/a>/g, '$1');

    // 替换 img 标签：用 title 属性替代
    html = html.replace(/<img[^>]*title="([^"]+)"[^>]*>/g, '$1');

    return html;
}


export default AiScreen;
