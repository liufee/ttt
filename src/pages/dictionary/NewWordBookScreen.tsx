import React, {useEffect, useLayoutEffect, useState} from 'react';
import {Alert, ScrollView, StyleSheet, Switch, Text, TouchableOpacity, View} from 'react-native';
import fullLang from '../../config/_generated/lang.json';
import {useFocusEffect} from '@react-navigation/native';
import DictionaryService from '../../services/dictionary';
import {SearchHistory, Status} from '../../services/dictionary/model';

const language = fullLang.dictionary;

const WordBookScreen = ({ navigation }) => {
    const [showTranslation, setShowTranslation] = useState<boolean>(true);
    const [wordBook, setWordBook] = useState<SearchHistory[]>([]);
    const [totalCount, setTotalCount] = useState<Number>(0);
    const toggleTranslation = () => {
        setShowTranslation((prev) => !prev);
    };

    const dictionaryService = DictionaryService.getInstance();

    const getSearchHis = async()=>{
        const [success, rows, err] = await dictionaryService.searchHis();
        if(!success){
            Alert.alert('失败', err);
            return;
        }
        setWordBook(rows);
    };

    const getNewCount = async ()=>{
        setTotalCount(await dictionaryService.getSearchHisCountByStatus(Status.StatusInit));
    };

    useEffect(()=>{
        getSearchHis();
        getNewCount();
    }, []);

    useFocusEffect(()=>{
        setTimeout(async ()=>{
            await getSearchHis();
            await getNewCount();
        }, 100);
    });

    useLayoutEffect(() => {
        getNewCount();
        navigation.setOptions({
            headerRight: () => (
                <View style={styles.switchContainer}>
                    <Text style={styles.switchLabel}>{language.showTranslation}</Text>
                    <Switch
                        value={showTranslation}
                        onValueChange={toggleTranslation}
                        thumbColor="#fff"
                        trackColor={{ false: '#B1B1B1', true: '#4CAF50' }}
                    />
                </View>
            ),
            tabBarLabel: language.newWord + (totalCount !== 0 ? '(' + totalCount + ')' : ''),
        });
    }, [showTranslation, totalCount]);

    const handleDelete = async (id)=>{
        const [success, err] = await dictionaryService.updateStatus(id, Status.StatusRemembered);
        if(!success){
            Alert.alert(language.fail, err);
            return;
        }
        await getSearchHis();
        await getNewCount();
    };

    return (
        <View style={styles.container}>
            {wordBook.length === 0 ? (
                <Text style={styles.noResults}>{language.noNewWords}</Text>
            ) : (
                <ScrollView style={{ flex: 1 }}>
                    {
                        wordBook.map((entry, index) => (
                            <View key={index} style={styles.resultItem}>
                            <View style={styles.wordRow}>
                                <Text style={styles.word}>{entry.word}</Text>
                                {showTranslation && (
                                    <Text style={styles.translation}>{entry.translation}</Text>
                                )}
                                <TouchableOpacity
                                    style={styles.deleteButton}
                                    onPress={() => handleDelete(entry.id)}
                                >
                                <Text style={styles.deleteButtonText}>{language.delete}</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                        ))
                    }
                </ScrollView>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f7f9fc',
        paddingHorizontal: 20,
        paddingTop: 40,
    },
    switchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        right:10,
    },
    switchLabel: {
        fontSize: 16,
        color: '#333',
        marginRight: 10,
        width: 130,
        textAlign: 'right',
    },
    noResults: {
        textAlign: 'center',
        fontSize: 18,
        color: '#B1B1B1',
    },
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
    wordRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    word: {
        fontSize: 20,
        fontWeight: '600',
        color: '#333',
        flex: 1,
    },
    translation: {
        fontSize: 16,
        color: '#777',
        flex: 2,
    },
    deleteButton: {
        backgroundColor: '#FF5722',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        alignItems: 'center',
    },
    deleteButtonText: {
        color: '#fff',
        fontSize: 12,
        width: 39,
        textAlign: 'center',
    },
});

export default WordBookScreen;
