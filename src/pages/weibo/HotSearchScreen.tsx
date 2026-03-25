import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    Image,
    StyleSheet,
    ScrollView,
    RefreshControl,
    ActivityIndicator,
    TouchableOpacity,
    Alert,
    Linking,
    NativeModules,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import {formatWeiboContent} from './util';
import {useSetting} from '../../provider/setting';
import config from '../../config';
import WeiboService from '../../services/weibo';
import {mediaUsers} from '../../services/weibo/news';

// 定义数据类型
interface NewsItem {
    id?: string;
    title: string;
    link: string;
    pubDate?: string;
    hotIndex?: string;
    tag?: string;
    rank?: number;
}

interface WeiboUser {
    Avatar: string;
}

interface WeiboRetweet {
    User: WeiboUser;
    ContentHTML: string;
}

interface WeiboItem {
    id: string;
    ContentHTML: string;
    time: string;
    Retweet?: WeiboRetweet;
    User: WeiboUser;
}

const myWeiboHost = 'http://192.168.1.2:8080';
const displayNum = 15;

const HotSearchScreen: React.FC = () => {
    // 状态管理
    const [weiboPosts, setWeiboPosts] = useState<WeiboItem[]>([]);
    const [zaobaoNews, setZaobaoNews] = useState<NewsItem[]>([]);
    const [baiduHotSearch, setBaiduHotSearch] = useState<NewsItem[]>([]);
    const [weiboHotSearch, setWeiboHotSearch] = useState<NewsItem[]>([]);
    const [douyinHotSearch, setDouyinHotSearch] = useState<NewsItem[]>([]);
    const [toutiaoHotSearch, setToutiaoHotSearch] = useState<NewsItem[]>([]);
    const [wsjNews, setWsjNews] = useState<NewsItem[]>([]); // 新增WSJ新闻状态
    const [nytimesNews, setNytimesNews] = useState<NewsItem[]>([]); // 新增NYTimes新闻状态
    const [rfiNews, setRfiNews] = useState<NewsItem[]>([]); // 新增RFI新闻状态

    const [loading, setLoading] = useState({
        weibo: false,
        zaobao: false,
        baidu: false,
        weiboHot: false,
        douyin: false,
        toutiao: false,
        wsj: false, // 新增WSJ加载状态
        nytimes: false, // 新增NYTimes加载状态
        rfi: false, // 新增RFI加载状态
    });

    const [refreshing, setRefreshing] = useState(false);
    const [errors, setErrors] = useState({
        weibo: '',
        zaobao: '',
        baidu: '',
        weiboHot: '',
        douyin: '',
        toutiao: '',
        wsj: '',
        nytimes: '', // 新增NYTimes错误状态
        rfi: '', // 新增RFI错误状态
    });

    const {setting} = useSetting();
    const navigation = useNavigation();
    const weiboService = WeiboService.getInstance();

    // 通用请求函数
    const fetchData = async (url: string, options:any=null) => {
        try {
            // 在React Native中，我们直接使用fetch而不是chrome.runtime.sendMessage
            const response = await fetch(url, options);
            const data = await response.text();
            return data;
        } catch (error) {
            throw new Error(`请求失败: ${url} ${error.message}`);
        }
    };

    // 获取联合早报新闻
    const fetchZaoBaoNews = async () => {
        try {
            setLoading(prev => ({ ...prev, zaobao: true }));
            setErrors(prev => ({ ...prev, zaobao: '' }));

            const html = await fetchData('https://www.zaobao.com/realtime/china');
            const rawItemsStr = await NativeModules.RNHelper.parseNews('zaobao', 'list', html, '//main//article//a');
            const rawItems = JSON.parse(rawItemsStr);
            let items = [];
            for (let i = 0; i < Math.min(rawItems.length, displayNum); i++) {
                const item = rawItems[i];
                items.push({
                    title: item.text,
                    link: item.href.startsWith('/') ? 'https://www.zaobao.com' + item.href : 'https://www.zaobao.com/' + item.href,
                    pubDate: item.date,
                });
            }
            if (items.length === 0) {
                throw new Error('未提取到文章');
            }
            setZaobaoNews(items);
            setLoading(prev => ({ ...prev, zaobao: false }));
        } catch (error) {
            setErrors(prev => ({ ...prev, zaobao: `加载新闻数据失败: ${error.message}` }));
            setLoading(prev => ({ ...prev, zaobao: false }));
        }
    };

    // 获取百度热搜
    const fetchBaiduHotSearch = async () => {
        try {
            setLoading(prev => ({ ...prev, baidu: true }));
            setErrors(prev => ({ ...prev, baidu: '' }));

            const html = await fetchData('https://top.baidu.com/board?tab=realtime');
            const rawItemsStr = await NativeModules.RNHelper.parseHotSearch('baidu', 'list', html, '//div[@style="margin-bottom:20px"]/div');
            let rawItems = JSON.parse(rawItemsStr);
            rawItems.shift();
            let items = [];
            for(let i = 0; i < Math.min(rawItems.length, displayNum); i++){
                items[i] = rawItems[i];
            }
            if (items.length === 0) {
                throw new Error('未提取到热搜数据');
            }

            setBaiduHotSearch(items);
            setLoading(prev => ({ ...prev, baidu: false }));
        } catch (error) {
            setErrors(prev => ({ ...prev, baidu: `加载热搜数据失败: ${error.message}` }));
            setLoading(prev => ({ ...prev, baidu: false }));
        }
    };

    // 获取微博热搜
    const fetchWeiboHotSearch = async () => {
        try {
            setLoading(prev => ({ ...prev, weiboHot: true }));
            setErrors(prev => ({ ...prev, weiboHot: '' }));

            const html = await fetchData('https://s.weibo.com/top/summary', {
                headers: {
                    'Cookie': 'SUB=_2AkMfwdFxf8NxqwFRmvoRy27haI9zzwjEieKpnSCqJRMxHRl-yT9kqkETtRB6NEH_ngJ7uI7hvQ5rQ01bJxldppA0rVlh; SUBP=0033WrSXqPxfM72-Ws9jqgMF55529P9D9WWDa8m8ENkTwIV33161IBze',
                },
            });
            const rawItemsStr = await NativeModules.RNHelper.parseHotSearch('weibo', 'list', html, "//div[@id='pl_top_realtimehot']//tr[.//td[contains(@class, 'td-01 ranktop ranktop')]]");
            const rawItems = JSON.parse(rawItemsStr);
            let items = [];
            for(let i = 0; i < Math.min(rawItems.length, displayNum); i++){
                rawItems[i].link = 'https://m.weibo.cn/search?containerid=100103type%3D1%26t%3D10%26q%3D%23' + encodeURIComponent(rawItems[i].title) + "%23"
                items[i] = rawItems[i];
            }

            setWeiboHotSearch(items);
            setLoading(prev => ({ ...prev, weiboHot: false }));
        } catch (error) {
            setErrors(prev => ({ ...prev, weiboHot: `加载微博热搜数据失败: ${error.message}` }));
            setLoading(prev => ({ ...prev, weiboHot: false }));
        }
    };

    // 获取抖音热搜
    const fetchDouyinHotSearch = async () => {
        try {
            setLoading(prev => ({ ...prev, douyin: true }));
            setErrors(prev => ({ ...prev, douyin: '' }));

            const json = await fetchData('https://so-landing.douyin.com/aweme/v1/hot/search/list/?detail_list=1&board_type=0&board_sub_type=&need_board_tab=true&need_covid_tab=false&version_code=32.3.0');
            const data = JSON.parse(json);

            if (!data || !data.data || !data.data.word_list) {
                throw new Error('未提取到热搜数据');
            }
            let items = [];
            for(let i = 0; i < Math.min(data.data.word_list.length, displayNum); i++){
                const item = data.data.word_list[i];
                items[i] = {
                    title: item.word,
                    hotIndex: item.hot_value,
                    rank: item.position || (i + 1),
                    link: 'https://so.douyin.com/s?search_entrance=aweme&enter_method=hot_list_page&is_no_width_reload=0&from=hot_list_page&hideMiddlePage=1&needBack2Origin=1&previous_page=trending_board_page&keyword=' + encodeURIComponent(item.word)
                };
            }

            setDouyinHotSearch(items);
            setLoading(prev => ({ ...prev, douyin: false }));
        } catch (error) {
            setErrors(prev => ({ ...prev, douyin: `加载抖音热搜数据失败: ${error.message}` }));
            setLoading(prev => ({ ...prev, douyin: false }));
        }
    };

    // 获取头条热搜
    const fetchToutiaoHotSearch = async () => {
        try {
            setLoading(prev => ({ ...prev, toutiao: true }));
            setErrors(prev => ({ ...prev, toutiao: '' }));

            const json = await fetchData('https://www.toutiao.com/hot-event/hot-board/?origin=toutiao_pc');
            const data = JSON.parse(json);

            if (!data || !data.data) {
                throw new Error('未提取到热搜数据');
            }
            let items = [];
            for (let i = 0; i < Math.min(data.data.length, displayNum); i++) {
                const item = data.data[i];
                let tag = '';
                if (item.Label === 'new') {
                    tag = '新';
                } else if (item.Label === 'hot') {
                    tag = '热';
                }
                items[i] = {
                    title: item.Title,
                    tag: tag,
                    rank: i + 1,
                    link: item.Url || 'https://www.toutiao.com',
                };
            }

            setToutiaoHotSearch(items);
            setLoading(prev => ({ ...prev, toutiao: false }));
        } catch (error) {
            setErrors(prev => ({ ...prev, toutiao: `加载头条热搜数据失败: ${error.message}` }));
            setLoading(prev => ({ ...prev, toutiao: false }));
        }
    };

    // 获取微博内容
    const fetchWeiboPosts = async () => {
        try {
            setLoading(prev => ({ ...prev, weibo: true }));
            setErrors(prev => ({ ...prev, weibo: '' }));

            const json = await fetchData(`${myWeiboHost}/weibo/random`);
            const data = JSON.parse(json);

            setWeiboPosts((Array.isArray(data) ? data : [data]).map(item => ({
                ...item,
                link: myWeiboHost + '/weibo/view?id=' + item.id,
            })));
            setLoading(prev => ({ ...prev, weibo: false }));
        } catch (error) {
            setErrors(prev => ({ ...prev, weibo: `加载微博数据失败: ${error.message}` }));
            setLoading(prev => ({ ...prev, weibo: false }));
        }
    };

    // 获取华尔街日报新闻
    const fetchWsjNews = async () => {
        try {
            setLoading(prev => ({ ...prev, wsj: true }));
            setErrors(prev => ({ ...prev, wsj: '' }));
            /*const html = await NativeModules.RNHelper.httpClient(JSON.stringify({
                method: 'GET',
                url: 'https://cn.wsj.com/zh-hans/rss',
                proxy: config.httpProxyURL,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                },
            }));
            if(html.indexOf('error:') === 0){
                throw new Error(html);
            }*/
            const html = await fetchData(config.httpProxyLink + 'https://cn.wsj.com/rss-news-and-feeds/zh-hans');
            const rawItemsStr = await NativeModules.RNHelper.parseHotSearch('wsj', 'list', html, '//item');
            const rawItems = JSON.parse(rawItemsStr);
            let items = [];
            for (let i = 0; i < Math.min(rawItems.length, displayNum); i++) {
                const item = rawItems[i];
                items.push({
                    title: item.title,
                    link: 'https://archive.ph/submit/?url=' + item.link,
                    pubDate: item.time,
                });
            }
            if (items.length === 0) {
                throw new Error('未提取到文章');
            }
            setWsjNews(items);
            setLoading(prev => ({ ...prev, wsj: false }));
        } catch (error) {
            setErrors(prev => ({ ...prev, wsj: `加载WSJ新闻数据失败: ${error.message}` }));
            setLoading(prev => ({ ...prev, wsj: false }));
        }
    };

    // 获取纽约时报新闻
    const fetchNytimesNews = async () => {
        try {
            setLoading(prev => ({ ...prev, nytimes: true }));
            setErrors(prev => ({ ...prev, nytimes: '' }));

            /*const html = await NativeModules.RNHelper.httpClient(JSON.stringify({
                method: 'GET',
                url: 'https://cn.nytimes.com/china/',
                proxy: config.httpProxyURL,
            }));
            if(html.indexOf('error:') === 0){
                throw new Error(html);
            }*/
            const html = await fetchData(config.httpProxyLink + 'https://cn.nytimes.com/china/zh-hans/');
            const rawItemsStr = await NativeModules.RNHelper.parseNews('nytimes', 'list', html, "//h3[@class='sectionLeadHeader']/a | //h3[@class='regularSummaryHeadline']/a");
            const rawItems = JSON.parse(rawItemsStr);
            let items = [];
            for (let i = 0; i < Math.min(rawItems.length, displayNum); i++) {
                const item = rawItems[i];
                items.push({
                    title: item.text,
                    link: config.httpProxyLink + (item.href.startsWith('http') ? item.href : 'https://cn.nytimes.com' + item.href),
                    pubDate: item.date,
                });
            }
            if (items.length === 0) {
                throw new Error('未提取到文章');
            }
            setNytimesNews(items);
            setLoading(prev => ({ ...prev, nytimes: false }));
        } catch (error) {
            setErrors(prev => ({ ...prev, nytimes: `加载纽约时报新闻数据失败: ${error.message}` }));
            setLoading(prev => ({ ...prev, nytimes: false }));
        }
    };

    // 获取法广新闻
    const fetchRfiNews = async () => {
        try {
            setLoading(prev => ({ ...prev, rfi: true }));
            setErrors(prev => ({ ...prev, rfi: '' }));

            const html = await fetchData(config.httpProxyLink + 'https://www.rfi.fr/cn/%E6%BB%9A%E5%8A%A8%E6%96%B0%E9%97%BB/');
            const rawItemsStr = await NativeModules.RNHelper.parseNews('rfi', 'list', html, "//div[@class='m-item-news-feed']/div[@class='news__content']/div");
            const rawItems = JSON.parse(rawItemsStr);
            let items = [];
            for (let i = 0; i < Math.min(rawItems.length, displayNum); i++) {
                const item = rawItems[i];
                items.push({
                    title: item.text,
                    link: config.httpProxyLink + (item.href.startsWith('http') ? item.href : 'https://www.rfi.fr' + item.href),
                    pubDate: item.date,
                });
            }
            if (items.length === 0) {
                throw new Error('未提取到文章');
            }
            setRfiNews(items);
            setLoading(prev => ({ ...prev, rfi: false }));
        } catch (error) {
            setErrors(prev => ({ ...prev, rfi: `加载法广新闻数据失败: ${error.message}` }));
            setLoading(prev => ({ ...prev, rfi: false }));
        }
    };

    // 刷新所有数据
    const refreshAllData = () => {
        setRefreshing(true);
        let tasks = [];
        setting.weibo.hotSearchs.includes('randomweibo') && tasks.push(fetchWeiboPosts());
        setting.weibo.hotSearchs.includes('zaobao') && tasks.push(fetchZaoBaoNews());
        setting.weibo.hotSearchs.includes('baidu') && tasks.push(fetchBaiduHotSearch());
        setting.weibo.hotSearchs.includes('weibo') && tasks.push(fetchWeiboHotSearch());
        setting.weibo.hotSearchs.includes('douyin') && tasks.push(fetchDouyinHotSearch());
        setting.weibo.hotSearchs.includes('toutiao') && tasks.push(fetchToutiaoHotSearch());
        setting.weibo.hotSearchs.includes('wsj') && tasks.push(fetchWsjNews());
        setting.weibo.hotSearchs.includes('nytimes') && tasks.push(fetchNytimesNews()); // 新增刷新NYTimes新闻
        setting.weibo.hotSearchs.includes('rfi') && tasks.push(fetchRfiNews()); // 新增刷新RFI新闻
        Promise.all(tasks).finally(() => {
            setRefreshing(false);
        });
    };

    // 刷新单个数据源
    const refreshDataSource = (source: string) => {
        switch (source) {
            case 'weibo':
                fetchWeiboPosts();
                break;
            case 'zaobao':
                fetchZaoBaoNews();
                break;
            case 'baidu':
                fetchBaiduHotSearch();
                break;
            case 'weiboHot':
                fetchWeiboHotSearch();
                break;
            case 'douyin':
                fetchDouyinHotSearch();
                break;
            case 'toutiao':
                fetchToutiaoHotSearch();
                break;
            case 'wsj': // 新增刷新WSJ新闻
                fetchWsjNews();
                break;
            case 'nytimes': // 新增刷新NYTimes新闻
                fetchNytimesNews();
                break;
            case 'rfi': // 新增刷新RFI新闻
                fetchRfiNews();
                break;
            default:
                break;
        }
    };

    // 标记微博为已读
    const markAsRead = async (weiboId: string) => {
        try {
            const response = await fetch(`${myWeiboHost}/weibo/mark?id=${weiboId}&status=0`);
            if (response.status !== 200) {
                Alert.alert('失败失败', '标记失败');
                return;
            }
            fetchWeiboPosts(); // 重新获取微博数据
        } catch (error) {
            Alert.alert('失败', '标记失败');
        }
    };

    // 标记微博为讨厌
    const markAsDisliked = async (weiboId: string) => {
        try {
            const response = await fetch(`${myWeiboHost}/weibo/mark?id=${weiboId}&status=1`);

            if (response.status !== 200) {
                Alert.alert('失败', '标记失败');
                return;
            }
            fetchWeiboPosts(); // 重新获取微博数据
        } catch (error) {
            Alert.alert('失败', '标记失败');
        }
    };

    const openWeiboDetail = async (id:string) => {
        const [getWeiboResult, weibo, getWeiboErr] = await weiboService.getWeibo(id);
        if(!getWeiboResult){
            Alert.alert('失败', getWeiboErr);
            return;
        }
        navigation.navigate('index' as any, {
            screen: 'WeiboDetail',
            params: {
                wb: weibo, uid: '0',
            },
        } as any);
    };

    const openNewsDetail = async (source:string, item:NewsItem) => {
        let uid = 0;
        if(source === 'zaobao'){
            uid = 101;
        }else if(source === 'nytimes'){
            uid = 110;
        }else if(source  === 'rfi') {
            uid = 111;
        }
        navigation.navigate('index' as any, {
            screen: 'WeiboDetail',
            params: {
                wb:{
                    id: item.link,
                    type: 3,
                    text: item.title,
                    media: [],
                    comments: [],
                    forwardCount: 0,
                    likeCount: 0,
                    commentCount: 0,
                    createdAt: item.pubDate,
                    uid: uid,
                    user: mediaUsers[uid],
                    repost: null,
                    location: '',
                    by: { id: 0, title: '', url: '' },
                    tsr: 0,
                }, uid: '0',
            },
        } as any);
    };

    // 打开链接
    const openLink = async (url:string) => {
        try {
            const supported = await Linking.canOpenURL(url);
            if (supported) {
                await Linking.openURL(url);
            } else {
                Alert.alert('失败', '无法打开链接');
            }
        } catch (error) {
            Alert.alert('失败', '打开链接时出错');
        }
    };

    // 格式化日期
    const formatPubDate = (dateString: string) => {
        const date = new Date(dateString); // 转成 Date 对象
        const now = new Date();

        // 判断是不是同一天
        const isSameDay =
            date.getFullYear() === now.getFullYear() &&
            date.getMonth() === now.getMonth() &&
            date.getDate() === now.getDate();

        if (isSameDay) {
            // 补零
            const hh = String(date.getHours()).padStart(2, '0');
            const mm = String(date.getMinutes()).padStart(2, '0');
            return `${hh}:${mm}`;
        } else {
            return `${date.getDate()}日`;
        }
    };

    // 获取排名背景色
    const getRankStyle = (rank?: number) => {
        if (!rank) return styles.rankDefault;
        if (rank <= 3) return styles.rankTop3;
        return styles.rankDefault;
    };

    // 获取标签背景色
    const getTagStyle = (tag?: string) => {
        switch (tag) {
            case '热':
                return styles.tagHot;
            case '新':
                return styles.tagNew;
            case '沸':
                return styles.tagHot;
            case '爆':
                return styles.tagHot;
            default:
                return {};
        }
    };

    // 渲染加载状态
    const renderLoading = (message: string) => (
        <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#007AFF" />
            <Text style={styles.loadingText}>{message}</Text>
        </View>
    );

    // 渲染错误状态
    const renderError = (message: string) => (
        <View style={styles.errorContainer}>
            <Text style={styles.errorText}>⚠️ {message}</Text>
        </View>
    );

    // 渲染微博内容
    const renderWeiboPosts = () => {
        return (
            <View style={styles.card}>
                <View style={[styles.cardHeader, styles.weiboHeader]}>
                    <Text style={styles.cardHeaderText}>📝 随机微博 </Text>
                    <TouchableOpacity
                        style={styles.refreshButton}
                        onPress={() => refreshDataSource('weibo')}
                    >
                        <Text style={styles.refreshButtonText}>↻</Text>
                    </TouchableOpacity>
                </View>
                <View style={styles.cardBody}>
                    {loading.weibo ? (
                        renderLoading('正在加载微博...')
                    ) : errors.weibo ? (
                        renderError(errors.weibo)
                    ) : weiboPosts.length === 0 ? (
                        renderError('暂无微博数据')
                    ) : (
                        (() => {
                            const item = weiboPosts[0];
                            const date = new Date(item.time);
                            const formattedDate = isNaN(date.getTime())
                                ? '时间未知'
                                : `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}:${String(date.getSeconds()).padStart(2, '0')}`;

                            return (
                                <View style={styles.weiboItem}>
                                    <View style={styles.weiboContent}>
                                        {/* 显示微博用户头像 */}
                                        <View style={styles.avatarRow}>
                                            <Image
                                                source={{ uri: myWeiboHost + '/weibo/file?path=' + item.User.Avatar }}
                                                style={styles.avatar}
                                            />
                                            <Text style={styles.weiboText} onPress={() => openWeiboDetail(item.id)}>
                                                {formatWeiboContent(item.ContentHTML)}
                                            </Text>
                                        </View>
                                        {item.Retweet && (
                                            <View style={styles.repostContent}>
                                                {/* 显示转发微博用户头像 */}
                                                <View style={styles.avatarRow}>
                                                    <Image
                                                        source={{ uri: myWeiboHost + '/weibo/file?path=' + (item.Retweet.User.Avatar === '' ? 'users/1926576561.gif' : item.Retweet.User.Avatar ) }}
                                                        style={styles.avatar}
                                                    />
                                                    <Text style={styles.weiboText}>{formatWeiboContent(item.Retweet.ContentHTML)}</Text>
                                                </View>
                                            </View>
                                        )}
                                    </View>
                                    <View style={styles.weiboFooter}>
                                        <Text style={styles.weiboDate}>{formattedDate}         </Text>
                                        <View style={styles.weiboButtons}>
                                            <TouchableOpacity
                                                style={[styles.button, styles.readButton]}
                                                onPress={() => markAsRead(item.id)}
                                            >
                                                <Text style={styles.buttonText}>✅ 已读 </Text>
                                            </TouchableOpacity>
                                            <TouchableOpacity
                                                style={[styles.button, styles.dislikeButton]}
                                                onPress={() => markAsDisliked(item.id)}
                                            >
                                                <Text style={styles.buttonText}>👎 讨厌 </Text>
                                            </TouchableOpacity>
                                        </View>
                                    </View>
                                </View>
                            );
                        })()
                    )}
                </View>
            </View>
        );
    };

    // 渲染新闻或热搜列表
    const renderNewsList = (
        title: string,
        data: NewsItem[],
        loading: boolean,
        error: string,
        source: string,
        showHotIndex: boolean = false,
        showTag: boolean = false
    ) => {
        return (
            <View style={styles.card}>
                <View style={styles.cardHeader}>
                    <Text style={styles.cardHeaderText}>{title}</Text>
                    <TouchableOpacity
                        style={styles.refreshButton}
                        onPress={() => refreshDataSource(source)}
                    >
                        <Text style={styles.refreshButtonText}>↻</Text>
                    </TouchableOpacity>
                </View>
                <View style={styles.cardBody}>
                    {loading ? (
                        renderLoading(`正在加载${title}...`)
                    ) : error ? (
                        renderError(error)
                    ) : data.length === 0 ? (
                        renderError(`暂无${title}数据`)
                    ) : (
                        data.map((item, index) => (
                            <TouchableOpacity
                                key={index}
                                style={styles.listItem}
                                onPress={() => ['zaobao', 'nytimes', 'rfi'].includes(source) ? openNewsDetail(source, item) : openLink(item.link)}
                            >
                                <View style={styles.listItemContent}>
                                    <Text style={styles.listItemTitle} numberOfLines={3}>
                                        {item.title}
                                        {showTag && item.tag ? (
                                            <Text style={[styles.tag, getTagStyle(item.tag)]}> {item.tag} </Text>
                                        ) : null}
                                    </Text>
                                </View>
                                <View style={styles.listItemMeta}>
                                    {(source === 'zaobao' || source === 'wsj' || source === 'nytimes' || source === 'rfi') &&
                                        <View style={[styles.time]}>
                                            <Text style={styles.rankText}>{formatPubDate(item.pubDate as string)} </Text>
                                        </View>
                                    }
                                    {showHotIndex && item.hotIndex ? (
                                        <Text style={styles.hotIndex}>{item.hotIndex}</Text>
                                    ) : null}
                                    {source !== 'zaobao' && source !== 'wsj' && source !== 'nytimes' && source !== 'rfi' &&
                                        <View style={[styles.rank, getRankStyle(item.rank)]}>
                                            <Text style={styles.rankText}>{item.rank || index + 1}</Text>
                                        </View>
                                    }
                                </View>
                            </TouchableOpacity>
                        ))
                    )}
                </View>
            </View>
        );
    };

    // 初始化数据
    useEffect(() => {
        refreshAllData();

        // 每3分钟自动刷新
        /*const interval = setInterval(refreshAllData, 3 * 60 * 1000);
        return () => clearInterval(interval);*/
    }, []);

    return (
        <ScrollView
            style={styles.container}
            refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={refreshAllData} />
            }
        >
            {/*<View style={styles.header}>
                <Text style={styles.headerTitle}>📰 综合信息中心</Text>
                <Text style={styles.headerSubtitle}>数据每3分钟自动刷新一次</Text>
            </View>*/}

            {/* 随机微博 */}
            {setting.weibo.hotSearchs.includes('randomweibo') && renderWeiboPosts()}

            {/* 热搜和新闻列表 */}
            <View style={styles.grid}>
                {setting.weibo.hotSearchs.includes('zaobao') && (
                    <View style={styles.gridItem}>
                        {renderNewsList('联合早报新闻', zaobaoNews, loading.zaobao, errors.zaobao, 'zaobao')}
                    </View>
                )}

                {setting.weibo.hotSearchs.includes('baidu') && (
                    <View style={styles.gridItem}>
                        {renderNewsList('百度实时热搜', baiduHotSearch, loading.baidu, errors.baidu, 'baidu', false, true)}
                    </View>
                )}

                {setting.weibo.hotSearchs.includes('weibo') && (
                    <View style={styles.gridItem}>
                        {renderNewsList('新浪微博热搜', weiboHotSearch, loading.weiboHot, errors.weiboHot, 'weiboHot', false, true)}
                    </View>
                )}

                {setting.weibo.hotSearchs.includes('douyin') && (
                    <View style={styles.gridItem}>
                        {renderNewsList('抖音热搜榜', douyinHotSearch, loading.douyin, errors.douyin, 'douyin')}
                    </View>
                )}

                {setting.weibo.hotSearchs.includes('toutiao') && (
                    <View style={styles.gridItem}>
                        {renderNewsList('头条热搜榜', toutiaoHotSearch, loading.toutiao, errors.toutiao, 'toutiao', false, true)}
                    </View>
                )}

                {setting.weibo.hotSearchs.includes('wsj') && (
                    <View style={styles.gridItem}>
                        {renderNewsList('华尔街日报', wsjNews, loading.wsj, errors.wsj, 'wsj')}
                    </View>
                )}

                {setting.weibo.hotSearchs.includes('nytimes') && (
                    <View style={styles.gridItem}>
                        {renderNewsList('纽约时报', nytimesNews, loading.nytimes, errors.nytimes, 'nytimes')}
                    </View>
                )}

                {setting.weibo.hotSearchs.includes('rfi') && (
                    <View style={styles.gridItem}>
                        {renderNewsList('法广新闻', rfiNews, loading.rfi, errors.rfi, 'rfi')}
                    </View>
                )}
            </View>
        </ScrollView>
    );
};

// 样式定义
const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f5f5',
        padding: 10,
    },
    header: {
        alignItems: 'center',
        marginBottom: 20,
        paddingVertical: 10,
    },
    headerTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#333',
    },
    headerSubtitle: {
        fontSize: 14,
        color: '#666',
        marginTop: 5,
    },
    grid: {
        marginTop: 10,
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
    },
    gridItem: {
        width: '48%',
        marginBottom: 15,
    },
    card: {
        backgroundColor: '#fff',
        borderRadius: 10,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.2,
        shadowRadius: 2,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#007AFF',
        padding: 15,
        borderTopLeftRadius: 10,
        borderTopRightRadius: 10,
    },
    weiboHeader: {
        backgroundColor: '#1DA1F2',
    },
    cardHeaderText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 16,
    },
    refreshButton: {
        padding: 5,
    },
    refreshButtonText: {
        color: '#fff',
        fontSize: 18,
    },
    cardBody: {
        padding: 10,
    },
    loadingContainer: {
        padding: 20,
        alignItems: 'center',
    },
    loadingText: {
        marginTop: 10,
        color: '#666',
    },
    errorContainer: {
        padding: 20,
        alignItems: 'center',
    },
    errorText: {
        color: '#f00',
    },
    weiboItem: {
        padding: 10,
    },
    weiboContent: {
        marginBottom: 10,
    },
    // 添加头像行样式
    avatarRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        flexWrap: 'wrap',
    },
    repostContent: {
        borderLeftWidth: 2,
        borderLeftColor: '#1DA1F2',
        paddingLeft: 10,
        marginTop: 10,
        backgroundColor: '#f0f8ff',
        padding: 10,
    },
    weiboFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderTopWidth: 1,
        borderTopColor: '#eee',
        paddingTop: 10,
    },
    weiboDate: {
        fontSize: 12,
        color: '#666',
    },
    weiboButtons: {
        flexDirection: 'row',
    },
    button: {
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 5,
        marginLeft: 10,
    },
    readButton: {
        backgroundColor: '#007AFF',
    },
    dislikeButton: {
        backgroundColor: '#ff3b30',
    },
    buttonText: {
        color: '#fff',
        fontSize: 12,
    },
    listItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    listItemContent: {
        flex: 1,
        paddingRight: 10,
    },
    listItemTitle: {
        fontSize: 14,
        color: '#333',
    },
    listItemMeta: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    hotIndex: {
        fontSize: 12,
        color: '#999',
        marginRight: 5,
    },
    time: {
        width: 35,
        height: 25,
        borderRadius: 12.5,
        backgroundColor: '#ccc',
        justifyContent: 'center',
        alignItems: 'center',
    },
    rank: {
        width: 25,
        height: 25,
        borderRadius: 12.5,
        backgroundColor: '#f0f0f0',
        justifyContent: 'center',
        alignItems: 'center',
    },
    rankTop3: {
        backgroundColor: '#ff3b30',
    },
    rankDefault: {
        backgroundColor: '#ccc',
    },
    rankText: {
        color: '#fff',
        fontSize: 12,
        fontWeight: 'bold',
    },
    tag: {
        fontSize: 10,
        paddingHorizontal: 4,
        paddingVertical: 2,
        borderRadius: 3,
        color: '#fff',
    },
    tagHot: {
        backgroundColor: '#ff9812',
    },
    tagNew: {
        backgroundColor: '#ff455b',
    },
    // 添加头像样式
    avatarContainer: {
        marginBottom: 5,
    },
    avatar: {
        width: 30,
        height: 30,
        borderRadius: 15,
        marginRight: 10,
    },
    weiboText: {
        flex: 1,
    },
});

export default HotSearchScreen;
