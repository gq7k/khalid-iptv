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
        const ttId = type === "movie" ? req.params.id.split('.')[0] : req.params.id.split(':')[0];
        
        // جلب معلومات العمل من Cinemeta (عبر IMDb ID)
        const metaRes = await axios.get(`https://v3-cinemeta.strem.io/meta/${type}/${ttId}.json`);
        const meta = metaRes.data.meta;
        const name = meta.name.toLowerCase();
        const altName = meta.originalName ? meta.originalName.toLowerCase() : "";

        // الكلمات المحظورة لاستبعاد الكواليس والإعلانات
        const badWords = ["behind", "making", "trailer", "bts", "interview", "sneak", "promo", "extra", "recap", "khatat", "khalid"];

        if (type === "movie") {
            const d = (await axios.get(`${b}/player_api.php?username=${c.username}&password=${c.password}&action=get_vod_streams`)).data;
            // البحث بالطرق المتعددة للأفلام (الاسم، المعرف، أو الاسم البديل)
            let m = d.find(i => i.name && (i.name.toLowerCase().includes(name) || (altName && i.name.toLowerCase().includes(altName))));
            if (!m) {
                m = d.find(i => i.stream_id == ttId);
            }
            if (m) {
                streams.push({
                    name: "khalid iptv", 
                    title: "🎬 تشغيل الفيلم", 
                    url: `${b}/movie/${c.username}/${c.password}/${m.stream_id}.${m.container_extension || 'mp4'}`
                });
            }
        } 
        else if (type === "series") {
            const [_, s, e] = req.params.id.split(':');
            const d = (await axios.get(`${b}/player_api.php?username=${c.username}&password=${c.password}&action=get_series`)).data;
            
            // البحث بالاسم الأساسي أو البديل للمسلسل
            let m = d.find(i => i.name && (i.name.toLowerCase().includes(name) || (altName && i.name.toLowerCase().includes(altName))));
            if (!m) {
                m = d.find(i => i.series_id == ttId);
            }

            if (m) {
                const epData = (await axios.get(`${b}/player_api.php?username=${c.username}&password=${c.password}&action=get_series_info&series_id=${m.series_id}`)).data;
                const seasonEps = epData.episodes[s] || [];
                
                // تنظيف القائمة من الكواليس
                const cleanEps = seasonEps.filter(ei => {
                    const t = (ei.title || "").toLowerCase();
                    return !badWords.some(bw => t.includes(bw));
                });

                let ep = null;

                // 1. طريقة البحث برقم الحلقة المباشر
                ep = cleanEps.find(ei => parseInt(ei.episode_num) === parseInt(e));

                // 2. طريقة البحث برقم السيزون ورقم الحلقة بالنص داخل العنوان (مثلا S1E1 أو 1x1)
                if (!ep) {
                    ep = cleanEps.find(ei => {
                        const t = (ei.title || "").toLowerCase();
                        return (t.includes(`s${s}e${e}`) || t.includes(`${s}x${e}`) || t.includes(`episode ${e}`) || t.includes(`e${e}`));
                    });
                }

                // 3. طريقة البحث برقم الحلقة المنفردة في العنوان إذا تعطلت الطرق السابقة
                if (!ep) {
                    ep = cleanEps.find(ei => {
                        const t = (ei.title || "").toLowerCase();
                        return t.includes(`${e}`) && !t.includes(`${s}`); // التأكد من عدم تداخل رقم السيزون خطأ
                    });
                }

                // 4. الحل الأخير الاحتياطي من القائمة الكاملة اذا لم توجد في النظيفة
                if (!ep) {
                    ep = seasonEps.find(ei => parseInt(ei.episode_num) === parseInt(e));
                }

                if (ep) {
                    streams.push({
                        name: "khalid iptv", 
                        title: `S${s}E${e} - ${ep.title || 'حلقة'}`, 
                        url: `${b}/series/${c.username}/${c.password}/${ep.id}.${ep.container_extension || 'mp4'}`
                    });
                }
            }
        }

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
