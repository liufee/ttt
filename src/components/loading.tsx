import {ActivityIndicator, Modal, StyleSheet, Text, View, TouchableOpacity} from 'react-native';
import React from 'react';

interface LoadingProps {
    loading?: boolean
    loadingText?: string
    showRetry?: boolean
    onRetry?: () => void
}

const Loading: React.FC<LoadingProps> = ({loading = true, loadingText = '', showRetry, onRetry})=>{
    return(
        <Modal
            visible={loading}
            transparent={true}
            animationType="none"
            statusBarTranslucent={true} // 确保覆盖状态栏（Android）
        >
            <View style={styles.overlay}>
                {showRetry ? (
                    <TouchableOpacity onPress={onRetry} style={styles.retryButton}>
                        <Text style={styles.retryButtonText}>重试</Text>
                    </TouchableOpacity>
                ) : (
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="large" color="#ffffff" />
                        <Text style={[styles.loadingText]}>{loadingText}</Text>
                    </View>
                )}
            </View>
        </Modal>
    );
};

export default Loading;

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        justifyContent: 'center',      // 垂直居中
        alignItems: 'center',          // 水平居中
        backgroundColor: 'rgba(0, 0, 0, 0.4)', // 半透明遮罩
        zIndex: 9999,                  // iOS兼容性，虽然 Modal 本身在顶层，但写着稳
        elevation: 9999,               // Android 提高层级
    },
    retryButton: {
        backgroundColor: '#FF5722',
        paddingVertical: 10,
        paddingHorizontal: 20,
        borderRadius: 5,
        marginBottom: 10,
    },
    retryButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
    loadingContainer: {
        width: '80%',
        alignItems: 'center',
    },
    loadingText: {
        marginTop: 10,
        fontSize: 16,
        color: '#fff',
        width: '100%',
        textAlign: 'center',
        flexWrap: 'wrap',
    },
});

/*
import {ActivityIndicator, StyleSheet, Text, View, TouchableOpacity} from 'react-native';
import React from 'react';

interface LoadingProps {
    loading?: boolean
    loadingText?: string
    showRetry?: boolean
    onRetry?: () => void
}

const Loading: React.FC<LoadingProps> = ({loading = true, loadingText = '', showRetry, onRetry})=>{
    if (!loading) return null;

    return(
        <View style={styles.overlay} pointerEvents="box-none">
            {showRetry ? (
                <TouchableOpacity onPress={onRetry} style={styles.retryButton}>
                    <Text style={styles.retryButtonText}>重试</Text>
                </TouchableOpacity>
            ) : (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#ffffff" />
                    {loadingText.length > 0 && (
                        <Text style={styles.loadingText}>{loadingText}</Text>
                    )}
                </View>
            )}
        </View>
    );
};

export default Loading;

const styles = StyleSheet.create({
    overlay: {
        ...StyleSheet.absoluteFillObject,       // 覆盖全屏
        justifyContent: 'center',               // 垂直居中
        alignItems: 'center',                   // 水平居中
        backgroundColor: 'rgba(0,0,0,0.4)',    // 半透明遮罩
        zIndex: 9999,                           // 保证顶层
        elevation: 9999,                        // Android 顶层
    },
    retryButton: {
        backgroundColor: '#FF5722',
        paddingVertical: 10,
        paddingHorizontal: 20,
        borderRadius: 5,
        marginBottom: 10,
    },
    retryButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
    loadingContainer: {
        width: '80%',
        alignItems: 'center',
    },
    loadingText: {
        marginTop: 10,
        fontSize: 16,
        color: '#fff',
        width: '100%',
        textAlign: 'center',
        flexWrap: 'wrap',
    },
});*/
