// Turning a student's drawing into a picture small enough to send. The server accepts up to 300,000
// characters; a 640 x 400 drawing is far smaller than that, but a busy one with a retina screen could
// not be, so we step the quality (then the size) down until it fits.
export const MAX_IMAGE_CHARS = 280_000; // a little under the server's limit, to be safe

/**
 * `render(scale, quality)` must return a JPEG data URL of the drawing at that scale. Returns the first one
 * that fits, or null if even the smallest does not.
 */
export function fitImage(render, limit = MAX_IMAGE_CHARS) {
  for (const scale of [1, 0.75, 0.5]) {
    for (const quality of [0.8, 0.65, 0.5, 0.35]) {
      const url = render(scale, quality);
      if (typeof url === "string" && url.length <= limit) return url;
    }
  }
  return null;
}
