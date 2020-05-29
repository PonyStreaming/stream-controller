import React, {ChangeEvent, ReactElement, useEffect, useState} from "react";
import OBS from "@ponyfest/obs-websocket-js";
import {Grid, Slider} from "@material-ui/core";
import VolumeDown from '@material-ui/icons/VolumeDown';
import VolumeUp from '@material-ui/icons/VolumeUp';


interface StreamVolumeProps {
    obs?: OBS;
    source: string;
}

export function StreamVolume(props: StreamVolumeProps): ReactElement {
    const [volume, setVolume] = useState(0.0);
    const [receivedData, setReceivedData] = useState(false);

    useEffect(() => {
        if(!props.obs) {
            return;
        }
        const obs = props.obs;
        (async () => {
            const result = await obs.send("GetVolume", {source: props.source});
            setVolume(result.volume);
            setReceivedData(true);
        })();

        let debounce: ReturnType<typeof setTimeout> | null = null;
        const volumeChanged = (data: {sourceName: string, volume: number}) => {
            if (data.sourceName !== props.source) {
                return;
            }
            clearTimeout(debounce!);
            debounce = setTimeout(() => {
                setVolume(data.volume);
            }, 500);
        };

        obs.on("SourceVolumeChanged", volumeChanged);
        return () => {
            obs.off("SourceVolumeChanged", volumeChanged);
            clearTimeout(debounce!);
        }
    }, [props.obs, props.source]);

    async function handleChange(e: React.ChangeEvent<{}>, value: number | number[]) {
        if (typeof value !== "number") {
            console.error("the volume slider should produce exactly one value.");
            return;
        }
        const mul = value * value * value;
        setVolume(mul);
        await props.obs!.send("SetVolume", {source: props.source, volume: mul});
    }

    return (
        <Grid container spacing={2}>
            <Grid item>
                <VolumeDown />
            </Grid>
            <Grid item xs>
                <Slider value={Math.cbrt(volume)} onChange={handleChange} valueLabelDisplay="auto" valueLabelFormat={(v) => v === 0 ? '-inf' :  (20*Math.log10(volume)).toFixed(1)} min={0} max={1} step={0.01} disabled={!receivedData} />
            </Grid>
            <Grid item>
                <VolumeUp />
            </Grid>
        </Grid>
    )
}