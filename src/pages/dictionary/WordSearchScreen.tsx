import React, {useRef, useState} from 'react';
import {NativeModules, View, TextInput, Text, TouchableOpacity, StyleSheet} from 'react-native';
import fullLang from '../../config/_generated/lang.json';
import DictionaryService from '../../services/dictionary';
import {SearchResult} from '../../services/dictionary/model';
import {useToast} from '../../provider/toast';
import config from '../../config';

const language = fullLang.dictionary;

const WordSearchScreen = () => {
    const [query, setQuery] = useState<string>('');
    const [results, setResults] = useState<SearchResult[]>([]);
    const [loading, setLoading] = useState<number>(-1);//-1待查询，0查询中，1本地查询完毕，2网络查询完毕
    const savedSearch = useRef(null);

    const dictionaryService =  DictionaryService.getInstance();
    const {showToast} = useToast();

    const saveSearchHis = async (word, translation)=>{
        if( savedSearch.current === word ){//已经保存过了
            return;
        }
        savedSearch.current = word;
        await dictionaryService.saveSearchHistory(word, translation);
    };

    const handleSearch = async () => {
        setLoading(0);
        setResults([]);

        let searchResults = [];
        // 查找本地查询结果
        setLoading(1);
        const [result, searchResult, err] = await dictionaryService.searchWord(query);
        if(!result){
            showToast({message: err, backgroundColor: 'red'});
        }
        if(searchResult != null) {
            searchResults.push(searchResult);
            setResults(searchResults);
            await saveSearchHis(query, searchResult.translation);
        }

        setLoading(2);
        const [remoteResult, remoteSearchResult, remoteErr] = await dictionaryService.searchWordRemote(query);
        if(!remoteResult){
            showToast({message: remoteErr, backgroundColor: 'red'});
        }
        if(remoteSearchResult != null) {
            if(searchResult != null) {
               setResults([searchResult, remoteSearchResult]);
            }else{
                setResults([remoteSearchResult]);
            }
            await saveSearchHis(query, remoteSearchResult.translation);
        }
    };

    const handlePlayAudio = (word:string) => {
        //NativeModules.RNHelper.playSound(`https://translate.google.com/translate_tts?ie=UTF-8&q=${word}&tl=en&client=tw-ob`)
        NativeModules.RNHelper.playSound(config.httpProxyLink + `https://api.dictionaryapi.dev/media/pronunciations/en/${word}-us.mp3`);
    };

    return (
        <View style={styles.container}>
            <TextInput
                style={styles.input}
                value={query}
                onChangeText={setQuery}
                placeholder={language.writeChineseOrEnglish}
                placeholderTextColor="#B1B1B1"
            />
            <TouchableOpacity style={styles.searchButton} onPress={handleSearch} disabled={loading === 0}>
                <Text style={styles.searchButtonText}>{loading === 0 ? language.searching + '...' : language.search}</Text>
            </TouchableOpacity>

            <View style={styles.resultsContainer}>
                {results.length === 0 && loading > 0 ? (
                    <Text style={styles.noResults}>{language.noSearchResult}</Text>
                ) : (
                    results.map((result, index) => (
                        <View key={index} style={styles.resultItem}>
                            {result.isLocal &&  <Text style={styles.localLabel}>{language.localResult}</Text>}
                            {!result.isLocal &&  <Text style={styles.localLabel}>{language.internetResult}</Text>}
                            <Text style={styles.word}>
                                {result.word}
                                { (results.length === 1 || index === 0 ) &&
                                    <TouchableOpacity style={{position:'relative'}} onPress={() => handlePlayAudio(result.word)}>
                                    <Text style={{...styles.audioButtonText,top:5,left:10}}>🔊</Text>
                                    </TouchableOpacity>
                                }
                            </Text>

                            {result.isLocal ? (
                                <Text style={styles.translation}>{result.translation}</Text>
                            ) : (
                                <Text style={styles.translation}>{result.translation}</Text>
                            )}
                        </View>
                    ))
                )}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f7f9fc',
        paddingHorizontal: 20,
        paddingTop: 40,
        justifyContent: 'flex-start',
    },
    input: {
        height: 45,
        borderColor: '#E0E0E0',
        borderWidth: 1,
        borderRadius: 25,
        paddingLeft: 15,
        fontSize: 16,
        marginBottom: 15,
        backgroundColor: '#fff',
        color: '#333',
    },
    searchButton: {
        backgroundColor: '#4CAF50',
        borderRadius: 30,
        paddingVertical: 10,
        alignItems: 'center',
        marginBottom: 20,
    },
    searchButtonText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold',
        width: 60,
    },
    resultsContainer: {
        flex: 1,
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
    word: {
        fontSize: 20,
        fontWeight: '600',
        color: '#333',
    },
    translation: {
        fontSize: 16,
        color: '#777',
        marginVertical: 6,
    },
    localLabel: {
        fontSize: 14,
        color: '#FF5722',
        marginTop: 6,
    },
    example: {
        fontSize: 16,
        color: '#555',
        marginVertical: 6,
    },
    audioButtonText: {
        color: '#fff',
        fontSize: 18,
    },
});

export default WordSearchScreen;
