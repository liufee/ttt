import React, {useEffect, useState} from 'react';
import {View, Text, StyleSheet, ActivityIndicator} from 'react-native';
import { WebView } from 'react-native-webview';
import NovelRepository from '../../../db/novel';
import Novel from './model';

const Reader = ({ route }) => {
    const [novel, setNovel] = useState<Novel>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const { id } = route.params;

    const novelRepository:NovelRepository = NovelRepository.getInstance();

    const getNovel = async()=>{
        setLoading(true);
        const result = await novelRepository.getNovel(id);
        setLoading(false);
        setNovel(result[0] as any);
    };

    useEffect(() => {
        getNovel();
    }, []);

    if (loading){
        return <ActivityIndicator size="large" color="#0000ff" />
    }

    const content = `<html>
    <head>
       <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
      <meta name="apple-mobile-web-app-capable" content="yes">
      <meta name="apple-mobile-web-app-status-bar-style" content="black">
      <meta name="format-detection" content="telephone=no">
   
    </head>
    <body>
` + novel.content + `</body></html>`

    return (
        <View style={styles.container}>
            <Text style={styles.title}>{novel.title}</Text>
            <WebView
                scalesPageToFit={true}    // 启用自适应页面大小
                style={{ flex: 1 }}
                originWhitelist={['*']}  // 允许加载所有来源的资源
                source={{ html: content}}  // 显示本地 HTML 内容
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, padding: 10 },
    title: { fontSize: 15, fontWeight: 'bold', marginBottom: 10 },
    content: { fontSize: 16, lineHeight: 24 },
});

export default Reader;
