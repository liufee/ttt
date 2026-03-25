import React from 'react';
import {View, Image, Text, Pressable, StyleSheet} from 'react-native';
import Video from 'react-native-video';
import FileViewer from 'react-native-file-viewer';
import Button from '../../../components/button';
import {MediaType} from '../../../services/weibo/model';
import {getMediaType} from '../../../utils';
import {Asset} from '../util/mediaPicker';

type Props = {
    media: Asset[];
    onDelete: (uri:string)=>void;
};

export const MediaPreview = ({media, onDelete}: Props) => {

    return (
        <View style={styles.container}>
            {media.map((item, index) => {
                if(!item.uri.startsWith('file://')){
                    item.uri = 'file://' + item.uri;
                }
                const fileType = getMediaType(item?.type);
                const isImage = fileType === MediaType.Image;
                const isVideo = fileType === MediaType.Video;

                return (
                    <View key={index} style={styles.mediaItem}>

                        {isImage ? (
                            <Pressable onPress={() => FileViewer.open(item.uri as string)}>
                                <Image source={{uri: item.uri}} style={styles.mediaImage}/>
                            </Pressable>
                        ) : isVideo ? (
                            <Pressable onPress={() => FileViewer.open(item.uri as string)}>
                                <Video source={{uri: item.uri}} style={styles.mediaVideo} useNativeControls paused/>
                            </Pressable>
                        ) : (
                            <Pressable onPress={() => FileViewer.open(item.uri as string)}>
                                <View style={styles.fileBox}>
                                    <Text style={{fontSize:12}}>{item.type?.split('/')[1]?.toLowerCase() || item.type} </Text>
                                    <Text style={{fontSize: 16, fontWeight: 'bold'}} >{item.fileName?.split('.')[1]?.toUpperCase() || 'FILE'} </Text>
                                </View>
                            </Pressable>
                        )}

                        <Button title="删除" onPress={() => onDelete(item.uri as string)} type="danger" size="small"/>
                    </View>
                );
            })}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        marginVertical: 10,
    },
    mediaItem: {
        marginRight: 10,
        marginBottom: 10,
    },
    mediaImage: {
        width: 100,
        height: 100,
    },
    mediaVideo: {
        width: 100,
        height: 100,
    },
    fileBox: {
        width: 100,
        height: 100,
        backgroundColor: '#eee',
        justifyContent: 'center',
        alignItems: 'center',
    },
});
