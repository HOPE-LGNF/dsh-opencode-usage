window.__ModuleLoader__.load({
  id: '@local/dsh-opencode-usage',
  factory(require) {
    const React = require('react')
    const ReactDom = require('react-dom')
    const h = React.createElement

    const NS = 'opencode-usage'
    const ROUTE = 'opencode-go/usage'
    const WINDOWS = ['rolling', 'weekly', 'monthly']
    const PANEL_WIDTH = 264

    const zh = {
      aria: '查看 OpenCode Go 套餐用量',
      title: 'OpenCode Go 套餐用量',
      rolling: '滚动用量',
      weekly: '每周用量',
      monthly: '每月用量',
      used: '{percent}% 已用',
      resets: '{time}后重置',
      resetSoon: '即将重置',
      loading: '正在获取用量…',
      empty: '暂无用量数据',
      retry: '重试',
      errorMissingKey: '未找到 OPENCODE_GO_API_KEY，请先在设置中配置',
      errorNetwork: '网络请求失败，请检查网络后重试',
      errorUpstream: 'OpenCode 服务返回 {status}，请稍后再试',
      errorGeneric: '无法获取用量，请稍后再试',
      days: '{days}天',
      hours: '{hours}小时',
      minutes: '{minutes}分钟',
    }

    const en = {
      aria: 'View OpenCode Go plan usage',
      title: 'OpenCode Go plan usage',
      rolling: 'Rolling usage',
      weekly: 'Weekly usage',
      monthly: 'Monthly usage',
      used: '{percent}% used',
      resets: 'Resets in {time}',
      resetSoon: 'resetting now',
      loading: 'Loading usage…',
      empty: 'No usage data',
      retry: 'Retry',
      errorMissingKey: 'OPENCODE_GO_API_KEY is not configured. Add it in Settings.',
      errorNetwork: 'Network request failed. Check your connection and retry.',
      errorUpstream: 'OpenCode returned {status}. Try again shortly.',
      errorGeneric: 'Could not load usage. Try again shortly.',
      days: '{days}d',
      hours: '{hours}h',
      minutes: '{minutes}m',
    }

    const CSS = `
      .ou_root { order: 1; display: inline-flex; flex: none; }
      .ou_trigger {
        width: 24px; height: 24px; padding: 0; border: 0; border-radius: var(--dsw-radius-sm);
        background: 0 0; color: var(--dsw-alias-label-tertiary); cursor: pointer;
        display: inline-flex; align-items: center; justify-content: center;
      }
      .ou_trigger:hover, .ou_trigger[aria-expanded="true"] {
        background: var(--dsw-alias-interactive-bg-hover); color: var(--dsw-alias-label-secondary);
      }
      .ou_panel {
        position: fixed; z-index: 1100; box-sizing: border-box;
        width: min(${PANEL_WIDTH}px, calc(100vw - 24px));
        padding: 12px; border: 0; border-radius: var(--dsw-radius-lg);
        background: var(--dsw-specific-menu); backdrop-filter: var(--dsw-menu-backdrop-filter);
        --dsw-elevation-stroke-color: var(--dsw-alias-border-l1);
        box-shadow: var(--dsw-elevation-prominent); cursor: default;
        color: var(--dsw-alias-label-secondary); font-size: 12px; line-height: 20px;
      }
      .ou_title { color: var(--dsw-alias-label-primary); font-size: 13px; font-weight: 500; line-height: 20px; }
      .ou_track {
        height: 4px; margin-top: 6px; border-radius: 999px; overflow: hidden;
        background: var(--dsw-alias-interactive-bg-hover);
      }
      .ou_fill { height: 100%; border-radius: 999px; background: var(--dsw-alias-state-business-primary); }
      .ou_row { padding: 6px 0; }
      .ou_line { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
      .ou_muted { color: var(--dsw-alias-label-tertiary); padding: 2px 0 8px; overflow-wrap: anywhere; }
      .ou_value {
        color: var(--dsw-alias-label-primary); font-variant-numeric: tabular-nums; font-weight: 500;
      }
      .ou_hint { margin-top: 4px; color: var(--dsw-alias-label-tertiary); font-size: 11px; line-height: 16px; }
      .ou_retry {
        padding: 1px 8px; border: 1px solid var(--dsw-alias-border-l2); border-radius: var(--dsw-radius-sm);
        background: 0 0; color: var(--dsw-alias-label-primary); font-size: 12px; line-height: 18px; cursor: pointer;
      }
      .ou_retry:hover { background: var(--dsw-alias-interactive-bg-hover); }
    `

    /** Bounded integer percent, or null for anything unusable. */
    function clampPercent(value) {
      if (typeof value !== 'number' || !Number.isFinite(value)) return null
      return Math.max(0, Math.min(100, Math.round(value)))
    }

    /** Relative distance to a reset instant, in the largest two useful units. */
    function resetDistance(resetsAt, t) {
      if (typeof resetsAt !== 'string') return null
      const target = Date.parse(resetsAt)
      if (!Number.isFinite(target)) return null
      const remaining = target - Date.now()
      if (remaining <= 0) return t('resetSoon')

      const minutes = Math.max(1, Math.round(remaining / 60000))
      const days = Math.floor(minutes / 1440)
      const hours = Math.floor((minutes % 1440) / 60)
      const rest = minutes % 60

      if (days > 0) {
        const dayText = t('days', { days: String(days) })
        return hours > 0 ? `${dayText} ${t('hours', { hours: String(hours) })}` : dayText
      }
      if (hours > 0) {
        const hourText = t('hours', { hours: String(hours) })
        return rest > 0 ? `${hourText} ${t('minutes', { minutes: String(rest) })}` : hourText
      }
      return t('minutes', { minutes: String(minutes) })
    }

    function errorText(state, t) {
      switch (state.code) {
        case 'missing-key':
          return t('errorMissingKey')
        case 'network':
          return t('errorNetwork')
        case 'upstream':
          return state.upstreamStatus === undefined
            ? t('errorGeneric')
            : t('errorUpstream', { status: String(state.upstreamStatus) })
        default:
          return t('errorGeneric')
      }
    }

    function UsageRow({ name, entry, t }) {
      const percent = clampPercent(entry.percent)
      const distance = resetDistance(entry.resetsAt, t)
      return h(
        'div',
        { className: 'ou_row' },
        h(
          'div',
          { className: 'ou_line' },
          h('span', null, t(name)),
          h('span', { className: 'ou_value' }, percent === null ? '—' : t('used', { percent: String(percent) })),
        ),
        h(
          'div',
          { className: 'ou_track' },
          h('div', { className: 'ou_fill', style: { width: `${percent ?? 0}%` } }),
        ),
        distance === null ? null : h('div', { className: 'ou_hint' }, t('resets', { time: distance })),
      )
    }

    function PanelBody({ state, t, reload }) {
      if (state.status !== 'ready') {
        if (state.status !== 'error') return h('div', { className: 'ou_muted' }, t('loading'))
        return h(
          'div',
          null,
          h('div', { className: 'ou_muted' }, errorText(state, t)),
          h('button', { type: 'button', className: 'ou_retry', onClick: reload }, t('retry')),
        )
      }

      const usage = state.usage !== null && typeof state.usage === 'object' ? state.usage : {}
      const windows = WINDOWS.filter((name) => {
        const value = usage[name]
        return value !== null && typeof value === 'object'
      })
      if (windows.length === 0) return h('div', { className: 'ou_muted' }, t('empty'))
      return windows.map((name) => h(UsageRow, { key: name, name, entry: usage[name], t }))
    }

    function UsageButton({ t }) {
      const [open, setOpen] = React.useState(false)
      const [state, setState] = React.useState({ status: 'idle' })
      const [position, setPosition] = React.useState(null)
      const mounted = React.useRef(true)
      const request = React.useRef(null)
      const rootRef = React.useRef(null)
      const triggerRef = React.useRef(null)
      const panelRef = React.useRef(null)

      React.useEffect(() => {
        mounted.current = true
        return () => {
          mounted.current = false
          request.current?.abort()
        }
      }, [])

      const reload = React.useCallback(async () => {
        request.current?.abort()
        const controller = new AbortController()
        request.current = controller
        setState({ status: 'loading' })

        try {
          const response = await fetch(new URL(ROUTE, document.baseURI), {
            headers: { accept: 'application/json' },
            cache: 'no-store',
            signal: controller.signal,
          })
          let body
          try {
            body = await response.json()
          } catch {
            body = undefined
          }
          if (!mounted.current || controller.signal.aborted) return
          if (!response.ok) {
            setState({ status: 'error', code: body?.code ?? 'generic', upstreamStatus: body?.status })
            return
          }
          setState({ status: 'ready', usage: body?.usage ?? {} })
        } catch {
          if (!mounted.current || controller.signal.aborted) return
          setState({ status: 'error', code: 'network' })
        }
      }, [])

      React.useEffect(() => {
        if (open) {
          reload()
          return
        }
        request.current?.abort()
        setPosition(null)
      }, [open, reload])

      React.useEffect(() => {
        if (!open) return undefined
        const place = () => {
          const rect = triggerRef.current?.getBoundingClientRect()
          if (rect === undefined) return
          const maxLeft = Math.max(12, window.innerWidth - PANEL_WIDTH - 12)
          setPosition({
            left: Math.max(12, Math.min(rect.left, maxLeft)),
            bottom: Math.max(8, window.innerHeight - rect.top + 8),
          })
        }
        place()
        window.addEventListener('resize', place)
        return () => window.removeEventListener('resize', place)
      }, [open])

      React.useEffect(() => {
        if (!open) return undefined
        const onPointerDown = (event) => {
          const target = event.target
          if (rootRef.current?.contains(target) === true) return
          if (panelRef.current?.contains(target) === true) return
          setOpen(false)
        }
        const onKeyDown = (event) => {
          if (event.key === 'Escape') setOpen(false)
        }
        document.addEventListener('pointerdown', onPointerDown)
        document.addEventListener('keydown', onKeyDown)
        return () => {
          document.removeEventListener('pointerdown', onPointerDown)
          document.removeEventListener('keydown', onKeyDown)
        }
      }, [open])

      const panel = open
        ? ReactDom.createPortal(
            h(
              'div',
              {
                ref: panelRef,
                role: 'dialog',
                'aria-label': t('title'),
                className: 'ou_panel',
                style: position ?? { visibility: 'hidden', left: 0, bottom: 0 },
              },
              h('div', { className: 'ou_title' }, t('title')),
              h(PanelBody, { state, t, reload }),
            ),
            document.body,
          )
        : null

      return h(
        'span',
        { ref: rootRef, className: 'ou_root' },
        h('style', null, CSS),
        h(
          'button',
          {
            ref: triggerRef,
            type: 'button',
            className: 'ou_trigger',
            'aria-label': t('aria'),
            'aria-haspopup': 'dialog',
            'aria-expanded': open,
            title: t('aria'),
            onClick: () => setOpen((value) => !value),
          },
          h(
            'svg',
            { viewBox: '0 0 14 14', width: 14, height: 14, 'aria-hidden': true },
            h('path', {
              d: 'M2.5 11.5V7.5M7 11.5V2.5M11.5 11.5V5',
              stroke: 'currentColor',
              strokeWidth: 1.6,
              strokeLinecap: 'round',
            }),
          ),
        ),
        panel,
      )
    }

    return {
      inject: ['slots', 'locale'],
      apply(ctx) {
        ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'opencode-usage: dictionaries')
        ctx.slots.inject('conversation.composer.dock', () =>
          ctx.slots.register(
            {
              name: 'conversation.composer.dock',
              id: 'opencode-usage',
              order: 100,
              locale: NS,
            },
            UsageButton,
          ),
        )
      },
    }
  },
})
