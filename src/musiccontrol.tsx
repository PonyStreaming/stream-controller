import React, {ReactElement, useEffect, useState} from 'react';
import {
    Dialog,
    DialogContent,
    DialogTitle,
    IconButton,
    List,
    ListItem,
    ListItemSecondaryAction,
    ListItemText, Switch
} from "@material-ui/core";
import Stop from '@material-ui/icons/Stop';
import PlayArrow from '@material-ui/icons/PlayArrow';
import SkipNext from '@material-ui/icons/SkipNext';
import Add from '@material-ui/icons/Add';
import Delete from '@material-ui/icons/Delete';

import {
    AutoplayUpdated,
    MusicController,
    NowPlayingUpdated,
    PlayStateUpdated,
    StreamState,
    Track,
    UpNextUpdated
} from "./utils/musiccontroller";
import {TrackSelector} from "./trackselector";

export interface MusicControlProps {
    stream: string;
    open: boolean;
    onClose: () => void;
    musicController: MusicController;
}

export function MusicControl(props: MusicControlProps): ReactElement {
    const [streamState, setStreamState] = useState(undefined as undefined | StreamState);
    const [upNext, setUpNext] = useState([] as string[]);
    const [trackList, setTrackList] = useState({} as {[trackId: string]: Track});
    const [pickingTrack, setPickingTrack] = useState(false);

    useEffect(() => {
        if (!props.open) {
            return;
        }
        (async () => {
            setStreamState(await props.musicController.getStreamState(props.stream));
            setUpNext(await props.musicController.getUpNext(props.stream));
            setTrackList(await props.musicController.getTrackList());
        })();

        const nowPlayingUpdated = async (e: Event) => {
            if (!(e instanceof NowPlayingUpdated)) {
                return;
            }
            if (e.stream !== props.stream) {
                return;
            }
            setStreamState(await props.musicController.getStreamState(props.stream));
        }

        const upNextUpdated = (e: Event) => {
            if (!(e instanceof UpNextUpdated)) {
                return;
            }
            if (e.stream !== props.stream) {
                return;
            }
            setUpNext(e.upNext);
        }

        const poolTrackAdded = async () => {
            setTrackList(await props.musicController.getTrackList());
        }

        const playStateUpdated = async (e: Event) => {
            if (!(e instanceof PlayStateUpdated || e instanceof AutoplayUpdated)) {
                return;
            }
            if (e.stream !== props.stream) {
                return;
            }
            setStreamState(await props.musicController.getStreamState(props.stream));
        }

        props.musicController.addEventListener('nowplayingupdated', nowPlayingUpdated);
        props.musicController.addEventListener('upnextupdated', upNextUpdated);
        props.musicController.addEventListener('pooltrackadded', poolTrackAdded);
        props.musicController.addEventListener('playstateupdated', playStateUpdated);
        props.musicController.addEventListener('autoplayupdated', playStateUpdated);

        return () => {
            props.musicController.removeEventListener('nowplayingupdated', nowPlayingUpdated);
            props.musicController.removeEventListener('upnextupdated', upNextUpdated);
            props.musicController.removeEventListener('pooltrackadded', poolTrackAdded);
            props.musicController.removeEventListener('playstateupdated', playStateUpdated);
            props.musicController.removeEventListener('autoplayupdated', playStateUpdated);
        }
    }, [props.stream, props.musicController, props.open]);

    async function handleTrackSelected(track: Track): Promise<void> {
        await props.musicController.addToUpNext(props.stream, track.trackId);
        setPickingTrack(false);
    }

    if (!streamState) {
        return (
            <Dialog open={props.open} onClose={props.onClose}>
                <DialogTitle>
                    Music — {props.stream}
                </DialogTitle>
                <DialogContent dividers>
                    Loading...
                </DialogContent>
            </Dialog>
        );
    }

    return (
        <>
        <Dialog open={props.open} onClose={props.onClose}>
            <DialogTitle>
                <span style={{float: "left", paddingTop: 9}}>Music — {props.stream}</span>
                <span style={{float: "right"}}>
                    <IconButton onClick={() => streamState.playing ? props.musicController.stop(props.stream) : props.musicController.play(props.stream)}>
                        {streamState.playing ? <Stop /> : <PlayArrow />}
                    </IconButton>
                    <IconButton onClick={() => props.musicController.skip(props.stream)}>
                        <SkipNext />
                    </IconButton>
                </span>
            </DialogTitle>
            <DialogContent style={{padding: 0, width: 500}} dividers>
                <List>
                <ListItem>
                    <ListItemText primary="Autoplay" />
                    <ListItemSecondaryAction>
                        <Switch checked={streamState.autoplay} onChange={() => props.musicController.setAutoplay(props.stream, !streamState.autoplay)} />
                    </ListItemSecondaryAction>
                </ListItem>
                    <ListItem>
                <span style={{fontWeight: "bold"}}>{streamState.currentTrack?.title} — {streamState.currentTrack?.artist}</span>
                    </ListItem>
                </List>
            </DialogContent>
            <DialogContent style={{padding: 0}}>
                <List>
                    {Array.from(upNext.entries())
                        .filter(([, x]) => x !== "")
                        .map(([i, x]) => (
                            <ListItem key={`${x}-${i}`}>
                                <ListItemText primary={trackList[x]?.title} secondary={trackList[x]?.artist} />
                                <ListItemSecondaryAction>
                                    <IconButton onClick={() => props.musicController.removeUpNext(props.stream, i)}>
                                        <Delete />
                                    </IconButton>
                                </ListItemSecondaryAction>
                            </ListItem>
                        ))}
                    <ListItem button={true} onClick={() => setPickingTrack(true)}>
                        <div style={{textAlign: "center", width: "100%"}}>
                        <Add color="primary" />
                        </div>
                    </ListItem>
                </List>
            </DialogContent>
        </Dialog>
        <Dialog open={pickingTrack} onClose={() => setPickingTrack(false)}>
            <DialogTitle>
                Add to Up Next for {props.stream}
            </DialogTitle>
            <DialogContent style={{padding: 0}}>
            <TrackSelector style={{maxHeight: 600}} tracks={trackList} trackSelected={(t) => handleTrackSelected(t)} />
            </DialogContent>
        </Dialog>
        </>
    )
}
