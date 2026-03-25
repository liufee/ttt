import React, {useEffect, useState} from 'react';
import {
    Alert,
    Keyboard,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableWithoutFeedback,
    View,
} from 'react-native';
import RNFS from 'react-native-fs';

import {useToast} from '../../../provider/toast';

import type {Location, Media, Weibo} from '../../../services/weibo/model';
import {Media as MediaComponent} from './Media';

import Checkbox from '../../../components/checkbox';

import WeiboService from '../../../services/weibo';
import {LocationEditor} from './LocationEditor';
import {formatWeiboContent, getCurrentLocationWithAddress} from '../util';
import {useLoading} from '../../../provider/loading';
import {Asset, mediaPicker, checkMediaSize, confirmMediaSizeIfNeeded} from '../util/mediaPicker';
import {MediaPreview} from './MediaPreview';
import {EmojiPanel} from './EmojPanel';

type Props = {
    uid: string;
    draftFile: string;
    setting: any;

    weiboService: WeiboService;

    repostWeibo?: Weibo | null;

    onPosted?: () => Promise<void> | void;
};


export const Composer = ({uid, draftFile, setting, weiboService, repostWeibo = null, onPosted}: Props) => {
    const {showToast} = useToast();

    const [text, setText] = useState('');
    const [selection, setSelection] = useState({start: 0, end: 0});
    const [showEmojiPanel, setShowEmojiPanel] = useState<boolean>(false);
    const [media, setMedia] = useState<Asset[]>([]);
    const [inputCharCount, setInputCharCount] = useState(0);

    const [autoComment, setAutoComment] = useState<boolean>(false);
    const [submitPosting, setSubmitPosting] = useState<boolean>(false);

    const [location, setLocation] = useState<Location|null>(null);

    const {showLoading, hideLoading} = useLoading();

    const {selectMedia, selectAttachment} = mediaPicker(showToast);

    useEffect(() => {
        (async () => {
            try {
                const draft = await RNFS.readFile(draftFile, 'utf8');
                setText(draft);
                setInputCharCount(draft.length);
            } catch (e) {}
        })();
    }, [draftFile, repostWeibo]);

    const submitPost = async () => {
        if (text.trim().length === 0) return;

        if (uid === '0') {
            showToast({message: '请先选择一个用户', backgroundColor: 'red'});
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
        setSubmitPosting(true);

        const selectedMedia: Media[] = media.map((item) => ({
            Mime: item?.type as string,
            Origin: item.uri as string,
            LivePhoto: '',
            IsLarge: -1,
        }));

        // 这里的最后一个参数：转发引用微博
        const [result, errCreate] = await weiboService.createWeibo(uid, text, selectedMedia, location, repostWeibo ?? null,);

        if (!result) {
            Alert.alert('失败', errCreate);
            setSubmitPosting(false);
            return;
        }

        if (repostWeibo && autoComment) {
            const [result, errComment] = await weiboService.saveComment(text,  selectedMedia, location, '0', repostWeibo.id, uid);
            if (!result) {
                Alert.alert('失败', errComment);
                setSubmitPosting(false);
                return;
            }
        }

        setSubmitPosting(false);
        setText('');
        setLocation(null);
        setMedia([]);
        setInputCharCount(0);

        try {
            await RNFS.writeFile(draftFile, '', 'utf8');
        } catch (e) {}

        if (onPosted) {
            await onPosted();
        }
        return;
    };

    return (
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={styles.inputContainer}>
                {/* 引用微博显示（转发场景） */}
                {repostWeibo && (
                    <View style={styles.quoteBox}>
                        {/* 内容过多就内部滚动 */}
                        <ScrollView style={styles.quoteScroll} nestedScrollEnabled={true}>
                            <Text style={styles.quoteText}>{formatWeiboContent(repostWeibo.text)}</Text>
                            <View>
                            <MediaComponent media={repostWeibo.media} weiboId={repostWeibo.id}></MediaComponent>
                            </View>
                        </ScrollView>
                    </View>
                )}

                <View style={styles.inputWrap}>
                    <TextInput
                        placeholder={repostWeibo ? '说点转发理由...' : '说点什么...'}
                        multiline
                        numberOfLines={4}
                        style={{...styles.input, height: 120}}
                        value={text}
                        onChangeText={(changedText: string) => {
                            setText(changedText);
                            setInputCharCount(changedText.length);
                        }}
                        selection={selection}
                        onSelectionChange={(e) => {
                            setSelection(e.nativeEvent.selection);
                        }}
                    />

                    <View style={styles.charCountContainer}>
                        <Text style={styles.charCountText}>{inputCharCount} 字 </Text>
                    </View>
                </View>

                <View style={styles.actionRow}>
                    <View style={styles.iconContainer}>
                        <Pressable onPress={() => {Keyboard.dismiss();setShowEmojiPanel(prev => !prev);}} style={styles.iconBtn}>
                            <Text style={styles.iconText}>😊</Text>
                        </Pressable>
                        <Pressable onPress={()=>{
                            selectMedia((assets)=>setMedia(prev=>[...prev, ...assets]));
                        }} style={styles.iconBtn}>
                            <Text style={styles.iconText}>🖼️</Text>
                        </Pressable>
                        <Pressable onPress={()=>{
                            selectAttachment((assets)=>setMedia(prev=>[...prev, ...assets]));
                        }} style={styles.iconBtn}>
                            <Text style={styles.iconText}>📎</Text>
                        </Pressable>
                        <Pressable onPress={async ()=>{
                            showLoading('定位中');
                            const [success, loc, err] = await getCurrentLocationWithAddress();
                            hideLoading();
                            if (!success) {
                                showToast({message:err, backgroundColor:'red'});
                                return;
                            }
                            setLocation(loc);
                        }} style={styles.iconBtn}>
                            <Text style={styles.iconText}>📍</Text>
                        </Pressable>
                    </View>

                    <View style={styles.rightControls}>
                        {repostWeibo && (
                            <View style={styles.repostInline}>
                                <Checkbox label="评论" checked={autoComment} onChange={setAutoComment}/>
                            </View>
                        )}

                        <View style={styles.buttonGroup}>
                            <Pressable
                                style={styles.secondaryBtn}
                                onPress={async () => {
                                    try {
                                        await RNFS.writeFile(draftFile, text, 'utf8');
                                        showToast({message: '暂存成功'});
                                    }catch (e){
                                        showToast({message: '暂存失败', backgroundColor: 'red'})
                                    }
                                }}>
                                <Text style={styles.secondaryBtnText}>暂存</Text>
                            </Pressable>
                            {submitPosting ? (
                                <View style={styles.primaryBtnDisabled}>
                                    <Text style={{color: '#fff'}}>
                                        {repostWeibo ? '转发中...' : '发布中...'}
                                    </Text>
                                </View>
                            ) : (
                                <Pressable style={styles.primaryBtn} onPress={submitPost}>
                                    <Text style={styles.primaryBtnText}>
                                        {repostWeibo ? '转发微博' : '发布微博'}
                                    </Text>
                                </Pressable>
                            )}
                        </View>
                    </View>
                </View>
                {/* Emoji */}
                {<EmojiPanel visible={showEmojiPanel}
                    onSelect={(emojiText: string) => {
                        const start = selection.start;
                        const end = selection.end;

                        const before = text.slice(0, start);
                        const after = text.slice(end);

                        const newText = before + emojiText + after;

                        const newCursor = start + emojiText.length;

                        setText(newText);
                        setInputCharCount(newText.length);

                        setTimeout(() => {
                            setSelection({
                                start: newCursor,
                                end: newCursor,
                            });
                        }, 0);
                    }}
                    />}
                {/* 图片/视频预览 */}
                <MediaPreview media={media}
                    onDelete={(uri) => setMedia(prev => prev.filter(item => item.uri !== uri))
                }></MediaPreview>
                {/* 定位 */}
                <LocationEditor location={location} setLocation={setLocation}></LocationEditor>
            </View>
        </TouchableWithoutFeedback>
    );
};

const styles = StyleSheet.create({
    inputContainer: {
        backgroundColor: '#fff',
        padding: 10,
        paddingBottom: 0,
        marginBottom: 15,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#ddd',
    },
    input: {
        fontSize: 16,
        padding: 10,
        minHeight: 40,
        borderRadius: 5,
        backgroundColor: '#f4f4f4',
        textAlignVertical: 'top',
    },
    inputWrap: {
        position: 'relative',
    },
    charCountContainer: {
        position: 'absolute',
        right: 7,
        bottom: 6,
        zIndex: 5,
    },
    charCountText: {
        fontSize: 12,
        color: '#888',
    },
    actionRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 10,
        alignItems: 'center',
    },
    rightControls: {
        flexDirection: 'row',
        alignItems: 'center',
        flexShrink: 1,
    },
    repostInline: {
        marginRight: 10,
        paddingVertical: 2,
    },
    iconContainer: {
        flexDirection: 'row',
    },
    iconBtn: {
        marginRight: 5,
        padding: 6,
        backgroundColor: '#eee',
        borderRadius: 6,
    },
    iconText: {
        fontSize: 15,
    },
    buttonGroup: {
        flexDirection: 'row',
        alignItems: 'center',
    },

    primaryBtn: {
        backgroundColor: '#1DA1F2',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 6,
        marginLeft: 5,
        justifyContent: 'center',
    },
    primaryBtnText: {
        color: '#fff',
        fontWeight: 'bold',
    },
    primaryBtnDisabled: {
        backgroundColor: '#aaa',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 6,
        marginLeft: 5,
        justifyContent: 'center',
    },

    secondaryBtn: {
        backgroundColor: '#eee',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 6,
        justifyContent: 'center',
    },
    secondaryBtnText: {
        color: '#333',
        fontWeight: 'bold',
    },
    quoteBox: {
        borderWidth: 1,
        borderColor: '#e5e5e5',
        backgroundColor: '#fafafa',
        borderRadius: 8,
        paddingVertical: 8,
        paddingHorizontal: 10,
        marginBottom: 10,
    },
    quoteScroll: {
        maxHeight: 120,
    },
    quoteText: {
        fontSize: 13,
        color: '#555',
        lineHeight: 18,
    },
});

export default Composer;
