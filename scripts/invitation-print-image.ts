import { createElement, type ComponentProps } from 'react';

/** The offline server bundle embeds validated retained PNGs, without Next's image service. */
export default function RetainedImage({
  unoptimized: _unoptimized,
  ...props
}: ComponentProps<'img'> & { unoptimized?: boolean }) {
  void _unoptimized;
  return createElement('img', props);
}
