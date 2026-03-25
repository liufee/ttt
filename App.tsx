import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { enableScreens } from 'react-native-screens';
import {ApplicationProvider} from './src/provider/application';
import IndexNavigator from './src/pages/index/navigator';
import ExerciseNavigator from './src/pages/exercise/navigator';
import DictionaryNavigator from './src/pages/dictionary/navigator';
import ToolNavigator from './src/pages/tool/navigator';
import WeiboNavigator from './src/pages/weibo/navigator';
import ChildrenNavigator from './src/pages/children/navigator';
import MeNavigator from './src/pages/me/navigator';

enableScreens();


const Stack = createStackNavigator();


export default function App() {
    return (
        <ApplicationProvider>
            <NavigationContainer>
                <Stack.Navigator initialRouteName="IndexNavigator">
                    <Stack.Screen name="IndexNavigator" options={{ headerShown: false }}  component={IndexNavigator} />
                    <Stack.Screen name="DictionaryNavigator" options={{ headerShown: false }}  component={DictionaryNavigator} />
                    <Stack.Screen name="ExerciseNavigator" options={{ headerShown: false }}  component={ExerciseNavigator} />
                    <Stack.Screen name="ToolNavigator" options={{ headerShown: false }}  component={ToolNavigator} />
                    <Stack.Screen name="WeiboNavigator" options={{ headerShown: false }}  component={WeiboNavigator} />
                    <Stack.Screen name="ChildrenNavigator" options={{ headerShown: false }}  component={ChildrenNavigator} />
                    <Stack.Screen name="MeNavigator" options={{ headerShown: false }}  component={MeNavigator} />
                </Stack.Navigator>
            </NavigationContainer>
        </ApplicationProvider>
    );
}
