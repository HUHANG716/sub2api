<template>
  <aside
    class="sidebar"
    :class="[
      sidebarCollapsed ? 'w-[72px]' : 'w-64',
      { '-translate-x-full lg:translate-x-0': !mobileOpen }
    ]"
  >
    <!-- Logo/Brand -->
    <div class="sidebar-header" :class="{ 'sidebar-header-collapsed': sidebarCollapsed }">
      <!-- Custom Logo or Default Logo -->
      <div
        class="sidebar-logo flex h-9 w-9 items-center justify-center overflow-hidden rounded-xl shadow-glow"
        :class="{ 'sidebar-logo-collapsed': sidebarCollapsed }"
      >
        <img v-if="settingsLoaded" :src="siteLogo || '/logo.png'" alt="Logo" class="h-full w-full object-contain" />
      </div>
      <div class="sidebar-brand" :class="{ 'sidebar-brand-collapsed': sidebarCollapsed }" :aria-hidden="sidebarCollapsed ? 'true' : 'false'">
        <span class="sidebar-brand-title text-lg font-bold text-gray-900 dark:text-white">
          {{ siteName }}
        </span>
        <!-- Version Badge -->
        <VersionBadge :version="siteVersion" />
      </div>
      <button
        @click="toggleSidebar"
        class="sidebar-collapse-button"
        :class="{ 'sidebar-collapse-button-collapsed': sidebarCollapsed }"
        :title="sidebarCollapsed ? t('nav.expand') : t('nav.collapse')"
        :aria-label="sidebarCollapsed ? t('nav.expand') : t('nav.collapse')"
      >
        <ChevronDoubleLeftIcon v-if="!sidebarCollapsed" class="h-4 w-4 flex-shrink-0" />
        <ChevronDoubleRightIcon v-else class="h-4 w-4 flex-shrink-0" />
      </button>
    </div>

    <!-- Navigation -->
    <nav ref="sidebarNavRef" class="sidebar-nav scrollbar-hide">
      <!-- Admin View: Admin menu first, then personal menu -->
      <template v-if="isAdmin">
        <!-- Admin Section -->
        <div class="sidebar-section">
          <template v-for="item in adminNavItems" :key="item.path">
            <!-- Collapsible group (has children) -->
            <template v-if="item.children?.length">
              <button
                type="button"
                class="sidebar-link mb-1 w-full"
                :class="{
                  'sidebar-link-active': isGroupActive(item) && !isGroupExpanded(item),
                  'sidebar-link-collapsed': sidebarCollapsed
                }"
                :title="sidebarCollapsed ? item.label : undefined"
                @click="handleGroupClick(item)"
              >
                <component :is="item.icon" class="h-5 w-5 flex-shrink-0" />
                <span
                  class="sidebar-label sidebar-label-flex"
                  :class="{ 'sidebar-label-collapsed': sidebarCollapsed }"
                  :aria-hidden="sidebarCollapsed ? 'true' : 'false'"
                >
                  <span class="min-w-0 truncate">{{ item.label }}</span>
                  <ChevronDownIcon
                    class="h-4 w-4 flex-shrink-0 transition-transform duration-200"
                    :class="isGroupExpanded(item) ? 'rotate-180' : ''"
                  />
                </span>
              </button>
              <!-- Children -->
              <div v-if="!sidebarCollapsed && isGroupExpanded(item)" class="mb-1 ml-4 border-l border-gray-200 pl-2 dark:border-dark-600">
                <router-link
                  v-for="child in item.children"
                  :key="child.path"
                  :to="child.path"
                  class="sidebar-link mb-0.5 py-1.5 text-sm"
                  :class="{ 'sidebar-link-active': route.path === child.path }"
                  @click="handleMenuItemClick(child.path)"
                >
                  <component :is="child.icon" class="h-4 w-4 flex-shrink-0" />
                  <span>{{ child.label }}</span>
                </router-link>
              </div>
            </template>
            <template v-else-if="item.external">
              <a
                :href="item.path"
                target="_blank"
                rel="noopener noreferrer"
                class="sidebar-link mb-1"
                :class="{ 'sidebar-link-collapsed': sidebarCollapsed }"
                :title="sidebarCollapsed ? item.label : undefined"
                @click="handleMenuItemClick(item.path)"
              >
                <span v-if="item.iconSvg" class="h-5 w-5 flex-shrink-0 sidebar-svg-icon" v-html="sanitizeSvg(item.iconSvg)"></span>
                <component v-else :is="item.icon" class="h-5 w-5 flex-shrink-0" />
                <span class="sidebar-label" :class="{ 'sidebar-label-collapsed': sidebarCollapsed }" :aria-hidden="sidebarCollapsed ? 'true' : 'false'">{{ item.label }}</span>
              </a>
            </template>
            <router-link
              v-else
              :to="item.path"
              class="sidebar-link mb-1"
              :class="{ 'sidebar-link-active': isActive(item.path), 'sidebar-link-collapsed': sidebarCollapsed }"
              :title="sidebarCollapsed ? item.label : undefined"
              :id="
                item.path === '/admin/accounts'
                  ? 'sidebar-channel-manage'
                  : item.path === '/admin/groups'
                    ? 'sidebar-group-manage'
                    : item.path === '/admin/redeem'
                      ? 'sidebar-wallet'
                      : undefined
              "
              @click="handleMenuItemClick(item.path)"
            >
              <span v-if="item.iconSvg" class="h-5 w-5 flex-shrink-0 sidebar-svg-icon" v-html="sanitizeSvg(item.iconSvg)"></span>
              <component v-else :is="item.icon" class="h-5 w-5 flex-shrink-0" />
              <span class="sidebar-label" :class="{ 'sidebar-label-collapsed': sidebarCollapsed }" :aria-hidden="sidebarCollapsed ? 'true' : 'false'">{{ item.label }}</span>
            </router-link>
          </template>
        </div>

        <!-- Personal Section for Admin (hidden in simple mode) -->
        <div v-if="!authStore.isSimpleMode" class="sidebar-section">
          <div class="sidebar-section-title" :class="{ 'sidebar-section-title-collapsed': sidebarCollapsed }" :aria-hidden="sidebarCollapsed ? 'true' : 'false'">
            <span class="sidebar-section-title-text" :class="{ 'sidebar-section-title-text-collapsed': sidebarCollapsed }">
              {{ t('nav.myAccount') }}
            </span>
          </div>

          <template v-for="item in personalNavItems" :key="item.path">
            <a
              v-if="item.external"
              :href="item.path"
              target="_blank"
              rel="noopener noreferrer"
              class="sidebar-link mb-1"
              :class="{ 'sidebar-link-collapsed': sidebarCollapsed }"
              :title="sidebarCollapsed ? item.label : undefined"
              @click="handleMenuItemClick(item.path)"
            >
              <span v-if="item.iconSvg" class="h-5 w-5 flex-shrink-0 sidebar-svg-icon" v-html="sanitizeSvg(item.iconSvg)"></span>
              <component v-else :is="item.icon" class="h-5 w-5 flex-shrink-0" />
              <span class="sidebar-label" :class="{ 'sidebar-label-collapsed': sidebarCollapsed }" :aria-hidden="sidebarCollapsed ? 'true' : 'false'">{{ item.label }}</span>
            </a>
            <router-link
              v-else
              :to="item.path"
              class="sidebar-link mb-1"
              :class="{ 'sidebar-link-active': isActive(item.path), 'sidebar-link-collapsed': sidebarCollapsed }"
              :title="sidebarCollapsed ? item.label : undefined"
              :data-tour="item.path === '/keys' ? 'sidebar-my-keys' : undefined"
              @click="handleMenuItemClick(item.path)"
            >
              <span v-if="item.iconSvg" class="h-5 w-5 flex-shrink-0 sidebar-svg-icon" v-html="sanitizeSvg(item.iconSvg)"></span>
              <component v-else :is="item.icon" class="h-5 w-5 flex-shrink-0" />
              <span class="sidebar-label" :class="{ 'sidebar-label-collapsed': sidebarCollapsed }" :aria-hidden="sidebarCollapsed ? 'true' : 'false'">{{ item.label }}</span>
            </router-link>
          </template>
        </div>
      </template>

      <!-- Regular User View -->
      <template v-else-if="!appStore.backendModeEnabled">
        <div class="sidebar-section">
          <template v-for="item in userNavItems" :key="item.path">
            <a
              v-if="item.external"
              :href="item.path"
              target="_blank"
              rel="noopener noreferrer"
              class="sidebar-link mb-1"
              :class="{ 'sidebar-link-collapsed': sidebarCollapsed }"
              :title="sidebarCollapsed ? item.label : undefined"
              @click="handleMenuItemClick(item.path)"
            >
              <span v-if="item.iconSvg" class="h-5 w-5 flex-shrink-0 sidebar-svg-icon" v-html="sanitizeSvg(item.iconSvg)"></span>
              <component v-else :is="item.icon" class="h-5 w-5 flex-shrink-0" />
              <span class="sidebar-label" :class="{ 'sidebar-label-collapsed': sidebarCollapsed }" :aria-hidden="sidebarCollapsed ? 'true' : 'false'">{{ item.label }}</span>
            </a>
            <router-link
              v-else
              :to="item.path"
              class="sidebar-link mb-1"
              :class="{ 'sidebar-link-active': isActive(item.path), 'sidebar-link-collapsed': sidebarCollapsed }"
              :title="sidebarCollapsed ? item.label : undefined"
              :data-tour="item.path === '/keys' ? 'sidebar-my-keys' : undefined"
              @click="handleMenuItemClick(item.path)"
            >
              <span v-if="item.iconSvg" class="h-5 w-5 flex-shrink-0 sidebar-svg-icon" v-html="sanitizeSvg(item.iconSvg)"></span>
              <component v-else :is="item.icon" class="h-5 w-5 flex-shrink-0" />
              <span class="sidebar-label" :class="{ 'sidebar-label-collapsed': sidebarCollapsed }" :aria-hidden="sidebarCollapsed ? 'true' : 'false'">{{ item.label }}</span>
            </router-link>
          </template>
        </div>
      </template>
    </nav>

    <!-- Bottom Section -->
    <div class="sidebar-account-section" ref="accountDropdownRef">
      <button
        v-if="user"
        @click="toggleAccountDropdown"
        class="sidebar-account-button"
        :class="{ 'sidebar-account-button-collapsed': sidebarCollapsed }"
        aria-label="User Menu"
      >
        <div class="sidebar-account-avatar">
          <img
            v-if="avatarUrl"
            :src="avatarUrl"
            :alt="displayName"
            class="h-full w-full object-cover"
          >
          <DefaultHashAvatar
            v-else
            :seed="avatarSeed"
            :label="displayName"
          />
        </div>
        <span class="sidebar-account-copy" :class="{ 'sidebar-account-copy-collapsed': sidebarCollapsed }">
          <span class="sidebar-account-name">{{ displayName }}</span>
          <span class="sidebar-account-balance">
            <Icon name="wallet" size="xs" class="sidebar-account-balance-icon" />
            ${{ user.balance?.toFixed(2) || '0.00' }}
          </span>
        </span>
        <Icon
          name="chevronDown"
          size="sm"
          class="sidebar-account-chevron"
          :class="[
            accountDropdownOpen ? 'rotate-180' : '',
            { 'sidebar-account-chevron-collapsed': sidebarCollapsed }
          ]"
        />
      </button>

      <transition name="dropdown">
        <div v-if="user && accountDropdownOpen" class="dropdown sidebar-account-dropdown">
          <div class="sidebar-account-dropdown-summary">
            <div class="sidebar-account-dropdown-avatar">
              <img
                v-if="avatarUrl"
                :src="avatarUrl"
                :alt="displayName"
                class="h-full w-full object-cover"
              >
              <DefaultHashAvatar
                v-else
                :seed="avatarSeed"
                :label="displayName"
              />
            </div>
            <div class="min-w-0 flex-1">
              <div class="sidebar-account-dropdown-name">
                {{ displayName }}
              </div>
              <div class="sidebar-account-dropdown-email">{{ user.email }}</div>
            </div>
          </div>

          <div class="border-b border-gray-100 px-4 py-2 dark:border-dark-700">
            <div class="text-xs text-gray-500 dark:text-dark-400">
              {{ t('common.balance') }}
            </div>
            <div class="text-sm font-semibold text-primary-600 dark:text-primary-400">
              ${{ user.balance?.toFixed(2) || '0.00' }}
            </div>
          </div>

          <div class="py-1">
            <router-link to="/profile" @click="closeAccountDropdown" class="dropdown-item">
              <Icon name="user" size="sm" />
              {{ t('nav.profile') }}
            </router-link>

            <router-link to="/keys" @click="closeAccountDropdown" class="dropdown-item">
              <Icon name="key" size="sm" />
              {{ t('nav.apiKeys') }}
            </router-link>

            <a
              v-if="authStore.isAdmin"
              href="https://github.com/Wei-Shaw/sub2api"
              target="_blank"
              rel="noopener noreferrer"
              @click="closeAccountDropdown"
              class="dropdown-item"
            >
              <svg class="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                <path
                  fill-rule="evenodd"
                  clip-rule="evenodd"
                  d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.17 6.839 9.49.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.604-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.464-1.11-1.464-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.831.092-.646.35-1.086.636-1.336-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.578 9.578 0 0112 6.836c.85.004 1.705.114 2.504.336 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.138 20.167 22 16.418 22 12c0-5.523-4.477-10-10-10z"
                />
              </svg>
              {{ t('nav.github') }}
            </a>
          </div>

          <div
            v-if="contactInfo"
            class="border-t border-gray-100 px-4 py-2.5 dark:border-dark-700"
          >
            <div class="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
              <Icon name="chatBubble" size="sm" class="flex-shrink-0" />
              <span>{{ t('common.contactSupport') }}:</span>
              <span class="font-medium text-gray-700 dark:text-gray-300">{{ contactInfo }}</span>
            </div>
          </div>

          <div v-if="showOnboardingButton" class="border-t border-gray-100 py-1 dark:border-dark-700">
            <button @click="handleReplayGuide" class="dropdown-item w-full">
              <Icon name="questionCircle" size="sm" />
              {{ $t('onboarding.restartTour') }}
            </button>
          </div>

          <div class="border-t border-gray-100 py-1 dark:border-dark-700">
            <button
              @click="handleLogout"
              class="dropdown-item w-full text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
            >
              <Icon name="login" size="sm" />
              {{ t('nav.logout') }}
            </button>
          </div>
        </div>
      </transition>
    </div>
  </aside>

  <!-- Mobile Overlay -->
  <transition name="fade">
    <div
      v-if="mobileOpen"
      class="fixed inset-0 z-30 bg-black/50 lg:hidden"
      @click="closeMobile"
    ></div>
  </transition>
</template>

<script setup lang="ts">
import { computed, h, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useAdminSettingsStore, useAppStore, useAuthStore, useOnboardingStore } from '@/stores'
import VersionBadge from '@/components/common/VersionBadge.vue'
import DefaultHashAvatar from '@/components/common/DefaultHashAvatar.vue'
import Icon from '@/components/icons/Icon.vue'
import { sanitizeSvg } from '@/utils/sanitize'
import { FeatureFlags, makeImagePlaygroundSidebarFlag, makeSidebarFlag } from '@/utils/featureFlags'
import { defaultAvatarSeed } from '@/utils/defaultAvatar'
import { sanitizeUrl } from '@/utils/url'
import { useBatchImageAccess } from '@/composables/useBatchImageAccess'

interface NavItem {
  path: string
  label: string
  icon: unknown
  iconSvg?: string
  hideInSimpleMode?: boolean
  external?: boolean
  children?: NavItem[]
  /**
   * When true, the parent item only toggles the expand/collapse state and
   * does NOT navigate to its `path`. The `path` is purely a stable key.
   */
  expandOnly?: boolean
  /**
   * 可选的功能开关 getter。返回 false 时菜单项被隐藏；返回 undefined/true 时显示。
   * 宽容策略（undefined → 显示）避免 public settings 未加载完成时菜单闪烁消失。
   * Getter 里访问的 reactive 来源（store / composable）会被 computed 自动追踪，
   * 开关切换时菜单自动更新。
   */
  featureFlag?: () => boolean | undefined
}

// applyFeatureFlags 递归过滤掉 featureFlag() === false 的节点（含子节点）。
// 使用 `!== false` 宽容语义：undefined（设置未加载）或 true 都视为显示。
function applyFeatureFlags(items: NavItem[]): NavItem[] {
  const out: NavItem[] = []
  for (const item of items) {
    if (item.featureFlag && item.featureFlag() === false) continue
    if (item.children) {
      out.push({ ...item, children: applyFeatureFlags(item.children) })
    } else {
      out.push(item)
    }
  }
  return out
}

const { t } = useI18n()

const route = useRoute()
const router = useRouter()
const appStore = useAppStore()
const authStore = useAuthStore()
const onboardingStore = useOnboardingStore()
const adminSettingsStore = useAdminSettingsStore()
const { canUseBatchImage, refreshBatchImageAccess } = useBatchImageAccess()

const sidebarCollapsed = computed(() => appStore.sidebarCollapsed)
const mobileOpen = computed(() => appStore.mobileOpen)
const isAdmin = computed(() => authStore.isAdmin)
const user = computed(() => authStore.user)
const accountDropdownOpen = ref(false)
const accountDropdownRef = ref<HTMLElement | null>(null)
const contactInfo = computed(() => appStore.contactInfo)
const avatarUrl = computed(() => user.value?.avatar_url?.trim() || '')
const avatarSeed = computed(() => defaultAvatarSeed(user.value))
const displayName = computed(() => {
  if (!user.value) return ''
  return user.value.username || user.value.email?.split('@')[0] || ''
})
const showOnboardingButton = computed(() => {
  return !authStore.isSimpleMode && user.value?.role === 'admin'
})
const sidebarNavRef = ref<HTMLElement | null>(null)
// Track which parent nav groups are expanded
const expandedGroups = ref<Set<string>>(new Set())

// Site settings from appStore (cached, no flicker)
const siteName = computed(() => appStore.siteName)
const siteLogo = computed(() => sanitizeUrl(appStore.siteLogo || '', { allowRelative: true, allowDataUrl: true }))
const siteVersion = computed(() => appStore.siteVersion)
const settingsLoaded = computed(() => appStore.publicSettingsLoaded)

// Sidebar menu icons use the shared local SVG icon set from components/icons/Icon.vue.
type SidebarIconName =
  | 'home'
  | 'key'
  | 'terminal'
  | 'trendingUp'
  | 'badge'
  | 'userCircle'
  | 'userPlus'
  | 'database'
  | 'cube'
  | 'sparkles'
  | 'wallet'
  | 'dollar'
  | 'cloud'
  | 'cpu'
  | 'chatBubble'
  | 'clipboard'
  | 'filter'
  | 'document'
  | 'book'
  | 'bolt'
  | 'ban'
  | 'calculator'
  | 'chevronDown'
  | 'chevronLeft'
  | 'chevronRight'

function createSidebarIcon(name: SidebarIconName, strokeWidth = 1.75) {
  return {
    render: () => h(Icon, { name, size: 'md', strokeWidth })
  }
}

const DashboardIcon = createSidebarIcon('home')
const KeyIcon = createSidebarIcon('key')
const ChartIcon = createSidebarIcon('trendingUp')
const GiftIcon = createSidebarIcon('badge')
const UserIcon = createSidebarIcon('userCircle')
const UsersIcon = createSidebarIcon('userPlus')
const FolderIcon = createSidebarIcon('database')
const ChannelIcon = createSidebarIcon('cube')
const ImagePlaygroundIcon = createSidebarIcon('sparkles')
const CreditCardIcon = createSidebarIcon('wallet')
const RechargeSubscriptionIcon = createSidebarIcon('dollar')
const GlobeIcon = createSidebarIcon('cloud')
const ServerIcon = createSidebarIcon('cpu')
const BellIcon = createSidebarIcon('chatBubble')
const TicketIcon = createSidebarIcon('clipboard')
const CogIcon = createSidebarIcon('filter')
const ChevronDoubleLeftIcon = createSidebarIcon('chevronLeft')
const OrderIcon = createSidebarIcon('document')
const OrderListIcon = createSidebarIcon('clipboard')
const DocumentIcon = createSidebarIcon('book')
const ChevronDoubleRightIcon = createSidebarIcon('chevronRight')
const SignalIcon = createSidebarIcon('bolt')
const ShieldIcon = createSidebarIcon('ban')
const PriceTagIcon = createSidebarIcon('calculator')
const ChevronDownIcon = createSidebarIcon('chevronDown')
const BatchImageIcon = createSidebarIcon('sparkles')

// Public-settings flags go through the registry in utils/featureFlags.ts,
// which handles the opt-in vs opt-out fallback when settings haven't loaded
// yet. Admin-only flags (not in public settings) stay inline below.
const flagChannelMonitor = makeSidebarFlag(FeatureFlags.channelMonitor)
const flagPayment = makeSidebarFlag(FeatureFlags.payment)
const flagAvailableChannels = makeSidebarFlag(FeatureFlags.availableChannels)
const flagAffiliate = makeSidebarFlag(FeatureFlags.affiliate)
const flagRiskControl = makeSidebarFlag(FeatureFlags.riskControl)
const flagImagePlayground = makeImagePlaygroundSidebarFlag()
const flagOpsMonitoring = () => adminSettingsStore.opsMonitoringEnabled
const flagAdminPayment = () => adminSettingsStore.paymentEnabled
const flagBatchImageAccess = () => canUseBatchImage.value

// buildSelfNavItems 构造用户自己的导航项（用户端主菜单和管理员的"我的账户"子菜单共享这组声明）。
// withDashboard=true 时包含仪表盘（用户端），false 时不含（管理员的个人区已经有独立仪表盘入口）。
//
// 条目顺序：密钥 → 批量图片 → 用量 → 可用渠道 → 渠道状态 → 订阅/支付 → 兑换/资料 → 文档。
// 可用渠道紧挨渠道状态之上，让用户"先看自己能用什么、再看对应状态"。
function buildSelfNavItems(withDashboard: boolean): NavItem[] {
  const items: NavItem[] = []
  if (withDashboard) {
    items.push({ path: '/dashboard', label: t('nav.dashboard'), icon: DashboardIcon })
  }
  items.push(
    { path: '/keys', label: t('nav.apiKeys'), icon: KeyIcon },
    { path: '/batch-image', label: t('nav.batchImage'), icon: BatchImageIcon, hideInSimpleMode: true, featureFlag: flagBatchImageAccess },
    { path: '/usage', label: t('nav.usage'), icon: ChartIcon, hideInSimpleMode: true },
    { path: '/available-channels', label: t('nav.availableChannels'), icon: ChannelIcon, hideInSimpleMode: true, featureFlag: flagAvailableChannels },
    { path: '/image-playground', label: t('nav.imagePlayground'), icon: ImagePlaygroundIcon, hideInSimpleMode: true, featureFlag: flagImagePlayground },
    { path: '/monitor', label: t('nav.channelStatus'), icon: SignalIcon, featureFlag: flagChannelMonitor },
    { path: '/subscriptions', label: t('nav.mySubscriptions'), icon: CreditCardIcon, hideInSimpleMode: true },
    { path: '/purchase', label: t('nav.buySubscription'), icon: RechargeSubscriptionIcon, hideInSimpleMode: true, featureFlag: flagPayment },
    { path: '/orders', label: t('nav.myOrders'), icon: OrderListIcon, hideInSimpleMode: true, featureFlag: flagPayment },
    { path: '/redeem', label: t('nav.redeem'), icon: GiftIcon, hideInSimpleMode: true },
    { path: '/affiliate', label: t('nav.affiliate'), icon: UsersIcon, hideInSimpleMode: true, featureFlag: flagAffiliate },
    { path: '/profile', label: t('nav.profile'), icon: UserIcon },
    ...customMenuItemsForUser.value.map((item): NavItem => ({
      path: `/custom/${item.id}`,
      label: item.label,
      icon: null,
      iconSvg: item.icon_svg,
    })),
    { path: '/docs', label: t('nav.docs'), icon: DocumentIcon },
  )
  return items
}

// finalizeNav 合并三重过滤：featureFlag 过滤 + simple 模式过滤。
function finalizeNav(items: NavItem[]): NavItem[] {
  const visible = applyFeatureFlags(items)
  return authStore.isSimpleMode ? visible.filter(item => !item.hideInSimpleMode) : visible
}

// User navigation items (for regular users)
const userNavItems = computed((): NavItem[] => finalizeNav(buildSelfNavItems(true)))

// Personal navigation items (for admin's "My Account" section, without Dashboard).
// Admins access 可用渠道 from this section just like regular users — there is no
// separate admin entry, since the page is purely a user-facing view.
const personalNavItems = computed((): NavItem[] => finalizeNav(buildSelfNavItems(false)))

// Custom menu items filtered by visibility
const customMenuItemsForUser = computed(() => {
  const items = appStore.cachedPublicSettings?.custom_menu_items ?? []
  return items
    .filter((item) => item.visibility === 'user')
    .sort((a, b) => a.sort_order - b.sort_order)
})

const customMenuItemsForAdmin = computed(() => {
  return adminSettingsStore.customMenuItems
    .filter((item) => item.visibility === 'admin')
    .sort((a, b) => a.sort_order - b.sort_order)
})

// Admin navigation items
const adminNavItems = computed((): NavItem[] => {
  const baseItems: NavItem[] = [
    { path: '/admin/dashboard', label: t('nav.dashboard'), icon: DashboardIcon },
    { path: '/admin/ops', label: t('nav.ops'), icon: ChartIcon, featureFlag: flagOpsMonitoring },
    { path: '/admin/users', label: t('nav.users'), icon: UsersIcon, hideInSimpleMode: true },
    { path: '/admin/groups', label: t('nav.groups'), icon: FolderIcon, hideInSimpleMode: true },
    {
      path: '/admin/channels',
      label: t('nav.channelManagement'),
      icon: ChannelIcon,
      hideInSimpleMode: true,
      expandOnly: true,
      children: [
        { path: '/admin/channels/pricing', label: t('nav.channelPricing'), icon: PriceTagIcon },
        { path: '/admin/channels/monitor', label: t('nav.channelMonitor'), icon: SignalIcon, featureFlag: flagChannelMonitor },
      ],
    },
    { path: '/admin/subscriptions', label: t('nav.subscriptions'), icon: CreditCardIcon, hideInSimpleMode: true },
    { path: '/admin/accounts', label: t('nav.accounts'), icon: GlobeIcon },
    { path: '/admin/announcements', label: t('nav.announcements'), icon: BellIcon },
    { path: '/admin/proxies', label: t('nav.proxies'), icon: ServerIcon },
    {
      path: '/admin/security-audit',
      label: t('nav.securityAudit'),
      icon: ShieldIcon,
      hideInSimpleMode: true,
      expandOnly: true,
      featureFlag: flagRiskControl,
      children: [
        { path: '/admin/risk-control', label: t('nav.contentModeration'), icon: ShieldIcon },
        { path: '/admin/prompt-audit', label: t('nav.promptAudit'), icon: ShieldIcon },
      ],
    },
    { path: '/admin/redeem', label: t('nav.redeemCodes'), icon: TicketIcon, hideInSimpleMode: true },
    { path: '/admin/promo-codes', label: t('nav.promoCodes'), icon: GiftIcon, hideInSimpleMode: true },
    {
      path: '/admin/affiliates',
      label: t('nav.affiliateManagement'),
      icon: UsersIcon,
      hideInSimpleMode: true,
      expandOnly: true,
      featureFlag: flagAffiliate,
      children: [
        { path: '/admin/affiliates/invites', label: t('nav.affiliateInviteRecords'), icon: UsersIcon },
        { path: '/admin/affiliates/rebates', label: t('nav.affiliateRebateRecords'), icon: OrderIcon },
        { path: '/admin/affiliates/transfers', label: t('nav.affiliateTransferRecords'), icon: CreditCardIcon },
      ],
    },
    {
      path: '/admin/orders',
      label: t('nav.orderManagement'),
      icon: OrderIcon,
      hideInSimpleMode: true,
      expandOnly: true,
      featureFlag: flagAdminPayment,
      children: [
        { path: '/admin/orders/dashboard', label: t('nav.paymentDashboard'), icon: ChartIcon },
        { path: '/admin/orders', label: t('nav.orderManagement'), icon: OrderIcon },
        { path: '/admin/orders/plans', label: t('nav.paymentPlans'), icon: CreditCardIcon },
      ],
    },
    { path: '/admin/usage', label: t('nav.usage'), icon: ChartIcon },
    { path: '/admin/audit-logs', label: t('nav.auditLogs'), icon: ShieldIcon, hideInSimpleMode: true }
  ]

  const visible = applyFeatureFlags(baseItems)

  // 简单模式下，在系统设置前插入 API密钥
  if (authStore.isSimpleMode) {
    const filtered = visible.filter(item => !item.hideInSimpleMode)
    filtered.push({ path: '/keys', label: t('nav.apiKeys'), icon: KeyIcon })
    filtered.push({ path: '/admin/settings', label: t('nav.settings'), icon: CogIcon })
    for (const cm of customMenuItemsForAdmin.value) {
      filtered.push({ path: `/custom/${cm.id}`, label: cm.label, icon: null, iconSvg: cm.icon_svg })
    }
    return filtered
  }

  visible.push({ path: '/admin/settings', label: t('nav.settings'), icon: CogIcon })
  for (const cm of customMenuItemsForAdmin.value) {
    visible.push({ path: `/custom/${cm.id}`, label: cm.label, icon: null, iconSvg: cm.icon_svg })
  }
  return visible
})

function toggleSidebar() {
  appStore.toggleSidebar()
}

function toggleAccountDropdown() {
  accountDropdownOpen.value = !accountDropdownOpen.value
}

function closeAccountDropdown() {
  accountDropdownOpen.value = false
}

async function handleLogout() {
  closeAccountDropdown()
  try {
    await authStore.logout()
  } catch (error) {
    // Ignore logout errors - still redirect to login
    console.error('Logout error:', error)
  }
  await router.push('/login')
}

function handleReplayGuide() {
  closeAccountDropdown()
  onboardingStore.replay()
}

function handleClickOutside(event: MouseEvent) {
  if (accountDropdownRef.value && !accountDropdownRef.value.contains(event.target as Node)) {
    closeAccountDropdown()
  }
}

function closeMobile() {
  appStore.setMobileOpen(false)
}

function handleMenuItemClick(itemPath: string) {
  if (mobileOpen.value) {
    setTimeout(() => {
      appStore.setMobileOpen(false)
    }, 150)
  }

  // Map paths to tour selectors
  const pathToSelector: Record<string, string> = {
    '/admin/groups': '#sidebar-group-manage',
    '/admin/accounts': '#sidebar-channel-manage',
    '/keys': '[data-tour="sidebar-my-keys"]'
  }

  const selector = pathToSelector[itemPath]
  if (selector && onboardingStore.isCurrentStep(selector)) {
    onboardingStore.nextStep(500)
  }
}

function isActive(path: string): boolean {
  return route.path === path || route.path.startsWith(path + '/')
}

function isGroupActive(item: NavItem): boolean {
  if (!item.children) return false
  return item.children.some(child => route.path === child.path)
}

function isGroupExpanded(item: NavItem): boolean {
  return expandedGroups.value.has(item.path) || isGroupActive(item)
}

function toggleGroup(item: NavItem) {
  if (expandedGroups.value.has(item.path)) {
    expandedGroups.value.delete(item.path)
  } else {
    expandedGroups.value.add(item.path)
  }
}

/**
 * Click handler for collapsible parent items.
 * - When sidebar is collapsed: do nothing (children are not visible).
 * - When `expandOnly` is true: only toggle expand state.
 * - Otherwise (default, e.g. /admin/orders): navigate to the parent path
 *   (router-link semantics) and ensure the group is expanded.
 */
function handleGroupClick(item: NavItem) {
  if (sidebarCollapsed.value) return
  if (item.expandOnly) {
    toggleGroup(item)
    return
  }
  // Push to path and ensure expanded
  if (route.path !== item.path) {
    router.push(item.path)
  }
  if (!expandedGroups.value.has(item.path)) {
    expandedGroups.value.add(item.path)
  }
}

// Fetch admin settings (for feature-gated nav items like Ops).
watch(
  isAdmin,
  (v) => {
    if (v) {
      adminSettingsStore.fetch()
    }
  },
  { immediate: true }
)

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
  void refreshBatchImageAccess()
  if (isAdmin.value) {
    adminSettingsStore.fetch()
  }
  // Restore sidebar scroll position after route change re-mounts the component
  if (appStore.sidebarScrollTop > 0 && sidebarNavRef.value) {
    void nextTick(() => {
      if (sidebarNavRef.value) {
        sidebarNavRef.value.scrollTop = appStore.sidebarScrollTop
      }
    })
  }
})

onBeforeUnmount(() => {
  if (sidebarNavRef.value) {
    appStore.sidebarScrollTop = sidebarNavRef.value.scrollTop
  }
  document.removeEventListener('click', handleClickOutside)
})
</script>

<style scoped>
.sidebar-logo {
  flex: 0 0 2.25rem;
  min-width: 2.25rem;
  transition:
    max-width 0.18s ease,
    min-width 0.18s ease,
    opacity 0.12s ease,
    transform 0.12s ease;
}

.sidebar-logo-collapsed {
  max-width: 2.25rem;
  min-width: 2.25rem;
  opacity: 1;
  transform: none;
}

.sidebar-header-collapsed {
  justify-content: center;
  gap: 0;
  padding-left: 0.375rem;
  padding-right: 0.375rem;
}

.sidebar-header {
  position: relative;
}

.sidebar-brand {
  min-width: 0;
  flex: 1 1 auto;
  white-space: nowrap;
  transition:
    max-width 0.22s ease,
    opacity 0.14s ease,
    transform 0.14s ease;
  max-width: 12rem;
}

.sidebar-brand-collapsed {
  max-width: 0;
  overflow: hidden;
  opacity: 0;
  transform: translateX(-4px);
  pointer-events: none;
}

.sidebar-brand-title {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.sidebar-collapse-button {
  position: absolute;
  bottom: 0;
  right: 0;
  z-index: 2;
  display: none;
  height: 1.75rem;
  width: 1.75rem;
  flex: 0 0 1.75rem;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--theme-border);
  border-radius: 9999px;
  background: var(--theme-surface);
  box-shadow: 0 8px 20px color-mix(in srgb, var(--theme-shadow-color, rgb(15 23 42)) 12%, transparent);
  color: var(--theme-text-muted);
  transform: translate(50%, 50%);
  transition:
    background-color 0.18s ease,
    border-color 0.18s ease,
    box-shadow 0.18s ease,
    color 0.18s ease,
    transform 0.18s ease;
}

.sidebar-collapse-button:hover {
  border-color: color-mix(in srgb, var(--theme-primary) 28%, var(--theme-border));
  background: color-mix(in srgb, var(--theme-surface) 78%, var(--theme-primary-soft));
  color: var(--theme-primary);
  box-shadow: 0 10px 24px color-mix(in srgb, var(--theme-primary) 16%, transparent);
  transform: translate(50%, calc(50% - 1px));
}

.sidebar-collapse-button-collapsed {
  right: 0;
}

@media (min-width: 1024px) {
  .sidebar-collapse-button {
    display: inline-flex;
  }
}

.sidebar-link-collapsed {
  gap: 0;
  padding-left: 0.875rem;
  padding-right: 0.875rem;
}

.sidebar-account-section {
  position: relative;
  margin-top: auto;
  border-top: 1px solid var(--theme-border);
  padding: 0.5rem;
}

.sidebar-account-button {
  display: flex;
  width: 100%;
  min-height: 2.75rem;
  align-items: center;
  gap: 0.625rem;
  overflow: hidden;
  border-radius: 0.25rem;
  padding: 0.375rem;
  color: var(--theme-text);
  transition:
    background-color 0.18s ease,
    color 0.18s ease,
    transform 0.18s ease;
}

.sidebar-account-button:hover {
  background: color-mix(in srgb, var(--theme-surface-muted) 82%, var(--theme-accent-soft));
  color: var(--theme-primary);
}

.sidebar-account-button-collapsed {
  justify-content: center;
  gap: 0;
  padding-left: 0.5rem;
  padding-right: 0.5rem;
}

.sidebar-account-avatar {
  display: flex;
  height: 1.875rem;
  width: 1.875rem;
  flex: 0 0 1.875rem;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  border: 1px solid var(--theme-border);
  border-radius: 0.25rem;
  background: var(--theme-surface-muted);
  color: var(--theme-primary);
  font-size: 0.875rem;
  font-weight: 600;
  box-shadow: var(--theme-shadow);
}

.sidebar-account-copy {
  display: flex;
  min-width: 0;
  flex: 1 1 auto;
  flex-direction: column;
  align-items: flex-start;
  overflow: hidden;
  transition:
    max-width 0.2s ease,
    opacity 0.12s ease,
    transform 0.12s ease;
  max-width: 9.25rem;
}

.sidebar-account-copy-collapsed {
  max-width: 0;
  opacity: 0;
  transform: translateX(-4px);
}

.sidebar-account-name,
.sidebar-account-balance {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.sidebar-account-name {
  font-size: 0.8125rem;
  font-weight: 600;
  line-height: 1rem;
}

.sidebar-account-balance {
  margin-top: 0.25rem;
  border-radius: 0.25rem;
  background: color-mix(in srgb, var(--theme-primary-soft) 86%, var(--theme-surface));
  color: var(--theme-primary);
  font-size: 0.8125rem;
  font-weight: 700;
  line-height: 1rem;
  padding: 0.125rem 0.45rem;
  box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--theme-primary) 12%, transparent);
}

.sidebar-account-balance-icon {
  flex: 0 0 auto;
  height: 0.875rem;
  width: 0.875rem;
}

.sidebar-account-chevron {
  flex: 0 0 auto;
  color: var(--theme-text-subtle);
  transition:
    opacity 0.12s ease,
    transform 0.18s ease;
}

.sidebar-account-chevron-collapsed {
  opacity: 0;
  width: 0;
}

.sidebar-account-dropdown {
  bottom: calc(100% + 0.5rem);
  left: 0.75rem;
  width: min(14rem, calc(100vw - 1.5rem));
  transform-origin: bottom left;
}

.sidebar-account-dropdown-summary {
  display: flex;
  min-height: 5.5rem;
  align-items: center;
  gap: 0.85rem;
  border-bottom: 1px solid var(--theme-border);
  padding: 1rem;
}

.sidebar-account-dropdown-avatar {
  display: flex;
  height: 3rem;
  width: 3rem;
  flex: 0 0 3rem;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  border-radius: 0.5rem;
  background: color-mix(in srgb, var(--theme-primary-soft) 72%, var(--theme-surface-muted));
  color: var(--theme-primary);
  box-shadow: var(--theme-shadow);
}

.sidebar-account-dropdown-name,
.sidebar-account-dropdown-email {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.sidebar-account-dropdown-name {
  color: var(--theme-text);
  font-size: 0.95rem;
  font-weight: 700;
  line-height: 1.35;
}

.sidebar-account-dropdown-email {
  margin-top: 0.25rem;
  color: var(--theme-text-subtle);
  font-size: 0.75rem;
  line-height: 1.25;
}

.sidebar-section-title {
  position: relative;
  display: flex;
  align-items: center;
  min-height: 1.25rem;
  overflow: hidden;
  white-space: nowrap;
}

.sidebar-section-title-text {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  transition:
    opacity 0.16s ease,
    transform 0.16s ease;
}

.sidebar-section-title::after {
  content: '';
  position: absolute;
  left: 0.75rem;
  right: 0.75rem;
  top: 50%;
  height: 1px;
  background: rgb(229 231 235);
  opacity: 0;
  transform: translateY(-50%);
  transition: opacity 0.18s ease;
}

.dark .sidebar-section-title::after {
  background: rgb(55 65 81);
}

.sidebar-section-title-text-collapsed {
  opacity: 0;
  transform: translateX(-4px);
}

.sidebar-section-title-collapsed::after {
  opacity: 1;
  transition-delay: 0.08s;
}

.sidebar-label {
  display: block;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  transition:
    max-width 0.2s ease,
    opacity 0.12s ease,
    transform 0.12s ease;
  max-width: 12rem;
}

.sidebar-label-flex {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
}

.sidebar-label-collapsed {
  max-width: 0;
  opacity: 0;
  transform: translateX(-4px);
  pointer-events: none;
}

/* Custom SVG icon in sidebar: constrain size without overriding uploaded SVG colors */
.sidebar-svg-icon {
  color: currentColor;
}

.sidebar-svg-icon :deep(svg) {
  display: block;
  width: 1.25rem;
  height: 1.25rem;
}
</style>
