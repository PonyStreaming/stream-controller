import moment, {Moment} from "moment-timezone";

const SCHEDULE_URL = "https://schedule-api.ponyfest.horse/schedule/";

export interface Event {
    id: string;
    startTime: Moment;
    endTime: Moment;
    title: string;
    panelists: string;
    description: string;
}

export interface Schedule {
    rooms: {[room: string]: Event[]};
}

interface ReceivedEvent {
    id: string;
    startTime: string;
    endTime: string;
    title: string;
    panelists: string;
    description: string;
}

interface ReceivedSchedule {
    rooms: {[room: string]: ReceivedEvent[]};
}

export async function fetchSchedule(): Promise<Schedule> {
    const request = await fetch(SCHEDULE_URL);
    const json = await request.json() as ReceivedSchedule;
    const schedule = {rooms: {}} as Schedule;
    for (const room of Object.keys(json.rooms)) {
        schedule.rooms[room] = json.rooms[room].map(x => ({...x, startTime: moment(x.startTime), endTime: moment(x.endTime)}))
    }
    return schedule;
}

export class Scheduler {
    private _schedule?: Schedule;

    public async getSchedule(): Promise<Schedule> {
        if (!this._schedule) {
            this._schedule = await fetchSchedule();
            setInterval(async () => {this._schedule = await fetchSchedule()}, 60000);
        }
        return this._schedule;
    }
}