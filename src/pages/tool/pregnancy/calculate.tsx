import React, { useMemo, useState, useRef, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    Dimensions,
    TouchableOpacity,
    Modal,
    Pressable,
    Linking,
} from 'react-native';
import FileViewer from 'react-native-file-viewer';

type EventLink = { text: string; url: string };
type EventItem = { date: string | Date; text: string; links: EventLink[], tag?: string; color?: string;};
type AdditionalDate = { date: string | Date; label: string };
type Props = { lastPeriod: Date | string; events?: EventItem[]; additionalDates?: AdditionalDate[] };

const TOTAL_WEEKS = 40;
const DAYS_PER_WEEK = 7;
const SCREEN_WIDTH = Dimensions.get('window').width;

function getCheckupTip(week: number) {
    if (week === 3) return 'HCG';
    if (week === 4) return 'HCG';
    if (week === 6) return 'B超听胎心';
    if (week === 12) return 'NT检查';
    if (week === 16) return '唐氏筛查';
    if (week === 22) return '大排畸';
    if (week === 24) return '糖耐量，IVF 妈妈更容易出现血糖异常，不可跳过。';
    if (week === 28) return '小排畸';
    return '';
}

function parseDate(v: Date | string) {
    if (v instanceof Date) return isNaN(v.getTime()) ? null : v;
    const parts = v.split(/[-/.]/);
    if (parts.length === 3) {
        const y = parseInt(parts[0], 10);
        const m = parseInt(parts[1], 10);
        const d = parseInt(parts[2], 10);
        const dt = new Date(y, m - 1, d);
        return isNaN(dt.getTime()) ? null : dt;
    }
    const dt = new Date(v);
    return isNaN(dt.getTime()) ? null : dt;
}

function formatMD(d: Date) {
    return `${d.getMonth() + 1}-${d.getDate()}`;
}

function sameDay(a: Date, b: Date) {
    return (
        a.getFullYear() === b.getFullYear() &&
        a.getMonth() === b.getMonth() &&
        a.getDate() === b.getDate()
    );
}

function getPregnancyMonth(days) {
    const weeks = days / 7;
    const months = weeks / 4;
    return Math.round(months);
}

function dayColor(d: Date, today: Date) {
    const today0 = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
    const d0 = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
    if (d0 === today0) return '#FF6347';
    if (d0 < today0) return '#B0E0E6';
    return '#E6E6FA';
}

function holidayDisplay(d: Date){
    const month = d.getMonth() + 1;
    const day = d.getDate();

    if(month === 10 && day === 1) return '国';
    if(month === 10 && day === 6) return '中';
    if(month === 1 && day === 1) return '旦';
    if(month === 2 && day === 17) return '春';
    if(month === 5 && day === 1) return '劳';
    if(month === 6 && day === 19) return '端';
    return '';
}

function displayDate(d: Date) {
    const holiday = holidayDisplay(d);
    if(holiday !== '') return d.getDate() + ' ' + holiday + '   ';
    return formatMD(d) + '   ';
}

function normalizeAdditionalDates(arr?: AdditionalDate[]) {
    return (arr || [])
        .map(a => ({ date: parseDate(a.date), label: a.label }))
        .filter(a => !!a.date)
        .sort((a, b) => a.date!.getTime() - b.date!.getTime()) as { date: Date; label: string }[];
}

export default function PregnancyCalendarAutoScroll({
                                                        lastPeriod,
                                                        events = [],
                                                        additionalDates = [],
                                                    }:Props) {
    const startDate:Date = useMemo(() => parseDate(lastPeriod)!, [lastPeriod]);
    const today = new Date();
    const diffDays = Math.floor((today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    const currentWeek = Math.floor(diffDays / DAYS_PER_WEEK);
    const currentDay = diffDays % DAYS_PER_WEEK;
    const embryoTransferDate = new Date(startDate.getTime() + 18 * 24 * 60 * 60 * 1000);

    const dueDate = new Date(startDate.getTime() + TOTAL_WEEKS * DAYS_PER_WEEK * 24 * 60 * 60 * 1000);
    const remainingDays = Math.max(Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)), 0);
    const progressPercent = Math.min((diffDays / (TOTAL_WEEKS * DAYS_PER_WEEK)) * 100, 100);

    const [modalVisible, setModalVisible] = useState<boolean>(false);
    const [selectedEvent, setSelectedEvent] = useState<EventItem|null>(null);
    const scrollRef = useRef<ScrollView|null>(null);

    const eventMap = useMemo(() => {
        const map = new Map<string, EventItem>();
        events.forEach(e => {
            const d = parseDate(e.date);
            if (d) map.set(d.toDateString(), e);
        });
        return map;
    }, [events]);

    const weeks: { weekNum: number; days: Date[]; checkup?: string }[] = [];
    let cur = new Date(startDate);
    for (let w = 1; w <= TOTAL_WEEKS; w++) {
        const weekDays: Date[] = [];
        for (let i = 0; i < DAYS_PER_WEEK; i++) {
            weekDays.push(new Date(cur));
            cur.setDate(cur.getDate() + 1);
        }
        const checkup = getCheckupTip(w - 1);
        weeks.push({ weekNum: w, days: weekDays, checkup: checkup || undefined });
    }

    const { additionalBefore, additionalAfter } = useMemo(() => {
        const list = normalizeAdditionalDates(additionalDates);
        const endDate = weeks[weeks.length - 1].days[6];
        return {
            additionalBefore: list.filter(d => d.date < startDate),
            additionalAfter: list.filter(d => d.date > endDate),
        };
    }, [additionalDates, startDate]);

    useEffect(() => {
        setTimeout(() => {
            if (scrollRef.current) {
                const scrollY = currentWeek * 34;
                scrollRef.current.scrollTo({ y: scrollY, animated: true });
            }
        }, 100);
    }, []);

    const handleSelectedEvent = (event:EventItem) => {
        setSelectedEvent(event);
        setModalVisible(true);
    };

    const renderAdditionalDay = (d: { date: Date; label: string }) => {
        const event: EventItem|undefined = eventMap.get(d.date.toDateString());
        return (
            <View key={d.date.toISOString()} style={[styles.dayBox, { backgroundColor: dayColor(d.date, today) }]}>
                {event ? (
                    <TouchableOpacity onPress={() => handleSelectedEvent(event!)}>
                        <Text style={[styles.dayText, { color: 'gray' }]}>{d.date.getMonth() + 1}-{d.date.getDate()} {d.label}  </Text>
                    </TouchableOpacity>
                ) : (
                    <Text style={[styles.dayText, { color: 'gray' }]}>{d.date.getMonth() + 1}-{d.date.getDate()} {d.label}  </Text>
                )}
            </View>
        );
    };

    return (
        <View style={{ flex: 1 }}>
            <View style={styles.topCard}>
                <View style={styles.topRow}>
                    <Text style={styles.topText}>
                        已怀孕: <Text style={styles.numberText}>{diffDays}</Text>天
                        (第<Text style={styles.numberText}>{currentWeek}周+{currentDay}</Text>天,
                        第<Text style={styles.numberText}>{getPregnancyMonth(diffDays)}</Text>月,
                        移植<Text style={styles.numberText}>{diffDays - 19}</Text>天){'  '}
                    </Text>
                </View>
                <View style={[styles.topRow, { alignItems: 'center' }]}>
                    <Text style={styles.topText}>
                        预产期：
                        <Text style={styles.numberText}>
                            {dueDate.getFullYear()}-{dueDate.getMonth() + 1}-{dueDate.getDate()}
                        </Text>
                        (进度<Text style={styles.numberText}>{progressPercent.toFixed(1)}%</Text>,
                        剩余<Text style={styles.numberText}>{remainingDays}</Text>天){'  '}
                    </Text>
                </View>
            </View>
            <ScrollView ref={scrollRef} style={{ flex: 1, padding: 12 }}>
                {additionalBefore.length > 0 && (
                    <View style={styles.additionalRow}>
                        <Text style={styles.additionalLabel}>孕前</Text>
                        <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={{ flexDirection: 'row' }}
                        >
                            {additionalBefore.map(renderAdditionalDay)}
                        </ScrollView>
                    </View>
                )}

                {weeks.map(w => (
                    <View key={w.weekNum} style={styles.weekRow}>
                        <Pressable
                            onPress={() =>
                                handleSelectedEvent({date:'', text: descriptionsByWeek[w.weekNum], links:[{ text: '更多详细', url: 'https://huaiyunjisuanqi.bmcx.com/' + w.weekNum + '__huaiyunzhou/' }], color:'', tag:''})
                            }
                        >
                            <Text style={styles.weekLabel}>{w.weekNum} 周</Text>
                        </Pressable>

                        <View style={styles.dayRow}>
                            {w.days.map((d, i) => {
                                const event:EventItem|undefined = eventMap.get(d.toDateString());
                                return (
                                    <View key={i} style={[styles.dayBox, { backgroundColor: dayColor(d, today) }]}>
                                        <Text
                                            style={[
                                                styles.dayText,
                                                embryoTransferDate.toISOString() === d.toISOString() && { color: 'red' },
                                                event
                                                    ? { color: event.color }
                                                    : displayDate(d).indexOf('-') === -1 && { color: 'orange' },
                                            ]}
                                        >
                                            {sameDay(embryoTransferDate, d) ? (
                                                <TouchableOpacity onPress={() => handleSelectedEvent(event!)}>
                                                    <Text style={[styles.dayText, { color: 'red' }]}>{d.getDate()} 移 </Text>
                                                </TouchableOpacity>
                                            ) : event ? (
                                                <TouchableOpacity onPress={() => handleSelectedEvent(event!)}>
                                                    <Text style={[styles.dayText, { color: event.color}]}>{d.getDate()} {event.tag} </Text>
                                                </TouchableOpacity>
                                            ) : (
                                                displayDate(d)
                                            )}
                                        </Text>
                                    </View>
                                );
                            })}
                            {w.checkup && (
                                <TouchableOpacity
                                    style={[styles.dayBox, { backgroundColor: '#CFE8D5', minWidth: 30 }]}
                                    onPress={() => handleSelectedEvent({date:'', text:w.checkup!, links:[], color:'', tag:''})}
                                >
                                    <Text style={[styles.dayText, { fontSize: 14, color: 'green', fontWeight: '700' }]}>
                                        检
                                    </Text>
                                </TouchableOpacity>
                            )}
                        </View>
                    </View>
                ))}

                {additionalAfter.length > 0 && (
                    <View style={styles.additionalRow}>
                        <Text style={styles.additionalLabel}>孕后</Text>
                        <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={{ flexDirection: 'row' }}
                        >
                        <View style={styles.dayRow}>
                            {additionalAfter.map(renderAdditionalDay)}
                        </View>
                        </ScrollView>
                    </View>


                )}
            </ScrollView>

            <Modal visible={modalVisible} transparent animationType="fade">
                <View style={styles.modalBackground}>
                    <View style={styles.modalCard}>
                        <Text style={styles.modalContent}>{selectedEvent?.text} </Text>
                        {selectedEvent?.links.map((l, idx) => (
                            <Text
                                key={idx}
                                style={{ color: 'blue', textDecorationLine: 'underline', marginBottom: 4 }}
                                onPress={() =>
                                    l.url.indexOf('http') === 0 ? Linking.openURL(l.url) : FileViewer.open(l.url)
                                }
                            >
                                {l.text + '   '}
                            </Text>
                        ))}
                        <Pressable style={styles.modalButton} onPress={() => setModalVisible(false)}>
                            <Text style={styles.modalButtonText}>关闭</Text>
                        </Pressable>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    topCard: {
        marginBottom: 12,
        padding: 12,
        borderRadius: 12,
        backgroundColor: '#F0F8FF',
        shadowColor: '#000',
        shadowOpacity: 0.2,
        shadowOffset: { width: 0, height: 1 },
        shadowRadius: 2,
        elevation: 2,
    },
    topRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
    topText: { fontSize: 14, fontWeight: '600' },
    numberText: { fontSize: 16, fontWeight: '900', color: '#f60'},
    progressBackground: { width: '100%', height: 16, borderRadius: 8, backgroundColor: '#D3D3D3', overflow: 'hidden', marginTop: 4, justifyContent: 'center' },
    progressBar: { height: 16, borderRadius: 8, backgroundColor: '#87CEFA', position: 'absolute', left: 0, top: 0 },
    progressText: { textAlign: 'center', fontWeight: '600', color: '#000', zIndex: 1, fontSize: 12 },

    weekRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 3, width: 50},
    weekLabel: { width: 40, fontSize: 14, fontWeight: '600' },
    dayRow: { flexDirection: 'row', flex: 1 },

    dayBox: {
        minWidth: (SCREEN_WIDTH - 100) / 7 - 4,
        height: 28,
        margin: 1.5,
        borderRadius: 6,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 0,
        shadowColor: '#000',
        shadowOpacity: 0.12,
        shadowOffset: { width: 0, height: 1 },
        shadowRadius: 1,
    },
    dayText: { fontSize: 12, fontWeight: '500', textAlign: 'center' },

    modalBackground: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
    modalCard: { width: '80%', padding: 16, borderRadius: 12, backgroundColor: '#fff', alignItems: 'center' },
    modalTitle: { fontSize: 18, fontWeight: '700', marginBottom: -20 },
    modalContent: { fontSize: 16, marginBottom: 12, textAlign: 'center' },
    modalButton: { paddingHorizontal: 20, paddingVertical: 8, borderRadius: 8, backgroundColor: '#87CEFA' },
    modalButtonText: { color: '#fff', fontWeight: '600' },
    additionalRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 6,
    },
    additionalLabel: {
        width: 40,
        fontSize: 13,
        fontWeight: '700',
        color: '#666',
    },
});

const descriptionsByWeek = {
    "1": "受精卵形成，单细胞分裂，准备着床；体长约0.1–0.2mm，体重极微；尚无器官形成。",
    "2": "胚泡着床于子宫内膜，胚胎细胞分化为三胚层；体长约0.2–0.3mm，体重<1g；心脏原基开始形成，神经板开始形成。",
    "3": "胚芽出现，神经管闭合开始，心脏跳动原基形成；体长约2–3mm，体重<1g；初步形成消化管原基。",
    "4":  "胚胎约2–4mm，体重<1g。神经管初步形成，心脏原基开始跳动。四肢芽出现，眼、耳雏形发育。",
    "5":  "胚胎约5mm，体重1–2g。面部雏形明显，口鼻凹初现，主要器官开始分化。轻微动作出现。",
    "6":  "胚胎约1cm，体重2–3g。手指脚趾雏形，心脏四腔原型，脑部分区形成，肝脏开始造血。",
    "7":  "胚胎约1.3cm，体重3–4g。骨骼软骨化开始，耳孔与眼睑雏形明显，肠管入腹腔。",
    "8":  "胚胎约1.6–2.3cm，体重4–7g。面部五官清晰，外生殖器初步形成，肾脏开始滤血，心跳规则。",
    "9":  "胎儿约3cm，体重7–10g。肢体运动出现，牙齿雏芽发育，脑神经初步连接。",
    "10": "胎儿约3–4cm，体重4–7g。主要器官继续完善，手指脚趾清晰，动作协调。",
    "11": "胎儿约4–5cm，体重7–45g。骨骼钙化增强，肠道入腹腔，面部特征清楚。",
    "12": "胎儿约5–6cm，体重14–58g。性器官可分辨，胎动可微感，心脏泵血、肾脏排尿开始。",
    "13": "胎儿约7–7.5cm，体重93g。头发毛发初生，面部表情雏形，肺管道形成。",
    "14": "胎儿约8–14cm，体重约100g。四肢灵活，骨骼继续硬化，眼睛轻微运动。",
    "15": "胎儿约10–12cm，体重120–140g。肌肉发育增强，动作协调，器官功能继续成熟。",
    "16": "胎儿约11–18cm，体重146g。皮肤透明，胎动开始可感，听觉初步发育。",
    "17": "胎儿约13–18cm，体重160–200g。手脚抓握动作明显，脂肪开始累积。",
    "18": "胎儿约14–22cm，体重223g。动作更明显，骨骼与肌肉持续生长。",
    "19": "胎儿约15–23cm，体重240–260g。眉毛睫毛明显，皮肤稍厚，心脏肝脏功能完善。",
    "20": "胎儿约16–26cm，体重331g。胎动明显，呼吸动作练习开始，骨髓造血活跃。",
    "21": "胎儿约18–27cm，体重360–380g。皮肤厚度增加，脂肪储备开始，免疫系统初步发育。",
    "22": "胎儿约19–29cm，体重478g。骨髓造血活跃，外耳成型，体型比例接近出生。",
    "23": "胎儿约20–30cm，体重500–550g。皮肤皱褶明显，呼吸动作有节奏，神经系统发育完善。",
    "24": "胎儿约21–32cm，体重670g。毛发器官继续成熟，生存可能性增加。",
    "25": "胎儿约22–33cm，体重760–780g。骨骼坚硬，脂肪增加，神经系统接近成熟。",
    "26": "胎儿约23–35cm，体重913g。运动协调性提高，肺部毛细管增加，器官进一步成熟。",
    "27": "胎儿约24–37cm，体重1000–1050g。脑部快速发育，睡眠-清醒周期出现，眼睛可张开。",
    "28": "胎儿约25–37.6cm，体重1200–1210g。进入第三孕期，肺部和脑部发育加速，眼睛可能张开。",
    "29": "胎儿约26–39cm，体重1350–1400g。身形比例协调，脂肪增加，动作增强。",
    "30": "胎儿约27–40.5cm，体重1550–1600g。器官成熟度提升，动作更协调。",
    "31": "胎儿约28–41cm，体重1700–1800g。神经系统、肌肉、体温调节完善。",
    "32": "胎儿约29–43cm，体重1950–2000g。脂肪积累明显，免疫系统发育加强。",
    "33": "胎儿约30–44cm，体重2200–2300g。肺部接近成熟，皮肤厚，动作增强。",
    "34": "胎儿约31–45cm，体重2377–2400g。脂肪储备增加，器官功能完善。",
    "35": "胎儿约32–46cm，体重2600–2700g。胎脂覆盖全身，体型丰满。",
    "36": "胎儿约33–47cm，体重2800–2813g。胎位固定，器官几乎成熟，准备出生。",
    "37": "胎儿约34–48cm，体重3000–3028g。足月标准，储备脂肪充分，系统功能完善。",
    "38": "胎儿约35–49cm，体重3200–3236g。器官成熟，皮肤光滑，准备出生。",
    "39": "胎儿约36–50cm，体重3400–3435g。接近出生状态，各系统完善。",
    "40": "胎儿约50–51cm，体重约3.3–3.6kg。器官和神经系统成熟，随时可出生。"
};

