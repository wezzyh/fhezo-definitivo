export default function HeroBanner() {
  return (
    <section className="w-full bg-ink-950">
      <div
        className="
          relative
          h-[200px]
          overflow-hidden
          sm:h-[250px]
          md:h-[290px]
          lg:h-[330px]
          xl:h-[360px]
        "
      >
        <img
          src="/assets/banner/banner-motoboy.webp"
          alt="Entrega por motoboy Fhezo Industrial"
          className="
            h-full w-full
            object-cover
            object-center
          "
        />
      </div>
    </section>
  );
}