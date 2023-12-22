import InnerTube from 'youtubei.js';
import { fetch, setGlobalDispatcher, Agent } from 'undici'

setGlobalDispatcher(new Agent({ connect: { timeout: 60_000 } }) )
const yt = await InnerTube.create({
    fetch: fetch
});

export default yt;