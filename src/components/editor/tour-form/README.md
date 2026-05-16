# TourForm Component Structure

This directory contains the refactored TourForm component, split from a single 1074-line file into smaller, maintainable modules.

## Directory Structure

```
tour-form/
├── README.md                           # This file
├── index.ts                            # Barrel exports for clean imports
├── types.ts                            # TypeScript type definitions (87 lines)
├── constants.ts                        # Icon options, city images, timezone data (148 lines)
├── utils.ts                            # Utility functions (22 lines)
├── hooks/
│   ├── useTourFormHandlers.ts         # Form event handlers (192 lines)
│   └── useRegionData.ts               # Region/country/city data management (62 lines)
└── sections/
    ├── CoverInfoSection.tsx           # Cover info form fields (158 lines)
    ├── FlightInfoSection.tsx          # Flight information fields (179 lines)
    ├── FeaturesSection.tsx            # Tour features management (77 lines)
    ├── FocusCardsSection.tsx          # Focus cards/attractions (64 lines)
    ├── LeaderMeetingSection.tsx       # Leader & meeting info (75 lines)
    └── DailyItinerarySection.tsx      # Daily itinerary editor (252 lines)
```

## Main Component

**Location**: `/src/components/editor/TourForm.tsx` (90 lines)

The main TourForm component now acts as an orchestrator, composing all the section components together.

## Architecture

### Types (`types.ts`)

All TypeScript interfaces and types used across the form:

- `TourFormData` - Main form data structure
- `FlightInfo`, `Feature`, `FocusCard`, `Activity`, `DailyItinerary`, etc.

### Constants (`constants.ts`)

Static data used throughout the form:

- `iconOptions` - Icon choices for features
- `cityImages` - City-to-image URL mappings
- `timezoneOffset` - Timezone calculations for flight duration

### Utilities (`utils.ts`)

Pure utility functions:

- `calculateFlightDuration()` - Calculates flight time based on timezone differences

### Hooks

#### `useTourFormHandlers.ts`

Provides all form update handlers:

- Field updates (basic, nested, city selection)
- Flight field updates with auto-calculation
- Feature management (add/update/remove)
- Focus card management
- Daily itinerary management
- Activity and recommendation management

#### `useRegionData.ts`

Manages country and city data:

- Lazy loads regions from the store
- Provides country/city dropdown options
- Maintains country selection state
- Maps country names to codes

### Sections

Each section is a focused, reusable component handling a specific part of the form:

1. **CoverInfoSection** - Basic tour information (title, description, dates, etc.)
2. **FlightInfoSection** - Outbound and return flight details
3. **FeaturesSection** - Tour features/highlights
4. **FocusCardsSection** - Featured attractions/places
5. **LeaderMeetingSection** - Tour leader and meeting point info
6. **DailyItinerarySection** - Day-by-day itinerary with activities, meals, accommodation

## Usage

```tsx
import { TourForm } from "@/components/editor/TourForm";
import type { TourFormData } from "@/components/editor/tour-form/types";

function MyComponent() {
  const [tourData, setTourData] = useState<TourFormData>({...});

  return <TourForm data={tourData} onChange={setTourData} />;
}
```

## Benefits of This Structure

1. **Maintainability**: Each file is under 300 lines, making it easy to understand and modify
2. **Separation of Concerns**: Logic, UI, types, and constants are clearly separated
3. **Reusability**: Sections and hooks can be reused independently
4. **Testability**: Each module can be tested in isolation
5. **Type Safety**: Strong typing throughout with shared type definitions
6. **Performance**: Custom hooks can be optimized independently
7. **Developer Experience**: Clear organization makes navigation easier

## Line Count Summary

- Main TourForm.tsx: 90 lines
- Largest section: DailyItinerarySection (252 lines)
- Total reduction: From 1074 lines to well-organized, modular structure
- All files under 300 line limit ✓
