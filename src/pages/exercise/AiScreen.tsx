import {Alert, Text} from 'react-native';
import React, {useEffect, useState} from 'react';
import Gpt from '../../components/gpt';
import ExerciseService from '../../services/exercise';
import {Record as RecordModel, RecordType} from '../../services/exercise/model';
import {format, parse} from 'date-fns';
import config from '../../config';
import {useSetting} from '../../provider/setting';

const AiScreen = () => {
    const [loading, setLoading] = useState(true);
    const [embeddingVersion, setEmbeddingVersion] = useState('无');
    const exerciseService = ExerciseService.getInstance();
    const {setting} = useSetting();
    const APIKey = config.feehiSecVerify;
    const goServerAPIURL = setting.global.goServerAPIURL;

    const getEmbeddingVersion = async ()=>{
        const res = await fetch(goServerAPIURL + '/version', {
            method: 'POST',
            headers: {
                'x-feehi-sec-verify': APIKey,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                type:'exercise',
                env:__DEV__ ? 'dev' : '',
            }),
        });
        const data = await res.json();
        return data.version;
    };

    const getSummaries = async ()=>{
        const [success, items, err] = await exerciseService.getRecordsByTypes([RecordType.RecordTypeAbdominal, RecordType.RecordTypeRun, RecordType.RecordTypeSitUpPushUp]);
        if(!success){
            Alert.alert('失败', err);
            return;
        }

        const groupedData = items.reduce((acc, record:RecordModel) => {
            const startTime = parse(record.startAt, 'yyyy-MM-dd HH:mm:ss', new Date());
            const date = format(startTime, 'yyyy-MM-dd');
            if (!acc[date]) {
                acc[date] = [];
            }
            acc[date].push(record);
            return acc;
        }, {});

        const records = Object.keys(groupedData).map(date => ({
            date:date,
            exercises: groupedData[date],
        }));

        let summaries = [];
        records.map((record) => {
            let summary = record.date + '进行了' + (new Set(record.exercises.map(item => item.type))).size + '项锻炼。\n';
            record.exercises.map((exercise, idx) => {
                const startTime = parse(exercise.startAt, 'yyyy-MM-dd HH:mm:ss', new Date());
                const endTime = parse(exercise.endAt, 'yyyy-MM-dd HH:mm:ss', new Date());
                summary += format(startTime, 'HH:mm:ss') + '到' + format(endTime, 'HH:mm:ss');
                switch (exercise.type) {
                    case RecordType.RecordTypeAbdominal:
                        summary += '进行了腹肌锻炼;';
                        break;
                    case RecordType.RecordTypeRun:
                        summary += `进行了跑步锻炼，跑了${exercise.run.runningWithoutPosition === 1 ? '8.15' : exercise.run.distance.toFixed(2)}km，${exercise.run.runningWithoutPosition === 1 ? '仅计时，没保存跑步路径' : '保存了跑步路径'};`
                        break;
                    case RecordType.RecordTypeSitUpPushUp:
                        summary += `进行了仰卧锻炼，其中俯卧撑${exercise.sitUpPushUp.pushUp}个，仰卧起坐${exercise.sitUpPushUp.sitUp},个,曲腿卷腹${exercise.sitUpPushUp.curlUp}个，靠墙倒立${exercise.sitUpPushUp.legsUpTheWallPose}个;`;
                        break;
                }
                summary += (exercise.tsr === 1 ? '开了 tsr' : '没有开 tsr') + '\n';
            });
            summary = summary.replace(/(\r?\n)$/, '');
            summaries.push({content:summary, date:record.date + ' 00:00:00', id:record.date});
        });
        return summaries;
    };

    const initEmbeddings = async () => {
        const summaries = await getSummaries();
        const res = await fetch(goServerAPIURL + '/embedding', {
            method: 'POST',
            headers: {
                'x-feehi-sec-verify': APIKey,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                type:'exercise',
                items: summaries,
                remote: true,
                env:__DEV__ ? 'dev' : '',
            }),
        });
        if(!res.ok){
            Alert.alert('失败', 'ok false' + res.status);
            return;
        }
        const version = await getEmbeddingVersion();
        setEmbeddingVersion(version);
    };

    const assemblePrompt = async (query:string) => {

        const res = await fetch(goServerAPIURL + '/query', {
            method: 'POST',
            headers: {
                'x-feehi-sec-verify': APIKey,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                type: 'exercise',
                query: query,
                env: __DEV__ ? 'dev' : '',
            }),
        });
        if (!res.ok) {
            Alert.alert('失败', 'ok false' + res.status);
            return;
        }
        const result = await res.json();
        return result.prompt;
    };

    const getPrompts = async (query:string) => {
        let rangeType = 'latestHalfYear';
        switch (query){
            case '请总结最近七天锻炼情况':
                rangeType = 'latest7Days';
                break;
            case '请总结最近30天锻炼情况':
                rangeType = 'latest30Days';
                break;
            case '请总结最近3个月锻炼情况':
                rangeType = 'latest3Months';
                break;
        }
        const [success, result, err] = await exerciseService.getAiPrompts(rangeType, '', '', [RecordType.RecordTypeAbdominal, RecordType.RecordTypeSitUpPushUp, RecordType.RecordTypeRun]);
        if (!success) {
            Alert.alert('失败', err);
            return;
        }
        return result;
    };


    const commands = [
        { label: '7天情况', text: '请总结最近七天锻炼情况' },
        { label: '30天情况 ', text: '请总结最近30天锻炼情况' },
        { label: '3个月情况 ', text: '请总结最近3个月锻炼情况' },
    ];
    const init = async ()=> {
        const version = await getEmbeddingVersion();
        setEmbeddingVersion(version);
        setLoading(false);
    };
    useEffect(()=>{
        init();
    }, []);

    if(loading){
        return <Text>loading</Text>;
    }
    return <Gpt embeddingVersion={embeddingVersion} initEmbeddings={null} getCurrentPrompt={getPrompts} commands={commands}></Gpt>
};

export default AiScreen;
