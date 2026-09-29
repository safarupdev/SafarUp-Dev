/**
 * Destination create / edit — DESTINATION.domain.contract.md §2.
 *
 * The editor is **structured by contract field**, never one giant text field
 * (PRD §199, contract §7). Each section maps to a group in the field table:
 *
 *   Identity          name, slug                                        (§2, §3)
 *   District & links  districtId, categoryIds[], placeIds[]             (§4, §5, §6)
 *   Summary           shortDescription                                  (§7)
 *   Overview          description                                       (§8)
 *   Highlights        highlights[]                                      (§13)
 *   Travel info       travelInformation{}                               (§14)
 *   Media             heroImage, gallery[], ogImage                     (§9, §10, §19)
 *   SEO               seoTitle, metaDescription, canonicalUrl           (§16–§18)
 *   Lifecycle         status, featured — NOT form fields (§11, §12)
 *
 * `thingsToDo` (§15) is intentionally absent: its structure is an open
 * decision (PRD §200.8) and the backend does not accept it, so building a
 * control for it would freeze an unapproved schema.
 *
 * N:M relationship handling: `categoryIds` and `placeIds` are plain arrays of
 * canonical IDs, edited with check-box multi-selects. Nothing is denormalised
 * into the destination — renaming a Category or Place must not rewrite this
 * record (CATEGORY §5, PLACE §1).
 */

import { useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useNavigate, useParams } from 'react-router-dom';

import { CONTENT_ENTITIES, createDestination, updateDestination } from '../../api/content.api';
import { destinationFormSchema } from '../../validators/content.schema';
import {
  useCategoryOptions,
  useContentDetail,
  useDistrictOptions,
  usePlaceOptions,
} from '../../hooks/useContentQueries';
import { applyServerFieldErrors, applySlugConflict, formErrorMessage } from '../../lib/formErrors';
import { getErrorMessage } from '../../lib/apiClient';
import PageHeader from '../../components/common/PageHeader';
import FormSection from '../../components/content/FormSection';
import MultiSelect from '../../components/content/MultiSelect';
import StringListEditor from '../../components/content/StringListEditor';
import LifecyclePanel from '../../components/content/LifecyclePanel';
import ContentRoleNotice from '../../components/content/ContentRoleNotice';
import ErrorState from '../../components/common/ErrorState';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import FormField from '../../components/ui/FormField';

const EMPTY_TRAVEL = {
  bestTimeToVisit: '',
  howToReach: '',
  nearestRailway: '',
  nearestAirport: '',
  localLanguage: '',
};

const EMPTY = {
  name: '',
  slug: '',
  districtId: '',
  categoryIds: [],
  placeIds: [],
  shortDescription: '',
  description: '',
  heroImage: '',
  gallery: [''],
  highlights: [''],
  travelInformation: { ...EMPTY_TRAVEL },
  seoTitle: '',
  metaDescription: '',
  canonicalUrl: '',
  ogImage: '',
};

export default function DestinationFormPage() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const [serverError, setServerError] = useState(null);

  const detail = useContentDetail({ entity: CONTENT_ENTITIES.destinations, id, enabled: isEdit });
  const districts = useDistrictOptions();
  const categories = useCategoryOptions();
  const places = usePlaceOptions();

  const {
    register,
    handleSubmit,
    reset,
    setError,
    control,
    formState: { errors, isSubmitting, isDirty },
  } = useForm({
    resolver: zodResolver(destinationFormSchema),
    defaultValues: EMPTY,
  });

  useEffect(() => {
    if (!detail.data) return;
    const destination = detail.data;
    reset({
      name: destination.name ?? '',
      slug: destination.slug ?? '',
      districtId: destination.districtId ?? '',
      categoryIds: destination.categoryIds ?? [],
      placeIds: destination.placeIds ?? [],
      shortDescription: destination.shortDescription ?? '',
      description: destination.description ?? '',
      heroImage: destination.heroImage ?? '',
      gallery: destination.gallery?.length ? destination.gallery : [''],
      highlights: destination.highlights?.length ? destination.highlights : [''],
      travelInformation: { ...EMPTY_TRAVEL, ...(destination.travelInformation ?? {}) },
      seoTitle: destination.seoTitle ?? '',
      metaDescription: destination.metaDescription ?? '',
      canonicalUrl: destination.canonicalUrl ?? '',
      ogImage: destination.ogImage ?? '',
    });
  }, [detail.data, reset]);

  async function onSubmit(values) {
    setServerError(null);
    try {
      const saved = isEdit ? await updateDestination(id, values) : await createDestination(values);
      const savedId = saved?.id ?? saved?._id;
      if (!savedId) {
        setServerError('Saved, but the server did not return the record reference. Reload the list to see it.');
        return;
      }
      navigate(`/destinations/${savedId}`, { replace: true });
    } catch (error) {
      const unassigned = applyServerFieldErrors(error, setError);
      applySlugConflict(error, setError);
      setServerError(formErrorMessage(error, unassigned[0] ?? 'The destination could not be saved.'));
    }
  }

  if (isEdit && detail.isLoading) {
    return (
      <div className="flex flex-col gap-4">
        <PageHeader title="Destination" backTo="/destinations" backLabel="All destinations" />
        <p className="text-sm text-slate-500">Loading destination…</p>
      </div>
    );
  }

  if (isEdit && detail.error) {
    return (
      <div className="flex flex-col gap-4">
        <PageHeader title="Destination" backTo="/destinations" backLabel="All destinations" />
        <ErrorState error={detail.error} onRetry={detail.refetch} title="Could not load this destination" />
      </div>
    );
  }

  return (
    <form className="flex max-w-4xl flex-col gap-4" onSubmit={handleSubmit(onSubmit)} noValidate>
      <PageHeader
        title={isEdit ? `Edit ${detail.data?.name ?? 'destination'}` : 'New destination'}
        backTo="/destinations"
        backLabel="All destinations"
        description="A destination is the canonical discovery and intent entity (PRD §22). Saving creates or updates a draft; publishing is a separate, confirmed step below."
        actions={
          <Button type="submit" isLoading={isSubmitting} disabled={isEdit && !isDirty}>
            {isEdit ? 'Save changes' : 'Create destination'}
          </Button>
        }
      />

      <ContentRoleNotice />

      {serverError && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
          {serverError}
        </p>
      )}

      <FormSection
        id="destination-identity"
        title="Identity"
        description="The slug is the public URL and must be unique (PRD §131, §173)."
      >
        <FormField label="Name" id="destination-name" error={errors.name?.message}>
          <Input id="destination-name" placeholder="Rajgir" {...register('name')} />
        </FormField>

        <FormField label="Slug" id="destination-slug" error={errors.slug?.message}>
          <Input id="destination-slug" placeholder="rajgir" {...register('slug')} />
        </FormField>
        <p className="text-xs text-slate-500">
          Public URL: <code className="text-slate-600">/destinations/{detail.data?.slug ?? '‹slug›'}</code>
        </p>
      </FormSection>

      <FormSection
        id="destination-taxonomy"
        title="District & links"
        description="Canonical relationships, stored as IDs. Exactly one district is required; categories and places are N:M and may be empty."
      >
        <FormField label="District" id="destination-district" error={errors.districtId?.message}>
          <select
            id="destination-district"
            disabled={districts.isLoading}
            {...register('districtId')}
            className={`w-full rounded-md border px-3 py-2 text-sm text-slate-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-500/40 ${
              errors.districtId ? 'border-red-400' : 'border-slate-300 focus:border-brand-500'
            }`}
          >
            <option value="">{districts.isLoading ? 'Loading districts…' : 'Select a district'}</option>
            {(districts.data?.items ?? []).map((district) => (
              <option key={district.id ?? district._id} value={district.id ?? district._id}>
                {district.name}
                {district.status !== 'PUBLISHED' ? ` (${district.status})` : ''}
              </option>
            ))}
          </select>
        </FormField>

        {!districts.isLoading && (districts.data?.items ?? []).length === 0 && (
          <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
            No districts exist yet, and a destination must belong to exactly one.{' '}
            <Link to="/districts/new" className="font-medium underline">
              Create a district
            </Link>{' '}
            first.
          </p>
        )}

        <Controller
          control={control}
          name="categoryIds"
          render={({ field }) => (
            <MultiSelect
              id="destination-categories"
              label="Categories"
              description="N:M taxonomy (PRD §200.3). An unpublished category can be linked, but it will not show on public surfaces."
              options={categories.data?.items ?? []}
              value={field.value ?? []}
              onChange={field.onChange}
              error={errors.categoryIds?.message}
              isLoading={categories.isLoading}
              loadError={categories.error ? getErrorMessage(categories.error) : null}
              onRetryLoad={categories.refetch}
              emptyLabel="No categories exist yet. Categories are optional for a destination."
            />
          )}
        />

        <Controller
          control={control}
          name="placeIds"
          render={({ field }) => (
            <MultiSelect
              id="destination-places"
              label="Places to visit"
              description="N:M references to canonical Place records (PRD §200.2, §186). Places are referenced, never copied into this record."
              options={places.data?.items ?? []}
              value={field.value ?? []}
              onChange={field.onChange}
              error={errors.placeIds?.message}
              isLoading={places.isLoading}
              loadError={places.error ? getErrorMessage(places.error) : null}
              onRetryLoad={places.refetch}
              emptyLabel="No places exist yet. Create a place first to list it here."
            />
          )}
        />
      </FormSection>

      <FormSection
        id="destination-summary"
        title="Summary"
        description="shortDescription is the card and list summary shown across the public site (PRD §22)."
      >
        <FormField label="Short description" id="destination-short-description" error={errors.shortDescription?.message}>
          <textarea
            id="destination-short-description"
            rows={3}
            placeholder="One or two lines used on cards and in listings."
            className={`w-full rounded-md border px-3 py-2 text-sm text-slate-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-500/40 ${
              errors.shortDescription ? 'border-red-400' : 'border-slate-300 focus:border-brand-500'
            }`}
            {...register('shortDescription')}
          />
        </FormField>
      </FormSection>

      <FormSection
        id="destination-overview"
        title="Overview"
        description="The full overview prose. The structured areas below are separate fields, never merged into this one (contract §8)."
      >
        <FormField label="Description" id="destination-description" error={errors.description?.message}>
          <textarea
            id="destination-description"
            rows={12}
            placeholder="What a visitor should know before they travel here."
            className={`w-full rounded-md border px-3 py-2 text-sm text-slate-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-500/40 ${
              errors.description ? 'border-red-400' : 'border-slate-300 focus:border-brand-500'
            }`}
            {...register('description')}
          />
        </FormField>

        <p className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
          <strong>Things to do</strong> is a required §22 section but its structure is an open
          decision (PRD §200.8), so the API does not accept it yet. There is deliberately no control
          for it here.
        </p>
      </FormSection>

      <FormSection
        id="destination-highlights"
        title="Highlights"
        description="REQUIRED by the contract as a structured list. Order is the order shown on the public page."
      >
        <StringListEditor
          control={control}
          name="highlights"
          register={register}
          errors={errors}
          label="Highlight"
          placeholder="Hot springs and a deep Buddhist meditation tradition"
          addLabel="Add highlight"
          emptyLabel="No highlights yet. The contract expects at least one."
          max={20}
        />
      </FormSection>

      <FormSection
        id="destination-travel"
        title="Travel information"
        description="Structured travel facts (PRD §22). Every field is optional; blank fields are omitted from the record."
      >
        <FormField label="Best time to visit" id="travel-best-time" error={errors.travelInformation?.bestTimeToVisit?.message}>
          <Input id="travel-best-time" placeholder="October to March" {...register('travelInformation.bestTimeToVisit')} />
        </FormField>

        <FormField label="How to reach" id="travel-how-to-reach" error={errors.travelInformation?.howToReach?.message}>
          <textarea
            id="travel-how-to-reach"
            rows={4}
            placeholder="Road, rail and air options."
            className={`w-full rounded-md border px-3 py-2 text-sm text-slate-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-500/40 ${
              errors.travelInformation?.howToReach ? 'border-red-400' : 'border-slate-300 focus:border-brand-500'
            }`}
            {...register('travelInformation.howToReach')}
          />
        </FormField>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField label="Nearest railway station" id="travel-railway" error={errors.travelInformation?.nearestRailway?.message}>
            <Input id="travel-railway" placeholder="Rajgir station" {...register('travelInformation.nearestRailway')} />
          </FormField>

          <FormField label="Nearest airport" id="travel-airport" error={errors.travelInformation?.nearestAirport?.message}>
            <Input id="travel-airport" placeholder="Gaya International (GAY)" {...register('travelInformation.nearestAirport')} />
          </FormField>
        </div>

        <FormField label="Local language" id="travel-language" error={errors.travelInformation?.localLanguage?.message}>
          <Input id="travel-language" placeholder="Bhojpuri, Hindi" {...register('travelInformation.localLanguage')} />
        </FormField>
      </FormSection>

      <FormSection
        id="destination-media"
        title="Media"
        description="Images are set as URLs: the media upload endpoint is out of Phase 2 scope and no upload dependency is installed (API.destination.contract.md §3)."
      >
        <FormField label="Hero image URL" id="destination-hero" error={errors.heroImage?.message}>
          <Input id="destination-hero" type="url" placeholder="https://…" {...register('heroImage')} />
        </FormField>
        <p className="text-xs text-slate-500">
          REQUIRED by the contract. Also used as the default Open Graph image.
        </p>

        <StringListEditor
          control={control}
          name="gallery"
          register={register}
          errors={errors}
          label="Gallery image URL"
          placeholder="https://…"
          addLabel="Add image"
          emptyLabel="No gallery images yet. Optional — the contract sets no minimum."
          max={30}
          inputType="url"
        />

        <FormField label="Open Graph image URL" id="destination-og" error={errors.ogImage?.message}>
          <Input id="destination-og" type="url" placeholder="https://…" {...register('ogImage')} />
        </FormField>
        <p className="text-xs text-slate-500">
          Optional. Falls back to the hero image when left blank.
        </p>
      </FormSection>

      <FormSection
        id="destination-seo"
        title="SEO"
        description="Per-entity overrides (PRD §50). All three are REQUIRED by the contract; canonicalUrl must be absolute and match the public route."
      >
        <FormField label="SEO title" id="destination-seo-title" error={errors.seoTitle?.message}>
          <Input id="destination-seo-title" placeholder="Rajgir — Hot Springs &amp; Buddhist Heritage" {...register('seoTitle')} />
        </FormField>

        <FormField label="Meta description" id="destination-meta-description" error={errors.metaDescription?.message}>
          <textarea
            id="destination-meta-description"
            rows={3}
            {...register('metaDescription')}
            className={`w-full rounded-md border px-3 py-2 text-sm text-slate-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-500/40 ${
              errors.metaDescription ? 'border-red-400' : 'border-slate-300 focus:border-brand-500'
            }`}
          />
        </FormField>

        <FormField label="Canonical URL" id="destination-canonical" error={errors.canonicalUrl?.message}>
          <Input
            id="destination-canonical"
            type="url"
            placeholder="https://safarup.in/destinations/rajgir"
            {...register('canonicalUrl')}
          />
        </FormField>
      </FormSection>

      {isEdit && detail.data && (
        <LifecyclePanel
          entity={CONTENT_ENTITIES.destinations}
          entityLabel="Destination"
          id={id}
          name={detail.data.name}
          status={detail.data.status}
          featured={Boolean(detail.data.featured)}
          supportsFeature
          publicPath={`/destinations/${detail.data.slug}`}
        />
      )}

      {!isEdit && (
        <p className="rounded-md border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">
          The destination is created as a <strong>draft</strong>. Once saved you can publish it from
          the lifecycle panel — publishing is a separate, confirmed step because it makes the page
          publicly visible on the internet.
        </p>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <Button type="submit" isLoading={isSubmitting} disabled={isEdit && !isDirty}>
          {isEdit ? 'Save changes' : 'Create destination'}
        </Button>
        <Button variant="ghost" onClick={() => navigate('/destinations')}>
          Cancel
        </Button>
        {isEdit && isDirty && <span className="text-sm text-slate-500">Unsaved changes</span>}
      </div>
    </form>
  );
}
