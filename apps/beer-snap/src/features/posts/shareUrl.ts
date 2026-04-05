export const DEFAULT_SITE_URL = "https://beer.rawert.xyz";

export const normalizeSiteUrl = (value: string) => value.replace(/\/+$/, "");

export const getPostSharePath = (postId: string) => `/share/p/${postId}`;

export const getPostShareUrlForSite = (
  siteUrl: string,
  postId: string
) => `${normalizeSiteUrl(siteUrl)}${getPostSharePath(postId)}`;
