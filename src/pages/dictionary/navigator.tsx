import React, {useState, useEffect} from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SvgXml } from 'react-native-svg';
import Loading from '../../components/loading';
import {useSetting} from '../../provider/setting';
import fullLang from '../../config/_generated/lang.json';
import DictionaryService from '../../services/dictionary';
import WordService from '../../services/dictionary/word';
import RememberWordScreen from './RememberWordScreen';
import WordSearch from './WordSearchScreen';
import NewWordBook from './NewWordBookScreen';
import WordTest from './TestWordScreen';

const language = fullLang.dictionary;
const Tab = createBottomTabNavigator();

const DictionaryNavigator = () => {
    const [loading, setLoading] = useState<boolean>(true);
    const [newWordsCount, setNewWordsCount] = useState<number>(0);
    const [testWordsCount, setTestWordsCount] = useState<number>(0);

    const {setting} = useSetting();

    useEffect(()=>{
        const init = async()=>{
            await WordService.init(setting);
            await DictionaryService.init(setting);
            setLoading(false);

            const dictionaryService = DictionaryService.getInstance();
            let cnt = await dictionaryService.getSearchHisCountByStatus(0);
            setNewWordsCount(cnt);
            cnt = await dictionaryService.getSearchHisCountByStatus(1);
            setTestWordsCount(cnt);
        };

        init();
    }, []);

    if(loading){
        return <Loading/>;
    }

    return (
        <Tab.Navigator>
            <Tab.Screen  name="wordSearch" component={WordSearch} options={{
                tabBarIcon: ({ color }) => (
                    <SvgXml
                        width="30"
                        height="30"
                        color={color}
                        xml='<?xml version="1.0" encoding="utf-8"?><svg width="800px" height="800px" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M21.842 21.134l-6.843-6.843a7.317 7.317 0 1 0-.708.708l6.843 6.843a.5.5 0 1 0 .708-.708zM9.5 15.8a6.3 6.3 0 1 1 6.3-6.3 6.307 6.307 0 0 1-6.3 6.3z"/><path fill="none" d="M0 0h24v24H0z"/></svg>'
                    />
                ),
                tabBarLabel: language.searchWord,
                title: language.searchWord,
                headerShown:true,
            }} />
            <Tab.Screen name="rememberWord" component={RememberWordScreen} options={{
                tabBarIcon: ({ color }) => (
                    <SvgXml
                        width="30"
                        height="30"
                        color={color}
                        xml='<svg version="1.0" id="Layer_1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 64 64" enable-background="new 0 0 64 64" xml:space="preserve" fill="#000000"><g id="SVGRepo_bgCarrier" stroke-width="0"></g><g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g><g id="SVGRepo_iconCarrier"> <g> <path fill="#231F20" d="M24.008,32.038L9.541,27.904c-0.527-0.146-1.084,0.155-1.236,0.688c-0.151,0.53,0.156,1.084,0.688,1.236 l14.467,4.134C23.551,33.987,23.643,34,23.734,34c0.435,0,0.835-0.286,0.961-0.726C24.847,32.744,24.539,32.19,24.008,32.038z"></path> <path fill="#231F20" d="M24.008,39.038L9.541,34.905c-0.527-0.146-1.084,0.155-1.236,0.688c-0.151,0.531,0.156,1.084,0.688,1.236 l14.467,4.133C23.551,40.987,23.643,41,23.734,41c0.435,0,0.835-0.286,0.961-0.726C24.847,39.743,24.539,39.19,24.008,39.038z"></path> <path fill="#231F20" d="M24.008,25.038L9.541,20.904c-0.527-0.146-1.084,0.155-1.236,0.688c-0.151,0.53,0.156,1.084,0.688,1.236 l14.467,4.134C23.551,26.987,23.643,27,23.734,27c0.435,0,0.835-0.286,0.961-0.726C24.847,25.744,24.539,25.19,24.008,25.038z"></path> <path fill="#231F20" d="M24.008,18.038L9.541,13.904c-0.527-0.146-1.084,0.155-1.236,0.688c-0.151,0.53,0.156,1.084,0.688,1.236 l14.467,4.134C23.551,19.987,23.643,20,23.734,20c0.435,0,0.835-0.286,0.961-0.726C24.847,18.744,24.539,18.19,24.008,18.038z"></path> <path fill="#231F20" d="M39.963,33.962c0.092,0,0.184-0.013,0.275-0.038l14.467-4.134c0.531-0.152,0.839-0.706,0.688-1.236 c-0.152-0.532-0.708-0.832-1.236-0.688L39.689,32c-0.531,0.152-0.839,0.706-0.688,1.236C39.128,33.676,39.528,33.962,39.963,33.962 z"></path> <path fill="#231F20" d="M54.459,34.905l-14.467,4.133c-0.531,0.152-0.839,0.705-0.688,1.236C39.431,40.714,39.831,41,40.266,41 c0.092,0,0.184-0.013,0.275-0.038l14.467-4.133c0.531-0.152,0.839-0.705,0.688-1.236C55.543,35.061,54.987,34.761,54.459,34.905z"></path> <path fill="#231F20" d="M54.459,20.904l-14.467,4.134c-0.531,0.152-0.839,0.706-0.688,1.236C39.431,26.714,39.831,27,40.266,27 c0.092,0,0.184-0.013,0.275-0.038l14.467-4.134c0.531-0.152,0.839-0.706,0.688-1.236C55.543,21.06,54.987,20.758,54.459,20.904z"></path> <path fill="#231F20" d="M54.459,13.904l-14.467,4.134c-0.531,0.152-0.839,0.706-0.688,1.236C39.431,19.714,39.831,20,40.266,20 c0.092,0,0.184-0.013,0.275-0.038l14.467-4.134c0.531-0.152,0.839-0.706,0.688-1.236C55.543,14.06,54.987,13.76,54.459,13.904z"></path> <path fill="#231F20" d="M63.219,0.414c-0.354-0.271-0.784-0.413-1.221-0.413c-0.172,0-0.345,0.022-0.514,0.066L32,7.93L2.516,0.067 c-0.17-0.045-0.343-0.066-0.515-0.066c-0.437,0-0.866,0.142-1.22,0.413C0.289,0.793,0,1.379,0,2v49.999 c0,0.906,0.609,1.699,1.484,1.933l25.873,6.899C28.089,62.685,29.887,64,32,64s3.911-1.315,4.643-3.169l25.873-6.899 C63.391,53.698,64,52.905,64,51.999V2C64,1.379,63.711,0.793,63.219,0.414z M32,54c0.173,0,0.347-0.022,0.516-0.067L62,46.07v1.954 l-30,7.941L2,48.024V46.07l29.484,7.862C31.653,53.978,31.827,54,32,54z M1.998,2.001c0,0,0.001,0,0.003,0V2L31,9.733v42L2,44 L1.998,2.001z M34.979,59.205c-0.079,1.143-0.785,2.111-1.788,2.546l-0.676,0.181c-0.169,0.045-0.343,0.067-0.516,0.067 s-0.347-0.022-0.516-0.067l-0.676-0.181c-1.003-0.435-1.709-1.403-1.788-2.546L2,51.999v-1.906l29.744,7.874 C31.828,57.989,31.914,58,32,58s0.172-0.011,0.256-0.033L62,50.093v1.906L34.979,59.205z M33,51.733v-42L62,2v42L33,51.733z"></path> </g> </g></svg>'
                    />
                ),
                tabBarLabel: language.rememberWord,
                title: language.rememberWord,
                headerShown:true,
            }} />
            <Tab.Screen name="newWordBook" component={NewWordBook} options={{
                tabBarIcon: ({ color }) => (
                    <SvgXml
                        width="30"
                        height="30"
                        color={color}
                        xml='<?xml version="1.0" encoding="utf-8"?><svg width="800px" height="800px" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M18.003 3A7.646 7.646 0 0 0 12.5 5.277 7.646 7.646 0 0 0 6.997 3a7.532 7.532 0 0 0-5.833 2.686.79.79 0 0 0-.164.493v13.59a.833.833 0 0 0 .499.755.894.894 0 0 0 .879-.083A8.187 8.187 0 0 1 7 19.033a7.832 7.832 0 0 1 5.153 1.841l.31.355.384-.355A7.832 7.832 0 0 1 18 19.034a8.185 8.185 0 0 1 4.624 1.41.903.903 0 0 0 .875.081.834.834 0 0 0 .501-.755V6.179a.79.79 0 0 0-.161-.49A7.536 7.536 0 0 0 18.003 3zM2 19.49V6.24A6.53 6.53 0 0 1 6.997 4 6.568 6.568 0 0 1 12 6.244v13.253a9.16 9.16 0 0 0-5-1.464 9.266 9.266 0 0 0-5 1.456zm21 0a9.262 9.262 0 0 0-5-1.457 9.16 9.16 0 0 0-5 1.464V6.244a6.697 6.697 0 0 1 10-.005z"/><path fill="none" d="M0 0h24v24H0z"/></svg>'
                    />
                ),
                tabBarLabel: language.newWord + (newWordsCount !== 0 ? '(' + newWordsCount + ')' : ''),
                title: language.newWord,
                headerShown:true,
            }} />
            <Tab.Screen name="wordTest" component={WordTest} options={{
                tabBarIcon: ({ color }) => (
                    <SvgXml
                            width="30"
                            height="30"
                            color={color}
                            xml='<?xml version="1.0" encoding="utf-8"?><svg width="800px" height="800px" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M16 10H8V9h8zm-4.87 11l1.064 1H3.5C2.122 22 1 20.43 1 18.5S2.122 15 3.5 15H5V5.75C5 3.682 6.122 2 7.5 2h13c1.378 0 2.45 1.57 2.45 3.5S21.878 9 20.5 9H19v7.138l-1 .979V5.75A5.994 5.994 0 0 1 18.64 3H7.5C6.792 3 6 4.176 6 5.75V15h10.57l-.71.826A4.141 4.141 0 0 0 15 18.5a5.186 5.186 0 0 0 .047.692l-1.032-.971A5.555 5.555 0 0 1 14.557 16H3.5C2.701 16 2 17.168 2 18.5S2.701 21 3.5 21zM19 8h1.5c.799 0 1.55-1.168 1.55-2.5S21.299 3 20.5 3h-.677A4.62 4.62 0 0 0 19 5.75zM8 13h8v-1H8zm8-7H8v1h8zm6.491 8.819l-6.998 6.851-2.832-2.663-.685.728 3.53 3.321 7.685-7.522z"/><path fill="none" d="M0 0h24v24H0z"/></svg>'
                    />
                ),
                tabBarLabel: language.wordTest + (testWordsCount !== 0 ? '(' + testWordsCount + ')' : ''),
                title: language.wordTest,
                headerShown:true,
            }} />
        </Tab.Navigator>
    );
};
export default DictionaryNavigator;
