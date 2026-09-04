require("./env");
const express = require("express");
const a = express();
a.use((req, res, next) => {
  console.log("origin header =", JSON.stringify(req.headers.origin));
  console.log("env CORS_ORIGIN =", JSON.stringify(process.env.CORS_ORIGIN));
  res.setHeader("Access-Control-Allow-Origin", req.headers.origin || "*");
  if (req.method === "OPTIONS") return res.sendStatus(204);
  next();
});
a.get("/", (q, s) => s.json({ ok: 1 }));
a.listen(8302, () => console.log("test up"));
