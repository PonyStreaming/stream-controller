import {MUSIC_CONTROL} from "../constants";

export type TrackMap = {[trackId: string]: Track};

export class MusicController extends EventTarget {
    private eventSource: EventSource;
    private trackCache?: TrackMap;
    private streamState: {[stream: string]: Partial<InternalStreamState>} = {};
    private upNext: {[stream: string]: string[]} = {};

    constructor(private password: string, streams: string[]) {
        super();
        this.eventSource = new EventSource(`${MUSIC_CONTROL}/api/events?password=${encodeURIComponent(password)}&channels=events,${streams.map(x => `events-${x}`).join(',')}`);
        this.eventSource.onmessage = (e) => this.handleMessage(JSON.parse(e.data));
    }

    public addEventListener(type: string, listener: EventListenerOrEventListenerObject | null, options?: boolean | AddEventListenerOptions): void {
        super.addEventListener(type, listener, options);
    }

    public async getTrackList(): Promise<TrackMap> {
        if (!this.trackCache) {
            const request = await this.fetch(`${MUSIC_CONTROL}/api/tracks`);
            const results = (await request.json()).tracks;
            // it is possible that trackCache got set while we waited, so merge our results with it if so.
            if (!this.trackCache) {
                this.trackCache = {};
            }
            this.trackCache = {...this.trackCache, ...results};
        }
        return this.trackCache!;
    }

    public async getUpNext(stream: string): Promise<string[]> {
        if (!this.upNext.hasOwnProperty(stream)) {
            const request = await this.fetch(`${MUSIC_CONTROL}/api/streams/${encodeURIComponent(stream)}/upnext`);
            const result = await request.json();
            this.upNext[stream] = result['upNext'];
        }
        return this.upNext[stream];
    }

    public async removeUpNext(stream: string, index: number): Promise<void> {
        await this.fetch(`${MUSIC_CONTROL}/api/streams/${encodeURIComponent(stream)}/upnext?index=${index}`, {
            method: "DELETE"
        });
    }

    public async addToUpNext(stream: string, trackId: string): Promise<void> {
        await this.fetch(`${MUSIC_CONTROL}/api/streams/${encodeURIComponent(stream)}/upnext`, {
            method: 'PUT',
            body: `trackId=${encodeURIComponent(trackId)}`,
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            }
        });
    }

    public async getStreamState(stream: string): Promise<StreamState> {
        if (!this.streamState.hasOwnProperty(stream)) {
            const request = await this.fetch(`${MUSIC_CONTROL}/api/streams/${encodeURIComponent(stream)}/state`);
            const result = await request.json();
            this.streamState[stream] = result.state;
        }
        return await this.cleanStreamState(this.streamState[stream]);
    }

    private async cleanStreamState(state: Partial<InternalStreamState>): Promise<StreamState> {
        return {
            autoplay: state.autoplay !== "false",
            playing: state.playing === "true",
            currentTrack: state.currentTrack,
        }
    }

    public async setAutoplay(stream: string, enabled: boolean): Promise<void> {
        await this.patchState(stream, {autoplay: enabled ? "true" : "false"});
    }

    public async skip(stream: string): Promise<void> {
        await this.patchState(stream, {skip: "true"});
    }

    public async play(stream: string): Promise<void> {
        await this.patchState(stream, {playing: "true"});
    }

    public async stop(stream: string): Promise<void> {
        await this.patchState(stream, {playing: "false"});
    }

    private handleTrackAdded(track: Track) {
        if (!this.trackCache) {
            this.trackCache = {};
        }
        this.trackCache[track.trackId] = track;
    }

    private async handleMessage(message: Message) {
        switch (message.event) {
            case "poolTrackAdded":
                this.handleTrackAdded(message.track);
                this.dispatchEvent(new PoolTrackAdded({track: message.track}));
                break;
            case "update":
                switch (message.key) {
                    case "autoplay":
                        if (this.streamState[message.stream]) {
                            this.streamState[message.stream].autoplay = message.value;
                        }
                        this.dispatchEvent(new AutoplayUpdated({stream: message.stream, enabled: message.value !== "false"}));
                        break;
                    case "playing":
                        if (this.streamState[message.stream]) {
                            this.streamState[message.stream].playing = message.value;
                        }
                        this.dispatchEvent(new PlayStateUpdated({stream: message.stream, playing: message.value === "true"}));
                        break;
                    case "currentTrack":
                        if (this.streamState[message.stream]) {
                            this.streamState[message.stream].currentTrack = (await this.getTrackList())[message.value];
                        }
                        const track = (await this.getTrackList())[message.value];
                        if (!track) {
                            break;
                        }
                        this.dispatchEvent(new NowPlayingUpdated({stream: message.stream, track}));
                        break;
                }
                break;
            case "updateUpNext":
                this.upNext[message.stream] = message.upNext;
                this.dispatchEvent(new UpNextUpdated({stream: message.stream, upNext: message.upNext}));
                break;
        }
    }

    private fetch(url: string, init?: RequestInit): Promise<Response> {
        if (url.indexOf('?') !== -1) {
            url += '&password=' + this.password;
        }  else {
            url += '?password=' + this.password;
        }
        return fetch(url, init);
    }

    private patchState(stream: string, newState: {[key: string]: string}): Promise<Response> {
        stream = encodeURIComponent(stream);
        return this.fetch(`${MUSIC_CONTROL}/api/streams/${stream}/state`, {
            method: 'PATCH',
            headers: {'Content-Type': 'application/x-www-form-urlencoded'},
            body: new URLSearchParams(newState),
        });
    }
}

export interface Track {
    trackId: string;
    trackUrl: string;
    title: string;
    artist: string;
}

export class PoolTrackAdded extends Event {
    public readonly track: Track;

    constructor(eventInit: EventInit & {track: Track}) {
        super("pooltrackadded", eventInit);
        this.track = eventInit.track;
    }
}

export class NowPlayingUpdated extends Event {
    public readonly stream: string;
    public readonly track: Track;

    constructor(eventInit: EventInit & {stream: string, track: Track}) {
        super("nowplayingupdated", eventInit);
        this.stream = eventInit.stream;
        this.track = eventInit.track;
    }
}

export class UpNextUpdated extends Event {
    public readonly stream: string;
    public readonly upNext: string[];

    constructor(eventInit: EventInit & {stream: string, upNext: string[]}) {
        super("upnextupdated", eventInit);
        this.stream = eventInit.stream;
        this.upNext = eventInit.upNext;
    }
}

export class AutoplayUpdated extends Event {
    public readonly stream: string;
    public readonly enabled: boolean;

    constructor(eventInit: EventInit & {stream: string, enabled: boolean}) {
        super("autoplayupdated", eventInit);
        this.stream = eventInit.stream;
        this.enabled = eventInit.enabled;
    }
}

export class PlayStateUpdated extends Event {
    public readonly stream: string;
    public readonly playing: boolean;

    constructor(eventInit: EventInit & {stream: string, playing: boolean}) {
        super("playstateupdated", eventInit);
        this.stream = eventInit.stream;
        this.playing = eventInit.playing;
    }
}

interface InternalStreamState {
    playing: string;
    autoplay: string;
    currentTrack: Track;
}

export interface StreamState {
    playing: boolean;
    autoplay: boolean;
    currentTrack?: Track;
}

interface UpdateMessage {
    event: "update";
    stream: string;
    key: string;
    value: string;
}

interface UpNextMessage {
    event: "updateUpNext";
    stream: string;
    upNext: string[];
}

interface SkipMessage {
    event: "skip";
    stream: string;
}

interface NewTrackMessage {
    event: "poolTrackAdded";
    track: Track;
}

type Message = UpdateMessage | UpNextMessage | SkipMessage | NewTrackMessage;