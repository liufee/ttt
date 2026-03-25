import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    Platform,
    ScrollView,
    Modal,
    Alert,
    PanResponder,
    TextInput, Button,
    NativeModules, DeviceEventEmitter,
} from 'react-native';
import {Polyline, Marker, MapView, AMapSdk} from 'react-native-amap3d';
import { haversineDistance, formatTime, formatTimestamp, calculateSegments, isPositionInAvailableSight } from './util';
import {format, isValid, parse} from 'date-fns';
import appConfig, {getProgress, saveProgress} from '../../config';
import {useSetting} from '../../provider/setting';
import {useToast} from '../../provider/toast';
import {useLoading} from '../../provider/loading';
import {Path, Record, RecordType, Status} from '../../services/exercise/model';
import ExerciseService from '../../services/exercise';
import Browser from '../tool/browser/IndexScreen';
import {Progress} from '../../constant';
import {calculateAverageSpeed} from './util';

const RunTrackerScreen: React.FC = () => {
    const [running, setRunning] = useState(false);
    const [path, setPath] = useState<Path[]>([]);
    const [startTime, setStartTime] = useState<number | null>(null);
    const [endTime, setEndTime] = useState<number | null>(null);
    const [distance, setDistance] = useState(0);
    const mapRef = useRef(null); // 获取地图实例
    const [debugInfo, setDebugInfo] = useState('');
    const [runDuration, setRunDuration] = useState('00:00:00');
    const [showSummary, setShowSummary] = useState(false);
    const [avgPace, setAvgPace] = useState(0);
    const [segmentPace, setSegmentPace] = useState([]);
    const [runType, setRunType] = useState(null);
    const [showAvgType, setShowAvgType] = useState(0);
    const startY = useRef(0); // 记录起始触摸位置
    const triggered = useRef(false); // 记录是否已经触发
    const distanceRef = useRef(distance);
    const showAvgTypeRef = useRef(showAvgType);
    const visibleRegionRef = useRef(null);
    const savingRef = useRef<boolean>(false);

    const [showHandInput, setShowHandInput] = useState(false);
    const [handInputStartAt, setHandInputStartAt] = useState('');
    const [handInputEndAt, setHandInputEndAt] = useState('');
    const [handInputDistance, _] = useState<number>(8.15);

    const [browserShow, setBrowserShow] = useState<number>(0);


    const {setting} = useSetting();
    const {showToast} = useToast();
    const {showLoading, hideLoading} = useLoading();

    const exerciseService = ExerciseService.getInstance();

    const locationBufferRef = useRef<Map<number, any>>(new Map());
    const lastSeqRef = useRef<number>(0);
    const lastPointRef = useRef<Path | null>(null);

    let avgPaceType = 0;
    let allAvgPaceTypes = ['km/h', 'm/min', 'm/s'];
    const panResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => true,
            onMoveShouldSetPanResponder: () => true,

            // 记录触摸起始位置
            onPanResponderGrant: (_, gestureState) => {
                startY.current = gestureState.y0;
                triggered.current = false; // 允许触发
            },

            // 当用户手指离开屏幕时才触发
            onPanResponderRelease: (_, gestureState) => {
                const dy = gestureState.moveY - startY.current; // 计算滑动距离
                if (!triggered.current) {
                    if (dy < -30) {
                        if(avgPaceType < 2){
                            avgPaceType++;
                        }
                    } else if (dy > 30) {
                        if(avgPaceType > 0){
                            avgPaceType--;
                        }
                    }
                    setShowAvgType(avgPaceType);
                    triggered.current = true; // 只触发一次
                }
            },
        })
    ).current;

    useEffect(() => {
        if(!setting.exercise.runningWithoutPosition) {
            AMapSdk.init(
                Platform.select({
                    android: appConfig.gaoDeAPIKey.android,
                    ios: appConfig.gaoDeAPIKey.ios,
                })
            );
            DeviceEventEmitter.addListener('locationUpdate', async(data) => {
                const locations = data.locations.split(';');
                for (const loc of locations) {
                    const item = loc.split(',');
                    await pushOrderedLocation({
                        nativeEvent: {
                            coords: {
                                latitude: Number(item[0]),
                                longitude: Number(item[1]),
                                time: Number(item[2]),
                                seq: Number(item[3]),
                            },
                        },
                    });
                }
            });
            /*
            Geolocation.getCurrentPosition(position => {
                    const {latitude, longitude} = position.coords;
                    setDebugInfo('current position ' + 'latitude:' + latitude.toString() + ' longitude:' + longitude.toString())
                    setCurrentCenterPosition({latitude: latitude, longitude: longitude})
                    mapRef.current.moveCamera({target: {latitude: latitude, longitude: longitude,}, zoom: 18}, 100);
                },
                error => {
                    console.log(error);
                    setDebugInfo('current position code:' + error.code + ';message:' + error.message)
                },
                {enableHighAccuracy: false, timeout: 15000, maximumAge: 10000}
            );*/
        }
    }, []);

    useEffect(() => {
        distanceRef.current = distance;
        showAvgTypeRef.current = showAvgType;
    }, [distance, showAvgType]);

    useEffect(()=>{
        let intervalId;
        if (running && startTime !== null) {
            intervalId = setInterval(() => {
                const now = Date.now();
                setRunDuration(formatTime(now - startTime));
                const avg = calculateAverageSpeed(distanceRef.current, now - startTime, showAvgTypeRef.current);
                setAvgPace(avg);
            }, 1000);
        }
        // 清除定时器
        return () => clearInterval(intervalId);
    }, [running, startTime]);

    const startRun = async(type) => {
        await NativeModules.RNHelper.startRunLocation(false);
        setRunning(true);
        lastSeqRef.current = 0;
        lastPointRef.current = null;
        locationBufferRef.current.clear();
        setPath([]);
        setDistance(0);
        setStartTime(Date.now());
        setEndTime(null);
        setRunType(type);
    };

    const stopRun = async () => {
        await NativeModules.RNHelper.stopRunLocation();
        setRunning(false);
        const etime = Date.now();
        setEndTime(etime);

        // 计算平均配速（单位：min/km）
        const tempAvgPace = calculateAverageSpeed(distance, etime - startTime, 0);
        setAvgPace(tempAvgPace);
        const startAt = format(startTime as number, 'yyyy-MM-dd HH:mm:ss');
        const endAt = format(etime, 'yyyy-MM-dd HH:mm:ss');
        const run = {
            avgPace:tempAvgPace,
            distance:distance,
            runDuration:runDuration,
            runningWithoutPosition: setting.exercise.runningWithoutPosition ? 1 : 0,
            paths:path,
        };
        const [success, err] = await exerciseService.saveRunRecord(startAt,endAt, run);
        if(!success){
            Alert.alert('失败', err);
            return;
        }

        const segmentPaceData = path.length > 0 ? calculateSegments(path) : [];
        setSegmentPace(segmentPaceData);
        setShowSummary(true);
    };

    const saveRun = async () => {
        if (savingRef.current) return;
        savingRef.current = true;
        showLoading('保存中');
        const record:Record = {
            id:'',
            type:RecordType.RecordTypeRun,
            startAt:format(startTime as number, 'yyyy-MM-dd HH:mm:ss'),
            endAt: format(endTime as number, 'yyyy-MM-dd HH:mm:ss'),
            abdominal:null as any,
            run:{
                avgPace:avgPace,
                distance:distance,
                runDuration:runDuration,
                runningWithoutPosition: setting.exercise.runningWithoutPosition ? 1 : 0,
                paths:path,
            },
            status:Status.StatusFinished,
            sitUpPushUp:null as any,
            tsr:1,
            tsrVerified:1,
        };
        const [success, err] = await exerciseService.saveRecord(record);
        hideLoading();
        savingRef.current = false;
        if(!success){
            Alert.alert('失败', err);
            return;
        }
        setShowSummary(false);
        showToast({message: '保存成功'});
        await markTodayFinishedRun();
    };

    const saveHandInput = async ()=>{
        let parsedDate = parse(handInputStartAt, 'yyyy-MM-dd HH:mm:ss', new Date());
        if ( !isValid(parsedDate) ){
            showToast({message: 'start time error: ' + handInputStartAt, backgroundColor: 'red'});
            return;
        }
        parsedDate = parse(handInputEndAt, 'yyyy-MM-dd HH:mm:ss', new Date());
        if ( !isValid(parsedDate) ){
            showToast({message: 'end time error: ' + handInputEndAt, backgroundColor: 'red'});
            return;
        }
        const parsedHandInputStartAt = parse(handInputStartAt, 'yyyy-MM-dd HH:mm:ss', new Date());
        const parsedHandInputEndAt = parse(handInputEndAt, 'yyyy-MM-dd HH:mm:ss', new Date());

        const record:Record = {
            id:'',
            type:RecordType.RecordTypeRun,
            startAt:handInputStartAt,
            endAt: handInputEndAt,
            abdominal:null as any,
            run:{
                avgPace:0,
                distance:handInputDistance,
                runDuration:formatTime(parsedHandInputEndAt.getTime() - parsedHandInputStartAt.getTime()),
                runningWithoutPosition: 1,
                paths:[],
            },
            status:Status.StatusFinished,
            sitUpPushUp:null as any,
            tsr:1,
            tsrVerified:1,
        };
        showLoading('保存中');
        const [success, err] = await exerciseService.saveRecord(record);
        hideLoading();
        if(!success){
            Alert.alert('失败', err);
            return;
        }

        setShowHandInput(false);
        showToast({message: '保存成功'});
        await markTodayFinishedRun();
    };

    const handleShowHandInput = ()=>{
        getProgress(Progress.LastHandInputRunStartTime).then((content)=>{
            if(!content){
                return;
            }
            setHandInputStartAt(format(content, 'yyyy-MM-dd HH:mm:ss'));
        });
        saveProgress(Progress.LastHandInputRunStartTime, (new Date()).getTime()).then(()=>{
            setHandInputEndAt(format(Date.now(), 'yyyy-MM-dd HH:mm:ss'));
            setShowHandInput(true);
        });
    };

    const markTodayFinishedRun = async () => {
        const date = new Date();
        await saveProgress(Progress.TodayFinishedRun, `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`);
    };

    const pushOrderedLocation = async(event) => {
        const seq = event.nativeEvent.coords.seq;
        if (seq <= lastSeqRef.current){
            return;
        }

        locationBufferRef.current.set(seq, event);

        let nextSeq = lastSeqRef.current + 1;
        const eventsToAdd: any[] = [];

        while (locationBufferRef.current.has(nextSeq)) {
            eventsToAdd.push(locationBufferRef.current.get(nextSeq));
            locationBufferRef.current.delete(nextSeq);
            lastSeqRef.current = nextSeq;
            nextSeq++;
        }

        if (eventsToAdd.length === 0){
            return;
        }
        await onLocations(eventsToAdd);
    };

    const onLocations = async(events) => {
        let distanceToAdd = 0;
        let prevPoint = lastPointRef.current;

        for (const event of events) {
            const { latitude, longitude, seq } = event.nativeEvent.coords;
            const time = event.nativeEvent.coords?.time ?? Date.now();
            if (prevPoint) {
                distanceToAdd += haversineDistance(prevPoint, { latitude, longitude });
            }

            prevPoint = { latitude, longitude, time, seq };
        }

        if (distanceToAdd > 0) {
            setDistance(d => {
                const next = d + distanceToAdd;
                distanceRef.current = next;
                setDebugInfo('setDistance ' + next);
                return next;
            });
        }

        lastPointRef.current = prevPoint;

        setPath(prev => [
            ...prev,
            ...events.map(event => {
                const { latitude, longitude, seq } = event.nativeEvent.coords;
                const time = event.nativeEvent.coords?.time ?? Date.now();
                return { latitude, longitude, time, seq };
            }),
        ]);

        const lastEvent = events[events.length - 1];
        const { latitude, longitude } = lastEvent.nativeEvent.coords;
        const time = lastEvent.nativeEvent.coords?.time ?? Date.now();
        if (visibleRegionRef.current) {
            const inAvailableSight = isPositionInAvailableSight(lastEvent.nativeEvent.coords, visibleRegionRef.current.latLngBounds.southwest, visibleRegionRef.current.latLngBounds.northeast);
            if (!inAvailableSight) {
                const position = {
                    ...visibleRegionRef.current.cameraPosition,
                    target: { latitude, longitude },
                };
                mapRef.current?.moveCamera(position, 100);
                console.log('当前不在可视区域 ' + format(new Date(time), 'yyyy-MM-dd HH:mm:ss'));
                setDebugInfo('当前不在可视区域 ' + format(new Date(time), 'yyyy-MM-dd HH:mm:ss'));
            }else{
                console.log('不用移动，在可视区域 ' + format(new Date(time), 'yyyy-MM-dd HH:mm:ss'))
                setDebugInfo('不用移动，在可视区域 ' + format(new Date(time), 'yyyy-MM-dd HH:mm:ss'));
            }
        } else {
            mapRef.current?.moveCamera({ target: { latitude, longitude } }, 100);
            setDebugInfo('获取到的第一个位置，移动到该位置');
        }
    };

    const handleOnCameraIdle = (event) => {
        setDebugInfo('已经设置当前可视区域 ' + format(new Date(), 'yyyy-MM-dd HH:mm:ss'));
        visibleRegionRef.current = event.nativeEvent;
    };

    const changeBrowserStatus = () => {
        if(browserShow <= 1){// 0 不显示 1 高窗口 2 低窗口
            setBrowserShow(browserShow + 1);
        } else{
            setBrowserShow(0);
        }
    };

    return (
        <View style={styles.container}>
            {browserShow !== 0 && <View style={{flex:1, position:'relative', zIndex:1002, maxHeight:browserShow === 1 ? 500 : 260 }}><Browser ShowNav={false}></Browser></View>}
            {setting.exercise.runningWithoutPosition &&
                <Text style={{color:'red', position:'relative', top:300, left: 110, fontSize:50}}>仅记时</Text>
            }
            {!setting.exercise.runningWithoutPosition && <MapView style={styles.map} ref={mapRef} distanceFilter={0.1}
                     myLocationButtonEnabled={true} myLocationEnabled={true} zoomGesturesEnabled={true}
                     labelsEnabled={true} compassEnabled={true} scaleControlsEnabled={true} scrollGesturesEnabled={true}
                     onLocation={null/* 前台定位使用这个 async (event)=>{await onLocations([event]); */} onCameraIdle={handleOnCameraIdle}
                     initialCameraPosition={{target:{latitude:22.600995460902272, longitude:113.8487422331694}, zoom:19}}
            >
                {path.length > 0 && (
                    <>
                        <Polyline geodesic={true} gradient={true} color={'blue'} points={path} width={5} />
                        <Marker icon={require('../../assets/images/position_start.png')} position={path[0]} title='起点' />
                        {!running && <Marker icon={require('../../assets/images/position_arrived.png')} position={path[path.length - 1]} title='终点' />}
                    </>
                )}
            </MapView>}
            <View style={{position:'absolute',zIndex:1005, right:30, top: 75}}><Button title={'TV '} onPress={changeBrowserStatus}></Button></View>
            <View style={styles.infoPanel} {...panResponder.panHandlers}>
                <Text style={styles.infoText}> <Text style={{fontSize:25}}>{runDuration}{' '.padStart(3)}{distance.toFixed(2)} km</Text></Text>
                <Text style={styles.infoText}> <Text style={{fontSize: 25}}>{avgPace.toFixed(2)} {allAvgPaceTypes[showAvgType]}</Text></Text>
            </View>

            {running &&
                <TouchableOpacity style={{...styles.button, backgroundColor:running ? '#ff5722' : 'green', bottom:setting.global.debugMode?150:50}} onPress={()=>{
                    Alert.alert('确认？', '确定完成？',
                    [{ text: '继续', style: 'cancel' }, { text: '确认', onPress: () => {running ? stopRun() : startRun(1)}},]
                    );}}>
                    <Text style={{...styles.buttonText}}>完成{runType === 1 ? '跑步' : '走路'}</Text>
                </TouchableOpacity>
            }
            {!running && (<>
                <TouchableOpacity style={{ ...styles.button, left:'10%', backgroundColor:running ? '#ff5722' : 'green', bottom:setting.global.debugMode?150:50}} onPress={()=>{if(running){stopRun()}else{startRun(1)}}}>
                    <Text style={{...styles.buttonText}}>开始跑步</Text>
                </TouchableOpacity>
                <TouchableOpacity style={{ ...styles.button, left:'55%', backgroundColor:running?'#ff5722' : 'blue', bottom:setting.global.debugMode?150:50}} onPress={()=>{if(running){stopRun()}else{startRun(2)}}}>
                    <Text style={{...styles.buttonText}}>开始走路</Text>
                </TouchableOpacity>
                {setting.exercise.showHandInputRunRecord && <TouchableOpacity style={{ ...styles.button, left:'32%', backgroundColor:running?'#ff5722' : 'orange', bottom:setting.global.debugMode?90:0}} onPress={handleShowHandInput}>
                    <Text style={{...styles.buttonText}}>手动录入</Text>
                </TouchableOpacity>}</>
            )}
            {setting.global.debugMode && <View style={{position:'absolute',backgroundColor:'white',width:350,height:100,bottom:10}}>
                <ScrollView>
                    <Text>{debugInfo}</Text>
                </ScrollView>
            </View>}

            <Modal visible={showSummary} transparent animationType='slide'>
                <View style={styles.modalContainer}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>恭喜完成</Text>
                        <Text style={styles.modalText}>耗时: {runDuration}</Text>
                        <Text style={styles.modalText}>总距离: {distance.toFixed(2)} km</Text>
                        <Text style={styles.modalText}>平均配速: {avgPace.toFixed(2)} km/h</Text>

                        <Text style={styles.modalText}>分段配速:</Text>
                        <ScrollView style={{height:200}}>
                            {segmentPace.length > 0 && segmentPace.map((segment, index) => (
                                <Text key={index} style={styles.modalText}>
                                    {formatTimestamp(segment.startTime)} - {formatTimestamp(segment.endTime)} ({((segment.endTime-segment.startTime)/(1000*60)).toFixed(0)} min) : <Text style={{color:'green'}}>{segment.avgPace.toFixed(2)} km/h</Text>
                                </Text>
                            ))}
                            {segmentPace.length === 0 && (
                                <Text style={styles.modalText}>
                                    {formatTimestamp(startTime as number)}-{formatTimestamp(endTime as number)} ({((endTime-startTime)/(1000*60)).toFixed(0)} min) : <Text style={{color:'green'}}>{avgPace.toFixed(2)} km/h</Text>
                                </Text>
                            )}
                        </ScrollView>
                        <View style={styles.buttonContainer}>
                            <TouchableOpacity style={{...styles.modalButton, backgroundColor:'gray'}} onPress={() => setShowSummary(false)}>
                                <Text style={styles.buttonText}>关闭</Text>
                            </TouchableOpacity>
                            {runType === 1 && <TouchableOpacity style={styles.modalButton} onPress={saveRun}>
                                <Text style={styles.buttonText}>保存</Text>
                            </TouchableOpacity>}
                        </View>
                    </View>
                </View>
            </Modal>

            <Modal visible={showHandInput} transparent animationType='slide'>
                <View style={styles.modalContainer}>
                    <View style={styles.modalContent}>
                        {[
                            {label: '开始时间', value: handInputStartAt, setter: setHandInputStartAt },
                            {label: '结束时间', value: handInputEndAt, setter: setHandInputEndAt },
                            //{label: '距离', value: handInputDistance, setter: setHandInputDistance },
                        ].map((item, index) => (
                            <View key={index} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
                                <Text style={{ width: 100, fontSize: 16, color: '#555' }}>{item.label}：</Text>
                                <TextInput
                                    style={{ borderWidth: 1, borderColor: '#ddd', padding: 12, borderRadius: 8, flex: 1, backgroundColor: '#fff' }}
                                    keyboardType='numeric'
                                    value={item.value}
                                    onChangeText={item.setter}
                                />
                            </View>
                        ))}
                        <View style={styles.buttonContainer}>
                            <TouchableOpacity style={{...styles.modalButton, backgroundColor:'gray'}} onPress={() => setShowHandInput(false)}>
                                <Text style={styles.buttonText}>关闭</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.modalButton} onPress={saveHandInput}>
                                <Text style={styles.buttonText}>保存</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1 },
    map: { flex: 1 },
    infoPanel: { position: 'absolute', top: 50, left: 20, right: 20, backgroundColor: 'rgba(0,0,0,0.5)', padding: 10, borderRadius: 10, zIndex:1003 },
    infoText: { color: 'white', fontSize: 16, textAlign: 'center' },
    button: { position: 'absolute', bottom: 150, left: '30%', width: '35%', backgroundColor: '#ff5722', padding: 15, borderRadius: 20 },
    buttonText: { color: 'white', textAlign: 'center', fontSize: 18, fontWeight: 'bold' },
    modalContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.5)',
    },
    modalContent: {
        width: '90%',
        backgroundColor: 'white',
        padding: 20,
        borderRadius: 10,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 10,
        textAlign: 'center',
    },
    modalText: {
        fontSize: 16,
        marginBottom: 5,
    },
    buttonContainer: { flexDirection: 'row', marginTop: 10 },
    modalButton: { marginHorizontal: 10, backgroundColor: '#ff5722', padding: 10, borderRadius: 10 },

});

export default RunTrackerScreen;
