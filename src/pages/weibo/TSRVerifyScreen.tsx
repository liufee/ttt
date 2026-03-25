import React from 'react';
import {Comment, Weibo} from '../../services/weibo/model';
import WeiboService from '../../services/weibo';
import TsrVerify from '../../components/tsrVerify';

const TSRVerifyScreen = ({ route }: any) => {
    const { type, weibo, comment }:{type:string, weibo:Weibo, comment:Comment} = route.params;

    const weiboService = WeiboService.getInstance();

    const formula = type === 'feed' ? 'time+content+base64_medias' : 'time+content+base64_medias';
    const createdAt = type === 'feed' ? weibo.createdAt : comment.createdAt;
    const id = type === 'feed' ? weibo.id : comment.id;

    return <TsrVerify formula={formula} createdAt={createdAt}
                getFullOriginalString={
                    async ()=>{
                        const data = type === 'feed' ? weibo : comment;
                        const [success, result] = await weiboService.assembleStrToCreateTSR(type, data);
                        if(success){
                            return [true, result, ''];
                        }else{
                            return [false, '', result];
                        }
                    }
                }
                getTSR={
                    async ()=>{
                        const [success, tsr, err] = await weiboService.getTSR(type, id);
                        if(success){
                            return [true, tsr.tsr, ''];
                        }else{
                            return [false, '', err];
                        }
                    }
                }
    ></TsrVerify>;
};

export default TSRVerifyScreen;
