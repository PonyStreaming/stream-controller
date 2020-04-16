import React, {ReactElement} from 'react';
import OBS from "@ponyfest/obs-websocket-js";
import {TITLE_MUSIC_SOURCE} from "./constants";
import {Button} from "@material-ui/core";

interface TitleAudioFixerProps {
    obs: OBS;
}

export function TitleAudioFixer(props: TitleAudioFixerProps): ReactElement {
    async function fixTitleAudio() {
        const currentSettings = (await props.obs.send("GetSourceSettings", {sourceName: TITLE_MUSIC_SOURCE})).sourceSettings;
        await props.obs.send("SetSourceSettings", {sourceName: TITLE_MUSIC_SOURCE, sourceSettings: currentSettings});
    }

    return <Button variant="contained" color="secondary" onClick={() => fixTitleAudio()}>Reset title music</Button>;
}
