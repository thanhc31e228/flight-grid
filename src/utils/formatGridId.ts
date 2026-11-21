export function formatGridId(id: string | number): string {
  const value = String(id);

  if (!value) return "";

  // 3 ký tự đầu
  const first = value.slice(0, 3);

  // 2 ký tự tiếp theo
  const second = value.slice(3, 5);

  // Phần còn lại
  const rest = value.slice(5);

  // ID ngắn: 40180445 -> 401 80 445
  if (rest.length <= 3) {
    return [first, second, rest].filter(Boolean).join(" ");
  }

  // ID dài: phân nhóm phần còn lại
  const groups: string[] = [];
  let index = 0;

  while (index < rest.length) {
    // Nếu còn 4 ký tự và bắt đầu bằng 0 thì giữ nhóm 4 (VD: 0122)
    if (rest[index] === "0" && rest.length - index >= 4) {
      groups.push(rest.slice(index, index + 4));
      index += 4;
    } else {
      groups.push(rest.slice(index, index + 3));
      index += 3;
    }
  }

  return [first, second, ...groups].filter(Boolean).join(" ");
}
