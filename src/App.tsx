import React, {useState} from 'react';
import './App.css';
import {Room} from "./room";
import {Button, Card, CardContent, Grid, TextField} from "@material-ui/core";

function App() {
    const [password, setPassword] = useState(localStorage["password"] || "");
    const [loggedIn, setLoggedIn] = useState(false);
    const [unmutedRoom, setUnmutedRoom] = useState("");

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

    const rooms = [
        {name: "Mane Events", endpoint: "obs1", streamName: "main"},
        {name: "Celestial Hall", endpoint: "obs2", streamName: "main2"},
    ];

    const roomElements = rooms
        .map(x =>
            <Room
                key={x.streamName}
                name={x.name}
                endpoint={`wss://${x.endpoint}.stream-control.ponyfest.horse`}
                streamName={x.streamName}
                password={password}
                muted={unmutedRoom !== x.streamName}
                onRequestMuteState={(muted) => requestMuteState(x.streamName, muted)}
            />);

    if (loggedIn) {
        return (
            <div className="App">
                {roomElements}
            </div>
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
