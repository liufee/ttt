import React, {createContext, useEffect, useState} from 'react';
import {Alert, BackHandler, Platform} from 'react-native';
import {PERMISSIONS, RESULTS, request} from 'react-native-permissions';
import {SettingProvider} from './setting';
import { LoadingProvider } from './loading';
import { ToastProvider } from './toast';

interface ApplicationContextType {
}

const ApplicationContext = createContext<ApplicationContextType|null>(null);

export const ApplicationProvider = ({ children }) => {
    const [application, setApplication] = useState(null);
    useEffect(() => {
        const requestPermissions = async () => {
            let permissionResult;
            if (Platform.OS === 'android') {
                // 请求文件读写权限
                permissionResult = await request(PERMISSIONS.ANDROID.WRITE_EXTERNAL_STORAGE);
                permissionResult && await request(PERMISSIONS.ANDROID.ACCESS_FINE_LOCATION);
                permissionResult && await request(PERMISSIONS.ANDROID.ACCESS_FINE_LOCATION)
            } else if (Platform.OS === 'ios') {
                // 请求相机权限
                permissionResult = await request(PERMISSIONS.IOS.CAMERA);
            }
            if (permissionResult === RESULTS.DENIED || permissionResult === RESULTS.BLOCKED) {
                // 用户拒绝权限或权限被屏蔽时，提示并退出应用
                Alert.alert(
                    '权限被拒绝',
                    '该应用需要相关权限才能正常运行。如果拒绝授权，应用将退出。',
                    [
                        {
                            text: '退出',
                            onPress: () => BackHandler.exitApp(), // 退出程序
                            style: 'destructive',
                        },
                        {
                            text: '重新授权',
                            onPress: () => requestPermissions(), // 重新尝试请求权限
                        },
                    ]
                );
            } else {
                console.log('权限已授予');
            }
        };
        requestPermissions().then();
    }, []);

    return (
        <ApplicationContext.Provider value={{ application, setApplication }}>
            <LoadingProvider>
                <ToastProvider>
                    <SettingProvider>
                        {children}
                    </SettingProvider>
                </ToastProvider>
            </LoadingProvider>
        </ApplicationContext.Provider>
    );
};
