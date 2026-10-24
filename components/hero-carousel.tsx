import type { PointerEvent } from 'react';
import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { heroSlides as defaultHeroSlides, type HeroSlide } from './store-data';

export function HeroCarousel({
  onProducts,
  slides,
}: {
  onProducts: () => void;
  slides: HeroSlide[];
}) {
  const [active, setActive] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef<number | null>(null);
  const dragStarted = useRef(false);
  const heroSlides = slides.length
    ? slides
    : defaultHeroSlides.map((slide, index) => ({
        ...slide,
        id: index + 1,
        imagePublicId: '',
        sortOrder: index,
      }));

  useEffect(() => {
    setActive((current) => Math.min(current, heroSlides.length - 1));
  }, [heroSlides.length]);

  useEffect(() => {
    const timer = window.setInterval(
      () => setActive((current) => (current + 1) % heroSlides.length),
      5500
    );
    return () => window.clearInterval(timer);
  }, [heroSlides.length]);
  const changeSlide = (direction: number) =>
    setActive(
      (current) => (current + direction + heroSlides.length) % heroSlides.length
    );
  const handlePointerDown = (event: PointerEvent<HTMLElement>) => {
    if (
      event.button !== 0 ||
      (event.target instanceof Element && event.target.closest('button'))
    )
      return;
    dragStart.current = event.clientX;
    dragStarted.current = false;
  };
  const handlePointerMove = (event: PointerEvent<HTMLElement>) => {
    if (
      dragStart.current === null ||
      dragStarted.current ||
      Math.abs(event.clientX - dragStart.current) < 8
    )
      return;
    dragStarted.current = true;
    setIsDragging(true);
    event.currentTarget.setPointerCapture(event.pointerId);
  };
  const handlePointerUp = (event: PointerEvent<HTMLElement>) => {
    if (
      dragStart.current !== null &&
      Math.abs(event.clientX - dragStart.current) > 45
    )
      changeSlide(event.clientX < dragStart.current ? 1 : -1);
    dragStart.current = null;
    dragStarted.current = false;
    setIsDragging(false);
  };
  const cancelDrag = () => {
    dragStart.current = null;
    dragStarted.current = false;
    setIsDragging(false);
  };
  const slide = heroSlides[active] ?? heroSlides[0];
  return (
    <section
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={cancelDrag}
      className={`relative h-[calc(100svh-107px)] min-h-0 w-full overflow-hidden ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
    >
      <div
        key={slide.title}
        className={`relative h-full min-h-0 overflow-hidden bg-gradient-to-br ${slide.tone} transition-all duration-700`}
      >
        <Image
          src={slide.image}
          alt=""
          fill
          priority={active === 0}
          sizes="100vw"
          draggable={false}
          className="select-none object-cover opacity-75 mix-blend-multiply transition-transform duration-700"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black/35 via-transparent to-black/10" />
        <button
          type="button"
          aria-label="Anterior"
          onClick={() => changeSlide(-1)}
          className="absolute left-1 top-1/2 z-20 flex size-6 -translate-y-1/2 items-center justify-center text-white/80 transition hover:text-white sm:left-3 lg:left-5"
        >
          <ChevronLeft />
        </button>
        <button
          type="button"
          aria-label="Siguiente"
          onClick={() => changeSlide(1)}
          className="absolute right-1 top-1/2 z-20 flex size-6 -translate-y-1/2 items-center justify-center text-white/80 transition hover:text-white sm:right-3 lg:right-5"
        >
          <ChevronRight />
        </button>
        <div className="relative z-10 mx-auto flex h-full max-w-[1320px] items-end px-6 pb-20 sm:px-10 sm:pb-24 lg:items-start lg:pt-[6vh] lg:pb-0">
          <div className="max-w-md text-[#fffaf3]">
            <p className="mb-4 text-[10px] tracking-[0.28em] uppercase">
              Kunan · belleza & accesorios
            </p>
            <h1 className="font-serif text-4xl leading-[0.98] sm:text-6xl lg:text-7xl">
              {slide.title}
            </h1>
            <p className="mt-5 max-w-xs text-sm leading-6 text-white/80">
              {slide.description}
            </p>
            <button
              onClick={onProducts}
              className="mt-7 inline-flex whitespace-nowrap border border-white/70 px-5 py-3 text-[10px] tracking-[0.18em] uppercase transition hover:bg-white hover:text-[#262320]"
            >
              Ver productos
            </button>
          </div>
        </div>
        <div className="absolute bottom-5 right-6 z-10 flex items-center gap-2 sm:right-10">
          <span className="mr-2 text-[10px] tracking-[0.18em] text-white/75">
            0{active + 1} / 0{heroSlides.length}
          </span>
          {heroSlides.map((item, index) => (
            <button
              type="button"
              key={item.id}
              aria-label={`Ir al destacado ${index + 1}`}
              onClick={() => setActive(index)}
              className={`h-1 ${index === active ? 'w-10 bg-white' : 'w-5 bg-white/45'}`}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
