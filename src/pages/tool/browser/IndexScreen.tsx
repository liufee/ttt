import React, { useRef, useState, useEffect } from 'react';
import {View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, NativeModules, Alert} from 'react-native';
import { WebView } from 'react-native-webview';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import RFNS from 'react-native-fs';
import {AppConfigBasePath, APPRuntimePath} from '../../../constant';
import config from '../../../config';
import {WebViewNavigation} from 'react-native-webview/src/WebViewTypes';

const historyPath = APPRuntimePath + '/browse_history';

const COMMON_SITES = [
    { name: '百度', url: 'https://www.baidu.com' },
    { name: 'Google', url: 'https://www.google.com.hk' },
    { name: 'Youtube', url: 'https://www.youtube.com' },
    { name: '华尔街日报', url: 'https://cn.wsj.com' },
    { name: '126邮箱', url: 'https://www.126.com' },
    { name: '正晚点查询', url: 'https://kyfw.12306.cn/otn/view/onTimeOrLate.html' },
];

const QQExmails = [
    'job@feehi.com',
    'admin@feehi.com',
];

const injectYoutubeJS = `function skipYoutubeAds() {
    const skipButton = document.querySelector('.ytp-ad-skip-button');
        if (skipButton) {
            skipButton.click();
            console.log('广告已跳过');
        }

        // 去掉广告覆盖层
        const adOverlay = document.querySelectorAll('.ytp-ad-overlay-container, .ytp-ad-player-overlay');
        adOverlay.forEach(e => e.remove());
    }
    // 每秒检测一次
    setInterval(skipYoutubeAds, 1000);`;
const injectArchivePhJS = `
    function handleReplaceDivToBody(){
        let count = 0;
         const intervalId = setInterval(function(){
            const bodyContainer = document.querySelector('body');
            if(bodyContainer){
               const contentNode  = document.querySelector('article');
               if(contentNode && contentNode.innerHTML.length>500){
                    setTimeout(function(){
                        bodyContainer.innerHTML = contentNode.innerHTML;
                        document.querySelectorAll('body *').forEach(el => {
                            el.style.fontSize = '27px';
                            el.style.fontWeight = 'bold';
                            el.style.lineHeight = '1.8'       // 行距变大（倍数 或 px）
                            el.style.letterSpacing = '1px'
                        });
                        count++;
                        clearInterval(intervalId);
                    }, 3000);
               }
            }
            if (count >= 1) {
                clearInterval(intervalId);
            }
         }, 1000); 
    }
    handleReplaceDivToBody();
    document.addEventListener('readystatechange',function(){
        if(document.readyState === 'complete'){
            handleReplaceDivToBody();
        } 
    }); 
`;
const injectWSJJS = `
    function handle() {
        document.querySelectorAll('a').forEach((item) => {
            const href = item.getAttribute('href');
            if (href.startsWith('https://archive.ph/submit/?url=')) {
               return;
            }
            item.setAttribute('href', 'https://archive.ph/submit/?url=' + href);
            item.setAttribute('target', '_blank');
            item.addEventListener('click', function (e) {
                e.preventDefault();
                e.stopPropagation();
                const targetUrl = item.href;
                if (targetUrl) {
                    if (/[\u4e00-\u9fa5]/.test(targetUrl)) {
                        window.location.href = encodeURI(targetUrl);  // 自动编码跳转
                    } else {
                        window.location.href = targetUrl;
                    }
                }
            });
            setInterval(() => {
                const ele = document.querySelector('#cx-candybar');
                if (ele) {
                    ele.remove();
                }
            }, 1000);
        })
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', handle);
    } else {
        handle();
    }
    if(window.location.href.startsWith('https://archive.ph')){
        ${injectArchivePhJS}
    }
`;
const getInjectJS = (url:string) =>{
    if(url.indexOf('https://www.youtube.com') === 0){
        return injectYoutubeJS;
    }
    if(url.indexOf('https://cn.wsj.com') === 0){
        return injectWSJJS;
    }
    if(url.indexOf('https://archive.ph') === 0){
        return injectArchivePhJS;
    }
    return '';
};
interface BrowserPageProps{
    ShowNav:boolean
}
export default function BrowserPage({ShowNav = true}:BrowserPageProps) {
    const [inputURL, setInputURL] = useState('');
    const [tabs, setTabs] = useState([{ id: 1, url: 'newtab' }]);
    const [activeTab, setActiveTab] = useState(1);
    const [history, setHistory] = useState([]);
    const webViewRefs = useRef({});

    // 记录访问历史
    useEffect(() => {
        const newUrl = tabs.find(tab => tab.id === activeTab)?.url;
        if (newUrl && newUrl !== 'newtab') {
            setHistory(prev => {
                const exists = prev.find(item => item.url === newUrl);
                if (exists) return prev;
                return [...prev, { url: newUrl }];
            });
        }
        RFNS.readFile(historyPath, 'utf8').then((result)=>{
            if(result === ''){
                return;
            }
            setHistory(JSON.parse(result));
        });
    }, [tabs, activeTab]);

    // 打开新标签页
    const handleNewTab = () => {
        const newId = Date.now();
        setTabs([...tabs, { id: newId, url: 'newtab' }]);
        changeActiveTab(newId);
    };

    // 关闭标签页
    const handleCloseTab = (id) => {
        if(tabs.length === 1){
            setTabs([{ id: 1, url: 'newtab' }]);
            changeActiveTab(1);
            return;
        }
        const newTabs = tabs.filter((tab) => tab.id !== id);
        setTabs(newTabs);
        if (activeTab === id) {
            changeActiveTab(newTabs[0].id); // 选择第一个标签
        }
    };

    // 修改当前页面 URL
    const handleChangeUrl = (text) => {
        setInputURL(text);
        //setTabs(tabs.map(tab => tab.id === activeTab ? { ...tab, url: text } : tab));
    };

    // 导航到指定网址
    const handleNavigate = (url) => {
        if (!url.startsWith('http')) {
            url = 'https://' + url;
        }
        const exists = history.find(item => item.url === url);
        if (!exists) {
            RFNS.writeFile(historyPath, JSON.stringify([...history, { url: url }]), 'utf8');
        }
        setTabs(tabs.map(tab => {
            if (tab.id === activeTab ){
                webViewRefs.current[activeTab]?.reload();
                return {...tab, url};
            }else{
                return tab;
            }
        }));
    };

    const changeActiveTab = (id) => {
        setActiveTab(id);
        const currentTab = tabs.find((tab) => tab.id === id);
        setInputURL(currentTab?.url === 'newtab' ? '' : currentTab?.url);
    };

    const currentTab = tabs.find((tab) => tab.id === activeTab);

    const getShortHost = (url: string): string => {
        const match = url.match(/^https?:\/\/([^/]+)/);
        if (match) {
            const hostname = match[1];
            const firstPart = hostname.startsWith('www.')
                ? hostname.slice(4).split('.')[0]
                : hostname.split('.')[0];
            return firstPart.slice(0, 5);
        }
        return '';
    };

    const onShouldStartLoadWithRequest = (request) => {
        // 检查链接是否以 'http' 或 'https' 开头
        if (request.url.startsWith('http')) {
            return true; // 在本 WebView 打开
        }
        return false; // 如果是非 http/https 链接，跳转到默认浏览器
    };

    const deleteHistoryURL = async(url:string)=>{
        const urls = history.filter(item => item.url !== url);
        await RFNS.writeFile(historyPath, JSON.stringify(urls), 'utf8');
        setHistory(urls);
    };

    const jumpQQExmail = async(email:string) => {
        const username = email.replace(config.qqExmails[0].domain, '');
        let url = await NativeModules.RNHelper.getExmailLoginURL(config.qqExmails[0].corp_id, config.qqExmails[0].corp_secret, config.qqExmails[0].domain, AppConfigBasePath + '/qqexmail_', username);
        if(url.indexOf('error:') === 0 ){
            Alert.alert('失败', url);
            return;
        }
        handleNavigate(url);
    };

    // 地址栏
    const NavBar =
    <View style={styles.navBar}>
        <TouchableOpacity key='back-btn' onPress={() => webViewRefs.current[activeTab]?.goBack()}>
            <Text>退后</Text>
        </TouchableOpacity>

        <TextInput
            style={styles.input}
            value={inputURL}
            selectTextOnFocus={true}
            onChangeText={handleChangeUrl}
            onSubmitEditing={() => handleNavigate(inputURL)}
        />
        <TouchableOpacity key='newtab-btn' onPress={handleNewTab}>
            <Text> + </Text>
        </TouchableOpacity>
        {/* 标签栏 */}
        <View style={styles.tabBar}>
            <ScrollView horizontal>
                {tabs.map(tab => (
                    <View key={tab.id}>
                        <TouchableOpacity
                            onPress={() => changeActiveTab(tab.id)}
                            style={[styles.tabItem, tab.id === activeTab && styles.activeTab]}>
                            <Text style={styles.tabText}>
                                {tab.url === 'newtab' ? '新标签页' : getShortHost(tab.url)}
                                <TouchableOpacity key={`close-btn-${tab.id}`} onPress={() => handleCloseTab(activeTab)}>
                                    <Text style={{position:'relative'}}> x </Text>
                                </TouchableOpacity>
                            </Text>
                        </TouchableOpacity>
                    </View>
                ))}
            </ScrollView>
        </View>
    </View>;

    const NewPage =
    <ScrollView style={styles.newTab}>
        <Text style={styles.title}>常用网站</Text>
        {COMMON_SITES.map(site => (
            <TouchableOpacity key={site.url} onPress={() => handleNavigate(site.url)} style={styles.siteItem}>
                <Text>{site.name}</Text>
            </TouchableOpacity>
        ))}
        {QQExmails.map((item, index)=>(
            <TouchableOpacity key={item} onPress={async ()=> await jumpQQExmail(item)} style={styles.siteItem}>
                <Text>{item}</Text>
            </TouchableOpacity>
        ))}
        <Text style={styles.title}>访问历史</Text>
        {history.map((item) => (
            <View key={`site-url-text-${item.url}`} style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' }}>
                <TouchableOpacity
                    onPress={() => handleNavigate(item.url)}
                    style={[styles.siteItem, { flex: 1 }]}
                >
                    <Text style={{ flexWrap: 'wrap' }}>{item.url}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    key={`site-url-delete-${item.url}`}
                    onPress={() => deleteHistoryURL(item.url)}
                    style={styles.siteItem}
                >
                    <Text>删除</Text>
                </TouchableOpacity>
            </View>
        ))}
    </ScrollView>;

    const Window =
    <View style={{ flex: 1 }}>
        <WebView
            ref={(ref) => (webViewRefs.current[activeTab] = ref)}
            source={{ uri: currentTab.url }}
            style={{ flex: 1 }}
            onNavigationStateChange={(navState:WebViewNavigation) => {
                setInputURL(navState.url);
                setTabs(tabs.map(tab => tab.id === activeTab ? { ...tab, url: navState.url, canGoBack: navState.canGoBack } : tab));
            }}
            onShouldStartLoadWithRequest={onShouldStartLoadWithRequest} // 拦截跳转
            injectedJavaScript={getInjectJS(currentTab.url)}
        />
    </View>;

    return (
        <GestureHandlerRootView style={{ flex: 1 }}>
            <View style={{ flex: 1 }}>
                {ShowNav && NavBar}
                {/* 新标签页展示常用网站和历史记录 */}
                {currentTab?.url === 'newtab' ? NewPage : Window}
            </View>
        </GestureHandlerRootView>
    );
}

const styles = StyleSheet.create({
    navBar: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 0,
        backgroundColor: '#f5f5f5',
    },
    input: {
        flex: 1,
        height: 40,
        marginHorizontal: 8,
        borderColor: '#ccc',
        borderWidth: 1,
        paddingHorizontal: 8,
        minWidth:130,
    },
    tabBar: {
        backgroundColor: '#eee',
        paddingVertical: 4,
    },
    tabItem: {
        padding: 8,
        backgroundColor: '#d3d3d3',
        marginHorizontal: 4,
        borderRadius: 5,
    },
    activeTab: {
        backgroundColor: 'white',
    },
    tabText: {
        fontSize: 14,
    },
    newTab: {
        flex: 1,
        padding: 16,
    },
    siteItem: {
        padding: 10,
        backgroundColor: '#eee',
        marginBottom: 8,
        borderRadius: 5,
    },
    title: {
        fontWeight: 'bold',
        fontSize: 16,
        marginBottom: 8,
    },
});
