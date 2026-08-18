const express = require("express");
const axios = require("axios");
const app = express();

app.use(express.json());

app.get("/", (req, res) => {
    res.send(`
    <!DOCTYPE html>
    <html lang="ar" dir="rtl"><head><meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <title>khalid iptv</title>
    <style>
        body { font-family: sans-serif; background: #000; color: #fff; display: flex; justify-content: center; align-items: center; min-height: 100vh; margin: 0; padding: 15px; box-sizing: border-box; }
        .card { background: #111; padding: 20px; border-radius: 16px; width: 100%; max-width: 400px; text-align: center; border: 1px solid #333; }
        h1 { color: #ff0000; font-size: 22px; }
        input { width: 100%; padding: 15px; margin: 8px 0; border-radius: 8px; border: 1px solid #444; background: #000; color: #fff; box-sizing: border-box; font-size: 16px; }
        button { width: 100%; padding: 15px; background: #ff0000; color: white; border: none; border-radius: 8px; cursor: pointer; margin-top: 10px; font-weight: bold; font-size: 16px; }
        .footer { margin-top: 20px; color: #ff0000; font-size: 14px; line-height: 1.8; }
        .footer a { color: #ff0000; text-decoration: none; font-weight: bold; }
    </style></head>
    <body><div class="card"><h1>khalid iptv</h1>
    <input type="text" id="url" placeholder="url / الرابط">
    <input type="text" id="username" placeholder="username / اسم المستخدم">
    <input type="password" id="password" placeholder="password / كلمة المرور">
    <button onclick="gen()">توليد الرابط</button>
    <div id="res" style="margin-top:20px;display:none;">
        <input type="text" id="out" readonly>
        <button style="background:#444" onclick="copyUrl()">نسخ الرابط</button>
        <div id="expiry" style="margin-top:10px; color:#0f0; font-size:14px;"></div>
    </div>
    <div class="footer">
        مطور الإضافة: المهندس خالد<br>
        <a href="https://instagram.com/_gq6" target="_blank">@_gq6</a><br>
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
    function copyUrl(){
        const copyText = document.getElementById("out");
        copyText.select();
        document.execCommand("copy");
        alert('تم النسخ!');
    }
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
        const type = req.params.type;
        const b = c.url.replace(/\/$/,"");
        
        let streams = [];
        
        // جلب اسم المحتوى من ستريميو
        const ttId = type === "movie" ? req.params.id.split('.')[0] : req.params.id.split(':')[0];
        const metaRes = await axios.get(`https://v3-cinemeta.strem.io/meta/${type}/${ttId}.json`);
        const name = metaRes.data.meta.name.toLowerCase();

        // 1. قسم الأفلام
        if (type === "movie") {
            const d = (await axios.get(`${b}/player_api.php?username=${c.username}&password=${c.password}&action=get_vod_streams`)).data;
            const m = d.find(i => i.name && i.name.toLowerCase().includes(name));
            if (m) {
                streams.push({
                    name: "khalid iptv", 
                    title: "🎬 تشغيل الفيلم", 
                    url: `${b}/movie/${c.username}/${c.password}/${m.stream_id}.${m.container_extension || 'mp4'}`
                });
            }
        } 
        // 2. قسم المسلسلات
        else if (type === "series") {
            const [_, s, e] = req.params.id.split(':');
            const d = (await axios.get(`${b}/player_api.php?username=${c.username}&password=${c.password}&action=get_series`)).data;
            const m = d.find(i => i.name && i.name.toLowerCase().includes(name));
            
            if (m) {
                const epData = (await axios.get(`${b}/player_api.php?username=${c.username}&password=${c.password}&action=get_series_info&series_id=${m.series_id}`)).data;
                const seasonEps = epData.episodes[s] || [];
                
                // الكلمات المحظورة لمنع الكواليس والإعلانات
                const badWords = ["behind", "making", "trailer", "bts", "interview", "sneak", "promo", "extra", "recap"];
                
                // تنظيف القائمة
                const cleanEps = seasonEps.filter(ei => {
                    const t = (ei.title || "").toLowerCase();
                    return !badWords.some(bw => t.includes(bw));
                });
                
                // البحث الأساسي برقم الحلقة
                let ep = cleanEps.find(ei => parseInt(ei.episode_num) === parseInt(e));
                
                // البحث البديل (إذا مزود الـ IPTV لم يضع رقم الحلقة ووضعه في العنوان فقط)
                if (!ep) {
                    ep = cleanEps.find(ei => {
                        const t = (ei.title || "").toLowerCase();
                        return t.includes(`episode ${e}`) || t.includes(`e${e}`) || t.includes(`e0${e}`);
                    });
                }

                if (ep) {
                    streams.push({
                        name: "khalid iptv", 
                        title: `S${s}E${e}`, 
                        url: `${b}/series/${c.username}/${c.password}/${ep.id}.${ep.container_extension || 'mp4'}`
                    });
                }
            }
        }

        // إضافة مصدر الإنستقرام
        streams.push({
            name: "Developer", 
            title: "تابع حساب المطور على الإنستقرام\n@_gq6", 
            externalUrl: "https://instagram.com/_gq6"
        });

        res.json({ streams: streams });
    } catch(e) { 
        res.json({ streams: [] }); 
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT);
