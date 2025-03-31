// The suffix for resized images, automatically set by the Firebase Extension
// based on the configured image size in the Firebase console.
const RESIZE_SUFFIX = '_500x500.webp'

/**
 * Generates a resized image URL by modifying the original image path.
 *
 * This function extracts the filename and rundown ID from the given URL and modifies
 * the image path to insert a "small" directory after the rundown ID while appending
 * the configured resize suffix.
 *
 * This structure follows our Firebase Storage bucket file organization:
 * - Originals are stored in: `rundown-assets/[rundownId]/[filename].jpeg`
 * - Resized versions are stored in: `rundown-assets/[rundownId]/small/[filename]_500x500.webp`
 *
 * This logic aligns with the Firebase Extensions for image resizing:
 * https://extensions.dev/extensions/firebase/storage-resize-images
 * You can check the configuration options in the Firebase console.
 *
 * @param {string} originalSrc - The original image URL.
 * @returns {string} - The modified URL pointing to the resized image.
 */
export function getResizedImageURL (originalSrc: string): string {
  try {
    const url = new URL(originalSrc)

    // Split the pathname by '%2F' which represents '/' in Firebase Storage encoded URLs
    const parts: string[] = url.pathname.split('%2F')

    // Extract the filename (e.g., "filename.jpg")
    const filename: string | undefined = parts.pop()

    // Extract the rundown ID directory
    const rundownId: string | undefined = parts.pop()

    // Ensure valid values before proceeding
    if (!filename || !rundownId) {
      throw new Error('Invalid URL format')
    }

    // Modify the filename to append the resize suffix instead of its original extension
    const newFilename: string = filename.replace(/\.\w+$/, RESIZE_SUFFIX)

    // Construct the new path inserting "small" after rundown ID
    const newPath: string = [...parts, rundownId, 'small', newFilename].join('%2F')

    // Construct and return the final URL pointing to the resized image
    return `${url.origin}${newPath}`
  } catch (error) {
    console.error('Error resizing image URL:', error)
    return originalSrc
  }
}
