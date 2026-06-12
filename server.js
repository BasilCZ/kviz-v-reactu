import express from "express";
import cors from "cors";

const app = express();
app.use(cors());
app.use(express.json());

const API = "https://crm.skch.cz/ajax0/kvizapi.php";

app.get("/api/questions", async (req, res) => {
  const r = await fetch(`${API}?action=listQuestion`);
  res.json(await r.json());
});

app.post("/api/validate", async (req, res) => {
  const r = await fetch(`${API}?action=validationAnswer`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(req.body),
  });
  res.json(await r.json());
});

app.listen(3001, () => console.log("✅ Proxy běží na http://localhost:3001"));
