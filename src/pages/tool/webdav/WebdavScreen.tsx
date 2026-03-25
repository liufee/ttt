import React, { useState, useEffect } from 'react';
import { View, Image, Text, FlatList, TouchableOpacity, Alert, ActivityIndicator, Modal, StyleSheet } from 'react-native';
import { TextInput } from 'react-native';
import DocumentPicker,{DocumentPickerResponse} from 'react-native-document-picker';
import RNFS, {ExternalCachesDirectoryPath} from 'react-native-fs';
import {AppPicturesBasePath, APPRuntimePath, Progress} from '../../../constant';
import Webdav from '../../../repository/webdav';
import {base64ToArrayBuffer, mimeIsImage} from '../../../utils';
import FileViewer from 'react-native-file-viewer';
import {useToast} from '../../../provider/toast';
import {getProgress, saveProgress} from '../../../config';
import {FileStat} from 'webdav/dist/node/types';

interface WebDAVConfig {
    id: string;
    webdavUrl: string;
    username: string;
    password: string;
}

const CONFIG_FILE_PATH = `${APPRuntimePath}/webdav_config.json`;

const WebDAVScreen = () => {
    const [webdavConfigList, setWebdavConfigList] = useState<WebDAVConfig[]>([]);
    const [selectedWebdav, setSelectedWebdav] = useState<Webdav>(null);
    const [fileList, setFileList] = useState<Array<FileStat>>([]);
    const [currentDirectory, setCurrentDirectory] = useState('/');
    const [dialogVisible, setDialogVisible] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [selectedConfig, setSelectedConfig] = useState<WebDAVConfig | null>(null);
    const [newWebdav, setNewWebdav] = useState<WebDAVConfig>({ id: '', webdavUrl: '', username: '', password: '' });
    const [selectedFiles, setSelectedFiles] = useState<string[]>([]); // 选中的文件列表
    const [loading, setLoading] = useState(false); // Loading state for file fetching

    const {showToast} = useToast();

    // 加载 WebDAV 配置
    const loadWebdavConfigs = async () => {
        try {
            const fileExists = await RNFS.exists(CONFIG_FILE_PATH);
            if (fileExists) {
                const data = await RNFS.readFile(CONFIG_FILE_PATH);
                const configs = JSON.parse(data);
                setWebdavConfigList(configs);
                const lastSelectedWebdavID = await getProgress(Progress.LastSelectedWebdav) || null;
                if(!lastSelectedWebdavID){
                    return;
                }
                const config = configs.find(obj => obj.id === lastSelectedWebdavID);
                if(config !== undefined){
                    const webdav = new Webdav(config.webdavUrl, config.username, config.password);
                    setSelectedWebdav(webdav);
                    fetchFileList(webdav, '/');
                }
            }
        } catch (error) {
            console.error('读取 WebDAV 配置失败', error);
        }
    };

    // 保存 WebDAV 配置
    const saveWebdavConfigs = async (configs: WebDAVConfig[]) => {
        try {
            await RNFS.writeFile(CONFIG_FILE_PATH, JSON.stringify(configs), 'utf8');
        } catch (error) {
            console.error('保存 WebDAV 配置失败', error);
        }
    };

    // 添加或更新 WebDAV 配置
    const addOrUpdateWebdav = async () => {
        if (!newWebdav.webdavUrl) {
            showToast({message:'请输入 WebDAV 地址', backgroundColor: 'red'});
            return;
        }

        let updatedList = [...webdavConfigList];
        if (isEditing && selectedConfig) {
            updatedList = updatedList.map((item) =>
                item.id === selectedConfig.id ? { ...newWebdav } : item
            );
        } else {
            newWebdav.id = Date.now().toString();
            updatedList.push(newWebdav);
        }

        setWebdavConfigList(updatedList);
        await saveWebdavConfigs(updatedList);
        setDialogVisible(false);
        setIsEditing(false);
        setNewWebdav({ id: '', webdavUrl: '', username: '', password: '' });
    };

    // 删除 WebDAV 配置
    const deleteWebdav = async (id: string) => {
        const updatedList = webdavConfigList.filter((item) => item.id !== id);
        setWebdavConfigList(updatedList);
        await saveWebdavConfigs(updatedList);
    };

    // 选择 WebDAV 配置
    const selectWebdav = async (config: WebDAVConfig) => {
        const webdav = new Webdav(config.webdavUrl, config.username, config.password)
        setSelectedWebdav(webdav);
        await fetchFileList(webdav, '/'); // Start with root directory when selecting WebDAV config
        await saveProgress(Progress.LastSelectedWebdav, config.id);
    };

    // 获取文件列表
    const fetchFileList = async (webdav: Webdav, dir: string) => {
        setLoading(true); // 开始加载，锁定页面
        try {
            let files = await webdav.listFiles(dir) as Array<FileStat>;
            for(let i in files){
               files[i].url = '';
               if ( mimeIsImage(files[i].mime) ) {
                   const fileName = files[i].filename.split('/').pop();
                   const destPath = `${ExternalCachesDirectoryPath}` + `/${fileName}`;
                   await webdav.downloadFile(files[i].filename, destPath);
                   files[i].url = destPath;
               }
            }
            setFileList(files);
            setCurrentDirectory(dir); // 更新当前目录
        } catch (error) {
            showToast({message:'无法获取 WebDAV 文件列表:' + error.toString(), backgroundColor: 'red'});
            return;
        } finally {
            setLoading(false); // 加载完成，解锁页面
        }
    };

    const toggleSelectFile = (filePath: string) => {
        setSelectedFiles((prevSelected) => {
            if (prevSelected.includes(filePath)) {
                return prevSelected.filter((item) => item !== filePath); // 取消选中
            } else {
                return [...prevSelected, filePath]; // 选中
            }
        });
    };

    const toggleSelectAll = () => {
        if (selectedFiles.length === fileList.length) {
            setSelectedFiles([]); // 取消所有选中
        } else {
            const allFilePaths = fileList.map((file) => file.filename);
            setSelectedFiles(allFilePaths); // 选中所有文件
        }
    };

    const deleteSelectedFiles = async () => {
        if (!selectedWebdav) return;
        setLoading(true);

        for (const filePath of selectedFiles) {
            await selectedWebdav.deleteFileOrFolder(filePath);
        }

        setSelectedFiles([]); // 清空选中状态
        fetchFileList(selectedWebdav, currentDirectory); // 刷新文件列表
        setLoading(false);
    };

    // 删除文件或文件夹
    const handleDelete = async (filePath: string) => {
        if (!selectedWebdav) return;
        setLoading(true);
        const success = await selectedWebdav.deleteFileOrFolder(filePath);
        if (success) {
            showToast({message:'删除成功'});
            fetchFileList(selectedWebdav, currentDirectory); // 刷新当前目录
        }
        setLoading(false);
    };

    // 保存文件到本地
    const handleSaveToLocal = async (filePath: string) => {
        if (!selectedWebdav) return;
        setLoading(true);
        try {
            const fileName = filePath.split('/').pop();
            const basePath = `${AppPicturesBasePath}`;
            const dirExists = await RNFS.exists(basePath);
            if (!dirExists) {
                await RNFS.mkdir(basePath); // 创建目录
            }
            const destPath = basePath + `/${fileName}`;
            setLoading(true);
            await selectedWebdav.downloadFile(filePath, destPath);
            setLoading(false);
            showToast({message:'已保存到' + destPath});
        } catch (error) {
            showToast({message:'保存文件失败', backgroundColor: 'red'});
        }
        setLoading(false);
    };

    // 长按操作
    const handleLongPress = (item: any) => {
        Alert.alert('文件操作', '请选择操作', [
            { text: '保存到本地', onPress: () => handleSaveToLocal(item.filename) },
            { text: '删除', onPress: () => handleDelete(item.filename) },
            { text: '取消', style: 'cancel' },
        ]);
    };

    // 返回上一级目录
    const goBack = () => {
        if (currentDirectory === '/') return; // 如果已经是根目录，不能再返回
        const newDir = currentDirectory.substring(0, currentDirectory.lastIndexOf('/')) || '/';
        fetchFileList(selectedWebdav, newDir);
    };

    const handleUploadFile = async () => {
        if (!selectedWebdav){
            showToast({message:'请选择 WebDAV 配置', backgroundColor: 'red'});
            return;
        }
        const res = await DocumentPicker.pick({
            type: [DocumentPicker.types.allFiles],
            allowMultiSelection: true,
        });
        setLoading(true);
        for(let i in res){
            await uploadSingleFile(res[i]);
        }
        await fetchFileList(selectedWebdav, currentDirectory); // 刷新文件列表
        setLoading(false);
    };

    const uploadSingleFile = async (file:DocumentPickerResponse) => {
        try {
            const filePath = file.uri;
            const fileName = file.name;
            let dstPath = filePath;
            if (filePath.startsWith('content://')) {
                dstPath = RNFS.CachesDirectoryPath + '/tempFile';
                await RNFS.copyFile(filePath, dstPath);
            }
            const fileContentBase64 = await RNFS.readFile(filePath, 'base64');
            const arrayBuffer = base64ToArrayBuffer(fileContentBase64);

            await selectedWebdav.uploadFile(currentDirectory + '/' + fileName, arrayBuffer);
            showToast({message:'上传成功'});
            if (filePath.startsWith('content://')) {
                await RNFS.unlink(dstPath);
            }
        } catch (err) {
            if (DocumentPicker.isCancel(err)) {
                showToast({message:'已取消上传文件'});
            } else {
                showToast({message:'上传文件失败:'+err.toString(), backgroundColor: 'red'});
            }
        }
    };

    // 组件挂载时加载 WebDAV 配置
    useEffect(() => {
        loadWebdavConfigs();
    }, []);

    return (
        <View style={{ flex: 1, padding: 16, backgroundColor: '#f5f5f5' }}>
            {selectedWebdav ? (
                <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 18, marginBottom: 10 }}>当前目录: {currentDirectory}</Text>

                    {/* 返回上一级目录按钮 */}
                    {currentDirectory !== '/' && (
                        <TouchableOpacity onPress={goBack} style={[styles.buttonOutlined, { marginBottom: 16 }]}>
                            <Text style={styles.buttonTextOutlined}>返回上一级目录</Text>
                        </TouchableOpacity>
                    )}

                    {/* Upload file button */}
                    <TouchableOpacity onPress={handleUploadFile} style={styles.buttonContained}>
                        <Text style={styles.buttonTextContained}>上传文件</Text>
                    </TouchableOpacity>

                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginVertical: 10 }}>
                        <TouchableOpacity onPress={toggleSelectAll} style={styles.buttonOutlined}>
                            <Text style={styles.buttonTextOutlined}>{selectedFiles.length === fileList.length ? '取消全选' : '全选'}</Text>
                        </TouchableOpacity>

                        {selectedFiles.length > 0 && (
                            <TouchableOpacity onPress={deleteSelectedFiles} style={[styles.buttonContained, { backgroundColor: 'red' }]}>
                                <Text style={styles.buttonTextContained}>删除所选 ({selectedFiles.length})</Text>
                            </TouchableOpacity>
                        )}
                    </View>



                    {/* Loading Spinner */}
                    {loading && (
                        <ActivityIndicator size="large" color="#6200ee" style={{ marginBottom: 20 }} />
                    )}

                    <FlatList
                        data={fileList}
                        keyExtractor={(item, index) => index.toString()}
                        renderItem={({ item }) => {
                            const isSelected = selectedFiles.includes(item.filename);
                            return (
                            <View style={styles.card}>
                                <View style={styles.cardContent}>
                                    <TouchableOpacity
                                        onPress={async () => {
                                            if (item.type === 'directory') {
                                                const newDir = `${currentDirectory}/${item.basename}`.replace("//", "/"); // Fix double slashes
                                                fetchFileList(selectedWebdav, newDir);
                                            } else {
                                                const fileName = item.basename.split('/').pop();
                                                const destPath = `${ExternalCachesDirectoryPath}` + `/${fileName}`;
                                                try{
                                                    setLoading(true);
                                                    await selectedWebdav.downloadFile(`${currentDirectory}/${item.basename}`, destPath);
                                                    await FileViewer.open(destPath);
                                                }catch (e){
                                                    showToast({message: '失败:' + e, backgroundColor:'red', autoHide:false});
                                                }finally {
                                                    setLoading(false);
                                                }
                                            }
                                        }}
                                        onLongPress={() => handleLongPress(item)}
                                    >
                                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                            {item.type !== 'directory' && <Text style={{ fontSize: 24, marginRight: 8}} onPress={(e)=>{ e.stopPropagation();toggleSelectFile(item.filename)}}>
                                                {isSelected ? '✅' : '⬜'}
                                            </Text>}
                                            <Text style={{ fontSize: 20, marginRight: 8 }}>
                                                {item.type === 'directory' ? '📁' :
                                                    mimeIsImage(item.mime) ?
                                                        <Image
                                                            source={{uri: 'file://' + item.url}}
                                                            style={{ width: 50, height: 50, marginRight: 10 }}
                                                        /> : '📄'
                                                }
                                            </Text>
                                            <Text
                                                style={{
                                                    fontSize: 18,
                                                    color: item.type === 'directory' ? '#000' : '#555',
                                                    flexShrink: 1,
                                                    flexWrap: 'wrap',
                                                }}
                                            >
                                                {item.basename + '   '}
                                            </Text>
                                        </View>
                                    </TouchableOpacity>
                                </View>
                            </View>)}
                        }
                    />
                    <TouchableOpacity onPress={() => setSelectedWebdav(null)} style={[styles.buttonOutlined, { marginTop: 16 }]}>
                        <Text style={styles.buttonTextOutlined}>切换 WebDAV</Text>
                    </TouchableOpacity>
                </View>
            ) : (
                <View style={{ flex: 1 }}>
                    <FlatList
                        data={webdavConfigList}
                        keyExtractor={(item) => item.id}
                        renderItem={({ item }) => (
                            <View style={styles.card}>
                                <View style={styles.cardContent}>
                                    <TouchableOpacity onPress={() => selectWebdav(item)}>
                                        <Text style={{ fontSize: 18 }}>{item.webdavUrl}</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        onPress={() => {
                                            setSelectedConfig(item);
                                            setNewWebdav(item);
                                            setIsEditing(true);
                                            setDialogVisible(true);
                                        }}
                                        style={[styles.buttonContained, { marginTop: 8 }]}
                                    >
                                        <Text style={styles.buttonTextContained}>编辑</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        onPress={() => deleteWebdav(item.id)}
                                        style={[styles.buttonOutlined, { marginTop: 8 }]}
                                    >
                                        <Text style={styles.buttonTextOutlined}>删除</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        )}
                    />
                    <TouchableOpacity
                        style={styles.fab}
                        onPress={() => {
                            setDialogVisible(true);
                            setIsEditing(false);
                            setNewWebdav({ id: '', webdavUrl: '', username: '', password: '' });
                        }}
                    >
                        <Text style={styles.fabText}>+</Text>
                    </TouchableOpacity>
                </View>
            )}

            {/* Add/Edit WebDAV Dialog */}
            <Modal
                transparent={true}
                visible={dialogVisible}
                onRequestClose={() => setDialogVisible(false)}
            >
                <View style={styles.dialogOverlay}>
                    <View style={styles.dialog}>
                        <Text style={styles.dialogTitle}>{isEditing ? '编辑 WebDAV' : '添加 WebDAV'}</Text>
                        <View style={styles.dialogContent}>
                            <TextInput
                                placeholder="WebDAV 地址"
                                value={newWebdav.webdavUrl}
                                onChangeText={(text) => setNewWebdav({ ...newWebdav, webdavUrl: text })}
                                style={styles.textInput}
                            />
                            <TextInput
                                placeholder="用户名"
                                value={newWebdav.username}
                                onChangeText={(text) => setNewWebdav({ ...newWebdav, username: text })}
                                style={styles.textInput}
                            />
                            <TextInput
                                placeholder="密码"
                                value={newWebdav.password}
                                onChangeText={(text) => setNewWebdav({ ...newWebdav, password: text })}
                                secureTextEntry
                                style={styles.textInput}
                            />
                        </View>
                        <View style={styles.dialogActions}>
                            <TouchableOpacity onPress={() => setDialogVisible(false)} style={[styles.buttonOutlined, { marginRight: 8 }]}>
                                <Text style={[styles.buttonTextOutlined, {color: 'grey'}]}>取消</Text>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={addOrUpdateWebdav} style={styles.buttonContained}>
                                <Text style={styles.buttonTextContained}>{isEditing ? '更新' : '添加'}</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
};

const styles = StyleSheet.create({
    buttonContained: {
      backgroundColor: '#6200ee',
      paddingVertical: 8,
      paddingHorizontal: 12,
      borderRadius: 4,
      alignItems: 'center',
      justifyContent: 'center',
    },
    buttonOutlined: {
      borderColor: '#6200ee',
      borderWidth: 1,
      paddingVertical: 8,
      paddingHorizontal: 12,
      borderRadius: 4,
      alignItems: 'center',
      justifyContent: 'center',
    },
    buttonTextContained: {
      color: '#ffffff',
      fontSize: 14,
      fontWeight: 'bold',
    },
    buttonTextOutlined: {
      color: '#6200ee',
      fontSize: 14,
      fontWeight: 'bold',
    },
    card: {
      marginBottom: 8,
      borderRadius: 8,
      backgroundColor: '#ffffff',
      elevation: 1,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.2,
      shadowRadius: 1.41,
    },
    cardContent: {
      padding: 16,
    },
    fab: {
      position: 'absolute',
      bottom: 16,
      right: 16,
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: '#6200ee',
      alignItems: 'center',
      justifyContent: 'center',
      elevation: 8,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 4.65,
    },
    fabText: {
      color: '#ffffff',
      fontSize: 24,
    },
    dialogOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.5)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    dialog: {
      backgroundColor: '#ffffff',
      borderRadius: 8,
      padding: 20,
      width: '80%',
    },
    dialogTitle: {
      fontSize: 20,
      fontWeight: 'bold',
      marginBottom: 10,
    },
    dialogContent: {
      marginBottom: 20,
    },
    dialogActions: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
    },
    textInput: {
      borderBottomWidth: 1,
      borderBottomColor: '#cccccc',
      paddingBottom: 4,
      marginBottom: 12,
      fontSize: 16,
    },
  });

export default WebDAVScreen;
