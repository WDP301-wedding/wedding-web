/** BE tạo 4 nhóm mặc định bằng tên tiếng Anh (GST-004); giao diện luôn hiện tên tiếng Việt. */
const defaultGroupLabels: Record<string, string> = {
  Parents: 'Bố mẹ hai bên',
  'Groom Side': 'Nhà trai',
  'Bride Side': 'Nhà gái',
  Friends: 'Bạn bè',
};

export const groupLabel = (name: string) => defaultGroupLabels[name] ?? name;

export const localizeGroup = <T extends { name: string }>(group: T): T => ({
  ...group,
  name: groupLabel(group.name),
});
