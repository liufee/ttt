import React, {useEffect, useState} from 'react';
import {
    View,
    TextInput,
    Button,
    FlatList,
    Text,
    StyleSheet,
    Alert,
    TouchableOpacity,
} from 'react-native';
import { Weibo } from '../../services/weibo/model';
import { WeiboItem } from './components/WeiboItem';
import WeiboService from '../../services/weibo';
import { format, set } from 'date-fns';
import DatePickerPanel from '../../components/datePickerPanel';
import {Picker} from '@react-native-picker/picker';
import {useSetting} from '../../provider/setting';
import {getEnabledUsers} from '../../services/weibo/data';

const limit = 10;

const WeiboSearch = ({}) => {
    const {setting} = useSetting();
    const [keyword, setKeyword] = useState<string>('');
    const [weibos, setWeibos] = useState<Weibo[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const [startDate, setStartDate] = useState<Date | null>(null);
    const [endDate, setEndDate] = useState<Date | null>(null);
    const [isPanelVisible, setIsPanelVisible] = useState(false);
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
    const [isSettingStartDate, setIsSettingStartDate] = useState(true);
    const [uid, setUid] = useState<string>('0');

    const weiboService = WeiboService.getInstance();
    const enabledUsers = getEnabledUsers(setting.weibo.enabledUsers, setting.weibo.anonymous);

    useEffect(() => {
        searchWeibo();
    }, [sortOrder]);

    const toggleSortOrder = () => {
        setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc');
    };

    const togglePanel = () => {
        setIsPanelVisible(!isPanelVisible);
    };

    const searchWeibo = async () => {
        if (isPanelVisible) {
            setIsPanelVisible(false);
        }
        if (!keyword.trim()) {
            setWeibos([]);
            return;
        }
        setIsLoading(true);
        const start = startDate ? format(startDate, 'yyyy-MM-dd 00:00:00') : undefined;
        const end = endDate ? format(endDate, 'yyyy-MM-dd 23:59:59') : undefined;
        const [result, newWeibos, err] = await weiboService.getWeiboByPage(uid, 1, 0, limit, keyword, start, end, sortOrder);
        if (!result) {
            setIsLoading(false);
            Alert.alert('失败', err);
            return;
        }
        setWeibos(newWeibos);
        setPage(2);
        setHasMore(newWeibos.length === limit);
        setIsLoading(false);
    };

    const loadMoreWeibos = async () => {
        if (isLoading || !hasMore) { return; }
        setIsLoading(true);
        try {
            const start = startDate ? format(startDate, 'yyyy-MM-dd 00:00:00') : undefined;
            const end = endDate ? format(endDate, 'yyyy-MM-dd 23:59:59') : undefined;
            const [result, newWeibos, err] = await weiboService.getWeiboByPage(uid, page, (page - 1) * limit, limit, keyword, start, end, sortOrder);
            if (!result) {
                setIsLoading(false);
                Alert.alert('失败', err);
                return;
            }
            setWeibos((prevWeibos) => [...prevWeibos, ...newWeibos]);
            setPage(page + 1);
            setHasMore(newWeibos.length === limit);
        } catch (error) {
            Alert.alert('失败', error);
        }
        setIsLoading(false);
    };

    const handleDateSelect = (newDate?: Date) => {
        if (newDate === undefined) {
            setStartDate(null);
            setEndDate(null);
            setIsSettingStartDate(true);
            return;
        }
        setIsSettingStartDate(prevIsSetting => {
            if (prevIsSetting) {
                setStartDate(newDate);
                return false; // new value for isSettingStartDate
            } else {
                setEndDate(newDate);
                return true; // new value for isSettingStartDate
            }
        });
    };

    const initialDisplayDate = (isSettingStartDate ? startDate : endDate) || set(new Date(), { hours: 0, minutes: 0, seconds: 0, milliseconds: 0 });

    return (
        <View style={styles.container}>
            <View style={styles.searchContainer}>
                <Picker
                    selectedValue={uid as any}
                    onValueChange={(itemValue) => setUid(itemValue)}
                    style={styles.picker}
                >
                    {[{'id': '0', 'name': '全部', 'avatar': ''}, ...enabledUsers].map((user) => (
                        <Picker.Item key={user.id} label={user.name} value={user.id as any} />
                    ))}
                </Picker>
                <TextInput
                    style={styles.input}
                    value={keyword}
                    onChangeText={setKeyword}
                    placeholder="请输入关键字"
                    onSubmitEditing={searchWeibo}
                />
                <Button title="搜索" onPress={searchWeibo} />
                <TouchableOpacity onPress={togglePanel} style={styles.iconButton}>
                    <Text>📅</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={toggleSortOrder} style={styles.iconButton}>
                    <Text>{sortOrder === 'desc' ? '⬇️' : '⬆️'}</Text>
                </TouchableOpacity>
            </View>

            {isPanelVisible && (
                <View style={styles.panelContainer}>
                    <View style={styles.dateSwitchContainer}>
                        <TouchableOpacity onPress={() => setIsSettingStartDate(true)} style={[styles.dateSwitch, isSettingStartDate && styles.dateSwitchActive]}>
                            <Text>开始: {startDate ? format(startDate, 'yyyy-MM-dd') : '未设置'}    </Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => setIsSettingStartDate(false)} style={[styles.dateSwitch, !isSettingStartDate && styles.dateSwitchActive]}>
                            <Text>结束: {endDate ? format(endDate, 'yyyy-MM-dd') : '未设置'}    </Text>
                        </TouchableOpacity>
                    </View>
                    <DatePickerPanel onDateSelect={handleDateSelect} initialDisplayDate={initialDisplayDate} />
                </View>
            )}

            {isLoading && page === 1 ? (
                <Text style={styles.loadingText}>加载中...</Text>
            ) : (
                <FlatList
                    data={weibos}
                    renderItem={({ item }) => <WeiboItem item={item} />}
                    keyExtractor={(item) => item.id.toString()}
                    onEndReached={loadMoreWeibos}
                    onEndReachedThreshold={0.1}
                    ListFooterComponent={isLoading && page > 1 ? <Text style={styles.loadingText}>加载更多...</Text> : null}
                />
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 10,
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 15,
    },
    input: {
        flex: 1,
        borderWidth: 1,
        borderColor: '#ccc',
        padding: 8,
        marginRight: 5,
    },
    iconButton: {
        paddingLeft: 8,
        paddingTop: 8,
        paddingBottom: 8,
    },
    panelContainer: {
        borderWidth: 1,
        borderColor: '#ccc',
        borderRadius: 5,
        padding: 10,
        marginBottom: 10,
    },
    dateSwitchContainer: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        marginBottom: 10,
    },
    dateSwitch: {
        padding: 10,
        borderWidth: 1,
        borderColor: '#ccc',
        borderRadius: 5,
    },
    dateSwitchActive: {
        backgroundColor: 'lightblue',
    },
    loadingText: {
        textAlign: 'center',
        padding: 10,
        color: '#888',
    },
    picker: {
        height: 50,
        width: 110,
    },
});

export default WeiboSearch;
