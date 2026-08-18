import { PageHeader } from '@/components/hints/page-header'
import { ProductsManager } from '@/components/products/products-manager'
import { getDataset } from '@/lib/data'
import { pageHints } from '@/lib/hints'

export default async function ProductsPage() {
  const data = await getDataset()

  return (
    <>
      <PageHeader title="المنتجات" hint={pageHints.products} />
      <ProductsManager products={data.products} />
    </>
  )
}
