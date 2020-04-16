import React, {ReactElement, useEffect, useRef} from 'react';

declare var JSMpeg: any;

interface RTMPPreviewProps {
    streamName: string;
    muted: boolean;
}

export function RTMPPreview(props: RTMPPreviewProps): ReactElement {
    const canvasRef = useRef(null);
    const playerRef = useRef(null as any);

    useEffect(() => {
        if (canvasRef.current !== null) {
            playerRef.current = new JSMpeg.Player("wss://previews.stream-control.ponyfest.horse/stream/" + props.streamName, {canvas: canvasRef.current, pauseWhenHidden: false});
        }

        return () => {
            if (playerRef.current !== null) {
                playerRef.current.destroy();
                playerRef.current = null;
            }
        }
    }, [props.streamName]);

    useEffect(() => {
        if (!playerRef.current) {
            console.warn(`Trying to set mute status for ${props.streamName}, but failed because the player does not exist.`)
            return;
        }
        playerRef.current.volume = props.muted ? 0 : 2;
    }, [props.streamName, props.muted]);

    return <canvas className="RTMPPreview" ref={canvasRef} />;
}

document.addEventListener("DOMContentLoaded", () => {
    if (!(window as any).JSMpeg) {
        const newScript = document.createElement("script");
        newScript.src = "jsmpeg.min.js";
        document.head.appendChild(newScript);
        console.log("loading JSMpeg");
    }
})