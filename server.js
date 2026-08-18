const express = require("express");
const axios = require("axios");
const app = express();

app.use(express.json());

// واجهة الموقع (التصميم الجديد: أسود وأحمر)
app.get("/", (req, res) => {
    res.send(`
    <!DOCTYPE html>
    <html lang="ar" dir="rtl"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>khalid iptv</title>
    <style>
        body { font-family: sans-serif; background: #000; color: #fff; display: flex; justify-content: center; align-items: center; min-height: 100vh; margin: 0; padding: 20px; }
        .card { background: #111; padding: 2rem; border-radius: 16px; width: 100%; max-width: 400px; text-align: center; border: 1px solid #333; }
        h1 { color: #ff0000; }
        input { width: 100%; padding: 14px; margin: 8px 0; border-radius: 8px; border: 1px solid #444; background: #000; color: #fff; box-sizing: border-box; }
        button { width: 100%; padding: 14px; background: #ff0000; color: white; border: none; border-radius: 8px; cursor: pointer; margin-top: 15px; font-weight: bold; }
        .footer { margin-top: 25px; color: #ff0000; font-weight: bold; }
    </style></head>
    <body><div class="card"><h1>khalid iptv</h1>
    <input type="text" id="url" placeholder="رابط السيرفر"><input type="text" id="username" placeholder="اسم المستخدم"><input type="password" id="password" placeholder="كلمة المرور">
    <button onclick="gen()">توليد الرابط</button>
    <div id="res" style="margin-top:20px;display:none;"><input type="text" id="out" readonly><button style="background:#444" onclick="copyUrl()">نسخ</button></div>
    <div class="footer">مطور الإضافة: المهندس خالد</div></div>
    <script>function gen(){const d=btoa(JSON.stringify({url:document.getElementById('url').value,username:document.getElementById('username').value,password:document.getElementById('password').value}));document.getElementById('out').value=window.location.protocol+"//"+window.location.host+"/"+d+"/manifest.json";document.getElementById('res').style.display='block';}
    function copyUrl(){navigator.clipboard.writeText(document.getElementById('out').value);alert('تم النسخ!');}</script></body></html>
    `);
});

app.get("/:config/manifest.json", (req, res) => {
    res.json({id: "org.khalid.iptv", version: "1.0.0", name: "khalid iptv", types: ["movie", "series"], resources: ["stream"], idPrefixes: ["tt"]});
});

app.get("/:config/stream/:type/:id.json", async (req, res) => {
    try {
        const c = JSON.parse(Buffer.from(req.params.config, "base64").toString("utf-8"));
        const type = req.params.type;
        const [ttId, s, e] = req.params.id.split(':');
        const b = c.url.replace(/\/$/, "");
        
        const metaRes = await axios.get(`https://v3-cinemeta.strem.io/meta/${type}/${ttId}.json`);
        const name = metaRes.data.meta.name.toLowerCase();

        let streams = [];
        
        if (type === "series") {
            const d = (await axios.get(`${b}/player_api.php?username=${c.username}&password=${c.password}&action=get_series`)).data;
            const m = d.find(i => i.name && i.name.toLowerCase().includes(name));
            if(m) {
                const epData = (await axios.get(`${b}/player_api.php?username=${c.username}&password=${c.password}&action=get_series_info&series_id=${m.series_id}`)).data;
                const ep = epData.episodes[s]?.find(e_item => e_item.episode_num == e && !e_item.title.toLowerCase().includes("behind"));
                if(ep) {
                    streams.push({
                        name: "khalid iptv",
                        title: `S${s}E${e} - تشغيل الحلقة`,
                        url: `${b}/series/${c.username}/${c.password}/${ep.id}.${ep.container_extension || 'mp4'}`
                    });
                }
            }
        }
        
        streams.push({
            name: "Developer",
            title: "تابع حساب المطور على الإنستقرام",
            externalUrl: "https://instagram.com/_gq6"
        });

        res.json({ streams: streams });
    } catch(e) { res.json({ streams: [] }); }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT);
