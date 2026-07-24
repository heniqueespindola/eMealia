export interface OpenFoodFactsProduct {
  nome:      string;
  categoria: string | null;
}

export async function getProductByBarcode(barcode: string): Promise<OpenFoodFactsProduct | null> {
  const response = await fetch(`https://world.openfoodfacts.org/api/v2/product/${barcode}.json`);
  if (!response.ok) return null;
  const data = await response.json();
  if (data.status !== 1 || !data.product) return null;
  return {
    nome:      data.product.product_name_pt || data.product.product_name || barcode,
    categoria: data.product.categories?.split(',')[0]?.trim() ?? null,
  };
}
