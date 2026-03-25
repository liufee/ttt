import React, { useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet, TouchableOpacity, Linking, Clipboard, ScrollView, NativeModules } from 'react-native';
import DocumentPicker from 'react-native-document-picker';
import {useToast} from '../../../provider/toast';
import {getABSPath} from '../../../utils';
import config from '../../../config';
import {AppDBBasePath, AppWeiboBasePath, AppWeiboLargeBasePath} from '../../../constant';

const HttpServer = () => {
    const [port, setPort] = useState('8080');
    const [isHTTPS, setIsHTTPS] = useState('no');
    const [dbPath, setDbPath] = useState<string | null>(AppDBBasePath + '/novel');
    const [dbWeiboPath, setDbWeiboPath] = useState<string | null>(AppDBBasePath + '/weibo' + (__DEV__ ? '_debug' : ''));
    const [dbExercisePath, setDbExercisePath] = useState<string | null>(AppDBBasePath + '/exercise' + (__DEV__ ? '_debug' : ''));
    const [dbBusinessPath, setDbBusinessPath] = useState<string | null>(AppDBBasePath + '/business' + (__DEV__ ? '_debug' : ''));
    const [dbChildrenPath, setDbChildrenPath] = useState<string | null>(AppDBBasePath + '/children' + (__DEV__ ? '_debug' : ''));
    const [weiboFileBasePath, setWeiboFileBasePath] = useState<string | null>(AppWeiboBasePath);
    const [largeWeiboFileBasePath, setLargeWeiboFileBasePath] = useState<string | null>(AppWeiboLargeBasePath);
    const [serverAddresses, setServerAddresses] = useState<string[]>([]);
    const [serverPaths, setServerPaths] = useState<{ path: string; description: string }[]>([]);
    const [isRunning, setIsRunning] = useState(false);

    const {showToast} = useToast();

    const pickFile = async () => {
        try {
            const res = await DocumentPicker.pickSingle({
                type: [DocumentPicker.types.allFiles],
            });
            setDbPath(getABSPath(res.uri));
        } catch (err) {
            showToast({message: '文件选择失败', backgroundColor:'red'});
        }
    };

    const toggleServer = async () => {
        if (isRunning) {
            // 关闭服务器
            try {
                await NativeModules.RNHelper.stopHTTPServer();
                setServerAddresses([]);
                setServerPaths([]);
                setIsRunning(false);
            } catch (error) {
                console.error('停止 HTTP 服务器失败', error);
                showToast({message: '停止 HTTP 服务器失败', backgroundColor:'red'});
            }
        } else {
            // 启动服务器
            if (!dbPath) {
                showToast({message: '请先选择 SQLite 文件', backgroundColor:'red'});
                return;
            }
            try {
                let result = await NativeModules.RNHelper.startHTTPServer(isHTTPS, dbPath, dbWeiboPath, dbExercisePath, dbBusinessPath, dbChildrenPath, weiboFileBasePath, largeWeiboFileBasePath, config.gaoDeAPIKey.web, port);
                if(!result.includes(',')){
                    showToast({message: '启动 HTTP 服务器失败', backgroundColor:'red'});
                    return;
                }
                let addrs = result.split(/[,-]+/).slice(1);
                setServerAddresses(addrs);
                setServerPaths([{
                    path:'/tool/sync',
                    description:'同步信息页面',
                },{
                    path:'/weibo/list',
                    description:'微博',
                },{
                    path:'/exercise/list',
                    description:'运动',
                },{
                    path:'/exercise/ai-prompts',
                    description:'运动 ai prompts',
                },{
                    path:'/children/ai-prompts',
                    description:'孩子 ai prompts',
                }]);
                setIsRunning(true);
            } catch (error) {
                console.error('启动 HTTP 服务器失败', error);
                showToast({message: '启动 HTTP 服务器失败', backgroundColor:'red'});
            }
        }
    };

    const openBrowser = (address: string) => {
        Linking.openURL(`${isHTTPS === 'yes' ? 'https' : 'http'}://${address}`).catch(err => showToast({message: `打开浏览器失败:${err.toString()}`, backgroundColor:'red'}));
    };

    const copyToClipboard = (address: string) => {
        Clipboard.setString(`${isHTTPS === 'yes' ? 'https' : 'http'}://${address}`);
        showToast({message: '地址已复制到剪贴板'});
    };

    return (
        <ScrollView contentContainerStyle={styles.container}>
            {/* HTTPS 选项 */}
            <View style={styles.row}>
                <Text style={styles.label}>HTTPS:</Text>
                <TouchableOpacity
                    style={{
                        backgroundColor: isHTTPS === 'yes' ? '#28a745' : '#ccc',
                        padding: 10,
                        borderRadius: 5,
                    }}
                    disabled={isRunning}
                    onPress={() => setIsHTTPS(isHTTPS === 'yes' ? 'no' : 'yes')}
                >
                    <Text style={{color:'#fff'}}>{isHTTPS === 'yes' ? '是' : '否'}</Text>
                </TouchableOpacity>
            </View>

            {/* 端口号输入 */}
            <View style={styles.row}>
                <Text style={styles.label}>端口号:</Text>
                <TextInput
                    style={{...styles.input, color: !isRunning ? 'black' : 'gray', backgroundColor: !isRunning ? 'white' : '#f0f0f0'}}
                    value={port}
                    editable={!isRunning}
                    onChangeText={setPort}
                    keyboardType="numeric"
                    placeholder="输入端口号"
                />
            </View>

            {/* 选择 SQLite 文件 */}
            <View style={styles.row}>
                <Text style={styles.label}>数据库:</Text>
                <TouchableOpacity style={{...styles.fileButton, backgroundColor: isRunning?'gray':"#007bff"}} disabled={isRunning} onPress={pickFile}>
                    <Text style={styles.fileButtonText}>{dbPath ? '重新选择文件' : '选择 SQLite 文件'}</Text>
                </TouchableOpacity>
            </View>

            {dbPath && <Text style={styles.filePath}>当前文件: {dbPath}</Text>}

            {/* 启动/关闭 HTTP 服务器 */}
            <View style={styles.buttonContainer}>
                <View style={styles.fixedButton}>
                    <Button
                        title={isRunning ? '关闭服务器' : '启动服务器'}
                        onPress={toggleServer}
                        color={isRunning ? 'red' : 'green'}
                    />
                </View>
            </View>

            {/* 显示监听地址 */}
            {serverAddresses.length > 0 && (
                <View style={styles.statusContainer}>
                    <Text style={styles.statusText}>监听地址:</Text>
                    {serverAddresses.map((address, index) => (
                        <View key={index} style={styles.addressRow}>
                            <Text style={styles.addressText}>{address}</Text>
                            <View style={styles.addressButtons}>
                                <TouchableOpacity style={styles.addressButton} onPress={() => openBrowser(address)}>
                                    <Text style={styles.addressButtonText}>打开浏览器</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={styles.addressButton} onPress={() => copyToClipboard(address)}>
                                    <Text style={styles.addressButtonText}>复制地址</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    ))}
                </View>
            )}

            {/* 显示网站路径及说明 */}
            {serverPaths.length > 0 && (
                <View style={styles.pathsContainer}>
                    <Text style={styles.pathsHeader}>可用网站路径:</Text>
                    {serverPaths.map((item, index) => (
                        <View key={index} style={styles.pathRow}>
                            <TouchableOpacity onPress={() => openBrowser(serverAddresses[0] + item.path )}>
                                <Text style={styles.pathText}>{item.path}</Text>
                                <Text style={styles.pathDescription}>{item.description}</Text>
                            </TouchableOpacity>
                        </View>
                    ))}
                </View>
            )}
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: {
        flexGrow: 1,
        padding: 20,
        backgroundColor: "#f8f8f8",
    },
    row: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 15,
    },
    label: {
        fontSize: 16,
        fontWeight: "bold",
        marginRight: 10,
        minWidth: 80, // 统一宽度，确保对齐
    },
    input: {
        flex: 1,
        borderWidth: 1,
        borderColor: "#ccc",
        padding: 10,
        borderRadius: 5,
        backgroundColor: "#fff",
    },
    fileButton: {
        flex: 1,
        backgroundColor: "#007bff",
        padding: 10,
        borderRadius: 5,
        alignItems: "center",
    },
    fileButtonText: {
        color: "#fff",
        fontSize: 16,
    },
    filePath: {
        marginBottom: 15,
        fontSize: 12,
        color: "#007bff",
        padding: 8,
        backgroundColor: "#e3f2fd",
        borderRadius: 5,
    },
    buttonContainer: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "flex-end",
        marginTop: 20,
    },
    fixedButton: {
        width: 150, // 固定按钮宽度
    },
    statusContainer: {
        marginTop: 20,
    },
    statusText: {
        fontSize: 16,
        fontWeight: "bold",
        marginBottom: 10,
    },
    addressRow: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 10,
    },
    addressText: {
        flex: 1,
        fontSize: 14,
        color: "#555",
    },
    addressButtons: {
        flexDirection: "row",
        marginLeft: 10,
    },
    addressButton: {
        backgroundColor: "#007bff",
        padding: 5,
        marginLeft: 10,
        borderRadius: 5,
    },
    addressButtonText: {
        color: "#fff",
        fontSize: 12,
    },
    pathsContainer: {
        marginTop: 30,
        backgroundColor: "#e8f5e9",
        padding: 15,
        borderRadius: 5,
    },
    pathsHeader: {
        fontSize: 18,
        fontWeight: "bold",
        color: "#388e3c",
        marginBottom: 15,
    },
    pathRow: {
        marginBottom: 10,
    },
    pathText: {
        fontSize: 16,
        fontWeight: "bold",
        color: "#388e3c",
    },
    pathDescription: {
        fontSize: 14,
        color: "#555",
        marginTop: 5,
    },
});

export default HttpServer;
