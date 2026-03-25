import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    ScrollView,
    StyleSheet,
    ActivityIndicator,
    TextInput,
    TouchableOpacity,
} from 'react-native';
import RNFS from 'react-native-fs';
import { useRoute } from '@react-navigation/native';
import {useToast} from '../../../provider/toast';
import {getAbsPathFileExplorer} from '../../../utils';

export default function App() {
    const route = useRoute<{ params: { url: string } }>();
    const {showToast} = useToast();

    // 文件内容状态
    const [content, setContent] = useState('');
    const [loading, setLoading] = useState(true);
    const [isJson, setIsJson] = useState(false);

    // 编辑模式状态
    const [editMode, setEditMode] = useState(false);
    const [editText, setEditText] = useState('');

    // 页面初始化或 url 改变时读取文件
    useEffect(() => {
        handleOpenFile(route.params.url);
    }, [route.params.url]);

    // 打开文件
    async function handleOpenFile(uri: string) {
        try {
            setLoading(true);
            const text = await RNFS.readFile(uri, 'utf8');
            try {
                const obj = JSON.parse(text);
                setContent(JSON.stringify(obj, null, 2));
                setIsJson(true);
            } catch {
                setContent(text);
                setIsJson(false);
            }
        } catch (e) {
            showToast({message: `打开文件失败${String(e)}`, backgroundColor:'red', autoHide:false});
        } finally {
            setLoading(false);
        }
    }

    // 保存编辑内容
    async function handleSave() {
        try {
            setLoading(true);
            let path = route.params.url;
            if (route.params.url.startsWith('content://')) {
                path = getAbsPathFileExplorer(route.params.url);
            }
            await RNFS.writeFile(path, editText, 'utf8');
            setEditMode(false);
            handleOpenFile(route.params.url);
            showToast({ message: '保存成功', backgroundColor: 'green' });
        } catch (e) {
            showToast({ message: `保存失败: ${String(e)}`, backgroundColor: 'red' });
        } finally {
            setLoading(false);
        }
    }

    // 美化 JSON
    function handleBeautify() {
        try {
            const obj = JSON.parse(editText);
            setEditText(JSON.stringify(obj, null, 2));
        } catch {
            // 非 JSON 不处理
        }
    }

    // JSON 高亮渲染
    const renderJsonText = (jsonStr: string) => {
        // 按行渲染，每行再按 token 分片
        return jsonStr.split('\n').map((line, idx) => {
            const tokens: Array<{ text: string; style: any }> = [];

            const regex = /("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(\.\d+)?([eE][+-]?\d+)?|[{}\[\],:])/g;
            let match;
            let lastIndex = 0;

            while ((match = regex.exec(line)) !== null) {
                if (match.index > lastIndex) {
                    tokens.push({ text: line.slice(lastIndex, match.index), style: styles.text });
                }

                const token = match[0];
                let style = styles.text;

                if (/^".*"\s*:/.test(token)) style = styles.key;          // key
                else if (/^".*"$/.test(token)) style = styles.string;    // string
                else if (/true|false/.test(token)) style = styles.boolean; // boolean
                else if (/null/.test(token)) style = styles.null;        // null
                else if (/[\{\}\[\],:]/.test(token)) style = styles.punctuation; // punctuation
                else if (/^-?\d+(\.\d+)?([eE][+-]?\d+)?$/.test(token)) style = styles.number; // number

                tokens.push({ text: token, style });
                lastIndex = regex.lastIndex;
            }

            if (lastIndex < line.length) {
                tokens.push({ text: line.slice(lastIndex), style: styles.text });
            }

            return (
                <Text key={idx} style={styles.line}>
                    {tokens.map((t, i) => (
                        <Text key={i} style={t.style}>{t.text}</Text>
                    ))}
                </Text>
            );
        });
    };

    if (loading) {
        return (
            <View style={styles.center}>
                <ActivityIndicator size="large" />
                <Text>读取文件中…</Text>
            </View>
        );
    }

    return (
        <View style={{ flex: 1 }}>
            <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 32 }}>
                {/* 顶部按钮：编辑或编辑模式操作 */}
                <View style={styles.toolbar}>
                    {!editMode && (
                        <TouchableOpacity
                            onPress={() => {
                                setEditText(content);
                                setEditMode(true);
                            }}
                            style={styles.toolButton}
                        >
                            <Text style={styles.toolText}>编辑</Text>
                        </TouchableOpacity>
                    )}
                    {editMode && (
                        <>
                            <TouchableOpacity onPress={handleBeautify} style={styles.toolButton}>
                                <Text style={styles.toolText}>美化</Text>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={handleSave} style={styles.toolButton}>
                                <Text style={styles.toolText}>保存</Text>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => setEditMode(false)} style={styles.toolButton}>
                                <Text style={styles.toolText}>取消</Text>
                            </TouchableOpacity>
                        </>
                    )}
                </View>

                {editMode ? (
                    <TextInput
                        value={editText}
                        onChangeText={setEditText}
                        multiline
                        autoCorrect={false}
                        autoCapitalize="none"
                        style={styles.editor}
                    />
                ) : isJson ? (
                    <View style={styles.codeBlock}>{renderJsonText(content)}</View>
                ) : (
                    <Text selectable style={styles.plainText}>
                        {content}
                    </Text>
                )}
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
        padding: 16,
    },
    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    error: {
        color: 'red',
        fontWeight: 'bold',
        marginBottom: 8,
        fontSize: 16,
    },
    errorText: {
        color: 'red',
    },
    plainText: {
        fontSize: 14,
        lineHeight: 22,
        fontFamily: 'Courier',
        backgroundColor: '#f6f8fa',
        padding: 12,
        borderRadius: 6,
    },
    codeBlock: {
        backgroundColor: '#f6f8fa',
        padding: 12,
        borderRadius: 6,
    },
    line: {
        flexDirection: 'row',
        flexWrap: 'wrap',
    },
    text: {
        color: '#333',
    },
    key: {
        color: '#007acc', // 蓝色
    },
    string: {
        color: '#008000', // 绿色
    },
    number: {
        color: '#b58900', // 黄色/橙色
    },
    boolean: {
        color: '#6a0dad', // 紫色
    },
    null: {
        color: '#808080', // 灰色
    },
    punctuation: {
        color: '#333', // 深灰
    },
    editor: {
        fontSize: 14,
        lineHeight: 22,
        fontFamily: 'Courier',
        backgroundColor: '#f6f8fa',
        padding: 12,
        borderRadius: 6,
        minHeight: 400,
        textAlignVertical: 'top',
    },
    toolbar: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        marginBottom: 8,
    },
    toolButton: {
        marginLeft: 16,
        paddingHorizontal: 12,
        paddingVertical: 6,
        backgroundColor: '#f0f0f0',
        borderRadius: 6,
    },
    toolText: {
        color: '#007aff',
        fontSize: 16,
    },
});
