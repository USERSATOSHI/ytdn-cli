import { parentPort } from "worker_threads";
import { downloadVideo } from "./utils.js";
import ffmpeg from "fluent-ffmpeg";
import { unlinkSync } from "fs";
parentPort.on("message", async (message) => {
    const n = message.length;
    let i = 0;
    for (const chunk of message) {
        const { id, info,path } = chunk;
        ffmpeg()
            .input(`./temp/${id}.mp4`)
            .input(`./temp/${id}.mp3`)
            .outputOptions(["-c:v copy", "-c:a aac"])
            // add metaData
            .outputOptions([
                `-metadata`,
                `title="${encodeURI(
                    info.title
                        ?.replaceAll('"', "'")
                        .replaceAll("/", "-")
                        .replaceAll(":", "-")
                        .replaceAll("/", "-")
                        .replaceAll(":", "-")
                        .replaceAll(",", "-")
                        .replaceAll('"', "'")
                        .replaceAll("?", "-")
                        .replaceAll("!", "-")
                        .replaceAll("+", "")
                        .replaceAll("|", ""),
                )}"`,
                `-metadata`,
                `thumbnail="${info.thumbnail}"`,
            ])
            .format("mp4")
            .save(
                `${path}/${info.title
                    ?.replaceAll('"', "'")
                    .replaceAll("/", "-")
                    .replaceAll(":", "-")}.mp4`,
            )
            .on("end", () => {
                console.log("Finished downloading: ", info.title);
                unlinkSync(`./temp/${id}.mp4`);
                unlinkSync(`./temp/${id}.mp3`);
                console.log("Deleted temp files");
                i++;
                if (i === n) {
                    parentPort.postMessage("done");
                }
            });
    }
});
