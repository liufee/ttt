import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Calendar } from 'react-native-calendars';
import { format } from 'date-fns';

interface DatePickerPanelProps {
    onDateSelect: (date?: Date) => void;
    initialDisplayDate: Date|null;
}

const DatePickerPanel: React.FC<DatePickerPanelProps> = ({ onDateSelect, initialDisplayDate }) => {
    const [displayDate, setDisplayDate] = useState(initialDisplayDate);

    useEffect(() => {
        setDisplayDate(initialDisplayDate);
    }, [initialDisplayDate]);

    const handleDayPress = (day: { year: number, month: number, day: number }) => {
        const newDate = new Date(day.year, day.month - 1, day.day);
        onDateSelect(newDate);
        setDisplayDate(newDate); // Keep calendar on the selected month
    };

    const changeMonth = (amount: number) => {
        const newDisplayDate = new Date(displayDate);
        newDisplayDate.setMonth(newDisplayDate.getMonth() + amount);
        setDisplayDate(newDisplayDate);
    };

    const changeYear = (amount: number) => {
        const newDisplayDate = new Date(displayDate);
        newDisplayDate.setFullYear(newDisplayDate.getFullYear() + amount);
        setDisplayDate(newDisplayDate);
    };

    const renderCalendarHeader = () => {
        return (
            <View style={styles.calendarHeader}>
                <TouchableOpacity onPress={() => changeYear(-1)}><Text style={styles.arrow}>&lt;&lt; </Text></TouchableOpacity>
                <TouchableOpacity onPress={() => changeMonth(-1)}><Text style={styles.arrow}>&lt;</Text></TouchableOpacity>
                <Text style={styles.headerText}>{format(displayDate, 'yyyy-MM')}  </Text>
                <TouchableOpacity onPress={() => onDateSelect(undefined)}><Text style={styles.clearButton}>清除</Text></TouchableOpacity>
                <TouchableOpacity onPress={() => changeMonth(1)}><Text style={styles.arrow}>&gt;</Text></TouchableOpacity>
                <TouchableOpacity onPress={() => changeYear(1)}><Text style={styles.arrow}>&gt;&gt; </Text></TouchableOpacity>
            </View>
        );
    };

    return (
        <Calendar
            key={format(displayDate, 'yyyy-MM')}
            current={format(displayDate, 'yyyy-MM-dd')}
            onDayPress={handleDayPress}
            renderHeader={renderCalendarHeader}
            hideArrows={true}
        />
    );
};

const styles = StyleSheet.create({
    calendarHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10,
    },
    arrow: {
        fontSize: 20,
        color: 'blue',
        paddingHorizontal: 10,
    },
    headerText: {
        fontSize: 18,
        fontWeight: 'bold',
    },
    clearButton: {
        fontSize: 18,
        color: 'red',
        paddingHorizontal: 10,
    },
});

export default DatePickerPanel;
