# 🚫 BLOCKER RESOLUTION: API CONTRACT (R-004)

**Decision Date**: March 2, 2026  
**Status**: ✅ **FROZEN** - Ready for TASK-003 implementation  
**Owner**: Implementer + Test Agent + Documentation Agent

---

## Trip Management API Contract (EPIC-001)

**Base Path**: `/api/trips`  
**Version**: 1.0  
**Authentication**: Not implemented (future EPIC-003)  
**Rate Limiting**: Not implemented  

---

## Endpoints

### 1. POST /api/trips — Create Trip

**Purpose**: Create a new trip with title, description, `startDate`, `stopDate`

**Request**:
```json
POST /api/trips
Content-Type: application/json

{
  "title": "California Road Trip",
  "description": "Drive down the Pacific Coast",
  "startDate": "2026-05-01",
  "stopDate": "2026-05-14"
}
```

**Validation**:
- `title`: Required, string, 1-255 characters
- `description`: Optional, string, 0-1000 characters
- `startDate`: Required, ISO 8601 date (YYYY-MM-DD format only, no time)
- `stopDate`: Required, ISO 8601 date (YYYY-MM-DD format only, no time)
- **Rule**: `stopDate >= startDate` (validation error if violated)

**Response Success (201 Created)**:
```json
{
  "id": "clm1a2b3c4d5e6f7g8h9i0j1k",
  "title": "California Road Trip",
  "description": "Drive down the Pacific Coast",
  "startDate": "2026-05-01",
  "stopDate": "2026-05-14",
  "createdAt": "2026-03-02T09:30:00Z",
  "updatedAt": "2026-03-02T09:30:00Z"
}
```

**Response Error (400 Bad Request)**:
```json
{
  "error": "Validation failed",
  "details": [
    {
      "field": "stopDate",
      "message": "stopDate must be >= startDate"
    }
  ]
}
```

**Response Error (500 Internal Server Error)**:
```json
{
  "error": "Failed to create trip",
  "message": "Database error"
}
```

**Status Codes**:
- `201`: Trip created successfully
- `400`: Invalid request (validation error)
- `500`: Server error

---

### 2. GET /api/trips — List All Trips

**Purpose**: Retrieve all trips for current user

**Request**:
```
GET /api/trips
```

**Query Parameters**: None (yet)

**Response Success (200 OK)**:
```json
[
  {
    "id": "clm1a2b3c4d5e6f7g8h9i0j1k",
    "title": "California Road Trip",
    "description": "Drive down the Pacific Coast",
    "startDate": "2026-05-01",
    "stopDate": "2026-05-14",
    "createdAt": "2026-03-02T09:30:00Z",
    "updatedAt": "2026-03-02T09:30:00Z"
  },
  {
    "id": "clm2x3y4z5a6b7c8d9e0f1g2",
    "title": "NYC Weekend",
    "description": null,
    "startDate": "2026-03-15",
    "stopDate": "2026-03-17",
    "createdAt": "2026-03-02T10:00:00Z",
    "updatedAt": "2026-03-02T10:00:00Z"
  }
]
```

**Empty List Response (200 OK)**:
```json
[]
```

**Status Codes**:
- `200`: Success (may be empty array)
- `500`: Server error

---

### 3. GET /api/trips/:id — Get Trip Detail

**Purpose**: Retrieve a single trip by ID

**Request**:
```
GET /api/trips/clm1a2b3c4d5e6f7g8h9i0j1k
```

**Response Success (200 OK)**:
```json
{
  "id": "clm1a2b3c4d5e6f7g8h9i0j1k",
  "title": "California Road Trip",
  "description": "Drive down the Pacific Coast",
  "startDate": "2026-05-01",
  "stopDate": "2026-05-14",
  "createdAt": "2026-03-02T09:30:00Z",
  "updatedAt": "2026-03-02T09:30:00Z"
}
```

**Response Error (404 Not Found)**:
```json
{
  "error": "Trip not found",
  "id": "invalid-id"
}
```

**Status Codes**:
- `200`: Trip found
- `404`: Trip not found
- `500`: Server error

---

### 4. PATCH /api/trips/:id — Update Trip

**Purpose**: Update trip title, description, or dates

**Request**:
```json
PATCH /api/trips/clm1a2b3c4d5e6f7g8h9i0j1k
Content-Type: application/json

{
  "title": "California Road Trip - Extended",
  "stopDate": "2026-05-21"
}
```

**Fields** (all optional, only include fields to update):
- `title`: string, 1-255 characters
- `description`: string, 0-1000 characters
- `startDate`: ISO 8601 date
- `stopDate`: ISO 8601 date
- **Rule**: `stopDate >= startDate` after applying updates

**Response Success (200 OK)**:
```json
{
  "id": "clm1a2b3c4d5e6f7g8h9i0j1k",
  "title": "California Road Trip - Extended",
  "description": "Drive down the Pacific Coast",
  "startDate": "2026-05-01",
  "stopDate": "2026-05-21",
  "createdAt": "2026-03-02T09:30:00Z",
  "updatedAt": "2026-03-02T10:15:00Z"
}
```

**Response Error (400 Bad Request)**:
```json
{
  "error": "Validation failed",
  "details": [
    {
      "field": "stopDate",
      "message": "stopDate must be >= startDate"
    }
  ]
}
```

**Response Error (404 Not Found)**:
```json
{
  "error": "Trip not found",
  "id": "invalid-id"
}
```

**Status Codes**:
- `200`: Trip updated successfully
- `400`: Validation error
- `404`: Trip not found
- `500`: Server error

---

### 5. DELETE /api/trips/:id — Delete Trip

**Purpose**: Delete a trip permanently

**Request**:
```
DELETE /api/trips/clm1a2b3c4d5e6f7g8h9i0j1k
```

**Response Success (204 No Content)**:
```
(empty body)
```

**Response Error (404 Not Found)**:
```json
{
  "error": "Trip not found",
  "id": "invalid-id"
}
```

**Status Codes**:
- `204`: Trip deleted successfully
- `404`: Trip not found
- `500`: Server error

---

## Shared Zod Schema

**Location**: `src/lib/schemas/trip.ts`

```typescript
import { z } from 'zod';

// Base trip fields (common to all endpoints)
export const tripFieldsSchema = z.object({
  title: z.string().min(1).max(255),
  description: z.string().max(1000).optional().nullable(),
  startDate: z.string().date(), // YYYY-MM-DD format
  stopDate: z.string().date(),
}).refine(
  (data) => new Date(data.stopDate) >= new Date(data.startDate),
  {
    message: "stopDate must be >= startDate",
    path: ["stopDate"],
  }
);

// Create trip (POST) - same as base fields
export const createTripSchema = tripFieldsSchema;

// Update trip (PATCH) - all fields optional
export const updateTripSchema = tripFieldsSchema.partial();

// Trip response (all fields above + id, timestamps)
export const tripResponseSchema = tripFieldsSchema.extend({
  id: z.string(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

// List response
export const tripListSchema = z.array(tripResponseSchema);
```

---

## Usage in Frontend (React)

### Example: Create Trip
```tsx
const response = await fetch('/api/trips', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    title: "My Trip",
    startDate: "2026-05-01",
    stopDate: "2026-05-14"
  })
});

if (response.ok) {
  const newTrip = await response.json();
  console.log("Trip created:", newTrip);
} else {
  const error = await response.json();
  console.error("Error:", error.details);
}
```

### Example: List Trips
```tsx
const response = await fetch('/api/trips');
const trips = await response.json(); // Array of trips
```

### Example: Update Trip
```tsx
const response = await fetch(`/api/trips/${id}`, {
  method: 'PATCH',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    stopDate: "2026-05-21" // Just update this field
  })
});
```

---

## cURL Examples

### Create
```bash
curl -X POST http://localhost:3000/api/trips \
  -H "Content-Type: application/json" \
  -d '{
    "title": "California Road Trip",
    "description": "Drive down the Pacific Coast",
    "startDate": "2026-05-01",
    "stopDate": "2026-05-14"
  }'
```

### List
```bash
curl http://localhost:3000/api/trips
```

### Get Detail
```bash
curl http://localhost:3000/api/trips/clm1a2b3c4d5e6f7g8h9i0j1k
```

### Update
```bash
curl -X PATCH http://localhost:3000/api/trips/clm1a2b3c4d5e6f7g8h9i0j1k \
  -H "Content-Type: application/json" \
  -d '{"stopDate": "2026-05-21"}'
```

### Delete
```bash
curl -X DELETE http://localhost:3000/api/trips/clm1a2b3c4d5e6f7g8h9i0j1k
```

---

## Contract Frozen Until

**Do not modify this contract without team approval.**

**Changes require**:
1. Update this document
2. Notify all dependent agents (Implementer, Test, Documentation)
3. Update tests immediately
4. Update corresponding frontend app code

**Last Frozen**: March 2, 2026  
**Frozen By**: Development Lead

---

## Go Decision

**Status**: ✅ **APPROVED - Ready for TASK-003 implementation**

🎯 **Implementer Agent can now start TASK-003 API endpoints** using this contract as the specification.  
🧪 **Test Agent can now write integration tests** against these endpoints.  
📚 **Documentation Agent can now document** these endpoints in API.md.

---

**Associated Risk**: R-004 ✅ RESOLVED  
**Date**: March 2, 2026

