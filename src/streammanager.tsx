import React, {ReactElement, useEffect, useState} from 'react';
import OBS from "@ponyfest/obs-websocket-js";
import {StreamAudioFixer} from "./streamaudiofixer";
import {PANEL_SOURCE, TECH_SOURCE} from "./constants";
import "./streammanager.css";
import {StreamSchedule} from "./streamschedule";
import {StreamVolume} from "./streamvolume";
import {PanelSettings} from "./panelsettings";
import {PanelStreamTracker} from "./utils/panelstreamtracker";
import {Button, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle} from "@material-ui/core";

interface StreamManagerProps {
    obs: OBS;
    zoomObs?: OBS;
    roomName: string;
    password: string;
    muted: boolean;
    requestMuteState: (muted: boolean) => void;
    streamTracker?: PanelStreamTracker
    transitionSafe: boolean;
}

export function StreamManager(props: StreamManagerProps): ReactElement {
    const [currentStreamURL, setCurrentStreamURL] = useState("");
    const [currentLocalFile, setCurrentLocalFile] = useState("");
    const [previewImage, setPreviewImage] = useState("");
    const [promptResolution, setPromptResolution] = useState(null as null | {r: (x: boolean) => void});

    useEffect(() => {
        async function updateStreamURL() {
            const result = await props.obs.send("GetSourceSettings", {sourceName: "RTMP stream"});
            if ((result.sourceSettings as any).is_local_file) {
                const f = (result.sourceSettings as any).local_file;
                // Avoid being confused by the reboot screen.
                if (f.endsWith("Streaming_Standby.png")) {
                    return;
                }
                setCurrentLocalFile(f);
                setCurrentStreamURL("");
            } else {
                setCurrentStreamURL((result.sourceSettings as any).input);
                setCurrentLocalFile("");
            }
            console.log(result);
        }

        const interval = setInterval(updateStreamURL, 20000);

        updateStreamURL();

        return () => {
            clearInterval(interval);
        }
    }, [props.obs]);

    useEffect(() => {
       const interval = setInterval(async () => {
           try {
               const preview = await props.obs.send("TakeSourceScreenshot", {sourceName: "RTMP stream", embedPictureFormat: "png", width: 350});
               setPreviewImage(preview.img);
           } catch(e) {
               setPreviewImage("");
           }
       }, 1000);

       return () => {
           return clearInterval(interval);
       }
    }, [props.obs]);

    async function updateStreamURL(url: string) {
        const currentSettings = await props.obs.send("GetSourceSettings", {sourceName: "RTMP stream"});
        await props.obs.send("SetSourceSettings", {sourceName: "RTMP stream", sourceSettings: {...currentSettings, input: url, is_local_file: false, restart_on_activate: false, clear_on_media_end: false}})
        setCurrentStreamURL(url);
        setCurrentLocalFile("");
    }

    async function updateLocalFile(path: string) {
        const currentSettings = await props.obs.send("GetSourceSettings", {sourceName: "RTMP stream"});
        await props.obs.send("SetSourceSettings", {sourceName: "RTMP stream", sourceSettings: {...currentSettings, local_file: path, is_local_file: true, restart_on_activate: true, clear_on_media_end: true}})
        setCurrentStreamURL("");
        setCurrentLocalFile(path)
    }

    function switchPrompt(): Promise<boolean> {
        return new Promise<boolean>(((resolve) => {
            setPromptResolution({r: resolve});
        }))
    }

    async function updateZoomKey(key: string, enabled: boolean) {
        if (!props.zoomObs) {
            if (enabled) {
                console.error("asked to enable Zoom OBS, but can't contact it!");
            }
            return;
        }
        try {
            // We do this unconditionally in case we happened to already be streaming, because we can't
            // start a stream if we were already streaming. This should never happen, but probably will
            // anyway.
            await props.zoomObs.send("StopStreaming");
        } catch(e) {
            if (e.error !== "streaming not active") {
                throw e;
            }
        }
        if (enabled) {
            // In theory we can set the stream settings when starting the stream... in practice, though,
            // that does not work. do the two steps separately.
            await props.zoomObs.send("SetStreamSettings", {
                type: "rtmp_custom",
                settings: {
                    server: 'rtmp://rtmp.ponyfest.horse/live',
                    key,
                    use_auth: false,
                } as any, // the types think it should be use-auth instead of use_auth.
                save: false
            });
            await props.zoomObs.send("StartStreaming", {});
        }
    }

    async function switchFeed(key: string, needsObs: boolean) {
        if(!props.transitionSafe && !await switchPrompt()) {
            return;
        }
        await updateZoomKey(key, needsObs);
        await updateStreamURL('rtmp://rtmp.ponyfest.horse/live/' + key);
    }

    async function switchPrerec(filename: string) {
        if(!props.transitionSafe && !await switchPrompt()) {
            return;
        }
        await updateZoomKey("", false);
        await updateLocalFile('C:/Users/paperspace/Desktop/Prerecs/' + filename);
    }

    return <div className="StreamManager">
        <StreamSchedule
            room={props.roomName}
            password={props.password}
            muted={props.muted}
            requestMuteState={props.requestMuteState}
            currentStreamKey={currentStreamURL.split('/').pop()!}
            currentLocalFile={currentLocalFile.split('/').pop()!}
            requestStreamKey={switchFeed}
            requestPrerec={switchPrerec}
            streamTracker={props.streamTracker}
        />
        <div className="StreamManager-panelpreview">
            <h4>Incoming panel preview</h4>
            {previewImage !== "" ? <img src={previewImage} alt="preview of panel status" /> : "Source preview unavailable"}
        </div>
        <StreamVolume obs={props.obs} source={PANEL_SOURCE} />
        <div className="StreamManager-fixers">
            <StreamAudioFixer obs={props.obs} source={PANEL_SOURCE} label="Reboot Panel" color="secondary" />
            <StreamAudioFixer obs={props.obs} source={TECH_SOURCE} label="Reboot Tech" color="primary"/>
            {/* Todo: put this button somewhere less ridiculous. */}
            <PanelSettings obs={props.obs} />
        </div>
        <Dialog open={!!promptResolution} onClose={() => {promptResolution!.r(false); setPromptResolution(null)}}>
            <DialogTitle>Perform interrupting switch?</DialogTitle>
            <DialogContent>
                <DialogContentText>
                    You are trying to switch panels while a panel is being streamed. This will cut off the current panel
                    and switch immediately to another panel.
                    If you are playing a prerecorded panel, it will not be possible to resume where you left off.
                    Consider changing to non-panel scene before switching.
                </DialogContentText>
            </DialogContent>
            <DialogActions>
                <Button onClick={() => {promptResolution!.r(false); setPromptResolution(null)}} color="primary">
                    Cancel
                </Button>
                <Button onClick={() => {promptResolution!.r(true); setPromptResolution(null)}} color="secondary">
                    Change panel
                </Button>
            </DialogActions>
        </Dialog>
    </div>;
}
