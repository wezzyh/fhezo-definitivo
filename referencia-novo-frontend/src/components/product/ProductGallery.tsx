import { useState } from "react";

type Props = {
  images: string[];
  productName: string;
};

export default function ProductGallery({
  images,
  productName,
}: Props) {
  const [selectedImage, setSelectedImage] = useState(
    images[0]
  );

  return (
    <div
      className="
        grid
        gap-6
        md:grid-cols-[82px_minmax(0,1fr)]
      "
    >
      <div
        className="
          order-2 flex
          gap-3
          overflow-x-auto
          md:order-1
          md:flex-col
        "
      >
        {images.map((image) => (
          <button
            key={image}
            onClick={() => setSelectedImage(image)}
            className={`
              flex h-[78px] w-[78px]
              shrink-0
              items-center justify-center
              border
              bg-white
              p-2
              transition

              ${
                selectedImage === image
                  ? "border-fhezo-600"
                  : "border-ink-200 hover:border-ink-400"
              }
            `}
          >
            <img
              src={image}
              alt={productName}
              className="h-full w-full object-contain"
            />
          </button>
        ))}
      </div>

      <div
        className="
          order-1
          flex min-h-[500px]
          items-center justify-center
          bg-white
          p-6
          md:order-2
        "
      >
        <img
          src={selectedImage}
          alt={productName}
          className="
            max-h-[520px]
            max-w-full
            object-contain
          "
        />
      </div>
    </div>
  );
}