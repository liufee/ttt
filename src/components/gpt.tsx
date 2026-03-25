import React, { useState, useRef } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    ScrollView,
    StyleSheet,
    ActivityIndicator,
} from 'react-native';
import Markdown from 'react-native-markdown-display';
import { Picker } from '@react-native-picker/picker';
import config from '../config';
import {userErrorMessage} from '../utils';

const ChatWindow = ({embeddingVersion, initEmbeddings = async ()=>{}, getCurrentPrompt = async (query:string)=>{}, commands}) => {
    const aiModels = config.aiModels;
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [selectedModel, setSelectedModel] = useState(aiModels[0]);
    const scrollRef = useRef();

    const appendMessage = (from, text) => {
        setMessages((prev) => [...prev, { id: Date.now() + Math.random(), from, text }]);
    };

    const sendMessage = async (content) => {
        const userText = content || input.trim();
        if (!userText || loading) return;
        appendMessage('user', userText);
        setInput('');
        setLoading(true);
        const currentPrompt = await getCurrentPrompt(userText);
        const fullContext = [...messages.map(m => ({ role: m.from === 'user' ? 'user' : 'assistant', content: m.text })), { role: 'user', content: currentPrompt }];
        try {
            const res = await fetch(selectedModel.url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${selectedModel.apiKey}`,
                },
                body: JSON.stringify({
                    model: selectedModel.model,
                    messages: fullContext,
                }),
            });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = await res.json();
            const reply = data.choices?.[0]?.message?.content?.trim() || '🤖 无回复';
            appendMessage('bot', reply);
        } catch (err) {
            appendMessage('bot', '❌ 请求失败：' + userErrorMessage(err));
        } finally {
            setLoading(false);
        }
    };

    const renderMessage = (m) => (
        <View
            key={m.id}
            style={[styles.bubble, m.from === 'user' ? styles.userBubble : styles.botBubble]}
        >
            <Markdown style={markdownStyles}>{m.text}</Markdown>
        </View>
    );

    const renderCommand = ({ label, text }) => (
        <TouchableOpacity
            key={label}
            style={styles.commandButton}
            onPress={() => sendMessage(text)}
        >
            <Text style={styles.commandText}>{label}</Text>
        </TouchableOpacity>
    );

    return (
        <View style={styles.wrapper}>
            <View style={styles.topContainer}>
                {initEmbeddings && <>
                    <TouchableOpacity style={styles.embeddingButton} onPress={async ()=>{
                        try {
                            setLoading(true);
                            await initEmbeddings();
                        }catch (e){

                        }finally {
                            setLoading(false);
                        }
                    }
                    }>
                        <Text style={{ color: '#fff' }}>更新</Text>
                    </TouchableOpacity>
                    <Text style={styles.modelText}>{embeddingVersion}     </Text>
                </>}
                <Picker
                    selectedValue={selectedModel}
                    style={styles.picker}
                    itemStyle={{ fontSize: 12 }}
                    mode="dropdown"
                    onValueChange={setSelectedModel}
                >
                    {aiModels.map((m) => (
                        <Picker.Item key={m.model} label={m.model} value={m} />
                    ))}
                </Picker>
                <TouchableOpacity style={styles.embeddingButton} onPress={async ()=>{setMessages([])}}>
                    <Text style={{ color: '#fff' }}>清空</Text>
                </TouchableOpacity>
            </View>
            <ScrollView
                ref={scrollRef}
                style={styles.chatContainer}
                onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
            >
                {messages.map(renderMessage)}
                {loading && <ActivityIndicator style={{ margin: 10 }} />}
            </ScrollView>

            <View style={styles.commandBar}>{commands.map(renderCommand)}</View>

            <View style={styles.inputContainer}>
                <TextInput
                    style={styles.input}
                    value={input}
                    onChangeText={setInput}
                    placeholder="请输入..."
                    multiline
                    editable={!loading}
                    onSubmitEditing={() => sendMessage()}
                />
                <TouchableOpacity
                    style={[styles.sendButton, loading && { backgroundColor: '#aaa' }]}
                    onPress={() => sendMessage()}
                    disabled={loading}
                >
                    <Text style={styles.sendText}>发送</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    wrapper: { flex: 1, backgroundColor: '#f5f5f5' },
    chatContainer: { flex: 1, padding: 12 },
    bubble: {
        padding: 10,
        marginVertical: 6,
        borderRadius: 10,
        maxWidth: '80%',
    },
    userBubble: { alignSelf: 'flex-end', backgroundColor: '#dcf8c6' },
    botBubble: { alignSelf: 'flex-start', backgroundColor: '#eee' },
    inputContainer: {
        flexDirection: 'row',
        borderTopWidth: 1,
        borderTopColor: '#ddd',
        padding: 10,
        backgroundColor: '#fff',
    },
    input: {
        flex: 1,
        backgroundColor: '#eee',
        borderRadius: 20,
        paddingHorizontal: 15,
        paddingVertical: 10,
        fontSize: 16,
        maxHeight: 120,
    },
    sendButton: {
        backgroundColor: '#007AFF',
        borderRadius: 20,
        justifyContent: 'center',
        paddingHorizontal: 16,
        marginLeft: 8,
    },
    sendText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
    commandBar: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        backgroundColor: '#fff',
        paddingVertical: 6,
        paddingHorizontal: 10,
        borderTopWidth: 1,
        borderTopColor: '#ddd',
    },
    commandButton: {
        backgroundColor: '#007AFF',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 14,
        margin: 4,
    },
    commandText: { color: '#fff', fontSize: 14 },
    topContainer: {
        flexDirection: 'row',        // 一行展示
        alignItems: 'center',        // 垂直居中
        backgroundColor: '#fff',
        padding: 0,
        gap: 3,                     // 元素之间留点间距（可选）
    },
    modelText: {
        fontSize: 12,
    },
    embeddingButton: {
        backgroundColor: '#007AFF',
        paddingHorizontal: 5,
        paddingVertical: 3,
        borderRadius: 6,
    },

    picker: {
        flex: 1,  // 让它填充剩余空间
    },
});

const markdownStyles = {
    body: { fontSize: 16, color: '#000' },
    code_block: { backgroundColor: '#eee', padding: 6, borderRadius: 6 },
    fence: { backgroundColor: '#eee', padding: 6, borderRadius: 6 },
    inlineCode: { backgroundColor: '#ddd', padding: 2, borderRadius: 4 },
};

export default ChatWindow;
