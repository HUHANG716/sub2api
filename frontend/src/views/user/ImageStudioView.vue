<template>
  <AppLayout>
    <div class="image-studio-global-bar mb-4 flex flex-col gap-3 rounded-lg border border-gray-200 bg-white p-3 shadow-sm dark:border-dark-700 dark:bg-dark-800 sm:flex-row sm:items-center sm:justify-between">
      <div class="min-w-0">
        <p class="text-sm font-semibold text-gray-900 dark:text-white">{{ t('imageStudio.title') }}</p>
        <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">{{ t('imageStudio.description') }}</p>
      </div>
      <div class="flex shrink-0 flex-col gap-3 sm:flex-row sm:items-end">
        <button type="button" class="btn btn-secondary h-10 justify-center px-4" data-test="open-template-market" @click="openTemplateGallery">
          <Icon name="grid" size="sm" class="mr-2" />
          {{ t('imageStudio.templateMarket') }}
        </button>
        <label class="block sm:w-[280px]">
          <span class="mb-1.5 block text-xs font-medium text-gray-600 dark:text-gray-300">{{ t('imageStudio.group') }}</span>
          <select ref="groupSelect" v-model.number="form.group_id" class="input h-10 text-sm" data-test="group-select" :aria-label="t('imageStudio.group')">
            <option :value="0">{{ t('imageStudio.selectGroup') }}</option>
            <option v-for="group in options?.groups || []" :key="group.id" :value="group.id">
              {{ group.name }}
            </option>
          </select>
        </label>
      </div>
    </div>

    <div class="image-studio-shell grid gap-4" :class="isTemplateLibraryView ? 'xl:grid-cols-1' : 'xl:grid-cols-[400px_minmax(0,1fr)]'">
      <aside v-if="!isTemplateLibraryView" class="image-studio-top-console order-1 rounded-lg border border-gray-200 bg-white shadow-sm dark:border-dark-700 dark:bg-dark-800 xl:sticky xl:top-24 xl:max-h-[calc(100dvh-7rem)] xl:overflow-hidden" data-test="creation-console">
        <div class="image-studio-scroll-pane flex max-h-full flex-col gap-3 overflow-y-auto p-3">
          <header class="border-b border-gray-200 pb-3 dark:border-dark-700">
            <div class="grid grid-cols-2 gap-1 rounded-lg bg-gray-100 p-1 dark:bg-dark-900">
              <button
                v-for="mode in creativeModes"
                :key="mode.key"
                type="button"
                class="image-studio-mode-tab"
                :class="creativeMode === mode.key ? 'image-studio-mode-tab-active' : ''"
                :aria-pressed="creativeMode === mode.key"
                :data-test="`start-card-${mode.key}`"
                @click="selectCreativeMode(mode.key)"
              >
                <Icon :name="mode.icon" size="xs" />
                <span>{{ mode.label }}</span>
              </button>
            </div>
          </header>

          <div class="space-y-3">
            <section v-if="creativeMode !== 'localEdit'" class="space-y-2 rounded-lg border border-gray-200 p-3 dark:border-dark-700" data-test="reference-panel">
              <div class="flex items-center justify-between gap-3">
                <label class="text-sm font-semibold text-gray-900 dark:text-white">{{ t('imageStudio.referenceImages') }}</label>
              </div>
              <input ref="imagesInput" type="file" accept="image/*" multiple class="hidden" data-test="reference-input" @change="onImagesPicked" />
              <button
                type="button"
                class="image-studio-dropzone flex min-h-[72px] w-full flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-gray-300 px-3 py-3 text-center text-sm font-medium text-gray-700 transition hover:border-primary-300 hover:bg-primary-50/60 dark:border-dark-600 dark:text-gray-300 dark:hover:border-primary-700 dark:hover:bg-primary-950/30"
                data-test="upload-reference"
                @click="imagesInput?.click()"
                @dragover.prevent
                @drop.prevent="onImagesDropped"
              >
                <Icon name="upload" size="sm" class="text-gray-400 dark:text-gray-500" />
                <span>{{ referenceImages.length ? t('imageStudio.referenceDropReady', { count: referenceImages.length }) : t('imageStudio.uploadImages') }}</span>
                <span class="text-[11px] font-normal text-gray-500 dark:text-gray-400">{{ t('imageStudio.uploadHint') }}</span>
              </button>
              <div v-if="referenceImages.length" class="space-y-2">
                <article v-for="(item, index) in referenceImages" :key="item.id" class="grid grid-cols-[52px_minmax(0,1fr)_auto] items-center gap-3 rounded-lg border border-gray-200 bg-gray-50 p-2 dark:border-dark-700 dark:bg-dark-900">
                  <img :src="item.url" class="h-[52px] w-[52px] rounded-md object-cover" alt="" />
                  <div class="min-w-0">
                    <p class="truncate text-xs font-medium text-gray-900 dark:text-white">{{ item.file.name }}</p>
                    <select v-model="item.role" class="mt-2 input py-1 text-xs">
                      <option v-for="role in referenceRoleOptions" :key="role.key" :value="role.key">{{ role.label }}</option>
                    </select>
                  </div>
                  <div class="flex flex-col gap-1">
                    <button type="button" class="rounded p-1.5 text-gray-500 hover:bg-white hover:text-gray-800 disabled:opacity-40 dark:text-gray-400 dark:hover:bg-dark-800 dark:hover:text-white" :title="t('imageStudio.moveEarlier')" :disabled="index === 0" @click.stop="moveReferenceImage(index, -1)">
                      <Icon name="arrowUp" size="xs" />
                    </button>
                    <button type="button" class="rounded p-1.5 text-red-500 hover:bg-white hover:text-red-700 dark:text-red-300 dark:hover:bg-dark-800" :title="t('imageStudio.removeImage')" @click.stop="removeImage(item.id)">
                      <Icon name="x" size="xs" />
                    </button>
                  </div>
                </article>
              </div>
            </section>

            <section v-else class="space-y-2 rounded-lg border border-gray-200 p-3 dark:border-dark-700" data-test="local-edit-panel">
              <div class="flex items-center justify-between gap-3">
                <label class="text-sm font-semibold text-gray-900 dark:text-white">{{ t('imageStudio.localEditBaseImage') }}</label>
              </div>
              <input ref="imagesInput" type="file" accept="image/*" multiple class="hidden" data-test="reference-input" @change="onImagesPicked" />
              <button
                type="button"
                class="image-studio-dropzone flex min-h-[72px] w-full flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-gray-300 px-3 py-3 text-center text-sm font-medium text-gray-700 transition hover:border-primary-300 hover:bg-primary-50/60 dark:border-dark-600 dark:text-gray-300 dark:hover:border-primary-700 dark:hover:bg-primary-950/30"
                data-test="upload-reference"
                @click="imagesInput?.click()"
                @dragover.prevent
                @drop.prevent="onImagesDropped"
              >
                <Icon name="upload" size="sm" class="text-gray-400 dark:text-gray-500" />
                <span>{{ hasReferenceImages ? t('imageStudio.baseImageReady') : t('imageStudio.uploadBaseImage') }}</span>
                <span class="text-[11px] font-normal text-gray-500 dark:text-gray-400">{{ hasReferenceImages ? t('imageStudio.localEditMaskHint') : t('imageStudio.localEditUploadFirstHint') }}</span>
              </button>
              <article v-if="referenceImages[0]" class="grid grid-cols-[52px_minmax(0,1fr)_auto] items-center gap-3 rounded-lg border border-gray-200 bg-gray-50 p-2 dark:border-dark-700 dark:bg-dark-900">
                <img :src="referenceImages[0].url" class="h-[52px] w-[52px] rounded-md object-cover" alt="" />
                <p class="min-w-0 truncate text-xs font-medium text-gray-900 dark:text-white">{{ referenceImages[0].file.name }}</p>
                <button type="button" class="rounded p-1.5 text-red-500 hover:bg-white hover:text-red-700 dark:text-red-300 dark:hover:bg-dark-800" :title="t('imageStudio.removeImage')" @click.stop="removeImage(referenceImages[0].id)">
                  <Icon name="x" size="xs" />
                </button>
              </article>

              <div v-if="showLocalEditPanel" class="rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-dark-700 dark:bg-dark-900">
                <p class="inline-flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white">
                  <Icon name="edit" size="sm" />
                  {{ t('imageStudio.localEdit') }}
                </p>
                <p class="mt-1 truncate text-xs text-gray-500 dark:text-gray-400">{{ maskStatusLabel }}</p>
              </div>
            </section>

            <div class="image-studio-generate-bar sticky bottom-0 rounded-lg border border-gray-200 bg-white p-3 shadow-[0_-12px_24px_-24px_rgba(15,23,42,0.45)] dark:border-dark-700 dark:bg-dark-800">
              <div class="mb-3 grid gap-2 text-xs text-gray-500 dark:text-gray-400">
                <span class="rounded-lg bg-gray-50 px-3 py-2 dark:bg-dark-900">{{ t('imageStudio.estimatedCost') }} <strong class="block font-semibold tabular-nums text-gray-900 dark:text-white">${{ estimatedCost.toFixed(4) }}</strong></span>
                <button type="button" class="image-studio-settings-summary" data-test="open-settings-popup" @click="openSettingsPopup">
                  <span>{{ t('imageStudio.generationPlan') }}</span>
                  <strong>{{ outputSummary }}</strong>
                  <Icon name="filter" size="xs" class="text-gray-400 dark:text-gray-500" />
                </button>
              </div>
              <button class="btn btn-primary w-full justify-center py-3" :disabled="generating || !canGenerate" @click="generateImage">
                <Icon name="sparkles" size="md" class="mr-2" />
                {{ generateButtonLabel }}
              </button>
              <p v-if="generating" class="mt-2 text-center text-xs text-gray-500 dark:text-gray-400">{{ t('imageStudio.generatingHint') }}</p>
              <p v-else-if="generationBlocker" class="mt-2 flex items-center justify-center gap-1.5 text-center text-xs text-amber-600 dark:text-amber-300">
                <Icon name="exclamationCircle" size="xs" />
                {{ generationBlocker }}
              </p>
            </div>
          </div>
        </div>
      </aside>

      <section class="order-2 flex min-h-[640px] min-w-0 flex-col rounded-lg border border-gray-200 bg-white p-4 dark:border-dark-700 dark:bg-dark-800" :class="isTemplateLibraryView ? 'image-studio-template-workspace' : ''">
          <header class="mb-3 flex shrink-0 flex-col gap-3 border-b border-gray-200 pb-3 dark:border-dark-700 md:flex-row md:items-center md:justify-between">
            <div class="min-w-0">
              <p class="text-sm font-semibold text-gray-900 dark:text-white">{{ workspaceTitle }}</p>
              <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">{{ workspaceDescription }}</p>
            </div>
            <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
              <button v-if="isTemplateLibraryView" type="button" class="btn btn-secondary justify-center px-3 py-2 text-xs" data-test="return-generation" @click="closeTemplateGallery">
                <Icon name="arrowLeft" size="sm" class="mr-1.5" />
                {{ t('common.back') }}
              </button>
              <div v-else-if="creativeMode === 'text' && sessionResults.length" class="flex flex-wrap items-center justify-end gap-1.5 text-xs text-gray-500 dark:text-gray-400">
                <button type="button" class="image-studio-link" :disabled="generating" @click="downloadAllImages">
                  <Icon name="download" size="xs" />
                  {{ t('imageStudio.downloadAll') }}
                </button>
                <button type="button" class="image-studio-link text-red-600 dark:text-red-300" :disabled="generating" @click="clearSessionResults">
                  <Icon name="trash" size="xs" />
                  {{ t('imageStudio.clearSession') }}
                </button>
              </div>
            </div>
          </header>

          <div v-if="!isTemplateLibraryView" class="image-studio-scroll-pane flex min-h-0 flex-1 flex-col">
          <div v-show="creativeMode === 'localEdit'" class="image-studio-workspace-surface image-studio-workspace-fill" data-test="local-edit-workspace">
            <input ref="maskInput" type="file" accept="image/*" class="hidden" @change="onMaskPicked" />

            <div class="relative flex min-h-0 w-full flex-1 items-center justify-center overflow-hidden rounded-lg border border-gray-200 bg-gray-100 p-3 dark:border-dark-700 dark:bg-black">
              <div class="pointer-events-none absolute left-3 right-3 top-3 z-10 flex flex-wrap items-start justify-between gap-2" data-test="local-edit-tools">
                <span class="pointer-events-auto max-w-full truncate rounded-md bg-white/95 px-2.5 py-1 text-xs font-medium text-gray-700 shadow-sm dark:bg-dark-900/95 dark:text-gray-200">
                  {{ hasReferenceImages ? maskStatusLabel : t('imageStudio.noBaseImage') }}
                </span>
                <div class="pointer-events-auto flex flex-wrap justify-end gap-1.5">
                  <button type="button" class="btn btn-secondary justify-center px-2.5 py-1.5 text-xs" @click="maskInput?.click()">
                    <Icon name="upload" size="sm" class="mr-1" />
                    {{ maskFile ? maskFile.name : t('imageStudio.uploadMask') }}
                  </button>
                  <button type="button" class="btn btn-secondary justify-center px-2.5 py-1.5 text-xs" :disabled="!maskHistory.length" @click="undoMaskStroke">
                    <Icon name="arrowLeft" size="sm" class="mr-1" />
                    {{ t('imageStudio.undoMask') }}
                  </button>
                  <button type="button" class="btn btn-secondary justify-center px-2.5 py-1.5 text-xs text-red-600 dark:text-red-300" :disabled="!hasPaintedMask && !maskFile" @click="clearMask">
                    <Icon name="trash" size="sm" class="mr-1" />
                    {{ t('imageStudio.clearMask') }}
                  </button>
                </div>
              </div>
              <label v-if="maskPreviewUrl" class="absolute bottom-3 left-3 right-3 z-10 flex min-w-0 items-center gap-3 rounded-md bg-white/95 px-3 py-2 text-xs text-gray-500 shadow-sm dark:bg-dark-900/95 dark:text-gray-300 md:left-auto md:w-80">
                <span class="shrink-0">{{ t('imageStudio.brushSize') }}</span>
                <input v-model.number="maskBrushSize" class="min-w-0 flex-1 accent-primary-600" type="range" min="8" max="120" step="2" />
                <span class="w-9 text-right tabular-nums">{{ maskBrushSize }}</span>
              </label>
              <div v-if="maskPreviewUrl" class="relative max-h-full max-w-full overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm dark:border-dark-700 dark:bg-dark-950">
                <img ref="maskImage" :src="maskPreviewUrl" class="block max-h-[72dvh] max-w-full select-none object-contain" alt="" draggable="false" @load="resetMaskCanvas" />
                <canvas
                  ref="maskCanvas"
                  class="absolute inset-0 h-full w-full touch-none cursor-crosshair"
                  @pointerdown="startMaskStroke"
                  @pointermove="paintMaskStroke"
                  @pointerup="endMaskStroke"
                  @pointercancel="endMaskStroke"
                  @pointerleave="endMaskStroke"
                />
              </div>
              <div v-else class="rounded-lg border border-dashed border-gray-300 p-5 text-center dark:border-dark-700">
                <Icon name="upload" size="lg" class="mx-auto text-gray-400" />
                <p class="mt-2 text-sm font-medium text-gray-900 dark:text-white">{{ t('imageStudio.uploadBaseImage') }}</p>
                <p class="mt-1 max-w-sm text-xs text-gray-500 dark:text-gray-400">{{ t('imageStudio.localEditUploadFirstHint') }}</p>
              </div>
            </div>
          </div>
          <div v-if="creativeMode === 'text' && generating" class="space-y-4">
            <div class="rounded-lg border border-primary-200 bg-primary-50/60 p-3 dark:border-primary-900 dark:bg-primary-950/20">
              <div class="flex flex-wrap items-center justify-between gap-3">
                <div class="flex items-center gap-3">
                  <span class="image-studio-generating-orbit">
                    <Icon name="sparkles" size="md" />
                  </span>
                  <p class="text-sm font-semibold text-gray-900 dark:text-white">{{ generateButtonLabel }}</p>
                </div>
                <span class="rounded bg-white px-2.5 py-1 text-xs font-medium text-primary-700 shadow-sm dark:bg-dark-900 dark:text-primary-300">{{ outputSummary }}</span>
              </div>
            </div>
            <div class="grid gap-4 sm:grid-cols-2 2xl:grid-cols-3">
              <div v-for="index in generationSkeletonCount" :key="index" class="image-studio-result-skeleton rounded-lg border border-gray-200 bg-white p-3 dark:border-dark-700 dark:bg-dark-900">
                <div class="aspect-square rounded-md bg-gray-100 dark:bg-dark-800"></div>
                <div class="mt-3 space-y-2">
                  <span class="block h-3 w-4/5 rounded bg-gray-100 dark:bg-dark-800"></span>
                  <span class="block h-3 w-2/3 rounded bg-gray-100 dark:bg-dark-800"></span>
                </div>
              </div>
            </div>
          </div>
          <div v-else-if="creativeMode === 'text' && sessionResults.length" class="space-y-5">
            <div class="image-studio-sticky-toolbar flex flex-wrap items-center justify-between gap-3 rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-dark-700 dark:bg-dark-900">
              <div class="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <div class="text-sm">
                  <p class="text-gray-500 dark:text-gray-400">{{ t('imageStudio.actualCost') }}</p>
                  <p class="font-semibold text-gray-900 dark:text-white">${{ latestSessionResult?.actual_cost.toFixed(4) }}</p>
                </div>
                <div class="text-sm">
                  <p class="text-gray-500 dark:text-gray-400">{{ t('imageStudio.newBalance') }}</p>
                  <p class="font-semibold text-gray-900 dark:text-white">${{ (latestSessionResult?.new_balance ?? displayBalance).toFixed(4) }}</p>
                </div>
                <div class="text-sm">
                  <p class="text-gray-500 dark:text-gray-400">{{ t('imageStudio.billingSize') }}</p>
                  <p class="font-semibold text-gray-900 dark:text-white">{{ latestSessionResult?.billing_size }}</p>
                </div>
                <div class="text-sm">
                  <p class="text-gray-500 dark:text-gray-400">{{ t('imageStudio.sessionCount') }}</p>
                  <p class="font-semibold text-gray-900 dark:text-white">{{ sessionImageCount }}</p>
                </div>
              </div>
            </div>

            <div v-for="(result, resultIndex) in sessionResults" :key="result.request_id || resultIndex" class="space-y-3">
              <div class="flex flex-wrap items-start justify-between gap-3 border-b border-gray-200 pb-2 dark:border-dark-700">
                <div class="min-w-0">
                  <p class="text-xs font-semibold text-gray-900 dark:text-white">
                    {{ resultIndex === 0 ? t('imageStudio.latestResult') : t('imageStudio.sessionResult', { index: sessionResults.length - resultIndex }) }}
                  </p>
                  <p class="mt-1 line-clamp-2 text-xs text-gray-500 dark:text-gray-400">{{ result.prompt_snapshot }}</p>
                </div>
                <div class="shrink-0 text-right text-[11px] text-gray-500 dark:text-gray-400">
                  <p>${{ result.actual_cost.toFixed(4) }} · {{ result.billing_size }} · {{ result.image_count }}</p>
                  <p>{{ formatSessionTime(result.created_at) }}</p>
                </div>
              </div>
              <div class="grid gap-4 sm:grid-cols-2 2xl:grid-cols-3">
                <figure v-for="(image, index) in result.images" :key="`${result.request_id || resultIndex}-${index}`" class="image-studio-result-card overflow-hidden rounded-lg border border-gray-200 bg-gray-50 dark:border-dark-700 dark:bg-dark-900">
                  <button type="button" class="group/result relative block w-full bg-gray-100 dark:bg-dark-950" @click="openResultPreview(result, image, index)">
                    <img :src="imageSrc(image, result.output_format_snapshot)" class="aspect-square w-full object-contain transition duration-200 hover:scale-[1.01]" alt="" />
                    <span class="absolute bottom-3 right-3 inline-flex items-center gap-1 rounded-md bg-white/95 px-2 py-1 text-xs font-medium text-gray-700 opacity-0 shadow-sm transition group-hover/result:opacity-100 dark:bg-dark-900/95 dark:text-gray-200">
                      <Icon name="eye" size="xs" />
                      {{ t('imageStudio.previewImage') }}
                    </span>
                  </button>
                  <figcaption class="space-y-3 border-t border-gray-200 p-3 dark:border-dark-700">
                    <p class="line-clamp-2 text-xs text-gray-500 dark:text-gray-400">{{ image.revised_prompt || result.prompt_snapshot }}</p>
                    <div class="grid gap-2">
                      <a class="btn btn-secondary justify-center px-3 py-1.5 text-xs" :href="imageSrc(image, result.output_format_snapshot)" :download="imageDownloadName(index, result.output_format_snapshot, resultIndex)" :title="t('imageStudio.downloadImage')">
                        <Icon name="download" size="sm" class="mr-1.5" />
                        {{ t('imageStudio.downloadImage') }}
                      </a>
                    </div>
                  </figcaption>
                </figure>
              </div>
            </div>
          </div>
          <div v-else-if="creativeMode === 'text'" class="image-studio-workspace-surface flex-col rounded-lg border border-dashed border-gray-300 p-5 text-center dark:border-dark-600">
            <Icon name="sparkles" size="xl" class="text-primary-500 dark:text-primary-400" />
            <p class="mt-3 text-base font-semibold text-gray-900 dark:text-white">{{ t('imageStudio.emptyTitle') }}</p>
            <p class="mt-1 max-w-md text-sm text-gray-500 dark:text-gray-400">{{ t('imageStudio.emptyGenerationHint') }}</p>
          </div>

          <aside v-if="creativeMode === 'text' && historyItems.length" class="mt-5 rounded-lg border border-gray-200 p-4 dark:border-dark-700">
            <div class="mb-3 flex items-center justify-between gap-3">
              <h2 class="text-sm font-semibold text-gray-900 dark:text-white">{{ t('imageStudio.history') }}</h2>
              <button type="button" class="text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200" @click="clearHistory">
                {{ t('imageStudio.clearHistory') }}
              </button>
            </div>
            <div class="grid gap-2 lg:grid-cols-2">
              <button
                v-for="item in historyItems"
                :key="item.id"
                type="button"
                class="rounded-lg border border-gray-200 p-3 text-left transition hover:border-primary-300 hover:bg-primary-50/70 dark:border-dark-700 dark:hover:border-primary-700 dark:hover:bg-primary-950/30"
                @click="restoreHistory(item)"
              >
                <span class="block truncate text-xs font-medium text-gray-900 dark:text-white">{{ item.prompt }}</span>
                <span class="mt-1 block text-[11px] text-gray-500 dark:text-gray-400">{{ item.mode }} · {{ item.size }} · {{ item.n }} · ${{ item.actualCost.toFixed(4) }}</span>
              </button>
            </div>
          </aside>
          </div>
          <section v-if="!isTemplateLibraryView && (creativeMode === 'text' || creativeMode === 'localEdit')" class="image-studio-prompt-panel mt-4 flex min-h-[220px] shrink-0 flex-col gap-3 rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-dark-700 dark:bg-dark-900" data-test="prompt-panel">
            <div class="flex flex-wrap items-center justify-between gap-2">
              <label class="text-sm font-semibold text-gray-900 dark:text-white">{{ t('imageStudio.prompt') }}</label>
              <div class="flex shrink-0 flex-wrap items-center gap-1">
                <button v-if="creativeMode === 'text'" type="button" class="btn btn-secondary px-2.5 py-1.5 text-xs" data-test="open-template-library" @click="openTemplateGallery">
                  <Icon name="grid" size="sm" class="mr-1.5" />
                  {{ t('imageStudio.browseTemplates') }}
                </button>
                <span class="rounded bg-white px-2 py-1 text-xs font-medium text-gray-600 dark:bg-dark-800 dark:text-gray-300">{{ requestModeBadge }}</span>
              </div>
            </div>
            <div v-if="creativeMode === 'text' && appliedTemplate" class="rounded-lg border border-primary-200 bg-primary-50/70 px-3 py-2 text-xs text-primary-800 dark:border-primary-900 dark:bg-primary-950/30 dark:text-primary-200" data-test="applied-template-summary">
              <div class="flex flex-wrap items-center justify-between gap-2">
                <span class="inline-flex items-center gap-1.5 font-semibold">
                  <Icon name="checkCircle" size="xs" />
                  {{ t('imageStudio.templateAppliedTitle', { title: appliedTemplate.label }) }}
                </span>
              </div>
            </div>
            <div class="relative min-h-[140px] flex-1">
              <textarea ref="promptTextarea" v-model="activePrompt" class="image-studio-prompt-input input h-full min-h-full resize-none pb-8 text-sm leading-6" data-test="image-prompt" maxlength="4000" :placeholder="activeModeMeta.placeholder" />
              <span class="pointer-events-none absolute bottom-2 right-2 rounded bg-white/90 px-2 py-0.5 text-[11px] tabular-nums text-gray-500 shadow-sm dark:bg-dark-900/90 dark:text-gray-400">{{ promptProgressLabel }}</span>
            </div>
          </section>
          <section v-else-if="isTemplateLibraryView" class="image-studio-template-library flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border border-gray-200 bg-gray-50 dark:border-dark-700 dark:bg-dark-900" data-test="template-library">
            <div class="image-studio-template-grid grid min-h-0 flex-1 gap-4 overflow-hidden p-3 lg:grid-cols-[minmax(0,1fr)_320px] 2xl:grid-cols-[minmax(0,1fr)_360px]">
              <div class="image-studio-template-list flex min-h-0 flex-col overflow-hidden rounded-lg border border-gray-200 bg-white dark:border-dark-700 dark:bg-dark-800">
                <div class="shrink-0 space-y-3 border-b border-gray-200 p-3 dark:border-dark-700">
                  <div class="flex items-center justify-between gap-3">
                    <div class="min-w-0">
                      <p class="text-xs font-medium text-gray-600 dark:text-gray-300">{{ t('imageStudio.templateGallery') }}</p>
                      <p class="mt-1 text-[11px] text-gray-500 dark:text-gray-400">{{ t('imageStudio.templateCount', { count: visiblePromptTemplates.length }) }}</p>
                    </div>
                    <a
                      class="inline-flex shrink-0 items-center gap-1 text-xs font-medium text-primary-600 hover:text-primary-700 dark:text-primary-400"
                      href="https://github.com/EvoLinkAI/awesome-gpt-image-2-API-and-Prompts"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {{ t('imageStudio.templateSource') }}
                      <Icon name="externalLink" size="xs" />
                    </a>
                  </div>

                  <label class="relative block">
                    <Icon name="search" size="sm" class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500" />
                    <input
                      v-model="templateSearchQuery"
                      class="input h-10 pl-9 pr-9 text-sm"
                      type="search"
                      :placeholder="t('imageStudio.templateSearchPlaceholder')"
                      :aria-label="t('imageStudio.templateSearchPlaceholder')"
                      data-test="template-search"
                    />
                    <button
                      v-if="templateSearchQuery"
                      type="button"
                      class="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-dark-700 dark:hover:text-gray-200"
                      :title="t('imageStudio.clearTemplateSearch')"
                      @click="templateSearchQuery = ''"
                    >
                      <Icon name="x" size="xs" />
                    </button>
                  </label>

                  <div v-if="templateTagOptions.length" class="flex gap-2 overflow-x-auto pb-1">
                    <button
                      v-for="tag in templateTagOptions"
                      :key="tag"
                      type="button"
                      class="template-filter-chip"
                      :class="templateTagFilter === tag ? 'template-filter-chip-active' : ''"
                      @click="templateTagFilter = tag"
                    >
                      {{ tag === 'all' ? t('imageStudio.templateCategoryAll') : tag }}
                    </button>
                  </div>
                </div>

                <div class="image-studio-scroll-pane min-h-0 flex-1 overflow-y-auto p-3" data-test="template-thumbnail-list">
                  <div v-if="visiblePromptTemplates.length" class="grid content-start gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                    <article
                      v-for="template in visiblePromptTemplates"
                      :key="template.key"
                      class="group overflow-hidden rounded-lg border bg-white transition hover:border-primary-300 hover:shadow-sm dark:bg-dark-800 dark:hover:border-primary-700"
                      :class="selectedTemplate?.key === template.key ? 'border-primary-400 ring-1 ring-primary-300 dark:border-primary-600 dark:ring-primary-700' : 'border-gray-200 dark:border-dark-700'"
                    >
                      <button type="button" class="flex h-full w-full flex-col text-left" :title="template.label" data-test="template-card" @click="selectTemplate(template)">
                        <img :src="template.image" class="aspect-[4/3] w-full bg-gray-100 object-cover dark:bg-dark-700" :alt="template.label" loading="lazy" />
                        <span class="flex min-h-[118px] min-w-0 flex-1 flex-col p-3">
                          <span class="line-clamp-2 text-sm font-semibold text-gray-900 dark:text-white">{{ template.label }}</span>
                          <span class="mt-2 grid min-w-0 gap-1 text-[11px] text-gray-500 dark:text-gray-400">
                            <span class="truncate">{{ template.model }}</span>
                            <span class="line-clamp-1">{{ template.meta }}</span>
                          </span>
                          <span v-if="template.tags?.length" class="mt-auto flex gap-1 overflow-hidden pt-2">
                            <span v-for="tag in template.tags.slice(0, 2)" :key="tag" class="template-mini-tag">{{ tag }}</span>
                          </span>
                        </span>
                      </button>
                    </article>
                  </div>
                  <div v-else class="rounded-lg border border-dashed border-gray-300 p-5 text-center dark:border-dark-700">
                    <Icon name="search" size="lg" class="mx-auto text-gray-400 dark:text-gray-500" />
                    <p class="mt-2 text-sm font-medium text-gray-900 dark:text-white">{{ t('imageStudio.templateEmptyTitle') }}</p>
                    <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">{{ t('imageStudio.templateEmptyDescription') }}</p>
                  </div>
                </div>
              </div>

              <aside v-if="selectedTemplate" class="image-studio-template-detail flex min-h-0 flex-col overflow-hidden rounded-lg border border-gray-200 bg-white dark:border-dark-700 dark:bg-dark-800">
                <div class="image-studio-scroll-pane min-h-0 flex-1 overflow-y-auto p-3">
                  <div class="flex min-h-0 flex-col gap-3">
                    <img :src="selectedTemplate.image" class="image-studio-template-preview max-h-52 w-full rounded-lg border border-gray-200 bg-gray-100 object-contain dark:border-dark-700 dark:bg-dark-900" :alt="selectedTemplate.label" />
                    <div class="flex flex-wrap gap-2">
                      <span class="rounded bg-gray-100 px-2 py-1 text-xs font-medium text-gray-600 dark:bg-dark-700 dark:text-gray-300">{{ selectedTemplate.model }}</span>
                      <span v-for="tag in selectedTemplate.tags || []" :key="tag" class="template-mini-tag">{{ tag }}</span>
                    </div>
                    <div>
                      <h2 class="text-base font-semibold text-gray-900 dark:text-white">{{ selectedTemplate.label }}</h2>
                      <a
                        class="mt-1 inline-flex max-w-full items-center gap-1 text-xs text-gray-500 hover:text-primary-600 dark:text-gray-400 dark:hover:text-primary-400"
                        :href="selectedTemplate.source_url"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <span class="truncate">{{ selectedTemplate.source_name }} · {{ selectedTemplate.meta }}</span>
                        <Icon name="externalLink" size="xs" class="shrink-0" />
                      </a>
                    </div>
                    <div class="rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-dark-700 dark:bg-dark-900">
                      <p class="mb-2 text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">{{ t('imageStudio.prompt') }}</p>
                      <pre class="image-studio-template-prompt whitespace-pre-wrap break-words text-xs leading-5 text-gray-700 dark:text-gray-300">{{ selectedTemplatePromptPreview }}</pre>
                    </div>
                  </div>
                </div>
                <div class="shrink-0 border-t border-gray-200 bg-white p-3 dark:border-dark-700 dark:bg-dark-800">
                  <button type="button" class="btn btn-primary w-full justify-center" data-test="use-template" @click="useSelectedTemplate">
                    <Icon name="check" size="sm" class="mr-2" />
                    {{ t('imageStudio.useTemplate') }}
                  </button>
                </div>
              </aside>
            </div>
          </section>
        </section>

    </div>

    <div v-if="settingsPopupOpen" class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" @click.self="closeSettingsPopup">
      <section class="flex max-h-[92dvh] w-full max-w-2xl flex-col overflow-hidden rounded-lg bg-white shadow-2xl dark:bg-dark-900" role="dialog" aria-modal="true" :aria-label="t('imageStudio.outputSettings')" data-test="settings-popup">
        <header class="flex items-center justify-between border-b border-gray-200 p-4 dark:border-dark-700">
          <div>
            <p class="text-sm font-semibold text-gray-900 dark:text-white">{{ t('imageStudio.outputSettings') }}</p>
            <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">{{ outputSummary }} · {{ styleSummary }}</p>
          </div>
          <button type="button" class="rounded p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-dark-800 dark:hover:text-white" :title="t('common.close')" @click="closeSettingsPopup">
            <Icon name="x" size="sm" />
          </button>
        </header>

        <div class="image-studio-scroll-pane min-h-0 flex-1 space-y-5 overflow-y-auto p-4">
          <section class="space-y-4" data-test="output-settings">
            <div class="image-studio-setting-block" data-output-setting="ratio" data-test="output-setting-ratio">
              <label class="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">{{ t('imageStudio.aspectRatio') }}</label>
              <div class="grid grid-cols-4 gap-2">
                <button
                  v-for="preset in aspectRatioOptions"
                  :key="preset.value"
                  type="button"
                  class="image-studio-chip"
                  :class="form.aspect_ratio === preset.value ? 'image-studio-chip-active' : ''"
                  @click="form.aspect_ratio = preset.value"
                >
                  {{ preset.label }}
                </button>
              </div>
            </div>

            <div class="grid grid-cols-2 gap-3">
              <div class="image-studio-setting-block" data-output-setting="size" data-test="output-setting-size">
                <label class="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">{{ t('imageStudio.size') }}</label>
                <select v-model="form.size" class="input">
                  <option value="1K">1K</option>
                  <option value="2K">2K</option>
                  <option value="4K">4K</option>
                </select>
              </div>
              <div class="image-studio-setting-block" data-output-setting="count" data-test="output-setting-count">
                <label class="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">{{ t('imageStudio.count') }}</label>
                <input v-model.number="form.n" class="input" type="number" min="1" max="10" />
              </div>
            </div>

            <div class="image-studio-setting-block" data-output-setting="style" data-test="output-setting-style">
              <label class="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">{{ t('imageStudio.styleDirection') }}</label>
              <div class="grid grid-cols-2 gap-2">
                <button
                  v-for="preset in stylePresetOptions"
                  :key="preset.value"
                  type="button"
                  class="image-studio-chip justify-start"
                  :class="form.style_preset === preset.value ? 'image-studio-chip-active' : ''"
                  @click="form.style_preset = preset.value"
                >
                  {{ preset.label }}
                </button>
              </div>
            </div>
          </section>

          <details :open="advancedPanelOpen" class="rounded-lg border border-gray-200 p-3 dark:border-dark-700" @toggle="onAdvancedPanelToggle">
            <summary class="flex cursor-pointer list-none items-center justify-between text-sm font-semibold text-gray-900 dark:text-white">
              <span class="inline-flex items-center gap-2">
                <Icon name="cog" size="sm" />
                {{ t('imageStudio.advancedSettings') }}
              </span>
              <span class="text-xs font-normal text-gray-500 dark:text-gray-400">{{ form.output_format }}</span>
            </summary>
            <div class="mt-4 space-y-3">
              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label class="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">{{ t('imageStudio.quality') }}</label>
                  <select v-model="form.quality" class="input">
                    <option value="">Default</option>
                    <option value="auto">auto</option>
                    <option value="low">low</option>
                    <option value="medium">medium</option>
                    <option value="high">high</option>
                  </select>
                </div>
                <div>
                  <label class="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">{{ t('imageStudio.background') }}</label>
                  <select v-model="form.background" class="input">
                    <option value="">Default</option>
                    <option value="auto">auto</option>
                    <option value="transparent">transparent</option>
                    <option value="opaque">opaque</option>
                  </select>
                </div>
              </div>
              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label class="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">{{ t('imageStudio.outputFormat') }}</label>
                  <select v-model="form.output_format" class="input">
                    <option value="png">png</option>
                    <option value="jpeg">jpeg</option>
                    <option value="webp">webp</option>
                  </select>
                </div>
                <div>
                  <label class="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">{{ t('imageStudio.compression') }}</label>
                  <input v-model.number="form.output_compression" class="input" type="number" min="0" max="100" />
                </div>
              </div>
            </div>
          </details>
        </div>

        <footer class="flex items-center justify-between gap-3 border-t border-gray-200 p-4 text-xs text-gray-500 dark:border-dark-700 dark:text-gray-400">
          <span>{{ t('imageStudio.estimatedCost') }} <strong class="font-semibold tabular-nums text-gray-900 dark:text-white">${{ estimatedCost.toFixed(4) }}</strong></span>
          <button type="button" class="btn btn-primary px-4 py-2" @click="closeSettingsPopup">
            <Icon name="check" size="sm" class="mr-2" />
            {{ t('common.confirm') }}
          </button>
        </footer>
      </section>
    </div>

    <div v-if="previewImage" class="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm" @click.self="closeResultPreview">
      <section class="grid max-h-[92dvh] w-full max-w-6xl overflow-hidden rounded-lg bg-white shadow-2xl dark:bg-dark-900 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div class="flex min-h-[360px] items-center justify-center bg-gray-100 p-4 dark:bg-black">
          <img :src="previewImage.src" class="max-h-[82dvh] max-w-full object-contain" alt="" />
        </div>
        <aside class="flex min-h-0 flex-col border-t border-gray-200 dark:border-dark-700 lg:border-l lg:border-t-0">
          <div class="flex items-center justify-between border-b border-gray-200 p-4 dark:border-dark-700">
            <div>
              <p class="text-sm font-semibold text-gray-900 dark:text-white">{{ t('imageStudio.previewTitle') }}</p>
              <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">{{ previewImage.result.billing_size }} · ${{ previewImage.result.actual_cost.toFixed(4) }}</p>
            </div>
            <button type="button" class="rounded p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-dark-800 dark:hover:text-white" :title="t('common.close')" @click="closeResultPreview">
              <Icon name="x" size="sm" />
            </button>
          </div>
          <div class="image-studio-scroll-pane min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
            <div>
              <p class="mb-2 text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">{{ t('imageStudio.prompt') }}</p>
              <p class="whitespace-pre-wrap text-sm leading-6 text-gray-700 dark:text-gray-300">{{ previewPrompt }}</p>
            </div>
          </div>
          <div class="grid gap-2 border-t border-gray-200 p-4 dark:border-dark-700">
            <button type="button" class="btn btn-primary justify-center" @click="usePreviewAsReference(true)">
              <Icon name="refresh" size="sm" class="mr-2" />
              {{ t('imageStudio.useAsReferenceAndPrompt') }}
            </button>
            <button type="button" class="btn btn-secondary justify-center" @click="usePreviewAsReference(false)">
              <Icon name="edit" size="sm" class="mr-2" />
              {{ t('imageStudio.useAsReferenceOnly') }}
            </button>
            <div class="grid grid-cols-3 gap-2">
              <button class="btn btn-secondary justify-center px-2 py-2" type="button" :title="t('imageStudio.copyPrompt')" @click="copyPrompt(previewPrompt)">
                <Icon name="copy" size="sm" />
              </button>
              <button class="btn btn-secondary justify-center px-2 py-2" type="button" :title="t('imageStudio.copyImage')" @click="copyImage(previewImage.image, previewImage.result.output_format_snapshot)">
                <Icon name="clipboard" size="sm" />
              </button>
              <a class="btn btn-secondary justify-center px-2 py-2" :href="previewImage.src" :download="imageDownloadName(previewImage.index, previewImage.result.output_format_snapshot, previewImage.resultIndex)" :title="t('imageStudio.downloadImage')">
                <Icon name="download" size="sm" />
              </a>
            </div>
          </div>
        </aside>
      </section>
    </div>

  </AppLayout>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { saveAs } from 'file-saver'
import AppLayout from '@/components/layout/AppLayout.vue'
import Icon from '@/components/icons/Icon.vue'
import imagesAPI, { type ImageGenerateResponse, type ImageGenerateResult, type ImageStudioOptions, type ImageStudioSize, type ImageStudioTemplate } from '@/api/images'
import { useAppStore } from '@/stores/app'
import { useAuthStore } from '@/stores/auth'
import { useClipboard } from '@/composables/useClipboard'
import { extractApiErrorMessage } from '@/utils/apiError'
import { imageStudioPromptExamples } from '@/data/imageStudioExamples'

const maxFileSize = 20 * 1024 * 1024
const historyStorageKey = 'sub2api:image-studio-history'

const { t } = useI18n()
const appStore = useAppStore()
const authStore = useAuthStore()
const { copyToClipboard } = useClipboard()

interface ReferenceImage {
  id: string
  file: File
  url: string
  role: ReferenceRole
}

interface ImageHistoryItem {
  id: string
  prompt: string
  mode: 'generation' | 'edit'
  size: ImageStudioSize
  n: number
  quality: string
  background: string
  outputFormat: string
  outputCompression: number
  actualCost: number
  createdAt: number
}

interface SessionImageResult extends ImageGenerateResponse {
  prompt_snapshot: string
  output_format_snapshot: string
  created_at: number
}

interface PreviewImageState {
  result: SessionImageResult
  image: ImageGenerateResult
  index: number
  resultIndex: number
  src: string
}

type PromptTemplate = ImageStudioTemplate & { label: string }
type CreativeMode = 'text' | 'localEdit'
type ReferenceRole = 'subject' | 'style' | 'composition' | 'character' | 'product'
type IconName = 'sparkles' | 'upload' | 'edit' | 'grid' | 'filter' | 'checkCircle' | 'exclamationCircle' | 'wallet'

const options = ref<ImageStudioOptions | null>(null)
const loadingOptions = ref(false)
const generating = ref(false)
const estimatedCost = ref(0)
const estimateTimer = ref<number | null>(null)
const imageFiles = ref<File[]>([])
const referenceImages = ref<ReferenceImage[]>([])
const maskFile = ref<File | null>(null)
const maskPreviewUrl = ref<string | null>(null)
const maskBrushSize = ref(48)
const maskCanvas = ref<HTMLCanvasElement | null>(null)
const maskImage = ref<HTMLImageElement | null>(null)
const maskHistory = ref<ImageData[]>([])
const hasPaintedMask = ref(false)
const isPaintingMask = ref(false)
const imagesInput = ref<HTMLInputElement | null>(null)
const maskInput = ref<HTMLInputElement | null>(null)
const promptTextarea = ref<HTMLTextAreaElement | null>(null)
const groupSelect = ref<HTMLSelectElement | null>(null)
const lastResult = ref<ImageGenerateResponse | null>(null)
const sessionResults = ref<SessionImageResult[]>([])
const historyItems = ref<ImageHistoryItem[]>([])
const creativeMode = ref<CreativeMode>('text')
const advancedPanelOpen = ref(false)
const settingsPopupOpen = ref(false)
const showTemplateLibrary = ref(false)
const appliedTemplate = ref<PromptTemplate | null>(null)
const remoteTemplates = ref<ImageStudioTemplate[]>([])
const selectedTemplate = ref<PromptTemplate | null>(null)
const templateTagFilter = ref('all')
const templateSearchQuery = ref('')
const previewImage = ref<PreviewImageState | null>(null)

const creativeModes = computed<Array<{ key: CreativeMode; label: string; description: string; placeholder: string; icon: IconName }>>(() => [
  { key: 'text', label: t('imageStudio.modeStartFromText'), description: t('imageStudio.modeStartFromTextDescription'), placeholder: t('imageStudio.promptPlaceholder'), icon: 'sparkles' },
  { key: 'localEdit', label: t('imageStudio.modeInpaint'), description: t('imageStudio.modeInpaintDescription'), placeholder: t('imageStudio.localEditPromptPlaceholder'), icon: 'edit' },
])
const activeModeMeta = computed(() => creativeModes.value.find(mode => mode.key === creativeMode.value) || creativeModes.value[0])
const referenceRoleOptions = computed<Array<{ key: ReferenceRole; label: string }>>(() => [
  { key: 'subject', label: t('imageStudio.referenceRoleSubject') },
  { key: 'style', label: t('imageStudio.referenceRoleStyle') },
  { key: 'composition', label: t('imageStudio.referenceRoleComposition') },
  { key: 'character', label: t('imageStudio.referenceRoleCharacter') },
  { key: 'product', label: t('imageStudio.referenceRoleProduct') },
])
const aspectRatioOptions = computed(() => [
  { value: '1:1', label: '1:1' },
  { value: '4:5', label: '4:5' },
  { value: '9:16', label: '9:16' },
  { value: '16:9', label: '16:9' },
])
const stylePresetOptions = computed(() => [
  { value: '', label: t('imageStudio.styleNone') },
  { value: 'photoreal', label: t('imageStudio.stylePhotoreal') },
  { value: 'commercial', label: t('imageStudio.styleCommercial') },
  { value: 'editorial', label: t('imageStudio.styleEditorial') },
  { value: 'illustration', label: t('imageStudio.styleIllustration') },
  { value: 'cinematic', label: t('imageStudio.styleCinematic') },
])

const fallbackPromptTemplates = computed<PromptTemplate[]>(() => imageStudioPromptExamples.map(example => ({
  key: example.key,
  mode: example.mode,
  title: t(example.labelKey),
  label: t(example.labelKey),
  model: example.model,
  image: example.image,
  prompt: example.prompt,
  source_name: example.sourceName,
  source_url: example.sourceUrl,
  source_type: 'local',
  meta: example.meta,
  requires_reference: false,
})))
const promptTemplates = computed<PromptTemplate[]>(() => {
  if (!remoteTemplates.value.length) return fallbackPromptTemplates.value
  return remoteTemplates.value.map(template => ({
    ...template,
    label: template.title || template.key,
  }))
})
const templateTagOptions = computed(() => {
  const tags = new Set<string>()
  for (const template of promptTemplates.value) {
    for (const tag of template.tags || []) {
      const clean = tag.trim().toLowerCase()
      if (clean) tags.add(clean)
    }
  }
  return ['all', ...[...tags].sort((a, b) => a.localeCompare(b))]
})
const visiblePromptTemplates = computed(() => {
  const query = templateSearchQuery.value.trim().toLowerCase()
  return promptTemplates.value.filter(template => {
    const tags = (template.tags || []).map(tag => tag.toLowerCase())
    if (templateTagFilter.value !== 'all' && !tags.includes(templateTagFilter.value)) return false
    if (!query) return true
    return [
      template.label,
      template.title,
      template.prompt,
      template.model,
      template.meta,
      template.source_name,
      ...tags,
    ].filter(Boolean).some(value => String(value).toLowerCase().includes(query))
  })
})

const promptDrafts = reactive<Record<CreativeMode, string>>({
  text: '',
  localEdit: '',
})

const form = reactive({
  group_id: 0,
  mode: 'generation' as 'generation' | 'edit',
  size: '2K' as ImageStudioSize,
  n: 1,
  quality: '',
  background: '',
  output_format: 'png',
  output_compression: 100,
  aspect_ratio: '1:1',
  style_preset: '',
})

const activePrompt = computed({
  get: () => promptDrafts[creativeMode.value],
  set: value => {
    promptDrafts[creativeMode.value] = value
    if (creativeMode.value === 'text' && appliedTemplate.value && value.trim() !== fillTemplatePrompt(appliedTemplate.value.prompt).trim()) {
      appliedTemplate.value = null
    }
  },
})

const latestSessionResult = computed(() => sessionResults.value[0] || null)
const sessionImageCount = computed(() => sessionResults.value.reduce((total, result) => total + result.images.length, 0))
const displayBalance = computed(() => lastResult.value?.new_balance ?? options.value?.balance ?? authStore.user?.balance ?? 0)
const hasReferenceImages = computed(() => imageFiles.value.length > 0)
const effectiveMode = computed<'generation' | 'edit'>(() => hasReferenceImages.value || maskFile.value || hasPaintedMask.value ? 'edit' : 'generation')
const wantsReferenceButEmpty = computed(() => creativeMode.value === 'localEdit' && !hasReferenceImages.value)
const showLocalEditPanel = computed(() => hasReferenceImages.value && (creativeMode.value === 'localEdit' || maskFile.value || hasPaintedMask.value))
const generationBlocker = computed(() => {
  if (loadingOptions.value) return t('imageStudio.blockerLoadingOptions')
  if (!form.group_id) return t('imageStudio.blockerNoGroup')
  if (!activePrompt.value.trim()) return t('imageStudio.blockerNoPrompt')
  if (wantsReferenceButEmpty.value) return t('imageStudio.blockerNeedsReference')
  if (estimatedCost.value > displayBalance.value) return t('imageStudio.blockerBalance')
  return ''
})
const canGenerate = computed(() => !generationBlocker.value)
const requestModeBadge = computed(() => {
  if (wantsReferenceButEmpty.value) return t('imageStudio.awaitingReferenceBadge')
  return hasReferenceImages.value ? t('imageStudio.editRequestBadge') : t('imageStudio.generationRequestBadge')
})
const outputSummary = computed(() => `${form.aspect_ratio} · ${form.size} · ${form.n}`)
const styleSummary = computed(() => stylePresetOptions.value.find(option => option.value === form.style_preset)?.label || t('imageStudio.styleNone'))
const selectedTemplatePromptPreview = computed(() => selectedTemplate.value ? fillTemplatePrompt(selectedTemplate.value.prompt) : '')
const isTemplateLibraryView = computed(() => creativeMode.value === 'text' && showTemplateLibrary.value)
const workspaceTitle = computed(() => isTemplateLibraryView.value ? t('imageStudio.templateGallery') : activeModeMeta.value.label)
const workspaceDescription = computed(() => isTemplateLibraryView.value ? t('imageStudio.templateGalleryHint', { count: visiblePromptTemplates.value.length }) : activeModeMeta.value.description)
const previewPrompt = computed(() => {
  if (!previewImage.value) return ''
  return previewImage.value.image.revised_prompt || previewImage.value.result.prompt_snapshot
})
const generateButtonLabel = computed(() => {
  if (!generating.value) return t('imageStudio.generate')
  return t('imageStudio.generatingProgress', { count: Math.max(1, Math.min(10, Number(form.n) || 1)) })
})
const promptProgressLabel = computed(() => `${activePrompt.value.length}/4000`)
const generationSkeletonCount = computed(() => Math.max(1, Math.min(10, Number(form.n) || 1)))
const maskStatusLabel = computed(() => {
  if (hasPaintedMask.value) return t('imageStudio.maskPainted')
  if (maskFile.value) return maskFile.value.name
  return t('imageStudio.maskNotSet')
})

function createReferenceImage(file: File): ReferenceImage {
  return {
    id: `${file.name}-${file.size}-${file.lastModified}-${crypto.randomUUID?.() || Date.now()}`,
    file,
    url: URL.createObjectURL(file),
    role: defaultReferenceRole(),
  }
}

function defaultReferenceRole(): ReferenceRole {
  if (creativeMode.value === 'localEdit') return 'subject'
  return 'composition'
}

function setReferenceImages(items: ReferenceImage[]) {
  for (const item of referenceImages.value) {
    if (!items.some(nextItem => nextItem.id === item.id)) URL.revokeObjectURL(item.url)
  }
  referenceImages.value = items
  imageFiles.value = items.map(item => item.file)
}

function addReferenceFiles(files: File[]) {
  const nextItems = validateFiles(files).map(createReferenceImage)
  if (!nextItems.length) return
  if (creativeMode.value === 'localEdit') {
    setReferenceImages([nextItems[0]])
    return
  }
  setReferenceImages([...referenceImages.value, ...nextItems])
}

async function loadOptions() {
  loadingOptions.value = true
  try {
    options.value = await imagesAPI.getOptions()
    if (!form.group_id && options.value.groups.length > 0) form.group_id = options.value.groups[0].id
    await refreshEstimate()
  } catch (err) {
    appStore.showError(extractApiErrorMessage(err, t('common.error')))
  } finally {
    loadingOptions.value = false
  }
}

async function loadTemplates() {
  try {
    remoteTemplates.value = await imagesAPI.getTemplates()
    selectedTemplate.value ||= visiblePromptTemplates.value[0] || null
  } catch {
    remoteTemplates.value = []
  }
}

async function refreshEstimate() {
  if (!form.group_id) {
    estimatedCost.value = 0
    return
  }
  try {
    const res = await imagesAPI.estimate({
      group_id: form.group_id,
      mode: effectiveMode.value,
      size: form.size,
      n: Number(form.n) || 1,
    })
    estimatedCost.value = res.estimated_cost
  } catch {
    estimatedCost.value = 0
  }
}

function scheduleEstimate() {
  if (estimateTimer.value) window.clearTimeout(estimateTimer.value)
  estimateTimer.value = window.setTimeout(refreshEstimate, 250)
}

function validateFiles(files: File[]): File[] {
  const valid: File[] = []
  for (const file of files) {
    if (file.size > maxFileSize) {
      appStore.showError(t('imageStudio.fileTooLarge', { name: file.name }))
      continue
    }
    valid.push(file)
  }
  return valid
}

function onImagesPicked(event: Event) {
  const input = event.target as HTMLInputElement
  addReferenceFiles(Array.from(input.files || []))
  input.value = ''
}

function onImagesDropped(event: DragEvent) {
  addReferenceFiles(Array.from(event.dataTransfer?.files || []).filter(file => file.type.startsWith('image/')))
}

function onImagesPasted(event: ClipboardEvent) {
  const files = Array.from(event.clipboardData?.files || []).filter(file => file.type.startsWith('image/'))
  if (!files.length) return
  addReferenceFiles(files)
  appStore.showSuccess(t('imageStudio.pasteSuccess', { count: files.length }))
}

function onMaskPicked(event: Event) {
  const input = event.target as HTMLInputElement
  const [file] = validateFiles(Array.from(input.files || []))
  maskFile.value = file || null
  input.value = ''
}

function removeImage(id: string) {
  const wasMaskSource = referenceImages.value[0]?.id === id
  setReferenceImages(referenceImages.value.filter(item => item.id !== id))
  if (wasMaskSource) clearMask()
}

function moveReferenceImage(index: number, direction: -1 | 1) {
  const nextIndex = index + direction
  if (nextIndex < 0 || nextIndex >= referenceImages.value.length) return
  const items = [...referenceImages.value]
  const [item] = items.splice(index, 1)
  items.splice(nextIndex, 0, item)
  setReferenceImages(items)
}

function openTemplateGallery() {
  creativeMode.value = 'text'
  showTemplateLibrary.value = true
  if (!selectedTemplate.value || !visiblePromptTemplates.value.some(template => template.key === selectedTemplate.value?.key)) {
    selectedTemplate.value = visiblePromptTemplates.value[0] || null
  }
}

function closeTemplateGallery() {
  showTemplateLibrary.value = false
  void nextTick(() => promptTextarea.value?.focus())
}

function selectTemplate(template: PromptTemplate) {
  selectedTemplate.value = template
}

function applyPromptTemplate(template: PromptTemplate, action: 'replace' | 'append' = 'replace') {
  const prompt = fillTemplatePrompt(template.prompt)
  creativeMode.value = 'text'
  promptDrafts.text = action === 'append' && promptDrafts.text.trim()
    ? `${promptDrafts.text.trim()}\n\n${prompt}`
    : prompt
  appliedTemplate.value = template
  showTemplateLibrary.value = false
  void nextTick(() => promptTextarea.value?.focus())
}

function useSelectedTemplate() {
  if (!selectedTemplate.value) return
  applyPromptTemplate(selectedTemplate.value)
}

function selectCreativeMode(mode: CreativeMode) {
  creativeMode.value = mode
  if (mode === 'localEdit') {
    showTemplateLibrary.value = false
    void openLocalEditWorkspace()
    return
  }
  if (mode === 'text') {
    void nextTick(() => promptTextarea.value?.focus())
  }
}

function onAdvancedPanelToggle(event: Event) {
  advancedPanelOpen.value = (event.target as HTMLDetailsElement).open
}

function openSettingsPopup() {
  settingsPopupOpen.value = true
}

function closeSettingsPopup() {
  settingsPopupOpen.value = false
}

async function openLocalEditWorkspace() {
  creativeMode.value = 'localEdit'
  await nextTick()
}

async function buildFormDataWithPrompt(prompt: string) {
  const data = new FormData()
  data.set('group_id', String(form.group_id))
  data.set('mode', effectiveMode.value)
  data.set('prompt', prompt)
  data.set('size', form.size)
  data.set('n', String(Math.max(1, Math.min(10, Number(form.n) || 1))))
  data.set('output_format', form.output_format)
  if (form.quality) data.set('quality', form.quality)
  if (form.background) data.set('background', form.background)
  if (form.output_compression !== null && form.output_compression !== undefined) data.set('output_compression', String(form.output_compression))
  for (const file of imageFiles.value) data.append('images', file)
  const paintedMask = await createPaintedMaskFile()
  if (paintedMask) data.set('mask', paintedMask)
  else if (maskFile.value) data.set('mask', maskFile.value)
  return data
}

function buildPromptForRequest(): string {
  const parts = [activePrompt.value.trim()]
  if (form.aspect_ratio) parts.push(t('imageStudio.promptAspectRatioInstruction', { ratio: form.aspect_ratio }))
  if (form.style_preset) parts.push(t(`imageStudio.styleInstruction.${form.style_preset}`))
  const roleNotes = referenceImages.value
    .map((image, index) => t('imageStudio.promptReferenceRoleInstruction', {
      index: index + 1,
      role: referenceRoleOptions.value.find(role => role.key === image.role)?.label || image.role,
    }))
  if (roleNotes.length) parts.push(roleNotes.join('\n'))
  return parts.filter(Boolean).join('\n\n')
}

async function generateImage() {
  if (!canGenerate.value) {
    if (generationBlocker.value) appStore.showError(generationBlocker.value)
    return
  }
  generating.value = true
  try {
    const promptSnapshot = buildPromptForRequest()
    const result = await imagesAPI.generate(await buildFormDataWithPrompt(promptSnapshot))
    lastResult.value = result
    sessionResults.value = [{
      ...result,
      prompt_snapshot: promptSnapshot,
      output_format_snapshot: form.output_format || 'png',
      created_at: Date.now(),
    }, ...sessionResults.value]
    saveHistory(result)
    options.value = options.value ? { ...options.value, balance: result.new_balance } : options.value
    await authStore.refreshUser().catch(() => undefined)
    appStore.showSuccess(t('imageStudio.generateSuccess'))
  } catch (err) {
    const error = err as { code?: string; message?: string }
    if (error?.code === 'ECONNABORTED' || error?.message?.includes('timeout')) {
      appStore.showError(t('imageStudio.generateTimeout'))
    } else {
      appStore.showError(extractApiErrorMessage(err, t('common.error')))
    }
  } finally {
    generating.value = false
  }
}

function imageSrc(image: ImageGenerateResult, outputFormat = form.output_format): string {
  if (image.url) return image.url
  const format = outputFormat === 'jpeg' ? 'jpeg' : outputFormat === 'webp' ? 'webp' : 'png'
  return `data:image/${format};base64,${image.b64_json || ''}`
}

function imageDownloadName(index: number, outputFormat = form.output_format, resultIndex = 0): string {
  const batch = sessionResults.value.length - resultIndex
  return `gpt-image-2-${batch}-${index + 1}.${outputFormat || 'png'}`
}

async function imageToBlob(image: ImageGenerateResult, outputFormat = form.output_format): Promise<Blob> {
  if (image.b64_json) {
    const response = await fetch(imageSrc(image, outputFormat))
    return response.blob()
  }
  if (!image.url) throw new Error('No image data')
  const response = await fetch(image.url)
  return response.blob()
}

async function copyPrompt(prompt: string) {
  await copyToClipboard(prompt)
}

async function copyImage(image: ImageGenerateResult, outputFormat = form.output_format) {
  try {
    const blob = await imageToBlob(image, outputFormat)
    if (!navigator.clipboard || !('write' in navigator.clipboard) || !window.ClipboardItem) {
      appStore.showError(t('imageStudio.copyImageUnsupported'))
      return
    }
    const pngBlob = blob.type === 'image/png' ? blob : await blobToPng(blob)
    await navigator.clipboard.write([new ClipboardItem({ [pngBlob.type]: pngBlob })])
    appStore.showSuccess(t('imageStudio.copyImageSuccess'))
  } catch {
    appStore.showError(t('imageStudio.copyImageFailed'))
  }
}

async function blobToPng(blob: Blob): Promise<Blob> {
  const bitmap = await createImageBitmap(blob)
  const canvas = document.createElement('canvas')
  canvas.width = bitmap.width
  canvas.height = bitmap.height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas unavailable')
  ctx.drawImage(bitmap, 0, 0)
  const pngBlob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/png'))
  if (!pngBlob) throw new Error('PNG conversion failed')
  return pngBlob
}

async function useResultAsReference(result: SessionImageResult, image: ImageGenerateResult, index: number, includePrompt = false) {
  try {
    const blob = await imageToBlob(image, result.output_format_snapshot)
    const type = blob.type || `image/${result.output_format_snapshot || 'png'}`
    const resultIndex = sessionResults.value.indexOf(result)
    const file = new File([blob], imageDownloadName(index, result.output_format_snapshot, resultIndex), { type })
    creativeMode.value = 'text'
    addReferenceFiles([file])
    if (includePrompt) promptDrafts.text = image.revised_prompt || result.prompt_snapshot
    appStore.showSuccess(t('imageStudio.referenceAdded'))
  } catch {
    appStore.showError(t('imageStudio.referenceAddFailed'))
  }
}

function openResultPreview(result: SessionImageResult, image: ImageGenerateResult, index: number) {
  previewImage.value = {
    result,
    image,
    index,
    resultIndex: sessionResults.value.indexOf(result),
    src: imageSrc(image, result.output_format_snapshot),
  }
}

function closeResultPreview() {
  previewImage.value = null
}

async function usePreviewAsReference(includePrompt: boolean) {
  if (!previewImage.value) return
  await useResultAsReference(previewImage.value.result, previewImage.value.image, previewImage.value.index, includePrompt)
  closeResultPreview()
}

async function downloadAllImages() {
  if (!sessionResults.value.length) return
  try {
    for (const [resultIndex, result] of sessionResults.value.entries()) {
      for (const [index, image] of result.images.entries()) {
        saveAs(await imageToBlob(image, result.output_format_snapshot), imageDownloadName(index, result.output_format_snapshot, resultIndex))
      }
    }
  } catch {
    appStore.showError(t('imageStudio.downloadFailed'))
  }
}

function clearSessionResults() {
  sessionResults.value = []
  lastResult.value = null
}

function formatSessionTime(value: number): string {
  return new Intl.DateTimeFormat(undefined, { hour: '2-digit', minute: '2-digit' }).format(new Date(value))
}

function handleBeforeUnload(event: BeforeUnloadEvent) {
  if (!sessionResults.value.length) return
  event.preventDefault()
  event.returnValue = ''
}

function loadHistory() {
  try {
    const raw = localStorage.getItem(historyStorageKey)
    historyItems.value = raw ? JSON.parse(raw).slice(0, 8) : []
  } catch {
    historyItems.value = []
  }
}

function persistHistory() {
  localStorage.setItem(historyStorageKey, JSON.stringify(historyItems.value.slice(0, 8)))
}

function saveHistory(result: ImageGenerateResponse) {
  const prompt = activePrompt.value.trim()
  const item: ImageHistoryItem = {
    id: result.request_id || String(Date.now()),
    prompt,
    mode: effectiveMode.value,
    size: form.size,
    n: Math.max(1, Math.min(10, Number(form.n) || 1)),
    quality: form.quality,
    background: form.background,
    outputFormat: form.output_format,
    outputCompression: Number(form.output_compression) || 100,
    actualCost: result.actual_cost,
    createdAt: Date.now(),
  }
  historyItems.value = [item, ...historyItems.value.filter(history => history.prompt !== item.prompt)].slice(0, 8)
  persistHistory()
}

function restoreHistory(item: ImageHistoryItem) {
  creativeMode.value = 'text'
  promptDrafts.text = item.prompt
  appliedTemplate.value = null
  showTemplateLibrary.value = false
  form.size = item.size
  form.n = item.n
  form.quality = item.quality
  form.background = item.background
  form.output_format = item.outputFormat
  form.output_compression = item.outputCompression
}

function fillTemplatePrompt(prompt: string): string {
  return prompt
    .replace(/\{argument name="([^"]+)" default="([^"]*)"\}/g, (_match, key: string, fallback: string) => fallback || `[${key}]`)
}

function clearHistory() {
  historyItems.value = []
  localStorage.removeItem(historyStorageKey)
}

function getMaskContext(): CanvasRenderingContext2D | null {
  return maskCanvas.value?.getContext('2d') || null
}

function resetMaskCanvas() {
  const canvas = maskCanvas.value
  const image = maskImage.value
  if (!canvas || !image || !image.naturalWidth || !image.naturalHeight) return
  canvas.width = image.naturalWidth
  canvas.height = image.naturalHeight
  getMaskContext()?.clearRect(0, 0, canvas.width, canvas.height)
  maskHistory.value = []
  hasPaintedMask.value = false
  isPaintingMask.value = false
}

function eventToMaskPoint(event: PointerEvent) {
  const canvas = maskCanvas.value
  if (!canvas) return null
  const rect = canvas.getBoundingClientRect()
  if (!rect.width || !rect.height) return null
  return {
    x: ((event.clientX - rect.left) / rect.width) * canvas.width,
    y: ((event.clientY - rect.top) / rect.height) * canvas.height,
  }
}

function pushMaskHistory() {
  const canvas = maskCanvas.value
  const ctx = getMaskContext()
  if (!canvas || !ctx) return
  maskHistory.value = [...maskHistory.value.slice(-19), ctx.getImageData(0, 0, canvas.width, canvas.height)]
}

function startMaskStroke(event: PointerEvent) {
  const point = eventToMaskPoint(event)
  const ctx = getMaskContext()
  if (!point || !ctx) return
  event.preventDefault()
  maskCanvas.value?.setPointerCapture?.(event.pointerId)
  pushMaskHistory()
  isPaintingMask.value = true
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  ctx.strokeStyle = 'rgba(14, 165, 233, 0.58)'
  ctx.lineWidth = maskBrushSize.value
  ctx.beginPath()
  ctx.moveTo(point.x, point.y)
  ctx.lineTo(point.x, point.y)
  ctx.stroke()
  hasPaintedMask.value = true
}

function paintMaskStroke(event: PointerEvent) {
  if (!isPaintingMask.value) return
  const point = eventToMaskPoint(event)
  const ctx = getMaskContext()
  if (!point || !ctx) return
  event.preventDefault()
  ctx.lineWidth = maskBrushSize.value
  ctx.lineTo(point.x, point.y)
  ctx.stroke()
}

function endMaskStroke(event?: PointerEvent) {
  if (!isPaintingMask.value) return
  isPaintingMask.value = false
  if (event) maskCanvas.value?.releasePointerCapture?.(event.pointerId)
}

function undoMaskStroke() {
  const canvas = maskCanvas.value
  const ctx = getMaskContext()
  const previous = maskHistory.value.at(-1)
  if (!canvas || !ctx || !previous) return
  ctx.putImageData(previous, 0, 0)
  maskHistory.value = maskHistory.value.slice(0, -1)
  hasPaintedMask.value = hasMaskPixels()
}

function hasMaskPixels(): boolean {
  const canvas = maskCanvas.value
  const ctx = getMaskContext()
  if (!canvas || !ctx) return false
  const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height).data
  for (let i = 3; i < pixels.length; i += 4) {
    if (pixels[i] > 0) return true
  }
  return false
}

function clearMask() {
  const canvas = maskCanvas.value
  getMaskContext()?.clearRect(0, 0, canvas?.width || 0, canvas?.height || 0)
  maskHistory.value = []
  hasPaintedMask.value = false
  isPaintingMask.value = false
  maskFile.value = null
}

async function createPaintedMaskFile(): Promise<File | null> {
  const source = maskCanvas.value
  if (!source || !hasPaintedMask.value) return null
  const sourceCtx = getMaskContext()
  if (!sourceCtx) return null
  const sourcePixels = sourceCtx.getImageData(0, 0, source.width, source.height)
  const output = document.createElement('canvas')
  output.width = source.width
  output.height = source.height
  const outputCtx = output.getContext('2d')
  if (!outputCtx) return null
  const maskPixels = outputCtx.createImageData(output.width, output.height)
  for (let i = 0; i < maskPixels.data.length; i += 4) {
    maskPixels.data[i] = 255
    maskPixels.data[i + 1] = 255
    maskPixels.data[i + 2] = 255
    maskPixels.data[i + 3] = sourcePixels.data[i + 3] > 0 ? 0 : 255
  }
  outputCtx.putImageData(maskPixels, 0, 0)
  const blob = await new Promise<Blob | null>(resolve => output.toBlob(resolve, 'image/png'))
  return blob ? new File([blob], 'image-studio-mask.png', { type: 'image/png' }) : null
}

watch(() => [form.group_id, form.size, form.n, effectiveMode.value], scheduleEstimate)
watch(() => imageFiles.value[0], async file => {
  if (maskPreviewUrl.value) {
    const managedByReferenceImages = referenceImages.value.some(item => item.url === maskPreviewUrl.value)
    if (!managedByReferenceImages) URL.revokeObjectURL(maskPreviewUrl.value)
    maskPreviewUrl.value = null
  }
  clearMask()
  if (file) {
    maskPreviewUrl.value = referenceImages.value[0]?.url || URL.createObjectURL(file)
    await nextTick()
  }
})
onMounted(() => {
  loadHistory()
  window.addEventListener('paste', onImagesPasted)
  window.addEventListener('beforeunload', handleBeforeUnload)
  void loadOptions()
  void loadTemplates()
})
onBeforeUnmount(() => {
  if (maskPreviewUrl.value && maskPreviewUrl.value !== referenceImages.value[0]?.url) URL.revokeObjectURL(maskPreviewUrl.value)
  for (const item of referenceImages.value) URL.revokeObjectURL(item.url)
  window.removeEventListener('paste', onImagesPasted)
  window.removeEventListener('beforeunload', handleBeforeUnload)
})
</script>

<style scoped>
@media (min-width: 1024px) {
  .image-studio-template-workspace {
    height: calc(100dvh - 9rem);
    min-height: 0;
    overflow: hidden;
  }

  .image-studio-template-library {
    height: 100%;
    min-height: 0;
  }

  .image-studio-scroll-pane {
    scrollbar-gutter: stable;
    overscroll-behavior: contain;
  }

  .image-studio-sticky-toolbar {
    box-shadow: 0 12px 16px -18px rgb(15 23 42 / 0.35);
  }
}

.template-filter-chip {
  @apply shrink-0 rounded border border-gray-200 bg-white px-2.5 py-1 text-xs font-medium text-gray-600 transition hover:border-primary-300 hover:text-primary-700 dark:border-dark-600 dark:bg-dark-800 dark:text-dark-200 dark:hover:border-primary-700 dark:hover:text-primary-300;
}

.template-filter-chip-active {
  @apply border-primary-300 bg-primary-50 text-primary-700 dark:border-primary-700 dark:bg-primary-950/40 dark:text-primary-300;
}

.template-mini-tag {
  @apply inline-flex items-center rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium text-gray-500 dark:bg-dark-700 dark:text-gray-300;
}

.image-studio-link {
  @apply inline-flex items-center gap-1 rounded px-1.5 py-1 text-xs font-medium text-primary-600 transition hover:bg-primary-50 hover:text-primary-700 disabled:pointer-events-none disabled:opacity-50 dark:text-primary-400 dark:hover:bg-primary-950/40 dark:hover:text-primary-300;
}

.image-studio-workspace-surface {
  @apply flex min-h-[420px] items-center justify-center md:min-h-[540px] xl:min-h-[540px] xl:h-full xl:flex-1;
}

.image-studio-workspace-fill {
  @apply items-stretch justify-stretch;
}

.image-studio-mode-button {
  @apply flex min-h-[48px] items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-left text-sm font-medium text-gray-600 transition hover:border-primary-300 hover:bg-primary-50/60 hover:text-primary-700 dark:border-dark-700 dark:bg-dark-900 dark:text-gray-300 dark:hover:border-primary-700 dark:hover:bg-primary-950/30 dark:hover:text-primary-300;
}

.image-studio-mode-button-active {
  @apply border-primary-300 bg-primary-50 text-primary-700 ring-1 ring-primary-200 dark:border-primary-700 dark:bg-primary-950/40 dark:text-primary-300 dark:ring-primary-900;
}

.image-studio-mode-pill {
  @apply inline-flex min-h-[36px] shrink-0 items-center gap-1.5 rounded-full border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 transition hover:border-primary-300 hover:bg-primary-50/60 hover:text-primary-700 dark:border-dark-700 dark:bg-dark-900 dark:text-gray-300 dark:hover:border-primary-700 dark:hover:bg-primary-950/30 dark:hover:text-primary-300;
}

.image-studio-mode-pill-active {
  @apply border-primary-300 bg-primary-50 text-primary-700 ring-1 ring-primary-200 dark:border-primary-700 dark:bg-primary-950/40 dark:text-primary-300 dark:ring-primary-900;
}

.image-studio-mode-tab {
  @apply inline-flex min-h-[36px] items-center justify-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium text-gray-500 transition hover:bg-white hover:text-gray-900 dark:text-gray-400 dark:hover:bg-dark-800 dark:hover:text-white;
}

.image-studio-mode-tab-active {
  @apply bg-white text-primary-700 shadow-sm dark:bg-dark-800 dark:text-primary-300;
}

.image-studio-settings-summary {
  @apply grid min-h-[54px] grid-cols-[minmax(0,1fr)_auto] items-center rounded-lg bg-gray-50 px-3 py-2 text-left transition hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-100 dark:bg-dark-900 dark:hover:bg-dark-700 dark:focus:ring-primary-950;
}

.image-studio-settings-summary span {
  @apply col-span-2 text-gray-500 dark:text-gray-400;
}

.image-studio-settings-summary strong {
  @apply min-w-0 truncate font-semibold text-gray-900 dark:text-white;
}

.image-studio-prompt-input {
  @apply bg-white focus:border-primary-400 focus:ring-2 focus:ring-primary-100 dark:bg-dark-900 dark:focus:border-primary-700 dark:focus:ring-primary-950;
}

.image-studio-dropzone {
  background-image: linear-gradient(135deg, rgb(249 250 251 / 0.72), rgb(255 255 255 / 0.95));
}

.dark .image-studio-dropzone {
  background-image: linear-gradient(135deg, rgb(17 24 39 / 0.72), rgb(15 23 42 / 0.32));
}

.image-studio-result-card {
  transition: transform 180ms ease, box-shadow 180ms ease, border-color 180ms ease;
}

.image-studio-result-card:hover {
  transform: translateY(-1px);
  box-shadow: 0 16px 28px -24px rgb(15 23 42 / 0.55);
}

.image-studio-chip {
  @apply inline-flex min-h-[40px] items-center justify-center rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-medium text-gray-600 transition hover:border-primary-300 hover:bg-primary-50/60 hover:text-primary-700 dark:border-dark-700 dark:bg-dark-900 dark:text-gray-300 dark:hover:border-primary-700 dark:hover:bg-primary-950/30 dark:hover:text-primary-300;
}

.image-studio-chip-active {
  @apply border-primary-300 bg-primary-50 text-primary-700 ring-1 ring-primary-200 dark:border-primary-700 dark:bg-primary-950/40 dark:text-primary-300 dark:ring-primary-900;
}

.image-studio-setting-block {
  @apply rounded-lg p-1 transition;
}

.image-studio-setting-highlight {
  @apply bg-primary-50 ring-2 ring-primary-200 dark:bg-primary-950/30 dark:ring-primary-900;
}

.image-studio-generating-orbit {
  @apply inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white text-primary-600 shadow-sm dark:bg-dark-900 dark:text-primary-300;
  animation: image-studio-pulse 1.5s ease-in-out infinite;
}

.image-studio-result-skeleton {
  @apply overflow-hidden;
}

.image-studio-result-skeleton div,
.image-studio-result-skeleton span {
  position: relative;
  overflow: hidden;
}

.image-studio-result-skeleton div::after,
.image-studio-result-skeleton span::after {
  content: '';
  position: absolute;
  inset: 0;
  transform: translateX(-100%);
  background: linear-gradient(90deg, transparent, rgb(255 255 255 / 0.7), transparent);
  animation: image-studio-shimmer 1.6s ease-in-out infinite;
}

.dark .image-studio-result-skeleton div::after,
.dark .image-studio-result-skeleton span::after {
  background: linear-gradient(90deg, transparent, rgb(255 255 255 / 0.08), transparent);
}

@keyframes image-studio-pulse {
  0%,
  100% {
    transform: scale(1);
    opacity: 1;
  }
  50% {
    transform: scale(1.06);
    opacity: 0.82;
  }
}

@keyframes image-studio-shimmer {
  100% {
    transform: translateX(100%);
  }
}

@media (prefers-reduced-motion: reduce) {
  .image-studio-generating-orbit,
  .image-studio-result-skeleton div::after,
  .image-studio-result-skeleton span::after {
    animation: none;
  }
}

@media (min-width: 1024px) {
  .image-studio-template-preview {
    max-height: min(13rem, 24dvh);
  }
}

@media (max-width: 1023px) {
  .image-studio-template-workspace {
    min-height: calc(100dvh - 8rem);
  }

  .image-studio-template-library {
    height: auto;
    overflow: visible;
  }

  .image-studio-template-grid {
    overflow: visible;
  }

  .image-studio-template-sidebar,
  .image-studio-template-list,
  .image-studio-template-detail {
    max-height: none;
  }
}
</style>
