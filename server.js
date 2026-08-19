const express = require("express");
const axios = require("axios");
const app = express();

app.use(express.json());

// الواجهة الرئيسية
app.get("/", (req, res) => {
    res.send(`
    <!DOCTYPE html>
    <html lang="ar" dir="rtl"><head><meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>khalid iptv</title>
    <style>
        body { font-family: Arial, sans-serif; background: #000; color: #fff; display: flex; justify-content: center; padding: 20px; }
        .card { background: #111; padding: 20px; border-radius: 12px; width: 100%; max-width: 400px; border: 1px solid #222; }
        h1 { color: #8b0000; font-size: 20px; text-align: center; }
        input { width: 100%; padding: 12px; margin: 8px 0; border-radius: 6px; border: 1px solid #333; background: #1a1a1a; color: #fff; box-sizing: border-box; }
        button { width: 100%; padding: 12px; background: #8b0000; color: white; border: none; border-radius: 6px; cursor: pointer; margin-top: 10px; }
        .footer { margin-top: 20px; color: #8b0000; font-size: 13px; text-align: center; line-height: 1.6; }
    </style></head>
    <body><div class="card"><h1>khalid iptv</h1>
    <input type="text" id="url" placeholder="الرابط">
    <input type="text" id="username" placeholder="اسم المستخدم">
    <input type="password" id="password" placeholder="كلمة المرور">
    <button onclick="gen()">توليد الرابط</button>
    <div id="res" style="display:none; margin-top:20px;">
        <input type="text" id="out" readonly>
        <button style="background:#333" onclick="copyUrl()">نسخ الرابط</button>
        <div id="expiry" style="margin-top:10px; color:#0f0;"></div>
    </div>
    <div class="footer">
        مطور الإضافة: المهندس خالد<br>
        <a href="https://instagram.com/_gq6" style="color:#8b0000;text-decoration:none;">@_gq6</a><br>
        سبحان الله وبحمده سبحان الله العظيم
    </div></div>
    <script>
    async function gen(){
        const u=document.getElementById('url').value, n=document.getElementById('username').value, p=document.getElementById('password').value;
        const d=btoa(JSON.stringify({url:u,username:n,password:p}));
        document.getElementById('out').value = window.location.protocol+"//"+window.location.host+"/"+d+"/manifest.json";
        document.getElementById('res').style.display='block';
        const info = await(await fetch('/check?url='+encodeURIComponent(u)+'&user='+n+'&pass='+p)).json();
        document.getElementById('expiry').innerText = "باقي على اشتراكك: " + info.days + " يوم";
    }
    function copyUrl(){ document.getElementById("out").select(); document.execCommand("copy"); alert('تم النسخ!'); }
    </script></body></html>`);
});

app.get("/check", async (req, res) => {
    try {
        const {url, user, pass} = req.query;
        const b = url.replace(/\/$/,"");
        const d = (await axios.get(`${b}/player_api.php?username=${user}&password=${pass}`)).data;
        const expDate = new Date(d.user_info.exp_date * 1000);
        const days = Math.ceil((expDate - new Date()) / (1000 * 60 * 60 * 24));
        res.json({days: days > 0 ? days : 0});
    } catch(e) { res.json({days: 0}); }
});

app.get("/:config/manifest.json", (req, res) => {
    res.json({id: "org.khalid.iptv", version: "1.0.0", name: "khalid iptv", types: ["movie", "series"], resources: ["stream"], idPrefixes: ["tt"]});
});

app.get("/:config/stream/:type/:id.json", async (req, res) => {
    try {
        const c = JSON.parse(Buffer.from(req.params.config, "base64").toString("utf-8"));
        const b = c.url.replace(/\/$/,"");
        const type = req.params.type;
        const idParts = req.params.id.split(':');
        const ttId = idParts[0];

        // جلب اسم العمل من Cinemeta العالمي
        const metaRes = await axios.get(`https://v3-cinemeta.strem.io/meta/${type}/${ttId}.json`);
        const targetName = metaRes.data.meta.name.toLowerCase().trim();

        let streams = [];

        if (type === "movie") {
            const d = (await axios.get(`${b}/player_api.php?username=${c.username}&password=${c.password}&action=get_vod_streams`)).data;
            const m = d.find(i => i.name && i.name.toLowerCase().includes(targetName));
            if (m) {
                streams.push({ 
                    name: "khalid iptv", 
                    title: m.name, 
                    url: `${b}/movie/${c.username}/${c.password}/${m.stream_id}.${m.container_extension || 'mp4'}` 
                });
            }
        } else if (type === "series") {
            const [_, s, e] = idParts;
            const d = (await axios.get(`${b}/player_api.php?username=${c.username}&password=${c.password}&action=get_series`)).data;
            const m = d.find(i => i.name && i.name.toLowerCase().includes(targetName));
            
            if (m) {
                const epData = (await axios.get(`${b}/player_api.php?username=${c.username}&password=${c.password}&action=get_series_info&series_id=${m.series_id}`)).data;
                const ep = epData.episodes[s]?.find(ei => parseInt(ei.episode_num) === parseInt(e));
                
                if (ep) {
                    streams.push({ 
                        name: "khalid iptv", 
                        title: ep.title, 
                        url: `${b}/series/${c.username}/${c.password}/${ep.id}.${ep.container_extension || 'mp4'}` 
                    });
                }
            }
        }

        // إضافة مصدر المطور (لأي مشغل)
        streams.push({ name: "Developer", title: "Instagram: @_gq6", externalUrl: "https://instagram.com/_gq6" });
        
        res.json({ streams: streams });
    } catch(e) { res.json({ streams: [] }); }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT);
