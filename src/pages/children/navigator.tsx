import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import WriteScreen from './WriteBabyEventScreen';
import StaticsScreen from './BabyEventStatsScreen';
import {SvgXml} from 'react-native-svg';
import React, {useEffect, useState} from 'react';
import ChildrenService from '../../services/children';
import {useSetting} from '../../provider/setting';
import Loading from '../../components/loading';

const Tab = createBottomTabNavigator();

const ChildrenNavigator = () => {

    const [loading, setLoading] = useState<boolean>(true);

    const {setting} = useSetting();

    useEffect(()=>{
        const init = async () => {
            await ChildrenService.init(setting);
            setLoading(false);
        };
        init();
    }, []);

    if(loading) {
        return <Loading/>;
    }

    return (
        <Tab.Navigator>
            <Tab.Screen  name="write" component={WriteScreen} options={{
                tabBarIcon: ({ color }) => (
                    <SvgXml
                        width="30"
                        height="30"
                        color={color}
                        xml='<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" stroke-width="3" stroke="#000000" fill="none"><g id="SVGRepo_bgCarrier" stroke-width="0"></g><g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g><g id="SVGRepo_iconCarrier"><path d="M55.5,23.9V53.5a2,2,0,0,1-2,2h-43a2,2,0,0,1-2-2v-43a2,2,0,0,1,2-2H41.64"></path><path d="M19.48,38.77l-.64,5.59a.84.84,0,0,0,.92.93l5.56-.64a.87.87,0,0,0,.5-.24L54.9,15.22a1.66,1.66,0,0,0,0-2.35L51.15,9.1a1.67,1.67,0,0,0-2.36,0L19.71,38.28A.83.83,0,0,0,19.48,38.77Z"></path><line x1="44.87" y1="13.04" x2="50.9" y2="19.24"></line></g></svg>'
                    />
                ),
                tabBarLabel: '记录',
                title: '记录',
                headerShown:false,
            }} />
            <Tab.Screen name="statics" component={StaticsScreen} options={{
                tabBarIcon: ({ color }) => (
                    <SvgXml
                        width="30"
                        height="30"
                        color={color}
                        xml='<svg viewBox="-5.75 0 75.771 75.771" xmlns="http://www.w3.org/2000/svg" fill="#000000"><g id="SVGRepo_bgCarrier" stroke-width="0"></g><g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g><g id="SVGRepo_iconCarrier"> <g id="Group_14" data-name="Group 14" transform="translate(-961.261 -404.164)"> <path id="Path_38" data-name="Path 38" d="M987.193,409.126a21.406,21.406,0,0,0-21.407,21.406h21.407Z" fill="#c3c2c7"></path> <path id="Path_39" data-name="Path 39" d="M962.761,447.8a30.632,30.632,0,1,0,30.632-30.632V447.8Z" fill="none" stroke="#000000" stroke-linecap="round" stroke-linejoin="round" stroke-width="3" opacity="0.15"></path> <path id="Path_40" data-name="Path 40" d="M962.761,436.3a30.632,30.632,0,1,0,30.632-30.632V436.3Z" fill="none" stroke="#000000" stroke-linejoin="round" stroke-width="3"></path> </g> </g></svg>'
                    />
                ),
                tabBarLabel: '统计',
                title: '统计',
                headerShown:false,
            }} />
        </Tab.Navigator>
    );
};
export default ChildrenNavigator;
