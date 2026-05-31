export function createHandleCloseDayModalClose(setCloseDayFeedback: (v: null) => void) {
  return function handleCloseDayModalClose() {
    setCloseDayFeedback(null);
  };
}
