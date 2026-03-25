import React, { useState, useEffect } from 'react';
import RNFS from 'react-native-fs';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { enableScreens } from 'react-native-screens';
import Loading from '../../src/components/loading';
import config from '../../src/config';
import {AppDBBasePath} from '../../src/constant';
import DictionaryNavigator from '../../src/pages/dictionary/navigator';
import {ApplicationProvider} from '../../src/provider/application';

enableScreens();

const Stack = createStackNavigator();

async function ensureDirectoryExists(path: string) {
    const exists = await RNFS.exists(path);
    if (!exists) {
        await RNFS.mkdir(path);
    }
}

export default function Dictionary() {
    const [loading, setLoading] = useState(true);
    const [tips, setTips] = useState('');

    useEffect(() => {
        const prepareDatabase = async () => {
            const dbPath = `${AppDBBasePath}/dictionary`;
            try {
                const needDownload = await checkNeedDownload(dbPath);
                if ( !needDownload ) {
                    setLoading(false);
                    return;
                }
                setTips('Start Download');
                await ensureDirectoryExists(AppDBBasePath);
                const ret = RNFS.downloadFile({
                    fromUrl: `https://www.googleapis.com/drive/v3/files/1rvStzJXlSJy28Z00vS_wtHmVVjwTk99G?alt=media&key=${config.google.apiKey}`,
                    toFile: dbPath,
                    background: true,
                    discretionary: true,
                    progressDivider: 5,
                    begin: (res) => {
                        setTips('Downloading. Do not close.');
                    },
                    progress: (res) => {
                        if (res.contentLength <= 0){
                            res.contentLength = 812 * 1024 * 1024;
                        }
                        const percent = (res.bytesWritten / res.contentLength) * 100;
                        setTips(`Downloaded ${percent.toFixed(2)}%, Do not close.`);
                    },
                });

                const result = await ret.promise;
                if (result.statusCode !== 200) {
                    setTips('Download failed, please reopen app to restart download. http status code ' + result.statusCode);
                    return;
                }
                setTips('Download success.');
                setLoading(false);
            } catch (err) {
                setTips('Download failed, please reopen app to restart download. err:' + err.toString());
            }
        };

        prepareDatabase();
    }, []);

    async function checkNeedDownload(filePath) {
        try {
            const stat = await RNFS.stat(filePath);
            return stat.size < 810 * 1024 * 1024;
        } catch (err) {
            if (err.message.includes('No such file') || err.message.includes('not exist')  || err.code === 'ENOENT') {
                return true;
            } else {
                throw err;
            }
        }
    }

    if (loading) {
        return <Loading loadingText={tips}/>;
    }

    return (
        <ApplicationProvider>
            <NavigationContainer>
                <Stack.Navigator initialRouteName="DictionaryNavigator">
                    <Stack.Screen name="DictionaryNavigator" options={{ headerShown: false }}  component={DictionaryNavigator} />
                </Stack.Navigator>
            </NavigationContainer>
        </ApplicationProvider>
    );
}

