import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Modal, TouchableWithoutFeedback, StyleSheet } from 'react-native';
import {EventType} from '../../../services/children/model';

const DAILY_THRESHOLD_CONFIG = {
    eat: {
        count: {normal: [0, 8], warning: [9, 12], alert: [13, 999] },
        amount: {normal: [0, 100], warning: [101, 200], alert: [201, 999] },
    },
    poop: {
        count: { normal: [0, 5], warning: [6, 8], alert: [9, 999] },
    },
    pee: {
        count: { normal: [0, 10], warning: [11, 15], alert: [16, 999] },
    },
    sleep: {
        count: { normal: [0, 6], warning: [7, 10], alert: [11, 999] },
        duration: { normal: [0, 100], warning: [101, 200], alert: [201, 999] },
    },
    cry: {
        count: { normal: [0, 3], warning: [4, 6], alert: [7, 999] },
        duration: { normal: [0, 100], warning: [101, 200], alert: [201, 999] },
    },
};

// ========== 事件展示配置 ==========
const EventTypes = {
    eat: { icon: '🍼', color: '#FF9F43', bg: '#FFF5EB' },
    poop: { icon: '💩', color: '#FF6B6B', bg: '#FFF0F0' },
    pee: { icon: '💧', color: '#54A0FF', bg: '#EBF5FF' },
    sleep: { icon: '😴', color: '#5F27CD', bg: '#F3EBFF' },
    cry: { icon: '😢', color: '#FF9FF3', bg: '#FFF0FB' },
};

// ========== 阈值颜色 ==========
const THRESHOLD_COLORS = {
    normal: {text: '#2ECC71', bg: 'rgba(46, 204, 113, 0.1)'},
    warning: {text:'#F39C12', bg: 'rgba(243, 156, 18, 0.1)'},
    alert: {text: '#E74C3C', bg: 'rgba(231, 76, 60, 0.1)'},
};

// ========== 状态标签配置 ==========
const STATUS_TAG_CONFIG = {
    normal: { text: '正常', bg: '#E8F7EF', color: '#27AE60' },
    warning: { text: '预警', bg: '#FEF5E7', color: '#D68910' },
    alert: { text: '告警', bg: '#FDEDEC', color: '#C0392B' },
};

interface ThresholdDisplayItem{
    title:string,
    number:number,
    unit:string,
    level:Threshold
}

interface Threshold{
    normal:[number, number],
    warning:[number, number],
    alert:[number, number]
}

// ========== 状态标签 ==========
function StatusTag({ status, onPress }) {
    const c = STATUS_TAG_CONFIG[status] || STATUS_TAG_CONFIG.normal;
    return (
        <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
            <Text style={{
                fontSize: 9,
                fontWeight: '600',
                color: c.color,
                backgroundColor: c.bg,
                paddingHorizontal: 4,
                paddingVertical: 1,
                borderRadius: 3,
            }}>
                {c.text}
            </Text>
        </TouchableOpacity>
    );
}

// ========== Tooltip ==========
function ThresholdTooltip({ visible, onClose, eventAlias, thresholds, days, icon }:
                              {visible:boolean, onClose:()=>void, eventAlias:string, thresholds:[ThresholdDisplayItem], days:number, icon:string }) {

    if (!visible || !thresholds) return null;

    return (
        <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
            <TouchableWithoutFeedback onPress={onClose}>
                <View style={styles.overlay}>
                    <TouchableWithoutFeedback>
                        <View style={styles.tooltipBox}>
                            <Text style={styles.tooltipTitle}>{icon} {eventAlias} · 阈值说明</Text>
                            {thresholds.map((item, index) => (
                                <View key={index} style={styles.thresholdBlock}>
                                    <Text style={styles.tooltipCount}>{item.title} ({days}天)</Text>
                                    <View style={{ gap: 6}}>
                                        {['normal','warning','alert'].map(level => {
                                            const range = item.level[level];
                                            const isCurrent = item.number >= range[0] && item.number <= range[1];
                                            return (
                                                <View key={level} style={[styles.row, isCurrent && {borderRadius: 4, backgroundColor: THRESHOLD_COLORS[level].bg}]}>
                                                    <Text style={{color: THRESHOLD_COLORS[level].text, fontSize: 12}}>{level === 'normal' ? '正常' : level === 'warning' ? '预警' : '告警'}</Text>
                                                    <Text style={[styles.thresholdText, isCurrent && {color: THRESHOLD_COLORS[level].text, fontWeight: '700'}]}>{isCurrent ? ' • 当前' : ''} {range[0]} ~ {range[1]} {item.unit}</Text>
                                                </View>
                                            );
                                        })}
                                    </View>
                                </View>
                            ))}
                            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                                <Text style={{ color: '#007AFF' }}>知道了</Text>
                            </TouchableOpacity>
                        </View>

                    </TouchableWithoutFeedback>
                </View>
            </TouchableWithoutFeedback>
        </Modal>
    );
}

// ========== 主组件 ==========
export default function EventStatCard({eventType, eventAlias, events = [], days}) {
    const [tooltipVisible, setTooltipVisible] = useState(false);

    const config = EventTypes[eventType] || { icon: '📝', color: '#666', bg: '#F5F5F5' };

    // 在组件内部 count
    const count = events.length;

    const getDynamicThresholds = (THRESHOLD):Threshold => {
        return {
            normal: [
                THRESHOLD.normal[0] * days,
                THRESHOLD.normal[1] * days,
            ],
            warning: [
                THRESHOLD.warning[0] * days,
                THRESHOLD.warning[1] * days,
            ],
            alert: [
                THRESHOLD.alert[0] * days,
                THRESHOLD.alert[1] * days,
            ],
        };
    };

    const getStatus = (threshold, number):string => {
        if (number >= threshold.normal[0] && number <= threshold.normal[1]) return 'normal';
        if (number >= threshold.warning[0] && number <= threshold.warning[1]) return 'warning';
        if (number >= threshold.alert[0] && number <= threshold.alert[1]) return 'alert';
        return 'normal';
    };
    const thresholds:[ThresholdDisplayItem] = [];
    const countThreshold = getDynamicThresholds(DAILY_THRESHOLD_CONFIG[eventType].count);
    thresholds.push({
        title: '当前次数 ' + count + ' 次',
        number: count,
        unit: '次',
        level: countThreshold,
    });
    let allStatus = [getStatus(countThreshold, count)];
    let displayNumberText:string = '-';
    switch (eventType) {
        case EventType.Eat:
            let amount = events.reduce((sum, event) => sum + event.amount, 0);
            displayNumberText = `${amount} ml`;

            const amountThreshold = getDynamicThresholds(DAILY_THRESHOLD_CONFIG[eventType].amount);
            thresholds.push({
                title: '当前奶量 ' + amount + ' ml',
                number: amount,
                unit: 'ml',
                level: amountThreshold,
            });
            allStatus.push(getStatus(amountThreshold, amount));
            break;
        case EventType.Cry:
        case EventType.Sleep:
            let duration = events.reduce((sum, event) => sum + event.duration, 0);
            displayNumberText = `${duration} 分`;

            let durationThreshold = getDynamicThresholds(DAILY_THRESHOLD_CONFIG[eventType].duration);
            thresholds.push({
                title: '当前睡眠时长 ' + duration + ' 分',
                number: duration,
                unit: '分钟',
                level: durationThreshold,
            });
            allStatus.push(getStatus(durationThreshold, duration));
            break;
    }
    const status = (['alert', 'warning', 'normal'] as const).find(s => allStatus.includes(s)) || 'normal';

    if (count === 0) return null;

    return (
        <>
            <View style={[styles.card, { backgroundColor: config.bg }]}>
                <Text style={{ fontSize: 18 }}>{config.icon}</Text>
                <Text style={{ fontSize: 11, fontWeight: '500', color: config.color }}> {eventAlias}{count} </Text>
                <Text style={{ fontSize: 14, fontWeight: '600', color: config.color }}>{displayNumberText} </Text>

                <StatusTag
                    status={status}
                    onPress={() => setTooltipVisible(true)}
                />
            </View>

            <ThresholdTooltip
                visible={tooltipVisible}
                onClose={() => setTooltipVisible(false)}
                eventAlias={eventAlias}
                thresholds={thresholds}
                days={days}
                icon={config.icon}
            />
        </>
    );
}

const styles = StyleSheet.create({
    card: {
        flex: 1,
        minWidth: 55,
        paddingVertical: 8,
        paddingHorizontal: 4,
        borderRadius: 8,
        alignItems: 'center',
    },
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.3)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    tooltipBox: {
        width: '85%',
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 16,
    },
    tooltipTitle: {
        fontSize: 14,
        fontWeight: '600',
        marginBottom: 10,
        textAlign: 'center',
    },
    tooltipCount: {
        fontSize: 12,
        marginTop: 10,
        marginBottom: 10,
        textAlign: 'center',
    },
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingHorizontal: 4,
    },
    thresholdBlock: {
        backgroundColor: '#FAFAFA',
        padding: 8,
        borderRadius: 8,
        marginBottom: 10,
    },
    thresholdText:{width: 200, textAlign: 'right', fontSize:12},
    closeBtn: {
        marginTop: 14,
        padding: 10,
        alignItems: 'center',
    },
});
