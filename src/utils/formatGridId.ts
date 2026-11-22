export function formatGridId(id: string | number): string {
  const value = String(id).trim();

  if (!value) return "";

  const groups: string[] = [];

  // ID ngắn hơn hoặc bằng 5 ký tự
  if (value.length <= 5) {
    if (value.length <= 2) return value;

    if (value.length <= 3) return value;

    groups.push(value.slice(0, 2));
    groups.push(value.slice(2));

    return groups.join(" ");
  }

  // 3 ký tự đầu
  groups.push(value.slice(0, 3));

  // 2 ký tự tiếp theo
  groups.push(value.slice(3, 5));

  let rest = value.slice(5);
  let index = 0;

  while (index < rest.length) {
    const remaining = rest.length - index;

    // Nhóm đặc biệt bắt đầu bằng 0, giữ 4 ký tự
    if (rest[index] === "0" && remaining >= 4) {
      groups.push(rest.slice(index, index + 4));
      index += 4;
    } else {
      groups.push(rest.slice(index, index + 3));
      index += 3;
    }
  }

  return groups.filter(Boolean).join(" ");
}
