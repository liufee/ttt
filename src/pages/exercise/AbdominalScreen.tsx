import React, {useState, useRef, useEffect} from 'react';
import {View, Text, StyleSheet, ScrollView, Dimensions, TouchableOpacity, Alert} from 'react-native';
import Video from 'react-native-video';
import { format, parse, addMinutes } from 'date-fns';
import Loading from '../../components/loading';
import ExerciseService from '../../services/exercise';
import {RecordType,Record, Status} from '../../services/exercise/model';
import RNFS from 'react-native-fs';
import {APPRuntimePath, HTTPCDNBaseURL, Progress} from '../../constant';
import {useToast} from '../../provider/toast';
import {saveProgress} from '../../config';

const { width } = Dimensions.get('window');

const ExercisePage = () => {
    const videoRef = useRef(null);
    const [paused, setPaused] = useState(true);
    const [muted, setMuted] = useState(false);
    const [showSkipRest, setShowSkipRest] = useState(false);
    const [currentAction, setCurrentAction] = useState(-1);
    const [loading, setLoading] = useState<boolean>(false);
    const [loadingText, setLoadingText] = useState<string>('视频下载中...');
    const [showRetry, setShowRetry] = useState<boolean>(false);
    const [videoUri, setVideoUri] = useState<string | null>(null);
    const [list, setList] = useState([]);
    const [startAt, setStartAT] = useState<Date|null>(null);

    const hasEnded = useRef(false);

    const {showToast} = useToast();

    const exerciseService = ExerciseService.getInstance();

    const actions = [
        {//1-瑜伽垫辅助卷腹
            description: '1-1', start: 4.5, end: 55, name: '瑜伽垫辅助卷腹', duration: 50,
        },
        {//1-屈腿卷腹
            description: '1-2', start: 67, end: 103, name: '反向屈体转腹',duration: 36,
        },
        {//1-简易俄罗斯转体
            description: '1-3', start: 115.5, end: 149, name: '简易俄罗斯转体',duration: 33,
        },
        {//1-左侧屈膝
            description: '1-4', start: 171.5, end: 201, name: '左侧屈膝',duration: 30,
        },
        {//1-右侧屈膝
            description: '1-5', start: 213, end: 240, name: '右侧屈膝',duration: 30,
        },
        {//无休息 1-腹部拉升
            description: '1-6', start: 243.5, end: 272, name: '腹部拉升',duration: 30,
        },
        {//2-瑜伽垫辅助卷腹
            description: '2-1', start: 283.5, end: 334.5, name: '瑜伽垫辅助卷腹',duration: 50,
        },
        {//2-反向屈体转腹
            description: '2-2', start: 346.5, end: 382.5, name: '反向屈体转腹',duration: 36,
        },
        {//2-简易俄罗斯转体
            description: '2-3', start: 395.5, end: 429, name: '简易俄罗斯转体',duration: 33,
        },
        {//2-平板支撑
            description: '2-4', start: 451.5, end: 490, name: '平板支撑',duration: 38,
        },
        {//无休息 2-腹部拉升
            description: '2-5', start: 492.5, end: 521, name: '腹部拉升',duration: 30,
        },
        {//3-瑜伽垫辅助卷腹
            description: '3-1', start: 532.5, end: 583, name: '瑜伽垫辅助卷腹',duration: 50,
        },
        {//3-反向屈体转腹
            description: '3-2', start: 595.5, end: 632, name: '反向屈体转腹',duration: 36,
        },
        {//3-简易俄罗斯转体
            description: '3-3', start: 644.5, end: 678, name: '简易俄罗斯转体',duration: 33,
        },
        {//3-平板支撑交替抬腿
            description: '3-4', start: 700, end: 730, name: '平板支撑交替抬腿',duration: 30,
        },
        {//无休息 3-真空腹训练
            description: '3-5', start: 733.5, end: 762, name: '真空腹训练',duration: 30,
        },
    ];

    const initializeVideo = async () => {
        const remoteUrl = `${HTTPCDNBaseURL}/videos/keep_1_1.mp4`;
        const dirExists = await RNFS.exists(APPRuntimePath);
        if (!dirExists) {
            await RNFS.mkdir(APPRuntimePath);
        }
        const localPath = `${APPRuntimePath}/keep_1_1.mp4`;
        const tempPath = `${localPath}.tmp`;

        setShowRetry(false);
        setLoading(true);
        setLoadingText('视频下载中...');

        const fileExists = await RNFS.exists(localPath);
        if (fileExists) {
            setVideoUri(localPath);
            setLoading(false);
        } else {
            RNFS.downloadFile({
                fromUrl: remoteUrl,
                toFile: tempPath,
            }).promise.then(async res => {
                if (res.statusCode === 200) {
                    await RNFS.moveFile(tempPath, localPath);
                    setVideoUri(localPath);
                    setLoading(false);
                } else {
                    setLoadingText('下载失败:' + res.statusCode + ' ');
                    setShowRetry(true);
                    if (await RNFS.exists(tempPath)) {
                        await RNFS.unlink(tempPath);
                    }
                }
            }).catch(async () => {
                setLoadingText('下载失败');
                setShowRetry(true);
                if (await RNFS.exists(tempPath)) {
                    await RNFS.unlink(tempPath);
                }
            });
        }
    };

    const refreshRecords = async ()=> {
        const [success, records, err] = await exerciseService.getExercisesByPage([RecordType.RecordTypeAbdominal], 1, 12, '', '', 'desc');
        if (!success) {
            Alert.alert('失败', err);
            return;
        }
        setList(records);
    };

    useEffect(()=>{
        //initializeVideo(); // 把 loading 默认改为 true，启用 initializeVideo 就能自动下载 video
        setVideoUri(`${APPRuntimePath}/keep_1_1.mp4`);
        refreshRecords();
    }, []);

    const handlePlayPause = () => {
        setPaused(!paused);
        if(currentAction === -1){
            setCurrentAction(0);
            setStartAT(new Date());
            hasEnded.current = false;
        }
    };

    const handleNextAction = () => {
        if (currentAction < actions.length - 1) {
            setShowSkipRest(false);
            videoRef.current?.seek(actions[currentAction + 1].start);
            setCurrentAction(currentAction + 1);
        }
    };

    const handlePrevAction = () => {
        if (currentAction > 0) {
            setShowSkipRest(false);
            videoRef.current?.seek(actions[currentAction - 1].start);
            setCurrentAction(currentAction - 1);
        }
    };

    const handleProgress = (data: { currentTime: number }) => {
        for(let i = 0; i < actions.length - 1; i++) {
            if (data.currentTime > actions[i].end && data.currentTime < actions[i + 1].start - 2) {//在第一个结尾，第二个开始之前
                if(i === 4 || i === 9 || i === 14){//无休息
                    return;
                }
                setShowSkipRest(true);
            }else if(Math.floor(data.currentTime) === Math.floor(actions[i].start - 2)){//等于该开始的节点
                setShowSkipRest(false);
                setCurrentAction(i);
            }
        }
    };

    const saveAbdominalRecord = async (status: Status) => {
        if (hasEnded.current) {
           return true;
        }

        const endAt = new Date();
        const record:Record = {
            id:'',
            type:RecordType.RecordTypeAbdominal,
            startAt:format(startAt as Date, 'yyyy-MM-dd HH:mm:ss'),
            endAt: format(endAt, 'yyyy-MM-dd HH:mm:ss'),
            abdominal:null as any,
            run:null as any,
            status:status,
            sitUpPushUp:null as any,
            tsr:1,
            tsrVerified:1,
        };
        const[abdominalSuccess, abdominalErr] = await exerciseService.saveRecord(record);
        if(!abdominalSuccess) {
            Alert.alert('失败', abdominalErr);
            return;
        }
        setCurrentAction(-1);
        setPaused(true);
        videoRef.current?.seek(3);
        hasEnded.current = true;
        await refreshRecords();
    };

    const autoSaveSitUpPushUpRecord = async () => {
        const endAt = new Date();
        const recordSitUpPushUp: Record = {
            id: '',
            type: RecordType.RecordTypeSitUpPushUp,
            startAt: format(addMinutes(endAt, 10), 'yyyy-MM-dd HH:mm:ss'),
            endAt: format(addMinutes(endAt, 90), 'yyyy-MM-dd HH:mm:ss'),
            abdominal: null as any,
            run: null as any,
            status: Status.StatusFinished,
            sitUpPushUp: {
                sitUp: 520,//仰卧起坐(1 + 6 + 6) * 40
                pushUp: 130,//俯卧撑(4*25) + (15*2)
                curlUp: 117, //曲腿卷腹(39*3)
                legsUpTheWallPose: 3, //靠墙倒立3
            },
            tsr: 1,
            tsrVerified: 1,
        };
        setLoading(true);
        setLoadingText('保存中...');
        const [success, err] = await exerciseService.saveRecord(recordSitUpPushUp);
        setLoading(false);
        if (!success) {
            Alert.alert('失败', err);
            return;
        }
        await refreshRecords();
        showToast({message: '保存成功'});
        await markTodayFinishedAbdominal();
    };

    const handleEnd = async () => {
        await saveAbdominalRecord(Status.StatusFinished);
        await autoSaveSitUpPushUpRecord(); //默认已经做了曲腿卷腹
    };
    const handleHandEnd = async () => {
        await saveAbdominalRecord(Status.StatusUndone);
    };

    const markTodayFinishedAbdominal = async () => {
        const date = new Date();
        await saveProgress(Progress.TodayFinishedAbdominal, `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`);
    };

    const reset = async () => {
        if (!paused) return;
        if (!startAt || currentAction === -1) return;
        setPaused(true);
        setCurrentAction(-1);
        setShowSkipRest(false);
        setStartAT(null);
        hasEnded.current = false;
        videoRef.current?.seek(3);
    };

    return (
        <ScrollView style={styles.container}>
            <Loading loading={loading} loadingText={loadingText} showRetry={showRetry} onRetry={initializeVideo} />
            {/* 视频播放器 */}
            <View style={styles.videoContainer}>
                {videoUri && (
                    <Video
                        ref={videoRef}
                        source={{ uri: videoUri }}
                        style={styles.video}
                        paused={paused}
                        muted={muted}
                        resizeMode='contain'
                        onProgress={handleProgress}
                        onEnd={handleEnd}
                        disableFocus={true} //不被其他 app 暂停播放
                        onLoad={()=>videoRef.current?.seek(3)}
                    />
                )}
            </View>

            {/* 锻炼内容 */}
            <View style={styles.content}>
                <Text style={styles.title}>{currentAction > -1 ? actions[currentAction].description + ' ' : ''}{actions[currentAction]?.name || '开始锻炼'}</Text>
                <Text style={styles.description}>
                    {actions[currentAction] ? `持续时间：${actions[currentAction].duration }秒` : '准备开始锻炼'}
                </Text>

                {/* 控制按钮 */}
                <View style={styles.buttonsContainer}>
                    <TouchableOpacity onPress={handlePlayPause} style={{...styles.button, backgroundColor: paused ? '#F59E0B' : '#2563EB'}} onLongPress={reset}>
                        <Text style={styles.buttonText}>{paused ? (currentAction === -1 ? '开始' : '继续') : '暂停'}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity disabled={currentAction <= 0} onPress={handlePrevAction} style={{...styles.button, backgroundColor: currentAction <= 0 ? '#9CA3AF' : '#475569'}}>
                        <Text style={styles.buttonText}>上个</Text>
                    </TouchableOpacity>
                    <TouchableOpacity disabled={currentAction >= 15 || currentAction === -1} onPress={handleNextAction} style={{...styles.button, backgroundColor: currentAction >= 15 || currentAction === -1 ? '#9CA3AF' : '#475569'}}>
                        <Text style={styles.buttonText}>下个</Text>
                    </TouchableOpacity>
                    <TouchableOpacity disabled={!showSkipRest}  onPress={handleNextAction} style={{...styles.button, backgroundColor: showSkipRest ? '#475569' : '#9CA3AF'}}>
                        <Text style={styles.buttonText}>跳休</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => setMuted(!muted)} style={{ ...styles.button, backgroundColor: muted ? '#6B7280' : '#7C3AED' }}>
                        <Text style={styles.buttonText}>{muted ? '静音' : '声音'}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity disabled={paused || hasEnded.current || currentAction === -1} onPress={handleHandEnd} style={{ ...styles.button, backgroundColor: (paused || hasEnded.current || currentAction === -1) ? '#9E9E9E' : '#16A34A' }}>
                        <Text style={styles.buttonText}>完成</Text>
                    </TouchableOpacity>
                </View>

                {/* 锻炼记录 */}
                <View style={styles.logContainer}>
                    <Text style={styles.logTitle}>最近12天的锻炼记录</Text>
                    <ScrollView style={styles.scrollLog}>
                        {list.map((log:Record, index)=>{
                            const startTime = parse(log.startAt, 'yyyy-MM-dd HH:mm:ss', new Date());
                            const endTime = parse(log.endAt, 'yyyy-MM-dd HH:mm:ss', new Date());
                            return(
                                <Text key={index} style={styles.logEntry}>
                                    {format(startTime, 'yyyy-MM-dd')} - 从 {format(startTime, 'HH:mm:ss')} 到 {format(endTime, 'HH:mm:ss')}
                                </Text>
                            );
                        })}
                    </ScrollView>
                </View>
            </View>
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f9f9f9',
    },
    videoContainer: {
        width: width,
        height: width * 9 / 16,
        backgroundColor: '#000',
        marginBottom: 20,
    },
    video: {
        width: '100%',
        height: '100%',
    },
    retryContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    content: {
        padding: 15,
        backgroundColor: '#fff',
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 10,
    },
    description: {
        fontSize: 16,
        color: '#555',
        marginBottom: 20,
    },
    buttonsContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 20,
    },
    button: {
        backgroundColor: '#4CAF50',
        padding: 10,
        borderRadius: 5,
        flex: 1,
        marginHorizontal: 2,
        alignItems: 'center',
    },
    buttonText: {
        color: '#fff',
        fontSize: 15,
        fontWeight: 'bold',
    },
    logContainer: {
        marginTop: 5,
    },
    logTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 12,
    },
    scrollLog: {
        maxHeight: 300,
    },
    logEntry: {
        fontSize: 14,
        color: '#333',
        marginBottom: 5,
    },
});

export default ExercisePage;
