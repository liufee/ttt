import React, {useEffect, useMemo, useState} from 'react';
import {
    FlatList,
    Modal,
    RefreshControl,
    StyleSheet,
    Text,
    ScrollView,
    TouchableOpacity,
    TouchableWithoutFeedback,
    View,
} from 'react-native';
import DatePicker from 'react-native-date-picker';
import BabyEventItem from './components/BabyEventItem';
import EventStatCard from './components/EventStatCard';
import {format} from 'date-fns';
import ChildrenService from '../../services/children';
import {childrenList, EventType, newBornEvents, Event} from '../../services/children/model';
import {useToast} from '../../provider/toast';

const TIME_OPTIONS = {
    'day': '📅 今天',
    'yesterday':'🕐 昨天',
    'dayBeforeYesterday':'🕑 前天',
    'threeDaysAgo':'🕒 大前天',
    'week':'📆 本周',
    'month':'🗓️ 本月',
    'custom':'🎯 自定义范围',
};

const EventTypes = {
    [EventType.Eat]: { icon: '🍼', color: '#FF9F43', bg: '#FFF5EB' },
    [EventType.Poop]: { icon: '💩', color: '#FF6B6B', bg: '#FFF0F0' },
    [EventType.Pee]: { icon: '💧', color: '#54A0FF', bg: '#EBF5FF' },
    [EventType.Sleep]: { icon: '😴', color: '#5F27CD', bg: '#F3EBFF' },
    [EventType.Cry]: { icon: '😢', color: '#FF9FF3', bg: '#FFF0FB' },
};

// ========== 自定义下拉选择器 ==========
function CustomPicker({ options, selectedValue, onValueChange, placeholder = '请选择' }) {
    const [modalVisible, setModalVisible] = useState(false);
    const selectedLabel = options[selectedValue] || placeholder;

    return (
        <>
            <TouchableOpacity style={styles.pickerButton} onPress={() => setModalVisible(true)}>
                <Text style={styles.pickerButtonText} ellipsizeMode="tail">{selectedLabel}</Text>
                <Text style={styles.pickerArrow}>▾</Text>
            </TouchableOpacity>

            <Modal visible={modalVisible} transparent animationType="fade" onRequestClose={() => setModalVisible(false)}>
                <TouchableWithoutFeedback onPress={() => setModalVisible(false)}>
                    <View style={styles.modalOverlay}>
                        <TouchableWithoutFeedback>
                            <View style={styles.modalContent}>
                                <Text style={styles.modalTitle}>选择</Text>

                                {Object.entries(options).map(([key, value]) => (
                                    <TouchableOpacity
                                        key={key}
                                        style={[
                                            styles.modalOption,
                                            selectedValue === key && styles.modalOptionSelected // 判断 key 是否选中
                                        ]}
                                        onPress={() => {
                                            onValueChange(key);
                                            setModalVisible(false);
                                        }}
                                    >
                                        <Text style={[
                                            styles.modalOptionText,
                                            selectedValue === key && styles.modalOptionTextSelected
                                        ]}>
                                            {value}
                                        </Text>

                                        {selectedValue === key && <Text style={styles.checkmark}>✓</Text>}
                                    </TouchableOpacity>
                                ))}
                                <TouchableOpacity style={styles.modalCancel} onPress={() => setModalVisible(false)}>
                                    <Text style={styles.modalCancelText}>取消</Text>
                                </TouchableOpacity>
                            </View>
                        </TouchableWithoutFeedback>
                    </View>
                </TouchableWithoutFeedback>
            </Modal>
        </>
    );
}

// ========== 日期输入组件 ==========
function DateInput({ label, value, onChange }) {
    const [open, setOpen] = useState(false);

    return (
        <>
            <TouchableOpacity style={styles.dateInput} onPress={() => setOpen(true)}>
                <Text style={styles.dateInputLabel}>{label}</Text>
                <Text style={styles.dateInputValue}>{format(value, 'yyyy-MM-dd')}</Text>
            </TouchableOpacity>
            <DatePicker
                modal open={open} date={value} mode="date" locale="zh" is24hourSource="locale"
                onConfirm={(date) => { setOpen(false); onChange(date); }}
                onCancel={() => setOpen(false)}
                confirmText="确定" cancelText="取消"
            />
        </>
    );
}

// ========== 主页面 ==========
export default function BabyEventStatsScreen() {
    const [events, setEvents] = useState([]);
    const [selectedChild, setSelectedChild] = useState('son');
    const [filterType, setFilterType] = useState('yesterday');
    const [filterStartDate, setFilterStartDate] = useState(() => { const d = new Date(); d.setDate(d.getDate() - 7); return d; });
    const [filterEndDate, setFilterEndDate] = useState(new Date());
    const [refreshing, setRefreshing] = useState(false);
    const [selectedEventTypes, setSelectedEventTypes] = useState(
        Object.keys(newBornEvents)
    );

    const {showToast} = useToast();

    const childrenService = ChildrenService.getInstance();

    const loadEvents = async () => {
        const { start, end } = computeRangeByFilter();

        const [success, items, err] = await childrenService.getEvents([selectedChild],[EventType.Eat, EventType.Poop, EventType.Pee, EventType.Sleep, EventType.Cry], start, end, 'created_at','DESC',  -1);
        if(!success) {
            showToast({message:'获取 events 错误:' + err, backgroundColor:'red'});
            return;
        }
        setEvents(items);
    };

    const computeRangeByFilter = () => {
        const now = new Date();
        let start = new Date();
        let end = new Date();

        if (filterType === 'day') {
            start = new Date(now.setHours(0,0,0,0));
            end = new Date();
        }
        else if (filterType === 'yesterday') {
            start = new Date();
            start.setDate(start.getDate() - 1);
            start.setHours(0,0,0,0);
            end = new Date(start);
            end.setHours(23,59,59,999);
        }
        else if (filterType === 'dayBeforeYesterday') {
            start = new Date();
            start.setDate(start.getDate() - 2);
            start.setHours(0,0,0,0);
            end = new Date(start);
            end.setHours(23,59,59,999);
        }
        else if (filterType === 'threeDaysAgo') {
            start = new Date();
            start.setDate(start.getDate() - 3);
            start.setHours(0,0,0,0);
            end = new Date(start);
            end.setHours(23,59,59,999);
        }
        else if (filterType === 'week') {
            start = new Date();
            start.setDate(start.getDate() - 7);
            start.setHours(0,0,0,0);
            end = new Date();
        }
        else if (filterType === 'month') {
            start = new Date();
            start.setMonth(start.getMonth() - 1);
            start.setHours(0,0,0,0);
            end = new Date();
        }
        else if (filterType === 'custom') {
            start = filterStartDate;
            end = filterEndDate;
        }

        return { start, end };
    };

    useEffect(() => { loadEvents(); }, [selectedChild, filterType, filterStartDate, filterEndDate]);

    const onRefresh = async() => {
        setRefreshing(true);
        await loadEvents();
        setRefreshing(false);
    };

    const getDaysDiff = (start, end) => {
        const s = new Date(start); s.setHours(0,0,0,0);
        const e = new Date(end); e.setHours(0,0,0,0);
        const diff = Math.ceil((e - s) / (1000 * 60 * 60 * 24)) + 1;
        return Math.max(1, diff);
    };

    const days = useMemo(() => {
        const now = new Date();
        if (filterType === 'custom') {
            return getDaysDiff(filterStartDate, filterEndDate);
        }
        if (['day','yesterday','dayBeforeYesterday','threeDaysAgo'].includes(filterType)) {
            return 1;
        }
        if (filterType === 'week') return 7;
        if (filterType === 'month') {
            return new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
        }
        return 1;
    }, [filterType, filterStartDate, filterEndDate]);

    const setQuickRange = (days) => {
        const end = new Date();
        const start = new Date();
        start.setDate(end.getDate() - days);
        setFilterStartDate(start);
        setFilterEndDate(end);
        setFilterType('custom');
    };

    const filteredEvents = useMemo(() => {
        return events.filter(e =>
            selectedEventTypes.includes(e.eventType)
        );
    }, [events, selectedEventTypes]);

    const eventsByType:{EventType:Event} = {};
    events.forEach(e => {
        if (!eventsByType[e.eventType]) eventsByType[e.eventType] = [];
        eventsByType[e.eventType].push(e);
    });

    return (
        <View style={styles.container}>
            {/* 孩子选择 */}
            <View style={styles.filterSection}>
                <View style={styles.filterRow}>
                    <Text style={styles.filterLabel}>👶 孩子 </Text>
                    <CustomPicker options={childrenList} selectedValue={selectedChild} onValueChange={setSelectedChild} />
                </View>
            </View>

            {/* 时间范围选择 */}
            <View style={styles.filterSection}>
                <View style={styles.filterRow}>
                    <Text style={styles.filterLabel}>🕐 时间范围 </Text>
                    <CustomPicker options={TIME_OPTIONS} selectedValue={filterType} onValueChange={setFilterType} />
                </View>
            </View>

            {/* 自定义范围 + 快捷按钮 */}
            {filterType === 'custom' && (
                <View style={styles.customSection}>
                    <View style={styles.dateRow}>
                        <DateInput label="开始: " value={filterStartDate} onChange={setFilterStartDate} />
                        <DateInput label="结束: " value={filterEndDate} onChange={setFilterEndDate} />
                    </View>
                    <View style={styles.quickRange}>
                        <TouchableOpacity style={styles.quickBtn} onPress={() => setQuickRange(1)}><Text style={styles.quickBtnText}>1 天 </Text></TouchableOpacity>
                        <TouchableOpacity style={styles.quickBtn} onPress={() => setQuickRange(7)}><Text style={styles.quickBtnText}>7 天 </Text></TouchableOpacity>
                        <TouchableOpacity style={styles.quickBtn} onPress={() => setQuickRange(30)}><Text style={styles.quickBtnText}>30 天 </Text></TouchableOpacity>
                    </View>
                </View>
            )}

            {/* 统计摘要 */}
            <View style={styles.statsSection}>
                <Text style={styles.sectionTitle}>📈 统计摘要</Text>
                {Object.keys(eventsByType).length === 0 ? (
                    <View style={styles.emptyStat}>
                        <Text style={styles.emptyStatText}>暂无数据</Text>
                    </View>
                ) : (
                    <View style={styles.statsGrid}>
                        {Object.entries(newBornEvents).map(([eventType, eventAlias]) => {
                            const eventList = eventsByType[eventType] || [];

                            return (
                                <EventStatCard key={eventType} eventType={eventType} eventAlias={eventAlias} events={eventList} days={days}/>
                            );
                        })}
                    </View>
                )}
            </View>

            {/* 记录数量提示 */}
            <View style={styles.detailHeaderRow}>
                <Text style={styles.countLabel}>📋 详细记录 ({filteredEvents.length})  </Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipContainer}>
                    {Object.entries(newBornEvents).map(([key, label]) => {
                        const active = selectedEventTypes.includes(key);
                        return (
                            <TouchableOpacity key={key} style={[styles.chip, active && {backgroundColor: EventTypes[key]?.bg || '#eee'}]}
                                onPress={() => {
                                    if (active) {
                                        setSelectedEventTypes(selectedEventTypes.filter(v => v !== key));
                                    } else {
                                        setSelectedEventTypes([...selectedEventTypes, key]);
                                    }
                                }}
                            >
                                <Text style={[styles.chipText, active && {color: EventTypes[key]?.color || '#333'}]}>
                                    {label}
                                </Text>
                            </TouchableOpacity>
                        );
                    })}
                </ScrollView>
            </View>
            {/* 详细记录列表 */}
            {filteredEvents.length === 0 ? (
                <View style={styles.emptyState}>
                    <Text style={styles.emptyIcon}>📭</Text>
                    <Text style={styles.emptyText}>暂无记录</Text>
                    <Text style={styles.emptySubtext}>该时间范围内还没有数据</Text>
                </View>
            ) : (
                <FlatList
                    data={filteredEvents}
                    extraData={filteredEvents}
                    keyExtractor={(item, index) => `${item.startTime + index}`}
                    renderItem={({ item, index }) => <BabyEventItem event={item} isLast={index === filteredEvents.length - 1} onDeleted={loadEvents}/>}
                    contentContainerStyle={styles.logList}
                    showsVerticalScrollIndicator={false}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#007AFF" />
                    }
                />
            )}
        </View>
    );
}

// ========== 样式（移除 LogItem 相关样式）==========
const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F8F9FA' },

    // 筛选区域
    filterSection: {
        padding: 16, backgroundColor: '#fff',
        borderBottomWidth: 1, borderBottomColor: '#F0F0F0',
    },
    filterRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    filterLabel: { fontSize: 13, color: '#888' },

    // 自定义 Picker
    pickerButton: {
        flex: 1,
        marginLeft: 12,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderWidth: 1,
        borderColor: '#E0E0E0',
        borderRadius: 8,
        backgroundColor: '#FAFAFA',
    },
    pickerButtonText: { fontSize: 13,
        color: '#333',
        flex: 1,
        flexShrink: 1,
    },
    pickerArrow: { fontSize: 11, color: '#999', marginLeft: 6 },

    // Modal
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'center', alignItems: 'center' },
    modalContent: {
        width: '85%', backgroundColor: '#fff', borderRadius: 12,
        padding: 4, overflow: 'hidden',
    },
    modalTitle: {
        fontSize: 15, fontWeight: '500', color: '#333', textAlign: 'center',
        padding: 14, borderBottomWidth: 1, borderBottomColor: '#F0F0F0',
    },
    modalOption: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        paddingVertical: 12, paddingHorizontal: 16,
    },
    modalOptionSelected: { backgroundColor: '#F8F9FA' },
    modalOptionText: { fontSize: 14, color: '#333', flex: 1, flexShrink: 1 },
    modalOptionTextSelected: { color: '#007AFF', fontWeight: '500' },
    checkmark: { color: '#007AFF', fontWeight: 'bold' },
    modalCancel: {
        padding: 14, borderTopWidth: 1, borderTopColor: '#F0F0F0', alignItems: 'center',
    },
    modalCancelText: { color: '#666', fontSize: 14 },

    // 日期输入
    customSection: { padding: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
    dateRow: { flexDirection: 'row', gap: 12 },
    dateInput: {
        flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingVertical: 10, paddingHorizontal: 14,
        borderWidth: 1, borderColor: '#E0E0E0', borderRadius: 8, backgroundColor: '#FAFAFA',
    },
    dateInputLabel: { color: '#888', fontSize: 13 },
    dateInputValue: { color: '#333', fontSize: 12, marginRight: 60, width: 90, textAlign: 'center', fontWeight: '500', },

    // 快捷按钮
    quickRange: { flexDirection: 'row', gap: 8, marginTop: 12 },
    quickBtn: {
        paddingVertical: 6, paddingHorizontal: 14,
        backgroundColor: '#F0F0F0', borderRadius: 16,
    },
    quickBtnText: { color: '#666', fontSize: 12 },

    // 统计区域
    statsSection: {
        padding: 16, backgroundColor: '#fff',
        borderBottomWidth: 1, borderBottomColor: '#F0F0F0',
    },
    sectionTitle: {
        fontSize: 14, fontWeight: '500', color: '#666',
        marginBottom: 12,
    },
    emptyStat: {
        padding: 20, alignItems: 'center',
        borderWidth: 1, borderColor: '#F0F0F0',
        borderRadius: 8, borderStyle: 'dashed',
    },
    emptyStatText: { color: '#999', fontSize: 13 },

    // 统计卡片网格 - 一行 5 个
    statsGrid: {
        flexDirection: 'row', flexWrap: 'nowrap', gap: 6
    },
    statCard: {
        flex: 1, minWidth: 55,
        paddingVertical: 8, paddingHorizontal: 4,
        borderRadius: 8,
        alignItems: 'center',
        borderWidth: 1, borderColor: 'transparent',
    },
    detailHeaderRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingTop: 16,
        paddingBottom: 8,
    },
    countLabel: {fontSize: 13, fontWeight: '500', color: '#666', backgroundColor: '#F8F9FA'},
    chipContainer: {
        flexDirection: 'row',
        marginLeft: 10,
    },
    chip: {
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 16,
        backgroundColor: '#EDEDED',
        marginRight: 8,
    },
    chipText: {
        fontSize: 12,
        color: '#555',
    },

    // 空状态
    emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
    emptyIcon: { fontSize: 48, marginBottom: 16 },
    emptyText: { fontSize: 15, color: '#666', fontWeight: '500' },
    emptySubtext: { fontSize: 12, color: '#AAA', marginTop: 4 },

    // 列表容器
    logList: { padding: 16, paddingTop: 8 },
});
