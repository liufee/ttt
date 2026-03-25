import Detail from './DetailScreen';
import React from 'react';
import NovelList from './ListScreen';
import Novel from '../../../db/novel';

import { createStackNavigator } from '@react-navigation/stack';
import {AppDBBasePath} from '../../../constant';

const Stack = createStackNavigator();

const NovelStack = ()=> {
    Novel.init(`${AppDBBasePath}/novel`);
    return (
        <Stack.Navigator>
            <Stack.Screen options={{headerShown:false}} name="NovelList" component={NovelList} />
            <Stack.Screen options={{headerShown:false}} name="NovelDetail" component={Detail} />
        </Stack.Navigator>
    );
};

export default NovelStack;
