import React, {ReactElement, useEffect, useState} from "react";
import {Typography} from "@material-ui/core";
import moment from "moment-timezone";

export function Clock(): ReactElement {
    const [time, setTime] = useState(Date.now());

    useEffect(() => {
       const interval = setInterval(() => setTime(Date.now()), 1000);

       return () => {
           clearInterval(interval);
       }
    });

    return (
        <Typography className="Clock" variant="h2" component="div">
            {moment(time).tz("America/New_York").format("HH:mm:ss z")}
        </Typography>
    );
}
