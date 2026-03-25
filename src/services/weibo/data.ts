import {User} from './model';

export const BianshenHuangGuaGeiNiYongUID:string = '1570737487';
export const ZunshoujimochengxuID:string = '2127717142';
export const HuiHuiID:string = '3';

export const usernames:User[] = [
    {
        'id': BianshenHuangGuaGeiNiYongUID,
        'name': '变身黄瓜给你用',
        'avatar': 'users/' + BianshenHuangGuaGeiNiYongUID + '.jpg',
    },
    {
        'id': ZunshoujimochengxuID,
        'name': '遵守寂寞程序',
        'avatar': 'users/' + ZunshoujimochengxuID + '.jpg',
    },
    {
        'id': HuiHuiID,
        'name': '灰灰',
        'avatar': 'users/' + HuiHuiID + '.jpg',
    },
];

export const anonymousUsernames:User[] = [
    {
        'id': BianshenHuangGuaGeiNiYongUID,
        'name': '匿名1号',
        'avatar': 'users/anonymous.jpeg',
    },
    {
        'id': ZunshoujimochengxuID,
        'name': '匿名2号',
        'avatar': 'users/anonymous2.jpeg',
    },
    {
        'id': HuiHuiID,
        'name': '匿名3号',
        'avatar': 'users/anonymous3.jpeg',
    },
];

export const getEnabledUsers = (enabledUserIds:string[], anonymous:number) => {
    const enabledUsers = usernames.map(item => ({ ...item })).filter(item => enabledUserIds.includes(item.id));
    for(let i in enabledUsers){
        const user = enabledUsers[i];
        const anonymousUser = anonymousUsernames.find(item => item.id === user.id);
        if(anonymous === 1 && anonymousUser){
            user.name = anonymousUser.name;
            user.avatar = anonymousUser.avatar;
        }else if(anonymous === 2 && anonymousUser){
            user.name = anonymousUser.name;
        } if(anonymous === 3 && anonymousUser){
            user.avatar = anonymousUser.avatar;
        }
    }
    return enabledUsers;
};

export const ByFeehiAPP = 88;
export const bies = {
    ByFeehiAPP: {
        'id': ByFeehiAPP,
        'title':'手机客户端',
        'url': '',
    },
};

