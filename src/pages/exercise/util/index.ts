import {format} from 'date-fns';

export const getShowRecordStartAndEndTime = (period:number) =>{
    const now = new Date();
    let showRecordStartTime:Date|null;
    switch (period){
        case 0: { // 全部
            showRecordStartTime = null; // 不计算
            break;
        }
        case 1: { // 最近15天
            showRecordStartTime = new Date(now);
            showRecordStartTime.setDate(showRecordStartTime.getDate() - 15);
            break;
        }
        case 2: { // 最近3个月
            showRecordStartTime = new Date(now);
            showRecordStartTime.setMonth(showRecordStartTime.getMonth() - 3);
            break;
        }
        case 3: { // 最近6个月
            showRecordStartTime = new Date(now);
            showRecordStartTime.setMonth(showRecordStartTime.getMonth() - 6);
            break;
        }
        case 4: { // 最近1年
            showRecordStartTime = new Date(now);
            showRecordStartTime.setFullYear(showRecordStartTime.getFullYear() - 1);
            break;
        }
    }
    let showRecordStart = '';
    let showRecordEnd = '';
    if(showRecordStartTime !== null){
        showRecordStart = format(showRecordStartTime, 'yyyy-MM-dd') + ' 00:00:00';
    }
    showRecordEnd  = format(now, 'yyyy-MM-dd') + ' 23:59:59';
    return {showRecordStart, showRecordEnd};
};

export const haversineDistance = (
    point1: { latitude: number; longitude: number },
    point2: { latitude: number; longitude: number }
): number => {
    const toRad = (n: number) => (n * Math.PI) / 180;
    const R = 6371; // 地球半径 km
    const dLat = toRad(point2.latitude - point1.latitude);
    const dLon = toRad(point2.longitude - point1.longitude);
    const lat1 = toRad(point1.latitude);
    const lat2 = toRad(point2.latitude);

    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
};

export const formatTime = (ms: number): string => {
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
};

export const formatTimestamp = (timestamp: number) => {
    const date = new Date(timestamp);
    return `${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}:${String(date.getSeconds()).padStart(2, '0')}`;
};

export const calculateSegments = (data, interval = 10) => {
    const segments = [];
    const startTime = data[0].time;
    const intervalMs = interval * 60 * 1000; // 转换为毫秒

    let segmentStart = startTime;
    let segmentDistance = 0;
    let previousPoint = data[0];

    for (let i = 1; i < data.length; i++) {
        const point = data[i];
        if (point.time - segmentStart > intervalMs) {
            // 计算当前段的平均配速（km/h）
            const segmentDurationHrs = (point.time - segmentStart) / (1000 * 60 * 60);
            const avgPace = segmentDistance / segmentDurationHrs;

            segments.push({
                startTime: (new Date(segmentStart)).getTime(),
                endTime: (new Date(point.time)).getTime(),
                distance: segmentDistance,
                avgPace: avgPace,
            });

            segmentStart = point.time;
            segmentDistance = 0;
        }
        segmentDistance += haversineDistance(previousPoint, point);
        previousPoint = point;
    }

    return segments;
};

export const isPositionInAvailableSight = (userCoord, swCoord, neCoord) => {
    const { latitude: userLat, longitude: userLng } = userCoord;
    const { latitude: swLat, longitude: swLng } = swCoord;
    const { latitude: neLat, longitude: neLng } = neCoord;

    return (
        userLat >= swLat && userLat <= neLat && // 纬度在范围内
        userLng >= swLng && userLng <= neLng    // 经度在范围内
    );
};

export const convertSpeed = (kmh, type) => {
    switch (type) {
        case 0:
            return kmh;
        case 1:
            return kmh * (1000 / 60);
        case 2:
            return kmh * (1000 / 3600);
    }
};

export const calculateAverageSpeed = (distance, timeInMilliseconds, showType) => {
    if(distance <= 0){
        return 0;
    }
    switch (showType){
        case 0:
            return (distance / (timeInMilliseconds / 3600000)); // 返回 km/h
        case 1:
            return (distance * 1000 / (timeInMilliseconds / 60000)); // 返回 m/min
        case 2:
            return (distance * 1000 / (timeInMilliseconds / 1000)); // 返回 m/s
    }
};
