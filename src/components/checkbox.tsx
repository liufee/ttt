import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

interface CheckboxProps {
    label?: string;
    checked: boolean; // 由外部控制
    checkedColor?: string;
    uncheckedColor?: string;
    textColor?: string;
    onChange?: (checked: boolean) => void;
}

const Checkbox: React.FC<CheckboxProps> = ({
                                                     label = '是',
                                                     checked, // 由外部传入
                                                     checkedColor = '#4CAF50',
                                                     uncheckedColor = '#A0A0A0',
                                                     textColor = '#333',
                                                     onChange,
                                                 }) => {
    const toggleChecked = () => {
        onChange?.(!checked); // 让外部更新 checked
    };

    return (
        <TouchableOpacity onPress={toggleChecked} style={styles.container} activeOpacity={0.7}>
            <View
                style={[
                    styles.checkbox,
                    { borderColor: checked ? checkedColor : uncheckedColor, backgroundColor: checked ? checkedColor : 'transparent' },
                ]}
            >
                {checked && <Text style={styles.checkmark}>✓</Text>}
            </View>
            {label && <Text style={[styles.label, { color: textColor }]}>{label}</Text>}
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    checkbox: {
        width: 22,
        height: 22,
        borderWidth: 2,
        borderRadius: 4,
        justifyContent: 'center',
        alignItems: 'center',
    },
    checkmark: {
        color: 'white',
        fontSize: 16,
        fontWeight: 'bold',
    },
    label: {
        fontSize: 16,
        marginLeft: 3,
    },
});

export default Checkbox;
