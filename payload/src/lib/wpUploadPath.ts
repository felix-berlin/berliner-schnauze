/** Old WordPress URL -> path below wp-content/uploads: query/hash stripped, percent-decoded. */
export function wpUploadPath(url: string): string {
  const marker = "/wp-content/uploads/";
  const i = url.indexOf(marker);
  const rest = i === -1 ? url : url.slice(i + marker.length);
  const clean = rest.split(/[?#]/)[0];
  try {
    return decodeURIComponent(clean);
  } catch {
    return clean;
  }
}
