import React, {ReactElement, useEffect, useState} from "react";
import {Schedule, Scheduler, Event} from "./utils/schedule";
import {
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
import ZoomIcon from "./zoom_icon.png";
import {TIMEZONE} from "./constants";

interface StreamScheduleProps {
    room: string;
    activeStream?: string;
    password: string;
    muted: boolean;
    requestMuteState: (muted: boolean) => void;
    currentStreamKey: string;
    requestStreamKey: (key: string, usesZoom: boolean) => void;
    streamTracker?: PanelStreamTracker;
}

const scheduler = new Scheduler();

export function StreamSchedule(props: StreamScheduleProps): ReactElement {
    const [schedule, setSchedule] = useState(null as Schedule | null)
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
        if (props.streamTracker) {
            setStreams(new Map<string, Stream>(props.streamTracker.mapping!))

            const update = () => {
                setStreams(new Map<string, Stream>(props.streamTracker!.mapping!));
            };

            props.streamTracker.addEventListener('streamupdated', update)

            return () => {
                props.streamTracker!.removeEventListener('streamupdated', update);
            }
        }
    }, [props.streamTracker])

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
        <ListItem button key={x.id} selected={x.stream?.key === props.currentStreamKey} onClick={() => props.requestStreamKey(x.stream!.key, x.isZoom)}>
            <ListItemText
                primary={<><strong>{x.startTime.tz(TIMEZONE).format("ddd HH:mm")}-{x.endTime.tz(TIMEZONE).format("HH:mm")}</strong>: {x.title}</>}
                secondary={<>{x.isZoom ? <img alt="Zoom" style={{width: 15, height: 15, verticalAlign: "top", paddingTop: 2}} src={ZoomIcon} /> : <></>} {x.panelists}</>}
            />
            <ListItemSecondaryAction>
                <IconButton title="Copy Link" edge="end" onClick={(e) => {
                    navigator.clipboard.writeText("rtmp://rtmp.ponyfest.horse/live/" + x.stream?.key).then(() => {
                        setNotification("Copied RTMP link to clipboard");
                    }).catch(() => {
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
            <List disablePadding={true} style={{marginTop: 8, marginBottom: 8, height: 150, overflow: 'auto'}}>
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
            <Snackbar open={notification !== ""} autoHideDuration={6000} onClose={() => setNotification("")} message={notification} />
        </>
    );
}
