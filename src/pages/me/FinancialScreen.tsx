import React, { useEffect, useState } from 'react';
import { SafeAreaView, ScrollView, View, Text, StyleSheet, ActivityIndicator, TouchableOpacity, Modal, Pressable } from 'react-native';
import config from '../../config';
import { useNavigation } from '@react-navigation/native';

export default function FinancialScreen() {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [menuVisible, setMenuVisible] = useState(false);

    const navigation = useNavigation();

    useEffect(() => {
        fetch(config.cfApiBaseURL + '/google-sheet-financial-info', {
            headers: {
                'x-feehi-sec-verify': config.feehiSecVerify,
            },
        })
            .then(res => res.json())
            .then(json => {
                setData(json.data);
                setLoading(false);
            })
            .catch(err => {
                console.error(err);
                setLoading(false);
            });
    }, []);

    const years = [2020, 2021, 2022, 2023, 2024, 2025];

    const handleYearSelect = (year) => {
        setMenuVisible(false);
        navigation.navigate('financialYearScreen' as any, { year } as any);
    };

    if (loading) return (
        <SafeAreaView style={styles.container}>
            <ActivityIndicator size="large" color="#4CAF50" style={{ marginTop: 50 }} />
        </SafeAreaView>
    );

    if (!data) return (
        <SafeAreaView style={styles.container}>
            <Text style={styles.errorText}>加载失败，请重试</Text>
        </SafeAreaView>
    );

    const accountsData = data.accounts.filter(acc => acc.name.toLowerCase() !== 'end');

    const renderItem = (key, left, right, sub = null, isLast = false) => (
        <View key={key} style={[styles.itemRow, isLast && { borderBottomWidth: 0 }]}>
            <View style={styles.itemLeft}>
                <Text style={styles.itemTitle}>{left}</Text>
                {sub && <Text style={styles.itemSub}>{sub}</Text>}
            </View>
            <View style={styles.itemRight}>
                <Text style={styles.itemAmount}>{right}</Text>
            </View>
        </View>
    );

    const renderSectionCard = (title, items, showType = false) => (
        <View style={styles.card} key={title}>
            <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>{title}</Text>
            </View>
            <View style={styles.cardBody}>
                {items.map((item, idx) =>
                    renderItem(`${title}-${idx}`, item.left, item.right, showType ? item.sub : null, idx === items.length - 1)
                )}
            </View>
        </View>
    );

    const renderAccountsSection = () => {
        const banks = {};
        accountsData.forEach(acc => {
            if (!banks[acc.bank]) banks[acc.bank] = [];
            banks[acc.bank].push(acc);
        });

        return (
            <View style={styles.card} key="accounts">
                <View style={styles.cardHeader}>
                    <Text style={styles.cardTitle}>账户</Text>
                </View>
                <View style={styles.cardBody}>
                    {Object.keys(banks).map((bank, idx) => (
                        <View key={bank} style={[styles.bankSection, idx !== 0 && styles.bankSectionSpacing]}>
                            <Text style={styles.bankTitle}>{bank}</Text>
                            {banks[bank].map((acc, i) =>
                                renderItem(`${acc.name}-${i}`, `${acc.name}`, `¥ ${acc.amount.toLocaleString()} `, acc.type || acc.change || "", i === banks[bank].length - 1)
                            )}
                        </View>
                    ))}
                </View>
            </View>
        );
    };

    // 其他栏目
    const totalAssetsItems = data.totalAssets
        .filter(a => a.name.toLowerCase() !== 'end')
        .map(a => ({ left: a.name, right: `¥ ${a.amount.toLocaleString()}` }));

    const debtsItems = data.debts.map(d => ({ left: d.name, right: `¥ ${d.amount.toLocaleString()}` }));

    const historyItems = data.history
        .filter(h => h.date.toLowerCase() !== 'end')
        .map(h => ({
            date: h.date,
            totalAmount: `¥ ${h.amount.toLocaleString()}`,
            changeAmount: `${h.increase >= 0 ? '+' : ''}${h.increase.toLocaleString()}`,
            remark: h.remark || ''
        }));

    return (
        <SafeAreaView style={styles.container}>
            {/* 悬浮球年份选择 */}
            <View style={styles.floatingBallContainer}>
                <TouchableOpacity
                    style={styles.floatingBall}
                    onPress={() => setMenuVisible(true)}
                >
                    <Text style={styles.floatingBallText}>年</Text>
                </TouchableOpacity>
            </View>

            <Modal
                transparent
                animationType="fade"
                visible={menuVisible}
                onRequestClose={() => setMenuVisible(false)}
            >
                <Pressable style={styles.modalOverlay} onPress={() => setMenuVisible(false)}>
                    <View style={styles.menuModal}>
                        {years.map(year => (
                            <TouchableOpacity key={year} style={styles.menuItem} onPress={() => handleYearSelect(year)}>
                                <Text style={styles.menuItemText}>{year}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </Pressable>
            </Modal>

            <ScrollView contentContainerStyle={styles.scroll}>
                {renderSectionCard("总资产", totalAssetsItems)}
                {renderAccountsSection()}
                {renderSectionCard("债务", debtsItems)}
                {/* 历史变动四栏 */}
                <View style={styles.card}>
                    <View style={styles.cardHeader}>
                        <Text style={styles.cardTitle}>历史变动</Text>
                    </View>
                    <View style={styles.cardBody}>
                        {historyItems.map((h, idx) => (
                            <View style={[
                                styles.historyRow,
                                idx === historyItems.length - 1 && { borderBottomWidth: 0 }
                            ]} key={idx}>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.historyDate}>{h.date}</Text>
                                    {!!h.remark && <Text style={styles.historyRemark}>{h.remark}</Text>}
                                </View>

                                <View style={{ alignItems: 'flex-end' }}>
                                    <Text style={styles.historyTotal}>{h.totalAmount}</Text>
                                    <Text
                                        style={[
                                            styles.historyChange,
                                            { color: h.changeAmount.startsWith('-') ? '#e53e3e' : '#4CAF50' },
                                        ]}
                                    >
                                        {h.changeAmount}
                                    </Text>
                                </View>
                            </View>
                        ))}
                    </View>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f0f4f8' },
    scroll: { padding: 16, paddingBottom: 40 },

    card: {
        backgroundColor: '#fff',
        borderRadius: 16,
        marginBottom: 16,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: '#e0e6ed',
    },
    cardHeader: {
        backgroundColor: '#e3f2f1',
        paddingVertical: 10,
        paddingHorizontal: 16,
    },
    cardTitle: { fontSize: 17, fontWeight: '700', color: '#2c7a7b' },
    cardBody: { paddingHorizontal: 12, paddingVertical: 8 },

    bankSection: {
        paddingVertical: 6,
        paddingHorizontal: 4,
        borderRadius: 10,
        backgroundColor: '#f7fcfc',
    },
    bankSectionSpacing: { marginTop: 10 },
    bankTitle: { fontSize: 15, fontWeight: '600', color: '#2c7a7b', marginBottom: 4 },

    itemRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 4,
        borderBottomWidth: 1,
        borderBottomColor: '#e8f0ef',
    },
    itemLeft: { flex: 1, paddingRight: 8 },
    itemRight: { minWidth: 100, alignItems: 'flex-end' },
    itemTitle: { fontSize: 14, fontWeight: '600', color: '#111' },
    itemSub: { fontSize: 11, color: '#888', marginTop: 2 },
    itemAmount: { fontSize: 15, fontWeight: '700', color: '#4CAF50', width: 110, textAlign: 'right'},
    historyRow: { flexDirection: 'row', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: '#e8f0ef' },
    historyDate: {
        fontSize: 13,
        color: '#333',
        fontWeight: '600',
    },
    historyRemark: {
        fontSize: 11,
        color: '#888',
        marginTop: 2,
    },
    historyTotal: {
        fontSize: 15,
        fontWeight: '700',
        color: '#111',
        width: 110,
        textAlign: 'right',
    },
    historyChange: {
        fontSize: 13,
        marginTop: 2,
        width: 110,
        textAlign: 'right',
    },
    errorText: { textAlign: 'center', marginTop: 50, fontSize: 16, color: '#888' },

    // 悬浮球样式
    floatingBallContainer: {
        position: 'absolute',
        top: 18,
        right: 10,
        zIndex: 100,
        padding: 0,
    },
    floatingBall: {
        backgroundColor: '#4CAF50',
        width: 40,
        height: 40,
        borderRadius: 25,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 3,
        elevation: 5,
    },
    floatingBallText: {
        color: '#fff',
        fontWeight: '700',
        fontSize: 16,
    },

    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.2)',
        justifyContent: 'flex-start',
        paddingTop: 50,
        paddingLeft: 16,
    },
    menuModal: {
        backgroundColor: '#fff',
        borderRadius: 12,
        paddingVertical: 8,
        minWidth: 100,
        borderWidth: 1,
        borderColor: '#e0e6ed',
    },
    menuItem: { paddingVertical: 8, paddingHorizontal: 12 },
    menuItemText: { fontSize: 14, color: '#2c7a7b', fontWeight: '600' },
});
