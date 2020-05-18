import React, {ReactElement, useEffect, useState} from 'react';
import OBS from "@ponyfest/obs-websocket-js";
import {SceneManager} from "./scenemanager";
import {StreamManager} from "./streammanager";
import {StreamStatus} from "./streamstatus";
import "./room.css";
import {Card, CardContent, CardHeader, Divider, IconButton} from "@material-ui/core";
import VolumeUpIcon from '@material-ui/icons/VolumeUp';
import VolumeOffIcon from '@material-ui/icons/VolumeOff';
import LibraryMusic from '@material-ui/icons/LibraryMusic';
import {PanelStreamTracker} from "./utils/panelstreamtracker";
import {MusicControl} from "./musiccontrol";
import {MusicController} from "./utils/musiccontroller";

interface RoomProps {
    name: string;
    endpoint: string;
    streamName: string;
    technicianStream: string;
    password: string;
    muted: boolean;
    onRequestMuteState: (muted: boolean) => void;
    musicController: MusicController;
}

const RECONNECT_DELAY_MS = 10000;

const streamTrackers: {[password: string]: PanelStreamTracker} = {};
async function getStreamTracker(password: string): Promise<PanelStreamTracker> {
    if (!streamTrackers[password]) {
        streamTrackers[password] = new PanelStreamTracker(password);
        await streamTrackers[password].start();
    }
    return streamTrackers[password];
}

export function Room(props: RoomProps): ReactElement {
    const [obs, setObs] = useState(undefined as OBS | undefined);
    const [connected, setConnected] = useState(false);
    const [currentScene, setCurrentScene] = useState("");
    const [previewAudio, setPreviewAudio] = useState(false);
    const [sceneAudio, setSceneAudio] = useState(false);
    const [streamTracker, setStreamTracker] = useState(undefined as PanelStreamTracker | undefined);
    const [showingMusicControls, setShowingMusicControls] = useState(false);

    useEffect(() => {
        (async () => {
            setStreamTracker(await getStreamTracker(props.password))
        })();
    }, [props.password]);

    useEffect(() => {
        const obs = new OBS();

        async function connect() {
            try {
                await obs.connect({address: props.endpoint, password: props.password})
            } catch(e) {
                console.log("Connection failed", e);
                setTimeout(connect, RECONNECT_DELAY_MS);
                return;
            }
            setObs(obs);
            setConnected(true);
            setCurrentScene((await obs.send("GetCurrentScene")).name);

            obs.on("SwitchScenes", (data) => {
                setCurrentScene(data["scene-name"]);
            })
            obs.on("ConnectionClosed", () => {
                setConnected(false);
                setObs(undefined);
            })
            obs.on("ConnectionClosed", onClose);
        }

        function onClose() {
            console.log("closed, retrying...");
            setTimeout(connect, RECONNECT_DELAY_MS);
        }

        connect();

        return () => {
            obs.off("ConnectionClosed", onClose);
            obs.disconnect();
            setConnected(false);
            setObs(undefined);
        }
    }, [props.endpoint, props.password]);

    function showMusicPrompt() {
        setShowingMusicControls(true);
    }

    const connectedUI = obs ? <>
        <SceneManager
            obs={obs}
            currentScene={currentScene}
            streamTracker={streamTracker}
            technicianStream={props.technicianStream}
            muted={props.muted || !sceneAudio}
            requestMuteState={(muted) => setSceneAudio(!muted)}
        />
        <Divider />
        <StreamManager
            obs={obs}
            roomName={props.name}
            password={props.password}
            muted={props.muted || !previewAudio}
            requestMuteState={(muted) => setPreviewAudio(!muted)}
            streamTracker={streamTracker}
        />
        <Divider />
        <StreamStatus obs={obs} streamName={props.streamName} muted={props.muted || previewAudio || sceneAudio} />
    </> : <>Disconnected.</>;

    const muteButton = <IconButton onClick={() => props.onRequestMuteState(!props.muted)}>{props.muted ? <VolumeOffIcon color="secondary" /> : <VolumeUpIcon color="primary" />}</IconButton>

    return <Card style={{width: 450, margin: 20}}>
        <CardHeader title={props.name} style={{paddingBottom: 0}} action={<><IconButton onClick={() => showMusicPrompt()}><LibraryMusic /></IconButton>{muteButton}</>} />
        <CardContent>
            {connectedUI}
        </CardContent>
        <MusicControl musicController={props.musicController} stream={props.name} open={showingMusicControls} onClose={() => setShowingMusicControls(false)} />
    </Card>;
}
