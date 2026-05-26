import { useRef, useState } from 'react';

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

  function handleImageButtonClick() {
    fileInputRef.current?.click();
  }

  function handleImageSelect(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0];
    if (!file) return;
    if (!allowedImageTypes.includes(file.type)) {
      event.currentTarget.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === 'string' ? reader.result : '';
      if (!result) return;
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
