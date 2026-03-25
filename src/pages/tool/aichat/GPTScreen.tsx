import React, { useState, useRef, useEffect } from 'react';
import {
    SafeAreaView,
    View,
    Text,
    TextInput,
    TouchableOpacity,
    ScrollView,
    StyleSheet,
    Alert,
    ActivityIndicator,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import Markdown from 'react-native-markdown-display';
import RNFS from 'react-native-fs';
import config from '../../../config';
import {APPRuntimePath} from '../../../constant';
import {useToast} from '../../../provider/toast';

const STORAGE_PATH = `${APPRuntimePath}/gpt_chat_sessions.json`;
const genId = () => Date.now().toString();

export default function GPTScreen() {
    const [sessions, setSessions] = useState([]);
    const [currentSessionId, setCurrentSessionId] = useState(null);
    const [input, setInput] = useState('');
    const scrollRef = useRef();

    const {showToast} = useToast();

    const aiModels = config.aiModels;

    const saveToFile = async (data) => {
        try {
            await RNFS.writeFile(STORAGE_PATH, JSON.stringify(data), 'utf8');
        } catch (err) {
            showToast({message:`保存失败:${err.toString()}`, backgroundColor:'red'});
        }
    };

    const loadFromFile = async () => {
        try {
            const parts = STORAGE_PATH.split('/');
            parts.pop();
            const path = parts.join('/') || '/';
            const existed = await RNFS.exists(path);
            if (!existed) {
                await RNFS.mkdir(path);
            }
            const exists = await RNFS.exists(STORAGE_PATH);
            if (exists) {
                const content = await RNFS.readFile(STORAGE_PATH, 'utf8');
                return JSON.parse(content);
            }
        } catch (err) {
            console.error('读取失败:', err);
        }
        return null;
    };

    useEffect(() => {
        (async () => {
            const saved = await loadFromFile();
            if (saved) {
                setSessions(saved);
                setCurrentSessionId(saved[saved.length - 1]?.id);
            } else {
                const firstSession = {
                    id: genId(),
                    title: '会话 1',
                    messages: [],
                    context: [],
                    model: aiModels[0],
                    loading: false,
                };
                setSessions([firstSession]);
                setCurrentSessionId(firstSession.id);
            }
        })();
    }, []);

    useEffect(() => {
        if (sessions.length > 0) {
            saveToFile(sessions);
        }
    }, [sessions]);

    const currentSession = sessions.find(s => s.id === currentSessionId);

    const updateSession = (id, dataOrFn) => {
        setSessions(prev => {
            const updated = prev.map(s => {
                if (s.id !== id) return s;
                const changes = typeof dataOrFn === 'function' ? dataOrFn(s) : dataOrFn;
                return { ...s, ...changes };
            });
            return updated;
        });
    };

    const sendMessage = async () => {
        if (!input.trim() || !currentSession || currentSession.loading) return;

        const userMessage = { from: 'user', text: input, id: Date.now() };
        const botId = Date.now() + 1;

        updateSession(currentSession.id, s => ({
            messages: [...s.messages, userMessage, { from: 'bot', text: '', id: botId }],
            context: [...s.context, { role: 'user', content: input }],
            loading: true,
        }));

        setInput('');

        try {
            const res = await fetch(currentSession.model.url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${currentSession.model.apiKey}`,
                },
                body: JSON.stringify({
                    model: currentSession.model.model,
                    messages: [...currentSession.context, { role: 'user', content: input }],
                }),
            });

            if (!res.ok) throw new Error(`HTTP ${res.status}`);

            const data = await res.json();
            const reply = data.choices?.[0]?.message?.content?.trim() || '🤖 无回复';

            let current = '';
            const chars = reply.split('');
            for (let i = 0; i < chars.length; i++) {
                current += chars[i];
                updateSession(currentSession.id, s => ({
                    messages: s.messages.map(m =>
                        m.id === botId ? { ...m, text: current } : m
                    ),
                }));
                await new Promise(r => setTimeout(r, 15));
            }

            updateSession(currentSession.id, s => ({
                context: [...s.context, { role: 'assistant', content: reply }],
            }));
        } catch (e) {
            updateSession(currentSession.id, s => ({
                messages: [
                    ...s.messages,
                    { from: 'bot', text: '❌ 请求失败，请检查网络或API KEY', id: Date.now() },
                ],
            }));
        } finally {
            updateSession(currentSession.id, { loading: false });
        }
    };

    const addSession = () => {
        const newSession = {
            id: genId(),
            title: `会话 ${sessions.length + 1}`,
            messages: [],
            context: [], //{ role: 'system', content: '' }
            model: aiModels[0],
            loading: false,
        };
        setSessions([...sessions, newSession]);
        setCurrentSessionId(newSession.id);
    };

    const deleteSession = (id) => {
        if (sessions.length === 1) {
            showToast({message:'至少保留一个会话', backgroundColor:'red'});
            return;
        }
        const filtered = sessions.filter(s => s.id !== id);
        setSessions(filtered);
        if (currentSessionId === id) {
            setCurrentSessionId(filtered[0].id);
        }
    };

    const clearAllSessions = () => {
        Alert.alert('确认', '确定要删除所有会话吗？此操作不可撤销。', [
            { text: '取消', style: 'cancel' },
            {
                text: '确定',
                onPress: () => {
                    const firstSession = {
                        id: genId(),
                        title: '会话 1',
                        messages: [],
                        context: [],
                        model: aiModels[0],
                        loading: false,
                    };
                    setSessions([firstSession]);
                    setCurrentSessionId(firstSession.id);
                    setInput('');
                },
            },
        ]);
    };

    const renderMessage = (msg) => {
        const isUser = msg.from === 'user';
        return (
            <View
                key={msg.id}
                style={[styles.bubble, isUser ? styles.userBubble : styles.botBubble]}
            >
                <Markdown style={markdownStyles}>{msg.text}</Markdown>
            </View>
        );
    };

    const renderSessionTab = (session) => {
        const isActive = session.id === currentSessionId;
        return (
            <TouchableOpacity
                key={session.id}
                style={[styles.sessionTab, isActive && styles.sessionTabActive]}
                onPress={() => setCurrentSessionId(session.id)}
                onLongPress={() =>
                    Alert.alert('删除会话', `删除“${session.title}”？`, [
                        { text: '取消', style: 'cancel' },
                        { text: '确定', onPress: () => deleteSession(session.id) },
                    ])
                }
            >
                <Text style={styles.sessionTitle} numberOfLines={1}>{session.title}</Text>
            </TouchableOpacity>
        );
    };

    const renderModelSelector = () => (
        <View style={styles.modelPickerContainer}>
            <Picker
                selectedValue={currentSession?.model || aiModels[0]}
                onValueChange={(value) => updateSession(currentSession.id, { model: value })}
                style={styles.picker}
                itemStyle={{ fontSize: 12, margin:0, padding:0 }}
                mode="dropdown"
            >
                {aiModels.map((m) => (
                    <Picker.Item label={m.model} value={m} key={m} />
                ))}
            </Picker>
        </View>
    );

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.sessionsBar}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    {sessions.map(renderSessionTab)}
                    <TouchableOpacity style={styles.addButton} onPress={addSession}>
                        <Text style={styles.addButtonText}>＋ </Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.clearButton} onPress={clearAllSessions}>
                        <Text style={styles.clearButtonText}>清空</Text>
                    </TouchableOpacity>
                </ScrollView>
            </View>
            {renderModelSelector()}

            <ScrollView
                style={styles.messagesContainer}
                ref={scrollRef}
                onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
            >
                {(currentSession?.messages || []).map(renderMessage)}
                {currentSession?.loading && <ActivityIndicator style={{ margin: 10 }} />}
            </ScrollView>

            <View style={styles.inputContainer}>
                <TextInput
                    style={styles.input}
                    placeholder="请输入你的问题..."
                    value={input}
                    onChangeText={setInput}
                    multiline
                    editable={!currentSession?.loading}
                    onSubmitEditing={sendMessage}
                    returnKeyType="send"
                />
                <TouchableOpacity
                    style={[styles.sendButton, currentSession?.loading && { backgroundColor: '#aaa' }]}
                    onPress={sendMessage}
                    disabled={currentSession?.loading}
                >
                    <Text style={styles.sendText}>发送</Text>
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f5f5f5' },
    sessionsBar: {
        flexDirection: 'row',
        backgroundColor: '#fff',
        borderBottomColor: '#ddd',
        borderBottomWidth: 1,
        paddingVertical: 8,
        paddingHorizontal: 4,
    },
    sessionTab: {
        paddingHorizontal: 14,
        paddingVertical: 8,
        marginHorizontal: 4,
        borderRadius: 16,
        backgroundColor: '#eee',
        maxWidth: 120,
    },
    sessionTabActive: { backgroundColor: '#007AFF' },
    sessionTitle: { color: '#333', fontWeight: '600' },
    addButton: {
        justifyContent: 'center',
        paddingHorizontal: 12,
        marginHorizontal: 4,
        borderRadius: 16,
        backgroundColor: '#28a745',
    },
    addButtonText: { color: '#fff', fontWeight: '600' },
    clearButton: {
        justifyContent: 'center',
        paddingHorizontal: 12,
        marginHorizontal: 4,
        borderRadius: 16,
        backgroundColor: '#dc3545',
    },
    clearButtonText: { color: '#fff', fontWeight: '600' },
    // model选择框放右边且横向布局好看
    modelPickerContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginLeft: 0,
        backgroundColor: '#fff',
        height: 20,
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 6,
        paddingHorizontal: 0,
    },
    picker: {
        width: '100%',
        fontSize: 10,
    },
    messagesContainer: { flex: 1, padding: 12 },
    bubble: {
        maxWidth: '75%',
        padding: 10,
        marginVertical: 6,
        borderRadius: 12,
    },
    userBubble: { backgroundColor: '#dcf8c6', alignSelf: 'flex-end' },
    botBubble: { backgroundColor: '#ececec', alignSelf: 'flex-start' },
    messageText: { fontSize: 16, lineHeight: 22 },
    inputContainer: {
        flexDirection: 'row',
        padding: 10,
        borderTopColor: '#ddd',
        borderTopWidth: 1,
        backgroundColor: '#fff',
    },
    input: {
        flex: 1,
        backgroundColor: '#eee',
        borderRadius: 20,
        paddingHorizontal: 15,
        paddingVertical: 8,
        fontSize: 16,
        maxHeight: 100,
    },
    sendButton: {
        backgroundColor: '#007AFF',
        justifyContent: 'center',
        paddingHorizontal: 16,
        marginLeft: 10,
        borderRadius: 20,
    },
    sendText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
});

const markdownStyles = {
    body: { fontSize: 16, color: '#000', lineHeight: 22 },
    code_block: { backgroundColor: '#eee', padding: 6, borderRadius: 6 },
    fence: { backgroundColor: '#eee', padding: 6, borderRadius: 6 },
    inlineCode: { backgroundColor: '#ddd', padding: 2, borderRadius: 4 },
};
