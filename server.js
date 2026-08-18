const express = require("express");
const axios = require("axios");
const app = express();

app.use(express.json());

app.get("/", (req, res) => {
    res.send(`
    <!DOCTYPE html>
    <html lang="ar" dir="rtl"><head><meta charset="UTF-8">
    <title>khalid iptv</title>
    <style>
        body { font-family: sans-serif; background: #000; color: #fff; display: flex; justify-content: center; align-items: center; min-height: 100vh; margin: 0; padding: 15px; }
        .card { background: #111; padding: 20px; border-radius: 16px; width: 100%; max-width: 400px; text-align: center; border: 1px solid #333; }
        h1 { color: #ff0000; font-size: 22px; }
        input { width: 100%; padding: 15px; margin: 8px 0; border-radius: 8px; border: 1px solid #444; background: #000; color: #fff; box-sizing: border-box; }
        button { width: 100%; padding: 15px; background: #ff0000; color: white; border: none; border-radius: 8px; cursor: pointer; margin-top: 10px; font-weight: bold; }
    </style></head>
    <body><div class="card"><h1>khalid iptv</h1>
    <input type="text" id="url" placeholder="url">
    <input type="text" id="username" placeholder="username">
    <input type="password" id="password" placeholder="password">
    <button onclick="gen()">توليد الرابط</button>
    <div id="res" style="margin-top:20px;display:none;">
        <input type="text" id="out" readonly>
    </div></div>
    <script>
    async function gen(){
        const u=document.getElementById('url').value, n=document.getElementById('username').value, p=document.getElementById('password').value;
        const d=btoa(JSON.stringify({url:u,username:n,password:p}));
        document.getElementById('out').value = window.location.protocol+"//"+window.location.host+"/"+d+"/manifest.json";
        document.getElementById('res').style.display='block';
    }
    </script></body></html>`);
});

app.get("/:config/manifest.json", (req, res) => {
    res.json({id: "org.khalid.iptv", version: "1.0.0", name: "khalid iptv", types: ["movie", "series"], resources: ["stream"], idPrefixes: ["tt"]});
});

app.get("/:config/stream/:type/:id.json", async (req, res) => {
    try {
        const c = JSON.parse(Buffer.from(req.params.config, "base64").toString("utf-8"));
        const type = req.params.type;
        const b = c.url.replace(/\/$/,"");
        
        const ttId = type === "movie" ? req.params.id.split('.')[0] : req.params.id.split(':')[0];
        const metaRes = await axios.get(`https://v3-cinemeta.strem.io/meta/${type}/${ttId}.json`);
        const targetName = metaRes.data.meta.name.toLowerCase().trim();

        let streams = [];

        if (type === "movie") {
            const d = (await axios.get(`${b}/player_api.php?username=${c.username}&password=${c.password}&action=get_vod_streams`)).data;
            // البحث المباشر دون أي فلترة
            const m = d.find(i => i.name && i.name.toLowerCase().includes(targetName));
            if (m) {
                streams.push({
                    name: "khalid iptv", 
                    title: m.name, 
                    url: `${b}/movie/${c.username}/${c.password}/${m.stream_id}.${m.container_extension || 'mp4'}`
                });
            }
        } 
        else if (type === "series") {
            const [_, s, e] = req.params.id.split(':');
            const d = (await axios.get(`${b}/player_api.php?username=${c.username}&password=${c.password}&action=get_series`)).data;
            
            // البحث عن المسلسل باسمه فقط دون أي استثناءات
            const m = d.find(i => i.name && i.name.toLowerCase().includes(targetName));

            if (m) {
                const epData = (await axios.get(`${b}/player_api.php?username=${c.username}&password=${c.password}&action=get_series_info&series_id=${m.series_id}`)).data;
                const seasonEps = epData.episodes[s] || [];
                
                // العثور على الحلقة بناءً على الرقم فقط
                const ep = seasonEps.find(ei => parseInt(ei.episode_num) === parseInt(e));

                if (ep) {
                    streams.push({
                        name: "khalid iptv", 
                        title: ep.title || `S${s}E${e}`, 
                        url: `${b}/series/${c.username}/${c.password}/${ep.id}.${ep.container_extension || 'mp4'}`
                    });
                }
            }
        }

        res.json({ streams: streams });
    } catch(e) { 
        res.json({ streams: [] }); 
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT);
