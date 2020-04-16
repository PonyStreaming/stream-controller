import React, {ReactElement, useEffect, useState} from 'react';
import OBS from "@ponyfest/obs-websocket-js";
import {PanelAudioFixer} from "./panelaudiofixer";
import {TitleAudioFixer} from "./titleaudiofixer";
import {PANEL_SCENE, PANEL_SOURCE} from "./constants";
import "./streammanager.css";

interface StreamManagerProps {
    obs: OBS;
}

export function StreamManager(props: StreamManagerProps): ReactElement {
    const [currentStreamURL, setCurrentStreamURL] = useState("");
    const [previewImage, setPreviewImage] = useState("");

    useEffect(() => {
        (async () => {
            const result = await props.obs.send("GetSourceSettings", {sourceName: "RTMP stream"});
            setCurrentStreamURL((result.sourceSettings as any).input);
            console.log(result);
        })();
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

    useEffect(() => {
        const interval = setInterval(async () => {
            const sceneItem = await props.obs.send("GetSceneItemProperties", {"scene-name": PANEL_SCENE, item: PANEL_SOURCE});
            if ((sceneItem.width !== 1920 || sceneItem.height !== 1080) && sceneItem.sourceHeight > 0 && sceneItem.sourceWidth > 0) {
                const scale = Math.min(1920 / sceneItem.sourceWidth, 1080 / sceneItem.sourceHeight);
                console.log(`Resizing source, scale factor ${scale}...`);
                await props.obs.send("SetSceneItemProperties", {"scene-name": PANEL_SCENE, item: PANEL_SOURCE, position: {x: 0, y: 0}, scale: {x: scale, y: scale}, bounds: {}, crop: {}})
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
        <h3>Panel manager</h3>
        <p>Stream:
            <select size={1} onChange={(e) => updateStreamURL(e.target.value)} value={currentStreamURL}>
                <option value="rtmp://rtmp.ponyfest.horse/live/stream">Test stream</option>
                <option value="rtmp://rtmp.ponyfest.horse/live/obs1">OBS 1</option>
                <option value="rtmp://rtmp.ponyfest.horse/live/obs2">OBS 2</option>
            </select>
        </p>
        <div className="StreamManager-panelpreview">
            <h4>Incoming panel preview</h4>
            {previewImage !== "" ? <img src={previewImage} alt="preview of panel status" /> : "Source preview unavailable"}
        </div>
        <div className="StreamManager-fixers">
            <PanelAudioFixer obs={props.obs} /> <TitleAudioFixer obs={props.obs} />
        </div>
    </div>;
}
