import React, {ReactElement, useEffect, useState} from 'react';
import OBS from "@ponyfest/obs-websocket-js";
import {RTMPPreview} from "./rtmppreview";
import "./streamstatus.css";

interface StreamStatusProps {
    obs: OBS;
    streamName: string;
    muted: boolean;
}

// Stolen from obs-websocket-js, which has this type but does not export it.
interface StreamStatus {
    fps: number;
    streaming: boolean;
    "replay-buffer-active": boolean;
    "bytes-per-sec": number;
    "kbits-per-sec": number;
    strain: number;
    "total-stream-time": number;
    "num-total-frames": number;
    "num-dropped-frames": number;
    recording: boolean;
    "render-total-frames": number;
    "render-missed-frames": number;
    "output-total-frames": number;
    "output-skipped-frames": number;
    "average-frame-time": number;
    "cpu-usage": number;
    "memory-usage": number;
    "free-disk-space": number;
    "preview-only": boolean;
}

export function StreamStatus(props: StreamStatusProps): ReactElement {
    const [streamFPS, setStreamFPS] = useState(0);
    const [cpuUsage, setCpuUsage] = useState(0);
    const [streaming, setStreaming] = useState(false);
    const [kbitsPerSec, setKbitsPerSec] = useState(0);
    const [totalStreamTime, setTotalStreamTime] = useState(0);
    const [numTotalFrames, setNumTotalFrames] = useState(0);
    const [numDroppedFrames, setNumDroppedFrames] = useState(0);

    useEffect(() => {
        function streamStatus(status: StreamStatus) {
            setStreamFPS(status.fps);
            setCpuUsage(status["cpu-usage"]);
            setStreaming(status.streaming);
            setKbitsPerSec(status["kbits-per-sec"]);
            setTotalStreamTime(status["total-stream-time"]);
            setNumTotalFrames(status["num-total-frames"]);
            setNumDroppedFrames(status["num-dropped-frames"]);
        }

        function streamStopped() {
            setStreaming(false);
        }

        props.obs.on("StreamStopped", streamStopped);
        props.obs.on("StreamStatus", streamStatus);
        return () => {
            props.obs.off("ScenesChanged", streamStatus);
            props.obs.off("StreamStopped", streamStopped);
        }
    }, [props.obs]);

    async function startStream() {
        await props.obs.send("StartStreaming", {});
    }

    async function stopStream() {
        await props.obs.send("StopStreaming");
    }

    return <div className="StreamStatus">
        {streaming ? <>
        <div className="StreamStatus-preview">
                <h4>Stream output</h4>
                <RTMPPreview app="output" streamName={props.streamName} muted={props.muted} />
        </div>
            </> : <></>}
        <details>
            <summary>Stream status</summary>
            <ul>
                <li>Streaming: {streaming ? "yes" : "no"}</li>
                <li>kb/s: {kbitsPerSec}</li>
                <li>FPS: {streamFPS.toFixed(2)}</li>
                <li>CPU usage: {cpuUsage.toFixed(1)}%</li>
                <li>Stream time: {Math.floor(totalStreamTime/ 3600)}:{Math.floor((totalStreamTime%3600)/60).toString().padStart(2, "0")}:{(totalStreamTime%60).toString().padStart(2, "0")}</li>
                <li>Dropped frames: {numDroppedFrames} ({(numTotalFrames > 0 ? numDroppedFrames / numTotalFrames * 100 : 0).toFixed(1)}%)</li>
                <li>{streaming ? <button onClick={stopStream}>Stop stream</button> : <button onClick={startStream}>Start stream</button> }</li>
            </ul>
        </details>
    </div>;
}
