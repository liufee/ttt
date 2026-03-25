import React, {useEffect, useLayoutEffect, useState} from 'react';
import {View, Text, TextInput, TouchableOpacity, StyleSheet, Alert} from 'react-native';
import fullLang from '../../config/_generated/lang.json';
import DictionaryService from '../../services/dictionary';
import {SearchHistory, Status} from '../../services/dictionary/model';

const language = fullLang.dictionary;

const WordTestScreen = ({navigation}) => {
    const [input, setInput] = useState<string>('');
    const [isCorrect, setIsCorrect] = useState<boolean>(null);
    const [currentWord, setCurrentWord] = useState<SearchHistory>(null);
    const [totalCount, setTotalCount] = useState<number>(0);


    const dictionaryService = DictionaryService.getInstance();

    const handleInputChange = (text) => {
        setInput(text);
        setIsCorrect(null);  // 重置错误状态
    };

    const getNewCount = async ()=>{
        setTotalCount(await dictionaryService.getSearchHisCountByStatus(Status.StatusRemembered));
    };

    const refreshNewWord = async ()=>{
        getNewCount();
        const [success, searchHis, err] = await dictionaryService.getRememberedSearchHistory();
        if(!success){
            Alert.alert(language.fail, err);
            return;
        }

        if(searchHis.length === 0){
            setCurrentWord(null);
        }else{
            setCurrentWord(searchHis[0]);
        }
        setInput('');
        setIsCorrect(null);
    };

    useEffect(()=>{
        refreshNewWord();
    }, []);

    useLayoutEffect(() => {
        navigation.setOptions({
            tabBarLabel: language.wordTest + (totalCount !== 0 ? '(' + totalCount + ')' : ''),
        });
    }, [totalCount]);

    const handleTest = () => {
        const isCorrectAnswer = currentWord.translation.toLowerCase() === input.toLowerCase() || currentWord.word.toLowerCase() === input.toLowerCase();
        if (isCorrectAnswer) {
            setIsCorrect(true);
            setTimeout(async () => {
                await dictionaryService.deleteSearchHistory(currentWord.id); // 正确答案后删除单词
                await refreshNewWord();
            }, 1000); // 延迟删除，显示用户已答对
        } else {
            setIsCorrect(false);
        }
    };

    const handleSkip = async () => {
        getNewCount();
        const [success, searchHis, err] = await dictionaryService.getRememberedSearchHistory();
        if(!success){
            Alert.alert(language.fail, err);
            return;
        }

        if(searchHis.length === 0){
            setCurrentWord(null);
        }else{
            setCurrentWord(searchHis[Math.floor(Math.random() * searchHis.length)]);
        }
        setInput('');
        setIsCorrect(null);
    };

    const handleDelete = ()=>{
        Alert.alert(
            language.surelyToDelete,  // 标题
            language.originWordIs + ': ' + currentWord.word,  // 内容
            [
                {
                    text: language.cancel,
                    style: 'cancel',
                },
                {
                    text: language.confirm,
                    onPress: async () => {
                        await dictionaryService.deleteSearchHistory(currentWord.id)
                        refreshNewWord();
                    },
                },
            ]
        );
    };

    if(currentWord === null){
        return  (<View style={{...styles.container}}>
            <Text style={styles.wordToGuess}>
                {language.noWords}
            </Text></View>);
    }

    return (
        <View style={{...styles.container}}>
            <Text style={styles.wordToGuess}>
                {currentWord.translation}
            </Text>
            <TextInput
                style={styles.input}
                placeholder={language.writeWord}
                value={input}
                onChangeText={handleInputChange}
            />
            {isCorrect === null ? (
                <TouchableOpacity style={styles.testButton} onPress={handleTest}>
                    <Text style={styles.testButtonText}>{language.ok}</Text>
                </TouchableOpacity>
            ) : isCorrect ? (
                <Text style={styles.correctText}>{language.correct}</Text>
            ) : (
                <Text style={styles.errorText}>{language.wrongTrayAgain}</Text>
            )}

            <View style={styles.rowButtons}>
                <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
                    <Text style={styles.skipButtonText}>{language.skip}</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.deleteButton} onPress={handleDelete}>
                    <Text style={styles.skipButtonText}>{language.delete}</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f7f9fc',
        padding: 20,
        justifyContent: 'center',
        alignItems: 'center',
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 30,
    },
    wordToGuess: {
        fontSize: 25,
        color: '#444',
        marginBottom: 20,
        width:'100%',
        textAlign: 'center',
    },
    input: {
        height: 50,
        borderColor: '#ddd',
        borderWidth: 1,
        paddingHorizontal: 10,
        marginBottom: 20,
        borderRadius: 8,
        width: '80%',
        fontSize: 16,
    },
    testButton: {
        backgroundColor: '#4CAF50',
        paddingVertical: 12,
        paddingHorizontal: 30,
        borderRadius: 8,
        marginBottom: 20,
    },
    testButtonText: {
        color: '#fff',
        fontSize: 18,
        width: 50,
        textAlign: 'center',
    },
    skipButton: {
        backgroundColor: '#FFC107',
        paddingVertical: 12,
        paddingHorizontal: 30,
        borderRadius: 8,
    },
    skipButtonText: {
        color: '#fff',
        fontSize: 18,
        width: 60,
        textAlign: 'center',
    },
    correctText: {
        fontSize: 20,
        color: '#4CAF50',
        marginBottom: 20,
        width: '100%',
        textAlign: 'center',
    },
    errorText: {
        fontSize: 20,
        color: '#FF5722',
        marginBottom: 20,
    },
    deleteButton: {
        backgroundColor: 'red',
        paddingVertical: 12,
        paddingHorizontal: 30,
        borderRadius: 8,
    },
    rowButtons: {
        flexDirection: 'row',
        gap: 20,
        marginTop: 20,
    },
});

export default WordTestScreen;
