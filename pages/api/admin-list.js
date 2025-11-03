export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Metodo no permitido" });
  }

  try {
    const { password } = req.body || {};
    if (!password || password !== process.env.ADMIN_PASSWORD) {
      return res.status(401).json({ error: "No autorizado" });
    }

    const getUrl = process.env.GSHEET_GET_URL;
    const secret = process.env.ADMIN_SECRET;
    if (!getUrl || !secret) {
      return res.status(500).json({ error: "Faltan variables de entorno" });
    }

    const url = new URL(getUrl);
    url.searchParams.set("action", "list");
    url.searchParams.set("secret", secret);

    const response = await fetch(url.toString());
    const text = await response.text();

    if (!response.ok) {
      return res
        .status(502)
        .json({ error: text || "Error al leer de Apps Script" });
    }

    try {
      const data = JSON.parse(text);
      return res.status(200).json(data);
    } catch {
      return res.status(200).json({ ok: true, rows: [] });
    }
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
