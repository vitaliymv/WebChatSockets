let http = require("http");
let fs = require("fs");
let path = require("path");
let db = require("./database");

let indexHtmlFile = fs.readFileSync(path.join(__dirname, "static", "index.html"));
let styleFile = fs.readFileSync(path.join(__dirname, "static", "style.css"));
let scriptFile = fs.readFileSync(path.join(__dirname, "static", "script.js"));
let authHtmlFile = fs.readFileSync(path.join(__dirname, "static", "auth.html"));
let authJsFile = fs.readFileSync(path.join(__dirname, "static", "auth.js"));

const server = http.createServer((req, res) => {
    if (req.method == "GET") {
        switch (req.url) {
            case "/": return res.end(indexHtmlFile);
            case "/script.js": return res.end(scriptFile);
            case "/style.css": return res.end(styleFile);
            case "/auth": return res.end(authHtmlFile);
            case "/auth.js": return res.end(authJsFile)
        }
        res.statusCode = 404;
        res.end("404");
    }
    if (req.method == "POST") {
        switch (req.url) {
            case "/api/login": return loginUser(req, res);
            case "/api/register": return registerUser(req, res);
        }
    }
})

function registerUser(req, res) {
    let data = "";
    req.on("data", chunk => {
        data += chunk;
    })
    req.on("end", async () => {
        try {
            const user = JSON.parse(data);
            if (!user.login.trim() || !user.password.trim()) {
                res.statusCode = 400;
                return res.end(JSON.stringify({
                    "error": "Empty username or password"
                }))
            }
            if (await db.isUserExist(user.login)) {
                res.statusCode = 400;
                return res.end(JSON.stringify({
                    "error": "Username already exists"
                }))
            }
            await db.addUser(user);
            res.statusCode = 201;
            res.end(JSON.stringify({
                "status": "ok"
            }))
        } catch (e) {
            res.statusCode = 500;
            return res.end(JSON.stringify({
                "error": "Some error, try again"
            }))
        }
    })
}

function loginUser(req, res) {
    let data = "";
    req.on("data", chunk => {
        data += chunk;
    })

    req.on("end", async () => {
        try {
            const user = JSON.parse(data);
            const token = await db.getAuthToken(user);
            res.statusCode = 200;
            res.end(JSON.stringify({
                "token": token
            }))
        } catch (e) {
            res.statusCode = 400;
            return res.end(JSON.stringify({
                "error": e
            }))
        }
    })

}

server.listen(3000);

const { Server } = require("socket.io");
const io = new Server(server);

io.on("connection", socket => {
    console.log("A user connected. Id: " + socket.id);
    socket.on("new_message", message => {
        let date = new Date();
        let hours = String(date.getHours()).padStart(2, "0");
        let minutes = String(date.getMinutes()).padStart(2, "0");
        let time = hours + ":" + minutes;
        io.emit("message", JSON.stringify({
            "sender": "Admin",
            "text": message,
            "time": time
        }))
    })
})