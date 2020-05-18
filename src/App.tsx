import React, {useEffect, useState} from 'react';
import './App.css';
import {Room} from "./room";
import {
    Button,
    Card,
    CardContent,
    CardHeader,
    Grid,
    List,
    ListItem, ListItemSecondaryAction,
    ListItemText, Switch,
    TextField,
    Typography
} from "@material-ui/core";
import {Clock} from "./clock";
import {STREAM_TRACKER} from "./constants";
import VisibilityIcon from '@material-ui/icons/Visibility';
import {MusicController} from "./utils/musiccontroller";

interface Room {
    endpoint: string;
    key: string;
    name: string;
    techStream: string;
}

function App() {
    const [availableRooms, setAvailableRooms] = useState([] as Room[]);
    const [rooms, setRooms] = useState([] as Room[]);
    const [password, setPassword] = useState(localStorage["password"] || "");
    const [loggedIn, setLoggedIn] = useState(false);
    const [unmutedRoom, setUnmutedRoom] = useState("");
    const [musicController, setMusicController] = useState(undefined as MusicController | undefined);

    useEffect(() => {
        if (!loggedIn) {
            return;
        }

        (async () => {
            const request = await fetch(`${STREAM_TRACKER}/api/outputs?password=${password}`);
            const json = await request.json();
            setAvailableRooms(json.outputs);
            setRooms(json.outputs);
            setMusicController(new MusicController(password, json.outputs.map((x: any) => x.name)))
        })();
    }, [password, loggedIn]);

    function logIn() {
        localStorage["password"] = password;
        setLoggedIn(true);
    }

    function requestMuteState(room: string, mute: boolean): void {
        if (mute) {
            if (unmutedRoom === room) {
                setUnmutedRoom("");
            }
        } else {
            setUnmutedRoom(room);
        }
    }


    function setRoomEnabled(room: Room, enabled: boolean) {
        if (enabled) {
            setRooms(availableRooms.filter(x => x === room || !!rooms.find((y) => y === x)));
        } else {
            setRooms(rooms.filter((x) => x !== room));
        }
    }

    if (loggedIn && musicController) {
        const roomElements = rooms
            .map(x =>
                <Room
                    key={x.key}
                    name={x.name}
                    endpoint={x.endpoint}
                    streamName={x.key}
                    password={password}
                    muted={unmutedRoom !== x.name}
                    onRequestMuteState={(muted) => requestMuteState(x.name, muted)}
                    technicianStream={x.techStream}
                    musicController={musicController!}
                />);

        return (
            <>
                <div className="App">
                    <div>
                        <Card style={{width: 400, margin: 20}}>
                            <CardContent style={{textAlign: "center"}}>
                                <Clock />
                            </CardContent>
                        </Card>
                        <Card style={{width: 400, margin: 20}}>
                            <CardContent style={{textAlign: "center"}}>
                                <List style={{width: "100%"}} dense={true}>
                                    {availableRooms.map(x => (
                                        <ListItem key={x.name}>
                                            <ListItemText primary={x.name} />
                                            <ListItemSecondaryAction>
                                                <Switch edge="end" checked={!!rooms.find((y) => y === x)} onChange={(e, checked) => setRoomEnabled(x, checked)} />
                                            </ListItemSecondaryAction>
                                        </ListItem>
                                    ))}
                                </List>
                            </CardContent>
                        </Card>
                        <Card style={{width: 400, margin: 20}}>
                            <CardHeader title="Tips" style={{paddingBottom: 0}} />
                            <CardContent style={{paddingTop: 0}}>
                                <Typography variant="body1" component="div">
                                    <ul>
                                        <li>The incoming panel preview updates once per second and represents what OBS actually sees for the active panel (even when on another scene).
                                            <strong> If it's blank, don't switch to the panel stream.</strong></li>
                                        <li>Avoid panel switching when the panel scene is active. Switch to another one, change panel, wait until the incoming preview image
                                            makes sense, wait a second, then switch back.</li>
                                        <li>If the active stream has no audio or has other issues, you can click "reboot panel" (for a panel) or "reboot tech"
                                            (for a tech stream) to fix it. This generally takes one second + keyframe interval</li>
                                        <li>If an event on the schedule has a <VisibilityIcon color="secondary"  fontSize="inherit" />, it is currently receiving a stream
                                            from the panelist.
                                            You can click the <VisibilityIcon color="secondary"  fontSize="inherit" />  to preview the stream without switching the panel.
                                            Note that this preview is stuttery.</li>
                                        <li>Click the mute icon at the top right to preview stream audio. This has no effect on the outgoing stream.</li>
                                    </ul>
                                </Typography>
                            </CardContent>
                        </Card>
                    </div>
                    {roomElements}
                </div>
            </>
        );
    } else {
        return (
            <Grid container justify="center" style={{padding: 20, width: "100%"}} spacing={3}>
                <Grid item xs={4}>
                    <Card style={{width: 500}}>
                        <CardContent>
                            <Grid justify="flex-end" container spacing={2}>
                                <Grid item xs={12}>
                                    <TextField value={password} onChange={(e) => setPassword(e.target.value)} onKeyPress={(e) => { if (e.key === "Enter") { logIn(); }}} type="password" label="Password" style={{width: "100%"}}/>
                                </Grid>
                                <Grid item xs={3} style={{textAlign: "right"}}>
                                    <Button variant="contained" color="primary" onClick={logIn}>Log in</Button>
                                </Grid>
                            </Grid>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>
        );
    }
}

export default App;
