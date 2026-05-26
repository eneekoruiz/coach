export function createHandleCloseDayModalClose(setCloseDayFeedback: (v: any) => void) {
  return function handleCloseDayModalClose() {
    setCloseDayFeedback(null);
  };
}
