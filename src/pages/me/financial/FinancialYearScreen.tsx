import React, { useEffect, useState } from 'react';
import { SafeAreaView, ScrollView, View, Text, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native';
import config from '../../../config';

export default function FinancialYearScreen({ route }) {
    const { year } = route.params;
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [expandedIncome, setExpandedIncome] = useState({});
    const [expandedExpense, setExpandedExpense] = useState({});

    useEffect(() => {
        setLoading(true);
        fetch(`${config.cfApiBaseURL}/google-sheet-financial-info?sheet=${year}`, {
            headers: { 'x-feehi-sec-verify': config.feehiSecVerify },
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
    }, [year]);

    const toggleIncome = (name) => setExpandedIncome(prev => ({ ...prev, [name]: !prev[name] }));
    const toggleExpense = (name) => setExpandedExpense(prev => ({ ...prev, [name]: !prev[name] }));

    const renderItem = (outsideName, item, isLast = false) => (
        <View
            style={[
                styles.itemRow,
                isLast && { borderBottomWidth: 0 },
            ]}
            key={outsideName + item.name}
        >
            <View style={styles.itemLeft}>
                <Text style={styles.itemTitle}>{item.name}</Text>
                {item.remark ? <Text style={styles.itemSub}>{item.remark}</Text> : null}
            </View>
            <View style={styles.itemRight}>
                <Text style={styles.itemAmount}>¥ {item.amount.toLocaleString()}</Text>
            </View>
        </View>
    );

    const fillDefaultTitleSuffix = (name, item) => {
        let suffix = '';
        switch (name) {
            case '个税':
            case '长沙灵活社保':
                if (!isNaN(item.name)) {
                    suffix = '月份';
                }
                break;
            case '工资':
            case '赞助':
            case '房租':
            case '失业金':
                suffix = '月份';
                break;
        }
        if (name.indexOf('日常开销') === 0) {
            suffix = '月份';
        }
        return {
            ...item,
            name: `${item.name}${suffix}`,
        };
    };

    const renderSection = (title, total, items, details, expandedState, toggleFn) => (
        <View style={styles.card}>
            <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>{year} {title}：¥ {total.toLocaleString()}</Text>
            </View>
            <View style={styles.cardBody}>
                {items.map((item, idx) => {
                    const isLast = idx === items.length - 1;
                    return (
                        <View key={item.name + idx}>
                            <TouchableOpacity onPress={() => toggleFn(item.name)}>
                                {renderItem(item.name, item, isLast && !expandedState[item.name])}
                            </TouchableOpacity>

                            {expandedState[item.name] &&
                                details[item.name] &&
                                details[item.name].length > 0 && (
                                    <View style={styles.detailContainer}>
                                        {details[item.name].map((d, i) =>
                                            renderItem(
                                                item.name + i,
                                                fillDefaultTitleSuffix(item.name, d),
                                                i === details[item.name].length - 1
                                            )
                                        )}
                                    </View>
                                )}
                        </View>
                    );
                })}
            </View>
        </View>
    );

    if (loading) {
        return (
            <SafeAreaView style={styles.container}>
                <ActivityIndicator size="large" color="#4CAF50" style={{ marginTop: 50 }} />
            </SafeAreaView>
        );
    }

    if (!data) {
        return (
            <SafeAreaView style={styles.container}>
                <Text style={styles.errorText}>加载失败，请重试</Text>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView contentContainerStyle={styles.scroll}>
                <Text style={styles.yearTitle}>{year} 年收支明细</Text>
                {renderSection('总收入', data.incomes.total, data.incomes.items, data.incomes.details, expandedIncome, toggleIncome)}
                {renderSection('总支出', data.expenses.total, data.expenses.items, data.expenses.details, expandedExpense, toggleExpense)}
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f0f4f8' },
    scroll: { padding: 16, paddingBottom: 40 },
    yearTitle: { fontSize: 20, fontWeight: '700', color: '#2c7a7b', marginBottom: 16, textAlign: 'center' },

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
    itemAmount: { fontSize: 15, fontWeight: '700', color: '#4CAF50', width: 110, textAlign: 'right' },

    detailContainer: {
        backgroundColor: '#f7fcfc',
        marginVertical: 4,
        paddingVertical: 4,
        paddingHorizontal: 8,
        borderRadius: 8,
    },

    errorText: { textAlign: 'center', marginTop: 50, fontSize: 16, color: '#888' },
});
