export const childrenList = {
    'son':'👦 儿子', 'daughter':'👧 女儿',
};

export enum EventType {
    Eat = 'eat',
    Poop = 'poop',
    Pee = 'pee',
    Sleep = 'sleep',
    Cry = 'cry',
}

export const newBornEvents = {
    [EventType.Eat]: '吃', [EventType.Poop]:'拉', [EventType.Pee]:'撒', [EventType.Sleep]:'睡', [EventType.Cry]:'闹',
};

export interface BaseEvent {
    id:string,
    child: string
    eventType: EventType
    startTime: string
    endTime: string
    duration: number
}

export interface EatEvent extends BaseEvent {
    eventType: EventType.Eat
    amount: number
}

export interface PoopEvent extends BaseEvent {
    eventType: EventType.Poop
    type: string
    color: string
}

export interface PeeEvent extends BaseEvent {
    eventType: EventType.Pee
    level: string
}

export interface SleepEvent extends BaseEvent {
    eventType: EventType.Sleep
}

export interface CryEvent extends BaseEvent {
    eventType: EventType.Cry
    level: string
}

export type Event =
    | EatEvent
    | PoopEvent
    | PeeEvent
    | SleepEvent
    | CryEvent
