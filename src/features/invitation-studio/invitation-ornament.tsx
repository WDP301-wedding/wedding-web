import type { InvitationDecoration } from './invitation-presentation';
import styles from './invitation-ornament.module.css';

const motifs: Record<InvitationDecoration['coverMotif'], string> = {
  peony:
    'M50 77C11 72 5 38 26 38C8 14 36 8 45 29C45 6 71 6 70 33C88 17 101 46 79 54C98 65 72 85 50 77ZM50 77C29 66 24 53 38 49C38 36 63 35 65 49C82 56 66 72 50 77ZM50 77Q38 91 19 90M50 77Q64 93 86 87',
  lotus:
    'M50 80Q21 75 10 47Q31 44 50 80Q29 40 50 16Q71 40 50 80Q69 44 90 47Q79 75 50 80ZM50 80Q32 92 11 79M50 80Q68 92 89 79',
  botanical:
    'M18 88Q35 53 82 13M30 70Q12 62 18 43Q38 49 30 70ZM41 55Q60 60 73 42Q53 35 41 55ZM55 40Q35 34 39 16Q58 21 55 40ZM68 26Q86 33 91 11Q72 8 68 26Z',
  'art-deco':
    'M10 89L50 11L90 89ZM24 89L50 34L76 89ZM39 89L50 61L61 89ZM10 75V35H30M90 75V35H70M20 89H80',
  celestial:
    'M62 14A36 36 0 1 0 86 67A38 38 0 0 1 62 14ZM75 24V46M64 35H86M34 61V77M26 69H42M91 14V23M86 18H96',
  orchid:
    'M50 54C11 52 10 25 31 29Q37 30 45 44Q28 7 50 11Q72 7 55 44Q63 30 69 29C90 25 89 52 50 54ZM50 54C25 55 32 81 50 73C68 81 75 55 50 54ZM50 73Q44 91 24 94M50 73Q57 92 81 94',
  cloud:
    'M7 64Q16 48 30 55Q32 36 47 37Q60 35 64 49Q79 38 91 57Q98 69 81 70H24M13 78H86M30 87H69M24 30Q37 17 49 25Q61 13 75 27',
  ginkgo:
    'M49 77Q14 65 9 33Q21 32 29 40Q28 17 48 13Q52 24 53 35Q67 12 83 24Q80 41 91 37Q85 62 49 77ZM49 77L28 44M49 77L48 26M49 77L73 37M49 77Q43 89 31 94',
};

export function InvitationOrnament({
  decoration,
  face,
}: Readonly<{ decoration: InvitationDecoration; face: 'cover' | 'inside' }>) {
  const motif = face === 'cover' ? decoration.coverMotif : decoration.insideMotif;
  const composition = face === 'cover' ? decoration.coverComposition : decoration.insideComposition;
  const density = face === 'cover' ? decoration.coverDensity : decoration.insideDensity;
  return (
    <div
      className={styles.ornament}
      data-composition={composition ?? 'diagonal'}
      data-density={density ?? 'subtle'}
      data-frame={decoration.frame}
      data-finish={decoration.finish}
      aria-hidden="true"
    >
      <svg viewBox="0 0 100 100">
        <path d={motifs[motif]} />
      </svg>
      <svg viewBox="0 0 100 100">
        <path d={motifs[motif]} />
      </svg>
    </div>
  );
}
