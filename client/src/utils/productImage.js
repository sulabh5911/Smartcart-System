const DEFAULT_PRODUCT_IMAGE_ID = 'photo-1542838132-92c53300491e';

export function getProductImage(image) {
  if (typeof image !== 'string') return '';

  const trimmedImage = image.trim();
  return trimmedImage && !trimmedImage.includes(DEFAULT_PRODUCT_IMAGE_ID) ? trimmedImage : '';
}
