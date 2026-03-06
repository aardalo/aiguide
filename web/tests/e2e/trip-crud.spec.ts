/**
 * Trip Management E2E Tests
 * Task: TASK-007
 * 
 * Tests the complete user journey for trip CRUD operations
 */

import { test, expect } from '@playwright/test';

// Test data
const TEST_TRIP = {
  title: 'Summer Road Trip 2026',
  description: 'An amazing journey across the western United States',
  startDate: '2026-06-01',
  stopDate: '2026-06-15',
};

const TEST_TRIP_2 = {
  title: 'Weekend Getaway',
  description: 'Quick trip to the mountains',
  startDate: '2026-07-10',
  stopDate: '2026-07-12',
};

test.describe('Trip Management - Full CRUD Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the map page
    await page.goto('/map');
    
    // Wait for map to load
    await expect(page.getByText('🗺️ Map Ready')).toBeVisible({ timeout: 10000 });
  });

  test('should create a new trip and display it in the list', async ({ page }) => {
    // Fill in the trip creation form
    await page.getByLabel(/trip title/i).fill(TEST_TRIP.title);
    await page.getByLabel(/description/i).fill(TEST_TRIP.description);
    await page.getByLabel(/start date/i).fill(TEST_TRIP.startDate);
    await page.getByLabel(/end date/i).fill(TEST_TRIP.stopDate);

    // Submit the form
    await page.getByRole('button', { name: /create trip/i }).click();

    // Wait for success message
    await expect(page.getByText(/trip created successfully/i)).toBeVisible();

    // Verify form is cleared
    await expect(page.getByLabel(/trip title/i)).toHaveValue('');

    // Switch to "My Trips" tab
    await page.getByRole('button', { name: /my trips/i }).click();

    // Verify trip appears in the list
    await expect(page.getByText(TEST_TRIP.title)).toBeVisible();
    await expect(page.getByText(/an amazing journey/i)).toBeVisible();
    await expect(page.getByText(/15 days/i)).toBeVisible();
  });

  test('should view trip details', async ({ page }) => {
    // Create a trip first
    await page.getByLabel(/trip title/i).fill(TEST_TRIP.title);
    await page.getByLabel(/description/i).fill(TEST_TRIP.description);
    await page.getByLabel(/start date/i).fill(TEST_TRIP.startDate);
    await page.getByLabel(/end date/i).fill(TEST_TRIP.stopDate);
    await page.getByRole('button', { name: /create trip/i }).click();

    await expect(page.getByText(/trip created successfully/i)).toBeVisible();

    // Click on the trip in the list
    await page.getByText(TEST_TRIP.title).click();

    // Verify detail view shows all information
    await expect(page.getByRole('heading', { name: TEST_TRIP.title })).toBeVisible();
    await expect(page.getByText(TEST_TRIP.description)).toBeVisible();
    await expect(page.getByText(/sunday, june 1, 2026/i)).toBeVisible();
    await expect(page.getByText(/monday, june 15, 2026/i)).toBeVisible();
    await expect(page.getByText(/15 days/i)).toBeVisible();

    // Verify metadata is displayed
    await expect(page.getByText(/created/i)).toBeVisible();
    await expect(page.getByText(/last updated/i)).toBeVisible();
    await expect(page.getByText(/trip id/i)).toBeVisible();
  });

  test('should delete a trip with confirmation', async ({ page }) => {
    // Create a trip first
    await page.getByLabel(/trip title/i).fill(TEST_TRIP.title);
    await page.getByLabel(/description/i).fill(TEST_TRIP.description);
    await page.getByLabel(/start date/i).fill(TEST_TRIP.startDate);
    await page.getByLabel(/end date/i).fill(TEST_TRIP.stopDate);
    await page.getByRole('button', { name: /create trip/i }).click();

    await expect(page.getByText(/trip created successfully/i)).toBeVisible();

    // Go to trip list
    await page.getByRole('button', { name: /my trips/i }).click();

    // Verify trip is in the list
    await expect(page.getByText(TEST_TRIP.title)).toBeVisible();

    // Click delete button
    const deleteButtons = page.getByRole('button', { name: /delete/i });
    await deleteButtons.first().click();

    // Verify confirmation modal appears
    await expect(page.getByText(/delete trip\?/i)).toBeVisible();
    await expect(page.getByText(new RegExp(TEST_TRIP.title))).toBeVisible();

    // Confirm deletion
    await page.getByRole('button', { name: /delete/i }).last().click();

    // Wait for modal to close
    await expect(page.getByText(/delete trip\?/i)).not.toBeVisible();

    // Verify trip is removed from list
    await expect(page.getByText(TEST_TRIP.title)).not.toBeVisible();

    // Verify empty state appears
    await expect(page.getByText(/no trips yet/i)).toBeVisible();
  });

  test('should cancel trip deletion', async ({ page }) => {
    // Create a trip first
    await page.getByLabel(/trip title/i).fill(TEST_TRIP.title);
    await page.getByLabel(/description/i).fill(TEST_TRIP.description);
    await page.getByLabel(/start date/i).fill(TEST_TRIP.startDate);
    await page.getByLabel(/end date/i).fill(TEST_TRIP.stopDate);
    await page.getByRole('button', { name: /create trip/i }).click();

    await expect(page.getByText(/trip created successfully/i)).toBeVisible();

    // Go to trip list
    await page.getByRole('button', { name: /my trips/i }).click();

    // Click delete button
    const deleteButtons = page.getByRole('button', { name: /delete/i });
    await deleteButtons.first().click();

    // Verify confirmation modal appears
    await expect(page.getByText(/delete trip\?/i)).toBeVisible();

    // Cancel deletion
    await page.getByRole('button', { name: /cancel/i }).click();

    // Wait for modal to close
    await expect(page.getByText(/delete trip\?/i)).not.toBeVisible();

    // Verify trip is still in the list
    await expect(page.getByText(TEST_TRIP.title)).toBeVisible();
  });

  test('should persist trips after page reload', async ({ page }) => {
    // Create a trip
    await page.getByLabel(/trip title/i).fill(TEST_TRIP.title);
    await page.getByLabel(/description/i).fill(TEST_TRIP.description);
    await page.getByLabel(/start date/i).fill(TEST_TRIP.startDate);
    await page.getByLabel(/end date/i).fill(TEST_TRIP.stopDate);
    await page.getByRole('button', { name: /create trip/i }).click();

    await expect(page.getByText(/trip created successfully/i)).toBeVisible();

    // Reload the page
    await page.reload();

    // Wait for map to load again
    await expect(page.getByText('🗺️ Map Ready')).toBeVisible({ timeout: 10000 });

    // Switch to "My Trips" tab
    await page.getByRole('button', { name: /my trips/i }).click();

    // Verify trip still exists after reload
    await expect(page.getByText(TEST_TRIP.title)).toBeVisible();
  });

  test('should handle multiple trips', async ({ page }) => {
    // Create first trip
    await page.getByLabel(/trip title/i).fill(TEST_TRIP.title);
    await page.getByLabel(/description/i).fill(TEST_TRIP.description);
    await page.getByLabel(/start date/i).fill(TEST_TRIP.startDate);
    await page.getByLabel(/end date/i).fill(TEST_TRIP.stopDate);
    await page.getByRole('button', { name: /create trip/i }).click();

    await expect(page.getByText(/trip created successfully/i)).toBeVisible();

    // Switch back to create view
    await page.getByRole('button', { name: /create trip/i }).click();

    // Create second trip
    await page.getByLabel(/trip title/i).fill(TEST_TRIP_2.title);
    await page.getByLabel(/description/i).fill(TEST_TRIP_2.description);
    await page.getByLabel(/start date/i).fill(TEST_TRIP_2.startDate);
    await page.getByLabel(/end date/i).fill(TEST_TRIP_2.stopDate);
    await page.getByRole('button', { name: /create trip/i }).click();

    await expect(page.getByText(/trip created successfully/i)).toBeVisible();

    // Verify both trips in list
    await expect(page.getByText(TEST_TRIP.title)).toBeVisible();
    await expect(page.getByText(TEST_TRIP_2.title)).toBeVisible();
    await expect(page.getByText(/your trips \(2\)/i)).toBeVisible();
  });
});

test.describe('Trip Form Validation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/map');
    await expect(page.getByText('🗺️ Map Ready')).toBeVisible({ timeout: 10000 });
  });

  test('should show validation errors for missing required fields', async ({ page }) => {
    // Try to submit empty form
    await page.getByRole('button', { name: /create trip/i }).click();

    // Wait for error messages
    await expect(page.getByText(/title is required/i)).toBeVisible();
    await expect(page.getByText(/start date must be a valid date/i)).toBeVisible();
  });

  test('should validate date range (stop date must be >= start date)', async ({ page }) => {
    // Fill form with invalid date range
    await page.getByLabel(/trip title/i).fill('Invalid Date Trip');
    await page.getByLabel(/start date/i).fill('2026-06-15');
    await page.getByLabel(/end date/i).fill('2026-06-01'); // Before start date

    // Submit form
    await page.getByRole('button', { name: /create trip/i }).click();

    // Verify validation error
    await expect(page.getByText(/stop date must be equal to or after/i)).toBeVisible();
  });

  test('should allow same start and end date', async ({ page }) => {
    // Fill form with same start and end date
    await page.getByLabel(/trip title/i).fill('Single Day Trip');
    await page.getByLabel(/start date/i).fill('2026-06-01');
    await page.getByLabel(/end date/i).fill('2026-06-01'); // Same day
    await page.getByLabel(/description/i).fill('A one-day adventure');

    // Submit form
    await page.getByRole('button', { name: /create trip/i }).click();

    // Verify success
    await expect(page.getByText(/trip created successfully/i)).toBeVisible();

    // Verify in list shows "1 days"
    await expect(page.getByText('Single Day Trip')).toBeVisible();
    await expect(page.getByText(/1 days/i)).toBeVisible();
  });

  test('should enforce title max length (200 characters)', async ({ page }) => {
    const longTitle = 'A'.repeat(201);

    // Try to fill with overly long title
    await page.getByLabel(/trip title/i).fill(longTitle);

    // Verify input is truncated to 200 characters (due to maxLength attribute)
    const titleValue = await page.getByLabel(/trip title/i).inputValue();
    expect(titleValue.length).toBeLessThanOrEqual(200);
  });

  test('should enforce description max length (1000 characters)', async ({ page }) => {
    const longDescription = 'B'.repeat(1001);

    // Try to fill with overly long description
    await page.getByLabel(/description/i).fill(longDescription);

    // Verify input is truncated to 1000 characters (due to maxLength attribute)
    const descriptionValue = await page.getByLabel(/description/i).inputValue();
    expect(descriptionValue.length).toBeLessThanOrEqual(1000);
  });

  test('should clear validation errors when user corrects field', async ({ page }) => {
    // Submit empty form to trigger errors
    await page.getByRole('button', { name: /create trip/i }).click();

    // Verify error appears
    await expect(page.getByText(/title is required/i)).toBeVisible();

    // Fill in the title
    await page.getByLabel(/trip title/i).fill('My Trip');

    // Verify error disappears
    await expect(page.getByText(/title is required/i)).not.toBeVisible();
  });
});

test.describe('Navigation and UI Interactions', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/map');
    await expect(page.getByText('🗺️ Map Ready')).toBeVisible({ timeout: 10000 });
  });

  test('should navigate between Create and My Trips tabs', async ({ page }) => {
    // Verify starting on Create tab (default)
    await expect(page.getByRole('button', { name: /create trip/i })).toHaveClass(/bg-blue-600/);

    // Click My Trips tab
    await page.getByRole('button', { name: /my trips/i }).click();

    // Verify My Trips tab is active
    await expect(page.getByRole('button', { name: /my trips/i })).toHaveClass(/bg-blue-600/);

    // Verify empty state is shown
    await expect(page.getByText(/no trips yet/i)).toBeVisible();

    // Click Create Trip tab
    await page.getByRole('button', { name: /create trip/i }).click();

    // Verify Create Trip tab is active
    await expect(page.getByRole('button', { name: /create trip/i })).toHaveClass(/bg-blue-600/);

    // Verify form is shown
    await expect(page.getByLabel(/trip title/i)).toBeVisible();
  });

  test('should navigate from list to detail and back', async ({ page }) => {
    // Create a trip
    await page.getByLabel(/trip title/i).fill(TEST_TRIP.title);
    await page.getByLabel(/description/i).fill(TEST_TRIP.description);
    await page.getByLabel(/start date/i).fill(TEST_TRIP.startDate);
    await page.getByLabel(/end date/i).fill(TEST_TRIP.stopDate);
    await page.getByRole('button', { name: /create trip/i }).click();

    await expect(page.getByText(/trip created successfully/i)).toBeVisible();

    // Click on trip in list
    await page.getByText(TEST_TRIP.title).click();

    // Verify in detail view
    await expect(page.getByRole('heading', { name: TEST_TRIP.title })).toBeVisible();

    // Click back button
    await page.getByRole('button', { name: /back to list/i }).click();

    // Verify back in list view
    await expect(page.getByText(/your trips/i)).toBeVisible();
    await expect(page.getByText(TEST_TRIP.title)).toBeVisible();
  });

  test('should auto-switch to list view after creating trip', async ({ page }) => {
    // Verify starting on Create tab
    await expect(page.getByRole('button', { name: /create trip/i })).toHaveClass(/bg-blue-600/);

    // Create a trip
    await page.getByLabel(/trip title/i).fill(TEST_TRIP.title);
    await page.getByLabel(/description/i).fill(TEST_TRIP.description);
    await page.getByLabel(/start date/i).fill(TEST_TRIP.startDate);
    await page.getByLabel(/end date/i).fill(TEST_TRIP.stopDate);
    await page.getByRole('button', { name: /create trip/i }).click();

    // Verify auto-switched to My Trips tab
    await expect(page.getByRole('button', { name: /my trips/i })).toHaveClass(/bg-blue-600/);
    await expect(page.getByText(TEST_TRIP.title)).toBeVisible();
  });
});
