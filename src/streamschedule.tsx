import React, {ReactElement, useEffect, useState} from "react";
import {Schedule, Scheduler, Event} from "./utils/schedule";
import {
    Chip,
    IconButton,
    List,
    ListItem,
    ListItemSecondaryAction,
    ListItemText,
    Popover,
    Snackbar
} from "@material-ui/core";
import VisibilityIcon from '@material-ui/icons/Visibility';
import LinkIcon from '@material-ui/icons/Link';
import {PanelStreamTracker, Stream} from "./utils/panelstreamtracker";
import {RTMPPreview} from "./rtmppreview";

interface StreamScheduleProps {
    room: string;
    activeStream?: string;
    password: string;
    muted: boolean;
    requestMuteState: (muted: boolean) => void;
    currentStreamKey: string;
    requestStreamKey: (key: string) => void;
}

const scheduler = new Scheduler();
const streamTrackers: {[password: string]: PanelStreamTracker} = {};

async function getStreamTracker(password: string): Promise<PanelStreamTracker> {
    if (!streamTrackers[password]) {
        streamTrackers[password] = new PanelStreamTracker(password);
        await streamTrackers[password].start();
    }
    return streamTrackers[password];
}

export function StreamSchedule(props: StreamScheduleProps): ReactElement {
    const [schedule, setSchedule] = useState(null as Schedule | null)
    const [streamTracker, setStreamTracker] = useState(null as PanelStreamTracker | null);
    const [previewAnchor, setPreviewAnchor] = useState(null as HTMLElement | null);
    const [streams, setStreams] = useState(null as Map<string, Stream> | null);
    const [previewKey, setPreviewKey] = useState("");
    const [notification, setNotification] = useState("");

    useEffect(() => {
        const interval = setInterval(async () => setSchedule(await scheduler.getSchedule()), 60000);

        (async () => {
            setSchedule(await scheduler.getSchedule());
        })();

        return () => {
            clearInterval(interval);
        }
    }, [])

    useEffect(() => {
        (async () => {
            setStreamTracker(await getStreamTracker(props.password))
        })();
    }, [props.password]);

    useEffect(() => {
        if (streamTracker) {
            setStreams(new Map<string, Stream>(streamTracker.mapping!))

            const update = () => {
                setStreams(new Map<string, Stream>(streamTracker.mapping!));
                console.log("updating...");
            };

            console.log("waiting...");
            streamTracker.addEventListener('streamupdated', update)

            return () => {
                console.log("unwaiting...");
                streamTracker.removeEventListener('streamupdated', update);
            }
        }
    }, [streamTracker])

    if (!schedule) {
        return <></>;
    }

    let events = [] as (Event & {stream?: Stream})[];
    if (schedule && streams) {
        events = schedule.rooms[props.room].map(x => ({...x, stream: streams.get(x.id)}));
    }

    function preview(el:HTMLElement, key: string) {
        setPreviewKey(key);
        setPreviewAnchor(el)
        props.requestMuteState(false);
    }

    function unPreview(): void {
        // setPreviewKey("");
        setPreviewAnchor(null);
        props.requestMuteState(true);
    }

    const scheduleList = events.map(x => (
        <ListItem button key={x.id} selected={x.stream?.key === props.currentStreamKey} onClick={() => props.requestStreamKey(x.stream!.key)}>
            <ListItemText
                primary={<><strong>{x.startTime.tz("America/New_York").format("HH:mm")}</strong>: {x.title}</>}
                secondary={x.panelists}
            />
            <ListItemSecondaryAction>
                <IconButton title="Copy Link" edge="end" onClick={(e) => {
                    navigator.clipboard.writeText("rtmp://rtmp.ponyfest.horse/live/" + x.stream?.key).then(() => {
                        setNotification("Copied RTMP link to clipboard");
                    }).catch((e) => {
                        setNotification("Could not copy link. Key: " + x.stream?.key);
                    });
                    e.stopPropagation();
                }} onMouseDown={(e) => e.stopPropagation()}>
                    <LinkIcon />
                </IconButton>
                {x.stream?.live ?
                    <IconButton title="Preview" edge="end" onClick={(e) => preview(e.target as HTMLElement, x.stream?.key || "")}>
                        <VisibilityIcon color="secondary" />
                    </IconButton>
                    : <></>}
            </ListItemSecondaryAction>
        </ListItem>
    ))

    return (
        <>
            <List disablePadding={true} style={{marginTop: 8, marginBottom: 8, height: 150, overflow: 'scroll'}}>
                {scheduleList}
            </List>
            <Popover
                open={Boolean(previewAnchor)}
                anchorEl={previewAnchor}
                onClose={() => unPreview()}
                anchorOrigin={{vertical: 'center', horizontal: 'right'}}
                transformOrigin={{vertical: 'center', horizontal: 'left'}}
            >
                <RTMPPreview app="live" streamName={previewKey} muted={props.muted} />
            </Popover>
            <Snackbar open={notification != ""} autoHideDuration={6000} onClose={() => setNotification("")} message={notification} />
        </>
    );
}
