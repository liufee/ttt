import {NativeModules} from 'react-native';
import {userErrorMessage} from '../utils';
import {Setting} from './setting';

export abstract class AbstractService<T> {
    protected static instance: any;
    protected static initialized: boolean = false;
    protected static initPromise: Promise<void> | null = null;

    protected constructor() {}

    static async init<T>(
        this: {
            new (): T & AbstractService<T>;
            instance?: T;
            initialized?: boolean;
            initPromise?: Promise<void> | null;
        },
        setting: Setting
    ) {
        if (this.initialized) {
            return;
        }

        if (!this.initPromise) {
            this.instance = new this();
            this.initPromise = this.instance.onInit(setting)
                .then(() => {
                    this.initialized = true;
                });
        }

        await this.initPromise;
    }

    protected abstract onInit(setting: Setting): Promise<void>;

    static getInstance<T>(
        this: { instance?: T; initialized?: boolean }
    ): T {
        if (!this.initialized || !this.instance) {
            throw new Error('Service not initialized');
        }
        return this.instance;
    }

    static getInstanceNoNeedInit<T>(
        this: {
            new (): T & AbstractService<T>;
            instance?: T;
        }
    ): T {
        if (!this.instance) {
            this.instance = new this();
        }
        return this.instance;
    }

    protected readonly serviceType: 'weibo' | 'exercise' | 'children' | null = null;

    protected async callGo(service: string, payload?: any, options?:{ forceStringify?: boolean; forceParse?: boolean; disableParse?: boolean; } ):Promise<[boolean, any]>{
        try {
            if (!this.serviceType) {
                throw new Error('serviceType is required for callGo');
            }
            let args = payload;
            if ( options?.forceStringify || (!options?.forceStringify && this.shouldStringify(payload)) ) {
                args = JSON.stringify(payload);
            }
            console.log('callGo', service, args);

            let callFn = null;
            switch (this.serviceType){
                case 'weibo':
                    callFn = NativeModules.RNHelper.callWeiboSrv;
                    break;
                case 'exercise':
                    callFn = NativeModules.RNHelper.callExerciseSrv;
                    break;
                case 'children':

                    callFn = NativeModules.RNHelper.callChildrenSrv;
                    break;
                default:
                    return [false, 'not existed service:' + this.serviceType]
            }
            const result = await callFn(service, args);
            console.log('callGo result', result.slice(0, 100));
            if(this.hasError(result)){
                return [false, result];
            }

            if (options?.disableParse) {
                return [true, result];
            }

            if (options?.forceParse) {
                return [true, JSON.parse(result)];
            }

            const s = result.trim();
            if ( (s.startsWith('{') && s.endsWith('}')) || (s.startsWith('[') && s.endsWith(']'))) {
                try {
                    return [true, JSON.parse(s)];
                } catch {
                    return [true, result];
                }
            }
            return [true, result];
        }catch (e){
            return [false, userErrorMessage(e)];
        }
    }

    private shouldStringify(v: any): boolean {
        if (v === null || v === undefined) {return false;}
        if (typeof v === 'string') {return false;}
        return !(typeof v === 'number' || typeof v === 'boolean');
    }

    private hasError(str):boolean{
        return str.indexOf('error:') === 0;
    }
}
