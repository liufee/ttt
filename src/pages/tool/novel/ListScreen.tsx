import React, { useEffect, useState } from 'react';
import { View, FlatList, Text, TextInput, StyleSheet, ActivityIndicator, Button, Alert } from 'react-native';
import Novel from '../../../db/novel';
import {Picker} from '@react-native-picker/picker';
import DocumentPicker from 'react-native-document-picker';
import novel, {Platforms} from './model';
import {getABSPath} from '../../../utils';

interface SearchNovelParams{
    page:string
    platform:string
    limit:string
    keyword:string
}
interface PendingSearchNovelParams{
    limit:string
    keyword:string
    page:string
}

const NovelList = ({ navigation }) => {
    const [loading, setLoading] = useState(false);
    const [novels, setNovels] = useState<[novel]>([]);
    const [novelsTotalCount, setNovelsTotalCount] = useState<number>(0);

    const novelRepository:Novel = Novel.getInstance();

    const [searchNovelParams, setSearchNovelParams] = useState<SearchNovelParams>({
        page:'1',
        platform:'0',
        limit:'100',
        keyword:'',
    });

    const getOffset = ()=>{
        return (Number(searchNovelParams.page) - 1) * Number(searchNovelParams.limit)
    };

    const [pendingSearchNovelParams, setPendingSearchNovelParams] = useState<PendingSearchNovelParams>({
        page: '1',
        limit:'100',
        keyword:'',
    });

    const handleSelectDBFile = async () => {
        try {
            // 打开文件选择器，限制选择文件类型为所有文件
            const res = await DocumentPicker.pickSingle({
                type: [DocumentPicker.types.allFiles],  // 可以根据需要调整文件类型
            });

            // 获取文件路径
            await novelRepository.changeDataBase( getABSPath(res.uri) )
            await doSearch();

        } catch (err) {
            if (DocumentPicker.isCancel(err)) {
            } else {
                console.log('Error:', err);
                Alert.alert('失败', 'Failed to pick file');
            }
        }
    };

    const handlePendingSearchNovelParams = (key:string, value:string)=>{
        setPendingSearchNovelParams((prev) => ({ ...prev, [key]: value }));
    };

    const handleSearch = () => {
        setSearchNovelParams((prev) => ({
            ...prev,
            ...pendingSearchNovelParams,
        }));
    };

    const doSearch = async ()=>{
        setLoading(true);
        const result = await novelRepository.searchNovels(searchNovelParams.page,getOffset(), searchNovelParams.limit, searchNovelParams.keyword, searchNovelParams.platform);
        setNovels(result.items);
        setNovelsTotalCount(result.total);
        setLoading(false);
    };
    useEffect(() => {
        setTimeout(doSearch, 100);
    }, [searchNovelParams]);

    const renderItem = ({ item }) => {
        return(
        <Text
            style={styles.item}
            onPress={() => navigation.navigate('NovelDetail', {id: item.id})}
        >
            {Platforms[item.platform] || 'Unknown'} - {item.title}
        </Text>);
    };
    if (loading){
        return <ActivityIndicator size="large" color="#0000ff" />
    }

    return (
        <View style={styles.container}>
            <View style={styles.keywordSearchArea}>
                <View style={{flex:0.2, padding: 10, marginBottom: 10 }}><Button title="DB" onPress={handleSelectDBFile} /></View>
                <TextInput
                    style={styles.searchBox}
                    placeholder="Search"
                    value={pendingSearchNovelParams.keyword}
                    onChangeText={(keyword:string)=>{
                        handlePendingSearchNovelParams('keyword', keyword)}
                    }
                    onSubmitEditing={(e)=>{
                        setSearchNovelParams((prev) => ({ ...prev, 'keyword':pendingSearchNovelParams.keyword , 'page':'1'}))}
                    }
                />
                <Text style={{flex:0.4, padding: 10, marginBottom: 10}}>{novelsTotalCount}, {getOffset() +1} -{getOffset() + Number(searchNovelParams.limit)}</Text>
            </View>
            <FlatList
                data={novels}
                keyExtractor={(item) => item.id.toString()}
                renderItem={renderItem}
            />

            <View style={styles.pagination}>
                <Picker
                    selectedValue={searchNovelParams.platform}
                    onValueChange={(platform:string) => {
                        setSearchNovelParams((prev) => ({ ...prev, platform }))}
                    }
                    style={{ height: 50, width: 30 }}
                >
                    {Object.entries(Platforms).map(([key, value]) => (
                        <Picker.Item key={key} label={value} value={key} />
                    ))}
                </Picker>
                <Button
                    disabled={searchNovelParams.page > 1 ? false : true}
                    title="上页"
                    onPress={
                        ()=> {
                            const p = Number(searchNovelParams.page) - 1;
                            if(p<=0){return}
                            setSearchNovelParams((prev) => ({ ...prev, 'page': p.toString() }))
                            handlePendingSearchNovelParams('page', p.toString())}
                    }
                />
                <Text></Text>
                <Button
                    title="下页"
                    disabled={novels.length < searchNovelParams.limit ? true : false}
                    onPress={()=>{
                        const p=Number(searchNovelParams.page)+1;
                        searchNovelParams.page = p.toString()
                        setSearchNovelParams((prev) => ({ ...prev, 'page':p.toString() }))
                        handlePendingSearchNovelParams('page', p.toString())}
                    }
                />
                <Text>页码</Text>
                <TextInput
                    style={styles.pageNum}
                    value={pendingSearchNovelParams.page}
                    onChangeText={(page)=>{
                        handlePendingSearchNovelParams('page',page)
                    }}
                    keyboardType='numeric'
                    placeholder='page'
                />
                <Text>每页</Text>
                <TextInput
                    style={styles.limitNum}
                    value={pendingSearchNovelParams.limit}
                    keyboardType='numeric'
                    placeholder='limit'
                    onChangeText={(limit:string)=>handlePendingSearchNovelParams('limit', limit )}
                />
                <Button title='Go ' onPress={handleSearch} />
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, padding: 10 },
    keywordSearchArea: {
        flexDirection: 'row', // 子元素水平排列
        flexWrap: 'nowrap',   // 不允许换行
        justifyContent: 'center', // 子元素间距处理，可选
        alignItems: 'center', // 垂直居中对齐
    },
    searchBox: {
        borderWidth: 1,
        borderColor: '#ccc',
        borderRadius: 8,
        padding: 10,
        marginBottom: 10,
        flex: 0.4,
    },
    item: { padding: 10, borderBottomWidth: 1, borderBottomColor: '#eee' },
    pagination: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 20,
    },
    pageNum: {
        borderWidth: 1,
        borderColor: '#ccc',
        padding: 10,
        marginRight: 10,
        width: 60,
        textAlign: 'center',
    },
    limitNum: {
        borderWidth: 1,
        borderColor: '#ccc',
        padding: 10,
        marginRight: 10,
        width: 60,
        textAlign: 'center',
    },
});

export default NovelList;
