export function CalendarStyles() {
  return (
    <style jsx global>{`
      /* FullCalendar CIS v2.1 樣式 */
      .calendar-container {
        font-family: inherit;
      }

      .fc .fc-toolbar-title {
        font-size: 1.5rem;
        font-weight: 600;
        color: var(--morandi-primary);
      }

      .fc .fc-button {
        background-color: var(--morandi-muted);
        border-color: var(--morandi-muted);
        color: white;
        padding: 0.5rem 1rem;
        font-size: 0.875rem;
        text-transform: none;
        box-shadow: none;
      }

      .fc .fc-button:hover {
        background-color: var(--morandi-gold-hover);
        border-color: var(--morandi-gold-hover);
      }

      .fc .fc-button:disabled {
        background-color: var(--morandi-container);
        border-color: var(--morandi-container);
        color: var(--morandi-secondary);
        opacity: 0.6;
      }

      .fc .fc-button-primary:not(:disabled).fc-button-active {
        background-color: var(--morandi-gold-hover);
        border-color: var(--morandi-gold-hover);
      }

      /* 星期標題列 */
      .fc .fc-col-header-cell {
        background-color: color-mix(in srgb, var(--background) 40%, transparent);
        padding: 0.75rem 1rem;
        font-weight: 500;
        font-size: 12px;
        letter-spacing: 0.03em;
        color: var(--cal-weekday-text);
        border-color: var(--morandi-container);
        border-bottom-width: 1px;
      }

      /* 周末標題特殊顏色（繼承 cal-weekday-text，視覺自然偏淡） */
      .fc .fc-col-header-cell.fc-day-sat,
      .fc .fc-col-header-cell.fc-day-sun {
        color: var(--cal-weekday-text);
        opacity: 0.7;
      }

      /* 日曆格子 */
      .fc .fc-daygrid-day {
        border-color: var(--morandi-container);
        transition: background-color 0.2s;
      }

      .fc .fc-daygrid-day-frame {
        min-height: 140px;
        padding: 2px 4px;
        background-color: transparent;
      }

      .fc-theme-standard td,
      .fc-theme-standard th {
        border-color: var(--morandi-container);
      }

      .fc-theme-standard .fc-scrollgrid {
        border-color: var(--morandi-container);
        border-top: 1px solid var(--morandi-container);
        border-left: 1px solid var(--morandi-container);
      }

      /* 日期數字 */
      .fc .fc-daygrid-day-top {
        flex-direction: row;
        justify-content: space-between;
        align-items: flex-start;
      }

      .fc .fc-daygrid-day-number {
        color: var(--morandi-primary);
        padding: 2px 4px;
        font-size: 14px;
        font-weight: 500;
        border-radius: 4px;
        transition: background-color 0.2s;
      }

      .fc .fc-daygrid-day-number:hover {
        background-color: var(--background);
      }

      /* 周末日期顏色 */
      .fc .fc-day-sat .fc-daygrid-day-number,
      .fc .fc-day-sun .fc-daygrid-day-number {
        color: var(--morandi-muted);
        font-weight: 600;
      }

      /* 周末格子背景 */
      .fc .fc-day-sat,
      .fc .fc-day-sun {
        background-color: color-mix(in srgb, var(--background) 50%, transparent);
      }

      /* 今天（ring inset 標記、與 selected 有視覺區分、不搶眼） */
      .fc .fc-day-today {
        background-color: color-mix(in srgb, var(--cal-today-ring) 5%, transparent) !important;
      }

      .fc .fc-day-today .fc-daygrid-day-number {
        color: var(--cal-today-fg);
        width: 28px;
        height: 28px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 6px;
        font-weight: 700;
        box-shadow: inset 0 0 0 1px var(--cal-today-ring);
      }

      /* Hover 效果 */
      .fc .fc-daygrid-day:hover {
        background-color: var(--cal-day-hover);
        cursor: pointer;
      }

      /* 事件樣式 */
      .fc .fc-daygrid-day-events {
        margin-top: 0 !important;
      }

      .fc-event {
        cursor: pointer;
        border: none;
        border-left: 2px solid currentColor;
        font-size: 11px;
        line-height: 1.2 !important;
        padding: 0 4px !important;
        border-radius: 0 4px 4px 0;
        font-weight: 500;
        box-shadow: 0 1px 3px color-mix(in srgb, var(--morandi-primary) 5%, transparent);
        transition: all 0.2s ease;
        margin: 0 2px !important;
        background-color: color-mix(in srgb, var(--morandi-muted) 10%, transparent);
        color: var(--morandi-primary);
      }

      .fc-event .fc-event-main {
        padding: 0 !important;
      }

      /* 事件容器間距 - 控制每行高度 */
      .fc .fc-daygrid-event-harness {
        margin-bottom: 2px !important;
      }

      .fc .fc-daygrid-block-event {
        height: 17px !important;
        min-height: 17px !important;
        border-top: 2px solid white !important;
      }

      .fc-event:hover {
        background-color: color-mix(in srgb, var(--morandi-muted) 20%, transparent);
        box-shadow: 0 2px 4px color-mix(in srgb, var(--morandi-primary) 10%, transparent);
      }

      .fc-event-title {
        font-weight: 500;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      /* 更多連結 */
      .fc-daygrid-more-link {
        color: var(--morandi-muted) !important;
        font-weight: 600 !important;
        text-decoration: none !important;
        padding: 2px 6px !important;
        border-radius: 4px !important;
        transition: all 0.2s ease !important;
        display: inline-block !important;
        margin-top: 4px !important;
        font-size: 10px !important;
        background-color: color-mix(in srgb, var(--morandi-muted) 10%, transparent) !important;
      }

      .fc-daygrid-more-link:hover {
        background-color: color-mix(in srgb, var(--morandi-muted) 20%, transparent) !important;
        color: var(--morandi-gold-hover) !important;
      }

      .fc-popover {
        display: none !important;
      }

      /* 非當月日期 - 隱藏 */
      .fc .fc-day-other {
        visibility: hidden;
      }

      .fc .fc-day-other .fc-daygrid-day-number,
      .fc .fc-day-other .fc-daygrid-day-events {
        display: none;
      }

      /* 事件顏色類型 */
      .fc-event[data-event-type='tour'] {
        border-left-color: var(--status-info);
        background-color: color-mix(in srgb, var(--status-info) 20%, transparent);
      }

      .fc-event[data-event-type='meeting'] {
        border-left-color: var(--morandi-muted);
        background-color: color-mix(in srgb, var(--morandi-muted) 10%, transparent);
      }

      .fc-event[data-event-type='deadline'] {
        border-left-color: var(--morandi-red);
        background-color: color-mix(in srgb, var(--morandi-red) 10%, transparent);
      }

      .fc-event[data-event-type='holiday'] {
        border-left-color: var(--morandi-green);
        background-color: color-mix(in srgb, var(--morandi-green) 20%, transparent);
      }

      .fc-event[data-event-type='task'] {
        border-left-color: var(--morandi-gold);
        background-color: color-mix(in srgb, var(--morandi-gold) 10%, transparent);
      }

      /* 生日事件特殊樣式 - 圓形點點 */
      .fc-event[data-event-type='birthday'] {
        border-radius: 50% !important;
        width: 24px !important;
        height: 24px !important;
        padding: 0 !important;
        margin: 2px !important;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        overflow: hidden !important;
        border: none !important;
        border-left: none !important;
      }

      .fc-event[data-event-type='birthday'] .fc-event-title {
        font-size: 14px !important;
        line-height: 1 !important;
        text-align: center !important;
      }

      /* 單日事件樣式 */
      .fc .fc-daygrid-event.fc-event-start.fc-event-end {
        margin: 0 2px !important;
      }

      /* 跨日事件樣式 */
      .fc .fc-daygrid-event:not(.fc-event-start):not(.fc-event-end) {
        border-left: none;
        border-radius: 0;
        opacity: 0.7;
      }

      .fc .fc-daygrid-event.fc-event-start:not(.fc-event-end) {
        border-radius: 0 0 0 0;
        margin-right: 0;
      }

      .fc .fc-daygrid-event.fc-event-end:not(.fc-event-start) {
        border-left: none;
        border-radius: 0 4px 4px 0;
        margin-left: 0;
      }

      /* ===== 週視圖 / 日視圖樣式 ===== */

      /* 時間軸樣式 */
      .fc .fc-timegrid-slot {
        height: 40px;
        border-color: var(--morandi-container);
      }

      .fc .fc-timegrid-slot-label {
        font-size: 12px;
        color: var(--morandi-primary);
        font-weight: 600;
        padding: 0 8px;
      }

      .fc .fc-timegrid-slot-lane {
        border-color: var(--morandi-container);
      }

      /* 時間軸事件 */
      .fc .fc-timegrid-event {
        border-radius: 4px;
        border: none;
        border-left: 3px solid currentColor;
        box-shadow: 0 1px 3px color-mix(in srgb, var(--morandi-primary) 10%, transparent);
        font-size: 11px;
        padding: 2px 4px;
      }

      .fc .fc-timegrid-event .fc-event-main {
        padding: 2px 4px;
      }

      .fc .fc-timegrid-event .fc-event-time {
        font-size: 10px;
        font-weight: 600;
        margin-bottom: 2px;
      }

      .fc .fc-timegrid-event .fc-event-title {
        font-size: 11px;
        font-weight: 500;
      }

      /* 全天事件區塊 */
      .fc .fc-timegrid-divider {
        padding: 0;
        border-color: var(--morandi-container);
      }

      .fc .fc-daygrid-body {
        border-color: var(--morandi-container);
      }

      /* 現在時間指示線 */
      .fc .fc-timegrid-now-indicator-line {
        border-color: var(--morandi-muted);
        border-width: 2px;
      }

      .fc .fc-timegrid-now-indicator-arrow {
        border-color: var(--morandi-muted);
        border-top-color: transparent;
        border-bottom-color: transparent;
      }

      /* 週視圖日期標題 */
      .fc .fc-timegrid-axis {
        border-color: var(--morandi-container);
        background-color: color-mix(in srgb, var(--background) 40%, transparent);
      }

      /* 週/日視圖：今天不需要特殊背景，表頭已經很清楚 */
      .fc-timeGridWeek-view .fc-day-today,
      .fc-timeGridDay-view .fc-day-today {
        background-color: transparent !important;
      }

      /* 週/日視圖：隱藏全天區塊的日期數字（表頭已經有了） */
      .fc-timeGridWeek-view .fc-daygrid-day-number,
      .fc-timeGridDay-view .fc-daygrid-day-number {
        display: none !important;
      }

      /* 週/日視圖：今天的表頭用 today token 標記 */
      .fc-timeGridWeek-view .fc-col-header-cell.fc-day-today a,
      .fc-timeGridDay-view .fc-col-header-cell.fc-day-today a {
        color: var(--cal-today-fg);
        font-weight: 700;
      }

      /* 拖曳時的樣式 */
      .fc-event.fc-event-dragging {
        opacity: 0.8;
        box-shadow: 0 4px 12px color-mix(in srgb, var(--morandi-primary) 15%, transparent);
        transform: scale(1.02);
      }

      /* 拖曳佔位符 */
      .fc-event.fc-event-mirror {
        opacity: 0.5;
        background-color: var(--morandi-muted) !important;
      }

      /* 可拖曳事件的游標 */
      .fc-event[data-event-type='personal'],
      .fc-event[data-event-type='company'] {
        cursor: grab;
      }

      .fc-event[data-event-type='personal']:active,
      .fc-event[data-event-type='company']:active {
        cursor: grabbing;
      }

      /* 不可拖曳的事件 */
      .fc-event[data-event-type='tour'],
      .fc-event[data-event-type='birthday'] {
        cursor: pointer;
      }
    `}</style>
  )
}
