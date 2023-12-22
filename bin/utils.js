import yt from "./yt.js";
import { Utils } from "youtubei.js";
import { createWriteStream, existsSync, unlinkSync } from "fs";
import ffmpeg from "fluent-ffmpeg";
import { mkdir } from "fs/promises";
import { setTimeout } from "timers/promises";
import os from "os";
import { Worker } from "worker_threads";
export const searchVideo = async (query) => {
    const results = await yt.search(query, {
        type: "video",
    });
    return results.videos;
};
const parseId = (videoIdorUrl) => {
    let video_id = videoIdorUrl.split("v=")[1];
    if (!video_id) return videoIdorUrl;
    const ampersandPosition = video_id.indexOf("&");
    if (ampersandPosition != -1) {
        video_id = video_id.substring(0, ampersandPosition);
    }
    return video_id;
};

export const downloadVideo = async (videoIdorUrl, path) => {
    return new Promise(async (resolve, reject) => {
        try {
            // check if videoIdorUrl is a valid ur
            if (!existsSync(path)) {
                await mkdir(path);
            }
            const id = parseId(videoIdorUrl);
            const info = await yt.getBasicInfo(id);

            const videostream = await yt.download(id, {
                type: "video",
                quality: "best",
            });

            const audiostream = await yt.download(id, {
                type: "audio",
                quality: "best",
            });
            const p1 = new Promise(async (resolve, reject) => {
            const vw = createWriteStream(`./temp/${id}.mp4`);
            // @ts-ignore
            for await (const chunk of Utils.streamToIterable(videostream)) {
                vw.write(chunk);
            }
            vw.close();
            resolve();
        });
            const p2 = new Promise(async (resolve, reject) => {
            const aw = createWriteStream(`./temp/${id}.mp3`);
            // @ts-ignore
            for await (const chunk of Utils.streamToIterable(audiostream)) {
                aw.write(chunk);
            }
            aw.close();
            resolve();
        });

            await Promise.all([p1, p2]);

            ffmpeg()
                .input(`./temp/${id}.mp4`)
                .input(`./temp/${id}.mp3`)
                .outputOptions(["-c:v copy", "-c:a aac"])
                // add metaData
                .outputOptions([
                    `-metadata`,
                    `title="${encodeURI(
                        info.basic_info.title
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
                    `thumbnail="${info.basic_info.thumbnail?.[0].url}"`,
                ])
                .format("mp4")
                .save(
                    `${path}/${info.basic_info.title
                        ?.replaceAll('"', "'")
                        .replaceAll("/", "-")
                        .replaceAll(":", "-")}.mp4`,
                )
                .on("end", () => {
                    console.log(
                        "Finished downloading: ",
                        info.basic_info.title,
                    );
                    unlinkSync(`./temp/${id}.mp4`);
                    unlinkSync(`./temp/${id}.mp3`);
                    console.log("Deleted temp files");
                    resolve();
                });
        } catch (e) {
            reject(e);
        }
    });
};

export const downloadAudio = async (videoIdorUrl, path) => {
    return new Promise(async (resolve, reject) => {
        try {
            if (!existsSync(path)) {
                await mkdir(path);
            }
            // check if videoIdorUrl is a valid ur
            const id = parseId(videoIdorUrl);
            const info = await yt.getBasicInfo(id);

            const audiostream = await yt.download(id, {
                type: "audio",
                quality: "highestaudio",
            });

            const aw = createWriteStream(
                `${path}/${info.basic_info.title}.mp3`,
            );
            // @ts-ignore
            for await (const chunk of Utils.streamToIterable(audiostream)) {
                aw.write(chunk);
            }

            console.log("Finished downloading: ", info.basic_info.title);
            aw.close();
            resolve();
        } catch (e) {
            reject(e);
        }
    });
};

export const downloadPlaylist = async (playlistUrl, path) => {
    if (!existsSync(path)) {
        await mkdir(path);
    }
    const id = playlistUrl.split("list=")[1].split("&")[0];
    const playlist = await yt.getPlaylist(id);
    const videos = await playlist.videos;
    const vidPath = `${path}/${playlist.info.title
        .replaceAll("/", "-")
        .replaceAll(":", "-")
        .replaceAll(",", "-")
        .replaceAll('"', "'")
        .replaceAll("?", "-")
        .replaceAll("!", "-")
        .replaceAll("+", "")
        .replaceAll("|", "")}`;
    await mkdir(vidPath);
    const datas = [];
    const promises = [];
    for await (const video of videos) {
        // console.log(video)
        const info = await yt.getBasicInfo(video.id).catch((e) => {
            console.error(e);
            return null;
        });
        const id = video.id;
        if (info?.playability_status.status === "ERROR" || !info) continue;
        promises.push(
            new Promise(async (resolve, reject) => {
                const videostream = await info.download({
                    type: "video",
                    quality: "best",
                });

                const audiostream = await info.download({
                    type: "audio",
                    quality: "best",
                });
                const p1 = new Promise(async (resolve, reject) => {
                    const vw = createWriteStream(`./temp/${id}.mp4`);
                    // @ts-ignore
                    for await (const chunk of Utils.streamToIterable(
                        videostream,
                    )) {
                        vw.write(chunk);
                    }
                    vw.close();
                    resolve();
                });
                const p2 = new Promise(async (resolve, reject) => {
                    const aw = createWriteStream(`./temp/${id}.mp3`);
                    // @ts-ignore
                    for await (const chunk of Utils.streamToIterable(
                        audiostream,
                    )) {
                        aw.write(chunk);
                    }
                    aw.close();
                    resolve();
                });
                await Promise.all([p1, p2]);
                resolve();
            }),
        );
        datas.push({
            id,
            info: {
                title: info?.basic_info.title,
                thumbnail: info?.basic_info.thumbnail?.[0].url,
            },
            path: vidPath,
        });
    }
    await Promise.all(promises);

    const cpus = os.cpus().length;
    const chunks = chunkify(datas, cpus);
    let workersCompleted = 0;
    chunks.forEach((chunk, i) => {
        const worker = new Worker("./bin/worker.js");
        worker.postMessage(chunk);
        worker.on("message", async (message) => {
            workersCompleted += 1;
            if (workersCompleted === cpus) {
                console.log(
                    `Finished downloading playlist: ${playlist.info.title}`,
                );
            }
            if (message === "done") {
                console.log(`Worker ${i} finished downloading chunk ${i}`);
                await worker.terminate();
            }
        });
    });
};

const sleep = async (ms) => {
    await setTimeout(ms);
};

const chunkify = (arr, size) => {
    const res = [];
    for (let i = 0; i < arr.length; i += size) {
        res.push(arr.slice(i, i + size));
    }
    console.log(res[0]);
    return res;
};
