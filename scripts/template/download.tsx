import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { enableScreens } from 'react-native-screens';
import Download from '../../src/pages/tool/download/IndexScreen';
import {ApplicationProvider} from '../../src/provider/application';
import {SvgXml} from 'react-native-svg';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

enableScreens();

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

const Navigator = () => {
    return (
        <Tab.Navigator>
            <Tab.Screen name="Download" component={Download} options={{
                tabBarLabel: '下载',
                title: 'Download',
                headerShown: false,
                tabBarIcon: ({color, size}) => (
                    <SvgXml
                        width="30"
                        height="30"
                        color={color}
                        xml='<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><g id="SVGRepo_bgCarrier" stroke-width="0"></g><g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g><g id="SVGRepo_iconCarrier"> <path d="M12 7L12 14M12 14L15 11M12 14L9 11" stroke="#1C274C" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"></path> <path d="M16 17H12H8" stroke="#1C274C" stroke-width="1.5" stroke-linecap="round"></path> <path d="M2 12C2 7.28595 2 4.92893 3.46447 3.46447C4.92893 2 7.28595 2 12 2C16.714 2 19.0711 2 20.5355 3.46447C22 4.92893 22 7.28595 22 12C22 16.714 22 19.0711 20.5355 20.5355C19.0711 22 16.714 22 12 22C7.28595 22 4.92893 22 3.46447 20.5355C2 19.0711 2 16.714 2 12Z" stroke="#1C274C" stroke-width="1.5"></path> </g></svg>'
                    />
                ),
            }}/>
        </Tab.Navigator>
    );
};

export default function Dictionary() {
    return (
        <ApplicationProvider>
            <NavigationContainer>
                <Stack.Navigator initialRouteName="Download">
                    <Stack.Screen name="Download" component={Navigator} options={{ headerShown: false }}/>
                </Stack.Navigator>
            </NavigationContainer>
        </ApplicationProvider>
    );
}

