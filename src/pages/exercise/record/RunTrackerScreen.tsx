import React, { useState, useEffect, useRef } from 'react';
import {View, Text, StyleSheet, Platform, TouchableOpacity, PanResponder, ScrollView, Modal, Alert} from 'react-native';
import {Polyline, Marker, MapView, AMapSdk} from 'react-native-amap3d';
import {format, parse} from 'date-fns';
import config from '../../../config';
import {formatTimestamp, calculateSegments, convertSpeed} from '../util';
import ExerciseService from '../../../services/exercise';

const RecordDetailRunTrack = ({route, navigation})=> {
    const [path, setPath] = useState<{ latitude: number; longitude: number; time: number }[]>([]);
    const [startTime, setStartTime] = useState<number | null>(null);
    const [endTime, setEndTime] = useState<number | null>(null);
    const [distance, setDistance] = useState(0);
    const mapRef = useRef(null); // 获取地图实例
    const [runDuration, setRunDuration] = useState('00:00:00');
    const [segmentPace, setSegmentPace] = useState([]);
    const [showAvgType, setShowAvgType] = useState(0);
    const [showSummary, setShowSummary] = useState(false);
    const startY = useRef(0); // 记录起始触摸位置
    const triggered = useRef(false); // 记录是否已经触发

    const exerciseService = ExerciseService.getInstance();

    const [avgPace, setAvgPace] = useState<number>(0);
    const { id } = route.params;

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

    const refreshRecord = async ()=>{
        const [success, record, err] = await exerciseService.getRecordById(id);
        if(!success){
            Alert.alert('失败', err);
            return;
        }
        if(record.run.runningWithoutPosition === 1){
            record.run.distance = 8.15;
            const [hours, minutes, seconds] = record.run.runDuration.split(':').map(Number);
            const totalHours = hours + minutes / 60 + seconds / 3600; // 转换为小时
            record.run.avgPace = record.run.distance / totalHours;
        }
        setAvgPace(record.run.avgPace);
        setRunDuration(record.run.runDuration);
        setDistance(record.run.distance);
        setStartTime(parse(record.startAt, 'yyyy-MM-dd HH:mm:ss', new Date()).getTime());
        setEndTime(parse(record.endAt, 'yyyy-MM-dd HH:mm:ss', new Date()).getTime());
        setPath(record.run.paths);
        const segmentPaceData = record.run.paths.length > 0 ? calculateSegments(record.run.paths) : [];
        setSegmentPace(segmentPaceData);
        setShowSummary(true);
        mapRef.current.moveCamera({target: {latitude: record.run.paths[0].latitude, longitude:record.run.paths[0].longitude}, zoom: 13}, 100);

    };

    useEffect(() => {
        AMapSdk.init(
            Platform.select({
                android: config.gaoDeAPIKey.android,
                ios: config.gaoDeAPIKey.ios,
            })
        );
        setTimeout(()=>{
            refreshRecord();
        }, 100);
        return () => {
        };
    }, []);

    return (
        <View style={styles.container}>
            <MapView style={styles.map} ref={mapRef} distanceFilter={100}
                     myLocationButtonEnabled={true} myLocationEnabled={true} zoomGesturesEnabled={true}
                     labelsEnabled={true} compassEnabled={true} scaleControlsEnabled={true} scrollGesturesEnabled={true}
            >
                {path.length > 0 && (
                    <>
                        <Polyline geodesic={true} gradient={true} color={'blue'} points={path} width={5} />
                        <Marker icon={require('../../../assets/images/position_start.png')} position={path[0]} title='起点' />
                        <Marker icon={require('../../../assets/images/position_arrived.png')} position={path[path.length - 1]} title='终点' />
                    </>
                )}
            </MapView>
            <View style={styles.infoPanel} {...panResponder.panHandlers}>
                <Text style={styles.infoText}>{format(startTime as number, 'yyyy-MM-dd')} {format(startTime as number, 'HH:mm:ss')}~{format(endTime as number, 'HH:mm:ss')}</Text>
                <Text style={styles.infoText}>速度 {(convertSpeed(avgPace, showAvgType)).toFixed(2)} {allAvgPaceTypes[showAvgType]} 耗时 {runDuration} 距离 {distance.toFixed(2)} km </Text>
            </View>
            {/* 返回按钮 */}
            <TouchableOpacity style={styles.backButton} onPress={()=> navigation.goBack()}>
                <Text style={styles.backText}>←</Text>
            </TouchableOpacity>
            <Modal visible={showSummary} transparent animationType='slide'>
                <View style={styles.modalContainer}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalText}>分段配速:</Text>
                        <ScrollView style={{height:200}}>
                            {segmentPace.length > 0 && segmentPace.map((segment, index) => (
                                <Text key={index} style={styles.modalText}>
                                    {formatTimestamp(segment.startTime)}~{formatTimestamp(segment.endTime)} ({((segment.endTime-segment.startTime)/(1000*60)).toFixed(0)} min) : <Text style={{color:'green'}}>{segment.avgPace.toFixed(2)} km/h</Text>
                                </Text>
                            ))}
                            {segmentPace.length == 0 && (
                                <Text style={styles.modalText}>
                                    {formatTimestamp(startTime as number)}~{formatTimestamp(endTime as number)} ({((endTime-startTime)/(1000*60)).toFixed(0)} min) : <Text style={{color:'green'}}>{avgPace.toFixed(2)} km/h</Text>
                                </Text>
                            )}
                        </ScrollView>
                        <View style={styles.buttonContainer}>
                            <TouchableOpacity style={{...styles.modalButton, backgroundColor:'gray'}} onPress={() => setShowSummary(false)}>
                                <Text style={styles.buttonText}>关闭</Text>
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
    infoPanel: { position: 'absolute', top: 0, left: 20, right: 20, backgroundColor: 'rgba(0,0,0,0.5)', padding: 10, borderRadius: 10 },
    infoText: { color: 'white', fontSize: 16, textAlign: 'center' },
    // 返回按钮样式
    backButton: {
        position: 'absolute',
        top: 10,
        left: 0,
        zIndex: 3, // 确保按钮显示在其他组件上层
        backgroundColor: 'rgba(0, 0, 0, 0.3)', // 给按钮加一个半透明背景
        padding: 10,
        borderRadius: 30, // 圆角效果
        alignItems: 'center',
        justifyContent: 'center',
    },
    backText: {
        color: 'white',
        fontSize: 30,
        fontWeight: 'bold',
    },
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
    buttonText: { color: 'white', textAlign: 'center', fontSize: 18, fontWeight: 'bold' },
});

export default RecordDetailRunTrack;
