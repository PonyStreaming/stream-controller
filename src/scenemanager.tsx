import React, {ReactElement, useEffect, useState} from 'react';
import OBS from "@ponyfest/obs-websocket-js";
import {FormControlLabel, IconButton, Popover, Radio, RadioGroup} from "@material-ui/core";
import {PanelStreamTracker, Stream} from "./utils/panelstreamtracker";
import VisibilityIcon from "@material-ui/icons/Visibility";
import {TECH_SCENE} from "./constants";
import {RTMPPreview} from "./rtmppreview";

interface SceneManagerProps {
    obs: OBS;
    currentScene: string;
    technicianStream: string;
    streamTracker?: PanelStreamTracker;
    requestMuteState: (muted: boolean) => void;
    muted: boolean;
}

export function SceneManager(props: SceneManagerProps): ReactElement {
    const [sceneList, setSceneList] = useState([] as string[]);
    const [techStream, setTechStream] = useState(undefined as Stream | undefined);
    const [techStreamLive, setTechStreamLive] = useState(false);
    const [previewAnchor, setPreviewAnchor] = useState(null as HTMLElement | null);

    function preview(el:HTMLElement) {
        setPreviewAnchor(el)
        props.requestMuteState(false);
    }

    function unPreview(): void {
        setPreviewAnchor(null);
        props.requestMuteState(true);
    }

    useEffect(() => {
        if (!props.streamTracker) {
            return;
        }

        setTechStream(props.streamTracker.mapping?.get(props.technicianStream));
        setTechStreamLive(!!props.streamTracker.mapping?.get(props.technicianStream)?.live);

        const update = () => {
            setTechStream(props.streamTracker?.mapping?.get(props.technicianStream));
            setTechStreamLive(!!props.streamTracker?.mapping?.get(props.technicianStream)?.live);
        };

        props.streamTracker.addEventListener('streamupdated', update)

        return () => {
            props.streamTracker!.removeEventListener('streamupdated', update);
        }
    }, [props.technicianStream, props.streamTracker]);

    useEffect(() => {
        const updateScenes = async () => {
            const sceneList = await props.obs.send("GetSceneList");
            setSceneList(sceneList.scenes.map(x => x.name));
        }
        (async () => {
            await updateScenes();
            props.obs.on("ScenesChanged", updateScenes);
        })();

        return () => {
            props.obs.off("ScenesChanged", updateScenes);
        }
    }, [props.obs]);

    async function setScene(name: string) {
        if(!props.obs) {
            return;
        }
        await props.obs.send("SetCurrentScene", {"scene-name": name});
    }

    return <div className="SceneManager">
        <RadioGroup value={props.currentScene} onChange={(e) => setScene(e.target.value)}>
            {sceneList.map(x => <FormControlLabel control={<Radio />} value={x} label={<>
                {x}
                {x === TECH_SCENE && techStreamLive ? <IconButton title="Preview" edge="end"
                onClick={(e) => preview(e.target as HTMLElement)}>
                    <VisibilityIcon color="secondary" />
                </IconButton> : <></>}
            </>} key={x} />)}
        </RadioGroup>
        <Popover
            open={Boolean(previewAnchor)}
            anchorEl={previewAnchor}
            onClose={() => unPreview()}
            anchorOrigin={{vertical: 'center', horizontal: 'right'}}
            transformOrigin={{vertical: 'center', horizontal: 'left'}}
        >
            <RTMPPreview app="live" streamName={techStream?.key || ""} muted={props.muted} />
        </Popover>
    </div>;
}
