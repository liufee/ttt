import React from 'react';
import {
    View,
    ScrollView,
    StyleSheet,
    Pressable,
    Image,
} from 'react-native';

import { Emojis, EmojiItem } from '../../../services/weibo/emoj';
import {AppWeiboBasePath} from '../../../constant';

type Props = {
    visible: boolean;
    onSelect: (emojiName: string) => void;
};

export const EmojiPanel = ({ visible, onSelect }: Props) => {
    if (!visible) return null;

    return (
        <View style={styles.panel}>
            <ScrollView>
                <View style={styles.grid}>
                    {Emojis.map((item: EmojiItem, index) => (
                        <Pressable key={index} style={styles.item} onPress={() => onSelect('[' + item.name + ']')}>
                            <Image source={{uri: `file://${AppWeiboBasePath}/${item.url}`}} style={styles.image}/>
                        </Pressable>
                    ))}
                </View>
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    panel: {
        maxHeight: 250,
        borderTopWidth: 1,
        borderColor: '#eee',
        marginTop: 10,
        paddingVertical: 10,
        backgroundColor: '#fff',
    },
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
    },
    item: {
        width: '10%',
        paddingVertical: 8,
        alignItems: 'center',
    },
    image: {
        width: 22,
        height: 22,
    },
});
