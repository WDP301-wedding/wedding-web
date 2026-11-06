import styles from './invitation-family.module.css';

export const parentNameGroups = [
  {
    label: 'Nhà trai',
    fields: [
      { key: 'groomFatherName', label: 'Tên cha chú rể' },
      { key: 'groomMotherName', label: 'Tên mẹ chú rể' },
    ],
  },
  {
    label: 'Nhà gái',
    fields: [
      { key: 'brideFatherName', label: 'Tên cha cô dâu' },
      { key: 'brideMotherName', label: 'Tên mẹ cô dâu' },
    ],
  },
] as const;

type ParentNameKey = (typeof parentNameGroups)[number]['fields'][number]['key'];
export type InvitationParentNames = Partial<Record<ParentNameKey, string | null>>;
export function readParentNames(text?: InvitationParentNames) {
  return {
    groomFatherName: text?.groomFatherName ?? '',
    groomMotherName: text?.groomMotherName ?? '',
    brideFatherName: text?.brideFatherName ?? '',
    brideMotherName: text?.brideMotherName ?? '',
  };
}

export function InvitationFamily({ names }: Readonly<{ names: InvitationParentNames }>) {
  const families = parentNameGroups.flatMap(({ label, fields }) => {
    const entries = fields.flatMap(({ key }) => {
      const name = names[key]?.trim();
      return name ? [{ key, name }] : [];
    });
    return entries.length ? [{ label, entries }] : [];
  });
  if (!families.length) return null;
  return (
    <div className={styles.families} aria-label="Thông tin gia đình">
      {families.map(({ label, entries }) => (
        <dl key={label} className={styles.family}>
          <dt>{label}</dt>
          {entries.map(({ key, name }) => (
            <dd key={key}>{name}</dd>
          ))}
        </dl>
      ))}
    </div>
  );
}
