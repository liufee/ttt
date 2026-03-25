import React, {useEffect, useLayoutEffect, useState} from 'react';
import {Alert, Button, Text, TextInput, View} from 'react-native';
import {addMinutes, format, isValid, parse} from 'date-fns';
import ExerciseService from '../../services/exercise';
import {Record, RecordType, SitUpPushUp, Status} from '../../services/exercise/model';
import {useToast} from '../../provider/toast';
import {useLoading} from '../../provider/loading';

const SitupEntry = () => {
    const now = new Date();
    const initEnd = addMinutes(now, 90);
    const [startTime, setStartTime] = useState(format(now, 'yyyy-MM-dd HH:mm:ss'));
    const [endTime, setEndTime] = useState(format(initEnd, 'yyyy-MM-dd HH:mm:ss'));
    const [situpPushUp, setPushUpSitUp] = useState<SitUpPushUp>({sitUp:520, pushUp:130, curlUp:117, legsUpTheWallPose:3});
    const [existingRecordId, setExistingRecordId] = useState<string>('0');

    const {showToast} = useToast();
    const {showLoading, hideLoading} = useLoading();

    const exerciseService = ExerciseService.getInstance();

    const initTodaySitUpPushUp = async ()=>{
        const [success, records, err] = await exerciseService.getExercisesByPage([RecordType.RecordTypeSitUpPushUp], 1, 1, format(now, 'yyyy-MM-dd') + ' 00:00:00', format(now, 'yyyy-MM-dd HH:mm:ss') + '23:59:59', 'desc');
        if(!success){
            Alert.alert('失败', err);
        }
        if(records.length === 1){
            const record = records[0];
            setExistingRecordId(record.id);
            setStartTime(record.startAt);
            setEndTime(record.endAt);
            setPushUpSitUp({sitUp:record.sitUpPushUp.sitUp, pushUp:record.sitUpPushUp.pushUp, curlUp:record.sitUpPushUp.curlUp, legsUpTheWallPose:record.sitUpPushUp.legsUpTheWallPose});
        }
    };
    useEffect(() => {
        initTodaySitUpPushUp();
    }, []);

    useLayoutEffect(() => {
        initTodaySitUpPushUp();
    }, []);

    const handleSave = async ()=>{
        let parsedDate = parse(startTime, 'yyyy-MM-dd HH:mm:ss', new Date());
        if ( !isValid(parsedDate) ){
            showToast({message: 'start time error: ' + startTime, backgroundColor: 'red'});
            return;
        }
        parsedDate = parse(endTime, 'yyyy-MM-dd HH:mm:ss', new Date());
        if ( !isValid(parsedDate) ){
            showToast({message: 'end time error: ' + endTime, backgroundColor: 'red'});
            return;
        }
        const recordSitUpPushUp:Record = {
            id:'',
            type:RecordType.RecordTypeSitUpPushUp,
            startAt:format(startTime, 'yyyy-MM-dd HH:mm:ss'),
            endAt:format(endTime, 'yyyy-MM-dd HH:mm:ss'),
            status:Status.StatusFinished,
            abdominal:null as any,
            run:null as any,
            sitUpPushUp:situpPushUp,
            tsr:0,
            tsrVerified:0,
        };
        existingRecordId !== '' && existingRecordId !== '0' && (recordSitUpPushUp.id = existingRecordId);
        showLoading('保存中');
        const [success, err ] = (existingRecordId !== '' && existingRecordId !== '0') ? await exerciseService.updateRecord(recordSitUpPushUp) : await exerciseService.saveRecord(recordSitUpPushUp);
        hideLoading();
        if(!success){
            Alert.alert('失败', err);
            return;
        }
        showToast({message: (existingRecordId !== '' && existingRecordId !== '0') ? '修改成功' : '保存成功'});
        await initTodaySitUpPushUp();
    };

    return (
        <View style={{ padding: 20, backgroundColor: '#f8f9fa', flex: 1 }}>
            <Text style={{ fontSize: 20, fontWeight: 'bold', textAlign: 'center', marginBottom: 20, color: '#333' }}>
                {(existingRecordId !== '' && existingRecordId !== '0') ? '修改今日记录' : '录入力量记录'}
            </Text>
            {[
                {label: '开始时间', value: startTime, setter: setStartTime },
                {label: '结束时间', value: endTime, setter: setEndTime },
                {label: '俯卧撑', value: situpPushUp.pushUp, setter: (val)=>{return setPushUpSitUp({ ...situpPushUp, pushUp: val === '' ? 0 : parseInt(val)}); } },
                {label: '仰卧起坐', value: situpPushUp.sitUp, setter: (val)=>{return setPushUpSitUp({ ...situpPushUp, sitUp: val === '' ? 0 : parseInt(val)}); } },
                { label: '曲腿卷腹', value: situpPushUp.curlUp, setter: (val)=>{return setPushUpSitUp({ ...situpPushUp, curlUp: val === '' ? 0 : parseInt(val)}); } },
                { label: '靠墙倒立', value: situpPushUp.legsUpTheWallPose, setter: (val)=>{return setPushUpSitUp({ ...situpPushUp, legsUpTheWallPose: val === '' ? 0 : parseInt(val)}); } },
            ].map((item, index) => (
                <View key={index} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
                    <Text style={{ width: 100, fontSize: 16, color: '#555' }}>{item.label}：</Text>
                    <TextInput
                        style={{ borderWidth: 1, borderColor: '#ddd', padding: 12, borderRadius: 8, flex: 1, backgroundColor: '#fff' }}
                        keyboardType={'numeric'}
                        value={item.value.toString()}
                        onChangeText={item.setter}
                    />
                </View>
            ))}

            <Button title={(existingRecordId !== '' && existingRecordId !== '0') ? '修改记录' : '保存记录'} onPress={handleSave} color='#007bff' />
        </View>
    );
};

export default SitupEntry;
