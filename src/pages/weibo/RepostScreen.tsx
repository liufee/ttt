import React from 'react';
import {View, StyleSheet} from 'react-native';
import {useRoute} from '@react-navigation/native';
import WeiboService from '../../services/weibo';
import Composer from './components/Composer';
import {useSetting} from '../../provider/setting';
import {AppWeiboBasePath} from '../../constant';

export default function RepostScreen() {
    const route = useRoute<any>();

    const uid = route.params?.uid ?? '0';
    const repostWeibo = route.params?.repostWeibo ?? null;
    const onPosted = route.params?.onPosted;

    const weiboService:WeiboService = WeiboService.getInstance();

    const {setting} = useSetting();

    return (
        <View style={styles.container}>
            <Composer
                uid={uid}
                draftFile={AppWeiboBasePath + '/draft'}
                setting={setting}
                weiboService={weiboService}
                repostWeibo={repostWeibo}
                onPosted={onPosted}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {flex: 1, backgroundColor: '#f7f7f7', padding: 10},
});
