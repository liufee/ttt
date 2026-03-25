import React from 'react';
import {createStackNavigator} from '@react-navigation/stack';
import IndexScreen from './IndexScreen';
import MessageDetailScreen from './MessageDetailScreen';
import SettingScreen from './SettingScreen';

const Stack = createStackNavigator();

const IndexNavigator = () => {
    return (
        <Stack.Navigator>
            <Stack.Screen options={{ headerShown:false}} name="Index" component={IndexScreen}/>
            <Stack.Screen options={{ headerShown:false}} name="Setting" component={SettingScreen}/>
            <Stack.Screen options={{ headerShown:false}} name="MessageDetail" component={MessageDetailScreen}/>
        </Stack.Navigator>
    );
};

export default IndexNavigator;

