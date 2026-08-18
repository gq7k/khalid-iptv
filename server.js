const express = require("express");
const axios = require("axios");
const app = express();
app.use(express.json());
app.get("/", (req, res) => {
    res.send(`
    <!DOCTYPE html>
    <html lang="ar" dir="rtl">
    <head><meta charset="UTF-8"><title>khalid iptv</title>
    <style>body{font-family:sans-serif;background:#0f172a;color:#fff;display:flex;justify-content:center;align-items:center;min-height:100vh;margin:0;}
    .card{background:#1e293b;padding:2rem;border-radius:16px;width:100%;max-width:400px;text-align:center;}
    input{width:100%;padding:10px;margin:5px 0;border-radius:5px;border:none;background:#0f172a;color:#fff;box-sizing:border-box;}
    button{width:100%;padding:10px;background:#0284c7;color:white;border:none;border-radius:5px;cursor:pointer;margin-top:10px;}</style></head>
    <body><div class="card"><h1>khalid iptv</h1>
    <input type="text" id="url" placeholder="URL"><input type="text" id="username" placeholder="Username"><input type="password" id="password" placeholder="Password">
    <button onclick="gen()">توليد الرابط</button>
    <div id="res" style="margin-top:15px;display:none;"><input type="text" id="out" readonly></div></div>
    <script>function gen(){const d=btoa(JSON.stringify({url:document.getElementById('url').value,username:document.getElementById('username').value,password:document.getElementById('password').value}));document.getElementById('out').value=window.location.protocol+"//"+window.location.host+"/"+d+"/manifest.json";document.getElementById('res').style.display='block';}</script></body></html>
    `);
});
app.get("/:config/manifest.json", (req, res) => {
    res.json({id:"org.khalid.iptv",version:"1.0.0",name:"khalid iptv",types:["movie","series","tv"],resources:["stream"],idPrefixes:["tt","tmdb",""]});
});

app.get("/:config/stream/:type/:id.json", async (req, res) => {
    try {
        const c=JSON.parse(Buffer.from(req.params.config,"base64").toString("utf-8"));
        const type=req.params.type, id=req.params.id.replace(".json",""), b=c.url.replace(/\/$/,"");
        let s="";
        if(type==="movie"){
            const d=(await axios.get(`${b}/player_api.php?username=${c.username}&password=${c.password}&action=get_vod_streams`)).data;
            const m=d.find(i=>i.stream_id==id.split(":")[0]);
            if(m) s=`${b}/movie/${c.username}/${c.password}/${m.stream_id}.${m.container_extension||'mp4'}`;
        }
        res.json({streams:s?[{name:"khalid iptv",title:"📺 تشغيل",url:s}]:[]});
    } catch(e){res.json({streams:[]});}
});

const PORT=process.env.PORT||3000;
app.listen(PORT);
