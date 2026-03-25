import React, { useState, useEffect } from 'react';
import { ScrollView, Text, View, StyleSheet } from 'react-native';

const MessageDetailScreen = ({ route }) => {
    const { title: initialTitle, message: initialMessage } = route.params;

    const [title, setTitle] = useState(initialTitle);
    const [message, setMessage] = useState(initialMessage);

    useEffect(() => {
        setTitle(route.params.title);
        setMessage(route.params.message);
    }, [route.params]);

    return (
        <View style={styles.container}>
            <Text style={styles.title}>{title}</Text>
            <ScrollView style={styles.messageContainer} contentContainerStyle={{ paddingBottom: 20 }}>
                <Text selectable style={styles.messageText}>{message}</Text>
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f9f9f9', padding: 20 },
    title: { fontSize: 20, fontWeight: 'bold', color: '#333', marginBottom: 15 },
    messageContainer: { flex: 1, backgroundColor: '#fff', borderRadius: 10, padding: 15 },
    messageText: { fontSize: 16, lineHeight: 24, color: '#555' },
});

export default MessageDetailScreen;
