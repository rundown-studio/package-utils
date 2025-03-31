import { expect } from "chai";
import { getResizedImageURL } from '../dist/esm/index.js';

describe("getResizedImageURL", () => {
  it("Simple case with real image", () => {
    const resizedURL = getResizedImageURL('https://storage.googleapis.com/rundown-app-x.appspot.com/rundown-assets%2FAAAA%2Ffilename.jpg');
    expect(resizedURL).to.equal('https://storage.googleapis.com/rundown-app-x.appspot.com/rundown-assets%2FAAAA%2Fsmall%2Ffilename_500x500.webp');
  });
});
