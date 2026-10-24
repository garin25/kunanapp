'use client';

import { useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  ImagePlus,
  LoaderCircle,
  Trash2,
} from 'lucide-react';
import { useRouter } from 'next/navigation';

import {
  deleteHeroSlide,
  reorderHeroSlides,
  saveHeroSlide,
} from '@/app/admin/hero-actions';
import type { HeroSlide } from '@/components/store-data';

const tones = [
  {
    value: 'from-[#d8b4a7] via-[#bc817c] to-[#684044]',
    label: 'Rosa',
  },
  {
    value: 'from-[#d9dfcf] via-[#aebd9b] to-[#657758]',
    label: 'Verde',
  },
  {
    value: 'from-[#eadba9] via-[#c7a45a] to-[#72531d]',
    label: 'Dorado',
  },
];

type Draft = {
  id: number | null;
  title: string;
  description: string;
  image: string;
  imagePublicId: string;
  tone: string;
};

function draftFromSlide(slide?: HeroSlide): Draft {
  return slide
    ? {
        id: slide.id,
        title: slide.title,
        description: slide.description,
        image: slide.image,
        imagePublicId: slide.imagePublicId,
        tone: slide.tone,
      }
    : {
        id: null,
        title: '',
        description: '',
        image: '',
        imagePublicId: '',
        tone: tones[0].value,
      };
}

export function HeroManager({ initialSlides }: { initialSlides: HeroSlide[] }) {
  const router = useRouter();
  const [slides, setSlides] = useState(initialSlides);
  const [draft, setDraft] = useState(() => draftFromSlide(initialSlides[0]));
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const uploadImage = async (file?: File) => {
    if (!file) return;
    setError('');
    setNotice('');
    setUploading(true);
    try {
      const body = new FormData();
      body.append('file', file);
      const response = await fetch('/api/admin/hero-upload', {
        method: 'POST',
        body,
      });
      const result: unknown = await response.json();
      if (!result || typeof result !== 'object')
        throw new Error(
          'No se recibió una respuesta válida al subir la imagen.'
        );
      const data = result as Record<string, unknown>;
      if (
        !response.ok ||
        typeof data.imageUrl !== 'string' ||
        typeof data.imagePublicId !== 'string'
      ) {
        throw new Error(
          typeof data.error === 'string'
            ? data.error
            : 'No se pudo subir la imagen a Cloudinary.'
        );
      }
      const imageUrl = data.imageUrl;
      const imagePublicId = data.imagePublicId;
      setDraft((current) => ({
        ...current,
        image: imageUrl,
        imagePublicId,
      }));
      setNotice('Imagen subida a Cloudinary. Guardá el slide para publicarlo.');
    } catch (uploadError) {
      setError(
        uploadError instanceof Error
          ? uploadError.message
          : 'No se pudo subir la imagen.'
      );
    } finally {
      setUploading(false);
    }
  };

  const save = async () => {
    setSaving(true);
    setError('');
    setNotice('');
    try {
      const result = await saveHeroSlide({
        id: draft.id,
        title: draft.title,
        description: draft.description,
        imageUrl: draft.image,
        imagePublicId: draft.imagePublicId,
        tone: draft.tone,
      });
      if (!result.success || typeof result.slideId !== 'number')
        throw new Error(result.error ?? 'No se pudo guardar el slide.');
      const updatedDraft = { ...draft, id: result.slideId };
      setDraft(updatedDraft);
      setSlides((current) => {
        const savedSlide: HeroSlide = {
          ...updatedDraft,
          id: result.slideId,
          sortOrder:
            current.find((slide) => slide.id === result.slideId)?.sortOrder ??
            current.length,
        };
        const existingIndex = current.findIndex(
          (slide) => slide.id === result.slideId
        );
        if (existingIndex < 0) return [...current, savedSlide];
        return current.map((slide) =>
          slide.id === result.slideId ? savedSlide : slide
        );
      });
      setNotice(result.warning ?? 'Slide guardado y publicado.');
      router.refresh();
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : 'No se pudo guardar el slide.'
      );
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (draft.id === null) {
      setDraft(draftFromSlide(slides[0]));
      return;
    }
    setDeleting(true);
    setError('');
    setNotice('');
    try {
      const result = await deleteHeroSlide(draft.id);
      if (result.error) throw new Error(result.error);
      const nextSlides = slides.filter((slide) => slide.id !== draft.id);
      setSlides(nextSlides);
      setDraft(draftFromSlide(nextSlides[0]));
      setNotice(result.warning ?? 'Slide e imagen eliminados.');
      router.refresh();
    } catch (deleteError) {
      setError(
        deleteError instanceof Error
          ? deleteError.message
          : 'No se pudo eliminar el slide.'
      );
    } finally {
      setDeleting(false);
    }
  };

  const move = async (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= slides.length) return;
    const reordered = [...slides];
    [reordered[index], reordered[target]] = [reordered[target], reordered[index]];
    setSlides(reordered);
    setError('');
    const result = await reorderHeroSlides(reordered.map((slide) => slide.id));
    if (result.error) {
      setSlides(slides);
      setError(result.error);
    } else {
      router.refresh();
    }
  };

  return (
    <section className="rounded-2xl border border-[#e9e0d4] bg-[#fffdf9] p-4 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="font-serif text-2xl text-[#262320]">
            Editar carrusel hero
          </h2>
          <p className="mt-1 max-w-xl text-xs leading-5 text-[#81786f]">
            Las imágenes se suben a Cloudinary. Guardá cada slide para que el
            cambio aparezca en la tienda.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setDraft(draftFromSlide())}
          className="inline-flex items-center gap-2 rounded-full border border-[#c9ae73] px-4 py-2.5 text-xs font-medium text-[#725d32] hover:bg-[#fcf8f1]"
        >
          <ImagePlus className="size-4" />
          Agregar slide
        </button>
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(280px,0.8fr)]">
        <div className="grid content-start grid-cols-2 gap-3 sm:grid-cols-3">
          {slides.map((slide, index) => (
            <div
              key={slide.id}
              className={`relative overflow-hidden rounded-xl border-2 ${draft.id === slide.id ? 'border-[#a88b4c]' : 'border-transparent'}`}
            >
              <button
                type="button"
                onClick={() => {
                  setDraft(draftFromSlide(slide));
                  setError('');
                  setNotice('');
                }}
                className="block w-full text-left"
              >
                <img
                  src={slide.image}
                  alt={`Slide ${index + 1}: ${slide.title}`}
                  className="aspect-[4/3] w-full object-cover"
                />
                <span className="block truncate px-2 py-2 text-xs font-medium text-[#262320]">
                  {index + 1}. {slide.title}
                </span>
              </button>
              <div className="absolute right-1 top-1 flex gap-1">
                <button
                  type="button"
                  aria-label={`Mover slide ${index + 1} hacia arriba`}
                  disabled={index === 0}
                  onClick={() => void move(index, -1)}
                  className="rounded-full bg-white/90 p-1.5 text-[#262320] disabled:opacity-40"
                >
                  <ArrowUp className="size-3" />
                </button>
                <button
                  type="button"
                  aria-label={`Mover slide ${index + 1} hacia abajo`}
                  disabled={index === slides.length - 1}
                  onClick={() => void move(index, 1)}
                  className="rounded-full bg-white/90 p-1.5 text-[#262320] disabled:opacity-40"
                >
                  <ArrowDown className="size-3" />
                </button>
              </div>
            </div>
          ))}
          {!slides.length && (
            <p className="col-span-full rounded-xl bg-[#fcf8f1] p-4 text-sm text-[#81786f]">
              Todavía no hay slides guardados. Agregá el primero para comenzar.
            </p>
          )}
        </div>

        <div className="space-y-4 rounded-xl bg-[#fcf8f1] p-4">
          <div className={`relative aspect-[16/9] overflow-hidden rounded-lg bg-gradient-to-br ${draft.tone}`}>
            {draft.image ? (
              <img
                src={draft.image}
                alt="Vista previa del slide"
                className="size-full object-cover"
              />
            ) : (
              <div className="flex size-full items-center justify-center text-sm text-[#81786f]">
                Subí una imagen para ver la vista previa
              </div>
            )}
            {uploading && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/40 text-white">
                <LoaderCircle className="size-6 animate-spin" />
              </div>
            )}
          </div>
          <label className="block text-xs font-medium text-[#625b54]">
            Título
            <input
              maxLength={120}
              value={draft.title}
              onChange={(event) =>
                setDraft({ ...draft, title: event.target.value })
              }
              className="mt-1.5 w-full rounded-lg border border-[#e1d8cb] bg-white px-3 py-2.5 text-sm text-[#262320] outline-none focus:border-[#a88b4c]"
            />
          </label>
          <label className="block text-xs font-medium text-[#625b54]">
            Descripción
            <textarea
              maxLength={500}
              rows={3}
              value={draft.description}
              onChange={(event) =>
                setDraft({ ...draft, description: event.target.value })
              }
              className="mt-1.5 w-full resize-y rounded-lg border border-[#e1d8cb] bg-white px-3 py-2.5 text-sm text-[#262320] outline-none focus:border-[#a88b4c]"
            />
          </label>
          <label className="block text-xs font-medium text-[#625b54]">
            Tono de fondo
            <select
              value={draft.tone}
              onChange={(event) =>
                setDraft({ ...draft, tone: event.target.value })
              }
              className="mt-1.5 w-full rounded-lg border border-[#e1d8cb] bg-white px-3 py-2.5 text-sm text-[#262320]"
            >
              {tones.map((tone) => (
                <option key={tone.value} value={tone.value}>
                  {tone.label}
                </option>
              ))}
            </select>
          </label>
          <label className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-[#c9ae73] bg-white px-3 py-3 text-xs font-medium text-[#725d32]">
            {uploading ? (
              <LoaderCircle className="size-4 animate-spin" />
            ) : (
              <ImagePlus className="size-4" />
            )}
            {draft.image ? 'Cambiar imagen' : 'Subir imagen a Cloudinary'}
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,image/avif"
              disabled={uploading}
              onChange={(event) => {
                void uploadImage(event.target.files?.[0]);
                event.currentTarget.value = '';
              }}
              className="sr-only"
            />
          </label>
          <p className="text-[11px] leading-4 text-[#81786f]">
            JPG, PNG, WebP o AVIF. Tamaño máximo: 10 MB.
          </p>
          {error && (
            <p role="alert" className="text-sm text-[#a33a32]">
              {error}
            </p>
          )}
          {notice && (
            <p role="status" className="text-sm text-[#3d704a]">
              {notice}
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={saving || uploading}
              onClick={() => void save()}
              className="flex-1 rounded-full bg-[#262320] px-4 py-3 text-xs font-medium text-white disabled:opacity-50"
            >
              {saving ? 'Guardando…' : 'Guardar slide'}
            </button>
            <button
              type="button"
              disabled={deleting || saving || uploading || (!draft.id && !draft.title && !draft.image)}
              onClick={() => void remove()}
              aria-label={draft.id ? 'Eliminar slide' : 'Cancelar slide nuevo'}
              className="rounded-full border border-[#e0c9c3] p-3 text-[#a33a32] disabled:opacity-40"
            >
              {deleting ? (
                <LoaderCircle className="size-4 animate-spin" />
              ) : (
                <Trash2 className="size-4" />
              )}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
