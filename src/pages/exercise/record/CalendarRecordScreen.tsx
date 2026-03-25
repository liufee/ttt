import {Alert, Image, StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import {Calendar} from 'react-native-calendars';
import React, {useState} from 'react';
import {format, parse} from 'date-fns';
import {useNavigation} from '@react-navigation/native';
import {Record as RecordModel, RecordType} from '../../../services/exercise/model';
import ExerciseService from '../../../services/exercise';

interface RecordsByDate{
    date:string,
    exercises: RecordModel[],
}

const CalendarDispay = ({records}:{records:RecordsByDate[]}) => {
    const [selectedDate, setSelectedDate] = useState<RecordsByDate|null>(null);
    const navigation = useNavigation();

    const exerciseService = ExerciseService.getInstance();

    const getMarkedDates = () => {
        let markedDates = {};
        for(let i in records){
            let types = [];
            for(let j in records[i].exercises){
                types.push(records[i].exercises[j].type);
            }
            const valueSet = new Set(types);
            if( [RecordType.RecordTypeAbdominal, RecordType.RecordTypeRun, RecordType.RecordTypeSitUpPushUp].every(val => valueSet.has(val)) ){
                markedDates[records[i].date] = {
                    customStyles: {
                        container: {
                            backgroundColor: '#4CAF50',
                            borderRadius: 5,
                            justifyContent: 'center',
                            alignItems: 'center',
                        },
                        text: { color: 'white', fontWeight: 'bold' },
                    },
                };
            }else {
                markedDates[records[i].date] = {
                    customStyles: {
                        container: {
                            backgroundColor: '#FFB74D',
                            borderRadius: 5,
                            justifyContent: 'center',
                            alignItems: 'center',
                        },
                        text: { color: 'white', fontWeight: 'bold' },
                    },
                };
            }
        }
        return markedDates;
    };
    const handleDayPress = (day) => {
        const selectedDay = records.find(item => item.date === day.dateString);
        setSelectedDate(selectedDay || null);
    };
    const handleExerciseClick = (exercise) => {
        if(exercise.type === RecordType.RecordTypeRun){
            navigation.navigate('RecordDetailRunTracker' as any, {id: exercise.id} as any)
        }
    };
    const handleDelete = (record) => {
        Alert.alert('确认删除', '确定要删除这个记录吗？', [
            { text: '取消', style: 'cancel' },
            {
                text: '删除',
                style: 'destructive',
                onPress: async () => {
                    const[success, err] = await exerciseService.deleteRecord(record);
                    if(!success){
                        Alert.alert('失败', err);
                        return;
                    }
                },
            },
        ]);
    };
    return(
        <View style={styles.container}>
            <View style={styles.content}>
                <View style={ {flexDirection: 'row', alignItems: 'center'}}>
                    <View style={{backgroundColor: '#4CAF50',width: 20,height: 20,justifyContent: 'center',alignItems: 'center',borderRadius: 3}}></View>
                    <Text style={{color: 'black', fontSize: 13, fontWeight: 'bold',}}> 当天所有运动已完成 </Text>
                </View>
                <View style={{flexDirection: 'row', alignItems: 'center', marginTop:10}}>
                    <View style={{backgroundColor: '#FFB74D',width: 20,height: 20,justifyContent: 'center',alignItems: 'center',borderRadius: 3}}></View>
                    <Text style={{color: 'black', fontSize: 13, fontWeight: 'bold',}}> 当天部分运动完成 </Text>
                </View>
                <Calendar
                    current={new Date().toISOString().split('T')[0]} // 当前日期
                    markedDates={getMarkedDates()} // 标记锻炼过的日期
                    onDayPress={handleDayPress}
                    markingType={'custom'}
                    monthFormat={'yyyy年MM月'}
                    theme={{
                        selectedDayBackgroundColor: '#4CAF50',
                        todayTextColor: '#00adf5',
                    }}
                />
                {selectedDate && (
                    <View style={styles.selectedDateContainer}>
                        <Text style={styles.selectedDateText}>
                            <View style={{width:'100%'}}><Text>{selectedDate.date}</Text></View>
                            {selectedDate.exercises.map((exercise, idx) => {
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
                                            {exercise.type === RecordType.RecordTypeAbdominal && <Text><Image source={require('../../../assets/images/abdominal.png')} width={40} height={40} /></Text>}
                                            {exercise.type === RecordType.RecordTypeRun && <Text><Image source={require('../../../assets/images/run_tracker.png')} width={40} height={40} /></Text>}
                                            {exercise.type === RecordType.RecordTypeSitUpPushUp && <Text style={{position:'relative', top:-12}}><Image source={require('../../../assets/images/sit-up.png')} width={40} height={40} /></Text>}
                                        </View>
                                        <View style={styles.detailsContainer}>
                                            {exercise.type === RecordType.RecordTypeAbdominal &&
                                                <Text style={styles.exerciseText}>{`${format(startAt, 'HH:mm:ss')}~${format(endAt, 'HH:mm:ss')} / ${((endAt.getTime()-startAt.getTime())/1000/60).toFixed(2)}min`}</Text>
                                            }
                                            {exercise.type === RecordType.RecordTypeRun &&
                                                <Text style={styles.exerciseText}>{`${format(startAt, 'HH:mm:ss')}~${format(endAt, 'HH:mm:ss')} | 配速: ${exercise.run.avgPace.toFixed(2)}km/h | 耗时: ${exercise.run.runDuration} | 距离: ${exercise.run.distance.toFixed(2)}km ${exercise.run.runningWithoutPosition === 1 ? '| 仅计时' : '| 定位'}`}</Text>
                                            }
                                            {exercise.type === RecordType.RecordTypeSitUpPushUp &&
                                                <Text style={styles.exerciseText}>{`${format(startAt, 'HH:mm:ss')}~${format(endAt, 'HH:mm:ss')} / ${((endAt.getTime() - startAt.getTime()) / 1000 / 60).toFixed(2)}min | 俯卧撑: ${exercise.sitUpPushUp.pushUp} | 仰卧起坐: ${exercise.sitUpPushUp.sitUp} | 曲腿卷腹: ${exercise.sitUpPushUp.curlUp} | 靠墙倒立: ${exercise.sitUpPushUp.legsUpTheWallPose}`}</Text>
                                            }
                                        </View>
                                    </TouchableOpacity>
                                )})}
                        </Text>
                    </View>
                )}
            </View>
        </View>
    );
};
export default CalendarDispay

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    content: {
        backgroundColor: '#fff',
        padding: 20,
        borderRadius: 10,
        width: '100%',
    },
    title: {
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 10,
    },
    modalText: {
        fontSize: 16,
        color: '#333',
        marginBottom: 10,
    },
    modalButton: {
        backgroundColor: '#FF5722',
        padding: 10,
        borderRadius: 5,
        alignItems: 'center',
    },
    modalButtonText: {
        color: '#fff',
        fontSize: 16,
    },
    selectedDateContainer: {
        marginTop: 20,
    },
    selectedDateText: {
        fontSize: 16,
        color: '#333',
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
