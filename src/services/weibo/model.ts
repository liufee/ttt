export interface Weibo {
    id:string
    type:number
    text: string
    media: Media[]
    comments: Comment[]
    forwardCount: number
    likeCount: number
    commentCount: number
    createdAt: string
    uid:string
    user:User
    repost:Weibo|null
    location: Location|null
    by: By
    tsr: number
    tsrVerified: number
}

export interface Media {
    Mime:string,
    Origin:string
    LivePhoto:string
    IsLarge:number
}

export interface Comment{
    id: string
    text:string
    author:User
    replyToComment: Comment|null
    location:Location|null
    media:Media[]
    createdAt:string
    tsr: number
    tsrVerified:number
}

export interface User{
    id:string
    name:string
    avatar:string
}

export interface Like{
    id:string
    user:User
    count:number
}

export interface Location{
    coordinates: Coordinates
    address: string
}

export interface Coordinates{
    longitude: number
    latitude: number
}

export interface By{
    id:number
    title:string
    url:string
}

export interface TSR{
    type:string
    thirdId:string
    tsr:string
}

export interface BeenPosted {
    id: string
    user: User
    text: string
    time: string
}

export enum MediaType{
    Image = 'image',
    Video = 'video',
    Audio = 'audio',
}
