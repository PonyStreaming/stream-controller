import React, {ReactElement, useEffect, useRef} from 'react';
import './rtmppreview.css';

declare var JSMpeg: any;

interface RTMPPreviewProps {
    app?: string;
    streamName: string;
    muted: boolean;
}

const SCALE_BOTTOM = -50;
const SCALE_TOP = 10;

export function RTMPPreview(props: RTMPPreviewProps): ReactElement {
    const canvasRef = useRef(null as HTMLCanvasElement | null);
    const levelsRef = useRef(null as HTMLCanvasElement | null);
    const playerRef = useRef(null as any);

    useEffect(() => {
        if (canvasRef.current === null) {
            return;
        }


        // This has a bunch of machinery for a) dealing with multiple channels, and b) dealing with averaging
        // over multiple audio packets. In fact, we use a single packet and our preview audio is mono anyway,
        // so none of it is currently used.
        // It lives inside this component mostly for performance reasons, since we need to do all this every
        // time we received audio data, which is quite often.
        const levels = [0];
        let chunkPointer = 0;
        const oldChunks = [[0]];
        const peaks = [-Infinity];
        const lastPeakReset = [0, 0];
        function updateMeters(channels: Float32Array[]) {
            for (let i = 0; i < channels.length && i < levels.length; i++) {
                const level = channels[i].reduce((p, c) => p + Math.pow(c, 2))
                oldChunks[i][chunkPointer] = level;
                levels[i] = 20 * Math.log10(Math.sqrt(oldChunks[i].reduce((a, b) => a + b) / channels[i].length * oldChunks[i].length));
                if (levels[i] > peaks[i] || Date.now() > lastPeakReset[i] + 5000) {
                    peaks[i] = levels[i];
                    lastPeakReset[i] = Date.now();
                }
            }
            chunkPointer = (chunkPointer + 1) % 15;

            const levelsCanvas = levelsRef.current!;

            const context = levelsCanvas.getContext('2d')!;

            context.fillStyle = '#f52757';
            context.clearRect(0, 0, levelsCanvas.width, levelsCanvas.height);
            context.fillRect(0, 0, levelsCanvas.width * ((levels[0] - SCALE_BOTTOM) / (SCALE_TOP - SCALE_BOTTOM)), levelsCanvas.height);
            const peakPos = levelsCanvas.width * ((peaks[0] - SCALE_BOTTOM) / (SCALE_TOP - SCALE_BOTTOM))
            context.fillRect(peakPos, 0, 2, levelsCanvas.height);
        }

        playerRef.current = new JSMpeg.Player("wss://previews.stream-control.ponyfest.horse/stream/" + (props.app ? props.app + '/' : '') + props.streamName, {canvas: canvasRef.current, pauseWhenHidden: false});
        // Hijack the audio output to collect its audio data for our level meter
        let p = playerRef.current.audioOut.play.bind(playerRef.current.audioOut);
        playerRef.current.audioOut.play = (sampleRate: number, left: Float32Array, right: Float32Array) => {
            updateMeters([left]);
            p(sampleRate, left, right);
        }

        return () => {
            if (playerRef.current !== null) {
                playerRef.current.destroy();
                playerRef.current = null;
            }
        }
    }, [props.app, props.streamName]);

    useEffect(() => {
        if (!playerRef.current) {
            console.warn(`Trying to set mute status for ${props.streamName}, but failed because the player does not exist.`)
            return;
        }
        playerRef.current.volume = props.muted ? 0 : 2;
    }, [props.streamName, props.muted]);

    return <div className="RTMPPreview">
        <canvas className="RTMPPreview-video" ref={canvasRef} />
        <canvas className="RTMPPreview-level" ref={levelsRef} style={{width: "100%"}} height="4" />
    </div>;
}

document.addEventListener("DOMContentLoaded", () => {
    if (!(window as any).JSMpeg) {
        const newScript = document.createElement("script");
        newScript.src = "jsmpeg.min.js";
        document.head.appendChild(newScript);
        console.log("loading JSMpeg");
    }
})