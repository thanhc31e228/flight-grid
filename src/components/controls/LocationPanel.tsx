import { useState } from "react";
import { Place } from "../../features/places/place.types";

interface Props {
  locations: Place[];
  onAdd: (data: Omit<Place, "id">) => void;
  onRemove: (id: string) => void;
  onFocus: (loc: Place) => void;
}

// "21.363411, 106.265561" -> { lat, lng }
function parseCoords(input: string) {
  const parts = input.split(/[,;\s]+/).filter(Boolean);
  if (parts.length !== 2) return null;

  const [lat, lng] = parts.map(Number);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;

  return { lat, lng };
}

export function LocationPanel({ locations, onAdd, onRemove, onFocus }: Props) {
  const [name, setName] = useState("");
  const [coords, setCoords] = useState("");
  const [phone, setPhone] = useState("");
  const [side, setSide] = useState<"auto" | "left" | "right">("auto");
  const [error, setError] = useState("");

  const handleAdd = () => {
    const parsed = parseCoords(coords);

    if (!name.trim()) return setError("Chưa nhập tên địa điểm");
    if (!parsed)
      return setError("Tọa độ sai, nhập dạng: 21.363411, 106.265561");

    onAdd({
      name: name.trim(),
      phone: phone.trim(),
      side: side === "auto" ? undefined : side,
      ...parsed,
    });

    setName("");
    setCoords("");
    setPhone("");
    setSide("auto");
    setError("");
  };

  return (
    <div
      style={{
        display: "grid",
        gap: 8,
        padding: 12,
        background: "#fff",
        width: 280,
      }}
    >
      <strong>Địa điểm</strong>

      <input
        placeholder="Tên (VD: BCHQS)"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />
      <input
        placeholder="Tọa độ: lat, lng"
        value={coords}
        onChange={(e) => setCoords(e.target.value)}
      />
      <input
        placeholder="Số điện thoại"
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
      />

      <select
        value={side}
        onChange={(e) => setSide(e.target.value as typeof side)}
      >
        <option value="auto">Label: tự động</option>
        <option value="left">Label: bên trái</option>
        <option value="right">Label: bên phải</option>
      </select>

      {error && <span style={{ color: "#dc2626", fontSize: 13 }}>{error}</span>}
      <button onClick={handleAdd}>Thêm địa điểm</button>

      <ul
        style={{
          margin: 0,
          padding: 0,
          listStyle: "none",
          display: "grid",
          gap: 6,
        }}
      >
        {locations.map((loc) => (
          <li
            key={loc.id}
            style={{ display: "flex", justifyContent: "space-between", gap: 8 }}
          >
            <button
              onClick={() => onFocus(loc)}
              style={{
                textAlign: "left",
                background: "none",
                border: 0,
                cursor: "pointer",
              }}
            >
              <div style={{ fontWeight: 700 }}>{loc.name}</div>
              <div style={{ fontSize: 12 }}>
                {loc.lat}, {loc.lng}
                {loc.phone ? ` · ${loc.phone}` : ""}
              </div>
            </button>
            <button
              onClick={() => onRemove(loc.id)}
              aria-label={`Xóa ${loc.name}`}
            >
              ✕
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
