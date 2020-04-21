import moment, {Moment} from "moment-timezone";

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

export async function fetchSchedule(): Promise<Schedule> {
    return {
        rooms: {
            "Bit Rate's Room": [
                {
                    id: "OBS 1",
                    startTime: moment("2020-04-25T10:00-04:00"),
                    endTime: moment("2020-04-25T10:30-04:00"),
                    title: "Opening Ceremonies",
                    panelists: "Dexanth, I guess?",
                    description: "poni"
                },
                {
                    id: "OBS 2",
                    startTime: moment("2020-04-25T10:30-04:00"),
                    endTime: moment("2020-04-25T11:00-04:00"),
                    title: "Euroconcert! words words words words words",
                    panelists: "ponyponypony",
                    description: "europeans make the horse sounds",
                },
            ]
        }
    }
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