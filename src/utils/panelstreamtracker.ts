import {STREAM_TRACKER} from "../constants";

export interface Stream {
    key: string;
    live: boolean;
    prerec?: string;
}

interface StreamMap {
    streams: {[key: string]: Stream};
}

export class StreamUpdatedEvent extends Event {
    public readonly stream: Stream;

    constructor(eventInit: EventInit & {stream: Stream}) {
        super("streamupdated", eventInit);
        this.stream = eventInit.stream;
    }
}

export class PanelStreamTracker extends EventTarget {
    private _ready = false;
    private _mapping = new Map<string, Stream>();
    private _eventsource = null as EventSource | null;

    constructor(private readonly password: string) {
        super();
    }

    public close() {
        if (this._eventsource) {
            this._eventsource.close();
        }
    }

    public get ready(): boolean {
        return this._ready;
    }


    public async start() {
        const result = await fetch(STREAM_TRACKER + "/api/streams?password=" + this.password);
        const json = await result.json() as StreamMap;
        for (const id of Object.keys(json.streams)) {
            this._mapping.set(id, json.streams[id]);
        }
        this._ready = true;
        this._eventsource = new EventSource(STREAM_TRACKER + "/api/stream_updates?password=" + this.password);
        this._eventsource.onmessage = (e) => this.handleMessage(e);
    }

    public get mapping(): Map<string, Stream> | null {
        if (this._ready) {
            return this._mapping;
        }
        return null;
    }

    private handleMessage(e: MessageEvent) {
        const [alive, stream] = e.data.split("|", 2)
        if(this._mapping.has(stream)) {
            this._mapping.get(stream)!.live = Boolean(Number(alive));
            console.log("dispatching event...", this._mapping.get(stream));
            this.dispatchEvent(new StreamUpdatedEvent({stream: this._mapping.get(stream)!}));
        }
    }
}
