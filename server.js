const express = require("express");
const axios = require("axios");
const app = express();

app.use(express.json());

// واجهة الموقع الاحترافية
app.get("/", (req, res) => {
    res.send(`
    <!DOCTYPE html>
    <html lang="ar" dir="rtl">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
        <title>khalid iptv</title>
        <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: #0f172a; color: #fff; display: flex; justify-content: center; align-items: center; min-height: 100vh; margin: 0; padding: 20px; box-sizing: border-box; }
            .card { background: #1e293b; padding: 2rem; border-radius: 16px; width: 100%; max-width: 400px; text-align: center; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.5); }
            h1 { margin-top: 0; color: #38bdf8; font-size: 24px; }
            input { width: 100%; padding: 14px; margin: 8px 0; border-radius: 8px; border: 1px solid #334155; background: #0f172a; color: #fff; box-sizing: border-box; font-size: 16px; transition: 0.3s; }
            input:focus { outline: none; border-color: #38bdf8; }
            button { width: 100%; padding: 14px; background: #0284c7; color: white; border: none; border-radius: 8px; cursor: pointer; margin-top: 15px; font-size: 16px; font-weight: bold; transition: 0.3s; }
            button:hover { background: #0369a1; }
            .copy-btn { background: #10b981; margin-top: 10px; }
            .copy-btn:hover { background: #059669; }
            .footer { margin-top: 25px; font-size: 14px; color: #94a3b8; border-top: 1px solid #334155; padding-top: 15px; line-height: 1.8; }
            .footer a { color: #38bdf8; text-decoration: none; font-weight: bold; }
        </style>
    </head>
    <body>
        <div class="card">
            <h1>khalid iptv</h1>
            <p style="font-size: 14px; color: #cbd5e1; margin-bottom: 20px;">أدخل بيانات اشتراكك لتوليد الرابط</p>
            
            <input type="text" id="url" placeholder="رابط السيرفر (URL)">
            <input type="text" id="username" placeholder="اسم المستخدم (Username)">
            <input type="password" id="password" placeholder="كلمة المرور (Password)">
            
            <button onclick="gen()">توليد الرابط</button>
            
            <div id="res" style="margin-top:20px; display:none; text-align: right;">
                <label style="font-size: 13px; color: #cbd5e1; margin-bottom: 5px; display: block;">رابط الإضافة الخاص بك:</label>
                <input type="text" id="out" readonly style="color: #38bdf8; background: #0b1120;">
                <button class="copy-btn" onclick="copyUrl()" id="copyBtn">نسخ الرابط</button>
                <div id="expiry" style="margin-top:10px; color:#10b981; font-size:14px; text-align:center; font-weight:bold;"></div>
            </div>

            <div class="footer">
                مطور الإضافة: <strong>المهندس خالد</strong> <br>
                انستقرام: <a href="https://instagram.com/_gq6" target="_blank">@_gq6</a><br>
                سبحان الله وبحمده سبحان الله العظيم
            </div>
        </div>
        <script>
            async function gen() {
                const url = document.getElementById('url').value.trim();
                const user = document.getElementById('username').value.trim();
                const pass = document.getElementById('password').value.trim();
                
                if(!url || !user || !pass) {
                    alert("الرجاء تعبئة جميع الحقول!");
                    return;
                }

                const data = btoa(JSON.stringify({url: url, username: user, password: pass}));
                document.getElementById('out').value = window.location.protocol + "//" + window.location.host + "/" + data + "/manifest.json";
                document.getElementById('res').style.display = 'block';
                
                document.getElementById('copyBtn').innerText = "نسخ الرابط";
                document.getElementById('copyBtn').style.background = "#10b981";

                try {
                    const info = await (await fetch('/check?url=' + encodeURIComponent(url) + '&user=' + user + '&pass=' + pass)).json();
                    document.getElementById('expiry').innerText = "حالة الاشتراك: " + info.days;
                } catch(e) {
                    document.getElementById('expiry').innerText = "حالة الاشتراك: نشط";
                }
            }

            function copyUrl() {
                const out = document.getElementById('out');
                out.select();
                out.setSelectionRange(0, 99999);
                navigator.clipboard.writeText(out.value).then(() => {
                    const btn = document.getElementById('copyBtn');
                    btn.innerText = "تم النسخ بنجاح ✔️";
                    btn.style.background = "#059669";
                });
            }
        </script>
    </body>
    </html>
    `);
});

// فحص الصلاحية المطور (متوافق مع سيرفرات هولك وباقي السيرفرات)
app.get("/check", async (req, res) => {
    try {
        const {url, user, pass} = req.query;
        const b = url.replace(/\/$/, "");
        const response = await axios.get(`${b}/player_api.php?username=${user}&password=${pass}`);
        const d = response.data;
        
        if (d && d.user_info) {
            let exp = d.user_info.exp_date;
            
            if (!exp || exp === "null" || exp === "") {
                return res.json({days: "نشط"});
            }

            let expDate;
            if (!isNaN(exp)) {
                expDate = new Date(Number(exp) * 1000);
            } else {
                expDate = new Date(exp);
            }

            const days = Math.ceil((expDate - new Date()) / (1000 * 60 * 60 * 24));
            res.json({days: days > 0 ? `${days} يوم` : "نشط"});
        } else {
            res.json({days: "نشط"});
        }
    } catch(e) { 
        res.json({days: "نشط"}); 
    }
});

// تعريف الإضافة
app.get("/:config/manifest.json", (req, res) => {
    res.json({
        id: "org.khalid.iptv",
        version: "1.0.0",
        name: "khalid iptv",
        types: ["movie", "series"],
        resources: ["stream"],
        idPrefixes: ["tt"]
    });
});

// مساعدة لتنظيف النصوص والمقارنة الذكية
const normalize = (str) => (str || "").toLowerCase().replace(/[^a-z0-9\u0600-\u06ff]/g, "").trim();

app.get("/:config/stream/:type/:id.json", async (req, res) => {
    try {
        const c = JSON.parse(Buffer.from(req.params.config, "base64").toString("utf-8"));
        const type = req.params.type;
        const cleanId = req.params.id.replace(".json", "");
        const b = c.url.replace(/\/$/, "");
        
        const metaRes = await axios.get(`https://v3-cinemeta.strem.io/meta/${type}/${cleanId.split(':')[0]}.json`);
        const targetNameRaw = metaRes.data.meta.name.toLowerCase().trim();
        const targetNorm = normalize(targetNameRaw);

        let streams = [];

        if (type === "movie") {
            const d = (await axios.get(`${b}/player_api.php?username=${c.username}&password=${c.password}&action=get_vod_streams`)).data;
            
            let m = d.find(i => (i.name || "").toLowerCase().trim() === targetNameRaw);
            
            if (!m) {
                m = d.find(i => normalize(i.name).startsWith(targetNorm));
            }

            if(m) {
                streams.push({
                    name: "khalid iptv",
                    title: m.name,
                    url: `${b}/movie/${c.username}/${c.password}/${m.stream_id}.${m.container_extension || 'mp4'}`
                });
            }
        } else if (type === "series") {
            const d = (await axios.get(`${b}/player_api.php?username=${c.username}&password=${c.password}&action=get_series`)).data;
            
            let m = d.find(i => (i.name || "").toLowerCase().trim() === targetNameRaw);

            if (!m) {
                m = d.find(i => {
                    const serverNameRaw = (i.name || "").toLowerCase().trim();
                    const serverNorm = normalize(serverNameRaw);
                    
                    if (serverNorm.startsWith(targetNorm)) {
                        const remainder = serverNorm.replace(targetNorm, "");
                        const spinOffs = ["deadcity", "daryldixon", "oneswholive", "worldbeyond", "fearthewalkingdead"];
                        if (spinOffs.some(word => remainder.includes(word))) {
                            return false;
                        }
                        return true;
                    }
                    return false;
                });
            }

            if(m) {
                const epData = (await axios.get(`${b}/player_api.php?username=${c.username}&password=${c.password}&action=get_series_info&series_id=${m.series_id}`)).data;
                const seasonNum = cleanId.split(':')[1];
                const epNum = cleanId.split(':')[2];
                
                const seasonEps = epData.episodes[seasonNum] || [];
                const ep = seasonEps.find(e => parseInt(e.episode_num) === parseInt(epNum));

                if(ep) {
                    streams.push({
                        name: "khalid iptv",
                        title: ep.title || `S${seasonNum}E${epNum}`,
                        url: `${b}/series/${c.username}/${c.password}/${ep.id}.${ep.container_extension || 'mp4'}`
                    });
                }
            }
        }

        streams.push({
            name: "Developer",
            title: "Instagram: @_gq6",
            externalUrl: "https://instagram.com/_gq6"
        });

        res.json({ streams: streams });
    } catch(e) { 
        res.json({ streams: [] }); 
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT);
