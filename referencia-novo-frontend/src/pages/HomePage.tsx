import BenefitsStrip from "../components/home/BenefitsStrip";
import CategoriesStrip from "../components/home/CategoriesStrip";
import HeroBanner from "../components/home/HeroBanner";
import ProductCard from "../components/product/ProductCard";
import { products } from "../data/products";

export default function HomePage() {
  return (
    <>
      <HeroBanner />

      <BenefitsStrip />

      <CategoriesStrip />

      <main className="py-12">
        <div className="fhezo-container">
          <div
            className="
              mb-7
                relative
                text-center
              border-b border-ink-200
              pb-4
            "
          >
              <div>
              <h1
                className="
                  font-display
                  text-[29px]
                  font-semibold
                  leading-tight
                  text-ink-900
                "
              >
                Produtos em destaque
              </h1>

              <span
                className="
                  mt-2 block
                  font-display
                  text-xs
                  font-semibold
                  uppercase
                  tracking-[.16em]
                  text-fhezo-600
                "
              >
                Seleção Fhezo
              </span>
            </div>

            <a
              href="#"
              className="
                hidden
                absolute right-0 top-1/2
                -translate-y-1/2
                text-sm
                font-semibold
                text-fhezo-700
                underline
                md:block
              "
            >
              Ver todos os produtos
            </a>
          </div>

          <div
            className="
              grid
              grid-cols-1
              gap-4
              sm:grid-cols-2
              lg:grid-cols-4
              xl:grid-cols-5
            "
          >
            {products.slice(0, 5).map((product) => (
              <ProductCard
                key={product.id}
                product={product}
              />
            ))}
          </div>
        </div>
      </main>
    </>
  );
}