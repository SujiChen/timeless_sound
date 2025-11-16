// popupStack.js
let topZIndex = 1000; // starting z-index for popups
export function getNextZIndex() {
  topZIndex += 1;
  return topZIndex;
}
