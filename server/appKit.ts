/**
 * A stylesheet of building blocks (vk-... classes) loaded into every interactive page (src/lib/appSimulation.ts). The
 * page builder used it for a short while (13 Nov 2026) and pages came out generic, so it's no longer told about it:
 * pages write their own styling to look like the real product again. It stays loaded so the pages built with it keep
 * their look; everything is opt-in by class, so no other page is affected.
 */

export const APP_KIT_CSS = `@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
:root{--vk-accent:#4f46e5;--vk-accent-hover:#4338ca;--vk-accent-soft:#eef2ff;--vk-on-accent:#fff;--vk-bg:#f6f7f9;--vk-surface:#fff;--vk-surface-2:#f9fafb;--vk-border:#e4e7ec;--vk-border-strong:#d0d5dd;--vk-text:#101828;--vk-muted:#667085;--vk-faint:#98a2b3;--vk-success:#12b76a;--vk-success-soft:#ecfdf3;--vk-warning:#f79009;--vk-warning-soft:#fffaeb;--vk-danger:#f04438;--vk-danger-soft:#fef3f2;--vk-info:#2e90fa;--vk-info-soft:#eff8ff;--vk-radius:8px;--vk-radius-lg:12px;--vk-pad:12px;--vk-font:'Inter',ui-sans-serif,system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;--vk-shadow:0 1px 2px rgba(16,24,40,.06),0 1px 3px rgba(16,24,40,.08);--vk-shadow-lg:0 12px 24px -4px rgba(16,24,40,.12),0 4px 8px -2px rgba(16,24,40,.06)}
.vk-app{margin:0;font-family:var(--vk-font);font-size:14px;line-height:1.5;color:var(--vk-text);background:var(--vk-bg);-webkit-font-smoothing:antialiased}
.vk-app *,.vk-app *::before,.vk-app *::after{box-sizing:border-box}
html:has(>body.vk-app){background:var(--vk-bg)}
:where(.vk-app) :where(input:not([type=checkbox],[type=radio],[type=range],[type=color],[type=file]),select,textarea){height:36px;padding:0 10px;border:1px solid var(--vk-border-strong);border-radius:var(--vk-radius);background:var(--vk-surface);color:var(--vk-text);font:inherit}
:where(.vk-app) :where(textarea){height:auto;padding:8px 10px}
:where(.vk-app) :where(button){font:inherit}
.vk-search input{width:100%;padding-left:32px}
.vk-app[data-density=compact]{--vk-pad:8px;font-size:13px}
.vk-app[data-density=roomy]{--vk-pad:16px}
.vk-app h1,.vk-app h2,.vk-app h3{margin:0;line-height:1.25;letter-spacing:-.01em}
.vk-h1{font-size:22px;font-weight:700}.vk-h2{font-size:17px;font-weight:600}.vk-h3{font-size:14px;font-weight:600}
.vk-muted{color:var(--vk-muted)}.vk-faint{color:var(--vk-faint)}.vk-small{font-size:12px}.vk-num{font-variant-numeric:tabular-nums;text-align:right}
.vk-row{display:flex;align-items:center;gap:var(--vk-pad)}.vk-col{display:flex;flex-direction:column;gap:var(--vk-pad)}.vk-grow{flex:1;min-width:0}.vk-wrap{flex-wrap:wrap}.vk-between{justify-content:space-between}
.vk-grid{display:grid;gap:var(--vk-pad)}
.vk-topbar{display:flex;align-items:center;gap:12px;height:52px;padding:0 16px;background:var(--vk-surface);border-bottom:1px solid var(--vk-border)}
.vk-topbar.vk-dark{background:#101828;color:#fff;border-color:#101828}
.vk-brand{display:flex;align-items:center;gap:8px;font-weight:700;font-size:15px;white-space:nowrap}
.vk-sidebar{display:flex;flex-direction:column;gap:2px;width:232px;flex-shrink:0;padding:12px 8px;background:var(--vk-surface);border-right:1px solid var(--vk-border);overflow:auto}
.vk-sidebar.vk-dark{background:#101828;border-color:#101828}
.vk-nav-label{padding:12px 10px 4px;font-size:11px;font-weight:600;letter-spacing:.06em;text-transform:uppercase;color:var(--vk-faint)}
.vk-nav-item{display:flex;align-items:center;gap:10px;width:100%;padding:7px 10px;border:0;border-radius:6px;background:none;color:var(--vk-muted);font:inherit;font-weight:500;text-align:left;cursor:pointer}
.vk-nav-item:hover{background:var(--vk-surface-2);color:var(--vk-text)}
.vk-nav-item.active,.vk-nav-item[aria-current]{background:var(--vk-accent-soft);color:var(--vk-accent)}
.vk-dark .vk-nav-item{color:#cbd5e1}.vk-dark .vk-nav-item:hover{background:rgba(255,255,255,.08);color:#fff}.vk-dark .vk-nav-item.active{background:rgba(255,255,255,.12);color:#fff}
.vk-main{flex:1;min-width:0;overflow:auto;padding:20px 24px}
.vk-page-head{display:flex;align-items:flex-end;justify-content:space-between;gap:12px;margin-bottom:16px}
.vk-toolbar{display:flex;align-items:center;gap:8px;flex-wrap:wrap;padding:8px 0}
.vk-breadcrumb{display:flex;gap:6px;font-size:12px;color:var(--vk-muted)}
.vk-card{background:var(--vk-surface);border:1px solid var(--vk-border);border-radius:var(--vk-radius-lg);box-shadow:var(--vk-shadow)}
.vk-card-head{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:12px 16px;border-bottom:1px solid var(--vk-border);font-weight:600}
.vk-card-body{padding:16px}
.vk-card-foot{display:flex;justify-content:flex-end;gap:8px;padding:12px 16px;border-top:1px solid var(--vk-border);background:var(--vk-surface-2);border-radius:0 0 var(--vk-radius-lg) var(--vk-radius-lg)}
.vk-btn{display:inline-flex;align-items:center;justify-content:center;gap:6px;height:34px;padding:0 14px;border:1px solid var(--vk-border-strong);border-radius:var(--vk-radius);background:var(--vk-surface);color:var(--vk-text);font:inherit;font-weight:600;font-size:13px;white-space:nowrap;cursor:pointer;box-shadow:0 1px 2px rgba(16,24,40,.05);transition:background .12s,border-color .12s,box-shadow .12s}
.vk-btn:hover{background:var(--vk-surface-2)}
.vk-btn-primary{background:var(--vk-accent);border-color:var(--vk-accent);color:var(--vk-on-accent)}.vk-btn-primary:hover{background:var(--vk-accent-hover);border-color:var(--vk-accent-hover)}
.vk-btn-danger{background:var(--vk-danger);border-color:var(--vk-danger);color:#fff}.vk-btn-danger:hover{filter:brightness(.94)}
.vk-btn-ghost{border-color:transparent;background:transparent;box-shadow:none;color:var(--vk-muted)}.vk-btn-ghost:hover{background:var(--vk-surface-2);color:var(--vk-text)}
.vk-btn-sm{height:28px;padding:0 10px;font-size:12px}.vk-btn-lg{height:44px;padding:0 20px;font-size:15px}
.vk-icon-btn{display:inline-flex;align-items:center;justify-content:center;width:32px;height:32px;border:0;border-radius:var(--vk-radius);background:transparent;color:var(--vk-muted);cursor:pointer}.vk-icon-btn:hover{background:var(--vk-surface-2);color:var(--vk-text)}
.vk-app :is(button,a,input,select,textarea,[tabindex]):focus-visible{outline:2px solid var(--vk-accent);outline-offset:2px}
.vk-app :is(button,input,select,textarea)[disabled],.vk-disabled{opacity:.45;cursor:not-allowed!important;box-shadow:none}
.vk-field{display:flex;flex-direction:column;gap:6px;margin-bottom:12px}
.vk-label{font-size:13px;font-weight:600;color:var(--vk-text)}
.vk-help{font-size:12px;color:var(--vk-muted)}.vk-error{font-size:12px;color:var(--vk-danger)}
.vk-input,.vk-select,.vk-textarea{width:100%;height:36px;padding:0 10px;border:1px solid var(--vk-border-strong);border-radius:var(--vk-radius);background:var(--vk-surface);color:var(--vk-text);font:inherit;box-shadow:0 1px 2px rgba(16,24,40,.05)}
.vk-textarea{height:auto;min-height:88px;padding:8px 10px;resize:vertical}
.vk-input:focus,.vk-select:focus,.vk-textarea:focus{outline:none;border-color:var(--vk-accent);box-shadow:0 0 0 3px var(--vk-accent-soft)}
.vk-input.invalid,.vk-select.invalid,.vk-textarea.invalid{border-color:var(--vk-danger);box-shadow:0 0 0 3px var(--vk-danger-soft)}
.vk-search{position:relative}.vk-search .vk-input{padding-left:32px}.vk-search svg{position:absolute;left:10px;top:50%;transform:translateY(-50%);width:16px;height:16px;color:var(--vk-faint)}
.vk-check{display:inline-flex;align-items:center;gap:8px;cursor:pointer}.vk-check input{width:16px;height:16px;accent-color:var(--vk-accent)}
.vk-switch{appearance:none;width:36px;height:20px;border-radius:999px;background:var(--vk-border-strong);position:relative;cursor:pointer;transition:background .15s}.vk-switch::after{content:'';position:absolute;top:2px;left:2px;width:16px;height:16px;border-radius:50%;background:#fff;box-shadow:var(--vk-shadow);transition:left .15s}.vk-switch:checked{background:var(--vk-accent)}.vk-switch:checked::after{left:18px}
.vk-table-wrap{overflow:auto;border:1px solid var(--vk-border);border-radius:var(--vk-radius-lg);background:var(--vk-surface)}
.vk-table{width:100%;border-collapse:collapse;font-size:13px}
.vk-table th{position:sticky;top:0;z-index:1;padding:10px 12px;background:var(--vk-surface-2);border-bottom:1px solid var(--vk-border);color:var(--vk-muted);font-size:12px;font-weight:600;text-align:left;white-space:nowrap}
.vk-table td{padding:10px 12px;border-bottom:1px solid var(--vk-border);vertical-align:middle}
.vk-table tr:last-child td{border-bottom:0}.vk-table tbody tr:hover{background:var(--vk-surface-2)}.vk-table tr.selected{background:var(--vk-accent-soft)}
.vk-table th.sortable{cursor:pointer}.vk-table th.sortable:hover{color:var(--vk-text)}
.vk-badge{display:inline-flex;align-items:center;gap:4px;padding:2px 8px;border-radius:999px;font-size:12px;font-weight:500;line-height:18px;white-space:nowrap;background:var(--vk-surface-2);color:var(--vk-muted);border:1px solid var(--vk-border)}
.vk-badge-green{background:var(--vk-success-soft);color:#027a48;border-color:#abefc6}.vk-badge-amber{background:var(--vk-warning-soft);color:#b54708;border-color:#fedf89}.vk-badge-red{background:var(--vk-danger-soft);color:#b42318;border-color:#fecdca}.vk-badge-blue{background:var(--vk-info-soft);color:#175cd3;border-color:#b2ddff}.vk-badge-accent{background:var(--vk-accent-soft);color:var(--vk-accent);border-color:transparent}
.vk-dot{width:8px;height:8px;border-radius:50%;background:currentColor;display:inline-block}
.vk-tabs{display:flex;gap:4px;border-bottom:1px solid var(--vk-border);overflow-x:auto}
.vk-tab{padding:9px 12px;border:0;border-bottom:2px solid transparent;margin-bottom:-1px;background:none;color:var(--vk-muted);font:inherit;font-weight:600;font-size:13px;white-space:nowrap;cursor:pointer}.vk-tab:hover{color:var(--vk-text)}.vk-tab.active,.vk-tab[aria-selected=true]{color:var(--vk-accent);border-color:var(--vk-accent)}
.vk-segmented{display:inline-flex;padding:3px;gap:2px;background:var(--vk-surface-2);border:1px solid var(--vk-border);border-radius:var(--vk-radius)}.vk-segmented button{border:0;padding:4px 10px;border-radius:6px;background:none;font:inherit;font-size:12px;font-weight:600;color:var(--vk-muted);cursor:pointer}.vk-segmented button.active{background:var(--vk-surface);color:var(--vk-text);box-shadow:var(--vk-shadow)}
.vk-stat{padding:16px;background:var(--vk-surface);border:1px solid var(--vk-border);border-radius:var(--vk-radius-lg);box-shadow:var(--vk-shadow)}.vk-stat-label{font-size:12px;font-weight:500;color:var(--vk-muted)}.vk-stat-value{margin-top:4px;font-size:24px;font-weight:700;letter-spacing:-.02em;font-variant-numeric:tabular-nums}.vk-stat-delta{font-size:12px;font-weight:600}.vk-up{color:#027a48}.vk-down{color:#b42318}
.vk-avatar{display:inline-flex;align-items:center;justify-content:center;width:28px;height:28px;flex-shrink:0;border-radius:50%;background:var(--vk-accent-soft);color:var(--vk-accent);font-size:11px;font-weight:700}
.vk-list{display:flex;flex-direction:column}.vk-list-item{display:flex;align-items:center;gap:10px;padding:10px 12px;border-bottom:1px solid var(--vk-border);cursor:pointer}.vk-list-item:hover{background:var(--vk-surface-2)}.vk-list-item.active{background:var(--vk-accent-soft);box-shadow:inset 3px 0 0 var(--vk-accent)}
.vk-chip{display:inline-flex;align-items:center;gap:6px;padding:3px 10px;border:1px solid var(--vk-border-strong);border-radius:999px;background:var(--vk-surface);font-size:12px;font-weight:500;cursor:pointer}.vk-chip.active{border-color:var(--vk-accent);background:var(--vk-accent-soft);color:var(--vk-accent)}
.vk-svg-label{font-family:var(--vk-font);font-size:13px;font-weight:600;fill:var(--vk-text);paint-order:stroke;stroke:var(--vk-surface);stroke-width:3.5px;stroke-linejoin:round}
.vk-divider{height:1px;background:var(--vk-border);border:0;margin:12px 0}
.vk-kbd{padding:1px 6px;border:1px solid var(--vk-border-strong);border-bottom-width:2px;border-radius:4px;font-size:11px;font-family:ui-monospace,monospace;background:var(--vk-surface)}
.vk-backdrop{position:fixed;inset:0;z-index:50;display:flex;align-items:center;justify-content:center;padding:16px;background:rgba(16,24,40,.45);backdrop-filter:blur(2px)}
.vk-modal{width:min(520px,100%);max-height:90vh;overflow:auto;background:var(--vk-surface);border-radius:var(--vk-radius-lg);box-shadow:var(--vk-shadow-lg)}.vk-modal-head{display:flex;align-items:center;justify-content:space-between;padding:16px 20px 8px;font-size:16px;font-weight:600}.vk-modal-body{padding:8px 20px 16px}.vk-modal-foot{display:flex;justify-content:flex-end;gap:8px;padding:12px 20px;border-top:1px solid var(--vk-border)}
.vk-drawer{position:fixed;top:0;right:0;bottom:0;z-index:50;width:min(440px,100%);overflow:auto;background:var(--vk-surface);box-shadow:var(--vk-shadow-lg);border-left:1px solid var(--vk-border)}
.vk-menu{position:absolute;z-index:40;min-width:180px;padding:4px;background:var(--vk-surface);border:1px solid var(--vk-border);border-radius:var(--vk-radius);box-shadow:var(--vk-shadow-lg)}.vk-menu-item{display:flex;align-items:center;gap:8px;width:100%;padding:7px 10px;border:0;border-radius:6px;background:none;font:inherit;font-size:13px;text-align:left;cursor:pointer}.vk-menu-item:hover{background:var(--vk-surface-2)}
.vk-toast{position:fixed;bottom:16px;left:50%;transform:translateX(-50%);z-index:60;padding:10px 16px;border-radius:var(--vk-radius);background:#101828;color:#fff;font-size:13px;font-weight:500;box-shadow:var(--vk-shadow-lg)}
.vk-alert{display:flex;gap:10px;padding:12px 14px;border-radius:var(--vk-radius);border:1px solid var(--vk-border);background:var(--vk-surface-2);font-size:13px}.vk-alert-info{background:var(--vk-info-soft);border-color:#b2ddff}.vk-alert-warning{background:var(--vk-warning-soft);border-color:#fedf89}.vk-alert-danger{background:var(--vk-danger-soft);border-color:#fecdca}.vk-alert-success{background:var(--vk-success-soft);border-color:#abefc6}
.vk-empty{padding:40px 16px;text-align:center;color:var(--vk-muted)}
.vk-progress{height:6px;border-radius:999px;background:var(--vk-surface-2);overflow:hidden}.vk-progress>span{display:block;height:100%;background:var(--vk-accent);border-radius:inherit}
.vk-tooltip{position:absolute;z-index:45;padding:4px 8px;border-radius:6px;background:#101828;color:#fff;font-size:12px;white-space:nowrap;pointer-events:none}
.vk-skeleton{border-radius:6px;background:linear-gradient(90deg,var(--vk-surface-2),var(--vk-border),var(--vk-surface-2));background-size:200% 100%;animation:vk-shimmer 1.2s infinite}@keyframes vk-shimmer{to{background-position:-200% 0}}`;
