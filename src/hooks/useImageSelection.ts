import { useRef, useState } from 'react';
import toast from '@/lib/toast';

type SelectedImage = {
  previewUrl: string;
  base64: string;
  mimeType: string;
  fileName: string;
};

function stripDataUrlPrefix(value: string) {
  const commaIndex = value.indexOf(',');
  return commaIndex >= 0 ? value.slice(commaIndex + 1) : value;
}

export function useImageSelection() {
  const [selectedImage, setSelectedImage] = useState<SelectedImage | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const allowedImageTypes = ['image/jpeg', 'image/png', 'image/webp'];
  const maxImageBytes = 5 * 1024 * 1024;

  function handleImageButtonClick() {
    fileInputRef.current?.click();
  }

  function handleImageSelect(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0];
    if (!file) return;
    if (!allowedImageTypes.includes(file.type)) {
      toast.error('Formato no permitido. Usa JPG, PNG o WEBP.');
      setSelectedImage(null);
      event.currentTarget.value = '';
      return;
    }

    if (file.size > maxImageBytes) {
      toast.error('La imagen supera 5MB. Elige una más ligera.');
      setSelectedImage(null);
      event.currentTarget.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onerror = () => {
      toast.error('No se pudo leer la imagen. Intenta con otro archivo.');
      setSelectedImage(null);
      event.currentTarget.value = '';
    };
    reader.onload = () => {
      const result = typeof reader.result === 'string' ? reader.result : '';
      if (!result) {
        toast.error('No se pudo procesar la imagen seleccionada.');
        setSelectedImage(null);
        return;
      }
      setSelectedImage({
        previewUrl: result,
        base64: stripDataUrlPrefix(result),
        mimeType: file.type,
        fileName: file.name,
      });
    };
    reader.readAsDataURL(file);
    event.currentTarget.value = '';
  }

  function clearSelectedImage() {
    setSelectedImage(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  return {
    selectedImage,
    fileInputRef,
    handleImageButtonClick,
    handleImageSelect,
    clearSelectedImage,
  };
}
