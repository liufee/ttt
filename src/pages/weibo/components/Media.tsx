import React, {useEffect, useRef, useState} from 'react';
import {
    Alert,
    Dimensions,
    FlatList,
    Image,
    Linking,
    Modal,
    Pressable,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import Video from 'react-native-video';
import FileViewer from 'react-native-file-viewer';
import {useToast} from '../../../provider/toast';
import WeiboService from '../../../services/weibo';
import {Media as MediaModel, MediaType} from '../../../services/weibo/model';
import {getMediaType} from '../../../utils';

const { width, height } = Dimensions.get('window');

interface WeiboMediaProps {
    media: MediaModel[];
    weiboId: string;
}

export const Media: React.FC<WeiboMediaProps> = ({ media, weiboId }) => {

    const [isModalVisible, setIsModalVisible] = useState(false);
    const [selectedMediaIndex, setSelectedMediaIndex] = useState(0);
    const [currentVisibleIndex, setCurrentVisibleIndex] = useState(0);
    const [isModalReady, setIsModalReady] = useState(false);
    const [playingVideos, setPlayingVideos] = useState<Record<string, boolean>>({});

    const flatListRef = useRef<FlatList | null>(null);
    const { showToast } = useToast();
    const weiboService = WeiboService.getInstance();

    const viewabilityConfig = {
        itemVisiblePercentThreshold: 50,
    };

    const callbackDependencies = useRef({
        isModalReady,
        setCurrentVisibleIndex,
    });

    callbackDependencies.current = {
        isModalReady,
        setCurrentVisibleIndex,
    };

    const onViewableItemsChanged = useRef(
        ({ viewableItems }: { viewableItems: Array<any> }) => {
            if (
                callbackDependencies.current.isModalReady &&
                viewableItems.length > 0
            ) {
                callbackDependencies.current.setCurrentVisibleIndex(
                    viewableItems[0].index
                );
            }
        }
    ).current;

    /**
     * 视频播放切换
     */
    const toggleVideoPlayback = (videoId: string) => {
        setPlayingVideos(prev => ({
            ...prev,
            [videoId]: !prev[videoId],
        }));
    };

    const handleMediaClick = (index: number) => {
        setIsModalReady(false);
        setSelectedMediaIndex(index);
        setCurrentVisibleIndex(index);
        setIsModalVisible(true);
    };

    const requestClose = () => {
        if (isModalVisible) {
            setCurrentVisibleIndex(-1);
        }
    };

    useEffect(() => {
        if (currentVisibleIndex === -1 && isModalVisible) {
            setIsModalVisible(false);
        }
    }, [currentVisibleIndex, isModalVisible]);

    /**
     * 保存文件
     */
    const saveToLocal = async (mediaPath: string) => {
        const [result, info] = await weiboService.saveMediaToLocal(mediaPath);
        if (!result) {
            Alert.alert('保存失败', info);
            return;
        }
        Alert.alert('保存成功', `文件已保存到：${info}`);
    };

    const openFile = (path: string) => {
        if (path.startsWith('http')) {
            Linking.openURL(path);
        } else {
            FileViewer.open(path.startsWith('file://') ? path : 'file://' + path);
        }
    };

    if (!media || media.length === 0) return null;

    return (
        <>
            {/* 缩略图区域 */}
            <View style={styles.mediaContainer}>
                {media.map((mediaItem, index) => {

                    const key = weiboId + '_' + index;
                    const mediaType = getMediaType(mediaItem.Mime);
                    let isImage = mediaType === MediaType.Image;
                    let isVideo = mediaType === MediaType.Video;
                    if(!isVideo){
                        if(mediaItem.Origin.endsWith('.mp4') || mediaItem.Origin.endsWith('.mov')){
                            isImage = false;
                            isVideo = true;
                        }
                    }
                    const isFile = !isImage && !isVideo;

                    return (
                        <TouchableOpacity
                            key={key}
                            onPress={() => {
                                if (isImage) {
                                    handleMediaClick(index);
                                } else if (isVideo) {
                                    toggleVideoPlayback(key);
                                } else if (isFile) {
                                    openFile(mediaItem.Origin);
                                }
                            }}
                            onLongPress={() => handleMediaClick(index)}
                        >
                            {isImage && (
                                <Image
                                    source={{
                                        uri: mediaItem.Origin.startsWith('http')
                                            ? mediaItem.Origin
                                            : 'file://' + mediaItem.Origin,
                                    }}
                                    style={styles.mediaItem}
                                />
                            )}

                            {isVideo && (
                                playingVideos[key] ? (
                                    <Video
                                        source={{
                                            uri: mediaItem.Origin.startsWith('http')
                                                ? mediaItem.Origin
                                                : 'file://' + mediaItem.Origin,
                                        }}
                                        style={styles.mediaItem}
                                        paused={false}
                                        useNativeControls
                                    />
                                ) : (
                                    <View>
                                        <Image
                                            source={{
                                                uri: mediaItem.Origin.startsWith('http')
                                                    ? mediaItem.Origin
                                                    : 'file://' + mediaItem.Origin,
                                            }}
                                            style={styles.mediaItem}
                                        />
                                        <View style={styles.playOverlay}>
                                            <Text style={styles.playText}>▶</Text>
                                        </View>
                                    </View>
                                )
                            )}

                            {isFile && (
                                <Pressable onPress={() => openFile(mediaItem.Origin)}>
                                    <View style={[styles.mediaItem, styles.filePreviewBox]}>
                                        <Text style={{ fontSize: 12 }}>{mediaItem.Mime?.split('/')[1]?.toLowerCase() || mediaItem.Mime} </Text>
                                        <Text style={styles.fileTypeText}>{mediaItem.Origin?.split('.')[1]?.toUpperCase() || 'FILE'} </Text>
                                    </View>
                                </Pressable>
                            )}

                        </TouchableOpacity>
                    );
                })}
            </View>

            {/* 全屏 Modal */}
            {isModalVisible && (
                <Modal
                    visible={isModalVisible}
                    transparent
                    animationType="fade"
                    onRequestClose={requestClose}
                    onShow={() => {
                        flatListRef.current?.scrollToIndex({
                            animated: false,
                            index: selectedMediaIndex,
                        });
                        setIsModalReady(true);
                    }}
                >
                    <View style={styles.modalContainer}>
                        <FlatList
                            ref={flatListRef}
                            data={media}
                            horizontal
                            pagingEnabled
                            showsHorizontalScrollIndicator={false}
                            keyExtractor={(_, index) => weiboId + '_' + index}
                            getItemLayout={(_, index) => ({
                                length: width,
                                offset: width * index,
                                index,
                            })}
                            onViewableItemsChanged={onViewableItemsChanged}
                            viewabilityConfig={viewabilityConfig}
                            initialNumToRender={1}
                            maxToRenderPerBatch={1}
                            windowSize={3}
                            renderItem={({ item, index }) => {
                                const isVisible = index === currentVisibleIndex;
                                const mediaType = getMediaType(item.Mime);
                                let isImage = mediaType === MediaType.Image;
                                let isVideo = mediaType === MediaType.Video;
                                if(!isVideo){
                                    if(item.Origin.endsWith('.mp4') || item.Origin.endsWith('.mov')){
                                        isVideo = true;
                                        isImage = false;
                                    }
                                }

                                return (
                                    <View style={styles.modalItem}>
                                        {isImage ? (
                                            isVisible ? (
                                                <Image
                                                    source={{
                                                        uri: item.Origin.startsWith('http')
                                                            ? item.Origin
                                                            : 'file://' + item.Origin,
                                                    }}
                                                    style={styles.fullImage}
                                                    resizeMode="contain"
                                                />
                                            ) : (
                                                <View />
                                            )
                                        ) : isVideo ? (
                                            <Video
                                                source={
                                                    isVisible
                                                        ? {
                                                            uri: item.Origin.startsWith('http')
                                                                ? item.Origin
                                                                : 'file://' + item.Origin,
                                                        }
                                                        : undefined
                                                }
                                                style={styles.fullImage}
                                                useNativeControls
                                                paused={!isVisible}
                                                repeat
                                            />
                                        ) : (
                                            <Pressable
                                                onPress={() => openFile(item.Origin)}
                                                style={styles.fullFilePreview}
                                            >
                                                <Text style={{ fontSize: 18, color: 'white', textAlign: 'center' }}>{item.Mime?.split('/')[1]?.toLowerCase() || item.Mime} </Text>
                                                <Text style={styles.fullFileTypeText}>{item.Origin?.split('.')[1]?.toUpperCase() || 'FILE'} </Text>
                                            </Pressable>
                                        )}
                                    </View>
                                );
                            }}
                        />

                        <TouchableOpacity
                            style={styles.closeButton}
                            onPress={requestClose}
                        >
                            <Text style={styles.closeText}>关闭</Text>
                        </TouchableOpacity>

                        <View style={styles.modalButtonContainer}>
                            <TouchableOpacity
                                style={styles.modalBtn}
                                onPress={() =>
                                    media[currentVisibleIndex] &&
                                    saveToLocal(media[currentVisibleIndex].Origin)
                                }
                            >
                                <Text style={styles.modalBtnText}>保存</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={styles.modalBtn}
                                onPress={() =>
                                    media[currentVisibleIndex] &&
                                    openFile(media[currentVisibleIndex].Origin)
                                }
                            >
                                <Text style={styles.modalBtnText}>源文件</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </Modal>
            )}
        </>
    );
};

const styles = StyleSheet.create({
    mediaContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
    },
    mediaItem: {
        width: 100,
        height: 100,
        marginRight: 10,
        marginBottom: 10,
    },
    playOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.3)',
    },
    playText: {
        fontSize: 30,
        color: 'white',
    },
    filePreviewBox: {
        backgroundColor: '#eee',
        justifyContent: 'center',
        alignItems: 'center',
    },
    fileTypeText: {
        fontSize: 16,
        fontWeight: 'bold',
    },
    modalContainer: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.9)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalItem: {
        width,
        height,
        justifyContent: 'center',
        alignItems: 'center',
    },
    fullImage: {
        width: '100%',
        height: '100%',
    },
    fullFilePreview: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    fullFileTypeText: {
        fontSize: 36,
        fontWeight: 'bold',
        color: 'white',
    },
    closeButton: {
        position: 'absolute',
        top: 40,
        right: 20,
    },
    closeText: {
        color: 'white',
        fontSize: 18,
    },
    modalButtonContainer: {
        position: 'absolute',
        bottom: 40,
        flexDirection: 'row',
    },
    modalBtn: {
        marginHorizontal: 10,
    },
    modalBtnText: {
        color: 'white',
        fontSize: 18,
    },
});
