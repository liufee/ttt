import {View, StyleSheet, Button, Linking, Modal, Pressable, Text, TouchableOpacity} from 'react-native';
import {useEffect, useState, useRef} from 'react';
import { NativeEventEmitter, NativeModules } from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import versionInfo from '../../config/_generated/version.json';
import {useSetting} from '../../provider/setting';
import ReceiveSharingIntent from 'react-native-receive-sharing-intent';
import ScheduleService from '../../services/schedule';
import {getProgress} from '../../config';
import {FeehiAPPHost, FeehiAPPScheme, Progress} from '../../constant';
import notifee, {EventType} from '@notifee/react-native';
import {isTimeBetween, appendURIGETParams, parseURI} from '../../utils';
import {useToast} from '../../provider/toast';

const IndexScreen = ({ navigation }) => {
    const [modalVisible, setModalVisible] = useState<boolean>(false);
    const [goLibVersion, setGoLibVersion] = useState<{GoVersion:string,GoBuildDate:string,GoGitHash:string}>({GoVersion:'',GoBuildDate:'',GoGitHash:''});
    const isFirstLoad = useRef(true);
    const isFocused = useIsFocused();

    const {showToast, hideToast} = useToast();

    const handleDeepLink = (url:string|null) => {
        if(!url){
            return;
        }
        const parsed = parseURI(url);
        const { scheme, hostname, searchParams } = parsed;

        if (scheme === 'content' || scheme === 'file') {
            jumpByPage('tool', {
                screen: 'FileViewer',
                params: {url: url},
            });
            return;
        }

        let params = null;
        const paramsStr = searchParams?.params || null;
        if(paramsStr){
            params = JSON.parse(paramsStr);
        }

        if (scheme === FeehiAPPScheme) {
            jumpByPage(hostname, params);
            return;
        }

        if (hostname.toLowerCase().includes(FeehiAPPHost)) {
            jumpByPage(searchParams.get('page'), params);
            return;
        }

        if (hostname.includes('weibo.com') || hostname.includes('x.com') || hostname.includes('douyin.com')) {
            jumpByPage('tool', {
                screen: 'Tools',
                params: {
                    screen: 'Download', params: {weblink: url},
                },
            });
            return;
        }
    };

    const jumpByPage = (page:string, params?:Object|null) => {
        switch (page) {
            case 'weibo':
                navigation.navigate('WeiboNavigator', params || undefined);
                return;
            case 'tool':
                navigation.navigate('ToolNavigator', params || undefined);
                return;
            case 'exercise':
                navigation.navigate('ExerciseNavigator', params || undefined);
                return;
            case 'dictionary':
                navigation.navigate('DictionaryNavigator', params || undefined);
                return;
            case 'children':
                navigation.navigate('ChildrenNavigator', params || undefined);
                return;
            case 'me':
                navigation.navigate('MeNavigator', params || undefined);
                return;
            case 'wise':
                const date = new Date();
                const today = `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;

                if (isTimeBetween('14:30', '16:30')) {
                    getProgress(Progress.TodayFinishedAbdominal)
                        .then(function (result: string) {
                            if (today === result) {
                                navigation.navigate('WeiboNavigator');
                            } else {
                                navigation.navigate('ExerciseNavigator');
                            }
                        });
                    return;
                }

                if (isTimeBetween('17:30', '20:30')) {
                    getProgress(Progress.TodayFinishedRun)
                        .then(function (result: string) {
                            if (today === result) {
                                navigation.navigate('WeiboNavigator');
                            } else {
                                navigation.navigate('ExerciseNavigator');
                            }
                        });
                    return;
                }

                navigation.navigate('WeiboNavigator');
                return;
            case 'index':
                navigation.navigate('IndexNavigator', params || undefined);
                return;
            default:
                navigation.navigate(page, params || undefined);
                return;
        }
    };

    const handleNotificationClick = (notification)=>{
        if(!notification){
            return;
        }
        let url = typeof notification.data?.url === 'string' ? notification.data.url : `${FeehiAPPScheme}://MessageDetail`;
        if(url.indexOf('MessageDetail') !== -1){
            const params = JSON.stringify({'title': notification.title ?? '', 'message': notification.body ?? ''});
            url = appendURIGETParams(url, {params:params});
        }
        handleDeepLink(url);
    };

    useEffect(()=>{
        Linking.addEventListener('url', (event)=>{
            handleDeepLink(event.url);
        });
        Linking.getInitialURL().then(url =>handleDeepLink(url));

        const schedule = async() => {
            await ScheduleService.getInstanceNoNeedInit().start();
        };
        schedule().then();

        const unsubscribeForeground = notifee.onForegroundEvent(({type, detail}) => {
            if (type === EventType.PRESS) {
                handleNotificationClick(detail.notification);
                return;
            }
            detail.notification?.title && showToast({message: detail.notification?.title + '-' + detail.notification?.body, autoHide: false, onPress: ()=>{hideToast(); handleNotificationClick(detail.notification);}});
        });
        notifee.onBackgroundEvent(async ({ type, detail }) => {
            if (type === EventType.PRESS) {
                handleNotificationClick(detail.notification);
            }
        });
        notifee.getInitialNotification().then(detail => {
            handleNotificationClick(detail?.notification);
        });

        return () => {
            unsubscribeForeground();
        };
    }, []);

    useEffect(() => {
        const checkShare = () => {
            ReceiveSharingIntent.getReceivedFiles(
                (files) => {
                    //[{"subject": null, "text": null, "fileName": null, "filePath": null, "contentUri": null, "weblink": "", "extension": null}]
                    const file = files[0];
                    if (file.weblink) {
                        handleDeepLink(file.weblink);
                    }
                },
                (error) => {
                    if (error && error.includes('NullPointerException')) {
                        return;
                    }
                    console.log('分享接收失败:', error);
                },
                'feehiApp' // iOS 需要 App Group, Android 可随意
            );
        };
        checkShare();

        const eventEmitter = new NativeEventEmitter({addListener:()=>NativeModules.ReceiveSharingIntent, removeListeners: () => {}});
        const sub = eventEmitter.addListener('NewShareIntent', checkShare);
        return () => sub.remove();
    });

    useEffect(() => {
        if (isFocused) {
            if (isFirstLoad.current) {
                isFirstLoad.current = false;
            }
        }
    }, [isFocused]);

    const {setting} = useSetting();
    if( isFirstLoad.current ) {
        jumpByPage(setting.global.defaultPage);
    }

    return (
        <View style={styles.container}>
            <View style={styles.viewItem}>
                <Button title="设置" onPress={()=>jumpByPage('index', {screen:'Setting'})}></Button>
            </View>
            <View style={styles.viewItem}>
                <Button title="字典" onPress={()=>jumpByPage('dictionary')}></Button>
            </View>
            <View style={styles.viewItem}>
                <Button title="运动" onPress={()=>jumpByPage('exercise')}></Button>
            </View>
            <View style={styles.viewItem}>
                <Button title="工具" onPress={()=>jumpByPage('tool')}></Button>
            </View>
            <View style={styles.viewItem}>
                <Button title="微博" onPress={()=>jumpByPage('weibo')}></Button>
            </View>
            <View style={styles.viewItem}>
                <Button title="孩子" onPress={()=>jumpByPage('children')}></Button>
            </View>
            <View style={styles.viewItem}>
                <Button title="个人" onPress={()=>jumpByPage('me')}></Button>
            </View>
            <View style={styles.viewItem}>
                <Button title="关于" onPress={async() => {
                    setModalVisible(true);
                    const goBuildDate = await NativeModules.RNHelper.versionGOBuildDate();
                    const goGitHash = await NativeModules.RNHelper.versionGOGitHash();
                    const goVersion = await NativeModules.RNHelper.versionGOVersion();
                    setGoLibVersion({GoVersion:goVersion,GoBuildDate:goBuildDate,GoGitHash:goGitHash});
                }}></Button>
            </View>

            {/* 关于弹窗 */}
            <Modal
                transparent
                animationType="fade"
                visible={modalVisible}
                onRequestClose={() => setModalVisible(false)}
            >
                <Pressable style={styles.modalOverlay} onPress={() => setModalVisible(false)}>
                    <View style={styles.modalContent}>
                        <Text style={{lineHeight:26, fontSize:14}}>
                            名称: {versionInfo.appName}-{__DEV__ ? 'Debug' : 'Release'} {'\n'}
                            版本号: {versionInfo.version} {'\n'}
                            构建时间: {versionInfo.buildTime} {'\n'}
                            Commit: {versionInfo.commitHash} {'\n'}
                            标签: {versionInfo.versionTag} {'\n'}
                            Nodejs 版本: {versionInfo.nodeVersion} {'\n'}
                            React Native 版本: {versionInfo.reactNativeVersion} {'\n'}
                            Go 构建时间: {goLibVersion.GoBuildDate.replace('_', ' ')} {'\n'}
                            Go Commit: {goLibVersion.GoGitHash} {'\n'}
                            Go 版本: {goLibVersion.GoVersion} {'\n'}
                            作者: 灰灰
                        </Text>
                        <TouchableOpacity
                            onPress={() => setModalVisible(false)}
                            style={styles.closeButton}
                        >
                            <Text style={{color: 'white'}}>关闭</Text>
                        </TouchableOpacity>
                    </View>
                </Pressable>
            </Modal>
        </View>
    );
};
const styles = StyleSheet.create({
    container: { flex: 1, padding: 10 },
    viewItem: {margin: 10},

    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.4)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContent: {
        backgroundColor: 'white',
        padding: 20,
        borderRadius: 10,
        width: '80%',
        alignItems: 'stretch',
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 10,
    },
    closeButton: {
        marginTop: 20,
        backgroundColor: 'red',
        paddingVertical: 10,
        paddingHorizontal: 20,
        borderRadius: 5,
    },
});
export default IndexScreen;
