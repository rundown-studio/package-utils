import {describe, it, expect} from 'vitest';
import {getResizedImageURL} from '../src/getResizedImageURL';

describe("getResizedImageURL", () => {
  it("Simple case with real image", () => {
    const resizedURL = getResizedImageURL('https://storage.googleapis.com/rundown-app-x.appspot.com/rundown-assets%2FAAAA%2Ffilename.jpg');
    expect(resizedURL).to.equal('https://storage.googleapis.com/rundown-app-x.appspot.com/rundown-assets%2FAAAA%2Fsmall%2Ffilename_500x500.webp');
  });

  it("SVG files should return original URL (no resized version)", () => {
    const originalURL = 'https://storage.googleapis.com/rundown-app-641e0.appspot.com/rundown-assets%2FzCWm4glNZH1S362eXLXR%2F1758528491657_sticker-2.svg';
    const resizedURL = getResizedImageURL(originalURL);
    expect(resizedURL).to.equal(originalURL);
  });
});
