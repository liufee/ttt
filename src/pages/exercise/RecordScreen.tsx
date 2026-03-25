import React, {useEffect, useLayoutEffect, useState} from 'react';
import {
    Alert,
    Animated,
    Image,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    TouchableWithoutFeedback,
    View,
} from 'react-native';
import {format, parse} from 'date-fns';
import RunTrackerDetail from './record/RunTrackerScreen';
import tsrVerify from './record/TSRVerifyScreen';
import {createStackNavigator} from '@react-navigation/stack';
import {useFocusEffect} from '@react-navigation/native';
import Calendar from './record/CalendarRecordScreen';
import ExerciseService from '../../services/exercise';
import {DailyExercise, Record as RecordModel, RecordType} from '../../services/exercise/model';
import {useSetting} from '../../provider/setting';
import {useToast} from '../../provider/toast';
import {useLoading} from '../../provider/loading';
import {getShowRecordStartAndEndTime} from './util';

const Stack = createStackNavigator();

const RecordStack = ()=> {
    return (
        <Stack.Navigator>
            <Stack.Screen options={{ headerShown:false}} name='Record' component={RecordScreen} />
            <Stack.Screen options={{headerShown:false}} name='RecordDetailRunTracker' component={RunTrackerDetail} />
            <Stack.Screen options={{headerShown:false}} name='TSRVerify' component={tsrVerify} />
        </Stack.Navigator>
    );
};

export default RecordStack;

const RecordScreen = ({ navigation }) => {
    const [isMenuVisible, setMenuVisible] = useState(false);
    const [menuAnimation] = useState(new Animated.Value(-250));  // Menu off-screen initially
    const [opacityAnimation] = useState(new Animated.Value(0));  // For mask opacity
    const [records, setRecords] = useState<DailyExercise[]>([]);
    const [showType, setShowType] = useState('list');
    const {setting} = useSetting();
    const {showToast} = useToast();
    const {showLoading, hideLoading} = useLoading();
    const exerciseService = ExerciseService.getInstance();
    const {showRecordStart, showRecordEnd} = getShowRecordStartAndEndTime(setting.exercise.showRecordsListPeriod);
    const refreshRecord = async ()=>{
        const [success, items, err] = await exerciseService.getDailyExercises(
            [RecordType.RecordTypeAbdominal, RecordType.RecordTypeRun, RecordType.RecordTypeSitUpPushUp],
            showRecordStart, showRecordEnd, 'asc');
        if(!success){
            Alert.alert('失败', err);
            return;
        }
        setRecords(items);
    };

    useEffect(()=>{
        refreshRecord();
    }, []);

    useLayoutEffect(() => {
        refreshRecord();
    }, []);

    useFocusEffect(()=>{
        refreshRecord();
    });

    const handleDelete = (record) => {
        Alert.alert('确认删除', '确定要删除这个记录吗？', [
            { text: '取消', style: 'cancel' },
            {
                text: '删除',
                style: 'destructive',
                onPress: async () => {
                    showLoading('删除中');
                    const[success, err] = await exerciseService.deleteRecord(record);
                    hideLoading();
                    if(!success){
                        Alert.alert('失败', err);
                        return;
                    }
                    showToast({message:'删除成功'});
                    await refreshRecord();
                },
            },
        ]);
    };

    const getBadgeStatus = (records:RecordModel[]) => {
        const valueSet = new Set(records.map(item => item.type));
        return [RecordType.RecordTypeAbdominal, RecordType.RecordTypeRun, RecordType.RecordTypeSitUpPushUp].every(val => valueSet.has(val)) ? 'success' : 'normal';
    };

    const handleExerciseClick = (exercise) => {
        if(exercise.type === 2){
            navigation.navigate('RecordDetailRunTracker', {id: exercise.id})
        }
    };

    const toggleMenu = () => {
        const toValue = isMenuVisible ? -250 : 0;
        const opacityValue = isMenuVisible ? 0 : 0.5;

        setMenuVisible(!isMenuVisible);
        Animated.spring(menuAnimation, {
            toValue,
            useNativeDriver: true,
        }).start();

        Animated.timing(opacityAnimation, {
            toValue: opacityValue,
            duration: 300,
            useNativeDriver: true,
        }).start();
    };

    const closeMenu = () => {
        toggleMenu();
    };

    const changeDisplayType = (type:string) => {
        setShowType(type);
        toggleMenu();
    };

    return (
        <View style={styles.container}>
            {/* Menu Button */}
            {!isMenuVisible && (
                <TouchableOpacity style={styles.menuButton} onPress={toggleMenu}>
                    <Text style={styles.menuButtonText}>☰</Text>
                </TouchableOpacity>
            )}

            {/* Mask to cover content when menu is open */}
            {isMenuVisible && (
                <TouchableWithoutFeedback onPress={closeMenu}>
                    <Animated.View style={[styles.overlay, { opacity: opacityAnimation }]}>
                        {/* This overlay is clickable to close the menu */}
                    </Animated.View>
                </TouchableWithoutFeedback>
            )}

            {/* Side Menu */}
            <Animated.View style={[styles.sideMenu, { transform: [{ translateX: menuAnimation }] }]}>
                <TouchableOpacity onPress={()=>changeDisplayType('list')}>
                <View style={styles.menuItem}>
                    <Text style={styles.menuItemText}>列表模式</Text>
                </View>
                </TouchableOpacity>
                <TouchableOpacity onPress={()=>changeDisplayType('calendar')}>
                <View style={styles.menuItem}>
                    <Text style={styles.menuItemText}>日历模式</Text>
                </View>
                </TouchableOpacity>
            </Animated.View>

            {/* Content Area */}
            {showType === 'list' &&
            <ScrollView style={styles.contentArea}>
                {records.map((record:DailyExercise, index) => {
                    const badgeStatus = getBadgeStatus(record.exercises);

                    return (
                        <View key={index} style={styles.recordCard}>
                            <View style={styles.recordHeader}>
                                <Text style={{...styles.dateText,width:250}}>{record.date}</Text>
                                <View style={[styles.badge, badgeStatus === 'success' ? styles.successBadge : styles.normalBadge]}>
                                    <Text style={styles.badgeText}>{badgeStatus === 'success' ? '✓' : record.exercises.length}</Text>
                                </View>
                            </View>

                            {record.exercises.map((exercise, idx) => {
                                const startAt = parse(exercise.startAt, 'yyyy-MM-dd HH:mm:ss', new Date());
                                const endAt = parse(exercise.endAt, 'yyyy-MM-dd HH:mm:ss', new Date());

                                if(exercise.type === RecordType.RecordTypeRun && exercise.run.runningWithoutPosition === 1){
                                    exercise.run.distance = 8.15;
                                    const [hours, minutes, seconds] = exercise.run.runDuration.split(':').map(Number);
                                    const totalHours = hours + minutes / 60 + seconds / 3600; // 转换为小时
                                    exercise.run.avgPace = exercise.run.distance / totalHours;
                                }
                                return(
                                <TouchableOpacity
                                    key={idx}
                                    style={styles.exerciseCard}
                                    onPress={()=>handleExerciseClick(exercise)} // Navigate to the details page on click
                                    onLongPress={()=>handleDelete(exercise)}
                                >
                                    <View style={{...styles.iconContainer}}>
                                        {exercise.type === RecordType.RecordTypeAbdominal && <Text><Image source={require('../../assets/images/abdominal.png')} width={40} height={40} /></Text>}
                                        {exercise.type === RecordType.RecordTypeRun && <Text><Image source={require('../../assets/images/run_tracker.png')} width={40} height={40} /></Text>}
                                        {exercise.type === RecordType.RecordTypeSitUpPushUp && <Text style={{position:'relative', top:-12}}><Image source={require('../../assets/images/sit-up.png')} width={40} height={40} /></Text>}
                                    </View>
                                    <View style={styles.detailsContainer}>
                                        {exercise.type === RecordType.RecordTypeAbdominal &&
                                            <Text style={styles.exerciseText}>{`${format(startAt, 'HH:mm:ss')}~${format(endAt, 'HH:mm:ss')} / ${((endAt.getTime()-startAt.getTime())/1000/60).toFixed(2)}min`}
                                                {exercise.tsr === 1 && <Text onPress={()=>{navigation.navigate('TSRVerify' as any, {type:'exercise', exercise:exercise} as any)}}>{exercise.tsrVerified === 1 ? '✅' : '❌'}</Text>}
                                            </Text>
                                        }
                                        {exercise.type === RecordType.RecordTypeRun &&
                                            <Text style={styles.exerciseText}>{`${format(startAt, 'HH:mm:ss')}~${format(endAt, 'HH:mm:ss')} | 配速: ${exercise.run.avgPace.toFixed(2)}km/h | 耗时: ${exercise.run.runDuration} | 距离: ${exercise.run.distance.toFixed(2)}km ${exercise.run.runningWithoutPosition === 1 ? '| 仅计时' : '| 定位'}`}
                                                {exercise.tsr === 1 && <Text onPress={()=>{navigation.navigate('TSRVerify' as any, {type:'exercise', exercise:exercise} as any)}}>{exercise.tsrVerified === 1 ? '✅' : '❌'}</Text>}
                                            </Text>
                                        }
                                        {exercise.type === RecordType.RecordTypeSitUpPushUp &&
                                            <Text style={styles.exerciseText}>{`${format(startAt, 'HH:mm:ss')}~${format(endAt, 'HH:mm:ss')} / ${((endAt.getTime() - startAt.getTime()) / 1000 / 60).toFixed(2)}min | 俯卧撑: ${exercise.sitUpPushUp.pushUp} | 仰卧起坐: ${exercise.sitUpPushUp.sitUp} | 曲腿卷腹: ${exercise.sitUpPushUp.curlUp} | 靠墙倒立: ${exercise.sitUpPushUp.legsUpTheWallPose}`}
                                                {exercise.tsr === 1 && <Text onPress={()=>{navigation.navigate('TSRVerify' as any, {type:'exercise', exercise:exercise} as any)}}>{exercise.tsrVerified === 1 ? '✅' : '❌'}</Text>}
                                            </Text>
                                        }
                                    </View>
                                </TouchableOpacity>
                            )})}
                        </View>
                    );
                })}
            </ScrollView>
            }
            {showType === 'calendar' &&
                <Calendar records={records}></Calendar>
            }
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 16,
        backgroundColor: '#F8F8F8',
        position: 'relative',
    },
    menuButton: {
        position: 'absolute',
        top: 3,
        left: 3,
        zIndex: 999,
        backgroundColor: 'gray',
        padding: 8,
        borderRadius: 50,
    },
    menuButtonText: {
        fontSize: 15,
        color: '#fff',
    },
    sideMenu: {
        position: 'absolute',
        top: 0,
        left: 0,
        bottom: 0,
        width: 200,
        backgroundColor: 'rgba(0, 0, 0, 0.6)', // Semi-transparent menu background
        paddingTop: 60,
        borderRightWidth: 1,
        borderColor: '#E0E0E0',
        shadowColor: '#000',
        shadowOffset: { width: -3, height: 0 },
        shadowOpacity: 0.15,
        shadowRadius: 10,
        elevation: 3,
        zIndex: 9999, // Ensure menu is above content
        marginTop: 50,
        marginLeft: 10,
        borderTopLeftRadius: 15,
        borderBottomLeftRadius: 15,
    },
    menuItem: {
        padding: 12,
        borderBottomWidth: 1,
        borderColor: '#E0E0E0',
    },
    menuItemText: {
        fontSize: 18,
        color: '#fff',
    },
    overlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        bottom: 0,
        right: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.3)',
        zIndex: 9998,
    },
    contentArea: {
        marginLeft: 0,
        flex: 1,
    },
    recordCard: {
        marginBottom: 12,
        backgroundColor: '#ffffff',
        borderRadius: 12,
        padding: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 3,
        borderWidth: 1,
        borderColor: '#E0E0E0',
    },
    recordHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    dateText: {
        fontSize: 18,
        fontWeight: '600',
        color: '#333',
    },
    badge: {
        width: 24,
        height: 24,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    normalBadge: {
        backgroundColor: '#FFB74D',
    },
    successBadge: {
        backgroundColor: '#4CAF50',
    },
    badgeText: {
        color: 'white',
        fontSize: 12,
        fontWeight: '500',
    },
    exerciseCard: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
        backgroundColor: '#F9F9F9',
        borderRadius: 10,
        padding: 8,
        shadowColor: '#ddd',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 6,
        elevation: 2,
    },
    iconContainer: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 10,
    },
    detailsContainer: {
        flex: 1,
        justifyContent: 'center',
    },
    exerciseText: {
        fontSize: 14,
        color: '#555',
        lineHeight: 18,
    },
});

export default RecordStack;
