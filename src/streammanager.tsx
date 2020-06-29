import React, {ReactElement, useEffect, useState} from 'react';
import OBS from "@ponyfest/obs-websocket-js";
import {StreamAudioFixer} from "./streamaudiofixer";
import {PANEL_SOURCE, TECH_SOURCE} from "./constants";
import "./streammanager.css";
import {StreamSchedule} from "./streamschedule";
import {StreamVolume} from "./streamvolume";
import {PanelSettings} from "./panelsettings";
import {PanelStreamTracker} from "./utils/panelstreamtracker";

interface StreamManagerProps {
    obs: OBS;
    roomName: string;
    password: string;
    muted: boolean;
    requestMuteState: (muted: boolean) => void;
    streamTracker?: PanelStreamTracker
}

export function StreamManager(props: StreamManagerProps): ReactElement {
    const [currentStreamURL, setCurrentStreamURL] = useState("");
    const [previewImage, setPreviewImage] = useState("");

    useEffect(() => {
        async function updateStreamURL() {
            const result = await props.obs.send("GetSourceSettings", {sourceName: "RTMP stream"});
            setCurrentStreamURL((result.sourceSettings as any).input);
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
        await props.obs.send("SetSourceSettings", {sourceName: "RTMP stream", sourceSettings: {...currentSettings, input: url}})
        setCurrentStreamURL(url);
    }

    return <div className="StreamManager">
        <StreamSchedule
            room={props.roomName}
            password={props.password}
            muted={props.muted}
            requestMuteState={props.requestMuteState}
            currentStreamKey={currentStreamURL.split('/').pop()!}
            requestStreamKey={(key) => updateStreamURL('rtmp://rtmp.ponyfest.horse/live/' + key)}
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
    </div>;
}
