import React, {ReactElement, useEffect, useState} from 'react';
import OBS from "@ponyfest/obs-websocket-js";
import {StreamAudioFixer} from "./streamaudiofixer";
import {PANEL_SOURCE, TECH_SOURCE} from "./constants";
import "./streammanager.css";
import {StreamVolume} from "./streamvolume";
import {PanelSettings} from "./panelsettings";

interface StreamManagerProps {
    obs: OBS;
    roomName: string;
    password: string;
    muted: boolean;
    requestMuteState: (muted: boolean) => void;
}

export function StreamManager(props: StreamManagerProps): ReactElement {
    const [previewImage, setPreviewImage] = useState("");

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

    return <div className="StreamManager">
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
