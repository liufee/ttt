import React, { createContext, useContext, useState, useCallback } from 'react';
import { View, StyleSheet } from 'react-native';
import Toast from '../components/toast';

export interface ToastOptions {
  message: string;
  duration?: number;
  backgroundColor?: string;
  autoHide?: boolean;
  onPress?: () => void;
}

interface ToastContextType {
  showToast: (options: ToastOptions) => void;
  hideToast: () => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider = ({ children }: { children: React.ReactNode }) => {
  const [visible, setVisible] = useState(false);
  const [message, setMessage] = useState('');
  const [duration, setDuration] = useState(2000);
  const [backgroundColor, setBackgroundColor] = useState('green');
  const [autoHide, setAutoHide] = useState(true);
  const [onPress, setOnPress] = useState<(() => void) | undefined>(undefined);

  const showToast = useCallback((options: ToastOptions) => {
    setMessage(options.message);
    setDuration(options.duration || 2000);
    setBackgroundColor(options.backgroundColor || 'green');
    setAutoHide(options.autoHide ?? true);
    setOnPress(() => options.onPress);
    setVisible(true);
  }, []);

  const hideToast = useCallback(() => {
    setVisible(false);
    setOnPress(undefined);
  }, []);

  return (
      <ToastContext.Provider value={{ showToast, hideToast }}>
        {children}
        <View style={styles.container} pointerEvents="box-none">
          <Toast
              message={message}
              visible={visible}
              onDismiss={hideToast}
              autoHide={autoHide}
              duration={duration}
              backgroundColor={backgroundColor}
              onPress={onPress}
          />
        </View>
      </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used within ToastProvider');
  return context;
};

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-start',
    alignItems: 'center',
    zIndex: 9999,
    elevation: 9999,
    pointerEvents: 'box-none',
  },
});
