const AVATAR_IMAGE_SUFFIX = '-avatar.jpg';
const INSET_IMAGE_SUFFIX = '-inset.jpg';
const MAIN_IMAGE_SUFFIX = '-main-raw.png';

/**
 * @description Derive inset render URL from stored character avatar URL.
 * Render variants share one base path and differ only by suffix.
 * @param avatarImage {string | null | undefined}
 */
export const toInsetImage = (avatarImage?: string | null): string | undefined => {
  if (!avatarImage?.endsWith(AVATAR_IMAGE_SUFFIX)) return undefined;
  return `${avatarImage.slice(0, -AVATAR_IMAGE_SUFFIX.length)}${INSET_IMAGE_SUFFIX}`;
};

/**
 * @description Derive main render URL from stored character avatar URL.
 * Render variants share one base path and differ only by suffix.
 * @param avatarImage {string | null | undefined}
 */
export const toMainImage = (avatarImage?: string | null): string | undefined => {
  if (!avatarImage?.endsWith(AVATAR_IMAGE_SUFFIX)) return undefined;
  return `${avatarImage.slice(0, -AVATAR_IMAGE_SUFFIX.length)}${MAIN_IMAGE_SUFFIX}`;
};
