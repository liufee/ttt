import React, { useEffect, useState, useLayoutEffect, useRef } from 'react';
import {View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert, NativeModules} from 'react-native';
import fullLang from '../../config/_generated/lang.json';
import {useSetting} from '../../provider/setting';
import Loading from '../../components/loading';
import WordService from '../../services/dictionary/word';
import {RememberWordItem} from '../../services/dictionary/model';
import {Progress} from '../../constant';
import {getProgress, saveProgress} from '../../config';
import DictionaryService from '../../services/dictionary';
import Toast from '../../components/toast';

const language = fullLang.dictionary;

const RememberWordScreen = ({ navigation }) => {
    const [loading, setLoading] = useState<boolean>(false);
    const [showTranslation, setShowTranslation] = useState(true);
    const [showExamples, setShowExamples] = useState(false);
    const [wordList, setWordList] = useState<RememberWordItem[]>([]);
    const [page, setPage] = useState<number>(1);
    const [totalCount, setTotalCount] = useState<number>(0);
    const [initialScrollY, setInitialScrollY] = useState<number>(0);
    const [showToast, setShowToast] = useState<boolean>(false);
    const [toastMessage, setToastMessage] = useState<string>('');

    const scrollRef = useRef(null);

    const wordService = WordService.getInstance();
    const dictionaryService = DictionaryService.getInstance();

    const {setting} = useSetting();

    const pageSize = setting.dictionary.rememberWordPageSize;


    const savePageToCache = async (pageNum: number) => {
        try {
            await saveProgress(Progress.RememberWordPage, pageNum);
        } catch (err) {
            Alert.alert(language.fail, err);
        }
    };

    const loadPageFromCache = async (): Promise<number> => {
        try {
            return await getProgress(Progress.RememberWordPage) || 1;
        } catch {
            return 1;
        }
    };

    // 新增：保存滚动位置
    const saveScrollY = async (y: number) => {
        try { await saveProgress(Progress.RememberWordScrollY, y); } catch {}
    };

    // 新增：获取滚动位置
    const loadScrollY = async (): Promise<number> => {
        try {
            return await getProgress(Progress.RememberWordScrollY) || 0;
        } catch { return 0; }
    };

    const handleSaveSearchHis = async (entry:RememberWordItem) => {
        const [result, err] = await dictionaryService.saveSearchHistory(entry.word, entry.translation);
        let message = err;
        if(result){
            message = language.success;
        }
        setToastMessage(message);
        setShowToast(true);
    };

    const toggleTranslation = () => setShowTranslation(prev => !prev);
    const toggleExamples = () => setShowExamples(prev => !prev);

    const goPage = async (newPage: number) => {
        setLoading(true);
        setPage(newPage);
        await savePageToCache(newPage);
        const [success, rows] = await wordService.getWordsByPage(newPage, pageSize);
        if(!success){
            Alert.alert(language.fail, rows as any);
            return;
        }
        setWordList(rows);
        setLoading(false);
    };

    useEffect(() => {
        const init = async () => {
            setLoading(true);
            const cachedPage = await loadPageFromCache();
            const cachedScroll = await loadScrollY();

            setPage(cachedPage);
            setInitialScrollY(cachedScroll);

            const [success, rows] = await wordService.getWordsByPage(cachedPage, pageSize);
            if(!success){
                Alert.alert(language.fail, rows as any);
                return;
            }
            setWordList(rows);

            const [isSuccess, count] = await wordService.getTotalPage();
            if(!isSuccess){
                Alert.alert(language.fail, rows as any);
                return;
            }
            setTotalCount(count);
            setLoading(false);
        };
        init();
    }, []);

    useLayoutEffect(() => {
        navigation.setOptions({
            headerRight: () => (
                <View style={styles.headerControls}>
                    <TouchableOpacity onPress={toggleTranslation} style={styles.headerBtn}>
                        <Text style={{...styles.headerBtnText, width:100, textAlign:'right'}}>{showTranslation ? language.hideChinese : language.showChinese}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={toggleExamples} style={styles.headerBtn}>
                        <Text style={{...styles.headerBtnText, width:100, textAlign:'right'}}>{showExamples ? language.hideExample : language.showExample}</Text>
                    </TouchableOpacity>
                </View>
            ),
        });
    }, [showTranslation, showExamples, totalCount]);

    const totalPages = Math.ceil(totalCount / pageSize);

    if(loading){
        return <Loading loadingText={language.loading}></Loading>;
    }

    return (
        <View style={styles.container}>
            <Toast visible={showToast} backgroundColor={toastMessage === language.success ? 'green' : 'red'} message={toastMessage} onDismiss={() => setShowToast(false)}></Toast>
            {wordList.length === 0 ? (
                <Text style={styles.noResults}>没有单词</Text>
            ) : (
                <>
                    <ScrollView
                        ref={scrollRef}
                        style={{ flex: 1 }}
                        onScroll={e => saveScrollY(e.nativeEvent.contentOffset.y)}
                        scrollEventThrottle={200}
                        onContentSizeChange={() => {
                            if (initialScrollY > 0 && scrollRef.current) {
                                scrollRef.current.scrollTo({ y: initialScrollY, animated: false });
                            }
                        }}
                    >
                        {wordList.map((entry, idx) => (
                            <View key={idx} style={styles.resultItem}>

                                <View style={styles.wordRow}>
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.word}>
                                            {entry.word}
                                            <TouchableOpacity onPress={() => NativeModules.RNHelper.playSound(`https://assets.feehi.com/audio/oxford-5000-pronunciation/${entry.word}.mp3`/*cfg.httpProxyLink.replaceAll('/p?url=', '/oxford?url=') + entry.us_mp3*/)} style={styles.speakerBtn}>
                                                <Text style={styles.speakerText}>🔊</Text>
                                            </TouchableOpacity>
                                        </Text>
                                        {entry.phonetics_us && (
                                            <Text style={styles.pronunciation}>
                                                {entry.phonetics_us}
                                            </Text>
                                        )}
                                    </View>

                                    <Text style={styles.typeLevel}>
                                        {idx + 1}｜{entry.type}｜{entry.level + '  '}
                                    </Text>

                                    <TouchableOpacity onPress={async ()=>await handleSaveSearchHis(entry)} ><Text style={{ fontSize: 20, fontWeight:'bold', position: 'absolute', color: '#999', bottom: -10 }}>+</Text></TouchableOpacity>
                                </View>

                                {showTranslation && (
                                    <Text style={styles.translation}>{entry.translation}</Text>
                                )}

                                {showExamples && entry.examples.trim() && (
                                    <View style={styles.examplesContainer}>
                                        {entry.examples.split('||').map((ex, i) => (
                                            <View key={i} style={styles.exampleRow}>
                                                <Text style={styles.exampleBullet}>•</Text>
                                                <Text style={styles.exampleText}>{ex}</Text>
                                            </View>
                                        ))}
                                    </View>
                                )}
                            </View>
                        ))}
                    </ScrollView>

                    <View style={styles.pagination}>
                        <TouchableOpacity disabled={page <= 1} onPress={() => goPage(page - 1)}>
                            <Text style={[styles.pageBtn, page <= 1 && styles.disabled]}>{language.prevPage}</Text>
                        </TouchableOpacity>
                        <Text style={styles.pageInfo}>{page}/{totalPages}</Text>
                        <TouchableOpacity disabled={page >= totalPages} onPress={() => goPage(page + 1)}>
                            <Text style={[styles.pageBtn, page >= totalPages && styles.disabled]}>{language.nextPage}</Text>
                        </TouchableOpacity>
                    </View>
                </>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f7f9fc', paddingHorizontal: 20, paddingTop: 40 },
    headerControls: { flexDirection: 'row', alignItems: 'center', right: 10 },
    headerBtn: { marginLeft: 10 },
    headerBtnText: { fontSize: 14, color: '#4CAF50' },
    noResults: { textAlign: 'center', fontSize: 18, color: '#B1B1B1', marginTop: 50 },
    resultItem: {
        backgroundColor: '#fff',
        marginBottom: 12,
        padding: 15,
        borderRadius: 12,
        shadowColor: '#000',
        shadowOpacity: 0.1,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 5 },
    },
    wordRow: { flexDirection: 'row', alignItems: 'flex-start' },
    pronunciation: { fontSize: 14, color: '#4CAF50', marginTop: 2 },
    speakerBtn: { marginLeft: 0, marginTop: 3 },
    speakerText: { fontSize: 18, position:'relative', left: 25, top: 5 },
    word: { fontSize: 20, fontWeight: '600', color: '#333', flexShrink: 1, flexWrap: 'wrap' },
    translation: { fontSize: 16, color: '#777', marginTop: 8, width: '100%' },
    typeLevel: { fontSize: 14, color: '#999', marginLeft: 10, textAlign: 'right', flexShrink: 1, flexWrap: 'wrap', width:'40%' },
    examplesContainer: { marginTop: 8 },
    exampleRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 10 },
    exampleBullet: { fontSize: 14, color: '#555', width: 12 },
    exampleText: { fontSize: 14, color: '#555', flex: 1, flexWrap: 'wrap' },
    pagination: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingVertical: 15 },
    pageBtn: { fontSize: 16, color: '#4CAF50', marginHorizontal: 20, width: 60 },
    disabled: { color: '#B1B1B1' },
    pageInfo: { fontSize: 16, color: '#333' },
});

export default RememberWordScreen;
