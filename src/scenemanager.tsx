import React, {ReactElement, useEffect, useState} from 'react';
import OBS from "@ponyfest/obs-websocket-js";
import {FormControlLabel, Radio, RadioGroup} from "@material-ui/core";

interface SceneManagerProps {
    obs: OBS;
    currentScene: string;
}

export function SceneManager(props: SceneManagerProps): ReactElement {
    const [sceneList, setSceneList] = useState([] as string[]);

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
            {sceneList.map(x => <FormControlLabel control={<Radio />} value={x} label={x} key={x} />)}
        </RadioGroup>
    </div>;
}
