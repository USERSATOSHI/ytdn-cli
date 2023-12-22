#! /usr/bin/env node
import chalk from "chalk";
import boxen from "boxen";
import { downloadAudio, downloadPlaylist, downloadVideo } from "./utils.js";
const args = process.argv.slice(2);
import os from "os";
const [command, ...rest] = args;
switch (command) {
    case "help":
        console.log(
            boxen(
                `
        ${chalk.bold("Help")}
        ${chalk.bold("Commands")}
        ${chalk.bold("download")} - download a video or audio from youtube
             ${chalk.italic("Flags")}:
                ${chalk.bold("--audio")} - download audio
                ${chalk.bold("--video")} - download video
                ${chalk.bold("--playlist")} - download playlist 
                ${chalk.bold("--path=<path>")} - path to download to
                ${chalk.bold("--url=<url>")} - url to download
        ${chalk.bold("Example")}
        ${chalk.bold(
            'ytdn download --url="https://www.youtube.com/watch?v=dQw4w9WgXcQ" --video --path="./videos"',
        )}
        `,
                { padding: 1, margin: 1, borderStyle: "round" ,title: "ytdn"}
            ),
        );
        break;
    case "download":
        console.log(chalk.green("Downloading..."));
        download(...rest);
        break;
}

async function download(...flags) {
    const options = {
        audio: false,
        video: false,
        playlist: false,
        path: "",
        url: "",
    };
    let isError = false;
    for (const flag of flags) {
        if(flag.startsWith("--path=")) {
            options.path = flag.split("--path=")[1];
            if(!options.path) {
                isError = true;
                console.log(chalk.red(`Must specify a path`));
            }
        } 
        if(flag.startsWith("--url=")) {
            options.url = flag.split("--url=")[1];
            if(!options.url) {
                isError = true;
                console.log(chalk.red(`Must specify a url`));
            }
        }
        if(flag.startsWith("--audio")) {
            options.audio = true;
        }
        if(flag.startsWith("--video")) {
            options.video = true;
        }
        if(flag.startsWith("--playlist")) {
            options.playlist = true;
            if(options.audio || options.video) {
                isError = true;
                console.log(chalk.red(`Cannot specify both --audio or --video and --playlist`));
            }
        }

            
    }
    if (!options.audio && !options.video && !options.playlist) {
        isError = true;
        console.log(chalk.red(`Must specify either --audio or --video or --playlist`));
    }

    if (!options.url) {
        isError = true;
        console.log(chalk.red(`Must specify a url`));
    }

    if (!options.path) {
        isError = true;
        console.log(chalk.red(`Must specify a path`));
    }

    if (isError) {
        return;
    }

    if (options.audio) {
        await downloadAudio(options.url, options.path);
        return;
    } else if (options.video) {
        await downloadVideo(options.url, options.path);
        return;
    } else if (options.playlist) {
        await downloadPlaylist(options.url, options.path);
        return;
    } else {
        console.log(chalk.red(`Invalid flags`));
    }
}
