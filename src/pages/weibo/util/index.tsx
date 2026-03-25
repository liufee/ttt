import {Image, Linking, Text, TouchableOpacity, NativeModules} from 'react-native';
import React from 'react';
import {Coordinates, Location} from '../../../services/weibo/model';
import config from '../../../config';
import {getEmojiMap} from '../../../services/weibo/emoj';

export const formatWeiboContent = (html) => {
        const regex = /(\[([^\]]+)\])|(<a\s+[^>]*?href\s*=\s*(?:"([^"]+)"|'([^']+)'|([^>\s]+))[^>]*?>([\s\S]*?)<\/a>)|(<img\s+[^>]*?src\s*=\s*(?:"([^"]+)"|'([^']+)'|([^>\s]+))[^>]*?>)/gi;
        const parts = [];
        let lastIndex = 0;
        let keyIndex = 0;

        html.replace(regex, (match, bracketTag, bracketContent, aTag, href1, href2, href3, aContent, imgTag, src1, src2, src3, offset) => {
            const href = href1 || href2 || href3;
            const src = src1 || src2 || src3;

            // 处理 a/img 标签之前的文本
            if (lastIndex < offset) {
                parts.push(<Text key={keyIndex++}>{html.slice(lastIndex, offset)}</Text>);
            }

            if (aTag) {
                // 处理 a 标签
                const innerParts = [];
                const imgRegex = /<img\s+[^>]*?src\s*=\s*(?:"([^"]+)"|'([^']+)'|([^>\s]+))[^>]*?>/gi;
                let lastImgIndex = 0;

                aContent.replace(imgRegex, (imgMatch, imgSrc1, imgSrc2, imgSrc3, imgOffset) => {
                    const imgSrc = imgSrc1 || imgSrc2 || imgSrc3;

                    // 处理 a 标签内的普通文本
                    if (lastImgIndex < imgOffset) {
                        innerParts.push(<Text key={keyIndex++}>{aContent.slice(lastImgIndex, imgOffset)}</Text>);
                    }
                    // 处理 img
                    innerParts.push(
                        <Image key={keyIndex++} source={{ uri: imgSrc }} style={{ width: 20, height: 20 }} />
                    );
                    lastImgIndex = imgOffset + imgMatch.length;
                });

                // 处理 a 标签剩余的文本
                if (lastImgIndex < aContent.length) {
                    innerParts.push(<Text key={keyIndex++}>{aContent.slice(lastImgIndex)}</Text>);
                }

                parts.push(
                    <TouchableOpacity key={keyIndex++} onPress={() => Linking.openURL(href)}>
                        {innerParts}
                    </TouchableOpacity>
                );
            } else if (imgTag) {
                // 处理 img 标签
                parts.push(
                    <Image key={keyIndex++} source={{ uri: src }} style={{ width: 20, height: 20 }} />
                );
            }else if (bracketTag) {
                parts.push(
                    <Image key={keyIndex++} source={{ uri: getEmojiMap()[bracketContent] }} style={{ width: 20, height: 20 }} />
                );
            }

            lastIndex = offset + match.length;
        });

        // 处理剩余文本
        if (lastIndex < html.length) {
            parts.push(<Text key={keyIndex++}>{html.slice(lastIndex)}</Text>);
        }

        return parts;
};

export const formatNewsContent = async (uid: string, href:string, text:string) => {
    let body = '';
    if( uid === 110){
        /*body = await NativeModules.RNHelper.httpClient(JSON.stringify({
            method: 'GET',
            url: href,
            proxy: cfg.httpProxyURL,
        }));*/
        const response = await fetch(href);
        body = await response.text();
    }else{
        const response = await fetch(href);
        body = await response.text();
    }

    let xpath = '';
    if(uid === 101){
        xpath = "//article[@id='article-body']/p/text()";
    }
    if(uid === 102){
        xpath = "//div[@class='body-content']/p/text()";
    }
    if(uid === 103){
        xpath = "//div[@id='article-body']/p/text()";
    }
    if(uid === 104){
        xpath = "//div[contains(@class, 'article-body__content')]//div/text()";
    }
    if(uid === 105){
        xpath = "//div[@data-component='text-block']/p/text()";
    }
    if(uid === 106){
        xpath = "//div[contains(@class, 'sdc-article-body')]/p/text()";
    }
    if(uid === 107){
        return parseFTDetail(body);
    }
    if(uid === 108){
        xpath = '//section/div/p/text()';
    }
    if(uid === 109){
        xpath = "//div[contains(@class, 'article-body-commercial-selector')]/p/text()";
    }
    if(uid === 110){
        xpath = "//div[@class='article-paragraph']/text()";
    }
    if(uid === 111){
        xpath = "//p[@class='t-content__chapo']/text() | //div[contains(@class, 't-content__body')]/p/text()";
    }
    let str = await NativeModules.RNHelper.parseNews('common', 'detail', body, xpath);
    str = str.replace(/^\s+/, '');
    return text + '\n' + str;
};

const parseFTDetail = (html) =>{
        const regex = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/;
        const match = html.match(regex);
        if (match && match[1]) {
            try {
                const jsonData = JSON.parse(match[1]);
                return jsonData.articleBody || '';
            } catch (e) {
                console.error('JSON 解析失败:', e);
                return '';
            }
        }
        return '';
};

export function isWithinDistance(a: Coordinates, b: Coordinates, maxDistanceMeters: number): boolean {
    const R = 6371000;
    const toRad = (deg: number) => (deg * Math.PI) / 180;

    const φ1 = toRad(a.latitude);
    const φ2 = toRad(b.latitude);
    const Δφ = toRad(b.latitude - a.latitude);
    const Δλ = toRad(b.longitude - a.longitude);

    const x =
        Math.sin(Δφ / 2) ** 2 +
        Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;

    const c = 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
    const d = R * c;

    return d <= maxDistanceMeters;
}

export function findFirstWithinDistance(point: Coordinates, locations: Location[], maxDistanceMeters: number): Location | null {
    for (const loc of locations) {
        if (isWithinDistance(point, loc.coordinates, maxDistanceMeters)) {
            return loc;
        }
    }
    return null;
}

export async function getCurrentLocationWithAddress():Promise<[boolean, Location|null, string]> {
    await NativeModules.RNHelper.initAMapSDK(config.gaoDeAPIKey.android);

    let needRetry = true;
    let loc: any = '';
    while (needRetry) {
        try {
            loc = await NativeModules.RNHelper.getCurrentLocation();
            //await new Promise<void>(resolve => setTimeout(resolve, 3000));
            //loc = {longitude:113.848767, latitude:22.600988}
            break;
        } catch (e: any) {
            if (e.toString().indexOf('INVALID_USER_SCODE') !== -1) {
                needRetry = true;
            } else {
                needRetry = false;
            }
        }
    }

    if (!loc){
        return [false, null, '定位失败，信号丢失'];
    }

    let address = '';

    const localMatch = findFirstWithinDistance({ longitude: loc.longitude, latitude: loc.latitude }, config.locations, 100);

    if (localMatch) {
        address = localMatch.address;
    } else {
        try {
            const response = await fetch(
                `https://restapi.amap.com/v3/geocode/regeo?key=${config.gaoDeAPIKey.web}&location=${loc.longitude},${loc.latitude}`
            );
            if (!response.ok) {
                return [false, null, '定位失败,调接口坐标转地址失败:' + response.status + ',' + response.statusText];
            }
            const result = await response.json();
            address = result.regeocode.formatted_address;
        } catch {
            return [false, null, '地址解析失败'];
        }
    }

    return [true, {address, coordinates: {latitude: loc.latitude, longitude: loc.longitude}}, ''];
}
