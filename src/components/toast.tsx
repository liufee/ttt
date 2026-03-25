import React, { useEffect, useRef, useState } from 'react';
import { View, Text, Animated, StyleSheet, TouchableOpacity } from 'react-native';

interface ToastProps {
    visible: boolean;
    message: string;
    onDismiss?: () => void;
    autoHide?: boolean;
    duration?: number;
    backgroundColor?: string;
    fontSize?: number;
    onPress?: () => void;
}

const Toast = ({
                   visible,
                   message,
                   onDismiss,
                   autoHide = true,
                   duration = 2000,
                   backgroundColor = '#333',
                   fontSize = 14,
                   onPress,
               }: ToastProps) => {
    const opacity = useRef(new Animated.Value(0)).current;
    const [touchEnabled, setTouchEnabled] = useState(false);

    useEffect(() => {
        if (visible) {
            Animated.timing(opacity, {
                toValue: 1,
                duration: 250,
                useNativeDriver: true,
            }).start();

            // 下一轮事件循环允许点击
            setTouchEnabled(false);
            const touchTimer = setTimeout(() => setTouchEnabled(true), 0);

            // 自动隐藏
            let autoTimer: number | undefined;
            if (autoHide) {
                autoTimer = setTimeout(() => {
                    Animated.timing(opacity, {
                        toValue: 0,
                        duration: 250,
                        useNativeDriver: true,
                    }).start(() => onDismiss?.());
                }, duration);
            }

            return () => {
                clearTimeout(touchTimer);
                autoTimer && clearTimeout(autoTimer);
            };
        } else {
            opacity.setValue(0);
            setTouchEnabled(false);
        }
    }, [visible, autoHide, duration, onDismiss]);

    if( !visible ){
        return null;
    }

    const handlePress = () => {
        onPress && onPress();
        autoHide && onDismiss && onDismiss();
    };

    return (
        <View style={styles.root} pointerEvents="box-none">
            <TouchableOpacity
                activeOpacity={0.7}
                onPress={touchEnabled ? handlePress : undefined}
                pointerEvents={touchEnabled ? 'auto' : 'none'}
            >
                <Animated.View
                    style={[
                        styles.toast,
                        {
                            opacity,
                            backgroundColor,
                            paddingVertical: 6,   // 控制高度
                            paddingHorizontal: 12, // 控制宽度
                            minWidth: '60%',       // 控制最小宽度
                        },
                    ]}
                >
                    <Text style={[styles.text, { fontSize }]}> {message}   </Text>

                    {/* 右上角关闭按钮 */}
                    <TouchableOpacity
                        onPress={onDismiss}
                        style={styles.close}
                        activeOpacity={0.7}
                    >
                        <Text style={styles.closeText}>×</Text>
                    </TouchableOpacity>
                </Animated.View>
            </TouchableOpacity>
        </View>
    );
};

const styles = StyleSheet.create({
    root: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'flex-start',
        alignItems: 'center',
        zIndex: 9999,
        elevation: 9999,
    },
    toast: {
        borderRadius: 8,
        alignItems: 'center',
    },
    text: {
        color: '#fff',
        textAlign: 'center',
        fontWeight: '500',
    },
    close: {
        position: 'absolute',
        right: 4,
        top: 2,
    },
    closeText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
});

export default Toast;
