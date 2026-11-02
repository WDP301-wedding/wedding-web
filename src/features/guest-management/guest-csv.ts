import { groupLabel } from './group-labels';

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
  'K001,Nguyễn Văn An,Nhà trai,0901234567,Bạn đại học\n' +
  'K002,Trần Thị Bình,Nhà gái,,\n';

/** Tạo nội dung file CSV mẫu dựa trên danh sách nhóm thực tế của tiệc (nếu có). */
export function createCsvTemplate(
  groups?: readonly { name: string; status: string }[],
): string {
  const active = (groups ?? []).filter((g) => g.status === 'ACTIVE');
  const g1 = active[0] ? groupLabel(active[0].name) : 'Nhà trai';
  const g2 = active[1] ? groupLabel(active[1].name) : (active[0] ? groupLabel(active[0].name) : 'Nhà gái');
  return (
    'ma,ho_ten,nhom,so_dien_thoai,ghi_chu\n' +
    `K001,Nguyễn Văn An,${g1},0901234567,Bạn đại học\n` +
    `K002,Trần Thị Bình,${g2},,\n`
  );
}

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

/** Tự động nhận diện dấu phân cách cột (, hoặc ; hoặc \t) từ dòng đầu tiên. */
export function detectDelimiter(text: string): string {
  let inQuotes = false;
  let commas = 0;
  let semicolons = 0;
  let tabs = 0;
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index]!;
    if (char === '"') {
      if (inQuotes && text[index + 1] === '"') {
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (!inQuotes) {
      if (char === '\n' || char === '\r') break;
      if (char === ',') commas += 1;
      else if (char === ';') semicolons += 1;
      else if (char === '\t') tabs += 1;
    }
  }
  if (semicolons > commas && semicolons >= tabs) return ';';
  if (tabs > commas && tabs > semicolons) return '\t';
  return ',';
}

/**
 * Tách CSV chuẩn RFC 4180 mở rộng:
 * - Tự động nhận diện dấu phẩy (,), chấm phẩy (; do Excel trên Windows Việt Nam xuất ra), hoặc tab (\t).
 * - Xử lý trường nằm trong dấu ngoặc kép, nháy kép thoát "", ngắt dòng CRLF/LF bên trong ô.
 */
export function parseCsv(text: string, explicitDelimiter?: string): string[][] {
  const records: string[][] = [];
  let field = '';
  let record: string[] = [];
  let quoted = false;
  const source = text.replace(/^\uFEFF/u, ''); // bỏ BOM do Excel thêm vào
  const delimiter = explicitDelimiter ?? detectDelimiter(source);

  for (let index = 0; index < source.length; index += 1) {
    const char = source[index]!;
    if (quoted) {
      if (char === '"' && source[index + 1] === '"') {
        field += '"';
        index += 1;
      } else if (char === '"') {
        quoted = false;
      } else {
        field += char;
      }
      continue;
    }
    if (char === '"') {
      quoted = true;
    } else if (char === delimiter) {
      record.push(field);
      field = '';
    } else if (char === '\n' || char === '\r') {
      if (char === '\r' && source[index + 1] === '\n') index += 1;
      record.push(field);
      records.push(record);
      record = [];
      field = '';
    } else {
      field += char;
    }
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
  const compact = raw.replace(/[\s\u00A0.()-]/gu, '');
  if (compact === '') return null;
  if (/^\+[1-9]\d{7,14}$/.test(compact)) return compact;
  if (/^0\d{9,10}$/.test(compact)) return '+84' + compact.slice(1);
  if (/^84\d{9,10}$/.test(compact)) return '+' + compact;
  throw new Error('Số điện thoại không hợp lệ');
}

const formulaLike = /^[=+\-@]/;
const normalizeName = (value: string) => value.normalize('NFC').trim().toLocaleLowerCase('vi');

/** Chuẩn hoá chuỗi tiêu đề cột: bỏ khoảng trắng thừa, hạ chữ thường, gộp gạch nối/dưới thành khoảng trắng */
function normalizeHeader(value: string): string {
  return value
    .normalize('NFC')
    .trim()
    .toLocaleLowerCase('vi')
    .replace(/[\s\-_]+/gu, ' ');
}

// Từ đồng nghĩa tiêu đề cho từng cột dữ liệu (hỗ trợ cả tiếng Việt có dấu, không dấu, snake_case và tiếng Anh)
const KEY_ALIASES = new Set([
  'ma',
  'mã',
  'ma khach',
  'mã khách',
  'ma khach moi',
  'mã khách mời',
  'id',
  'code',
  'guest id',
  'guest code',
  'stt',
]);

const NAME_ALIASES = new Set([
  'ho ten',
  'họ tên',
  'họ và tên',
  'ho va ten',
  'ten',
  'tên',
  'ten khach',
  'tên khách',
  'ten khach moi',
  'tên khách mời',
  'name',
  'full name',
  'guest name',
]);

const GROUP_ALIASES = new Set([
  'nhom',
  'nhóm',
  'nhom khach',
  'nhóm khách',
  'nhom khach moi',
  'nhóm khách mời',
  'group',
  'guest group',
  'group name',
]);

const PHONE_ALIASES = new Set([
  'so dien thoai',
  'số điện thoại',
  'sdt',
  'sđt',
  'dien thoai',
  'điện thoại',
  'phone',
  'phone number',
  'mobile',
  'tel',
]);

const NOTE_ALIASES = new Set([
  'ghi chu',
  'ghi chú',
  'chu thich',
  'chú thích',
  'note',
  'notes',
  'remark',
  'remarks',
  'comment',
]);

export function csvToImportRows(
  text: string,
  groups: readonly { guestGroupId: string; name: string; status: string }[],
): CsvParseResult {
  const records = parseCsv(text);
  const errors: { line: number; message: string }[] = [];
  const rows: ImportRow[] = [];
  if (records.length === 0) return { rows, errors: [{ line: 1, message: 'File trống.' }] };

  const headers = records[0]!.map(normalizeHeader);
  const findColumn = (aliases: Set<string>) =>
    headers.findIndex((header) => aliases.has(header));

  const keyCol = findColumn(KEY_ALIASES);
  const nameCol = findColumn(NAME_ALIASES);
  const groupCol = findColumn(GROUP_ALIASES);
  const phoneCol = findColumn(PHONE_ALIASES);
  const noteCol = findColumn(NOTE_ALIASES);

  if (keyCol === -1 || nameCol === -1 || groupCol === -1) {
    const missing: string[] = [];
    if (keyCol === -1) missing.push('ma');
    if (nameCol === -1) missing.push('ho_ten');
    if (groupCol === -1) missing.push('nhom');
    return {
      rows,
      errors: [
        {
          line: 1,
          message: `Thiếu cột bắt buộc: ${missing.join(', ')}.`,
        },
      ],
    };
  }

  if (records.length - 1 > 1000) {
    return { rows, errors: [{ line: 1, message: 'Mỗi lần import tối đa 1.000 dòng.' }] };
  }

  // Ánh xạ tên nhóm linh hoạt: lưu cả tên gốc và tên bản địa hoá tiếng Việt
  const groupByName = new Map<string, string>();
  for (const group of groups) {
    if (group.status === 'ACTIVE') {
      groupByName.set(normalizeName(group.name), group.guestGroupId);
      groupByName.set(normalizeName(groupLabel(group.name)), group.guestGroupId);
    }
  }

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

    const guestGroupId =
      groupByName.get(normalizeName(groupName)) ??
      groupByName.get(normalizeName(groupLabel(groupName)));

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
