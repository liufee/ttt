import Calculate from './calculate';
import {PanResponder, View, TextInput} from 'react-native';
import {useEffect, useRef, useState} from 'react';
import RFNS from 'react-native-fs';
import {APPRuntimePath} from '../../../constant';

const ivfBefore = [
    {'date':'2025-07-08', 'label':'例'}, {'date':'2025-07-09', 'label':'促'}, {'date':'2025-07-13', 'label':'促'}, {'date':'2025-07-16', 'label':'促'}, {'date':'2025-07-18', 'label':'促'}, {'date':'2025-07-19', 'label':'促'}, {'date':'2025-07-21', 'label':'授'}, {'date':'2025-07-27', 'label':'性'}, {'date':'2025-08-01', 'label':'果'},
];

const Pregnancy = ({ route }) =>{
    const [sonEvents, setSonEvents] = useState([]);
    const [daughterEvents, setDaughterEvents] = useState([]);
    const [showType, setShowType] = useState(0);
    const [lmp, setLmp] = useState<Date>(new Date());
    const startX = useRef(0); // 记录起始触摸位置
    const triggered = useRef(false); // 记录是否已经触发

    let showTp = 0;
    const panResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => false, // 不在按下时拦截
            onMoveShouldSetPanResponder: (_, gestureState) => {// 当水平滑动大于垂直滑动，且水平距离超过 10 时触发
                return Math.abs(gestureState.dx) > Math.abs(gestureState.dy) && Math.abs(gestureState.dx) > 10;
            },
            onPanResponderGrant: (_, gestureState) => {
                startX.current = gestureState.x0;
                triggered.current = false;
            },
            onPanResponderRelease: (_, gestureState) => {
                const dx = gestureState.moveX - startX.current;
                if (!triggered.current) {
                    if (dx < -30) {
                        showTp < 3 && showTp++;
                    } else if (dx > 30) {
                        showTp > 0 && showTp--;
                    }
                    setShowType(showTp);
                    triggered.current = true;
                }
            },
        })
    ).current;

    useEffect(()=>{
        load();
    }, []);

    const dir = APPRuntimePath + '/dy/';

    const load = async() => {
        const eventsString = await RFNS.readFile(dir + 'surrogacy.json');
        const events = JSON.parse(eventsString);
        setSonEvents(events['儿子']);
        setDaughterEvents(events['女儿']);
    };

    const isValidDateString = (s) => {
        if (!s) return false;
        const m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
        if (!m) return false;
        const y = Number(m[1]), mo = Number(m[2]), d = Number(m[3]);
        const dt = new Date(y, mo - 1, d);
        return dt.getFullYear() === y && (dt.getMonth() + 1) === mo && dt.getDate() === d;
    };

    return (
            <View {...panResponder.panHandlers} style={{ flex: 1, backgroundColor: '#eee' }}>
                {(showType === 0 || showType === 1 ) && <Calculate lastPeriod="2025-08-24" events={sonEvents} additionalDates={ivfBefore.concat([])} /> }
                {showType === 0 &&  <View
                    style={{
                        height: 1,         // 线的粗细
                        backgroundColor: 'black',
                        width: '100%',     // 线的长度
                        marginVertical: 10,
                    }}
                />}
                {(showType === 0 || showType === 2) && <Calculate lastPeriod="2025-11-03" events={daughterEvents} additionalDates={ivfBefore.concat([])} />}
                {showType === 3 &&
                    <>
                        <TextInput
                            placeholder="输入日期：YYYY-MM-DD"
                            onChangeText={(v)=>{
                                if( isValidDateString(v) ){
                                    const d = new Date(v);
                                    d.setDate(d.getDate() - 18);
                                    setLmp(d);
                                }
                            }}
                            style={{
                                height: 40,
                                borderWidth: 1,
                                borderColor: '#ccc',
                                paddingHorizontal: 10,
                            }}
                        />
                        <Calculate lastPeriod={lmp} events={[]} />
                    </>
                }
            </View>
        );
    };

export default Pregnancy;
