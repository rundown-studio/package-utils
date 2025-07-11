import {describe, it, expect} from 'vitest';
import {getResizedImageURL} from '../src/getResizedImageURL';

describe("getResizedImageURL", () => {
  it("Simple case with real image", () => {
    const resizedURL = getResizedImageURL('https://storage.googleapis.com/rundown-app-x.appspot.com/rundown-assets%2FAAAA%2Ffilename.jpg');
    expect(resizedURL).to.equal('https://storage.googleapis.com/rundown-app-x.appspot.com/rundown-assets%2FAAAA%2Fsmall%2Ffilename_500x500.webp');
  });
});
