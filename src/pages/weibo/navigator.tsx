import React, {useEffect, useState} from 'react';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import {createStackNavigator} from '@react-navigation/stack';
import {useSetting} from '../../provider/setting';
import { SvgXml } from 'react-native-svg';
import Loading from '../../components/loading';
import WeiboService, {NewsService} from '../../services/weibo';
import AiScreen from './AiScreen';
import HotSearchScreen from './HotSearchScreen';
import WeiboIndex,{tabPressEmitter} from './IndexScreen';
import WeiboDetail from './DetailScreen';
import WeiboSearch from './SearchScreen';
import TSRVerifyScreen from './TSRVerifyScreen';
import RepostScreen from './RepostScreen';

const Tab = createBottomTabNavigator();

const WeiboNavigator = () => {
    const [loading, setLoading] = useState<boolean>(true);

    const {setting} = useSetting();

    useEffect(()=>{
        const init = async () => {
            await WeiboService.init(setting);
            await NewsService.init(setting);
            setLoading(false);
        };
       init();
    }, []);

    if(loading) {
        return <Loading/>;
    }

    return (
        <Tab.Navigator>
            <Tab.Screen name="hotSearchList" component={HotSearchScreen} options={{
                tabBarLabel: '热搜',
                title: '热搜',
                headerShown:false,
                tabBarIcon: ({ color, size }) => (
                    <SvgXml
                        width="30"
                        height="30"
                        color={color}
                        xml='<svg viewBox="0 0 192 192" xmlns="http://www.w3.org/2000/svg" fill="#000000"><g id="SVGRepo_bgCarrier" stroke-width="0"></g><g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g><g id="SVGRepo_iconCarrier"><path d="M29.977 29.889h132.021v131.89H29.977zm33.749 34.092v0m30.34 0h36.211M63.726 96.06v0m30.34 0h36.211m-67.05 31.936v0m30.34 0h36.211" style="fill:none;stroke:#000000;stroke-width:12;stroke-linecap:round;stroke-linejoin:round;stroke-miterlimit:57.5;paint-order:stroke markers fill"></path></g></svg>'
                    />
                ),
            }} />
            <Tab.Screen  name="index" component={WeiboIndexStack} options={{
                tabBarIcon: ({ color }) => (
                    <SvgXml
                        width="30"
                        height="30"
                        color={color}
                        xml='<?xml version="1.0" encoding="utf-8"?><svg width="800px" height="800px" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><g><path fill="none" d="M0 0h24v24H0z"/><path fill-rule="nonzero" d="M20.194 14.197c0 3.362-4.53 6.424-9.926 6.424C5.318 20.62 1 18.189 1 14.534c0-1.947 1.18-4.087 3.24-6.088 2.832-2.746 6.229-4.033 7.858-2.448.498.482.723 1.122.719 1.858 1.975-.576 3.65-.404 4.483.752.449.623.532 1.38.326 2.207 1.511.61 2.568 1.77 2.568 3.382zm-4.44-2.07c-.386-.41-.4-.92-.198-1.41.208-.508.213-.812.12-.94-.264-.368-1.533-.363-3.194.311a2.043 2.043 0 0 1-.509.14c-.344.046-.671.001-.983-.265-.419-.359-.474-.855-.322-1.316.215-.67.18-1.076.037-1.215-.186-.18-.777-.191-1.659.143-1.069.405-2.298 1.224-3.414 2.306C3.925 11.54 3 13.218 3 14.534c0 2.242 3.276 4.087 7.268 4.087 4.42 0 7.926-2.37 7.926-4.424 0-.738-.637-1.339-1.673-1.652-.394-.113-.536-.171-.767-.417zm7.054-1.617a1 1 0 0 1-1.936-.502 4 4 0 0 0-4.693-4.924 1 1 0 1 1-.407-1.958 6 6 0 0 1 7.036 7.384z"/></g></svg>'
                    />
                ),
                tabBarLabel: '微博',
                title:'微博',
                headerShown:false,
            }}
             listeners={({ navigation }) => ({
                 tabPress: () => {
                     if (navigation.isFocused()) {
                         tabPressEmitter.emit('refresh');
                     }
                 },
             })}
            />
            <Tab.Screen  name="search" component={WeiboSearchStack} options={{
                tabBarIcon: ({ color }) => (
                    <SvgXml
                        width="30"
                        height="30"
                        color={color}
                        xml='<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><g id="SVGRepo_bgCarrier" stroke-width="0"></g><g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g><g id="SVGRepo_iconCarrier"> <path d="M14.9536 14.9458L21 21M17 10C17 13.866 13.866 17 10 17C6.13401 17 3 13.866 3 10C3 6.13401 6.13401 3 10 3C13.866 3 17 6.13401 17 10Z" stroke="#000000" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path> </g></svg>'
                    />
                ),
                tabBarLabel: '搜索',
                title:'搜索',
                headerShown:false,
            }} />
            <Tab.Screen name="ai" component={AiScreen} options={{
                tabBarIcon: ({ color }) => (
                    <SvgXml
                        width="30"
                        height="30"
                        color={color}
                        xml='<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><g id="SVGRepo_bgCarrier" stroke-width="0"></g><g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g><g id="SVGRepo_iconCarrier"> <path d="M4 4C4 3.44772 4.44772 3 5 3H14H14.5858C14.851 3 15.1054 3.10536 15.2929 3.29289L19.7071 7.70711C19.8946 7.89464 20 8.149 20 8.41421V20C20 20.5523 19.5523 21 19 21H5C4.44772 21 4 20.5523 4 20V4Z" stroke="#200E32" stroke-width="1.56" stroke-linecap="round"></path> <path d="M20 8H15V3" stroke="#200E32" stroke-width="1.56" stroke-linecap="round" stroke-linejoin="round"></path> <path d="M9 17L10 13H11L12 17" stroke="#200E32" stroke-width="1.56" stroke-linecap="round" stroke-linejoin="round"></path> <path d="M9.5 16L11.5 16" stroke="#200E32" stroke-width="1.56" stroke-linecap="round" stroke-linejoin="round"></path> <path d="M14 13V17" stroke="#200E32" stroke-width="1.56" stroke-linecap="round" stroke-linejoin="round"></path> </g></svg>'
                    />
                ),
                tabBarLabel: 'Ai',
                title: 'Ai',
                headerShown:false,
            }} />
        </Tab.Navigator>
    );
};

const Stack = createStackNavigator();
const WeiboIndexStack = ()=> {
    return (
        <Stack.Navigator>
            <Stack.Screen options={{ headerShown:false}} name="Index" component={WeiboIndex}/>
            <Stack.Screen options={{ headerShown:false}} name="WeiboDetail" component={WeiboDetail}/>
            <Stack.Screen options={{ headerShown:false}} name="Repost" component={RepostScreen}/>
            <Stack.Screen options={{ headerShown:false}} name="TSRVerify" component={TSRVerifyScreen}/>
        </Stack.Navigator>
    );
};

const WeiboSearchStack = ()=> {
    return (
        <Stack.Navigator>
            <Stack.Screen options={{ headerShown:false}} name="Search" component={WeiboSearch}/>
            <Stack.Screen options={{ headerShown:false}} name="WeiboDetail" component={WeiboDetail}/>
            <Stack.Screen options={{ headerShown:false}} name="Repost" component={RepostScreen}/>
            <Stack.Screen options={{ headerShown:false}} name="TSRVerify" component={TSRVerifyScreen}/>
        </Stack.Navigator>
    );
};

export default WeiboNavigator;

