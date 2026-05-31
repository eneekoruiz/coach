type ToastType = 'success' | 'error';

type ToastDetail = {
  id: number;
  type: ToastType;
  message: string;
};

const TOAST_EVENT_NAME = 'app-toast';

function emitToast(type: ToastType, message: string) {
  if (typeof window === 'undefined') return;

  const detail: ToastDetail = {
    id: Date.now() + Math.floor(Math.random() * 1000),
    type,
    message,
  };

  window.dispatchEvent(new CustomEvent<ToastDetail>(TOAST_EVENT_NAME, { detail }));
}

const toast = {
  success(message: string) {
    emitToast('success', message);
  },
  error(message: string) {
    emitToast('error', message);
  },
};

export type { ToastDetail, ToastType };
export { TOAST_EVENT_NAME };
export default toast;
