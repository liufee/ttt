import {
    Alert,
    Image,
    StyleSheet,
    Text,
    View,
    Pressable, Clipboard, Linking,
} from 'react-native';
import React, {useEffect, useState} from 'react';
import {Weibo} from '../../../services/weibo/model';
import {useNavigation} from '@react-navigation/native';
import {formatNewsContent, formatWeiboContent} from '../util';
import WeiboService from '../../../services/weibo';
import { useToast } from '../../../provider/toast';
import {Media} from './Media';

interface WeiboItemProps {
    item: Weibo;
    uid: string;
    onDelete?: (weibo: Weibo) => void;
    refresh?: () => void;
    forwarded?: boolean;
    pageType?: string;
    showRepost: boolean;
    onCommentClick: () => void;
    onLikeClick: () => void;
    onRepostClick: () => void;
}
type ActionType = 'comment' | 'like' | 'repost';

export const WeiboItem = ({ item, uid, onDelete, refresh, forwarded = false, pageType = 'index', showRepost = true,
                              onCommentClick, onLikeClick, onRepostClick}:WeiboItemProps
                        ) => {

    const navigation = useNavigation();
    const { showToast } = useToast();
    const [newsContent, setNewsContent] = useState<String>('');
    const [selectedAction, setSelectedAction] = useState<ActionType>('comment');

    const weiboService = WeiboService.getInstance();

    useEffect(()=>{
        if(item.type === 3 && pageType === 'detail'){
            setNewsContent(item.text);
            formatNewsContent(item.uid, item.id, item.text).then((content)=>setNewsContent(content));
        }
    }, [item.text]);

    const handleActionClick = (type: ActionType, callback?: () => void) => {
        setSelectedAction(type);
        callback && callback();
    };

    // 跳转详情
    const viewWeiboDetail = (weibo:Weibo) => {
        navigation.navigate('WeiboDetail' as any, { wb: weibo, uid:uid } as any);
    };

    // 删除微博
    const handleDeleteWeibo = (weibo:Weibo) => {
        Alert.alert(
            '删除微博',
            '确定删除这条微博吗？',
            [
                {
                    text: '取消',
                    style: 'cancel',
                },
                {
                    text: '删除',
                    onPress: async () => {
                        const [success, info] = await weiboService.deleteWeibo(weibo);
                        if(!success){
                            showToast({message:'删除失败:' + info, backgroundColor:'red'});
                            return;
                        }
                        showToast({message:'删除成功'});
                        onDelete && onDelete(weibo);
                    },
                },
            ],
            { cancelable: true }
        );
    };

    const handleRepostClick = () => {
        if(pageType === 'detail'){
            const needContinue = onRepostClick();
            if (!needContinue){
                return;
            }
        }
        goRepost();
    };

    const goRepost = () => {
        if(uid === '0'){ showToast({message:'请先选择一个用户'}); return; }
        if(item.type === 3){ showToast({message:'新闻不能转发'}); return; }
        if(pageType === 'detail'){
            const needContinue = onRepostClick();
            if(!needContinue) return;
        }
        navigation.navigate('Repost' as any, {uid, repostWeibo:item, onPosted: async ()=>{ refresh && refresh(); navigation.goBack(); }} as any);
    };

    return (
        <Pressable>
            <View style={{...styles.weiboContainer, backgroundColor:forwarded ? '#ececec' : '#fff'}}>
                <View style={styles.header}>
                    <Image source={{uri: item.user?.avatar?.startsWith('http') ? item.user?.avatar : 'file://' + item.user?.avatar}} style={styles.avatar}/>
                    <View style={{flex:1}}>
                        <View style={{flexDirection:'row', alignItems:'center', flexWrap:'nowrap'}}>
                            <Text style={styles.username} numberOfLines={1} ellipsizeMode="tail">{item.user?.name} </Text>
                            {item.tsr === 1 && <Text style={{fontSize:10, marginLeft:5}} onPress={()=>{navigation.navigate('TSRVerify' as any, {type:'feed', weibo:item} as any)}}>{item.tsrVerified === 1 ? '✅' : '❌'}</Text>}
                            {item.type === 1 && <Pressable onPress={()=>Linking.openURL(`https://m.weibo.cn/detail/${item.id}`)}><Image style={{marginLeft:5,width:15,height:15,top:0}} source={require('../../../assets/images/sina_weibo.png')} /></Pressable>}
                            <Text style={styles.byTitle} numberOfLines={1} ellipsizeMode="tail">{item.by.title}</Text>
                        </View>
                        {item.location && (
                            <Text style={styles.locationText} numberOfLines={1} ellipsizeMode="tail">
                                📍{item.location.address}
                            </Text>
                        )}
                    </View>
                </View>
                <Pressable onPress={() => viewWeiboDetail(item)} onLongPress={()=>{Clipboard.setString(item.text);showToast({message: '复制微博成功', backgroundColor: 'green'});}}>
                    <Text style={styles.weiboText}>{item.type === 3 ? ( pageType === 'detail' ? newsContent : item.text) : formatWeiboContent(item.text)}</Text>
                </Pressable>
                <Media media={item.media} weiboId={item.id}/>
                <View style={[styles.actions, { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' }]}>
                    <Text style={styles.actionText}>{item.createdAt}      </Text>
                    {item.type === 3 ?
                        <><Text onPress={() => navigation.navigate('Index' as any)}>回微博</Text>
                        <Text onPress={() => navigation.navigate('hotSearchList' as any)}>回热搜</Text></>
                        :
                        <><Text style={[styles.actionText, pageType === 'detail' && selectedAction === 'comment' && styles.actionTextActive]} onPress={() => handleActionClick('comment', onCommentClick)}>评论: {item.commentCount} </Text>
                        <Text style={[styles.actionText, pageType === 'detail' && selectedAction === 'like' && styles.actionTextActive]} onPress={() => handleActionClick('like', onLikeClick)}>赞: {item.likeCount} </Text>
                        <Text style={[styles.actionText, pageType === 'detail' && selectedAction === 'repost' && styles.actionTextActive]} onPress={() => handleActionClick('repost', handleRepostClick)}>转发: {item.forwardCount} </Text>
                        <Text style={styles.actionText} onPress={() => handleDeleteWeibo(item)}>删除</Text></>
                    }
                </View>
                {item.repost && showRepost && (
                    <View style={styles.forwardedContainer}>
                        <WeiboItem item={item.repost} uid={uid} forwarded={true} />
                    </View>
                )}
            </View>
        </Pressable>
    );
};

const styles = StyleSheet.create({
    mediaImage: {
        width: 100,
        height: 100,
        marginBottom: 5,
    },
    mediaVideo: {
        width: 100,
        height: 100,
    },
    weiboContainer: {
        backgroundColor: '#fff',
        padding: 15,
        marginBottom: 10,
        borderBottomWidth: 1,
        borderColor: '#ddd',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    avatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        marginRight: 10,
    },
    username: {
        fontSize: 16,
        fontWeight: 'bold',
    },
    byTitle: {
        color: 'gray',
        fontSize: 12,
        marginLeft: 5,
        flexShrink: 1,
        width: '100%',
    },
    locationText: {
        color: 'gray',
        fontSize: 10,
        marginTop: 2,
    },
    weiboText: {
        fontSize: 16,
        marginVertical: 10,
        lineHeight: 21,
        flexShrink: 1, // 避免被挤压
        width: '100%', // 让文本占满父容器
        flexWrap: 'wrap', // 允许文字换行
        alignSelf: 'stretch', // 让文本撑满容器
    },
    actions: {
        flexDirection:'row',
        alignItems: 'center',
        width:'100%',
    },
    actionText: {
        color: 'gray',
        fontSize: 12,
    },
    actionTextActive: {
        color: '#ff8200',
        fontWeight: 'bold',
    },
    mediaContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
    },
    forwardedContainer: {
        backgroundColor: '#ececec',
        borderRadius: 5,
        borderLeftWidth: 3,
        borderColor: '#ddd',
        marginTop:10,
    },
    forwardText: {
        color: '#007AFF',
        fontWeight: 'bold',
    }
});
