import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import Loading from '../components/loading';

type RetryHandler = (() => void) | undefined;

interface LoadingContextType {
    showLoading: (text?: string) => void;
    hideLoading: () => void;
    showRetry: (text?: string, onRetry?: () => void) => void;
    setLoadingText: (text: string) => void;
}

const LoadingContext = createContext<LoadingContextType | undefined>(undefined);

export const LoadingProvider = ({ children }: { children: React.ReactNode }) => {
    const [loading, setLoading] = useState(false);
    const [loadingText, setLoadingTextState] = useState('');
    const [showRetry, setShowRetry] = useState(false);
    const [onRetry, setOnRetry] = useState<RetryHandler>(undefined);

    const showLoading = useCallback((text?: string) => {
        setShowRetry(false);
        setOnRetry(undefined);
        setLoadingTextState(text ?? '');
        setLoading(true);
    }, []);

    const hideLoading = useCallback(() => {
        setLoading(false);
        setShowRetry(false);
        setOnRetry(undefined);
        setLoadingTextState('');
    }, []);

    const showRetryModal = useCallback((text?: string, retry?: () => void) => {
        setLoadingTextState(text ?? '');
        setShowRetry(true);
        setOnRetry(() => retry);
        setLoading(true);
    }, []);

    const setLoadingText = useCallback((text: string) => {
        setLoadingTextState(text);
    }, []);

    const ctxValue = useMemo(
        () => ({
            showLoading,
            hideLoading,
            showRetry: showRetryModal,
            setLoadingText,
        }),
        [showLoading, hideLoading, showRetryModal, setLoadingText]
    );

    const handleRetry = () => {
        // 你也可以选择重试后继续 loading
        onRetry?.();
    };

    return (
        <LoadingContext.Provider value={ctxValue}>
            {children}
            <View style={styles.container} pointerEvents="box-none">
                <Loading
                    loading={loading}
                    loadingText={loadingText}
                    showRetry={showRetry}
                    onRetry={handleRetry}
                />
            </View>
        </LoadingContext.Provider>
    );
};

export const useLoading = () => {
    const ctx = useContext(LoadingContext);
    if (!ctx) throw new Error('useLoading must be used within LoadingProvider');
    return ctx;
};

const styles = StyleSheet.create({
    container: {
        ...StyleSheet.absoluteFillObject,
        zIndex: 9999,
        elevation: 9999,
        pointerEvents: 'box-none',
    },
});
