import React, {ReactElement} from 'react';
import OBS from "@ponyfest/obs-websocket-js";
import {PANEL_SOURCE} from "./constants";
import {Button} from "@material-ui/core";

interface StreamManagerProps {
    obs: OBS;
}

export function PanelAudioFixer(props: StreamManagerProps): ReactElement {

    async function fixPanelAudio() {
        const currentSettings = (await props.obs.send("GetSourceSettings", {sourceName: PANEL_SOURCE})).sourceSettings;
        await props.obs.send("SetSourceSettings", {sourceName: PANEL_SOURCE, sourceSettings: {is_local_file: true, local_file: "C:/Users/paperspace/Desktop/Streaming_Standby.png", close_when_inactive: true}});
        setTimeout(async () => {
            // Explicitly turn off "is_local_file" in case we're racing with another attempt to do the same thing.
            await props.obs.send("SetSourceSettings", {sourceName: PANEL_SOURCE, sourceSettings: {...currentSettings, is_local_file: false}});
        }, 1000);
    }

    return <Button variant="contained" color="secondary" onClick={() => fixPanelAudio()}>Reboot panel</Button>;
}
