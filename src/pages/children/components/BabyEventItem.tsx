import React from 'react';
import {Alert, StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import {childrenList, Event, EventType, newBornEvents} from '../../../services/children/model';
import ChildrenService from '../../../services/children';
import {useToast} from '../../../provider/toast';

const EVENT_CONFIG = {
    [EventType.Eat]: { icon: '🍼', color: '#FF9F43', bg: '#FFF5EB' },
    [EventType.Poop]: { icon: '💩', color: '#FF6B6B', bg: '#FFF0F0' },
    [EventType.Pee]: { icon: '💧', color: '#54A0FF', bg: '#EBF5FF' },
    [EventType.Sleep]: { icon: '😴', color: '#5F27CD', bg: '#F3EBFF' },
    [EventType.Cry]: { icon: '😢', color: '#FF9FF3', bg: '#FFF0FB' },
};

export default function BabyEventItem({ event, isLast, onDeleted }:{event:Event, isLast:boolean, onDeleted?:()=>void}) {
    const formatTime = (dateStr) => {
        if (!dateStr) return '';
        const date = new Date(dateStr);
        return `${String(date.getHours()).padStart(2,'0')}:${String(date.getMinutes()).padStart(2,'0')}`;
    };

    const formatDate = (dateStr) => {
        if (!dateStr) return '';
        const date = new Date(dateStr);
        return `${date.getMonth() + 1}/${date.getDate()}`;
    };

    let logTime = formatTime(event.startTime);
    const extras = [];
    switch (event.eventType) {
        case EventType.Eat:
            extras.push(`${event.amount} ml`);
            break;
        case EventType.Poop:
            extras.push(`${event.type}/${event.color}`);
            break;
        case EventType.Pee:
            extras.push(`${event.level}`);
            break;
        case EventType.Cry:
            logTime = `${formatTime(event.startTime)} - ${formatTime(event.endTime)}`;
            extras.push(`${event.level}`);
            break;
        case EventType.Sleep:
            logTime = `${formatTime(event.startTime)} - ${formatTime(event.endTime)}`;
            break;
    }
    if (event.eventType === EventType.Sleep || event.eventType === EventType.Cry) {
        extras.push(`${event.duration} 分`);
    }
    const config = EVENT_CONFIG[event.eventType] || { icon: '📝', color: '#666', bg: '#F5F5F5' };

    const childrenService = ChildrenService.getInstance();
    const {showToast} = useToast();

    const handleDelete = () => {
        Alert.alert(
            '删除确认',
            '确定删除这条记录？',
            [
                { text: '取消', style: 'cancel' },
                {
                    text: '删除',
                    style: 'destructive',
                    onPress: async () => {
                        const [success, err] = await childrenService.deleteEvent(event.id);
                        if (!success) {
                            showToast({message:'删除失败' + err, backgroundColor: 'red'});
                            return;
                        }
                        onDeleted && onDeleted();
                        showToast({message:'删除成功'});
                        return;
                    },
                },
            ]
        );
    };

    return (
        <TouchableOpacity activeOpacity={0.9} onLongPress={handleDelete} delayLongPress={500} style={[styles.logItem, !isLast && styles.logItemBorder]}>
            <View style={[styles.logIndicator, { backgroundColor: config.color }]} />
            <View style={styles.logContent}>
                <View style={styles.logHeader}>
                    <Text style={styles.logChild}>{childrenList[event.child]} </Text>
                    <Text style={styles.logDate}>{formatDate(event.startTime)}  </Text>
                    <Text style={styles.logTime}>{logTime}    </Text>
                </View>
                <View style={styles.logBody}>
                    <Text style={styles.logIcon}>{config.icon}</Text>
                    <Text style={[styles.logAction, { color: config.color }]}>{newBornEvents[event.eventType]}</Text>
                </View>
                {extras.length > 0 && (
                    <View style={styles.logExtras}>
                        {extras.map((extra, idx) => (
                            <Text key={idx} style={styles.logExtra}>{extra} </Text>
                        ))}
                    </View>
                )}
            </View>
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    logItem: {
        flexDirection: 'row',
        backgroundColor: '#fff',
        borderRadius: 10,
        marginBottom: 8,
        borderWidth: 1, borderColor: '#F0F0F0',
    },
    logItemBorder: {},
    logIndicator: {
        width: 3,
        borderTopLeftRadius: 10,
        borderBottomLeftRadius: 10,
    },
    logContent: { flex: 1, paddingVertical: 12, paddingHorizontal: 14 },
    logHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
    logChild: {
        fontSize: 12, color: '#007AFF', fontWeight: '500',
        backgroundColor: '#F0F7FF', paddingHorizontal: 8, paddingVertical: 3,
        borderRadius: 6, marginRight: 8,
    },
    logDate: { fontSize: 12, color: '#999', marginRight: 6 },
    logTime: { fontSize: 12, color: '#666', fontWeight: '500' },
    logBody: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
    logIcon: { fontSize: 18, marginRight: 6 },
    logAction: { fontSize: 15, fontWeight: '500' },
    logExtras: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
    logExtra: {
        fontSize: 11, color: '#888',
        backgroundColor: '#F5F5F5',
        paddingHorizontal: 8, paddingVertical: 3,
        borderRadius: 4,
    },
});
