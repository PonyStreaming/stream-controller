import React, {useEffect, useState} from 'react';
import './App.css';
import {Room} from "./room";
import {Button, Card, CardContent, Grid, TextField} from "@material-ui/core";
import {Clock} from "./clock";

interface Room {
    endpoint: string;
    key: string;
    name: string;
}

function App() {
    const [rooms, setRooms] = useState([] as Room[]);
    const [password, setPassword] = useState(localStorage["password"] || "");
    const [loggedIn, setLoggedIn] = useState(false);
    const [unmutedRoom, setUnmutedRoom] = useState("");

    useEffect(() => {
        if (password === "") {
            return;
        }

        (async () => {
            const request = await fetch("https://tracker.stream-control.ponyfest.horse/api/outputs?password=" + password);
            const json = await request.json();
            setRooms(json.outputs);
        })();
    }, [password]);

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
            />);

    if (loggedIn) {
        return (
            <>
                <Clock />
                <div className="App">
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
