const express = require("express");
const axios = require("axios");
const app = express();

app.use(express.json());

// 1. صفحة الموقع وواجهة إدخال البيانات (khalid iptv)
app.get("/", (req, res) => {
    const html = `
    <!DOCTYPE html>
    <html lang="ar" dir="rtl">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>khalid iptv - Stremio Addon</title>
        <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #0f172a; color: #fff; display: flex; justify-content: center; align-items: center; min-height: 100vh; margin: 0; }
            .card { background: #1e293b; padding: 2.5rem; border-radius: 16px; box-shadow: 0 10px 25px rgba(0,0,0,0.5); width: 100%; max-width: 420px; text-align: center; }
            h1 { color: #38bdf8; margin-bottom: 0.5rem; font-size: 2rem; }
            p.sub { color: #94a3b8; font-size: 0.9rem; margin-bottom: 1.5rem; }
            input { width: 100%; padding: 12px; margin: 8px 0; border-radius: 8px; border: 1px solid #334155; background: #0f172a; color: #fff; box-sizing: border-box; }
            button { width: 100%; padding: 12px; background: #0284c7; color: white; border: none; border-radius: 8px; font-weight: bold; cursor: pointer; margin-top: 12px; transition: 0.3s; }
            button:hover { background: #0369a1; }
            .instagram { margin-top: 20px; font-size: 0.9rem; color: #cbd5e1; }
            .instagram a { color: #e1306c; text-decoration: none; font-weight: bold; }
            .result { margin-top: 15px; word-break: break-all; display: none; background: #0f172a; padding: 10px; border-radius: 8px; font-size: 0.85rem; border: 1px dashed #38bdf8; }
        </style>
    </head>
    <body>
        <div class="card">
            <h1>khalid iptv</h1>
            <p class="sub">إضافة شاملة (أفلام، مسلسلات، قنوات) لاشتراكات Xtream</p>
            
            <input type="text" id="url" placeholder="رابط السيرفر (URL)" required>
            <input type="text" id="username" placeholder="اسم المستخدم (Username)" required>
            <input type="password" id="password" placeholder="كلمة المرور (Password)" required>
            
            <button onclick="generateLink()">توليد رابط الإضافة</button>

            <div id="resultBox" class="result">
                <p>تم إنشاء الرابط بنجاح! انسخه وضعه في Stremio:</p>
                <input type="text" id="manifestUrl" readonly>
                <button onclick="installStremio()" style="background:#10b981; margin-top:8px;">تثبيت مباشر في Stremio</button>
            </div>

            <div class="instagram">
                تطوير الإضافة بواسطة: <a href="https://instagram.com/_gq6" target="_blank">@_gq6</a>
            </div>
        </div>

        <script>
            function generateLink() {
                const url = document.getElementById('url').value.trim();
                const username = document.getElementById('username').value.trim();
                const password = document.getElementById('password').value.trim();

                if(!url || !username || !password) {
                    alert('يرجى ملء جميع الحقول');
                    return;
                }

                // تشفير البيانات بـ base64
                const configData = btoa(JSON.stringify({ url, username, password }));
                const host = window.location.host;
                const protocol = window.location.protocol;
                
                const finalUrl = \`\${protocol}//\${host}/\${configData}/manifest.json\`;
                
                document.getElementById('manifestUrl').value = finalUrl;
                document.getElementById('resultBox').style.display = 'block';
            }

            function installStremio() {
                const manifestUrl = document.getElementById('manifestUrl').value;
                const stremioUrl = manifestUrl.replace(/^https?:\/\//, 'stremio://');
                window.location.href = stremioUrl;
            }
        </script>
    </body>
    </html>
    `;
    res.send(html);
});

// 2. ملف الـ Manifest
app.get("/:config/manifest.json", (req, res) => {
    res.json({
        id: "org.khalid.iptv",
        version: "1.0.0",
        name: "khalid iptv",
        description: "إضافة مجانية لجلب مصادر التشغيل من IPTV - تم التطوير بواسطة @_gq6",
        types: ["movie", "series", "tv"],
        catalogs: [],
        resources: ["stream"],
        idPrefixes: ["tt", "tmdb", "yt_id", ""]
    });
});

// 3. معالج البحث الشامل (أفلام، مسلسلات، قنوات)
app.get("/:config/stream/:type/:id.json", async (req, res) => {
    try {
        const { config, type, id } = req.params;
        const cleanId = id.replace(".json", "");
        
        // فك تشفير البيانات
        const credentials = JSON.parse(Buffer.from(config, "base64").toString("utf-8"));
        const { url: XTREAM_URL, username: USERNAME, password: PASSWORD } = credentials;
        const baseUrl = XTREAM_URL.replace(/\/$/, "");

        const idParts = cleanId.split(":");
        const mainId = idParts[0];
        const season = idParts.length > 1 ? parseInt(idParts[1]) : null;
        const episode = idParts.length > 2 ? parseInt(idParts[2]) : null;

        let mediaTitle = null;

        // جلب الاسم بناءً على النوع
        if (type === "movie" || type === "series") {
            try {
                const metaRes = await axios.get(`https://v3-cinemeta.strem.io/meta/${type}/${mainId}.json`);
                if (metaRes.data && metaRes.data.meta) {
                    mediaTitle = metaRes.data.meta.name;
                }
            } catch (e) {
                console.log("Cinemeta Fetch Failed");
            }
        } else if (type === "tv") {
            mediaTitle = decodeURIComponent(mainId);
        }

        // إذا فشل جلب الاسم، نستخدم الـ ID كمحاولة أخيرة للبحث
        if (!mediaTitle) mediaTitle = decodeURIComponent(mainId);

        let streamUrl = "";
        let displayTitle = "";

        // -- أ: معالجة الأفلام --
        if (type === "movie") {
            const api = `${baseUrl}/player_api.php?username=${USERNAME}&password=${PASSWORD}&action=get_vod_streams`;
            const resData = await axios.get(api, { timeout: 10000 });
            const list = Array.isArray(resData.data) ? resData.data : [];

            const match = list.find(item => item.name && item.name.toLowerCase().includes(mediaTitle.toLowerCase()));
            if (match) {
                const ext = match.container_extension || "mp4";
                streamUrl = `${baseUrl}/movie/${USERNAME}/${PASSWORD}/${match.stream_id}.${ext}`;
                displayTitle = `🎬 ${match.name}\n⭐ فيلم | @_gq6`;
            }
        } 
        
        // -- ب: معالجة المسلسلات --
        else if (type === "series") {
            const seriesApi = `${baseUrl}/player_api.php?username=${USERNAME}&password=${PASSWORD}&action=get_series`;
            const seriesRes = await axios.get(seriesApi, { timeout: 10000 });
            const list = Array.isArray(seriesRes.data) ? seriesRes.data : [];

            const match = list.find(item => item.name && item.name.toLowerCase().includes(mediaTitle.toLowerCase()));
            if (match) {
                const infoApi = `${baseUrl}/player_api.php?username=${USERNAME}&password=${PASSWORD}&action=get_series_info&series_id=${match.series_id}`;
                const infoRes = await axios.get(infoApi, { timeout: 10000 });
                
                const eps = infoRes.data.episodes;
                if (eps && eps[season]) {
                    const epMatch = eps[season].find(ep => ep.episode_num == episode);
                    if (epMatch) {
                        const ext = epMatch.container_extension || "mp4";
                        streamUrl = `${baseUrl}/series/${USERNAME}/${PASSWORD}/${epMatch.id}.${ext}`;
                        displayTitle = `📺 ${match.name}\n▶️ الموسم ${season} - الحلقة ${episode} | @_gq6`;
                    }
                }
            }
        } 
        
        // -- ج: معالجة قنوات البث المباشر (TV) --
        else if (type === "tv") {
            const liveApi = `${baseUrl}/player_api.php?username=${USERNAME}&password=${PASSWORD}&action=get_live_streams`;
            const liveRes = await axios.get(liveApi, { timeout: 10000 });
            const list = Array.isArray(liveRes.data) ? liveRes.data : [];

            const match = list.find(item => item.name && item.name.toLowerCase().includes(mediaTitle.toLowerCase()));
            if (match) {
                streamUrl = `${baseUrl}/${USERNAME}/${PASSWORD}/${match.stream_id}`;
                displayTitle = `📡 ${match.name}\n🔴 بث مباشر | @_gq6`;
            }
        }

        // إرسال النتيجة النهائية لستريميو
        if (streamUrl) {
            return res.json({
                streams: [
                    {
                        name: "khalid iptv\n✨",
                        title: displayTitle,
                        url: streamUrl
                    }
                ]
            });
        }

        return res.json({ streams: [] });
    } catch (err) {
        console.error("Stream Error:", err.message);
        return res.json({ streams: [] });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`khalid iptv addon running on port ${PORT}`));
}