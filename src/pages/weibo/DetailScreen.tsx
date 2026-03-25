import React, {useState, useEffect} from 'react';
import {
    View,
    TextInput,
    Image,
    TouchableOpacity,
    Text,
    StyleSheet,
    Alert,
    ScrollView, Pressable, Keyboard,
} from 'react-native';
import {BeenPosted, Comment, Like, Weibo} from '../../services/weibo/model';
import WeiboService from '../../services/weibo';
import {WeiboItem} from './components/WeiboItem';
import {useNavigation} from '@react-navigation/native';
import Checkbox from '../../components/checkbox';
import Button from '../../components/button';
import {formatWeiboContent, getCurrentLocationWithAddress} from './util';
import {useSetting} from '../../provider/setting';
import {useToast} from '../../provider/toast';
import {useLoading} from '../../provider/loading';
import {Media} from './components/Media';
import {LocationEditor} from './components/LocationEditor';
import {Asset, mediaPicker, checkMediaSize, confirmMediaSizeIfNeeded} from './util/mediaPicker';
import {MediaPreview} from './components/MediaPreview';
import {EmojiPanel} from './components/EmojPanel';

enum ShowTypes {
    ShowTypeComment = 'comment',
    ShowTypeLike = 'like',
    ShowTypeBeenRepost = 'ShowTypeBeenRepost',
}
const WeiboDetail = ({ route }) => {
    const { wb, uid }:{weibo:Weibo, uid:string} = route.params;  // 从导航中获取传递的微博数据
    const [weibo, setWeibo] = useState<Weibo>(wb);
    const [showType, setShowType] = useState<ShowTypes>(ShowTypes.ShowTypeComment);
    const [newComment, setNewComment] = useState<string>('');
    const [isRepost, setIsRepost] = useState(false);
    const [replyTo, setReplyTo] = useState<Comment | null>(null);
    const [comments, setComments] = useState<Comment[]>([]);
    const [likes, setLikes] = useState<Like[]>([]);
    const [beenReposts, setBeenReposts] = useState<BeenPosted[]>([]);
    const [showCommentInput, setShowCommentInput] = useState<boolean>(false);
    const [commenting, setCommenting] = useState<boolean>(false);
    const [media, setMedia] = useState<Asset[]>([]);
    const [location, setLocation] = useState<any>(null);
    const [selection, setSelection] = useState({start: 0, end: 0});
    const [showEmojiPanel, setShowEmojiPanel] = useState<boolean>(false);

    const navigation = useNavigation();
    const {setting} = useSetting();
    const {showToast} = useToast();
    const {showLoading, hideLoading} = useLoading();

    const {selectMedia, selectAttachment} = mediaPicker(showToast);

    const weiboService:WeiboService = WeiboService.getInstance();

    useEffect(()=>{
        const init = async ()=>{
            if(weibo.type === 3){
                return;
            }
            const [getWeiboResult, updatedWeibo, getWeiboErr] = await weiboService.getWeibo(weibo.id);
            if(!getWeiboResult){
                Alert.alert('失败', getWeiboErr);
                return;
            }
            setWeibo(updatedWeibo);

           const [result, weiboComments, getCommentsErr] = await weiboService.getComments(weibo.id);
            if(!result){
                Alert.alert('失败', getCommentsErr);
            }
            setComments(weiboComments);

            const [likesResult, weiboLikes, getLikesErr] = await weiboService.getLikes(weibo.id);
            if(!likesResult){
                Alert.alert('失败', getLikesErr);
            }
            setLikes(weiboLikes);

            const [beenRepostedResult, weiboBeenReposted, getBeenRepostedErr] = await weiboService.getBeenReposted(weibo.id);
            if(!beenRepostedResult){
                Alert.alert('失败', getBeenRepostedErr);
            }
            setBeenReposts(weiboBeenReposted);

        };
        const { wb } = route.params;
        setWeibo(wb);
        init();
    }, [route.params]);

    const onDelete = () => {
        navigation.navigate('Index' as any);
    };

    // 发布评论
    const submitComment = async () => {
        if(uid === 0){
            showToast({message:'请先选择一个用户'});
            return;
        }
        if(weibo.type === 3){
            showToast({message:'新闻不能评论'});
            return;
        }
        if (newComment.trim().length === 0) {// 防止空评论
            return;
        }

        const result = checkMediaSize(media, parseInt(setting.weibo.showTipFilesSize), parseInt(setting.weibo.maxTotalFilesSize));

        if (!result.passed) {
            showToast({
                message: `选择的文件(${result.totalSizeMB}MB)超过${setting.weibo.maxTotalFilesSize}MB,无法提交`,
                backgroundColor: 'red',
            });
            return;
        }

        const confirmed = await confirmMediaSizeIfNeeded(result);
        if (!confirmed){
            return;
        }

        await submitPostAfterSizeCheck();
    };

    const submitPostAfterSizeCheck = async () => {
        let repostWeibo = null;
        if(isRepost){
            repostWeibo = weibo;
        }
        setCommenting(true);

        const selectedMedia = media.map((item) => ({
            Mime: item?.type,
            Origin: item.uri,
            LivePhoto: '',
            IsLarge: -1,
        }));

        const [commentResult, err] = await weiboService.saveComment(newComment, selectedMedia, location, replyTo?.id || '0', weibo.id, uid);

        if(!commentResult){
            setCommenting(false);
            Alert.alert('失败', err);
            return;
        }

        if(repostWeibo){
            const [createResult, err] = await weiboService.createWeibo(uid, newComment, selectedMedia, location, repostWeibo);
            if(!createResult){
                setCommenting(false);
                Alert.alert('失败', err);
                return;
            }
        }

        const [getWeiboResult, updatedWeibo, getWeiboErr] = await weiboService.getWeibo(weibo.id);
        if(!getWeiboResult){
            setCommenting(false);
            Alert.alert('失败', getWeiboErr);
            return;
        }
        setWeibo(updatedWeibo);

        const[getCommentsResult, newComments, getCommentsErr] = await weiboService.getComments(weibo.id);
        if(!getCommentsResult){
            setCommenting(false);
            Alert.alert('失败', getCommentsErr);
            return;
        }
        setComments(newComments);

        setCommenting(false);
        setNewComment('');
        setMedia([]);
        setLocation(null);
        setReplyTo(null);
        setIsRepost(false);
    };

    // 回复评论
    const replyToComment = (comment: Comment) => {
        setShowCommentInput(true);
        setReplyTo(comment);
    };

    const handleCommentClick = () => {
        if(showType === ShowTypes.ShowTypeComment){
            setShowCommentInput(!showCommentInput);
            return;
        }
        setShowType(ShowTypes.ShowTypeComment);
    };

    const handleRepostClick = () => {
        setShowCommentInput(false);
        if(showType === ShowTypes.ShowTypeBeenRepost){
            return true;//已经在 repost 页面，直接显示转发框
        }
        setShowType( ShowTypes.ShowTypeBeenRepost);
        return false;
    };

    // 渲染评论
    const renderComment = ({item}) => {
        const hasLocation = !!(item.location && item.location.address);
        return (
            <View key={'comment-' + item.id} style={styles.commentContainer}>
                {/* 顶部：头像 + 右侧信息 */}
                <View style={[styles.commentHeader, {alignItems: hasLocation ? 'flex-start' : 'center'}]}>
                    <Image source={{uri: item.author?.avatar?.startsWith('http') ? item.author?.avatar : 'file://' + item.author?.avatar,}} style={styles.avatar}/>
                    <View style={{flex: 1}}>
                        <View style={styles.commentTopRow}>
                            <View style={styles.commentLeftRow}>
                                <Text style={styles.commentUsername} numberOfLines={1} ellipsizeMode="tail">{item.author.name}</Text>
                                {item.tsr === 1 && (<Text style={styles.commentTsrIcon} onPress={() => {navigation.navigate('TSRVerify' as any, {type: 'comment', comment: item} as any,);}}>{item.tsrVerified === 1 ? '✅' : '❌'}</Text>)}
                            </View>
                            <Text style={styles.commentTime} numberOfLines={1}>{item.createdAt.replaceAll('+08:00', '')}</Text>
                        </View>
                        {hasLocation && (<Text style={styles.commentLocationText} numberOfLines={1} ellipsizeMode="tail">📍{item.location.address}</Text>)}
                    </View>
                </View>
                <Text style={styles.commentText}>{formatWeiboContent(item.text)}</Text>
                <Media media={item.media} weiboId={weibo.id + '_' + item.id}></Media>

                {item.replyToComment && (
                    <Text style={{...styles.replyToText, flexWrap: 'wrap', paddingLeft: 20}}>
                        @{item.replyToComment.author.name}: {formatWeiboContent(item.replyToComment.text)}
                    </Text>
                )}

                <TouchableOpacity onPress={() => replyToComment(item)}>
                    <Text style={styles.replyText}>回复</Text>
                </TouchableOpacity>
            </View>
        );
    };

    // 渲染赞
    const renderLike = ({item}) => {
        return (
            <View key={'like-' + item.id} style={{ backgroundColor: '#f9f9f9', padding: 10, marginBottom: 10, borderRadius: 5, flexDirection: 'row', alignItems: 'center'}}>
                <Image source={{uri: item.user?.avatar?.startsWith('http') ? item.user?.avatar : 'file://' + item.user?.avatar}} style={styles.avatar} />
                <Text>{item.user.name}</Text>
            </View>
        );
    };
    // 渲染转发
    const renderBeenRepost = ({item}) => {
        return (
            <View key={'repost-' + item.id} style={{backgroundColor: '#f9f9f9', padding: 10, marginBottom: 10, borderRadius: 5}}>
                <View style={{ flexDirection: 'row', alignItems: 'center'}}>
                    <Image source={{uri: item.user?.avatar?.startsWith('http') ? item.user?.avatar : 'file://' + item.user?.avatar}} style={styles.avatar} />
                    <Text>{item.user.name}</Text>
                </View>
                <Text style={{ fontSize: 14, marginVertical: 5}}>{formatWeiboContent(item.text)}</Text>
            </View>
        );
    };

    const renderCommentInput = (
        <View style={styles.inputContainer}>
            {replyTo && (
                <View style={styles.replyingContainer}>
                    <Text style={styles.replyingText}>回复: {replyTo.author.name}</Text>
                    <TouchableOpacity onPress={()=>setReplyTo(null)}>
                        <Text style={styles.removeReply}>×</Text>
                    </TouchableOpacity>
                </View>
            )}
            <TextInput
                placeholder="写评论..."
                style={styles.input}
                value={newComment}
                onChangeText={setNewComment}
                multiline
                selection={selection}
                onSelectionChange={(e) => {
                    setSelection(e.nativeEvent.selection);
                }}
            />

            <View style={{flexDirection:'row', justifyContent:'space-between', alignItems:'center'}}>
                <View style={{flexDirection:'row', alignItems:'center', top:5}}>
                    <Checkbox label="同时转发" checked={isRepost} onChange={setIsRepost}/>
                    <Pressable onPress={() => {Keyboard.dismiss();setShowEmojiPanel(prev => !prev);}}>
                        <Text style={{marginLeft:10}}>😊</Text>
                    </Pressable>
                    <Pressable onPress={()=>{
                        selectMedia((assets)=>setMedia(prev=>[...prev, ...assets]));
                    }} style={{marginLeft:10}}><Text>🖼️</Text></Pressable>
                    <Pressable onPress={()=>{
                        selectAttachment((assets)=>setMedia(prev=>[...prev, ...assets]));
                    }} style={{marginLeft:10}}><Text>📎</Text></Pressable>
                    <Pressable onPress={async ()=>{
                        showLoading('定位中');
                        const [success, loc, err] = await getCurrentLocationWithAddress();
                        hideLoading();
                        if (!success) {
                            showToast({message:err, backgroundColor:'red'});
                            return;
                        }
                        setLocation(loc);
                    }} style={{marginLeft:10}}><Text>📍</Text></Pressable>
                </View>

                <View style={{flex:0.9}}>
                    {commenting ? <Button title="发布中..."/> : <Button title="发布" onPress={submitComment} />}
                </View>
            </View>
            <EmojiPanel visible={showEmojiPanel}
                onSelect={(emojiText: string) => {
                    const start = selection.start;
                    const end = selection.end;

                    const before = newComment.slice(0, start);
                    const after = newComment.slice(end);

                    const newText = before + emojiText + after;

                    const newCursor = start + emojiText.length;

                    setNewComment(newText);

                    setTimeout(() => {
                        setSelection({
                            start: newCursor,
                            end: newCursor,
                        });
                    }, 0);
                }}
            />
            {/* 图片/视频预览 */}
            <MediaPreview media={media} onDelete={(uri) => setMedia(prev => prev.filter(item => item.uri !== uri))}></MediaPreview>
            <LocationEditor location={location} setLocation={setLocation}></LocationEditor>
        </View>
    );

    return (
        <View style={styles.container}>
            <ScrollView style={styles.scrollContainer}>
                {/* 微博详情 */}
                <WeiboItem item={weibo} uid={uid} onDelete={onDelete} refresh={
                    async()=>{
                        const [getWeiboResult, updatedWeibo, getWeiboErr] = await weiboService.getWeibo(weibo.id);
                        if(!getWeiboResult){
                            Alert.alert('失败', getWeiboErr);
                            return;
                        }
                        setWeibo(updatedWeibo);
                        const [result, newComments, err] = await weiboService.getComments(weibo.id);
                        if(!result){
                            Alert.alert('失败', err);
                            return;
                        }
                        setComments(newComments);
                    }
                } pageType='detail' showRepost={setting.weibo.detailPageShowRepost} onCommentClick={handleCommentClick}
                           onLikeClick={()=>{ setShowCommentInput(false); setShowType(ShowTypes.ShowTypeLike);}} onRepostClick={handleRepostClick}
                />

                {/* 评论区域 */}
                {showType === ShowTypes.ShowTypeComment &&
                    <View>
                        {comments.map((item) => renderComment({item}))}
                        {comments.length === 0 && (
                            <View style={styles.emptyContainer}>
                                <Text style={styles.emptyText}>还没有评论</Text>
                            </View>
                        )}
                    </View>
                }
                {/* 赞区域 */}
                {showType === ShowTypes.ShowTypeLike &&
                    <View>
                        {likes.map((item) => renderLike({item}))}
                        {likes.length === 0 && (
                            <View style={styles.emptyContainer}>
                                <Text style={styles.emptyText}>还没有点赞过</Text>
                            </View>
                        )}
                    </View>
                }

                {/* 转发区域 */}
                {showType === ShowTypes.ShowTypeBeenRepost &&
                    <View>
                        {beenReposts.map((item) => renderBeenRepost({item}))}
                        {beenReposts.length === 0 && (
                            <View style={styles.emptyContainer}>
                                <Text style={styles.emptyText}>还没有转发过</Text>
                            </View>
                        )}
                    </View>
                }
                {/* 占位元素，确保内容可以滚动到输入框位置 */}
                {showCommentInput && <View style={{height: 150}} />}
            </ScrollView>

            {/* 固定在底部的评论输入框 */}
            {showCommentInput && (
                <View style={styles.fixedInputContainer}>
                    {renderCommentInput}
                </View>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 10,
    },
    scrollContainer: {
        flex: 1,
    },
    avatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        marginRight: 10,
    },
    fixedInputContainer: {
        position: 'absolute',
        bottom: 0,
        left: 10,
        right: 10,
        paddingBottom: 10, // 为 tabbar 留出空间
        backgroundColor: 'white',
        borderTopWidth: 1,
        borderColor: '#ddd',
    },
    inputContainer: {
        width: '100%',
        backgroundColor: 'white',
    },
    replyingContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 5,
        paddingHorizontal: 10,
        backgroundColor: '#f0f0f0',
        borderRadius: 5,
        marginBottom: 5,
    },
    replyingText: {
        color: '#555',
        flex: 1,
    },
    removeReply: {
        color: '#ff3333',
        fontWeight: 'bold',
        marginLeft: 10,
        fontSize: 16,
    },
    input: {
        height: 100,
        borderColor: '#ddd',
        borderWidth: 1,
        borderRadius: 5,
        paddingLeft: 10,
        marginBottom: 10,
        textAlignVertical: 'top',
    },
    commentContainer: {
        backgroundColor: '#f9f9f9',
        padding: 10,
        marginBottom: 10,
        borderRadius: 5,
    },
    commentHeader: {
        flexDirection: 'row',
    },
    commentTopRow: {
        flexDirection: 'row',
        alignItems: 'center',
        width: '100%',
    },

    commentLeftRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },

    commentTsrIcon: {
        fontSize: 10,
        marginLeft: 5,
        flexShrink: 0,
    },

    commentTime: {
        color: 'gray',
        fontSize: 12,
        marginLeft: 5,
        width: 130,
    },
    commentLocationText: {
        color: 'gray',
        fontSize: 10,
        marginTop: 2,
    },
    commentUsername: {
        fontWeight: 'bold',
        fontSize: 14,
        marginRight: 5,
    },
    replyToText: {
        fontSize: 12,
        color: '#888',
    },
    commentText: {
        fontSize: 14,
        marginVertical: 5,
        lineHeight: 19,
    },
    replyText: {
        color: '#007bff',
        fontSize: 14,
    },
    emptyContainer: {
        padding: 20,
        alignItems: 'center',
    },
    emptyText: {
        fontSize: 16,
        color: '#999',
    },
    mediaPreviewContainer:{flexDirection:'row', flexWrap:'wrap', marginVertical:10},
    mediaItem:{marginRight:10, marginBottom:10}
});

export default WeiboDetail;
