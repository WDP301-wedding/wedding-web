/**
 * Đọc file CSV danh sách khách thành các dòng gửi lên API import.
 *
 * Backend nhận JSON (không nhận file), nên trình duyệt tự đọc CSV. Quy tắc theo hand-off:
 * - Mỗi dòng cần `externalRowKey` ổn định (cột "ma"): import lại cùng mã sẽ không tạo trùng.
 * - Tối đa 1.000 dòng; ô bắt đầu bằng = + - @ bị backend từ chối (chống "CSV injection" khi
 *   mở lại bằng Excel) → kiểm tra trước để báo lỗi theo dòng cho dễ sửa.
 * - Nhóm được nhập theo TÊN nhóm, đổi sang `guestGroupId` ở client.
 */
export const csvTemplate =
  'ma,ho_ten,nhom,so_dien_thoai,ghi_chu\n' +
  'K001,Nguyễn Văn An,Groom Side,0901234567,Bạn đại học\n' +
  'K002,Trần Thị Bình,Bride Side,,\n';

export type ImportRow = {
  externalRowKey: string;
  name: string;
  guestGroupId: string;
  phone?: string | null;
  operationalNote?: string | null;
};

export type CsvParseResult = Readonly<{
  rows: ImportRow[];
  errors: readonly { line: number; message: string }[];
}>;

/** Tách CSV theo RFC 4180 tối giản: hỗ trợ dấu phẩy và xuống dòng nằm trong ngoặc kép. */
export function parseCsv(text: string): string[][] {
  const records: string[][] = [];
  let field = '';
  let record: string[] = [];
  let quoted = false;
  const source = text.replace(/^\uFEFF/u, ''); // bỏ BOM do Excel thêm vào
  for (let index = 0; index < source.length; index += 1) {
    const char = source[index]!;
    if (quoted) {
      if (char === '"' && source[index + 1] === '"') {
        field += '"';
        index += 1;
      } else if (char === '"') quoted = false;
      else field += char;
      continue;
    }
    if (char === '"') quoted = true;
    else if (char === ',') {
      record.push(field);
      field = '';
    } else if (char === '\n' || char === '\r') {
      if (char === '\r' && source[index + 1] === '\n') index += 1;
      record.push(field);
      records.push(record);
      record = [];
      field = '';
    } else field += char;
  }
  if (field !== '' || record.length > 0) {
    record.push(field);
    records.push(record);
  }
  return records.filter((row) => row.some((cell) => cell.trim() !== ''));
}

/**
 * Chuẩn hoá số điện thoại Việt Nam về E.164 (backend chỉ nhận E.164, ví dụ +84901234567).
 * Trả về null nếu để trống; ném lỗi nếu không nhận diện được.
 */
export function normalizePhone(raw: string): string | null {
  const compact = raw.replace(/[\s.()-]/g, '');
  if (compact === '') return null;
  if (/^\+[1-9]\d{7,14}$/.test(compact)) return compact;
  if (/^0\d{9,10}$/.test(compact)) return '+84' + compact.slice(1);
  if (/^84\d{9,10}$/.test(compact)) return '+' + compact;
  throw new Error('Số điện thoại không hợp lệ');
}

const formulaLike = /^[=+\-@]/;
const normalizeName = (value: string) => value.normalize('NFC').trim().toLocaleLowerCase('vi');

export function csvToImportRows(
  text: string,
  groups: readonly { guestGroupId: string; name: string; status: string }[],
): CsvParseResult {
  const records = parseCsv(text);
  const errors: { line: number; message: string }[] = [];
  const rows: ImportRow[] = [];
  if (records.length === 0) return { rows, errors: [{ line: 1, message: 'File trống.' }] };

  const header = records[0]!.map((cell) => cell.trim().toLowerCase());
  const column = (name: string) => header.indexOf(name);
  const [keyCol, nameCol, groupCol, phoneCol, noteCol] = [
    'ma',
    'ho_ten',
    'nhom',
    'so_dien_thoai',
    'ghi_chu',
  ].map(column);
  if (keyCol === -1 || nameCol === -1 || groupCol === -1) {
    return { rows, errors: [{ line: 1, message: 'Thiếu cột bắt buộc: ma, ho_ten, nhom.' }] };
  }
  if (records.length - 1 > 1000) {
    return { rows, errors: [{ line: 1, message: 'Mỗi lần import tối đa 1.000 dòng.' }] };
  }
  const groupByName = new Map(
    groups
      .filter((group) => group.status === 'ACTIVE')
      .map((group) => [normalizeName(group.name), group.guestGroupId]),
  );
  const seenKeys = new Set<string>();

  records.slice(1).forEach((record, offset) => {
    const line = offset + 2; // dòng 1 là tiêu đề
    const cell = (col: number | undefined) =>
      col === undefined || col < 0 ? '' : (record[col] ?? '').trim();
    const key = cell(keyCol);
    const name = cell(nameCol).normalize('NFC');
    const groupName = cell(groupCol);
    const note = cell(noteCol);
    const problems: string[] = [];
    if (!key) problems.push('thiếu mã');
    else if (seenKeys.has(key)) problems.push(`mã "${key}" bị trùng`);
    if (!name) problems.push('thiếu họ tên');
    if (name.length > 120) problems.push('họ tên quá 120 ký tự');
    if ([key, name, note].some((value) => formulaLike.test(value)))
      problems.push('ô bắt đầu bằng = + - @');
    const guestGroupId = groupByName.get(normalizeName(groupName));
    if (!guestGroupId) problems.push(`không có nhóm "${groupName}"`);
    let phone: string | null = null;
    try {
      phone = normalizePhone(cell(phoneCol));
    } catch {
      problems.push('số điện thoại không hợp lệ');
    }
    if (note.length > 500) problems.push('ghi chú quá 500 ký tự');
    if (problems.length > 0) {
      errors.push({ line, message: problems.join(', ') });
      return;
    }
    seenKeys.add(key);
    rows.push({
      externalRowKey: key,
      name,
      guestGroupId: guestGroupId!,
      phone,
      operationalNote: note || null,
    });
  });
  return { rows, errors };
}
