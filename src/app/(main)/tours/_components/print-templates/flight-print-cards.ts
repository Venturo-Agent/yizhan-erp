/**
 * flight-print-cards - 航班卡片 HTML 產生器
 * （純函式，回傳 HTML 字串，從 flight-print-template.ts 抽離）
 */
import type { FlightInfo } from '@/types/flight.types'
import { CLASS_NAMES } from '../tour-print-constants'
import {
  calculateDuration,
  formatPnrDate,
  formatTime,
  escapeHtml,
  getBaggageForSegment,
} from './flight-print-helpers'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type PNR = any
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type PNRSegment = any

function getClassName(code: string): string {
  return CLASS_NAMES[code] || code
}

export function buildFlightCard(
  seg: PNRSegment,
  segIndex: number,
  totalSegments: number,
  pnr: PNR | undefined,
  getAirportName: (c: string) => string,
  getAirlineName: (c: string) => string
): string {
  const duration = seg.duration || calculateDuration(seg.departureTime, seg.arrivalTime)
  const classCode = seg.class
  const className = getClassName(classCode)
  const depAirportName = getAirportName(seg.origin) || seg.origin
  const arrAirportName = getAirportName(seg.destination) || seg.destination
  const airlineName = getAirlineName(seg.airline) || seg.airline
  const baggage = getBaggageForSegment(pnr, segIndex)

  // Header right: class + aircraft + baggage (conditional)
  const headerRightParts: string[] = []
  headerRightParts.push(`${className} (${escapeHtml(classCode)})`)
  if (seg.aircraft) {
    headerRightParts.push(escapeHtml(seg.aircraft))
  }
  if (baggage) {
    headerRightParts.push(`託運 ${escapeHtml(baggage)}`)
  }

  // Terminal info
  const depTerminalHtml = seg.departureTerminal
    ? `<br/>第${escapeHtml(seg.departureTerminal)}航廈 Terminal ${escapeHtml(seg.departureTerminal)}`
    : ''
  const arrTerminalHtml = seg.arrivalTerminal
    ? `<br/>第${escapeHtml(seg.arrivalTerminal)}航廈 Terminal ${escapeHtml(seg.arrivalTerminal)}`
    : ''

  // Via / stopover
  let flightTypeHtml = ''
  if (seg.via && seg.via.length > 0) {
    const stops = seg.via
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .map((v: any) => {
        const parts = [v.city || v.airport || '']
        if (v.duration) parts.push(v.duration)
        return parts.join(' ')
      })
      .join(', ')
    flightTypeHtml = `<div class="flight-type">經停 ${escapeHtml(stops)}</div>`
  } else if (seg.isDirect !== false) {
    flightTypeHtml = `<div class="flight-type">直飛 Direct</div>`
  }

  // suppress unused variable warning for totalSegments (kept for future use)
  void totalSegments

  return `
    <div class="flight-card">
      <div class="flight-card-header">
        <div class="flight-card-header-left">
          <div class="segment-badge">FLIGHT ${segIndex + 1}</div>
          <span class="flight-airline">${escapeHtml(airlineName)} ${seg.airline} * ${escapeHtml(seg.airline)}-${escapeHtml(seg.flightNumber)}</span>
        </div>
        <span class="flight-class">${headerRightParts.join(' | ')}</span>
      </div>
      <div class="flight-card-body">
        <div class="flight-endpoint departure">
          <div class="flight-time">${formatTime(seg.departureTime)}</div>
          <div class="flight-city">${escapeHtml(depAirportName)} ${escapeHtml(seg.origin)}</div>
          <div class="flight-detail">
            ${formatPnrDate(seg.departureDate)}${depTerminalHtml}
          </div>
        </div>
        <div class="flight-middle">
          ${duration ? `<div class="duration-label">${escapeHtml(duration)}</div>` : ''}
          <div class="flight-path">
            <div class="path-line path-dot-left"></div>
            <span class="path-icon"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z"/></svg></span>
            <div class="path-line path-dot-right"></div>
          </div>
          ${flightTypeHtml}
        </div>
        <div class="flight-endpoint arrival">
          <div class="flight-time">${formatTime(seg.arrivalTime)}</div>
          <div class="flight-city">${escapeHtml(arrAirportName)} ${escapeHtml(seg.destination)}</div>
          <div class="flight-detail">
            ${formatPnrDate(seg.departureDate)}${arrTerminalHtml}
          </div>
        </div>
      </div>
    </div>
  `
}

export function buildTourFlightCard(
  flight: FlightInfo,
  date: string,
  segIndex: number,
  getAirportName: (c: string) => string
): string {
  const depCity = getAirportName(flight.departureAirport || '') || flight.departureAirport || ''
  const arrCity = getAirportName(flight.arrivalAirport || '') || flight.arrivalAirport || ''

  return `
    <div class="flight-card">
      <div class="flight-card-header">
        <div class="flight-card-header-left">
          <div class="segment-badge">FLIGHT ${segIndex + 1}</div>
          <span class="flight-airline">${escapeHtml(flight.airline || '')}${flight.flightNumber ? `-${escapeHtml(flight.flightNumber)}` : ''}</span>
        </div>
        <span class="flight-class">經濟艙</span>
      </div>
      <div class="flight-card-body">
        <div class="flight-endpoint departure">
          <div class="flight-time">${escapeHtml(flight.departureTime || '')}</div>
          <div class="flight-city">${escapeHtml(depCity)} ${escapeHtml(flight.departureAirport || '')}</div>
          <div class="flight-detail">${escapeHtml(date)}</div>
        </div>
        <div class="flight-middle">
          ${flight.duration ? `<div class="duration-label">${escapeHtml(flight.duration)}</div>` : ''}
          <div class="flight-path">
            <div class="path-line path-dot-left"></div>
            <span class="path-icon"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z"/></svg></span>
            <div class="path-line path-dot-right"></div>
          </div>
        </div>
        <div class="flight-endpoint arrival">
          <div class="flight-time">${escapeHtml(flight.arrivalTime || '')}</div>
          <div class="flight-city">${escapeHtml(arrCity)} ${escapeHtml(flight.arrivalAirport || '')}</div>
          <div class="flight-detail">${escapeHtml(date)}</div>
        </div>
      </div>
    </div>
  `
}
