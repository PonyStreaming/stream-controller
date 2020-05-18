import React, {ReactElement, useState} from "react";
import {Track, TrackMap} from "./utils/musiccontroller";
import {List, ListItem, ListItemText, TextField} from "@material-ui/core";

export interface TrackSelectorProps {
    tracks: TrackMap;
    trackSelected: (track: Track) => void;
    style?: React.CSSProperties
}

export function TrackSelector(props: TrackSelectorProps): ReactElement {
    const [filterText, setFilterText] = useState("");

    return (
        <div style={props.style}>
            <div style={{paddingLeft: 16, paddingRight: 16}}>
                <TextField style={{width: '100%'}} label="Filter" value={filterText} onChange={(e) => setFilterText(e.target.value)} />
            </div>
            <List>
                {Object.values(props.tracks).sort((a, b) => {
                    if (a.artist > b.artist) {
                        return 1;
                    } else if (a.artist < b.artist) {
                        return -1;
                    } else {
                        if (a.title > b.title) {
                            return 1;
                        } else if (a.title < b.title) {
                            return -1;
                        } else {
                            return 0;
                        }
                    }
                }).filter(x => (x.title.toLowerCase().includes(filterText.toLowerCase()) || x.artist.toLowerCase().includes(filterText.toLowerCase()))).map(x => (
                    <ListItem key={x.trackId} button onClick={() => props.trackSelected(x)}>
                        <ListItemText primary={x.title} secondary={x.artist} />
                    </ListItem>
                ))}
            </List>
        </div>
    )
}