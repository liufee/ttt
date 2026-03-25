import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TextInput, Switch, Button, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import {useSetting} from '../../provider/setting';
import {Setting} from '../../services/setting';
import {usernames} from '../../services/weibo/data';
import {useToast} from '../../provider/toast';
import {useLoading} from '../../provider/loading';

// 输入框
const ConfigInput = React.memo(({ label, value, onChangeText, keyboardType, ...props }) => (
    <View style={styles.inputContainer}>
        <Text style={styles.inputLabel}>{label}</Text>
        <TextInput
            value={value}
            onChangeText={onChangeText}
            style={styles.input}
            keyboardType={keyboardType || 'default'}
            {...props}
        />
    </View>
));

// 开关组件
const ConfigSwitch = React.memo(({ label, value, onValueChange }) => (
    <View style={styles.switchContainer}>
        <Text style={styles.inputLabel}>{label}</Text>
        <Switch value={value} onValueChange={onValueChange} />
    </View>
));

// 单选按钮组件（Bootstrap风格）
const ConfigRadioButton = React.memo(({ label, options, value, onValueChange }) => (
    <View style={styles.radioContainer}>
        <Text style={styles.inputLabel}>{label}</Text>
        <View style={styles.radioOptions}>
            {options.map(({ label: optionLabel, value: optionValue }) => (
                <View key={optionValue} style={styles.radioOption}>
                    <RadioButton
                        label={optionLabel}
                        selected={value === optionValue}
                        onPress={() => onValueChange(optionValue)}
                    />
                </View>
            ))}
        </View>
    </View>
));

const RadioButton = React.memo(({ label, selected, onPress }) => (
    <View style={styles.radioButtonContainer}>
        <View
            style={[
                styles.radioButtonCircle,
                selected && styles.radioButtonSelected,
            ]}
            onStartShouldSetResponder={onPress}
        />
        <Text style={styles.radioButtonLabel}>{label}</Text>
    </View>
));

const Checkbox = React.memo(({ label, options, selectedValues, onValueChange }) => {
    const toggleSelection = useCallback((value) => {
        if (selectedValues.includes(value)) {
            onValueChange(selectedValues.filter((item) => item !== value));
        } else {
            onValueChange([...selectedValues, value]);
        }
    }, [selectedValues, onValueChange]);

    return (
        <View style={styles.checkboxContainer}>
            <Text style={styles.checkboxLabel}>{label}</Text>
            <View style={styles.checkboxOptionsContainer}>
                {options.map(({ label: optionLabel, value: optionValue }) => (
                    <TouchableOpacity
                        key={optionValue}
                        style={styles.checkboxOption}
                        onPress={() => toggleSelection(optionValue)}
                    >
                        <View style={[styles.checkbox, selectedValues.includes(optionValue) && styles.checkboxChecked]} />
                        <Text style={styles.checkboxOptionLabel}>{optionLabel}</Text>
                    </TouchableOpacity>
                ))}
            </View>
        </View>
    );
});

const SettingsScreen = () => {
    const { setting, updateSetting } = useSetting();
    const [localSetting, setLocalSetting] = useState<Setting>(setting);
    const {showLoading, hideLoading} = useLoading();
    const {showToast} = useToast();

    useEffect(() => {
        setLocalSetting(setting);
    }, [setting]);

    const saveConfig = async () => {
        showLoading('保存中');
        const [success, err] = await updateSetting(localSetting);
        hideLoading();
        if(success){
            showToast({message: '保存成功'});
            return;
        }
        showToast({message: '保存失败: ' + err, backgroundColor: 'red'});
    };

    // 使用useCallback优化配置更新函数
    const updateGlobalConfig = useCallback((key, value) => {
        setLocalSetting(prevConfig => ({
            ...prevConfig,
            global: {
                ...prevConfig.global,
                [key]: value,
            },
        }));
    }, []);

    const updateExerciseConfig = useCallback((key, value) => {
        setLocalSetting(prevConfig => ({
            ...prevConfig,
            exercise: {
                ...prevConfig.exercise,
                [key]: value,
            },
        }));
    }, []);

    const updateWeiboConfig = useCallback((key, value) => {
        setLocalSetting(prevConfig => ({
            ...prevConfig,
            weibo: {
                ...prevConfig.weibo,
                [key]: value,
            },
        }));
    }, []);

    const updateDictionaryConfig = useCallback((key, value) => {
        setLocalSetting(prevConfig => ({
            ...prevConfig,
            dictionary: {
                ...prevConfig.dictionary,
                [key]: value,
            },
        }));
    }, []);

    const updateToolConfig = useCallback((key, value) => {
        setLocalSetting(prevConfig => ({
            ...prevConfig,
            tool: {
                ...prevConfig.tool,
                [key]: value,
            },
        }));
    }, []);

    return (
        <View style={styles.container}>
            <ScrollView>
                <Text style={styles.header}>应用设置</Text>
                {/* 数据库设置 */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>全局设置</Text>
                    <ConfigSwitch
                        label="开启Debug"
                        value={localSetting.global.debugMode}
                        onValueChange={(value) => updateGlobalConfig('debugMode', value)}
                    />
                    <ConfigInput
                        label="数据库后缀"
                        value={localSetting.global.dbSuffix}
                        onChangeText={(value) => updateGlobalConfig('dbSuffix', value)}
                    />
                    <ConfigRadioButton
                        label="go服务地址"
                        value={localSetting.global.goServerAPIURL}
                        options={[
                            { label: 'local ', value: 'http://192.168.1.2:8080' },
                            {label: 'gcp ', value: 'http://gcp.feehi.com:8080'},
                        ]}
                        onValueChange={(value) => updateGlobalConfig('goServerAPIURL', value)}
                    />
                    <ConfigRadioButton
                        label="默认页面"
                        value={localSetting.global.defaultPage}
                        options={[
                            { label: '智能 ', value: 'wise' },
                            { label: '导航 ', value: 'index' },
                            { label: '微博 ', value: 'weibo' },
                            { label: '运动 ', value: 'exercise' },
                            { label: '孩子 ', value: 'children' },
                            { label: '工具 ', value: 'tool' },
                            { label: '字典 ', value: 'dictionary' },
                        ]}
                        onValueChange={(value) => updateGlobalConfig('defaultPage', value)}
                    />
                </View>

                {/* 运动设置 */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>运动设置</Text>
                    <ConfigSwitch
                        label="跑步仅记时"
                        value={localSetting.exercise.runningWithoutPosition}
                        onValueChange={(value) => updateExerciseConfig('runningWithoutPosition', value)}
                    />
                    <ConfigSwitch
                        label="手动录入跑步"
                        value={localSetting.exercise.showHandInputRunRecord}
                        onValueChange={(value) => updateExerciseConfig('showHandInputRunRecord', value)}
                    />
                    <ConfigRadioButton
                        label="记录显示时间段"
                        value={localSetting.exercise.showRecordsListPeriod}
                        options={[
                            { label: '全部 ', value: 0 },
                            { label: '近15天', value: 1 },
                            { label: '近3月 ', value: 2 },
                            { label: '近6个月 ', value: 3 },
                            { label: '近1年 ', value: 4 },
                        ]}
                        onValueChange={(value) => updateExerciseConfig('showRecordsListPeriod', value)}
                    />
                    <ConfigSwitch
                        label="开启TSR"
                        value={localSetting.exercise.enableTSR}
                        onValueChange={(value) => updateExerciseConfig('enableTSR', value)}
                    />
                </View>
                {/* 微博设置 */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>微博设置</Text>
                    <Checkbox
                        label="新闻媒体"
                        options={[
                            { label: '联合早报', value: 'zaobao' },
                            { label: '纽约时报', value: 'nytimes' },
                            { label: '彭博社', value: 'bloomberg' },
                            { label: '生活科学', value: 'liveScience' },
                            { label: '路透社', value: 'routers' },
                            { label: 'BBC ', value: 'bbc' },
                            { label: '天空新闻', value: 'sky' },
                            { label: '金融时报', value: 'ft' },
                            { label: '经济学人', value: 'economist' },
                            { label: '卫报', value: 'guardian' },
                            { label: '法广新闻', value: 'rfi' },
                        ]}
                        selectedValues={localSetting.weibo.newsMedia || []}
                        onValueChange={(values) => updateWeiboConfig('newsMedia', values)}
                    />
                    <ConfigSwitch
                        label="详情页显示转发引用"
                        value={localSetting.weibo.detailPageShowRepost}
                        onValueChange={(value) => updateWeiboConfig('detailPageShowRepost', value)}
                    />
                    <ConfigRadioButton
                        label="内容展示类型"
                        value={localSetting.weibo.contentType}
                        options={[
                            { label: 'all ', value: 'all' },
                            { label: 'raw ', value: 'raw' },
                            { label: 'parsed ', value: 'parsed' },
                        ]}
                        onValueChange={(value) => updateWeiboConfig('contentType', value)}
                    />
                    <ConfigSwitch
                        label="开启TSR"
                        value={localSetting.weibo.enableTSR}
                        onValueChange={(value) => updateWeiboConfig('enableTSR', value)}
                    />
                    <Checkbox
                        label="启用用户"
                        options={usernames.map(item=>({
                            label:item.name,
                            value:item.id,
                        }))}
                        selectedValues={localSetting.weibo.enabledUsers || []}
                        onValueChange={(values) => updateWeiboConfig('enabledUsers', values)}
                    />
                    <ConfigRadioButton
                        label="默认用户"
                        value={localSetting.weibo.defaultUser}
                        options={usernames.map(item=>({
                            label:item.name,
                            value:item.id,
                        }))}
                        onValueChange={(value) => updateWeiboConfig('defaultUser', value)}
                    />
                    <ConfigRadioButton
                        label="匿名"
                        value={localSetting.weibo.anonymous}
                        options={[{label:'关闭', value:0}, {label:'头像和昵称', value:1}, {label:'昵称', value:2}, {label:'头像', value:3}]}
                        onValueChange={(value) => updateWeiboConfig('anonymous', value)}
                    />
                    <ConfigInput
                        label="文件超过提示MB(0不提示)"
                        value={localSetting.weibo.showTipFilesSize}
                        onChangeText={(value) => {
                            // 只允许输入整数
                            if (/^\d*$/.test(value)) {
                                updateWeiboConfig('showTipFilesSize', value);
                            }
                        }}
                        keyboardType="numeric"
                    />
                    <ConfigInput
                        label="最大允许文件MB(0不限制)"
                        value={localSetting.weibo.maxTotalFilesSize}
                        onChangeText={(value) => {
                            // 只允许输入整数
                            if (/^\d*$/.test(value)) {
                                updateWeiboConfig('maxTotalFilesSize', value);
                            }
                        }}
                        keyboardType="numeric"
                    />
                    <Checkbox
                        label="热搜"
                        options={[
                            { label: '随机微博', value: 'randomweibo' },
                            { label: '联合早报', value: 'zaobao' },
                            { label: '百度热搜', value: 'baidu' },
                            { label: '微博热搜', value: 'weibo' },
                            { label: '抖音热搜', value: 'douyin' },
                            { label: '头条热搜 ', value: 'toutiao' },
                            { label: '华尔街日报', value: 'wsj' },
                            { label: '纽约时报', value: 'nytimes' },
                            { label: '法广新闻', value: 'rfi' },
                        ]}
                        selectedValues={localSetting.weibo.hotSearchs || []}
                        onValueChange={(values) => updateWeiboConfig('hotSearchs', values)}
                    />
                </View>
                {/* 工具设置 */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>工具设置</Text>
                    <ConfigSwitch
                        label="显示孕周"
                        value={localSetting.tool.showPregnancy}
                        onValueChange={(value) => updateToolConfig('showPregnancy', value)}
                    />
                    <ConfigSwitch
                        label="显示小说"
                        value={localSetting.tool.showNovel}
                        onValueChange={(value) => updateToolConfig('showNovel', value)}
                    />
                </View>
                {/* 工具设置 */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>字典设置</Text>
                    <ConfigInput
                        label="背单词每页数量"
                        value={localSetting.dictionary.rememberWordPageSize}
                        onChangeText={(value) => {
                            // 只允许输入整数
                            if (/^\d*$/.test(value)) {
                                updateDictionaryConfig('rememberWordPageSize', value);
                            }
                        }}
                        keyboardType="numeric"
                    />
                </View>
                <View style={{height:55}}><Button title="保存配置" onPress={saveConfig} /></View>
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 20,
    },
    header: {
        fontSize: 24,
        fontWeight: 'bold',
        textAlign: 'center',
        marginBottom: 20,
    },
    section: {
        marginBottom: 30,
    },
    sectionTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 10,
        color: '#333',
    },
    inputContainer: {
        marginBottom: 20,
    },
    inputLabel: {
        fontSize: 16,
        marginBottom: 5,
        color: '#555',
        width:'60%',
    },
    input: {
        borderBottomWidth: 1,
        padding: 10,
        fontSize: 16,
        borderColor: '#ccc',
    },
    switchContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    radioContainer: {
        marginBottom: 20,
    },
    radioOptions: {
        flexDirection: 'row',
        justifyContent: 'flex-start',
        alignItems: 'center',
        flexWrap: 'wrap',
    },
    radioOption: {
        flexDirection: 'row',
        alignItems: 'center',
        marginRight: 20,
    },
    radioButtonContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 10,
    },
    radioButtonCircle: {
        width: 18,
        height: 18,
        borderRadius: 9,
        borderWidth: 2,
        borderColor: '#555',
        marginRight: 10,
    },
    radioButtonSelected: {
        backgroundColor: '#007bff',
        borderColor: '#007bff',
    },
    radioButtonLabel: {
        fontSize: 16,
        color: '#555',
    },
    checkboxContainer: {
        marginBottom: 20,
    },
    checkboxLabel: {
        fontSize: 16,
        marginBottom: 5,
        color: '#555',
    },
    checkboxOptionsContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
    },
    checkboxOption: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 10,
        marginRight: 20,
        minWidth: 90,
    },
    checkbox: {
        width: 20,
        height: 20,
        borderWidth: 2,
        borderColor: '#555',
        marginRight: 10,
    },
    checkboxChecked: {
        backgroundColor: '#007bff',
        borderColor: '#007bff',
    },
    checkboxOptionLabel: {
        fontSize: 16,
        color: '#555',
    },
});

export default SettingsScreen;
