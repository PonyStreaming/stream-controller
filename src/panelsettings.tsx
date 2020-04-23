import React, {ReactElement, useEffect, useState} from "react";
import OBS from "@ponyfest/obs-websocket-js";
import {
    IconButton,
    List,
    ListItem,
    ListItemSecondaryAction,
    ListItemText,
    Popover,
    Switch
} from "@material-ui/core";
import SettingsIcon from '@material-ui/icons/Settings';
import {PANEL_SOURCE, PANEL_AUDIO_COMPRESSOR, PANEL_SCENE, WATERMARK_SOURCE} from "./constants";

interface PanelSettingsProps {
    obs: OBS;
}

export function PanelSettings(props: PanelSettingsProps): ReactElement {
    const [anchor, setAnchor] = useState(null as HTMLElement | null);
    const [watermarkEnabled, setWatermarkEnabled] = useState(false);
    const [compressorEnabled, setCompressorEnabled] = useState(false);

    useEffect(() => {
        (async () => {
            const filterStatus = await props.obs.send("GetSourceFilterInfo", {sourceName: PANEL_SOURCE, filterName: PANEL_AUDIO_COMPRESSOR});
            setCompressorEnabled(filterStatus.enabled);
        })();

        function onSourceFilterVisibilityChanged(data: {filterEnabled: boolean, filterName: string, sourceName: string}) {
            if (data.sourceName === PANEL_SOURCE && data.filterName === PANEL_AUDIO_COMPRESSOR) {
                setCompressorEnabled(data.filterEnabled);
            }
        }

        props.obs.on("SourceFilterVisibilityChanged", onSourceFilterVisibilityChanged);

        return () => {
            props.obs.off("SourceFilterVisibilityChanged", onSourceFilterVisibilityChanged);
        }
    }, [props.obs]);

    useEffect(() => {
        (async () => {
            const watermarkStatus = await props.obs.send("GetSceneItemProperties", {'scene-name': PANEL_SCENE, item: WATERMARK_SOURCE});
            setWatermarkEnabled(watermarkStatus.visible);
        })();

        function onSceneItemVisibilityChanged(data: {'item-name': string, 'item-visible': boolean, 'scene-name': string}) {
            if (data['item-name'] === WATERMARK_SOURCE && data['scene-name'] === PANEL_SCENE) {
                setWatermarkEnabled(data['item-visible']);
            }
        }

        props.obs.on("SceneItemVisibilityChanged", onSceneItemVisibilityChanged);

        return () => {
            props.obs.off("SceneItemVisibilityChanged", onSceneItemVisibilityChanged);
        }
    }, [props.obs]);

    async function setWatermark(enabled: boolean) {
        await props.obs.send("SetSceneItemProperties", {"scene-name": PANEL_SCENE, item: WATERMARK_SOURCE, visible: enabled, position: {}, scale: {}, bounds: {}, crop: {}})
    }

    async function setCompressor(enabled: boolean) {
        await props.obs.send("SetSourceFilterVisibility", {sourceName: PANEL_SOURCE, filterName: PANEL_AUDIO_COMPRESSOR, filterEnabled: enabled as unknown as string /* this type is just wrong */});
    }

    return (
        <>
            <IconButton title="Panel Settings" edge="end" onClick={(e) => setAnchor(e.target as HTMLElement)}>
                <SettingsIcon />
            </IconButton>
            <Popover open={Boolean(anchor)}
                     onClose={() => setAnchor(null)}
                     anchorEl={anchor}
                     anchorOrigin={{vertical: 'center', horizontal: 'right'}}
                     transformOrigin={{vertical: 'top', horizontal: 'left'}}>
                <List style={{width: 300}}>
                    <ListItem>
                        <ListItemText primary="PonyFest watermark" />
                        <ListItemSecondaryAction>
                            <Switch edge="end" checked={watermarkEnabled} onChange={(e, checked) => setWatermark(checked)} />
                        </ListItemSecondaryAction>
                    </ListItem>
                    <ListItem>
                        <ListItemText primary="Audio compressor" />
                        <ListItemSecondaryAction>
                            <Switch edge="end" checked={compressorEnabled}  onChange={(e, checked) => setCompressor(checked)} />
                        </ListItemSecondaryAction>
                    </ListItem>
                </List>
            </Popover>
        </>
    )
}